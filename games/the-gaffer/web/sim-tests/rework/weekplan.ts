// Rework §F: "The fitness coach's week" on Training is exactly what he does when Fitness is delegated. Over a run of
// weeks with Fitness delegated, after each staff week the proposal read on that same state is what he set. (Read before
// the week it can be a step behind: the analyst's report on the next opponent lands during the week and turns the
// focus to "opposition".) node sim-tests/build.mjs rework/weekplan
import { generateRealWorld } from '../../src/sim/seed';
import { newCareer, seasonOver } from '../../src/sim/season';
import { advance } from '../../src/sim/clock';
import { dispatch } from '../../src/sim/commands';
import { staffWeek, weekPlan } from '../../src/sim/staff';

let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
let w = generateRealWorld(7);
let c = newCareer(w, 7, 'eng-aston-villa', 'Test', { age: 40, nationality: 'ENG' }, 2026);
const r = dispatch(w, c, { type: 'delegation.set', dept: 'fitness', level: 'staff' });
ok(r.ok, 'Fitness delegated to the staff');
if (r.ok) { w = r.world; c = r.career; }
let weeks = 0, same = 0;
const seen = new Set<string>();
for (let i = 0; i < 40 && !seasonOver(c); i++) {
  const s = staffWeek(w, c);
  const plan = weekPlan(s.world, s.career);
  weeks++;
  if (s.career.ops.training.load === plan.load && s.career.prep === plan.focus) same++;
  seen.add(`${plan.load}:${plan.focus}`);
  const a = advance(s.world, s.career); w = a.world; c = a.career;
}
ok(same === weeks, `the proposal is what he then does, every week (${same} of ${weeks})`);
console.log('  proposals seen:', [...seen].join(', '));
ok(seen.size >= 2, 'it changes with the squad and the opponent');
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
