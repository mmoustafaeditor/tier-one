// Morale across a whole league (audit GF-003): losing sides must not sink to the floor and drag every attribute down.
// The user manages a club in another country, so England and Egypt are all AI. node sim-tests/build.mjs morale [seed]
import { generateRealWorld } from '../src/sim/seed';
import { newCareer, playDay, seasonOver, settleMorale, table } from '../src/sim/season';
import { squadOf } from '../src/sim/world';

let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };

// The settle rule itself: a share of the gap, at least one point, never past the target.
ok(settleMorale(10, 60) === 20 && settleMorale(58, 60) === 59 && settleMorale(90, 60) === 84 && settleMorale(60, 60) === 60, 'settleMorale pulls 20% of the gap, at least 1');

const seed = +(process.argv[2] ?? 7);
let w = generateRealWorld(seed);
let c = newCareer(w, seed, 'ita-bologna', 'Test', { age: 40, nationality: 'ENG' }, 2026);
while (!seasonOver(c) && c.round < 30) { const r = playDay(w, c); w = r.world; c = r.career; }
for (const lg of ['eng1', 'egy1']) {
  const rows = table(w, c, lg).map((row) => { const sq = squadOf(w, row.clubId); return { id: row.clubId, pts: row.pts, p: row.p, m: sq.reduce((a, p) => a + p.morale, 0) / sq.length }; });
  const minM = Math.min(...rows.map((r) => r.m));
  const bottom3 = rows.slice(-3).reduce((a, r) => a + r.pts / r.p, 0) / 3;
  console.log(`${lg} after ${rows[0].p}: morale ${Math.round(minM)}–${Math.round(Math.max(...rows.map((r) => r.m)))}, bottom three ${bottom3.toFixed(2)} pts/game, leader ${(rows[0].pts / rows[0].p).toFixed(2)}`);
  ok(minM >= 35, `${lg}: no club averages below 35 morale (lowest ${Math.round(minM)})`);
  ok(bottom3 >= 0.5, `${lg}: bottom three take at least 0.5 pts/game (${bottom3.toFixed(2)})`);
}
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
