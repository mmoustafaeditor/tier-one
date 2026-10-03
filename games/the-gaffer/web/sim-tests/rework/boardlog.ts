// Rework §Q: every move of the board's trust has its cause on record (sim/boardlog.ts). Half a season on the clock with
// the staff taking the calls: after each step, the notes added add up to the change in confidence (rounding aside),
// and results name the opponent and the score. node sim-tests/build.mjs rework/boardlog
import { generateRealWorld } from '../../src/sim/seed';
import { newCareer } from '../../src/sim/season';
import { advance } from '../../src/sim/clock';
import type { BoardNote } from '../../src/sim/boardlog';

let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
let w = generateRealWorld(7);
let c = newCareer(w, 7, 'eng-aston-villa', 'Test', { age: 40, nationality: 'ENG' }, 2026);
let steps = 0, moved = 0, explained = 0;
const kinds = new Map<string, number>();
const bad: string[] = [];
for (let i = 0; i < 30; i++) {
  const before = c.board.confidence, head = JSON.stringify((c.board.log ?? [])[0] ?? null);
  const s = advance(w, c); w = s.world; c = s.career; steps++;
  const log = c.board.log ?? [];
  const k = log.findIndex((n) => JSON.stringify(n) === head);
  const added: BoardNote[] = k < 0 ? log : log.slice(0, k);
  for (const n of added) kinds.set(n.why, (kinds.get(n.why) ?? 0) + 1);
  const d = c.board.confidence - before;
  if (Math.abs(d) >= 0.05) {
    moved++;
    const sum = added.reduce((a, n) => a + n.d, 0);
    if (Math.abs(sum - d) <= 0.15 + 0.05 * added.length) explained++; else bad.push(`step ${i}: moved ${d.toFixed(1)}, notes ${sum.toFixed(1)}`);
  }
}
console.log('  causes recorded:', [...kinds].map(([k, n]) => `${k} ${n}`).join(', '));
ok(moved > 5, `the board's trust moved in ${moved} of ${steps} steps`);
ok(explained === moved, `each move is the sum of its recorded causes (${explained} of ${moved})${bad.length ? ' — ' + bad.slice(0, 3).join('; ') : ''}`);
const res = (c.board.log ?? []).filter((n) => n.why === 'result');
ok(res.length > 0 && res.every((n) => !!n.club && /^\d+-\d+$/.test(n.s ?? '')), 'results name the opponent and the score');
ok((c.board.log ?? []).length <= 8, 'the log keeps the last 8');
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
