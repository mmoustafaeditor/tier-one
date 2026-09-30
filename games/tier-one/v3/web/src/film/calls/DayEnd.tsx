// The day ends (GOTY.md §10, §12): 1.5 s between one window day and the next. The desk lamp clicks off, the city rolls
// past the window, dawn comes up through the blinds and the next day's date stamps in. No people; frame-driven; a still
// of the last frame under reduced motion. Unskippable and short; it unmounts itself.
import { useEffect, useLayoutEffect, useState } from 'react';
import { FrameProvider } from '../remotion-shim';
import { FilmLook } from '../kit';
import { City, Blinds, Lamp, Glow, Glows, MirrorCtx, k, cl, lerp } from './places/world';
import { filmCue } from '../../lib/sfx';
import { prefersReducedMotion } from '../../lib/motion';

const LEN = 45, FPS = 30, STAMP = 29;
const CUES = [{ f: 5, k: 'day.lamp' }, { f: 10, k: 'day.roll' }, { f: STAMP, k: 'day.stamp' }];

function Room({ f }: { f: number }) {
  const lamp = f < 5 ? 1 : 0;
  const dawn = k(f, 16, 38);
  const roll = k(f, 6, 34) * 1400;
  const open = lerp(0.15, 0.85, k(f, 18, 36));
  return <g>
    <defs>
      <linearGradient id="deN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#050818" /><stop offset="1" stopColor="#141C3C" /></linearGradient>
      <linearGradient id="deD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3B5C9A" /><stop offset=".6" stopColor="#F2A86A" /><stop offset="1" stopColor="#FFD9A0" /></linearGradient>
      <clipPath id="deW"><rect x={300} y={80} width={1000} height={520} /></clipPath>
    </defs>
    <rect x={-1400} y={-1400} width={4400} height={4400} fill={`rgb(${Math.round(lerp(20, 46, dawn))},${Math.round(lerp(17, 36, dawn))},${Math.round(lerp(13, 30, dawn))})`} />
    <g clipPath="url(#deW)">
      <rect x={300} y={80} width={1000} height={520} fill="url(#deN)" />
      <rect x={300} y={80} width={1000} height={520} fill="url(#deD)" opacity={dawn} />
      <circle cx={980} cy={lerp(640, 470, dawn)} r={70} fill="#FFE3A3" opacity={dawn} />
      <g transform={`translate(${-roll} 0)`}>
        <City x={0} y={300} w={3000} h={300} n={30} seed={9} lit={lerp(0.45, 0.08, dawn)} cols={dawn > 0.5 ? ['#2A2A40', '#34304A', '#3A3450'] : ['#0A1024', '#0E1630', '#12193A']} />
      </g>
    </g>
    <Blinds x={300} y={80} w={1000} h={520} open={open} col="#1C1813" n={11} />
    <rect x={290} y={70} width={1020} height={540} fill="none" stroke="#2A241C" strokeWidth={22} />
    {/* dawn through the slats, laid across the wall and the desk */}
    <g opacity={dawn * 0.5}>{Array.from({ length: 6 }, (_, i) => <path key={i} d={`M${240 + i * 70} ${620 + i * 36} l900 -120 l0 22 l-900 120 z`} fill="#FFD9A0" />)}</g>
    <rect x={-1400} y={640} width={4400} height={1400} fill="#2C271F" />
    <rect x={-1400} y={636} width={4400} height={8} fill="#4A3E2E" />
    <ellipse cx={420} cy={680} rx={340} ry={60} fill="#FFC873" opacity={0.16 * lamp} />
    <Lamp x={330} y={652} on={lamp} s={0.9} />
    <Glow x={800} y={340} r={700} ry={380} col="#FFD9A0" o={0.35 * dawn} />
  </g>;
}

export function DayEnd({ day, lang, rtl, label, kicker, onDone }: { day: number; lang: string; rtl?: boolean; label: string; kicker: string; onDone: () => void }) {
  const [reduced] = useState(prefersReducedMotion);
  const [f, setF] = useState(reduced ? LEN : 0);
  useEffect(() => {
    if (reduced) { const id = setTimeout(onDone, 900); return () => clearTimeout(id); }
    let raf = 0, t0 = performance.now(), last = 0, gone = false;
    const safety = setTimeout(() => { if (!gone) { gone = true; onDone(); } }, 3000);
    const step = (now: number) => {
      const fr = Math.min(LEN + 6, Math.floor(((now - t0) * FPS) / 1000));
      if (fr !== last) { CUES.forEach((q) => { if (last < q.f && fr >= q.f) filmCue(q.k); }); last = fr; setF(fr); }
      if (fr >= LEN + 6) { if (!gone) { gone = true; onDone(); } return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); clearTimeout(safety); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => { const ov = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ov; }; }, []);
  let date = '';
  try { date = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long' }).format(new Date(Date.now() + Math.max(0, day - 1) * 864e5)); } catch { date = ''; }
  const fr = Math.min(LEN, f);
  const M = rtl ? -1 : 1;
  return <div className={'dayend' + (fr >= STAMP ? ' is-stamp' : '') + (reduced ? ' is-rm' : '')} role="status" aria-live="polite" aria-label={label}>
    <FrameProvider frame={fr} width={1600} height={900} fps={FPS} durationInFrames={LEN + 1}>
      <svg className="cf" viewBox="200 0 1200 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <Glows cols={['#FFC873', '#FFD9A0']} />
        <MirrorCtx.Provider value={M}><g transform={M < 0 ? 'matrix(-1 0 0 1 1600 0)' : undefined}><Room f={fr} /></g></MirrorCtx.Provider>
        <rect x={0} y={0} width={1600} height={900} fill="#000" opacity={0.55 * (1 - cl(fr / 4)) + 0.5 * k(fr, 3, 7) * (1 - k(fr, 12, 24))} />
      </svg>
      <FilmLook vignette={0.7} grain={!reduced} />
    </FrameProvider>
    <div className="dayend__stamp" aria-hidden="true">
      <span className="g-mono dayend__k">{kicker}</span>
      <b className="dayend__day">{label}</b>
      {date && <span className="dayend__date">{date}</span>}
    </div>
  </div>;
}
