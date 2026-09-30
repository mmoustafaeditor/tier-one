// Small shared helpers for the platform API: input cleaning, ids, hashing, dates. No store access here.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const DAY = 86400, DAY_MS = DAY * 1000;
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max);
export const int = (v, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo; };
export const devId = (d) => { const s = String(d == null ? '' : d); return /^[A-Za-z0-9]{8,24}$/.test(s) ? s : ''; };
export const accId = (a) => { const s = String(a == null ? '' : a); return /^a_[A-Z2-9]{12}$/.test(s) ? s : ''; };
export const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);
export const today = () => ymd(Date.now());
export const dayMinus = (day, n) => ymd(Date.parse(day + 'T00:00:00Z') - n * DAY_MS);
export const isDay = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && ymd(Date.parse(d + 'T00:00:00Z')) === d;

export function code(n) { let s = ''; const b = randomBytes(n); for (const x of b) s += ALPHA[x % ALPHA.length]; return s; }
export const token = (n = 24) => randomBytes(n).toString('base64url');
export const newAccountId = () => 'a_' + code(12);
export const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');
export const hmac = (key, s) => createHmac('sha256', String(key)).update(String(s)).digest('hex');
export function safeEq(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}
// Deterministic 32-bit hash for bucketing (FNV-1a), same on the client (lib/flags.ts).
export function fnv1a(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
// A nick is a name, not a link or an address (same rule as v3).
export const nickOk = (s) => !(/http|:\/\//i.test(s) || (s.includes('@') && !/^@[\w.]{1,15}$/.test(s)));
export const emailOk = (e) => typeof e === 'string' && e.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
export const maskEmail = (e) => { const [u, d] = String(e).split('@'); return (u || '').slice(0, 1) + '***@' + (d || ''); };
export const clientIp = (req) => { const xf = req && req.headers && req.headers['x-forwarded-for']; const raw = (Array.isArray(xf) ? xf[0] : String(xf || '')).split(',')[0].trim() || (req && req.socket && req.socket.remoteAddress) || ''; return raw.replace(/[^0-9a-fA-F.:]/g, '').slice(0, 45); };
// Season ids as lib/season.ts and v3 name them: 'YYYY-summer' (Jun–Aug), 'YYYY-autumn' (Sep–Nov), 'YYYY-winter' (Dec–Feb), 'YYYY-spring'.
export const seasonOf = (ms) => { const d = new Date(ms), m = d.getUTCMonth(), y = d.getUTCFullYear(); return m >= 5 && m <= 7 ? y + '-summer' : m >= 8 && m <= 10 ? y + '-autumn' : m === 11 ? (y + 1) + '-winter' : m <= 1 ? y + '-winter' : y + '-spring'; };
export function seasonEnd(id) {
  const m = /^(\d{4})-(summer|autumn|winter|spring)$/.exec(String(id)); if (!m) return null;
  const y = Number(m[1]);
  return { summer: Date.UTC(y, 8, 1), autumn: Date.UTC(y, 11, 1), winter: Date.UTC(y, 2, 1), spring: Date.UTC(y, 5, 1) }[m[2]];
}
