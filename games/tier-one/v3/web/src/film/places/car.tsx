// The agent: the back of a car at night, rain on the glass, city lights sliding past, the contract on the seat with a
// pen, the phone lit beside it. Done: the signature inks itself and the club's seal lands. Off: the dash date flips
// to next month and the contract is stamped VOID. Fake: the paper is screwed up and flung out of the window.
import { Glows, Glow, Rain, Contract, Newspaper, Flap, Shield, arc, live, useLive, noise, k, lerp, cl, rnd, MText, F_MONO } from './world';
import { Phones, doneDrop, heroGlow, TELL } from './tells';
import { bloom, type PlaceSpec, type PlaceZ } from './spec';
import { EASE } from '../kit';

const SEAT = { y: 600 }, DOC = { x: 880, y: 640 }, DASH = { x: 800, y: 470 };

function Scene(z: PlaceZ) {
  const { f, phase, o, to, from, alt } = z;
  const on = useLive();
  const call = phase === 'call';
  const drop = doneDrop(z, 2);
  const gl = heroGlow(z);
  const bl = call ? bloom(z) : 0;
  const sign = call && o === 0 ? k(f, TELL + 6, TELL + 26, EASE.inOut) : 0;
  const seal = call && o === 0 ? k(f, TELL + 26, TELL + 32, EASE.out) : 0;
  const void_ = call && o === 2 ? k(f, TELL + 22, TELL + 28, EASE.out) : 0;
  const flipOff = call && o === 2 ? k(f, TELL + 2, TELL + 16, EASE.inOut) : 0;
  const fake = call && o === 3;
  const winOpen = fake ? k(f, TELL + 4, TELL + 16) : 0;
  const crumple = fake ? k(f, TELL + 4, TELL + 16) : 0, t = fake ? k(f, TELL + 18, TELL + 32, EASE.in) : 0;
  const pa = arc(t, DOC.x, DOC.y - 60, 1500, 160, 200);
  const slide = on ? 0 : f * 6;
  const sweep = on ? -400 : ((f * 26) % 2600) - 800;
  const penRoll = call && o === 0 ? k(f, TELL, TELL + 6, EASE.out) : 0;
  return <>
    <Glows cols={['#FFC873', '#FF6A4A', '#9FD8FF', '#FFE3A3', to.c1, alt.c1, from.c1, '#FF3B1E', '#FFFFFF']} />
    <defs>
      <clipPath id="crwin"><path d="M180 150 Q200 110 270 110 H1330 Q1400 110 1420 170 L1440 540 H160 Z" /></clipPath>
      <linearGradient id="crnight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0B1636" /><stop offset="1" stopColor="#1C1128" /></linearGradient>
      <linearGradient id="crseat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2C221C" /><stop offset="1" stopColor="#120D0A" /></linearGradient>
    </defs>
    <rect x={-1400} y={-1400} width={4400} height={4400} fill="#050609" />
    {/* the city through the glass */}
    <g clipPath="url(#crwin)">
      <rect x={160} y={110} width={1280} height={440} fill="url(#crnight)" />
      <g className={live(on, 'lp-slide')} transform={`translate(${-slide % 900} 0)`}>
        {Array.from({ length: 12 }, (_, i) => <rect key={i} x={i * 300 - 200} y={200 - (i % 3) * 50 + rnd(i, 3) * 40} width={130 + rnd(i, 4) * 100} height={500} fill="#0A1024" />)}
        {Array.from({ length: 48 }, (_, i) => <rect key={'w' + i} x={(i * 71) % 3600 - 200} y={230 + (i % 6) * 40 + rnd(i, 8) * 20} width={12} height={16} fill="#FFD58A" opacity={0.3 + 0.5 * rnd(i, 9)} />)}
      </g>
      <g className={live(on, 'lp-bokeh')} transform={`translate(${-(slide * 1.6) % 1000} 0)`}>
        {Array.from({ length: 16 }, (_, i) => <circle key={i} cx={i * 250 - 100 + rnd(i, 5) * 120} cy={230 + rnd(i, 6) * 260} r={14 + rnd(i, 7) * 30} fill={['#FFC873', '#FF6A4A', '#9FD8FF', '#FFE3A3'][i % 4]} opacity={0.2 + 0.25 * rnd(i, 2)} />)}
      </g>
      {/* headlights sweeping the cabin */}
      <rect x={sweep} y={110} width={140} height={440} fill="#FFE3A3" opacity=".12" transform="skewX(-22)" className={live(on, 'lp-sweep')} />
      <Rain f={f} x={160} y={110} w={1280} h={440} n={30} seed={4} />
      <rect x={160} y={110} width={1280} height={440} fill="#9FB8D8" opacity={0.07 * (1 - winOpen)} />
      {/* the window winding down (fake): a darker pane slides down out of the way */}
      {winOpen > 0 && <rect x={160} y={110 + winOpen * 440} width={1280} height={440} fill="#040508" opacity=".25" />}
    </g>
    {/* the pillar and the door frame */}
    <path d="M180 150 Q200 110 270 110 H1330 Q1400 110 1420 170 L1440 540 H160 Z" fill="none" stroke="#1A1C24" strokeWidth={30} />
    <rect x={1300} y={80} width={40} height={500} fill="#15171E" />
    {/* the driver's seat ahead, the dash's glow */}
    <path d="M-600 420 Q400 340 560 380 L600 640 H-600 Z" fill="#221A16" />
    <g transform={`translate(${DASH.x} ${DASH.y})`}>
      <rect x={-140} y={-30} width={280} height={60} rx={8} fill="#0E0F14" stroke="#23252E" strokeWidth={3} />
      <MText x={-60} y={10} size={26} fill="#FF9A1F" font={F_MONO} stretch="100%" weight={700}>{on ? '23:41' : `23:${String(41 + Math.floor(f / 30) % 2).padStart(2, '0')}`}</MText>
      <g transform="translate(6 -20)">
        {['0', '1'].map((ch, i) => <Flap key={i} x={i * 30} y={0} w={28} h={40} a={i === 0 ? '2' : '8'} b={i === 0 ? '0' : '1'} flip={flipOff} ink="#FF9A1F" size={24} fill="#0E0F14" />)}
        <Flap x={64} y={0} w={64} h={40} a={z.month.slice(0, 3).toUpperCase()} b={z.next.slice(0, 3).toUpperCase()} flip={flipOff} ink={flipOff > 0.5 ? '#FF3B1E' : '#FF9A1F'} size={20} fill="#0E0F14" />
        {flipOff > 0.5 && <Glow x={60} y={20} r={200} ry={90} col="#FF3B1E" o={0.6 * bl} />}
      </g>
      <Glow x={0} y={0} r={260} ry={90} col="#FF6A4A" o={0.22} className={live(on, 'lp-breathe')} />
    </g>
    {/* the back seat */}
    <rect x={-600} y={SEAT.y} width={2800} height={400} fill="url(#crseat)" /><path d="M-600 600 H2200" stroke="#3A2E26" strokeWidth={6} />
    <path d="M1180 360 Q1180 300 1240 300 H1380 Q1420 300 1420 360 V900 H1180 Z" fill="#2A211C" />
    {[0, 1, 2].map((i) => <line key={i} x1={-600} y1={640 + i * 60} x2={1180} y2={640 + i * 60} stroke="rgba(0,0,0,.35)" strokeWidth={3} />)}
    <Glow x={DOC.x} y={SEAT.y + 60} r={420} ry={140} col="#FFC873" o={0.12} />
    {/* the contract and the pen (Done: the pen rolls to the line as the ink appears); the crest seal lands */}
    {!fake && <Contract x={DOC.x} y={DOC.y} c={o === 1 && call && f > TELL + 8 ? alt : to} rot={-8} s={0.9} sign={sign} void_={void_} />}
    {call && o === 1 && f > TELL + 8 && <Contract x={DOC.x - 140} y={DOC.y + 20} c={to} rot={-18} s={0.86} o={0.9} />}
    {fake && t < 1 && <Newspaper x={pa.x} y={pa.y} c={to} rot={-8 + t * 720} s={lerp(0.9, 0.35, t)} crumple={crumple} o={1 - cl((t - 0.8) / 0.2)} />}
    <g transform={`translate(${DOC.x + 80 - penRoll * 50} ${DOC.y + 40 - penRoll * 12}) rotate(${-30 + penRoll * 46})`}><rect x={-4} y={-52} width={8} height={104} rx={3} fill="#F7B928" /><path d="M-4 52 L0 68 L4 52 Z" fill="#15130F" /><rect x={-4} y={-52} width={8} height={12} fill="#15130F" /></g>
    {seal > 0 && <g transform={`translate(${DOC.x + 40} ${DOC.y + 50}) scale(${lerp(1.8, 1, seal)})`} opacity={cl(seal * 2)}><Shield x={0} y={0} s={0.55} c={to} rot={-8} /></g>}
    {gl > 0 && drop > 0 && <Glow x={DOC.x} y={DOC.y} r={240} ry={200} col={to.c1} o={gl * 0.7} />}
    {void_ > 0 && <Glow x={DOC.x} y={DOC.y} r={200} ry={160} col="#FF3B1E" o={0.35 * void_ * bl} />}
    {fake && bl > 0 && <Glow x={1300} y={300} r={320} ry={260} col="#FFE3A3" o={0.35 * bl} />}
    <Phones z={z} p1={{ x: 660, y: 650 }} p2={{ x: 1090, y: 660 }} rot1={-70} rot2={-104} s={0.78} />
    {/* the player's own club: a pennant from the mirror (Off: it stays, and lights) */}
    <g transform="translate(400 190)">
      <line x1={0} y1={-90} x2={0} y2={0} stroke="#3A342A" strokeWidth={3} />
      <path d="M-22 0 H22 L0 70 Z" fill={from.c1} stroke={from.c2} strokeWidth={3} opacity={0.6 + 0.4 * (call && o === 2 ? bl : 0)} transform={`rotate(${on ? 0 : noise(f / 20, 1) * 4})`} className={live(on, 'lp-sway')} />
      {call && o === 2 && bl > 0 && <Glow x={0} y={30} r={90} ry={110} col={from.c1} o={0.5 * bl} />}
    </g>
  </>;
}

export const agent: PlaceSpec = {
  Scene,
  cam: (o) => [
    { f: 0, x: 800, y: 460, z: 1.0 }, { f: 30, x: 810, y: 470, z: 1.04 }, { f: TELL, x: 830, y: 500, z: 1.1 },
    o === 0 ? { f: 100, x: 880, y: 600, z: 1.5 } : o === 1 ? { f: 100, x: 880, y: 620, z: 1.4 } : o === 2 ? { f: 100, x: 840, y: 540, z: 1.36 } : { f: 100, x: 1050, y: 440, z: 1.24 },
  ],
  cues: (o) => [{ f: 4, k: 'film.rain' }, ...(o === 0 ? [{ f: TELL + 6, k: 'film.ink' }, { f: TELL + 26, k: 'film.stamp' }] : o === 1 ? [{ f: TELL + 4, k: 'film.phone' }, { f: TELL + 12, k: 'film.phone2' }] : o === 2 ? [{ f: TELL + 2, k: 'film.board' }, { f: TELL + 22, k: 'film.stamp' }] : [{ f: TELL + 6, k: 'film.crumple' }, { f: TELL + 18, k: 'film.whoosh' }])],
};
