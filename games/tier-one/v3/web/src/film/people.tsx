// Paper-cut people for the moment films: flat, ink-edged figures with a hard offset shadow, as if cut from card and
// laid on the desk. No faces (a pair of glasses or a cap is the most they get) and never a real footballer: a player is
// a generic figure in club colours with a number. Pure SVG, pure props, so every frame is drawable on its own.
import type { CSSProperties, ReactNode } from 'react';
import { C } from './kit';

export const SKIN = ['#E7B98F', '#C98B5E', '#9A6440', '#6E4630', '#F2CFA8'];
export type Hair = 'short' | 'bald' | 'bun' | 'cap' | 'curls' | 'none';
export type FigureProps = {
  /** Height in world units. */ h: number;
  shirt: string; skin?: string; hairC?: string; hair?: Hair; legs?: string;
  /** Arm raise, degrees outward from hanging (0 = down, 90 = sideways, 170 = overhead). */ armL?: number; armR?: number;
  /** Elbow bend, degrees (forearm folds up toward the head). */ bendL?: number; bendR?: number;
  /** Props in each hand, drawn upright in a 60×60 box centred on the hand. */ holdL?: ReactNode; holdR?: ReactNode;
  num?: string | number; numC?: string; tie?: string; apron?: string; stripe?: string; glasses?: boolean; capC?: string;
  /** Seen from behind (the number reads on the back). */ back?: boolean;
  lean?: number; style?: CSSProperties;
};
const INK = C.ink;

/** One arm: upper arm from the shoulder, forearm from the elbow, a hand and whatever it holds (kept upright). */
function Arm({ x, side, raise, bend, sleeve, skin, hold }: { x: number; side: 1 | -1; raise: number; bend: number; sleeve: string; skin: string; hold?: ReactNode }) {
  const a = raise * side, b = bend * side;
  return <g transform={`translate(${x} 118) rotate(${a})`}>
    <rect x={-15} y={-6} width={30} height={66} rx={15} fill={sleeve} stroke={INK} strokeWidth={4} />
    <g transform={`translate(0 56) rotate(${b})`}>
      <rect x={-13} y={-4} width={26} height={60} rx={13} fill={sleeve} stroke={INK} strokeWidth={4} />
      <g transform={`translate(0 62) rotate(${-(a + b)})`}>
        {hold && <g transform="translate(-30 -40)">{hold}</g>}
        <circle r={14} fill={skin} stroke={INK} strokeWidth={4} />
      </g>
    </g>
  </g>;
}

export function Figure(p: FigureProps) {
  const skin = p.skin || SKIN[1], hairC = p.hairC || '#2A2019', legs = p.legs || '#2B2D3A';
  const w = (p.h * 220) / 420;
  const hair = p.hair || 'short';
  const torso = 'M56 104 Q110 88 164 104 L156 262 L64 262 Z';
  return <svg viewBox="0 0 220 420" width={w} height={p.h} style={{ width: w, height: p.h, flex: 'none', overflow: 'visible', filter: 'drop-shadow(10px 14px 0 rgba(0,0,0,.35))', transform: p.lean ? `rotate(${p.lean}deg)` : undefined, transformOrigin: '50% 100%', ...p.style }} aria-hidden="true">
    {/* legs and shoes */}
    <rect x={70} y={250} width={36} height={150} rx={12} fill={legs} stroke={INK} strokeWidth={4} />
    <rect x={114} y={250} width={36} height={150} rx={12} fill={legs} stroke={INK} strokeWidth={4} />
    <path d="M62 398h48v16H56q0-16 6-16zM110 398h48q6 0 6 16h-54z" fill={INK} />
    {/* back arms go behind the torso when seen from behind */}
    {p.back && <><Arm x={62} side={1} raise={p.armL || 0} bend={p.bendL || 0} sleeve={p.shirt} skin={skin} hold={p.holdL} /><Arm x={158} side={-1} raise={p.armR || 0} bend={p.bendR || 0} sleeve={p.shirt} skin={skin} hold={p.holdR} /></>}
    <path d={torso} fill={p.shirt} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
    {p.stripe && <path d="M100 96h20v166h-20z" fill={p.stripe} opacity={0.9} />}
    {p.apron && <path d="M78 150h64v112H78z" fill={p.apron} stroke={INK} strokeWidth={4} />}
    {p.tie && !p.back && <path d="M110 104l-9 12 9 70 9-70z" fill={p.tie} stroke={INK} strokeWidth={3} strokeLinejoin="round" />}
    {!p.tie && !p.back && !p.apron && <path d="M92 100q18 18 36 0" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />}
    {p.num != null && <text x={110} y={p.back ? 214 : 196} textAnchor="middle" fontFamily='"Archivo", "Arial Narrow", sans-serif' fontWeight={900} fontSize={p.back ? 84 : 44} fill={p.numC || C.paper} stroke={INK} strokeWidth={p.back ? 3 : 2} style={{ fontStretch: '75%' }}>{p.num}</text>}
    {/* neck and head */}
    <rect x={98} y={80} width={24} height={24} fill={skin} stroke={INK} strokeWidth={4} />
    <circle cx={110} cy={54} r={36} fill={skin} stroke={INK} strokeWidth={4} />
    {hair === 'short' && <path d={p.back ? 'M74 56a36 36 0 0 1 72 0q0 16-6 24H80q-6-8-6-24z' : 'M74 52a36 36 0 0 1 72 0q-10-14-36-14t-36 14z'} fill={hairC} stroke={INK} strokeWidth={4} strokeLinejoin="round" />}
    {hair === 'curls' && <g fill={hairC} stroke={INK} strokeWidth={3}>{[[82, 34], [100, 22], [120, 22], [138, 34], [146, 52], [74, 52]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={14} />)}</g>}
    {hair === 'bun' && <><path d="M74 54a36 36 0 0 1 72 0q-8-18-36-18t-36 18z" fill={hairC} stroke={INK} strokeWidth={4} /><circle cx={110} cy={12} r={14} fill={hairC} stroke={INK} strokeWidth={4} /></>}
    {hair === 'bald' && <path d="M76 58q-4-10 2-18M144 58q4-10-2-18" fill="none" stroke={hairC} strokeWidth={8} strokeLinecap="round" />}
    {hair === 'cap' && <path d={p.back ? 'M72 48a38 38 0 0 1 76 0z' : 'M72 48a38 38 0 0 1 76 0zM140 44h36q0 10-12 10h-24z'} fill={p.capC || C.red} stroke={INK} strokeWidth={4} strokeLinejoin="round" />}
    {p.glasses && !p.back && <g fill="rgba(255,255,255,.35)" stroke={INK} strokeWidth={4}><circle cx={96} cy={58} r={10} /><circle cx={124} cy={58} r={10} /><path d="M106 58h8" /></g>}
    {!p.back && <><Arm x={62} side={1} raise={p.armL || 0} bend={p.bendL || 0} sleeve={p.shirt} skin={skin} hold={p.holdL} /><Arm x={158} side={-1} raise={p.armR || 0} bend={p.bendR || 0} sleeve={p.shirt} skin={skin} hold={p.holdR} /></>}
  </svg>;
}

/** A coffee cup (60×60 prop box). */
export const Cup = ({ c = C.paper, band = C.red }: { c?: string; band?: string }) => <g stroke={INK} strokeWidth={4} strokeLinejoin="round">
  <path d="M12 8h36l-5 50H17z" fill={c} /><path d="M14 22h32l-2 18H16z" fill={band} /><path d="M8 4h44v8H8z" fill={C.ink2} />
</g>;
/** A folded newspaper (60×60 prop box). */
export const Folded = () => <g stroke={INK} strokeWidth={4}><path d="M2 12h56v40H2z" fill={C.paper} /><path d="M6 18h48v8H6z" fill={C.red} stroke="none" /><path d="M8 32h44M8 40h30" /></g>;
/** A phone (60×60 prop box). */
export const Handset = ({ glow = C.red }: { glow?: string }) => <g stroke={INK} strokeWidth={4}><rect x={16} y={0} width={30} height={56} rx={6} fill={C.ink} /><rect x={20} y={6} width={22} height={40} fill={glow} stroke="none" /></g>;

/** Your arm reaching in from the edge of the frame (a sleeve and a hand), pointing along +x before `rot`. */
export function YourArm({ x, y, rot = 0, len = 520, sleeve = '#3B4A6B', skin = SKIN[0], hold, flip }: { x: number; y: number; rot?: number; len?: number; sleeve?: string; skin?: string; hold?: ReactNode; flip?: boolean }) {
  return <svg viewBox={`${-len} -80 ${len + 90} 160`} width={len + 90} height={160} style={{ position: 'absolute', left: x - len, top: y - 80, width: len + 90, height: 160, overflow: 'visible', transformOrigin: `${len}px 80px`, transform: `${flip ? 'scaleX(-1) ' : ''}rotate(${rot}deg)`, filter: 'drop-shadow(10px 14px 0 rgba(0,0,0,.35))' }} aria-hidden="true">
    <rect x={-len} y={-34} width={len} height={68} rx={20} fill={sleeve} stroke={INK} strokeWidth={5} />
    <rect x={-60} y={-38} width={26} height={76} rx={6} fill={C.paper} stroke={INK} strokeWidth={5} />
    {hold && <g transform="translate(-6 -64) scale(1.9)">{hold}</g>}
    <circle cx={16} cy={0} r={32} fill={skin} stroke={INK} strokeWidth={5} />
  </svg>;
}
