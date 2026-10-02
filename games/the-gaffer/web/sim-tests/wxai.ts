// AI managers and the weather (engine/weather.ts weatherPlan): in the wind and the heat an AI side sets up for the
// day at kick-off. This plays the same matches with the plan kept by one side only and with it undone for both, and
// checks that the plan pays where it is made (a better xG difference and more points for the side that adapts),
// that it barely moves the goals, and that every other day plays exactly as before.
// Usage: node sim-tests/build.mjs wxai [matches per kind=2000]
import { generateWorld, playerOf } from '../src/sim/world';
import { setTactics, simulate, startMatch, stepMinute, type LiveMatch } from '../src/sim/match';

const N = +(process.argv[2] ?? 2000);
const w = generateWorld(7);
const get = (id: string) => playerOf(w, id)!;
const clubs = w.clubs.filter((c) => ['eng1', 'esp1', 'ita1', 'ger1', 'fra1', 'egy1', 'ksa1'].includes(c.leagueId));
const NAMES = ['clear', 'rain', 'heavy rain', 'wind', 'heat', 'snow'];
// keep[k]: side k keeps its kick-off weather plan; the other's is undone straight after minute 1.
function play(h: string, a: string, key: string, keep: [boolean, boolean]): LiveMatch {
  const m = startMatch(w, null, h, a, key, 1, false);
  const base = m.sides.map((s) => ({ ...s.tactics }));
  stepMinute(m, get);
  m.sides.forEach((_, k) => { if (!keep[k] && m.events.some((e) => e.side === k && /\|wx\d$/.test(e.note ?? ''))) setTactics(m, k as 0 | 1, base[k], 'undo'); });
  simulate(m, get);
  return m;
}
const pts = (m: LiveMatch, k: 0 | 1) => (m.goals[k] > m.goals[1 - k] ? 3 : m.goals[k] === m.goals[1 - k] ? 1 : 0);
type Acc = { n: number; pts: number; xgd: number; goals: number; changes: number };
const zero = (): Acc => ({ n: 0, pts: 0, xgd: 0, goals: 0, changes: 0 });
const on = NAMES.map(zero), off = NAMES.map(zero);
let same = 0, other = 0;
const seen = NAMES.map(() => 0);
for (let i = 0; (seen[3] < N || seen[4] < N) && i < N * 60; i++) {
  const h = clubs[(i * 7) % clubs.length], a = clubs[(i * 13 + 5) % clubs.length];
  if (h.id === a.id) continue;
  const wx = startMatch(w, null, h.id, a.id, `wxai-${i}`, 1, false).wx ?? 0;
  if (wx !== 3 && wx !== 4) {
    // Every other day: the plan does nothing, so the match is the one it always was (checked on a sample).
    if (other++ % 10) continue;
    const A = startMatch(w, null, h.id, a.id, `wxai-${i}`, 1, false), B = play(h.id, a.id, `wxai-${i}`, [false, false]);
    simulate(A, get);
    if (JSON.stringify(A.events) === JSON.stringify(B.events)) same++; else console.log(`  changed: wxai-${i} (${NAMES[wx]})`);
    seen[wx]++;
    continue;
  }
  if (seen[wx] >= N) continue;
  seen[wx]++;
  const k = (i % 2) as 0 | 1; // alternate who adapts so home advantage cancels out
  const A = play(h.id, a.id, `wxai-${i}`, k === 0 ? [true, false] : [false, true]);
  const B = play(h.id, a.id, `wxai-${i}`, [false, false]);
  const add = (x: Acc, m: LiveMatch) => { x.n++; x.pts += pts(m, k); x.xgd += (m.xg?.[k] ?? 0) - (m.xg?.[1 - k] ?? 0); x.goals += m.goals[0] + m.goals[1]; x.changes += m.events.filter((e) => e.kind === 'tactic' && e.side === k && /\|wx\d$/.test(e.note ?? '')).length; };
  add(on[wx], A); add(off[wx], B);
}
let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const others = seen.reduce((t, x, k) => t + (k === 3 || k === 4 ? 0 : x), 0);
for (const k of [3, 4]) {
  const A = on[k], B = off[k];
  const f = (x: number, d = 3) => (x / A.n).toFixed(d);
  console.log(`  ${NAMES[k].padEnd(5)} ${A.n} matches: points ${f(A.pts)} adapting vs ${f(B.pts)} not, xG difference ${f(A.xgd)} vs ${f(B.xgd)}, goals ${f(A.goals, 2)} vs ${f(B.goals, 2)}, changes made ${f(A.changes, 1)}`);
  ok(A.xgd > B.xgd && A.pts >= B.pts, `${NAMES[k]}: the side that adapts makes more of the day`);
  ok(Math.abs(A.goals / B.goals - 1) <= 0.04, `${NAMES[k]}: goals within 4% either way (${(100 * (A.goals / B.goals - 1)).toFixed(1)}%)`);
}
ok(same === others, `clear days, rain and snow play exactly as before (${same} of ${others} checked)`);
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
