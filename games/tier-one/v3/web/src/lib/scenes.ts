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
//   moments: paper | paper-short | tier:<blogger..tierone> | contact:<src> | scalp:<rival> | trophy:<rival> | deadline |
//   deadline-short | official
//
// Moment films (lib/moments.ts): game logic raises them with moment(id); they wait until the player is off the play
// surface (Results finished revealing, or the route left a window), then play one at a time and unskippable.
//
// Seen scenes are stored in `save.film` (optional string[] in tierone_v3, no version bump). Not `save.scenes`: that
// name is already taken by CallScene's per-source timestamps (Record<string, number>).
import { createElement, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getSave, update, useSave, type Save } from './save';
import { ScenePlayer } from '../film/ScenePlayer';
import { buildScene } from '../film/registry';
import { seasonOf } from '../film/season';
import { takeMoments, onMoment } from './moments';
import { ymdUTC } from './meta';

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
/** Which save.film entry a scene id marks: cuts share their film's entry. */
const seenKey = (id: string) => id.replace(/-short$/, '');

// ---------- the queue
let queue: string[] = [];
const extras = new Map<string, Record<string, unknown>>();
const deferred: string[] = [];
const subs = new Set<() => void>();
let waiters: (() => void)[] = [];
const emit = () => subs.forEach((f) => f());
/** Play a scene now (or after the one playing). Replays ignore `seen`. `props` fill in what the save can't know. */
export function playScene(id: string, props?: Record<string, unknown>) { if (props) extras.set(id, props); if (!queue.includes(id)) { queue = [...queue, id]; emit(); } }
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
/** After results: play whatever the Daily held back, then the moment films the window raised. */
export function flushDeferredScenes(): void {
  const ids = deferred.splice(0).filter((id) => !seen(id));
  if (ids.length) { queue = [...queue, ...ids.filter((id) => !queue.includes(id))]; emit(); }
  flushMoments();
}
const inWindow = () => { const r = document.documentElement.dataset.route; return r === 'daily' || r === 'room' || r === 'play'; };
/** Queue held moments (skipping once-only ones already seen). */
function flushMoments() {
  for (const m of takeMoments()) {
    if (m.once && seen(seenKey(m.id))) continue;
    playScene(m.id, m.v);
  }
}
// A moment raised off the play surface plays straight away; one raised mid-window waits for Results or the exit.
if (typeof document !== 'undefined') {
  const check = () => { if (getSave().onboarded && !inWindow()) flushMoments(); };
  onMoment(check);
  new MutationObserver(check).observe(document.documentElement, { attributes: true, attributeFilter: ['data-route'] });
}

/** The whole game's opening, right after the byline is set: Story mode's prologue, "The fall" (3.4). The old cold open
 *  (film/scenes/ColdOpen.tsx) no longer auto-plays; it stays in the registry and the Remotion project. */
export function playColdOpen() { playScene('story-prologue'); }
/** A new Career slot: chapter 1's opener. */
export function playCareerOpen() { playScene('story-ch1-open'); }

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
  const spec = id ? buildScene(id.startsWith('season:') ? 'season' : id, s, extras.get(id)) : null;
  useEffect(() => { if (id && !spec) { queue = queue.slice(1); emit(); } }, [id, !spec]);
  if (!id || !spec) return null;
  const done = () => {
    markSeen(seenKey(id)); extras.delete(id);
    // A new player's opening doubles as this season's: no second film straight after it.
    if (id === 'coldopen' || id === 'story-prologue') { markSeen('coldopen-career'); markSeen(seasonSceneId()); }
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
