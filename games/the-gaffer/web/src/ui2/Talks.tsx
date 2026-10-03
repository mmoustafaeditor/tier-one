// The negotiation room (v2/look/mockups/negotiation.html): the deal's stage, the table so far (every bid and answer,
// every round with the agent), the patience meter, your offer with what each term and clause costs, and — before you
// send — the honest read of what happens next. Also the loan sheets (in and out) with wage share and minutes.
import { useMemo, useState } from 'react';
import { FREE_AGENT, type Player } from '../model/types';
import { playerOf, squadOf } from '../sim/world';
import { estimate } from '../sim/estimate';
import { isDeadlineDay, windowOf } from '../sim/windows';
import { roundFee } from '../sim/season';
import { loanClubs, loanFee } from '../sim/loans';
import { biasOf } from '../sim/delegation';
import { rcOf, negById, openNeg, type ClubOffer, type Negotiation, type RoleTerm, type Terms, type MinutesClause } from '../sim/recruit/state';
import { askOf, bidValue, nominal, reservation, split, SELL_ONS, CLUB_PATIENCE } from '../sim/recruit/club';
import { agentFee, agentOf, demandOf, greenFrom, maxYears, PATIENCE, signChance, type Demand } from '../sim/recruit/agent';
import { dealCost, lastCounter, loanNeeds, borrowerTakes, SHARES } from '../sim/recruit/deals';
import { spendingRoom, wageRoom } from '../sim/recruit/money';
import { knowledge, REVEAL } from '../sim/recruit/knowledge';
import { R } from '../lang-recruit-all';
import { Crest, I, Portrait, initialsOf } from './kit';
import { Panel, Sheet } from './shell';
import { useGame, clubOf, cn, money, nm, sn, type Game } from './game';
import { byDay, rcReason } from './recruitText';

const ROLES: RoleTerm[] = ['star', 'regular', 'rotation', 'prospect'];
const UP = [0.4, 0.6, 0.8];
const REL = [1.5, 2, 3];

export function Talks({ negId, pid, onBack }: { negId?: string; pid?: string; onBack: () => void }) {
  const g = useGame();
  const { w, c, lang } = g;
  const Rs = R[g.ui];
  const rc = rcOf(c);
  const neg = negId ? negById(rc, negId) : pid ? openNeg(rc, pid) : undefined;
  const p = playerOf(w, neg?.playerId ?? pid ?? '');
  if (!p) return <div className="empty-state on-ground"><p>{g.x.bid.no.gone}</p><button className="btn btn--ghost on-ground" onClick={onBack}>{g.x.back}</button></div>;
  const from = neg?.from ?? p.clubId;
  const seller = clubOf(w, from);
  const stage = neg?.stage ?? (p.clubId === FREE_AGENT ? 'terms' : 'club');
  const ag = agentOf(c, p);
  const R2 = Rs.room;
  const sub = neg?.fee ? R2.agreed(cn(seller, lang), money(nominal(neg.fee))) : from === FREE_AGENT ? R2.freeAgent : neg?.answerAt != null ? R2.onTable : cn(seller, lang);
  const idx = stage === 'club' ? 0 : stage === 'terms' ? 1 : stage === 'done' ? 2 : neg?.fee ? 1 : 0;
  const head = stage === 'club' ? R2.clubHead : stage === 'terms' ? R2.termsHead : stage === 'done' ? R2.doneHead : R2.offHead;
  const usBids = neg ? neg.bids.filter((b) => b.by === 'us').length : 0;
  const usRounds = neg ? neg.rounds.filter((r) => r.by === 'us').length : 0;
  const line = stage === 'club' ? R2.withClub(cn(seller, lang), Math.min(CLUB_PATIENCE, usBids + 1), CLUB_PATIENCE)
    : R2.withAgent(ag.name[lang] || ag.name.en, R2.styles[ag.style], usRounds + 1, usRounds + Math.max(1, neg?.patience ?? PATIENCE[ag.style]));
  return (
    <div className="sc-talks">
      <header className="topbar on-ground">
        <div className="club"><button className="icon-btn" aria-label={R2.back} onClick={onBack}><I n="back" className="i--flip" /></button><div className="grow"><b>{R2.title(sn(p, lang))}</b><small>{sub}</small></div></div>
      </header>
      <section className="n-head on-ground">
        <Portrait p={p} club={seller ?? g.club} size={64} />
        <div><h1 className="h1">{head}</h1><div className="sub">{stage === 'club' || stage === 'terms' ? line : neg?.end ? Rs.ends[neg.end] : ''}</div></div>
      </section>
      <div className="stages on-ground" aria-label={R2.stages.join(' · ')}>
        {R2.stages.map((s, i) => <div key={s} className={i < idx || stage === 'done' ? 'done' : i === idx && stage !== 'collapsed' ? 'now' : ''}>{s}</div>)}
      </div>
      <div className="grid">
        <TableSoFar p={p} neg={neg} />
        {stage === 'club' && <ClubComposer p={p} neg={neg} />}
        {stage === 'terms' && <TermsComposer p={p} neg={neg} />}
        {(stage === 'done' || stage === 'collapsed') && neg && <Outcome p={p} neg={neg} />}
      </div>
    </div>
  );
}

// ---------- the table so far ----------

function TableSoFar({ p, neg }: { p: Player; neg?: Negotiation }) {
  const g = useGame();
  const { w, c, lang } = g;
  const R2 = R[g.ui].room;
  const ag = agentOf(c, p);
  const seller = clubOf(w, neg?.from ?? p.clubId);
  const d = demandOf(w, c, p, ag);
  const bubbles: { us: boolean; who: string; text: string; chips?: Terms }[] = [];
  let n = 0;
  for (const b of neg?.bids ?? []) {
    if (b.by === 'us' && b.offer) { n++; bubbles.push({ us: true, who: R2.you(n), text: R2.bidLine(money(nominal(b.offer)), b.offer.inst.filter((v) => v > 0).length + 1, Math.round(b.offer.sellOn * 100)) }); }
    else if (b.by === 'them') {
      const S = R2.clubSays;
      const text = b.answer === 'accept' ? S.accept : b.answer === 'counter' ? S.counter(money(b.fee ?? 0)) : b.answer === 'insult' ? S.insult : b.answer === 'rival' ? S.rival(cn(clubOf(w, neg?.rival?.club ?? ''), lang), money(b.fee ?? 0)) : S.reject;
      bubbles.push({ us: false, who: R2.board(cn(seller, lang)), text });
    }
  }
  const agentName = ag.name[lang] || ag.name.en;
  if (neg && (neg.stage === 'terms' || neg.rounds.length)) {
    if (!neg.rounds.length) bubbles.push({ us: false, who: agentName, text: R2.agentSays.open, chips: d });
    let k = 0;
    for (const r of neg.rounds) {
      if (r.by === 'us') { k++; bubbles.push({ us: true, who: R2.you(k), text: R2.ourLine, chips: r.terms }); }
      else bubbles.push({ us: false, who: agentName, text: R2.agentSays[r.reply ?? 'notThere'], chips: r.reply === 'walk' ? undefined : r.terms });
    }
  } else if (!neg && p.clubId === FREE_AGENT) bubbles.push({ us: false, who: agentName, text: R2.agentSays.open, chips: d });
  const club = neg?.stage === 'club' || (!neg && p.clubId !== FREE_AGENT);
  const left = club ? (neg?.clubPatience ?? CLUB_PATIENCE) : (neg?.patience ?? PATIENCE[ag.style]);
  const max = club ? CLUB_PATIENCE : PATIENCE[ag.style];
  return (
    <Panel i={1} label={R2.table} className="g-table">
      <div className="panel-h"><h2 className="h2">{R2.table}</h2></div>
      <div className="rounds">
        {!bubbles.length && <p className="muted small">{club ? R2.adv.clubLow : R2.agentFree}</p>}
        {bubbles.map((b, i) => (
          <div key={i} className={`rd ${b.us ? 'us' : 'them'}`}>
            <span className="who">{b.who}</span>
            <div className="bub">{b.text}{b.chips && <TermChips t={b.chips} />}</div>
          </div>
        ))}
      </div>
      {(neg?.stage === 'club' || neg?.stage === 'terms' || !neg) && (
        <div className="patience" role="img" aria-label={`${club ? R2.patienceClub : R2.patienceAgent} ${left}/${max}`}>
          <I n="clock" size="sm" /><span>{club ? R2.patienceClub : R2.patienceAgent}</span>
          <span className="dots">{Array.from({ length: max }, (_, i) => <i key={i} className={i < left ? '' : 'off'} />)}</span>
        </div>
      )}
    </Panel>
  );
}

function TermChips({ t }: { t: Terms }) {
  const g = useGame();
  const R2 = R[g.ui].room;
  return (
    <div className="terms">
      <span className="ltr">{R2.chip.wage(money(t.wage))}</span>
      <span>{R2.chip.years(t.years)}</span>
      <span>{R2.roles[t.role]}</span>
      {t.signOn > 0 && <span className="ltr">{R2.chip.signOn(money(t.signOn))}</span>}
      {t.release !== null ? <span className="ltr">{R2.chip.release(money(t.release))}</span> : null}
      {t.bonus > 0 && <span className="ltr">{R2.chip.bonus(money(t.bonus))}</span>}
    </div>
  );
}

function Director({ line }: { line: string }) {
  const g = useGame();
  const s = g.c.ops.staff.director;
  const b = biasOf(s);
  return (
    <div className="advice">
      <span className="staff" style={{ background: '#0B3B5C' }} aria-hidden="true">{s ? initialsOf(s.name.en) : 'DF'}</span>
      <div><div className="who">{s ? s.name[g.lang] : g.x.office.roles.director}, <span>{g.x.office.roles.director.toLowerCase()}{b ? ` · ${g.x.office.bias[b].toLowerCase()}` : ''}</span></div><q>{line}</q></div>
    </div>
  );
}

// A slider for money with the zone where it would likely work.
function MoneySlider({ label, value, min, max, step, zone, onChange }: { label: string; value: number; min: number; max: number; step: number; zone: [number, number] | null; onChange: (v: number) => void }) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, ((v - min) / Math.max(1, max - min)) * 100))}%`;
  return (
    <div className="mslider" style={{ ['--v' as string]: pct(value), ['--a' as string]: zone ? pct(zone[0]) : '0%', ['--b' as string]: zone ? pct(zone[1]) : '0%' }}>
      <span className="rail" />{zone && <span className="zone" />}<span className="fill" />
      <input type="range" min={min} max={max} step={step} value={Math.min(max, Math.max(min, value))} aria-label={label} aria-valuetext={money(value)} onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}

async function afterSend(g: Game, r: Awaited<ReturnType<Game['run']>>, pid: string) {
  if (!r.ok) return;
  const n = openNeg(rcOf(r.career), pid) ?? rcOf(r.career).negs.filter((x) => x.playerId === pid).slice(-1)[0];
  if (n) g.go({ s: 'transfers', tab: 2, neg: n.id });
}

// ---------- club stage ----------

function ClubComposer({ p, neg }: { p: Player; neg?: Negotiation }) {
  const g = useGame();
  const { w, c } = g;
  const Rs = R[g.ui];
  const R2 = Rs.room;
  const ask = askOf(w, c, p);
  const last = neg ? [...neg.bids].reverse().find((b) => b.by === 'us')?.offer : undefined;
  const [fee, setFee] = useState(() => roundFee(neg?.counter ?? (last ? nominal(last) * 1.08 : ask * 0.9)));
  const [n, setN] = useState(0);
  const [up, setUp] = useState(1);
  const [so, setSo] = useState(0);
  const offer: ClubOffer = { ...split(fee, n, n ? UP[up] : 1), sellOn: SELL_ONS[so] };
  const Rv = reservation(w, c, p);
  const E = bidValue(offer, p.marketValue);
  const verdict = E >= Rv ? 'accept' : E >= 0.75 * Rv ? 'counter' : E < 0.6 * Rv ? 'insult' : 'reject';
  const ag = agentOf(c, p);
  const aFee = agentFee(ag, fee, 0);
  const room = spendingRoom(w, c);
  const waiting = neg?.answerAt != null;
  const frozenOut = !!neg && neg.clubPatience <= 0;
  const send = async () => { const r = await g.run({ type: 'rc.bid', playerId: p.id, offer }); await afterSend(g, r, p.id); };
  const step = Math.max(1e4, roundFee(ask * 0.01));
  const lo = Math.max(step, roundFee(ask * 0.4)), hi = roundFee(ask * 1.6);
  const advice = waiting ? R2.adv.waiting : isDeadlineDay(c) ? R2.adv.deadline : verdict === 'accept' ? R2.adv.clubOk : R2.adv.clubLow;
  return (
    <>
      <Panel i={2} label={R2.yourBid(1)} className="g-comp">
        <div className="panel-h"><h2 className="h2">{R2.yourBid((neg ? neg.bids.filter((b) => b.by === 'us').length : 0) + 1)}</h2><span className="eyebrow ltr">{Rs.asking} {money(ask)}</span></div>
        <fieldset className="field2" disabled={waiting || frozenOut}>
          <div className="between"><b>{R2.fee}</b><span className="val ltr">{money(fee)}</span></div>
          <MoneySlider label={R2.fee} value={fee} min={lo} max={hi} step={step} zone={[Math.ceil(Rv), ask]} onChange={(v) => setFee(roundFee(v))} />
          <div className="sl-foot"><span className="ltr">{money(lo)}</span><span className="zl">{R2.feeZone}</span><span className="ltr">{money(hi)}</span></div>
        </fieldset>
        <fieldset className="field2" disabled={waiting || frozenOut}>
          <b>{R2.pay}</b>
          <div className="seg" role="group" aria-label={R2.pay}>{R2.payOpts.map((l, i) => <button key={l} aria-pressed={n === i} onClick={() => setN(i)}>{l}</button>)}</div>
          {n > 0 && <>
            <div className="between small"><span>{R2.upfront}</span><div className="seg mini" role="group" aria-label={R2.upfront}>{R2.upOpts.map((l, i) => <button key={l} aria-pressed={up === i} onClick={() => setUp(i)}>{l}</button>)}</div></div>
            <p className="small muted">{R2.instWhy(money(offer.inst[0] ?? 0))}</p>
          </>}
        </fieldset>
        <fieldset className="field2" disabled={waiting || frozenOut}>
          <b>{R2.sellOn}</b>
          <div className="seg" role="group" aria-label={R2.sellOn}>{R2.sellOpts.map((l, i) => <button key={l} aria-pressed={so === i} onClick={() => setSo(i)}>{l}</button>)}</div>
          <p className="small muted">{R2.sellOnWhy}</p>
        </fieldset>
      </Panel>
      <Panel i={3} className="g-v verdict" label={R2.verdict}>
        <span className="eyebrow">{R2.verdict}</span>
        <div className="gauge"><span className={`big v-${verdict}`}>{R2.clubV[verdict]}</span></div>
        <p className="small muted">{R2.clubWhy(money(Math.round(E)))}</p>
        <div className="well impact">
          <div><span>{R2.roomAfter}</span><b className={`ltr${room - fee - aFee < 0 ? ' bad' : ''}`}>{money(room - fee - aFee)}</b></div>
          <div><span>{R2.later}</span><b className="ltr">{money(fee - offer.upfront)}</b></div>
          <div><span>{R2.agentFee}</span><b className="ltr">{money(aFee)}</b></div>
        </div>
        <Director line={advice} />
        {neg?.rival && neg.answerAt != null && <button className="btn btn--accent btn--block" onClick={() => void g.run({ type: 'rc.topRival', negId: neg.id })}><I n="up" size="sm" />{R2.top(money(roundFee(neg.rival.fee * 1.05)))}</button>}
        {neg && neg.counter !== null && !waiting && <button className="btn btn--accent btn--block" onClick={async () => { const r = await g.run({ type: 'rc.payCounter', negId: neg.id }); await afterSend(g, r, p.id); }}><I n="check" size="sm" />{R2.payCounter(money(neg.counter))}</button>}
        <div className="send">
          {neg && <button className="btn btn--ghost" aria-label={R2.walk} onClick={() => void g.run({ type: 'rc.withdraw', negId: neg.id }, { toast: false })}><I n="x" size="sm" /></button>}
          <button className="btn btn--primary btn--block" disabled={waiting || frozenOut || !windowOf(c)} onClick={() => void send()}><I n="handshake" size="sm" />{waiting && neg?.answerAt != null ? R2.waiting(byDay(g.ui, neg.answerAt)) : R2.sendBid}</button>
        </div>
      </Panel>
    </>
  );
}

// ---------- personal terms ----------

function TermsComposer({ p, neg }: { p: Player; neg?: Negotiation }) {
  const g = useGame();
  const { w, c } = g;
  const Rs = R[g.ui];
  const R2 = Rs.room;
  const ag = agentOf(c, p);
  const d: Demand = useMemo(() => demandOf(w, c, p, ag), [w, c, p, ag]);
  const age = c.season - p.birthYear;
  const counter = neg ? lastCounter(neg) : null;
  const base = counter ?? d;
  const [wage, setWage] = useState(() => roundFee((counter ? counter.wage : d.wage * 0.8)));
  const [years, setYears] = useState(Math.min(maxYears(age), base.years));
  const [role, setRole] = useState<RoleTerm>(base.role === 'prospect' && age > 21 ? 'rotation' : base.role);
  const [signOn, setSignOn] = useState(base.signOn > 0);
  const [rel, setRel] = useState<number>(base.release !== null ? 1 : -1);
  const [bonus, setBonus] = useState(base.bonus > 0);
  const k = knowledge(w, c, p);
  const known = k >= REVEAL.priority;
  const t: Terms = { wage, years, role, signOn: signOn ? d.signOn : 0, release: rel < 0 ? null : roundFee(p.marketValue * REL[rel]), bonus: bonus ? roundFee(d.wage * 0.05) : 0 };
  const chance = signChance(t, d, ag, known, age);
  const green = greenFrom(t, d, ag, known, age);
  const room = spendingRoom(w, c, neg?.id), wr = wageRoom(w, c);
  const free0 = agentFee(ag, 0, t.wage) + t.signOn;
  const cost = neg ? dealCost(w, c, neg, t) : { total: free0, later: 0, agent: agentFee(ag, 0, t.wage), now: 0, upfront: 0, signOn: t.signOn, wage: t.wage, roomAfter: room - free0 };
  const step = Math.max(100, roundFee(d.wage * 0.01));
  const lo = roundFee(d.wage * 0.5), hi = roundFee(d.wage * 1.6);
  const usRounds = neg ? neg.rounds.filter((r) => r.by === 'us').length : 0;
  const ok = !!neg && (neg.from === FREE_AGENT || !!windowOf(c));
  const advice = chance >= 0.5 ? (wage > d.wage * 1.15 ? R2.adv.termsHigh(money(roundFee(d.wage * 1.1))) : R2.adv.termsOk) : R2.adv.termsLow;
  const age21 = age <= 21;
  const start = async () => { const r = await g.run({ type: 'rc.bid', playerId: p.id, offer: { upfront: 0, inst: [], sellOn: 0 } }); await afterSend(g, r, p.id); };
  if (!neg) {
    // A free agent: open the talks first (nothing to pay a club).
    return (
      <Panel i={2} className="g-comp" label={R2.termsHead}>
        <p className="small">{R2.agentFree}</p>
        <button className="btn btn--primary" onClick={() => void start()}><I n="chat" size="sm" />{Rs.offer}</button>
      </Panel>
    );
  }
  return (
    <>
      <Panel i={2} label={R2.yourOffer(usRounds + 1)} className="g-comp">
        <div className="panel-h"><h2 className="h2">{R2.yourOffer(usRounds + 1)}</h2><span className="eyebrow">{Rs.prioLabel}: <b>{known ? Rs.prio[ag.priority] : Rs.unknown}</b></span></div>
        <fieldset className="field2" disabled={!ok}>
          <div className="between"><b>{R2.wage}</b><span className="val ltr">{money(wage)}</span></div>
          <MoneySlider label={R2.wage} value={wage} min={lo} max={hi} step={step} zone={green !== null ? [green, hi] : null} onChange={(v) => setWage(roundFee(v))} />
          <div className="sl-foot"><span className="ltr">{money(lo)}</span><span className="zl">{R2.wageZone}</span><span className="ltr">{money(hi)}</span></div>
          <p className="small muted">{R2.his}: <span className="ltr">{money(d.wage)}</span></p>
        </fieldset>
        <fieldset className="field2" disabled={!ok}>
          <b>{R2.years}</b>
          <div className="seg" role="group" aria-label={R2.years}>{Array.from({ length: maxYears(age) }, (_, i) => i + 1).map((y) => <button key={y} aria-pressed={years === y} onClick={() => setYears(y)}>{R2.chip.years(y)}</button>)}</div>
        </fieldset>
        <fieldset className="field2" disabled={!ok}>
          <b>{R2.role}</b>
          <div className="seg" role="group" aria-label={R2.role}>{ROLES.filter((r) => r !== 'prospect' || age21).map((r) => <button key={r} aria-pressed={role === r} onClick={() => setRole(r)}>{R2.roles[r]}</button>)}</div>
          <p className="small muted">{R2.roleWhy}</p>
        </fieldset>
        <fieldset className="field2 clauses" disabled={!ok}>
          <div className="between"><b>{R2.clauses}</b><span className="eyebrow">{R2.clausesSub}</span></div>
          <div className="clause"><b>{R2.signOn}</b><button className="sw" role="switch" aria-checked={signOn} aria-label={R2.signOn} onClick={() => setSignOn(!signOn)} /><p>{R2.signOnWhy(money(d.signOn))}</p></div>
          <div className="clause"><b>{R2.release}</b><button className="sw" role="switch" aria-checked={rel >= 0} aria-label={R2.release} onClick={() => setRel(rel >= 0 ? -1 : 1)} />
            <p>{rel >= 0 ? R2.releaseWhy(money(t.release ?? 0)) : R2.releaseOff}</p>
            {rel >= 0 && <div className="seg mini" role="group" aria-label={R2.release}>{REL.map((m, i) => <button key={m} aria-pressed={rel === i} onClick={() => setRel(i)}><span className="ltr">{money(roundFee(p.marketValue * m))}</span></button>)}</div>}
          </div>
          <div className="clause"><b>{R2.bonus}</b><button className="sw" role="switch" aria-checked={bonus} aria-label={R2.bonus} onClick={() => setBonus(!bonus)} /><p>{R2.bonusWhy(money(roundFee(d.wage * 0.05)))}</p></div>
        </fieldset>
      </Panel>
      <Panel i={3} className="g-v verdict" label={R2.verdict}>
        <span className="eyebrow">{R2.verdict}</span>
        <div className="gauge"><span className={`big ltr${chance < 0.5 ? ' low' : ''}`}>{Math.round(chance * 100)}%</span><div><b className="gl">{R2.chance(chance)}</b><p className="small muted">{R2.chanceWhy(known)}</p></div></div>
        <div className="well impact">
          <div><span>{R2.bill}</span><b className="ltr">+{money(wage * 12)}{R2.perYear}</b></div>
          <div><span>{R2.wageRoomAfter}</span><b className={`ltr${wr - wage < 0 ? ' bad' : ''}`}>{money(wr - wage)}</b></div>
          <div><span>{R2.roomAfter}</span><b className={`ltr${cost.roomAfter < 0 ? ' bad' : ''}`}>{money(cost.roomAfter)}</b></div>
          {cost.later > 0 && <div><span>{R2.later}</span><b className="ltr">{money(cost.later)}</b></div>}
          <div><span>{R2.agentFee}</span><b className="ltr">{money(cost.agent)}</b></div>
        </div>
        <Director line={advice} />
        <div className="two">
          <button className="btn btn--ghost btn--sm" disabled={!ok} onClick={() => void g.run({ type: 'rc.meet', negId: neg.id, which: 'demand' })}>{R2.meet}</button>
          {counter && <button className="btn btn--ghost btn--sm" disabled={!ok} onClick={() => void g.run({ type: 'rc.meet', negId: neg.id, which: 'counter' })}>{R2.takeCounter}</button>}
        </div>
        <div className="send">
          <button className="btn btn--ghost" aria-label={R2.walk} onClick={() => void g.run({ type: 'rc.withdraw', negId: neg.id }, { toast: false })}><I n="x" size="sm" /></button>
          <button className="btn btn--primary btn--block" disabled={!ok} onClick={() => void g.run({ type: 'rc.terms', negId: neg.id, terms: t })}><I n="handshake" size="sm" />{R2.send(usRounds + 1)}</button>
        </div>
      </Panel>
    </>
  );
}

function Outcome({ p, neg }: { p: Player; neg: Negotiation }) {
  const g = useGame();
  const { w, c, lang } = g;
  const Rs = R[g.ui];
  const R2 = Rs.room;
  const frozen = (rcOf(c).frozen[p.id] ?? 0) - (c.season * 100 + c.round);
  const e = estimate(w, c, p);
  return (
    <Panel i={2} className="g-comp outcome" label={Rs.ends[neg.end ?? 'gone']}>
      <span className="eyebrow">{Rs.ends[neg.end ?? 'gone']}</span>
      <h2 className="h1">{neg.stage === 'done' ? R2.signed(nm(p, lang)) : Rs.ends[neg.end ?? 'gone']}</h2>
      {neg.end === 'hijacked' && neg.rival && <p className="small"><Crest club={clubOf(w, neg.rival.club)} size={16} /> {cn(clubOf(w, neg.rival.club), lang)} · <span className="ltr">{money(neg.rival.fee)}</span></p>}
      {frozen > 0 && <p className="small">{R2.frozenFor(frozen)}</p>}
      {neg.stage === 'done' && <p className="small muted"><span className="ltr">{e.lo === e.hi ? e.lo : `${e.lo}–${e.hi}`}</span> · {g.x.common.pos[p.position]}</p>}
      <div className="two">
        <button className="btn btn--ghost btn--sm" onClick={() => g.player(p.id)}><I n="eye" size="sm" />{Rs.report}</button>
        <button className="btn btn--ghost btn--sm" onClick={() => g.go({ s: 'transfers', tab: 2 })}>{R2.back}</button>
      </div>
    </Panel>
  );
}

// ---------- loans ----------

export function LoanSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const g = useGame();
  const { w, c, lang } = g;
  const Rs = R[g.ui];
  const L = Rs.loans;
  const p = playerOf(w, id);
  const [share, setShare] = useState(0);
  const [mins, setMins] = useState<MinutesClause>('rotation');
  const [no, setNo] = useState<string | null>(null);
  if (!p) return null;
  const needsBy = loanNeeds(w, c, p);
  const need = needsBy[mins];
  const s = SHARES[share];
  const send = async () => {
    const r = await g.run({ type: 'rc.loan', playerId: p.id, share: s, minutes: mins }, { toast: false });
    if (r.ok) { g.toast(g.x.note.loanedIn(nm(p, lang))); onClose(); } else setNo(g.x.bid.no[r.reason] ?? rcReason(g.ui, r.reason) ?? r.reason);
  };
  return (
    <Sheet label={L.ask(nm(p, lang))} onClose={onClose}>
      <div className="sheet-head"><Portrait p={p} club={clubOf(w, p.clubId)} size={56} /><div className="grow"><h2 className="h2">{L.ask(sn(p, lang))}</h2><span className="small muted">{cn(clubOf(w, p.clubId), lang)} · {L.fee(money(loanFee(p)))}</span></div></div>
      <div className="terms-form">
        <b>{L.shareQ}</b>
        <div className="seg" role="group" aria-label={L.shareQ}>{SHARES.map((v, i) => <button key={v} aria-pressed={share === i} onClick={() => { setShare(i); setNo(null); }}>{Math.round(v * 100)}%</button>)}</div>
        <p className="small muted ltr">{money(Math.round(p.wage * s))}{g.x.common.perMonth}</p>
        <b>{L.minutesQ}</b>
        <div className="seg" role="group" aria-label={L.minutesQ}>{(['none', 'rotation', 'starter'] as MinutesClause[]).map((m) => <button key={m} aria-pressed={mins === m} onClick={() => { setMins(m); setNo(null); }}>{L.minutes[m]}</button>)}</div>
        <p className={`small${need === null || s < need ? ' warnline' : ''}`}>{need === null ? L.noWay : L.needs(`${Math.round(need * 100)}%`)}</p>
        {no && <div className="refusal" role="alert"><I n="alert" size="sm" /><span className="grow">{no}</span></div>}
      </div>
      <div className="sheet-actions">
        <button className="btn btn--ghost" onClick={onClose}>{g.x.common.cancel}</button>
        <button className="btn btn--accent" onClick={() => void send()}><I n="handshake" size="sm" />{L.send}</button>
      </div>
    </Sheet>
  );
}

export function LoanOutSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const g = useGame();
  const { w, c, lang } = g;
  const L = R[g.ui].loans;
  const p = playerOf(w, id);
  const [share, setShare] = useState(0);
  const [mins, setMins] = useState<MinutesClause>('rotation');
  const [no, setNo] = useState<string | null>(null);
  const clubs = useMemo(() => (p ? loanClubs(w, c, p) : []), [w, c, p]);
  if (!p) return null;
  const s = SHARES[share];
  const send = async (to: string) => {
    const r = await g.run({ type: 'rc.loanOut', playerId: p.id, to, share: s, minutes: mins }, { toast: false });
    if (r.ok) { g.toast(g.x.note.loanedOut(nm(p, lang))); onClose(); } else setNo(g.x.bid.no[r.reason] ?? rcReason(g.ui, r.reason) ?? r.reason);
  };
  return (
    <Sheet label={L.outTitle(nm(p, lang))} onClose={onClose}>
      <h2 className="h2">{L.outTitle(sn(p, lang))}</h2>
      <div className="terms-form">
        <b>{L.theyPay}</b>
        <div className="seg" role="group" aria-label={L.theyPay}>{SHARES.map((v, i) => <button key={v} aria-pressed={share === i} onClick={() => { setShare(i); setNo(null); }}>{Math.round(v * 100)}%</button>)}</div>
        <b>{L.minutesQ}</b>
        <div className="seg" role="group" aria-label={L.minutesQ}>{(['none', 'rotation', 'starter'] as MinutesClause[]).map((m) => <button key={m} aria-pressed={mins === m} onClick={() => { setMins(m); setNo(null); }}>{L.minutes[m]}</button>)}</div>
        <b>{L.where}</b>
        <div className="rows">
          {clubs.map((cid) => {
            const cl = clubOf(w, cid);
            const takes = borrowerTakes(w, p, cid, s, mins);
            return (
              <button key={cid} className="row linkrow" disabled={!takes} onClick={() => void send(cid)}>
                <Crest club={cl} size={28} /><span className="grow"><span className="name">{cn(cl, lang)}</span><span className={`sub${takes ? '' : ' warnline'}`}>{takes ? L.takes : L.wontTake} · {squadOf(w, cid).length}</span></span><I n="chev" size="sm" />
              </button>
            );
          })}
          {!clubs.length && <p className="muted">{g.x.bid.no.club}</p>}
        </div>
        {no && <div className="refusal" role="alert"><I n="alert" size="sm" /><span className="grow">{no}</span></div>}
      </div>
    </Sheet>
  );
}
