// Average effect of each single instruction change from balanced (home side, similar clubs), closed form.
import { generateWorld, playerOf, strengthOf } from '../src/sim/world';
import { startMatch, expected } from '../src/sim/match';
import { PRESETS, type Tactics } from '../src/sim/tactics';
import { pointsLeft, withTactics } from '../src/sim/engine/story';
const w = generateWorld(7);
const get = (id: string) => playerOf(w, id)!;
const clubs = w.clubs.filter((c) => c.leagueId === 'eng1').sort((a, b) => strengthOf(w, b.id) - strengthOf(w, a.id));
const changes: [string, Partial<Tactics>][] = [];
for (const [k, vs] of Object.entries({ mentality: [-2, -1, 1, 2], pressing: [0, 2], line: [0, 2], width: [0, 2], tempo: [0, 2], passing: [0, 2], fullback: [1, 2], striker: [1, 2, 3], trap: [1, 2, 3], routine: [1, 2], counter: [true] }))
  for (const v of vs) changes.push([`${k}=${v}`, { [k]: v } as Partial<Tactics>]);
const acc: Record<string, number> = {};
const N = 12;
for (let k = 0; k < N; k++) {
  const m0 = startMatch(w, null, clubs[k + 3].id, clubs[k + 4].id, 'sg' + k, 0, false);
  const m = withTactics(m0, 0, { ...PRESETS.balanced, philosophy: 'balanced' }, get);
  const base = pointsLeft(m, 0, expected(m, get));
  for (const [n, p] of changes) { const m2 = withTactics(m, 0, p, get); acc[n] = (acc[n] ?? 0) + (pointsLeft(m2, 0, expected(m2, get)) - base) / N; }
}
console.log(Object.entries(acc).map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v.toFixed(3)}`).join('\n'));
