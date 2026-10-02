// B3: role balance. For each role (old and new), the home side's expected points over even fixtures with ONE player in
// that role (the first slot of a shape that has his position) against the same plan with the default role there.
// Rule: no role is a free win (≤ +3% over its position's default). Also reports how each role moves the side's xG
// for and against (its trade-off).
//   node sim-tests/build.mjs rolebal [fixtures=300]
import { generateWorld, playerOf, strengthOf } from '../src/sim/world';
import { startMatch, expected } from '../src/sim/match';
import { FORMATIONS, fullTactics, type FormationId } from '../src/sim/tactics';
import { pointsLeft, withTactics } from '../src/sim/engine/story';
import { planOf } from '../src/sim/engine/phases';
import { ROLES, ROLE_IDS, isDefault } from '../src/sim/engine/roles';
const MAX = 0.03;
const w = generateWorld(7); const get = (id: string) => playerOf(w, id)!;
const N = +(process.argv[2] ?? 300);
const pairs: [string, string][] = [];
for (const lg of ['eng1', 'esp1', 'ita1', 'ger1', 'fra1', 'egy1']) { const cs = w.clubs.filter((c) => c.leagueId === lg).sort((a, b) => strengthOf(w, b.id) - strengthOf(w, a.id)); for (let k = 0; k + 1 < cs.length; k++) pairs.push([cs[k].id, cs[k + 1].id], [cs[k + 1].id, cs[k].id]); }
const SHAPE: Record<string, FormationId> = { GK: '4-3-3', CB: '4-3-3', LB: '4-3-3', RB: '4-3-3', CDM: '4-3-3', CM: '4-3-3', CAM: '4-2-3-1', LW: '4-3-3', RW: '4-3-3', ST: '4-3-3' };
let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const ms = Array.from({ length: N }, (_, i) => startMatch(w, null, pairs[i % pairs.length][0], pairs[i % pairs.length][1], `rb-${i}`, 0, false));
const ONLY = process.env.ONLY;
for (const id of ROLE_IDS.filter((r) => !isDefault(r) && (!ONLY || r === ONLY))) {
  const def = ROLES[id], pos = def.pos[0], f = SHAPE[pos];
  let base = 0, with_ = 0, xf0 = 0, xf1 = 0, xa0 = 0, xa1 = 0;
  for (const m of ms) {
    const m1 = withTactics(m, 0, { formation: f, oop: f, roles: undefined, oopRoles: undefined, fullback: 0, striker: 0 }, get); // (every slot in its default role: the old full-back and striker knobs neutral)
    const plan = planOf(fullTactics(m1.sides[0].tactics));
    const k = plan.slots.findIndex((s) => s.pos === pos);
    if (k < 0) continue;
    const arr = [...plan[def.phase]] as string[]; arr[k] = id;
    const m2 = withTactics(m1, 0, def.phase === 'ip' ? { roles: arr } : { oopRoles: arr }, get);
    const R0 = expected(m1, get), R1 = expected(m2, get);
    base += pointsLeft(m1, 0, R0); with_ += pointsLeft(m2, 0, R1);
    xf0 += R0.xg[0]; xf1 += R1.xg[0]; xa0 += R0.xg[1]; xa1 += R1.xg[1];
  }
  const d = with_ / base - 1;
  ok(d <= MAX, `${def.phase} ${id} (${pos}): ${d >= 0 ? '+' : ''}${(100 * d).toFixed(1)}% points, xG for ${(xf1 - xf0 >= 0 ? '+' : '')}${((xf1 - xf0) / N).toFixed(3)}, against ${(xa1 - xa0 >= 0 ? '+' : '')}${((xa1 - xa0) / N).toFixed(3)}`);
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
