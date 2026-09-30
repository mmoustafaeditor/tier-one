// Season UI pieces other screens can drop in: the weekly event banner, cosmetic previews and the claim reveal.
import { useEffect, useRef, type CSSProperties } from 'react';
import { useT } from '../lib/i18n';
import { useSave } from '../lib/save';
import { sfx } from '../lib/sfx';
import { cosmetic, frameCSS, weekEventView, type Cosmetic } from '../lib/season';
import { Icon } from './game';
import '../styles/season.css';

const nameOf = (t: ReturnType<typeof useT>, c: Cosmetic) => t(c.nameKey, c.nameVars);
export { nameOf as cosName };

// A true-to-life preview of a cosmetic: the frame on a mini post, the ink on a stamp, flair beside your byline,
// the desk colours under a sheet of paper, or a phone for a ring.
export function CosSwatch({ c, nick, size = '' }: { c: Cosmetic; nick?: string; size?: '' | 'sm' }) {
  const t = useT();
  const cls = 'cos cos--' + c.kind + (size ? ' cos--' + size : '');
  switch (c.kind) {
    case 'frame': return <span className={cls} aria-hidden="true"><span className="cos__post" style={frameCSS(c) as CSSProperties}><i /><i /><i /></span></span>;
    case 'ink': return <span className={cls} aria-hidden="true"><span className="cos__stamp" style={{ color: c.c, borderColor: c.c }}>{t('stamp.filed')}</span></span>;
    case 'flair': return <span className={cls} aria-hidden="true"><span className="cos__nick">{nick || 'Byline'}<b style={{ color: c.c }}>{c.g}</b></span></span>;
    case 'ringtone': return <span className={cls} aria-hidden="true"><Icon n="phone" size={size ? 16 : 22} /></span>;
    case 'theme':
      if (c.paper) return <span className={cls} aria-hidden="true"><span className={'cos__paper swatch swatch--' + c.id} /></span>;
      return <span className={cls} aria-hidden="true" style={{ background: `linear-gradient(135deg, ${c.desk![0]}, ${c.desk![2]})` }}><span className="cos__sheet" /></span>;
  }
}

// Weekly event (Practice and Career only). Drop into Home or Practice: <WeekEventBanner/>.
export function WeekEventBanner({ onPlay, compact }: { onPlay?: () => void; compact?: boolean }) {
  const t = useT();
  const s = useSave();
  const { ev, n, got, daysLeft } = weekEventView(s);
  const reward = cosmetic(ev.reward)!;
  const vars = { r: t('rival.itk'), l: ev.rules.league ? t('m.wire.lg.' + ev.rules.league) : '' };
  const goal = ev.id === 'rival' ? t('season.ev.goalItk', { r: vars.r, n: ev.goal }) : t('season.ev.goalPlay', { n: ev.goal });
  return <section className={'wkev' + (compact ? ' wkev--compact' : '') + (got ? ' is-won' : '')} style={{ ['--ev' as string]: ev.accent }} aria-label={t(ev.nameKey)}>
    <div className="wkev__main">
      <p className="wkev__when">{t('season.ev.k')} <span>{t('season.ev.only')}</span></p>
      <h3 className="wkev__name">{t(ev.nameKey)}</h3>
      <p className="wkev__rule">{t(ev.descKey, vars)}</p>
      <div className="wkev__goal">
        <span className="wkev__pips" role="img" aria-label={t('season.ev.progress', { a: n, b: ev.goal })}>{Array.from({ length: ev.goal }, (_, k) => <i key={k} className={k < n ? 'on' : ''} />)}</span>
        <span>{got ? t('season.ev.won') : goal}</span>
        {!got && <span className="wkev__left">{t('season.ev.left', { n: daysLeft })}</span>}
      </div>
    </div>
    <div className="wkev__reward">
      <CosSwatch c={reward} nick={s.nick} size="sm" />
      <small>{nameOf(t, reward)}</small>
      {got ? <Icon n="check" size={16} /> : onPlay && <button type="button" className="g-btn g-btn--sm g-btn--dark" onClick={onPlay}>{t('season.ev.play')}</button>}
    </div>
  </section>;
}

// The claim reveal: a card dealt face down, flipped to the reward; coins rain for coin rewards.
export interface RevealItem { coins?: number; cos?: string[] }
export function Reveal({ item, onClose, onEquip }: { item: RevealItem; onClose: () => void; onEquip?: (id: string) => void }) {
  const t = useT();
  const s = useSave();
  const btn = useRef<HTMLButtonElement>(null);
  const c = item.cos && item.cos.length ? cosmetic(item.cos[0]) : null;
  useEffect(() => {
    sfx('reveal');
    const k = window.setTimeout(() => sfx(item.coins ? 'coin' : 'unlock'), 420);
    btn.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', esc);
    return () => { clearTimeout(k); removeEventListener('keydown', esc); };
  }, []);
  const coins = item.coins ? Array.from({ length: Math.min(28, 8 + item.coins / 4) }, (_, k) => ({ x: (k * 37) % 100, d: (k * 53) % 600, r: (k * 71) % 360 })) : [];
  return <div className="reveal" role="dialog" aria-modal="true" aria-label={c ? t('season.reveal.item') : t('season.reveal.coins', { n: item.coins || 0 })} onClick={onClose}>
    {coins.length > 0 && <div className="reveal__rain" aria-hidden="true">{coins.map((p, k) => <span key={k} className="g-coin" style={{ ['--x' as string]: p.x + '%', ['--d' as string]: p.d + 'ms', ['--r' as string]: p.r + 'deg' }} />)}</div>}
    <div className="reveal__card" onClick={(e) => e.stopPropagation()}>
      <div className="reveal__flip">
        <div className="reveal__back" aria-hidden="true"><b>T1</b></div>
        <div className="reveal__face">
          {c ? <><CosSwatch c={c} nick={s.nick} /><p className="reveal__what">{t('season.store.kind1.' + c.kind)}</p><h2 className="reveal__name">{nameOf(t, c)}</h2></>
            : <><span className="reveal__coin" aria-hidden="true"><span className="g-coin" /></span><h2 className="reveal__name g-num">{t('season.reveal.coins', { n: item.coins || 0 })}</h2></>}
          {c && item.coins ? <p className="reveal__what">{t('season.reveal.coins', { n: item.coins })}</p> : null}
          {item.cos && item.cos.length > 1 && <p className="reveal__what">+{item.cos.length - 1}</p>}
          <div className="reveal__acts">
            {c && onEquip && <button type="button" ref={btn} className="g-btn g-btn--gold" onClick={() => { onEquip(c.id); onClose(); }}>{t('season.reveal.equip')}</button>}
            <button type="button" ref={c && onEquip ? undefined : btn} className="g-btn g-btn--dark" onClick={onClose}>{c && onEquip ? t('season.reveal.later') : t('common.done')}</button>
          </div>
        </div>
      </div>
    </div>
  </div>;
}
