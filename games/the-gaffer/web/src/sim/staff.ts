// Staff at work (V2_DESIGN §2.5). Each department runs at one of three levels (sim/delegation.ts):
//  - 'staff': they act through the SAME commands the manager uses (sim/commands.ts) and write the staff log;
//  - 'ask':   they prepare the command and park it on Today with their reason (career.pending); it lapses unanswered;
//  - 'me':    they do nothing on their own (Today still shows the decisions that come up, with their advice).
// Every member of staff has one bias (cautious, bold, youth, veteran, money, loyal) that tilts their calls, so the manager
// can learn who to trust. They never see anything the manager can't.
import { FREE_AGENT, type Career, type Dept, type Duty, type LocalizedName, type Pending, type PrepFocus, type StaffLog } from '../model/types';
import { makeRng } from './rng';
import { money, playerOf, squadOf, strengthOf, type World } from './world';
import { DEFAULT_TACTICS, FORMATIONS, FORMATION_IDS, bestXI, slotValue, xiFor, type FormationId } from './tactics';
import { predict } from './match';
import { makeReport } from './scouting';
import { treatmentCost } from './training';
import { academyLoanSpots, academyOf, canRush, capOf, matchRisk, readyBar, riskBand, rushRisk } from './youth';
import { CAP_MONTHS_UP, SLOTS, attendance, refPrice, staffQ } from './economy';
import { canSell, judgeRenewal, renewDemand, wageBillOf, SQUAD_COMFORT, SQUAD_MAX } from './transfers';
import { balanceOf } from './balance';
import { windowOf } from './windows';
import { canLoanOut, loanClubs, loanOf, loansOut } from './loans';
import { nextUserMatch, roundFee } from './season';
import { dispatch, type Command } from './commands';
import { rcOf } from './recruit/state';
import { needs } from './recruit/needs';
import { scoutPicks } from './recruit/picks';
import { spendingRoom } from './recruit/money';
import { split } from './recruit/club';
import { DEPT_OF_DUTY, DUTY_ROLE, asking, biasOf, delegated, levelOf } from './delegation';

export { delegated, hasStaffFor, asking, levelOf } from './delegation';

// Duties in the order the old staff room showed them ('match' itself is never delegated).
export const DUTIES: Duty[] = ['lineup', 'tactics', 'scouting', 'training', 'medical', 'morale', 'academy', 'contracts', 'selling', 'signing', 'loans', 'sponsors', 'tickets'];
export const PENDING_DAYS = 3; // matchdays an 'ask' proposal waits before it lapses

const q = (c: Career, d: Duty) => staffQ(c.ops, DUTY_ROLE[d]);
const bias = (c: Career, d: Duty) => biasOf(c.ops?.staff[DUTY_ROLE[d]]);
const clubOf = (w: World, c: Career) => w.clubs.find((x) => x.id === c.clubId)!;

type Ref = { pn?: LocalizedName; n?: number; s?: string };
interface Ctx { world: World; career: Career; duty: Duty }

function log(c: Career, duty: Duty, key: string, ref: Ref = {}): Career {
  const b = bias(c, duty);
  const item: StaffLog = { season: c.season, round: c.round, duty, key, ...ref, ...(b ? { b } : {}) };
  return { ...c, staffLog: [item, ...(c.staffLog ?? [])].slice(0, 40) };
}

// One staff call. 'staff' level: run the command now (as that member of staff) and log it. 'ask': park it.
function act(x: Ctx, cmd: Command, key: string, ref: Ref = {}): boolean {
  const dept: Dept = DEPT_OF_DUTY[x.duty];
  if (levelOf(x.career, dept) === 'ask') {
    const k = cmd as { playerId?: string; id?: string; dealId?: string; offerId?: string };
    const target = k.playerId ?? k.id ?? k.dealId ?? k.offerId ?? ref.pn?.en ?? '';
    const id = `pd:${x.duty}:${key}:${target}:${x.career.season}`;
    const pend = x.career.pending ?? [];
    if (pend.some((p) => p.id === id) || x.career.done?.[id] !== undefined) return false;
    // One open proposal per duty at a time keeps Today short.
    if (pend.some((p) => p.id.startsWith(`pd:${x.duty}:`))) return false;
    const p: Pending = { id, dept, cmd: cmd as unknown as Pending['cmd'], key, ...ref, until: x.career.round + PENDING_DAYS };
    x.career = { ...x.career, pending: [...pend, p] };
    return true;
  }
  const r = dispatch(x.world, x.career, cmd, DUTY_ROLE[x.duty]);
  if (!r.ok) return false;
  x.world = r.world;
  x.career = log(r.career, x.duty, key, ref);
  return true;
}

// ---------- right before the user's match ----------

// Line-up, shape and the opponent report at kick-off, for departments handed to the staff.
export function staffPrep(w: World, c: Career, m: { sides: { clubId: string }[]; key: string } | null): { world: World; career: Career } {
  let world = w, career = c;
  // F01 (rework): an XI the manager picked (tactics.xi, set only by the manager's own commands: the Tactics board or a
  // card he answered) is his call and survives delegation; xiFor still swaps out anyone injured or banned since. With no
  // XI of his own (xi null), the assistant's best XI is picked fresh at kick-off, as before.
  if (m && delegated(career, 'scouting') && !career.scouted?.[m.key]) {
    const full = startLike(world, career, m);
    const r = full && makeReport(world, career, full, true);
    if (r) { world = r.world; career = log(r.career, 'scouting', 'report', { s: m.sides.find((s) => s.clubId !== c.clubId)?.clubId }); }
  }
  if (delegated(career, 'tactics') && m) {
    const x: Ctx = { world, career, duty: 'tactics' };
    planTactics(x, m);
    world = x.world; career = x.career;
  }
  return { world, career };
}

// The full match state for the report and the odds, built fresh with the current tactics.
const startLike = (w: World, c: Career, m: { key: string }) => { const full = nextUserMatch(w, c); return full && full.key === m.key ? full : null; };

// The assistant: the analyst's counter plan when there is one the squad knows; otherwise the formation whose best XI is
// strongest, and a mentality from the odds. Bold assistants lean forward, cautious ones back.
function planTactics(x: Ctx, m: { sides: { clubId: string }[]; key: string }) {
  const c = x.career;
  const report = c.scouted?.[m.key];
  const cur = c.tactics ?? DEFAULT_TACTICS;
  if (report && report.plan.philosophy !== (cur.philosophy ?? 'balanced') && (report.plan.philosophy === 'balanced' || (c.mastery?.[report.plan.philosophy] ?? 0) >= 45)) {
    act(x, { type: 'tactics.preset', philosophy: report.plan.philosophy, pressing: report.plan.pressing, trap: report.plan.trap }, 'plan', { s: report.plan.philosophy });
    return;
  }
  const squad = squadOf(x.world, c.clubId);
  const good = q(c, 'tactics') >= 50;
  const score = (f: FormationId) => bestXI(squad, f).reduce((s, p, i) => s + slotValue(p, FORMATIONS[f].slots[i]?.pos ?? 'CM'), 0) + FORMATIONS[f].attack * (good ? 2 : 0);
  // Only change shape for a clear gain (about half a rating point per player), so the team keeps a settled system.
  let best: FormationId = cur.formation, bestV = score(cur.formation) + 5;
  // F01: the manager picked his XI for his shape; the assistant doesn't re-shape around it (mentality only).
  if (!cur.xi) for (const f of FORMATION_IDS) { if (f === cur.formation) continue; const v = score(f); if (v > bestV) { bestV = v; best = f; } }
  const full = startLike(x.world, { ...c, tactics: { ...cur, formation: best, xi: null } }, m);
  let mentality = cur.mentality;
  if (full) {
    const mine = full.sides[0].clubId === c.clubId ? 0 : 1;
    const p = predict(full, (id) => playerOf(x.world, id)!);
    const [win, , loss] = mine === 0 ? p : [p[2], p[1], p[0]];
    const b = bias(c, 'tactics');
    const lean = b === 'bold' ? 0.08 : b === 'cautious' ? -0.08 : 0;
    mentality = win + lean > 0.55 ? 1 : loss - lean > 0.5 ? -1 : 0;
  }
  if (best !== cur.formation || mentality !== cur.mentality) {
    act(x, { type: 'tactics.patch', patch: { formation: best, mentality } }, best !== cur.formation ? 'formation' : 'mentality', { s: best, n: mentality });
  }
}

// ---------- after every matchday ----------

export function staffWeek(w: World, c: Career): { world: World; career: Career } {
  // Proposals that ran out of time lapse to the safe default: nothing happens.
  const live = (c.pending ?? []).filter((p) => p.until >= c.round && levelOf(c, p.dept) === 'ask');
  const x: Ctx = { world: w, career: live.length !== (c.pending ?? []).length ? { ...c, pending: live } : c, duty: 'training' };
  const before = x.career.staffLog;
  const on = (d: Duty) => delegated(x.career, d) || asking(x.career, d);
  const step = (d: Duty, f: (x: Ctx) => void) => { if (on(d)) { x.duty = d; f(x); } };
  step('scouting', opposition);
  step('training', training);
  step('medical', medical);
  step('morale', morale);
  step('academy', academy);
  step('selling', selling);
  step('contracts', contracts);
  step('signing', signing);
  step('loans', loans);
  step('sponsors', sponsors);
  step('tickets', tickets);
  // This runs after the matchday was counted: file what was done under the matchday just played.
  let career = x.career;
  if (career.staffLog !== before) {
    const fresh = new Set((career.staffLog ?? []).filter((l) => !(before ?? []).includes(l)));
    career = { ...career, staffLog: career.staffLog!.map((l) => (fresh.has(l) ? { ...l, round: Math.max(0, l.round - 1) } : l)) };
  }
  return { world: x.world, career };
}

// Analyst: the report on the next opponent as soon as the week starts, and (if he may) the plan against them.
function opposition(x: Ctx) {
  const m = nextUserMatch(x.world, x.career);
  if (!m || x.career.scouted?.[m.key]) return;
  const r = makeReport(x.world, x.career, m, true);
  if (!r) return;
  x.world = r.world;
  x.career = log(r.career, 'scouting', 'report', { s: m.sides.find((s) => s.clubId !== x.career.clubId)?.clubId });
  if (levelOf(x.career, 'matchprep') !== 'me') { x.duty = 'tactics'; planTactics(x, m); x.duty = 'scouting'; }
}

// Fitness coach: training load from the squad's condition. Hard weeks only in the opening matchdays with a fresh squad.
// Rework §F: the same call is shown on Training as his proposal for the week (`weekPlan`), with its reasons.
const PRESEASON_ROUNDS = 3;
export interface WeekPlan { load: 0 | 1 | 2; focus: PrepFocus; fit: number; tired: number; test: boolean; scouted: boolean; opp?: string; early: boolean }
export function weekPlan(w: World, c: Career): WeekPlan {
  const squad = squadOf(w, c.clubId);
  const fit = squad.reduce((s, p) => s + p.fitness, 0) / Math.max(1, squad.length);
  const b = bias(c, 'training');
  const tired = b === 'cautious' ? 85 : b === 'bold' ? 74 : 80;
  const early = c.round < PRESEASON_ROUNDS || b === 'bold';
  const load = (fit < tired ? 0 : fit > 95 && early ? 2 : 1) as 0 | 1 | 2;
  // The week's focus: legs first when they're tired, the opponent when he's a real test, otherwise the plan.
  const m = nextUserMatch(w, c);
  const opp = m?.sides.find((s) => s.clubId !== c.clubId)?.clubId;
  const test = !!opp && strengthOf(w, opp) >= strengthOf(w, c.clubId) - 2;
  const scouted = !!(m && c.scouted?.[m.key]);
  const focus: PrepFocus = fit < tired ? 'recovery' : test && scouted ? 'opposition' : b === 'youth' ? 'development' : 'tactical';
  return { load, focus, fit, tired, test, scouted, opp, early };
}
function training(x: Ctx) {
  const plan = weekPlan(x.world, x.career);
  if (plan.load !== x.career.ops.training.load) act(x, { type: 'training.set', load: plan.load }, 'load', { n: plan.load });
  if (plan.focus !== x.career.prep) act(x, { type: 'prep.set', focus: plan.focus }, 'focus', { s: plan.focus });
}

// Doctor: pays for rehab on longer injuries when the club can easily afford it; rushes a key man back when his bias
// allows (a bold doctor always, a cautious one never); and (v2.6) rests the loaded ones before the next match.
function medical(x: Ctx) {
  const b = bias(x.career, 'medical');
  const min = b === 'cautious' ? 2 : b === 'bold' ? 4 : 3;
  const cost = treatmentCost(x.world, x.career, 'rehab');
  for (const p of squadOf(x.world, x.career.clubId).filter((y) => y.injured >= min).slice(0, 2)) {
    if (clubOf(x.world, x.career).budget < cost * 8) break;
    act(x, { type: 'medical.treat', playerId: p.id, treatment: 'rehab' }, 'rehab', { pn: p.name });
  }
  const key = new Set(squadOf(x.world, x.career.clubId).sort((a, z) => z.rating - a.rating).slice(0, 11).map((p) => p.id));
  const risk = rushRisk(x.career);
  for (const p of squadOf(x.world, x.career.clubId).filter((y) => canRush(y) && key.has(y.id))) {
    if (b === 'cautious' || (b !== 'bold' && risk > 20)) break;
    act(x, { type: 'medical.treat', playerId: p.id, treatment: 'rush' }, 'y_rush', { pn: p.name, n: risk });
  }
  if (!nextUserMatch(x.world, x.career)) return;
  const bar = b === 'cautious' ? 1 : 2;
  for (const p of xiFor(x.world, x.career).xi) {
    if (riskBand(p) < bar || (x.career.rested ?? []).includes(p.id) || (b === 'bold' && !p.rr)) continue;
    act(x, { type: 'rest.set', playerId: p.id, rest: true }, 'y_rest', { pn: p.name, n: matchRisk(p) });
  }
}

// Psychologist: a team talk when the room goes flat.
function morale(x: Ctx) {
  const squad = squadOf(x.world, x.career.clubId);
  const avg = squad.reduce((s, p) => s + p.morale, 0) / Math.max(1, squad.length);
  const floor = 45 + Math.round(q(x.career, 'morale') / 10);
  if (avg < floor) act(x, { type: 'squad.talk' }, 'talk', { n: Math.round(avg) });
}

// Head of Youth (the chief scout runs the academy, v2.6): promotes the ready ones, sends the next ones out on loan to
// clubs where they'd start, and lets the least promising go when the academy is over capacity.
function academy(x: Ctx) {
  const b = bias(x.career, 'academy');
  const bar = readyBar(x.world, x.career) - (b === 'youth' ? 3 : b === 'veteran' ? -2 : 0) - 1;
  const age = (p: { birthYear: number }) => x.career.season - p.birthYear;
  for (const kid of academyOf(x.world, x.career.clubId).sort((a, z) => z.rating - a.rating)) {
    if (age(kid) >= 17 && kid.rating >= bar && squadOf(x.world, x.career.clubId).length < 28) act(x, { type: 'academy.promote', id: kid.id }, 'promote', { pn: kid.name });
  }
  if (windowOf(x.career)) {
    let sent = 0;
    for (const kid of academyOf(x.world, x.career.clubId).filter((k) => age(k) >= 17 && k.rating >= 55).sort((a, z) => z.potential - a.potential)) {
      if (sent >= 2) break;
      const spot = academyLoanSpots(x.world, x.career, kid, 1)[0];
      if (spot && spot.role <= (b === 'cautious' ? 0 : 1) && act(x, { type: 'academy.loan', id: kid.id, to: spot.clubId }, 'y_loan', { pn: kid.name, s: spot.clubId })) sent++;
    }
  }
  const mine = academyOf(x.world, x.career.clubId);
  const cap = capOf(x.world, x.career, x.career.clubId);
  if (mine.length > cap && b !== 'loyal') {
    const weakest = [...mine].sort((a, z) => (a.potential - age(a)) - (z.potential - age(z)))[0];
    if (weakest) act(x, { type: 'academy.release', id: weakest.id }, 'y_release', { pn: weakest.name });
  }
}

// Sporting director: answers bids (only at the 'staff' level: at 'ask' every bid is a card on Today anyway) and lists
// the squad's surplus. A money-first director sells sooner, a loyal one holds on.
function selling(x: Ctx) {
  const c0 = x.career;
  const b = bias(c0, 'selling');
  if (delegated(c0, 'selling')) {
    const core = new Set(squadOf(x.world, c0.clubId).sort((a, z) => z.rating - a.rating).slice(0, 11).map((p) => p.id));
    const greed = 1.05 + q(c0, 'selling') / 500 + (b === 'money' ? -0.15 : b === 'loyal' ? 0.2 : 0);
    for (const o of [...x.career.offers]) {
      const p = playerOf(x.world, o.playerId);
      if (!p) continue;
      const want = p.marketValue * (core.has(p.id) ? greed + 0.35 : p.listed ? 0.85 : greed);
      const senior = squadOf(x.world, x.career.clubId).filter((y) => !loanOf(x.career, y.id)).length;
      const thin = !p.listed && senior <= SQUAD_COMFORT; // GF-005: a thin squad keeps its unlisted players
      const word = !p.listed && (x.career.room?.pledges ?? []).some((pl) => pl.status === 'open' && pl.playerId === p.id); // M3: his promise stands
      if (o.fee >= want && !thin && !word && canSell(x.world, x.career, o).ok) act(x, { type: 'offer.accept', offerId: o.id }, 'sold', { pn: p.name, n: o.fee, s: o.clubId });
      else if (x.career.round - o.round >= 1) act(x, { type: 'offer.reject', offerId: o.id }, 'rejected', { pn: p.name, n: o.fee });
    }
  }
  // Too many players: list the lowest-rated ones beyond 26 (24 for a money-first director).
  const keep = b === 'money' ? 24 : 26;
  const sq = squadOf(x.world, x.career.clubId).filter((p) => !loanOf(x.career, p.id)).sort((a, z) => z.rating - a.rating);
  // M3 (rework): never a player the manager has given his word to (an open promise: a pathway, a role, a contract).
  const promised = new Set((x.career.room?.pledges ?? []).filter((pl) => pl.status === 'open').map((pl) => pl.playerId));
  for (const p of sq.slice(keep)) if (!p.listed && !promised.has(p.id)) act(x, { type: 'player.list', playerId: p.id, listed: true }, 'listed', { pn: p.name });
}

// A cap rise already waiting on the manager: one at a time, so the desk isn't flooded with them.
const pendingCap = (c: Career) => (c.pending ?? []).some((pd) => pd.cmd.type === 'wagecap.move');

// Sporting director: renews the players worth keeping from matchday 5, lets the rest run down.
function contracts(x: Ctx) {
  if (x.career.round < 5) return;
  const b = bias(x.career, 'contracts');
  const squad = squadOf(x.world, x.career.clubId).filter((p) => !loanOf(x.career, p.id));
  const keepBar = squad.map((p) => p.rating).sort((a, z) => z - a)[Math.min(b === 'loyal' ? 23 : 19, squad.length - 1)] ?? 0;
  const ending = squad.filter((y) => y.contractUntil <= x.career.season + 1).sort((a, z) => z.rating - a.rating);
  // GF-005: enough of the best expiring players are kept for the squad to stay at SQUAD_COMFORT, even below the bar;
  // letting everyone under it walk emptied squads to the 16-man floor every summer.
  let staying = squad.length - ending.length;
  const blocked: { p: (typeof squad)[number]; wage: number; years: number }[] = [];
  const renew = (p: (typeof squad)[number], wage: number, years: number) =>
    judgeRenewal(x.world, x.career, p, wage, years).ok && act(x, { type: 'contract.renew', playerId: p.id, wage, years }, 'renewed', { pn: p.name, n: years, s: String(wage) });
  for (const p of ending) {
    const age = x.career.season - p.birthYear;
    const worth = p.rating >= keepBar || (age <= 22 && p.potential >= keepBar + 3) || staying < SQUAD_COMFORT;
    const tooOld = b === 'loyal' ? age >= 35 : b === 'money' ? age >= 30 : age >= 33;
    if (!worth || tooOld) continue;
    const d = renewDemand(p, x.career.season, balanceOf(x.career).wages);
    const years = Math.min(d.maxYears, b === 'cautious' ? 2 : b === 'bold' ? 5 : age <= 26 ? 4 : 2);
    const j = judgeRenewal(x.world, x.career, p, d.wage, years);
    if (j.ok) { if (renew(p, d.wage, years)) staying++; }
    else if (j.reason === 'wageCap') { blocked.push({ p, wage: d.wage, years }); staying++; }
  }
  // GF-005: players worth keeping that only the wage cap stops (it resets to the bill + 5% every summer): one proposal to
  // raise the cap by what all of their new deals need, paid from the budget (12 months of the rise), while the club can
  // easily afford it. Once it's approved the weekly check renews them one by one; a delegated director does it now.
  if (blocked.length && !pendingCap(x.career)) {
    const club = x.world.clubs.find((y) => y.id === x.career.clubId)!;
    const rise = blocked.reduce((sum, k) => sum + Math.max(0, k.wage - k.p.wage), 0);
    const need = roundFee(Math.max(1000, wageBillOf(x.world, x.career.clubId) + rise - club.wageCap));
    if (need * CAP_MONTHS_UP * 2 <= spendingRoom(x.world, x.career)
      && act(x, { type: 'wagecap.move', perMonth: need }, 'capRaise', { pn: blocked[0].p.name, n: need, s: String(blocked.length) })) {
      for (const k of blocked) renew(k.p, k.wage, k.years);
    }
  }
}

// Sporting director + chief scout (v2.5): one chase at a time, for the top need, from the chief scout's picks (what the
// club KNOWS, ranges not true ratings), through the same two-stage deal as the manager's: a bid first, the agent after.
// A bold director bids the asking price, a cautious one 15 % under it (and skips some weeks); big fees go in instalments.
function signing(x: Ctx) {
  const c = x.career;
  const squad = squadOf(x.world, c.clubId);
  if (squad.length >= SQUAD_MAX - 4) return;
  if (rcOf(c).negs.some((n) => n.stage === 'club' || n.stage === 'terms')) return;
  const b = bias(c, 'signing');
  const r = makeRng(c.seed ^ (c.season * 17 + c.round));
  if (b === 'cautious' && r() < 0.5) return; // a cautious director waits for a better week
  const top = needs(x.world, c).find((n) => n.level === 'red' || squad.length < 22);
  if (!top) return;
  const free = !windowOf(c);
  const room = spendingRoom(x.world, c);
  const share = b === 'money' ? 0.25 : b === 'bold' ? 0.45 : 0.35;
  const picks = scoutPicks(x.world, c, 3, [top]).filter((pk) => (free ? pk.p.clubId === FREE_AGENT : true) && pk.fee <= room * share);
  for (const pk of picks) {
    const total = roundFee(pk.fee * (b === 'bold' ? 1 : b === 'cautious' ? 0.85 : 0.92));
    const offer = total > 5e6 && b !== 'bold' ? split(total, 1, 0.6) : { upfront: total, inst: [], sellOn: 0 };
    if (act(x, { type: 'rc.bid', playerId: pk.p.id, offer }, 'rcbid', { pn: pk.p.name, n: total, s: pk.p.clubId })) return;
  }
}

// Sporting director: loans out young players who aren't getting games (two per window at most).
function loans(x: Ctx) {
  const c = x.career;
  if (!windowOf(c) || loansOut(c).length >= 2) return;
  const squad = squadOf(x.world, c.clubId).sort((a, z) => z.rating - a.rating);
  const p = squad.slice(18).filter((y) => c.season - y.birthYear <= 21 && !loanOf(c, y.id))[0];
  if (p && canLoanOut(x.world, c, p).ok) {
    const to = loanClubs(x.world, c, p)[0];
    if (to) act(x, { type: 'loan.out', playerId: p.id, to }, 'out', { pn: p.name, s: to });
  }
}

// Sporting director: signs the best offer for every empty sponsor slot.
function sponsors(x: Ctx) {
  for (const slot of SLOTS) {
    if (x.career.ops.sponsors.some((s) => s.slot === slot)) continue;
    const best = x.career.ops.sponsorOffers.filter((d) => d.slot === slot).sort((a, z) => z.monthly - a.monthly)[0];
    if (best) act(x, { type: 'sponsor.sign', dealId: best.id }, 'signed', { pn: best.brand, n: best.monthly, s: slot });
  }
}

// Sporting director: the ticket price that brings in the most money without emptying the stands.
function tickets(x: Ctx) {
  const c = x.career;
  if (c.round % 4 !== 0) return;
  const ref = refPrice(x.world, clubOf(x.world, c));
  let best = c.ops.ticket, bestV = attendance(x.world, c, best) * best;
  for (const k of [0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.45]) {
    const price = Math.round(ref * k * 10) / 10;
    const v = attendance(x.world, c, price) * price * (1 - Math.max(0, k - 1.2) * 0.2); // full grounds keep the fans happy
    if (v > bestV) { bestV = v; best = price; }
  }
  if (best !== c.ops.ticket) act(x, { type: 'ticket.set', price: best }, 'price', { s: best < 10 ? `€${best.toFixed(1)}` : money(Math.round(best)) });
}

// ---------- old staff-room helpers (one switch per duty, mapped onto its department) ----------
export { DUTY_ROLE } from './delegation';
export const DUTY_GROUPS: [string, Duty[]][] = [
  ['matchday', ['lineup', 'tactics', 'scouting']],
  ['squad', ['training', 'medical', 'morale', 'academy']],
  ['transfers', ['contracts', 'selling', 'signing', 'loans']],
  ['club', ['sponsors', 'tickets']],
];
export const setDelegate = (c: Career, d: Duty, on: boolean): Career => ({ ...c, dept: { ...(c.dept ?? {}), [DEPT_OF_DUTY[d]]: on ? 'staff' : 'me' } });
export const setAll = (c: Career, on: boolean): Career => DUTIES.reduce((acc, d) => setDelegate(acc, d, on), c);
