// The post going out, as a film (3.3): your desk at night (lamp, coffee, the city through the window) while the post
// types on the laptop, then a cut to the fans: a terrace crowd, phones lighting up one by one as it lands. HERE WE GO
// plays the gold version (floodlights, the stand bouncing). Pure: (frame, props) → SVG; PostScene owns the clock and
// lays the real post card over the laptop screen.
import type { ReactElement } from 'react';
import { FrameProvider } from '../remotion-shim';
import { FilmLook, noise } from '../kit';
import { MirrorCtx, INK } from './rig';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const cl = (x: number) => Math.max(0, Math.min(1, x));

function Desk({ f }: { f: number }) {
  const fl = 0.9 + 0.1 * noise(f / 8, 2);
  return <g>
    <defs>
      <linearGradient id="pfw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1A1712" /><stop offset="1" stopColor="#0C0B09" /></linearGradient>
      <radialGradient id="pfl" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#FFC873" stopOpacity=".5" /><stop offset="1" stopColor="#FFC873" stopOpacity="0" /></radialGradient>
      <radialGradient id="pfs" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#9FD8FF" stopOpacity=".35" /><stop offset="1" stopColor="#9FD8FF" stopOpacity="0" /></radialGradient>
    </defs>
    <rect x={-1400} y={-1400} width={4400} height={2100} fill="url(#pfw)" />
    {/* the window: city at night */}
    <rect x={930} y={-80} width={520} height={470} fill="#0E1630" />
    {Array.from({ length: 7 }, (_, i) => <rect key={i} x={950 + i * 72} y={140 + ((i * 53) % 120)} width={56} height={400} fill="#0A1024" />)}
    {Array.from({ length: 26 }, (_, i) => <rect key={'w' + i} x={960 + (i * 37) % 480} y={170 + ((i * 71) % 200)} width={8} height={10} fill="#FFD58A" opacity={0.35 + 0.3 * (noise(f / 30 + i, i) > 0.3 ? 1 : 0)} />)}
    <rect x={1180} y={-80} width={12} height={470} fill="#1A1712" /><rect x={930} y={150} width={520} height={10} fill="#1A1712" />
    <rect x={916} y={-80} width={548} height={484} fill="none" stroke="#2A241C" strokeWidth={18} />
    {/* pinned clippings */}
    {[0, 1, 2].map((i) => <g key={i} transform={`translate(${250 + i * 120} ${90 + (i % 2) * 40}) rotate(${(i - 1) * 5})`}><rect width={96} height={120} fill="#E9E2D3" opacity=".75" />{[0, 1, 2, 3].map((j) => <rect key={j} x={10} y={16 + j * 22} width={j ? 70 : 76} height={j ? 5 : 10} fill="#4A443A" opacity=".6" />)}<circle cx={48} cy={6} r={5} fill="#FF5A36" /></g>)}
    {/* the desk */}
    <rect x={-1400} y={620} width={4400} height={1400} fill="#2C271F" />
    <rect x={-1400} y={620} width={4400} height={1400} fill="url(#pfw)" opacity=".4" />
    <rect x={-1400} y={616} width={4400} height={8} fill="#4A3E2E" />
    {/* the lamp and its pool */}
    <ellipse cx={330} cy={660} rx={420} ry={150} fill="url(#pfl)" opacity={fl} />
    <path d="M250 640 H330 M290 640 L250 470 L360 380" stroke="#3A342A" strokeWidth={12} fill="none" strokeLinecap="round" />
    <path d="M340 350 L430 380 L400 430 L320 400 Z" fill="#3A342A" /><ellipse cx={400} cy={420} rx={30} ry={10} fill="#FFE3A3" opacity={fl} />
    <path d="M400 425 L200 900 L760 900 Z" fill="#FFC873" opacity={0.06 * fl} />
    {/* coffee */}
    <g transform="translate(1180 640)"><path d="M0 -70 H80 V-10 Q80 10 60 10 H20 Q0 10 0 -10 Z" fill="#E9E2D3" /><path d="M80 -56 Q108 -52 104 -30 Q100 -14 80 -18" stroke="#E9E2D3" strokeWidth={10} fill="none" /><rect x={4} y={-66} width={72} height={8} fill="#5A3A1E" />
      {[0, 1].map((i) => <path key={i} d={`M${24 + i * 26} -80 q${10 * Math.sin(f / 6 + i)} -26 0 -52 q${-10 * Math.sin(f / 7 + i)} -26 0 -52`} stroke="#F4EFE4" strokeOpacity={0.18} strokeWidth={6} fill="none" />)}</g>
    {/* the screen's glow on the wall behind */}
    <ellipse cx={800} cy={420} rx={500} ry={320} fill="url(#pfs)" />
  </g>;
}

/** Hands on the keyboard (under the laptop); fingers tap while `typing`. */
export function Hands({ f, typing }: { f: number; typing: boolean }) {
  const tap = (i: number) => (typing ? Math.max(0, Math.sin(f * 2.3 + i * 1.7)) * 7 : 0);
  const hand = (x: number, m: number) => <g transform={`translate(${x} 0) scale(${m} 1)`}>
    <path d="M-70 90 Q-60 30 -20 20 L40 18 Q56 20 56 34 Q56 46 40 48 L0 50 Q-30 70 -34 110 Z" fill="#1E2230" />
    <path d="M-30 30 Q0 4 34 10 L50 12 Q60 14 58 24 L56 36 Q20 44 -10 50 Z" fill="#C68A5E" />
    {[0, 1, 2, 3].map((i) => <rect key={i} x={6 + i * 12} y={2 - tap(i + (m > 0 ? 0 : 4))} width={10} height={22} rx={5} fill="#B77B52" />)}
  </g>;
  return <svg className="pf__hands" viewBox="-200 0 400 110" aria-hidden="true" focusable="false">{hand(-60, 1)}{hand(60, -1)}</svg>;
}

function Crowd({ f, fc, hwg, cA, cB }: { f: number; fc: number; hwg: boolean; cA: string; cB: string }) {
  // Three rows of fans, back to front. Each phone lights up a moment after the post lands (staggered by seat).
  const rows = [{ y: 520, s: 0.62, n: 13 }, { y: 650, s: 0.82, n: 10 }, { y: 800, s: 1.05, n: 8 }];
  const jump = hwg ? 1 : 0.35;
  const out: ReactElement[] = [];
  rows.forEach((r, ri) => {
    for (let i = 0; i < r.n; i++) {
      const id = ri * 20 + i, x = -100 + (i + (ri % 2) * 0.5) * (1800 / r.n);
      const litAt = 3 + ((id * 7) % 17) * 0.9 + ri * 2;
      const lit = cl((fc - litAt) / 3);
      const bob = -Math.max(0, Math.sin(f * 0.5 + id)) * 14 * jump * lit;
      const scarf = id % 3 === 0 ? cB : cA;
      const skin = ['#8D5A3B', '#C68A5E', '#E3B48E', '#5E3B26', '#A8704A'][id % 5];
      const up = id % 4 !== 1; // most hold a phone up; some just point
      out.push(<g key={id} transform={`translate(${x} ${r.y + bob}) scale(${r.s})`}>
        <path d="M-70 200 Q-70 40 0 34 Q70 40 70 200 Z" fill={ri === 2 ? '#15130F' : ri === 1 ? '#1E1A15' : '#26211B'} />
        <path d="M-40 44 Q0 70 40 44 L44 60 Q0 86 -44 60 Z" fill={scarf} />
        <circle cx={0} cy={0} r={36} fill={skin} style={{ filter: `brightness(${0.45 + 0.5 * lit})` }} />
        <path d="M-36 -4 C-38 -40 38 -44 36 -6 C20 -22 -20 -22 -36 -4 Z" fill={INK} />
        {up ? <g transform={`translate(${id % 2 ? 46 : -46} ${-60})`}>
          <line x1={0} y1={40} x2={id % 2 ? -18 : 18} y2={110} stroke={ri === 2 ? '#15130F' : '#1E1A15'} strokeWidth={22} strokeLinecap="round" />
          {lit > 0 && <circle cx={0} cy={0} r={34} fill={hwg ? "#FFD76A" : "#9FD8FF"} opacity={0.22 * lit} />}
          <rect x={-14} y={-24} width={28} height={48} rx={5} fill={INK} />
          <rect x={-11} y={-20} width={22} height={40} rx={3} fill={hwg ? '#FFD76A' : '#CFEAFF'} opacity={0.12 + 0.88 * lit} />
        </g> : <line x1={40} y1={50} x2={70} y2={-50 + Math.sin(f * 0.6 + id) * 10} stroke="#1E1A15" strokeWidth={20} strokeLinecap="round" />}
      </g>);
    }
  });
  return <g>
    <defs>
      <linearGradient id="pfc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={hwg ? '#3A2A08' : '#10131E'} /><stop offset="1" stopColor="#0A0908" /></linearGradient>
      <radialGradient id="pff" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#FFF3C0" stopOpacity=".9" /><stop offset="1" stopColor="#FFF3C0" stopOpacity="0" /></radialGradient>
    </defs>
    <rect x={-1400} y={-1400} width={4400} height={3800} fill="url(#pfc)" />
    {/* the stand's roof and the far side */}
    <path d="M-1400 120 L3000 60 V0 H-1400 Z" fill="#050505" />
    {Array.from({ length: 30 }, (_, i) => <circle key={i} cx={-200 + i * 70} cy={330 + (i % 3) * 16} r={4} fill={hwg ? '#FFD76A' : '#FFE3A3'} opacity={0.25 + 0.2 * Math.sin(f * 0.2 + i)} />)}
    {/* floodlights */}
    {[260, 1340].map((x, i) => <g key={x}>
      <path d={`M${x} 120 L${x - 360 + i * 520} 1200 L${x + 160 + i * 200 - 200} 1200 Z`} fill={hwg ? '#FFE3A3' : '#DDE8FF'} opacity={hwg ? 0.14 : 0.05} />
      <rect x={x - 60} y={90} width={120} height={50} rx={6} fill="#1A1A1A" />
      {[0, 1, 2].map((j) => <circle key={j} cx={x - 36 + j * 36} cy={115} r={13} fill="#FFF8E0" />)}
      <circle cx={x} cy={115} r={hwg ? 170 : 90} fill="url(#pff)" opacity={hwg ? 0.9 : 0.5} />
    </g>)}
    {/* bunting */}
    <path d="M-400 400 Q800 470 2000 400" stroke="#3A342A" strokeWidth={3} fill="none" />
    {Array.from({ length: 18 }, (_, i) => { const x = -300 + i * 130, y = 404 + Math.sin((i / 17) * Math.PI) * 58; return <path key={i} d={`M${x} ${y} l30 0 l-15 34 z`} fill={i % 2 ? cA : cB} opacity=".85" />; })}
    {out}
  </g>;
}

export function PostFilm({ f, fCut, hwg, cA, cB, rtl, still }: { f: number; fCut: number; typing?: boolean; hwg: boolean; cA: string; cB: string; rtl?: boolean; still?: boolean }) {
  const cut = f >= fCut;
  const fc = f - fCut;
  // The cut is a whip: the desk slides away and the crowd slides in, a few frames.
  const w = cut ? cl(fc / 5) : 0;
  const M = rtl ? -1 : 1;
  const push = 1 + 0.03 * Math.min(1, f / 60);
  return <FrameProvider frame={f} width={1600} height={900} fps={30} durationInFrames={Math.max(1, f + 1)}>
    <svg className="cf" viewBox="200 0 1200 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <MirrorCtx.Provider value={M}>
        <g transform={M < 0 ? 'matrix(-1 0 0 1 1600 0)' : undefined}>
          {w < 1 && <g transform={`translate(${-w * 700} 0) translate(800 450) scale(${push}) translate(-800 -450)`} opacity={1 - w}><Desk f={f} /></g>}
          {cut && <g transform={`translate(${(1 - w) * 700} 0) translate(800 450) scale(${lerp(1.08, 1, cl(fc / 30))}) translate(-800 -450)`} opacity={w}><Crowd f={f} fc={fc} hwg={hwg} cA={cA} cB={cB} /></g>}
        </g>
      </MirrorCtx.Provider>
    </svg>
    <FilmLook vignette={0.75} grain={!still} />
  </FrameProvider>;
}
