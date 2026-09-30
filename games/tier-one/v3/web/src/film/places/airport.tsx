// The airport at dusk from the mezzanine: the departures board flipping, the big window, landing lights, a jet's
// silhouette, a case on a trolley by the rail, the phone on the rail. Done: the board flips to the buying club's city
// and BOARDING, and the case's tag drops in the club's colours. Off: the board's date flips to next month, CANCELLED.
import { Glows, Glow, Motes, Tag, Flap, Newspaper, Bin, arc, live, useLive, noise, k, lerp, cl, hit, FLOOR, MText, F_MONO, F_COND } from './world';
import { Phones, doneDrop, heroGlow, TELL, HERO } from './tells';
import { bloom, type PlaceSpec, type PlaceZ } from './spec';
import { EASE } from '../kit';

const BOARD = { x: 520, y: 150, w: 560 }, RAIL = { y: 600 }, CASE = { x: 1140, y: 700 };
const cells = (s: string, n: number) => s.toUpperCase().padEnd(n, ' ').slice(0, n).split('');

function Row({ x, y, a, b, flip, n, ink, size = 26, w = 30, h = 40, stagger = 1.5, f }: { x: number; y: number; a: string; b: string; flip: number; n: number; ink: string; size?: number; w?: number; h?: number; stagger?: number; f: number }) {
  const A = cells(a, n), B = cells(b, n);
  const on = useLive();
  return <g>{A.map((ch, i) => {
    const fl = flip <= 0 ? 0 : cl((flip * (n * stagger + 8) - i * stagger) / 8);
    return <Flap key={i} x={x + i * (w + 2)} y={y} w={w} h={h} a={ch} b={B[i]} flip={fl} ink={ink} size={size} className={on && (i * 7 + f) % 9 === 0 ? 'lp lp-flap' : undefined} />;
  })}</g>;
}

function Scene(z: PlaceZ) {
  const { f, phase, o, to, from, alt, words } = z;
  const on = useLive();
  const call = phase === 'call';
  const drop = doneDrop(z, 10);
  const gl = heroGlow(z);
  const flipDone = call && o === 0 ? k(f, TELL + 2, TELL + 18, EASE.inOut) : 0;
  const flipOff = call && o === 2 ? k(f, TELL + 2, TELL + 18, EASE.inOut) : 0;
  const flipAlt = call && o === 1 ? k(f, TELL + 14, TELL + 28, EASE.inOut) : 0;
  const bl = call ? bloom(z) : 0;
  // the jet: taxis right to left across the window in the loop; in the film it rolls slowly, and a landing one drifts
  const jetX = on ? 1500 : 1500 - (f * 3.2) % 2400;
  const lights = Array.from({ length: 10 }, (_, i) => 300 + i * 120);
  const tagY = lerp(-380, CASE.y - 60, drop), sw = Math.sin(Math.max(0, f - TELL - 10) * 0.5) * 20 * Math.exp(-Math.max(0, f - TELL - 10) / 14);
  // fake: the paper on the rail, screwed up and dropped in the bin below
  const fake = call && o === 3;
  const up = fake ? k(f, TELL + 2, TELL + 10, EASE.out) : 0, crumple = fake ? k(f, TELL + 8, TELL + 20) : 0, t = fake ? k(f, TELL + 20, TELL + 31, EASE.in) : 0;
  const pa = arc(t, 560, RAIL.y - 30 - up * 80, 470, FLOOR - 100, 100);
  const date = `${z.month.slice(0, 3)} 28`, date2 = `${z.next.slice(0, 3)} 01`;
  const dest = to.c1 && (words.gate ? '' : ''); void dest;
  const toName = call && o === 1 && flipAlt > 0 ? cellsName(alt) : cellsName(to);
  return <>
    <Glows cols={['#FFB07A', '#FFE08A', '#9FD8FF', '#2FBF71', '#FF3B1E', to.c1, alt.c1, from.c1, '#FF6A48', '#FFFFFF']} />
    <defs>
      <linearGradient id="apsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1B1436" /><stop offset=".55" stopColor="#7A3A5A" /><stop offset="1" stopColor="#E88A4A" /></linearGradient>
      <linearGradient id="apf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2A2832" /><stop offset="1" stopColor="#0B0A10" /></linearGradient>
      <clipPath id="apwin"><rect x={-600} y={90} width={2800} height={430} /></clipPath>
    </defs>
    <rect x={-1400} y={-1400} width={4400} height={1400 + FLOOR} fill="#14121F" />
    <rect x={-1400} y={FLOOR} width={4400} height={1800} fill="url(#apf)" />
    <rect x={-1400} y={FLOOR - 6} width={4400} height={12} fill="#08080C" />
    {/* the window: dusk, the runway, the lights, the jet */}
    <g clipPath="url(#apwin)">
      <rect x={-600} y={90} width={2800} height={430} fill="url(#apsky)" />
      <circle cx={720} cy={470} r={90} fill="#FFD58A" opacity=".85" /><Glow x={720} y={470} r={260} ry={140} col="#FFB07A" o={0.6} />
      <rect x={-600} y={470} width={2800} height={60} fill="#2A1A2A" />
      {/* the terminal across the apron */}
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={-300 + i * 420} y={420} width={300} height={50} fill="#1E1630" />)}
      {lights.map((x, i) => <circle key={x} cx={x} cy={492} r={5} fill="#FFE08A" opacity={on ? 0.9 : 0.35 + 0.65 * (Math.sin(f * 0.35 - i * 0.7) > 0.4 ? 1 : 0)} className={live(on, 'lp-blink')} style={on ? { animationDelay: `${i * 0.25}s` } : undefined} />)}
      <g transform={`translate(${jetX} 430)`} className={live(on, 'lp-taxi')}>
        <path d="M-200 12 Q-210 -14 -170 -18 H170 Q216 -16 230 4 Q216 20 170 22 H-170 Q-196 22 -200 12 Z" fill="#0E0D16" />
        <path d="M-180 -16 L-216 -80 H-186 L-138 -18 Z" fill="#0E0D16" /><path d="M-30 12 L-100 66 H-66 L20 14 Z" fill="#0E0D16" />
        <circle cx={-190} cy={-6} r={4} fill="#FF3B1E" opacity={on ? 1 : f % 20 < 10 ? 1 : 0.2} className={live(on, 'lp-blink')} /><circle cx={218} cy={4} r={4} fill="#fff" opacity={on ? 1 : f % 20 < 10 ? 0.2 : 1} className={live(on, 'lp-blink')} />
        {Array.from({ length: 10 }, (_, i) => <rect key={i} x={-130 + i * 26} y={-6} width={8} height={7} rx={2} fill="#FFE08A" opacity=".8" />)}
      </g>
    </g>
    {/* mullions */}
    {Array.from({ length: 7 }, (_, i) => <rect key={i} x={-300 + i * 400} y={90} width={18} height={430} fill="#0E0D16" />)}
    <rect x={-600} y={80} width={2800} height={14} fill="#0E0D16" /><rect x={-600} y={516} width={2800} height={46} fill="#0E0D16" />
    <rect x={-600} y={90} width={2800} height={430} fill="#9FB8D8" opacity=".05" />
    {/* the departures board */}
    <g transform={`translate(${BOARD.x} ${BOARD.y})`}>
      <rect x={-20} y={-40} width={BOARD.w + 40} height={190} rx={8} fill="#111217" stroke="#2A2B33" strokeWidth={4} />
      <MText x={16} y={-10} size={16} fill="#FFE08A" font={F_MONO} stretch="100%" weight={700} anchor="start" spacing=".2em">{words.gate.toUpperCase()}</MText>
      <Row f={f} x={BOARD.w - 8 * 24 - 4} y={-32} a={date} b={date2} flip={flipOff} n={8} ink="#FFE08A" size={20} w={22} h={30} />
      <g transform="translate(0 20)">
        <Row f={f} x={0} y={0} a={toName} b={o === 1 ? cellsName(alt) : toName} flip={flipAlt} n={9} ink="#F4EFE4" />
        <Row f={f} x={9 * 32 + 12} y={0} a={call && o === 2 && flipOff > 0.5 ? words.cancelled : words.boarding} b={words.cancelled} flip={flipOff} n={9} ink={flipOff > 0.5 ? '#FF3B1E' : flipDone > 0.5 || (call && o === 1 && flipAlt > 0.5) ? '#2FBF71' : '#F4EFE4'} />
      </g>
      <g transform="translate(0 66)" opacity=".55">
        <Row f={f} x={0} y={0} a="LHR      " b="LHR      " flip={0} n={9} ink="#B9B4C2" />
        <Row f={f} x={9 * 32 + 12} y={0} a="ON TIME  " b="ON TIME  " flip={0} n={9} ink="#B9B4C2" />
      </g>
      {(flipDone > 0.5 || flipOff > 0.5 || flipAlt > 0.5) && <Glow x={BOARD.w / 2} y={40} r={420} ry={140} col={flipOff > 0.5 ? '#FF3B1E' : flipAlt > 0.5 ? alt.c1 : to.c1} o={0.55 * bl} />}
    </g>
    {/* the mezzanine rail and its ledge */}
    <rect x={-600} y={RAIL.y} width={2800} height={14} rx={6} fill="#B9AE98" /><rect x={-600} y={RAIL.y + 14} width={2800} height={6} fill="#6E6A60" />
    {Array.from({ length: 9 }, (_, i) => <rect key={i} x={-200 + i * 240} y={RAIL.y + 14} width={10} height={FLOOR - RAIL.y - 14} fill="#8A8272" opacity=".8" />)}
    <rect x={-600} y={RAIL.y + 14} width={2800} height={FLOOR - RAIL.y - 14} fill="#1B1926" opacity=".85" />
    {/* the case on its trolley, the tag hanging from the handle */}
    <g transform={`translate(${CASE.x} ${CASE.y})`}>
      <rect x={-60} y={-116} width={12} height={130} fill="#8A8272" /><rect x={-64} y={-120} width={70} height={10} rx={5} fill="#8A8272" />
      <rect x={-50} y={-80} width={100} height={130} rx={10} fill="#3A3F4A" /><rect x={-50} y={-30} width={100} height={8} fill="#2A2E36" />
      <rect x={-38} y={-80} width={76} height={8} fill={from.c1} /><rect x={-38} y={-72} width={76} height={4} fill={from.c2} />
      <circle cx={-30} cy={56} r={9} fill="#0A0A0C" /><circle cx={30} cy={56} r={9} fill="#0A0A0C" />
      {drop > 0 && <>
        {gl > 0 && <Glow x={30} y={-20} r={190} ry={170} col={to.c1} o={gl * 0.75} />}
        <Tag x={-2} y={tagY - CASE.y} c={to} swing={sw} s={1.05} len={30} />
      </>}
    </g>
    <Phones z={z} p1={{ x: 760, y: RAIL.y - 12 }} p2={{ x: 880, y: RAIL.y - 8 }} rot1={-84} rot2={-72} s={0.72} />
    {/* a coffee cup and the paper on the ledge; the bin below */}
    <g transform={`translate(660 ${RAIL.y - 6})`}><path d="M-16 0 H16 L12 -40 H-12 Z" fill="#E9E2D3" /><rect x={-18} y={-44} width={36} height={6} rx={2} fill="#5A3A1E" /></g>
    <Bin x={470} y={FLOOR} s={0.95} f={f} hitAt={fake ? TELL + 31 : -1} col="#2E3340" />
    {fake && f >= TELL + 31 && <g transform={`translate(470 ${FLOOR - 96})`}><Newspaper x={0} y={0} c={to} s={0.5} crumple={1} rot={20} /></g>}
    {(!fake || t < 1) && <Newspaper x={fake ? pa.x : 560} y={fake ? pa.y : RAIL.y - 30} c={to} rot={-86 + t * 520} s={0.66} crumple={crumple} />}
    {fake && bl > 0 && <Glow x={470} y={FLOOR - 60} r={150} ry={190} col="#FFE3A3" o={bl * 0.8} />}
    <Motes f={f} x={500} y={100} w={600} h={400} n={10} seed={11} col="rgba(255,200,150,.35)" />
    {/* a hanging sign */}
    <g transform="translate(1320 120)"><rect x={-90} y={-30} width={180} height={60} rx={6} fill="#F7B928" /><MText x={0} y={12} size={30} fill="#15130F" font={F_COND} spacing=".08em">A 1–12 →</MText></g>
    {hit(f, HERO, 1) > 2 && null}
  </>;
}
const cellsName = (c: { c1: string; c2: string } & { s?: string }) => (c.s || '').toUpperCase();

export const spotter: PlaceSpec = {
  Scene,
  cam: (o) => [
    { f: 0, x: 820, y: 440, z: 1.0 }, { f: 30, x: 830, y: 440, z: 1.03 }, { f: TELL, x: 840, y: 430, z: 1.06 },
    o === 0 ? { f: 100, x: 960, y: 420, z: 1.3 } : o === 1 ? { f: 100, x: 820, y: 580, z: 1.5 } : o === 2 ? { f: 100, x: 800, y: 210, z: 1.5 } : { f: 100, x: 520, y: 640, z: 1.36 },
  ],
  cues: (o) => [{ f: 6, k: 'film.chime' }, ...(o === 0 ? [{ f: TELL + 2, k: 'film.board' }, { f: TELL + 12, k: 'film.tag' }, { f: TELL + 20, k: 'film.tag' }] : o === 1 ? [{ f: TELL + 4, k: 'film.phone' }, { f: TELL + 12, k: 'film.phone2' }, { f: TELL + 14, k: 'film.board' }] : o === 2 ? [{ f: TELL + 2, k: 'film.board' }, { f: TELL + 16, k: 'film.bad' }] : [{ f: TELL + 8, k: 'film.crumple' }, { f: TELL + 31, k: 'film.bin' }])],
};
