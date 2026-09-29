// Semba Pass + wallet + shop (look/mockups/store.html). The Pass and credit packs are concepts: there is no verified
// payment flow, so nothing here takes money. Credits are earned by playing and buy cosmetics and Career favours only.
// 3.1: your level up top, the 40-level season track as a scroller of reward cards, the shop as cards.
import { useEffect, useRef } from 'react';
import { useT, num, fmtDate } from '../lib/i18n';
import { useSave, update } from '../lib/save';
import { spend, seasonName, toast } from '../lib/meta';
import { levelOf, MAX_LV } from '../lib/progress';
import { sfx } from '../lib/sfx';
import { Icon, GBtn, TopBar } from '../ui/game';
import type { Chrome } from '../App';

const THEMES = [{ id: 'salmon', price: 400 }, { id: 'tabloid', price: 400 }, { id: 'neon', price: 400 }];
const PACKS: [string, number, string][] = [['$0.99', 100, ''], ['$4.99', 550, '+10%'], ['$9.99', 1200, '+20%'], ['$19.99', 2600, '+30%']];
const PERK_IC = ['x', 'news', 'story', 'gift', 'star', 'crown'];
// The free lane pays 20 credits when your track tier (floor(PP / 100)) hits a multiple of 4 (lib/meta.ts addPP).
// Level = tier + 1, so those land on levels 5, 9 … 37, and the last on tier 40 (shown on level 40).
const rewardTier = (lv: number) => (lv === MAX_LV ? 40 : lv > 1 && (lv - 1) % 4 === 0 ? lv - 1 : 0);

export function PassScreen(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const lv = levelOf(s.pp);
  const tier = Math.floor(s.pp / 100);
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = track.current, el = c?.querySelector('.tcard.is-now') as HTMLElement | null;
    if (c && el) c.scrollLeft += el.getBoundingClientRect().left - c.getBoundingClientRect().left - (c.clientWidth - el.clientWidth) / 2;
  }, []);
  const buyTheme = (id: string, price: number) => { if (spend(price, 'theme:' + id)) { sfx('coin'); update((x) => { x.owned.push(id); x.theme = id; }); } };
  const buyFavour = () => {
    const d = new Date().toISOString().slice(0, 10), k = 'fav:' + d;
    if ((s.stats[k] || 0) >= 3 || !s.career) return;
    if (spend(15, 'favour')) { sfx('coin'); update((x) => { x.stats[k] = (x.stats[k] || 0) + 1; if (x.career) { const kinds = ['burner', 'tipoff', 'stakeout'] as const; const kind = kinds[(x.stats[k] - 1) % 3]; x.career.favours[kind]++; toast('info', t('career.' + kind)); } }); }
  };
  const applyTheme = (id: string) => { sfx('ui.tap'); update((x) => { x.theme = id; }); };
  const [favName, favD] = t.list('pass.items.favour') as string[];
  return <div className="g-screen g-screen--wide pass3">
    <TopBar back={{ label: t('g.tabs.me'), onClick: () => chrome.go({ n: 'me' }) }} title={t('g.home.passT')} onMenu={chrome.openSettings} />
    <div className="stagger g-stack">
      <section className="g-hero g-hero--pass" style={{ ['--i' as string]: 0 }}>
        <div className="lvhero">
          <span className="lvbadge"><small className="g-mono">{t('g.lv', { n: '' }).trim()}</small><b className="g-num">{lv.n}</b></span>
          <div className="lvhero__main">
            <span className="g-mono g-hero__k">{t('g.pass.k')} · {seasonName()}</span>
            <h1 className="g-hero__t">{t('g.pass.hed', { n: lv.n })} <span className="lvhero__of">{t('g.pass.of')}</span></h1>
            <span className="g-bar" style={{ ['--bar' as string]: 'linear-gradient(90deg,#FFD35C,#F7B928)', marginTop: 10 }}><i style={{ width: lv.into + '%' }} /></span>
            <span className="lvhero__meta g-mono"><span>{t('g.home.xp', { a: lv.into, b: lv.need })}</span><span>{lv.max ? t('g.pass.maxed') : t('g.pass.toNext', { n: lv.need - lv.into, l: lv.n + 1 })}</span></span>
          </div>
        </div>
      </section>

      <div className="g-sec" style={{ ['--i' as string]: 1 }}><h2>{t('g.pass.track')}</h2><span className="g-mono">{t('g.pass.xpEach')}</span></div>
      <div className="track3" ref={track} style={{ ['--i' as string]: 1 }} role="list" aria-label={t('pass.trackAside', { s: seasonName(), n: tier })}>
        {Array.from({ length: MAX_LV }, (_, k) => {
          const L = k + 1, rt = rewardTier(L), got = rt > 0 && tier >= rt;
          const cls = L < lv.n ? 'is-past' : L === lv.n ? 'is-now' : '';
          return <div key={L} role="listitem" className={'tcard ' + cls + (rt ? ' has-reward' : '')}>
            <span className="tcard__lv g-num">{L}</span>
            {L === lv.n && <span className="tcard__here g-mono">{t('g.pass.here')}</span>}
            <span className="tcard__free">
              <small className="g-mono">{t('g.pass.free')}</small>
              {rt ? <span className={'tcard__coin' + (got ? ' is-got' : '')}><span className="g-coin" />{t('g.pass.coins', { n: 20 })}{got && <Icon n="check" size={14} />}</span> : <span className="tcard__dot" aria-hidden="true" />}
            </span>
            <span className="tcard__lane"><Icon n="lock" size={14} /><small className="g-mono">{t('g.pass.lane')}</small></span>
          </div>;
        })}
      </div>
      <p className="g-fine" style={{ ['--i' as string]: 1 }}>{t('pass.trackNote')} <span className="g-chip g-chip--concept">{t('g.pass.lane')} · {t('common.concept')}</span></p>

      <div className="pass3__cols">
        <div className="g-stack">
          <section className="wallet3 g-card g-card--desk" style={{ ['--i' as string]: 2 }}>
            <div className="wallet3__top"><span className="wallet3__coin" aria-hidden="true"><span className="g-coin" /></span>
              <span><small className="g-mono">{t('pass.balance')}</small><b className="g-num">{num(s.credits)}</b></span></div>
            <p className="g-sub">{t('pass.earned')}</p>
            {s.ledger.length > 0 && <ul className="ledger3">{s.ledger.slice(0, 5).map((l, k) => <li key={k}><span className="g-mono">{fmtDate(l.at, t.lang, { day: 'numeric', month: 'short' })}</span><span>{l.why.split(':')[0]}</span><b className={'g-num ' + (l.d < 0 ? 'neg' : 'pos')}>{num(l.d, true)}</b></li>)}</ul>}
          </section>

          <div className="g-sec" style={{ ['--i' as string]: 3 }}><h2>{t('g.pass.shop')}</h2></div>
          <div className="shop3" style={{ ['--i' as string]: 3 }}>
            <div className={'item3' + (s.theme === 'standard' ? ' is-use' : '')}>
              <span className="swatch swatch--standard" />
              <b>{t('pass.standard')}</b>
              <button className="g-btn g-btn--sm g-btn--dark" disabled={s.theme === 'standard'} onClick={() => applyTheme('standard')}>{s.theme === 'standard' ? t('pass.inUse') : t('pass.use')}</button>
            </div>
            {THEMES.map(({ id, price }) => { const own = s.owned.includes(id); const [name, d] = t.list('pass.items.' + id) as string[]; return <div key={id} className={'item3' + (s.theme === id ? ' is-use' : '')}>
              <span className={'swatch swatch--' + id} />
              <b>{name}</b><small>{d}</small>
              {own ? <button className="g-btn g-btn--sm g-btn--dark" onClick={() => applyTheme(id)} disabled={s.theme === id}>{s.theme === id ? t('pass.inUse') : t('pass.use')}</button>
                : <button className="g-btn g-btn--sm g-btn--gold" disabled={s.credits < price} onClick={() => buyTheme(id, price)}>{s.credits < price ? t('pass.short', { n: price - s.credits }) : <><span className="g-coin" />{price}</>}</button>}
            </div>; })}
            <div className="item3">
              <span className="swatch swatch--favour3"><Icon n="gift" /></span>
              <b>{favName}</b><small>{favD}</small>
              <button className="g-btn g-btn--sm g-btn--gold" disabled={!s.career || s.credits < 15} onClick={buyFavour}><span className="g-coin" />15</button>
            </div>
          </div>
          <p className="g-fine" style={{ ['--i' as string]: 3 }}>{t('pass.shopNote')}</p>
        </div>

        <div className="g-stack">
          <section className="spass g-card" style={{ ['--i' as string]: 4 }}>
            <span className="g-chip g-chip--concept spass__tag">{t('common.concept')}</span>
            <span className="g-mono spass__k">{t('pass.kicker')}</span>
            <h2 className="g-h2">{t('pass.hed')}</h2>
            <p className="g-sub" style={{ marginTop: 6 }}>{t('pass.dek')}</p>
            <div className="spass__price"><b className="g-num">{t('pass.price')}</b><span className="g-mono">{t('pass.per')} · {t('pass.monthlyD')}</span></div>
            <ul className="perks3">{(t.list('pass.perks') as string[][]).map(([a, b], k) => <li key={k}><span className="perks3__ic"><Icon n={PERK_IC[k] || 'star'} /></span><span><b>{a}</b><small>{b}</small></span></li>)}</ul>
            <GBtn kind="gold" disabled sound={null}><Icon n="lock" size={20} />{t('pass.cta')}</GBtn>
            <p className="g-fine" style={{ marginTop: 8 }}>{t('pass.ctaNote')}</p>
            <div className="promise"><span className="g-stamp" style={{ ['--rot' as string]: '-3deg', fontSize: 16 }}>{t('pass.never')}</span>
              <ul>{(t.list('pass.neverL') as string[]).map((x, k) => <li key={k}><Icon n="check" size={16} />{x}</li>)}</ul></div>
          </section>

          <div className="g-sec" style={{ ['--i' as string]: 5 }}><h2>{t('pass.packs')}</h2><span className="g-chip g-chip--concept">{t('common.concept')}</span></div>
          <div className="packs3" style={{ ['--i' as string]: 5 }}>{PACKS.map(([p, n, b], k) => <div key={p} className="pack3" aria-disabled="true">
            {b && <span className="pack3__bonus g-mono">{b}</span>}
            <span className="pack3__coins" aria-hidden="true">{Array.from({ length: k + 1 }, (_, i) => <span key={i} className="g-coin" />)}</span>
            <b className="g-num">{num(n)}</b><small className="g-mono">{t('pass.balance')}</small>
            <span className="pack3__p">{p}</span>
          </div>)}</div>
          <p className="g-fine" style={{ ['--i' as string]: 5 }}>{t('pass.packsNote')}</p>
        </div>
      </div>
    </div>
  </div>;
}
