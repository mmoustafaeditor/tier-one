// The in-game cinema: plays one frame-driven scene full screen. A rAF clock at 30 fps drives the shim's frame
// context; the stage is designed at 1080×1920 (portrait) or 1920×1080 (landscape), picked by the viewport and scaled
// to fit, with letterbox bars around it. Tap / Space / Enter jumps to the next beat, Esc or Skip ends it, sound cues
// fire at their frames through the synth. Under reduced motion it shows the composed last frame and a Continue button.
// A spec with `skippable: false` (the moment films) has no Skip, no tap-to-jump and no Esc: it plays through, and under
// reduced motion its last frame stays up for REDUCED_MS, then it continues on its own.
// A spec with `video` plays a clip instead (muted, inline, covering the screen) with the game's own words drawn on top
// by `video.Overlay` on the same frame clock. If the clip errors or hasn't started within VIDEO_WAIT_MS, the frame-drawn
// scene plays instead. Under reduced motion a clip shows its poster (its last frame) with the words, or the drawn still.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FrameProvider } from './remotion-shim';
import type { SceneSpec } from './registry';
import { FPS } from './cues';
import { getSave } from '../lib/save';
import { tr } from '../lib/i18n';
import SYN from '../lib/synth';
import { filmUrl } from './clips';
import './film.css';

const reducedMotion = () => getSave().reduced || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
const cue = (k: string, a?: unknown) => { if (!getSave().sound) return; try { SYN.play(k, a); } catch { /* no audio */ } };
const HOLD_MS = 900, REDUCED_MS = 1200, VIDEO_WAIT_MS = 600;
// Dev only: ?scene=<id>&frame=<n> holds the drawn scene on frame n (for screenshots).
const FREEZE = import.meta.env.DEV && typeof location !== 'undefined' ? Number(new URLSearchParams(location.search).get('frame') ?? NaN) : NaN;

function useViewport() {
  const read = () => ({ w: window.innerWidth, h: window.innerHeight });
  const [v, setV] = useState(read);
  useEffect(() => { const on = () => setV(read()); addEventListener('resize', on); return () => removeEventListener('resize', on); }, []);
  return v;
}

export function ScenePlayer({ spec, onDone }: { spec: SceneSpec; onDone: () => void }) {
  const [reduced] = useState(() => reducedMotion() || Number.isFinite(FREEZE));
  const [mode, setMode] = useState<'video' | 'poster' | 'drawn'>(() => (spec.video && !Number.isFinite(FREEZE) ? (reduced ? 'poster' : 'video') : 'drawn'));
  const v = mode !== 'drawn' ? spec.video! : null;
  const { Comp, props } = spec;
  const meta: SceneSpec['meta'] = v ? { dur: v.dur, beats: [0], cues: [], hold: 0 } : spec.meta;
  const last = Number.isFinite(FREEZE) ? Math.min(FREEZE, meta.dur - 1) : meta.dur - 1;
  const playing = useRef(false);
  const [frame, setFrame] = useState(reduced ? last : 0);
  const [skipOn, setSkipOn] = useState(false);
  const clock = useRef({ f: reduced ? last : 0, jumpTo: -1, doneAt: 0, done: false });
  const root = useRef<HTMLDivElement>(null);
  const vp = useViewport();
  const land = vp.w >= vp.h;
  const W = land ? 1920 : 1080, H = land ? 1080 : 1920;
  const scale = Math.min(vp.w / W, vp.h / H);
  const L = getSave().lang;
  const canSkip = spec.skippable !== false;
  const hold = meta.hold ?? HOLD_MS;

  const finish = () => { if (clock.current.done) return; clock.current.done = true; onDone(); };
  const next = () => {
    if (!canSkip) return;
    if (reduced) return finish();
    const nb = meta.beats.find((b) => b > clock.current.f + 1);
    if (nb == null) return finish();
    clock.current.jumpTo = nb;
  };

  // The clock: accumulate real time (capped per tick so a background tab doesn't leap), fire the cues we pass.
  useEffect(() => {
    if (reduced) return;
    clock.current = { ...clock.current, f: 0, jumpTo: -1, doneAt: 0 };
    setFrame(0);
    let raf = 0, prev = performance.now(), acc = 0;
    const tick = (now: number) => {
      const c = clock.current;
      acc += Math.min(100, now - prev); prev = now;
      let f = c.f;
      if (c.jumpTo >= 0) { f = c.jumpTo; acc = 0; c.jumpTo = -1; meta.cues.filter((q) => q.f === f).forEach((q) => cue(q.k, q.a)); c.f = f; setFrame(f); }
      while (acc >= 1000 / FPS && f < last) { acc -= 1000 / FPS; f++; meta.cues.filter((q) => q.f === f).forEach((q) => cue(q.k, q.a)); }
      if (f !== c.f) { c.f = f; setFrame(f); }
      // A clip ends the scene itself (onEnded); the drawn scene ends after its hold.
      if (f >= last && !v) { if (!c.doneAt) c.doneAt = now; else if (now - c.doneAt > hold) return finish(); }
      raf = requestAnimationFrame(tick);
    };
    meta.cues.filter((q) => q.f === 0).forEach((q) => cue(q.k, q.a));
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
  useEffect(() => { if (reduced) { clock.current.f = last; setFrame(last); } }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // The clip gets VIDEO_WAIT_MS to start; then a safety net ends it if it stalls part-way.
  useEffect(() => {
    if (mode !== 'video' || !v) return;
    const wait = setTimeout(() => { if (!playing.current) setMode('drawn'); }, VIDEO_WAIT_MS);
    const safety = setTimeout(finish, (v.dur / FPS) * 1000 + 4000);
    return () => { clearTimeout(wait); clearTimeout(safety); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => { const id = setTimeout(() => setSkipOn(true), 600); return () => clearTimeout(id); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!reduced || canSkip || Number.isFinite(FREEZE)) return; const id = setTimeout(finish, REDUCED_MS); return () => clearTimeout(id); }, []);
  useLayoutEffect(() => {
    const was = document.activeElement as HTMLElement | null, ov = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; root.current?.focus();
    return () => { document.body.style.overflow = ov; was?.focus?.(); };
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!canSkip) { if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') e.preventDefault(); return; }
      if (e.key === 'Escape') { e.preventDefault(); finish(); }
      else if (e.key === ' ' || e.key === 'Enter') { if ((e.target as HTMLElement)?.tagName === 'BUTTON') return; e.preventDefault(); next(); }
    };
    addEventListener('keydown', key); return () => removeEventListener('keydown', key);
  });

  // Cinematic bars ease in over the first frames and out over the last ones.
  const bars = v ? 0 : reduced ? 1 : Math.min(1, frame / 8, (last - frame) / 8 + (frame >= last ? 1 : 0));
  const Overlay = v?.Overlay;
  return <div ref={root} className={'film' + (reduced || !canSkip ? ' is-still' : '')} role="dialog" aria-modal="true" aria-label={spec.title} tabIndex={-1} dir={spec.rtl ? 'rtl' : 'ltr'} onClick={next}>
    {v && mode === 'video' && <video className="film__video" src={filmUrl(v.stem, land ? 'l' : 'p')} muted autoPlay playsInline preload="auto" disablePictureInPicture aria-hidden="true"
      onPlaying={() => { playing.current = true; }} onError={() => { if (!playing.current) setMode('drawn'); else finish(); }} onEnded={finish} />}
    {v && mode === 'poster' && <img className="film__video" src={filmUrl(v.stem, land ? 'l' : 'p', 'jpg')} alt="" onError={() => setMode('drawn')} />}
    <div className={'film__stage' + (v ? ' is-over' : '')} style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` }} aria-hidden="true">
      <FrameProvider frame={frame} width={W} height={H} fps={FPS} durationInFrames={meta.dur}>{v ? (Overlay ? <Overlay {...(v.overlayProps || {})} /> : null) : <Comp {...props} />}</FrameProvider>
      <i className="film__bar film__bar--t" style={{ transform: `scaleY(${bars})` }} />
      <i className="film__bar film__bar--b" style={{ transform: `scaleY(${bars})` }} />
    </div>
    <p className="film__sr" aria-live="polite">{spec.title}</p>
    {!canSkip ? null : reduced
      ? <button type="button" className="g-btn film__go" onClick={(e) => { e.stopPropagation(); finish(); }} autoFocus>{tr(L, 'film.continue')}</button>
      : skipOn && <button type="button" className="film__skip" onClick={(e) => { e.stopPropagation(); finish(); }}>{tr(L, 'film.skip')}</button>}
    {!reduced && canSkip && frame < 90 && <span className="film__hint g-mono" aria-hidden="true">{tr(L, 'film.next')}</span>}
  </div>;
}
