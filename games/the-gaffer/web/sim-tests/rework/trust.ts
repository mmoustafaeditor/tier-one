// Rework Milestone 1 regression checks for the trust backlog (F01-F04, F09, F17). node sim-tests/build.mjs rework/trust
import { generateRealWorld } from '../../src/sim/seed';
import { newCareer, nextUserMatch } from '../../src/sim/season';
import { advance } from '../../src/sim/clock';
import { staffPrep } from '../../src/sim/staff';
import { xiFor, FORMATIONS, DEFAULT_TACTICS } from '../../src/sim/tactics';
import { squadOf, playerOf, objectiveOf, type World } from '../../src/sim/world';
import { dispatch } from '../../src/sim/commands';
import { simulate } from '../../src/sim/match';
import { dateOf } from '../../src/sim/calendar';
import { todayOf, stampDate, userTie } from '../../src/sim/cups';
import { raiseObjective, setVision, visionOf } from '../../src/sim/vision';
import { decisions } from '../../src/sim/decisions';
import { rcOf } from '../../src/sim/recruit/state';
import { recruitDecisions } from '../../src/sim/recruit/decide';
import { dealCost } from '../../src/sim/recruit/deals';
import { spendingRoom } from '../../src/sim/recruit/money';
import { moveTo } from '../../src/sim/coach';
import { lastMatchHere } from '../../src/sim/record';
import type { Career } from '../../src/model/types';

let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const seed = 7;
const W0 = generateRealWorld(seed);
const fresh = (club = 'egy-al-ahly') => ({ w: W0 as World, c: newCareer(W0, seed, club, 'Test', { age: 40, nationality: 'EGY' }, 2026) });
const clone = <T,>(x: T): T => structuredClone(x);

// ---------- F01: the manager's XI is the one that plays, in every way of playing the match ----------
{
  let { w, c } = fresh();
  const { xi } = xiFor(w, c);
  const gk = FORMATIONS[(c.tactics ?? DEFAULT_TACTICS).formation].slots.findIndex((s) => s.pos === 'GK');
  const backup = squadOf(w, c.clubId).find((p) => p.position === 'GK' && !xi.some((q) => q.id === p.id))!;
  const ids = xi.map((p) => p.id); ids[gk] = backup.id;
  const r = dispatch(w, c, { type: 'tactics.set', tactics: { ...(c.tactics ?? DEFAULT_TACTICS), xi: ids } } as never);
  w = r.world; c = r.career;
  const quick = advance(w, c);
  ok(!!quick.mine?.played.includes(backup.id), 'F01 quick result: the keeper the manager picked plays (delegated match prep)');
  ok(JSON.stringify(quick.career.tactics?.xi) === JSON.stringify(ids), 'F01 the pick is still his after the match');
  // Watched + Instant (Live.tsx): staffPrep, then the match the screen plays, simulated to the whistle with auto subs.
  const prep = staffPrep(w, c, nextUserMatch(w, c));
  const m = clone(nextUserMatch(prep.world, prep.career)!);
  const me = m.sides[0].clubId === c.clubId ? 0 : 1;
  ok(m.sides[me].onPitch.includes(backup.id), 'F01 watched: he is in the XI that walks out');
  m.sides[me].autoSubs = true;
  simulate(m, (id) => playerOf(prep.world, id)!);
  const watched = advance(prep.world, { ...prep.career, live: null }, m);
  ok(JSON.stringify(watched.mine!.goals) === JSON.stringify(quick.mine!.goals) && JSON.stringify([...watched.mine!.played].sort()) === JSON.stringify([...quick.mine!.played].sort()),
    `F01 same snapshot, same seed, no interventions: watched+instant ${watched.mine!.goals.join('-')} = quick ${quick.mine!.goals.join('-')}, same players`);
  // With no XI of his own the assistant still picks fresh (xi null stays null).
  const f = fresh();
  ok(advance(f.w, f.c).career.tactics?.xi == null, 'F01 no pick of his: the assistant keeps picking at kick-off');
  // A player picked but injured since is swapped out for the match, not forgotten.
  const hurt: World = { ...w, players: w.players.map((p) => (p.id === backup.id ? { ...p, injured: 2 } : p)) };
  const r2 = xiFor(hurt, c);
  ok(!r2.xi.some((p) => p.id === backup.id) && r2.replaced.some((p) => p.id === backup.id) && JSON.stringify(c.tactics?.xi) === JSON.stringify(ids), 'F01 injured since: swapped for the match, the pick itself unchanged');
}

// ---------- F02: one clock ----------
{
  const { w, c } = fresh();
  const t = todayOf(c);
  ok(t.getTime() === dateOf(c.season, 0).getTime() - 2 * 86400000, 'F02 today before the first matchday is the Thursday before it');
  ok(stampDate(c, c.season, c.round).getTime() === t.getTime(), 'F02 a message from this step is dated today, not the Saturday after');
  // Walk a season: today never passes the next fixture, cup ties included.
  let ww = w, cc = c, bad = 0, cupSteps = 0, steps = 0;
  for (let i = 0; i < 45 && cc.round < 30; i++) {
    const today = todayOf(cc);
    const tie = userTie(cc);
    if (tie) cupSteps++;
    const next = tie ? dateOf(cc.season, cc.round, true) : dateOf(cc.season, cc.round);
    if (today.getTime() >= next.getTime()) bad++;
    const s = advance(ww, cc); ww = s.world; cc = s.career; steps++;
  }
  ok(bad === 0, `F02 over ${steps} steps (${cupSteps} cup days) today is always before the next match (${bad} wrong)`);
}

// ---------- F03: one quote ----------
{
  let { w, c } = fresh();
  c = { ...c, dept: { ...(c.dept ?? {}), recruitment: 'ask' } as Career['dept'] };
  const target = w.players.find((p) => p.clubId !== c.clubId && p.rating >= 70 && p.clubId !== 'free')!;
  const rc = rcOf(c);
  const fee = { upfront: Math.round(target.marketValue * 0.6), inst: [Math.round(target.marketValue * 0.4)], sellOn: 0 };
  const neg = { id: 'neg-t', playerId: target.id, pn: target.name, from: target.clubId, stage: 'terms', opened: c.season * 100, bids: [], clubPatience: 3, answerAt: null, counter: null, rival: null, fee, rounds: [], patience: 3, due: c.season * 100 + c.round + 2 } as never;
  c = { ...c, rc: { ...rc, negs: [...rc.negs, neg] } } as Career;
  const card = recruitDecisions(w, c).find((d) => d.id.startsWith('rc:terms:neg-t'))!;
  const meet = card.choices.find((x) => x.id === 'meet')!;
  const shown = meet.fx.find((f) => f.key === 'rc.fx.room')!.n!;
  const fees = meet.fx.find((f) => f.key === 'rc.fx.fees')!.n!;
  const total = fee.upfront + fee.inst[0] + fees;
  ok(shown === spendingRoom(w, c, 'neg-t') - total, `F03 Today's "room after" (${shown}) = the room complete() checks minus the whole deal`);
  const q = dealCost(w, c, rcOf(c).negs[0], { wage: 1, years: 3, role: 'regular', signOn: 0, release: null, bonus: 0 });
  ok(q.roomAfter === spendingRoom(w, c, 'neg-t') - q.total, 'F03 the shared quote (Talks) uses the same rule');
}

// ---------- F04: aim higher only when there is a higher aim ----------
{
  const { w, c } = fresh();
  const base = objectiveOf(w, w.clubs.find((x) => x.id === c.clubId)!);
  const card = decisions(w, c).find((d) => d.kind === 'vision');
  ok(raiseObjective(base) === base && !!card && !card.choices.some((x) => x.id === 'ambitious'), `F04 ${c.clubId} (target ${base}): no "aim higher" choice`);
  ok(setVision(w, c, 'ambitious') === null, 'F04 the command refuses an ambitious season at the top of the ladder');
  const lower = fresh('eng-ipswich');
  const b2 = objectiveOf(lower.w, lower.w.clubs.find((x) => x.id === lower.c.clubId)!);
  const card2 = decisions(lower.w, lower.c).find((d) => d.kind === 'vision');
  ok(raiseObjective(b2) !== b2 && !!card2?.choices.some((x) => x.id === 'ambitious'), `F04 a club below the top (${b2}) can still aim higher`);
  const s = setVision(lower.w, lower.c, 'ambitious')!;
  const s2 = setVision(s.world, s.career, 'ambitious');
  ok(s2 === null && s.career.vision?.club === lower.c.clubId, 'F04 the owner\'s money is given once, to this club');
}

// ---------- F09: job move ----------
{
  let { w, c } = fresh('eng-liverpool');
  const s = advance(w, c); w = s.world; c = s.career;
  const v = setVision(w, { ...c, round: 0 }, 'expected')!;
  c = { ...v.career, round: c.round };
  const before = w.clubs.find((x) => x.id === 'eng-liverpool')!.budget;
  const owed = 5_000_000;
  const rc = rcOf(c);
  c = { ...c, rc: { ...rc, commits: [{ id: 'k1', playerId: 'x', pn: { en: 'X', ar: 'X' }, to: 'eng-arsenal', amount: owed, season: c.season + 1 }], negs: [{ id: 'n1', playerId: 'y', pn: { en: 'Y', ar: 'Y' }, from: 'eng-arsenal', stage: 'club', opened: 0, bids: [], clubPatience: 3, answerAt: c.season * 100 + 3, counter: null, rival: null, fee: null, rounds: [], patience: 3, due: null }] } } as Career;
  const m = moveTo(w, { ...c, jobs: ['ger-bayern'] }, 'ger-bayern');
  ok(!lastMatchHere(m.career), 'F09 after the move there is no "last time out" at Bayern yet (the Liverpool match is history, not Bayern\'s)');
  ok((m.career.matches ?? []).length === (c.matches ?? []).length, 'F09 the manager\'s own match history is kept');
  ok(!visionOf(m.career), 'F09 Liverpool\'s board meeting does not apply at Bayern');
  ok(rcOf(m.career).commits.length === 0 && m.world.clubs.find((x) => x.id === 'eng-liverpool')!.budget === before - owed, 'F09 Liverpool\'s instalments stay Liverpool\'s (settled from its budget, not Bayern\'s)');
  ok(rcOf(m.career).negs.every((n) => n.stage === 'collapsed'), 'F09 Liverpool\'s open talks end with the move');
}

// ---------- F17: saves ----------
{
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); }, clear: () => store.clear(), key: () => null, length: 0 } as Storage;
  const { store: save, loadSlot } = await import('../../src/sim/save');
  const { writeSlot } = await import('../../src/sim/slots');
  const { w, c } = fresh();
  ok((await save(w, c, 1)).ok, 'F17 a career saves into slot 1');
  const s2 = advance(w, c);
  ok((await save(s2.world, s2.career, 1)).ok, 'F17 and saves again a matchday later');
  const good = await loadSlot(1);
  ok(good.ok && good.save.career!.round === s2.career.round && !good.recovered, 'F17 the latest save loads');
  await writeSlot(1, 'GZ1:broken', null); // an interrupted / corrupt write
  const back = await loadSlot(1);
  ok(back.ok && back.recovered === true && back.save.career!.round === s2.career.round, 'F17 a corrupt latest save falls back to the one it replaced');
  ok((await loadSlot(2)).ok === false, 'F17 the other slot is untouched');
}

// ---------- M2: F05, F06, F08, F10 ----------
{
  const { autoXI: ax, slotValue, availabilityFor } = await import('../../src/sim/tactics');
  const { pct3 } = await import('../../src/ui2/util');
  const { promotionTerms, promoteKid } = await import('../../src/sim/youth');
  const { predict } = await import('../../src/sim/match');
  // F06: no man out of position while a natural player who'd be at least as good there sits out.
  for (const club of ['eng-liverpool', 'esp-real-madrid', 'egy-al-ahly', 'ger-bayern']) {
    const { w, c } = fresh(club);
    const squad = squadOf(w, c.clubId);
    const f = (c.tactics ?? DEFAULT_TACTICS).formation;
    const xi = ax(squad, f);
    const bad = xi.filter((p, i) => { const pos = FORMATIONS[f].slots[i].pos; return p.position !== pos && squad.some((q) => q.position === pos && !xi.includes(q) && q.injured === 0 && slotValue(q, pos) >= slotValue(p, pos)); });
    ok(bad.length === 0 && xi.length === 11 && new Set(xi.map((p) => p.id)).size === 11, `F06 ${club}: best XI has nobody out of position ahead of a better natural player (${bad.map((p) => p.name.en).join(', ') || 'none'})`);
  }
  // F08: the three outcomes always add up to 100.
  let off = 0;
  for (const club of W0.clubs.filter((x) => x.leagueId === 'egy1' || x.leagueId === 'eng1')) {
    const cc = newCareer(W0, seed, club.id, 'T', { age: 40, nationality: 'EGY' }, 2026);
    const m = nextUserMatch(W0, cc); if (!m) continue;
    const r = pct3(predict(m, (id) => playerOf(W0, id)!));
    if (r[0] + r[1] + r[2] !== 100) off++;
  }
  ok(off === 0 && pct3([0.3333, 0.3333, 0.3334]).reduce((a, b) => a + b, 0) === 100, 'F08 win/draw/loss shown always add up to 100');
  // F10: a cup ban counts for the cup match, not the league one; tired men are flagged, still available.
  const { w, c } = fresh();
  const sq = squadOf(w, c.clubId).map((p, i) => (i === 0 ? { ...p, sus: { 'egy-cup': 1 } } : i === 1 ? { ...p, fitness: 60 } : p));
  const cup = availabilityFor(sq, 'egy-cup'), lg = availabilityFor(sq, undefined);
  ok(!cup.available.includes(sq[0]) && cup.out.some((o) => o.p === sq[0] && o.why === 'banned') && lg.available.includes(sq[0]), 'F10 a cup-banned player is out for the cup match only');
  ok(lg.available.includes(sq[1]) && lg.out.some((o) => o.p === sq[1] && o.why === 'tired'), 'F10 a tired player is available but flagged');
  // F05: the promotion sheet shows exactly what the command applies.
  // A 17-year-old in our academy (the intake comes later in the season, so one is made from a squad player's record).
  const base = squadOf(w, c.clubId)[5];
  const kid = { ...base, id: 'kid-test', birthYear: c.season - 17, rating: 55, potential: 80, wage: 2000, contractUntil: c.season + 1 };
  const wk: World = { ...w, academy: [...(w.academy ?? []), kid] };
  if (kid) {
    const t = promotionTerms(wk, c, kid);
    const r = promoteKid(wk, c, kid.id);
    const p = typeof r === 'string' ? null : r.world.players.find((x) => x.id === kid.id);
    ok(!!p && p.wage === t.wage && p.contractUntil === t.until, `F05 promotion sheet terms = what promotion applies (${t.wage}/month to ${t.until})`);
  } else ok(false, 'F05 no academy player to promote in the test club');
}

// ---------- F07: succession picks look past the starter's age ----------
{
  const { scoutPicks } = await import('../../src/sim/recruit/picks');
  const { needs } = await import('../../src/sim/recruit/needs');
  let older = 0, total = 0;
  for (const club of ['egy-al-ahly', 'eng-liverpool', 'ita-inter', 'esp-barcelona', 'ger-bayern', 'fra-psg']) {
    const { w, c } = fresh(club);
    const succ = needs(w, c).filter((n) => n.why.includes('old'));
    for (const n of succ) {
      const top = scoutPicks(w, c, 3, [n])[0];
      const st = n.starter ? playerOf(w, n.starter) : undefined;
      if (!top || !st) continue;
      total++;
      if (top.age >= c.season - st.birthYear - 2) { older++; console.log(`  ${club} ${n.pos}: starter ${c.season - st.birthYear}, first pick ${top.p.name.en} ${top.age}`); }
    }
  }
  ok(total > 0 && older === 0, `F07 succession searches: the scouts' first pick is clearly younger than the ageing starter (${total - older}/${total})`);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
