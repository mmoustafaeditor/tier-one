// B1: the AI manager reacting during the match against a human (engine/story.ts aiReact): the same user-style matches
// (the home side played by "a human" who keeps the AI's default plan) with the reactions on and off. It should help the
// AI side a little (points, xG difference), never flip-flop (the same instruction changed twice within AI_LIVE.HOLD
// minutes), keep the goals football, and be quick.
// Usage: node sim-tests/build.mjs aireact [matches=600]
import { generateWorld, playerOf } from '../src/sim/world';
import { startMatch, stepMinute, type LiveMatch } from '../src/sim/match';
import { playOver } from '../src/sim/engine/clock';
import { AI_LIVE } from '../src/sim/engine/story';

const N = +(process.argv[2] ?? 600);
const w = generateWorld(7);
const get = (id: string) => playerOf(w, id)!;
const clubs = w.clubs.filter((c) => ['eng1', 'esp1', 'ita1', 'ger1', 'fra1', 'egy1'].includes(c.leagueId));
function play(h: string, a: string, key: string, on: boolean): { m: LiveMatch; ms: number } {
  AI_LIVE.ON = on;
  const m = startMatch(w, null, h, a, key, 1, true);
  m.sides[0].ai = false; // the human side
  const t0 = performance.now();
  while (!playOver(m)) stepMinute(m, get);
  return { m, ms: performance.now() - t0 };
}
const acc = { on: { pts: 0, xgd: 0, goals: 0, ms: 0 }, off: { pts: 0, xgd: 0, goals: 0, ms: 0 }, changes: 0, flips: 0, n: 0, why: {} as Record<string, number> };
const pts = (m: LiveMatch) => (m.goals[1] > m.goals[0] ? 3 : m.goals[1] === m.goals[0] ? 1 : 0);
for (let i = 0; i < N; i++) {
  const h = clubs[(i * 7) % clubs.length], a = clubs[(i * 13 + 5) % clubs.length];
  if (h.id === a.id) continue;
  const A = play(h.id, a.id, `air-${i}`, true), B = play(h.id, a.id, `air-${i}`, false);
  acc.n++;
  for (const [x, r] of [[acc.on, A], [acc.off, B]] as const) { x.pts += pts(r.m); x.xgd += r.m.xg![1] - r.m.xg![0]; x.goals += r.m.goals[0] + r.m.goals[1]; x.ms += r.ms; }
  const ch = A.m.events.filter((e) => e.kind === 'tactic' && e.side === 1 && /\\|(conceded|pinned)/.test(e.note ?? ''));
  acc.changes += ch.length;
  for (const e of ch) { const k = (e.note ?? '').split('|')[1]?.split(':')[0] ?? '?'; acc.why[k] = (acc.why[k] ?? 0) + 1; }
  // Flip-flops: the same instruction changed twice within HOLD minutes by the AI side (any reason).
  const t = A.m.events.filter((e) => e.kind === 'tactic' && e.side === 1 && !e.plus).map((e) => ({ k: (e.note ?? '').split(':')[0], min: e.min }));
  for (let x = 0; x < t.length; x++) for (let y = x + 1; y < t.length; y++) if (t[x].k === t[y].k && t[y].min - t[x].min < AI_LIVE.HOLD && t[y].min !== t[x].min && /\\|(conceded|pinned)/.test(A.m.events.filter((e) => e.kind === 'tactic' && e.side === 1 && e.min === t[y].min).map((e) => e.note).join(' '))) acc.flips++;
}
const f = (x: number) => (x / acc.n).toFixed(3);
console.log(`  ${acc.n} matches: the AI side takes ${f(acc.on.pts)} points with the reactions vs ${f(acc.off.pts)} without; xG difference ${f(acc.on.xgd)} vs ${f(acc.off.xgd)}; goals ${f(acc.on.goals)} vs ${f(acc.off.goals)}; ${(acc.changes / acc.n).toFixed(2)} reactions a match ${JSON.stringify(acc.why)}; extra time a match ${((acc.on.ms - acc.off.ms) / acc.n).toFixed(1)} ms`);
let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const dp = (acc.on.pts - acc.off.pts) / acc.n;
ok(dp > 0 && acc.on.xgd >= acc.off.xgd, `the reactions help the AI side (+${dp.toFixed(3)} points a match)`);
ok(dp < 0.15, `but not by more than 0.15 points a match (+${dp.toFixed(3)})`);
ok(acc.flips === 0, `no flip-flops: the same instruction twice within ${AI_LIVE.HOLD} minutes (${acc.flips})`);
ok(Math.abs(acc.on.goals / acc.off.goals - 1) < 0.06, `goals stay football (${(100 * (acc.on.goals / acc.off.goals - 1)).toFixed(1)}%)`);
ok((acc.on.ms - acc.off.ms) / acc.n < 20, `quick: ${((acc.on.ms - acc.off.ms) / acc.n).toFixed(1)} ms a match (< 20)`);
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
