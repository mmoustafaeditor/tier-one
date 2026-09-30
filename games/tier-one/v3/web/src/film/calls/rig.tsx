// The call films' cast: one paper-cut figure rig (HYBRID.md §2, 3.3: stylised characters are allowed in scenes).
// Flat shapes, simple faces, no likenesses: a player is a generic figure in his club's kit and number.
// Everything is a pure function of its props (poses come from the frame), so the films stay frame-pure.
// Coordinates: figure-local, origin at the hip, +x is the way the figure faces, +y is down. Standing, the hip is
// ~156 above the floor and the top of the head ~196 above the hip.
import { createContext, useContext, type ReactNode } from 'react';

/** World mirror (−1 in RTL): numbers and signs counter-flip so they stay readable. */
export const MirrorCtx = createContext(1);
export type Limb = [number, number];
export type Look = {
  top: string; trim?: string; bottom: string; skin: string; hair: string; shoe?: string; socks?: string;
  no?: string | number; sleeve?: 'short' | 'long'; legs?: 'shorts' | 'trousers';
  hood?: boolean; glasses?: 'sun' | 'clear'; beard?: boolean; apron?: string; cap?: string; bald?: boolean; tie?: string; faceless?: boolean;
};
export type Pose = {
  x: number; y: number; s?: number; face?: 1 | -1; lean?: number; head?: number;
  aF?: Limb; aB?: Limb; lF?: Limb; lB?: Limb; mouth?: number; blink?: boolean;
  /** drawn in the front hand (hand-local, after the forearm's rotation) */ hold?: ReactNode; holdB?: ReactNode;
  /** drawn over the body (cape, towel over the shoulder), figure-local */ over?: ReactNode;
  /** a phone held to the ear (lit 0..1); aim the front hand at EAR */ ear?: number; earCol?: string;
};

export const SH = { x: 2, y: -116 }, HIP = { x: 0, y: -2 };
export const ARM = [60, 56] as const, LEG = [80, 78] as const;
export const STAND = 154;
/** Where the front hand goes to hold a phone to the ear (figure-local, before lean). */
export const EAR = { x: 16, y: -148 };
const R = Math.PI / 180;

/** Two-bone IK: the joint angles (forward-positive degrees, 0 = hanging straight down) that put the end on (tx, ty). */
export function ik(sx: number, sy: number, tx: number, ty: number, L1: number, L2: number, bend: 1 | -1): Limb {
  const dx = tx - sx, dy = ty - sy;
  const d = Math.max(Math.abs(L1 - L2) + 0.5, Math.min(L1 + L2 - 0.5, Math.hypot(dx, dy)));
  const th = Math.atan2(dx, dy);
  const al = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const a = th + bend * al;
  const ex = sx + L1 * Math.sin(a), ey = sy + L1 * Math.cos(a);
  const b = Math.atan2(tx - ex, ty - ey) - a;
  return [a / R, b / R];
}
export const armTo = (tx: number, ty: number, lean = 0): Limb => {
  // Shoulder position after the torso lean (the arm hangs from the leaned shoulder).
  const c = Math.cos(lean * R), s = Math.sin(lean * R);
  const sx = SH.x * c - SH.y * s, sy = SH.x * s + SH.y * c;
  const l = ik(sx, sy, tx, ty, ARM[0], ARM[1], -1);
  return [l[0] + lean, l[1]];
};
export const legTo = (tx: number, ty: number): Limb => ik(HIP.x, HIP.y, tx, ty, LEG[0], LEG[1], 1);
/** A walk cycle at phase p (radians): feet targets, arm swing and hip bob. */
export function walk(p: number, stride = 36, lift = 20) {
  const foot = (q: number) => legTo(stride * Math.sin(q), STAND - Math.max(0, Math.cos(q)) * lift);
  return { lF: foot(p), lB: foot(p + Math.PI), aF: [-24 * Math.sin(p), 18] as Limb, aB: [24 * Math.sin(p), 18] as Limb, bob: -Math.abs(Math.cos(p)) * 5 };
}
export const standLegs = (): Pick<Pose, 'lF' | 'lB'> => ({ lF: legTo(8, STAND), lB: legTo(-6, STAND) });

const lum = (h: string) => { const n = parseInt(h.replace('#', '').padEnd(6, '0').slice(0, 6), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
/** Kit colours for a club: shirt, and a trim that always reads against it. */
export function kitOf(c1 = '#777777', c2 = '#FFFFFF') { const trim = Math.abs(lum(c1) - lum(c2)) < 0.25 ? (lum(c1) > 0.5 ? '#15130F' : '#F4EFE4') : c2; return { top: c1, trim }; }
export const SKIN = ['#8D5A3B', '#C68A5E', '#E3B48E', '#5E3B26', '#A8704A'];
export const INK = '#15130F';

function Seg({ len, w, col, split, col2 }: { len: number; w: number; col: string; split?: number; col2?: string }) {
  return <>
    <line x1={0} y1={0} x2={0} y2={len} stroke={col} strokeWidth={w} strokeLinecap="round" />
    {split != null && col2 && <line x1={0} y1={split} x2={0} y2={len} stroke={col2} strokeWidth={w} strokeLinecap="round" />}
  </>;
}
function Arm({ l, look, hold, back }: { l: Limb; look: Look; hold?: ReactNode; back?: boolean }) {
  const long = look.sleeve === 'long';
  const shade = back ? 'brightness(.78)' : undefined;
  return <g transform={`translate(${SH.x} ${SH.y}) rotate(${-l[0]})`} style={{ filter: shade }}>
    <Seg len={ARM[0]} w={17} col={look.top} split={long ? undefined : 30} col2={look.skin} />
    <g transform={`translate(0 ${ARM[0]}) rotate(${-l[1]})`}>
      <Seg len={ARM[1]} w={15} col={long ? look.top : look.skin} />
      <g transform={`translate(0 ${ARM[1]})`}>{hold}<circle r={10} fill={look.skin} /></g>
    </g>
  </g>;
}
function Leg({ l, look, back }: { l: Limb; look: Look; back?: boolean }) {
  const shorts = look.legs !== 'trousers';
  return <g transform={`translate(${HIP.x} ${HIP.y}) rotate(${-l[0]})`} style={{ filter: back ? 'brightness(.75)' : undefined }}>
    <Seg len={LEG[0]} w={25} col={shorts ? look.skin : look.bottom} />
    {shorts && <line x1={0} y1={0} x2={0} y2={40} stroke={look.bottom} strokeWidth={30} strokeLinecap="round" />}
    <g transform={`translate(0 ${LEG[0]}) rotate(${-l[1]})`}>
      <Seg len={LEG[1]} w={21} col={shorts ? look.skin : look.bottom} split={look.socks ? 36 : undefined} col2={look.socks} />
      {/* The shoe stays flat on the ground whatever the knee does. */}
      <g transform={`translate(0 ${LEG[1]}) rotate(${l[0] + l[1]})`}><path d="M-12 -6 H14 Q26 -6 26 4 V8 H-14 Z" fill={look.shoe || INK} /></g>
    </g>
  </g>;
}
function Num({ v, col }: { v: string | number; col: string }) {
  const m = useContext(MirrorCtx), f = useContext(FaceCtx);
  return <g transform={`translate(-2 -64) scale(${m * f} 1)`}><text textAnchor="middle" y={13} fontSize={38} fontWeight={900} fill={col} style={{ fontFamily: '"Archivo","Arial Narrow",sans-serif', fontStretch: '72%' }}>{v}</text></g>;
}
const FaceCtx = createContext(1);

export function Figure({ look, p }: { look: Look; p: Pose }) {
  const face = p.face || 1, s = p.s || 1, lean = p.lean || 0;
  const aF = p.aF || [4, 8], aB = p.aB || [-4, 8];
  const lF = p.lF || legTo(8, STAND), lB = p.lB || legTo(-6, STAND);
  const mouth = Math.max(0, Math.min(1, p.mouth || 0));
  const ear = look.hood ? null : <ellipse cx={-2} cy={-160} rx={6} ry={8} fill={look.skin} style={{ filter: 'brightness(.85)' }} />;
  return <FaceCtx.Provider value={face}><g transform={`translate(${p.x} ${p.y}) scale(${face * s} ${s})`}>
    <g transform={`rotate(${lean})`}><Arm l={aB} look={look} hold={p.holdB} back /></g>
    <Leg l={lB} look={look} back />
    <Leg l={lF} look={look} />
    <g transform={`rotate(${lean})`}>
      {/* torso */}
      <path d="M-25 6 C-31 -40 -32 -100 -23 -126 Q0 -138 23 -126 C32 -100 31 -40 25 6 Z" fill={look.top} />
      {look.apron && <path d="M-4 -118 L22 -120 C28 -80 30 -30 28 20 L-6 22 C-8 -20 -8 -80 -4 -118 Z" fill={look.apron} />}
      {look.tie && <path d="M8 -126 L14 -126 L16 -80 L11 -70 L6 -80 Z" fill={look.tie} />}
      {look.trim && <path d="M-23 -126 Q0 -138 23 -126" stroke={look.trim} strokeWidth={5} fill="none" />}
      {look.no != null && look.trim && <Num v={look.no} col={look.trim} />}
      {p.over}
      {/* neck + head */}
      <rect x={-8} y={-146} width={16} height={24} fill={look.skin} style={{ filter: 'brightness(.9)' }} />
      <g transform={`rotate(${p.head || 0} 0 -138)`}>
        {look.hood && <path d="M-40 -150 C-44 -200 -6 -212 18 -202 C40 -192 44 -170 40 -150 C38 -128 26 -122 20 -124 L-30 -118 Z" fill={look.top} style={{ filter: 'brightness(.85)' }} />}
        <circle cx={6} cy={-162} r={30} fill={look.skin} />
        {ear}
        {!look.bald && !look.hood && <path d="M-24 -148 C-34 -186 -4 -202 22 -193 C34 -189 38 -181 36 -174 C22 -181 6 -178 -2 -170 C-8 -162 -12 -154 -24 -148 Z" fill={look.hair} />}
        {look.cap && <><path d="M-24 -170 C-22 -198 30 -200 34 -172 Z" fill={look.cap} /><path d="M26 -174 L54 -170 L52 -164 L24 -166 Z" fill={look.cap} /></>}
        {look.beard && <path d="M-4 -148 C4 -126 28 -124 36 -142 C30 -136 20 -136 14 -142 C8 -144 2 -146 -4 -148 Z" fill={look.hair} />}
        {!look.faceless && <>
          <ellipse cx={20} cy={-166} rx={3.6} ry={p.blink ? 0.6 : 3.8} fill={INK} />
          <path d="M14 -176 L26 -177" stroke={look.hair === INK ? '#000' : look.hair} strokeWidth={3} strokeLinecap="round" />
          <path d="M35 -162 L39 -154 L33 -153" fill="none" stroke={INK} strokeOpacity={0.35} strokeWidth={2} strokeLinejoin="round" />
          <ellipse cx={26} cy={-145} rx={6} ry={1.4 + mouth * 5.5} fill="#3A1A12" />
        </>}
        {look.glasses === 'sun' && <path d="M8 -172 H36 V-164 Q35 -158 28 -158 H14 Q8 -158 8 -164 Z" fill={INK} />}
        {p.ear != null && <g transform="translate(8 -178) rotate(14)"><rect width={16} height={40} rx={4} fill={INK} />{p.ear > 0 && <rect x={-3} y={-3} width={22} height={46} rx={6} fill="none" stroke={p.earCol || '#9FD8FF'} strokeWidth={3} opacity={p.ear} />}</g>}
        {look.glasses === 'clear' && <rect x={12} y={-172} width={20} height={12} rx={4} fill="none" stroke={INK} strokeWidth={2.5} />}
      </g>
      <Arm l={aF} look={look} hold={p.hold} />
    </g>
  </g></FaceCtx.Provider>;
}

/** A phone in a hand: dark slab, lit screen (glow when ringing). Hand-local coordinates. */
export function Phone({ lit = 0, col = '#9FD8FF', ear = false }: { lit?: number; col?: string; ear?: boolean }) {
  return <g transform={ear ? 'rotate(180) translate(-4 -6)' : 'translate(-7 -6)'}>
    {lit > 0 && <circle cx={7} cy={14} r={24} fill={col} opacity={0.35 * lit} />}
    <rect width={15} height={28} rx={3} fill={INK} />
    <rect x={2} y={3} width={11} height={21} rx={1.5} fill={col} opacity={0.25 + 0.75 * lit} />
  </g>;
}
