// Closed-form averages over fixtures across leagues (no simulation): the quickest way to tune the engine's constants.
import { generateWorld, playerOf, strengthOf } from '../src/sim/world';
import { startMatch, expected, outcome } from '../src/sim/match';
import { SHOTS } from '../src/sim/engine/model';
const w = generateWorld(7);
const get = (id: string) => playerOf(w, id)!;
const clubs = w.clubs.filter((c) => ['eng1', 'esp1', 'egy1', 'eng2', 'ksa1', 'ita1', 'ger1'].includes(c.leagueId));
let n = 0; const acc: Record<string, number> = {};
const add = (k: string, v: number) => { acc[k] = (acc[k] ?? 0) + v; };
const gap: Record<string, number[]> = {};
for (let k = 0; k < 160; k++) {
  const h = clubs[(k * 7) % clubs.length], lg = clubs.filter((c) => c.leagueId === h.leagueId), a = lg[(k * 13 + 5) % lg.length];
  if (h.id === a.id) continue;
  const m = startMatch(w, null, h.id, a.id, `t${k}`, 0, false);
  const R = expected(m, get);
  n++;
  add('goals', R.goals[0] + R.goals[1]); add('hg', R.goals[0]); add('ag', R.goals[1]);
  add('shots', R.shots[0] + R.shots[1]); add('xg', R.xg[0] + R.xg[1]); add('corners', R.corners[0] + R.corners[1]); add('fouls', R.fouls[0] + R.fouls[1]);
  const [W, D] = outcome(R.goals, 90); add('hw', W); add('dr', D);
  SHOTS.forEach((s, i) => add('xg_' + s, R.xgBy[0][i] + R.xgBy[1][i]));
  const g = Math.max(-12, Math.min(12, Math.round((strengthOf(w, h.id) - strengthOf(w, a.id)) / 4) * 4));
  (gap[g] ??= [0, 0, 0]); gap[g][0]++; gap[g][1] += W; gap[g][2] += D;
}
console.log(JSON.stringify(Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, +(v / n).toFixed(3)]))));
console.log(JSON.stringify(Object.fromEntries(Object.entries(gap).sort((a, b) => +a[0] - +b[0]).map(([k, v]) => [k, `${v[0]}: W${Math.round(100 * v[1] / v[0])} D${Math.round(100 * v[2] / v[0])}`]))));
