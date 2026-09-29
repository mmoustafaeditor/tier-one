// The squad: who we have, where we're thin, and the three things worth glancing at for every player
// (condition, mood, years left). One tap reaches any player.
import { useMemo, useState } from 'react';
import type { Player } from '../model/types';
import { squadOf, wageBill } from '../sim/world';
import { FORMATIONS, DEFAULT_TACTICS, available, slotValue, xiFor } from '../sim/tactics';
import { avgRating } from '../sim/ratings';
import { loanOf } from '../sim/loans';
import { Chips, Panel, PanelHead } from './shell';
import { I, Portrait, Ring } from './kit';
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
  const squad = useMemo(() => squadOf(w, c.clubId), [w, c.clubId]);
  const { xi } = useMemo(() => xiFor(w, c), [w, c]);
  const inXI = new Set(xi.map((p) => p.id));
  const tac = c.tactics ?? DEFAULT_TACTICS;
  const slots = FORMATIONS[tac.formation].slots;
  // Depth: the XI player in each slot, and the best cover for that slot from outside the XI.
  const depth = slots.map((sl, i) => {
    const first = xi[i];
    const cover = squad.filter((p) => !inXI.has(p.id) && available(p)).sort((a, b) => slotValue(b, sl.pos) - slotValue(a, sl.pos))[0];
    const gap = first && cover ? slotValue(first, sl.pos) - slotValue(cover, sl.pos) : 99;
    const state = !cover || gap > 12 ? 'hole' : gap > 6 ? 'thin' : 'ok';
    return { sl, first, cover, state };
  });
  const holes = depth.filter((d) => d.state === 'hole');
  const worstHole = holes.sort((a, b) => (b.first?.rating ?? 0) - (a.first?.rating ?? 0))[0];
  const age = squad.reduce((s, p) => s + ageOf(p, c.season), 0) / Math.max(1, squad.length);
  const unhappy = squad.filter((p) => p.morale < 45).length;
  const list = squad.filter((p) => lens === 'all' || (lens === 'starters' && inXI.has(p.id)) || (lens === 'ending' && p.contractUntil <= c.season + 1)
    || (lens === 'unhappy' && p.morale < 50) || (lens === 'injured' && (p.injured > 0 || p.banned > 0)) || (lens === 'loans' && !!loanOf(c, p.id)) || (lens === 'listed' && !!p.listed))
    .sort((a, b) => (Number(inXI.has(b.id)) - Number(inXI.has(a.id))) || b.rating - a.rating);
  const ending = squad.filter((p) => p.contractUntil <= c.season + 1);
  const L = x.squad.lens;
  const sub = (p: Player) => {
    const bits = [x.common.pos[p.position], String(ageOf(p, c.season)), String(p.rating)];
    const r = avgRating(c.ratings?.[p.id]);
    if (r) bits.push(x.squad.form(r.toFixed(1)));
    if (p.injured) bits.push(x.squad.sub2.inj(p.injured)); else if (p.banned) bits.push(x.squad.sub2.ban);
    if (p.captain) bits.push(x.squad.sub2.captain);
    if (loanOf(c, p.id)) bits.push(x.squad.sub2.loan);
    if (p.listed) bits.push(x.squad.sub2.listed);
    if (p.req !== undefined) bits.push(D[g.ui].squad.req);
    else if (roomOf(c).asks.some((a) => a.playerId === p.id)) bits.push(D[g.ui].squad.ask);
    else if (pledgeOf(c, p.id)) bits.push(D[g.ui].squad.word);
    return bits.join(' · ');
  };
  return (
    <div className="sc-squad">
      <section className="s-head on-ground">
        <h1 className="h-hero">{x.squad.title}</h1>
        <div className="facts">
          <span><b>{age.toFixed(1)}</b>{x.squad.facts.age}</span>
          <span><b className="ltr">{money(wageBill(w, c.clubId))}</b>{x.squad.facts.wages}</span>
          <span><b>{unhappy}</b>{x.squad.facts.unhappy}</span>
          <span><b>{holes.length}</b>{x.squad.facts.holes(holes.length)}</span>
        </div>
        <Chips label={x.squad.title} value={lens} onChange={setLens}
          options={(['all', 'starters', 'ending', 'unhappy', 'injured', 'loans', 'listed'] as Lens[]).map((v) => ({ v, label: L[v] }))} />
      </section>

      <div className="grid">
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

        <Panel className="g-list" i={2} label={x.squad.player}>
          <div className="col-h"><span /><span className="eyebrow">{x.squad.player}</span><span className="glance"><span className="g">{x.squad.fit}</span><span className="g">{x.squad.mood}</span><span className="g">{x.squad.yrs}</span></span></div>
          <div className="plist">
            {list.map((p) => {
              const yrs = Math.max(0, p.contractUntil - c.season);
              const mood = moodOf(p);
              return (
                <button key={p.id} className="pl" onClick={() => g.player(p.id)}>
                  <Portrait p={p} club={g.club} />
                  <span className="grow"><span className="name">{p.name[lang]}</span><span className="sub">{sub(p)}</span></span>
                  <span className="glance">
                    <span className="g"><Ring v={p.injured || p.banned ? 0 : p.fitness} tone={p.fitness < 80 ? 'warn' : undefined} /></span>
                    <span className="g"><span className={`mood${mood <= 1 ? ' bad' : mood === 2 ? ' meh' : ''}`} aria-label={x.player.moods[mood]}><I n={MOOD_ICON[mood]} /></span></span>
                    <span className="g"><span className={`yrs${yrs <= 1 ? ' warn' : ''}`}>{yrs <= 0 ? '½' : yrs}</span></span>
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel className="g-prom" i={3} label={x.squad.desk}>
          <PanelHead title={x.squad.desk} right={<span className="eyebrow">{x.squad.deskSub}</span>} />
          <div className="rows">
            <button className="row linkrow" onClick={() => setLens('ending')}><I n="doc" /><span className="grow"><span className="name">{ending.length ? x.squad.ending(ending.length) : x.squad.endingNone}</span><span className="sub">{ending.slice(0, 3).map((p) => sn(p, lang)).join(' · ')}</span></span><I n="chev" size="sm" /></button>
            <button className="row linkrow" onClick={() => setLens('listed')}><I n="market" /><span className="grow"><span className="name">{x.squad.listedN(squad.filter((p) => p.listed).length)}</span></span><I n="chev" size="sm" /></button>
            <button className="row linkrow" onClick={() => setLens('loans')}><I n="swap" /><span className="grow"><span className="name">{x.squad.loansOut((c.loans ?? []).filter((l) => l.from === c.clubId && l.season === c.season).length)}</span></span><I n="chev" size="sm" /></button>
          </div>
          <div className="squad-doors">
            <button className="btn btn--primary btn--sm" onClick={() => g.go({ s: 'room' })}><I n="room" size="sm" />{D[g.ui].squad.door}</button>
            <button className="btn btn--ghost btn--sm" onClick={() => g.go({ s: 'train' })}><I n="bolt" size="sm" />{x.squad.training}</button>
            <button className="btn btn--ghost btn--sm" onClick={() => g.go({ s: 'train' })}><I n="medic" size="sm" />{x.squad.medical}</button>
            <button className="btn btn--ghost btn--sm" onClick={() => g.go({ s: 'train' })}><I n="grad" size="sm" />{x.squad.academy}</button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
