// Scenes, after the cut (CONCEPT4.md §6): the owner removed the drawn motion films, the film loops and the cutscene
// player. Motion in 4.0 is the phone's own UI motion (ui/juice.tsx, screens/Blurt.tsx, screens/DMs.tsx); nothing here
// plays anything any more.
//
// The API stays so the screens that still call it (Story, DDLive, Onboarding, ui/live.tsx, lib/social.ts,
// lib/slots.ts) keep compiling until their lanes drop the calls: playScene is a no-op, afterScenes runs its callback
// at once, the "seen" ledger (save.film) still answers firstToday() so once-a-day logic keeps its meaning.
import { getSave, update, type Save } from './save';
import { takeMoments } from './moments';
import { ymdUTC } from './meta';

type FilmSave = Save & { film?: string[] };
export const seen = (id: string) => !!(getSave() as FilmSave).film?.includes(id);
export function markSeen(id: string) {
  if (seen(id)) return;
  update((x) => { const s = x as FilmSave; s.film = [...(s.film || []), id].slice(-60); });
}
/** True the first time today `key` is asked for (then false until tomorrow). */
export function firstToday(key: string): boolean {
  const tag = key + '@' + ymdUTC();
  if (seen(tag)) return false;
  update((x) => { const s = x as FilmSave; s.film = [...(s.film || []).filter((k) => !k.startsWith(key + '@')), tag].slice(-60); });
  return true;
}
/** No film plays: the id is marked seen so anything waiting on it moves on. */
export function playScene(id: string, _props?: Record<string, unknown>) { markSeen(id.replace(/-short$/, '')); }
export const scenePlaying = () => false;
/** Runs `fn` now (nothing is ever playing). */
export function afterScenes(fn: () => void) { fn(); }
export function maybeSourceIntro(_src: string, _mode: string): void { /* cut */ }
/** Drops any held moment (lib/moments.ts): they were film triggers. */
export function flushDeferredScenes(): void { takeMoments(); }
export const PLAY_ROUTES = ['daily', 'room', 'play', 'blurt', 'live', 'tutorial'];
export function playColdOpen() { /* cut: the first window is the opening (CONCEPT4 §12) */ }
export function playCareerOpen() { /* cut */ }
export const seasonSceneId = () => 'season';
export const shouldShowSeasonOpener = () => false;
/** Kept for App.tsx's lazy import; renders nothing. */
export function SceneHost(_: { fallback?: boolean }) { return null; }
