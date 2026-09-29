// Momentum: who's on top, minute by minute (the engine's threat balance: chances, entries, balls won high), with the
// goals marked. Home above the line, away below; it always reads left to right in time.
import type { LiveMatch } from '../sim/match';

export function Momentum({ m, colors, label }: { m: LiveMatch; colors: [string, string]; label: string }) {
  const mom = m.tl?.mom ?? [];
  const W = 180, H = 40, mid = H / 2, bw = W / 90;
  // Smooth over three minutes so it breathes rather than flickers.
  const sm = mom.map((_, i) => (mom[i - 1] ?? 0) * 0.25 + mom[i] * 0.5 + (mom[i + 1] ?? mom[i]) * 0.25);
  const max = Math.max(20, ...sm.map(Math.abs));
  const goals = m.events.filter((e) => e.kind === 'goal');
  return (
    <figure className="g-mom" aria-label={label} dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img">
        <line x1={W / 2} x2={W / 2} y1="2" y2={H - 2} className="g-mom-ht" />
        <line x1="0" x2={W} y1={mid} y2={mid} className="g-mom-axis" />
        {sm.map((v, i) => {
          const h = Math.max(0.6, (Math.abs(v) / max) * (mid - 3));
          return <rect key={i} x={i * bw + 0.15} width={bw - 0.3} y={v >= 0 ? mid - h : mid} height={h} rx=".4" fill={v >= 0 ? colors[0] : colors[1]} opacity={0.35 + 0.65 * Math.min(1, Math.abs(v) / max)} />;
        })}
        {goals.map((g, i) => <circle key={i} cx={(g.min - 0.5) * bw} cy={g.side === 0 ? 3 : H - 3} r="2.4" className="g-mom-goal" fill={colors[g.side]} />)}
        {m.minute < 90 && <line x1={m.minute * bw} x2={m.minute * bw} y1="0" y2={H} className="g-mom-now" />}
      </svg>
    </figure>
  );
}
