// Closed-form (no simulation) check of tactic effect sizes: for fixtures between similar clubs, the expected points of
// every philosophy preset for the home side against the AI's plan. Seconds, not a matrix study.
import { generateWorld, playerOf, strengthOf } from '../src/sim/world';
import { startMatch, expected } from '../src/sim/match';
import { PHILOSOPHIES, PRESETS } from '../src/sim/tactics';
import { pointsLeft, withTactics } from '../src/sim/engine/story';
const w = generateWorld(7);
const get = (id: string) => playerOf(w, id)!;
const out: Record<string, number[]> = {}; const spread: number[] = [];
const clubs = w.clubs.filter((c) => c.leagueId === 'eng1').sort((a, b) => strengthOf(w, b.id) - strengthOf(w, a.id));
for (let k = 0; k < 16; k++) {
  const m = startMatch(w, null, clubs[k + 2].id, clubs[k + 3].id, 'tt' + k, 0, false);
  const pts = PHILOSOPHIES.map((ph) => { const m2 = withTactics(m, 0, { ...PRESETS[ph], philosophy: ph }, get); return pointsLeft(m2, 0, expected(m2, get)); });
  PHILOSOPHIES.forEach((ph, i) => (out[ph] ??= []).push(pts[i]));
  spread.push(Math.max(...pts) - Math.min(...pts));
  console.log(clubs[k + 2].id, 'v', clubs[k + 3].id, PHILOSOPHIES.map((ph, i) => `${ph} ${pts[i].toFixed(2)}`).join(' '));
}
console.log('mean', Object.entries(out).map(([k, v]) => `${k} ${(v.reduce((a, b) => a + b) / v.length).toFixed(2)}`).join(' '));
console.log('best−worst preset, mean', (spread.reduce((a, b) => a + b) / spread.length).toFixed(2), 'max', Math.max(...spread).toFixed(2));
