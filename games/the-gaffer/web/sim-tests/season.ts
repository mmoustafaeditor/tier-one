// Times one full season of the whole world (all leagues + cups) and prints headline numbers.
import { generateWorld } from '../src/sim/world';
import { newCareer, playDay, seasonOver } from '../src/sim/season';
const seed = +(process.argv[2] ?? 7);
const w0 = generateWorld(seed);
let career = newCareer(w0, seed, 'eng_sun', 'Test', { age: 40, nationality: 'ENG' }, 2026);
let world = w0;
const t0 = performance.now();
let n = 0, g = 0, hw = 0, d = 0;
while (!seasonOver(career)) { const r = playDay(world, career); world = r.world; career = r.career; }
const ms = performance.now() - t0;
for (const rounds of Object.values(career.fixtures)) for (const round of rounds) for (const [, , h, a] of round) { if (h < 0) continue; n++; g += h + a; if (h > a) hw++; else if (h === a) d++; }
console.log(JSON.stringify({ seed, ms: Math.round(ms), leagueMatches: n, goals: +(g / n).toFixed(2), homeWin: +(hw / n).toFixed(3), draw: +(d / n).toFixed(3) }));
