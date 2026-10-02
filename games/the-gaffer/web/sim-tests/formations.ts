// B2: formation balance. For fixtures between clubs of similar strength (from every top league), the home side's
// expected points (closed form, engine/solve) in each formation, with its own players re-slotted and the AI's plan
// against it. No shape may be a free win: each within FORM_MAX of the average. Also a simulated check: the same
// fixtures played out in the formation with the highest and the lowest closed-form value.
//   node sim-tests/build.mjs formations [fixtures=400] [simulated=200]   (FIT=0: with the clubs' own players, not judged)
import { generateWorld, playerOf, strengthOf } from '../src/sim/world';
import { startMatch, expected, simulate } from '../src/sim/match';
import { FORMATIONS, FORMATION_IDS, type FormationId } from '../src/sim/tactics';
import type { LiveMatch } from '../src/sim/match';
import { pointsLeft, withTactics } from '../src/sim/engine/story';
const FORM_MAX = 0.03;
const w = generateWorld(7);
const get = (id: string) => playerOf(w, id)!;
const N = +(process.argv[2] ?? 400), S = +(process.argv[3] ?? 200);
console.log(FIT ? '  the shape itself (every player a natural in his slot)' : '  with the clubs\' own players (FIT=0): not judged');
const pairs: [string, string][] = [];
for (const lg of ['eng1', 'esp1', 'ita1', 'ger1', 'fra1', 'egy1']) {
  const cs = w.clubs.filter((c) => c.leagueId === lg).sort((a, b) => strengthOf(w, b.id) - strengthOf(w, a.id));
  for (let k = 0; k + 1 < cs.length; k++) pairs.push([cs[k].id, cs[k + 1].id], [cs[k + 1].id, cs[k].id]);
}
// The rule is about the shape itself: every home player plays his slot as a natural. With the clubs' own players (FIT=0)
// the shapes squads are built for come out ahead, as they should (reported, not judged).
const FIT = process.env.FIT !== '0';
const fitted = (m2: LiveMatch) => {
  if (!FIT) return get;
  const slots = FORMATIONS[m2.sides[0].tactics.formation].slots, pos = new Map(m2.sides[0].onPitch.map((id, k) => [id, slots[k].pos]));
  return (id: string) => { const p = get(id); const q = pos.get(id); return q ? { ...p, position: q } : p; };
};
const sum: Record<string, number> = {}, xf: Record<string, number> = {}, xa: Record<string, number> = {}; let n = 0;
for (let i = 0; i < Math.min(N, pairs.length * 4); i++) {
  const [h, a] = pairs[i % pairs.length];
  const m = startMatch(w, null, h, a, `fm-${i}`, 0, false);
  for (const f of FORMATION_IDS) { const m2 = withTactics(m, 0, { formation: f, oop: f }, get), g2 = fitted(m2), R = expected(m2, g2); sum[f] = (sum[f] ?? 0) + pointsLeft(m2, 0, R); xf[f] = (xf[f] ?? 0) + R.xg[0]; xa[f] = (xa[f] ?? 0) + R.xg[1]; }
  n++;
}
const mean = FORMATION_IDS.reduce((s, f) => s + sum[f], 0) / FORMATION_IDS.length / n;
let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
console.log(`  ${n} fixtures, average ${mean.toFixed(3)} expected points for the home side`);
for (const f of FORMATION_IDS) { const v = sum[f] / n, d = v / mean - 1, t = `${f}: ${v.toFixed(3)} (${d >= 0 ? '+' : ''}${(100 * d).toFixed(1)}%), xG for ${(xf[f] / n).toFixed(2)} against ${(xa[f] / n).toFixed(2)}`; if (FIT) ok(d <= FORM_MAX, `${t} (≤ +${100 * FORM_MAX}%)`); else console.log(`  ${t}`); }
// Simulated: the best and the worst shape by the closed form, played out.
const ranked = [...FORMATION_IDS].sort((x, y) => sum[y] - sum[x]);
for (const f of [ranked[0], ranked[ranked.length - 1]] as FormationId[]) {
  let pts = 0, g = 0;
  for (let i = 0; i < S; i++) {
    const [h, a] = pairs[i % pairs.length];
    const m = startMatch(w, null, h, a, `fs-${i}`, 0, false);
    const m2 = withTactics(m, 0, { formation: f, oop: f }, get);
    simulate(m2, fitted(m2));
    pts += m2.goals[0] > m2.goals[1] ? 3 : m2.goals[0] === m2.goals[1] ? 1 : 0; g += m2.goals[0] + m2.goals[1];
  }
  console.log(`  simulated ${S}: ${f} takes ${(pts / S).toFixed(3)} points a match, ${(g / S).toFixed(2)} goals`);
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
