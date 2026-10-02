// Analytics (brief §54): the funnel events, batched through the v4 telemetry endpoint (api/_lib/telemetry.mjs
// `telemetry.batch`), offline-safe and free of PII. Other lanes call `track(name, props)` or the typed `funnel.*`
// helpers; nothing here ever blocks a frame or a tap.
//
//   track(name, props?)   queue an event (name: /^[a-z][a-z0-9_.]{1,39}$/, props: a few short scalars; the server
//                         drops anything that looks like an email, a phone number or a key named like one)
//   trackOnce(name, …)    the same, but only the first time this device sends that name (first source called, …)
//   funnel.*              the §54 events by name, so call sites don't spell strings
//   flushTelemetry()      send now (App calls it on pagehide with keepalive)
//
// Queue: in memory, mirrored to localStorage (`tierone_tm_queue`, ≤ 200 events) so a reload or an offline session
// loses nothing; batches of ≤ 50 every 15 s or when 40 are waiting; a network failure puts the batch back.
// Returns: D1 / D7 / D30 are computed here from the first-open day (`tierone_tm_first`) and sent once each, so the
// funnel reads the same whether the server's HyperLogLogs or the raw event counts are consulted.
import { v4 } from './api';
import { flag } from './flags';

export type Props = Record<string, string | number | boolean>;
interface Ev { t: number; name: string; props?: Props }

export const EVENTS = {
  appOpen: 'app.open', onboardingStart: 'onboarding.start', onboardingDone: 'onboarding.done',
  dailyView: 'daily.view', dailyStart: 'daily.start', sourceFirst: 'source.first', sourceSecond: 'source.second', callFirst: 'call.first', dailyDone: 'daily.done',
  resultShare: 'result.share', careerStart: 'career.start', roomCreate: 'room.create', inviteSend: 'invite.send', inviteJoin: 'invite.join', marketCall: 'market.call',
  // the store names match api/_lib/telemetry.mjs CONVERSIONS so the ops dashboard counts them as conversions
  storeOpen: 'store.open', itemPreview: 'store.preview', purchaseStart: 'checkout.start', purchaseDone: 'purchase.ok',
  returnD1: 'return.d1', returnD7: 'return.d7', returnD30: 'return.d30',
} as const;
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

const QUEUE_KEY = 'tierone_tm_queue', ONCE_KEY = 'tierone_tm_once', FIRST_KEY = 'tierone_tm_first';
const NAME_RE = /^[a-z][a-z0-9_.]{1,39}$/, MAX_QUEUE = 200, BATCH = 50, FLUSH_AT = 40, FLUSH_MS = 15000;
const PII_KEY = /(mail|phone|name|nick|address|token|secret|password|ip$|passwd|user)/i;

let queue: Ev[] = readQueue();
let timer = 0, inflight = false;
function readQueue(): Ev[] { try { const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); return Array.isArray(q) ? q.slice(-MAX_QUEUE) : []; } catch { return []; } }
function saveQueue() { try { if (queue.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE))); else localStorage.removeItem(QUEUE_KEY); } catch { /* storage blocked: memory only */ } }
function cleanProps(p?: Props): Props | undefined {
  if (!p) return undefined;
  const out: Props = {};
  for (const [k, v] of Object.entries(p).slice(0, 12)) {
    if (!/^[a-z][a-z0-9_]{0,23}$/i.test(k) || PII_KEY.test(k)) continue;
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = Math.round(v * 1000) / 1000;
    else if (typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'string') { const s = v.slice(0, 80); if (s && !/@|https?:\/\//.test(s)) out[k] = s; }
  }
  return Object.keys(out).length ? out : undefined;
}

export function track(name: string, props?: Props): void {
  if (typeof window === 'undefined' || !NAME_RE.test(name) || !flag('telemetry', true)) return;
  queue.push({ t: Date.now(), name, props: cleanProps(props) });
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  saveQueue();
  if (queue.length >= FLUSH_AT) void flushTelemetry();
  else if (!timer) timer = window.setTimeout(() => { void flushTelemetry(); }, FLUSH_MS);
}
const onceSet = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(ONCE_KEY) || '[]')); } catch { return new Set(); } };
/** Sends `name` the first time only (per device). Returns true when it was sent. */
export function trackOnce(name: string, props?: Props): boolean {
  const seen = onceSet();
  if (seen.has(name)) return false;
  seen.add(name);
  try { localStorage.setItem(ONCE_KEY, JSON.stringify([...seen])); } catch { /* */ }
  track(name, props);
  return true;
}

export async function flushTelemetry(keepalive = false): Promise<void> {
  clearTimeout(timer); timer = 0;
  if (inflight || !queue.length) return;
  inflight = true;
  const events = queue.slice(0, BATCH);
  try {
    const r = await v4('telemetry.batch', { events }, { keepalive, timeoutMs: 6000 });
    if (r.ok || (r as { code?: string }).code !== 'NET') queue = queue.slice(events.length); // a rejected batch is dropped, never retried forever
    saveQueue();
  } catch { /* keep the queue */ } finally { inflight = false; }
  if (queue.length >= BATCH) void flushTelemetry(keepalive);
}

// ---------- the §54 funnel by name
export const funnel = {
  appOpened: (props?: Props) => track(EVENTS.appOpen, props),
  onboardingStarted: () => trackOnce(EVENTS.onboardingStart),
  onboardingCompleted: (props?: Props) => trackOnce(EVENTS.onboardingDone, props),
  dailyViewed: (no?: number) => track(EVENTS.dailyView, no ? { no } : undefined),
  dailyStarted: (no?: number) => track(EVENTS.dailyStart, no ? { no } : undefined),
  /** Call with the running count of sources rung on the player's first ever board; the 1st and 2nd are sent once. */
  sourceCalled: (nth: number, src?: string) => { if (nth === 1) trackOnce(EVENTS.sourceFirst, src ? { src } : undefined); else if (nth === 2) trackOnce(EVENTS.sourceSecond, src ? { src } : undefined); },
  firstCallPublished: (props?: Props) => trackOnce(EVENTS.callFirst, props),
  dailyFinished: (props?: Props) => track(EVENTS.dailyDone, props),
  resultShared: (how: string, mode?: string) => track(EVENTS.resultShare, { how, ...(mode ? { mode } : {}) }),
  careerStarted: () => trackOnce(EVENTS.careerStart),
  roomCreated: (props?: Props) => track(EVENTS.roomCreate, props),
  inviteSent: (how: string) => track(EVENTS.inviteSend, { how }),
  inviteJoined: () => track(EVENTS.inviteJoin),
  marketCallMade: (props?: Props) => track(EVENTS.marketCall, props),
  storeOpened: (from?: string) => track(EVENTS.storeOpen, from ? { from } : undefined),
  itemPreviewed: (item: string, kind?: string) => track(EVENTS.itemPreview, { item, ...(kind ? { kind } : {}) }),
  purchaseAttempted: (item: string, cur: string) => track(EVENTS.purchaseStart, { item, cur }),
  purchaseCompleted: (item: string, cur: string) => track(EVENTS.purchaseDone, { item, cur }),
};

/** App open: the event itself, plus the D1 / D7 / D30 return marks once each (local calendar days since first open). */
export function trackAppOpen(props?: Props): void {
  if (typeof window === 'undefined') return;
  const today = new Date().toISOString().slice(0, 10);
  let first = '';
  try { first = localStorage.getItem(FIRST_KEY) || ''; if (!first) { localStorage.setItem(FIRST_KEY, today); first = today; } } catch { first = today; }
  const days = Math.round((Date.parse(today) - Date.parse(first)) / 864e5);
  funnel.appOpened({ ...(props || {}), days });
  if (days === 1) trackOnce(EVENTS.returnD1);
  if (days === 7) trackOnce(EVENTS.returnD7);
  if (days === 30) trackOnce(EVENTS.returnD30);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { void flushTelemetry(); });
  window.addEventListener('pagehide', () => { void flushTelemetry(true); });
}
