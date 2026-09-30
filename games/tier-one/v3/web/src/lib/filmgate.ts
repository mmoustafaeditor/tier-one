// The film gate (GOTY.md §9.2): what the surface films may do on this device right now.
//   clips    loops and beats play (posters first, video on top)
//   posters  a still (the loop's rest frame) instead of a loop; beats still fire when they are cheap (`beats`)
//   none     nothing extra at all: the UI is exactly what it is without film
// Inputs: the player's setting (save.filmMode: full | light | off, default full), Reduce motion (save.reduced or the OS),
// Save-Data, the connection (2g / slow-2g / 3g), the battery (< 20 % and not charging), device memory and cores, and
// the Android app (a file: URL: posters until the clips are cached on the site). Loops never play in a hidden tab or
// off screen: that is ui/film.tsx's job. The 3D desk (ui/desk3d) asks `desk3d` and is stricter.
//
// SETTINGS LANE: drop <FilmSetting /> (ui/film.tsx) into the Settings sheet under the motion toggle. It reads and writes
// save.filmMode through setFilmMode() below. Nothing else needs wiring.
import { useEffect, useSyncExternalStore } from 'react';
import { getSave, update, useSave, type Save } from './save';
import { prefersReducedMotion } from './motion';

export type FilmMode = 'full' | 'light' | 'off';
export type FilmLevel = 'clips' | 'posters' | 'none';
export interface FilmBudget {
  level: FilmLevel;
  /** Ambient loops may play video (else their poster, or nothing). */
  loops: boolean;
  /** Interactive beats may play (they are short and preloaded, so they survive 'light'). */
  beats: boolean;
  /** Filmed page turns instead of the CSS slide. */
  turns: boolean;
  /** The real-time 3D desk on Home (desktop, fine pointer, WebGL2, plenty of memory, film on full). */
  desk3d: boolean;
  /** The Android app: posters only until the clips are cached. */
  apk: boolean;
  /** Why the level is what it is (for the dev overlay and bug reports). */
  why: string;
}

type FilmSave = Save & { filmMode?: FilmMode };
export const filmMode = (): FilmMode => (getSave() as FilmSave).filmMode || 'full';
export function setFilmMode(m: FilmMode) { update((s) => { (s as FilmSave).filmMode = m; }); }

type NavX = Navigator & { connection?: { saveData?: boolean; effectiveType?: string; addEventListener?: (k: string, f: () => void) => void; removeEventListener?: (k: string, f: () => void) => void }; deviceMemory?: number; getBattery?: () => Promise<{ level: number; charging: boolean; addEventListener: (k: string, f: () => void) => void }> };
const nav = (): NavX | null => (typeof navigator !== 'undefined' ? (navigator as NavX) : null);
const isApk = () => typeof location !== 'undefined' && (location.protocol === 'file:' || location.hostname === 'appassets.androidplatform.net');

// The battery is async: we read it once, then re-evaluate whenever it changes.
let battery: { level: number; charging: boolean } | null = null;
let webgl2: boolean | null = null;
function hasWebGL2(): boolean {
  if (webgl2 != null) return webgl2;
  try { const c = document.createElement('canvas'); const gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: true }); webgl2 = !!gl; gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { webgl2 = false; }
  return webgl2;
}

/** The budget right now (pure of React; the hook below re-reads it when any input changes). */
export function filmBudget(): FilmBudget {
  const n = nav();
  const mode = filmMode();
  const apk = isApk();
  const out = (level: FilmLevel, why: string, extra: Partial<FilmBudget> = {}): FilmBudget => ({ level, apk, why, loops: level === 'clips', beats: level === 'clips', turns: false, desk3d: false, ...extra });
  if (mode === 'off') return out('none', 'setting: off');
  if (prefersReducedMotion()) return out('posters', 'reduce motion', { beats: false });
  const c = n?.connection;
  if (c?.saveData) return out('posters', 'save-data', { beats: false });
  const et = c?.effectiveType || '';
  if (et === 'slow-2g' || et === '2g') return out('posters', 'connection: ' + et, { beats: false });
  if (battery && !battery.charging && battery.level < 0.2) return out('posters', 'battery low', { beats: false });
  const mem = n?.deviceMemory ?? 4, cores = n?.hardwareConcurrency ?? 4;
  if (mem <= 1 || cores <= 1) return out('posters', 'low-end device', { beats: false });
  if (mode === 'light') return out('posters', 'setting: light', { beats: true });
  if (et === '3g') return out('posters', 'connection: 3g', { beats: true });
  if (apk) return out('posters', 'android app', { beats: true });
  if (mem <= 2 || cores <= 2) return out('clips', 'ok (small device)', { beats: true, turns: false });
  const wide = typeof innerWidth !== 'undefined' && innerWidth >= 1024;
  const fine = typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
  const desk3d = wide && fine && mem >= 4 && cores >= 4 && hasWebGL2();
  return out('clips', 'ok', { beats: true, turns: true, desk3d });
}

// ---------- the store: one subscription per input, one recompute, one snapshot
const subs = new Set<() => void>();
let snap: FilmBudget | null = null;
let armed = false;
const key = (b: FilmBudget) => [b.level, b.loops, b.beats, b.turns, b.desk3d, b.why].join('|');
function recompute() {
  const next = filmBudget();
  if (!snap || key(next) !== key(snap)) { snap = next; syncHtml(next); subs.forEach((f) => f()); }
}
function syncHtml(b: FilmBudget) {
  if (typeof document === 'undefined') return;
  const h = document.documentElement;
  h.dataset.film = b.level; // motion.css and surfaces.css key off html[data-film]
  h.classList.toggle('film-turns', b.turns);
}
function arm() {
  if (armed || typeof window === 'undefined') return;
  armed = true;
  const n = nav();
  n?.connection?.addEventListener?.('change', recompute);
  try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', recompute); } catch { /* old engines */ }
  try { matchMedia('(min-width: 1024px)').addEventListener('change', recompute); } catch { /* */ }
  n?.getBattery?.().then((b) => { const read = () => { battery = { level: b.level, charging: b.charging }; recompute(); }; read(); b.addEventListener('levelchange', read); b.addEventListener('chargingchange', read); }).catch(() => {});
}
export function getFilmBudget(): FilmBudget { arm(); if (!snap) { snap = filmBudget(); syncHtml(snap); } return snap; }
export function onFilmBudget(f: () => void) { arm(); subs.add(f); return () => { subs.delete(f); }; }
/** The live budget: re-renders when the setting, Reduce motion, the connection, the battery or the viewport class changes. */
export function useFilmBudget(): FilmBudget {
  const s = useSave() as FilmSave;
  // The save's own inputs (the setting, Reduce motion) re-evaluate the gate right after they change.
  const k = (s.filmMode || 'full') + '|' + s.reduced;
  useEffect(() => { recompute(); }, [k]);
  return useSyncExternalStore(onFilmBudget, getFilmBudget, getFilmBudget);
}
if (typeof document !== 'undefined') setTimeout(() => { getFilmBudget(); }, 0);
