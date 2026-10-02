// 3.9 "Newsroom": the drawn films and cutscenes are gone (owner's decision, UI39.md). What stays is the small
// bookkeeping screens still use to gate a first-time moment ("seen", "first time today", kept in save.film), and the
// old queue API as no-ops so nothing anywhere waits on a film: playScene() only marks the id seen, afterScenes(fn)
// runs fn at once, SceneHost renders nothing. Moments raised by game logic (lib/moments.ts) are drained and dropped.
import { getSave, update, type Save } from './save';
import { ymdUTC } from './meta';
import { takeMoments, onMoment } from './moments';

type FilmSave = Save & { film?: string[] };
export const seen = (id: string) => !!(getSave() as FilmSave).film?.includes(id);
export function markSeen(id: string) {
  if (seen(id)) return;
  update((x) => { const s = x as FilmSave; s.film = [...(s.film || []), id].slice(-60); });
}
/** True the first time today `key` is asked for (then false until tomorrow). One entry per key in save.film. */
export function firstToday(key: string): boolean {
  const tag = key + '@' + ymdUTC();
  if (seen(tag)) return false;
  update((x) => { const s = x as FilmSave; s.film = [...(s.film || []).filter((k) => !k.startsWith(key + '@')), tag].slice(-60); });
  return true;
}
const seenKey = (id: string) => id.replace(/-short$/, '');

/** No film plays any more; the id is marked seen so "first time" logic keeps its meaning. */
export function playScene(id: string, _props?: Record<string, unknown>) {
  const k = seenKey(id);
  if (!k.startsWith('ddlive:')) markSeen(k);
  if (k === 'coldopen' || k === 'story-prologue') markSeen('coldopen-career');
}
export const scenePlaying = () => false;
/** Runs at once: there is never a scene to wait for. */
export function afterScenes(fn: () => void) { fn(); }
export function maybeSourceIntro(_src: string, _mode: string): void { /* no intros */ }
export function flushDeferredScenes(): void { takeMoments(); }
export function playColdOpen() { playScene('story-prologue'); }
export function playCareerOpen() { playScene('story-ch1-open'); }
export const seasonSceneId = () => 'season';
export const shouldShowSeasonOpener = () => false;
/** Mounted by App for compatibility; renders nothing. */
export function SceneHost(_p: { fallback?: boolean } = {}) { return null; }
if (typeof document !== 'undefined') onMoment(() => { takeMoments(); });
