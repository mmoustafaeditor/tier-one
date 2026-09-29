// Staff delegation. Every club duty except playing the match can be handed to a member of staff, who then does
// it every matchday. How well they do it depends on their quality (0-100), so better staff make better calls.
// Each thing they do goes in the staff log, so the user can see what was done in their name.
import { FREE_AGENT, type Career, type Duty, type StaffLog, type StaffRole } from '../model/types';
import { makeRng } from './rng';
import { money, playerOf, squadOf, strengthOf, type World } from './world';
import { DEFAULT_TACTICS, FORMATIONS, FORMATION_IDS, autoXI, slotValue, type FormationId } from './tactics';
import { formationNeeds, hasLicence } from './coach';
import { predict } from './match';
import { makeReport } from './scouting';
import { DEV_COST, promote, scoutProspects, sellRights, treat, treatmentCost, useDev, atCeiling, ACADEMY_MAX, scoutCost } from './training';
import { SLOTS, attendance, refPrice, signSponsor, staffQ } from './economy';
import { acceptOffer, askingPrice, canSell, judgeBid, judgeRenewal, rejectOffer, renew, renewDemand, wageBillOf, wageDemand, buy, SQUAD_MAX } from './transfers';
import { balanceOf } from './balance';
import { windowOf } from './windows';
import { canLoanOut, loanClubs, loanOf, loanOut, loansOut } from './loans';
import { GROUP_OF } from './groups';
import { nextUserMatch } from './season';

// Duties in the order the staff room shows them. 'match' (playing it) is never delegated.
export const DUTIES: Duty[] = ['lineup', 'tactics', 'scouting', 'training', 'medical', 'morale', 'academy', 'contracts', 'selling', 'signing', 'loans', 'sponsors', 'tickets'];
export const DUTY_GROUPS: [string, Duty[]][] = [
  ['matchday', ['lineup', 'tactics', 'scouting']],
  ['squad', ['training', 'medical', 'morale', 'academy']],
  ['transfers', ['contracts', 'selling', 'signing', 'loans']],
  ['club', ['sponsors', 'tickets']],
];
export const DUTY_ROLE: Record<Duty, StaffRole> = {
  lineup: 'assistant', tactics: 'assistant', scouting: 'scout', training: 'fitness', medical: 'doctor', morale: 'psychologist',
  academy: 'scout', contracts: 'director', selling: 'director', signing: 'director', loans: 'director', sponsors: 'director', tickets: 'director',
};

export const hasStaffFor = (c: Career, d: Duty) => !!c.ops?.staff[DUTY_ROLE[d]];
export const delegated = (c: Career, d: Duty) => !!c.delegate?.[d] && hasStaffFor(c, d);
export const allDelegated = (c: Career) => DUTIES.every((d) => delegated(c, d));

export function setDelegate(c: Career, d: Duty, on: boolean): Career {
  const delegate = { ...(c.delegate ?? {}), [d]: on };
  // Picking your own XI while the assistant picks it makes no sense: hand the line-up back to "best XI".
  const tactics = d === 'lineup' && on && c.tactics ? { ...c.tactics, xi: null } : c.tactics;
  return { ...c, delegate, tactics };
}
export const setAll = (c: Career, on: boolean): Career => DUTIES.reduce((acc, d) => setDelegate(acc, d, on && hasStaffFor(acc, d)), c);

function log(c: Career, duty: Duty, key: string, ref: Omit<StaffLog, 'season' | 'round' | 'duty' | 'key'> = {}): Career {
  const item: StaffLog = { season: c.season, round: c.round, duty, key, ...ref };
  return { ...c, staffLog: [item, ...(c.staffLog ?? [])].slice(0, 40) };
}

const q = (c: Career, d: Duty) => staffQ(c.ops, DUTY_ROLE[d]);
const clubOf = (w: World, c: Career) => w.clubs.find((x) => x.id === c.clubId)!;

// ---------- before the user's match ----------

// Line-up, tactics and the opponent report, right before kick-off (live or quick result).
export function staffPrep(w: World, c: Career, m: { sides: { clubId: string }[]; key: string } | null): { world: World; career: Career } {
  let world = w, career = c;
  if (delegated(career, 'lineup') && career.tactics?.xi) career = { ...career, tactics: { ...career.tactics, xi: null } };
  if (delegated(career, 'tactics') && m) career = pickTactics(world, career, m);
  if (delegated(career, 'scouting') && m && !career.scouted?.[m.key]) {
    const opp = m.sides.find((s) => s.clubId !== career.clubId)?.clubId;
    // The scout only pays for a report when the opponent is a real test.
    if (opp && strengthOf(world, opp) >= strengthOf(world, career.clubId) - 3) {
      const full = startLike(world, career, m);
      const r = full && makeReport(world, career, full);
      if (r) {
        world = r.world;
        career = log(r.career, 'scouting', 'report', { s: opp });
        // A delegated tactics job uses the report's counter plan.
        if (delegated(career, 'tactics')) {
          const t = career.tactics ?? DEFAULT_TACTICS;
          career = { ...career, tactics: { ...t, pressing: r.report.plan.pressing, trap: r.report.plan.trap, philosophy: (career.mastery?.[r.report.plan.philosophy] ?? 0) >= 50 ? r.report.plan.philosophy : t.philosophy } };
        }
      }
    }
  }
  return { world, career };
}

// The full match state for the report and the odds, built fresh with the current tactics.
const startLike = (w: World, c: Career, m: { key: string }) => { const full = nextUserMatch(w, c); return full && full.key === m.key ? full : null; };

// The assistant picks the formation whose best XI is strongest (within the licence), and a mentality from the odds.
function pickTactics(w: World, c: Career, m: { sides: { clubId: string }[]; key: string }): Career {
  const squad = squadOf(w, c.clubId);
  const lic = c.coach?.licence ?? 'ELITE';
  const good = q(c, 'tactics') >= 50;
  const cur = (c.tactics ?? DEFAULT_TACTICS).formation;
  const score = (f: FormationId) => autoXI(squad, f).reduce((s, p, i) => s + slotValue(p, FORMATIONS[f].slots[i]?.pos ?? 'CM'), 0) + FORMATIONS[f].attack * (good ? 2 : 0);
  // Only change shape for a clear gain (about half a rating point per player), so the team keeps a settled system.
  let best: FormationId = cur, bestV = hasLicence(lic, formationNeeds(cur)) ? score(cur) + 5 : -1;
  for (const f of FORMATION_IDS) {
    if (f === cur || !hasLicence(lic, formationNeeds(f))) continue;
    const v = score(f);
    if (v > bestV) { bestV = v; best = f; }
  }
  const t = { ...(c.tactics ?? DEFAULT_TACTICS), formation: best, xi: null };
  let next: Career = { ...c, tactics: t };
  const full = startLike(w, next, m);
  if (full) {
    const mine = full.sides[0].clubId === c.clubId ? 0 : 1;
    const p = predict(full, (id) => playerOf(w, id)!);
    const [win, , loss] = mine === 0 ? p : [p[2], p[1], p[0]];
    const mentality = win > 0.55 ? 1 : loss > 0.5 ? -1 : 0;
    next = { ...next, tactics: { ...t, mentality } };
  }
  if (best !== (c.tactics ?? DEFAULT_TACTICS).formation) next = log(next, 'tactics', 'formation', { s: best });
  return next;
}

// ---------- every matchday ----------

// Runs after each league matchday (from playDay), for every delegated duty.
export function staffWeek(w: World, c: Career): { world: World; career: Career } {
  let world = w, career = c;
  const step = (f: (w: World, c: Career) => { world: World; career: Career }) => ({ world, career } = f(world, career));
  if (delegated(career, 'training')) step(training);
  if (delegated(career, 'medical')) step(medical);
  if (delegated(career, 'morale')) step(morale);
  if (delegated(career, 'academy')) step(academy);
  if (delegated(career, 'selling')) step(selling);
  if (delegated(career, 'contracts')) step(contracts);
  if (delegated(career, 'signing')) step(signing);
  if (delegated(career, 'loans')) step(loans);
  if (delegated(career, 'sponsors')) step(sponsors);
  if (delegated(career, 'tickets')) step(tickets);
  // This runs after the matchday was counted: file what was done under the matchday just played.
  const added = (career.staffLog?.length ?? 0) - (c.staffLog?.length ?? 0);
  if (added > 0 || (career.staffLog?.[0] && career.staffLog[0] !== c.staffLog?.[0])) {
    const fresh = new Set(career.staffLog!.filter((l) => !(c.staffLog ?? []).includes(l)));
    career = { ...career, staffLog: career.staffLog!.map((l) => (fresh.has(l) ? { ...l, round: Math.max(0, l.round - 1) } : l)) };
  }
  return { world, career };
}

// Fitness coach: training load from the squad's condition, development points on the best young players.
// Hard weeks only in the opening matchdays (the pre-season window) with a fresh squad; never mid-season.
const PRESEASON_ROUNDS = 3;
function training(w: World, c: Career) {
  let world = w, career = c;
  const squad = squadOf(world, career.clubId);
  const fit = squad.reduce((s, p) => s + p.fitness, 0) / Math.max(1, squad.length);
  const load = (fit < 80 ? 0 : fit > 95 && career.round < PRESEASON_ROUNDS ? 2 : 1) as 0 | 1 | 2;
  if (load !== career.ops.training.load) {
    career = log({ ...career, ops: { ...career.ops, training: { ...career.ops.training, load } } }, 'training', 'load', { n: load });
  }
  if (career.ops.devPoints >= DEV_COST.rating) {
    const pool = squadOf(world, career.clubId).filter((p) => !atCeiling(p) && career.season - p.birthYear <= 24);
    // A good coach backs the biggest gap between rating and potential; a weak one just the best player.
    const pickP = q(career, 'training') >= 55
      ? pool.sort((a, b) => (b.potential - b.rating) - (a.potential - a.rating))[0]
      : pool.sort((a, b) => b.rating - a.rating)[0];
    if (pickP) {
      ({ world, career } = useDev(world, career, pickP, 'rating'));
      career = log(career, 'training', 'dev', { pn: pickP.name });
    }
  }
  return { world, career };
}

// Doctor: pays for rehab on longer injuries when the club can easily afford it.
function medical(w: World, c: Career) {
  let world = w, career = c;
  const cost = treatmentCost(world, career, 'rehab');
  for (const p of squadOf(world, career.clubId).filter((x) => x.injured >= 3).slice(0, 2)) {
    if (clubOf(world, career).budget < cost * 8) break;
    const r = treat(world, career, p, 'rehab');
    if (r.ok) { world = r.world; career = log(r.career, 'medical', 'rehab', { pn: p.name }); }
  }
  return { world, career };
}

// Psychologist: a team talk (development points) when morale sags.
function morale(w: World, c: Career) {
  const squad = squadOf(w, c.clubId);
  const avg = squad.reduce((s, p) => s + p.morale, 0) / Math.max(1, squad.length);
  const floor = 45 + Math.round(q(c, 'morale') / 10);
  if (avg < floor && c.ops.devPoints >= DEV_COST.morale) {
    const r = useDev(w, c, null, 'morale');
    return { world: r.world, career: log(r.career, 'morale', 'talk', { n: Math.round(avg) }) };
  }
  return { world: w, career: c };
}

// Chief scout: keeps the academy stocked, promotes the ready ones, sells on the rest.
function academy(w: World, c: Career) {
  let world = w, career = c;
  const squad = squadOf(world, career.clubId);
  const bar = squad.map((p) => p.rating).sort((a, b) => b - a)[Math.min(17, squad.length - 1)] ?? 60;
  for (const kid of [...career.ops.academy]) {
    if (kid.rating >= bar - 2 && squadOf(world, career.clubId).length < 28) {
      const r = promote(world, career, kid.id);
      if (r.ok) { world = r.world; career = log(r.career, 'academy', 'promote', { pn: kid.name }); }
    }
  }
  if (career.ops.academy.length >= ACADEMY_MAX) {
    const weakest = [...career.ops.academy].sort((a, b) => a.potential - b.potential)[0];
    if (weakest && weakest.potential < 70) { const r = sellRights(world, career, weakest.id); world = r.world; career = log(r.career, 'academy', 'sold', { pn: weakest.name, n: r.fee }); }
  }
  if (career.ops.academy.length < 3 && career.round % 4 === 1 && clubOf(world, career).budget > scoutCost(world, career) * 6) {
    const r = scoutProspects(world, career);
    if (r.ok) { world = r.world; career = log(r.career, 'academy', 'scouted', { n: r.found }); }
  }
  return { world, career };
}

// Sporting director: answers bids. Sells squad players at a good price, keeps the best XI unless the bid is huge.
function selling(w: World, c: Career) {
  let world = w, career = c;
  const core = new Set(squadOf(world, career.clubId).sort((a, b) => b.rating - a.rating).slice(0, 11).map((p) => p.id));
  const greed = 1.05 + q(career, 'selling') / 500; // better directors hold out for more
  for (const o of [...career.offers]) {
    const p = playerOf(world, o.playerId);
    if (!p) continue;
    const want = p.marketValue * (core.has(p.id) ? greed + 0.35 : p.listed ? 0.85 : greed);
    if (o.fee >= want && canSell(world, career, o).ok) {
      ({ world, career } = acceptOffer(world, career, o));
      career = log(career, 'selling', 'sold', { pn: p.name, n: o.fee, s: o.clubId });
    } else if (c.round - o.round >= 1) {
      career = log(rejectOffer(career, o), 'selling', 'rejected', { pn: p.name, n: o.fee });
    }
  }
  // Too many players: list the lowest-rated ones beyond 26.
  const sq = squadOf(world, career.clubId).filter((p) => !loanOf(career, p.id)).sort((a, b) => b.rating - a.rating);
  for (const p of sq.slice(26)) if (!p.listed) {
    world = { ...world, players: world.players.map((x) => (x.id === p.id ? { ...x, listed: true } : x)) };
    career = log(career, 'selling', 'listed', { pn: p.name });
  }
  return { world, career };
}

// Sporting director: renews the players worth keeping from matchday 5, lets the rest run down.
function contracts(w: World, c: Career) {
  let world = w, career = c;
  if (career.round < 5) return { world, career };
  const squad = squadOf(world, career.clubId).filter((p) => !loanOf(career, p.id));
  const keepBar = squad.map((p) => p.rating).sort((a, b) => b - a)[Math.min(19, squad.length - 1)] ?? 0;
  for (const p of squad.filter((x) => x.contractUntil <= career.season + 1)) {
    const age = career.season - p.birthYear;
    const worth = p.rating >= keepBar || (age <= 22 && p.potential >= keepBar + 3);
    if (!worth || age >= 33) continue;
    const d = renewDemand(p, career.season, balanceOf(career).wages);
    const years = Math.min(d.maxYears, age <= 26 ? 4 : 2);
    if (judgeRenewal(world, career, p, d.wage, years).ok) {
      world = renew(world, career, p, d.wage, years);
      career = log(career, 'contracts', 'renewed', { pn: p.name, n: years, s: String(d.wage) });
    }
  }
  return { world, career };
}

// Sporting director + chief scout: one signing per matchday while a window is open, for the thinnest position.
const NEED: Record<number, number> = { 0: 2, 1: 7, 2: 6, 3: 4 }; // GK, DEF, MID, ATT
function signing(w: World, c: Career) {
  let world = w, career = c;
  const free = !windowOf(career);
  const squad = squadOf(world, career.clubId);
  if (squad.length >= SQUAD_MAX - 4) return { world, career };
  const groups = [0, 1, 2, 3].map((g) => squad.filter((p) => GROUP_OF[p.position] === g));
  const g = [0, 1, 2, 3].sort((a, b) => groups[a].length / NEED[a] - groups[b].length / NEED[b])[0];
  if (groups[g].length >= NEED[g] && squad.length >= 22) return { world, career };
  const club = clubOf(world, career);
  const room = club.wageCap - wageBillOf(world, career.clubId);
  const weakest = Math.min(...(groups[g].length ? groups[g].map((p) => p.rating) : [0]));
  const scout = staffQ(career.ops, 'scout');
  const r = makeRng(career.seed ^ (career.season * 17 + career.round));
  // A better scout looks through more of the market.
  const pool = world.players
    .filter((p) => p.clubId !== career.clubId && GROUP_OF[p.position] === g && p.injured === 0 && !loanOf(career, p.id))
    .filter((p) => (free ? p.clubId === FREE_AGENT : true))
    .filter((p) => p.rating >= Math.max(weakest, strengthOf(world, career.clubId) - 12) && p.rating <= strengthOf(world, career.clubId) + 8)
    .filter(() => r() < 0.25 + scout / 150);
  const m = balanceOf(career);
  const options = pool
    .map((p) => ({ p, fee: askingPrice(world, p, m.prices), wage: wageDemand(world, p, career.clubId, 'rotation', m.wages) }))
    .filter((x) => x.fee <= club.budget * 0.35 && x.wage <= room)
    .sort((a, b) => (b.p.rating - a.p.rating) * 1e7 - (b.fee - a.fee) / Math.max(1, b.p.rating) + (b.p.potential - a.p.potential));
  for (const o of options.slice(0, 3)) {
    const bid = { fee: o.fee, wage: o.wage, years: career.season - o.p.birthYear <= 26 ? 4 : 2, role: 'rotation' as const };
    if (judgeBid(world, career, o.p, bid).ok) {
      const from = o.p.clubId;
      ({ world, career } = buy(world, career, o.p, bid));
      return { world, career: log(career, 'signing', 'signed', { pn: o.p.name, n: o.fee, s: from }) };
    }
  }
  return { world, career };
}

// Sporting director: loans out young players who aren't getting games (two per window at most).
function loans(w: World, c: Career) {
  let world = w, career = c;
  if (!windowOf(career) || loansOut(career).length >= 2) return { world, career };
  const squad = squadOf(world, career.clubId).sort((a, b) => b.rating - a.rating);
  const spare = squad.slice(18).filter((p) => career.season - p.birthYear <= 21 && !loanOf(career, p.id));
  const p = spare[0];
  if (p && canLoanOut(world, career, p).ok) {
    const to = loanClubs(world, career, p)[0];
    if (to) { ({ world, career } = loanOut(world, career, p, to)); career = log(career, 'loans', 'out', { pn: p.name, s: to }); }
  }
  return { world, career };
}

// Sporting director: signs the best offer for every empty sponsor slot.
function sponsors(w: World, c: Career) {
  let career = c;
  for (const slot of SLOTS) {
    if (career.ops.sponsors.some((s) => s.slot === slot)) continue;
    const best = career.ops.sponsorOffers.filter((d) => d.slot === slot).sort((a, b) => b.monthly - a.monthly)[0];
    if (best) career = log(signSponsor(career, best), 'sponsors', 'signed', { pn: best.brand, n: best.monthly, s: slot });
  }
  return { world: w, career };
}

// Sporting director: sets the ticket price that brings in the most money without emptying the stands.
function tickets(w: World, c: Career) {
  if (c.round % 4 !== 0) return { world: w, career: c };
  const ref = refPrice(w, clubOf(w, c));
  let best = c.ops.ticket, bestV = attendance(w, c, best) * best;
  for (const k of [0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.45]) {
    const price = Math.round(ref * k * 10) / 10;
    const v = attendance(w, c, price) * price * (1 - Math.max(0, k - 1.2) * 0.2); // full grounds keep the fans happy
    if (v > bestV) { bestV = v; best = price; }
  }
  if (best === c.ops.ticket) return { world: w, career: c };
  return { world: w, career: log({ ...c, ops: { ...c.ops, ticket: best } }, 'tickets', 'price', { s: best < 10 ? `€${best.toFixed(1)}` : money(Math.round(best)) }) };
}
