// Foundation stage, step 4: injuries tied to fouls. Plays seeded matches and reports how many injuries there are, how
// long they keep players out, and how often a fouled player is hurt by offence (careless, reckless, serious foul play).
// Usage: node sim-tests/build.mjs injuries [matches=2000] [baseline injuries per match to compare with]
import { generateWorld, playerOf } from '../src/sim/world';
import { simulate, startMatch } from '../src/sim/match';

const N = +(process.argv[2] ?? 2000);
const BASE = process.argv[3] ? +process.argv[3] : NaN;
const w = generateWorld(7);
const get = (id: string) => playerOf(w, id)!;
const top = w.clubs.filter((c) => ['eng1', 'esp1', 'ita1', 'ger1', 'fra1'].includes(c.leagueId));
let inj = 0, days = 0, long = 0, fromFoul = 0;
const byOff: Record<string, [number, number]> = {}; // offence → [fouls, the fouled player hurt in the same minute]
for (let i = 0; i < N; i++) {
  const m = startMatch(w, null, top[(i * 7) % top.length].id, top[(i * 13 + 5) % top.length].id, `inj-${i}`, 1, i % 2 === 0);
  simulate(m, get);
  for (const e of m.events) {
    if (e.kind === 'injury') { inj++; days += e.out ?? 0; if ((e.out ?? 0) >= 6) long++; if (e.how === 'foul') fromFoul++; }
    if (e.kind === 'foul') {
      const booked = m.events.find((x) => (x.kind === 'yellow' || x.kind === 'red') && x.min === e.min && (x.plus ?? 0) === (e.plus ?? 0) && x.playerId === e.playerId);
      const k = booked ? (booked.kind === 'red' ? 'sent off' : 'booked') : 'no card';
      const hurt = m.events.some((x) => x.kind === 'injury' && x.min === e.min && (x.plus ?? 0) === (e.plus ?? 0) && x.playerId === e.vs);
      (byOff[k] ??= [0, 0])[0]++;
      if (hurt) byOff[k][1]++;
    }
  }
}
const per = inj / N;
console.log(`${N} matches: ${per.toFixed(3)} injuries a match (${fromFoul} from fouls), ${(days / Math.max(1, inj)).toFixed(2)} games out on average, ${Math.round((100 * long) / Math.max(1, inj))}% out 6+`);
for (const [k, [n, h]] of Object.entries(byOff).sort((a, b) => b[1][0] - a[1][0])) console.log(`  fouls, ${k}: ${n}, fouled player hurt ${(100 * h / n).toFixed(2)}%`);
const share = (k: string) => (byOff[k] ? byOff[k][1] / byOff[k][0] : 0);
console.log(`${share('booked') > 2 * share('no card') ? 'ok  ' : 'FAIL'} a booked (reckless) foul hurts the fouled player more often than one with no card`);
if (Number.isFinite(BASE)) {
  const d = per / BASE - 1;
  console.log(`${Math.abs(d) <= 0.1 ? 'ok  ' : 'FAIL'} injuries a match within 10% of the baseline ${BASE}: ${(100 * d).toFixed(1)}%`);
  if (Math.abs(d) > 0.1) process.exit(1);
}
