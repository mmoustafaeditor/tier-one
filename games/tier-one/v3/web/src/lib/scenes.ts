// Cutscenes (3.3 "One Byline"): which scene plays when, and the one host that plays them.
//
// INTEGRATION (one line each; the owners of those files add them):
//   • App.tsx      → mount <SceneHost /> once, after the screens (it sits above everything, z-index 1000).
//   • CallScene    → call maybeSourceIntro(src, mode) when the player asks a source (mode: 'daily' | 'room' |
//                    'practice' | 'career'). First ask per source plays "Meet your contact"; in the Daily it's queued.
//                    To keep the call's own sounds after the intro: afterScenes(() => openCall()).
//   • Results      → call flushDeferredScenes() once results are on screen (plays intros deferred by the Daily).
//   • Me.tsx       → <ScenesGallery /> from src/film/ScenesGallery.tsx (the replay list).
//   • Season lane  → film/season.ts has a local copy of the GOTY §3 dates; swap in currentSeason() when it lands.
// Already hooked here: the cold open after onboarding (Onboarding.tsx) and the short cut on a new Career slot
// (slots.ts newSlot, Story.tsx create). The season opener needs no hook: SceneHost starts it on the first Home visit.
// Dev preview: ?scene=coldopen | coldopen-career | career | source:<id> | season
//
// Seen scenes are stored in `save.film` (optional string[] in tierone_v3, no version bump). Not `save.scenes`: that
// name is already taken by CallScene's per-source timestamps (Record<string, number>).
import { createElement, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getSave, update, useSave, type Save } from './save';
import { ScenePlayer } from '../film/ScenePlayer';
import { buildScene } from '../film/registry';
import { seasonOf } from '../film/season';

type FilmSave = Save & { film?: string[] };
export const seen = (id: string) => !!(getSave() as FilmSave).film?.includes(id);
export function markSeen(id: string) {
  if (seen(id)) return;
  update((x) => { const s = x as FilmSave; s.film = [...(s.film || []), id].slice(-60); });
}

// ---------- the queue
let queue: string[] = [];
const deferred: string[] = [];
const subs = new Set<() => void>();
let waiters: (() => void)[] = [];
const emit = () => subs.forEach((f) => f());
/** Play a scene now (or after the one playing). Replays ignore `seen`. */
export function playScene(id: string) { if (!queue.includes(id)) { queue = [...queue, id]; emit(); } }
export const scenePlaying = () => queue.length > 0;
/** Run `fn` once no scene is playing (right away if none is). */
export function afterScenes(fn: () => void) { if (!queue.length) fn(); else waiters.push(fn); }

/** First ask of a source: its intro. No-op once seen; in the Daily it waits for flushDeferredScenes(). */
export function maybeSourceIntro(src: string, mode: string): void {
  const id = 'source:' + src;
  if (seen(id) || queue.includes(id)) return;
  if (mode === 'daily') { if (!deferred.includes(id)) deferred.push(id); return; }
  playScene(id);
}
/** After results: play whatever the Daily held back. */
export function flushDeferredScenes(): void {
  const ids = deferred.splice(0).filter((id) => !seen(id));
  if (ids.length) { queue = [...queue, ...ids.filter((id) => !queue.includes(id))]; emit(); }
}

/** The whole game's opening, right after the byline is set. */
export function playColdOpen() { playScene('coldopen'); }
/** A new Career slot: the short cut, or the full opening if the player never saw it. */
export function playCareerOpen() { playScene(seen('coldopen') ? 'coldopen-career' : 'coldopen'); }

export const seasonSceneId = () => 'season:' + seasonOf().id;
/** True until this season's opener has played (keyed by the season id, e.g. "season:rumour-2026"). */
export const shouldShowSeasonOpener = () => !seen(seasonSceneId());

function onHome() {
  const r = document.documentElement.dataset.route;
  if (r) return r === 'front';
  const q = new URLSearchParams(location.search);
  return !q.get('tab') && !q.get('room');
}

/**
 * Mount once in App.tsx: plays queued scenes one at a time, the ?scene= preview, and the season opener on Home.
 * Until App mounts one, a fallback host mounts itself on its own root (below), and it steps aside when App's appears.
 */
let primary = 0;
export function SceneHost({ fallback = false }: { fallback?: boolean }) {
  const s = useSave();
  const [, bump] = useState(0);
  useEffect(() => { const f = () => bump((n) => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  useEffect(() => { if (fallback) return; primary++; emit(); return () => { primary--; emit(); }; }, [fallback]);
  const idle = fallback && primary > 0;
  // Dev preview: ?scene=…
  useEffect(() => { const id = new URLSearchParams(location.search).get('scene'); if (id && !idle) playScene(id === 'career' ? 'coldopen' : id); }, [idle]);
  // The season opener: first time on Home this season (after onboarding).
  useEffect(() => {
    if (idle) return;
    const check = () => { if (getSave().onboarded && !queue.length && onHome() && shouldShowSeasonOpener() && !new URLSearchParams(location.search).get('scene')) playScene(seasonSceneId()); };
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-route'] });
    return () => mo.disconnect();
  }, [s.onboarded, queue.length, idle]);

  const id = idle ? undefined : queue[0];
  const spec = id ? buildScene(id.startsWith('season:') ? 'season' : id, s) : null;
  useEffect(() => { if (id && !spec) { queue = queue.slice(1); emit(); } }, [id, !spec]);
  if (!id || !spec) return null;
  const done = () => {
    markSeen(id);
    // A new player's opening doubles as this season's: no second film straight after it.
    if (id === 'coldopen') { markSeen('coldopen-career'); markSeen(seasonSceneId()); }
    queue = queue.slice(1); emit();
    if (!queue.length) { const w = waiters; waiters = []; w.forEach((f) => f()); }
  };
  return createElement(ScenePlayer, { key: id, spec, onDone: done });
}
if (typeof document !== 'undefined') setTimeout(() => {
  if (primary || document.getElementById('t1-scenes')) return;
  const el = document.createElement('div'); el.id = 't1-scenes'; document.body.appendChild(el);
  createRoot(el).render(createElement(SceneHost, { fallback: true }));
}, 0);
