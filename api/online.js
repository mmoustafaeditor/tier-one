// Tier One online: career transfer codes and multiplayer rooms (Vercel function, Node 18+).
//
// Storage is Upstash Redis over its REST API. Connect a Redis/KV store to the Vercel project
// (Vercel › Storage › Create › Upstash for Redis › connect to this project); Vercel then injects
// KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
// Without them every action answers { ok:false, error:'offline' } and the game hides online play.
//
// POST /api/online  { action, ... }  ->  { ok:true, ... } | { ok:false, error }

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const DAY = 86400;
const SAVE_TTL = 30 * DAY, ROOM_TTL = 90 * DAY;
const MAX_SAVE = 200000, MAX_PLAYERS = 24, MAX_SEASONS = 20;
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

async function redis(cmds) {
  const r = await fetch(URL_ + '/pipeline', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds) });
  if (!r.ok) throw new Error('store ' + r.status);
  const out = await r.json();
  return out.map(x => { if (x.error) throw new Error(x.error); return x.result; });
}
const one = async (...cmd) => (await redis([cmd]))[0];

function code(n) { let s = ''; const b = new Uint8Array(n); crypto.getRandomValues(b); for (const x of b) s += ALPHA[x % ALPHA.length]; return s; }
function secret() { const b = new Uint8Array(18); crypto.getRandomValues(b); return Buffer.from(b).toString('base64url'); }
const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max);
const int = (v, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo; };
const roomCode = c => clean(c, 8).toUpperCase().replace(/[^A-Z0-9]/g, '');

// ---- leaderboards (Daily Challenge): one entry per device per day, weekly = sum of that week's dailies ----
const LB_DAY_TTL = 40 * DAY, LB_WEEK_TTL = 60 * DAY, LB_TOP = 25, LB_WINDOW = 2 * DAY * 1000;
const devId = d => { const s = String(d == null ? '' : d); return /^[A-Za-z0-9]{8,24}$/.test(s) ? s : ''; };
const ymd = ms => new Date(ms).toISOString().slice(0, 10);
// The day is the player's LOCAL calendar date; accept it as sent when it is within two days of the server's UTC date.
function lbDay(day) {
  const s = clean(day, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const t = Date.parse(s + 'T00:00:00Z');
  if (!Number.isFinite(t) || ymd(t) !== s) return '';
  const now = Date.now(), today = Date.parse(ymd(now) + 'T00:00:00Z');
  return Math.abs(t - today) <= LB_WINDOW ? s : '';
}
function isoWeek(day) { // 'YYYY-Www' (ISO 8601, weeks start Monday)
  const d = new Date(day + 'T00:00:00Z'); const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const y = d.getUTCFullYear(), w = Math.ceil(((d - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return y + '-W' + String(w).padStart(2, '0');
}
const lbNick = (nick, dev) => clean(nick, 16) || 'Journo-' + dev.slice(0, 4).toUpperCase();
const lbKeys = (period, day) => ({ week: isoWeek(day), key: period === 'weekly' ? 'lb:w:' + isoWeek(day) : 'lb:d:' + day });
// rank = 1 + number of strictly higher scores (ties share the better rank); null when the device is not on the board
async function lbRank(key, dev) {
  const [sc, total] = await redis([['ZSCORE', key, dev], ['ZCARD', key]]);
  if (sc == null) return { rank: null, total: Number(total) || 0 };
  const higher = await one('ZCOUNT', key, '(' + Number(sc), '+inf');
  return { rank: 1 + (Number(higher) || 0), total: Number(total) || 0, score: Number(sc) };
}

async function readRoom(c) {
  const [meta, ids] = await redis([['GET', 'room:' + c], ['SMEMBERS', 'room:' + c + ':players']]);
  if (!meta) return null;
  const room = JSON.parse(meta);
  const docs = ids && ids.length ? await one('MGET', ...ids.map(id => 'room:' + c + ':p:' + id)) : [];
  room.players = docs.filter(Boolean).map(d => { const p = JSON.parse(d); delete p.sec; return p; });
  return room;
}

const actions = {
  async health() { return { store: true }; },

  // ---- career transfer codes ----
  async 'save.put'(b) {
    const data = String(b.data || '');
    if (!/^T1\.[A-Za-z0-9+/=]+\.[a-z0-9]+$/.test(data) || data.length > MAX_SAVE) return { error: 'bad save' };
    for (let i = 0; i < 6; i++) {
      const c = code(8);
      if (await one('SET', 'save:' + c, data, 'EX', SAVE_TTL, 'NX')) return { code: c.slice(0, 4) + '-' + c.slice(4), days: SAVE_TTL / DAY };
    }
    return { error: 'busy' };
  },
  async 'save.get'(b) {
    const c = clean(b.code, 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length !== 8) return { error: 'bad code' };
    const data = await one('GET', 'save:' + c);
    return data ? { data } : { error: 'not found' };
  },

  // ---- rooms ----
  async 'room.create'(b) {
    const nick = clean(b.nick, 16), name = clean(b.name, 28) || 'Tier One room';
    const seasons = int(b.seasons, 1, MAX_SEASONS);
    if (!nick) return { error: 'nick' };
    for (let i = 0; i < 8; i++) {
      const c = code(5);
      const room = { code: c, name, seasons, seed: code(10), created: Date.now(), host: '' };
      const pid = code(10), sec = secret(); room.host = pid;
      if (await one('SET', 'room:' + c, JSON.stringify(room), 'EX', ROOM_TTL, 'NX')) {
        await redis([
          ['SET', 'room:' + c + ':p:' + pid, JSON.stringify({ pid, nick, joined: Date.now(), results: [], sec }), 'EX', ROOM_TTL],
          ['SADD', 'room:' + c + ':players', pid], ['EXPIRE', 'room:' + c + ':players', ROOM_TTL]
        ]);
        return { room: await readRoom(c), pid, sec };
      }
    }
    return { error: 'busy' };
  },
  async 'room.join'(b) {
    const c = roomCode(b.code), nick = clean(b.nick, 16);
    if (!nick) return { error: 'nick' };
    const [meta, count] = await redis([['GET', 'room:' + c], ['SCARD', 'room:' + c + ':players']]);
    if (!meta) return { error: 'not found' };
    if (count >= MAX_PLAYERS) return { error: 'full' };
    const pid = code(10), sec = secret();
    await redis([
      ['SET', 'room:' + c + ':p:' + pid, JSON.stringify({ pid, nick, joined: Date.now(), results: [], sec }), 'EX', ROOM_TTL],
      ['SADD', 'room:' + c + ':players', pid]
    ]);
    return { room: await readRoom(c), pid, sec };
  },
  async 'room.get'(b) {
    const room = await readRoom(roomCode(b.code));
    return room ? { room } : { error: 'not found' };
  },
  async 'room.submit'(b) {
    const c = roomCode(b.code), pid = clean(b.pid, 12);
    const key = 'room:' + c + ':p:' + pid;
    const [meta, doc] = await redis([['GET', 'room:' + c], ['GET', key]]);
    if (!meta || !doc) return { error: 'not found' };
    const room = JSON.parse(meta), p = JSON.parse(doc);
    if (!b.sec || b.sec !== p.sec) return { error: 'forbidden' };
    const season = int(b.season, 0, MAX_SEASONS);
    if (season >= room.seasons) return { error: 'season' };
    if (season < p.results.length) return { room: await readRoom(c), already: true };
    if (season !== p.results.length) return { error: 'order' };
    const r = b.result || {};
    p.results.push({
      score: int(r.score, -2000, 5000), tier: int(r.tier, 1, 9), row: clean(r.row, 40),
      ex: int(r.ex, 0, 8), right: int(r.right, 0, 8), wrong: int(r.wrong, 0, 8),
      followers: int(r.followers, 0, 1e8), cash: int(r.cash, 0, 1e7), level: int(r.level, 1, 20), at: Date.now()
    });
    await one('SET', key, JSON.stringify(p), 'EX', ROOM_TTL);
    return { room: await readRoom(c) };
  },

  // ---- Daily Challenge leaderboards ----
  // { day:'YYYY-MM-DD', dev, nick?, score, tier, row, ex, right, wrong } -> { rank, total, nick, weekRank, weekTotal, week, already? }
  async 'lb.submit'(b) {
    const dev = devId(b.dev), day = lbDay(b.day);
    if (!dev) return { error: 'dev' };
    if (!day) return { error: 'day' };
    const nick = lbNick(b.nick, dev);
    const e = { nick, score: int(b.score, -2000, 5000), tier: int(b.tier, 1, 9), row: clean(b.row, 40), ex: int(b.ex, 0, 8), right: int(b.right, 0, 8), wrong: int(b.wrong, 0, 8), at: Date.now() };
    const dk = 'lb:d:' + day, ek = dk + ':e:' + dev, week = isoWeek(day), wk = 'lb:w:' + week, wek = wk + ':e:' + dev;
    let already = false;
    if (await one('SET', ek, JSON.stringify(e), 'EX', LB_DAY_TTL, 'NX')) {
      // First submit for this device+day: rank it and add it to the week.
      const wdoc = await one('GET', wek); let w = null; try { w = wdoc ? JSON.parse(wdoc) : null; } catch (x) { w = null; }
      const wnew = { nick, tier: w ? Math.min(w.tier || 9, e.tier) : e.tier, row: e.row, days: (w && w.days || 0) + 1, at: e.at };
      await redis([
        ['ZADD', dk, e.score, dev], ['EXPIRE', dk, LB_DAY_TTL],
        ['ZINCRBY', wk, e.score, dev], ['EXPIRE', wk, LB_WEEK_TTL],
        ['SET', wek, JSON.stringify(wnew), 'EX', LB_WEEK_TTL]
      ]);
    } else {
      // Already on the board for this day: never overwrite, just report the existing rank.
      already = true;
      try { const prev = JSON.parse(await one('GET', ek)); if (prev && prev.nick) e.nick = prev.nick; } catch (x) {}
    }
    const [d, w] = await Promise.all([lbRank(dk, dev), lbRank(wk, dev)]);
    return { rank: d.rank, total: d.total, nick: e.nick, weekRank: w.rank, weekTotal: w.total, week, day, already };
  },
  // { period:'daily'|'weekly', day?, dev? } -> { rows:[{nick,score,tier,row,days?,me?}], day, week, players, me? }
  async 'lb.top'(b) {
    const period = b.period === 'weekly' ? 'weekly' : 'daily';
    const day = lbDay(b.day) || ymd(Date.now()), dev = devId(b.dev);
    const { key, week } = lbKeys(period, day);
    const [z, total] = await redis([['ZREVRANGE', key, 0, LB_TOP - 1, 'WITHSCORES'], ['ZCARD', key]]);
    const devs = []; for (let i = 0; i < (z || []).length; i += 2) devs.push(z[i]);
    const docs = devs.length ? await one('MGET', ...devs.map(d => key + ':e:' + d)) : [];
    const rows = devs.map((d, i) => {
      let doc = null; try { doc = docs[i] ? JSON.parse(docs[i]) : null; } catch (x) { doc = null; }
      const r = { nick: (doc && doc.nick) || 'Journo-' + d.slice(0, 4).toUpperCase(), score: Number(z[2 * i + 1]) || 0, tier: doc ? int(doc.tier, 1, 9) : 5, row: (doc && doc.row) || '' };
      if (period === 'weekly') r.days = (doc && doc.days) || 1;
      if (dev && d === dev) r.me = true;
      return r;
    });
    const out = { period, rows, day, week, players: Number(total) || 0 };
    if (dev) { const me = await lbRank(key, dev); if (me.rank) out.me = { rank: me.rank, total: me.total }; }
    return out;
  },
  // { period, day, dev } -> { rank (null when not on the board), total }
  async 'lb.me'(b) {
    const period = b.period === 'weekly' ? 'weekly' : 'daily';
    const day = lbDay(b.day), dev = devId(b.dev);
    if (!dev) return { error: 'dev' };
    if (!day) return { error: 'day' };
    const { key, week } = lbKeys(period, day);
    const me = await lbRank(key, dev);
    return { period, day, week, rank: me.rank, total: me.total };
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); return res.status(204).end(); }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });
  if (!URL_ || !TOKEN) {
    // Names only (never values), so a misnamed store connection can be spotted from the health check.
    const seen = Object.keys(process.env).filter(k => /REDIS|KV_|UPSTASH/i.test(k)).sort();
    return res.status(200).json({ ok: false, error: 'offline', seen });
  }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const fn = body && actions[body.action];
  if (!fn) return res.status(400).json({ ok: false, error: 'action' });
  try {
    const out = await fn(body);
    return res.status(out.error ? 400 : 200).json(Object.assign({ ok: !out.error }, out));
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'store' });
  }
}
