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
export async function data<T = Record<string, unknown>>(path: string): Promise<T | null> {
  try {
    const r = await fetch(BASE + '/api/data/' + path);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}
