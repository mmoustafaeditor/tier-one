// Recruitment commands (V2_DESIGN §3.4, §7.2). Validated here, inside the simulation; the screens only build them.
// A transfer is a state machine: club stage (bid → answer next matchday, or at once on deadline day; counter; rival
// hijack) → personal terms (live rounds with the agent, patience) → done, or collapsed (walk-away, freeze, window,
// hijack, withdrawn). Completion is ONE atomic step: roster, fee now, instalments committed, agent fee, signing-on fee,
// clauses, the deal record, news and the thread all change together or nothing changes.
import { FREE_AGENT, type Career, type Deal, type Loan, type Player, type Position } from '../../model/types';
import { freeShirt, playerOf, squadOf, strengthOf, type World } from '../world';
import { SQUAD_MAX, SQUAD_SELL_MIN, dropFromXI } from '../transfers';
import { canLoanIn, canLoanOut, loanFee, loanOf, moveOnLoan } from '../loans';
import { isDeadlineDay, windowLeft, windowOf } from '../windows';
import { addNews, hijacked } from '../news';
import { addMsg } from '../coach';
import { recordDeal } from '../records';
import { roundFee } from '../season';
import { spendingRoom, wageRoom } from './money';
import { agentFee, agentOf, demandOf, maxYears, PATIENCE, replyTo, counterTo, utility, type Demand } from './agent';
import { answerBid, askOf, bidValue, CLUB_PATIENCE, FREEZE, nominal, offerShapeOk, reservation } from './club';
import { assignSlots } from './knowledge';
import {
  negById, nextId, openNeg, putNeg, rcOf, step, tickOf, withRC,
  type ClubOffer, type MinutesClause, type Negotiation, type RecruitState, type ScopeKind, type Terms,
} from './state';

export type RcCommand =
  | { type: 'rc.assign'; scope: ScopeKind; key: string; pos: Position | null }
  | { type: 'rc.unassign'; id: string }
  | { type: 'rc.need'; pos: Position; on: boolean }
  | { type: 'rc.bid'; playerId: string; offer: ClubOffer }
  | { type: 'rc.payCounter'; negId: string }
  | { type: 'rc.topRival'; negId: string }
  | { type: 'rc.terms'; negId: string; terms: Terms }
  | { type: 'rc.meet'; negId: string; which: 'demand' | 'counter' }
  | { type: 'rc.withdraw'; negId: string }
  | { type: 'rc.loan'; playerId: string; share: number; minutes: MinutesClause }
  | { type: 'rc.loanOut'; playerId: string; to: string; share: number; minutes: MinutesClause }
  | { type: 'rc.recall'; playerId: string };

type Ok = { world: World; career: Career; note?: { key: string; n?: number; s?: string } };
type No = { ok: false; reason: string; counter?: number };
const no = (reason: string, counter?: number): No => ({ ok: false, reason, counter });

export const SHARES = [1, 0.75, 0.5, 0.25] as const;
const POS: Position[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

// The matchday talks must be settled by: two matchdays, never past the window's deadline day (the day itself on it).
export function dueFor(c: Career, free: boolean): number {
  const now = tickOf(c);
  if (free && !windowOf(c)) return now + 2;
  if (!windowOf(c)) return now;
  if (isDeadlineDay(c)) return now;
  return Math.min(now + 2, now + windowLeft(c) - 1);
}

// ---------- the club stage ----------

function bidChecks(w: World, c: Career, p: Player, rc: RecruitState): No | null {
  const now = tickOf(c);
  if (p.clubId === c.clubId) return no('ambition');
  if ((rc.frozen[p.id] ?? 0) > now) return no('frozen', rc.frozen[p.id] - now);
  if (loanOf(c, p.id)) return no('loaned');
  if (p.clubId !== FREE_AGENT && !windowOf(c)) return no('window');
  if (squadOf(w, c.clubId).length >= SQUAD_MAX) return no('squadFull');
  if (p.clubId !== FREE_AGENT && squadOf(w, p.clubId).length <= SQUAD_SELL_MIN) return no('sellerThin');
  if (p.rating > strengthOf(w, c.clubId) + 9) return no('ambition');
  return null;
}

// Answer the bid on the table now (next matchday, or at once on deadline day). A rival bid that beats ours wins him.
export function answerNow(w: World, c: Career, neg: Negotiation): Ok {
  const p = playerOf(w, neg.playerId);
  let rc = rcOf(c);
  if (!p || p.clubId !== neg.from) return close(w, c, neg, 'gone');
  const last = [...neg.bids].reverse().find((b) => b.by === 'us')!;
  const R = reservation(w, c, p);
  const E = bidValue(last.offer!, p.marketValue);
  const now = tickOf(c);
  if (neg.rival && neg.rival.fee >= R && neg.rival.fee > E) return hijack(w, c, neg, neg.rival.club, neg.rival.fee);
  const round = neg.bids.filter((b) => b.by === 'us').length;
  const a = answerBid(R, askOf(w, c, p), E, round);
  let n: Negotiation = { ...neg, answerAt: null, rival: null, seen: (neg.seen ?? 0) + 1 };
  let career = c;
  if (a.k === 'accept') {
    const ag = agentOf(c, p);
    n = { ...n, stage: 'terms', fee: last.offer!, counter: null, bids: [...n.bids, { by: 'them', t: now, answer: 'accept', fee: nominal(last.offer!) }], patience: PATIENCE[ag.style], due: dueFor(c, false), rounds: [] };
    rc = step(rc, c, { pid: p.id, pn: p.name, kind: 'chase', club: neg.from }, 'agreed', { n: nominal(last.offer!) });
    career = addNews(career, 'transfers', 'rc.agreed', { player: p.id, pn: p.name, club: c.clubId, club2: neg.from, n: nominal(last.offer!) });
  } else {
    const cost = a.k === 'reject' && a.insult ? 2 : 1;
    const left = n.clubPatience - cost;
    const ans = a.k === 'counter' ? 'counter' : a.k === 'reject' && a.insult ? 'insult' : 'reject';
    n = { ...n, clubPatience: left, counter: a.k === 'counter' ? a.fee : n.counter, bids: [...n.bids, { by: 'them', t: now, answer: ans, fee: a.k === 'counter' ? a.fee : undefined }] };
    rc = step(rc, c, { pid: p.id, pn: p.name, kind: 'chase', club: neg.from }, ans, { n: a.k === 'counter' ? a.fee : nominal(last.offer!) });
    if (left <= 0) {
      rc = { ...rc, frozen: { ...rc.frozen, [p.id]: now + FREEZE } };
      n = { ...n, stage: 'collapsed', end: 'frozen', endT: now };
      rc = step(rc, c, { pid: p.id, pn: p.name, kind: 'chase', club: neg.from }, 'frozen', {}, true);
    }
  }
  career = addMsg(withRC(career, putNeg(rc, n)), 'offer', 'rc.answer', { player: p.id, pn: p.name, club: neg.from, s: n.stage === 'terms' ? 'accept' : n.bids[n.bids.length - 1].answer, n: n.stage === 'terms' ? nominal(last.offer!) : n.counter ?? nominal(last.offer!) });
  return { world: w, career };
}

// A rival club takes the player from under us.
export function hijack(w: World, c: Career, neg: Negotiation, club: string, fee: number): Ok {
  const p = playerOf(w, neg.playerId)!;
  const now = tickOf(c);
  const buyer = w.clubs.find((x) => x.id === club);
  let world = w;
  if (buyer && p.clubId !== c.clubId) {
    const shirt = freeShirt(w, club, p.position);
    world = {
      ...w,
      clubs: w.clubs.map((x) => (x.id === club ? { ...x, budget: x.budget - fee } : x.id === p.clubId ? { ...x, budget: x.budget + fee } : x)),
      players: w.players.map((x) => (x.id === p.id ? { ...x, clubId: club, shirtNumber: shirt, contractUntil: c.season + 4, listed: undefined } : x)),
    };
  }
  let rc = rcOf(c);
  rc = putNeg(rc, { ...neg, stage: 'collapsed', end: 'hijacked', endT: now, answerAt: null, seen: (neg.seen ?? 0) + 1, rival: { club, fee } });
  rc = step(rc, c, { pid: p.id, pn: p.name, kind: 'chase', club: neg.from }, 'hijacked', { club, n: fee }, true);
  let career = withRC(c, rc);
  career = { ...career, shortlist: (career.shortlist ?? []).filter((x) => x !== p.id) };
  career = addNews(career, 'transfers', 'rc.hijack', { player: p.id, pn: p.name, club, club2: neg.from, n: fee });
  career = addMsg(career, 'offer', 'rc.hijack', { player: p.id, pn: p.name, club, n: fee });
  return { world, career };
}

function close(w: World, c: Career, neg: Negotiation, end: Negotiation['end'], freeze = false): Ok {
  const now = tickOf(c);
  let rc = rcOf(c);
  rc = putNeg(rc, { ...neg, stage: 'collapsed', end, endT: now, answerAt: null, seen: (neg.seen ?? 0) + 1 });
  if (freeze) rc = { ...rc, frozen: { ...rc.frozen, [neg.playerId]: now + FREEZE }, interest: { ...rc.interest, [neg.playerId]: (rc.interest[neg.playerId] ?? 0) - 10 } };
  rc = step(rc, c, { pid: neg.playerId, pn: neg.pn, kind: 'chase', club: neg.from }, end ?? 'gone', {}, true);
  let career = withRC(c, rc);
  if (end === 'walked') career = addNews(career, 'transfers', 'rc.walk', { player: neg.playerId, pn: neg.pn, club: c.clubId, club2: neg.from });
  return { world: w, career };
}

function placeBid(w: World, c: Career, p: Player, offer: ClubOffer): Ok | No {
  let rc = rcOf(c);
  const chk = bidChecks(w, c, p, rc);
  if (chk) return chk;
  if (!offerShapeOk(offer)) return no('terms');
  const ag = agentOf(c, p);
  const total = nominal(offer);
  const fee = agentFee(ag, total, 0);
  if (total + fee > spendingRoom(w, c)) return no('budget');
  const now = tickOf(c);
  let neg = openNeg(rc, p.id);
  if (neg && neg.stage === 'terms') return no('agreed');
  if (neg && neg.answerAt !== null) return no('waiting');
  const first = !neg;
  if (!neg) {
    let id: string;
    [id, rc] = nextId(rc, c, 'n');
    neg = { id, playerId: p.id, pn: p.name, from: p.clubId, stage: 'club', opened: now, bids: [], clubPatience: CLUB_PATIENCE, answerAt: null, counter: null, rival: null, fee: null, rounds: [], patience: PATIENCE[ag.style], due: null };
  }
  neg = { ...neg, bids: [...neg.bids, { by: 'us', t: now, offer }], answerAt: now + 1 };
  rc = step(rc, c, { pid: p.id, pn: p.name, kind: 'chase', club: p.clubId }, 'bid', { n: total });
  let career = withRC(c, putNeg(rc, neg));
  if (first) career = addNews(career, 'transfers', 'rc.bid', { player: p.id, pn: p.name, club: c.clubId, club2: p.clubId, n: total });
  // Deadline day: the phones ring at once.
  if (isDeadlineDay(c)) return answerNow(w, career, negById(rcOf(career), neg.id)!);
  return { world: w, career, note: { key: 'rc.bidSent', s: p.id } };
}

// ---------- personal terms ----------

function termsChecks(c: Career, p: Player, t: Terms): No | null {
  const age = c.season - p.birthYear;
  if (!(t.years >= 1 && t.years <= maxYears(age))) return no('years', maxYears(age));
  if (!(t.wage > 0) || !(t.signOn >= 0) || !(t.bonus >= 0)) return no('terms');
  if (t.release !== null && !(t.release >= p.marketValue)) return no('release');
  if (t.role === 'prospect' && age > 21) return no('role');
  return null;
}

// Money the deal needs today, and the wage it adds.
export function dealCost(w: World, c: Career, neg: Negotiation, t: Terms) {
  const p = playerOf(w, neg.playerId)!;
  const ag = agentOf(c, p);
  const fee = neg.fee ? nominal(neg.fee) : 0;
  const upfront = neg.fee ? neg.fee.upfront : 0;
  const later = fee - upfront;
  const agent = agentFee(ag, fee, t.wage);
  return { upfront, later, agent, signOn: t.signOn, now: upfront + agent + t.signOn, total: fee + agent + t.signOn, wage: t.wage };
}

// The one atomic step that signs him.
export function complete(w: World, c: Career, neg: Negotiation, t: Terms): Ok | No {
  const p = playerOf(w, neg.playerId);
  if (!p || p.clubId !== neg.from) return no('gone');
  const chk = termsChecks(c, p, t);
  if (chk) return chk;
  if (squadOf(w, c.clubId).length >= SQUAD_MAX) return no('squadFull');
  if (p.clubId !== FREE_AGENT && squadOf(w, p.clubId).length <= SQUAD_SELL_MIN) return no('sellerThin');
  const cost = dealCost(w, c, neg, t);
  // The whole deal — now and later — has to fit the spending room, and the wage the wage room.
  if (cost.total > spendingRoom(w, c)) return no('budget');
  if (t.wage > wageRoom(w, c)) return no('wageCap');
  const now = tickOf(c);
  const to = c.clubId, from = p.clubId;
  const shirt = freeShirt(w, to, p.position);
  const world: World = {
    ...w,
    clubs: w.clubs.map((x) => (x.id === to ? { ...x, budget: x.budget - cost.now } : x.id === from ? { ...x, budget: x.budget + cost.upfront } : x)),
    players: w.players.map((x) => (x.id === p.id ? { ...x, clubId: to, wage: t.wage, contractUntil: c.season + t.years, shirtNumber: shirt, listed: undefined, morale: Math.min(100, x.morale + 10) } : x)),
  };
  let rc = rcOf(c);
  const fee = neg.fee ? nominal(neg.fee) : 0;
  const commits = (neg.fee?.inst ?? []).map((amount, i) => ({ id: `ci${c.season}.${rc.seq}.${i}`, playerId: p.id, pn: p.name, to: from, amount, season: c.season + 1 + i })).filter((x) => x.amount > 0);
  rc = {
    ...rc, seq: rc.seq + 1, commits: [...rc.commits, ...commits],
    clauses: { ...rc.clauses, [p.id]: { role: t.role, release: t.release, bonus: t.bonus || undefined, sellOn: neg.fee && neg.fee.sellOn ? { pct: neg.fee.sellOn, club: from } : undefined, signed: now, fee, sched: neg.fee ? [neg.fee.upfront, ...neg.fee.inst] : [] } },
    frozen: Object.fromEntries(Object.entries(rc.frozen).filter(([id]) => id !== p.id)),
  };
  rc = putNeg(rc, { ...neg, stage: 'done', end: 'signed', endT: now, due: null, answerAt: null, rounds: [...neg.rounds, { by: 'us', t: now, terms: t, reply: 'accept', u: 1 }] });
  rc = step(rc, c, { pid: p.id, pn: p.name, kind: 'chase', club: from }, 'signed', { n: fee }, true);
  const kind: Deal['kind'] = from === FREE_AGENT ? 'free' : 'in';
  const deal: Deal = { season: c.season, playerId: p.id, name: p.name, from, to, fee, kind };
  const ledger = { ...c.ops.ledger };
  if (cost.upfront) ledger.transfersIn = (ledger.transfersIn ?? 0) - cost.upfront;
  if (cost.agent) ledger.agentFees = (ledger.agentFees ?? 0) - cost.agent;
  if (cost.signOn) ledger.signOn = (ledger.signOn ?? 0) - cost.signOn;
  let career: Career = withRC({ ...c, deals: [deal, ...c.deals], ops: { ...c.ops, ledger }, shortlist: (c.shortlist ?? []).filter((x) => x !== p.id) }, rc);
  career = recordDeal(hijacked(career, p.id), deal);
  career = addNews(career, 'transfers', 'rc.done', { player: p.id, pn: p.name, club: to, club2: from, n: fee });
  return { world, career, note: { key: 'signed', s: p.id } };
}

function talk(w: World, c: Career, neg: Negotiation, t: Terms): Ok | No {
  const p = playerOf(w, neg.playerId);
  if (!p || p.clubId !== neg.from) return no('gone');
  const chk = termsChecks(c, p, t);
  if (chk) return chk;
  // You can't bluff: terms you couldn't pay are refused before the agent hears them.
  const cost = dealCost(w, c, neg, t);
  if (cost.total > spendingRoom(w, c)) return no('budget');
  if (t.wage > wageRoom(w, c)) return no('wageCap');
  const ag = agentOf(c, p);
  const d = demandOf(w, c, p, ag);
  const u = utility(t, d, ag.priority);
  const prev = [...neg.rounds].reverse().find((r) => r.by === 'us')?.u ?? null;
  const r = replyTo(u, ag.style, prev);
  if (r.reply === 'accept') return complete(w, c, neg, t);
  const now = tickOf(c);
  const patience = neg.patience - r.cost;
  let n: Negotiation = { ...neg, patience, rounds: [...neg.rounds, { by: 'us', t: now, terms: t, reply: r.reply, u }] };
  if (patience <= 0) {
    n = { ...n, rounds: [...n.rounds, { by: 'them', t: now, terms: d, reply: 'walk' }] };
    return walk(w, withRC(c, putNeg(rcOf(c), n)), n);
  }
  n = { ...n, rounds: [...n.rounds, { by: 'them', t: now, terms: counterTo(t, d, ag), reply: r.reply }] };
  return { world: w, career: withRC(c, putNeg(rcOf(c), n)), note: { key: `rc.reply.${r.reply}` } };
}

// The agent walks: talks freeze 5 matchdays, his interest in us drops 10, and a rival with a bid in can move.
export function walk(w: World, c: Career, neg: Negotiation): Ok {
  const r = close(w, c, neg, 'walked', true);
  return { ...r, note: { key: 'rc.reply.walk' } };
}

export const lastCounter = (neg: Negotiation): Terms | null => [...neg.rounds].reverse().find((r) => r.by === 'them' && r.reply !== 'walk')?.terms ?? null;
export const demandFor = (w: World, c: Career, neg: Negotiation): Demand | null => { const p = playerOf(w, neg.playerId); return p ? demandOf(w, c, p) : null; };

// ---------- loans ----------

function loanInOk(w: World, c: Career, p: Player, share: number, minutes: MinutesClause): No | null {
  if (!(SHARES as readonly number[]).includes(share) || !['starter', 'rotation', 'none'].includes(minutes)) return no('terms');
  const rc = rcOf(c);
  if ((rc.parentTrust[p.clubId] ?? 60) < 40) return no('trust');
  const chk = canLoanIn(w, c, p, share);
  if (!chk.ok) return no(chk.reason);
  // The parent club: a young player needs minutes, a squad player needs his wages covered.
  const age = c.season - p.birthYear;
  const rank = squadOf(w, p.clubId).sort((a, b) => b.rating - a.rating).findIndex((x) => x.id === p.id);
  const mins = (minutes === 'starter' ? 0.3 : minutes === 'rotation' ? 0.15 : 0) * (age <= 21 ? 2 : 1);
  const need = rank < 16 ? 0.9 : 0.6;
  if (share + mins < need - 1e-9) return no('loanTerms');
  return null;
}

// What the parent club would need to lend him: the lowest share that works with each minutes clause.
export function loanNeeds(w: World, c: Career, p: Player): Record<MinutesClause, number | null> {
  const out = {} as Record<MinutesClause, number | null>;
  for (const m of ['none', 'rotation', 'starter'] as MinutesClause[]) out[m] = [...SHARES].reverse().find((s) => !loanInOk(w, c, p, s, m)) ?? null;
  return out;
}

function borrowerOk(w: World, p: Player, to: string, share: number, minutes: MinutesClause): No | null {
  if (!(SHARES as readonly number[]).includes(share) || !['starter', 'rotation', 'none'].includes(minutes)) return no('terms');
  const ratings = squadOf(w, to).map((x) => x.rating).sort((a, b) => b - a);
  const r11 = ratings[10] ?? 0, r16 = ratings[15] ?? 0;
  if (minutes === 'starter' && p.rating < r11 - 1) return no('minutes');
  if (minutes === 'rotation' && p.rating < r16 - 1) return no('minutes');
  const limit = p.rating >= r11 ? 1.25 : p.rating >= r16 ? 1 : 0.75;
  const burden = share + (minutes === 'starter' ? 0.25 : minutes === 'rotation' ? 0.1 : 0);
  if (burden > limit + 1e-9) return no('loanTerms');
  const club = w.clubs.find((x) => x.id === to);
  if (!club || club.budget < p.wage * share * 10) return no('buyerBudget');
  return null;
}
export const borrowerTakes = (w: World, p: Player, to: string, share: number, minutes: MinutesClause) => !borrowerOk(w, p, to, share, minutes);

// ---------- the dispatcher ----------

export function runRecruit(w: World, c: Career, cmd: RcCommand): Ok | No {
  const rc = rcOf(c);
  const now = tickOf(c);
  switch (cmd.type) {
    case 'rc.assign': {
      if (!['league', 'country', 'world'].includes(cmd.scope)) return no('scope');
      if (cmd.scope === 'world' && !cmd.pos) return no('scope');
      if (cmd.pos && !POS.includes(cmd.pos)) return no('scope');
      if (cmd.scope === 'league' && !w.leagues.some((l) => l.id === cmd.key)) return no('scope');
      if (cmd.scope === 'country' && !w.leagues.some((l) => l.country === cmd.key)) return no('scope');
      if (rc.assign.length >= assignSlots(c)) return no('slots');
      if (rc.assign.some((a) => a.scope === cmd.scope && a.key === cmd.key && a.pos === cmd.pos)) return no('done');
      const [id, r2] = nextId(rc, c, 'a');
      return { world: w, career: withRC(c, { ...r2, assign: [...r2.assign, { id, scope: cmd.scope, key: cmd.scope === 'world' ? '' : cmd.key, pos: cmd.pos, since: now }] }), note: { key: 'rc.assigned' } };
    }
    case 'rc.unassign':
      if (!rc.assign.some((a) => a.id === cmd.id)) return no('gone');
      return { world: w, career: withRC(c, { ...rc, assign: rc.assign.filter((a) => a.id !== cmd.id) }) };
    case 'rc.need':
      if (!POS.includes(cmd.pos)) return no('scope');
      return { world: w, career: withRC(c, { ...rc, pinned: cmd.on ? [...new Set([...rc.pinned, cmd.pos])] : rc.pinned.filter((x) => x !== cmd.pos) }) };
    case 'rc.bid': {
      const p = playerOf(w, cmd.playerId);
      if (!p) return no('gone');
      if (p.clubId === FREE_AGENT) {
        // No club to deal with: straight to his agent.
        const chk = bidChecks(w, c, p, rc);
        if (chk) return chk;
        if (openNeg(rc, p.id)) return no('agreed');
        const ag = agentOf(c, p);
        let [id, r2] = nextId(rc, c, 'n');
        const neg: Negotiation = { id, playerId: p.id, pn: p.name, from: FREE_AGENT, stage: 'terms', opened: now, bids: [], clubPatience: CLUB_PATIENCE, answerAt: null, counter: null, rival: null, fee: null, rounds: [], patience: PATIENCE[ag.style], due: dueFor(c, true), seen: 0 };
        r2 = step(r2, c, { pid: p.id, pn: p.name, kind: 'chase', club: FREE_AGENT }, 'talks');
        return { world: w, career: withRC(c, putNeg(r2, neg)), note: { key: 'rc.talks', s: p.id } };
      }
      return placeBid(w, c, p, cmd.offer);
    }
    case 'rc.payCounter': {
      const neg = negById(rc, cmd.negId);
      if (!neg || neg.stage !== 'club' || neg.counter === null || neg.answerAt !== null) return no('gone');
      const p = playerOf(w, neg.playerId);
      if (!p) return no('gone');
      const chk = bidChecks(w, c, p, rc);
      if (chk) return chk;
      const offer: ClubOffer = { upfront: neg.counter, inst: [], sellOn: 0 };
      if (neg.counter + agentFee(agentOf(c, p), neg.counter, 0) > spendingRoom(w, c)) return no('budget');
      // Their own price: agreed on the spot.
      const ag = agentOf(c, p);
      let r2 = step(rc, c, { pid: p.id, pn: p.name, kind: 'chase', club: neg.from }, 'agreed', { n: neg.counter });
      r2 = putNeg(r2, { ...neg, stage: 'terms', fee: offer, bids: [...neg.bids, { by: 'us', t: now, offer }, { by: 'them', t: now, answer: 'accept', fee: neg.counter }], counter: null, patience: PATIENCE[ag.style], due: dueFor(c, false), rounds: [] });
      return { world: w, career: addNews(withRC(c, r2), 'transfers', 'rc.agreed', { player: p.id, pn: p.name, club: c.clubId, club2: neg.from, n: neg.counter }), note: { key: 'rc.agreed', s: p.id } };
    }
    case 'rc.topRival': {
      const neg = negById(rc, cmd.negId);
      if (!neg || neg.stage !== 'club' || !neg.rival || neg.answerAt === null) return no('gone');
      const p = playerOf(w, neg.playerId);
      if (!p) return no('gone');
      const fee = roundFee(neg.rival.fee * 1.05);
      if (fee + agentFee(agentOf(c, p), fee, 0) > spendingRoom(w, c)) return no('budget');
      const n: Negotiation = { ...neg, bids: [...neg.bids, { by: 'us', t: now, offer: { upfront: fee, inst: [], sellOn: 0 } }] };
      const r2 = step(putNeg(rc, n), c, { pid: p.id, pn: p.name, kind: 'chase', club: neg.from }, 'topped', { n: fee });
      const career = withRC(c, r2);
      if (isDeadlineDay(c)) return answerNow(w, career, n);
      return { world: w, career, note: { key: 'rc.bidSent', s: p.id } };
    }
    case 'rc.terms': {
      const neg = negById(rc, cmd.negId);
      if (!neg || neg.stage !== 'terms') return no('gone');
      if (neg.from !== FREE_AGENT && !windowOf(c)) return no('window');
      return talk(w, c, neg, cmd.terms);
    }
    case 'rc.meet': {
      const neg = negById(rc, cmd.negId);
      if (!neg || neg.stage !== 'terms') return no('gone');
      if (neg.from !== FREE_AGENT && !windowOf(c)) return no('window');
      const t = cmd.which === 'counter' ? lastCounter(neg) : demandFor(w, c, neg);
      if (!t) return no('gone');
      const { releaseWanted: _r, ...terms } = t as Demand; void _r;
      return complete(w, c, neg, terms);
    }
    case 'rc.withdraw': {
      const neg = negById(rc, cmd.negId);
      if (!neg || (neg.stage !== 'club' && neg.stage !== 'terms')) return no('gone');
      return close(w, c, neg, 'withdrawn');
    }
    case 'rc.loan': {
      const p = playerOf(w, cmd.playerId);
      if (!p) return no('gone');
      const bad = loanInOk(w, c, p, cmd.share, cmd.minutes);
      if (bad) return bad;
      const fee = loanFee(p);
      const loan: Loan = { playerId: p.id, pn: p.name, from: p.clubId, to: c.clubId, fee, share: cmd.share, season: c.season };
      let world = moveOnLoan(w, p, c.clubId);
      world = { ...world, clubs: world.clubs.map((x) => (x.id === p.clubId ? { ...x, budget: x.budget + fee } : x.id === c.clubId ? { ...x, budget: x.budget - fee } : x)) };
      const ledger = { ...c.ops.ledger, loans: (c.ops.ledger.loans ?? 0) - fee };
      let r2: RecruitState = { ...rc, loans: { ...rc.loans, [p.id]: { share: cmd.share, minutes: cmd.minutes, from: p.clubId, to: c.clubId, since: now, apps0: c.stats[p.id]?.[0] ?? 0, days0: c.round } } };
      r2 = step(r2, c, { pid: p.id, pn: p.name, kind: 'loan', club: p.clubId }, 'loanIn', { n: cmd.share * 100 });
      const career = addNews(withRC({ ...c, ops: { ...c.ops, ledger }, loans: [...(c.loans ?? []), loan] }, r2), 'transfers', 'rc.loanIn', { player: p.id, pn: p.name, club: c.clubId, club2: p.clubId, n: cmd.share * 100 });
      return { world, career, note: { key: 'loanedIn', s: p.id } };
    }
    case 'rc.loanOut': {
      const p = playerOf(w, cmd.playerId);
      if (!p) return no('gone');
      const chk = canLoanOut(w, c, p);
      if (!chk.ok) return no(chk.reason);
      if (cmd.to === c.clubId || cmd.to === FREE_AGENT || !w.clubs.some((x) => x.id === cmd.to)) return no('club');
      const bad = borrowerOk(w, p, cmd.to, cmd.share, cmd.minutes);
      if (bad) return bad;
      const loan: Loan = { playerId: p.id, pn: p.name, from: c.clubId, to: cmd.to, fee: 0, share: cmd.share, season: c.season };
      let r2: RecruitState = { ...rc, loans: { ...rc.loans, [p.id]: { share: cmd.share, minutes: cmd.minutes, from: c.clubId, to: cmd.to, since: now, apps0: c.stats[p.id]?.[0] ?? 0, days0: c.round } } };
      r2 = step(r2, c, { pid: p.id, pn: p.name, kind: 'loan', club: cmd.to }, 'loanOut', { club: cmd.to });
      return { world: moveOnLoan(w, p, cmd.to), career: withRC({ ...dropFromXI(c, p.id), loans: [...(c.loans ?? []), loan] }, r2), note: { key: 'loanedOut', s: p.id } };
    }
    case 'rc.recall': {
      const l = loanOf(c, cmd.playerId);
      const t = rc.loans[cmd.playerId];
      if (!l || l.from !== c.clubId || !t) return no('gone');
      if (!windowOf(c)) return no('window');
      if (t.minutes === 'none') return no('noClause');
      return recall(w, c, cmd.playerId);
    }
  }
}

// Bring a loanee home (ours, recalled; or theirs, taken back by the parent club).
export function recall(w: World, c: Career, playerId: string): Ok {
  const l = loanOf(c, playerId)!;
  const p = playerOf(w, playerId)!;
  const back = l.from;
  let rc = rcOf(c);
  const { [playerId]: _gone, ...loans } = rc.loans; void _gone;
  rc = step({ ...rc, loans }, c, { pid: p.id, pn: p.name, kind: 'loan', club: l.from === c.clubId ? l.to : l.from }, back === c.clubId ? 'recalled' : 'takenBack', {}, true);
  const career = withRC({ ...(back === c.clubId ? c : dropFromXI(c, playerId)), loans: (c.loans ?? []).filter((x) => x !== l) }, rc);
  return { world: moveOnLoan(w, p, back), career, note: { key: 'rc.recalled', s: p.id } };
}

// When we sell a player we bought with a sell-on clause, the club we bought him from gets its share.
export function settleSellOn(w: World, c: Career, playerId: string, fee: number): { world: World; career: Career } {
  const rc = rcOf(c);
  const cl = rc.clauses[playerId];
  if (!cl) return { world: w, career: c };
  const { [playerId]: _x, ...clauses } = rc.clauses; void _x;
  let world = w, career = withRC(c, { ...rc, clauses });
  if (cl.sellOn && fee > 0) {
    const cut = roundFee(fee * cl.sellOn.pct);
    world = { ...w, clubs: w.clubs.map((x) => (x.id === c.clubId ? { ...x, budget: x.budget - cut } : x.id === cl.sellOn!.club ? { ...x, budget: x.budget + cut } : x)) };
    career = { ...career, ops: { ...career.ops, ledger: { ...career.ops.ledger, sellOn: (career.ops.ledger.sellOn ?? 0) - cut } } };
    career = addMsg(career, 'club', 'rc.sellOn', { player: playerId, club: cl.sellOn.club, n: cut });
  }
  return { world, career };
}

export const DEPT_RC: Record<RcCommand['type'], 'recruitment'> = {
  'rc.assign': 'recruitment', 'rc.unassign': 'recruitment', 'rc.need': 'recruitment', 'rc.bid': 'recruitment', 'rc.payCounter': 'recruitment', 'rc.topRival': 'recruitment',
  'rc.terms': 'recruitment', 'rc.meet': 'recruitment', 'rc.withdraw': 'recruitment', 'rc.loan': 'recruitment', 'rc.loanOut': 'recruitment', 'rc.recall': 'recruitment',
};
