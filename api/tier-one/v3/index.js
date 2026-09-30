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
import { RULES, buildBoard, newGame, apply, replay, pub, resolve, isOver, finish, gridRow, OUT } from './_lib/engine.mjs';
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
  } else {
    const key = 'room:v3:' + sc.code + ':p:' + who, p = await getJ(key);
    if (p) { p.results[sc.round] = { score: r.total, tier: r.tier, ex: r.ex, row: res.row, at: Date.now() }; await setJ(key, p, ROOM_TTL); }
  }
  sess.res = res;
  return res;
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
    const opens = room.created + round * DAY_MS;
    if (Date.now() < opens) return { error: 'not open' };
    if (Date.now() > opens + ROUND_OPEN_H * 3600e3 && !(p.results && p.results[round])) return { error: 'closed' };
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
    const period = b.period === 'weekly' || b.period === 'wire' ? b.period : 'daily', day = today(), dev = devId(b.dev);
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
  async 'room.create'(b) {
    const nick = clean(b.nick, 16), name = clean(b.name, 28) || 'Tier One room';
    const rounds = [5, 10, 20].includes(Number(b.rounds)) ? Number(b.rounds) : 5;
    if (!nick || !nickOk(nick)) return { error: 'nick' };
    for (let i = 0; i < 8; i++) {
      const c = code(5), pid = code(10), sec = secret();
      const room = { code: c, name, rounds, created: Date.parse(today() + 'T00:00:00Z'), host: pid };
      if (await one('SET', 'room:v3:' + c, JSON.stringify(room), 'EX', ROOM_TTL, 'NX')) {
        await redis([['SET', 'room:v3:' + c + ':p:' + pid, JSON.stringify({ pid, nick, joined: Date.now(), results: [], sec }), 'EX', ROOM_TTL], ['SADD', 'room:v3:' + c + ':players', pid], ['EXPIRE', 'room:v3:' + c + ':players', ROOM_TTL]]);
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
    await redis([['SET', 'room:v3:' + c + ':p:' + pid, JSON.stringify({ pid, nick, joined: Date.now(), results: [], sec }), 'EX', ROOM_TTL], ['SADD', 'room:v3:' + c + ':players', pid], ['EXPIRE', 'room:v3:' + c + ':players', ROOM_TTL]]);
    return { room: await readRoom(c), pid, sec };
  },
  async 'room.get'(b) { const room = await readRoom(roomCode(b.code)); return room ? { room } : { error: 'not found' }; },
};

const hashObj = (h) => { if (!h) return {}; if (!Array.isArray(h)) return h; const o = {}; for (let i = 0; i < h.length; i += 2) o[h[i]] = h[i + 1]; return o; };
const stripView = ({ player, from, linked, mNow, paper, ...c }) => c;
async function wireCalls(dev) {
  const h = hashObj(await one('HGETALL', 't1v3:w:calls:' + dev)), out = {};
  for (const [k, v] of Object.entries(h)) { try { out[k] = JSON.parse(v); } catch { /* skip */ } }
  return out;
}
async function readRoom(c) {
  const [meta, ids] = await redis([['GET', 'room:v3:' + c], ['SMEMBERS', 'room:v3:' + c + ':players']]);
  if (!meta) return null;
  const room = JSON.parse(meta);
  const docs = ids && ids.length ? await one('MGET', ...ids.map((id) => 'room:v3:' + c + ':p:' + id)) : [];
  room.players = docs.filter(Boolean).map((d) => { const p = JSON.parse(d); delete p.sec; return p; });
  room.now = Date.now(); room.roundHours = ROUND_OPEN_H;
  return room;
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

export { actions, parseAct, saltedSeed, isoWeek, dailyNo, OUT };

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
