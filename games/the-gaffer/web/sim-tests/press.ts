// V2.9 press conferences: rare (≤ 1 a matchweek, none in ≥ 60 % of them), and each answer does what it says.
// node sim-tests/build.mjs press
import { generateRealWorld } from '../src/sim/seed';
import { newCareer, seasonOver } from '../src/sim/season';
import { advance } from '../src/sim/clock';
import { afterMatch } from '../src/sim/coach';
import { dispatch } from '../src/sim/commands';
import { decisions } from '../src/sim/decisions';
import { presserOf } from '../src/sim/pressDecisions';
import { CLAIM_LOSS, NAMED_CRITIC } from '../src/sim/press';
import { archetypeOf } from '../src/sim/room';
import { squadOf } from '../src/sim/world';

let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };

for (const [club, seed] of [['egy-al-ahly', 7], ['eng-arsenal', 3]] as const) {
  let w = generateRealWorld(seed);
  let c = newCareer(w, seed, club, 'Test', { age: 40, nationality: 'EGY' }, 2026);
  const byRound = new Map<number, Set<string>>();
  let weeks = 0, cards = 0;
  while (!seasonOver(c)) {
    const p = presserOf(w, c);
    if (p) { const s = byRound.get(c.round) ?? new Set(); s.add(p.id); byRound.set(c.round, s); }
    const ds = decisions(w, c).filter((d) => d.kind === 'presser');
    cards = Math.max(cards, ds.length);
    const s = advance(w, c); w = s.world; if (s.career.round !== c.round) weeks++; c = s.career;
  }
  const withPress = [...byRound.values()].length;
  // One matchweek can see the "after" presser of the match just played OR the "big" one before the next, never both.
  const multi = [...byRound.values()].filter((s) => s.size > 1).length;
  for (const [r, s] of byRound) if (s.size > 1) console.log("   round", r, [...s].join(" "));
  console.log(`  ${club}: pressers in ${withPress} of ${weeks} matchweeks, up to ${cards} questions`);
  ok(withPress > 0 && withPress <= weeks * 0.4, `${club}: pressers happen, and ≥ 60% of matchweeks have none`);
  ok(multi === 0 && cards <= 3, `${club}: at most one presser a matchweek and 3 questions`);
}

// Answers do exactly what they say.
const w = generateRealWorld(7);
const c = newCareer(w, 7, 'egy-al-ahly', 'Test', { age: 40, nationality: 'EGY' }, 2026);
const loss = { mine: 0, theirs: 1, oppId: 'egy-zamalek', home: true, myLevel: 70, oppLevel: 65, cup: false, expected: 2 };
const plain = afterMatch(w, c, loss).career.board;
const conf = dispatch(w, c, { type: 'press.answer', q: 'predict', tone: 'confident', opp: 'egy-zamalek' });
ok(conf.ok && !!conf.career.claim, 'a confident prediction is a public claim');
const after = afterMatch(conf.world, conf.career, loss).career;
ok(Math.abs(plain.confidence - after.board.confidence - CLAIM_LOSS.board) < 0.11 && Math.abs(plain.fans - after.board.fans - CLAIM_LOSS.fans) < 0.11 && !after.claim,
  `confident, then lost: exactly board −${CLAIM_LOSS.board} and fans −${CLAIM_LOSS.fans} more (${(plain.confidence - after.board.confidence).toFixed(1)}, ${(plain.fans - after.board.fans).toFixed(1)})`);
const other = afterMatch(conf.world, conf.career, { ...loss, oppId: 'egy-pyramids' }).career;
ok(!!other.claim, 'a claim about one side stands until we play them');

const squad = squadOf(w, c.clubId);
const vol = squad.find((p) => archetypeOf(p) === 'volatile'), calm = squad.find((p) => archetypeOf(p) !== 'volatile');
for (const p of [vol, calm]) {
  if (!p) continue;
  const r = dispatch(w, c, { type: 'press.answer', q: 'blame', tone: 'name', pid: p.id });
  const q = r.world.players.find((x) => x.id === p.id)!;
  const want = archetypeOf(p) === 'volatile' ? NAMED_CRITIC.volatile : NAMED_CRITIC.other;
  ok(p.morale - q.morale === Math.min(want, p.morale), `naming ${archetypeOf(p)} ${p.name.en} in criticism: morale −${p.morale - q.morale}`);
}
const m = dispatch(w, c, { type: 'press.answer', q: 'blame', tone: 'measured' });
ok(m.world === w && m.career.board.confidence === c.board.confidence && m.career.board.fans === c.board.fans, 'measured costs nothing');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
