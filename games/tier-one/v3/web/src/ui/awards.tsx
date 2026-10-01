// Leaderboard prizes and badges on screen (SAIF-03, lib/awards.ts): the badge strip on the byline and the prize card.
import type { CSSProperties } from 'react';
import { useT } from '../lib/i18n';
import type { Save } from '../lib/save';
import { ACH_IDS } from '../lib/meta';
import { ACH_IC, medals, scalps, claimPrize, unpaid, medalOf } from '../lib/awards';
import { sfx } from '../lib/sfx';
import { Icon, GBtn, confetti } from './game';
import { toast } from '../lib/meta';
import '../styles/awards.css';

/** The badges you've earned, on your byline: board medals, rival scalps, your latest trophies. Nothing when empty. */
export function BadgeRow({ s, style }: { s: Save; style?: CSSProperties }) {
  const t = useT();
  const m = medals(s), sc = scalps(s);
  const latest = ACH_IDS.filter((id) => s.ach[id]).sort((a, b) => s.ach[b] - s.ach[a]).slice(0, 3);
  const items: { k: string; ic: string; n?: number; label: string }[] = [
    ...(['gold', 'silver', 'bronze'] as const).filter((k) => m[k]).map((k) => ({ k, ic: 'crown', n: m[k], label: t('aw.medal.' + k, { n: m[k] }) })),
    ...(sc ? [{ k: 'scalp', ic: 'bolt', n: sc, label: t('aw.scalps', { n: sc }) }] : []),
    ...latest.map((id) => ({ k: 'ach', ic: ACH_IC[id] || 'trophy', label: (t.list('ach.list.' + id) as string[] | undefined)?.[0] || id })),
  ];
  if (!items.length) return null;
  return <ul className="aw-badges" style={style} aria-label={t('aw.badges')}>
    {items.map((x, i) => <li key={i} className={'aw-badge aw-badge--' + x.k} title={x.label} aria-label={x.label}>
      <Icon n={x.ic} size={15} /><span className="aw-badge__t" aria-hidden="true">{x.n != null ? '×' + x.n : x.label}</span>
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
      <span className="aw-prize__ic" aria-hidden="true"><Icon n={p.rank <= 3 ? 'crown' : 'trophy'} size={26} /></span>
      <div className="aw-prize__b"><b>{t('aw.won.' + p.period, { r: p.rank })}</b><span className="g-mono">{t('aw.of', { n: p.players })}</span></div>
      <GBtn kind="gold" size="sm" sound={null} onClick={() => collect(p.key)}><span className="g-coin" />{t('aw.collect', { n: p.coins })}</GBtn>
    </div>)}
  </div>;
}
