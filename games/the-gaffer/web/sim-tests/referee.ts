// Officials (gf-ref): a batch of matches for the averages, and deterministic end-to-end scenarios.
// Usage: node sim-tests/build.mjs referee [batch|scenarios|all] [matches]
//
// Each scenario plays a real match (FULL, the user's) whose key is searched deterministically for the incident, then
// checks that the event timeline, the score, the stats, the ratings, the commentary, player availability, the next
// match's suspension, a mid-match save/reload and the saved match record all agree.
import { generateWorld, playerOf, squadOf, type World } from '../src/sim/world';
import { newCareer, nextUserMatch, leagueOf } from '../src/sim/season';
import { canSub, derive, expected, simulate, startMatch, userSub, type LiveMatch, type MatchEvent } from '../src/sim/match';
import { advance } from '../src/sim/clock';
import { makeSave, parseSave } from '../src/sim/save';
import { matchRatings } from '../src/sim/ratings';
import { minutesOf, reconcile } from '../src/sim/record';
import { commentary } from '../src/ui2/commentary';
import { UI } from '../src/i18n';
import { R_EN } from '../src/lang-ref';
import { RS, RSN } from '../src/sim/engine/referee';
import { playOver } from '../src/sim/engine/clock';
import { availableIn } from '../src/sim/tactics';
import type { Career } from '../src/model/types';

const mode = process.argv[2] ?? 'all';
const N = +(process.argv[3] ?? 1000);
let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const t = UI.en;

// ---------- batch ----------
function batch() {
  const top = ['eng1', 'esp1', 'ita1', 'ger1', 'fra1'];
  const acc: Record<string, number> = {};
  const add = (k: string, v: number) => { acc[k] = (acc[k] ?? 0) + v; };
  let n = 0;
  const t0 = performance.now();
  for (const seed of [7, 8, 9, 10]) {
    const w = generateWorld(seed);
    const get = (id: string) => playerOf(w, id)!;
    const clubs = w.clubs.filter((c) => top.includes(c.leagueId));
    for (let k = 0; n < N && k < Math.ceil(N / 4) + 5; k++) {
      const h = clubs[(k * 7) % clubs.length], lg = clubs.filter((c) => c.leagueId === h.leagueId), a = lg[(k * 13 + 5) % lg.length];
      if (h.id === a.id) continue;
      const m = startMatch(w, null, h.id, a.id, `batch:${seed}:${k}`, 0, k % 10 === 0);
      simulate(m, get);
      n++;
      const c = (f: (e: MatchEvent) => boolean) => m.events.filter(f).length;
      const rs = (x: keyof typeof RS) => m.ref!.rs[RS[x]] + m.ref!.rs[RSN + RS[x]];
      add('goals', m.goals[0] + m.goals[1]); add('fouls', c((e) => e.kind === 'foul')); add('advantage', c((e) => e.kind === 'foul' && e.note === 'adv'));
      add('yellows', c((e) => e.kind === 'yellow')); add('reds', c((e) => e.kind === 'red')); add('secondYellows', c((e) => e.kind === 'red' && e.how === '2y'));
      add('penalties', c((e) => e.kind === 'pen')); add('offsides', rs('off')); add('corners', c((e) => e.kind === 'corner'));
      add('freeKicks', rs('fk')); add('indirectFKs', rs('ifk')); add('throwIns', rs('ti')); add('goalKicks', rs('gk'));
      add('varChecksShown', m.ref!.checks); add('onFieldReviews', m.ref!.ofr); add('overturned', m.ref!.over); add('goalsDisallowed', c((e) => e.kind === 'nogoal'));
      add('addedTime', (m.added?.[0] ?? 0) + (m.added?.[1] ?? 0));
      if (reconcile({ ...m, events: m.events, goals: m.goals } as never).length) add('reconcileErrors', 1);
    }
  }
  const per = Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, +(v / n).toFixed(3)]));
  console.log(JSON.stringify({ matches: n, msPerMatch: +((performance.now() - t0) / n).toFixed(2) }));
  console.log(JSON.stringify(per));
  // Approximate top-flight averages (recalled, not cited): fouls 20-24, yellows 3.5-4.5, reds 0.1-0.15, pens 0.25-0.3, offsides ~4.
  ok(per.fouls >= 20 && per.fouls <= 25, `fouls per match ${per.fouls} in 20–25`);
  ok(per.yellows >= 3.4 && per.yellows <= 4.6, `yellows per match ${per.yellows} in 3.4–4.6`);
  ok(per.reds >= 0.08 && per.reds <= 0.17, `reds per match ${per.reds} in 0.08–0.17`);
  ok(per.penalties >= 0.2 && per.penalties <= 0.34, `penalties per match ${per.penalties} in 0.20–0.34`);
  ok(per.offsides >= 3 && per.offsides <= 5, `offsides per match ${per.offsides} in 3–5`);
  ok(!per.reconcileErrors, 'score and log reconcile in every match');
}

// ---------- one match: everything agrees ----------
function agrees(m: LiveMatch, get: (id: string) => ReturnType<typeof playerOf> & object, label: string) {
  const ev = m.events;
  for (const i of [0, 1] as const) ok(ev.filter((e) => e.kind === 'goal' && e.side === i).length === m.goals[i], `${label}: side ${i} score ${m.goals[i]} = goal events`);
  const st = clone(m); derive(st);
  ok(JSON.stringify(st.stats) === JSON.stringify(m.stats), `${label}: stats are the log's`);
  for (const i of [0, 1] as const) {
    ok(m.stats[i][5] === ev.filter((e) => e.kind === 'yellow' && e.side === i).length && m.stats[i][6] === ev.filter((e) => e.kind === 'red' && e.side === i).length, `${label}: side ${i} cards in stats = events`);
    const shots = ev.filter((e) => (e.kind === 'goal' || e.kind === 'miss' || e.kind === 'block' ? e.side === i : e.kind === 'save' && e.side !== i)).length;
    ok(m.stats[i][1] === shots, `${label}: side ${i} shots exclude disallowed goals (${shots})`);
  }
  ok(reconcile({ key: m.key, goals: m.goals, events: ev } as never).length === 0, `${label}: nobody acts after his red card`);
  // Ratings: a disallowed goal changes nothing.
  const noNogoal = clone(m); noNogoal.events = noNogoal.events.filter((e) => e.kind !== 'nogoal' && e.kind !== 'var');
  ok(JSON.stringify(matchRatings(m, get as never)) === JSON.stringify(matchRatings(noNogoal, get as never)), `${label}: ratings ignore disallowed goals and reviews`);
  // Commentary: every goal once, every VAR review, every disallowed goal; the goal lines match the score.
  const name = (id: string) => get(id)?.name.en ?? id;
  const lines = commentary(m, t as never, name, (i) => m.sides[i].clubId, R_EN, m.ref!.n.en);
  ok(lines.filter((l) => l.ev?.kind === 'goal' && l.cls.includes('goal') && !l.cls.includes('after')).length === m.goals[0] + m.goals[1], `${label}: commentary has one line per goal`);
  for (const e of ev.filter((x) => x.kind === 'var')) ok(lines.some((l) => l.text === R_EN.varLine(e.note ?? '', m.ref!.n.en, name(e.playerId))), `${label}: commentary reads the VAR ${e.note}`);
  ok(lines.filter((l) => l.ev?.kind === 'nogoal').length === ev.filter((e) => e.kind === 'nogoal').length, `${label}: commentary reads each disallowed goal`);
  // Sent-off players: off the pitch, not on the bench, minutes stop at the red.
  const mins = minutesOf(m);
  for (const e of ev.filter((x) => x.kind === 'red')) {
    ok(!m.sides[e.side].onPitch.includes(e.playerId) && !m.sides[e.side].bench.includes(e.playerId), `${label}: ${name(e.playerId)} (red ${e.min}′) is off for good`);
    ok(mins[e.playerId] <= e.min, `${label}: his minutes stop at ${e.min}′ (${mins[e.playerId]})`);
  }
}

// Plays the user's next match with keys tried in order until `want` holds; returns the key and the finished match.
function search(w: World, c: Career, want: (m: LiveMatch) => boolean, tries = 1500): { key: string; m: LiveMatch } | null {
  const get = (id: string) => playerOf(w, id)!;
  const m0 = nextUserMatch(w, c)!;
  for (let k = 0; k < tries; k++) {
    const m = clone(m0); m.key = `${m0.key}#${k}`;
    simulate(m, get);
    if (want(m)) return { key: m.key, m };
  }
  return null;
}

// Mid-match save/reload: play to `stop`, save the career with the live match, load it, play on. Same match?
async function reload(w: World, c: Career, key: string, stop: number, whole: LiveMatch, label: string) {
  const get = (id: string) => playerOf(w, id)!;
  const m = clone(nextUserMatch(w, c)!); m.key = key;
  simulate(m, get, stop);
  const save = await makeSave(w, { ...c, live: m });
  const res = await parseSave(JSON.stringify(save));
  ok(res.ok, `${label}: mid-match save at ${stop}′ loads`);
  if (!res.ok) return;
  const live = res.save.career!.live!;
  ok(JSON.stringify(live.events) === JSON.stringify(m.events) && JSON.stringify(live.ref) === JSON.stringify(m.ref), `${label}: the saved match keeps its events and incidents`);
  const w2 = { ...w, ...res.save.world } as World;
  simulate(live, (id) => playerOf(w2, id)!);
  ok(JSON.stringify(live.events) === JSON.stringify(whole.events) && live.goals.join() === whole.goals.join(), `${label}: resumed after reload, the match plays out the same (${live.goals.join('-')})`);
}

async function afterMatch(w: World, c: Career, m: LiveMatch, label: string) {
  const s = advance(w, { ...c, live: null }, m);
  const rec = s.career.matches![0];
  ok(rec.goals.join() === m.goals.join(), `${label}: saved match record score ${rec.goals.join('-')}`);
  const cards = m.events.filter((e) => e.kind === 'red' || (e.kind === 'yellow' && !m.events.some((x) => x.kind === 'red' && x.how === '2y' && x.playerId === e.playerId && x.min === e.min)));
  ok(rec.cards?.length === cards.length, `${label}: saved record has the ${cards.length} cards`);
  ok((rec.vars?.length ?? 0) === m.events.filter((e) => e.kind === 'var').length, `${label}: saved record has the VAR reviews`);
  ok((rec.nogoals?.length ?? 0) === m.events.filter((e) => e.kind === 'nogoal').length, `${label}: saved record has the disallowed goals`);
  ok(!!s.after && s.after.mine + s.after.theirs === m.goals[0] + m.goals[1] && s.after.cards.length === cards.length, `${label}: the report agrees (score, cards)`);
  // Save and reload the career after the match.
  const res = await parseSave(JSON.stringify(await makeSave(s.world, s.career)));
  ok(res.ok, `${label}: career save after the match loads`);
  return { world: res.ok ? res.save.world as World : s.world, career: res.ok ? res.save.career! : s.career };
}

// The next league match of a club: is the player in its squad for it?
function nextMatchHas(w: World, c: Career, clubId: string, pid: string): boolean {
  const lid = leagueOf(w, clubId);
  const f = c.fixtures[lid][c.round]?.find((x) => x[0] === clubId || x[1] === clubId);
  if (!f) return false;
  const m = startMatch(w, clubId === c.clubId ? c : null, f[0], f[1], 'next', c.round);
  const s = m.sides[m.sides[0].clubId === clubId ? 0 : 1];
  return s.onPitch.includes(pid) || s.bench.includes(pid);
}

async function scenarios() {
  const w = generateWorld(7);
  const club = w.clubs.filter((x) => x.leagueId === 'eng1').sort((a, b) => a.id.localeCompare(b.id))[3];
  const c = newCareer(w, 7, club.id, 'Test', { age: 40, nationality: 'ENG' }, 2026);
  const get = (id: string) => playerOf(w, id)!;
  ok(!!nextUserMatch(w, c)?.ref?.var, `${club.id}: Premier Division 2026/27 has VAR`);

  // 1. Decision stands: a goal checked by VAR stands, and a red card is shown (banned for the next match).
  {
    const L = 'stands';
    const f = search(w, c, (m) => m.events.some((e) => e.kind === 'var' && e.note === 'goal:check:stands:goal') && m.events.some((e) => e.kind === 'red' && e.how !== '2y'));
    ok(!!f, `${L}: found a match (${f?.key})`);
    if (f) {
      const { m } = f;
      const v = m.events.find((e) => e.kind === 'var' && e.note === 'goal:check:stands:goal')!;
      const goal = m.events[m.events.indexOf(v) - 1];
      ok(goal.kind === 'goal' && goal.playerId === v.playerId, `${L}: the goal (${goal.min}′) is on the timeline, then the check`);
      agrees(m, get as never, L);
      const red = m.events.find((e) => e.kind === 'red')!;
      await reload(w, c, f.key, red.min + 1, m, L);
      const after = await afterMatch(w, c, m, L);
      const p = playerOf(after.world, red.playerId)!;
      ok(p.banned >= 1, `${L}: ${p.name.en} (red, ${red.how}) is banned for ${p.banned} league match(es)`);
      ok(!availableIn(p) && !nextMatchHas(after.world, after.career, p.clubId, p.id), `${L}: and is left out of his club's next match`);
    }
  }

  // 2. Decision overturned: a goal disallowed by VAR (offside, a foul or handball in the build-up).
  {
    const L = 'overturned (goal)';
    const f = search(w, c, (m) => m.events.some((e) => e.kind === 'var' && /^goal:(check|ofr):over:(offside|apf|ahand)$/.test(e.note ?? '')));
    ok(!!f, `${L}: found a match (${f?.key})`);
    if (f) {
      const { m } = f;
      const v = m.events.find((e) => e.kind === 'var' && /^goal:(check|ofr):over:/.test(e.note ?? ''))!;
      const ng = m.events[m.events.indexOf(v) - 1];
      ok(ng.kind === 'nogoal' && ng.playerId === v.playerId, `${L}: the ball in the net is logged as no goal (${ng.min}′, ${ng.note}), then the review`);
      const inc = m.ref!.inc.find((x) => x.k === 'goal' && x.rev?.res === 'over' && x.by === ng.playerId)!;
      ok(!!inc && inc.call.d === 'goal' && inc.fin.d === 'nogoal', `${L}: the incident reads goal → VAR ${inc?.rev?.t} → no goal`);
      ok(!m.events.some((e) => e.kind === 'goal' && e.min === ng.min && e.playerId === ng.playerId), `${L}: no goal event for it`);
      agrees(m, get as never, L);
      await reload(w, c, f.key, ng.min + 1, m, L);
      await afterMatch(w, c, m, L);
    }
  }

  // 3. Decision overturned: a red card rescinded on review (downgraded, or a wrong second yellow).
  {
    const L = 'overturned (red)';
    const f = search(w, c, (m) => m.events.some((e) => e.kind === 'var' && /^(redDown|2y):ofr:over$/.test(e.note ?? '')), 4000);
    ok(!!f, `${L}: found a match (${f?.key})`);
    if (f) {
      const { m } = f;
      const v = m.events.find((e) => e.kind === 'var' && /^(redDown|2y):ofr:over$/.test(e.note ?? ''))!;
      const pid = v.playerId;
      const inc = m.ref!.inc.find((x) => x.rev?.why === v.note!.split(':')[0] && (x.call.to === pid || x.by === pid))!;
      ok(!!inc && (inc.call.card === 'R' || inc.call.card === 'Y') && inc.fin.card !== 'R', `${L}: incident ${inc?.call.card} on the field → ${inc?.fin.card ?? 'no card'} after review`);
      ok(!m.events.some((e) => e.kind === 'red' && e.playerId === pid && e.min === v.min), `${L}: no red card for ${get(pid).name.en} at ${v.min}′`);
      const later = m.events.find((e, i) => i > m.events.indexOf(v) && e.playerId === pid && (e.kind === 'duel' || e.kind === 'foul' || e.kind === 'miss' || e.kind === 'goal' || e.kind === 'block' || e.kind === 'sub'));
      ok(m.sides.some((s) => s.onPitch.includes(pid)) || !!later, `${L}: he plays on (${later ? `${later.kind} at ${later.min}′` : 'on the pitch at the end'})`);
      agrees(m, get as never, L);
      await reload(w, c, f.key, v.min + 1, m, L);
      const after = await afterMatch(w, c, m, L);
      const p = playerOf(after.world, pid)!;
      const redLater = m.events.some((e) => e.kind === 'red' && e.playerId === pid);
      ok(redLater || p.banned === 0, `${L}: ${p.name.en} is not suspended (banned ${p.banned})`);
      ok(redLater || availableIn(p), `${L}: and is available for the next match`);
    }
  }

  // 4. A sending-off: the side plays on with ten; nobody replaces him; the engine rates the side lower.
  {
    const L = 'ten men';
    const f = search(w, c, (m) => m.events.some((e) => e.kind === 'red' && e.min <= 60));
    ok(!!f, `${L}: found a match (${f?.key})`);
    if (f) {
      const red = f.m.events.find((e) => e.kind === 'red')!;
      const m = clone(nextUserMatch(w, c)!); m.key = f.key;
      simulate(m, get, red.min);
      if (!m.events.some((e) => e.kind === 'red')) simulate(m, get, red.min + 1);
      const s = m.sides[red.side];
      ok(s.onPitch.filter(Boolean).length === 10, `${L}: ${s.onPitch.filter(Boolean).length} on the pitch after the red at ${red.min}′`);
      const empty = s.onPitch.indexOf('');
      const bench0 = s.bench[0];
      ok(!userSub(m, red.side, '', bench0), `${L}: the empty place can't be filled`);
      ok(!s.bench.includes(red.playerId) && !userSub(m, red.side, s.onPitch.find(Boolean)!, red.playerId), `${L}: he can't come back on`);
      const R1 = expected(m, get);
      const m11 = clone(m); m11.sides[red.side].onPitch[empty] = red.playerId;
      const R0 = expected(m11, get);
      const gd = (R: typeof R1) => R.goals[red.side] - R.goals[1 - red.side];
      // One sending-off depends on who it was (a full-back costs less than a centre-back), so the engine's rating of a
      // ten-man side is checked as the average over losing each outfield player in turn at this moment.
      const drops: number[] = [];
      for (let i = 0; i < m11.sides[red.side].onPitch.length; i++) {
        const id = m11.sides[red.side].onPitch[i];
        if (!id || i === 0) continue; // keep the goalkeeper (slot 0)
        const mx = clone(m11); mx.sides[red.side].onPitch[i] = '';
        drops.push(gd(R0) - gd(expected(mx, get)));
      }
      const avg = drops.reduce((s, x) => s + x, 0) / Math.max(1, drops.length);
      ok(gd(R1) < gd(R0) && avg > 0.3, `${L}: the engine's goal difference per 90 for the ten: ${gd(R0).toFixed(2)} → ${gd(R1).toFixed(2)} for this red; ${avg.toFixed(2)} lower on average over losing any outfield player (${drops.map((d) => d.toFixed(2)).join(' ')})`);
      simulate(m, get);
      ok(JSON.stringify(m.events) === JSON.stringify(f.m.events), `${L}: the match plays out the same when stepped in parts`);
      ok(!m.events.some((e, i) => i > m.events.indexOf(m.events.find((x) => x.kind === 'red')!) && (e.playerId === red.playerId || e.assistId === red.playerId || e.inId === red.playerId)), `${L}: no events for him after the red`);
      ok(m.sides[red.side].onPitch.filter(Boolean).length <= 10, `${L}: still ten (or fewer) at the whistle`);
      agrees(m, get as never, L);
    }
  }

  // 5. A cup knockout that goes to extra time and penalties.
  {
    const L = 'cup knockout';
    const eng = w.clubs.filter((x) => x.leagueId === 'eng1');
    let found: LiveMatch | null = null;
    for (let k = 0; k < 400 && !found; k++) {
      const h = eng[k % eng.length], a = eng[(k * 7 + 3) % eng.length];
      if (h.id === a.id) continue;
      const m = startMatch(w, null, h.id, a.id, `cup:${k}`, 10, true, { id: 'eng_cup', stage: 16 });
      simulate(m, get);
      if (m.pens) found = m;
    }
    ok(!!found, `${L}: found a tie that went to penalties (${found?.key})`);
    if (found) {
      const m = found;
      ok(!!m.ref?.var, `${L}: English Cup round of 16 uses VAR`);
      ok(m.minute === 120 && playOver(m), `${L}: 120 minutes played (+${m.added?.join('/+')})`);
      ok(m.added?.length === 4 && m.added.every((x) => x !== undefined), `${L}: added time at 45, 90, 105 and 120`);
      ok(m.events.some((e) => e.min > 90), `${L}: events in extra time`);
      const et = m.events.filter((e) => e.kind === 'sub' && e.min > 90);
      ok(m.sides.every((s) => s.subs <= 6), `${L}: at most six changes each (${m.sides.map((s) => s.subs).join('/')}; ${et.length} in extra time)`);
      ok(m.goals[0] === m.goals[1] && !!m.kicks?.length && m.pens![0] !== m.pens![1], `${L}: ${m.goals.join('-')} after 120, penalties ${m.pens!.join('-')}`);
      agrees(m, get as never, L);
      const lines = commentary(m, t as never, (id) => get(id)?.name.en ?? id, (i) => m.sides[i].clubId, R_EN, m.ref!.n.en);
      ok(lines.some((l) => l.text === R_EN.c.et) && lines.some((l) => l.text === R_EN.c.shootout), `${L}: commentary calls extra time and the shoot-out`);
    }
    // A league match never goes beyond added time; a group game ends level.
    const lm = startMatch(w, null, eng[0].id, eng[1].id, 'league:x', 0, false);
    simulate(lm, get);
    ok(lm.minute === 90 && !lm.pens, `league match ends at 90+${lm.added?.[1]} with no penalties`);
  }

  // 6. Suspensions are per competition: a cup ban doesn't keep him out of the league, and back.
  {
    const L = 'per competition';
    const p0 = squadOf(w, club.id)[0];
    const p = { ...p0, sus: { eng_cup: 1 } };
    ok(!availableIn(p, 'eng_cup') && availableIn(p), `${L}: a cup ban: out of the cup, available in the league`);
    const q = { ...p0, banned: 1 };
    ok(availableIn(q, 'eng_cup') && !availableIn(q), `${L}: a league ban: out of the league, available in the cup`);
    const w2 = { ...w, players: w.players.map((x) => (x.id === p0.id ? p : x)) } as World;
    const other = w.clubs.find((x) => x.leagueId === 'eng1' && x.id !== club.id)!;
    const cm = startMatch(w2, null, club.id, other.id, 'cupban', 5, false, { id: 'eng_cup', stage: 32 });
    const lm = startMatch(w2, null, club.id, other.id, 'leagueok', 5, false);
    ok(![...cm.sides[0].onPitch, ...cm.sides[0].bench].includes(p0.id), `${L}: the AI leaves him out of the cup tie`);
    ok([...lm.sides[0].onPitch, ...lm.sides[0].bench].includes(p0.id) || p0.injured > 0, `${L}: and picks him in the league`);
  }
  void canSub;
}

if (mode === 'batch' || mode === 'all') batch();
if (mode === 'scenarios' || mode === 'all') await scenarios();
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
