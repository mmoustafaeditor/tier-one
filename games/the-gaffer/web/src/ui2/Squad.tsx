// The squad: who we have, where we're thin, and the three things worth glancing at for every player
// (condition, mood, years left). One tap reaches any player.
import { RF } from '../lang-ref-all';
import type { Player as PlayerT } from '../model/types';
// gf-ref: suspended in a cup (the league ban is `banned`).
const cupBanned = (p: PlayerT) => Object.values(p.sus ?? {}).some((n) => n > 0);
import { useMemo, useState } from 'react';
import type { Player } from '../model/types';
import { squadOf, wageBill } from '../sim/world';
import { FORMATIONS, DEFAULT_TACTICS, available, slotValue, xiFor } from '../sim/tactics';
import { avgRating } from '../sim/ratings';
import { loanOf } from '../sim/loans';
import { riskBand } from '../sim/youth';
import { Y } from '../lang-youth-all';
import { Panel, PanelHead, Seg } from './shell';
import { CN } from '../lang-cine';
import { NV } from '../lang-nav-all';
import { I, Portrait, Ring } from './kit';
import { SquadPlanner } from './Planner';
import { useGame, money, sn } from './game';
import { ageOf, moodOf } from './util';
import { D } from '../lang-dressing-all';
import { pledgeOf, roomOf } from '../sim/room';

type Lens = 'all' | 'starters' | 'ending' | 'unhappy' | 'injured' | 'loans' | 'listed';
const MOOD_ICON = ['alert', 'alert', 'chat', 'heart', 'heart'];

export function SquadScreen({ lens: lens0 }: { lens?: string }) {
  const g = useGame();
  const { w, c, x, lang } = g;
  const [lens, setLens] = useState<Lens>((lens0 as Lens) ?? 'all');
  const [view, setView] = useState<'players' | 'depth' | 'contracts'>('players');
  const [all, setAll] = useState(!!lens0 && lens0 !== 'all');
  const squad = useMemo(() => squadOf(w, c.clubId), [w, c.clubId]);
  const { xi } = useMemo(() => xiFor(w, c), [w, c]);
  const inXI = new Set(xi.map((p) => p.id));
  const tac = c.tactics ?? DEFAULT_TACTICS;
  const slots = FORMATIONS[tac.formation].slots;
  // Depth: the XI player in each slot, and a cover for that slot from outside the XI. A bench player covers one slot
  // only (GF-009): the slots with the fewest good options pick first, so one utility man can't make three spots look safe.
  const bench = squad.filter((p) => !inXI.has(p.id) && available(p));
  const options = (i: number) => bench.filter((p) => (xi[i] ? slotValue(xi[i], slots[i].pos) : 0) - slotValue(p, slots[i].pos) <= 12).length;
  const order = slots.map((_, i) => i).sort((a, b) => options(a) - options(b));
  const used = new Set<string>();
  const covers: (typeof bench)[number][] = [];
  for (const i of order) {
    const cover = bench.filter((p) => !used.has(p.id)).sort((a, b) => slotValue(b, slots[i].pos) - slotValue(a, slots[i].pos))[0];
    if (cover) { used.add(cover.id); covers[i] = cover; }
  }
  const depth = slots.map((sl, i) => {
    const first = xi[i];
    const cover = covers[i];
    const gap = first && cover ? slotValue(first, sl.pos) - slotValue(cover, sl.pos) : 99;
    const state = !cover || gap > 12 ? 'hole' : gap > 6 ? 'thin' : 'ok';
    return { sl, first, cover, state };
  });
  const holes = depth.filter((d) => d.state === 'hole');
  const worstHole = holes.sort((a, b) => (b.first?.rating ?? 0) - (a.first?.rating ?? 0))[0];
  const age = squad.reduce((s, p) => s + ageOf(p, c.season), 0) / Math.max(1, squad.length);
  const unhappy = squad.filter((p) => p.morale < 45).length;
  const list = squad.filter((p) => lens === 'all' || (lens === 'starters' && inXI.has(p.id)) || (lens === 'ending' && p.contractUntil <= c.season + 1)
    || (lens === 'unhappy' && p.morale < 50) || (lens === 'injured' && (p.injured > 0 || p.banned > 0 || cupBanned(p))) || (lens === 'loans' && !!loanOf(c, p.id)) || (lens === 'listed' && !!p.listed))
    .sort((a, b) => (Number(inXI.has(b.id)) - Number(inXI.has(a.id))) || b.rating - a.rating);
  const ending = squad.filter((p) => p.contractUntil <= c.season + 1);
  const L = x.squad.lens;
  const C = CN[g.ui];
  // The row's second line: position and rating first, then only what changes a decision (form, injury, ban, load,
  // loan, listing, an ask or a promise). Captaincy is a badge.
  const sub = (p: Player) => {
    const bits = [`${x.common.pos[p.position]} · ${p.rating}`];
    const r = avgRating(c.ratings?.[p.id]);
    if (r) bits.push(x.squad.form(r.toFixed(1)));
    if (p.injured) bits.push(x.squad.sub2.inj(p.injured)); else if (p.banned) bits.push(x.squad.sub2.ban);
    else if (cupBanned(p)) bits.push(RF[g.ui].suspended); // gf-ref: a cup suspension
    else if (riskBand(p) > 0) bits.push(`${Y[g.ui].cv.load} ${Y[g.ui].bands[riskBand(p)].toLowerCase()}`); // v2.6
    if (loanOf(c, p.id)) bits.push(x.squad.sub2.loan);
    if (p.listed) bits.push(x.squad.sub2.listed);
    if (p.req !== undefined) bits.push(D[g.ui].squad.req);
    else if (roomOf(c).asks.some((a) => a.playerId === p.id)) bits.push(D[g.ui].squad.ask);
    else if (pledgeOf(c, p.id)) bits.push(D[g.ui].squad.word);
    return bits.join(' · ');
  };
  const rows = view === 'contracts' ? [...squad].sort((a, b) => a.contractUntil - b.contractUntil || b.rating - a.rating) : list;
  const SHOW = 8;
  const shown = all || view === 'contracts' ? rows : rows.slice(0, SHOW);
  const table = (
    <div className="sq-table" role="table" aria-label={x.squad.player}>
      <div className="sq-h" role="row"><span role="columnheader">{C.colPlayer}</span><span role="columnheader" className="c-pos">{C.colPos}</span><span role="columnheader">{C.colFit}</span><span role="columnheader">{C.colMood}</span><span role="columnheader">{C.colYears}</span></div>
      {shown.map((p) => {
        const yrs = Math.max(0, p.contractUntil - c.season);
        const mood = moodOf(p);
        return (
          <button key={p.id} className="sq-r" role="row" onClick={() => g.player(p.id)}>
            <span className="sq-who" role="cell"><Portrait p={p} club={g.club} /><span className="grow"><span className="name">{p.name[lang]}{p.captain && <span className="cap" aria-label={x.squad.sub2.captain}>C</span>}</span><span className="sub">{sub(p)}</span></span></span>
            <span className="c-pos" role="cell">{x.common.pos[p.position]} · {p.rating}</span>
            <span role="cell"><Ring v={p.injured || p.banned ? 0 : p.fitness} tone={p.fitness < 80 ? 'warn' : undefined} size={34} /></span>
            <span role="cell"><span className={`mood${mood <= 1 ? ' bad' : mood === 2 ? ' meh' : ''}`} aria-label={x.player.moods[mood]}><I n={MOOD_ICON[mood]} /></span></span>
            <span role="cell"><span className={`yrs${yrs <= 1 ? ' warn' : ''}`}>{yrs <= 0 ? '½' : yrs}</span></span>
          </button>
        );
      })}
    </div>
  );
  return (
    <div className="sc-squad cine-squad">
      <header className="pg-head">
        <div className="pg-title"><h1 className="h-hero">{x.squad.title}</h1><p className="pg-sub">{C.players(squad.length)}</p></div>
        <div className="pg-facts">
          <span><b className="num">{age.toFixed(1)}</b><small>{C.avgAge}</small></span>
          <span><b className="ltr">{money(wageBill(w, c.clubId))}<em>{C.perMonth}</em></b><small>{C.wageBill}</small></span>
          <span><b className="num">{unhappy}</b><small>{C.unhappy}</small></span>
        </div>
        <button className="btn btn--ghost pg-cta" onClick={() => setView('depth')}>{C.planner}<I n="arrowr" size="sm" flip={g.rtl} /></button>
      </header>
      <Seg label={x.squad.title} value={view} onChange={setView} className="pg-tabs"
        options={[{ v: 'players', label: NV[g.ui].players }, { v: 'depth', label: C.depth }, { v: 'contracts', label: <>{C.contracts}{ending.length > 0 && <em className="tab-n">{ending.length}</em>}</> }]} />

      {view === 'players' && (
        <div className="sq-grid">
          <div className="sq-main">
            <div className="sq-tools">
              <label className="sel"><span className="sr">{x.squad.title}</span>
                <select value={lens} onChange={(e) => { setLens(e.target.value as Lens); setAll(true); }}>
                  {(['all', 'starters', 'ending', 'unhappy', 'injured', 'loans', 'listed'] as Lens[]).map((v) => <option key={v} value={v}>{L[v]}</option>)}
                </select>
              </label>
              <span className="sq-holes"><b>{holes.length}</b> {x.squad.facts.holes(holes.length)}</span>
            </div>
            {table}
            {rows.length > SHOW && <button className="link sq-all" onClick={() => setAll(!all)}>{all ? C.showFewer : C.viewAll(rows.length)}<I n="arrowr" size="sm" flip={g.rtl} /></button>}
          </div>
          <aside className="sq-side">
            <button className={`sq-alert${ending.length ? '' : ' calm'}`} onClick={() => setView('contracts')}>
              <I n="doc" /><b className="grow">{ending.length ? C.dealsEnding(ending.length) : x.squad.endingNone}</b><span>{C.review}<I n="arrowr" size="sm" flip={g.rtl} /></span>
            </button>
            <div className="sq-moves">
              <I n="market" />
              <button className="link" onClick={() => { setLens('listed'); setAll(true); }}>{C.listed} <b>{squad.filter((p) => p.listed).length}</b></button>
              <span aria-hidden="true">·</span>
              <button className="link" onClick={() => { setLens('loans'); setAll(true); }}>{C.onLoan} <b>{(c.loans ?? []).filter((l) => l.from === c.clubId && l.season === c.season).length}</b></button>
            </div>
            <div className="sq-tiles">
              <button onClick={() => g.go({ s: 'room' })}><I n="room" size="lg" /><span>{NV[g.ui].room}</span></button>
              <button onClick={() => g.go({ s: 'train' })}><I n="bolt" size="lg" /><span>{NV[g.ui].training}</span></button>
              <button onClick={() => g.go({ s: 'medical' })}><I n="medic" size="lg" /><span>{NV[g.ui].medical}</span></button>
              <button onClick={() => g.go({ s: 'academy' })}><I n="grad" size="lg" /><span>{NV[g.ui].academy}</span></button>
            </div>
          </aside>
        </div>
      )}

      {view === 'depth' && (
        <div className="sq-depthview">
          <Panel className="g-depth" i={1} label={x.squad.depth}>
            <PanelHead title={x.squad.depth} right={<span className="eyebrow">{x.squad.depthSub}</span>} />
            <div className="depth">
              <svg viewBox="0 0 68 88" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="var(--pitch-line)" strokeWidth=".5"><rect x="2" y="2" width="64" height="84" /><line x1="2" y1="44" x2="66" y2="44" /><circle cx="34" cy="44" r="8" /><rect x="16" y="2" width="36" height="14" /><rect x="16" y="72" width="36" height="14" /></g></svg>
              {depth.map((d, i) => (
                <button key={i} className={`pos${d.state === 'ok' ? '' : ` ${d.state}`}`} style={{ left: `${d.sl.x}%`, top: `${Math.max(9, Math.min(91, 100 - d.sl.y))}%` }}
                  onClick={() => d.first && g.player(d.first.id)} aria-label={`${x.common.pos[d.sl.pos]} ${d.first ? sn(d.first, lang) : ''}`}>
                  <span className="ph">{x.common.pos[d.sl.pos]}<span className="dot" /></span>
                  <b>{d.first ? sn(d.first, lang) : '—'}</b>
                  <span className="alt">{d.cover ? sn(d.cover, lang) : x.squad.thenNobody}</span>
                </button>
              ))}
            </div>
            <div className="depth-key"><span><i style={{ background: 'var(--good)' }} />{x.squad.covered}</span><span><i style={{ background: 'var(--warn-mark)' }} />{x.squad.thin}</span><span><i style={{ background: 'var(--bad)' }} />{x.squad.hole}</span></div>
            {worstHole?.first && (
              <div className="alert">
                <I n="alert" />
                <div className="grow"><b>{x.squad.noCover(sn(worstHole.first, lang))}</b><span>{x.squad.noCoverSub}</span></div>
                <button className="btn btn--primary btn--sm" onClick={() => g.go({ s: 'transfers', tab: 1 })}>{x.squad.shortlist}</button>
              </div>
            )}
          </Panel>
          <SquadPlanner />
        </div>
      )}

      {view === 'contracts' && <div className="sq-main sq-contracts">{table}</div>}
    </div>
  );
}
