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
