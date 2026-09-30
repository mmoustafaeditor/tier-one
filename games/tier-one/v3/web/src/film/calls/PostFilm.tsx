// The post going out, as a drawn film (GOTY.md §10, §12): your desk at night (lamp, coffee, the city in the window)
// while the real post card types itself over it (PostScene lays it on), the little press on the desk warms (rollers pick
// up speed, the ink light glows) and fires as it sends; cut to the city: windows light in a sweep and the phones in them
// light up, more of them the louder the post. The Confirmed-and-Done variant (`catch`) adds stadium light towers and a
// gold ticker running the player's catchphrase. No people, no hands. Pure: (frame, props) → SVG; PostScene owns the clock.
import { FrameProvider } from '../remotion-shim';
import { FilmLook } from '../kit';
import { City, Blinds, Lamp, Coffee, Phone, Glow, Glows, Cone, MText, MirrorCtx, F_COND, GOLD, k, cl, hit, lerp, rnd } from './places/world';

export type PostFilmKind = 'talks' | 'advanced' | 'confirmed' | 'catch' | 'repost';
const LIT = { talks: 0.35, advanced: 0.62, confirmed: 0.9, catch: 1, repost: 0.62 } as const;

function Press({ f, fSend, cA }: { f: number; fSend: number; cA: string }) {
  const warm = cl(f / Math.max(1, fSend));
  const spin = f * (2 + 14 * warm * warm);
  const fire = hit(f, fSend, 12);
  const sheet = cl((f - fSend) / 10);
  const roller = (x: number, y: number, r: number, d: number) => <g transform={`translate(${x} ${y}) rotate(${spin * d})`}>
    <circle r={r} fill="#2E2A24" stroke="#6E6656" strokeWidth={4} />
    {[0, 60, 120].map((a) => <line key={a} x1={-r + 6} y1={0} x2={r - 6} y2={0} stroke="#8A8272" strokeWidth={4} transform={`rotate(${a})`} />)}
  </g>;
  return <g transform="translate(1180 520)">
    <Glow x={0} y={20} r={200} ry={130} col="#FFB25A" o={0.15 + 0.45 * warm + 0.4 * fire} />
    <rect x={-120} y={-40} width={240} height={140} rx={10} fill="#1F1C17" stroke="#3A342A" strokeWidth={6} />
    {roller(-50, 30, 42, 1)}{roller(50, 30, 42, -1)}
    <rect x={-110} y={-70} width={220} height={30} rx={6} fill="#2E2A24" />
    <circle cx={90} cy={-55} r={9} fill="#FF5A36" opacity={0.25 + 0.75 * warm} />
    <Glow x={90} y={-55} r={40} col="#FF6A48" o={warm} />
    {f >= fSend && <g transform={`translate(${lerp(0, -160, sheet)} ${lerp(-60, -330, sheet)}) rotate(${lerp(0, -18, sheet)})`} opacity={1 - cl((f - fSend - 10) / 6)}>
      <rect x={-70} y={-46} width={140} height={92} fill="#F4EFE4" />
      <rect x={-56} y={-34} width={112} height={12} fill="#15130F" />
      {[0, 1, 2].map((i) => <rect key={i} x={-56} y={-12 + i * 14} width={i === 2 ? 60 : 112} height={6} fill="#4A443A" />)}
      <rect x={-70} y={36} width={140} height={10} fill={cA} />
    </g>}
  </g>;
}

function Desk({ f, fSend, cA }: { f: number; fSend: number; cA: string }) {
  const warm = cl(f / Math.max(1, fSend));
  return <g>
    <defs><linearGradient id="pfw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1A1712" /><stop offset="1" stopColor="#0C0B09" /></linearGradient></defs>
    <rect x={-1400} y={-1400} width={4400} height={2100} fill="url(#pfw)" />
    {/* the window: the city at night behind half-open blinds */}
    <rect x={260} y={60} width={1080} height={420} fill="#0E1630" />
    <City x={260} y={170} w={1080} h={310} seed={7} lit={0.3} f={f} />
    <Blinds x={260} y={60} w={1080} h={210} open={0.3} col="#15120E" n={7} />
    <rect x={250} y={50} width={1100} height={440} fill="none" stroke="#2A241C" strokeWidth={20} />
    <rect x={795} y={50} width={10} height={440} fill="#2A241C" />
    {/* the desk */}
    <rect x={-1400} y={600} width={4400} height={1400} fill="#2C271F" />
    <rect x={-1400} y={596} width={4400} height={8} fill="#4A3E2E" />
    <Cone x={430} y={420} w0={30} w1={300} h={200} col="#FFC873" o={0.07} />
    <ellipse cx={440} cy={640} rx={360} ry={70} fill="#FFC873" opacity={0.12} />
    <Lamp x={330} y={612} on={1} s={0.9} />
    <Coffee x={560} y={560} f={f} />
    {/* the screen's glow on the wall: the card sits here */}
    <Glow x={800} y={380} r={420} ry={260} col="#9FD8FF" o={0.28 + 0.12 * warm} />
    <Phone x={980} y={640} rot={-70} s={0.6} lit={0} />
    <Press f={f} fSend={fSend} cA={cA} />
  </g>;
}

function Towers({ fc }: { fc: number }) {
  const on = k(fc, 2, 14);
  return <g>{[380, 1220].map((x, i) => <g key={x}>
    <Cone x={x} y={110} w0={80} w1={420} h={900} col="#FFF3C0" o={0.12 * on} />
    <path d={`M${x - 30} 900 L${x - 8} 150 H${x + 8} L${x + 30} 900 Z`} fill="#0B0A10" />
    {Array.from({ length: 10 }, (_, j) => <line key={j} x1={x - 26 + j * 0.2} y1={880 - j * 72} x2={x + 22} y2={820 - j * 72} stroke="#1E1C26" strokeWidth={4} />)}
    <rect x={x - 90} y={60} width={180} height={100} rx={8} fill="#15141A" />
    {Array.from({ length: 12 }, (_, j) => <circle key={j} cx={x - 66 + (j % 6) * 26} cy={88 + Math.floor(j / 6) * 40} r={11} fill="#FFF8E0" opacity={j / 12 < on ? 1 : 0.15} />)}
    <Glow x={x} y={110} r={300} ry={200} col="#FFE3A3" o={on * (0.8 + 0.2 * Math.sin(fc * 0.3 + i))} />
  </g>)}</g>;
}

function Ticker({ fc, text }: { fc: number; text: string }) {
  const on = k(fc, 6, 14);
  const item = text.toUpperCase() + '  ★  ';
  const shift = (fc * 9) % 1200;
  return <g opacity={on} transform={`translate(0 ${lerp(60, 0, on)})`}>
    <rect x={-1400} y={790} width={4400} height={90} fill={GOLD} />
    <rect x={-1400} y={790} width={4400} height={6} fill="#FFE39A" /><rect x={-1400} y={874} width={4400} height={6} fill="#A36F00" />
    <g transform={`translate(${-shift} 0)`}>{Array.from({ length: 6 }, (_, i) => <MText key={i} x={-200 + i * 600} y={852} size={50} fill="#15130F" font={F_COND} anchor="start">{item}</MText>)}</g>
  </g>;
}

function CityCut({ fc, kind, cA, cB, cp }: { fc: number; kind: PostFilmKind; cA: string; cB: string; cp: string }) {
  const gold = kind === 'catch';
  const wave = k(fc, 0, 26);
  const share = LIT[kind];
  const col = gold ? '#FFD76A' : '#9FD8FF';
  const wins = Array.from({ length: 18 }, (_, i) => ({ x: 330 + (i % 6) * 190, y: 440 + Math.floor(i / 6) * 150, at: 4 + rnd(i, 3) * 20, on: rnd(i, 5) < share }));
  return <g>
    <defs><linearGradient id="pfsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={gold ? '#2A1A04' : '#070B1C'} /><stop offset="1" stopColor={gold ? '#6A4A10' : '#16204A'} /></linearGradient></defs>
    <rect x={-1400} y={-1400} width={4400} height={3800} fill="url(#pfsky)" />
    {gold && <Towers fc={fc} />}
    <City x={-200} y={180} w={2000} h={260} seed={3} n={20} wave={wave} win={gold ? '#FFD76A' : '#FFD58A'} />
    {/* the block across the street: a window each, a phone in each lighting as the post lands */}
    <rect x={240} y={400} width={1120} height={520} fill="#0C0E18" />
    {wins.map((w, i) => { const lit = w.on ? cl((fc - w.at) / 4) : 0; return <g key={i}>
      <rect x={w.x - 70} y={w.y - 52} width={140} height={104} fill={lit > 0 ? '#1B2440' : '#101421'} />
      {lit > 0 && <Glow x={w.x} y={w.y} r={120} ry={80} col={i % 5 === 0 ? cA : col} o={0.7 * lit} />}
      <Phone x={w.x} y={w.y + 6} rot={i % 2 ? -8 : 10} s={0.5} lit={lit} col={i % 5 === 0 ? cA : i % 7 === 0 ? cB : col} buzz={lit > 0 && lit < 1 ? fc : 0} />
      <rect x={w.x - 70} y={w.y - 4} width={140} height={6} fill="#0C0E18" />
    </g>; })}
    {gold && <Ticker fc={fc} text={cp} />}
  </g>;
}

export function PostFilm({ f, fSend, fCut, kind, cA, cB, cp = '', rtl, still }: { f: number; fSend: number; fCut: number; kind: PostFilmKind; cA: string; cB: string; cp?: string; rtl?: boolean; still?: boolean }) {
  const cut = f >= fCut;
  const fc = f - fCut;
  const w = cut ? cl(fc / 5) : 0;
  const M = rtl ? -1 : 1;
  const push = 1 + 0.04 * cl(f / Math.max(1, fSend));
  return <FrameProvider frame={f} width={1600} height={900} fps={30} durationInFrames={Math.max(1, f + 1)}>
    <svg className="cf" viewBox="200 0 1200 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <Glows cols={['#FFC873', '#FFB25A', '#FF6A48', '#9FD8FF', '#FFD76A', '#FFE3A3', cA]} />
      <MirrorCtx.Provider value={M}>
        <g transform={M < 0 ? 'matrix(-1 0 0 1 1600 0)' : undefined}>
          {w < 1 && <g transform={`translate(${-w * 600} 0) translate(800 450) scale(${push}) translate(-800 -450)`} opacity={1 - w}><Desk f={f} fSend={fSend} cA={cA} /></g>}
          {cut && <g transform={`translate(${(1 - w) * 600} 0) translate(800 450) scale(${lerp(1.1, 1, cl(fc / 30))}) translate(-800 -450)`} opacity={w}><CityCut fc={fc} kind={kind} cA={cA} cB={cB} cp={cp} /></g>}
        </g>
      </MirrorCtx.Provider>
      {f >= fSend && hit(f, fSend, 6) > 0.02 && <rect x={0} y={0} width={1600} height={900} fill="#FFF3D8" opacity={0.5 * hit(f, fSend, 6)} />}
    </svg>
    <FilmLook vignette={0.75} grain={!still} />
  </FrameProvider>;
}
