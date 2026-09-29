// The real 2026/27 world: builds, passes checkWorld, squads look like football. node sim-tests/build.mjs realworld [seed]
import { checkWorld, squadOf, strengthOf, clubsOf } from '../src/sim/world';
import { generateRealWorld, fictionalWorld } from '../src/sim/seed';

const seed = +(process.argv[2] ?? 7);
const t0 = performance.now();
const w = generateRealWorld(seed, 2026, 'real');
console.log(`built in ${(performance.now() - t0).toFixed(0)} ms: ${w.clubs.length} clubs, ${w.players.length} players`);
console.log('checkWorld:', checkWorld(w).slice(0, 10));
for (const lid of ['eng1', 'eng2', 'esp1', 'ger1', 'egy1', 'ksa1']) {
  const cs = clubsOf(w, lid);
  console.log(lid, cs.length, cs.slice(0, 6).map((c) => `${c.name.en} ${strengthOf(w, c.id)} (${squadOf(w, c.id).length})`).join(' · '), '…', cs.slice(-3).map((c) => `${c.name.en} ${strengthOf(w, c.id)}`).join(' · '));
}
const top = (clubId: string) => squadOf(w, clubId).sort((a, b) => b.rating - a.rating).slice(0, 14).map((p) => `${p.short ?? p.name.en} ${p.position} ${p.rating}/${p.potential}`).join(', ');
for (const c of ['eng-aston-villa', 'eng-arsenal', 'esp-barcelona', 'egy-al-ahly', 'eng-coventry']) console.log(c, '→', top(c));
const pos: Record<string, number> = {};
for (const p of squadOf(w, 'eng-aston-villa')) pos[p.position] = (pos[p.position] ?? 0) + 1;
console.log('villa positions', pos);
const f = fictionalWorld(w);
console.log('fictional:', f.clubs.find((c) => c.id === 'eng-arsenal')!.name, f.players.find((p) => p.id === 'p-bukayo-saka')?.name, checkWorld(f).length);
