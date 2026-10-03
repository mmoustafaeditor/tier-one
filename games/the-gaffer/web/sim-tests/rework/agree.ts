// Rework M4 exit gate: everything the player sees agrees with the engine's own event log, over many matches, not a
// hand-picked few (referee.ts `agrees` does the same on its handful). League and cup knockouts (extra time, penalties),
// stepped minute by minute like the live screen. Per match:
//   score = goal events; stats = derived from the log; cards and shots in the stats = events; nobody acts after a red;
//   commentary: one line per goal, every VAR review and disallowed goal read; ratings ignore disallowed goals;
//   highlights: no goal, penalty, red card or disallowed goal is ever skipped in "key moments" (or any fuller mode);
//   the "Why it happened" analysis has the same goals and the same xG as the match; minutes stop at a red card.
// node sim-tests/build.mjs rework/agree [matches=400]
import { generateRealWorld } from '../../src/sim/seed';
import { playerOf } from '../../src/sim/world';
import { derive, startMatch, stepMinute, type LiveMatch, type MatchEvent } from '../../src/sim/match';
import { playOver } from '../../src/sim/engine/clock';
import { explain } from '../../src/sim/engine/story';
import { shownOf, type HlMode } from '../../src/sim/highlights';
import { matchRatings } from '../../src/sim/ratings';
import { minutesOf, reconcile } from '../../src/sim/record';
import { commentary } from '../../src/ui2/commentary';
import { UI } from '../../src/i18n';
import { R_EN } from '../../src/lang-ref';

const N = +(process.argv[2] ?? 400);
const w = generateRealWorld(7);
const get = (id: string) => playerOf(w, id)!;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const clubs = w.clubs.filter((c) => ['eng1', 'esp1', 'ita1', 'ger1', 'fra1', 'egy1'].includes(c.leagueId));
const eng = w.clubs.filter((c) => c.leagueId === 'eng1');
const name = (id: string) => get(id)?.name.en ?? id;

const fail = new Map<string, string[]>();
const check = (c: boolean, what: string, key: string) => { if (!c) { const l = fail.get(what) ?? []; l.push(key); fail.set(what, l); } };
const KEY = (e: MatchEvent) => e.kind === 'goal' || e.kind === 'pen' || e.kind === 'red' || e.kind === 'nogoal';
let played = 0, goals = 0, reds = 0, vars = 0, nogoals = 0, pens = 0, et = 0, keyMoments = 0;

for (let i = 0; i < N; i++) {
  const cup = i % 4 === 3; // every fourth match a cup knockout, so extra time and penalties come up
  const pool = cup ? eng : clubs;
  const h = pool[(i * 7) % pool.length], a = pool[(i * 13 + 5) % pool.length];
  if (h.id === a.id) continue;
  const key = `agree-${i}`;
  const m: LiveMatch = cup ? startMatch(w, null, h.id, a.id, key, 10, true, { id: 'eng_cup', stage: 16 }) : startMatch(w, null, h.id, a.id, key, 5, true);
  // Minute by minute, like the live screen: each key moment must be shown in every highlight mode from "key" up.
  let guard = 0;
  while (!playOver(m) && guard++ < 200) {
    stepMinute(m, get);
    const now = m.events.filter((e) => e.min === m.minute && (e.plus ?? 0) === (m.plus ?? 0) && KEY(e));
    if (now.length) {
      keyMoments++;
      for (const mode of [1, 2, 3, 4] as HlMode[]) check(!!shownOf(m, mode), `highlights: a key moment is shown in mode ${mode}`, `${key}@${m.minute}`);
    }
  }
  played++;
  const ev = m.events;
  goals += m.goals[0] + m.goals[1]; reds += ev.filter((e) => e.kind === 'red').length; vars += ev.filter((e) => e.kind === 'var').length;
  nogoals += ev.filter((e) => e.kind === 'nogoal').length; pens += m.pens ? 1 : 0; et += m.minute > 90 ? 1 : 0;
  for (const s of [0, 1] as const) check(ev.filter((e) => e.kind === 'goal' && e.side === s).length === m.goals[s], 'score = goal events', key);
  const st = clone(m); derive(st);
  check(JSON.stringify(st.stats) === JSON.stringify(m.stats), 'stats are derived from the log', key);
  for (const s of [0, 1] as const) {
    check(m.stats[s][5] === ev.filter((e) => e.kind === 'yellow' && e.side === s).length && m.stats[s][6] === ev.filter((e) => e.kind === 'red' && e.side === s).length, 'cards in the stats = card events', key);
    const shots = ev.filter((e) => (e.kind === 'goal' || e.kind === 'miss' || e.kind === 'block' ? e.side === s : e.kind === 'save' && e.side !== s)).length;
    check(m.stats[s][1] === shots, 'shots in the stats = shot events (no disallowed goals)', key);
  }
  check(reconcile({ key: m.key, goals: m.goals, events: ev } as never).length === 0, 'nobody acts after his red card', key);
  const lines = commentary(m, UI.en as never, name, (s) => m.sides[s].clubId, R_EN, m.ref!.n.en);
  check(lines.filter((l) => l.ev?.kind === 'goal' && l.cls.includes('goal') && !l.cls.includes('after')).length === m.goals[0] + m.goals[1], 'commentary: one line per goal', key);
  for (const e of ev.filter((x) => x.kind === 'var')) check(lines.some((l) => l.text === R_EN.varLine(e.note ?? '', m.ref!.n.en, name(e.playerId))), 'commentary reads every VAR review', key);
  check(lines.filter((l) => l.ev?.kind === 'nogoal').length === ev.filter((e) => e.kind === 'nogoal').length, 'commentary reads every disallowed goal', key);
  const noNogoal = clone(m); noNogoal.events = noNogoal.events.filter((e) => e.kind !== 'nogoal' && e.kind !== 'var');
  check(JSON.stringify(matchRatings(m, get as never)) === JSON.stringify(matchRatings(noNogoal, get as never)), 'ratings ignore disallowed goals and reviews', key);
  const why = explain(m, 0, get, false);
  check(why.goals[0] === m.goals[0] && why.goals[1] === m.goals[1], '"Why it happened": the same score', key);
  const r1 = (v: number) => Math.round(Math.round(v * 100) / 10) / 10;
  check(why.xg[0] === r1(m.xg?.[0] ?? 0) && why.xg[1] === r1(m.xg?.[1] ?? 0), '"Why it happened": the same xG as the match', key);
  const mins = minutesOf(m);
  for (const e of ev.filter((x) => x.kind === 'red')) check(mins[e.playerId] <= e.min && !m.sides[e.side].onPitch.includes(e.playerId), 'a sent-off player is off, and his minutes stop', key);
}

console.log(`${played} matches (${Math.round(played / 4)} cup ties: ${et} to extra time, ${pens} to penalties): ${goals} goals, ${keyMoments} key-moment minutes, ${reds} reds, ${vars} VAR reviews, ${nogoals} disallowed goals`);
const WHAT = ['score = goal events', 'stats are derived from the log', 'cards in the stats = card events', 'shots in the stats = shot events (no disallowed goals)',
  'nobody acts after his red card', 'commentary: one line per goal', 'commentary reads every VAR review', 'commentary reads every disallowed goal',
  'ratings ignore disallowed goals and reviews', '"Why it happened": the same score', '"Why it happened": the same xG as the match',
  'a sent-off player is off, and his minutes stop', ...[1, 2, 3, 4].map((x) => `highlights: a key moment is shown in mode ${x}`)];
let fails = 0;
for (const what of WHAT) {
  const f = fail.get(what);
  console.log(`${f ? 'FAIL' : 'ok  '} ${what}${f ? ` — ${f.length} cases, e.g. ${f.slice(0, 4).join(', ')}` : ''}`);
  if (f) fails++;
}
ok0();
function ok0() { if (vars === 0 || pens === 0 || reds === 0) { console.log('FAIL the sample has VAR reviews, red cards and shoot-outs to check'); fails++; } else console.log('ok   the sample has VAR reviews, red cards and shoot-outs to check'); }
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
