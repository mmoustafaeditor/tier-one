// The source call (GOTY.md §10, §12): one screen, a short wordless film of the source's place. The phone on the
// counter rings and lights (the pick-up beat), the camera pushes in, and in the last second the place tells you what
// the source knows, with the outcome object the brightest thing in frame: the calendar flips to next month (staying),
// the other club's colours arrive (leaving), two phones light in two colours (hijack), the paper goes in the bin (fake).
// Chosen by the clue's read (the best outcome of E.weights). What the source said lands on the call page as a quote card
// (Saga.tsx). First call to a source in 6 h plays the full cut (~3.5 s), repeats the short one (~2 s). Unskippable; it
// returns to the call page by itself. Drawn and frame-driven (film/calls), no video; reduced motion shows the last frame.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CastSaga, Clue, Rules } from '../lib/engine';
import { E } from '../lib/engine';
import { useT } from '../lib/i18n';
import { getSave, update } from '../lib/save';
import { sfx, buzz, filmCue, type Sfx } from '../lib/sfx';
import { prefersReducedMotion } from '../lib/motion';
import { relKey } from '../lib/story';
import { Portrait, moodFor } from './portrait';
import { ringFor } from '../lib/wallet';
import { CallFilm, accentOf, cutLen, timeline, PICK_FULL, PICK_SHORT } from '../film/calls/CallFilm';
import { placeOf, monthsOf, HOUSE } from '../film/calls/places';
import type { Words } from '../film/calls/places/spec';
import '../film/calls/callfilms.css';

// Painted character art slots (the art pack). Keys: source id → image URL. The films don't use it; kept for the pack.
export const ART: Record<string, string> = {};
export const GRADE_BARS: Record<string, number> = { A: 3, B: 2, C: 1, D: 1 };
// 3.8 (LAUNCH_BRIEF §40): the hold after the tell is 200 ms, the still under reduced motion 900 ms, and a tap skips
// to the tell (the quote lands on the file either way: nothing waits on the film).
const FPS = 30, HOLD_MS = 200, STILL_MS = 900, SKIP_HOLD_MS = 260;
// Dev preview: ?callfilm=<source> / ?postfilm=1|hwg|ut (film/calls/preview.tsx; stripped from builds).
if (import.meta.env.DEV && /[?&](callfilm|postfilm)=/.test(location.search)) setTimeout(() => { void import('../film/calls/preview'); }, 0);
const portraitNow = () => typeof matchMedia === 'function' && matchMedia('(orientation: portrait)').matches;

// `mode` stays in the props for callers; the source intro card no longer plays before a call (one screen per call).
export function CallScene({ src, clue, c, R, onDone }: { src: string; clue: Clue; c: CastSaga; R: Rules; onDone: () => void; mode?: string }) {
  const t = useT();
  const [reduced] = useState(prefersReducedMotion);
  // The full cut (3.5 s) plays the first time you ever ring this source; every call after that is the short cut (2 s),
  // which is the tell itself. Repeat gameplay never waits through the same setup twice (§40).
  const full = useMemo(() => { const seen = getSave().scenes || {}; return !seen[src]; }, [src]);
  const [skipped, setSkipped] = useState(false);
  const spec = placeOf(src);
  const w = E.weights(R, src, clue.r) || [0, 0, 0, 1]; const o = Math.max(0, w.indexOf(Math.max(...w)));
  const len = cutLen(full);
  const [portrait, setPortrait] = useState(portraitNow);
  const [f, setF] = useState(reduced ? len : 0);
  const done = useRef(false), root = useRef<HTMLDivElement>(null), skipRef = useRef(false);
  const finish = () => { if (done.current) return; done.current = true; onDone(); };
  const skip = () => { if (reduced) { finish(); return; } if (!skipRef.current) { skipRef.current = true; setSkipped(true); } };
  const film = useMemo(() => {
    const words = {} as Words;
    (['boarding', 'cancelled', 'gate', 'medical', 'noShow'] as const).forEach((k) => { words[k] = t('mo.w.' + k); });
    return {
      to: { c1: c.to.c1, c2: c.to.c2, s: c.to.s }, from: { c1: c.from.c1, c2: c.from.c2, s: c.from.s },
      alt: c.alt ? { c1: c.alt.c1, c2: c.alt.c2, s: c.alt.s } : HOUSE.alt, words, ...monthsOf(t.lang),
    };
  }, [c, t]);

  useEffect(() => { const on = () => setPortrait(portraitNow()); addEventListener('resize', on); return () => removeEventListener('resize', on); }, []);
  useEffect(() => {
    update((s) => { s.scenes = { ...(s.scenes || {}), [src]: Date.now() }; });
    if (reduced) { const id = setTimeout(finish, STILL_MS); return () => clearTimeout(id); }
    if (full) sfx(('scene.' + src) as Sfx); else sfx(ringFor(src) as Sfx); // a ring pack: one ring per source (Your desk)
    buzz(src === 'agent' && full ? [60, 120, 60] : 20);
    // The drawn film's clock: frames from real time; foley on the scene frames it passes. A safety net brings the
    // call page back however the tab behaves.
    const safety = setTimeout(finish, (len * 1000) / FPS + HOLD_MS + 2500);
    const cues = spec.cues(o), first = timeline(full ? PICK_FULL : PICK_SHORT, full).f;
    let raf = 0, prev = performance.now(), acc = 0, fr = 0, endAt = 0;
    const tick = (now: number) => {
      acc += Math.min(100, now - prev); prev = now;
      const a = fr;
      if (skipRef.current && fr < len) { fr = len; acc = 0; endAt = now - HOLD_MS + SKIP_HOLD_MS; }
      while (acc >= 1000 / FPS && fr < len) { acc -= 1000 / FPS; fr++; }
      if (fr !== a) {
        const fa = timeline(a, full), fb = timeline(fr, full);
        const from = fa.phase === 'call' ? fa.f : first - 1;
        if (fb.phase === 'call') cues.forEach((q) => { if (from < q.f && fb.f >= q.f) filmCue(q.k); });
        setF(fr);
      }
      if (fr >= len) { if (!endAt) endAt = now; else if (now - endAt > HOLD_MS) return finish(); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(safety); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => {
    const was = document.activeElement as HTMLElement | null, ov = document.body.style.overflow, hov = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden'; root.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = ov; document.documentElement.style.overflow = hov; was?.focus?.({ preventScroll: true }); };
  }, []);

  const who = t('src.' + src), about = t('g.call.about', { p: c.player.s, to: c.to.s });
  return <div ref={root} tabIndex={-1} className={'call-scene cs--' + src + (reduced ? ' is-poster' : '') + (skipped ? ' is-skipped' : '')} role="dialog" aria-modal="true" aria-label={who + ' · ' + about} style={{ ['--acc' as string]: accentOf(src) }}
    onClick={skip} onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(); } }}>
    <div className="cs__stage">
      <CallFilm src={src} o={o} t={f} full={full} {...film} rtl={t.rtl} still={reduced} portrait={portrait} />
    </div>
    <header className="cs__top" aria-hidden="true">
      <Portrait kind="source" id={src} size={44} mood={moodFor(src, o)} className="cs__face" />
      <span className="cs__who">{who}</span>
      <span className="cs__about"><span>{about}</span><span className="cs__rel">{t(relKey(src))}</span></span>
    </header>
    <i className="cs__bar" aria-hidden="true" style={{ ['--dur' as string]: Math.round((len * 1000) / FPS + HOLD_MS) + 'ms' }} />
    {!reduced && !skipped && <span className="cs__skip g-mono" aria-hidden="true">{t('c38.res.skip')}</span>}
  </div>;
}
