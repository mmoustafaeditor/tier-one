// Tier One v3 online (Vercel function, Node 18+): the server-held Daily, leaderboards, The Wire, weekly leagues and
// Friends rooms. POST /api/tier-one/v3 { action, ... } -> { ok:true, ... } | { ok:false, error }
//
// Storage: Upstash Redis over REST, same env as api/online.js (KV_REST_API_URL + KV_REST_API_TOKEN, or
// UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN). Without them every action answers { ok:false, error:'offline' }.
// T1V3_SALT (optional; falls back to a hash of the store token): the secret mixed into every ranked seed so nobody can compute a board from the
// repo. Yesterday's seed is published by `daily.seed` so any board can be replayed and audited the day after.
//
// The Daily is scored here: the client never holds the truth. Every request replays the stored action log through the
// rules engine (_lib/engine.mjs), applies one new action and stores the log again.
import { RULES, buildBoard, newGame, apply, replay, pub, resolve, isOver, finish, gridRow, OUT, truthAt } from './_lib/engine.mjs';
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
const SESSION_TTL = 3 * DAY, ROOM_TTL = 21 * DAY, /* a room nobody opens for 21 days closes itself (spec H §6) */ LB_DAY_TTL = 40 * DAY, LB_WEEK_TTL = 60 * DAY, LG_TTL = 70 * DAY;
const DAILY_EPOCH = Date.parse('2026-09-01T00:00:00Z'); // Daily No. 1
const DD_GRACE_MS = 4000;            // network grace on the Deadline Day clock
const LB_TOP = 25;
// 3.8 Multiplayer rooms (brief §16–17, docs/spec/H-multiplayer-system.md): a group chat of football obsessives.
//   MAX_ROOM 16      hard cap (recommended 2–12): the recap card and the table stay readable; 24 was tournament scale.
//   ROOM_ROUNDS      3 (a taster) · 7 (default: a week of daily boards, or a 7-week season) · 14 (a long season).
//   ROUND_OPEN_H 48  a daily-cadence round stays open two days so every time zone and a missed evening still count.
//   WEEK_OPEN_H      a weekly round is open Monday to Sunday night on the real calendar.
//   TAUNT_GAP 30     one taunt every 30 s per reporter: banter flows, spam doesn't (fixes the 45 s / "a minute" mismatch).
//   ROOM_TTL 21 d    idle expiry: three weekly rounds nobody opened means the group has moved on; a finished room
//                    stays readable (table, recaps) for 21 days after the last visit, then goes.
const MAX_ROOM = 16, ROUND_OPEN_H = 48, ROOM_ROUNDS = [3, 7, 14], ROOM_ROUNDS_DEFAULT = 7;
const WEEK_OPEN_H = 7 * 24, ROOM_FEED = 60, TAUNTS = 8, TAUNT_GAP = 30;
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
  return { score: r.total, tier: r.tier, row: gridRow(r), ex: r.ex, hwg: hwgOf(r) };
}
// HERE WE GO cards (GOTY.md §2): right Done calls at Confirmed, by saga index.
const hwgOf = (r) => r.per.filter((p) => p.right && p.call && p.call.o === 0 && p.call.s === 2).map((p) => p.i);
const mondayOf = (day) => { const t = Date.parse(day + 'T00:00:00Z'); const dow = (new Date(t).getUTCDay() + 6) % 7; return t - dow * DAY_MS; };
const roomStep = (room) => (room.cadence === 'weekly' ? 7 * DAY_MS : DAY_MS);
const roomOpenH = (room) => (room.cadence === 'weekly' ? WEEK_OPEN_H : ROUND_OPEN_H);
const roundOpens = (room, k) => room.created + k * roomStep(room);
function code(n) { let s = ''; const b = new Uint8Array(n); crypto.getRandomValues(b); for (const x of b) s += ALPHA[x % ALPHA.length]; return s; }
function secret() { const b = new Uint8Array(18); crypto.getRandomValues(b); return Buffer.from(b).toString('base64url'); }
const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);
const today = () => ymd(Date.now());
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
  if (!Array.isArray(a) || a.length > 4) return null;
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
function boardFor(sc) {
  const seed = saltedSeed(scopeBase(sc));
  return { seed, board: buildBoard(seed, RULES), cast: buildCast(seed, world(), { n: RULES.SAGAS }) };
}
function ddLeft(sess, g) {
  if (g.day !== RULES.DAYS || !sess.ddAt) return null;
  return sess.ddAt + RULES.DD_SECONDS * 1000 - Date.now();
}
function view(sc, sess, g, cast, extra) {
  const out = { scope: sc, no: sc.kind === 'd' ? dailyNo(sc.day) : sc.round + 1, cast: publicCast(cast, !!sess.res), state: pub(g), done: !!sess.res, ...extra };
  const left = ddLeft(sess, g); if (left != null) out.ddLeftMs = Math.max(0, left);
  if (sess.res) out.result = sess.res;
  return out;
}
// Score the finished window, store it, rank it.
async function settle(sc, who, sess, g, cast, nick) {
  const r = resolve(g);
  if (r.total < RULES.SCORE_MIN || r.total > RULES.SCORE_MAX) throw new Error('bounds');
  const res = { total: r.total, tier: r.tier, right: r.right, wrong: r.wrong, ex: r.ex, called: r.called, uturns: r.uturns, row: gridRow(r), per: r.per, cast: publicCast(cast, true), at: Date.now() };
  if (sc.kind === 'd') {
    const dk = 't1v3:lb:d:' + sc.day, week = isoWeek(sc.day), wk = 't1v3:lb:w:' + week;
    const doc = { nick, score: r.total, tier: r.tier, row: res.row, ex: r.ex };
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
    if (p) { p.results[sc.round] = { score: r.total, tier: r.tier, ex: r.ex, row: res.row, at: Date.now() }; await setJ(key, p, ROOM_TTL); }
    // The room feed: the call lands; exclusives are named (gold is for exclusives only, brief §8). `hwg` stays for 3.7 clients.
    const nameOf = (i) => (cast.sagas[i] && cast.sagas[i].player ? cast.sagas[i].player.s || cast.sagas[i].player.n : '');
    const hwg = hwgOf(r).map(nameOf).filter(Boolean);
    const excl = r.per.filter((p) => p.excl).map((p) => nameOf(p.i)).filter(Boolean);
    await roomFeed(sc.code, { t: 'filed', pid: who, nick, round: sc.round, score: r.total, tier: r.tier, ex: r.ex, row: res.row, hwg, excl });
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
    return { sc: { kind: 'r', code: c, round }, who: pid, nick: p.nick };
  }
  const dev = devId(b.dev);
  if (!dev) return { error: 'dev' };
  return { sc: { kind: 'd', day: today() }, who: dev, nick: nickOf(b.nick, dev) };
}
async function loadSession(b) {
  const s = await scopeOf(b); if (s.error) return s;
  const { board, cast } = boardFor(s.sc);
  const key = sessKey(s.sc, s.who);
  const sess = (await getJ(key)) || { log: [], t0: Date.now(), nick: s.nick };
  const g = replay(board, sess.log, RULES);
  if (!g) return { error: 'log' };
  return { ...s, key, sess, g, cast, ttl: s.sc.kind === 'd' ? SESSION_TTL : ROOM_TTL };
}
// Deadline Day: once the clock (plus grace) has run out, the window ends whatever the client says.
async function expireIfLate(x) {
  const left = ddLeft(x.sess, x.g);
  if (!x.sess.res && left != null && left < -DD_GRACE_MS) {
    finish(x.g); x.sess.log = x.g.log.slice();
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
    // The Deadline Day clock starts with the first thing done on day 7 (or daily.dd), not at the end of day 6.
    if (x.g.day === RULES.DAYS && !x.sess.ddAt) x.sess.ddAt = Date.now();
    if (!apply(x.g, a)) return { error: 'rule', ...view(x.sc, x.sess, x.g, x.cast, {}) };
    x.sess.log = x.g.log.slice();
    const extra = {};
    if (a[0] === 'a') extra.answer = x.g.clues[a[1]][x.g.clues[a[1]].length - 1];
    // Live presence: a Confirmed call that is right as of today's truth is the day's "first to break it" candidate.
    if (x.sc.kind === 'd' && a[0] === 'c' && a[3] === 2) {
      const sg = x.g.board.sagas[a[1]];
      if (sg && a[2] === truthAt(sg, x.g.day)) await one('SET', 't1v3:live:first:' + x.sc.day, JSON.stringify({ dev: x.who, nick: x.sess.nick || x.nick, i: a[1], at: Date.now() }), 'EX', LIVE_TTL, 'NX');
    }
    if (isOver(x.g)) await settle(x.sc, x.who, x.sess, x.g, x.cast, x.sess.nick || x.nick);
    await setJ(x.key, x.sess, x.ttl);
    return view(x.sc, x.sess, x.g, x.cast, extra);
  },
  // Turn the page onto Deadline Day: the 60-second clock starts now.
  async 'daily.dd'(b) {
    const x = await loadSession(b); if (x.error) return x;
    if (!x.sess.res && x.g.day === RULES.DAYS && !x.sess.ddAt) { x.sess.ddAt = Date.now(); await setJ(x.key, x.sess, x.ttl); }
    await expireIfLate(x);
    return view(x.sc, x.sess, x.g, x.cast, {});
  },
  // End the window now (the clock ran out on the client, or the player files nothing more).
  async 'daily.finish'(b) {
    const x = await loadSession(b); if (x.error) return x;
    if (!x.sess.res) {
      // Before Deadline Day the window can't be skipped: the remaining days are ended one by one like End day.
      finish(x.g); x.sess.log = x.g.log.slice();
      await settle(x.sc, x.who, x.sess, x.g, x.cast, x.sess.nick || x.nick);
      await setJ(x.key, x.sess, x.ttl);
    }
    return view(x.sc, x.sess, x.g, x.cast, {});
  },
  // A past day's seed (published the day after) so anyone can replay a Daily in Practice and audit it.
  async 'daily.seed'(b) {
    const day = clean(b.day, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day >= today() || day < '2026-09-01') return { error: 'day' };
    const seed = saltedSeed('daily-' + day);
    return { day, no: dailyNo(day), seed, cast: publicCast(buildCast(seed, world(), { n: RULES.SAGAS }), true) };
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

  // ---- Multiplayer rooms (3.8, spec H): Daily rules exactly, one shared board per round, scored here ----
  // A room is a group chat with a table. `cadence` 'weekly' (default: a season, one round per ISO week from the Monday
  // of creation, open all week) or 'daily' (a sprint: a round a day, each open 48 h). Rounds 3 / 7 / 14. A seat is a
  // { pid, sec } pair the client keeps; the public id (one way from the device) is what friend ledgers key on, and
  // what stops one device taking two seats in the same room (one seat per reporter: you can't scout your own board).
  async 'room.create'(b) {
    const nick = clean(b.nick, 16), name = clean(b.name, 28) || 'Tier One room';
    const rounds = ROOM_ROUNDS.includes(Number(b.rounds)) ? Number(b.rounds) : ROOM_ROUNDS_DEFAULT;
    const cadence = b.cadence === 'daily' ? 'daily' : 'weekly';
    if (!nick || !nickOk(nick)) return { error: 'nick' };
    for (let i = 0; i < 8; i++) {
      const c = code(5), pid = code(10), sec = secret();
      const created = cadence === 'weekly' ? mondayOf(today()) : Date.parse(today() + 'T00:00:00Z');
      const room = { code: c, name, rounds, created, host: pid, cadence, season: season(Date.now()), v: 3 };
      if (await one('SET', 'room:v3:' + c, JSON.stringify(room), 'EX', ROOM_TTL, 'NX')) {
        await redis([['SET', 'room:v3:' + c + ':p:' + pid, JSON.stringify(roomPlayer(pid, nick, sec, b)), 'EX', ROOM_TTL], ['SADD', 'room:v3:' + c + ':players', pid], ['EXPIRE', 'room:v3:' + c + ':players', ROOM_TTL]]);
        await roomFeed(c, { t: 'open', pid, nick, name });
        return { room: await readRoom(c), pid, sec };
      }
    }
    return { error: 'busy' };
  },
  // Join by code or invite link, any time before the last round closes. Rounds already closed count as missed (0).
  async 'room.join'(b) {
    const c = roomCode(b.code), nick = clean(b.nick, 16);
    if (!nick || !nickOk(nick)) return { error: 'nick' };
    const [meta, ids] = await redis([['GET', 'room:v3:' + c], ['SMEMBERS', 'room:v3:' + c + ':players']]);
    if (!meta) return { error: 'not found' };
    const room = JSON.parse(meta);
    if (roomOver(room)) return { error: 'over' };
    if ((ids || []).length >= MAX_ROOM) return { error: 'full' };
    const dev = devId(b.dev);
    if (dev && ids && ids.length) {
      const pub = pubId(dev), docs = await one('MGET', ...ids.map((id) => 'room:v3:' + c + ':p:' + id));
      if (docs.some((d) => { try { return JSON.parse(d).pub === pub; } catch { return false; } })) return { error: 'seated' };
    }
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
  // With { pid, sec } the caller's card is refreshed first (nick, flair, rep tier, public id, last seen). A seat that
  // no longer exists (kicked) answers 'seat' so the client can drop the room with the right note. Opening the room
  // also settles the Press Box: every round that has closed (or that everyone filed) gets its recap card in the feed once.
  async 'room.get'(b) {
    const c = roomCode(b.code);
    const meta = await getJ('room:v3:' + c);
    if (!meta) return { error: 'not found' };
    if (b.pid && b.sec) {
      const key = 'room:v3:' + c + ':p:' + clean(b.pid, 12), p = await getJ(key);
      if (!p) return { error: 'seat' };
      if (p.sec === b.sec) {
        const nick = clean(b.nick, 16);
        Object.assign(p, { seen: Date.now(), flair: flairOf(b.flair), tier: tierOf(b.tier) }, devId(b.dev) ? { pub: pubId(devId(b.dev)) } : {}, nick && nickOk(nick) ? { nick } : {});
        await setJ(key, p, ROOM_TTL);
      }
    }
    await roomRecaps(c, meta);
    const room = await readRoom(c);
    if (room) await redis([['EXPIRE', 'room:v3:' + c, ROOM_TTL], ['EXPIRE', 'room:v3:' + c + ':players', ROOM_TTL], ['EXPIRE', 'room:v3:' + c + ':feed', ROOM_TTL]]); // in use: the 21-day idle clock restarts
    return room ? { room } : { error: 'not found' };
  },
  // Leave a room: your seat goes; a leaving host hands over to the longest-seated player; the last one out closes the room.
  async 'room.leave'(b) {
    const c = roomCode(b.code), pid = clean(b.pid, 12);
    const [meta, doc] = await redis([['GET', 'room:v3:' + c], ['GET', 'room:v3:' + c + ':p:' + pid]]);
    if (!meta || !doc) return { ok: true };
    const p = JSON.parse(doc); if (!b.sec || b.sec !== p.sec) return { error: 'forbidden' };
    const out = await unseat(c, JSON.parse(meta), pid);
    if (out.closed) return { ok: true, closed: true };
    await roomFeed(c, { t: 'leave', pid, nick: p.nick });
    return { ok: true };
  },
  // Host only: show a reporter the door (a leaked link, a stranger). Their seat and results go; the feed says so.
  async 'room.kick'(b) {
    const c = roomCode(b.code), pid = clean(b.pid, 12), who = clean(b.who, 12);
    const [meta, doc, target] = await redis([['GET', 'room:v3:' + c], ['GET', 'room:v3:' + c + ':p:' + pid], ['GET', 'room:v3:' + c + ':p:' + who]]);
    if (!meta || !doc) return { error: 'not found' };
    const room = JSON.parse(meta), me = JSON.parse(doc);
    if (!b.sec || b.sec !== me.sec) return { error: 'forbidden' };
    if (room.host !== pid || who === pid) return { error: 'host' };
    if (!target) return { room: await readRoom(c) };
    const t = JSON.parse(target);
    await unseat(c, room, who);
    await roomFeed(c, { t: 'kick', pid, nick: me.nick, toNick: t.nick, to: who });
    return { room: await readRoom(c) };
  },
  // Host only, once the season is over: run it back. A fresh room with the same name and settings; the old feed
  // carries the new code so everyone can follow (nothing moves on its own: a new room is a new choice).
  async 'room.rematch'(b) {
    const c = roomCode(b.code), pid = clean(b.pid, 12);
    const [meta, doc] = await redis([['GET', 'room:v3:' + c], ['GET', 'room:v3:' + c + ':p:' + pid]]);
    if (!meta || !doc) return { error: 'not found' };
    const room = JSON.parse(meta), me = JSON.parse(doc);
    if (!b.sec || b.sec !== me.sec) return { error: 'forbidden' };
    if (room.host !== pid) return { error: 'host' };
    if (!roomOver(room)) return { error: 'not over' };
    if (room.next) return { error: 'done', code: room.next };
    const made = await actions['room.create']({ ...b, nick: me.nick, name: room.name, rounds: room.rounds, cadence: room.cadence });
    if (made.error) return made;
    room.next = made.room.code;
    await one('SET', 'room:v3:' + c, JSON.stringify(room), 'KEEPTTL');
    await roomFeed(c, { t: 'rematch', pid, nick: me.nick, code: made.room.code, name: room.name });
    return made;
  },
  // The room feed: a taunt from the pool (i18n `so.room.taunts[k]`), aimed at one reporter or the room. One per 30 s.
  async 'room.post'(b) {
    const c = roomCode(b.code), pid = clean(b.pid, 12);
    const [meta, doc] = await redis([['GET', 'room:v3:' + c], ['GET', 'room:v3:' + c + ':p:' + pid]]);
    if (!meta || !doc) return { error: 'not found' };
    const p = JSON.parse(doc); if (!b.sec || b.sec !== p.sec) return { error: 'forbidden' };
    const k = int(b.k, 0, TAUNTS - 1);
    let to = null, toNick = '';
    if (b.to) { const td = await getJ('room:v3:' + c + ':p:' + clean(b.to, 12)); if (td) { to = td.pid; toNick = td.nick; } }
    if (!(await one('SET', 'room:v3:' + c + ':gap:' + pid, '1', 'EX', TAUNT_GAP, 'NX'))) return { error: 'slow', gap: TAUNT_GAP };
    await roomFeed(c, { t: 'taunt', pid, nick: p.nick, k, to, toNick });
    return { feed: await readFeed(c) };
  },
  // The round on film and the Press Box recap: everyone's calls for one settled round. A round is settled when its
  // clock has run out, or when every seat has filed; until then nobody (filed or not) sees another reporter's calls,
  // so the board stays spoiler-free for whoever still has time to play it.
  async 'room.round'(b) {
    const c = roomCode(b.code), pid = clean(b.pid, 12), round = int(b.round, 0, 19);
    const [meta, doc, ids] = await redis([['GET', 'room:v3:' + c], ['GET', 'room:v3:' + c + ':p:' + pid], ['SMEMBERS', 'room:v3:' + c + ':players']]);
    if (!meta || !doc) return { error: 'not found' };
    const room = JSON.parse(meta), me = JSON.parse(doc);
    if (!b.sec || b.sec !== me.sec) return { error: 'forbidden' };
    if (round >= room.rounds) return { error: 'round' };
    const docs = await one('MGET', ...ids.map((id) => 'room:v3:' + c + ':p:' + id));
    const players = docs.filter(Boolean).map((d) => JSON.parse(d));
    if (!roundSettled(room, players, round)) return { error: 'not yet', waiting: players.filter((p) => !(p.results && p.results[round])).length };
    const rr = await roundRows(c, room, players, round);
    return { code: c, round, cast: rr.cast, players: rr.rows, days: RULES.DAYS, recap: recapOf(rr.rows, rr.cast) };
  },

  // ---- Beat my board (§7.3): a finished window becomes a 24 h challenge link. The seed of a live Daily never leaves
  // the server: a Daily challenge is settled from the players' own ranked results, or replayed once the seed is public.
  async 'challenge.create'(b) {
    const dev = devId(b.dev); if (!dev) return { error: 'dev' };
    const nick = nickOf(b.nick, dev), by = { pub: pubId(dev), nick, flair: flairOf(b.flair), tier: tierOf(b.tier) };
    const mode = b.mode === 'daily' || b.mode === 'career' ? b.mode : 'practice';
    let doc;
    if (mode === 'daily') {
      const day = dayOf(b.day); if (!day) return { error: 'day' };
      const mine = await getJ('t1v3:lb:d:' + day + ':e:' + dev); if (!mine) return { error: 'played' };
      doc = { kind: 'daily', day, no: dailyNo(day), target: { score: mine.score, tier: mine.tier, row: mine.row || '', ex: mine.ex || 0 } };
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
      else { const log = parseLog(b.log); if (!log) return { error: 'log' }; sc = scoreLog(saltedSeed('daily-' + ch.day), log); if (!sc) return { error: 'log' }; }
    } else {
      const log = parseLog(b.log); if (!log) return { error: 'log' };
      sc = scoreLog(ch.seed, log); if (!sc) return { error: 'log' };
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
// ---- room helpers (spec H) ----
const roundCloses = (room, k) => roundOpens(room, k) + roomOpenH(room) * 3600e3;
const roomOver = (room) => Date.now() > roundCloses(room, room.rounds - 1);
const filed = (p, k) => !!(p.results && p.results[k]);
const roundSettled = (room, players, k) => Date.now() > roundCloses(room, k) || (players.length > 0 && players.every((p) => filed(p, k)));
// Take a seat out of a room. The last seat out closes the room; a leaving host hands over to the longest-seated player.
async function unseat(c, room, pid) {
  await redis([['SREM', 'room:v3:' + c + ':players', pid], ['DEL', 'room:v3:' + c + ':p:' + pid]]);
  const left = await one('SMEMBERS', 'room:v3:' + c + ':players');
  if (!left || !left.length) { await redis([['DEL', 'room:v3:' + c], ['DEL', 'room:v3:' + c + ':players'], ['DEL', 'room:v3:' + c + ':feed']]); return { closed: true }; }
  if (room.host === pid) {
    const docs = await one('MGET', ...left.map((id) => 'room:v3:' + c + ':p:' + id));
    const seats = docs.map((d) => { try { return JSON.parse(d); } catch { return null; } }).filter(Boolean).sort((a, b) => (a.joined || 0) - (b.joined || 0));
    room.host = seats.length ? seats[0].pid : left[0];
    await one('SET', 'room:v3:' + c, JSON.stringify(room), 'KEEPTTL');
  }
  return { closed: false };
}
// Everyone's scored calls for one round, read from the stored sessions (the server's own results, never the client's).
async function roundRows(c, room, players, round) {
  const sess = players.length ? await one('MGET', ...players.map((p) => sessKey({ kind: 'r', code: c, round }, p.pid))) : [];
  let cast = null;
  const rows = players.map((p, k) => {
    let s = null; try { s = JSON.parse(sess[k]); } catch { s = null; }
    const res = s && s.res; if (!res) return null;
    if (!cast) cast = res.cast;
    const at = (p.results && p.results[round] && p.results[round].at) || 0; // when the seat filed (settle() stamps it): the last tie-breaker
    return { pid: p.pid, nick: p.nick, pub: p.pub || p.pid, flair: p.flair || '', tier: p.tier || '', score: res.total, tier2: res.tier, ex: res.ex, row: res.row, at, per: res.per.map((x) => ({ i: x.i, call: x.call ? { day: x.call.day, o: x.call.o, s: x.call.s, ut: !!x.call.ut } : null, right: x.right, excl: x.excl, pts: x.pts, truth: x.truth })) };
  }).filter(Boolean).sort((a, b) => b.score - a.score || b.ex - a.ex || a.at - b.at);
  return { cast, rows };
}
// THE PRESS BOX · ROUND N: the table, the biggest scoop (the best single call, exclusives first), the disaster of the
// round (the worst single call), the first exclusive (earliest day, then earliest filed). Names are the players'
// short names from the cast; outcome and strength indexes let the client word it in its own language.
function recapOf(rows, cast) {
  const name = (i) => (cast && cast[i] && cast[i].player ? cast[i].player.s || cast[i].player.n : '#' + (i + 1));
  let scoop = null, disaster = null, first = null;
  for (const p of rows) for (const x of p.per) {
    if (!x.call) continue;
    const e = { nick: p.nick, pid: p.pid, p: name(x.i), o: x.call.o, s: x.call.s, day: x.call.day, pts: x.pts, right: !!x.right, excl: !!x.excl, truth: x.truth, at: p.at };
    if (x.right && (!scoop || Number(e.excl) - Number(scoop.excl) > 0 || (e.excl === scoop.excl && e.pts > scoop.pts))) scoop = e;
    if (!x.right && x.pts < 0 && (!disaster || e.pts < disaster.pts)) disaster = e;
    if (x.excl && (!first || e.day < first.day || (e.day === first.day && e.at < first.at))) first = e;
  }
  return { table: rows.map((p) => ({ pid: p.pid, nick: p.nick, score: p.score, ex: p.ex, tier: p.tier2 })), scoop, disaster, first, filed: rows.length };
}
// Post each newly settled round's recap into the feed, once (a marker key per round, set NX).
async function roomRecaps(c, room) {
  const ids = (await one('SMEMBERS', 'room:v3:' + c + ':players')) || [];
  if (!ids.length) return;
  const docs = await one('MGET', ...ids.map((id) => 'room:v3:' + c + ':p:' + id));
  const players = docs.map((d) => { try { return JSON.parse(d); } catch { return null; } }).filter(Boolean);
  const due = []; for (let k = 0; k < room.rounds; k++) if (roundSettled(room, players, k)) due.push(k);
  if (!due.length) return;
  const marks = await one('MGET', ...due.map((k) => 'room:v3:' + c + ':recap:' + k));
  for (let j = 0; j < due.length; j++) {
    const k = due[j]; if (marks[j]) continue;
    if (!(await one('SET', 'room:v3:' + c + ':recap:' + k, '1', 'EX', ROOM_TTL, 'NX'))) continue;
    const rr = await roundRows(c, room, players, k);
    const rc = recapOf(rr.rows, rr.cast);
    await roomFeed(c, { t: 'recap', pid: '', nick: '', round: k, top: rc.table.slice(0, 3), scoop: rc.scoop && { nick: rc.scoop.nick, p: rc.scoop.p, excl: rc.scoop.excl, pts: rc.scoop.pts }, disaster: rc.disaster && { nick: rc.disaster.nick, p: rc.disaster.p, o: rc.disaster.o, s: rc.disaster.s, truth: rc.disaster.truth, pts: rc.disaster.pts }, filed: rc.filed });
  }
}
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
  room.max = MAX_ROOM; room.over = roomOver(room); room.tauntGap = TAUNT_GAP;
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

export { actions, parseAct, saltedSeed, isoWeek, dailyNo, OUT, pubId };

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
