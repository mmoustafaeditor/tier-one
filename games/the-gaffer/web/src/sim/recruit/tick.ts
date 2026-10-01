// Recruitment's step of the clock (V2_DESIGN §7.4 phase 5: knowledge, negotiation timers, AI market). Called once per
// matchday by `advance` after the matches, with `career.round` already moved on. Fixed order, all seeded:
//  1 instalments that fall due this season are paid (first matchday of the season)
//  2 knowledge: assignments, the shortlist, the opponents we just faced; decay
//  3 appearance bonuses written into contracts
//  4 negotiations: the window shutting, bids answered (after the hijack roll), agents who ran out of time
//  5 loans: wage shares, minutes clauses (and the parent's recall), the monthly loan report
//  6 the AI market: need-driven bids for our players (unsettled players and release clauses are the room's, sim/room.ts)
//  7 the chief scout's report, and the staff's part when recruitment is delegated
import { FREE_AGENT, type Career, type StaffLog } from '../../model/types';
import { playerOf, type World } from '../world';
import { rngFor } from '../rng';
import { isDeadlineDay, windowOf } from '../windows';
import { loanOf } from '../loans';
import { addMsg } from '../coach';
import { roundFee } from '../season';
import { biasOf, levelOf, staffOf } from '../delegation';
import { dispatch, type Command } from '../commands';
import { accrue } from './knowledge';
import { rcOf, step, tickOf, withRC, putNeg, type Negotiation } from './state';
import { answerNow, dealCost, demandFor, lastCounter, recall as recallBy, walk } from './deals';
import { aiBids, interestCount, suitors } from './ai';
import { reservation } from './club';
import { scoutPicks } from './picks';
import { spendingRoom, wageRoom } from './money';

export const CLAUSE_NEED = { starter: 0.5, rotation: 0.25, none: 0 } as const;
export const CLAUSE_FROM = 8;   // matchdays before a minutes clause is judged
export const HIJACK_EACH = 0.08;

type WC = { world: World; career: Career };

export function recruitTick(w: World, c: Career, faced: string[]): WC {
  let s: WC = { world: w, career: c };
  s = payCommitments(s.world, s.career);
  s.career = accrue(s.world, s.career, faced);
  s = payBonuses(s.world, s.career);
  s = negotiations(s.world, s.career);
  s = loans(s.world, s.career);
  s.career = aiBids(s.world, s.career);
  s.career = picksReport(s.world, s.career);
  s = staffTalks(s.world, s.career);
  s.career = tidyRC(s.world, s.career);
  return s;
}

// 1 --------------------------------------------------------------------------------------------------------------
function payCommitments(w: World, c: Career): WC {
  const rc = rcOf(c);
  const due = rc.commits.filter((x) => x.season <= c.season);
  if (!due.length) return { world: w, career: c };
  let world = w;
  let paid = 0;
  for (const x of due) {
    paid += x.amount;
    world = { ...world, clubs: world.clubs.map((cl) => (cl.id === c.clubId ? { ...cl, budget: cl.budget - x.amount } : cl.id === x.to ? { ...cl, budget: cl.budget + x.amount } : cl)) };
  }
  let career = withRC(c, { ...rc, commits: rc.commits.filter((x) => x.season > c.season) });
  career = { ...career, ops: { ...career.ops, ledger: { ...career.ops.ledger, instalments: (career.ops.ledger.instalments ?? 0) - paid } } };
  career = addMsg(career, 'club', 'rc.instalments', { n: paid, s: String(due.length) });
  return { world, career };
}

// 3 --------------------------------------------------------------------------------------------------------------
function payBonuses(w: World, c: Career): WC {
  const rc = rcOf(c);
  let total = 0;
  const clauses = { ...rc.clauses };
  for (const [id, cl] of Object.entries(rc.clauses)) {
    if (!cl.bonus) continue;
    const p = playerOf(w, id);
    if (!p || p.clubId !== c.clubId) continue;
    const apps = c.stats[id]?.[0] ?? 0;
    const was = (cl as { apps?: number }).apps ?? apps;
    if (apps > was) total += (apps - was) * cl.bonus;
    clauses[id] = { ...cl, apps } as typeof cl;
  }
  let career = withRC(c, { ...rc, clauses });
  if (!total) return { world: w, career };
  const world = { ...w, clubs: w.clubs.map((x) => (x.id === c.clubId ? { ...x, budget: x.budget - total } : x)) };
  career = { ...career, ops: { ...career.ops, ledger: { ...career.ops.ledger, bonuses: (career.ops.ledger.bonuses ?? 0) - total } } };
  return { world, career };
}

// 4 --------------------------------------------------------------------------------------------------------------
function negotiations(w: World, c: Career): WC {
  let s: WC = { world: w, career: c };
  const now = tickOf(c);
  const open = windowOf(c);
  for (const n0 of rcOf(c).negs) {
    const n = rcOf(s.career).negs.find((x) => x.id === n0.id)!;
    if (n.stage !== 'club' && n.stage !== 'terms') continue;
    const free = n.from === FREE_AGENT;
    const p = playerOf(s.world, n.playerId);
    if (!p || p.clubId !== n.from) { s = end(s, n, 'gone'); continue; }
    // The window shut with the deal unfinished (free agents can sign any time).
    if (!open && !free) { s = end(s, n, 'window'); continue; }
    if (n.stage === 'club' && n.answerAt !== null && n.answerAt <= now) {
      // The hijack roll: while our bid waits, a club with the same need may come in. The seller then gives us until
      // the next matchday to beat it (deadline day has no next matchday: the answer is immediate there anyway).
      if (!n.rival) {
        const R = reservation(s.world, s.career, p);
        const chance = HIJACK_EACH * interestCount(s.world, s.career, p, R);
        const r = rngFor(s.career.seed, 'hijack', n.id, now);
        if (!isDeadlineDay(s.career) && r() < chance) {
          const club = suitors(s.world, s.career, p, R)[0];
          if (club) {
            const fee = roundFee(R * (1 + r() * 0.15));
            let rc = putNeg(rcOf(s.career), { ...n, rival: { club, fee }, answerAt: now + 1, seen: (n.seen ?? 0) + 1, bids: [...n.bids, { by: 'them', t: now, answer: 'rival', fee }] });
            rc = step(rc, s.career, { pid: p.id, pn: p.name, kind: 'chase', club: n.from }, 'rival', { club, n: fee });
            s = { world: s.world, career: addMsg(withRC(s.career, rc), 'offer', 'rc.rival', { player: p.id, pn: p.name, club, n: fee }) };
            continue;
          }
        }
      }
      s = answerNow(s.world, s.career, n);
      continue;
    }
    if (n.stage === 'terms' && n.due !== null && n.due < now) {
      // He waited long enough.
      s = walk(s.world, s.career, n);
    }
  }
  return s;
}

function end(s: WC, n: Negotiation, why: NonNullable<Negotiation['end']>): WC {
  const now = tickOf(s.career);
  let rc = putNeg(rcOf(s.career), { ...n, stage: 'collapsed', end: why, endT: now, answerAt: null, seen: (n.seen ?? 0) + 1 });
  rc = step(rc, s.career, { pid: n.playerId, pn: n.pn, kind: 'chase', club: n.from }, why, {}, true);
  return { world: s.world, career: withRC(s.career, rc) };
}

// 5 --------------------------------------------------------------------------------------------------------------
function loans(w: World, c: Career): WC {
  let rc = rcOf(c);
  const now = tickOf(c);
  let world = w;
  let career = c;
  let net = 0;
  const live = new Set((c.loans ?? []).filter((l) => l.season === c.season).map((l) => l.playerId));
  for (const [id, t] of Object.entries(rc.loans)) {
    if (!live.has(id)) continue;
    const p = playerOf(world, id);
    if (!p) continue;
    const inn = t.to === c.clubId;
    // Wage shares: the weekly flow charged whoever holds him the full wage; the other club settles its part.
    if (t.share < 1 && p.clubId === (inn ? c.clubId : t.to)) {
      const part = Math.round((p.wage * (1 - t.share)) / 4);
      const other = inn ? t.from : t.to;
      const sign = inn ? 1 : -1;
      net += sign * part;
      world = { ...world, clubs: world.clubs.map((x) => (x.id === c.clubId ? { ...x, budget: x.budget + sign * part } : x.id === other ? { ...x, budget: x.budget - sign * part } : x)) };
    }
    // The minutes clause, judged every 4 matchdays from the 8th.
    const days = c.round - t.days0;
    if (t.minutes !== 'none' && !t.broken && days >= CLAUSE_FROM && days % 4 === 0) {
      const ratio = ((c.stats[id]?.[0] ?? 0) - t.apps0) / Math.max(1, days);
      if (ratio < CLAUSE_NEED[t.minutes]) {
        rc = { ...rc, loans: { ...rc.loans, [id]: { ...t, broken: true } } };
        if (inn) {
          rc = { ...rc, parentTrust: { ...rc.parentTrust, [t.from]: (rc.parentTrust[t.from] ?? 60) - 25 } };
          world = { ...world, players: world.players.map((x) => (x.id === id ? { ...x, morale: Math.max(5, x.morale - 10) } : x)) };
        }
        rc = step(rc, career, { pid: id, pn: p.name, kind: 'loan', club: inn ? t.from : t.to }, inn ? 'brokenIn' : 'brokenOut');
        career = addMsg(withRC(career, rc), 'club', inn ? 'rc.loanBrokenIn' : 'rc.loanBrokenOut', { player: id, pn: p.name, club: inn ? t.from : t.to, n: Math.round(ratio * 100) });
        rc = rcOf(career);
      }
    }
    // A parent club whose clause we broke takes him back as soon as a window opens.
    if (inn && rc.loans[id]?.broken && windowOf(c) && p.clubId === c.clubId) {
      const l = loanOf(career, id);
      if (l) {
        const res = recallBy(world, withRC(career, rc), id);
        world = res.world; career = res.career; rc = rcOf(career);
        career = addMsg(career, 'club', 'rc.takenBack', { player: id, pn: p.name, club: t.from });
        rc = rcOf(career);
      }
    }
    // The monthly loan report for the ones we sent out.
    if (!inn && c.round % 4 === 0 && c.round > t.days0) {
      const apps = (c.stats[id]?.[0] ?? 0) - t.apps0;
      const goals = c.stats[id]?.[1] ?? 0;
      career = addMsg(withRC(career, rc), 'club', 'rc.loanReport', { player: id, pn: p.name, club: t.to, n: apps, s: `${goals}|${Math.max(1, c.round - t.days0)}|${t.minutes}` });
      rc = rcOf(career);
    }
  }
  career = withRC(career, rc);
  if (net) career = { ...career, ops: { ...career.ops, ledger: { ...career.ops.ledger, loanWages: (career.ops.ledger.loanWages ?? 0) + net } } };
  void now;
  return { world, career };
}


// 7 --------------------------------------------------------------------------------------------------------------
function picksReport(w: World, c: Career): Career {
  if (c.round % 4 !== 2) return c;
  const picks = scoutPicks(w, c, 1);
  if (!picks.length) return c;
  const top = picks[0];
  return addMsg(c, 'scout', 'rc.picks', { player: top.p.id, pn: top.p.name, n: picks.length, s: top.need.pos });
}

// The sporting director, when recruitment is left to the staff: he answers counters and agents on his own, with his
// bias (a cautious one walks away sooner, a bold one pays). At 'ask' he waits for you (Today shows his call).
export function directorCall(w: World, c: Career, n: Negotiation): 'pay' | 'meet' | 'counter' | 'walk' | 'wait' {
  const b = biasOf(staffOf(c, 'director'));
  const p = playerOf(w, n.playerId);
  if (!p) return 'walk';
  if (n.stage === 'club') {
    if (n.rival) return b === 'cautious' || b === 'money' ? 'walk' : 'pay';
    if (n.counter === null || n.answerAt !== null) return 'wait';
    const limit = p.marketValue * (b === 'bold' ? 1.6 : b === 'cautious' || b === 'money' ? 1.2 : 1.4);
    return n.counter <= limit && n.counter <= spendingRoom(w, c) ? 'pay' : 'walk';
  }
  if (n.stage === 'terms') {
    const d = demandFor(w, c, n);
    if (!d) return 'walk';
    const cost = dealCost(w, c, n, d);
    const fits = cost.total <= spendingRoom(w, c, n.id) && d.wage <= wageRoom(w, c);
    const counter = lastCounter(n);
    if (counter) { const cc = dealCost(w, c, n, counter); if (cc.total <= spendingRoom(w, c, n.id) && counter.wage <= wageRoom(w, c)) return 'counter'; }
    if (!fits) return 'walk';
    return b === 'cautious' && d.wage > p.wage * 1.5 ? 'walk' : 'meet';
  }
  return 'wait';
}

function staffTalks(w: World, c: Career): WC {
  if (levelOf(c, 'recruitment') !== 'staff' || !staffOf(c, 'director')) return { world: w, career: c };
  let s: WC = { world: w, career: c };
  for (const n0 of rcOf(c).negs) {
    const n = rcOf(s.career).negs.find((x) => x.id === n0.id)!;
    if (n.stage !== 'club' && n.stage !== 'terms') continue;
    const call = directorCall(s.world, s.career, n);
    const log = (key: string, ref: Partial<StaffLog> = {}) => {
      const b = biasOf(staffOf(s.career, 'director'));
      const item: StaffLog = { season: s.career.season, round: Math.max(0, s.career.round - 1), duty: 'signing', key, pn: n.pn, ...ref, ...(b ? { b } : {}) };
      s = { ...s, career: { ...s.career, staffLog: [item, ...(s.career.staffLog ?? [])].slice(0, 40) } };
    };
    if (call === 'wait') continue;
    const cmd: Command = call === 'walk' ? { type: 'rc.withdraw', negId: n.id }
      : n.stage === 'club' ? (n.rival ? { type: 'rc.topRival', negId: n.id } : { type: 'rc.payCounter', negId: n.id })
      : { type: 'rc.meet', negId: n.id, which: call === 'counter' ? 'counter' : 'demand' };
    // The director uses the same commands (and the same rules) as the manager's tap.
    const r = dispatch(s.world, s.career, cmd, 'director');
    if (!r.ok) continue;
    s = { world: r.world, career: r.career };
    log(call === 'walk' ? 'rcWalk' : n.stage === 'club' ? (n.rival ? 'rcTop' : 'rcPay') : 'rcSigned', { n: n.stage === 'club' ? (n.rival ? roundFee(n.rival.fee * 1.05) : n.counter ?? 0) : undefined });
  }
  return s;
}

// Housekeeping: clauses only for players still with us, loan terms only for this season's loans, old talks trimmed.
export function tidyRC(w: World, c: Career): Career {
  const rc = rcOf(c);
  const clauses = Object.fromEntries(Object.entries(rc.clauses).filter(([id]) => playerOf(w, id)?.clubId === c.clubId || !!loanOf(c, id)));
  const live = new Set((c.loans ?? []).filter((l) => l.season === c.season).map((l) => l.playerId));
  const loansT = Object.fromEntries(Object.entries(rc.loans).filter(([id]) => live.has(id)));
  const now = tickOf(c);
  const closed = rc.negs.filter((n) => n.stage === 'done' || n.stage === 'collapsed').sort((a, b) => (b.endT ?? 0) - (a.endT ?? 0));
  const keep = new Set(closed.filter((n) => (n.endT ?? 0) >= now - 60).slice(0, 16).map((n) => n.id));
  const negs = rc.negs.filter((n) => n.stage === 'club' || n.stage === 'terms' || keep.has(n.id));
  const frozen = Object.fromEntries(Object.entries(rc.frozen).filter(([, t]) => t > now));
  const same = Object.keys(clauses).length === Object.keys(rc.clauses).length && Object.keys(loansT).length === Object.keys(rc.loans).length
    && negs.length === rc.negs.length && Object.keys(frozen).length === Object.keys(rc.frozen).length;
  return same ? c : withRC(c, { ...rc, clauses, loans: loansT, negs, frozen });
}
