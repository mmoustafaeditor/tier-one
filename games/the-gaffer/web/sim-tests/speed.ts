// Timing: model build, closed-form solve, a FAST match, a FULL match.
import { generateWorld, playerOf } from '../src/sim/world';
import { startMatch, simulate, modelOf, expected } from '../src/sim/match';
const w = generateWorld(7);
const get = (id: string) => playerOf(w, id)!;
const clubs = w.clubs.filter((c) => c.leagueId === 'eng1');
const m = startMatch(w, null, clubs[0].id, clubs[1].id, 'sp', 0, false);
const time = (label: string, n: number, f: (i: number) => void) => { const t0 = performance.now(); for (let i = 0; i < n; i++) f(i); console.log(label, ((performance.now() - t0) / n).toFixed(3), 'ms'); };
time('build', 3000, () => modelOf(m, get));
time('expected', 1000, () => expected(m, get));
time('fast match', 200, (i) => { const x = startMatch(w, null, clubs[i % 20].id, clubs[(i + 3) % 20].id, 'f' + i, 0, false); simulate(x, get); });
time('full match', 20, (i) => { const x = startMatch(w, null, clubs[i % 20].id, clubs[(i + 3) % 20].id, 'F' + i, 0, true); simulate(x, get); });
time('start only', 200, (i) => startMatch(w, null, clubs[i % 20].id, clubs[(i + 3) % 20].id, 'f' + i, 0, false));
