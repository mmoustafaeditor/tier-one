// The barber's after hours: the chair under a pendant, the mirror of bulbs, the pole turning, a calendar, the clippers
// on the counter, the phone by them. Done: a scarf in the buying club's colours drops over the chair back.
import { Glows, Glow, Cone, Motes, Scarf, Shield, live, useLive, noise, k, lerp, FLOOR, INK, PAPER, F_COND, MText } from './world';
import { Phones, CalendarTell, PaperTell, doneDrop, heroGlow, TELL } from './tells';
import type { PlaceSpec, PlaceZ } from './spec';

const WALL = '#3A2413', WALL2 = '#1C1108', FLOOR1 = '#2B1E14', FLOOR2 = '#0E0906', CHROME = '#B9AE98', LEATHER = '#8E1C1C';
const CHAIR = { x: 1010, y: 560 }, COUNTER = { x0: 470, x1: 900, y: 590 }, CAL = { x: 445, y: 330 }, POLE = { x: 1300, y: 250 };

function Scene(z: PlaceZ) {
  const { f, phase, o } = z;
  const on = useLive();
  const call = phase === 'call';
  const fl = on ? 1 : 0.86 + 0.14 * noise(f / 9, 4);
  const poleOff = on ? 0 : (f * 2.4) % 48;
  const drop = doneDrop(z);
  const gl = heroGlow(z);
  // the scarf: hung high out of frame, drops onto the chair back and settles with a swing
  const sy = lerp(-420, CHAIR.y - 130, drop), swing = Math.sin(Math.max(0, f - TELL - 6) * 0.45) * 9 * Math.exp(-Math.max(0, f - TELL - 6) / 10);
  const bulbs = Array.from({ length: 12 }, (_, i) => (i < 5 ? { x: 590 + i * 60, y: 150 } : i < 9 ? { x: 560, y: 210 + (i - 5) * 78 } : { x: 860, y: 210 + (i - 9) * 78 }));
  return <>
    <Glows cols={['#FFB25A', '#FFE3A3', '#9FD8FF', z.to.c1, z.alt.c1, z.from.c1, '#FF6A48', '#FFFFFF']} />
    <defs>
      <linearGradient id="bbw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={WALL2} /><stop offset="0.55" stopColor={WALL} /><stop offset="1" stopColor={WALL2} /></linearGradient>
      <linearGradient id="bbf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={FLOOR1} /><stop offset="1" stopColor={FLOOR2} /></linearGradient>
      <pattern id="bbchk" width="90" height="46" patternUnits="userSpaceOnUse" patternTransform="skewX(-14)"><rect width="90" height="46" fill="#1B120B" /><rect width="45" height="23" fill="#D8CCB4" opacity=".16" /><rect x="45" y="23" width="45" height="23" fill="#D8CCB4" opacity=".16" /></pattern>
      <clipPath id="bbpole"><rect x={POLE.x - 22} y={POLE.y} width={44} height={230} rx={22} /></clipPath>
      <clipPath id="bbmirror"><rect x={580} y={200} width={260} height={300} rx={10} /></clipPath>
    </defs>
    {/* walls, floor, skirting */}
    <rect x={-1400} y={-1400} width={4400} height={1400 + FLOOR} fill="url(#bbw)" />
    <rect x={-1400} y={FLOOR} width={4400} height={1800} fill="url(#bbf)" />
    <rect x={-1400} y={FLOOR} width={4400} height={260} fill="url(#bbchk)" opacity=".9" />
    <rect x={-1400} y={FLOOR - 6} width={4400} height={12} fill="#120A05" />
    {/* wainscot */}
    <rect x={-1400} y={640} width={4400} height={140} fill="#2A180C" /><rect x={-1400} y={636} width={4400} height={8} fill="#5A3A1E" />
    {/* the pendant over the chair */}
    <line x1={CHAIR.x} y1={-900} x2={CHAIR.x} y2={90} stroke="#0A0806" strokeWidth={4} />
    <Cone x={CHAIR.x} y={126} w0={70} w1={300} h={FLOOR - 126} col="#FFB25A" o={0.09 * fl} />
    <path d={`M${CHAIR.x - 70} 126 Q${CHAIR.x} 40 ${CHAIR.x + 70} 126 Z`} fill="#2A241C" />
    <ellipse cx={CHAIR.x} cy={126} rx={44} ry={9} fill="#FFE3A3" opacity={fl} />
    <Glow x={CHAIR.x} y={130} r={160} ry={70} col="#FFB25A" o={0.5 * fl} className={live(on, 'lp-breathe')} />
    <ellipse cx={CHAIR.x} cy={FLOOR + 6} rx={300} ry={40} fill="#FFB25A" opacity={0.08 * fl} />
    {/* the mirror and its bulbs */}
    <rect x={566} y={186} width={288} height={328} rx={16} fill="#6E5230" />
    <rect x={580} y={200} width={260} height={300} rx={10} fill="#1B2226" />
    <g clipPath="url(#bbmirror)" opacity=".55">
      <rect x={580} y={200} width={260} height={300} fill="#24303A" />
      <path d="M600 500 L700 200 M660 500 L760 200" stroke="#fff" strokeOpacity=".08" strokeWidth={22} />
      {/* the reflection: the pole and the pendant glow, dim */}
      <ellipse cx={780} cy={280} rx={60} ry={30} fill="#FFB25A" opacity={0.25 * fl} />
      <g transform="translate(-560 60) scale(.7)" opacity=".6"><rect x={POLE.x - 12} y={POLE.y} width={24} height={200} rx={12} fill="#fff" /></g>
    </g>
    {bulbs.map((b, i) => <g key={i}>
      <Glow x={b.x} y={b.y} r={46} col="#FFE3A3" o={0.55 * (on ? 1 : 0.7 + 0.3 * noise(f / 6, i))} className={live(on, 'lp-bulb')} />
      <circle cx={b.x} cy={b.y} r={10} fill="#FFF0C8" opacity={on ? 1 : 0.8 + 0.2 * noise(f / 6, i)} className={live(on, 'lp-bulb')} />
    </g>)}
    {/* the player's own club's pennant hangs from the mirror's corner */}
    {/* the calendar on the wall */}
    <CalendarTell z={z} at={CAL} s={1} pennant={{ x: 862, y: 522 }} />
    {/* the pole */}
    <rect x={POLE.x - 30} y={POLE.y - 18} width={60} height={18} rx={7} fill="#D9C9A8" /><rect x={POLE.x - 30} y={POLE.y + 230} width={60} height={18} rx={7} fill="#D9C9A8" />
    <g clipPath="url(#bbpole)">
      <rect x={POLE.x - 22} y={POLE.y - 60} width={44} height={360} fill="#F4EFE4" />
      <g className={live(on, 'lp-pole')} transform={`translate(0 ${poleOff})`}>{Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${POLE.x - 22} ${POLE.y - 60 + i * 48} l44 -34 v16 l-44 34 z`} fill={i % 2 ? '#2B4FD8' : '#E23B2E'} />)}</g>
      <rect x={POLE.x - 22} y={POLE.y} width={12} height={230} fill="#fff" opacity=".35" />
    </g>
    <Glow x={POLE.x} y={POLE.y + 115} r={90} ry={160} col="#FFFFFF" o={0.08} />
    {/* the counter, the clippers, the comb jar, the phone */}
    <rect x={COUNTER.x0} y={COUNTER.y + 10} width={COUNTER.x1 - COUNTER.x0} height={FLOOR - COUNTER.y - 10} fill="#3E2614" />
    <rect x={COUNTER.x0 - 12} y={COUNTER.y} width={COUNTER.x1 - COUNTER.x0 + 24} height={14} rx={3} fill="#6B4424" />
    <ellipse cx={720} cy={COUNTER.y + 2} rx={230} ry={16} fill="#FFB25A" opacity={0.08 * fl} />
    <g transform={`translate(520 ${COUNTER.y - 14}) rotate(-24)`}>
      <rect x={-50} y={-16} width={100} height={32} rx={9} fill="#1D1D22" /><rect x={44} y={-9} width={22} height={18} fill={CHROME} /><path d={`M-50 0 q-40 ${on ? 30 : 30 + 6 * noise(f / 12, 2)} -30 70`} stroke="#0E0C0A" strokeWidth={4} fill="none" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={-40 + i * 18} y={-6} width={10} height={12} rx={2} fill="#3A3A42" />)}
    </g>
    <g transform="translate(600 0)">{[0, 1, 2].map((i) => <rect key={i} x={-14 + i * 12} y={COUNTER.y - 44 + (i % 2) * 8} width={9} height={44 - (i % 2) * 8} rx={3} fill={['#2F7F6F', '#B0442A', '#D9A441'][i]} opacity=".85" />)}<rect x={-24} y={COUNTER.y - 50} width={48} height={8} rx={2} fill="#8AA0B4" opacity=".4" /></g>
    <Phones z={z} p1={{ x: 780, y: COUNTER.y - 12 }} p2={{ x: 660, y: COUNTER.y - 8 }} rot1={-78} rot2={-96} s={0.72} />
    {/* the paper (fake) rests on the counter's end; the bin by the chair */}
    <PaperTell z={z} paper={{ x: 880, y: COUNTER.y - 20 }} bin={{ x: 1180, y: FLOOR }} rot={-84} s={0.7} binS={0.95} />
    {/* the chair */}
    <g>
      <ellipse cx={CHAIR.x} cy={FLOOR + 2} rx={90} ry={12} fill="#7A6E5A" />
      <ellipse cx={CHAIR.x} cy={FLOOR + 2} rx={90} ry={12} fill="rgba(0,0,0,.35)" />
      <rect x={CHAIR.x - 12} y={CHAIR.y + 74} width={24} height={FLOOR - CHAIR.y - 74} fill={CHROME} />
      <rect x={CHAIR.x - 90} y={CHAIR.y + 100} width={110} height={10} rx={4} fill={CHROME} />
      <path d={`M${CHAIR.x - 80} ${CHAIR.y + 36} h150 a14 14 0 0 1 14 14 v20 a14 14 0 0 1 -14 14 h-150 a14 14 0 0 1 -14 -14 v-20 a14 14 0 0 1 14 -14 z`} fill="#A32424" />
      <rect x={CHAIR.x + 6} y={CHAIR.y - 150} width={40} height={200} rx={14} fill={LEATHER} transform={`rotate(9 ${CHAIR.x + 26} ${CHAIR.y + 40})`} />
      <rect x={CHAIR.x + 14} y={CHAIR.y - 140} width={14} height={160} rx={6} fill="rgba(255,255,255,.08)" transform={`rotate(9 ${CHAIR.x + 26} ${CHAIR.y + 40})`} />
      <rect x={CHAIR.x - 90} y={CHAIR.y + 10} width={40} height={28} rx={8} fill={LEATHER} /><rect x={CHAIR.x + 50} y={CHAIR.y + 10} width={40} height={28} rx={8} fill={LEATHER} />
      {/* Done: the scarf over the chair back */}
      {drop > 0 && <>
        {gl > 0 && <Glow x={CHAIR.x + 30} y={CHAIR.y - 110} r={220} ry={180} col={z.to.c1} o={gl * 0.7} />}
        <Scarf x={CHAIR.x + 32} y={sy} c={z.to} rot={-72 + swing} s={0.92} drape={1} />
        {gl > 0.4 && <g opacity={(gl - 0.4) / 0.6}><Shield x={CHAIR.x + 118} y={sy + 52} s={0.6} c={z.to} rot={12} /></g>}
      </>}
    </g>
    {/* the neon sign in the window (far left, out of the phone crop) */}
    <g transform="translate(300 300)" opacity={0.85 * fl}>
      <rect x={-90} y={-60} width={180} height={120} rx={8} fill="none" stroke={z.acc} strokeWidth={3} opacity=".5" />
      <MText x={0} y={12} size={38} fill={z.acc} font={F_COND} spacing=".1em">OPEN</MText>
      <Glow x={0} y={0} r={160} ry={110} col={z.acc} o={0.35} className={live(on, 'lp-breathe')} />
    </g>
    <Motes f={f} x={CHAIR.x - 140} y={140} w={280} h={520} n={12} seed={3} />
    {/* the hair on the floor, swept into a line by the chair */}
    <g opacity=".7">{Array.from({ length: 16 }, (_, i) => <rect key={i} x={CHAIR.x - 120 + i * 15} y={FLOOR - 4 + (i % 3)} width={3} height={9} rx={1.5} fill="#1B1511" transform={`rotate(${(i * 47) % 360} ${CHAIR.x - 120 + i * 15} ${FLOOR})`} />)}</g>
    {call && o === 1 && f > TELL + 4 && <rect x={-1400} y={-1400} width={4400} height={4400} fill={INK} opacity={0.18 * k(f, TELL + 4, TELL + 20)} style={{ mixBlendMode: 'multiply' }} />}
    <span style={{ display: 'none' }}>{PAPER}</span>
  </>;
}

export const barber: PlaceSpec = {
  Scene,
  cam: (o) => [
    { f: 0, x: 860, y: 470, z: 1.0 }, { f: 30, x: 880, y: 465, z: 1.03 }, { f: TELL, x: 900, y: 460, z: 1.06 },
    o === 0 ? { f: 100, x: 1010, y: 450, z: 1.34 } : o === 1 ? { f: 100, x: 730, y: 540, z: 1.5 } : o === 2 ? { f: 100, x: 500, y: 360, z: 1.55 } : { f: 100, x: 1080, y: 620, z: 1.36 },
  ],
  cues: (o) => [{ f: 8, k: 'film.clippers' }, ...(o === 0 ? [{ f: TELL + 8, k: 'film.drape' }, { f: TELL + 26, k: 'film.tag' }] : o === 1 ? [{ f: TELL + 4, k: 'film.phone' }, { f: TELL + 12, k: 'film.phone2' }] : o === 2 ? [{ f: TELL + 6, k: 'film.tear' }, { f: TELL + 24, k: 'film.flip' }] : [{ f: TELL + 8, k: 'film.crumple' }, { f: TELL + 31, k: 'film.bin' }])],
};
