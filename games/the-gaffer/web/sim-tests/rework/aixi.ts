// Rework: balance before/after moving AI clubs to the best-XI assignment. One staff-run season for 3 clubs × 3 seeds
// (the user's side already picks with bestXI): the user's points per game and final position — the number that
// changes when the AI picks as well as the manager — plus league-wide goals, home wins and draws, and how often AI
// starters play out of position. node sim-tests/build.mjs rework/aixi [seeds=3]
const mem: Record<string, string> = {};
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = String(v); }, removeItem: (k: string) => { delete mem[k]; } };
const { generateRealWorld } = await import('../../src/sim/seed');
const { newCareer, seasonOver, leagueOf, table } = await import('../../src/sim/season');
const { advance } = await import('../../src/sim/clock');
const { squadOf } = await import('../../src/sim/world');
const { FORMATIONS, DEFAULT_TACTICS, aiXI } = await import('../../src/sim/tactics');

const seeds = +(process.argv[2] ?? 3);
const CLUBS = ['eng-aston-villa', 'esp-betis', 'ita-bologna'];
let n = 0, goals = 0, home = 0, draws = 0, ppgSum = 0, posSum = 0, runs = 0, outPos = 0, slots = 0;
for (let s = 0; s < seeds; s++) for (const club of CLUBS) {
  const seed = 7 + s;
  let w = generateRealWorld(seed);
  let c = newCareer(w, seed, club, 'Test', { age: 40, nationality: 'ENG' }, 2026);
  // AI selection sample at the start: starters out of their natural position.
  for (const x of w.clubs.slice(0, 120)) {
    const pos = FORMATIONS[DEFAULT_TACTICS.formation].slots.map((sl) => sl.pos);
    aiXI(squadOf(w, x.id), DEFAULT_TACTICS.formation).forEach((p, i) => { slots++; if (p && p.position !== pos[i]) outPos++; });
  }
  let steps = 0;
  while (!seasonOver(c) && steps < 2000) { const st = advance(w, c); w = st.world; c = st.career; steps++; }
  const lid = leagueOf(w, c.clubId);
  const rows = table(w, c, lid);
  const me = rows.findIndex((r) => r.clubId === c.clubId);
  ppgSum += rows[me].pts / Math.max(1, rows[me].p); posSum += me + 1; runs++;
  for (const rounds of Object.values(c.fixtures)) for (const r of rounds) for (const [, , hg, ag] of r) {
    if (hg < 0) continue; n++; goals += hg + ag; if (hg > ag) home++; else if (hg === ag) draws++;
  }
  console.log(`seed ${seed} ${club}: ${me + 1}${['th', 'st', 'nd', 'rd'][me + 1 > 3 ? 0 : me + 1]} of ${rows.length}, ${rows[me].pts} pts in ${rows[me].p}`);
}
console.log(`\nAI starters out of position: ${(outPos / slots * 100).toFixed(1)}%`);
console.log(`league matches ${n}: ${(goals / n).toFixed(3)} goals, home ${(home / n * 100).toFixed(1)}%, draws ${(draws / n * 100).toFixed(1)}%`);
console.log(`user (staff-run): ${(ppgSum / runs).toFixed(3)} points per game, average position ${(posSum / runs).toFixed(1)}`);
