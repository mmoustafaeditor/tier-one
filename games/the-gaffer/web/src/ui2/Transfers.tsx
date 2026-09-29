// Transfers: why we're looking, what the scouts actually know (a range, never a fake exact number), the shortlist,
// the market, bids for our players, and this season's deals and loans.
import { useMemo, useState } from 'react';
import { FREE_AGENT, type Player, type Position } from '../model/types';
import { squadOf, strengthOf, playerOf } from '../sim/world';
import { askingPrices, wageBillOf, wageDemand } from '../sim/transfers';
import { balanceOf } from '../sim/balance';
import { estimate, estimateAll, shortlisted } from '../sim/estimate';
import { windowOf, isDeadlineDay, untilWindow, windowLeft } from '../sim/windows';
import { FORMATIONS, DEFAULT_TACTICS, slotValue, xiFor } from '../sim/tactics';
import { GROUP_OF } from '../sim/groups';
import { Crest, I, Kpi, Portrait } from './kit';
import { Panel, PanelHead, Seg } from './shell';
import { useGame, clubOf, cn, money, sn } from './game';
import { ageOf } from './util';

const GROUP_POS: Position[][] = [['GK'], ['CB', 'LB', 'RB'], ['CDM', 'CM', 'CAM'], ['LW', 'RW', 'ST']];

export function TransfersScreen({ tab, onTab }: { tab: number; onTab: (n: number) => void }) {
  const g = useGame();
  const { w, c, x } = g;
  const T = x.tr;
  const club = g.club;
  const open = !!windowOf(c);
  const squad = squadOf(w, c.clubId);
  // The need: the thinnest group, else the weakest starting slot.
  const need = useMemo<Position>(() => {
    const NEED = [2, 7, 6, 4];
    const gi = [0, 1, 2, 3].find((k) => squad.filter((p) => GROUP_OF[p.position] === k).length < NEED[k]);
    if (gi !== undefined) return GROUP_POS[gi][gi === 3 ? 2 : 0];
    const { xi } = xiFor(w, c);
    const slots = FORMATIONS[(c.tactics ?? DEFAULT_TACTICS).formation].slots;
    let worst = 0, wv = 999;
    xi.forEach((p, i) => { const v = slotValue(p, slots[i].pos); if (v < wv) { wv = v; worst = i; } });
    return slots[worst]?.pos ?? 'ST';
  }, [w, c]);
  const ref = [...squad].filter((p) => p.position === need).sort((a, b) => b.rating - a.rating)[0];
  const room = club.wageCap - wageBillOf(w, c.clubId);
  const list = (c.shortlist ?? []).map((id) => playerOf(w, id)).filter((p): p is Player => !!p);
  const posName = x.common.posLong[need].toLowerCase();
  return (
    <div className="sc-transfers">
      <header className="topbar on-ground">
        <div className="club"><div className="grow"><b>{T.title}</b><small>{isDeadlineDay(c) ? T.deadline : T.window(open, open ? windowLeft(c) : untilWindow(c))}</small></div></div>
        {c.offers.length > 0 && <button className="btn btn--ghost on-ground btn--sm" onClick={() => onTab(2)}><I n="handshake" size="sm" />{T.tabs[2]} · {c.offers.length}</button>}
      </header>
      <div className="r-head on-ground">
        <h1 className="h-hero">{T.hero.need(posName)}</h1>
        <div className="money">
          <Kpi v={<span className="ltr">{money(club.budget)}</span>} l={T.budget} />
          <Kpi v={<span className="ltr">{money(Math.max(0, room))}</span>} l={T.wageRoom} />
          <Kpi v={list.length} l={T.onList} />
        </div>
      </div>
      <div className="tr-tabs on-ground"><Seg label={T.title} value={tab} onChange={onTab} options={T.tabs.map((l, i) => ({ v: i, label: l }))} onGround /></div>
      {!open && tab <= 1 && <p className="note-line on-ground"><I n="lock" size="sm" />{T.closed}</p>}
      {tab === 0 && <Shortlist list={list} need={need} refP={ref} />}
      {tab === 1 && <Search need={need} />}
      {tab === 2 && <Bids />}
      {tab === 3 && <Deals />}
      {tab === 4 && <Loans />}
    </div>
  );
}

function knownPct(e: { exact: boolean; lo: number; hi: number }) { return e.exact ? 100 : Math.max(10, Math.min(95, Math.round(100 - (e.hi - e.lo) * 7))); }

function Shortlist({ list, need, refP }: { list: Player[]; need: Position; refP?: Player }) {
  const g = useGame();
  const { w, c, x, lang } = g;
  const T = x.tr;
  const prices = useMemo(() => askingPrices(w, balanceOf(c).prices), [w, c]);
  const scout = c.ops.staff.scout;
  const ests = list.map((p) => ({ p, e: estimate(w, c, p) }));
  const best = [...ests].sort((a, b) => (b.e.lo + b.e.hi) - (a.e.lo + a.e.hi))[0];
  const lo = Math.min(60, ...ests.map((q) => q.e.lo), refP?.rating ?? 99) - 2, hi = Math.max(80, ...ests.map((q) => q.e.phi), refP?.rating ?? 0) + 2;
  const pct = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  return (
    <div className="grid">
      <Panel className="g-need need" i={1} label={T.why}>
        <span className="eyebrow">{T.why}</span>
        <h2 className="h1">{T.needHead(x.common.posLong[need].toLowerCase())}</h2>
        <div className="why"><span className="tag tag--bad"><I n="alert" size="sm" />{x.common.posLong[need]}</span>{refP && <span className="tag"><I n="squad" size="sm" />{sn(refP, lang)} · {refP.rating}</span>}</div>
        {scout && (
          <div className="advice">
            <span className="staff" style={{ background: '#8A5A12' }} aria-hidden="true">CS</span>
            <div><div className="who">{scout.name[lang]}, <span>{x.office.roles.scout.toLowerCase()}</span></div><q>{best ? T.scoutLine(sn(best.p, lang), knownPct(best.e)) : T.scoutNone}</q></div>
          </div>
        )}
      </Panel>
      {ests.length > 0 && (
        <Panel className="g-cmp compare" i={2} label={T.fog}>
          <span className="eyebrow">{T.fog}</span>
          <h2 className="h2">{T.fogHead}</h2>
          <div className="dumbs">
            {ests.map(({ p, e }) => (
              <div key={p.id} className="dumb"><b>{sn(p, lang)}</b><span className="track">
                <span className="rng" style={{ ['--lo' as string]: pct(e.lo - 0.5), ['--hi' as string]: pct(e.hi + 0.5), ['--c' as string]: 'var(--dv-us)' }} />
                {refP && <span className="ref" style={{ ['--at' as string]: pct(refP.rating) }} />}
              </span></div>
            ))}
          </div>
          <div className="axis"><span /><div dir="ltr"><span>{Math.round(lo)}</span><span>{Math.round((lo + hi) / 2)}</span><span>{Math.round(hi)}</span></div></div>
          <div className="legend">{refP && <span><i style={{ background: 'var(--dv-4)', width: 3, height: 12 }} />{T.ref(sn(refP, lang), refP.rating)}</span>}<span><i className="band" />{T.fogKey}</span></div>
        </Panel>
      )}
      {ests.length === 0 && <Panel i={2} className="g-cmp"><p className="muted">{T.empty}</p><button className="btn btn--primary btn--sm" onClick={() => g.go({ s: 'transfers', tab: 1 })}><I n="search" size="sm" />{T.search}</button></Panel>}
      {ests.map(({ p, e }, i) => {
        const cl = clubOf(w, p.clubId);
        const k = knownPct(e);
        const fee = prices.get(p.id) ?? 0;
        const wants = wageDemand(w, p, c.clubId, 'rotation', balanceOf(c).wages);
        const rep = cl?.reputation ?? 50;
        const inter = !e.exact && k < 45 ? 3 : rep > g.club.reputation + 6 ? 2 : rep < g.club.reputation - 6 ? 0 : 1;
        const fitV = Math.round(slotValue({ ...p, fitness: 100, morale: 60 }, need));
        const span = (a: number, b: number) => ({ ['--lo' as string]: `${((a - 40) / 60) * 100}%`, ['--hi' as string]: `${((b - 40) / 60) * 100 + 1}%` });
        return (
          <Panel key={p.id} className="target" i={3 + i} label={p.name[lang]}>
            <div className="t-top">
              <Portrait p={p} club={cl ?? g.club} size={60} />
              <div><h3>{p.name[lang]}</h3><span className="sub"><Crest club={cl} size={16} />{cl ? cn(cl, lang) : x.common.free} · {ageOf(p, c.season)} · {x.common.pos[p.position]}</span></div>
              <span className="known"><span className="ring" style={{ ['--p' as string]: k }}><b>{k}%</b></span>{T.known}</span>
            </div>
            <div className="fogs">
              <div className="fogrow"><span className="l">{T.ability}</span><div className={`fog${e.exact ? ' known' : ''}`}><span className={`band${e.exact ? ' band--known' : ''}`} style={span(e.lo, e.hi)} /></div><span className="v ltr">{e.lo === e.hi ? e.lo : `${e.lo}–${e.hi}`}</span></div>
              <div className="fogrow"><span className="l">{T.ceiling}</span><div className="fog"><span className="band" style={span(e.plo, e.phi)} /></div><span className="v ltr">{e.plo === e.phi ? e.plo : `${e.plo}–${e.phi}`}</span></div>
              <div className="fogrow"><span className="l">{T.fit}</span><div className="fog"><span className="band band--known" style={span(fitV - 1, fitV)} /></div><span className="v">{e.exact ? fitV : '?'}</span></div>
            </div>
            <div className="t-facts">
              <Kpi v={<span className="ltr">{p.clubId === FREE_AGENT ? x.common.free : money(fee)}</span>} l={T.likely} />
              <Kpi v={<span className="ltr">{k >= 60 ? money(wants) : '?'}</span>} l={T.wants} />
              <Kpi v={<span className={inter === 0 ? 'up' : inter === 2 ? 'down' : ''}>{T.interestL[inter]}</span>} l={T.interest} />
            </div>
            <div className="t-acts">
              <button className="btn btn--primary" disabled={!windowOf(c) && p.clubId !== FREE_AGENT} onClick={() => g.sheet({ k: 'bid', id: p.id })}><I n="handshake" size="sm" />{T.bid}</button>
              <button className="btn btn--ghost" onClick={() => g.player(p.id)}><I n="eye" size="sm" />{T.report}</button>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

function Search({ need }: { need: Position }) {
  const g = useGame();
  const { w, c, x, lang } = g;
  const T = x.tr;
  const [grp, setGrp] = useState<number>(GROUP_OF[need]);
  const [league, setLeague] = useState('');
  const [maxAge, setMaxAge] = useState(40);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState(0);
  const prices = useMemo(() => askingPrices(w, balanceOf(c).prices), [w, c]);
  const my = strengthOf(w, c.clubId);
  const pool = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const leagueOf = new Map(w.clubs.map((cl) => [cl.id, cl.leagueId]));
    const ps = w.players.filter((p) => p.clubId !== c.clubId && GROUP_OF[p.position] === grp && ageOf(p, c.season) <= maxAge
      && (!league || (league === 'free' ? p.clubId === FREE_AGENT : leagueOf.get(p.clubId) === league))
      && (!needle || p.name.en.toLowerCase().includes(needle) || p.name.ar.includes(q.trim())));
    const est = estimateAll(w, c, ps);
    const mid = (p: Player) => { const e = est.get(p.id)!; return (e.lo + e.hi) / 2; };
    const key = [(p: Player) => mid(p), (p: Player) => -(prices.get(p.id) ?? 0), (p: Player) => -ageOf(p, c.season), (p: Player) => -p.wage][sort];
    return { list: ps.filter((p) => mid(p) >= my - 16).sort((a, b) => key(b) - key(a)).slice(0, 60), est };
  }, [w, c, grp, league, maxAge, q, sort, prices, my]);
  const leagues = w.leagues.filter((l) => l.tier === 1 || w.clubs.some((cl) => cl.leagueId === l.id && cl.real));
  return (
    <Panel i={1} className="search" label={T.search}>
      <div className="filters">
        <input className="field" type="search" placeholder={T.search} aria-label={T.search} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips">{x.common.group.map((l, i) => <button key={l} className="chip" aria-pressed={grp === i} onClick={() => setGrp(i)}>{l}</button>)}</div>
        <div className="two">
          <select className="field" value={league} onChange={(e) => setLeague(e.target.value)} aria-label={T.filters.league}>
            <option value="">{T.filters.league}: {T.any}</option>
            {leagues.map((l) => <option key={l.id} value={l.id}>{l.name[lang]}</option>)}
            <option value="free">{x.common.free}</option>
          </select>
          <select className="field" value={maxAge} onChange={(e) => setMaxAge(+e.target.value)} aria-label={T.filters.age}>
            {[40, 30, 27, 24, 21].map((a) => <option key={a} value={a}>{T.filters.age} ≤ {a === 40 ? T.any : a}</option>)}
          </select>
        </div>
        <div className="chips">{T.sort.map((l, i) => <button key={l} className="chip" aria-pressed={sort === i} onClick={() => setSort(i)}>{l}</button>)}</div>
      </div>
      <span className="eyebrow">{T.results(pool.list.length)}</span>
      <div className="plist">
        {pool.list.map((p) => {
          const e = pool.est.get(p.id)!;
          const cl = clubOf(w, p.clubId);
          const on = shortlisted(c, p.id);
          return (
            <div key={p.id} className="pl mk">
              <button className="plbtn" onClick={() => g.player(p.id)}>
                <Portrait p={p} club={cl ?? g.club} />
                <span className="grow"><span className="name">{p.name[lang]}</span><span className="sub">{cl ? cn(cl, lang) : x.common.free} · {x.common.pos[p.position]} · {ageOf(p, c.season)}</span></span>
              </button>
              <span className="mk-r"><b className="ltr">{e.lo === e.hi ? e.lo : `${e.lo}–${e.hi}`}</b><small className="ltr">{p.clubId === FREE_AGENT ? x.common.free : money(prices.get(p.id) ?? 0)}</small></span>
              <button className={`icon-btn star${on ? ' on' : ''}`} aria-pressed={on} aria-label={on ? x.player.unshortlist : x.player.shortlist} onClick={() => void g.run({ type: 'shortlist.toggle', playerId: p.id }, { toast: false })}><I n="star" /></button>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export function Bids() {
  const g = useGame();
  const { w, c, x, lang } = g;
  if (!c.offers.length) return <Panel i={1}><p className="muted">{x.tr.noBids}</p></Panel>;
  return (
    <Panel i={1} label={x.tr.bids}>
      <PanelHead title={x.tr.bids} />
      <div className="rows">
        {c.offers.map((o) => {
          const p = playerOf(w, o.playerId); const cl = clubOf(w, o.clubId);
          if (!p) return null;
          const counter = Math.round(o.fee * 1.15 / 1e4) * 1e4;
          return (
            <div key={o.id} className="row bid">
              <Portrait p={p} club={g.club} size={40} />
              <span className="grow"><span className="name">{p.name[lang]}</span><span className="sub"><Crest club={cl} size={14} /> {cn(cl, lang)} · <span className="ltr">{money(o.fee)}</span> · {x.player.value} <span className="ltr">{money(p.marketValue)}</span></span></span>
              <span className="bid-acts">
                <button className="btn btn--primary btn--sm" onClick={() => void g.run({ type: 'offer.accept', offerId: o.id })}>{x.bid.accept}</button>
                <button className="btn btn--ghost btn--sm" onClick={() => void g.run({ type: 'offer.counter', offerId: o.id, fee: counter })}>{x.bid.counterBtn(money(counter))}</button>
                <button className="btn btn--ghost btn--sm" onClick={() => void g.run({ type: 'offer.reject', offerId: o.id }, { toast: x.note.done })}>{x.bid.reject}</button>
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function Deals() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const deals = c.deals.filter((d) => d.season === c.season);
  return (
    <Panel i={1} label={x.tr.deals}>
      <PanelHead title={x.tr.deals} />
      {!deals.length ? <p className="muted">{x.tr.noDeals}</p> : (
        <div className="rows">
          {deals.map((d, i) => {
            const other = clubOf(w, d.kind === 'out' || d.kind === 'released' ? d.to : d.from);
            return (
              <div key={i} className="row">
                <span className={`tag${d.kind === 'in' || d.kind === 'free' ? ' tag--good' : ' tag--warn'}`}>{x.tr.inOut[d.kind]}</span>
                <span className="grow"><span className="name">{d.name[lang]}</span><span className="sub">{other ? cn(other, lang) : x.common.free}</span></span>
                <b className="ltr num">{d.fee ? money(d.fee) : x.common.free}</b>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function Loans() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const loans = (c.loans ?? []).filter((l) => l.season === c.season);
  return (
    <Panel i={1} label={x.tr.loans}>
      <PanelHead title={x.tr.loans} />
      {!loans.length ? <p className="muted">{x.tr.noLoans}</p> : (
        <div className="rows">
          {loans.map((l) => {
            const inn = l.to === c.clubId;
            const other = clubOf(w, inn ? l.from : l.to);
            return (
              <button key={l.playerId} className="row linkrow" onClick={() => g.player(l.playerId)}>
                <span className={`tag${inn ? ' tag--good' : ''}`}>{inn ? x.tr.loanedIn : x.tr.loanedOut}</span>
                <span className="grow"><span className="name">{l.pn[lang]}</span><span className="sub">{cn(other, lang)}</span></span>
                <I n="chev" size="sm" />
              </button>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
