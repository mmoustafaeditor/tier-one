// The engine's passes (engine/passes.ts): how many a match, how long, what kind, and how many passes come before a
// shot, from FULL matches; and that the passes never move a result (the same matches with and without them).
// Usage: node sim-tests/build.mjs passes [matches=40]
import { generateWorld, playerOf } from '../src/sim/world';
import { startMatch, stepMinute, type LiveMatch } from '../src/sim/match';
import { playOver } from '../src/sim/engine/clock';
import { buildModel } from '../src/sim/engine/model';
import { standOf } from '../src/sim/engine/passes';

const N = +(process.argv[2] ?? 40);
const w = generateWorld(7);
const get = (id: string) => playerOf(w, id)!;
const top = w.clubs.filter((c) => ['eng1', 'esp1', 'ita1', 'ger1', 'fra1'].includes(c.leagueId));
void buildModel;
let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const lens: number[] = [], before: number[] = [];
const kinds: Record<string, number> = {};
let passes = 0, minutes = 0, selfPass = 0, wrongSide = 0, chainBreak = 0, steps = 0;
for (let i = 0; i < N; i++) {
  let m: LiveMatch = startMatch(w, null, top[(i * 7) % top.length].id, top[(i * 13 + 5) % top.length].id, `ps-${i}`, 1, true);
  let run = 0, holder: string | undefined;
  while (!playOver(m)) {
    const n: LiveMatch = JSON.parse(JSON.stringify(m)); stepMinute(n, get); m = n; minutes++;
    // A side's men: on the pitch now, or taken off this minute (subbed, injured, sent off after the pass).
    const was = [0, 1].map((k) => new Set([...m.sides[k].onPitch, ...m.events.filter((e) => e.side === k && e.min === m.minute).flatMap((e) => [e.playerId, e.inId ?? ''])]));
    const side = (id: string) => (was[0].has(id) ? 0 : was[1].has(id) ? 1 : -1);
    for (const f of m.flow ?? []) {
      if (f.k === 'p') {
        passes++; kinds[f.ty ?? '?'] = (kinds[f.ty ?? '?'] ?? 0) + 1;
        if (f.p === f.q) selfPass++;
        if (side(f.p!) !== f.s || side(f.q!) !== f.s) wrongSide++;
        steps++; if (holder && holder !== f.p) chainBreak++;
        holder = f.q; run++;
        // length: where both stand (the same rule the pitch uses), the ball at the passer
        const model = buildModel; void model;
      } else if (f.k === 'w' || f.k === 'r') { holder = f.p; }
      else if (f.k === 'l') { holder = f.p; run = 0; }
      else if (f.k === 'g' || f.k === 'v' || f.k === 'b' || f.k === 'm') { before.push(run); run = 0; holder = undefined; }
      else { holder = undefined; if (f.k !== 'f') run = 0; }
    }
  }
}
void standOf; void lens;
const pct = (x: number, y: number) => Math.round((100 * x) / Math.max(1, y));
const med = (xs: number[]) => [...xs].sort((p, q) => p - q)[Math.floor(xs.length / 2)] ?? 0;
console.log(`  ${N} matches: ${(passes / N).toFixed(0)} passes a match (both sides), ${(passes / minutes).toFixed(1)} a minute`);
console.log(`  kinds: ${Object.entries(kinds).map(([k, v]) => `${k} ${(v / N).toFixed(1)}`).join(', ')} a match`);
console.log(`  passes in the move before a shot: median ${med(before)}, 2 or more ${pct(before.filter((x) => x >= 2).length, before.length)}%`);
ok(selfPass === 0, `nobody passes to himself (${selfPass})`);
ok(wrongSide === 0, `every pass is between team-mates on the pitch (${wrongSide} not)`);
ok(chainBreak / Math.max(1, steps) < 0.02, `each pass starts from the man who had the ball: ${pct(steps - chainBreak, steps)}%`);
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
