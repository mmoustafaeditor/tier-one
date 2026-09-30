// The boot room: lockers, a rail of shirts with numbers, a bench with a kit bag, a strip light that buzzes, the phone
// on the bench. Done: a tag in the buying club's colours drops onto the bag's strap and swings.
import { Glows, Glow, Motes, Bag, Tag, Shirt, live, useLive, noise, k, lerp, FLOOR, MText, F_COND } from './world';
import { Phones, CalendarTell, PaperTell, doneDrop, heroGlow, TELL } from './tells';
import type { PlaceSpec, PlaceZ } from './spec';

const BENCH = { x0: 560, x1: 1240, y: 640 }, BAG = { x: 1000, y: 606 }, CAL = { x: 470, y: 330 };
const RAIL = [640, 740, 840, 940];

function Scene(z: PlaceZ) {
  const { f } = z;
  const on = useLive();
  // the strip light: a tube that hums and drops out for a frame now and then
  const fl = on ? 1 : (noise(f / 3, 8) > 0.82 ? 0.55 : 0.92 + 0.08 * noise(f / 5, 2));
  const drop = doneDrop(z, 4);
  const gl = heroGlow(z);
  const tagY = lerp(-380, BAG.y - 66, drop), sw = Math.sin(Math.max(0, f - TELL - 4) * 0.5) * 22 * Math.exp(-Math.max(0, f - TELL - 4) / 14);
  const nums = ['4', '9', '11', '17'];
  return <>
    <Glows cols={['#DDE8DD', '#FFE3A3', '#9FD8FF', z.to.c1, z.alt.c1, z.from.c1, '#FF6A48', '#FFFFFF']} />
    <defs>
      <linearGradient id="brw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0F1A13" /><stop offset="0.5" stopColor="#213328" /><stop offset="1" stopColor="#0C140F" /></linearGradient>
      <linearGradient id="brf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#262620" /><stop offset="1" stopColor="#0A0A08" /></linearGradient>
    </defs>
    <rect x={-1400} y={-1400} width={4400} height={1400 + FLOOR} fill="url(#brw)" />
    <g opacity=".12">{Array.from({ length: 13 }, (_, i) => <line key={i} x1={-1400} y1={-60 + i * 66} x2={3000} y2={-60 + i * 66} stroke="#DDE8DD" strokeWidth={2} />)}</g>
    <rect x={-1400} y={FLOOR} width={4400} height={1800} fill="url(#brf)" />
    <rect x={-1400} y={FLOOR - 6} width={4400} height={12} fill="#08080A" />
    {/* the strip light */}
    <rect x={560} y={80} width={520} height={16} rx={8} fill="#E8FFF4" opacity={fl} className={live(on, 'lp-strip')} />
    <rect x={540} y={70} width={560} height={12} rx={4} fill="#3A4A40" />
    <Glow x={820} y={92} r={480} ry={120} col="#DDE8DD" o={0.5 * fl} className={live(on, 'lp-strip')} />
    <rect x={-1400} y={96} width={4400} height={FLOOR - 96} fill="#DDE8DD" opacity={0.03 * fl} />
    {/* lockers along the back */}
    {[420, 1140, 1260].map((x) => <g key={x}>
      <rect x={x - 56} y={230} width={112} height={FLOOR - 140 - 230} fill="#1A140E" />
      <rect x={x - 56} y={230} width={112} height={FLOOR - 140 - 230} fill="#4E5A4E" stroke="#2C332C" strokeWidth={5} />
      <rect x={x - 40} y={280} width={80} height={9} rx={4} fill="#2C332C" /><rect x={x - 40} y={300} width={80} height={9} rx={4} fill="#2C332C" />
      <MText x={x} y={262} size={22} fill="#C9C2B0">{String(((x / 60) | 0) % 30 + 1)}</MText>
    </g>)}
    {/* the rail of shirts: the player's own club's kit, numbers on the backs */}
    <rect x={560} y={236} width={500} height={10} rx={5} fill="#8A8272" /><rect x={556} y={230} width={14} height={140} fill="#5A5548" /><rect x={1050} y={230} width={14} height={140} fill="#5A5548" />
    {RAIL.map((x, i) => <Shirt key={x} x={x} y={244} c={z.from} no={nums[i]} s={0.9} rot={on ? 0 : noise(f / 30 + i, 5) * 1.6} className={live(on, i % 2 ? 'lp-sway' : 'lp-sway2')} />)}
    {/* the calendar on the locker beside the rail; the pennant is the club's */}
    <CalendarTell z={z} at={CAL} s={0.95} pennant={{ x: 1080, y: 250 }} />
    {/* the bench */}
    <rect x={BENCH.x0} y={BENCH.y} width={BENCH.x1 - BENCH.x0} height={18} rx={4} fill="#6B4A2A" /><rect x={BENCH.x0 + 4} y={BENCH.y + 18} width={BENCH.x1 - BENCH.x0 - 8} height={8} fill="#3E2C18" />
    <rect x={BENCH.x0 + 20} y={BENCH.y + 26} width={16} height={FLOOR - BENCH.y - 26} fill="#4A3220" /><rect x={BENCH.x1 - 36} y={BENCH.y + 26} width={16} height={FLOOR - BENCH.y - 26} fill="#4A3220" />
    <ellipse cx={(BENCH.x0 + BENCH.x1) / 2} cy={FLOOR + 6} rx={340} ry={22} fill="rgba(0,0,0,.4)" />
    {/* boots under the bench */}
    {[660, 720, 1100].map((x, i) => <g key={x} transform={`translate(${x} ${FLOOR - 4}) scale(${i === 2 ? -1 : 1} 1)`}><path d="M-30 0 H26 Q40 0 38 -14 L30 -26 Q10 -30 0 -22 L-30 -22 Z" fill="#111" /><path d="M-26 -22 L-8 -22" stroke="#DDE8DD" strokeWidth={3} /></g>)}
    {/* the kit bag and its tag; the phone face up on the bench */}
    <Bag x={BAG.x} y={BAG.y} s={1.05} col="#23262C" />
    <rect x={BAG.x - 40} y={BAG.y - 20} width={80} height={12} fill={z.from.c1} opacity=".8" />
    {drop > 0 && <>
      {gl > 0 && <Glow x={BAG.x + 60} y={BAG.y + 40} r={200} ry={170} col={z.to.c1} o={gl * 0.75} />}
      <Tag x={BAG.x + 48} y={tagY} c={z.to} swing={sw} s={1.1} len={30} />
    </>}
    <Phones z={z} p1={{ x: 760, y: BENCH.y - 10 }} p2={{ x: 640, y: BENCH.y - 6 }} rot1={-82} rot2={-100} s={0.72} />
    <PaperTell z={z} paper={{ x: 1170, y: BENCH.y - 16 }} bin={{ x: 1290, y: FLOOR }} rot={-88} s={0.7} binS={1} />
    <Motes f={f} x={620} y={110} w={420} h={480} n={12} seed={6} col="rgba(220,240,230,.4)" />
    {/* a sign */}
    <g transform="translate(300 300)"><rect x={-70} y={-24} width={140} height={48} rx={4} fill="#C9381A" /><MText x={0} y={10} size={24} fill="#F4EFE4" font={F_COND} spacing=".12em">NO. 1</MText></g>
  </>;
}

export const kitman: PlaceSpec = {
  Scene,
  cam: (o) => [
    { f: 0, x: 860, y: 470, z: 1.0 }, { f: 30, x: 870, y: 468, z: 1.03 }, { f: TELL, x: 880, y: 470, z: 1.06 },
    o === 0 ? { f: 100, x: 1010, y: 560, z: 1.45 } : o === 1 ? { f: 100, x: 710, y: 600, z: 1.5 } : o === 2 ? { f: 100, x: 520, y: 360, z: 1.55 } : { f: 100, x: 1200, y: 640, z: 1.36 },
  ],
  cues: (o) => [{ f: 6, k: 'film.strip' }, ...(o === 0 ? [{ f: TELL + 8, k: 'film.tag' }, { f: TELL + 20, k: 'film.tag' }] : o === 1 ? [{ f: TELL + 4, k: 'film.phone' }, { f: TELL + 12, k: 'film.phone2' }] : o === 2 ? [{ f: TELL + 6, k: 'film.tear' }, { f: TELL + 24, k: 'film.flip' }] : [{ f: TELL + 8, k: 'film.crumple' }, { f: TELL + 31, k: 'film.bin' }])],
};
