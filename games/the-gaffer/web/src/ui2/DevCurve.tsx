// The development curve on a player's profile (V2.6): his REAL rating history (every sample the unified development
// function wrote, sim/youth.ts `rh`), then the coaches' projection band ahead, against our XI average. Time runs on a
// true season axis (a mid-season step sits mid-season), right to left in Arabic. No placeholder points: a player whose
// history has just begun shows one dot and says so.
import { useState } from 'react';
import type { Player } from '../model/types';
import { dec } from '../sim/youth';
import { useGame } from './game';
import { Y } from '../lang-youth-all';

export interface Band { now: number; lo: number[]; hi: number[] } // projection for seasons +0..+5 (lo/hi ratings)

export function DevCurve({ p, band, avg, rounds }: { p: Player; band: Band; avg: number; rounds: number }) {
  const g = useGame();
  const { c, x, rtl } = g;
  const Yx = Y[g.ui];
  const [hover, setHover] = useState<number | null>(null);
  // Real samples: (time in seasons, rating). A sample at round 99 is the season's end.
  const hist = (p.rh ?? []).map(dec).map((s) => ({ t: s.season + Math.min(1, s.round / Math.max(1, rounds)), v: s.rating, s }));
  const nowT = c.season + Math.min(1, c.round / Math.max(1, rounds));
  if (!hist.length || hist[hist.length - 1].v !== p.rating || hist[hist.length - 1].t < nowT - 0.001) hist.push({ t: nowT, v: p.rating, s: { season: c.season, round: c.round, rating: p.rating } });
  const t0 = Math.min(hist[0].t, nowT - 0.5);
  const t1 = c.season + 5.5;
  const vals = [...hist.map((h) => h.v), ...band.lo, ...band.hi, avg];
  const y0 = Math.max(30, Math.min(...vals) - 4), y1 = Math.min(99, Math.max(...vals) + 3);
  const W = 600, H = 180, P = { l: 30, r: 14, t: 12, b: 24 };
  const X = (t: number) => { const u = P.l + ((t - t0) / (t1 - t0)) * (W - P.l - P.r); return rtl ? W - u : u; };
  const Yv = (v: number) => P.t + (1 - (v - y0) / (y1 - y0)) * (H - P.t - P.b);
  const bandT = band.lo.map((_, i) => (i === 0 ? nowT : c.season + i + 0.5));
  const poly = [...bandT.map((t, i) => `${X(t)},${Yv(band.hi[i])}`), ...bandT.map((t, i) => `${X(t)},${Yv(band.lo[i])}`).reverse()].join(' ');
  const line = hist.map((h, i) => `${i ? 'L' : 'M'}${X(h.t).toFixed(1)},${Yv(h.v).toFixed(1)}`).join('');
  const seasons: number[] = [];
  for (let s = Math.ceil(t0); s <= c.season + 5; s++) seasons.push(s);
  const ticks = [y0, Math.round((y0 + y1) / 2), y1].map(Math.round);
  const first = hist[0].s;
  const summary = `${Yx.cv.real}: ${hist.map((h) => h.v).join(', ')}. ${Yx.cv.proj}: ${band.lo[band.lo.length - 1]}–${band.hi[band.hi.length - 1]}.`;
  return (
    <div className="devcurve">
      <div className="chart" onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: H, width: '100%' }} role="img" aria-label={summary}
          onPointerMove={(e) => {
            const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const px = ((e.clientX - r.left) / r.width) * W;
            let best = 0, bd = Infinity;
            hist.forEach((h, i) => { const d = Math.abs(X(h.t) - px); if (d < bd) { bd = d; best = i; } });
            setHover(bd < 40 ? best : null);
          }}>
          {ticks.map((t) => <line key={t} x1={P.l} x2={W - P.r} y1={Yv(t)} y2={Yv(t)} stroke="var(--dv-grid)" vectorEffect="non-scaling-stroke" />)}
          {seasons.map((s) => <line key={s} x1={X(s)} x2={X(s)} y1={P.t} y2={H - P.b} stroke="var(--dv-grid)" strokeDasharray="1 4" vectorEffect="non-scaling-stroke" />)}
          <polygon points={poly} fill="var(--dv-us)" opacity=".15" />
          <line x1={X(t0)} x2={X(t1)} y1={Yv(avg)} y2={Yv(avg)} stroke="var(--dv-them)" strokeWidth="2" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
          <line x1={X(nowT)} x2={X(nowT)} y1={P.t} y2={H - P.b} stroke="var(--dv-axis)" strokeDasharray="2 3" opacity=".8" vectorEffect="non-scaling-stroke" />
          {hist.length > 1 && <path d={line} fill="none" stroke="var(--dv-us)" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        </svg>
        {/* dots as HTML so they stay round whatever the aspect ratio */}
        {hist.map((h, i) => (
          <span key={i} className={`dc-dot${i === hist.length - 1 ? ' now' : ''}${hover === i ? ' hot' : ''}`} style={{ insetInlineStart: `${((rtl ? W - X(h.t) : X(h.t)) / W) * 100}%`, top: Yv(h.v) }} />
        ))}
        <div className="chart-y" aria-hidden="true">{ticks.map((t) => <span key={t} style={{ top: Yv(t) - 7 }}>{t}</span>)}</div>
        <div className="chart-x" aria-hidden="true">{seasons.map((s) => <span key={s} style={{ insetInlineStart: `${((rtl ? W - X(s + 0.5) : X(s + 0.5)) / W) * 100}%` }}>{x.seasonLabel(s).slice(2)}</span>)}</div>
        {hover !== null && (
          <div className="tip" style={{ opacity: 1, insetInlineStart: `min(calc(100% - 150px), max(0px, calc(${((rtl ? W - X(hist[hover].t) : X(hist[hover].t)) / W) * 100}% - 60px)))` }}>
            <b>{x.seasonLabel(hist[hover].s.season)}{hist[hover].s.round < 99 ? ` · ${x.common.matchday(Math.max(1, hist[hover].s.round))}` : ''}</b>
            <span><i style={{ background: 'var(--dv-us)' }} />{Yx.cv.real} {hist[hover].v}</span>
          </div>
        )}
      </div>
      <div className="legend"><span><i />{Yx.cv.real}</span><span><i className="band" />{Yx.cv.proj}</span><span><i className="them" />{Yx.cv.avg}</span></div>
      <p className="small muted dc-note">{hist.length <= 1 ? Yx.cv.one : Yx.cv.starts(`${x.seasonLabel(first.season)}${first.round && first.round < 99 ? ` · ${x.common.matchday(first.round)}` : ''}`)}</p>
    </div>
  );
}
