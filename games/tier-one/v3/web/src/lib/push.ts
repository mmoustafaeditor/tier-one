// Push scaffolding (GOTY.md §8.2): "your Daily is ready", "results are in", "Deadline Day Live opens".
//
// Two transports behind one API:
//   • Web Push: the service worker (src/sw.ts) subscribes with the VAPID public key (T1_VAPID_PUBLIC at build time,
//     or window.__T1_CONFIG.vapidPublic from remote config), and the subscription goes to the server.
//   • Android: the app injects `window.__tierPush` (below) and hands us an FCM token instead.
// The permission is asked only after a completed window (canAskPush), never on first visit, and at most once a month.
//
// SERVER (api lane, api/tier-one/v4; interface only, nothing here is mounted yet):
//   push.subscribe   { dev, kind: 'web' | 'fcm', sub?: PushSubscriptionJSON, token?: string, topics: PushTopic[], lang, tz }
//                    → { ok: true }. Upsert by endpoint/token; one device can hold several topics.
//   push.unsubscribe { dev, endpoint?: string, token?: string } → { ok: true }
//   push.topics      { dev, endpoint?: string, token?: string, topics: PushTopic[] } → { ok: true }
//   The payload the server sends (web: JSON in the push body; FCM: data message) is
//     { topic: PushTopic, title: string, body: string, url?: string (relative to /tier-one/, e.g. "?tab=daily"), tag?: string }
//   Schedules: daily-ready at the player's local 08:00 (tz sent above) once the day's board exists; results-in when
//   the player's Daily is scored (or the room's round settles); ddlive-open when Deadline Day Live opens (§7.1).
//
// ANDROID BRIDGE (APK team): before the page loads, inject an object on window.__tierPush with
//   register(topicsCsv: string): string      asks for POST_NOTIFICATIONS if needed, subscribes the FCM token to the
//                                            topics (comma separated) and returns the token ('' when refused)
//   unregister(): void                        drops the token's topics
//   token(): string                           the current FCM token or ''
//   permission(): 'granted' | 'denied' | 'default'
// and, when the app is opened from a notification, call window.__tierPushOpen?.(url) so the game routes to it.
// Everything here treats the bridge as synchronous (addJavascriptInterface) but tolerates promises.
import { getSave } from './save';

export type PushTopic = 'daily-ready' | 'results-in' | 'ddlive-open';
export const PUSH_TOPICS: PushTopic[] = ['daily-ready', 'results-in', 'ddlive-open'];
export interface TierPushBridge {
  register(topicsCsv: string): string | Promise<string>;
  unregister(): void | Promise<void>;
  token(): string;
  permission(): NotificationPermission;
}
declare global {
  interface Window { __tierPush?: TierPushBridge; __tierPushOpen?: (url: string) => void; __T1_CONFIG?: { vapidPublic?: string } }
}
declare const __VAPID_PUBLIC__: string;

const PUSH_KEY = 'tierone_push';
type PushState = { asked?: number; topics?: PushTopic[]; endpoint?: string; token?: string };
const read = (): PushState => { try { return JSON.parse(localStorage.getItem(PUSH_KEY) || '{}'); } catch { return {}; } };
const write = (p: PushState) => { try { localStorage.setItem(PUSH_KEY, JSON.stringify(p)); } catch { /* */ } };
const bridge = () => (typeof window !== 'undefined' ? window.__tierPush : undefined);
export const vapidPublic = (): string => (typeof window !== 'undefined' && window.__T1_CONFIG?.vapidPublic) || __VAPID_PUBLIC__ || '';

// The v4 API (the api lane adds `v4()` to lib/api.ts; this stays a thin local copy until then).
const BASE = typeof location !== 'undefined' && (location.protocol === 'file:' || location.hostname === 'appassets.androidplatform.net') ? 'https://www.sembagames.app' : '';
async function v4(action: string, body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch(BASE + '/api/tier-one/v4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) });
    return (await r.json().catch(() => null)) || { ok: false, error: 'net' };
  } catch { return { ok: false, error: 'net' }; }
}

/** Can this device do push at all (web push with a key, or the Android bridge)? */
export function pushSupported(): boolean {
  if (bridge()) return true;
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window && !!vapidPublic();
}
export function pushPermission(): NotificationPermission {
  const b = bridge();
  if (b) { try { return b.permission(); } catch { return 'default'; } }
  return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
}
/** True once, after a completed window (a Daily record or a Career window), never on a first visit, once a month at most. */
export function canAskPush(): boolean {
  if (!pushSupported() || pushPermission() !== 'default') return false;
  const s = getSave();
  const played = Object.keys(s.daily || {}).length > 0 || (s.career?.windows || 0) > 0;
  if (!played) return false;
  const p = read();
  return !p.asked || Date.now() - p.asked > 30 * 86400e3;
}
export const pushTopics = (): PushTopic[] => read().topics || [];
export const pushOn = (): boolean => pushTopics().length > 0 && pushPermission() === 'granted';

const b64ToBytes = (s: string) => { const b = atob((s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };

/** Ask (marks the ask), subscribe and tell the server. Resolves true when notifications are on. */
export async function subscribePush(topics: PushTopic[] = PUSH_TOPICS): Promise<boolean> {
  write({ ...read(), asked: Date.now() });
  const s = getSave();
  const common = { dev: s.dev, topics, lang: s.lang, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' };
  const b = bridge();
  if (b) {
    const token = String((await b.register(topics.join(','))) || '');
    if (!token) return false;
    write({ ...read(), topics, token });
    await v4('push.subscribe', { ...common, kind: 'fcm', token });
    return true;
  }
  if (!pushSupported()) return false;
  if ((await Notification.requestPermission()) !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(vapidPublic()) as BufferSource }));
  write({ ...read(), topics, endpoint: sub.endpoint });
  await v4('push.subscribe', { ...common, kind: 'web', sub: sub.toJSON() });
  return true;
}
/** Change the topics of an existing subscription. */
export async function setPushTopics(topics: PushTopic[]): Promise<void> {
  const p = read();
  write({ ...p, topics });
  if (bridge()) { if (topics.length) await bridge()!.register(topics.join(',')); else await bridge()!.unregister(); }
  await v4('push.topics', { dev: getSave().dev, endpoint: p.endpoint, token: p.token, topics });
}
export async function unsubscribePush(): Promise<void> {
  const p = read();
  write({ asked: p.asked });
  const b = bridge();
  if (b) { await b.unregister(); } else if ('serviceWorker' in navigator) {
    try { const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription(); await sub?.unsubscribe(); } catch { /* */ }
  }
  await v4('push.unsubscribe', { dev: getSave().dev, endpoint: p.endpoint, token: p.token });
}

/** lib/perf.ts calls this at boot. A notification tap on Android: the app calls window.__tierPushOpen(url); on the web
 *  the worker navigates the page itself. */
export function initPushBridge(): void {
  if (typeof window === 'undefined') return;
  window.__tierPushOpen = (url: string) => { try { const u = new URL(url, location.href); if (u.origin === location.origin) location.assign(u.href); } catch { /* */ } };
}
