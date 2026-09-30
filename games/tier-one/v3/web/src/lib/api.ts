// Our own API only (/api/tier-one/v3 and /api/data/*). No other runtime requests.
const BASE = (() => {
  // Android WebView loads the page from a file URL: talk to the live site. Use www: the bare domain answers with a
  // redirect, and a CORS preflight can't follow redirects.
  if (location.protocol === 'file:' || location.hostname === 'appassets.androidplatform.net') return 'https://www.sembagames.app';
  return '';
})();
export type ApiResult<T> = ({ ok: true } & T) | { ok: false; error: string; [k: string]: unknown };

export function v3<T = Record<string, unknown>>(action: string, body: Record<string, unknown> = {}, timeoutMs = 9000): Promise<ApiResult<T>> { return post<T>('/api/tier-one/v3', action, body, timeoutMs); }
// /api/online (api/online.js): career transfer codes.
export function online<T = Record<string, unknown>>(action: string, body: Record<string, unknown> = {}): Promise<ApiResult<T>> { return post<T>('/api/online', action, body, 9000); }
async function post<T>(path: string, action: string, body: Record<string, unknown>, timeoutMs: number): Promise<ApiResult<T>> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }), signal: ctl.signal });
    const j = await r.json().catch(() => null);
    if (!j) return { ok: false, error: r.status === 429 ? 'rate' : 'net' };
    return j;
  } catch {
    return { ok: false, error: 'net' };
  } finally { clearTimeout(t); }
}
// /api/tier-one/v4 (api/tier-one/v4/index.js): the platform API (accounts, cloud save, wallet, config, telemetry) with
// every v3 action mounted underneath. Auth fields ({ dev, token }) come from the provider lib/account.ts registers, so
// callers pass only their own body. `idem` sets the Idempotency-Key header on writes; `rid` tags the request.
export const V4_PATH = '/api/tier-one/v4';
export type V4Error = { ok: false; error: string; code: string; rid?: string; [k: string]: unknown };
export type V4Result<T> = ({ ok: true; rid?: string; v?: number; replay?: boolean } & T) | V4Error;
export interface V4Opts { idem?: string; timeoutMs?: number; keepalive?: boolean; noAuth?: boolean }
let v4Auth: () => Record<string, unknown> = () => ({});
export function setV4Auth(fn: () => Record<string, unknown>) { v4Auth = fn; }
export async function v4<T = Record<string, unknown>>(action: string, body: Record<string, unknown> = {}, opts: V4Opts = {}): Promise<V4Result<T>> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 9000);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.idem) headers['Idempotency-Key'] = opts.idem;
  try {
    const r = await fetch(BASE + V4_PATH, { method: 'POST', headers, body: JSON.stringify({ action, ...(opts.noAuth ? {} : v4Auth()), ...body }), signal: ctl.signal, keepalive: opts.keepalive });
    const j = await r.json().catch(() => null);
    if (!j) return { ok: false, error: r.status === 429 ? 'rate' : 'net', code: r.status === 429 ? 'RATE_LIMITED' : 'NET' };
    return j;
  } catch {
    return { ok: false, error: 'net', code: 'NET' };
  } finally { clearTimeout(t); }
}
export async function data<T = Record<string, unknown>>(path: string): Promise<T | null> {
  try {
    const r = await fetch(BASE + '/api/data/' + path);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}
