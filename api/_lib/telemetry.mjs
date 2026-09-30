// Telemetry: batched, privacy-minded counters in daily KV buckets. No PII: event names are short identifiers,
// props are a few short scalars, and anything that looks like an email, a phone number or a key named like one is
// dropped. Subjects are account ids (or device ids before hello), hashed into HyperLogLogs for DAU and retention.
//
// Keys (prefix t1v4:tm, 45 days): <day>:ev hash name->count, <day>:mode hash mode->count, <day>:conv hash,
// <day>:dau PF, <day>:ret1 PF (seen today, first seen yesterday), <day>:ret7 PF, first:<subject> first day seen.
import { ApiError, bad } from './router.mjs';
import { clean, int, today, dayMinus, safeEq, fnv1a } from './util.mjs';

const P = 't1v4:tm:';
const TTL = 45 * 86400, NAME_RE = /^[a-z][a-z0-9_.]{1,39}$/, MAX_PROPS = 12, MAX_VAL = 80;
const PII_KEY = /(mail|phone|name|nick|address|token|secret|password|ip$|passwd|user)/i;
const PII_VAL = /@|\+?\d[\d\s-]{8,}\d|https?:\/\//;
export const CONVERSIONS = new Set(['store.open', 'checkout.start', 'purchase.ok', 'gold.view', 'gold.buy', 'link.start', 'link.done']);

export function cleanEvent(e) {
  if (!e || typeof e !== 'object') return null;
  const name = String(e.name || '');
  if (!NAME_RE.test(name)) return null;
  const props = {};
  if (e.props && typeof e.props === 'object' && !Array.isArray(e.props)) {
    for (const [k, v] of Object.entries(e.props).slice(0, MAX_PROPS)) {
      if (!/^[a-z][a-z0-9_]{0,23}$/i.test(k) || PII_KEY.test(k)) continue;
      if (typeof v === 'number' && Number.isFinite(v)) props[k] = Math.round(v * 1000) / 1000;
      else if (typeof v === 'boolean') props[k] = v;
      else if (typeof v === 'string') { const s = clean(v, MAX_VAL); if (s && !PII_VAL.test(s)) props[k] = s; }
    }
  }
  return { t: int(e.t, 0, 4102444800000), name, props };
}

export function createTelemetry({ kv, config, opsToken }) {
  async function batch(body, ctx) {
    const tcfg = config.current().flags.telemetry, max = tcfg.maxBatch || 50;
    if (!Array.isArray(body.events)) throw bad('events');
    if (body.events.length > max) throw new ApiError('PAYLOAD_TOO_LARGE', 'too many events', 413, { max });
    const subject = (ctx.account && ctx.account.id) || ctx.dev || '';
    if (!subject) throw bad('dev');
    const sampled = (fnv1a('tm|' + subject) % 10000) / 10000 < (tcfg.sample == null ? 1 : tcfg.sample);
    const events = body.events.map(cleanEvent).filter(Boolean);
    if (!sampled) return { accepted: events.length, stored: 0, sampled: false };
    const day = today(), yday = dayMinus(day, 1);
    const cmds = [], seen = new Set();
    for (const e of events) {
      // Events carry the client's clock: within 36 hours they land on their own day, older ones are dropped
      // (a day bucket stays honest); an event without a time counts today.
      if (e.t && Math.abs(e.t - Date.now()) >= 36 * 3600e3) continue;
      const d = e.t ? new Date(e.t).toISOString().slice(0, 10) : day;
      if (d !== day && d !== yday) continue;
      cmds.push(['HINCRBY', P + d + ':ev', e.name, 1]);
      if (e.name === 'window.start' && typeof e.props.mode === 'string') cmds.push(['HINCRBY', P + d + ':mode', e.props.mode.slice(0, 12), 1]);
      if (CONVERSIONS.has(e.name)) cmds.push(['HINCRBY', P + d + ':conv', e.name, 1]);
      if (!seen.has(d)) { seen.add(d); cmds.push(['PFADD', P + d + ':dau', subject]); }
    }
    if (!cmds.length) return { accepted: events.length, stored: 0, sampled: true };
    const first = (await kv.one('SET', P + 'first:' + subject, day, 'EX', TTL, 'NX')) ? day : await kv.get(P + 'first:' + subject);
    if (first === dayMinus(day, 1)) cmds.push(['PFADD', P + day + ':ret1', subject]);
    if (first === dayMinus(day, 7)) cmds.push(['PFADD', P + day + ':ret7', subject]);
    for (const d of seen) for (const k of ['ev', 'mode', 'conv', 'dau', 'ret1', 'ret7']) cmds.push(['EXPIRE', P + d + ':' + k, TTL]);
    await kv.pipeline(cmds);
    return { accepted: events.length, stored: cmds.filter((c) => c[0] === 'HINCRBY').length, sampled: true };
  }
  // ops.stats { token, days? }: DAU, D1/D7 returners, mode mix, conversion counts and top events per day.
  async function stats(body) {
    if (!opsToken || !safeEq(body.token, opsToken)) throw new ApiError('UNAUTHORIZED', 'ops token');
    const n = int(body.days, 1, 30), day = today();
    const days = Array.from({ length: n }, (_, i) => dayMinus(day, i));
    const res = await kv.pipeline(days.flatMap((d) => [['PFCOUNT', P + d + ':dau'], ['PFCOUNT', P + d + ':ret1'], ['PFCOUNT', P + d + ':ret7'], ['HGETALL', P + d + ':ev'], ['HGETALL', P + d + ':mode'], ['HGETALL', P + d + ':conv']]));
    const hobj = (h) => { const o = {}; if (Array.isArray(h)) for (let i = 0; i < h.length; i += 2) o[h[i]] = Number(h[i + 1]); else if (h) for (const [k, v] of Object.entries(h)) o[k] = Number(v); return o; };
    const rows = days.map((d, i) => { const b = i * 6; return { day: d, dau: Number(res[b]) || 0, d1: Number(res[b + 1]) || 0, d7: Number(res[b + 2]) || 0, events: hobj(res[b + 3]), modes: hobj(res[b + 4]), conv: hobj(res[b + 5]) }; });
    const totals = rows.reduce((t, r) => { t.dau += r.dau; for (const [k, v] of Object.entries(r.conv)) t.conv[k] = (t.conv[k] || 0) + v; for (const [k, v] of Object.entries(r.modes)) t.modes[k] = (t.modes[k] || 0) + v; return t; }, { dau: 0, conv: {}, modes: {} });
    return { days: rows, totals, generated: Date.now() };
  }
  return { batch, stats };
}
