// B3: the new roles on the pitch. The same seeded matches twice (Extended): the home side with every slot in its
// default role, then with one slot in the new role. In the frames that matter for the role (with the ball in their
// half for in-possession roles; without it for out-of-possession ones), where that player is on average against
// where the default man was: each role must move the way it says (deeper, higher, wider, inside).
//   node sim-tests/build.mjs rolespitch [matches=64]
import { generateWorld, playerOf } from '../src/sim/world';
import { startMatch, stepMinute, type LiveMatch } from '../src/sim/match';
import { playOver } from '../src/sim/engine/clock';
import { newAnim, setPitchDebug, tick } from '../src/ui2/pitch/sim';
import { RATES, minuteMs, shownOf } from '../src/sim/highlights';
import { FORMATIONS, fullTactics, type FormationId } from '../src/sim/tactics';
import { planOf } from '../src/sim/engine/phases';
import { ROLES, type RoleId } from '../src/sim/engine/roles';
setPitchDebug(true);
const w = generateWorld(7); const get = (id: string) => playerOf(w, id)!;
const top = w.clubs.filter((c) => ['eng1', 'esp1', 'ita1', 'ger1', 'fra1'].includes(c.leagueId));
const N = +(process.argv[2] ?? 64), W = 68; // press_fullback acts only with the ball on its flank: 4 matches gave ~300 frames, 32 still swung ±0.8 m; 64 (~45 min) is stable
type Want = { depth?: 1 | -1; wide?: 1 | -1; when?: 'theirFlank' }; // when: only the frames the role is for
const CASES: [RoleId, FormationId, Want][] = [
  ['mezzala', '4-3-3', { depth: 1, wide: 1 }], ['wide_playmaker', '4-3-3', { wide: -1 }], ['deep_forward', '4-3-3', { depth: -1 }],
  ['poacher', '4-3-3', { depth: 1 }], ['libero', '4-3-3', { depth: 1 }], ['half_back', '4-3-3', { depth: -1 }],
  ['cover', '4-3-3', { depth: -1 }], ['press_fullback', '4-3-3', { depth: 1, when: 'theirFlank' }], ['tuck_in', '4-3-3', { wide: -1 }],
];
function run(role: RoleId, f: FormationId, i: number, when?: string): { d: number; y: number; n: number } {
  const def = ROLES[role], pos = def.pos[0], ip = def.phase === 'ip';
  let m = startMatch(w, null, top[(i * 7) % top.length].id, top[(i * 13 + 5) % top.length].id, `rp-${i}`, 1, true);
  m.sides[0].ai = false;
  m.sides[0].tactics = { ...m.sides[0].tactics, formation: f, oop: f, roles: undefined, oopRoles: undefined, fullback: 0, striker: 0 };
  const plan = planOf(fullTactics(m.sides[0].tactics));
  const k = plan.slots.findIndex((s) => s.pos === pos);
  const arr = [...plan[def.phase]] as string[]; arr[k] = role;
  m.sides[0].tactics = { ...m.sides[0].tactics, [ip ? 'roles' : 'oopRoles']: arr };
  const a: any = newAnim(m, w);
  let prevTo = -1, d = 0, y = 0, n = 0;
  while (!playOver(m)) {
    const nx: LiveMatch = JSON.parse(JSON.stringify(m)); stepMinute(nx, get); m = nx;
    const ms = minuteMs(m, 2, RATES[1], prevTo); const sh = shownOf(m, 2, prevTo); prevTo = sh ? sh.to : -1;
    for (let t = 0; t < ms; t += 1000 / 30) {
      tick(a, m, w, 1000 / 30, ms, true, 2, 2400);
      if (!sh || a.sp || !a.pos[0][k]) continue;
      const has = a.poss === 0 && a.carrier >= 0; // the home side attacks towards x = 105
      if (ip ? !(has && a.ball.x > 40) : (has || a.ball.x > 70)) continue;
      if (when === 'theirFlank' && !(a.ball.x > 55 && Math.abs(a.ball.y - W / 2) > 14 && (a.ball.y < W / 2) === (a.pos[0][k].y < W / 2))) continue;
      d += a.pos[0][k].x; y += Math.abs(a.pos[0][k].y - W / 2); n++;
    }
  }
  return { d, y, n };
}
const avg = (role: RoleId, f: FormationId, when?: string) => { const o = { d: 0, y: 0, n: 0 }; for (let i = 0; i < N; i++) { const x = run(role, f, i, when); o.d += x.d; o.y += x.y; o.n += x.n; } return { d: o.d / o.n, y: o.y / o.n, n: o.n }; };
let fails = 0;
for (const [role, f, want] of CASES) {
  const def = ROLES[role], dflt = (Object.keys(ROLES) as RoleId[]).find((r) => ROLES[r].phase === def.phase && ROLES[r].def?.includes(def.pos[0]))!;
  const b = avg(dflt, f, want.when), v = avg(role, f, want.when);
  const dd = v.d - b.d, dy = v.y - b.y;
  const okD = !want.depth || (Math.sign(dd) === want.depth && Math.abs(dd) > 1), okY = !want.wide || (Math.sign(dy) === want.wide && Math.abs(dy) > 1);
  if (!(okD && okY)) fails++;
  console.log(`${okD && okY ? 'ok  ' : 'FAIL'} ${role} vs ${dflt}: ${dd >= 0 ? '+' : ''}${dd.toFixed(1)} m up the pitch, ${dy >= 0 ? '+' : ''}${dy.toFixed(1)} m wider (${v.n} frames)`);
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
