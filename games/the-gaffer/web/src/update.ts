// Live updates. The game knows its own build number; it watches for a newer one and says so.
//  - On the website: it reads /the-gaffer/version.json on start, every 10 minutes and whenever the tab comes back.
//  - In the Android app: the app ("shell") downloads the new web build itself and tells the page through
//    window.__gafferUpdate; it also says when a new APK is out. The page shows one short banner either way.
// The Android app also keeps a copy of the save outside the page, so a new build always finds the career.
declare const __BUILD__: number;
declare const __APP_VERSION__: string;
declare const __MIN_SHELL__: number;
export const BUILD = __BUILD__;
export const VERSION = __APP_VERSION__;
export const MIN_SHELL = __MIN_SHELL__;

interface Shell {
  booted?(build: number): void;
  backupSave?(json: string): void;
  restoreSave?(): string;
  applyUpdate?(): void;
  openApkUpdate?(): void;
  updateState?(): string;
}
export const shell = (): Shell | undefined => (window as unknown as { GafferAndroid?: Shell }).GafferAndroid;

export interface UpdateState { web?: { version: string; build: number }; apk?: { version: string; url?: string } }
declare global { interface Window { __gafferUpdate?: (s: UpdateState) => void } }

const KEYS = (k: string) => k.startsWith('gaffer.');

// Copy every gaffer.* key to the app, so a new build (or a new install over the old one) finds the career.
export function backupToShell() {
  const sh = shell();
  if (!sh?.backupSave) return;
  try {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; if (KEYS(k)) data[k] = localStorage.getItem(k) ?? ''; }
    if (Object.keys(data).length) sh.backupSave(JSON.stringify(data));
  } catch { /* storage blocked: nothing to back up */ }
}

// Before the game reads its save: if this page has none but the app kept one, put it back.
export function restoreFromShell() {
  const sh = shell();
  if (!sh?.restoreSave) return;
  try {
    if (localStorage.getItem('gaffer.save.v1')) return;
    const raw = sh.restoreSave();
    if (!raw) return;
    const data = JSON.parse(raw) as Record<string, string>;
    for (const [k, v] of Object.entries(data)) if (KEYS(k) && typeof v === 'string') localStorage.setItem(k, v);
  } catch { /* a broken backup is ignored; the game starts fresh */ }
}

const siteVersionUrl = () => (/^https?:$/.test(location.protocol) && location.pathname.startsWith('/the-gaffer') ? `${location.origin}/the-gaffer/version.json` : null);

// Calls back with news of a newer build or app. Returns a stop function.
export function watchUpdates(cb: (s: UpdateState) => void): () => void {
  const sh = shell();
  if (sh) {
    window.__gafferUpdate = (s) => cb(s);
    try { const s = sh.updateState?.(); if (s) cb(JSON.parse(s)); } catch { /* no state yet */ }
    sh.booted?.(BUILD);
    const hide = () => { if (document.visibilityState === 'hidden') backupToShell(); };
    document.addEventListener('visibilitychange', hide);
    return () => { window.__gafferUpdate = undefined; document.removeEventListener('visibilitychange', hide); };
  }
  const url = siteVersionUrl();
  if (!url) return () => {};
  const check = async () => {
    try {
      const r = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) return;
      const v = await r.json() as { version: string; build: number };
      if (typeof v.build === 'number' && v.build > BUILD) cb({ web: { version: v.version, build: v.build } });
    } catch { /* offline: try again later */ }
  };
  void check();
  const id = setInterval(check, 10 * 60 * 1000);
  const vis = () => { if (document.visibilityState === 'visible') void check(); };
  document.addEventListener('visibilitychange', vis);
  return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
}

// "Update now": the website reloads; the app switches to the build it already downloaded.
export function applyWebUpdate() {
  const sh = shell();
  if (sh?.applyUpdate) { backupToShell(); sh.applyUpdate(); return; }
  location.reload();
}

export function openApkUpdate() { shell()?.openApkUpdate?.(); }
