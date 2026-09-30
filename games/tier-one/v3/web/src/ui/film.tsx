// Surface films (GOTY.md §9): ambient loops behind the live UI, interactive beats, filmed page turns, and the Home 3D
// desk. Everything here is decorative and additive: with no clip and no poster a surface renders nothing and the UI is
// exactly what it was. The gate (lib/filmgate.ts) decides clips / posters / nothing per device; only one loop plays at
// a time (the last one mounted wins, the others pause on their frame); loops pause off screen and in a hidden tab.
//
// INTEGRATION (one line each; the owner of each screen adds it, App.tsx already mounts the screen-level ones):
//   • Home      → <HomeFilm /> anywhere inside Home (it portals to the stage). App.tsx mounts it beside <Home/> today;
//                 the Home lane can move it inside Home and drop the App.tsx line, or leave it (a second mount is a no-op).
//   • Wire      → <WireFilm layer="inline" /> as the FIRST child of the hero <section className="g-hero g-hero--wire">
//                 (the hero is position: relative + overflow: hidden, so the loop fills it under the copy).
//                 Without it the stage-level <WireFilm/> from App.tsx plays behind the whole page.
//   • Press box → <PressboxFilm layer="inline" /> first child of the rooms hero; else App.tsx's stage-level one.
//   • Results   → <ResultsFilm /> (Window.tsx mounts it beside <Results/> today; the Results lane may move it).
//   • Pass      → <SeasonFilm layer="inline" /> first child of the season hero; else App.tsx's stage-level one.
//   • Newsroom  → <MastheadFilm /> (the clan screen; stage-level, or layer="inline" first child of the masthead card).
//   • Settings  → <FilmSetting /> under the motion toggle (Film: full / light / off; saved as save.filmMode).
//   • Any card  → <FilmLoop stem="loop-…" layer="inline" /> as the first child of a positioned, overflow-hidden box.
//   • Any beat  → <Beat stem="beat-…" trigger={n} onEnd={…} /> inside a positioned box, or playBeat('beat-…') full screen.
// Match cuts: lastFrameOf(stem) hands a film the loop's current frame (film/surfaces/manifest.ts says which frame each
// loop rests on, so the studio can start the next film from it).
import { createElement, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { filmUrl, type Aspect } from '../film/clips';
import { surfaceOf, homeLoop, placeLoop, seasonLoop, toneNow, type Beat as BeatSpec } from '../film/surfaces/manifest';
import { seasonOf } from '../film/season';
import { getFilmBudget, onFilmBudget, useFilmBudget, filmMode, setFilmMode, type FilmMode } from '../lib/filmgate';
import { useT } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import { Seg } from './screenbits';
import '../film/surfaces/surfaces.css';
export { useFilmBudget, getFilmBudget, filmMode, setFilmMode } from '../lib/filmgate';

// ---------- stems that aren't on the site: remembered for the session so a re-mount never flashes or refetches
const dead = new Set<string>();
const vkey = (stem: string, a: Aspect) => stem + '-' + a;
const pkey = (stem: string, a: Aspect) => 'poster:' + stem + '-' + a;
export const aspectNow = (): Aspect => (typeof innerHeight !== 'undefined' && innerHeight > innerWidth ? 'p' : 'l');
function useAspect(): Aspect {
  const [a, setA] = useState<Aspect>(aspectNow);
  useEffect(() => { const on = () => setA(aspectNow()); addEventListener('resize', on); return () => removeEventListener('resize', on); }, []);
  return a;
}
// iOS needs the attributes as well as the properties before play() for muted inline autoplay.
function prep(v: HTMLVideoElement) { v.muted = true; v.defaultMuted = true; v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.playsInline = true; v.disablePictureInPicture = true; }

// ---------- the tab: loops pause while it is hidden
let tabVisible = typeof document === 'undefined' || document.visibilityState !== 'hidden';
const tabSubs = new Set<() => void>();
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { tabVisible = document.visibilityState !== 'hidden'; tabSubs.forEach((f) => f()); });
const useTabVisible = () => useSyncExternalStore((f) => { tabSubs.add(f); return () => { tabSubs.delete(f); }; }, () => tabVisible, () => true);

// ---------- the registry: every mounted loop claims a slot; the last claim plays, the rest hold their frame
type Claim = { id: number; stem: string; inline: boolean };
let claims: Claim[] = [];
let seq = 0;
const regSubs = new Set<() => void>();
const emit = () => regSubs.forEach((f) => f());
function claim(stem: string, inline: boolean): { id: number; off: () => void } {
  const c: Claim = { id: ++seq, stem, inline };
  claims = [...claims, c]; emit();
  return { id: c.id, off: () => { claims = claims.filter((x) => x !== c); emit(); } };
}
const useRegistry = () => useSyncExternalStore((f) => { regSubs.add(f); return () => { regSubs.delete(f); }; }, () => claims, () => claims);
const top = (cs: Claim[]) => cs[cs.length - 1] || null;
/** The stem the stage should show: the newest screen-level claim (an inline loop on top of it pauses it but doesn't replace it). */
function stageStem(cs: Claim[]): string | null { for (let i = cs.length - 1; i >= 0; i--) if (!cs[i].inline) return cs[i].stem; return null; }

// ---------- the mounted videos, by stem, for match cuts
const videos = new Map<string, HTMLVideoElement>();
export interface LastFrame { stem: string; src: string; time: number; duration: number; frame: HTMLCanvasElement | null }
/** The loop's current frame (a canvas, when the clip is same-origin) and its time in the loop, for a film that must
 *  start where the loop is. The studio lane makes each loop's rest frame the next film's first frame (manifest `endsOn`);
 *  this covers the drift when the cut lands mid-loop: seek the film to `time` mod its lead-in, or show `frame` for one tick. */
export function lastFrameOf(stem: string): LastFrame | null {
  const v = videos.get(stem);
  if (!v || !v.videoWidth) return null;
  let frame: HTMLCanvasElement | null = null;
  try { const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d')!.drawImage(v, 0, 0); c.getContext('2d')!.getImageData(0, 0, 1, 1); frame = c; } catch { frame = null; }
  return { stem, src: v.currentSrc, time: v.currentTime, duration: v.duration || 0, frame };
}
/** The stem the stage is showing right now (null when nothing is mounted). */
export const currentLoop = () => stageStem(claims);

// ---------- one loop: poster first, the video over it once it plays; nothing when neither exists
type Fit = 'cover' | 'contain';
type Tone = 'dim' | 'plain';
function LoopLayer({ stem, playing, fit = 'cover', tone = 'dim', inline, className = '', style }: { stem: string; playing: boolean; fit?: Fit; tone?: Tone; inline?: boolean; className?: string; style?: CSSProperties }) {
  const b = useFilmBudget();
  const a = useAspect();
  const tab = useTabVisible();
  const [, bump] = useState(0);
  const [on, setOn] = useState(false);
  const [seen, setSeen] = useState(!inline); // stage layers are always on screen; inline ones watch the viewport
  const box = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const posterDead = dead.has(pkey(stem, a));
  const wantVideo = b.loops && !dead.has(vkey(stem, a));
  const nothing = b.level === 'none' || (posterDead && !wantVideo);
  // the host of an inline loop is isolated so the loop (z-index -1) sits over the host's background and under its content
  useLayoutEffect(() => { if (!inline || nothing) return; const p = box.current?.parentElement; if (!p) return; p.classList.add('fl-host'); return () => { p.classList.remove('fl-host'); }; }, [inline, nothing]);
  useEffect(() => {
    if (!inline || nothing || typeof IntersectionObserver === 'undefined') return;
    const el = box.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.05 });
    io.observe(el); return () => io.disconnect();
  }, [inline, nothing]);
  // play / pause: only the registry's top claim plays, and only on a visible screen in a visible tab
  const go = playing && seen && tab && wantVideo;
  useEffect(() => {
    const v = vid.current; if (!v) return;
    if (go) { prep(v); v.play().catch(() => { /* onError marks it dead; autoplay denial just leaves the poster */ }); } else v.pause();
  }, [go, a]);
  useEffect(() => { const v = vid.current; if (!v || !wantVideo) return; videos.set(stem, v); return () => { if (videos.get(stem) === v) videos.delete(stem); }; }, [stem, a, wantVideo]);
  if (nothing) return null;
  const poster = filmUrl(stem, a, 'jpg');
  return <div ref={box} className={['fl', inline ? 'fl--inline' : 'fl--stage', 'fl--' + fit, 'fl--' + tone, on || !posterDead ? 'is-in' : '', className].filter(Boolean).join(' ')} style={style} data-stem={stem} aria-hidden="true">
    {!posterDead && <img src={poster} alt="" decoding="async" loading={inline ? 'lazy' : 'eager'} draggable={false} onError={() => { dead.add(pkey(stem, a)); bump((n) => n + 1); }} />}
    {wantVideo && <video key={a} ref={vid} className={on ? 'is-on' : ''} src={filmUrl(stem, a)} poster={posterDead ? undefined : poster} muted loop playsInline autoPlay={go} preload={go ? 'auto' : 'metadata'} disablePictureInPicture aria-hidden="true" tabIndex={-1}
      onPlaying={() => setOn(true)} onError={() => { dead.add(vkey(stem, a)); setOn(false); bump((n) => n + 1); }} />}
  </div>;
}

/**
 * An ambient loop. `layer="screen"` (default) plays on the fixed stage behind the whole page and crossfades with
 * whatever was there; `layer="inline"` fills its parent (make the parent position: relative; overflow: hidden and put
 * the loop first). Muted, looping, poster first; pauses off screen, in a hidden tab, and whenever a later loop mounts.
 */
export function FilmLoop({ stem, fit = 'cover', tone = 'dim', layer = 'screen', className, style }: { stem: string; fit?: Fit; tone?: Tone; layer?: 'screen' | 'inline'; className?: string; style?: CSSProperties }) {
  const inline = layer === 'inline';
  const [id, setId] = useState(0);
  useEffect(() => { if (!inline) stageOpts.set(stem, { fit, tone }); const c = claim(stem, inline); setId(c.id); return c.off; }, [stem, inline, fit, tone]);
  const reg = useRegistry();
  if (!inline) return null; // the stage renders it
  return <LoopLayer stem={stem} playing={top(reg)?.id === id} fit={fit} tone={tone} inline className={className} style={style} />;
}
const stageOpts = new Map<string, { fit: Fit; tone: Tone }>();

// ---------- the stage: the screen-level loop (or the 3D desk), with a crossfade between stems
let desk: { poster: string; tone: 'morning' | 'night' } | null = null;
let deskBroken = false; // three.js couldn't be fetched (offline, blocked CDN): the loop plays instead for this session
const deskSubs = new Set<() => void>();
function setDesk(d: typeof desk) { desk = d; deskSubs.forEach((f) => f()); }
const subDesk = (f: () => void) => { deskSubs.add(f); return () => { deskSubs.delete(f); }; };
const useDesk = () => useSyncExternalStore(subDesk, () => desk, () => null);
const useDeskBroken = () => useSyncExternalStore(subDesk, () => deskBroken, () => false);

function FilmStage() {
  const reg = useRegistry();
  const d = useDesk();
  const cur = stageStem(reg);
  const [layers, setLayers] = useState<string[]>(cur ? [cur] : []);
  // crossfade: keep the previous stem for 650 ms while the new one fades in
  useEffect(() => {
    setLayers((ls) => { const keep = ls.filter((s) => s !== cur); return cur ? [...keep.slice(-1), cur] : keep; });
    const id = setTimeout(() => setLayers((ls) => (cur ? ls.filter((s) => s === cur) : [])), 650);
    return () => clearTimeout(id);
  }, [cur]);
  const t = top(reg);
  return <>
    {!d && layers.map((s) => <LoopLayer key={s} stem={s} playing={!!t && !t.inline && t.stem === s} {...(stageOpts.get(s) || {})} />)}
  </>;
}
let stageHost: HTMLElement | null = null, beatHost: HTMLElement | null = null;
function hosts() {
  if (typeof document === 'undefined') return null;
  if (!stageHost) {
    stageHost = document.createElement('div'); stageHost.id = 't1-film'; stageHost.setAttribute('aria-hidden', 'true');
    beatHost = document.createElement('div'); beatHost.id = 't1-beat'; beatHost.setAttribute('aria-hidden', 'true');
    const root = document.getElementById('root');
    if (root) { document.body.insertBefore(stageHost, root); } else document.body.appendChild(stageHost);
    document.body.appendChild(beatHost);
    createRoot(stageHost).render(createElement(FilmStage));
  }
  return { stage: stageHost, beat: beatHost! };
}
if (typeof document !== 'undefined') setTimeout(hosts, 0);

// ---------- beats: short clips, preloaded with the screen, played once (or looped while held)
type Pooled = { el: HTMLVideoElement; state: 'loading' | 'ready' | 'dead'; busy: boolean };
const pool = new Map<string, Pooled>();
const BEAT_START_MS = 600;
/** Warm a beat now (a hidden element buffers it) so the tap that needs it starts within a frame. No-op when gated or missing. */
export function warmBeat(stem: string): Pooled | null {
  if (typeof document === 'undefined' || !getFilmBudget().beats) return null;
  const a = aspectNow(), k = vkey(stem, a);
  if (dead.has(k)) return null;
  let p = pool.get(k);
  if (p) return p;
  if (pool.size >= 14) { const first = [...pool.entries()].find(([, x]) => !x.busy); if (first) { first[1].el.removeAttribute('src'); first[1].el.load(); pool.delete(first[0]); } }
  const el = document.createElement('video'); prep(el); el.preload = 'auto'; el.src = filmUrl(stem, a);
  p = { el, state: 'loading', busy: false };
  el.addEventListener('canplaythrough', () => { if (p!.state === 'loading') p!.state = 'ready'; }, { once: true });
  el.addEventListener('error', () => { p!.state = 'dead'; dead.add(k); pool.delete(k); }, { once: true });
  el.load();
  pool.set(k, p);
  return p;
}
export const beatReady = (stem: string) => pool.get(vkey(stem, aspectNow()))?.state === 'ready';
export const beatMissing = (stem: string) => dead.has(vkey(stem, aspectNow()));

export interface PlayBeatOpts { host?: HTMLElement | null; className?: string; hold?: boolean; cover?: () => void; coverAt?: number; rtl?: boolean }
export interface BeatHandle { done: Promise<boolean>; release: () => void }
/**
 * Play a beat over `host` (default: the full-screen overlay). Resolves true once it has played, false at once when the
 * clip is gated, missing, or fails to start within 600 ms: callers never wait on film that isn't there.
 * `hold` loops it until release(); `cover` fires at `coverAt` seconds (a page turn swaps the route while the sheet covers).
 */
export function playBeat(stem: string, o: PlayBeatOpts = {}): BeatHandle {
  const none = { done: Promise.resolve(false), release: () => {} };
  const H = hosts(); if (!H) return none;
  const b = getFilmBudget(); if (!b.beats) return none;
  const a = aspectNow(), k = vkey(stem, a);
  if (dead.has(k)) return none;
  let p = warmBeat(stem); if (!p) return none;
  if (p.busy) { const el = document.createElement('video'); prep(el); el.preload = 'auto'; el.src = filmUrl(stem, a); p = { el, state: p.state, busy: false }; }
  const P = p; P.busy = true;
  const host = o.host || H.beat;
  const box = document.createElement('span'); // a span: slots live inside buttons too
  box.className = ['fl-beat', o.className || '', o.rtl ? 'fl-beat--rtl' : ''].filter(Boolean).join(' ');
  const v = P.el; v.loop = !!o.hold; v.className = ''; v.currentTime = 0;
  box.appendChild(v); host.appendChild(box);
  let settled = false, covered = false, timer = 0, cov = 0, slot: (() => void) | null = null;
  let resolve: (ok: boolean) => void = () => {};
  const done = new Promise<boolean>((r) => { resolve = r; });
  const finish = (ok: boolean) => {
    if (settled) return; settled = true;
    clearTimeout(timer); clearTimeout(cov); slot?.();
    v.pause(); v.removeEventListener('playing', onPlaying); v.removeEventListener('ended', onEnded); v.removeEventListener('error', onError); v.removeEventListener('timeupdate', onTime);
    v.className = ''; box.remove(); P.busy = false;
    if (!covered && o.cover) { covered = true; o.cover(); }
    resolve(ok);
  };
  const onTime = () => { if (!covered && o.cover && v.currentTime >= (o.coverAt ?? 0)) { covered = true; clearTimeout(cov); o.cover(); } };
  const onPlaying = () => {
    clearTimeout(timer); v.classList.add('is-on');
    // a held loop, or a beat that covers the screen, takes the one playing slot: the ambient loop holds its frame under it
    if (o.hold || !o.host) slot = claim(stem, true).off;
    if (o.cover && !covered) { cov = window.setTimeout(() => { if (!covered) { covered = true; o.cover!(); } }, Math.max(0, (o.coverAt ?? 0) * 1000)); v.addEventListener('timeupdate', onTime); }
    if (!o.hold) { const spec = surfaceOf(stem) as BeatSpec | undefined; const ms = ((spec?.seconds || v.duration || 1) * 1000) + 800; timer = window.setTimeout(() => finish(true), ms); } // safety net if 'ended' never fires
  };
  const onEnded = () => finish(true);
  const onError = () => { dead.add(k); P.state = 'dead'; pool.delete(k); finish(false); };
  v.addEventListener('playing', onPlaying); v.addEventListener('ended', onEnded); v.addEventListener('error', onError);
  timer = window.setTimeout(() => finish(false), BEAT_START_MS);
  v.play().catch(() => finish(false));
  return { done, release: () => finish(true) };
}

/**
 * A beat in a box: `trigger` (any changing value) plays it once and calls onEnd; `held` loops it while true.
 * Put it inside a positioned parent; it fills the parent, ignores the pointer and renders nothing when there is no clip.
 */
export function Beat({ stem, trigger, held, onEnd, className = '', rtl }: { stem: string; trigger?: number | string | boolean | null; held?: boolean; onEnd?: () => void; className?: string; rtl?: boolean }) {
  const b = useFilmBudget();
  const box = useRef<HTMLSpanElement>(null);
  const hold = useRef<BeatHandle | null>(null);
  const on = b.beats && !beatMissing(stem);
  useEffect(() => { if (on) warmBeat(stem); }, [stem, on]);
  // the slot's host is isolated so the slot (z-index -1) sits over the host's background and under its content
  useLayoutEffect(() => { if (!on) return; const p = box.current?.parentElement; if (!p) return; p.classList.add('fl-host'); return () => { p.classList.remove('fl-host'); }; }, [on]);
  useEffect(() => {
    if (!trigger) return;
    let live = true;
    playBeat(stem, { host: box.current, rtl }).done.then(() => { if (live) onEnd?.(); });
    return () => { live = false; };
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    hold.current?.release(); hold.current = held ? playBeat(stem, { host: box.current, rtl, hold: true }) : null;
    return () => { hold.current?.release(); hold.current = null; };
  }, [held, stem]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!on) return null;
  return <span ref={box} className={'fl-beat--slot ' + className} aria-hidden="true" />;
}

// ---------- filmed page turns (App.tsx go): the sheet sweeps over the page and the route swaps while it covers the frame
const TURN: Record<string, string> = { fwd: 'beat-page-fwd', back: 'beat-page-back' };
/** True when the turn was filmed (swap is called mid-beat); false to fall back to the View Transition / CSS slide. */
export function filmTurn(dir: string, swap: () => void, rtl = false): boolean {
  const stem = TURN[dir]; if (!stem) return false;
  const b = getFilmBudget(); if (!b.turns || !beatReady(stem)) { if (b.turns) warmBeat(stem); return false; }
  const spec = surfaceOf(stem) as BeatSpec | undefined;
  const h = document.documentElement;
  h.dataset.vtFilm = dir;
  const hnd = playBeat(stem, { className: 'fl-beat--turn', rtl, cover: swap, coverAt: spec?.coverAt ?? 0.15 });
  hnd.done.then(() => { delete h.dataset.vtFilm; });
  return true;
}
// warm the two page beats once the game has settled (only where turns are allowed)
if (typeof window !== 'undefined') {
  const warmTurns = () => { if (getFilmBudget().turns) { warmBeat('beat-page-fwd'); warmBeat('beat-page-back'); } };
  setTimeout(warmTurns, 2500);
  onFilmBudget(warmTurns);
}

// ---------- the screens' surfaces (one component each; see INTEGRATION at the top)
const singles = new Map<string, number>();
/** The first mounted instance of a surface wins; a second (App.tsx and the screen both mounting it) renders nothing. */
function useSingleton(name: string): boolean {
  const [mine, setMine] = useState(false);
  useEffect(() => { const n = (singles.get(name) || 0) + 1; singles.set(name, n); setMine(n === 1); return () => { singles.set(name, (singles.get(name) || 1) - 1); }; }, [name]);
  return mine;
}
type Layer = { layer?: 'screen' | 'inline'; tone?: Tone; className?: string };

/** Home: the desk at this hour. The real-time 3D desk on capable desktops (lazy three.js), else the loop, else its poster. */
export function HomeFilm({ tone: toneProp }: { tone?: 'morning' | 'night' } = {}) {
  const mine = useSingleton('home');
  const b = useFilmBudget();
  const broken = useDeskBroken();
  const tone = toneProp || toneNow();
  const stem = homeLoop(tone);
  void b; void broken;
  const three = false; // the 3D desk was cut (owner's call): loops and posters only
  useEffect(() => { if (!three) return; const poster = filmUrl(stem, aspectNow(), 'jpg'); setDesk({ poster, tone }); return () => setDesk(null); }, [three, stem, tone]);
  if (!mine || three) return null;
  return <FilmLoop stem={stem} />;
}
/** The window: the place of the source on the line behind the file; the city at dusk on Deadline Day. */
export function WindowFilm({ src, dd }: { src?: string | null; dd?: boolean }) {
  const stem = dd ? 'loop-deadline-city' : src ? placeLoop(src) : null;
  return stem ? <FilmLoop stem={stem} /> : null;
}
export function WireFilm(p: Layer = {}) { return useSingleton('wire') ? <FilmLoop stem="loop-wire-room" {...p} /> : null; }
export function PressboxFilm(p: Layer = {}) { return useSingleton('pressbox') ? <FilmLoop stem="loop-pressbox" {...p} /> : null; }
export function ResultsFilm(p: Layer = {}) { return useSingleton('results') ? <FilmLoop stem="loop-results-pressroom" {...p} /> : null; }
export function SeasonFilm(p: Layer & { season?: string } = {}) { const key = p.season || seasonOf().key; return useSingleton('season') ? <FilmLoop stem={seasonLoop(key)} layer={p.layer} tone={p.tone} className={p.className} /> : null; }
export function MastheadFilm(p: Layer = {}) { return useSingleton('masthead') ? <FilmLoop stem="loop-newsroom-masthead" {...p} /> : null; }
/** Deadline Day's clock face behind the countdown (inline: put it first inside .ddh). */
export function DDClockFilm() { return <FilmLoop stem="loop-dd-clock" layer="inline" tone="dim" />; }

// ---------- the setting (Settings lane): Film: full / light / off
export function FilmSetting({ children }: { children?: ReactNode }) {
  const t = useT();
  const b = useFilmBudget();
  const mode = filmMode();
  const opts: { v: FilmMode; label: string; sub: string }[] = (['full', 'light', 'off'] as const).map((v) => ({ v, label: t('film.setting.' + v), sub: t('film.setting.' + v + 'D') }));
  return <div className="filmset">
    <div className="filmset__t"><span><b>{t('film.setting.title')}</b><small>{t('film.setting.hint')}</small></span>{children}</div>
    <Seg<FilmMode> value={mode} options={opts} onChange={(v) => { setFilmMode(v); sfx('ui.pop'); }} label={t('film.setting.title')} />
    {mode !== 'off' && b.level !== 'clips' && <span className="filmset__why g-mono" title={b.why}>{t('film.setting.now.' + b.level)}</span>}
  </div>;
}
