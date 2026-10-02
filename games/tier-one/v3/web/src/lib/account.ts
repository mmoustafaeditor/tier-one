// The Semba account on the client: account.hello on boot (the device id from the save + a device token kept in
// localStorage), the cached profile and flags, email magic links, and a small telemetry queue.
//
// bootPlatform() is the one call the integrator wires into main/App: it runs hello, loads remote config, finishes a
// magic link from the URL (?link=), pulls the cloud save and starts the push watcher. Everything degrades to
// "offline": the game plays on with v3 and the local save when the platform is unreachable.
import { useSyncExternalStore } from 'react';
import { v4, setV4Auth } from './api';
import { getSave } from './save';
import { loadConfig, flag } from './flags';
import { track, flushTelemetry } from './analytics';
import { pullOnBoot, watch, resetBase, canSync } from './sync';

export const AUTH_KEY = 'tierone_v4_auth', ACCOUNT_KEY = 'tierone_v4_account';
export interface Profile { id: string; nick: string; created: number; linked: boolean; email: string | null; renames: number }
export type AccountStatus = 'idle' | 'loading' | 'ready' | 'claimed' | 'offline';
export interface AccountState { status: AccountStatus; account: Profile | null; created: boolean; sync: 'idle' | 'pushed' | 'merged' | 'same' | 'skipped' | 'error' }
interface Auth { dev: string; token: string }

let auth: Auth | null = readJ<Auth>(AUTH_KEY);
let state: AccountState = { status: 'idle', account: readJ<Profile>(ACCOUNT_KEY), created: false, sync: 'idle' };
const subs = new Set<() => void>();
function readJ<T>(k: string): T | null { try { const raw = localStorage.getItem(k); return raw ? (JSON.parse(raw) as T) : null; } catch { return null; } }
function writeJ(k: string, v: unknown) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } }
function setState(patch: Partial<AccountState>) { state = { ...state, ...patch }; if (patch.account !== undefined) writeJ(ACCOUNT_KEY, patch.account); subs.forEach((f) => f()); }
setV4Auth(() => (auth ? { dev: auth.dev, token: auth.token } : { dev: safeDev() }));
const safeDev = () => { try { return getSave().dev; } catch { return ''; } };

export const getAccount = () => state.account;
export const getAccountState = () => state;
export const getAuth = () => auth;
export function useAccount(): AccountState { return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state); }

/** account.hello: creates the account on the first call (token kept), re-identifies afterwards. */
export async function hello(clientVer: string, platform = detectPlatform()): Promise<Profile | null> {
  const dev = safeDev();
  if (!dev) return null;
  if (auth && auth.dev !== dev) auth = null; // a transferred save brought a new device id: start over
  setState({ status: 'loading' });
  const r = await v4<{ account: Profile; created: boolean; token?: string }>('account.hello', { nick: getSave().nick, gameDev: dev, client: { ver: clientVer, platform } });
  if (!r.ok) {
    if (r.code === 'FORBIDDEN' && r.code2 === 'DEVICE_CLAIMED') { auth = null; writeJ(AUTH_KEY, null); setState({ status: 'claimed', account: null }); }
    else setState({ status: 'offline' });
    return state.account;
  }
  if (r.token) { auth = { dev, token: r.token }; writeJ(AUTH_KEY, auth); }
  setState({ status: 'ready', account: r.account, created: !!r.created });
  return r.account;
}
export async function refreshMe(): Promise<Profile | null> {
  if (!auth) return null;
  const r = await v4<{ account: Profile }>('account.me');
  if (r.ok) setState({ account: r.account });
  return state.account;
}
export async function rename(nick: string): Promise<{ ok: true } | { ok: false; code: string; reason?: string }> {
  const r = await v4<{ account: Profile }>('account.rename', { nick });
  if (!r.ok) return { ok: false, code: r.code, reason: typeof r.reason === 'string' ? r.reason : undefined };
  setState({ account: r.account });
  return { ok: true };
}
/** Sends the magic link. In sandbox mode (no mail configured) the link comes back and is finished at once. */
export async function startLink(email: string): Promise<{ ok: boolean; sandbox?: boolean; code?: string }> {
  const r = await v4<{ sent: boolean; sandbox: boolean; link?: string }>('account.link.start', { email });
  if (!r.ok) return { ok: false, code: r.code };
  if (r.sandbox && r.link) await finishLink(r.link);
  return { ok: true, sandbox: r.sandbox };
}
export async function finishLink(link: string): Promise<{ ok: boolean; merged?: boolean; code?: string }> {
  const r = await v4<{ account: Profile; merged: boolean }>('account.link.finish', { link });
  if (!r.ok) return { ok: false, code: r.code };
  setState({ account: r.account });
  if (r.merged) { resetBase(); await pullOnBoot(); }
  return { ok: true, merged: r.merged };
}
function linkFromUrl(): string | null {
  try { const u = new URL(location.href); const l = u.searchParams.get('link'); if (l) { u.searchParams.delete('link'); history.replaceState(null, '', u.pathname + (u.search || '') + u.hash); } return l; } catch { return null; }
}
export function detectPlatform(): 'web' | 'android' | 'pwa' | 'desktop' {
  if (typeof location === 'undefined') return 'web';
  if (location.protocol === 'file:' || location.hostname === 'appassets.androidplatform.net') return 'android';
  if (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) return 'pwa';
  return typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches ? 'desktop' : 'web';
}

// ---------------------------------------------------------------- telemetry: lib/analytics.ts (3.8, brief §54) owns the queue
export { track, flushTelemetry } from './analytics';

/** The platform boot sequence. Call once, after the save has loaded; never blocks the first paint (fire and forget). */
export async function bootPlatform(clientVer: string): Promise<AccountState> {
  if (typeof window === 'undefined') return state;
  const account = await hello(clientVer);
  await loadConfig(clientVer);
  if (!account) return state;
  const link = linkFromUrl();
  if (link) await finishLink(link);
  if (flag('cloudSync', true) && canSync()) {
    const sync = await pullOnBoot();
    setState({ sync });
    watch();
  } else setState({ sync: 'skipped' });
  track('boot', { platform: detectPlatform(), created: state.created });
  void flushTelemetry();
  return state;
}
