// User-vs-AI parity (audit GF-002): keeping the staff a club starts with must not give the user's side a hidden edge,
// and every club's room gets the leaders' pull, not only the user's. node sim-tests/build.mjs parity
import { generateRealWorld } from '../src/sim/seed';
import { aiRoomPulls, newCareer, userMatch } from '../src/sim/season';
import { staffEdge, staffNorm } from '../src/sim/norms';
import { cohLevel, cohesionOfClub } from '../src/sim/cohesion';
import type { Career } from '../src/model/types';

let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };

const w = generateRealWorld(7);
for (const id of ['eng-man-city', 'eng-ipswich', 'egy-zamalek', 'ksa_hazem']) {
  const c0 = newCareer(w, 7, id, 'Test', { age: 40, nationality: 'ENG' }, 2026);
  const club = w.clubs.find((x) => x.id === id)!;
  // Staff exactly at the club's norm: no edge from the assistant, the fitness coach or the psychologist.
  const at = (c: Career, q: number): Career => ({ ...c, ops: { ...c.ops, staff: Object.fromEntries(Object.entries(c.ops.staff).map(([k, s]) => [k, { ...s!, quality: q }])) } });
  const c = at(c0, staffNorm(club));
  ok(['assistant', 'fitness', 'psychologist', 'doctor'].every((r) => staffEdge(c.ops, club, r as 'assistant') === 0), `${id}: staff at the norm (${staffNorm(club)}) count as no edge`);
  const m = userMatch(w, c)!;
  const mine = m.sides.find((s) => s.clubId === id)!;
  const coh = cohLevel(cohesionOfClub(w.clubs, id));
  ok(Math.abs((mine.mods?.level ?? 0) - coh) < 1e-9 && Math.abs((mine.mods?.fatigue ?? 1) - 1) < 1e-9, `${id}: at the norm the side's level is only its cohesion (${(mine.mods?.level ?? 0).toFixed(2)} = ${coh.toFixed(2)}), fatigue ×1`);
  // A better assistant is still a real, bounded advantage.
  const better = userMatch(w, at(c0, staffNorm(club) + 30))!.sides.find((s) => s.clubId === id)!;
  const gain = (better.mods?.level ?? 0) - (mine.mods?.level ?? 0);
  ok(gain > 0.25 && gain < 0.35, `${id}: an assistant 30 above the norm adds ${gain.toFixed(2)} levels`);
}
const pulls = aiRoomPulls(w, 'eng-man-city');
ok(!pulls.has('eng-man-city') && pulls.has('eng-arsenal') && pulls.size > 100, `every other club gets a leaders' pull (${pulls.size} clubs)`);
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
