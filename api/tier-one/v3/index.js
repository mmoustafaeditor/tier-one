// Tier One v3 online (Vercel function, Node 18+): the server-held Daily, leaderboards, The Wire, weekly leagues and
// Friends rooms. POST /api/tier-one/v3 { action, ... } -> { ok:true, ... } | { ok:false, error }
//
// Storage: Upstash Redis over REST, same env as api/online.js (KV_REST_API_URL + KV_REST_API_TOKEN, or
// UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN). Without them every action answers { ok:false, error:'offline' }.
// T1V3_SALT (optional; falls back to a hash of the store token): the secret mixed into every ranked seed so nobody can compute a board from the
// repo. Yesterday's seed is published by `daily.seed` so any board can be replayed and audited the day after.
//
// The Daily is scored here: the client never holds the truth. Every request replays the stored action log through the
// rules engine, applies one new action and stores the log again. 4.0 (RULES4.md): Daily boards from V4_FROM, room rounds
// opening from that day and every new challenge play _lib/engine4.mjs and store `v: 4`; older days keep _lib/engine.mjs
// so the archive still replays. The two engines never mix inside one window.
import { RULES, buildBoard, newGame, apply, replay, pub, resolve, isOver, finish, gridRow, OUT, truthAt } from './_lib/engine.mjs';
import * as E4 from './_lib/engine4.mjs';
import { compactWorld, buildCast } from './_lib/world.mjs';
import { hashStr } from './_lib/rng.mjs';
import { WIRE, marketOf, rumourState, wirePoints, hitRate, ghostRumour } from './_lib/wire.mjs';
import { loadSnapshot } from '../../data/_lib/store.js';
import OVERRIDES from './_lib/wire-overrides.mjs';
import { createHash } from 'node:crypto';



const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
// Without T1V3_SALT, derive one from the store token: already secret, and stable across deploys.
const SALT = process.env.T1V3_SALT || (TOKEN ? createHash('sha256').update('t1v3-salt|' + TOKEN).digest('hex') : '');
const DEV_SALT = 'dev-only-salt-set-T1V3_SALT';

const DAY = 86400, DAY_MS = DAY * 1000;
const SESSION_TTL = 3 * DAY, ROOM_TTL = 90 * DAY, LB_DAY_TTL = 40 * DAY, LB_WEEK_TTL = 60 * DAY, LG_TTL = 70 * DAY;
const DAILY_EPOCH = Date.parse('2026-09-01T00:00:00Z'); // Daily No. 1
const DD_GRACE_MS = 4000;            // network grace on the Deadline Day clock
const LB_TOP = 25, MAX_ROOM = 24, ROUND_OPEN_H = 48;
// 3.4 the press box (GOTY.md §7.3): weekly rooms on the real calendar, room feeds, challenges, newsrooms, live presence.
const WEEK_OPEN_H = 7 * 24, ROOM_FEED = 60, TAUNTS = 8, TAUNT_GAP = 45;
const CH_TTL = 8 * DAY, CH_OPEN_MS = 24 * 3600e3, CH_MAX_RES = 20, CH_LOG_MAX = 160, CH_MINE = 20;
const NR_TTL = 200 * DAY, NR_MAX = 20, NR_TOP = 10;
const LIVE_WINDOW_S = 10 * 60, LIVE_TTL = 2 * DAY;
const REP_TIERS = ['blogger', 'stringer', 'correspondent', 'chief', 'tierone'];
const LEAGUE = { SIZE: 30, UP: 6, DOWN: 6, DIVS: ['stringer', 'reporter', 'correspondent', 'editor', 'tierone'], TIER_PTS: { T1: 30, T2: 20, T3: 12, T4: 6, SPIKED: 2 }, WIRE_CAP: 150 };
const RATE_MAX = 900, RATE_WINDOW = 3600;
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// ---------------------------------------------------------------- store
async function redis(cmds) {
  const r = await fetch(URL_ + '/pipeline', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds) });
  if (!r.ok) throw new Error('store ' + r.status);
  const out = await r.json();
  return out.map((x) => { if (x.error) throw new Error(x.error); return x.result; });
}
const one = async (...cmd) => (await redis([cmd]))[0];
const getJ = async (k) => { const v = await one('GET', k); if (!v) return null; try { return JSON.parse(v); } catch { return null; } };
const setJ = (k, v, ttl) => one('SET', k, JSON.stringify(v), 'EX', ttl);

// ---------------------------------------------------------------- validation
const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max);
const int = (v, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo; };
const devId = (d) => { const s = String(d == null ? '' : d); return /^[A-Za-z0-9]{8,24}$/.test(s) ? s : ''; };
const nickOk = (s) => !(/http|:\/\//i.test(s) || (s.includes('@') && !/^@[\w.]{1,15}$/.test(s)));
const nickOf = (nick, dev) => { const n = clean(nick, 16); return n && nickOk(n) ? n : 'Journo-' + String(dev).slice(0, 4).toUpperCase(); };
const roomCode = (c) => clean(c, 8).toUpperCase().replace(/[^A-Z0-9]/g, '');
// A player's public id: what friends' ledgers key on across rooms, challenges and newsrooms. One-way from the device id.
const pubId = (dev) => (hashStr((SALT || DEV_SALT) + '|pub|' + dev) >>> 0).toString(36).padStart(7, '0').slice(0, 8);
const flairOf = (f) => { const s = clean(f, 24); return /^[a-z0-9][a-z0-9.\-]{1,23}$/i.test(s) ? s : ''; };
const tierOf = (x) => (REP_TIERS.includes(x) ? x : '');
const seedOf = (s) => { const x = clean(s, 12).toUpperCase(); return /^[A-Z0-9]{4,12}$/.test(x) ? x : ''; };
const dayOf = (d) => { const s = clean(d, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) && s >= '2026-09-01' && s <= today() ? s : ''; };
// A window's action log from the client (challenges): shape-checked, then replayed here so the score is ours.
function parseLog(log) {
  if (!Array.isArray(log) || log.length > CH_LOG_MAX) return null;
  const out = []; for (const a of log) { const p = parseAct(a); if (!p) return null; out.push(p); }
  return out;
}
function scoreLog(seed, log) {
  const g = replay(buildBoard(seed, RULES), log, RULES);
  if (!g || !isOver(g)) return null;
  const r = resolve(g);
  if (r.total < RULES.SCORE_MIN || r.total > RULES.SCORE_MAX) return null;
  return { score: r.total, tier: r.tier, row: gridRow(r), ex: r.ex, hwg: dropsOf(r) };
}
// 4.0: the same, under the rules the player played (a rule spec: { mode, opts }). Bounds come from the rules.
function scoreLog4(seed, log, spec) {
  const R = E4.rulesOf(spec), g = E4.replay(E4.buildBoard(seed, R), log, R);
  if (!g || !E4.isOver(g)) return null;
  const r = E4.resolve(g), b = E4.bounds(R);
  if (r.total < b.min || r.total > b.max) return null;
  return { v: 4, score: r.total, tier: r.tier, row: E4.gridRow(r), scoops: r.scoops, ex: r.scoops, drops: dropsOf(r) };
}
// A rule spec from the client, shape-checked: the mode and its knobs, nothing else (E4.specOf drops the rest).
const specOf = (b) => E4.specOf(clean(b && b.mode, 10), b && b.opts && typeof b.opts === 'object' ? b.opts : {});
// Right Drops (v3: right Done calls at Confirmed), by story index: the big cards on a feed.
const dropsOf = (r) => r.per.filter((p) => p.right && p.call && p.call.s === 2 && (r.v === 4 || p.call.o === 0)).map((p) => p.i);
const mondayOf = (day) => { const t = Date.parse(day + 'T00:00:00Z'); const dow = (new Date(t).getUTCDay() + 6) % 7; return t - dow * DAY_MS; };
const roomStep = (room) => (room.cadence === 'weekly' ? 7 * DAY_MS : DAY_MS);
const roomOpenH = (room) => (room.cadence === 'weekly' ? WEEK_OPEN_H : ROUND_OPEN_H);
const roundOpens = (room, k) => room.created + k * roomStep(room);
function code(n) { let s = ''; const b = new Uint8Array(n); crypto.getRandomValues(b); for (const x of b) s += ALPHA[x % ALPHA.length]; return s; }
function secret() { const b = new Uint8Array(18); crypto.getRandomValues(b); return Buffer.from(b).toString('base64url'); }
const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);
const today = () => ymd(Date.now());
const V4_FROM_MS = Date.parse(E4.V4_FROM + 'T00:00:00Z');
const dailyNo = (day) => Math.floor((Date.parse(day + 'T00:00:00Z') - DAILY_EPOCH) / DAY_MS) + 1;
function isoWeek(day) {
  const d = new Date(day + 'T00:00:00Z'); const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const y = d.getUTCFullYear(), w = Math.ceil(((d - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return y + '-W' + String(w).padStart(2, '0');
}
const prevWeek = (day) => isoWeek(ymd(Date.parse(day + 'T00:00:00Z') - 7 * DAY_MS));
const season = (ms) => { const d = new Date(ms), m = d.getUTCMonth(), y = d.getUTCFullYear(); return m >= 5 && m <= 7 ? y + '-summer' : m >= 8 && m <= 10 ? y + '-autumn' : m === 11 ? (y + 1) + '-winter' : m <= 1 ? y + '-winter' : y + '-spring'; };
const clientIp = (req) => { const xf = req && req.headers && req.headers['x-forwarded-for']; const raw = (Array.isArray(xf) ? xf[0] : String(xf || '')).split(',')[0].trim() || (req && req.socket && req.socket.remoteAddress) || ''; return raw.replace(/[^0-9a-fA-F.:]/g, '').slice(0, 45); };
async function rateOk(ip) {
  if (!ip) return true;
  const key = 't1v3:rl:' + ip + ':' + Math.floor(Date.now() / 1000 / RATE_WINDOW);
  const [n] = await redis([['INCR', key], ['EXPIRE', key, RATE_WINDOW]]);
  return Number(n) <= RATE_MAX;
}
// One action from the client: shape-checked before the engine sees it.
function parseAct(a) {
  if (!Array.isArray(a) || a.length > 4) return null;   // v3 and v4 share the shapes; engine4 rejects 'u' on its own
  const k = a[0];
  if (k === 'e') return ['e'];
  if (k === 'a' && Number.isInteger(a[1]) && typeof a[2] === 'string' && /^[a-z]{3,8}$/.test(a[2])) return ['a', a[1], a[2]];
  if ((k === 'c' || k === 'u') && [a[1], a[2], a[3]].every(Number.isInteger)) return [k, a[1], a[2], a[3]];
  return null;
}

// ---------------------------------------------------------------- the world (real squads from the data snapshot)
let worldCache = null;
function world() {
  const snap = loadSnapshot();
  if (!worldCache || worldCache.snap !== snap) worldCache = { snap, w: compactWorld(snap) };
  return worldCache.w;
}
const saltedSeed = (base) => base + ':' + hashStr((SALT || DEV_SALT) + '|' + base).toString(36) + hashStr(base + '|' + (SALT || DEV_SALT)).toString(36);
function publicCast(cast, withAlt) {
  const club = new Map(cast.clubs.map((c) => [c.id, c]));
  return cast.sagas.map((s) => ({ i: s.i, player: s.player, from: club.get(s.from), to: club.get(s.to), ...(withAlt ? { alt: club.get(s.alt) } : {}) }));
}

// ---------------------------------------------------------------- ranked sessions (Daily and room rounds)
// scope: { kind:'d', day } or { kind:'r', code, round }. The key is per device (Daily) or per room member.
const scopeBase = (sc) => (sc.kind === 'd' ? 'daily-' + sc.day : 'room-' + sc.code + '-r' + (sc.round + 1));
const sessKey = (sc, who) => 't1v3:s:' + (sc.kind === 'd' ? 'd:' + sc.day : 'r:' + sc.code + ':' + sc.round) + ':' + who;
// Which rules a ranked scope plays. 4.0 from V4_FROM (a Daily by its day, a room round by the day it opens); the rest v3.
const ENGINES = {
  3: { v: 3, R: RULES, n: RULES.SAGAS, days: RULES.DAYS, buildBoard, replay, apply, pub, resolve, isOver, finish, gridRow, bounds: { min: RULES.SCORE_MIN, max: RULES.SCORE_MAX } },
  4: { v: 4, R: E4.RULES, n: E4.RULES.STORIES, days: E4.RULES.DAYS, buildBoard: E4.buildBoard, replay: E4.replay, apply: E4.apply, pub: E4.pub, resolve: E4.resolve, isOver: E4.isOver, finish: E4.finish, gridRow: E4.gridRow, bounds: E4.bounds(E4.RULES) },
};
const engineOf = (sc) => ENGINES[sc.v4 ? 4 : 3];
function boardFor(sc) {
  const seed = saltedSeed(scopeBase(sc)), e = engineOf(sc);
  return { seed, v: e.v, board: e.buildBoard(seed, e.R), cast: buildCast(seed, world(), { n: e.n }) };
}
// The 3.x Deadline Day clock (day 7, DD_SECONDS). A 4.0 Daily has no clock: Deadline Day is its own mode.
function ddLeft(sess, g) {
  if (!g.R.DD_SECONDS || g.day !== g.R.DAYS || !sess.ddAt) return null;
  return sess.ddAt + g.R.DD_SECONDS * 1000 - Date.now();
}
function view(sc, sess, g, cast, extra) {
  const e = engineOf(sc);
  const out = { v: e.v, scope: sc, no: sc.kind === 'd' ? dailyNo(sc.day) : sc.round + 1, cast: publicCast(cast, !!sess.res), state: e.pub(g), done: !!sess.res, ...extra };
  const left = ddLeft(sess, g); if (left != null) out.ddLeftMs = Math.max(0, left);
  if (sess.res) out.result = sess.res;
  return out;
}
// Score the finished window, store it, rank it. League points by tier are the same under both rule sets.
async function settle(sc, who, sess, g, cast, nick) {
  const e = engineOf(sc), r = e.resolve(g);
  if (r.total < e.bounds.min || r.total > e.bounds.max) throw new Error('bounds');
  const res = e.v === 4
    ? { v: 4, total: r.total, tier: r.tier, right: r.right, wrong: r.wrong, scoops: r.scoops, ex: r.scoops, called: r.called, row: e.gridRow(r), per: r.per, cast: publicCast(cast, true), at: Date.now() }
    : { total: r.total, tier: r.tier, right: r.right, wrong: r.wrong, ex: r.ex, called: r.called, uturns: r.uturns, row: e.gridRow(r), per: r.per, cast: publicCast(cast, true), at: Date.now() };
  if (sc.kind === 'd') {
    const dk = 't1v3:lb:d:' + sc.day, week = isoWeek(sc.day), wk = 't1v3:lb:w:' + week;
    const doc = { nick, score: r.total, tier: r.tier, row: res.row, ex: res.ex, ...(e.v === 4 ? { v: 4, scoops: r.scoops } : {}) };
    const cmds = [['ZADD', dk, 'NX', r.total, who], ['EXPIRE', dk, LB_DAY_TTL], ['SET', dk + ':e:' + who, JSON.stringify(doc), 'EX', LB_DAY_TTL, 'NX']];
    const first = await one('SET', 't1v3:lb:once:' + sc.day + ':' + who, '1', 'EX', LB_DAY_TTL, 'NX');
    if (first) cmds.push(['ZINCRBY', wk, r.total, who], ['EXPIRE', wk, LB_WEEK_TTL], ['SET', wk + ':e:' + who, JSON.stringify({ nick, row: res.row, tier: r.tier }), 'EX', LB_WEEK_TTL]);
    await redis(cmds);
    if (first) await leagueAdd(who, nick, sc.day, LEAGUE.TIER_PTS[r.tier] || 0, 'daily');
    Object.assign(res, await rankInfo(sc.day, who));
    // First to break it (GOTY.md §7.3): the act-time candidate stands only if that Confirmed call survived to the end.
    const fk = 't1v3:live:first:' + sc.day, brk = await getJ(fk);
    if (brk && brk.dev === who) { const p = r.per[brk.i]; if (!(p && p.right && p.call && p.call.s === 2)) await one('DEL', fk); }
  } else {
    const key = 'room:v3:' + sc.code + ':p:' + who, p = await getJ(key);
    if (p) { p.results[sc.round] = { score: r.total, tier: r.tier, ex: res.ex, row: res.row, at: Date.now(), ...(e.v === 4 ? { v: 4, scoops: r.scoops } : {}) }; await setJ(key, p, ROOM_TTL); }
    // The room feed: the call lands, and every right Drop gets its own big card (`hwg` is the 3.x field name the feed reads).
    const hwg = dropsOf(r).map((i) => cast.sagas[i] && cast.sagas[i].player ? cast.sagas[i].player.s || cast.sagas[i].player.n : '').filter(Boolean);
    await roomFeed(sc.code, { t: 'filed', pid: who, nick, round: sc.round, score: r.total, tier: r.tier, ex: res.ex, row: res.row, hwg, ...(e.v === 4 ? { v: 4, scoops: r.scoops, drops: hwg } : {}) });
  }
  sess.res = res;
  return res;
}
async function roomFeed(code, ev) {
  const k = 'room:v3:' + code + ':feed';
  await redis([['LPUSH', k, JSON.stringify({ ...ev, at: Date.now() })], ['LTRIM', k, 0, ROOM_FEED - 1], ['EXPIRE', k, ROOM_TTL]]);
}
async function rankInfo(day, who) {
  const dk = 't1v3:lb:d:' + day, wk = 't1v3:lb:w:' + isoWeek(day);
  const [sc, total, wsc, wtotal] = await redis([['ZSCORE', dk, who], ['ZCARD', dk], ['ZSCORE', wk, who], ['ZCARD', wk]]);
  const [higher, whigher] = await redis([['ZCOUNT', dk, '(' + Number(sc), '+inf'], ['ZCOUNT', wk, '(' + Number(wsc), '+inf']]);
  return { rank: sc == null ? null : 1 + Number(higher), players: Number(total) || 0, weekRank: wsc == null ? null : 1 + Number(whigher), weekPlayers: Number(wtotal) || 0, par: await par(day) };
}
// Today's par: the median score on this board so far.
async function par(day) {
  const dk = 't1v3:lb:d:' + day, n = Number(await one('ZCARD', dk)) || 0;
  if (n < 3) return null;
  const mid = await one('ZRANGE', dk, Math.floor((n - 1) / 2), Math.floor((n - 1) / 2), 'WITHSCORES');
  return mid && mid.length ? Number(mid[1]) : null;
}
// Resolve the scope of a request: today's Daily, or one round of a room the caller belongs to.
async function scopeOf(b) {
  if (b.room) {
    const c = roomCode(b.room.code), round = int(b.room.round, 0, 19), pid = clean(b.room.pid, 12);
    const [meta, doc] = await redis([['GET', 'room:v3:' + c], ['GET', 'room:v3:' + c + ':p:' + pid]]);
    if (!meta || !doc) return { error: 'not found' };
    const room = JSON.parse(meta), p = JSON.parse(doc);
    if (!b.room.sec || b.room.sec !== p.sec) return { error: 'forbidden' };
    if (round >= room.rounds) return { error: 'round' };
    const opens = roundOpens(room, round);
    if (Date.now() < opens) return { error: 'not open' };
    if (Date.now() > opens + roomOpenH(room) * 3600e3 && !(p.results && p.results[round])) return { error: 'closed' };
    return { sc: { kind: 'r', code: c, round, v4: opens >= V4_FROM_MS }, who: pid, nick: p.nick };
  }
  const dev = devId(b.dev);
  if (!dev) return { error: 'dev' };
  const day = today();
  return { sc: { kind: 'd', day, v4: E4.isV4Day(day) }, who: dev, nick: nickOf(b.nick, dev) };
}
async function loadSession(b) {
  const s = await scopeOf(b); if (s.error) return s;
  const { board, cast } = boardFor(s.sc), e = engineOf(s.sc);
  const key = sessKey(s.sc, s.who);
  const sess = (await getJ(key)) || { log: [], t0: Date.now(), nick: s.nick };
  const g = e.replay(board, sess.log, e.R);
  if (!g) return { error: 'log' };
  return { ...s, key, sess, g, cast, e, ttl: s.sc.kind === 'd' ? SESSION_TTL : ROOM_TTL };
}
// Deadline Day: once the clock (plus grace) has run out, the window ends whatever the client says.
async function expireIfLate(x) {
  const left = ddLeft(x.sess, x.g);
  if (!x.sess.res && left != null && left < -DD_GRACE_MS) {
    x.e.finish(x.g); x.sess.log = x.g.log.slice();
    await settle(x.sc, x.who, x.sess, x.g, x.cast, x.sess.nick || x.nick);
    await setJ(x.key, x.sess, x.ttl);
    return true;
  }
  return false;
}

const actions = {
  async health() { let data = true; try { world(); } catch { data = false; } return { store: true, data, salt: !!SALT, day: today(), no: dailyNo(today()) }; },

  // ---- the Daily (and room rounds, with { room:{code,pid,sec,round} }) ----
  async 'daily.start'(b) {
    const x = await loadSession(b); if (x.error) return x;
    if (!x.sess.log.length && !x.sess.res) await setJ(x.key, x.sess, x.ttl);
    await expireIfLate(x);
    return view(x.sc, x.sess, x.g, x.cast, {});
  },
  async 'daily.act'(b) {
    const x = await loadSession(b); if (x.error) return x;
    if (x.sess.res) return { error: 'done', ...view(x.sc, x.sess, x.g, x.cast, {}) };
    if (await expireIfLate(x)) return { error: 'clock', ...view(x.sc, x.sess, x.g, x.cast, {}) };
    const a = parseAct(b.act);
    if (!a) return { error: 'act' };
    // 3.x: the Deadline Day clock starts with the first thing done on day 7 (or daily.dd), not at the end of day 6.
    if (x.e.v === 3 && x.g.day === RULES.DAYS && !x.sess.ddAt) x.sess.ddAt = Date.now();
    if (!x.e.apply(x.g, a)) return { error: 'rule', ...view(x.sc, x.sess, x.g, x.cast, {}) };
    x.sess.log = x.g.log.slice();
    const extra = {};
    if (a[0] === 'a') extra.answer = x.g.clues[a[1]][x.g.clues[a[1]].length - 1];
    // Live presence: a Drop (3.x: a Confirmed call) that is right is the day's "first to break it" candidate.
    if (x.sc.kind === 'd' && a[0] === 'c' && a[3] === 2) {
      const sg = x.e.v === 4 ? x.g.board.stories[a[1]] : x.g.board.sagas[a[1]];
      const truth = sg ? (x.e.v === 4 ? sg.truth : truthAt(sg, x.g.day)) : -1;
      if (sg && a[2] === truth) await one('SET', 't1v3:live:first:' + x.sc.day, JSON.stringify({ dev: x.who, nick: x.sess.nick || x.nick, i: a[1], at: Date.now() }), 'EX', LIVE_TTL, 'NX');
    }
    if (x.e.isOver(x.g)) await settle(x.sc, x.who, x.sess, x.g, x.cast, x.sess.nick || x.nick);
    await setJ(x.key, x.sess, x.ttl);
    return view(x.sc, x.sess, x.g, x.cast, extra);
  },
  // 3.x only: turn the page onto Deadline Day, the 60-second clock starts now. A 4.0 window answers with its view.
  async 'daily.dd'(b) {
    const x = await loadSession(b); if (x.error) return x;
    if (x.e.v === 3 && !x.sess.res && x.g.day === RULES.DAYS && !x.sess.ddAt) { x.sess.ddAt = Date.now(); await setJ(x.key, x.sess, x.ttl); }
    await expireIfLate(x);
    return view(x.sc, x.sess, x.g, x.cast, {});
  },
  // End the window now (the clock ran out on the client, or the player files nothing more).
  async 'daily.finish'(b) {
    const x = await loadSession(b); if (x.error) return x;
    if (!x.sess.res) {
      // Before Deadline Day the window can't be skipped: the remaining days are ended one by one like End day.
      x.e.finish(x.g); x.sess.log = x.g.log.slice();
      await settle(x.sc, x.who, x.sess, x.g, x.cast, x.sess.nick || x.nick);
      await setJ(x.key, x.sess, x.ttl);
    }
    return view(x.sc, x.sess, x.g, x.cast, {});
  },
  // A past day's seed (published the day after) so anyone can replay a Daily in Practice and audit it.
  async 'daily.seed'(b) {
    const day = clean(b.day, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day >= today() || day < '2026-09-01') return { error: 'day' };
    const seed = saltedSeed('daily-' + day), e = engineOf({ kind: 'd', day, v4: E4.isV4Day(day) });
    return { day, no: dailyNo(day), seed, v: e.v, cast: publicCast(buildCast(seed, world(), { n: e.n }), true) };
  },

  // ---- leaderboards ----
  async 'lb.top'(b) {
    // period 'wire': the season's Wire credibility board (scored on the server in wire.mine).
    // `day` (optional, SAIF-03): a past day's Daily board, or the week holding that day, so a finished period's placing
    // can be read back for its coin prize. Read-only; boards keep their TTL (40 days daily, 60 weekly).
    const period = b.period === 'weekly' || b.period === 'wire' ? b.period : 'daily', dev = devId(b.dev);
    const asked = clean(b.day, 10), day = /^\d{4}-\d{2}-\d{2}$/.test(asked) && asked < today() && asked >= '2026-09-01' ? asked : today();
    const key = period === 'wire' ? 't1v3:cred:' + season(Date.now()) : period === 'weekly' ? 't1v3:lb:w:' + isoWeek(day) : 't1v3:lb:d:' + day;
    const [z, total] = await redis([['ZREVRANGE', key, 0, LB_TOP - 1, 'WITHSCORES'], ['ZCARD', key]]);
    const ids = []; for (let i = 0; i < (z || []).length; i += 2) ids.push(z[i]);
    const docs = ids.length ? await one('MGET', ...ids.map((d) => key + ':e:' + d)) : [];
    const rows = ids.map((d, i) => { let doc = null; try { doc = JSON.parse(docs[i]); } catch { doc = null; } return { nick: (doc && doc.nick) || 'Journo-' + d.slice(0, 4).toUpperCase(), score: Number(z[2 * i + 1]) || 0, tier: (doc && doc.tier) || '', row: (doc && doc.row) || '', me: !!(dev && d === dev) }; });
    const out = { period, day, week: isoWeek(day), no: dailyNo(day), rows, players: Number(total) || 0, par: await par(day) };
    if (dev) { const sc = await one('ZSCORE', key, dev); if (sc != null) out.me = { rank: 1 + Number(await one('ZCOUNT', key, '(' + Number(sc), '+inf')), score: Number(sc) }; }
    return out;
  },

  // ---- The Wire ----
  // The Wire's own layer over /api/data/rumours (the client reads the rumours there): Market, state, crowd split, my call.
  async 'wire.board'(b) {
    const snap = loadSnapshot(), now = Date.now(), dev = devId(b.dev);
    const rs = snap.rumours.filter((r) => r.status === 'open');
    const splits = rs.length ? await redis(rs.map((r) => ['HGETALL', 't1v3:w:split:' + r.id])) : [];
    const mine = dev ? await wireCalls(dev) : {};
    const items = {};
    rs.forEach((r, k) => { const sp = hashObj(splits[k]); items[r.id] = { market: marketOf(r), state: rumourState(r, snap, OVERRIDES, now).state, split: { yes: Number(sp.yes) || 0, no: Number(sp.no) || 0 }, mine: mine[r.id] || null }; });
    const dk = dev ? Number(await one('GET', 't1v3:w:n:' + dev + ':' + today())) || 0 : 0;
    return { asOf: snap.meta.asOf, names: snap.mode, items, callsToday: dk, limits: { daily: WIRE.DAILY_CALLS, open: WIRE.OPEN_CALLS }, window: WIRE.CURRENT };
  },
  async 'wire.file'(b) {
    const dev = devId(b.dev); if (!dev) return { error: 'dev' };
    const snap = loadSnapshot(), r = snap.rumours.find((x) => x.id === clean(b.rid, 120));
    if (!r) return { error: 'rumour' };
    if (rumourState(r, snap, OVERRIDES).state !== 'open') return { error: 'frozen' };
    const yes = !!b.yes, s = int(b.s, 1, 3);
    const club = yes && b.club ? (b.club === 'other' || (r.linked || []).some((l) => l.clubId === b.club) ? clean(b.club, 60) : null) : null;
    const fee = yes && WIRE.FEE_BANDS.includes(b.fee) ? b.fee : null;
    const calls = await wireCalls(dev);
    if (calls[r.id]) return { error: 'filed' };
    if (Object.values(calls).filter((c) => !c.done).length >= WIRE.OPEN_CALLS) return { error: 'open cap' };
    const dk = 't1v3:w:n:' + dev + ':' + today();
    const [n] = await redis([['INCR', dk], ['EXPIRE', dk, 2 * DAY]]);
    if (Number(n) > WIRE.DAILY_CALLS) return { error: 'daily cap' };
    const m = marketOf(r), sp = hashObj(await one('HGETALL', 't1v3:w:split:' + r.id));
    const yesN = Number(sp.yes) || 0, clubN = club ? Number(sp['c:' + club]) || 0 : 0;
    const cClub = club ? (yesN >= 5 ? clubN / yesN : 1 / ((r.linked || []).length + 1)) : null;
    const call = { rid: r.id, pn: r.playerName, yes, s, club, fee, m, c: yes ? m : 1 - m, cClub, at: Date.now(), nick: nickOf(b.nick, dev) };
    const cmds = [['HSET', 't1v3:w:calls:' + dev, r.id, JSON.stringify(call)], ['HINCRBY', 't1v3:w:split:' + r.id, yes ? 'yes' : 'no', 1]];
    if (club) cmds.push(['HINCRBY', 't1v3:w:split:' + r.id, 'c:' + club, 1]);
    await redis(cmds);
    return { call };
  },
  // One correction within 15 minutes, only while the rumour's status hasn't changed.
  async 'wire.correct'(b) {
    const dev = devId(b.dev); if (!dev) return { error: 'dev' };
    const calls = await wireCalls(dev), old = calls[clean(b.rid, 120)];
    if (!old) return { error: 'not found' };
    if (old.corrected || Date.now() - old.at > WIRE.CORRECT_MIN * 60e3) return { error: 'locked' };
    const snap = loadSnapshot(), r = snap.rumours.find((x) => x.id === old.rid);
    if (!r || rumourState(r, snap, OVERRIDES).state !== 'open') return { error: 'frozen' };
    const yes = !!b.yes, s = int(b.s, 1, 3), m = old.m;
    const club = yes && b.club ? (b.club === 'other' || (r.linked || []).some((l) => l.clubId === b.club) ? clean(b.club, 60) : null) : null;
    const call = { ...old, yes, s, club, fee: yes && WIRE.FEE_BANDS.includes(b.fee) ? b.fee : null, c: yes ? m : 1 - m, corrected: true };
    const cmds = [['HSET', 't1v3:w:calls:' + dev, r.id, JSON.stringify(call)]];
    if (old.yes !== yes) cmds.push(['HINCRBY', 't1v3:w:split:' + r.id, old.yes ? 'yes' : 'no', -1], ['HINCRBY', 't1v3:w:split:' + r.id, yes ? 'yes' : 'no', 1]);
    await redis(cmds);
    return { call };
  },
  // My calls, settled against the snapshot as they're read (resolution is automatic; overrides correct it).
  async 'wire.mine'(b) {
    const dev = devId(b.dev); if (!dev) return { error: 'dev' };
    const snap = loadSnapshot(), calls = await wireCalls(dev), now = Date.now(), nick = nickOf(b.nick, dev);
    const byId = new Map(snap.rumours.map((r) => [r.id, r]));
    const writes = [];
    for (const c of Object.values(calls)) {
      const r = byId.get(c.rid) || ghostRumour(c.rid);
      if (r.status !== 'gone') { c.player = r.playerName; c.from = r.currentClubName; c.linked = r.linked; c.mNow = marketOf(r); }
      else { c.player = c.pn || ''; c.mNow = c.m; }
      // Heat points: the first time the market moves 15 points toward your side after lock.
      if (!c.heat && !c.done && (c.yes ? c.mNow - c.m : c.m - c.mNow) >= WIRE.HEAT_MOVE) { c.heat = c.s; writes.push(c); await leagueAdd(dev, nick, today(), c.s, 'wire'); }
      if (c.done) continue;
      const st = rumourState(r, snap, OVERRIDES, now);
      if (st.state === 'open' || st.state === 'frozen') { c.paper = wirePoints(c, { state: c.yes ? 'moved' : 'stayed', at: now, club: c.club, fee: c.fee }).pts; continue; }
      const w = wirePoints(c, st);
      Object.assign(c, { done: true, outcome: st.state, outClub: st.club, outFee: st.fee, pts: w.pts, right: w.right, parts: w.parts, settledAt: now });
      writes.push(c);
      if (st.state !== 'void') {
        await one('ZINCRBY', 't1v3:cred:' + season(now), w.pts, dev);
        await leagueAdd(dev, nick, today(), w.pts, 'wire');
      }
    }
    if (writes.length) await redis(writes.map((c) => ['HSET', 't1v3:w:calls:' + dev, c.rid, JSON.stringify(stripView(c))]));
    const list = Object.values(calls).sort((a, b) => b.at - a.at);
    const doneL = list.filter((c) => c.done && c.outcome !== 'void');
    const hits = doneL.filter((c) => c.right).reduce((a, c) => a + c.s, 0), n = doneL.reduce((a, c) => a + c.s, 0);
    const cred = Number(await one('ZSCORE', 't1v3:cred:' + season(now), dev)) || 0;
    if (list.length) await one('SET', 't1v3:cred:' + season(now) + ':e:' + dev, JSON.stringify({ nick }), 'EX', 200 * DAY);
    return { calls: list, cred, hitRate: hitRate(hits, n), resolved: doneL.length, season: season(now) };
  },

  // ---- weekly league (DESIGN §4.6): Daily tier points + Wire points + Heat, divisions of 30 ----
  async 'league.me'(b) {
    const dev = devId(b.dev); if (!dev) return { error: 'dev' };
    const me = await leagueSeat(dev, nickOf(b.nick, dev), today());
    const gk = groupKey(me.week, me.div, me.grp);
    const z = await one('ZREVRANGE', gk, 0, LEAGUE.SIZE - 1, 'WITHSCORES');
    const ids = []; for (let i = 0; i < (z || []).length; i += 2) ids.push(z[i]);
    const docs = ids.length ? await one('MGET', ...ids.map((d) => 't1v3:lg:seat:' + me.week + ':' + d)) : [];
    const rows = ids.map((d, i) => { let doc = null; try { doc = JSON.parse(docs[i]); } catch { doc = null; } return { nick: (doc && doc.nick) || 'Journo', pts: Number(z[2 * i + 1]) || 0, daily: (doc && doc.daily) || 0, wire: (doc && doc.wire) || 0, me: d === dev }; });
    return { week: me.week, div: me.div, divs: LEAGUE.DIVS, up: me.div < LEAGUE.DIVS.length - 1 ? LEAGUE.UP : 0, down: me.div > 0 ? LEAGUE.DOWN : 0, size: LEAGUE.SIZE, rows, last: me.last || null };
  },

  // ---- Friends rooms: Daily rules exactly, one shared board per round, scored here ----
  // 3.4: a room is a press box. `cadence` 'weekly' (default) runs one round per ISO week from the Monday of creation,
  // open all week; 'daily' is the 2.x room (a round a day, open 48 h). Players carry a public id, flair and rep tier.
  async 'room.create'(b) {
    const nick = clean(b.nick, 16), name = clean(b.name, 28) || 'Tier One room';
    const rounds = [5, 10, 20].includes(Number(b.rounds)) ? Number(b.rounds) : 5;
    const cadence = b.cadence === 'daily' ? 'daily' : 'weekly';
    if (!nick || !nickOk(nick)) return { error: 'nick' };
    for (let i = 0; i < 8; i++) {
      const c = code(5), pid = code(10), sec = secret();
      const created = cadence === 'weekly' ? mondayOf(today()) : Date.parse(today() + 'T00:00:00Z');
      const room = { code: c, name, rounds, created, host: pid, cadence, season: season(Date.now()), v: 2 };
      if (await one('SET', 'room:v3:' + c, JSON.stringify(room), 'EX', ROOM_TTL, 'NX')) {
        await redis([['SET', 'room:v3:' + c + ':p:' + pid, JSON.stringify(roomPlayer(pid, nick, sec, b)), 'EX', ROOM_TTL], ['SADD', 'room:v3:' + c + ':players', pid], ['EXPIRE', 'room:v3:' + c + ':players', ROOM_TTL]]);
        await roomFeed(c, { t: 'open', pid, nick, name });
        return { room: await readRoom(c), pid, sec };
      }
    }
    return { error: 'busy' };
  },
  async 'room.join'(b) {
    const c = roomCode(b.code), nick = clean(b.nick, 16);
    if (!nick || !nickOk(nick)) return { error: 'nick' };
    const [meta, count] = await redis([['GET', 'room:v3:' + c], ['SCARD', 'room:v3:' + c + ':players']]);
    if (!meta) return { error: 'not found' };
    if (Number(count) >= MAX_ROOM) return { error: 'full' };
    const pid = code(10), sec = secret();
    await redis([['SET', 'room:v3:' + c + ':p:' + pid, JSON.stringify(roomPlayer(pid, nick, sec, b)), 'EX', ROOM_TTL], ['SADD', 'room:v3:' + c + ':players', pid], ['EXPIRE', 'room:v3:' + c + ':players', ROOM_TTL]]);
    await roomFeed(c, { t: 'join', pid, nick });
    return { room: await readRoom(c), pid, sec };
  },

  // ---- Deadline Day Live (GOTY §7.1): one shared 24 h board on the real deadline days, the same five real sagas for
  // everyone, a live tally of what the room is calling (counts, never names) and a global table after midnight UTC ----
  // Board: today's five, my calls, the tally. `day` is only honoured off the calendar with T1_DD_PREVIEW (dev/tests).
  async 'live.dd.board'(b) {
    const dev = devId(b.dev);
    const day = ddDay(b); if (!day) return { error: 'not live', next: nextDD() };
    const board = await ddBoard(day);
    const mine = dev ? (await getJ(ddCallKey(day, dev))) : null;
    const tally = await ddTally(day);
    return { ...board, live: day === today() || ddPreview(), mine: mine ? mine.calls : {}, ...tally };
  },
  // One call per saga; one U-turn per saga after that. Loudness 1–3 sets the stake (DD_RIGHT / DD_WRONG).
  async 'live.dd.call'(b) {
    const dev = devId(b.dev); if (!dev) return { error: 'dev' };
    const day = ddDay(b); if (!day) return { error: 'not live', next: nextDD() };
    if (day !== today() && !ddPreview()) return { error: 'closed' };
    const board = await ddBoard(day);
    const rid = clean(b.rid, 120), saga = board.sagas.find((s) => s.rid === rid); if (!saga) return { error: 'saga' };
    const o = int(b.o, 0, DD_OUT.length - 1), s = int(b.s, 1, 3);
    const key = ddCallKey(day, dev), doc = (await getJ(key)) || { calls: {} };
    doc.nick = nickOf(b.nick, dev);
    const old = doc.calls[rid];
    if (old && old.ut) return { error: 'locked' };
    if (old && old.o === o && old.s === s) return { day, call: old, ...(await ddTally(day)) };
    const call = old ? { rid, o, s, at: old.at, ut: true, utAt: Date.now(), from: { o: old.o, s: old.s } } : { rid, o, s, at: Date.now() };
    doc.calls[rid] = call;
    const tk = 't1v3:dd:tally:' + day, pk = 't1v3:dd:players:' + day;
    const cmds = [['SET', key, JSON.stringify(doc), 'EX', DD_TTL], ['SADD', pk, dev], ['EXPIRE', pk, DD_TTL], ['HINCRBY', tk, rid + ':' + o, 1], ['EXPIRE', tk, DD_TTL]];
    if (old && old.o !== o) cmds.push(['HINCRBY', tk, rid + ':' + old.o, -1]);
    await redis(cmds);
    return { day, call, ...(await ddTally(day)) };
  },
  // What the room is calling: counts per outcome per saga, and how many reporters are on the board. No names.
  async 'live.dd.tally'(b) {
    const day = ddDay(b) || lastDD(); if (!day) return { error: 'none' };
    const board = await ddBoard(day);
    return { day, closesAt: board.closesAt, ...(await ddTally(day)) };
  },
  // After midnight UTC: each saga's real outcome (from the data snapshot, pending until it settles) and the global table.
  async 'live.dd.results'(b) {
    const dev = devId(b.dev), d = clean(b.day, 10);
    const day = DD_DAYS[d] ? d : lastDD(); if (!day) return { error: 'none' };
    const board = await ddBoard(day), now = Date.now();
    if (now < board.closesAt && !ddPreview()) return { error: 'early', day, closesAt: board.closesAt };
    const snap = loadSnapshot();
    const outs = board.sagas.map((sg) => ddOutcome(sg, snap, now));
    const settled = outs.filter((o) => o.o != null).length;
    const mk = 't1v3:dd:res:' + day, meta = await getJ(mk + ':meta');
    // The table is rebuilt only when another saga has settled (a handful of times at most), then read from the store.
    if (!meta || meta.settled !== settled) {
      const ids = (await one('SMEMBERS', 't1v3:dd:players:' + day)) || [];
      const docs = ids.length ? await one('MGET', ...ids.map((id) => ddCallKey(day, id))) : [];
      const cmds = [];
      ids.forEach((id, k) => {
        let doc = null; try { doc = JSON.parse(docs[k]); } catch { doc = null; }
        if (!doc) return;
        let pts = 0, right = 0, n = 0;
        for (const c of Object.values(doc.calls || {})) { const p = ddPoints(c, outs[board.sagas.findIndex((sg) => sg.rid === c.rid)], board.opensAt); if (!p) continue; pts += p.pts; n++; if (p.right) right++; }
        cmds.push(['ZADD', mk, pts, id], ['SET', mk + ':e:' + id, JSON.stringify({ nick: doc.nick, right, n, called: Object.keys(doc.calls || {}).length }), 'EX', DD_TTL]);
      });
      cmds.push(['EXPIRE', mk, DD_TTL], ['SET', mk + ':meta', JSON.stringify({ settled, at: now }), 'EX', DD_TTL]);
      await redis(cmds);
    }
    const [z, total] = await redis([['ZREVRANGE', mk, 0, LB_TOP - 1, 'WITHSCORES'], ['ZCARD', mk]]);
    const ids = []; for (let i = 0; i < (z || []).length; i += 2) ids.push(z[i]);
    const docs = ids.length ? await one('MGET', ...ids.map((id) => mk + ':e:' + id)) : [];
    const rows = ids.map((id, i) => { let e = null; try { e = JSON.parse(docs[i]); } catch { e = null; } return { nick: (e && e.nick) || 'Journo-' + id.slice(0, 4).toUpperCase(), pts: Number(z[2 * i + 1]) || 0, right: (e && e.right) || 0, n: (e && e.n) || 0, me: !!(dev && id === dev) }; });
    let me = null;
    if (dev) {
      const sc = await one('ZSCORE', mk, dev);
      if (sc != null) { const mine = await getJ(ddCallKey(day, dev)); me = { rank: 1 + Number(await one('ZCOUNT', mk, '(' + Number(sc), '+inf')), pts: Number(sc), calls: mine ? mine.calls : {} }; }
    }
    return {
      day, window: board.window, opensAt: board.opensAt, closesAt: board.closesAt, final: settled === board.sagas.length, settled,
      sagas: board.sagas.map((sg, i) => ({ ...sg, out: outs[i].o, outClub: outs[i].club || null, pending: outs[i].o == null })),
      rows, players: Number(total) || 0, me,
    };
  },
  // Live presence (GOTY §7.3): how many reporters are on today's board right now (a 10-minute bucket, no names).
  async 'live.presence'(b) {
    const dev = devId(b.dev);
    const key = 't1v3:presence:' + today() + ':' + Math.floor(Date.now() / 600e3);
    const cmds = dev ? [['SADD', key, dev], ['EXPIRE', key, 1500], ['SCARD', key]] : [['SCARD', key]];
    const out = await redis(cmds);
    return { day: today(), now: Number(out[out.length - 1]) || 0 };
  },
  // With { pid, sec } the caller's card is refreshed first (nick, flair, rep tier, public id, last seen).
  async 'room.get'(b) {
    const c = roomCode(b.code);
    if (b.pid && b.sec) {
      const key = 'room:v3:' + c + ':p:' + clean(b.pid, 12), p = await getJ(key);
      if (p && p.sec === b.sec) {
        const nick = clean(b.nick, 16);
        Object.assign(p, { seen: Date.now(), flair: flairOf(b.flair), tier: tierOf(b.tier) }, devId(b.dev) ? { pub: pubId(devId(b.dev)) } : {}, nick && nickOk(nick) ? { nick } : {});
        await setJ(key, p, ROOM_TTL);
      }
    }
    const room = await readRoom(c);
    return room ? { room } : { error: 'not found' };
  },
  // The room feed: a taunt from the pool (i18n `so.taunts[k]`), aimed at one reporter or the room. One per 45 s.
  async 'room.post'(b) {
    const c = roomCode(b.code), pid = clean(b.pid, 12);
    const [meta, doc] = await redis([['GET', 'room:v3:' + c], ['GET', 'room:v3:' + c + ':p:' + pid]]);
    if (!meta || !doc) return { error: 'not found' };
    const p = JSON.parse(doc); if (!b.sec || b.sec !== p.sec) return { error: 'forbidden' };
    const k = int(b.k, 0, TAUNTS - 1);
    let to = null, toNick = '';
    if (b.to) { const td = await getJ('room:v3:' + c + ':p:' + clean(b.to, 12)); if (td) { to = td.pid; toNick = td.nick; } }
    if (!(await one('SET', 'room:v3:' + c + ':gap:' + pid, '1', 'EX', TAUNT_GAP, 'NX'))) return { error: 'slow' };
    await roomFeed(c, { t: 'taunt', pid, nick: p.nick, k, to, toNick });
    return { feed: await readFeed(c) };
  },
  // Spectate (§7.3): everyone's calls for one round, day by day. Only once you've filed and the round is over for all.
  async 'room.round'(b) {
    const c = roomCode(b.code), pid = clean(b.pid, 12), round = int(b.round, 0, 19);
    const [meta, doc, ids] = await redis([['GET', 'room:v3:' + c], ['GET', 'room:v3:' + c + ':p:' + pid], ['SMEMBERS', 'room:v3:' + c + ':players']]);
    if (!meta || !doc) return { error: 'not found' };
    const room = JSON.parse(meta), me = JSON.parse(doc);
    if (!b.sec || b.sec !== me.sec) return { error: 'forbidden' };
    if (round >= room.rounds || !(me.results && me.results[round])) return { error: 'not yet' };
    const docs = await one('MGET', ...ids.map((id) => 'room:v3:' + c + ':p:' + id));
    const players = docs.filter(Boolean).map((d) => JSON.parse(d));
    const closed = Date.now() > roundOpens(room, round) + roomOpenH(room) * 3600e3;
    if (!closed && players.some((p) => !(p.results && p.results[round]))) return { error: 'not yet', waiting: players.filter((p) => !(p.results && p.results[round])).length };
    const sess = await one('MGET', ...players.map((p) => sessKey({ kind: 'r', code: c, round }, p.pid)));
    const e = engineOf({ kind: 'r', code: c, round, v4: roundOpens(room, round) >= V4_FROM_MS });
    let cast = null;
    const rows = players.map((p, k) => {
      let s = null; try { s = JSON.parse(sess[k]); } catch { s = null; }
      const res = s && s.res; if (!res) return null;
      if (!cast) cast = res.cast;
      return { pid: p.pid, nick: p.nick, pub: p.pub || p.pid, flair: p.flair || '', tier: p.tier || '', score: res.total, tier2: res.tier, ex: res.ex, row: res.row, ...(res.v === 4 ? { v: 4, scoops: res.scoops } : {}),
        per: res.per.map((x) => ({ i: x.i, call: x.call ? { day: x.call.day, o: x.call.o, s: x.call.s, ut: !!x.call.ut } : null, right: x.right, excl: !!(x.excl || x.scoop), scoop: !!x.scoop, pts: x.pts, truth: x.truth })) };
    }).filter(Boolean);
    return { code: c, round, v: e.v, cast, players: rows, days: e.days };
  },

  // ---- Beat my board (§7.3): a finished window becomes a 24 h challenge link. The seed of a live Daily never leaves
  // the server: a Daily challenge is settled from the players' own ranked results, or replayed once the seed is public.
  async 'challenge.create'(b) {
    const dev = devId(b.dev); if (!dev) return { error: 'dev' };
    const nick = nickOf(b.nick, dev), by = { pub: pubId(dev), nick, flair: flairOf(b.flair), tier: tierOf(b.tier) };
    const mode = ['daily', 'career', 'deadline', 'tutorial'].includes(b.mode) ? b.mode : 'practice';
    let doc;
    if (mode === 'daily') {
      const day = dayOf(b.day); if (!day) return { error: 'day' };
      const mine = await getJ('t1v3:lb:d:' + day + ':e:' + dev); if (!mine) return { error: 'played' };
      doc = { kind: 'daily', day, no: dailyNo(day), target: { score: mine.score, tier: mine.tier, row: mine.row || '', ex: mine.ex || 0 }, ...(E4.isV4Day(day) ? { v: 4 } : {}) };
    } else if (b.v === 4 || b.rules) {
      // 4.0: every local mode travels with its rule spec; the maker's log is replayed here under those exact rules.
      const seed = seedOf(b.seed); if (!seed) return { error: 'seed' };
      const spec = specOf(b.rules || { mode });
      const log = parseLog(b.log); if (!log) return { error: 'log' };
      const sc = scoreLog4(seed, log, spec); if (!sc) return { error: 'log' };
      doc = { kind: spec.mode === 'daily' || spec.mode === 'room' ? 'practice' : spec.mode, v: 4, seed, rules: spec, target: { score: sc.score, tier: sc.tier, row: sc.row, ex: sc.scoops, scoops: sc.scoops } };
    } else {
      const seed = seedOf(b.seed); if (!seed) return { error: 'seed' };
      if (mode === 'practice') {
        const log = parseLog(b.log); if (!log) return { error: 'log' };
        const sc = scoreLog(seed, log); if (!sc) return { error: 'log' };
        doc = { kind: 'practice', seed, target: { score: sc.score, tier: sc.tier, row: sc.row, ex: sc.ex } };
      } else {
        // Career runs its own rules locally; the score to beat is the reporter's word, and the board replays under Daily rules.
        const score = int(b.score, RULES.SCORE_MIN, RULES.SCORE_MAX);
        doc = { kind: 'career', seed, target: { score, tier: ['T1', 'T2', 'T3', 'T4', 'SPIKED'].includes(b.tier) ? b.tier : 'T4', row: clean(b.row, 8), ex: int(b.ex, 0, 5) } };
      }
    }
    for (let i = 0; i < 8; i++) {
      const c = code(6), now = Date.now();
      const full = { ...doc, code: c, by, byDev: dev, at: now, exp: now + CH_OPEN_MS, label: clean(b.label, 40), res: [] };
      if (await one('SET', 't1v3:ch:' + c, JSON.stringify(full), 'EX', CH_TTL, 'NX')) {
        await redis([['LPUSH', 't1v3:ch:by:' + dev, c], ['LTRIM', 't1v3:ch:by:' + dev, 0, CH_MINE - 1], ['EXPIRE', 't1v3:ch:by:' + dev, CH_TTL]]);
        return { challenge: chView(full, dev) };
      }
    }
    return { error: 'busy' };
  },
  async 'challenge.get'(b) {
    const c = roomCode(b.code), dev = devId(b.dev);
    const ch = await getJ('t1v3:ch:' + c); if (!ch) return { error: 'not found' };
    const out = { challenge: chView(ch, dev) };
    if (ch.kind === 'daily' && ch.day < today()) out.seed = saltedSeed('daily-' + ch.day);
    if (ch.kind !== 'daily') out.seed = ch.seed;
    if (ch.v === 4) { out.v = 4; out.rules = ch.rules || E4.specOf('daily'); }
    if (ch.kind === 'daily' && dev) { const mine = await getJ('t1v3:lb:d:' + ch.day + ':e:' + dev); if (mine) out.played = { score: mine.score, tier: mine.tier }; }
    return out;
  },
  async 'challenge.submit'(b) {
    const c = roomCode(b.code), dev = devId(b.dev); if (!dev) return { error: 'dev' };
    const key = 't1v3:ch:' + c, ch = await getJ(key); if (!ch) return { error: 'not found' };
    if (ch.byDev === dev) return { error: 'own' };
    const pub = pubId(dev);
    if (ch.res.some((r) => r.pub === pub)) return { error: 'done', challenge: chView(ch, dev) };
    if (Date.now() > ch.exp) return { error: 'expired', challenge: chView(ch, dev) };
    if (ch.res.length >= CH_MAX_RES) return { error: 'full' };
    let sc;
    if (ch.kind === 'daily') {
      const mine = await getJ('t1v3:lb:d:' + ch.day + ':e:' + dev);
      if (mine) sc = { score: mine.score, tier: mine.tier, row: mine.row || '', ex: mine.ex || 0 };
      else if (ch.day === today()) return { error: 'play' };
      else { const log = parseLog(b.log); if (!log) return { error: 'log' }; sc = ch.v === 4 ? scoreLog4(saltedSeed('daily-' + ch.day), log, E4.specOf('daily')) : scoreLog(saltedSeed('daily-' + ch.day), log); if (!sc) return { error: 'log' }; }
    } else {
      // The taker plays the rules the maker played (stored with the challenge), never the taker's own.
      const log = parseLog(b.log); if (!log) return { error: 'log' };
      sc = ch.v === 4 ? scoreLog4(ch.seed, log, ch.rules || E4.specOf('daily')) : scoreLog(ch.seed, log); if (!sc) return { error: 'log' };
    }
    const r = { pub, nick: nickOf(b.nick, dev), flair: flairOf(b.flair), tier: tierOf(b.tier), score: sc.score, rtier: sc.tier, row: sc.row, ex: sc.ex, at: Date.now(), r: sc.score > ch.target.score ? 'w' : sc.score < ch.target.score ? 'l' : 'd' };
    ch.res.push(r);
    const ttl = Math.max(60, Math.floor((ch.at + CH_TTL * 1000 - Date.now()) / 1000));
    await setJ(key, ch, ttl);
    return { challenge: chView(ch, dev), me: r };
  },
  async 'challenge.mine'(b) {
    const dev = devId(b.dev); if (!dev) return { error: 'dev' };
    const codes = await one('LRANGE', 't1v3:ch:by:' + dev, 0, CH_MINE - 1);
    const docs = codes && codes.length ? await one('MGET', ...codes.map((c) => 't1v3:ch:' + c)) : [];
    const list = docs.map((d) => { try { return JSON.parse(d); } catch { return null; } }).filter(Boolean).map((ch) => chView(ch, dev));
    return { list };
  },

  // ---- Newsroom (§7.3): up to 20 reporters under one masthead. The weekly table sums each member's league week
  // (Daily tier points + Wire points, both scored here), and newsrooms rank against each other on that total.
  async 'newsroom.create'(b) {
    const dev = devId(b.dev); if (!dev) return { error: 'dev' };
    const nick = clean(b.nick, 16); if (!nick || !nickOk(nick)) return { error: 'nick' };
    const name = clean(b.name, 28); if (!name || !nickOk(name)) return { error: 'name' };
    if (await one('GET', 't1v3:nr:of:' + dev)) return { error: 'member' };
    for (let i = 0; i < 8; i++) {
      const c = code(6);
      const nr = { code: c, name, motto: clean(b.motto, 60), created: Date.now(), host: pubId(dev), hostDev: dev, masthead: mastheadOf(b.masthead) };
      if (await one('SET', 't1v3:nr:' + c, JSON.stringify(nr), 'EX', NR_TTL, 'NX')) {
        await nrJoin(c, dev, nick, b);
        return actions['newsroom.get']({ code: c, dev });
      }
    }
    return { error: 'busy' };
  },
  async 'newsroom.join'(b) {
    const dev = devId(b.dev); if (!dev) return { error: 'dev' };
    const nick = clean(b.nick, 16); if (!nick || !nickOk(nick)) return { error: 'nick' };
    const c = roomCode(b.code);
    const [meta, n, cur] = await redis([['GET', 't1v3:nr:' + c], ['SCARD', 't1v3:nr:' + c + ':m'], ['GET', 't1v3:nr:of:' + dev]]);
    if (!meta) return { error: 'not found' };
    if (cur && cur !== c) return { error: 'member' };
    if (cur !== c && Number(n) >= NR_MAX) return { error: 'full' };
    await nrJoin(c, dev, nick, b);
    return actions['newsroom.get']({ code: c, dev });
  },
  async 'newsroom.leave'(b) {
    const dev = devId(b.dev); if (!dev) return { error: 'dev' };
    const c = roomCode(b.code) || (await one('GET', 't1v3:nr:of:' + dev)); if (!c) return { error: 'not found' };
    const nr = await getJ('t1v3:nr:' + c); if (!nr) return { error: 'not found' };
    await redis([['SREM', 't1v3:nr:' + c + ':m', dev], ['DEL', 't1v3:nr:' + c + ':m:' + dev], ['DEL', 't1v3:nr:of:' + dev]]);
    const left = await one('SMEMBERS', 't1v3:nr:' + c + ':m');
    if (!left.length) { await redis([['DEL', 't1v3:nr:' + c], ['ZREM', 't1v3:nr:w:' + isoWeek(today()), c]]); return { gone: true }; }
    if (nr.hostDev === dev) { const next = await getJ('t1v3:nr:' + c + ':m:' + left[0]); nr.hostDev = left[0]; nr.host = next ? next.pub : pubId(left[0]); await setJ('t1v3:nr:' + c, nr, NR_TTL); }
    return { gone: false };
  },
  // Host only: the masthead's cosmetic slots (frame, ink, flair: cosmetic ids the Pass sells; the client renders what it knows).
  async 'newsroom.masthead'(b) {
    const dev = devId(b.dev); if (!dev) return { error: 'dev' };
    const c = roomCode(b.code), nr = await getJ('t1v3:nr:' + c); if (!nr) return { error: 'not found' };
    if (nr.hostDev !== dev) return { error: 'forbidden' };
    nr.masthead = mastheadOf(b.masthead);
    if (typeof b.motto === 'string') nr.motto = clean(b.motto, 60);
    if (typeof b.name === 'string') { const name = clean(b.name, 28); if (name && nickOk(name)) nr.name = name; }
    await setJ('t1v3:nr:' + c, nr, NR_TTL);
    return actions['newsroom.get']({ code: c, dev });
  },
  async 'newsroom.get'(b) {
    const dev = devId(b.dev);
    const c = roomCode(b.code) || (dev ? await one('GET', 't1v3:nr:of:' + dev) : '');
    if (!c) return { newsroom: null, top: await nrTop(isoWeek(today())) };
    const [meta, ids] = await redis([['GET', 't1v3:nr:' + c], ['SMEMBERS', 't1v3:nr:' + c + ':m']]);
    if (!meta) return { error: 'not found' };
    const nr = JSON.parse(meta), week = isoWeek(today()), prev = prevWeek(today());
    if (dev && b.nick) { const md = await getJ('t1v3:nr:' + c + ':m:' + dev); if (md) { const nick = clean(b.nick, 16); Object.assign(md, { flair: flairOf(b.flair), tier: tierOf(b.tier), seen: Date.now() }, nick && nickOk(nick) ? { nick } : {}); await setJ('t1v3:nr:' + c + ':m:' + dev, md, NR_TTL); } }
    const keys = ids.flatMap((d) => ['t1v3:nr:' + c + ':m:' + d, 't1v3:lg:seat:' + week + ':' + d, 't1v3:lg:seat:' + prev + ':' + d]);
    const docs = keys.length ? await one('MGET', ...keys) : [];
    const J = (x) => { try { return JSON.parse(x); } catch { return null; } };
    const members = ids.map((d, k) => {
      const m = J(docs[3 * k]), s = J(docs[3 * k + 1]), p = J(docs[3 * k + 2]);
      if (!m) return null;
      const pts = s ? Math.round((s.daily || 0) + (s.wire || 0)) : 0, last = p ? Math.round((p.daily || 0) + (p.wire || 0)) : 0;
      return { pub: m.pub, nick: m.nick, flair: m.flair || '', tier: m.tier || '', joined: m.joined, seen: m.seen || m.joined, daily: s ? s.daily || 0 : 0, wire: s ? Math.round((s.wire || 0) * 10) / 10 : 0, pts, last, me: !!dev && d === dev, host: m.pub === nr.host };
    }).filter(Boolean).sort((a, b2) => b2.pts - a.pts || a.joined - b2.joined);
    const total = members.reduce((a, m) => a + m.pts, 0), lastTotal = members.reduce((a, m) => a + m.last, 0);
    const wk = 't1v3:nr:w:' + week;
    await redis([['ZADD', wk, total, c], ['EXPIRE', wk, LG_TTL], ['SET', 't1v3:nr:name:' + c, JSON.stringify({ name: nr.name, n: members.length }), 'EX', NR_TTL]]);
    const rank = 1 + Number(await one('ZCOUNT', wk, '(' + total, '+inf'));
    const lastRank = lastTotal > 0 ? 1 + Number(await one('ZCOUNT', 't1v3:nr:w:' + prev, '(' + lastTotal, '+inf')) : null;
    const { hostDev, ...pubNr } = nr;
    return { newsroom: { ...pubNr, members, week, prevWeek: prev, total, lastTotal, rank, lastRank, mine: !!dev && ids.includes(dev), isHost: !!dev && hostDev === dev, max: NR_MAX }, top: await nrTop(week) };
  },
  async 'newsroom.top'() { const week = isoWeek(today()); return { week, top: await nrTop(week) }; },

  // ---- Live presence (§7.3): who is on this board now, and who broke it first (only shown once you have results).
  async 'live.count'(b) {
    const dev = devId(b.dev), board = liveBoard(b.board), key = 't1v3:live:' + board, now = Date.now();
    const cmds = [['ZREMRANGEBYSCORE', key, '-inf', now - LIVE_WINDOW_S * 1000]];
    if (dev) cmds.push(['ZADD', key, now, dev], ['EXPIRE', key, LIVE_TTL]);
    cmds.push(['ZCARD', key]);
    const out = await redis(cmds);
    return { board, n: Number(out[out.length - 1]) || 0, windowMin: LIVE_WINDOW_S / 60 };
  },
  async 'live.first'(b) {
    const dev = devId(b.dev), day = today();
    const first = await getJ('t1v3:live:first:' + day);
    const sess = dev ? await getJ(sessKey({ kind: 'd', day }, dev)) : null;
    if (!(sess && sess.res)) return { day, first: null, locked: true, any: !!first };
    if (!first) return { day, first: null, locked: false };
    const cast = boardFor({ kind: 'd', day }).cast, sg = cast.sagas[first.i];
    return { day, first: { nick: first.nick, p: sg && sg.player ? sg.player.s || sg.player.n : '', i: first.i, at: first.at, me: first.dev === dev }, locked: false };
  },
};

// ---------------------------------------------------------------- Deadline Day Live helpers
// The real deadline days (UTC dates) and the Wire window each belongs to. The client's copy is the source of truth for
// the calendar: games/tier-one/v3/web/src/lib/season.ts › DEADLINE_DAYS. Keep the two lists identical.
const DD_DAYS = { '2027-02-02': '2027-01', '2027-09-01': '2027-summer' };
const DD_TTL = 40 * DAY, DD_SAGAS = 5, DD_POOL = 12, DD_EARLY_H = 12;
// Points: right +10 / +22 / +40 by loudness (Talks / Advanced / Confirmed), ×1.25 when filed before 12:00 UTC (the early
// bird); wrong −4 / −12 / −30. Uncalled sagas score 0. A void saga (gone from the data) scores nobody.
const DD_RIGHT = [10, 22, 40], DD_WRONG = [4, 12, 30], DD_EARLY_X = 1.25;
const DD_OUT = ['done', 'hijack', 'stays'];
const ddPreview = () => !!process.env.T1_DD_PREVIEW && process.env.VERCEL_ENV !== 'production';
const ddCallKey = (day, dev) => 't1v3:dd:calls:' + day + ':' + dev;
const nextDD = (day = today()) => Object.keys(DD_DAYS).filter((d) => d > day).sort()[0] || null;
const lastDD = (day = today()) => Object.keys(DD_DAYS).filter((d) => d <= day).sort().pop() || null;
function ddDay(b) {
  const d = clean(b && b.day, 10);
  if (DD_DAYS[d] && (d === today() || ddPreview())) return d;
  return DD_DAYS[today()] ? today() : null;
}
// The five sagas of the day: the hottest open rumours of the window, then a seeded shuffle of that pool so the five aren't
// just the Wire's top of the page. Built once and stored, so a snapshot refresh mid-day can't change the board.
async function ddBoard(day) {
  const key = 't1v3:dd:board:' + day;
  const cached = await getJ(key); if (cached) return cached;
  const snap = loadSnapshot(), win = DD_DAYS[day];
  const usable = (r) => r.status === 'open' && r.linked && r.linked.length && r.linked[0].clubId;
  let rs = snap.rumours.filter((r) => usable(r) && r.window === win);
  if (rs.length < DD_SAGAS) rs = snap.rumours.filter(usable);
  const seed = saltedSeed('ddlive-' + day);
  const pool = [...rs].sort((a, b) => (b.heat || 0) - (a.heat || 0) || a.id.localeCompare(b.id)).slice(0, Math.max(DD_SAGAS, DD_POOL));
  const five = pool.map((r) => ({ r, h: hashStr(seed + '|' + r.id) })).sort((a, b) => a.h - b.h).slice(0, DD_SAGAS).map((x) => x.r);
  const sagas = five.map((r, i) => ({
    i, rid: r.id, player: r.playerName, playerId: r.playerId, from: r.currentClubName, fromId: r.currentClubId,
    to: { id: r.linked[0].clubId, name: r.linked[0].name, stage: r.linked[0].stage },
    others: r.linked.slice(1, 3).map((l) => ({ id: l.clubId, name: l.name })), heat: r.heat || 0, market: marketOf(r), fact: r.fact || null,
  }));
  const opensAt = Date.parse(day + 'T00:00:00Z');
  const board = { day, window: win, opensAt, closesAt: opensAt + DAY_MS, sagas, names: snap.mode };
  await one('SET', key, JSON.stringify(board), 'EX', DD_TTL, 'NX');
  return (await getJ(key)) || board;
}
async function ddTally(day) {
  const [h, n] = await redis([['HGETALL', 't1v3:dd:tally:' + day], ['SCARD', 't1v3:dd:players:' + day]]);
  const counts = {};
  for (const [k, v] of Object.entries(hashObj(h))) {
    const i = k.lastIndexOf(':'); if (i < 0) continue;
    const rid = k.slice(0, i), oi = Number(k.slice(i + 1));
    if (!(oi >= 0 && oi < DD_OUT.length)) continue;
    (counts[rid] = counts[rid] || DD_OUT.map(() => 0))[oi] = Math.max(0, Number(v) || 0);
  }
  return { counts, players: Number(n) || 0 };
}
// A saga's real outcome: done (joined the linked club), hijack (joined someone else), stays (no move), or pending while the
// snapshot hasn't caught up. The Wire's own resolution (wire.mjs rumourState) decides; nothing here is hand-typed.
function ddOutcome(saga, snap, now) {
  const r = snap.rumours.find((x) => x.id === saga.rid) || ghostRumour(saga.rid);
  const st = rumourState(r, snap, OVERRIDES, now);
  if (st.state === 'moved') return { o: saga.to && st.club === saga.to.id ? 0 : 1, club: st.club || null, at: st.at };
  if (st.state === 'stayed') return { o: 2, club: null, at: st.at };
  if (st.state === 'void') return { o: null, void: true };
  return { o: null };
}
function ddPoints(call, out, opensAt) {
  if (!call || !out || out.o == null) return null;
  const s = int(call.s, 1, 3), right = call.o === out.o;
  const early = (call.utAt || call.at) < opensAt + DD_EARLY_H * 3600e3;
  return { pts: right ? Math.round(DD_RIGHT[s - 1] * (early ? DD_EARLY_X : 1)) : -DD_WRONG[s - 1], right, early };
}
export { DD_DAYS, DD_OUT, DD_RIGHT, DD_WRONG, DD_EARLY_X, ddPoints };

const hashObj = (h) => { if (!h) return {}; if (!Array.isArray(h)) return h; const o = {}; for (let i = 0; i < h.length; i += 2) o[h[i]] = h[i + 1]; return o; };
const stripView = ({ player, from, linked, mNow, paper, ...c }) => c;
async function wireCalls(dev) {
  const h = hashObj(await one('HGETALL', 't1v3:w:calls:' + dev)), out = {};
  for (const [k, v] of Object.entries(h)) { try { out[k] = JSON.parse(v); } catch { /* skip */ } }
  return out;
}
const roomPlayer = (pid, nick, sec, b) => ({ pid, nick, joined: Date.now(), seen: Date.now(), results: [], sec, pub: devId(b.dev) ? pubId(devId(b.dev)) : pid, flair: flairOf(b.flair), tier: tierOf(b.tier) });
async function readFeed(c) {
  const raw = await one('LRANGE', 'room:v3:' + c + ':feed', 0, ROOM_FEED - 1);
  return (raw || []).map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean);
}
async function readRoom(c) {
  const [meta, ids, feedRaw] = await redis([['GET', 'room:v3:' + c], ['SMEMBERS', 'room:v3:' + c + ':players'], ['LRANGE', 'room:v3:' + c + ':feed', 0, ROOM_FEED - 1]]);
  if (!meta) return null;
  const room = JSON.parse(meta);
  const docs = ids && ids.length ? await one('MGET', ...ids.map((id) => 'room:v3:' + c + ':p:' + id)) : [];
  room.players = docs.filter(Boolean).map((d) => { const p = JSON.parse(d); delete p.sec; p.pub = p.pub || p.pid; return p; });
  room.cadence = room.cadence || 'daily';
  room.now = Date.now(); room.roundHours = roomOpenH(room); room.stepMs = roomStep(room);
  room.feed = (feedRaw || []).map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean);
  return room;
}
// Challenges: what either side may see (never the maker's device id).
const chView = (ch, dev) => { const { byDev, ...v } = ch; return { ...v, open: Date.now() < ch.exp, mine: !!dev && byDev === dev }; };
const liveBoard = (x) => { const s = clean(x, 24).toLowerCase().replace(/[^a-z0-9:\-]/g, ''); return !s || s === 'daily' ? 'daily:' + today() : s; };
const mastheadOf = (m) => { const o = m && typeof m === 'object' ? m : {}; return { frame: flairOf(o.frame), ink: flairOf(o.ink), flair: flairOf(o.flair) }; };
async function nrJoin(c, dev, nick, b) {
  const doc = { pub: pubId(dev), nick, joined: Date.now(), seen: Date.now(), flair: flairOf(b.flair), tier: tierOf(b.tier) };
  await redis([['SET', 't1v3:nr:' + c + ':m:' + dev, JSON.stringify(doc), 'EX', NR_TTL], ['SADD', 't1v3:nr:' + c + ':m', dev], ['EXPIRE', 't1v3:nr:' + c + ':m', NR_TTL], ['SET', 't1v3:nr:of:' + dev, c, 'EX', NR_TTL]]);
}
async function nrTop(week) {
  const z = await one('ZREVRANGE', 't1v3:nr:w:' + week, 0, NR_TOP - 1, 'WITHSCORES');
  const codes = []; for (let i = 0; i < (z || []).length; i += 2) codes.push(z[i]);
  const docs = codes.length ? await one('MGET', ...codes.map((c) => 't1v3:nr:name:' + c)) : [];
  return codes.map((c, i) => { let d = null; try { d = JSON.parse(docs[i]); } catch { d = null; } return { code: c, name: (d && d.name) || c, n: (d && d.n) || 0, pts: Number(z[2 * i + 1]) || 0 }; });
}

// League seats: first activity in a week seats you in a group of 30 in your division; last week's finish moves you.
const groupKey = (week, div, grp) => 't1v3:lg:' + week + ':g:' + div + ':' + grp;
async function leagueSeat(dev, nick, day) {
  const week = isoWeek(day), sk = 't1v3:lg:seat:' + week + ':' + dev;
  const seat = await getJ(sk);
  if (seat) return seat;
  let div = Number(await one('GET', 't1v3:lg:div:' + dev)) || 0, last = null;
  const prev = await getJ('t1v3:lg:seat:' + prevWeek(day) + ':' + dev);
  if (prev && !prev.moved) {
    const gk = groupKey(prev.week, prev.div, prev.grp);
    const [sc, n] = await redis([['ZSCORE', gk, dev], ['ZCARD', gk]]);
    const rank = sc == null ? null : 1 + Number(await one('ZCOUNT', gk, '(' + Number(sc), '+inf'));
    if (rank) {
      const size = Number(n) || 0;
      if (rank <= LEAGUE.UP && div < LEAGUE.DIVS.length - 1) div++;
      else if (size >= LEAGUE.UP + LEAGUE.DOWN && rank > size - LEAGUE.DOWN && div > 0) div--;
      last = { rank, size, from: prev.div, to: div };
    }
  }
  const n = Number(await one('INCR', 't1v3:lg:' + week + ':n:' + div));
  const s = { week, div, grp: Math.floor((n - 1) / LEAGUE.SIZE), nick, daily: 0, wire: 0, last };
  await redis([['SET', sk, JSON.stringify(s), 'EX', LG_TTL], ['SET', 't1v3:lg:div:' + dev, String(div), 'EX', 400 * DAY], ['ZADD', groupKey(week, div, s.grp), 'NX', 0, dev], ['EXPIRE', groupKey(week, div, s.grp), LG_TTL]]);
  return s;
}
async function leagueAdd(dev, nick, day, pts, kind) {
  const s = await leagueSeat(dev, nick, day);
  let add = pts;
  if (kind === 'wire') { const room = Math.max(0, LEAGUE.WIRE_CAP - s.wire); add = Math.max(-s.wire, Math.min(room, pts)); s.wire = Math.round((s.wire + add) * 10) / 10; }
  else s.daily += pts;
  if (!add) return;
  await redis([['ZINCRBY', groupKey(s.week, s.div, s.grp), add, dev], ['SET', 't1v3:lg:seat:' + s.week + ':' + dev, JSON.stringify(s), 'EX', LG_TTL]]);
}

export { actions, parseAct, saltedSeed, isoWeek, dailyNo, OUT, pubId, scoreLog4, dropsOf };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); return res.status(204).end(); }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });
  if (!URL_ || !TOKEN) return res.status(200).json({ ok: false, error: 'offline' });
  if (!SALT && process.env.VERCEL_ENV === 'production') return res.status(200).json({ ok: false, error: 'offline', why: 'salt' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object' || JSON.stringify(body).length > 4000) return res.status(400).json({ ok: false, error: 'body' });
  const fn = actions[body.action];
  if (!fn) return res.status(400).json({ ok: false, error: 'action' });
  try {
    if (body.action !== 'health' && !(await rateOk(clientIp(req)))) return res.status(429).json({ ok: false, error: 'rate' });
    const out = await fn(body);
    return res.status(200).json(Object.assign({ ok: !out.error }, out));
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'store' });
  }
}
