// Smoothness (GOTY.md §8.2): the service worker and its update flow, the install prompt, film preloading, and small
// helpers the rest of the app can lean on so nothing heavy lands on the boot path or inside a frame.
//   initPerf()          main.tsx calls it once: marks boot, registers sw.js once the page has settled, wires the update
//                       toast ("New edition ready → Reload"), the install chip (never on a first visit), and keeps the
//                       theme-color meta in step with the edition.
//   prefetchFilm(stem)  poster first, then the clip, one step ahead of the player (film players call it with the
//                       stem they'll most likely need next). Through the service worker the clip is cached whole, so
//                       the next <video> starts from the cache (< 200 ms measured, scripts/perf.mjs).
//   idle(fn), afterBoot(fn), mark(name)
import { getSave } from './save';
import { t } from './i18n';
import { filmUrl, type Aspect } from '../film/clips';
import { initPushBridge } from './push';

const PERF_KEY = 'tierone_perf';
type PerfState = { visits: number; installAsk?: number; installed?: number };
const isApp = () => location.protocol === 'file:' || location.hostname === 'appassets.androidplatform.net';
const readState = (): PerfState => { try { return { visits: 0, ...JSON.parse(localStorage.getItem(PERF_KEY) || '{}') }; } catch { return { visits: 0 }; } };
const writeState = (p: PerfState) => { try { localStorage.setItem(PERF_KEY, JSON.stringify(p)); } catch { /* */ } };

// ---------- helpers
type IdleWindow = Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
/** Run `fn` when the main thread is idle (or after `timeout` ms at the latest). */
export function idle(fn: () => void, timeout = 2000): void {
  const w = window as IdleWindow;
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout }); else setTimeout(fn, Math.min(timeout, 200));
}
/** Run `fn` once the Semba intro is out of the way (right away when there is no intro). */
export function afterBoot(fn: () => void, maxWait = 8000): void {
  const w = window as Window & { __bootDone?: boolean };
  if (w.__bootDone || !document.getElementById('boot')) { fn(); return; }
  let done = false;
  const once = () => { if (done) return; done = true; clearTimeout(tm); fn(); };
  const tm = setTimeout(once, maxWait); // an intro that never fires its event (gated off) must not hold anything back
  window.addEventListener('sembaboot', once, { once: true });
}
/** A User Timing mark, so traces and scripts/perf.mjs can read boot timings. */
export function mark(name: string): void { try { performance.mark('t1:' + name); } catch { /* */ } }

// ---------- films: one step ahead
const filmsWanted = new Map<string, Promise<void>>();
const aspect = (): Aspect => (matchMedia('(orientation: landscape)').matches ? 'l' : 'p');
async function pull(url: string, priority: 'low' | 'high' = 'low'): Promise<void> {
  // Through the service worker the whole file lands in the films cache; without one, an immutable response still
  // fills the HTTP cache. Body discarded either way.
  try { const r = await fetch(url, { priority, cache: 'force-cache' } as RequestInit); await r.arrayBuffer(); } catch { /* offline or missing: the player falls back */ }
}
/** Poster first (the reduced-motion still and the frame under the loading clip), then the clip. Deduplicated per stem. */
export function prefetchFilm(stem: string, a: Aspect = aspect()): Promise<void> {
  const k = stem + '-' + a;
  let p = filmsWanted.get(k);
  if (p) return p;
  p = (async () => {
    await pull(filmUrl(stem, a, 'jpg'));
    if (getSave().reduced || (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    await pull(filmUrl(stem, a, 'mp4'));
  })();
  filmsWanted.set(k, p);
  return p;
}
/** Several stems in order (the likely next moment first). */
export function prefetchFilms(stems: string[]): Promise<void> { return stems.reduce((p, s) => p.then(() => prefetchFilm(s)), Promise.resolve()); }

// ---------- service worker
let reg: ServiceWorkerRegistration | null = null;
let askedReload = false;
export const swSupported = () => 'serviceWorker' in navigator && !isApp() && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
async function registerSW(): Promise<void> {
  if (!swSupported()) return;
  try {
    reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    // A build that installed while this page was open: offer it. If one is already waiting, offer it now.
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nw = reg!.installing; if (!nw) return;
      nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(nw); });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (askedReload) location.reload(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg?.update().catch(() => {}); });
    setInterval(() => reg?.update().catch(() => {}), 30 * 60 * 1000);
  } catch { /* no SW: the site still works, just not offline */ }
}
export const swRegistration = () => reg;
/** "New edition ready": a chip with a Reload button; reload swaps to the waiting worker. */
function offerUpdate(worker: ServiceWorker) {
  chip('update', t('perf.update.title'), t('perf.update.body'), [
    { label: t('perf.update.reload'), primary: true, on: () => { askedReload = true; worker.postMessage({ type: 'SKIP_WAITING' }); setTimeout(() => location.reload(), 1500); } },
    { label: t('perf.later'), on: () => {} },
  ]);
}

// ---------- install prompt: never on a first visit, at most once a fortnight, only on Home with no film playing
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
let bip: BIPEvent | null = null;
const standalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
function installEligible(p: PerfState): boolean {
  if (standalone() || p.installed || !bip) return false;
  const played = Object.keys(getSave().daily || {}).length > 0 || (getSave().career?.windows || 0) > 0;
  if (p.visits < 2 && !played) return false;
  return !p.installAsk || Date.now() - p.installAsk > 14 * 86400e3;
}
function maybeOfferInstall() {
  const p = readState();
  if (!installEligible(p)) return;
  const r = document.documentElement.dataset.route;
  if ((r && r !== 'front') || document.querySelector('.film, .call-scene, .post-scene, [role="dialog"]')) { setTimeout(maybeOfferInstall, 15000); return; }
  writeState({ ...p, installAsk: Date.now() });
  chip('install', t('perf.install.title'), t('perf.install.body'), [
    { label: t('perf.install.yes'), primary: true, on: async () => { const e = bip; bip = null; if (!e) return; await e.prompt(); const c = await e.userChoice; if (c.outcome === 'accepted') writeState({ ...readState(), installed: Date.now() }); } },
    { label: t('perf.later'), on: () => {} },
  ]);
}

// ---------- a small chip (the app's toasts have no buttons); styles in styles/motion.css
function chip(kind: string, title: string, body: string, actions: { label: string; primary?: boolean; on: () => void }[]) {
  document.querySelector('.t1-chip--' + kind)?.remove();
  const el = document.createElement('div');
  el.className = 't1-chip t1-chip--' + kind; el.setAttribute('role', 'status');
  const txt = document.createElement('div'); txt.className = 't1-chip__txt';
  const b = document.createElement('b'); b.textContent = title; txt.appendChild(b);
  const s = document.createElement('span'); s.textContent = body; txt.appendChild(s);
  el.appendChild(txt);
  const row = document.createElement('div'); row.className = 't1-chip__row';
  for (const a of actions) { const btn = document.createElement('button'); btn.type = 'button'; btn.className = a.primary ? 'is-primary' : ''; btn.textContent = a.label; btn.onclick = () => { el.classList.add('is-out'); setTimeout(() => el.remove(), 260); a.on(); }; row.appendChild(btn); }
  el.appendChild(row);
  document.body.appendChild(el);
}

// ---------- theme-color follows the edition (the manifest carries the Morning Paper; Late Edition sets it here)
function watchEdition() {
  const meta = () => { let m = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])'); if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); } return m; };
  const apply = () => {
    const ed = document.documentElement.getAttribute('data-edition') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'late' : 'morning');
    meta().content = ed === 'late' ? '#121110' : '#F2EEE5';
  };
  apply();
  new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ['data-edition'] });
}

/** main.tsx: once. Everything here waits for the intro and an idle moment; nothing blocks the first render. */
export function initPerf(): void {
  if (typeof window === 'undefined') return;
  mark('main');
  initPushBridge();
  const p = readState(); writeState({ ...p, visits: p.visits + 1 });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); bip = e as BIPEvent; afterBoot(() => setTimeout(maybeOfferInstall, 20000)); });
  window.addEventListener('appinstalled', () => writeState({ ...readState(), installed: Date.now() }));
  afterBoot(() => {
    mark('boot-done');
    idle(watchEdition);
    // The worker's install pulls ~1 MB (shell, fonts, the play loop). On a first visit over slow 4G that must not
    // crowd out the first tap, so it starts a while after the intro, or as soon as the tab is hidden. Later visits
    // find it installed already and register() is a no-op.
    let done = false;
    const go = () => { if (done) return; done = true; idle(registerSW, 4000); };
    setTimeout(go, navigator.serviceWorker?.controller ? 0 : 9000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') go(); }, { once: true });
  });
}
