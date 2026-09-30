// The source-call films (3.3): one short, wordless scene per source, drawn as paper-cut SVG and driven only by the
// frame. Nobody talks: what the source is telling you is in what they do, and it follows the clue's read (the best
// outcome of E.weights). One visual language across every source so it can be learned:
//   Done   → the buying club's colours are taken on (scarf worn, bag tagged, form ticked, contract signed).
//   Hijack → a third club's colours take their place.
//   Off    → the buying club's thing is torn up / taken off; the player's own club stays (its crest pops).
//   Fake   → the rumour (a newspaper with the buying club's crest) is screwed up and binned, with a shrug.
// Each set: a setup (0 → tell), the tell (the outcome's action) and a short hold to `end`. A repeat call starts at
// the tell. World: 1600×900 design units, floor at y 780; action stays within x ~380–1220 so phones can frame it.
import type { ReactNode } from 'react';
import { EASE, k01, noise, slam, camAt, type Key } from '../kit';
import { Figure, Phone, MirrorCtx, armTo, legTo, walk, STAND, INK, type Look, type Limb, type Pose } from './rig';
import { useContext } from 'react';

type Col = { c1: string; c2: string };
export type Z = { f: number; o: number; kit: { top: string; trim: string }; no: string; skin: string; acc: string; to: Col; alt: Col; from: Col };
export type Cam = { x: number; y: number; z: number };
export type Cue = { f: number; k: string };
export type SetSpec = { tell: number; end: number; cues: (o: number) => Cue[]; cam: (o: number) => Key[]; Scene: (z: Z) => ReactNode };
export const FLOOR = 780;
const HIPY = FLOOR - STAND - 2;

// ---------- helpers
const k = (f: number, a: number, b: number, e = EASE.inOut) => k01(f, a, b, e);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mixL = (a: Limb, b: Limb, t: number): Limb => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
/** A world point in a figure's local frame (for IK targets). */
const rel = (p: { x: number; y: number; s?: number; face?: number }, wx: number, wy: number) => ({ x: (wx - p.x) * (p.face || 1) / (p.s || 1), y: (wy - p.y) / (p.s || 1) });
const reach = (p: Pose, wx: number, wy: number, lean = p.lean || 0) => { const t = rel(p, wx, wy); return armTo(t.x, t.y, lean); };
const blinkOf = (f: number, seed = 0) => (f + seed * 37) % 94 < 3;
const arc = (t: number, x0: number, y0: number, x1: number, y1: number, h: number) => ({ x: lerp(x0, x1, t), y: lerp(y0, y1, t) - 4 * h * t * (1 - t) });
/** Walk a figure from x0 to x1 between frames a and b (face set by direction). */
function stroll(p: Pose, f: number, a: number, b: number, x0: number, x1: number) {
  if (f < a) { p.x = x0; return; }
  if (f >= b) { p.x = x1; return; }
  const w = walk((f - a) * 0.55);
  p.x = lerp(x0, x1, k(f, a, b, EASE.inOut)); p.y = HIPY + w.bob; p.face = x1 < x0 ? -1 : 1;
  Object.assign(p, { lF: w.lF, lB: w.lB, aF: w.aF, aB: w.aB });
}
const shrug = (t: number): Partial<Pose> => ({ aF: mixL([6, 10], [30, -110], t), aB: mixL([-6, 10], [-34, -100], t), head: 10 * t });
const laugh = (f: number): Partial<Pose> => ({ head: -12 + Math.sin(f * 0.9) * 3, mouth: 0.6 + 0.4 * Math.abs(Math.sin(f * 0.9)) });
/** Text that stays readable when the world is mirrored (RTL). */
function MText({ x, y, children, size = 30, fill = '#fff' }: { x: number; y: number; children: ReactNode; size?: number; fill?: string }) {
  const m = useContext(MirrorCtx);
  return <g transform={`translate(${x} ${y}) scale(${m} 1)`}><text textAnchor="middle" fontSize={size} fontWeight={900} fill={fill} style={{ fontFamily: '"Archivo","Arial Narrow",sans-serif', fontStretch: '72%' }}>{children}</text></g>;
}

// ---------- props
export function Shield({ x, y, s = 1, c, rot = 0 }: { x: number; y: number; s?: number; c: Col; rot?: number }) {
  return <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <path d="M-30 -34 H30 V2 Q30 30 0 44 Q-30 30 -30 2 Z" fill={c.c1} stroke={c.c2} strokeWidth={6} strokeLinejoin="round" />
    <path d="M-18 -10 L0 8 L18 -10" fill="none" stroke={c.c2} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
  </g>;
}
/** A crest that pops up over the tell: the club the action points to. */
function Pop({ x, y, f, at, c }: { x: number; y: number; f: number; at: number; c: Col }) {
  if (f < at) return null;
  const s = slam(f, 30, at, { damping: 10, stiffness: 180, mass: 0.7 });
  const up = k(f, at, at + 30, EASE.out) * 24;
  return <g opacity={Math.min(1, (f - at) / 3)}>
    <circle cx={x} cy={y - up} r={70 * s} fill={c.c1} opacity={0.18} />
    <circle cx={x} cy={y - up} r={52 * s} fill="none" stroke="#F4EFE4" strokeWidth={3} opacity={0.5} />
    <Shield x={x} y={y - up} s={1.1 * s} c={c} />
  </g>;
}
/** A striped scarf lying flat / carried (world). */
const ScarfFlat = ({ x, y, c, rot = 0 }: { x: number; y: number; c: Col; rot?: number }) => <g transform={`translate(${x} ${y}) rotate(${rot})`}>
  <rect x={-50} y={-9} width={100} height={18} rx={3} fill={c.c1} /><rect x={-26} y={-9} width={12} height={18} fill={c.c2} /><rect x={14} y={-9} width={12} height={18} fill={c.c2} />
  {[-48, -42, -36, 36, 42, 48].map((d) => <line key={d} x1={d} y1={9} x2={d} y2={18} stroke={c.c1} strokeWidth={3} />)}
</g>;
/** A scarf worn round the neck (figure-local, goes in Pose.over). */
const ScarfOn = ({ c }: { c: Col }) => <g>
  <path d="M-22 -138 Q2 -118 26 -136 L28 -120 Q2 -98 -24 -122 Z" fill={c.c1} />
  <path d="M12 -124 L26 -54 L10 -52 L0 -120 Z" fill={c.c1} /><path d="M15 -100 L22 -100 L24 -88 L17 -88 Z" fill={c.c2} /><path d="M18 -80 L25 -80 L26 -68 L19 -68 Z" fill={c.c2} />
</g>;
/** A sheet of paper: a form/contract (white, crest on top) or the rumour (newsprint, big headline + crest). */
function Sheet({ x, y, c, rot = 0, s = 1, news, tear = 0, crumple = 0, tick = 0, sign = 0 }: { x: number; y: number; c: Col; rot?: number; s?: number; news?: boolean; tear?: number; crumple?: number; tick?: number; sign?: number }) {
  const W = news ? 110 : 76, H = news ? 84 : 98;
  const face = (clip?: 'l' | 'r') => <g clipPath={clip ? `url(#cfsh${clip})` : undefined}>
    <rect x={-W / 2} y={-H / 2} width={W} height={H} fill={news ? '#DCD5C5' : '#F4EFE4'} stroke="rgba(0,0,0,.25)" strokeWidth={1.5} />
    {news ? <><rect x={-W / 2 + 8} y={-H / 2 + 8} width={W - 16} height={14} fill={INK} /><rect x={-W / 2 + 8} y={-H / 2 + 28} width={46} height={5} fill="#4A443A" /><rect x={-W / 2 + 8} y={-H / 2 + 38} width={46} height={5} fill="#4A443A" /><rect x={-W / 2 + 8} y={-H / 2 + 48} width={40} height={5} fill="#4A443A" /><Shield x={W / 2 - 26} y={10} s={0.52} c={c} /></>
      : <><Shield x={0} y={-H / 2 + 20} s={0.42} c={c} />{[0, 1, 2, 3].map((i) => <rect key={i} x={-W / 2 + 10} y={-H / 2 + 44 + i * 9} width={W - 20 - (i % 2) * 14} height={3.5} fill="#7E7769" />)}</>}
    {sign > 0 && <path d={`M${-W / 2 + 12} ${H / 2 - 12} q8 -14 14 0 t14 0 t14 -4 t12 2`} fill="none" stroke="#1B3A8A" strokeWidth={3} strokeDasharray={80} strokeDashoffset={80 * (1 - sign)} />}
    {tick > 0 && <path d={`M${-12} ${H / 2 - 22} l10 12 l22 -26`} fill="none" stroke="#1C8A50" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={60} strokeDashoffset={60 * (1 - tick)} />}
  </g>;
  if (crumple > 0) {
    const r = lerp(Math.max(W, H) / 2, 30, crumple);
    return <g transform={`translate(${x} ${y}) rotate(${rot + crumple * 90}) scale(${s})`}>
      {crumple < 0.6 && <g transform={`scale(${1 - crumple})`} opacity={1 - crumple / 0.6}>{face()}</g>}
      <circle r={r} fill={news ? '#D0C9B8' : '#EDE6D6'} opacity={Math.min(1, crumple * 2)} />
      <path d={`M${-r * 0.6} ${-r * 0.2} l${r * 0.5} ${r * 0.3} l${r * 0.4} ${-r * 0.5} M${-r * 0.2} ${r * 0.5} l${r * 0.6} ${-r * 0.2}`} stroke="rgba(0,0,0,.25)" strokeWidth={2} fill="none" opacity={crumple} />
    </g>;
  }
  if (tear > 0) {
    const d = tear * 34, fall = Math.max(0, tear - 0.4) ** 2 * 260;
    return <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs><clipPath id="cfshl"><path d={`M${-W} ${-H} H2 l-6 ${H * 0.3} l8 ${H * 0.3} l-6 ${H * 0.5} V${H} H${-W} Z`} /></clipPath><clipPath id="cfshr"><path d={`M${W} ${-H} H2 l-6 ${H * 0.3} l8 ${H * 0.3} l-6 ${H * 0.5} V${H} H${W} Z`} /></clipPath></defs>
      <g transform={`translate(${-d} ${fall}) rotate(${rot - tear * 28})`}>{face('l')}</g>
      <g transform={`translate(${d} ${fall * 1.2}) rotate(${rot + tear * 34})`}>{face('r')}</g>
    </g>;
  }
  return <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>{face()}</g>;
}
const Bin = ({ x, hit = 0 }: { x: number; hit?: number }) => <g transform={`translate(${x} ${FLOOR}) rotate(${Math.sin(hit * 14) * 6 * (1 - hit)})`}>
  <path d="M-34 -92 H34 L28 0 H-28 Z" fill="#4A4F58" /><path d="M-38 -96 H38 V-88 H-38 Z" fill="#5E646E" />{[-16, 0, 16].map((d) => <line key={d} x1={d} y1={-84} x2={d * 0.85} y2={-8} stroke="#3A3F48" strokeWidth={4} />)}
</g>;
const Shadow = ({ x, w = 70, o = 0.35 }: { x: number; w?: number; o?: number }) => <ellipse cx={x} cy={FLOOR + 4} rx={w} ry={10} fill={`rgba(0,0,0,${o})`} />;
function Room({ wall, floor, id, glow, gx = 800, gy = 260 }: { wall: [string, string]; floor: [string, string]; id: string; glow: string; gx?: number; gy?: number }) {
  return <>
    <defs>
      <linearGradient id={id + 'w'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={wall[0]} /><stop offset="1" stopColor={wall[1]} /></linearGradient>
      <linearGradient id={id + 'f'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={floor[0]} /><stop offset="1" stopColor={floor[1]} /></linearGradient>
      <radialGradient id={id + 'g'} cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor={glow} stopOpacity=".5" /><stop offset="1" stopColor={glow} stopOpacity="0" /></radialGradient>
    </defs>
    <rect x={-1400} y={-1400} width={4400} height={1400 + FLOOR} fill={`url(#${id}w)`} />
    <rect x={-1400} y={FLOOR} width={4400} height={1800} fill={`url(#${id}f)`} />
    <rect x={-1400} y={FLOOR - 4} width={4400} height={8} fill="rgba(0,0,0,.35)" />
    <ellipse cx={gx} cy={gy} rx={760} ry={560} fill={`url(#${id}g)`} />
  </>;
}
function Pendant({ x, y = 150, col = '#FFC873', f }: { x: number; y?: number; col?: string; f: number }) {
  const fl = 0.85 + 0.15 * noise(f / 9, x);
  return <g>
    <line x1={x} y1={-900} x2={x} y2={y - 30} stroke="#0A0806" strokeWidth={4} />
    <path d={`M${x - 170} ${FLOOR} L${x - 46} ${y} H${x + 46} L${x + 170} ${FLOOR} Z`} fill={col} opacity={0.07 * fl} />
    <path d={`M${x - 46} ${y} Q${x} ${y - 58} ${x + 46} ${y} Z`} fill="#2A241C" />
    <ellipse cx={x} cy={y} rx={30} ry={7} fill={col} opacity={fl} />
  </g>;
}
function ShirtOnHanger({ x, y, rot = 0, top, trim, no, s = 1 }: { x: number; y: number; rot?: number; top: string; trim: string; no: string; s?: number }) {
  return <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <path d="M0 0 V-12 Q0 -20 7 -20" fill="none" stroke="#B9AE98" strokeWidth={3} />
    <path d="M-44 20 L0 2 L44 20" fill="none" stroke="#8A7348" strokeWidth={5} />
    <path d="M-30 10 L-62 30 L-50 62 L-36 56 V150 H36 V56 L50 62 L62 30 L30 10 C24 22 12 26 0 26 S-24 22 -30 10 Z" fill={top} />
    <path d="M-30 10 C-24 22 -12 26 0 26 S24 22 30 10" fill="none" stroke={trim} strokeWidth={4} />
    <MText x={0} y={108} size={50} fill={trim}>{no}</MText>
  </g>;
}
function Bag({ x, y, tag, tagSwing = 0, s = 1, shirt }: { x: number; y: number; tag?: Col; tagSwing?: number; s?: number; shirt?: { top: string; trim: string } }) {
  return <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-44 -40 Q0 -84 44 -40" fill="none" stroke="#15130F" strokeWidth={8} />
    {shirt && <path d="M-30 -44 L-10 -60 L14 -52 L30 -40 Z" fill={shirt.top} stroke={shirt.trim} strokeWidth={3} />}
    <rect x={-80} y={-44} width={160} height={74} rx={30} fill="#2C2F36" /><rect x={-80} y={-12} width={160} height={8} fill="#3E424B" />
    {tag && <g transform={`translate(40 -54) rotate(${tagSwing})`}><line x1={0} y1={0} x2={0} y2={20} stroke="#B9AE98" strokeWidth={2} /><Shield x={0} y={40} s={0.5} c={tag} /></g>}
  </g>;
}

// ================================================================= BARBER
// Setup: last pass of the clippers, hair falling; the cape comes off, the player gets out of the chair.
// Done/Hijack: he wraps a scarf from the counter round his neck (the buying club's / another club's) and takes a
// selfie. Off: he picks the buying club's scarf up, shakes his head, puts it back; the barber rings next month on the
// calendar. Fake: the barber holds up the paper with the rumour, the player laughs, it goes in the bin.
const BARBER_LOOK: Omit<Look, 'skin'> = { top: '#E9E2D3', bottom: '#2A2420', hair: '#1B1511', apron: '#2B2A30', beard: true, legs: 'trousers', shoe: '#0E0C0A' };
function Barber(z: Z) {
  const { f, o } = z;
  const T = SETS.barber.tell;
  const seat = { x: 800, y: 590 }, up0 = 32, up1 = 46;
  const up = k(f, up0, up1);
  // ---- the player (faces the mirror/counter, left)
  const pl: Look = { top: z.kit.top, trim: z.kit.trim, no: z.no, bottom: '#1E2230', skin: z.skin, hair: INK, legs: 'trousers', shoe: '#F4EFE4', sleeve: 'short' };
  const P: Pose = { x: lerp(seat.x, 780, up), y: lerp(seat.y, HIPY, up), face: -1, blink: blinkOf(f, 1),
    lF: mixL(legTo(86, 88), legTo(10, STAND), up), lB: mixL(legTo(78, 92), legTo(-8, STAND), up), aF: [18, 60], aB: [8, 50], head: f < 30 ? -4 + Math.sin(f * 0.2) * 2 : 0 };
  if (f < 34) P.over = <path d="M-18 -134 Q0 -142 20 -134 L118 16 Q96 30 70 22 Q40 34 12 24 Q-20 34 -46 22 Z" fill="#EDE6D6" stroke={z.acc} strokeWidth={4} />;
  if (f >= up1 - 4 && f < T) P.aF = mixL([18, 60], armTo(14, -196), k(f, up1 - 6, up1)); // hand to the fresh cut
  const scarfC = o === 1 ? z.alt : z.to;
  const counter = { y: 600, scarf: 600, alt: 540 };
  let scarf = { x: counter.scarf, y: counter.y - 8, rot: 0, on: false };
  let paper: { x: number; y: number; crumple: number; rot: number } | null = null;
  let binHit = 0, calCircle = 0, flash = 0, popC: Col | null = null, popAt = 0, popX = 0, popY = 0;
  // ---- the barber (behind the chair, right)
  const B: Pose = { x: 915, y: HIPY, s: 1.06, face: -1, lean: f < 30 ? 12 : 0, blink: blinkOf(f, 2), aF: armTo(26, -70), aB: armTo(30, -66) };
  if (f < 30) { const a = f * 0.55; B.aF = reach(B, seat.x - 20 + Math.cos(a) * 16, seat.y - 176 + Math.sin(a) * 14, 12); B.aB = armTo(40, -40, 12); }
  else if (f < 38) { B.aF = mixL(reach(B, seat.x + 10, seat.y - 130, 0), [150, 20], k(f, 30, 36)); }
  else B.aF = mixL([150, 20], armTo(26, -70), k(f, 38, 44));
  const capeFly = k(f, 32, 42, EASE.out);
  // ---- the tell
  if (f >= T) {
    if (o <= 1 || o === 2) {
      stroll(P, f, T, T + 12, 780, 700);
      if (f >= T + 12) {
        const pick = o === 1 ? lerp(counter.scarf, counter.alt, k(f, T + 12, T + 18)) : counter.scarf;
        if (f < T + 18) { P.lean = 18 * k(f, T + 12, T + 16); P.aF = reach(P, pick, counter.y - 10, P.lean); }
        else if (o <= 1) {
          // lift to the neck, then the selfie
          const t = k(f, T + 18, T + 26);
          P.lean = lerp(18, 0, t);
          scarf = { x: lerp(pick, P.x - 20, t), y: lerp(counter.y - 10, HIPY - 128, t), rot: t * -30, on: f >= T + 26 };
          if (!scarf.on) P.aF = reach(P, scarf.x, scarf.y, P.lean);
          else { P.face = 1; P.aF = mixL(armTo(20, -110), armTo(56, -224), k(f, T + 28, T + 36)); P.hold = <Phone lit={0.9} col="#CFEAFF" />; P.mouth = 0.3; P.head = -6; }
          if (f >= T + 38) { flash = Math.exp(-(f - T - 38) / 2.4); popC = scarfC; popAt = T + 39; popX = P.x + 70; popY = 250; }
          // the other scarf stays behind on the counter for a hijack
        } else {
          // Off: holds it up, shakes his head, puts it back
          const t = k(f, T + 18, T + 24), back = k(f, T + 32, T + 38);
          P.lean = lerp(18, 0, t) + back * 16;
          scarf = { x: lerp(counter.scarf, P.x - 60, t - back), y: lerp(counter.y - 10, HIPY - 150, t - back), rot: 0, on: false };
          P.aF = reach(P, scarf.x, scarf.y, P.lean);
          P.head = f >= T + 22 && f < T + 34 ? Math.sin((f - T - 22) * 0.9) * 9 : 0;
          if (f >= T + 42) { P.face = 1; P.lean = 0; P.aF = mixL(armTo(10, 20), armTo(22, -84), k(f, T + 42, T + 48)); popC = z.from; popAt = T + 46; popX = P.x; popY = 250; }
        }
      }
      if (o === 2) {
        // the barber books him in for next month
        stroll(B, f, T + 4, T + 18, 915, 1010);
        if (f >= T + 18) { B.face = 1; B.aF = reach(B, 1062 + Math.cos((f - T) * 0.5) * 14 * k(f, T + 24, T + 40), 352 + Math.sin((f - T) * 0.5) * 12 * k(f, T + 24, T + 40)); B.head = -10; calCircle = k(f, T + 24, T + 40, EASE.out); }
      } else if (f >= T + 34) { const c = Math.sin((f - T) * 1.2); B.aF = armTo(44 + c * 8, -74); B.aB = armTo(40 - c * 8, -70); B.mouth = 0.4; }
    } else {
      // Fake: the barber fetches the paper, shows it; the player laughs; it's screwed up and binned.
      P.face = 1;
      stroll(B, f, T, T + 10, 915, 985);
      if (f >= T + 10) { B.face = f < T + 16 ? 1 : -1; }
      const pT = k(f, T + 10, T + 18);
      if (f >= T + 10) {
        paper = { x: lerp(1060, B.x - 60, pT), y: lerp(636, 470, pT), crumple: k(f, T + 30, T + 38), rot: 0 };
        if (f >= T + 38) { const tt = k(f, T + 38, T + 50, EASE.in); const a = arc(tt, B.x - 50, 470, 1150, 720, 140); paper = { ...paper, x: a.x, y: a.y, rot: tt * 400 }; binHit = k(f, T + 50, T + 60, EASE.out); }
        B.aF = f < T + 44 ? reach(B, paper.x, paper.y) : mixL(reach(B, 1100, 500), armTo(26, -70), k(f, T + 44, T + 52));
        if (f >= T + 18 && f < T + 30) B.aB = reach(B, paper.x + 30, paper.y + 10);
        B.mouth = f >= T + 30 ? 0.5 : 0;
      }
      if (f >= T + 18) Object.assign(P, laugh(f), { aF: [60 + Math.sin(f * 0.8) * 20, 40] });
      if (f >= T + 50) P.head = Math.sin(f * 0.5) * 6;
    }
  }
  // ---- hair
  const hair: ReactNode[] = [];
  for (let i = 0; i < 22; i++) {
    const t0 = 2 + i * 1.3; if (f < t0) continue;
    const d = f - t0, x0 = seat.x - 14 + ((i * 37) % 40) - 20, y0 = seat.y - 186 + ((i * 17) % 30);
    const land = FLOOR + 2 - (i % 5) * 3;
    const y = Math.min(land, y0 + 1.6 * d + 0.32 * d * d), x = x0 + Math.sin(d * 0.3 + i) * 10 - d * 0.5 * (i % 2);
    hair.push(<rect key={i} x={x} y={y} width={3} height={11} rx={1.5} fill="#1B1511" transform={`rotate(${(i * 47 + d * 9) % 360} ${x} ${y})`} />);
  }
  if (scarf.on) P.over = <ScarfOn c={scarfC} />;
  const poleOff = (f * 3) % 48;
  return <>
    <Room id="cfb" wall={['#4A2E16', '#23160B']} floor={['#3A2A1C', '#120C07']} glow="#FFB25A" gx={760} gy={330} />
    <defs>
      <pattern id="cfbchk" width="80" height="80" patternUnits="userSpaceOnUse"><rect width="80" height="80" fill="#2A2018" /><rect width="40" height="40" fill="#D8CCB4" opacity=".22" /><rect x="40" y="40" width="40" height="40" fill="#D8CCB4" opacity=".22" /></pattern>
      <clipPath id="cfbpole"><rect x={1222} y={300} width={36} height={190} rx={18} /></clipPath>
    </defs>
    <rect x={-1400} y={FLOOR} width={4400} height={220} fill="url(#cfbchk)" opacity=".8" />
    <rect x={-1400} y={640} width={4400} height={140} fill="#2A1A0E" /><rect x={-1400} y={636} width={4400} height={8} fill="#5A3A1E" />
    {/* the pole */}
    <rect x={1214} y={284} width={52} height={16} rx={6} fill="#D9C9A8" /><rect x={1214} y={490} width={52} height={16} rx={6} fill="#D9C9A8" />
    <g clipPath="url(#cfbpole)"><rect x={1222} y={250} width={36} height={300} fill="#fff" />
      {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M1222 ${250 + i * 48 + poleOff} l36 -30 v14 l-36 30 z`} fill={i % 2 ? '#2B4FD8' : '#E23B2E'} />)}</g>
    {/* mirror + bulbs over the counter */}
    <rect x={430} y={220} width={230} height={260} rx={14} fill="#8A6A3A" /><rect x={442} y={232} width={206} height={236} rx={8} fill="#2E3A40" />
    <path d="M460 460 L550 250 M500 470 L590 260" stroke="#fff" strokeOpacity=".12" strokeWidth={14} />
    {[0, 1, 2, 3].map((i) => <circle key={i} cx={466 + i * 52} cy={208} r={9} fill="#FFE3A3" opacity={0.7 + 0.3 * noise(f / 7, i)} />)}
    {/* the calendar */}
    <g transform="translate(1000 290)"><rect width={130} height={150} fill="#F4EFE4" /><rect width={130} height={30} fill="#C9381A" />
      {Array.from({ length: 15 }, (_, i) => <rect key={i} x={10 + (i % 5) * 23} y={42 + Math.floor(i / 5) * 32} width={16} height={16} fill="#CFC6B3" />)}
      {calCircle > 0 && <circle cx={64} cy={76} r={22} fill="none" stroke="#C9381A" strokeWidth={5} strokeDasharray={140} strokeDashoffset={140 * (1 - calCircle)} transform="rotate(-90 64 76)" />}</g>
    <Pendant x={780} y={130} f={f} />
    {/* counter */}
    <rect x={420} y={counter.y + 8} width={250} height={FLOOR - counter.y - 8} fill="#3E2614" /><rect x={410} y={counter.y} width={270} height={12} rx={3} fill="#6B4424" />
    {[0, 1, 2].map((i) => <rect key={i} x={440 + i * 30} y={counter.y - 40 - (i % 2) * 10} width={20} height={40 + (i % 2) * 10} rx={5} fill={['#2F7F6F', '#B0442A', '#D9A441'][i]} opacity=".85" />)}
    {o === 1 && !(f >= T + 18) && <ScarfFlat x={counter.alt} y={counter.y - 8} c={z.alt} />}
    {o === 1 && f >= T + 18 && <ScarfFlat x={counter.scarf} y={counter.y - 8} c={z.to} />}
    {o !== 3 && !scarf.on && <ScarfFlat x={scarf.x} y={scarf.y} c={o === 1 && f < T + 18 ? z.to : scarfC} rot={scarf.rot} />}
    {/* side table with the paper, the bin */}
    <rect x={1010} y={640} width={120} height={10} fill="#6B4424" /><rect x={1060} y={650} width={10} height={FLOOR - 650} fill="#4A3220" />
    {o === 3 && !paper && <Sheet x={1060} y={626} c={z.to} news rot={-80} s={0.7} />}
    <Bin x={1150} hit={binHit} />
    {/* the chair */}
    <rect x={836} y={440} width={30} height={160} rx={10} fill="#8C1E1E" transform="rotate(8 851 600)" />
    <rect x={730} y={594} width={150} height={40} rx={10} fill="#A32424" />
    <rect x={786} y={634} width={20} height={130} fill="#B9AE98" /><ellipse cx={796} cy={772} rx={70} ry={10} fill="#8A7E6A" />
    <rect x={690} y={676} width={70} height={10} rx={4} fill="#B9AE98" />
    {f >= 32 && capeFly < 1 && <g transform={`translate(${lerp(P.x, 1080, capeFly)} ${lerp(P.y - 60, 420, capeFly)}) rotate(${capeFly * 50}) scale(${1 - capeFly * 0.4})`} opacity={1 - capeFly}><path d="M-60 -60 Q0 -80 60 -60 L90 60 Q0 80 -90 60 Z" fill="#EDE6D6" stroke={z.acc} strokeWidth={4} /></g>}
    <Shadow x={B.x} /><Shadow x={P.x} w={up > 0.5 ? 60 : 30} />
    <Figure look={pl} p={P} />
    <Figure look={{ ...BARBER_LOOK, skin: '#B77B52' }} p={{ ...B, hold: f < 36 ? <g transform="rotate(90) translate(-6 -12)"><rect width={40} height={16} rx={6} fill="#1D1D22" /><rect x={36} y={2} width={8} height={12} fill="#C9C2B0" /></g> : undefined }} />
    {paper && <Sheet x={paper.x} y={paper.y} c={z.to} news crumple={paper.crumple} rot={paper.rot} />}
    {hair}
    {flash > 0.02 && <circle cx={P.x + 60} cy={P.y - 230} r={260} fill="#fff" opacity={flash * 0.7} />}
    {popC && <Pop x={popX} y={popY} f={f} at={popAt} c={popC} />}
  </>;
}

// ================================================================= KIT MAN
// Setup: he walks to the player's locker (nameplate, number) and opens it.
// Done: the shirt and the nameplate go into a kit bag; he ties the buying club's tag on it.
// Hijack: packed into the buying club's bag, then another club's bag lands on the bench and the shirt goes in that.
// Off: the shirt comes out of the buying club's bag and back on its hanger; the tag goes in the bin; locker shut.
// Fake: everything as it always is; he shrugs, shuts the locker and bins the paper with the rumour.
function KitMan(z: Z) {
  const { f, o } = z;
  const T = SETS.kitman.tell;
  const L = { x: 700, y: 330 };
  const K: Pose = { x: 1150, y: HIPY, face: -1, s: 1.04, blink: blinkOf(f) };
  stroll(K, f, 0, 22, 1150, 830);
  let open = k(f, 22, 32);
  if (f >= 22 && f < 32) K.aF = reach(K, 760 - open * 80, 520);
  const inLocker0 = o !== 2; // Off: the shirt starts in the bag
  let shirt = inLocker0 ? { x: L.x, y: L.y + 50, s: 0.9, show: true } : { x: 900, y: 580, s: 0.5, show: false };
  let plate = { x: L.x, y: L.y, show: true };
  let bagA: { tag?: Col; shirt?: boolean } | null = o === 0 ? { shirt: false } : o === 1 || o === 2 ? { tag: z.to, shirt: o === 2 } : null;
  let bagB = { y: -300, show: false }, tag: { x: number; y: number } | null = null, tagOnA = o === 0 ? false : !!bagA?.tag;
  let paper: { x: number; y: number; crumple: number; rot: number } | null = o === 3 ? { x: 870, y: 632, crumple: 0, rot: -90 } : null;
  let binHit = 0, popC: Col | null = null, popAt = 0, popX = 900, popY = 300;
  const bagX = 920, bagY = 610;
  if (f >= T) {
    if (o === 0 || o === 1) {
      // shirt out of the locker and into the bag
      const t1 = k(f, T, T + 8), t2 = k(f, T + 8, T + 18);
      if (f < T + 18) { shirt = { x: lerp(L.x, bagX, t2), y: lerp(L.y + 50, bagY - 40, t2), s: lerp(0.9, 0.5, t2), show: true }; K.face = t2 > 0.4 ? 1 : -1; K.aF = reach(K, f < T + 8 ? lerp(K.x - 60, L.x, t1) : shirt.x, f < T + 8 ? lerp(520, L.y + 20, t1) : shirt.y - 20); }
      else { shirt.show = false; if (bagA) bagA.shirt = true; }
      if (o === 0) {
        if (f >= T + 18 && f < T + 32) { const t = k(f, T + 20, T + 30); K.face = t < 0.5 ? -1 : 1; plate = { x: lerp(L.x, bagX - 20, t), y: lerp(L.y, bagY - 30, t), show: t < 1 }; K.aF = reach(K, f < T + 20 ? L.x : plate.x, f < T + 20 ? L.y : plate.y); }
        if (f >= T + 32) { plate.show = false; K.face = 1; const t = k(f, T + 32, T + 44); tag = { x: lerp(K.x + 30, bagX + 40, t), y: lerp(HIPY - 60, bagY - 40, t) }; K.aF = reach(K, tag.x, tag.y); K.lean = 10 * t; if (f >= T + 44) { tag = null; tagOnA = true; if (bagA) bagA.tag = z.to; K.aF = armTo(20, -40); popC = z.to; popAt = T + 46; popX = bagX; popY = 360; } }
      } else {
        bagB.show = f >= T + 20; bagB.y = f < T + 28 ? lerp(-300, bagY, k(f, T + 20, T + 28, EASE.in)) : bagY;
        if (f >= T + 30) { K.face = 1; K.head = -8; }
        if (f >= T + 36) { const t = k(f, T + 36, T + 50); shirt = { x: lerp(bagX, 1070, t), y: bagY - 40 - Math.sin(t * Math.PI) * 60, s: 0.5, show: t < 1 }; if (bagA) bagA.shirt = t < 0.1; K.aF = reach(K, shirt.x, shirt.y); if (f >= T + 50) { K.aF = armTo(20, -40); popC = z.alt; popAt = T + 50; popX = 1070; popY = 360; } }
      }
    } else if (o === 2) {
      // Off: shirt out of the bag, back on the hanger; tag off to the bin; door shut
      K.face = 1;
      if (f < T + 20) { const t = k(f, T + 4, T + 18); K.face = t > 0.5 ? -1 : 1; shirt = { x: lerp(bagX, L.x, t), y: lerp(bagY - 40, L.y + 50, t), s: lerp(0.5, 0.9, t), show: f >= T + 4 }; if (bagA) bagA.shirt = f < T + 4; K.aF = reach(K, f < T + 4 ? bagX : shirt.x, f < T + 4 ? bagY - 30 : shirt.y - 30); }
      else { shirt = { x: L.x, y: L.y + 50, s: 0.9, show: true }; }
      if (f >= T + 20 && f < T + 40) {
        K.face = 1; const t = k(f, T + 20, T + 26);
        if (f < T + 26) K.aF = reach(K, bagX + 40, bagY - 40);
        else { tagOnA = false; const a = arc(k(f, T + 26, T + 38, EASE.in), bagX + 40, bagY - 40, 1180, 710, 120); tag = { x: a.x, y: a.y }; K.aF = mixL(reach(K, bagX + 60, bagY - 70), [140, 10], t); binHit = k(f, T + 38, T + 48, EASE.out); if (f >= T + 38) tag = null; }
      }
      if (f >= T + 40) { K.face = -1; open = 1 - k(f, T + 40, T + 48); K.aF = reach(K, 760 - open * 80, 520); if (f >= T + 50) { K.aF = reach(K, 740 + Math.sin(f * 0.9) * 6, 520 + Math.sin(f * 0.9) * 10); popC = z.from; popAt = T + 50; popX = L.x; popY = 250; } }
    } else {
      // Fake: shrug, shut the locker, bin the paper
      Object.assign(K, shrug(k(f, T, T + 8) - k(f, T + 16, T + 22)));
      if (f >= T + 20 && f < T + 32) { open = 1 - k(f, T + 22, T + 30); K.aF = reach(K, 760 - open * 80, 520); }
      if (f >= T + 30) open = 0;
      if (f >= T + 32 && paper) {
        K.face = 1; const pk = k(f, T + 32, T + 38);
        paper = { x: lerp(870, K.x + 40, pk), y: lerp(632, HIPY - 70, pk), crumple: k(f, T + 38, T + 44), rot: lerp(-90, 0, pk) };
        if (f >= T + 44) { const a = arc(k(f, T + 44, T + 54, EASE.in), K.x + 40, HIPY - 70, 1180, 720, 110); paper = { ...paper, x: a.x, y: a.y, rot: f * 20 }; binHit = k(f, T + 54, T + 64, EASE.out); }
        K.aF = f < T + 46 ? reach(K, paper.x, paper.y) : mixL(reach(K, 1100, 520), armTo(20, -40), k(f, T + 46, T + 54));
        if (f >= T + 36 && f < T + 44) K.aB = reach(K, paper.x - 10, paper.y + 10);
      }
    }
  }
  const kmLook: Look = { top: '#2F6B45', trim: '#F4EFE4', bottom: '#1B2A22', skin: '#E3B48E', hair: '#9A948A', bald: true, beard: true, sleeve: 'long', legs: 'trousers', shoe: '#0E0C0A' };
  const lockers = [460, 580, 700, 820, 940, 1060];
  return <>
    <Room id="cfk" wall={['#26382C', '#101A13']} floor={['#2A2A24', '#0C0C0A']} glow="#FFE3A3" gx={760} gy={260} />
    <g opacity=".1">{Array.from({ length: 12 }, (_, i) => <line key={i} x1={-1400} y1={i * 70} x2={3000} y2={i * 70} stroke="#DDE8DD" strokeWidth={2} />)}</g>
    {lockers.map((x) => {
      const mine = x === L.x, op = mine ? open : 0;
      return <g key={x}>
        <rect x={x - 56} y={290} width={112} height={FLOOR - 140 - 290} fill="#1A140E" />
        {!mine && <MText x={x} y={318} size={20} fill="#C9C2B0">{String(((x / 60) | 0) % 30 + 1)}</MText>}
        <rect x={x - 56} y={290} width={112 * (1 - op * 0.82)} height={FLOOR - 140 - 290} fill="#5A4630" stroke="#3A2E20" strokeWidth={5} />
        {op < 0.3 && <rect x={x - 40} y={340} width={80 * (1 - op * 0.82)} height={10} rx={4} fill="#3A2E20" />}
      </g>;
    })}
    <rect x={380} y={FLOOR - 140} width={740} height={140} fill="#2A2018" /><rect x={376} y={FLOOR - 146} width={748} height={10} fill="#4A3A28" />
    {shirt.show && <ShirtOnHanger x={shirt.x} y={shirt.y} top={z.kit.top} trim={z.kit.trim} no={z.no} s={shirt.s} rot={open > 0.9 && shirt.x === L.x ? Math.sin(f * 0.1) * 2 : 0} />}
    {plate.show && <g transform={`translate(${plate.x} ${plate.y})`}><rect x={-34} y={-16} width={68} height={32} rx={4} fill={z.kit.top} stroke={z.kit.trim} strokeWidth={3} /><MText x={0} y={11} size={28} fill={z.kit.trim}>{z.no}</MText></g>}
    <Pendant x={760} y={110} f={f} />
    {/* bench */}
    <rect x={560} y={640} width={640} height={16} rx={4} fill="#6B4A2A" /><rect x={580} y={656} width={14} height={FLOOR - 656} fill="#4A3220" /><rect x={1170} y={656} width={14} height={FLOOR - 656} fill="#4A3220" />
    {bagA && <Bag x={bagX} y={bagY} tag={tagOnA ? (bagA.tag || z.to) : undefined} tagSwing={Math.sin(f * 0.3) * 8} shirt={bagA.shirt ? z.kit : undefined} />}
    {bagB.show && <Bag x={1070} y={bagB.y} tag={z.alt} tagSwing={Math.sin(f * 0.4) * 10} shirt={f >= T + 50 ? z.kit : undefined} />}
    <Bin x={1200} hit={binHit} />
    {tag && <Shield x={tag.x} y={tag.y} s={0.5} c={o === 2 ? z.to : z.to} rot={f * 8} />}
    <Shadow x={K.x} />
    <Figure look={kmLook} p={K} />
    {paper && <Sheet x={paper.x} y={paper.y} c={z.to} news crumple={paper.crumple} rot={paper.rot} s={0.8} />}
    {popC && <Pop x={popX} y={popY} f={f} at={popAt} c={popC} />}
  </>;
}

// ================================================================= PHYSIO
// Setup: the player on the table, hamstring stretch; he sits up and hops off.
// Done: the physio ticks the buying club's medical form and they shake hands. Hijack: the top form lifts away to show
// another club's, that one is ticked. Off: the form is torn in two. Fake: the paper with the rumour goes in the bin.
function Physio(z: Z) {
  const { f, o } = z;
  const T = SETS.physio.tell;
  const lieHip = { x: 620, y: 534 }, sitHip = { x: 800, y: 556 };
  const sit = k(f, 26, 36), hop = k(f, 36, 44);
  const legUp = f < 26 ? 62 + 22 * (0.5 + 0.5 * Math.sin(f * 0.22 - 1.4)) : lerp(84, 0, k(f, 24, 30));
  const pl: Look = { top: z.kit.top, trim: z.kit.trim, no: z.no, bottom: z.kit.trim === '#F4EFE4' ? '#1E2230' : z.kit.trim, skin: z.skin, hair: INK, socks: z.kit.top, shoe: '#15130F', sleeve: 'short' };
  let pRot = lerp(-90, 0, sit), px = lerp(lieHip.x, sitHip.x, sit), py = lerp(lieHip.y, sitHip.y, sit);
  const seated: [Limb, Limb] = [legTo(80, 76), legTo(72, 80)];
  const pP: Pose = { x: 0, y: 0, face: 1, blink: blinkOf(f, 4), head: f < 26 ? -8 : 0, mouth: f < 26 && Math.sin(f * 0.22 - 1.4) > 0.8 ? 0.6 : 0,
    lF: mixL([legUp, 0], seated[0], sit), lB: mixL([4, 2], seated[1], sit), aF: mixL([170, 0], [20, 30], sit), aB: mixL([176, 0], [16, 30], sit) };
  if (f >= 36) { px = lerp(sitHip.x, 850, hop); py = lerp(sitHip.y, HIPY, hop) - Math.sin(hop * Math.PI) * 30; pP.lF = mixL(seated[0], legTo(10, STAND), hop); pP.lB = mixL(seated[1], legTo(-8, STAND), hop); }
  const la = (legUp * Math.PI) / 180;
  const ankle = { x: lieHip.x + 150 * Math.cos(la), y: lieHip.y - 150 * Math.sin(la) };
  const ph: Pose = { x: 930, y: HIPY, face: -1, s: 1.04, blink: blinkOf(f, 5), lean: f < 26 ? 12 : 0 };
  if (f < 28) { ph.aF = reach(ph, ankle.x, ankle.y, 12); ph.aB = reach(ph, ankle.x + 30, ankle.y + 60, 12); }
  if (f >= 28) { ph.x = lerp(930, 1010, k(f, 28, 40)); }
  const trolley = { x: 1130, y: 600 };
  let sheet: { x: number; y: number; rot: number; c: Col; news?: boolean; tick: number; tear: number; crumple: number; under?: Col; lift: number } | null = null;
  let binHit = 0, popC: Col | null = null, popAt = 0, popX = 920, popY = 250;
  // clipboard/form on the trolley at the start
  const onTrolley = { x: trolley.x, y: trolley.y - 8, rot: -90 };
  if (f >= T) {
    const fetch = k(f, T, T + 8), show = k(f, T + 8, T + 14);
    ph.face = fetch < 1 && f < T + 8 ? 1 : -1;
    const held = { x: lerp(onTrolley.x, ph.x - 60, show), y: lerp(onTrolley.y, 450, show) };
    sheet = { x: f < T + 8 ? onTrolley.x : held.x, y: f < T + 8 ? onTrolley.y : held.y, rot: f < T + 8 ? -90 : lerp(-90, 0, show), c: z.to, news: o === 3, tick: 0, tear: 0, crumple: 0, lift: 0 };
    ph.aF = reach(ph, f < T + 8 ? onTrolley.x : sheet.x + 10, f < T + 8 ? onTrolley.y : sheet.y + 20);
    if (f >= T + 14) ph.aB = reach(ph, sheet.x - 20, sheet.y + 30);
    if (o === 0 || o === 1) {
      if (o === 1) { sheet.under = z.alt; sheet.lift = k(f, T + 16, T + 24); }
      sheet.tick = k(f, T + 24, T + 32);
      if (f >= T + 34) {
        const t = k(f, T + 34, T + 42);
        sheet = { ...sheet, x: lerp(held.x, px + 50, t), y: lerp(held.y, py - 80, t) };
        ph.aF = reach(ph, lerp(sheet.x, 890, t), lerp(sheet.y, 520, t)); ph.aB = armTo(10, 0);
        pP.aB = armTo(-rel({ x: px, y: py }, sheet.x, sheet.y).x * -1, rel({ x: px, y: py }, sheet.x, sheet.y).y);
        pP.aB = armTo(sheet.x - px, sheet.y - py);
        if (f >= T + 42) { const bob = Math.sin((f - T) * 1.1) * 8; ph.aF = reach(ph, 892, 520 + bob); pP.aF = armTo(892 - px, 520 + bob - py); pP.mouth = 0.4; popC = o === 1 ? z.alt : z.to; popAt = T + 44; }
      }
    } else if (o === 2) {
      sheet.tear = k(f, T + 20, T + 40, EASE.out);
      if (f >= T + 20) { ph.aF = reach(ph, sheet.x - 40 * sheet.tear, sheet.y + 10); ph.aB = reach(ph, sheet.x + 40 * sheet.tear, sheet.y + 10); }
      if (f >= T + 34) { pP.head = 14; }
      if (f >= T + 42) { popC = z.from; popAt = T + 44; popX = px; }
    } else {
      sheet.crumple = k(f, T + 26, T + 34);
      if (f >= T + 14) Object.assign(pP, laugh(f), { aF: [60 + Math.sin(f * 0.8) * 20, 40] });
      if (f >= T + 34) { ph.face = 1; const a = arc(k(f, T + 34, T + 46, EASE.in), ph.x + 30, 450, 1230, 720, 120); sheet = { ...sheet, x: a.x, y: a.y, rot: f * 18 }; ph.aF = mixL(reach(ph, 1100, 470), armTo(10, 10), k(f, T + 36, T + 46)); ph.aB = [4, 10]; binHit = k(f, T + 46, T + 56, EASE.out); }
    }
  }
  const phLook: Look = { top: '#E9F2F0', trim: z.acc, bottom: '#23303A', skin: '#6E4630', hair: INK, glasses: 'clear', sleeve: 'short', legs: 'trousers', shoe: '#F4EFE4' };
  const beep = (f % 20) < 2;
  return <>
    <Room id="cfp" wall={['#1B3B40', '#0A1A1D']} floor={['#26343A', '#0A1013']} glow="#BFF5EC" gx={760} gy={260} />
    <rect x={420} y={170} width={130} height={200} fill="#E9E2D3" /><path d="M485 196 q22 36 9 82 q-9 36 4 72" stroke="#C9A58A" strokeWidth={24} fill="none" strokeLinecap="round" /><path d="M481 232 q12 28 5 54" stroke={z.acc} strokeWidth={8} fill="none" strokeLinecap="round" />
    <rect x={1010} y={200} width={190} height={120} rx={8} fill="#0B1416" stroke="#5A6A6E" strokeWidth={6} />
    <path d={`M1020 ${262} h${40 + (f * 4) % 40} l8 -30 l10 55 l8 -25 h100`} stroke="#3CF0C8" strokeWidth={3} fill="none" opacity=".9" />
    <circle cx={1180} cy={218} r={6} fill={beep ? '#3CF0C8' : '#1C4A42'} />
    <Pendant x={700} y={110} f={f} col="#E8FFF8" />
    <rect x={420} y={560} width={440} height={34} rx={10} fill="#1E6F78" /><rect x={428} y={590} width={424} height={10} fill="#0F3E44" />
    <rect x={450} y={600} width={16} height={FLOOR - 600} fill="#8A948E" /><rect x={814} y={600} width={16} height={FLOOR - 600} fill="#8A948E" />
    <rect x={424} y={546} width={90} height={18} rx={8} fill="#E9F2F0" />
    <rect x={1070} y={trolley.y + 4} width={130} height={10} rx={3} fill="#B9C2C0" /><rect x={1080} y={trolley.y + 14} width={8} height={FLOOR - trolley.y - 14} fill="#8A948E" /><rect x={1182} y={trolley.y + 14} width={8} height={FLOOR - trolley.y - 14} fill="#8A948E" />
    <rect x={1080} y={700} width={110} height={8} fill="#B9C2C0" />
    <Bin x={1250} hit={binHit} />
    {!sheet && <Sheet x={onTrolley.x} y={onTrolley.y} c={z.to} news={o === 3} rot={onTrolley.rot} s={0.8} />}
    <Shadow x={ph.x} /><Shadow x={px} w={f >= 40 ? 60 : 0.1} />
    <g transform={`translate(${px} ${py}) rotate(${pRot})`}><Figure look={pl} p={pP} /></g>
    <Figure look={phLook} p={ph} />
    {sheet && <>
      {sheet.under && <Sheet x={sheet.x} y={sheet.y} c={sheet.under} rot={sheet.rot} tick={sheet.tick} />}
      {sheet.lift < 1 && <g opacity={1 - sheet.lift} transform={`translate(0 ${-sheet.lift * 90})`}><Sheet x={sheet.x} y={sheet.y} c={sheet.c} news={sheet.news} rot={sheet.rot + sheet.lift * 30} tick={sheet.under ? 0 : sheet.tick} tear={sheet.tear} crumple={sheet.crumple} /></g>}
    </>}
    {popC && <Pop x={popX} y={popY} f={f} at={popAt} c={popC} />}
  </>;
}

// ================================================================= SPOTTER
// Setup: a jet taxis past the glass; the spotter lifts the long lens as the arrivals doors slide open.
// Done/Hijack: the hooded player wheels his case out; flash; the lens finds the case tag (the buying club's crest, or
// another club's). Off: he walks out, stops, turns round and goes back through; the tag is his own club's.
// Fake: a holiday family comes out instead; the spotter lowers the camera and shrugs.
function Spotter(z: Z) {
  const { f, o } = z;
  const T = SETS.spotter.tell;
  const planeX = lerp(-500, 1900, k(f, 0, 90, EASE.inOut));
  const doors = k(f, 34, 42) - (o === 2 ? k(f, T + 38, T + 46) : 0);
  const S: Pose = { x: 520, y: HIPY, face: 1, s: 1.05, blink: blinkOf(f, 6) };
  const lift = k(f, 16, 28) - (o === 3 ? k(f, T + 28, T + 36) : 0);
  const eye = { x: 30, y: -166 };
  S.aF = mixL([10, 30], armTo(eye.x + 40, eye.y + 16), lift); S.aB = mixL([6, 20], armTo(eye.x + 10, eye.y + 24), lift); S.head = lift * -4;
  const cam = <g transform="rotate(-90) translate(-8 -22)"><rect width={34} height={30} rx={5} fill="#1A1A1E" /><rect x={30} y={4} width={90} height={22} rx={8} fill="#E8E0D0" /><rect x={112} y={2} width={14} height={26} rx={4} fill="#1A1A1E" /><circle cx={127} cy={15} r={9} fill="#3A5A7A" /></g>;
  S.hold = cam;
  // who comes through
  const hoodLook: Look = { top: '#2A2D36', bottom: '#15161C', skin: z.skin, hair: INK, hood: true, sleeve: 'long', legs: 'trousers', shoe: '#F4EFE4', faceless: true };
  const H: Pose = { x: 1060, y: HIPY - 60, s: 0.88, face: -1, head: 10, aB: armTo(30, -6) };
  let show = f >= 38;
  if (o === 0 || o === 1) { const t = k(f, 38, T + 26, (x) => x); H.x = lerp(1060, 790, t); const w = walk((f - 38) * 0.45, 30, 16); if (t < 1) Object.assign(H, { lF: w.lF, lB: w.lB, aF: w.aF, y: HIPY - 60 + w.bob * 0.88 }); if (f >= T + 22) H.head = -4; }
  else if (o === 2) {
    const out = k(f, 38, T + 10, (x) => x), back = k(f, T + 16, T + 40, (x) => x);
    H.x = f < T + 16 ? lerp(1060, 900, out) : lerp(900, 1120, back); H.face = f < T + 14 ? -1 : 1;
    const moving = (f < T + 10) || (f >= T + 16 && f < T + 40);
    if (moving) { const w = walk((f - 38) * 0.45, 30, 16); Object.assign(H, { lF: w.lF, lB: w.lB, aF: w.aF, y: HIPY - 60 + w.bob * 0.88 }); }
    if (f >= T + 10 && f < T + 16) H.head = 14;
    show = f >= 38 && f < T + 44;
  }
  const tagC = o === 0 ? z.to : o === 1 ? z.alt : z.from;
  const caseX = H.x + (H.face === -1 ? 70 : -70);
  const flashes = o === 3 ? [T + 14] : o === 2 ? [T + 6] : [T + 16, T + 21];
  const flash = Math.max(0, ...flashes.map((a) => (f >= a ? Math.exp(-(f - a) / 2.2) : 0)));
  // the holiday family (Fake)
  const fam = o === 3 && f >= 38 ? { x: lerp(1060, 700, k(f, 38, T + 34, (x) => x)), w: walk((f - 38) * 0.5, 30, 16) } : null;
  if (o === 3 && f >= T + 30) Object.assign(S, shrug(k(f, T + 34, T + 42)), { hold: f < T + 32 ? cam : undefined });
  if (o === 3 && f >= T + 30) S.hold = undefined;
  const spLook: Look = { top: '#3D4A2E', trim: '#2A331F', bottom: '#2A2A2A', skin: '#E3B48E', hair: '#5A3A22', cap: z.acc, sleeve: 'long', legs: 'trousers', shoe: '#0E0C0A' };
  const lights = Array.from({ length: 9 }, (_, i) => <circle key={i} cx={260 + i * 130} cy={500} r={5} fill="#FFE08A" opacity={0.5 + 0.5 * Math.sin(f * 0.3 + i)} />);
  // the viewfinder on the tag
  const vf = (o === 0 || o === 1 || o === 2) ? k(f, flashes[0] + 2, flashes[0] + 10) : 0;
  const tagPos = { x: caseX + 12, y: FLOOR - 118 };
  return <>
    <Room id="cfs" wall={['#1D1A2C', '#0E0D16']} floor={['#2C2A34', '#0C0B10']} glow="#FFB07A" gx={800} gy={360} />
    <defs><linearGradient id="cfssky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2B1B4A" /><stop offset=".6" stopColor="#B1486B" /><stop offset="1" stopColor="#F79A4B" /></linearGradient></defs>
    <rect x={-600} y={110} width={2800} height={400} fill="url(#cfssky)" />
    <circle cx={700} cy={450} r={80} fill="#FFD58A" opacity=".8" />
    <rect x={-600} y={450} width={2800} height={60} fill="#2A1A2A" />
    {lights}
    <g transform={`translate(${planeX} 420)`}>
      <path d="M-180 10 Q-190 -14 -150 -18 H150 Q196 -16 210 4 Q196 20 150 22 H-150 Q-176 22 -180 10 Z" fill="#E8E4EE" />
      <path d="M-160 -16 L-196 -74 H-168 L-120 -18 Z" fill={z.acc} /><path d="M-30 12 L-90 60 H-60 L20 14 Z" fill="#B8B4C2" />
      {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={-120 + i * 22} cy={-4} r={4} fill="#3A4A6A" />)}
    </g>
    {Array.from({ length: 8 }, (_, i) => <rect key={i} x={-300 + i * 320} y={100} width={16} height={420} fill="#0E0D16" />)}
    <rect x={-600} y={96} width={2800} height={16} fill="#0E0D16" /><rect x={-600} y={510} width={2800} height={40} fill="#0E0D16" />
    {/* the arrivals doors */}
    <rect x={960} y={330} width={200} height={FLOOR - 330} fill="#FFE9C8" opacity=".9" />
    <rect x={944} y={300} width={232} height={34} fill="#1A1A22" /><path d={`M1040 318 l-14 -8 v16 z M1060 318 h20`} stroke="#FFE08A" strokeWidth={4} fill="#FFE08A" />
    {show && !(o === 3) && <><Shadow x={H.x} w={50} o={0.25} />
      <g transform={`translate(${caseX} ${FLOOR - 70})`}><line x1={H.face === -1 ? -20 : 20} y1={-40} x2={0} y2={10} stroke="#888" strokeWidth={4} /><rect x={-28} y={0} width={56} height={70} rx={8} fill="#3A3F4A" /><circle cx={-16} cy={72} r={6} fill={INK} /><circle cx={16} cy={72} r={6} fill={INK} /></g>
      <g transform={`translate(${tagPos.x} ${tagPos.y + 40})`}><line x1={0} y1={30} x2={0} y2={10} stroke="#B9AE98" strokeWidth={2} /><Shield x={0} y={0} s={0.34} c={tagC} /></g>
      <Figure look={hoodLook} p={H} /></>}
    {fam && <>
      <Figure look={{ top: '#FF6FB5', bottom: '#F4EFE4', skin: '#E3B48E', hair: '#8A5A2A', cap: '#F7B928', sleeve: 'short', legs: 'shorts', shoe: '#F4EFE4' }} p={{ x: fam.x, y: HIPY - 60 + fam.w.bob * 0.88, s: 0.88, face: -1, lF: fam.w.lF, lB: fam.w.lB, aF: fam.w.aF, aB: fam.w.aB, mouth: 0.5 }} />
      <Figure look={{ top: '#35C3E6', bottom: '#2A2A2A', skin: '#E3B48E', hair: '#8A5A2A', sleeve: 'short', legs: 'shorts', shoe: '#F4EFE4' }} p={{ x: fam.x + 110, y: HIPY + 10 + fam.w.bob * 0.6, s: 0.6, face: -1, lF: fam.w.lB, lB: fam.w.lF, aF: armTo(40, -150), aB: fam.w.aB, mouth: 0.6 }} />
      <circle cx={fam.x + 110 + 26} cy={HIPY + 10 - 160 * 0.6 - 30} r={22} fill="#F4EFE4" stroke="#FF5A36" strokeWidth={6} />
    </>}
    {/* door panels */}
    <rect x={960 - doors * 90} y={330} width={100} height={FLOOR - 330} fill="#3A4A5A" opacity=".55" stroke="#8AA0B4" strokeWidth={4} />
    <rect x={1060 + doors * 90} y={330} width={100} height={FLOOR - 330} fill="#3A4A5A" opacity=".55" stroke="#8AA0B4" strokeWidth={4} />
    <rect x={-600} y={600} width={2800} height={10} rx={5} fill="#B9AE98" opacity=".7" />
    {Array.from({ length: 10 }, (_, i) => <rect key={i} x={-200 + i * 220} y={600} width={8} height={180} fill="#8A8272" opacity=".7" />)}
    <Shadow x={S.x} />
    <Figure look={spLook} p={S} />
    {vf > 0 && show && <g opacity={vf} stroke="#F4EFE4" strokeWidth={3} fill="none">
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <path key={i} d={`M${tagPos.x + a * 40} ${tagPos.y + 40 + b * 26} h${-a * 14} M${tagPos.x + a * 40} ${tagPos.y + 40 + b * 26} v${-b * 12}`} />)}
      <circle cx={tagPos.x} cy={tagPos.y + 40} r={4} fill="#FF5A36" stroke="none" opacity={f % 10 < 5 ? 1 : 0.3} />
    </g>}
    {flash > 0.02 && <rect x={-1400} y={-1400} width={4400} height={4400} fill="#fff" opacity={flash * 0.75} />}
  </>;
}

// ================================================================= AGENT
// Back seat at night, city lights sliding past, the contract on his knee.
// Done: he signs the buying club's contract and pumps a fist. Hijack: a second contract (another club) comes out of
// his jacket, the first goes on the seat, he signs the new one. Off: he tears the contract in two.
// Fake: it was only the paper; he laughs, screws it up and flicks it out of the window.
function Agent(z: Z) {
  const { f, o } = z;
  const T = SETS.agent.tell;
  const A: Pose = { x: 760, y: 600, face: 1, s: 1.1, blink: false, lean: -6, head: 10 };
  A.lF = legTo(96, 60); A.lB = legTo(86, 66);
  const knee = { x: 760 + 88 * 1.1, y: 580 };
  let doc = { x: knee.x, y: knee.y - 16, rot: -6, c: z.to, news: o === 3, sign: 0, tear: 0, crumple: 0, s: 1 };
  let doc2: typeof doc | null = null;
  A.aF = reach(A, knee.x + 30, knee.y - 20, -6); A.aB = reach(A, knee.x - 30, knee.y - 10, -6);
  let popC: Col | null = null, popAt = 0, popX = 900, popY = 250;
  let pen = false;
  if (f >= T) {
    if (o === 0) {
      pen = true; doc.sign = k(f, T + 4, T + 24);
      A.aF = reach(A, doc.x - 30 + doc.sign * 60 + Math.sin(f * 1.8) * 6, doc.y + 30 + Math.sin(f * 2.4) * 4, -6);
      if (f >= T + 28) { pen = false; const pump = Math.abs(Math.sin((f - T - 28) * 0.5)); A.aF = mixL(armTo(40, -60, -6), armTo(30, -190, -6), pump); A.head = -6; A.mouth = 0.5; popC = z.to; popAt = T + 30; }
    } else if (o === 1) {
      const out = k(f, T + 2, T + 12);
      const aside = k(f, T + 12, T + 20);
      doc = { ...doc, x: lerp(knee.x, 640, aside), y: lerp(knee.y - 16, 590, aside), rot: lerp(-6, -10, aside) };
      doc2 = { x: lerp(A.x + 40, knee.x, k(f, T + 18, T + 24)), y: lerp(A.y - 110, knee.y - 16, k(f, T + 18, T + 24)), rot: -6, c: z.alt, news: false, sign: k(f, T + 26, T + 44), tear: 0, crumple: 0, s: out };
      A.aB = f < T + 20 ? reach(A, doc.x, doc.y - 10, -6) : reach(A, knee.x - 30, knee.y - 10, -6);
      A.aF = f < T + 24 ? reach(A, doc2.x, doc2.y, -6) : reach(A, doc2.x - 30 + doc2.sign * 60 + Math.sin(f * 1.8) * 6, doc2.y + 30, -6);
      pen = f >= T + 26 && f < T + 46;
      if (f >= T + 46) { popC = z.alt; popAt = T + 46; A.mouth = 0.4; }
    } else if (o === 2) {
      doc.tear = k(f, T + 12, T + 28, EASE.out);
      const lift = k(f, T, T + 8);
      doc.y = lerp(knee.y - 16, knee.y - 60, lift);
      A.aF = reach(A, doc.x + 30 * (1 + doc.tear), doc.y, -6); A.aB = reach(A, doc.x - 30 * (1 + doc.tear), doc.y, -6); A.head = 0;
      if (f >= T + 34) { A.lean = -12; A.head = -8; popC = z.from; popAt = T + 36; }
    } else {
      Object.assign(A, laugh(f));
      doc.crumple = k(f, T + 10, T + 18);
      if (f >= T + 18) { const a = arc(k(f, T + 20, T + 34, EASE.in), knee.x, knee.y - 40, 420, 240, 120); doc = { ...doc, x: a.x, y: a.y, rot: f * 20, s: lerp(1, 0.5, k(f, T + 20, T + 34)) }; A.aF = mixL(reach(A, knee.x, knee.y - 60, -6), [150, -10], k(f, T + 18, T + 26)); }
      else A.aF = reach(A, doc.x + 10, doc.y, -6);
      A.aB = f < T + 18 ? reach(A, doc.x - 10, doc.y + 6, -6) : A.aB;
    }
  }
  if (pen) A.hold = <rect x={-3} y={-10} width={6} height={34} rx={2} fill="#F7B928" />;
  const agLook: Look = { top: '#1C2130', trim: '#2A3144', bottom: '#1C2130', skin: '#C68A5E', hair: INK, glasses: 'sun', tie: z.acc, sleeve: 'long', legs: 'trousers', shoe: '#0A0A0A' };
  const bokeh = Array.from({ length: 22 }, (_, i) => {
    const depth = 0.4 + (i % 3) * 0.35, sp = 14 * depth;
    const x = (((i * 211 - f * sp) % 1600) + 1600) % 1600 - 100, y = 200 + ((i * 97) % 280);
    return <circle key={i} cx={x} cy={y} r={10 + depth * 22} fill={['#FFC873', '#FF6A4A', '#9FD8FF', '#FFE3A3'][i % 4]} opacity={0.18 + 0.2 * depth} />;
  });
  const sweep = ((f * 22) % 2400) - 600;
  const winOpen = o === 3 ? k(f, T + 12, T + 20) : 0;
  return <>
    <rect x={-1400} y={-1400} width={4400} height={4400} fill="#07080D" />
    <defs><clipPath id="cfawin"><path d="M240 170 Q260 130 320 130 H1240 Q1320 130 1340 190 L1380 520 H220 Z" /></clipPath>
      <linearGradient id="cfanight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0F1D40" /><stop offset="1" stopColor="#1A1026" /></linearGradient></defs>
    <g clipPath="url(#cfawin)">
      <rect x={200} y={120} width={1200} height={420} fill="url(#cfanight)" />
      {Array.from({ length: 9 }, (_, i) => { const x = (((i * 260 - f * 5) % 1800) + 1800) % 1800 - 100; return <rect key={i} x={x} y={260 - (i % 3) * 60} width={140} height={400} fill="#0A1024" />; })}
      {Array.from({ length: 30 }, (_, i) => { const x = (((i * 97 - f * 5) % 1800) + 1800) % 1800 - 100; return <rect key={i} x={x + 20} y={280 - (i % 3) * 60 + (i % 5) * 30} width={12} height={16} fill="#FFD58A" opacity=".45" />; })}
      {bokeh}
      <rect x={sweep} y={120} width={120} height={420} fill="#FFE3A3" opacity=".08" transform="skewX(-20)" />
      <rect x={200} y={120} width={1200} height={420} fill="#9FB8D8" opacity={0.08 * (1 - winOpen)} />
    </g>
    <path d="M240 170 Q260 130 320 130 H1240 Q1320 130 1340 190 L1380 520 H220 Z" fill="none" stroke="#1A1C24" strokeWidth={26} />
    <path d="M-600 430 Q600 380 700 400 L760 600 H-600 Z" fill="#241C18" />
    <rect x={-600} y={596} width={2800} height={400} fill="#1C1512" /><path d="M-600 596 H2200" stroke="#3A2E26" strokeWidth={6} />
    <path d="M1180 360 Q1180 300 1240 300 H1360 Q1400 300 1400 360 V900 H1180 Z" fill="#2A211C" />
    <circle cx={1300} cy={250} r={46} fill="#0A0A0E" /><rect x={1270} y={280} width={60} height={30} fill="#0A0A0E" />
    <Figure look={agLook} p={A} />
    <Sheet x={doc.x} y={doc.y} c={doc.c} news={doc.news} rot={doc.rot} sign={doc.sign} tear={doc.tear} crumple={doc.crumple} s={doc.s} />
    {doc2 && doc2.s > 0.05 && <Sheet x={doc2.x} y={doc2.y} c={doc2.c} rot={doc2.rot} sign={doc2.sign} s={doc2.s} />}
    <rect x={sweep * 0.8} y={-400} width={160} height={2000} fill="#FFE3A3" opacity=".05" transform="skewX(-24)" />
    {popC && <Pop x={popX} y={popY} f={f} at={popAt} c={popC} />}
  </>;
}

// ================================================================= LEAK (the press office)
// A dark office after hours: the copier's light sweeps, the release comes out, carried to the desk.
// Done: into an envelope, stamped, slid across the desk. Hijack: that release is swapped for another club's.
// Off: fed into the shredder. Fake: it's only the paper; screwed up and binned.
function Leak(z: Z) {
  const { f, o } = z;
  const T = SETS.leak.tell;
  const sweep = (f % 30) / 30;
  const P: Pose = { x: 600, y: HIPY, face: -1, s: 1.04 };
  const lk: Look = { top: '#23222E', trim: '#34323F', bottom: '#1A1922', skin: '#8D5A3B', hair: INK, tie: z.acc, sleeve: 'long', legs: 'trousers', faceless: true, shoe: '#0A0A0A' };
  const desk = { x0: 760, x1: 1300, y: 620 };
  const out = { x: 560, y: 596 };
  let sheet = { x: lerp(out.x - 60, out.x, k(f, 4, 16)), y: out.y, rot: -90, c: z.to, news: o === 3, crumple: 0, s: 0.8, show: f >= 4 };
  if (f < 24) { P.aF = reach(P, 470 + Math.sin(f * 0.4) * 10, 520); P.aB = reach(P, 450, 524); P.head = 14; P.lean = 6; }
  if (f >= 18 && f < 24) { P.aF = reach(P, sheet.x, sheet.y - 6); }
  if (f >= 24) { stroll(P, f, 24, 38, 600, 820); if (f >= 24) sheet = { ...sheet, x: P.x + 50, y: HIPY - 60, rot: -10 }; if (f < 38 && f >= 24) P.aF = reach(P, sheet.x - 6, sheet.y + 20); }
  let env: { x: number; y: number; stamp: number } | null = null;
  let strips = 0, binHit = 0, popC: Col | null = null, popAt = 0, popX = 900, popY = 280;
  if (f >= 38) { P.face = 1; }
  if (f >= T) {
    const deskY = desk.y - 8;
    if (o === 0 || o === 1) {
      if (o === 1) {
        // the release from the copier goes aside; another club's comes off the tray
        const aside = k(f, T, T + 8);
        const swap = k(f, T + 8, T + 16);
        sheet = { ...sheet, x: lerp(P.x + 50, 1180, aside), y: lerp(HIPY - 60, deskY, aside), rot: lerp(-10, -90, aside), c: aside < 1 ? z.to : z.to };
        if (f >= T + 8) sheet = { ...sheet, c: z.alt, x: lerp(1240, P.x + 50, swap), y: lerp(deskY - 10, HIPY - 60, swap), rot: lerp(-90, -10, swap) };
        P.aF = reach(P, sheet.x, sheet.y);
      }
      const s0 = o === 1 ? T + 16 : T;
      const into = k(f, s0, s0 + 10);
      env = { x: 940, y: deskY, stamp: k(f, s0 + 14, s0 + 16) };
      if (f >= s0) { sheet = { ...sheet, x: lerp(P.x + 50, 940, into), y: lerp(HIPY - 60, deskY - 20, into), rot: lerp(-10, -90, into), s: lerp(0.8, 0.5, into), show: into < 1 }; P.aF = reach(P, sheet.x, sheet.y); P.lean = 12 * into; }
      if (f >= s0 + 10) { const hit = f < s0 + 16 ? Math.abs(Math.sin((f - s0 - 10) * 0.6)) : 0; P.aF = reach(P, 940, deskY - 40 - hit * 60); }
      if (f >= s0 + 18) { const sl = k(f, s0 + 18, s0 + 30, EASE.out); env.x = lerp(940, 1240, sl); P.aF = reach(P, env.x - 30, deskY - 6); P.lean = 20 * (1 - k(f, s0 + 30, s0 + 36)); if (f >= s0 + 30) { popC = o === 1 ? z.alt : z.to; popAt = s0 + 32; popX = 1240; popY = 360; } }
    } else if (o === 2) {
      const feed = k(f, T + 4, T + 26, (x) => x);
      sheet = { ...sheet, x: lerp(P.x + 50, 1000, k(f, T, T + 4)), y: lerp(HIPY - 60, 560 + feed * 70, k(f, T, T + 4)), rot: 0, s: 0.8 };
      if (f >= T + 4) sheet.y = 560 + feed * 80;
      strips = feed; P.aF = reach(P, 1000, Math.min(580, sheet.y - 30)); P.lean = 10;
      if (f >= T + 30) { P.lean = 0; P.aF = armTo(10, 0); popC = z.from; popAt = T + 32; popX = 1000; }
    } else {
      sheet.crumple = k(f, T + 4, T + 12);
      P.aF = reach(P, sheet.x, sheet.y); P.aB = reach(P, sheet.x - 10, sheet.y + 10);
      if (f >= T + 12) { const a = arc(k(f, T + 14, T + 26, EASE.in), P.x + 50, HIPY - 60, 1340, 720, 120); sheet = { ...sheet, x: a.x, y: a.y, rot: f * 20 }; P.aF = mixL(reach(P, 1000, 500), armTo(10, 0), k(f, T + 16, T + 26)); P.aB = [4, 10]; binHit = k(f, T + 26, T + 36, EASE.out); }
      if (f >= T + 30) Object.assign(P, shrug(k(f, T + 30, T + 36)));
    }
  }
  const lit = 0.5 + 0.5 * Math.sin(sweep * Math.PI);
  return <>
    <Room id="cfl" wall={['#221A36', '#0D0816']} floor={['#1E1A28', '#08060C']} glow="#B48CFF" gx={600} gy={420} />
    <g opacity=".5">{Array.from({ length: 10 }, (_, i) => <rect key={i} x={860} y={160 + i * 28} width={380} height={16} fill="#3A3150" />)}</g>
    <rect x={860} y={150} width={380} height={290} fill="none" stroke="#15101F" strokeWidth={10} />
    <rect x={340} y={520} width={220} height={260} rx={8} fill="#CFC9D8" /><rect x={330} y={500} width={240} height={30} rx={6} fill="#E6E1EE" />
    <rect x={360} y={560} width={180} height={34} rx={4} fill="#1A1622" />
    <rect x={360 + sweep * 160} y={530} width={24} height={16} fill="#E8FFF4" opacity={lit} />
    <path d={`M${372 + sweep * 160} 500 L${260 + sweep * 160} -200 L${500 + sweep * 160} -200 Z`} fill="#D8F8FF" opacity={0.08 * lit} />
    <rect x={desk.x0} y={desk.y} width={desk.x1 - desk.x0} height={16} fill="#3A2E24" /><rect x={desk.x0 + 20} y={desk.y + 16} width={20} height={FLOOR - desk.y - 16} fill="#2A2018" /><rect x={desk.x1 - 40} y={desk.y + 16} width={20} height={FLOOR - desk.y - 16} fill="#2A2018" />
    <path d="M1180 620 L1200 520 L1250 500" stroke="#555" strokeWidth={6} fill="none" /><path d="M1230 480 L1290 500 L1270 530 Z" fill="#2A2A2A" />
    <path d="M1275 520 L1180 620 L1300 620 Z" fill="#FFC873" opacity=".12" />
    {o === 1 && f < T + 8 && <Sheet x={1240} y={desk.y - 10} c={z.alt} rot={-90} s={0.8} />}
    {/* the shredder */}
    {o === 2 && <g><rect x={950} y={636} width={100} height={144} rx={6} fill="#2A2A30" /><rect x={960} y={630} width={80} height={10} fill="#111" />
      {strips > 0.2 && Array.from({ length: 6 }, (_, i) => <rect key={i} x={962 + i * 13} y={650} width={7} height={40 * strips} fill="#F4EFE4" opacity=".8" />)}</g>}
    {env && <g transform={`translate(${env.x} ${env.y})`}><rect x={-50} y={-14} width={100} height={16} fill="#D9B77A" /><path d="M-50 -14 L0 -6 L50 -14" stroke="#A8864A" strokeWidth={2} fill="none" />{env.stamp > 0 && <circle cx={20} cy={-8} r={8 * env.stamp} fill={z.acc} />}</g>}
    <Bin x={1340} hit={binHit} />
    <Shadow x={P.x} />
    <Figure look={lk} p={P} />
    {sheet.show && !(o === 2 && strips >= 1) && <g clipPath={o === 2 && f >= T + 4 ? 'url(#cflshred)' : undefined}><Sheet x={sheet.x} y={sheet.y} c={sheet.c} news={sheet.news} rot={sheet.rot} crumple={sheet.crumple} s={sheet.s} /></g>}
    <defs><clipPath id="cflshred"><rect x={800} y={-400} width={400} height={1036} /></clipPath></defs>
    {popC && <Pop x={popX} y={popY} f={f} at={popAt} c={popC} />}
  </>;
}

// Timings: tell = where a repeat call starts; end = the last frame (then a short hold).
export const SETS: Record<string, SetSpec> = {
  barber: { tell: 46, end: 110, Scene: Barber, cues: (o) => [{ f: 30, k: 'whoosh' }, ...(o <= 1 ? [{ f: 46 + 38, k: 'flip' }] : o === 2 ? [{ f: 46 + 26, k: 'tap' }] : [{ f: 46 + 30, k: 'shred' }, { f: 46 + 50, k: 'thock' }])],
    cam: (o) => [{ f: 0, x: 810, y: 470, z: 1.05 }, { f: 46, x: 790, y: 470, z: 1.0 }, { f: 110, x: o === 2 ? 900 : o === 3 ? 960 : 740, y: 450, z: 1.08 }] },
  kitman: { tell: 38, end: 104, Scene: KitMan, cues: (o) => [{ f: 24, k: 'tap' }, ...(o === 1 ? [{ f: 38 + 28, k: 'thock' }] : o === 2 ? [{ f: 38 + 38, k: 'thock' }, { f: 38 + 48, k: 'tap' }] : o === 3 ? [{ f: 38 + 40, k: 'shred' }, { f: 38 + 54, k: 'thock' }] : [{ f: 38 + 44, k: 'tap' }])],
    cam: () => [{ f: 0, x: 860, y: 470, z: 1.0 }, { f: 38, x: 820, y: 470, z: 1.02 }, { f: 104, x: 860, y: 460, z: 1.08 }] },
  physio: { tell: 44, end: 106, Scene: Physio, cues: (o) => [{ f: 40, k: 'thock' }, ...(o === 2 ? [{ f: 44 + 22, k: 'shred' }] : o === 3 ? [{ f: 44 + 26, k: 'shred' }, { f: 44 + 46, k: 'thock' }] : [{ f: 44 + 26, k: 'tap' }])],
    cam: () => [{ f: 0, x: 720, y: 460, z: 1.05 }, { f: 44, x: 880, y: 460, z: 1.02 }, { f: 106, x: 920, y: 450, z: 1.1 }] },
  spotter: { tell: 44, end: 110, Scene: Spotter, cues: (o) => (o === 3 ? [{ f: 44 + 14, k: 'flip' }] : o === 2 ? [{ f: 44 + 6, k: 'flip' }] : [{ f: 44 + 16, k: 'flip' }, { f: 44 + 21, k: 'flip' }]),
    cam: (o) => [{ f: 0, x: 780, y: 460, z: 1.0 }, { f: 44, x: 780, y: 470, z: 1.02 }, { f: 60, x: 800, y: 480, z: 1.04 }, { f: 110, x: o === 3 ? 760 : 840, y: o === 3 ? 470 : 560, z: o === 3 ? 1.06 : 1.35 }] },
  agent: { tell: 36, end: 100, Scene: Agent, cues: (o) => (o === 2 ? [{ f: 36 + 12, k: 'shred' }] : o === 3 ? [{ f: 36 + 10, k: 'shred' }, { f: 36 + 22, k: 'whoosh' }] : [{ f: 36 + 6, k: 'typewriter' }]),
    cam: () => [{ f: 0, x: 800, y: 440, z: 1.0 }, { f: 36, x: 830, y: 460, z: 1.1 }, { f: 100, x: 860, y: 470, z: 1.22 }] },
  leak: { tell: 40, end: 100, Scene: Leak, cues: (o) => (o === 2 ? [{ f: 44, k: 'shred' }] : o === 3 ? [{ f: 44, k: 'shred' }, { f: 66, k: 'thock' }] : [{ f: o === 1 ? 70 : 54, k: 'stamp' }]),
    cam: () => [{ f: 0, x: 620, y: 470, z: 1.02 }, { f: 40, x: 860, y: 470, z: 1.02 }, { f: 100, x: 960, y: 460, z: 1.08 }] },
};

/** Camera at frame f: the set's keyframes plus a little handheld drift. */
export function camAtF(src: string, o: number, f: number): Cam {
  const S = SETS[src] || SETS.leak;
  const c = camAt(f, S.cam(o));
  return { x: c.x + noise(f / 40, 3) * 6, y: c.y + noise(f / 50, 7) * 5, z: c.z };
}
