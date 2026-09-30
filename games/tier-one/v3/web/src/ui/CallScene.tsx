// The source call (HYBRID.md §5, 3.3 films): one screen, a short wordless film. The source does something that tells
// you what they know (the barber's client leaves in the buying club's scarf, the kit man tears the tag off the bag, …),
// chosen by the clue's read (the best outcome of E.weights). What they actually said lands on the call page as a quote
// card (Saga.tsx), so the film never needs words. First call to a source in 6 h plays the full cut (~3.5 s), repeats
// the short one (~2 s). Unskippable; it returns to the call page by itself. Rendered clips (film/calls/manifest.ts)
// play when they're on the site; the SVG film is the fallback, and reduced motion shows the last frame for ~1.2 s.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CastSaga, Clue, Rules } from '../lib/engine';
import { E } from '../lib/engine';
import { useT } from '../lib/i18n';
import { getSave, update } from '../lib/save';
import { sfx, buzz, type Sfx } from '../lib/sfx';
import { prefersReducedMotion } from '../lib/motion';
import { hash } from '../lib/kit';
import SYN from '../lib/synth';
import { GRADE } from '../lib/story';
import { Rel } from './game';
import { ringtoneSfx } from '../lib/season';
import { CallFilm, accentOf } from '../film/calls/CallFilm';
import { SETS } from '../film/calls/sets';
import { kitOf, SKIN } from '../film/calls/rig';
import { callStem, aspectNow } from '../film/calls/manifest';
import { useFilmSlot, FilmVideo, FilmPoster } from '../film/calls/FilmSlot';
import '../film/calls/callfilms.css';

// Painted character art slots (the art pack). Keys: source id → image URL. The films don't use it; kept for the pack.
export const ART: Record<string, string> = {};
export const GRADE_BARS: Record<string, number> = { A: 3, B: 2, C: 1, D: 1 };
const FPS = 30, HOLD_MS = 380, STILL_MS = 1200;
const cue = (k: string) => { if (!getSave().sound) return; try { SYN.play(k, undefined); } catch { /* no audio */ } };
// Dev preview: ?callfilm=<source> / ?postfilm=1|hwg|ut (film/calls/preview.tsx; stripped from builds).
if (import.meta.env.DEV && /[?&](callfilm|postfilm)=/.test(location.search)) setTimeout(() => { void import('../film/calls/preview'); }, 0);
const ALT = { c1: '#6B3FA0', c2: '#F7B928' };

// `mode` stays in the props for callers; the source intro card no longer plays before a call (one screen per call).
export function CallScene({ src, clue, c, R, onDone }: { src: string; clue: Clue; c: CastSaga; R: Rules; onDone: () => void; mode?: string }) {
  const t = useT();
  const [reduced] = useState(prefersReducedMotion);
  const full = useMemo(() => { const seen = getSave().scenes || {}; return !(seen[src] && Date.now() - seen[src] < 6 * 3600e3); }, [src]);
  const S = SETS[src] || SETS.leak;
  const w = E.weights(R, src, clue.r) || [0, 0, 0, 1]; const o = Math.max(0, w.indexOf(Math.max(...w)));
  const [aspect] = useState(aspectNow);
  const stem = callStem(src, o, full ? 'full' : 'short', aspect);
  const slot = useFilmSlot(stem, reduced);
  const start = full ? 0 : S.tell;
  const [f, setF] = useState(reduced ? S.end : start);
  const done = useRef(false), root = useRef<HTMLDivElement>(null);
  const finish = () => { if (done.current) return; done.current = true; onDone(); };
  const film = useMemo(() => ({ kit: kitOf(c.from?.c1, c.from?.c2), skin: SKIN[hash(c.player.id) % SKIN.length], to: { c1: c.to.c1, c2: c.to.c2 }, from: { c1: c.from.c1, c2: c.from.c2 }, alt: c.alt ? { c1: c.alt.c1, c2: c.alt.c2 } : ALT }), [c]);

  useEffect(() => {
    update((s) => { s.scenes = { ...(s.scenes || {}), [src]: Date.now() }; });
    if (reduced) { const id = setTimeout(finish, STILL_MS); return () => clearTimeout(id); }
    if (full) sfx(('scene.' + src) as Sfx); else sfx(ringtoneSfx());
    buzz(src === 'agent' && full ? [60, 120, 60] : 20);
    // Safety net: however the clip behaves, the call page comes back.
    const id = setTimeout(finish, (full ? 4200 : 2400) + 2500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The SVG film's clock (only when it's the one playing): frames from real time; foley on the frames it passes.
  useEffect(() => {
    if (slot.mode !== 'svg' || reduced) return;
    let raf = 0, prev = performance.now(), acc = 0, fr = start, endAt = 0;
    const cues = S.cues(o);
    const tick = (now: number) => {
      acc += Math.min(100, now - prev); prev = now;
      const a = fr;
      while (acc >= 1000 / FPS && fr < S.end) { acc -= 1000 / FPS; fr++; }
      if (fr !== a) { cues.forEach((q) => { if (a < q.f && fr >= q.f) cue(q.k); }); setF(fr); }
      if (fr >= S.end) { if (!endAt) endAt = now; else if (now - endAt > HOLD_MS) return finish(); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot.mode]);
  useLayoutEffect(() => {
    const was = document.activeElement as HTMLElement | null, ov = document.body.style.overflow, hov = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden'; root.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = ov; document.documentElement.style.overflow = hov; was?.focus?.({ preventScroll: true }); };
  }, []);

  const svg = <CallFilm src={src} o={o} f={f} {...film} no={String(c.player.no || '')} rtl={t.rtl} still={reduced || slot.mode === 'try'} portrait={aspect === 'p'} />;
  const who = t('src.' + src), about = t('g.call.about', { p: c.player.s, to: c.to.s });
  return <div ref={root} tabIndex={-1} className={'call-scene cs--' + src + ' is-' + slot.mode} role="dialog" aria-modal="true" aria-label={who + ' · ' + about} style={{ ['--acc' as string]: accentOf(src) }}>
    <div className="cs__stage">
      {slot.mode === 'poster' ? <FilmPoster stem={stem} fallback={svg} /> : <>
        {svg}
        <FilmVideo stem={stem} mode={slot.mode} setMode={slot.setMode} onEnded={() => setTimeout(finish, 200)} />
      </>}
    </div>
    <header className="cs__top" aria-hidden="true">
      <span className="cs__who">{who}</span>
      <span className="cs__about"><span>{about}</span><span className="cs__rel"><Rel n={GRADE_BARS[GRADE[src]] || 1} /> {t('g.call.rel.' + (GRADE[src] || 'C'))}</span></span>
    </header>
    <i className="cs__bar" aria-hidden="true" style={{ ['--dur' as string]: Math.round(((S.end - start) * 1000) / FPS + HOLD_MS) + 'ms' }} />
  </div>;
}
