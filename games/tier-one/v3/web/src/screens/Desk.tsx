// Career Desk (look/mockups/desk.html): rank, Rep with its equilibrium, the contact book (Trust), club relations,
// unlocks, favours, the weekly league and the trophy shelf.
import { Fragment } from 'react';
import { useT, num } from '../lib/i18n';
import { useSave, update } from '../lib/save';
import { RANKS, TRUST_LV, trustLevel, newCareer, totalFavours, repEquilibrium } from '../lib/career';
import { clubById, RULES } from '../lib/engine';
import { randomSeed } from '../lib/driver';
import { ACH_IDS, ACH } from '../lib/meta';
import { useLeague } from '../lib/leagueData';
import { Bar } from '../ui/chrome';
import { Flag, Btn, Arr, Stamp, Crest } from '../ui/bits';
import { INITIALS } from '../lib/story';
import type { Chrome } from '../App';

export function DeskScreen(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const c = s.career;
  const start = () => { update((x) => { if (!x.career) x.career = newCareer(); }); };
  const play = () => {
    update((x) => { if (x.career && !x.career.live) x.career.live = { seed: 'car-' + randomSeed(), mode: 'career', log: [], started: Date.now() }; });
    chrome.go({ n: 'play', mode: 'career', key: Date.now() });
  };
  if (!c) return <div className="page desk"><Bar chrome={chrome} title={t('career.title')} cur="desk" />
    <section className="head"><div className="kicker">{t('career.ranks.0')}</div><h1 className="hed hed--1">{t('career.start')}</h1><p className="dek" style={{ marginTop: 10 }}>{t('career.startD')}</p>
      <Btn kind="primary" style={{ marginTop: 18 }} onClick={start}>{t('career.start')} <Arr /></Btn><p className="note" style={{ marginTop: 10 }}>{t('career.slotNote')}</p></section>
    <Trophies /></div>;

  const nx = RANKS[c.rank + 1];
  const pct = nx ? Math.min(1, Math.min(c.windows / nx.gate[0], c.rep / nx.gate[1])) : 1;
  const rightPct = c.calls ? Math.round((100 * c.right) / c.calls) : 0;
  const clubs = Object.entries(c.relations).filter(([, r]) => r.v !== 0).sort((a, b) => b[1].v - a[1].v);
  const rk = RANKS[c.rank];
  return <div className="page desk">
    <Bar chrome={chrome} title={t('career.title')} cur="desk" end={<span className="meta">{t('career.windows')} <b>{c.windows}</b></span>} />
    <div className="cols cols--2-even">
      <main>
        <section className="id">
          <div>
            <div className="kicker">{s.nick || t('common.you')}</div>
            <div className="rank">{t('career.ranks.' + c.rank)}</div>
            <div className="rep num" style={{ marginTop: 8 }}>{Math.round(c.rep)}</div>
            <div className="label" style={{ marginTop: 16 }}>{t('career.rep')}</div>
          </div>
          {c.t1 > 0 && <Stamp kind="exclusive" sound={false}>{c.t1}× {t('tier.T1')}</Stamp>}
        </section>
        <div className="ruler" aria-label={nx ? t('career.toNext', { w: Math.max(0, nx.gate[0] - c.windows), r: nx.gate[1], rank: t('career.ranks.' + (c.rank + 1)) }) : t('career.top')}>
          <div className="ruler__track" /><div className="ruler__fill" style={{ width: pct * 100 + '%' }} />
          <div className="ruler__l"><span className="meta">{t('career.ranks.' + c.rank)}</span><span className="meta accent">{nx ? t('career.toNext', { w: Math.max(0, nx.gate[0] - c.windows), r: nx.gate[1], rank: t('career.ranks.' + (c.rank + 1)) }) : t('career.top')}</span></div>
        </div>
        <p className="note" style={{ marginTop: 26 }}>{t('career.repEq', { d: '+1.75', r: repEquilibrium(1.75) })}</p>
        <div className="kpis">
          <div><span className="label">{t('career.right')}</span><span className="cond">{rightPct}%</span><span className="meta">{t('career.calls', { n: c.calls })}</span></div>
          <div><span className="label">{t('career.scoops')}</span><span className="cond">{c.exclusives}</span><span className="meta">{t('career.exclusives')}</span></div>
          <div><span className="label">{t('career.followers')}</span><span className="cond">{c.followers >= 10000 ? Math.round(c.followers / 1000) + 'k' : num(c.followers)}</span><span className="meta">{t('career.uturns')} {c.uturns}</span></div>
        </div>
        <Btn kind="primary" style={{ marginTop: 18 }} onClick={play}>{c.live ? t('career.resume') : t('career.window')} <Arr /></Btn>
        <p className="meta" style={{ marginTop: 8 }}>{t('career.boardLine', { s: rk.sagas, c: rk.contacts, d: rk.dd })}</p>

        <Flag title={t('career.book')} aside={t('career.bookAside')} />
        {['kitman', 'barber', 'agent', 'spotter', 'physio'].map((k) => {
          const open = rk.src.includes(k), tr = (c.contacts[k] || { trust: 0 }).trust, lv = trustLevel(tr);
          const need = RANKS.findIndex((r) => r.src.includes(k));
          return <div key={k} className={'ct' + (open ? '' : ' is-locked')}>
            <span className="ct__av" style={open ? undefined : { borderStyle: 'dashed' }}>{INITIALS[k]}</span>
            <div><div className="ct__n">{t('src.' + k)}</div><div className="ct__d">{open ? (k === 'barber' ? t('career.barberFx', { p: Math.round(100 * Math.min(0.95, (RULES.SOURCES.barber.rel || 0.45) + 0.05 * lv)) }) : t('career.trustFx.' + lv)) : t('career.locked', { rank: t('career.ranks.' + need) })}</div></div>
            <div className="ct__r"><span className="cond">{open ? t('career.level', { n: lv }) : '—'}</span><span className="ct__trend meta">{lv >= 5 ? t('career.trustMax') : t('career.trustNext', { n: TRUST_LV[lv] - tr, l: lv + 1 })}</span></div>
          </div>;
        })}

        <Flag title={t('career.favours')} aside={t('career.favoursAside', { n: totalFavours(c) })} />
        <div className="kpis kpis--3">{(['burner', 'tipoff', 'stakeout'] as const).map((k) => <div key={k}><span className="label">{t('career.' + k)}</span><span className="cond">{c.favours[k]}</span><span className="meta">{t('career.' + k + 'D')}</span></div>)}</div>
      </main>

      <aside>
        <Flag title={t('career.clubs')} aside={t('career.clubsAside')} />
        {clubs.length ? clubs.slice(0, 8).map(([id, r]) => { const cl = clubById(id); return <div key={id} className="ct"><Crest club={cl} size={30} /><div><div className="ct__n">{cl ? cl.n : id}</div><div className="ct__d">{r.v >= 3 ? t('career.leak') : r.v <= -3 ? t('career.frozen') : t('career.neutral')}</div></div><div className="ct__r"><span className={'cond' + (r.v < 0 ? ' accent' : '')}>{num(r.v, true)}</span></div></div>; }) : <p className="note">{t('career.clubsEmpty')}</p>}

        <Flag title={t('career.unlocks')} aside={t('career.unlocksAside')} />
        {RANKS.map((r, k) => <div key={k} className={'unlock' + (k <= c.rank ? ' done' : ' locked')}><span className="unlock__box">{k <= c.rank ? '✓' : ''}</span><div><div className="unlock__t">{t('career.ranks.' + k)}</div><div className="unlock__d">{t('career.unl.' + k)}</div></div><span className="meta">{r.gate[0]} · {r.gate[1]}</span></div>)}
        {c.rank >= RANKS.length - 1 && <Btn kind="ghost" style={{ marginTop: 14 }} onClick={() => update((x) => { x.career = newCareer(1, (x.career?.restarts || 0) + 1); })}>{t('career.rival')} <Arr /></Btn>}

        {c.history.length > 0 && <><Flag title={t('career.history')} />
          <table className="table"><tbody>{c.history.slice(0, 6).map((h) => <tr key={h.n}><td className="l"><span className="cond">{h.n}</span></td><td className="l">{t('tier.' + h.tier)}</td><td>{num(h.total, true)}</td><td>Rep {h.repAfter}</td></tr>)}</tbody></table></>}
        <LeagueTable />
      </aside>
    </div>
    <Trophies />
  </div>;
}

export function LeagueTable() {
  const t = useT();
  const lg = useLeague();
  return <section>
    <Flag title={t('league.title')} aside={lg ? t('league.divs.' + lg.div) + ' · ' + t('league.aside', { w: lg.week.split('-W')[1] }) : ''} />
    <p className="note">{t('league.note')}</p>
    {lg && lg.last && <p className="meta" style={{ marginTop: 6 }}>{t('league.moved', { r: lg.last.rank, n: lg.last.size })}</p>}
    {lg && lg.rows.length ? <table className="table" style={{ marginTop: 10 }}>
      <thead><tr><th className="l">#</th><th className="l">{t('league.reporter')}</th><th>{t('nav.daily')}</th><th>{t('nav.wire')}</th><th>{t('league.pts')}</th></tr></thead>
      <tbody>{lg.rows.map((r, k) => <Fragment key={k}>
        <tr className={(r.me ? 'is-you ' : '') + (lg.up && k === lg.up - 1 ? 'zone' : '')}><td className="l"><span className="cond">{k + 1}</span></td><td className="l">{r.me ? t('common.you') : r.nick}</td><td>{r.daily}</td><td>{Math.round(r.wire)}</td><td><b>{Math.round(r.pts)}</b></td></tr>
        {lg.up > 0 && k === lg.up - 1 && lg.rows.length > lg.up && <tr key={'z' + k}><td colSpan={5} className="zone-l">{t('league.up')}</td></tr>}
      </Fragment>)}</tbody></table> : <p className="note" style={{ marginTop: 10 }}>{lg ? t('league.empty') : t('wire.needNet')}</p>}
  </section>;
}

export function Trophies() {
  const t = useT();
  const s = useSave();
  const got = ACH_IDS.filter((id) => s.ach[id]).length;
  return <section className="trophies">
    <Flag title={t('ach.title')} aside={t('ach.aside', { n: got, m: ACH_IDS.length })} />
    <div className="shelf">{ACH_IDS.map((id) => <div key={id} className={'trophy' + (s.ach[id] ? ' got' : '')}><b>{t('ach.list.' + id + '.0')}</b><span>{t('ach.list.' + id + '.1')}</span><span className="meta">{s.ach[id] ? '✓' : '+' + ACH[id]}</span></div>)}</div>
  </section>;
}
