// Small shared pieces for the moment films.
import { AbsoluteFill, interpolate } from '../remotion-shim';
import { C, clamp, useStage } from '../kit';

/** Deterministic confetti: every piece is a closed-form throw, so any frame can be drawn on its own. */
export function Confetti({ at, W, cols = [C.gold, C.red, C.done, '#35C3E6', C.paper], n = 70 }: { at: number; W: number; cols?: string[]; n?: number }) {
  const { f, fps, H } = useStage();
  const t = (f - at) / fps;
  if (t < 0 || t > 2.4) return null;
  return <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 40 }}>{Array.from({ length: n }, (_, i) => {
    const a = ((i * 137.5) % 360) * (Math.PI / 180), v = 900 + ((i * 97) % 700);
    const x = W / 2 + Math.cos(a) * v * t * 0.8, y = H * 0.38 - Math.abs(Math.sin(a)) * v * t * 1.1 + 1400 * t * t;
    return <i key={i} style={{ position: 'absolute', left: x, top: y, width: 16 + (i % 3) * 6, height: 24 + (i % 4) * 5, background: cols[i % cols.length], transform: `rotate(${i * 40 + t * 600 * ((i % 2) ? 1 : -1)}deg) scaleY(${Math.cos(t * 12 + i)})`, opacity: interpolate(t, [1.6, 2.4], [1, 0], clamp) }} />;
  })}</AbsoluteFill>;
}

/** A stable small number from a name (shirt numbers, kit picks). */
export const pick = (s: string, n: number) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % n; };
