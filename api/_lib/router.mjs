// The v4 action router: POST { action, ... } -> { ok:true, rid, ... } | { ok:false, error, code, rid }.
//
// - Versioned handlers: register('save.push', { v: 2, fn }) twice with different `v`; 'save.push' runs the latest,
//   'save.push@1' runs version 1. Every reply carries `v`.
// - Writes (`write: true`) are idempotent: the client sends an Idempotency-Key header (or body.idem); a repeat within
//   IDEM_TTL gets the first reply back with `replay: true`; a concurrent repeat gets IDEM_IN_PROGRESS.
// - Rate limits per IP and per device on an hourly window (Redis INCR + EXPIRE), like v3, plus an optional per-action
//   ceiling (`limit: n`).
// - Errors are structured: throw new ApiError('CODE', 'short reason', status, extra). Unknown throws answer STORE (502)
//   without leaking the message.
import { clean, clientIp, code as rnd, devId } from './util.mjs';

export const STATUS = { BAD_REQUEST: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, IDEM_IN_PROGRESS: 409, PAYLOAD_TOO_LARGE: 413, RATE_LIMITED: 429, OFFLINE: 200, STORE: 502, NOT_IMPLEMENTED: 501, UNKNOWN_ACTION: 400 };
export class ApiError extends Error {
  constructor(code, error, status, extra) { super(error || code); this.code = code; this.error = error || code.toLowerCase().replace(/_/g, ' '); this.status = status || STATUS[code] || 400; this.extra = extra || null; }
}
export const bad = (error, extra) => new ApiError('BAD_REQUEST', error, 400, extra);

const IDEM_TTL = 86400, IDEM_LOCK = 30;
const DEFAULTS = { bodyMax: 600_000, ip: { max: 1500, window: 3600 }, dev: { max: 900, window: 3600 }, prefix: 't1v4' };

export function createRouter(opts) {
  const o = { ...DEFAULTS, ...opts };
  const kv = o.kv, registry = new Map();

  function register(name, def) {
    const d = typeof def === 'function' ? { fn: def } : { ...def };
    d.v = d.v || 1; d.name = name;
    const e = registry.get(name) || { versions: {}, latest: 0 };
    e.versions[d.v] = d; e.latest = Math.max(e.latest, d.v);
    registry.set(name, e);
    return d;
  }
  function resolve(action) {
    const m = /^([a-z][a-z0-9.]*)(?:@(\d+))?$/.exec(String(action || ''));
    if (!m) return null;
    const e = registry.get(m[1]); if (!e) return null;
    return e.versions[m[2] ? Number(m[2]) : e.latest] || null;
  }
  const list = () => [...registry.entries()].map(([name, e]) => ({ name, versions: Object.keys(e.versions).map(Number), latest: e.latest, auth: !!e.versions[e.latest].auth, write: !!e.versions[e.latest].write, source: e.versions[e.latest].source || 'v4' }));

  async function rateOk(scope, id, lim) {
    if (!id || !lim) return true;
    const key = o.prefix + ':rl:' + scope + ':' + id + ':' + Math.floor(Date.now() / 1000 / lim.window);
    const [n] = await kv.pipeline([['INCR', key], ['EXPIRE', key, lim.window]]);
    return Number(n) <= lim.max;
  }

  // Runs one action for an already-parsed body (the HTTP layer and tests both call this).
  async function dispatch(body, ctx) {
    const def = resolve(body.action);
    if (!def) throw new ApiError('UNKNOWN_ACTION', 'action', 400);
    ctx.action = def.name; ctx.v = def.v;
    if (def.rate !== 'none') {
      if (!(await rateOk('ip', ctx.ip, o.ip))) throw new ApiError('RATE_LIMITED', 'rate');
      if (!(await rateOk('dev', ctx.dev, o.dev))) throw new ApiError('RATE_LIMITED', 'rate');
      if (def.limit) { if (!(await rateOk('act:' + def.name, ctx.dev || ctx.ip, { max: def.limit, window: 3600 }))) throw new ApiError('RATE_LIMITED', 'rate'); }
    }
    if (def.auth && o.authenticate) {
      ctx.account = await o.authenticate(body, ctx);
      if (!ctx.account && def.auth !== 'optional') throw new ApiError('UNAUTHORIZED', 'auth');
    }
    const scope = (ctx.account && ctx.account.id) || ctx.dev || ctx.ip || 'anon';
    const idem = def.write ? clean(ctx.idem || body.idem, 80) : '';
    const ikey = idem ? o.prefix + ':idem:' + scope + ':' + def.name + ':' + idem : '';
    if (ikey) {
      const fresh = await kv.setNX(ikey, 'p', IDEM_LOCK);
      if (!fresh) {
        const prev = await kv.get(ikey);
        if (prev === 'p' || prev == null) throw new ApiError('IDEM_IN_PROGRESS', 'in progress');
        let out = null; try { out = JSON.parse(prev); } catch { out = null; }
        if (out) return { ...out, replay: true };
      }
    }
    try {
      const out = (await def.fn(body, ctx)) || {};
      const reply = { ok: true, v: def.v, ...out };
      if (ikey) await kv.setJ(ikey, reply, IDEM_TTL);
      return reply;
    } catch (e) {
      if (ikey) await kv.del(ikey);
      throw e;
    }
  }

  function errorBody(e, rid) {
    if (e instanceof ApiError) return { status: e.status, body: { ok: false, error: e.error, code: e.code, rid, ...(e.extra || {}) } };
    if (e && e.message === 'offline') return { status: 200, body: { ok: false, error: 'offline', code: 'OFFLINE', rid } };
    if (o.onError) o.onError(e, rid);
    return { status: 502, body: { ok: false, error: 'store', code: 'STORE', rid } };
  }

  async function handler(req, res) {
    const rid = clean(req.headers && req.headers['x-request-id'], 40).replace(/[^A-Za-z0-9._-]/g, '') || rnd(12);
    res.setHeader('Access-Control-Allow-Origin', o.origin || '*');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Request-Id', rid);
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key, X-Request-Id');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Max-Age', '86400');
      return res.status(204).end();
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method', code: 'METHOD', rid });
    if (!kv.online) return res.status(200).json({ ok: false, error: 'offline', code: 'OFFLINE', rid });
    let body = req.body;
    if (typeof body === 'string') { if (body.length > o.bodyMax) return res.status(413).json({ ok: false, error: 'body', code: 'PAYLOAD_TOO_LARGE', rid }); try { body = JSON.parse(body); } catch { body = null; } }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ ok: false, error: 'body', code: 'BAD_REQUEST', rid });
    if (JSON.stringify(body).length > o.bodyMax) return res.status(413).json({ ok: false, error: 'body', code: 'PAYLOAD_TOO_LARGE', rid });
    const ctx = { rid, ip: clientIp(req), dev: devId(body.dev), idem: req.headers && req.headers['idempotency-key'], kv, headers: req.headers || {}, now: Date.now() };
    try {
      const out = await dispatch(body, ctx);
      return res.status(200).json({ ...out, rid });
    } catch (e) {
      const { status, body: eb } = errorBody(e, rid);
      return res.status(status).json(eb);
    }
  }

  return { register, resolve, list, dispatch, handler, kv, errorBody };
}
