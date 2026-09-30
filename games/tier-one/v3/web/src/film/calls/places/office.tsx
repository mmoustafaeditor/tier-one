// The leak: the press office after hours, dark, the photocopier's light sweeping, a desk lamp, an envelope and a rubber
// stamp on the desk, the phone beside them. Done: the stamp comes down and the envelope carries the club's seal.
import { Glows, Glow, Cone, Motes, Envelope, Coffee, live, useLive, noise, k, lerp, cl, FLOOR, PAPER, MText, F_COND } from './world';
import { Phones, CalendarTell, PaperTell, doneDrop, heroGlow, TELL } from './tells';
import type { PlaceSpec, PlaceZ } from './spec';
import { EASE } from '../../kit';

const DESK = { x0: 720, x1: 1320, y: 620 }, COPIER = { x: 460, y: 520 }, ENV = { x: 1000, y: 606 }, CAL = { x: 1240, y: 300 };

function Scene(z: PlaceZ) {
  const { f, phase, o, to } = z;
  const on = useLive();
  const call = phase === 'call';
  const sweep = on ? 0.5 : (f % 36) / 36;
  const lit = 0.5 + 0.5 * Math.sin(sweep * Math.PI);
  const drop = doneDrop(z, 4);
  const gl = heroGlow(z);
  const seal = call && o === 0 ? k(f, TELL + 14, TELL + 18, EASE.out) : 0;
  // the stamp: lifts, hovers, slams (frames TELL+4 → TELL+14), then lifts off to reveal the seal
  const stampUp = call && o === 0 ? k(f, TELL + 2, TELL + 8, EASE.out) * (1 - k(f, TELL + 10, TELL + 14, EASE.in)) + k(f, TELL + 20, TELL + 28, EASE.out) * 0.5 : 0;
  const stampX = call && o === 0 ? lerp(1150, ENV.x, k(f, TELL + 2, TELL + 10, EASE.inOut)) : 1150;
  const lampFl = on ? 1 : 0.9 + 0.1 * noise(f / 8, 5);
  const feed = on ? 0 : cl(((f % 120) - 60) / 40);
  return <>
    <Glows cols={['#FFC873', '#B48CFF', '#D8F8FF', '#9FD8FF', to.c1, z.alt.c1, z.from.c1, '#FF6A48', '#FFE3A3', '#FFFFFF']} />
    <defs>
      <linearGradient id="ofw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0C0816" /><stop offset="0.5" stopColor="#221A36" /><stop offset="1" stopColor="#0A0712" /></linearGradient>
      <linearGradient id="off" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1E1A28" /><stop offset="1" stopColor="#07060A" /></linearGradient>
    </defs>
    <rect x={-1400} y={-1400} width={4400} height={1400 + FLOOR} fill="url(#ofw)" />
    <rect x={-1400} y={FLOOR} width={4400} height={1800} fill="url(#off)" />
    <rect x={-1400} y={FLOOR - 6} width={4400} height={12} fill="#050408" />
    {/* the blinds: the city behind, in slats */}
    <g opacity=".6">
      <rect x={780} y={140} width={420} height={300} fill="#0E1630" />
      {Array.from({ length: 18 }, (_, i) => <rect key={i} x={790 + (i * 53) % 400} y={190 + (i * 37) % 220} width={7} height={9} fill="#FFD58A" opacity={0.5 + 0.4 * (i % 3 === 0 ? 1 : 0)} />)}
      {Array.from({ length: 13 }, (_, i) => <rect key={'s' + i} x={776} y={140 + i * 23} width={428} height={13} fill="#1A1526" />)}
      <rect x={770} y={132} width={440} height={316} fill="none" stroke="#15101F" strokeWidth={10} />
    </g>
    <CalendarTell z={z} at={CAL} s={0.95} pennant={{ x: 1360, y: 250 }} />
    {/* the photocopier and its sweep */}
    <g transform={`translate(${COPIER.x} ${COPIER.y})`}>
      <rect x={-120} y={0} width={240} height={FLOOR - COPIER.y} rx={8} fill="#CFC9D8" /><rect x={-130} y={-24} width={260} height={30} rx={6} fill="#E6E1EE" />
      <rect x={-100} y={40} width={200} height={34} rx={4} fill="#1A1622" />
      <rect x={-90} y={90} width={180} height={12} rx={3} fill="#B9B4C2" />
      <g className={live(on, 'lp-copier')} transform={`translate(${on ? 0 : -100 + sweep * 200} 0)`}>
        <rect x={-14} y={-20} width={28} height={20} fill="#E8FFF4" opacity={on ? 1 : lit} />
        <Cone x={0} y={-24} w0={20} w1={140} h={-700} col="#D8F8FF" o={0.16 * (on ? 1 : lit)} />
        <Glow x={0} y={-24} r={140} ry={60} col="#D8F8FF" o={0.6 * (on ? 1 : lit)} />
      </g>
      {/* the page feeding into the tray */}
      <rect x={-84} y={104 - feed * 40} width={70} height={feed * 46} fill={PAPER} opacity=".9" />
      <rect x={-84} y={44} width={70} height={26} fill={PAPER} opacity=".5" />
      <circle cx={90} cy={16} r={5} fill="#2FBF71" opacity={on ? 1 : f % 30 < 15 ? 1 : 0.3} className={live(on, 'lp-led')} />
    </g>
    {/* the desk, the lamp and its pool */}
    <rect x={DESK.x0} y={DESK.y} width={DESK.x1 - DESK.x0} height={18} fill="#3A2E24" /><rect x={DESK.x0 + 20} y={DESK.y + 18} width={22} height={FLOOR - DESK.y - 18} fill="#2A2018" /><rect x={DESK.x1 - 42} y={DESK.y + 18} width={22} height={FLOOR - DESK.y - 18} fill="#2A2018" />
    <rect x={DESK.x0 + 60} y={DESK.y + 18} width={180} height={100} fill="#2A2018" />{[0, 1].map((i) => <rect key={i} x={DESK.x0 + 74} y={DESK.y + 34 + i * 40} width={152} height={28} rx={3} fill="#3A2E24" />)}
    <ellipse cx={DESK.x1 - 180} cy={DESK.y + 4} rx={260} ry={26} fill="#FFC873" opacity={0.13 * lampFl} />
    <g transform={`translate(${DESK.x1 - 60} ${DESK.y})`}>
      <ellipse cx={0} cy={0} rx={40} ry={9} fill="#26211A" /><path d="M0 0 L-24 -130 L-120 -190" stroke="#3A342A" strokeWidth={9} fill="none" strokeLinecap="round" />
      <path d="M-150 -210 L-60 -180 L-84 -134 L-166 -164 Z" fill="#3A342A" /><ellipse cx={-124} cy={-150} rx={26} ry={9} fill="#FFE3A3" opacity={lampFl} transform="rotate(20 -124 -150)" />
      <Glow x={-120} y={-146} r={100} col="#FFC873" o={0.6 * lampFl} className={live(on, 'lp-breathe')} />
      <Cone x={-124} y={-146} w0={30} w1={200} h={146} col="#FFC873" o={0.1 * lampFl} />
    </g>
    {/* the envelope, the rubber stamp, the coffee, the phones, the paper, the bin */}
    <Envelope x={ENV.x} y={ENV.y} c={to} rot={-6} s={0.9} seal={seal} />
    {call && o === 1 && f > TELL + 10 && <Envelope x={ENV.x - 20} y={ENV.y - 30} c={z.alt} rot={-10} s={0.88} seal={k(f, TELL + 16, TELL + 20)} />}
    {gl > 0 && drop > 0 && <Glow x={ENV.x} y={ENV.y} r={240} ry={170} col={to.c1} o={gl * 0.75} />}
    <g transform={`translate(${stampX} ${ENV.y - 26 - stampUp * 150})`}>
      <ellipse cx={0} cy={26 + stampUp * 150} rx={44} ry={10} fill="rgba(0,0,0,.35)" opacity={1 - stampUp * 0.6} />
      <rect x={-40} y={0} width={80} height={26} rx={4} fill="#3A2E24" /><rect x={-14} y={-52} width={28} height={54} rx={6} fill="#8A6A3A" /><ellipse cx={0} cy={-52} rx={18} ry={8} fill="#A8864A" />
      <rect x={-36} y={22} width={72} height={6} fill={to.c1} />
    </g>
    <Coffee x={1260} y={DESK.y - 6} s={0.8} f={f} />
    <Phones z={z} p1={{ x: 820, y: DESK.y - 12 }} p2={{ x: 1130, y: DESK.y - 8 }} rot1={-80} rot2={-100} s={0.72} />
    <PaperTell z={z} paper={{ x: 900, y: DESK.y - 16 }} bin={{ x: 640, y: FLOOR }} rot={-88} s={0.7} binS={1} />
    <Motes f={f} x={DESK.x1 - 260} y={DESK.y - 200} w={220} h={200} n={10} seed={13} />
    <g transform="translate(300 260)" opacity=".8"><rect x={-90} y={-30} width={180} height={60} rx={4} fill="#1A1622" stroke="#3A3150" strokeWidth={3} /><MText x={0} y={10} size={22} fill="#B48CFF" font={F_COND} spacing=".16em">PRESS</MText></g>
  </>;
}

export const leak: PlaceSpec = {
  Scene,
  cam: (o) => [
    { f: 0, x: 860, y: 470, z: 1.0 }, { f: 30, x: 880, y: 470, z: 1.03 }, { f: TELL, x: 900, y: 480, z: 1.06 },
    o === 0 ? { f: 100, x: 1000, y: 560, z: 1.5 } : o === 1 ? { f: 100, x: 980, y: 590, z: 1.34 } : o === 2 ? { f: 100, x: 1280, y: 330, z: 1.55 } : { f: 100, x: 700, y: 650, z: 1.36 },
  ],
  cues: (o) => [{ f: 4, k: 'film.copier' }, ...(o === 0 ? [{ f: TELL + 2, k: 'film.whoosh' }, { f: TELL + 12, k: 'film.stamp' }] : o === 1 ? [{ f: TELL + 4, k: 'film.phone' }, { f: TELL + 12, k: 'film.phone2' }] : o === 2 ? [{ f: TELL + 6, k: 'film.tear' }, { f: TELL + 24, k: 'film.flip' }] : [{ f: TELL + 8, k: 'film.crumple' }, { f: TELL + 31, k: 'film.bin' }])],
};
