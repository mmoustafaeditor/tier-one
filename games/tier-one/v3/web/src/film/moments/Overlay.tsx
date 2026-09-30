// The words the game prints over a moment clip (the clip can't know your byline, the tier, the source or the rival).
// A newsprint plate that slams up in the lower third at `at`, frame-driven like every scene.
import { AbsoluteFill, spring } from '../remotion-shim';
import { C, F, Paper, Stamp, Typeset, k01, useStage } from '../kit';

export type OverlayProps = { at: number; kicker?: string; title: string; sub?: string; stamp?: string; accent?: string; rtl?: boolean };

export function MomentOverlay(p: OverlayProps) {
  const { f, fps, P } = useStage();
  if (f < p.at) return null;
  const s = spring({ frame: f - p.at, fps, config: { damping: 14, stiffness: 170 } });
  const acc = p.accent || C.red;
  const w = P ? 920 : 980;
  return <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: P ? 'center' : 'flex-start', padding: P ? '0 0 250px' : '0 0 130px 110px', direction: p.rtl ? 'rtl' : 'ltr', pointerEvents: 'none', zIndex: 55 }}>
    <div style={{ position: 'relative', width: w, transform: `translateY(${(1 - s) * 500}px) rotate(${(1 - s) * 4 - 1}deg)` }}>
      <div style={{ position: 'relative', minHeight: 200 }}>
        <Paper lift={0.5}>
          <i style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 22, background: acc }} />
        </Paper>
        <div style={{ position: 'relative', padding: '28px 40px 30px 58px', paddingInlineStart: 58, color: C.ink, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {p.kicker && <span style={{ fontFamily: F.mono, fontSize: 30, letterSpacing: '.08em', color: C.ink2, opacity: k01(f, p.at + 4, p.at + 10) }}>{p.kicker}</span>}
          <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: P ? 92 : 84, lineHeight: 1.02, letterSpacing: '-.01em' }}><Typeset text={p.title} at={p.at + 4} cpf={1.6} /></span>
          {p.sub && <span style={{ fontFamily: F.text, fontWeight: 700, fontSize: 38, color: C.ink2, opacity: k01(f, p.at + 12, p.at + 20) }}>{p.sub}</span>}
        </div>
      </div>
      {p.stamp && <div style={{ position: 'absolute', insetInlineEnd: -10, top: -70 }}><Stamp text={p.stamp} color={acc === C.gold ? C.goldDeep : C.redDeep} at={p.at + 16} size={78} rot={-10} style={{ background: 'rgba(244,239,228,.92)' }} /></div>}
    </div>
  </AbsoluteFill>;
}
