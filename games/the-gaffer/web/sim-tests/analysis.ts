// Post-match analysis (sim/analysis.ts): read from the event log and the tally, so its numbers must agree with the
// match's own: shots and goals per side, xG, duels, and each shot inside the pitch.
import { generateWorld, playerOf } from '../src/sim/world';
import { simulate, startMatch, derive } from '../src/sim/match';
import { analysisOf, sourcesOf } from '../src/sim/analysis';

const w = generateWorld(7);
const get = (id: string) => playerOf(w, id)!;
const top = w.clubs.filter((c) => ['eng1', 'esp1', 'ita1', 'ger1', 'fra1'].includes(c.leagueId));
let fails = 0;
const ok = (c: boolean, msg: string) => { if (!c) { console.log(`FAIL ${msg}`); fails++; } };
let n = 0;
for (let i = 0; i < 100; i++) {
  const m = startMatch(w, null, top[(i * 7) % top.length].id, top[(i * 13 + 5) % top.length].id, `ana-${i}`, 1, true);
  simulate(m, get); derive(m);
  for (const me of [0, 1] as const) {
    const a = analysisOf(m, me);
    for (const s of [0, 1] as const) {
      const shots = a.shots.filter((x) => x.side === s);
      ok(shots.length === m.stats[s][1], `match ${i} side ${s}: ${shots.length} shots on the map, ${m.stats[s][1]} in the stats`);
      ok(shots.filter((x) => x.res === 'g').length === m.events.filter((e) => e.kind === 'goal' && e.side === s).length, `match ${i} side ${s}: goals`);
      ok(Math.abs(sourcesOf(a, s).reduce((t, r) => t + r.xg, 0) - shots.reduce((t, x) => t + x.xg, 0)) < 1e-9, `match ${i}: sources add up`);
    }
    ok(a.shots.every((x) => x.z >= 0 && x.z < 30), `match ${i}: shots inside the pitch`);
    const duels = m.events.filter((e) => e.kind === 'duel').length;
    const won = Object.values(a.players).reduce((t, p) => t + p.won, 0), lost = Object.values(a.players).reduce((t, p) => t + p.lost, 0);
    ok(won <= duels && lost <= duels && won + lost <= 2 * duels, `match ${i}: duel counts`);
  }
  n++;
}
console.log(fails ? `${fails} FAILED` : `ok   ${n} matches: shots, goals, xG by source and duels agree with the match`);
process.exit(fails ? 1 : 0);
