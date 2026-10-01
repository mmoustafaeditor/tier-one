// Foundation stage, step 3: an engine change that only adds information must not move a single result. Plays 200
// seeded FULL matches and prints one hash of every event, score, stat and tally (the pitch's flow is left out: that is
// where the new information goes). Compare the hash before and after a change.
// Usage: node sim-tests/build.mjs fingerprint [matches=200]
import { createHash } from 'node:crypto';
import { generateWorld, playerOf } from '../src/sim/world';
import { simulate, startMatch } from '../src/sim/match';

const N = +(process.argv[2] ?? 200);
const w = generateWorld(7);
const get = (id: string) => playerOf(w, id)!;
const top = w.clubs.filter((c) => ['eng1', 'esp1', 'ita1', 'ger1', 'fra1'].includes(c.leagueId));
const h = createHash('sha256');
let goals = 0;
for (let i = 0; i < N; i++) {
  const m = startMatch(w, null, top[(i * 7) % top.length].id, top[(i * 13 + 5) % top.length].id, `fp-${i}`, 1, true);
  simulate(m, get);
  const { flow: _flow, ...rest } = m;
  h.update(JSON.stringify(rest));
  goals += m.goals[0] + m.goals[1];
}
console.log(`${N} matches, ${goals} goals, fingerprint ${h.digest('hex').slice(0, 16)}`);
