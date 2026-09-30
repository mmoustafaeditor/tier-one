// A title card on the desk: the fallback for the press box films until their clips land. A newsprint card rises
// from the desk with the kicker in the accent colour, the headline typesets, the sub prints, and the stamp slams.
// Frame-driven like every scene (film/kit.tsx); ~2.8 s, then a short hold.
import { AbsoluteFill, interpolate, spring } from '../remotion-shim';
import { C, F, DeskSurface, FilmLook, Layer, Motes, Paper, Stamp, Typeset, camAt, clamp, k01, shake, useStage, type Key } from '../kit';
import type { SceneMeta } from '../cues';

export type TitleCardProps = { kicker: string; title: string; sub: string; stamp: string; accent: string; byline: string; ltrTitle?: boolean; rtl?: boolean };
const T = { rise: 0, kicker: 10, title: 16, sub: 30, stamp: 46, end: 84 };
export const TITLE_CARD: SceneMeta = {
  dur: T.end, hold: 700, beats: [0, T.stamp],
  cues: [{ f: 0, k: 'whoosh' }, { f: T.title, k: 'typewriter' }, { f: T.stamp, k: 'stamp' }, { f: T.stamp + 2, k: 'fanfare' }],
};

export function TitleCard(p: TitleCardProps) {
  const { f, fps, P } = useStage();
  const keys: Key[] = [{ f: 0, x: 0, y: P ? 40 : 0, z: P ? 1.0 : 0.92 }, { f: T.stamp, x: 0, y: P ? 10 : 0, z: P ? 1.06 : 0.98 }, { f: T.end, x: 0, y: 0, z: P ? 1.08 : 1.0 }];
  const c0 = camAt(f, keys), sh = shake(f, [T.stamp], 16), cam = { ...c0, x: c0.x + sh.x, y: c0.y + sh.y };
  const rise = spring({ frame: f - T.rise, fps, config: { damping: 15, stiffness: 120 } });
  const glow = k01(f, T.stamp, T.stamp + 8);
  const w = P ? 900 : 1100, h = P ? 700 : 560;
  return <AbsoluteFill style={{ background: C.night, overflow: 'hidden', direction: p.rtl ? 'rtl' : 'ltr' }}>
    <Layer cam={cam}>
      <DeskSurface x={-3000} y={-2600} w={6000} h={6000} />
      <Motes n={14} seed={3} />
      <div style={{ position: 'absolute', left: -1400, top: -1400, width: 2800, height: 2800, borderRadius: '50%', background: `radial-gradient(circle, ${hexA(p.accent, 0.08 + glow * 0.18)}, transparent 58%)` }} />
      <div style={{ position: 'absolute', left: -w / 2, top: -h / 2, width: w, height: h, transform: `translateY(${(1 - rise) * 800}px) rotate(${(1 - rise) * 5 - 1.2}deg)` }}>
        <Paper lift={0.6}>
          <i style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 26, background: p.accent }} />
          <i style={{ position: 'absolute', left: 60, right: 60, top: 84, height: 6, background: C.ink }} />
          <i style={{ position: 'absolute', left: 60, right: 60, top: 96, height: 2, background: C.ink }} />
        </Paper>
        <div style={{ position: 'absolute', inset: 0, padding: P ? '110px 70px 70px 90px' : '112px 90px 60px 100px', color: C.ink, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontFamily: F.cond, fontStretch: '80%', fontWeight: 900, fontSize: 34, letterSpacing: '.08em', textTransform: 'uppercase', color: p.accent === C.gold ? C.goldDeep : p.accent, opacity: k01(f, T.kicker, T.kicker + 6) }}>{p.kicker}</div>
          <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: P ? 92 : 104, lineHeight: 1.02, letterSpacing: '-.02em', minHeight: P ? 200 : 110, textWrap: 'balance' as never }}>
            {p.ltrTitle ? <bdi dir="ltr"><Typeset text={p.title} at={T.title} cpf={1.4} /></bdi> : <Typeset text={p.title} at={T.title} cpf={1.4} />}
          </div>
          <div style={{ fontFamily: F.text, fontSize: 40, lineHeight: 1.25, color: C.ink2, opacity: k01(f, T.sub, T.sub + 8), transform: `translateY(${(1 - k01(f, T.sub, T.sub + 8)) * 14}px)` }}>{p.sub}</div>
          <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, maxWidth: '100%' }}>
            <span style={{ fontFamily: F.display, fontStyle: 'italic', fontSize: 34, color: C.ink3, opacity: k01(f, T.sub + 4, T.sub + 12) }}><bdi dir="ltr">{p.byline}</bdi></span>
            <Stamp text={p.stamp} color={p.accent === C.gold ? C.goldDeep : p.accent} at={T.stamp} size={Math.min(P ? 46 : 60, Math.floor((P ? 640 : 800) / Math.max(6, Array.from(p.stamp).length) * 1.55))} rot={-7} style={{ marginInlineStart: 'auto', maxWidth: '100%' }} />
          </div>
        </div>
      </div>
    </Layer>
    <FilmLook vignette={interpolate(f, [0, T.stamp], [0.85, 0.65], clamp)} />
  </AbsoluteFill>;
}
function hexA(hex: string, a: number) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) return `rgba(247,185,40,${a})`;
  const n = parseInt(m[1], 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
