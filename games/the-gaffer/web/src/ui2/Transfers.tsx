// Transfers (V2.5 Recruitment): what the plan lacks (needs), where the scouts are, who fits (scout picks and the
// shortlist, drawn as ranges the scouts actually know), the market, the talks in progress (the negotiation room), the
// deals and money we owe, and loans with their clauses. Every button builds a command; the simulation decides.
import { useEffect, useMemo, useRef, useState } from 'react';
import { FREE_AGENT, type Player, type Position } from '../model/types';
import { countryOf, playerOf, strengthOf } from '../sim/world';
import { estimate, estimateAll, shortlisted } from '../sim/estimate';
import { windowOf, isDeadlineDay, untilWindow, windowLeft } from '../sim/windows';
import { DEFAULT_TACTICS, FORMATIONS, fmt } from '../sim/tactics';
import { GROUP_OF } from '../sim/groups';
import { staffQ } from '../sim/economy';
import { biasOf } from '../sim/delegation';
import { loanOf } from '../sim/loans';
import { needs, styleFit, type Need } from '../sim/recruit/needs';
import { scoutPicks, type Pick as ScoutPick } from '../sim/recruit/picks';
import { askAll, askOf } from '../sim/recruit/club';
import { spendingRoom, wageRoom, committed } from '../sim/recruit/money';
import { rcOf, openNeg, tickOf, type Assignment, type Negotiation, type ScopeKind } from '../sim/recruit/state';
import { assignSlots, coverage, rateAssign, rateTarget, REVEAL, knowledge } from '../sim/recruit/knowledge';
import { agentOf, demandOf, interestOf } from '../sim/recruit/agent';
import { CLAUSE_NEED } from '../sim/recruit/tick';
import { isUnhappy } from '../sim/recruit/ai';
import { R } from '../lang-recruit-all';
import { Crest, I, Kpi, Portrait, initialsOf } from './kit';
import { Panel, PanelHead, inView } from './shell';
import { useGame, clubOf, cn, money, sn, type Game } from './game';
import { ageOf } from './util';
import { Talks, LoanSheet } from './Talks';
import { byDay } from './recruitText';
import '../styles/recruit.css';

// Tab ids keep their old numbers (0 shortlist, 1 search, 3 deals, 4 loans) so links from other screens still land.
// Rework (handoff §P): one recruitment funnel in four stages instead of seven equal chips. The seven views and their tab
// numbers stay (deep links from cards, the player page and talks keep working); a stage with two views has a sub-switch.
const STAGES: number[][] = [[5, 6], [0, 1], [2], [3, 4]];
const stageOf = (tab: number) => Math.max(0, STAGES.findIndex((st) => st.includes(tab)));

export function TransfersScreen({ tab, onTab, neg, pid }: { tab: number; onTab: (n: number) => void; neg?: string; pid?: string }) {
  const g = useGame();
  const { w, c, x } = g;
  const Rs = R[g.ui];
  const T = x.tr;
  const list = useMemo(() => needs(w, c), [w, c]);
  const chipRow = useRef<HTMLDivElement>(null);
  useEffect(() => { inView(chipRow.current); }, [tab]); // UX-05: the chosen chip is never off-screen
  if (neg || pid) return <Talks negId={neg} pid={pid} onBack={() => onTab(2)} />;
  const open = !!windowOf(c);
  const top = list[0];
  const rc = rcOf(c);
  const live = rc.negs.filter((n) => n.stage === 'club' || n.stage === 'terms');
  const room = spendingRoom(w, c);
  const reds = list.filter((n) => n.level === 'red').length;
  return (
    <div className="sc-transfers">
      <header className="pg-head">
        <div className="pg-title"><h1 className="h-hero">{T.title}</h1><p className="pg-sub">{isDeadlineDay(c) ? T.deadline : T.window(open, open ? windowLeft(c) : untilWindow(c))}</p></div>
        <div className="pg-facts">
          <span><b className={`ltr${room < 0 ? ' down' : ''}`}>{money(room)}</b><small>{Rs.kpi.room}</small></span>
          <span><b className="ltr">{money(Math.max(0, wageRoom(w, c)))}</b><small>{Rs.kpi.wageRoom}</small></span>
          <span><b className="ltr">{money(committed(c))}</b><small>{Rs.kpi.committed}</small></span>
        </div>
        {live.length > 0 && tab !== 2 && <button className="btn btn--ghost pg-cta" onClick={() => onTab(2)}><I n="handshake" size="sm" />{Rs.talksBtn(live.length)}</button>}
      </header>
      {top && tab !== 5 && <p className="r-need-line"><I n="flag" size="sm" />{Rs.hero.need(x.common.posLong[top.pos])}</p>}
      <div ref={chipRow} className="rc-funnel on-ground" role="group" aria-label={T.title}>
        {STAGES.map((st, k) => (
          <button key={k} className="stage" aria-pressed={stageOf(tab) === k} onClick={() => onTab(st[0])}>
            <span className="n">{k + 1}</span><b>{Rs.stages[k]}</b>
            {st.includes(2) && live.length ? <em className="count">{live.length}</em> : st.includes(5) && reds ? <em className="count warn">{reds}</em> : null}
          </button>
        ))}
      </div>
      {STAGES[stageOf(tab)].length > 1 && (
        <div className="rc-tabs chips on-ground" role="group" aria-label={Rs.stages[stageOf(tab)]}>
          {STAGES[stageOf(tab)].map((i) => <button key={i} className="chip" aria-pressed={tab === i} onClick={() => onTab(i)}>{Rs.tabs[i]}</button>)}
        </div>
      )}
      {!open && (tab === 0 || tab === 1) && <p className="note-line on-ground"><I n="lock" size="sm" />{T.closed}</p>}
      {tab === 0 && <Targets top={top} />}
      {tab === 1 && <Search need={top?.pos ?? 'ST'} />}
      {tab === 2 && <TalksList />}
      {tab === 3 && <Deals />}
      {tab === 4 && <Loans />}
      {tab === 5 && <Needs list={list} onTab={onTab} />}
      {tab === 6 && <Scouts />}
    </div>
  );
}

// ---------- targets: the top need, the scout's picks and the shortlist ----------

function needTitle(g: Game, n: Need): string {
  const H = R[g.ui].needHead;
  const st = n.starter ? playerOf(g.w, n.starter) : undefined;
  const pos = g.x.common.posLong[n.pos];
  const who = st ? sn(st, g.lang) : pos;
  switch (n.why[0]) {
    case 'noCover': return H.noCover(pos);
    case 'thin': return H.thin(pos);
    case 'old': return H.old(who);
    case 'expiring': return H.expiring(who);
    case 'loanee': return H.loanee(who);
    case 'weak': return H.weak(pos);
    case 'style': return H.style(who);
    default: return H.manual(pos);
  }
}

export function ScoutQuote({ line }: { line: string }) {
  const g = useGame();
  const s = g.c.ops.staff.scout;
  const b = biasOf(s);
  return (
    <div className="advice">
      <span className="staff" style={{ background: '#8A5A12' }} aria-hidden="true">{s ? initialsOf(s.name.en) : 'CS'}</span>
      <div><div className="who">{s ? s.name[g.lang] : R[g.ui].scout.title}, <span>{g.x.office.roles.scout.toLowerCase()}{b ? ` · ${g.x.office.bias[b].toLowerCase()}` : ''}</span></div><q>{line}</q></div>
    </div>
  );
}

const WHY_ICON: Record<string, string> = { noCover: 'alert', style: 'tactics', old: 'clock', expiring: 'clock', loanee: 'swap', weak: 'trend', thin: 'squad', manual: 'flag' };

function Targets({ top }: { top?: Need }) {
  const g = useGame();
  const { w, c, x, lang } = g;
  const Rs = R[g.ui];
  const picks = useMemo(() => (top ? scoutPicks(w, c, 3, [top]) : []), [w, c, top]);
  const list = (c.shortlist ?? []).map((id) => playerOf(w, id)).filter((p): p is Player => !!p && p.clubId !== c.clubId && !picks.some((k) => k.p.id === p.id));
  const refP = top?.starter ? playerOf(w, top.starter) : undefined;
  const ests = [...picks.map((k) => ({ p: k.p, e: estimate(w, c, k.p) })), ...list.map((p) => ({ p, e: estimate(w, c, p) }))];
  const lo = Math.min(60, ...ests.map((q) => q.e.lo), refP?.rating ?? 99) - 2, hi = Math.max(80, ...ests.map((q) => q.e.hi), refP?.rating ?? 0) + 2;
  const pct = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  const best = picks[0];
  const line = !best ? Rs.scout.none : best.k >= 60 ? Rs.scout.pick(sn(best.p, lang), Math.round(best.k)) : Rs.scout.unsure(sn(best.p, lang), Math.round(best.k));
  const t = c.tactics ?? DEFAULT_TACTICS;
  return (
    <div className="grid">
      <Panel className="g-need need" i={1} label={Rs.needEyebrow}>
        <span className="eyebrow">{Rs.needEyebrow}</span>
        <h2 className="h1">{top ? needTitle(g, top) : Rs.noNeeds}</h2>
        {top && (
          <div className="why">
            {top.why.map((k) => <span key={k} className={`tag${k === 'noCover' ? ' tag--bad' : k === 'manual' ? '' : ' tag--warn'}`}><I n={WHY_ICON[k] ?? 'alert'} size="sm" />{Rs.why[k]}</span>)}
            <span className="tag"><I n="tactics" size="sm" />{fmt(t.formation)} · {x.tac.styles[t.philosophy ?? 'balanced']}</span>
          </div>
        )}
        <ScoutQuote line={line} />
      </Panel>
      {ests.length > 0 && (
        <Panel className="g-cmp compare" i={2} label={Rs.compare.eyebrow}>
          <span className="eyebrow">{Rs.compare.eyebrow}</span>
          <h2 className="h2">{Rs.compare.head}</h2>
          <div className="dumbs">
            {ests.map(({ p, e }) => (
              <div key={p.id} className="dumb"><b>{sn(p, lang)}</b><span className="track">
                <span className="rng" style={{ ['--lo' as string]: pct(e.lo - 0.5), ['--hi' as string]: pct(e.hi + 0.5), ['--c' as string]: 'var(--dv-us)' }} />
                {refP && <span className="ref" style={{ ['--at' as string]: pct(refP.rating) }} />}
              </span></div>
            ))}
          </div>
          <div className="axis"><span /><div><span>{Math.round(lo)}</span><span>{Math.round((lo + hi) / 2)}</span><span>{Math.round(hi)}</span></div></div>
          <div className="legend">{refP && <span><i style={{ background: 'var(--dv-4)', width: 3, height: 12 }} />{Rs.compare.ref(sn(refP, lang), refP.rating)}</span>}<span><i className="band" />{Rs.compare.key}</span></div>
        </Panel>
      )}
      {picks.length > 0 && <h2 className="rc-sec on-ground">{Rs.picks}</h2>}
      {picks.map((k, i) => <TargetCard key={k.p.id} p={k.p} pick={k} i={3 + i} />)}
      <h2 className="rc-sec on-ground">{Rs.shortlist}</h2>
      {list.map((p, i) => <TargetCard key={p.id} p={p} i={6 + i} />)}
      {list.length === 0 && (
        <Panel i={6} flat className="rc-empty">
          <p className="small">{Rs.emptyList}</p>
          <button className="btn btn--ghost on-ground btn--sm" onClick={() => g.go({ s: 'transfers', tab: 1 })}><I n="search" size="sm" />{x.tr.search}</button>
        </Panel>
      )}
    </div>
  );
}

export function TargetCard({ p, pick, i }: { p: Player; pick?: ScoutPick; i: number }) {
  const g = useGame();
  const { w, c, x, lang } = g;
  const Rs = R[g.ui];
  const cl = clubOf(w, p.clubId);
  const e = estimate(w, c, p);
  const k = Math.round(e.k);
  const fee = p.clubId === FREE_AGENT ? 0 : askOf(w, c, p);
  const d = demandOf(w, c, p);
  const ag = agentOf(c, p);
  const inter = interestOf(w, c, p);
  const ph = (c.tactics ?? DEFAULT_TACTICS).philosophy ?? 'balanced';
  const fit = styleFit(p, ph);
  const rc = rcOf(c);
  const neg = openNeg(rc, p.id);
  const frozen = (rc.frozen[p.id] ?? 0) > tickOf(c);
  const span = (a: number, b: number) => ({ ['--lo' as string]: `${((Math.max(40, a) - 40) / 60) * 100}%`, ['--hi' as string]: `${((Math.min(99, b) - 40) / 60) * 100 + 1}%` });
  const on = shortlisted(c, p.id);
  const canBid = p.clubId === FREE_AGENT || !!windowOf(c);
  const seeFit = k >= REVEAL.personality;
  return (
    <Panel className="target" i={i} label={p.name[lang]}>
      <div className="t-top">
        <Portrait p={p} club={cl ?? g.club} size={60} />
        <div className="grow"><h3>{p.name[lang]}</h3><span className="sub"><Crest club={cl} size={16} /><span className="clip">{cl ? cn(cl, lang) : Rs.free}</span><span>· {ageOf(p, c.season)} · {x.common.pos[p.position]}</span></span></div>
        <span className="known"><span className="ring" style={{ ['--p' as string]: k }}><b>{k}%</b></span>{Rs.known}</span>
      </div>
      {pick && <p className="whyfits"><I n="sparkle" size="sm" />{Rs.whyFits(x.common.posLong[pick.need.pos], pick.natural, pick.age, k)}</p>}
      <div className="fogs">
        <div className="fogrow"><span className="l">{Rs.ability}</span><div className="fog"><span className={`band${e.exact ? ' band--known' : ''}`} style={span(e.lo, e.hi)} /></div><span className="v ltr">{e.lo === e.hi ? e.lo : `${e.lo}–${e.hi}`}</span></div>
        <div className="fogrow"><span className="l">{Rs.ceiling}</span><div className="fog"><span className="band" style={span(e.plo, e.phi)} /></div><span className="v ltr">{e.plo === e.phi ? e.plo : `${e.plo}–${e.phi}`}</span></div>
        <div className="fogrow"><span className="l">{Rs.fit}</span><div className="fog"><span className={`band${seeFit ? ' band--known' : ''}`} style={seeFit ? span(40, fit) : span(fit - 12, fit + 12)} /></div><span className="v ltr">{seeFit ? fit : Rs.unknown}</span></div>
      </div>
      <div className="t-facts">
        <Kpi v={<span className="ltr">{p.clubId === FREE_AGENT ? Rs.free : money(fee)}</span>} l={Rs.asking} />
        <Kpi v={<span className="ltr">{k >= REVEAL.wage ? money(d.wage) : Rs.unknown}</span>} l={Rs.wants} />
        <Kpi v={<span className={inter <= 1 ? 'up' : inter >= 3 ? 'down' : ''}>{Rs.interestL[inter]}</span>} l={Rs.interest} />
      </div>
      <div className="t-prio small"><span className="muted">{Rs.prioLabel}</span><b>{k >= REVEAL.priority ? Rs.prio[ag.priority] : Rs.unknown}</b>{p.clubId !== FREE_AGENT && isUnhappy(p) && <span className="tag tag--warn"><I n="alert" size="sm" />{Rs.unsettled}</span>}</div>
      <div className="t-acts">
        {neg ? <button className="btn btn--primary" onClick={() => g.go({ s: 'transfers', tab: 2, neg: neg.id })}><I n="handshake" size="sm" />{Rs.inTalks}</button>
          : <button className="btn btn--primary" disabled={!canBid || frozen} onClick={() => g.go({ s: 'transfers', tab: 2, p: p.id })}><I n="handshake" size="sm" />{Rs.offer}</button>}
        <button className={`icon-btn star${on ? ' on' : ''}`} aria-pressed={on} aria-label={on ? Rs.unstar : Rs.star} onClick={() => void g.run({ type: 'shortlist.toggle', playerId: p.id }, { toast: false })}><I n="star" /></button>
        <button className="btn btn--ghost" onClick={() => g.player(p.id)}><I n="eye" size="sm" />{Rs.report}</button>
      </div>
    </Panel>
  );
}

// ---------- search ----------

function Search({ need }: { need: Position }) {
  const g = useGame();
  const { w, c, x, lang } = g;
  const T = x.tr;
  const Rs = R[g.ui];
  const [grp, setGrp] = useState<number>(GROUP_OF[need]);
  const [league, setLeague] = useState('');
  const [maxAge, setMaxAge] = useState(40);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState(0);
  const my = strengthOf(w, c.clubId);
  const ask = useMemo(() => askAll(w, c), [w, c]);
  const pool = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const leagueOf = new Map(w.clubs.map((cl) => [cl.id, cl.leagueId]));
    const ps = w.players.filter((p) => p.clubId !== c.clubId && GROUP_OF[p.position] === grp && ageOf(p, c.season) <= maxAge
      && (!league || (league === 'free' ? p.clubId === FREE_AGENT : leagueOf.get(p.clubId) === league))
      && (!needle || p.name.en.toLowerCase().includes(needle) || p.name.ar.includes(q.trim())));
    const est = estimateAll(w, c, ps);
    const mid = (p: Player) => { const e = est.get(p.id)!; return (e.lo + e.hi) / 2; };
    const key = [(p: Player) => mid(p), (p: Player) => -ask(p), (p: Player) => -ageOf(p, c.season), (p: Player) => est.get(p.id)!.k][sort];
    return { list: ps.filter((p) => mid(p) >= my - 16).sort((a, b) => key(b) - key(a)).slice(0, 60), est };
  }, [w, c, grp, league, maxAge, q, sort, my, ask]);
  const leagues = w.leagues.filter((l) => l.tier === 1 || w.clubs.some((cl) => cl.leagueId === l.id && cl.real));
  const sorts = [T.sort[0], T.sort[1], T.sort[2], Rs.known];
  return (
    <Panel i={1} className="search" label={T.search}>
      <div className="filters">
        <input className="field span2" type="search" placeholder={T.search} aria-label={T.search} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips span2">{x.common.group.map((l, i) => <button key={l} className="chip" aria-pressed={grp === i} onClick={() => setGrp(i)}>{l}</button>)}</div>
        <select className="field span2" value={league} onChange={(e) => setLeague(e.target.value)} aria-label={T.filters.league}>
          <option value="">{T.filters.league}: {T.any}</option>
          {leagues.map((l) => <option key={l.id} value={l.id}>{l.name[lang]}</option>)}
          <option value="free">{x.common.free}</option>
        </select>
        <select className="field" value={maxAge} onChange={(e) => setMaxAge(+e.target.value)} aria-label={T.filters.age}>
          {[40, 30, 27, 24, 21].map((a) => <option key={a} value={a}>{T.filters.age} ≤ {a === 40 ? T.any : a}</option>)}
        </select>
        <select className="field" value={sort} onChange={(e) => setSort(+e.target.value)} aria-label={T.sort[0]}>
          {sorts.map((l, i) => <option key={l} value={i}>{l}</option>)}
        </select>
      </div>
      <span className="eyebrow">{T.results(pool.list.length)}</span>
      <div className="rows srch">
        {pool.list.map((p) => {
          const e = pool.est.get(p.id)!;
          const cl = clubOf(w, p.clubId);
          const on = shortlisted(c, p.id);
          return (
            <div key={p.id} className="row srow">
              <button className="srow-main" onClick={() => g.player(p.id)}>
                <Portrait p={p} club={cl ?? g.club} size={40} />
                <span className="grow"><span className="name">{p.name[lang]}</span><span className="sub">{cl ? cn(cl, lang) : x.common.free} · {x.common.pos[p.position]} · {ageOf(p, c.season)}</span></span>
              </button>
              <span className="srow-r"><b className="ltr">{e.lo === e.hi ? e.lo : `${e.lo}–${e.hi}`}</b><small className="ltr">{p.clubId === FREE_AGENT ? x.common.free : money(ask(p))} · {Math.round(e.k)}%</small></span>
              <button className={`icon-btn star${on ? ' on' : ''}`} aria-pressed={on} aria-label={on ? x.player.unshortlist : x.player.shortlist} onClick={() => void g.run({ type: 'shortlist.toggle', playerId: p.id }, { toast: false })}><I n="star" /></button>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ---------- talks in progress ----------

export function negStatus(g: Game, n: Negotiation): string {
  const Rs = R[g.ui];
  if (n.stage === 'done' || n.stage === 'collapsed') return Rs.ends[n.end ?? 'gone'] ?? '';
  if (n.stage === 'club') {
    if (n.rival) return Rs.status.rival(cn(clubOf(g.w, n.rival.club), g.lang), money(n.rival.fee));
    if (n.answerAt !== null) return Rs.status.waiting(byDay(g.ui, n.answerAt));
    if (n.counter !== null) return Rs.status.counter(money(n.counter));
    return Rs.status.rejected;
  }
  const done = n.rounds.filter((r) => r.by === 'us').length;
  return `${Rs.status.terms(done + 1, done + Math.max(1, n.patience))}${n.due !== null ? ` · ${Rs.status.due(byDay(g.ui, n.due))}` : ''}`;
}

function TalksList() {
  const g = useGame();
  const { w, c, lang } = g;
  const Rs = R[g.ui];
  const rc = rcOf(c);
  const live = rc.negs.filter((n) => n.stage === 'club' || n.stage === 'terms');
  const past = rc.negs.filter((n) => n.stage === 'done' || n.stage === 'collapsed').sort((a, b) => (b.endT ?? 0) - (a.endT ?? 0)).slice(0, 8);
  const row = (n: Negotiation) => {
    const p = playerOf(w, n.playerId);
    const cl = clubOf(w, n.from);
    return (
      <button key={n.id} className="row linkrow talkrow" onClick={() => g.go({ s: 'transfers', tab: 2, neg: n.id })}>
        {p ? <Portrait p={p} club={cl ?? g.club} size={40} /> : <span />}
        <span className="grow"><span className="name">{n.pn[lang]}</span><span className="sub">{cl ? cn(cl, lang) : Rs.free} · {negStatus(g, n)}</span></span>
        <span className={`tag${n.stage === 'terms' ? ' tag--club' : n.stage === 'done' ? ' tag--good' : n.stage === 'collapsed' ? '' : ' tag--warn'}`}>{Rs.stage[n.stage]}</span>
      </button>
    );
  };
  return (
    <div className="grid">
      <Panel i={1} label={Rs.talks}>
        <PanelHead title={Rs.talks} />
        {live.length ? <div className="rows">{live.map(row)}</div> : <p className="muted small">{Rs.noTalks}</p>}
      </Panel>
      {past.length > 0 && (
        <Panel i={2} label={Rs.recent}>
          <PanelHead title={Rs.recent} />
          <div className="rows">{past.map(row)}</div>
        </Panel>
      )}
    </div>
  );
}

// ---------- bids for our players (also the sheet behind the header button elsewhere) ----------

export function Bids() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const Rs = R[g.ui];
  const why = rcOf(c).aiWhy;
  if (!c.offers.length) return <p className="muted small">{x.tr.noBids}</p>;
  return (
    <div className="rows">
      {c.offers.map((o) => {
        const p = playerOf(w, o.playerId); const cl = clubOf(w, o.clubId);
        if (!p) return null;
        const counter = Math.round(o.fee * 1.15 / 1e4) * 1e4;
        return (
          <div key={o.id} className="row bid">
            <Portrait p={p} club={g.club} size={40} />
            <span className="grow"><span className="name">{p.name[lang]}</span><span className="sub"><Crest club={cl} size={14} /> {cn(cl, lang)} · <span className="ltr">{money(o.fee)}</span> · {x.player.value} <span className="ltr">{money(p.marketValue)}</span></span>
              {why[o.id] && <span className="tag tag--warn rc-why">{Rs.aiWhy[why[o.id]]}</span>}</span>
            <span className="bid-acts">
              <button className="btn btn--primary btn--sm" onClick={() => void g.run({ type: 'offer.accept', offerId: o.id })}>{x.bid.accept}</button>
              <button className="btn btn--ghost btn--sm" onClick={() => void g.run({ type: 'offer.counter', offerId: o.id, fee: counter })}>{x.bid.counterBtn(money(counter))}</button>
              <button className="btn btn--ghost btn--sm" onClick={() => void g.run({ type: 'offer.reject', offerId: o.id }, { toast: x.note.done })}>{x.bid.reject}</button>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------- deals: bids for our players, money owed, the season's deals and the stories ----------

function Deals() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const Rs = R[g.ui];
  const rc = rcOf(c);
  const deals = c.deals.filter((d) => d.season === c.season);
  const commits = [...rc.commits].sort((a, b) => a.season - b.season);
  return (
    <div className="grid">
      <Panel i={1} label={Rs.bidsFor}><PanelHead title={Rs.bidsFor} /><Bids /></Panel>
      <Panel i={2} label={Rs.committed}>
        <PanelHead title={Rs.committed} right={<b className="ltr num">{money(committed(c))}</b>} />
        {!commits.length ? <p className="muted small">{Rs.noCommit}</p> : (
          <div className="rows">
            {commits.map((k) => (
              <div key={k.id} className="row">
                <span className="grow"><span className="name">{k.pn[lang]}</span><span className="sub">{Rs.commitRow(x.seasonLabel(k.season), cn(clubOf(w, k.to), lang))}</span></span>
                <b className="ltr num">{money(k.amount)}</b>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <Panel i={3} label={x.tr.deals}>
        <PanelHead title={x.tr.deals} />
        {!deals.length ? <p className="muted small">{x.tr.noDeals}</p> : (
          <div className="rows">
            {deals.map((d, k) => {
              const other = clubOf(w, d.kind === 'out' || d.kind === 'released' ? d.to : d.from);
              const sched = rc.clauses[d.playerId]?.sched;
              return (
                <div key={k} className="row">
                  <span className={`tag${d.kind === 'in' || d.kind === 'free' ? ' tag--good' : ' tag--warn'}`}>{x.tr.inOut[d.kind]}</span>
                  <span className="grow"><span className="name">{d.name[lang]}</span><span className="sub">{other ? cn(other, lang) : x.common.free}{sched && sched.length > 1 ? <span className="ltr"> · {sched.map((v) => money(v)).join(' + ')}</span> : null}</span></span>
                  <b className="ltr num">{d.fee ? money(d.fee) : x.common.free}</b>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
      {rc.threads.length > 0 && (
        <Panel i={4} className="g-wide" label={Rs.stories}>
          <PanelHead title={Rs.stories} />
          <div className="threads">
            {rc.threads.slice(0, 8).map((t) => (
              <button key={t.id} className="thread" onClick={() => g.player(t.pid)}>
                <b>{t.pn[lang]}</b>
                <ol>{t.steps.map((s, k) => <li key={k} className={k === t.steps.length - 1 ? 'last' : undefined}>{Rs.steps[s.k] ?? s.k}{s.n ? <span className="ltr"> · {money(s.n)}</span> : null}{s.club ? <span> · {cn(clubOf(w, s.club), lang)}</span> : null}</li>)}</ol>
              </button>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

// ---------- loans ----------

function Loans() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const Rs = R[g.ui];
  const L = Rs.loans;
  const rc = rcOf(c);
  const loans = (c.loans ?? []).filter((l) => l.season === c.season);
  const [ask, setAsk] = useState<string | null>(null);
  return (
    <div className="grid">
      <Panel i={1} label={x.tr.loans}>
        <PanelHead title={x.tr.loans} />
        {!loans.length ? <p className="muted small">{L.none}</p> : (
          <div className="rows">
            {loans.map((l) => {
              const inn = l.to === c.clubId;
              const t = rc.loans[l.playerId];
              const other = clubOf(w, inn ? l.from : l.to);
              const days = t ? Math.max(0, c.round - t.days0) : 0;
              const apps = t ? (c.stats[l.playerId]?.[0] ?? 0) - t.apps0 : 0;
              const need = t && t.minutes !== 'none' ? Math.ceil(CLAUSE_NEED[t.minutes] * Math.max(days, 1)) : 0;
              return (
                <div key={l.playerId} className="loanrow">
                  <button className="row linkrow" onClick={() => g.player(l.playerId)}>
                    <span className={`tag${inn ? ' tag--good' : ''}`}>{inn ? L.in : L.out}</span>
                    <span className="grow"><span className="name">{l.pn[lang]}</span><span className="sub">{cn(other, lang)} · {inn ? L.share(Math.round(l.share * 100)) : L.shareOut(Math.round(l.share * 100))}</span></span>
                    <I n="chev" size="sm" />
                  </button>
                  {t && (
                    <div className="loanmeta small">
                      <span className={`tag${t.broken ? ' tag--bad' : ''}`}>{t.broken ? L.broken : L.minutes[t.minutes]}</span>
                      {t.minutes !== 'none' && <span className="muted">{L.progress(apps, need, days)}</span>}
                      {inn && <span className="muted">{L.trust(Math.round(rc.parentTrust[l.from] ?? 60))}</span>}
                      {!inn && t.minutes !== 'none' && windowOf(c) && <button className="btn btn--ghost btn--sm" onClick={() => void g.run({ type: 'rc.recall', playerId: l.playerId })}>{L.recall}</button>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
      <Panel i={2} label={Rs.loan}>
        <PanelHead title={Rs.loan} />
        <LoanTargets onAsk={setAsk} />
      </Panel>
      {ask && <LoanSheet id={ask} onClose={() => setAsk(null)} />}
    </div>
  );
}

// Loan targets: players of other clubs from the scout's picks and the shortlist.
function LoanTargets({ onAsk }: { onAsk: (id: string) => void }) {
  const g = useGame();
  const { w, c, x, lang } = g;
  const Rs = R[g.ui];
  const picks = useMemo(() => scoutPicks(w, c, 4), [w, c]);
  const ids = [...new Set([...picks.map((k) => k.p.id), ...(c.shortlist ?? [])])];
  const ps = ids.map((id) => playerOf(w, id)).filter((p): p is Player => !!p && p.clubId !== FREE_AGENT && p.clubId !== c.clubId && !loanOf(c, p.id));
  if (!ps.length) return <p className="muted small">{Rs.emptyList}</p>;
  return (
    <div className="rows">
      {ps.slice(0, 8).map((p) => {
        const e = estimate(w, c, p);
        const cl = clubOf(w, p.clubId);
        return (
          <div key={p.id} className="row">
            <Portrait p={p} club={cl ?? g.club} size={40} />
            <span className="grow"><span className="name">{p.name[lang]}</span><span className="sub">{cn(cl, lang)} · {x.common.pos[p.position]} · <span className="ltr">{e.lo === e.hi ? e.lo : `${e.lo}–${e.hi}`}</span></span></span>
            <button className="btn btn--ghost btn--sm" disabled={!windowOf(c)} onClick={() => onAsk(p.id)}>{Rs.loan}</button>
          </div>
        );
      })}
    </div>
  );
}

// ---------- needs: the plan's gaps ----------

function Needs({ list, onTab }: { list: Need[]; onTab: (n: number) => void }) {
  const g = useGame();
  const { w, c, x, lang } = g;
  const Rs = R[g.ui];
  const t = c.tactics ?? DEFAULT_TACTICS;
  const slots = FORMATIONS[t.formation].slots;
  const byPos = new Map(list.map((n) => [n.pos, n]));
  const pinned = rcOf(c).pinned;
  const ALL: Position[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
  return (
    <div className="grid">
      <Panel i={1} className="g-board" label={Rs.board}>
        <PanelHead title={Rs.board} />
        <p className="small muted">{Rs.boardSub(fmt(t.formation))}</p>
        <div className="needpitch" role="img" aria-label={Rs.board}>
          {slots.map((s, i) => {
            const n = byPos.get(s.pos);
            return (
              <span key={i} className={`nslot ${n ? n.level : 'ok'}`} style={{ ['--x' as string]: `${s.x}%`, ['--y' as string]: `${100 - s.y}%` }}>
                <b>{x.common.pos[s.pos]}</b>{n && <I n={n.level === 'red' ? 'alert' : 'clock'} size="sm" />}
              </span>
            );
          })}
        </div>
        <div className="legend"><span><i className="lg red" />{Rs.legend.red}</span><span><i className="lg amber" />{Rs.legend.amber}</span><span><i className="lg ok" />{Rs.legend.ok}</span></div>
      </Panel>
      {list.map((n, i) => {
        const st = n.starter ? playerOf(w, n.starter) : undefined;
        return (
          <Panel key={n.id} i={2 + i} className={`needcard ${n.level}`} label={x.common.posLong[n.pos]}>
            <div className="between"><h3 className="h3">{x.common.posLong[n.pos]}</h3><span className={`tag${n.level === 'red' ? ' tag--bad' : ' tag--warn'}`}><I n={n.level === 'red' ? 'alert' : 'clock'} size="sm" />{n.level === 'red' ? Rs.legend.red : Rs.legend.amber}</span></div>
            <p className="small">{needTitle(g, n)}</p>
            <div className="why">{n.why.map((k) => <span key={k} className="tag">{Rs.why[k]}</span>)}{n.slots > 0 && <span className="tag"><I n="squad" size="sm" />{Rs.depth(n.depth, n.want)}</span>}{st && <span className="tag">{Rs.starter}: {sn(st, lang)} · {st.rating}</span>}</div>
            <div className="two">
              <button className="btn btn--primary btn--sm" onClick={() => onTab(0)}><I n="sparkle" size="sm" />{Rs.picksBtn}</button>
              <button className="btn btn--ghost btn--sm" onClick={() => onTab(6)}><I n="eye" size="sm" />{Rs.assignBtn}</button>
            </div>
            {n.why.includes('manual') && <button className="link" onClick={() => void g.run({ type: 'rc.need', pos: n.pos, on: false }, { toast: false })}>{Rs.unpin}</button>}
          </Panel>
        );
      })}
      {!list.length && <Panel i={2} flat className="rc-empty"><p className="small">{Rs.noNeeds}</p></Panel>}
      <Panel i={9} label={Rs.addNeed}>
        <span className="eyebrow">{Rs.addNeed}</span>
        <div className="chips">{ALL.map((p) => <button key={p} className="chip" aria-pressed={pinned.includes(p)} onClick={() => void g.run({ type: 'rc.need', pos: p, on: !pinned.includes(p) }, { toast: false })}>{x.common.pos[p]}</button>)}</div>
      </Panel>
    </div>
  );
}

// ---------- scouts: assignments ----------

function Scouts() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const Rs = R[g.ui];
  const S = Rs.scouts;
  const rc = rcOf(c);
  const max = assignSlots(c);
  const q = staffQ(c.ops, 'scout');
  const myLeague = g.league;
  const [scope, setScope] = useState<ScopeKind>('league');
  const [key, setKey] = useState(myLeague.id);
  const [pos, setPos] = useState<Position | ''>(() => needs(w, c)[0]?.pos ?? '');
  const countries = [...new Set(w.leagues.map((l) => l.country))];
  const leagues = w.leagues.filter((l) => l.tier <= 2);
  const scopeLabel = (a: Pick2) => (a.scope === 'league' ? w.leagues.find((l) => l.id === a.key)?.name[lang] ?? a.key : a.scope === 'country' ? countryOf(w, a.key)?.name[lang] ?? a.key : S.scope.world);
  const cov = useMemo(() => rc.assign.map((a) => coverage(w, c, a)), [w, c, rc.assign]);
  const total = cov.reduce((s, v) => s + v.n, 0), well = cov.reduce((s, v) => s + v.known, 0);
  return (
    <div className="grid">
      <Panel i={1} className="g-need" label={S.head}>
        <span className="eyebrow">{S.head}</span>
        <h2 className="h1">{S.slots(rc.assign.length, max)}</h2>
        <p className="small muted">{S.slotsWhy}</p>
        <p className="small rate"><I n="eye" size="sm" />{S.rate(Math.round(rateAssign(q, { scope: 'league', key: '', pos: null, id: '', since: 0 })), Math.round(rateTarget(q)))}</p>
        <ScoutQuote line={rc.assign.length ? S.quote(total, well) : S.empty} />
      </Panel>
      {rc.assign.map((a, i) => (
        <Panel key={a.id} i={2 + i} className="assign" label={scopeLabel(a)}>
          <div className="between"><h3 className="h3">{scopeLabel(a)}</h3><span className="tag">{S.scope[a.scope]}</span></div>
          <p className="small">{a.pos ? x.common.posLong[a.pos] : S.any} · {S.coverage(cov[i]?.n ?? 0, cov[i]?.known ?? 0)}</p>
          <div className="rc-meter" aria-hidden="true"><i style={{ width: `${cov[i]?.n ? (cov[i].known / cov[i].n) * 100 : 0}%` }} /></div>
          <button className="btn btn--ghost btn--sm" onClick={() => void g.run({ type: 'rc.unassign', id: a.id }, { toast: false })}><I n="x" size="sm" />{S.remove}</button>
        </Panel>
      ))}
      <Panel i={6} className="newassign" label={S.newOne}>
        <PanelHead title={S.newOne} />
        {rc.assign.length >= max ? <p className="small muted">{S.full}</p> : (
          <div className="terms-form">
            <div className="seg" role="group" aria-label={S.newOne}>
              {(['league', 'country', 'world'] as ScopeKind[]).map((s) => <button key={s} aria-pressed={scope === s} onClick={() => { setScope(s); setKey(s === 'league' ? myLeague.id : s === 'country' ? myLeague.country : ''); }}>{S.scope[s]}</button>)}
            </div>
            {scope === 'league' && <select className="field" value={key} onChange={(e) => setKey(e.target.value)} aria-label={S.scope.league}>{leagues.map((l) => <option key={l.id} value={l.id}>{l.name[lang]}</option>)}</select>}
            {scope === 'country' && <select className="field" value={key} onChange={(e) => setKey(e.target.value)} aria-label={S.scope.country}>{countries.map((k) => <option key={k} value={k}>{countryOf(w, k)?.name[lang] ?? k}</option>)}</select>}
            <select className="field" value={pos} onChange={(e) => setPos(e.target.value as Position | '')} aria-label={S.pos}>
              <option value="">{S.any}</option>
              {(['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'] as Position[]).map((p) => <option key={p} value={p}>{x.common.posLong[p]}</option>)}
            </select>
            {scope === 'world' && !pos && <p className="small muted">{S.worldPos}</p>}
            <button className="btn btn--primary" disabled={scope === 'world' && !pos} onClick={() => void g.run({ type: 'rc.assign', scope, key: scope === 'world' ? '' : key, pos: pos || null })}><I n="eye" size="sm" />{S.send}</button>
          </div>
        )}
      </Panel>
      <Panel i={7} label={S.best}>
        <PanelHead title={S.best} />
        <KnownList />
      </Panel>
    </div>
  );
}
type Pick2 = Pick<Assignment, 'scope' | 'key'>;

// The players we know best outside our own squad (what the scouts' weeks bought).
function KnownList() {
  const g = useGame();
  const { w, c, lang, x } = g;
  const rc = rcOf(c);
  const rows = Object.entries(rc.k).sort((a, b) => b[1][0] - a[1][0]).map(([id]) => playerOf(w, id)).filter((p): p is Player => !!p && p.clubId !== c.clubId).slice(0, 8);
  if (!rows.length) return <p className="muted small">{R[g.ui].scouts.none}</p>;
  return (
    <div className="rows">
      {rows.map((p) => {
        const e = estimate(w, c, p);
        return (
          <button key={p.id} className="row linkrow" onClick={() => g.player(p.id)}>
            <span className="grow"><span className="name">{p.name[lang]}</span><span className="sub">{cn(clubOf(w, p.clubId), lang) || x.common.free} · {x.common.pos[p.position]}</span></span>
            <b className="ltr num">{e.lo === e.hi ? e.lo : `${e.lo}–${e.hi}`}</b><span className="muted small ltr">{Math.round(knowledge(w, c, p))}%</span>
          </button>
        );
      })}
    </div>
  );
}
