// Semba Pass + wallet + shop (look/mockups/store.html). The Pass and credit packs are concepts: there is no verified
// payment flow, so nothing here takes money. Credits are earned by playing and buy cosmetics and Career favours only.
import { useT, num, fmtDate } from '../lib/i18n';
import { useSave, update } from '../lib/save';
import { spend, seasonName, toast } from '../lib/meta';
import { Bar } from '../ui/chrome';
import { Flag, Btn, Stamp, Portrait } from '../ui/bits';
import type { Chrome } from '../App';

const THEMES = [{ id: 'salmon', price: 400 }, { id: 'tabloid', price: 400 }, { id: 'neon', price: 400 }];
const PACKS: [string, number, string][] = [['$0.99', 100, ''], ['$4.99', 550, '+10%'], ['$9.99', 1200, '+20%'], ['$19.99', 2600, '+30%']];

export function PassScreen(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const tier = Math.min(40, Math.floor(s.pp / 100));
  const buyTheme = (id: string, price: number) => { if (spend(price, 'theme:' + id)) update((x) => { x.owned.push(id); x.theme = id; }); };
  const buyFavour = () => {
    const d = new Date().toISOString().slice(0, 10), k = 'fav:' + d;
    if ((s.stats[k] || 0) >= 3 || !s.career) return;
    if (spend(15, 'favour')) update((x) => { x.stats[k] = (x.stats[k] || 0) + 1; if (x.career) { const kinds = ['burner', 'tipoff', 'stakeout'] as const; const kind = kinds[(x.stats[k] - 1) % 3]; x.career.favours[kind]++; toast('info', t('career.' + kind)); } });
  };
  return <div className="page pass">
    <Bar chrome={chrome} back={{ label: t('nav.front') }} cur="pass" end={<span className="meta concept">{t('common.concept')}</span>} />
    <div className="cols cols--2-even">
      <main>
        <section className="intro"><div className="kicker">{t('pass.kicker')}</div><h1 className="hed hed--1">{t('pass.hed')}</h1><p className="dek" style={{ marginTop: 10 }}>{t('pass.dek')}</p></section>
        <div className="pass-card" aria-hidden="true">
          <div className="pass__top"><div className="pass__word">PRESS</div><div className="pass__sub"><span>Semba Games</span><span>{seasonName()}</span></div></div>
          <div className="pass__body">
            <div className="pass__id"><Portrait club={{ id: 'press', n: 'Press', s: 'Press', k: 'PRS', l: '', c1: '#C9C1B0', c2: '#8F887B' }} no="" /><div><div className="pass__name">{s.nick || 'Tier One'}</div><div className="pass__row" style={{ border: 0, padding: '6px 0 0' }}>No. T1-{s.dev.slice(0, 4).toUpperCase()}</div></div></div>
            <div className="pass__row"><span>Role</span><b>{s.career ? t('career.ranks.' + s.career.rank) : t('career.ranks.0')}</b></div>
            <div className="pass__row"><span>Access</span><b>Tier One · The Gaffer</b></div>
            <div className="pass__row"><span>Valid</span><b>{t('common.concept')}</b></div>
            <div className="pass__code" />
          </div>
        </div>
        <div className="plans">
          <div className="plan" aria-disabled="true"><span className="plan__radio" /><span><span className="plan__t">{t('pass.monthly')}</span><br /><span className="plan__d">{t('pass.monthlyD')}</span></span><span className="plan__p"><span className="cond">{t('pass.price')}</span><span className="meta">{t('pass.per')}</span></span></div>
        </div>
        <Btn kind="primary" disabled style={{ marginTop: 14 }}>{t('pass.cta')}</Btn>
        <p className="fine">{t('pass.ctaNote')}</p>
        <Flag title={t('pass.gets')} />
        <ol className="gets">{(t.list('pass.perks') as string[][]).map(([a, b], k) => <li key={k}><span className="n">{['i', 'ii', 'iii', 'iv', 'v', 'vi'][k]}</span><div><b>{a}</b><span>{b}</span></div></li>)}</ol>
        <div className="never"><Stamp size="sm" sound={false}>{t('pass.never')}</Stamp><ul>{(t.list('pass.neverL') as string[]).map((x, k) => <li key={k}>{x}</li>)}</ul></div>
      </main>
      <aside>
        <Flag title={t('pass.wallet')} aside={t('pass.balance')} />
        <div className="wallet"><span className="cond wallet__n">{num(s.credits)}</span><p className="note">{t('pass.earned')}</p></div>
        {s.ledger.length > 0 && <table className="table" style={{ marginTop: 8 }}><tbody>{s.ledger.slice(0, 5).map((l, k) => <tr key={k}><td className="l meta">{fmtDate(l.at, t.lang)}</td><td className="l meta">{l.why.split(':')[0]}</td><td><b>{num(l.d, true)}</b></td></tr>)}</tbody></table>}

        <Flag title={t('pass.shop')} />
        <p className="note">{t('pass.shopNote')}</p>
        <div className="shop">
          <div className="shop__i"><div className="swatch swatch--standard" /><div><b>{t('pass.standard')}</b></div>
            <button className="btn btn--quiet" onClick={() => update((x) => { x.theme = 'standard'; })} disabled={s.theme === 'standard'}>{s.theme === 'standard' ? t('pass.inUse') : t('pass.use')}</button></div>
          {THEMES.map(({ id, price }) => { const own = s.owned.includes(id); const [name, d] = t.list('pass.items.' + id) as string[]; return <div key={id} className="shop__i">
            <div className={'swatch swatch--' + id} /><div><b>{name}</b><span className="note">{d}</span></div>
            {own ? <button className="btn btn--quiet" onClick={() => update((x) => { x.theme = id; })} disabled={s.theme === id}>{s.theme === id ? t('pass.inUse') : t('pass.use')}</button>
              : <button className="btn btn--quiet" disabled={s.credits < price} onClick={() => buyTheme(id, price)}>{s.credits < price ? t('pass.short', { n: price - s.credits }) : t('pass.buy', { n: price })}</button>}
          </div>; })}
          <div className="shop__i"><div className="swatch swatch--favour">F</div><div><b>{(t.list('pass.items.favour') as string[])[0]}</b><span className="note">{(t.list('pass.items.favour') as string[])[1]}</span></div>
            <button className="btn btn--quiet" disabled={!s.career || s.credits < 15} onClick={buyFavour}>{t('pass.buy', { n: 15 })}</button></div>
        </div>

        <Flag title={t('pass.track')} aside={t('pass.trackAside', { s: seasonName(), n: tier })} />
        <div className="track" aria-label={t('pass.trackAside', { s: seasonName(), n: tier })}>{Array.from({ length: 40 }, (_, k) => <i key={k} className={(k < tier ? 'on' : '') + ((k + 1) % 4 === 0 ? ' pay' : '')} />)}</div>
        <p className="note" style={{ marginTop: 8 }}>{t('pass.trackNote')} {s.pp % 100}/100 PP.</p>

        <Flag title={t('pass.packs')} aside={t('common.concept')} />
        <p className="note">{t('pass.packsNote')}</p>
        <table className="table" style={{ marginTop: 8 }}><tbody>{PACKS.map(([p, n, b]) => <tr key={p}><td className="l"><b>{num(n)}</b> {t('pass.balance')}</td><td className="meta">{b}</td><td>{p}</td></tr>)}</tbody></table>
      </aside>
    </div>
  </div>;
}
