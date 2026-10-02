// The AI manager's kick-off read against a human (engine/story.ts aiPrep): the same user-style matches (the home side
// played by "a human" who keeps the AI's default plan) with the read and without it, and what it costs to work out.
// It should help the AI side (points and xG difference) without making it a different team: the totals stay football.
// Usage: node sim-tests/build.mjs aiprep [matches=600]
import { generateWorld, playerOf } from '../src/sim/world';
import { simulate, startMatch, stepMinute, type LiveMatch } from '../src/sim/match';

const N = +(process.argv[2] ?? 600);
const w = generateWorld(7);
const get = (id: string) => playerOf(w, id)!;
const clubs = w.clubs.filter((c) => ['eng1', 'esp1', 'ita1', 'ger1', 'fra1', 'egy1'].includes(c.leagueId));
function play(h: string, a: string, key: string, prep: boolean): { m: LiveMatch; ms: number } {
  const m = startMatch(w, null, h, a, key, 1, true);
  m.sides[0].ai = !prep; // the human side: the AI reads it only when it's a human at kick-off
  const t0 = performance.now();
  stepMinute(m, get);
  const ms = performance.now() - t0;
  m.sides[0].ai = false;
  simulate(m, get);
  return { m, ms };
}
const acc = { on: { pts: 0, xgd: 0, goals: 0 }, off: { pts: 0, xgd: 0, goals: 0 }, ms: [] as number[], changes: 0, n: 0 };
const pts = (m: LiveMatch) => (m.goals[1] > m.goals[0] ? 3 : m.goals[1] === m.goals[0] ? 1 : 0);
for (let i = 0; i < N; i++) {
  const h = clubs[(i * 7) % clubs.length], a = clubs[(i * 13 + 5) % clubs.length];
  if (h.id === a.id) continue;
  const A = play(h.id, a.id, `aip-${i}`, true), B = play(h.id, a.id, `aip-${i}`, false);
  acc.n++;
  for (const [x, r] of [[acc.on, A], [acc.off, B]] as const) { x.pts += pts(r.m); x.xgd += r.m.xg![1] - r.m.xg![0]; x.goals += r.m.goals[0] + r.m.goals[1]; }
  acc.ms.push(A.ms - B.ms);
  const ch = A.m.events.filter((e) => e.kind === 'tactic' && e.side === 1 && (e.note ?? '').includes('|prep'));
  acc.changes += ch.length;
  for (const e of ch) { const k = (e.note ?? '').split('|')[0]; (acc as any).kinds = (acc as any).kinds ?? {}; (acc as any).kinds[k] = ((acc as any).kinds[k] ?? 0) + 1; }
}
const f = (x: number) => (x / acc.n).toFixed(3);
const med = [...acc.ms].sort((p, q) => p - q)[Math.floor(acc.ms.length / 2)];
console.log(`  ${acc.n} matches: the AI side takes ${f(acc.on.pts)} points with the read vs ${f(acc.off.pts)} without; xG difference ${f(acc.on.xgd)} vs ${f(acc.off.xgd)}; goals ${f(acc.on.goals)} vs ${f(acc.off.goals)}; ${(acc.changes / acc.n).toFixed(1)} changes a match; the read takes ${med.toFixed(0)} ms (median)`);
console.log('  changes made:', JSON.stringify(Object.entries((acc as any).kinds ?? {}).sort((p: any, q: any) => q[1] - p[1])));
let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
ok(acc.on.xgd > acc.off.xgd && acc.on.pts > acc.off.pts, 'the read helps the AI side');
ok(Math.abs(acc.on.goals / acc.off.goals - 1) < 0.06, `goals stay football (${(100 * (acc.on.goals / acc.off.goals - 1)).toFixed(1)}%)`);
ok(med < 250, `quick enough at kick-off (${med.toFixed(0)} ms)`);
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
