// V2.7 club vision: the pre-season board meeting and facility build times. node sim-tests/build.mjs vision
import { generateRealWorld } from '../src/sim/seed';
import { newCareer } from '../src/sim/season';
import { advance } from '../src/sim/clock';
import { dispatch, type Command } from '../src/sim/commands';
import { decisions } from '../src/sim/decisions';
import { objectivesOf } from '../src/sim/coach';
import { kittyFor, strictness, userObjective } from '../src/sim/vision';
import { BUILD_DAYS, tickOf } from '../src/sim/economy';
import type { World } from '../src/sim/world';
import type { Career } from '../src/model/types';

let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const run = (w: World, c: Career, cmd: Command) => { const r = dispatch(w, c, cmd); if (!r.ok) throw new Error(`${cmd.type}: ${r.reason}`); return r; };

const w0 = generateRealWorld(7);
const c0 = newCareer(w0, 7, 'eng-brighton', 'Test', { age: 40, nationality: 'ENG' }, 2026);
const cash = (w: World) => w.clubs.find((x) => x.id === 'eng-brighton')!.budget;

// The meeting is on the desk on day one.
const d = decisions(w0, c0).find((x) => x.kind === 'vision');
ok(!!d && d.choices.length === 2 && d.choices.find((x) => x.pick)?.id === 'expected', 'the board meeting is on Today with the board\'s target as the staff pick');
const base = userObjective(w0, c0);

// Ambitious: target one step up, the owner's money, a stricter board.
const kitty = kittyFor(w0, c0);
const a = run(w0, c0, { type: 'vision.set', level: 'ambitious' });
ok(userObjective(a.world, a.career) !== base && objectivesOf(a.world, a.career).league === userObjective(a.world, a.career), `ambitious raises the league target: ${base} -> ${userObjective(a.world, a.career)}`);
ok(kitty > 0 && cash(a.world) === cash(w0) + kitty && a.career.ops.ledger.owner === kitty, `the owner adds ${kitty} (15% of cash), in the ledger`);
ok(strictness(a.career) === 5, 'the board is 5 points stricter');
ok(!dispatch(a.world, a.career, { type: 'vision.set', level: 'expected' }).ok, 'one meeting a season');
ok(!decisions(a.world, a.career).some((x) => x.kind === 'vision'), 'answered: gone from Today');

// Expected: the board's goodwill, nothing else.
const e = run(w0, c0, { type: 'vision.set', level: 'expected' });
ok(e.career.board.confidence === c0.board.confidence + 5 && cash(e.world) === cash(w0) && userObjective(e.world, e.career) === base && strictness(e.career) === 0, 'expected: board +5, same target, no money, normal board');

// Facility build: paid now, open after BUILD_DAYS matchdays; one project at a time.
let w = e.world, c = e.career;
const lvl = c.ops.facilities.training;
const before = cash(w);
({ world: w, career: c } = run(w, c, { type: 'facility.upgrade', facility: 'training' }));
ok(c.ops.facilities.training === lvl && !!c.ops.build && cash(w) < before, `training level ${lvl + 1} is paid for and under construction (${BUILD_DAYS[lvl + 1]} matchdays)`);
ok(!dispatch(w, c, { type: 'facility.upgrade', facility: 'medical' }).ok, 'a second build waits for the first');
// Build time is counted in league matchdays (cup days in between don't count).
const readyAt = c.ops.build!.readyAt;
let early = false;
while (tickOf(c) < readyAt) { if (c.ops.facilities.training !== lvl) early = true; const s = advance(w, c); w = s.world; c = s.career; }
ok(!early, 'not open a matchday early');
ok(c.ops.facilities.training === lvl + 1 && !c.ops.build, `open on the matchday it's due: level ${c.ops.facilities.training} at matchday ${c.round}`);
ok(!decisions(w, c).some((x) => x.kind === 'vision'), 'the meeting lapses after the first matchdays');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
