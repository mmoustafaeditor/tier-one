// The tells: one visual language across every place, so a player learns it once (GOTY.md §10.2).
//   Done   → the buying club's colours arrive on the set's own object (each set draws its own: scarf, tag, band, seal…).
//   Hijack → two phones light up in two clubs' colours (the set's phone, and the second one that was lying there dark).
//   Off    → the calendar page tears off and flips to next month: he's staying; the player's own club stays lit.
//   Fake   → the newspaper with the rumour is screwed up and thrown in the bin.
// Every tell starts at TELL and peaks at HERO; each takes the anchors the set gives it.
import { Bin, Calendar, Glow, Newspaper, Phone, Pennant, arc, cl, hit, k, lerp, settle } from './world';
import { HERO, TELL, phoneLit, phoneBuzz, bloom, type PlaceZ } from './spec';
import { EASE } from '../../kit';

type P = { x: number; y: number };

/** The set's phone (always) and, for a hijack, the second one lighting in the other club's colour. */
export function Phones({ z, p1, p2, rot1 = -12, rot2 = 16, s = 1, col = '#9FD8FF' }: { z: PlaceZ; p1: P; p2: P; rot1?: number; rot2?: number; s?: number; col?: string }) {
  const { f, phase, o } = z;
  const lit = phoneLit(z);
  const hj = phase === 'call' && o === 1;
  const a = hj ? k(f, TELL + 4, TELL + 8) : 0, b = hj ? k(f, TELL + 12, TELL + 16) : 0;
  const pulse = hj ? 0.75 + 0.25 * Math.sin((f - TELL) * 0.7) : 1;
  const c1 = hj && a > 0 ? z.to.c1 : col, c2 = z.alt.c1;
  const buzz = phoneBuzz(z) + (hj ? Math.max(0, hit(f, TELL + 4, 14), hit(f, TELL + 12, 14)) * f : 0);
  return <>
    {hj && <Glow x={(p1.x + p2.x) / 2} y={(p1.y + p2.y) / 2 + 20} r={520} ry={300} col="#FFFFFF" o={0.1 * bloom(z)} />}
    <Phone x={p2.x} y={p2.y} rot={rot2} s={s * 0.94} lit={b * pulse} col={c2} buzz={b > 0 ? buzz : 0} />
    <Phone x={p1.x} y={p1.y} rot={rot1} s={s} lit={hj ? lerp(lit, pulse, a) : lit} col={c1} buzz={buzz} />
  </>;
}

/** Off: the calendar flips to next month; the player's own club's pennant beside it brightens. */
export function CalendarTell({ z, at, s = 1, pennant }: { z: PlaceZ; at: P; s?: number; pennant?: P }) {
  const on = z.phase === 'call' && z.o === 2;
  const flip = on ? k(z.f, TELL + 4, TELL + 26, EASE.inOut) : 0;
  const g = on ? bloom(z) : 0;
  return <>
    {pennant && <>
      {g > 0 && <Glow x={pennant.x} y={pennant.y + 40} r={110} ry={130} col={z.from.c1} o={g * 0.5} />}
      <Pennant x={pennant.x} y={pennant.y} c={z.from} s={s * 0.9} o={0.55 + 0.45 * g} />
    </>}
    <Calendar x={at.x} y={at.y} s={s} flip={flip} month={z.month} next={z.next} glow={g} />
  </>;
}

/** Fake: the paper lifts off its surface, screws up and arcs into the bin; a hard spot lands on the bin. */
export function PaperTell({ z, paper, bin, rot = -8, s = 1, binS = 1, lift = 90 }: { z: PlaceZ; paper: P; bin: P; rot?: number; s?: number; binS?: number; lift?: number }) {
  const { f } = z;
  const on = z.phase === 'call' && z.o === 3;
  const up = on ? k(f, TELL + 2, TELL + 10, EASE.out) : 0;
  const crumple = on ? k(f, TELL + 8, TELL + 20) : 0;
  const t = on ? k(f, TELL + 20, TELL + 31, EASE.in) : 0;
  const px = paper.x, py = paper.y - up * lift;
  const a = arc(t, px, py, bin.x, bin.y - 100, 120);
  const inBin = t >= 1;
  const g = on ? bloom(z) : 0;
  return <>
    {g > 0 && <Glow x={bin.x} y={bin.y - 60} r={150} ry={190} col="#FFE3A3" o={g * 0.8} />}
    <Bin x={bin.x} y={bin.y} s={binS} f={f} hitAt={on ? TELL + 31 : -1} />
    {!inBin && <Newspaper x={a.x} y={a.y} c={z.to} rot={rot + t * 520 + up * -6} s={s * lerp(1, 0.8, t)} crumple={crumple} />}
    {inBin && <g transform={`translate(${bin.x} ${bin.y - 96 - Math.max(0, 1 - cl((f - TELL - 31) / 6)) * 12})`}><Newspaper x={0} y={0} c={z.to} s={s * 0.5} crumple={1} rot={30} /></g>}
  </>;
}

/** Done: an overshooting drop for whatever the set hangs in the buying club's colours (0 before, 1 settled). */
export const doneDrop = (z: PlaceZ, delay = 6) => (z.phase === 'call' && z.o === 0 ? settle(z.f, TELL + delay) : 0);
/** Done: the object is in frame before the tell only if the set wants it (a pennant that was there all along); here it arrives. */
export const doneVisible = (z: PlaceZ) => z.phase === 'call' && z.o === 0 && z.f >= TELL;
/** The hero's light: white-hot at the hero frame, held to the end. */
export const heroGlow = (z: PlaceZ) => (z.phase === 'call' ? k(z.f, TELL + 8, HERO) : 0);
export { TELL, HERO };
