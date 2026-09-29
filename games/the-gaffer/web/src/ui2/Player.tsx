// One player: his shirt on the peg, what we know (a range when the scouts aren't sure), where he's heading, what he's
// good at, where he fits, and his contract. What you can do with him sits in the top bar.
import { useMemo, useState } from 'react';
import { FREE_AGENT, type Position } from '../model/types';
import { FLAG } from '../data/names';
import { playerOf, squadOf, money as money0 } from '../sim/world';
import { estimate, shortlisted } from '../sim/estimate';
import { avgRating } from '../sim/ratings';
import { askOf } from '../sim/recruit/club';
import { rcOf } from '../sim/recruit/state';
import { LoanSheet, LoanOutSheet } from './Talks';
import { slotValue } from '../sim/tactics';
import { loanOf } from '../sim/loans';
import { windowOf } from '../sim/windows';
import { Crest, I, Kpi, LineChart, Meter, Portrait } from './kit';
import { Panel, PanelHead } from './shell';
import { useGame, clubOf, cn, money, sn } from './game';
import { ageOf } from './util';

const NEAR: Record<Position, Position[]> = {
  GK: ['GK'], CB: ['CB', 'CDM', 'RB'], LB: ['LB', 'LW', 'CB'], RB: ['RB', 'RW', 'CB'], CDM: ['CDM', 'CM', 'CB'], CM: ['CM', 'CDM', 'CAM'],
  CAM: ['CAM', 'CM', 'ST'], LW: ['LW', 'RW', 'CAM'], RW: ['RW', 'LW', 'CAM'], ST: ['ST', 'CAM', 'LW'],
};
const GROUPS = [[3, 2, 1], [4], [0, 5]];

export function PlayerScreen({ id }: { id: string }) {
  const g = useGame();
  const { w, c, x, lang } = g;
  const p = playerOf(w, id);
  const [loanPick, setLoanPick] = useState(false);
  const [loanAsk, setLoanAsk] = useState(false);
  const est = useMemo(() => (p ? estimate(w, c, p) : null), [w, c, p]);
  if (!p || !est) return <div className="empty-state on-ground"><p>{x.bid.no.gone}</p><button className="btn btn--ghost on-ground" onClick={() => g.go({ s: 'squad' })}>{x.back}</button></div>;
  const mine = p.clubId === c.clubId;
  const club = clubOf(w, p.clubId);
  const age = ageOf(p, c.season);
  const loan = loanOf(c, p.id);
  const rt = c.ratings?.[p.id];
  const st = c.stats[p.id] ?? [0, 0, 0, 0, 0];
  const squad = squadOf(w, c.clubId);
  const avg = Math.round(squad.map((q) => q.rating).sort((a, b) => b - a).slice(0, 11).reduce((s, v) => s + v, 0) / Math.min(11, Math.max(1, squad.length)));
  const exact = est.exact;
  const peakAge = Math.max(age + 1, Math.min(29, age + Math.ceil((est.phi - est.hi) / 2)));
  const up = est.phi > est.hi;
  const P = x.player;
  // Projection band: now → five seasons on, rating rising towards the ceiling band until the peak, then easing off.
  const years = Array.from({ length: 6 }, (_, i) => i);
  const proj = (lo: boolean) => years.map((i) => {
    const a = age + i;
    const top = lo ? est.plo : est.phi;
    const base = lo ? est.lo : est.hi;
    const v = a <= peakAge ? base + (top - base) * Math.min(1, i / Math.max(1, peakAge - age)) : top - (a - peakAge) * 1.2;
    return Math.round(Math.max(40, Math.min(99, v)));
  });
  const ask = !mine && p.clubId !== FREE_AGENT ? askOf(w, c, p) : 0;
  const release = mine ? rcOf(c).clauses[p.id]?.release : null; // v2.5: a clause we signed
  const fitRows = NEAR[p.position].map((pos) => ({ pos, v: Math.round(slotValue({ ...p, fitness: 100, morale: 60 }, pos)) }));
  const range = (lo: number, hi: number) => (lo === hi ? String(lo) : `${lo}–${hi}`);
  const flag = FLAG[p.nationality] ?? '';
  const earnerRank = mine ? [...squad].sort((a, b) => b.wage - a.wage).findIndex((q) => q.id === p.id) + 1 : 0;
  const windowShut = !windowOf(c) && p.clubId !== FREE_AGENT;
  return (
    <div className="sc-player">
      <header className="topbar on-ground">
        <div className="club">
          <button className="icon-btn" aria-label={x.back} onClick={() => g.go({ s: mine ? 'squad' : 'transfers' })}><I n="back" /></button>
          <div className="grow"><b>{mine ? P.back : x.tr.title}</b><small>{x.common.posLong[p.position]}</small></div>
        </div>
        <div className="p-acts">
          {mine ? (
            <>
              <button className="btn btn--ghost on-ground btn--sm" onClick={() => g.sheet({ k: 'renew', id: p.id })}><I n="doc" size="sm" />{P.renew}</button>
              <button className="btn btn--ghost on-ground btn--sm" onClick={() => g.run({ type: 'player.list', playerId: p.id, listed: !p.listed }, { toast: x.saved })}><I n="market" size="sm" />{p.listed ? P.unlist : P.list}</button>
            </>
          ) : (
            <>
              <button className="btn btn--accent btn--sm" disabled={windowShut} onClick={() => g.go({ s: 'transfers', tab: 2, p: p.id })}><I n="handshake" size="sm" />{P.bid}</button>
              <button className="btn btn--ghost on-ground btn--sm" onClick={() => g.run({ type: 'shortlist.toggle', playerId: p.id }, { toast: x.saved })}><I n="star" size="sm" />{shortlisted(c, p.id) ? P.unshortlist : P.shortlist}</button>
            </>
          )}
        </div>
      </header>

      <div className="layout">
        <section className="hero">
          <div className="hero-card">
            <Portrait p={p} club={club ?? g.club} className="portrait--hero" />
            {club && <Crest club={club} size={44} className="hero-crest" />}
            <div className="id">
              <span className="eyebrow on-ground">{x.common.posLong[p.position]}{p.captain ? ` · ${P.captain}` : ''}</span>
              <h1 className="h-hero">{p.name[lang]}</h1>
              <div className="meta"><span>{age}</span><span>·</span><span className="flagc">{flag} {p.nationality}</span>{!mine && club && <><span>·</span><span>{cn(club, lang)}</span></>}{loan && <><span>·</span><span>{P.onLoan(cn(clubOf(w, loan.to === c.clubId ? loan.from : loan.to), lang))}</span></>}</div>
            </div>
          </div>
          <div className="strip">
            <Kpi v={exact ? p.rating : <>{est.lo}<small>–{est.hi}</small></>} l={P.ability} />
            <Kpi v={<>{est.plo}<small>–{est.phi}</small></>} l={P.ceiling} />
            <Kpi v={avgRating(rt) ? avgRating(rt).toFixed(1) : '–'} l={<>{P.form}{rt?.[1] ? ` · ${P.apps(rt[1])}` : ''}</>} />
            <Kpi v={<span className="ltr">{money(p.marketValue)}</span>} l={P.value} />
          </div>
        </section>

        <div className="grid">
          <Panel className="g-dev" i={1} label={P.dev}>
            <div className="between"><span className="eyebrow">{P.dev}</span>{mine && (p.prog ?? 0) > 0 && <span className="tag tag--good"><I n="trend" size="sm" />{Math.round(p.prog ?? 0)}%</span>}</div>
            <h2 className="h2 dev-h">{P.devHead(age, peakAge, up)}</h2>
            <LineChart h={170} rtl={g.rtl} yMin={Math.max(40, Math.min(est.lo, avg) - 8)} yMax={Math.min(99, Math.max(est.phi, avg) + 4)}
              x={years.map((i) => x.seasonLabel(c.season + i))} tipX={(i) => `${x.seasonLabel(c.season + i)} · ${age + i}`}
              series={[{ data: years.map((i) => (i === 0 ? (exact ? p.rating : Math.round((est.lo + est.hi) / 2)) : null)), label: P.abilityLine }, { data: years.map(() => avg), them: true, label: P.avgLine }]}
              band={{ lo: proj(true), hi: proj(false) }} markers={[{ i: 0, label: x.seasonLabel(c.season) }]} />
            <div className="legend"><span><i />{P.abilityLine}</span><span><i className="band" />{P.projLine}</span><span><i className="them" />{P.avgLine}</span></div>
          </Panel>

          <Panel i={2} label={P.good}>
            <PanelHead title={P.good} right={<span className="eyebrow">{mine ? P.own : P.scouted(exact ? 100 : Math.round(100 - (est.hi - est.lo) * 8))}</span>} />
            <div className="attr-groups">
              {(p.position === 'GK' ? [[6], [2], [0, 5]] : GROUPS).map((grp, k) => (
                <div key={k} className="ag">
                  <h3>{p.position === 'GK' && k === 0 ? x.common.posLong.GK : P.groups[k]}</h3>
                  {grp.map((ai) => {
                    const v = p.attrs[ai];
                    const off = exact ? 0 : Math.max(2, Math.round((est.hi - est.lo) / 2) + 2);
                    return (
                      <div key={ai} className="at">
                        <span>{P.attrs[ai]}</span>
                        {exact ? <Meter v={v} tone={v < 55 ? 'warn' : undefined} /> : <div className="fog"><span className="band" style={{ ['--lo' as string]: `${v - off}%`, ['--hi' as string]: `${v + off}%` }} /></div>}
                        <span className={`n${v >= 80 ? ' hi' : ''}`}>{exact ? v : '?'}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </Panel>

          <Panel i={3} label={P.fits}>
            <PanelHead title={P.fits} />
            <div className="fits">
              {fitRows.map((f) => (
                <div key={f.pos} className="fitrow"><b>{x.common.posLong[f.pos]}</b><span className="num">{exact ? f.v : '?'}</span><Meter v={exact ? f.v : 50} tone={f.v < p.rating - 6 ? 'warn' : undefined} /></div>
              ))}
            </div>
          </Panel>

          <Panel i={4} label={P.man}>
            <PanelHead title={P.man} />
            <div className="traits">
              {p.captain && <span className="tag tag--club"><I n="star" size="sm" />{P.captain}</span>}
              <span className={`tag${p.morale < 45 ? ' tag--bad' : p.morale >= 70 ? ' tag--good' : ''}`}><I n="heart" size="sm" />{P.morale(P.moods[p.morale >= 75 ? 4 : p.morale >= 62 ? 3 : p.morale >= 50 ? 2 : p.morale >= 38 ? 1 : 0])}</span>
              {mine && <span className={`tag${p.fitness < 80 ? ' tag--warn' : ''}`}><I n="bolt" size="sm" />{x.today.tired(p.fitness)}</span>}
              {p.injured > 0 && <span className="tag tag--bad"><I n="medic" size="sm" />{x.today.injured(p.injured)}</span>}
            </div>
            <p className="small muted">{P.season}: {P.seasonStats(st[0], st[1], st[2])}</p>
            {mine && (
              <div className="p-more">
                <button className="btn btn--ghost btn--sm" onClick={() => g.run({ type: 'rest.set', playerId: p.id, rest: !(c.rested ?? []).includes(p.id) }, { toast: x.saved })}>{(c.rested ?? []).includes(p.id) ? P.unrest : P.rest}</button>
                <button className="btn btn--ghost btn--sm" onClick={() => setLoanPick(true)}>{P.loanOut}</button>
                <button className="btn btn--ghost btn--sm" onClick={() => g.sheet({ k: 'rename', kind: 'player', id: p.id })}>{P.rename}</button>
              </div>
            )}
            {!mine && p.clubId !== FREE_AGENT && <div className="p-more"><button className="btn btn--ghost btn--sm" disabled={windowShut} onClick={() => setLoanAsk(true)}>{P.loanIn}</button></div>}
          </Panel>

          <Panel i={5} label={P.contract}>
            <PanelHead title={P.contract} right={mine ? <span className={`tag${p.contractUntil <= c.season + 1 ? ' tag--warn' : ' tag--good'}`}><I n={p.contractUntil <= c.season + 1 ? 'clock' : 'lock'} size="sm" />{p.contractUntil <= c.season + 1 ? P.ending : P.secure}</span> : undefined} />
            <div className="contract">
              <Kpi v={p.clubId === FREE_AGENT ? '—' : p.contractUntil + 1} l={P.expires} />
              <Kpi v={<span className="ltr">{money(p.wage)}</span>} l={P.perMonth} />
              {mine ? <Kpi v={release ? <span className="ltr">{money0(release)}</span> : P.none} l={P.release} /> : <Kpi v={<span className="ltr">{p.clubId === FREE_AGENT ? x.common.free : money0(ask)}</span>} l={x.tr.likely} />}
              {mine ? <Kpi v={x.place(earnerRank)} l={P.rank} /> : <Kpi v={exact ? range(est.lo, est.hi) : `${est.lo}–${est.hi}`} l={P.ability} />}
            </div>
          </Panel>
        </div>
      </div>

      {loanPick && <LoanOutSheet id={p.id} onClose={() => setLoanPick(false)} />}
      {loanAsk && <LoanSheet id={p.id} onClose={() => setLoanAsk(false)} />}
    </div>
  );
}
void sn;
