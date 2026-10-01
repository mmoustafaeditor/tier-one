// Leaderboard prizes and badges on screen (SAIF-03, lib/awards.ts): the badge strip on the byline and the prize card.
// RULES4 §4: a crown means Tier One and nothing else, so medals are a ribbon with their place in words ("1st ×2").
import type { CSSProperties } from 'react';
import { useT } from '../lib/i18n';
import type { Save } from '../lib/save';
import { ACH_IDS } from '../lib/meta';
import { ACH_IC, medals, scalps, claimPrize, unpaid, medalOf } from '../lib/awards';
import { sfx } from '../lib/sfx';
import { Icon, GBtn, confetti } from './game';
import { toast } from '../lib/meta';
import '../styles/awards.css';

/** A medal: a disc on a ribbon (drawn in the icon set's 2px line). Never a crown. */
export function Ribbon({ size = 15 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3l2.5 6M16 3l-2.5 6M12 21a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM12 13.2v4.6" /></svg>;
}
/** The badges you've earned, on your byline: board medals, rival scalps, your latest trophies. Nothing when empty. */
export function BadgeRow({ s, style }: { s: Save; style?: CSSProperties }) {
  const t = useT();
  const m = medals(s), sc = scalps(s);
  const latest = ACH_IDS.filter((id) => s.ach[id]).sort((a, b) => s.ach[b] - s.ach[a]).slice(0, 3);
  const items: { k: string; ic: string; n?: number; label: string; short?: string }[] = [
    ...(['gold', 'silver', 'bronze'] as const).filter((k) => m[k]).map((k) => ({ k, ic: 'medal', n: m[k], short: t('l4.p.m' + (['gold', 'silver', 'bronze'].indexOf(k) + 1), { n: m[k] }), label: t('aw.medal.' + k, { n: m[k] }) })),
    ...(sc ? [{ k: 'scalp', ic: 'bolt', n: sc, label: t('aw.scalps', { n: sc }) }] : []),
    ...latest.map((id) => ({ k: 'ach', ic: ACH_IC[id] || 'trophy', label: (t.list('ach.list.' + id) as string[] | undefined)?.[0] || id })),
  ];
  if (!items.length) return null;
  return <ul className="aw-badges" style={style} aria-label={t('aw.badges')}>
    {items.map((x, i) => <li key={i} className={'aw-badge aw-badge--' + x.k} title={x.label} aria-label={x.label}>
      {x.ic === 'medal' ? <Ribbon /> : <Icon n={x.ic} size={15} />}<span className="aw-badge__t" aria-hidden="true">{x.short || (x.n != null ? '×' + x.n : x.label)}</span>
    </li>)}
  </ul>;
}

/** Prizes won and not yet collected: one gold card each, one tap to collect. */
export function PrizeCards({ s }: { s: Save }) {
  const t = useT();
  const due = unpaid(s);
  if (!due.length) return null;
  const collect = (key: string) => {
    const n = claimPrize(key); if (!n) return;
    sfx('sparkle'); confetti(['#F7B928', '#FFD76A', '#A36F00', '#F4EFE4'], 90);
    toast('ach', t('aw.collected', { n }));
  };
  return <div className="aw-prizes">
    {due.map((p) => <div key={p.key} className={'aw-prize g-card aw-prize--' + (medalOf(p.rank) || 'top')}>
      <span className="aw-prize__ic" aria-hidden="true">{p.rank <= 3 ? <Ribbon size={26} /> : <Icon n="trophy" size={26} />}</span>
      <div className="aw-prize__b"><b>{t('aw.won.' + p.period, { r: p.rank })}</b><span className="g-mono">{t('aw.of', { n: p.players })}</span></div>
      <GBtn kind="gold" size="sm" sound={null} onClick={() => collect(p.key)}><span className="g-coin" />{t('aw.collect', { n: p.coins })}</GBtn>
    </div>)}
  </div>;
}
