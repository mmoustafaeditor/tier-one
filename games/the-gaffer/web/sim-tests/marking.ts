// Foundation step 5: marking styles (tactics.ts marking / setMark). No style may be a free win: against the default
// (mixed / mixed), every combination's expected points over many fixtures stay within +3%. Closed-form (the engine's
// expected goals), then a seeded simulation of the extremes for the trade-offs (fouls, chances conceded by kind).
// Usage: node sim-tests/build.mjs marking [simulated matches per style=600]
import { generateWorld, playerOf, strengthOf } from '../src/sim/world';
import { expected, simulate, startMatch } from '../src/sim/match';
import { pointsLeft, withTactics } from '../src/sim/engine/story';

const SIMS = +(process.argv[2] ?? 600);
const w = generateWorld(7);
const get = (id: string) => playerOf(w, id)!;
let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const NAMES = ['zonal', 'mixed', 'man'];
const clubs = w.clubs.filter((c) => ['eng1', 'esp1', 'ita1'].includes(c.leagueId)).sort((a, b) => strengthOf(w, b.id) - strengthOf(w, a.id));

// Closed form: the home side's expected points with each style, the away side as it is.
const sum: Record<string, number> = {};
let n = 0;
for (let k = 0; k + 1 < clubs.length; k += 2) {
  for (const side of [0, 1] as const) {
    const m = side === 0 ? startMatch(w, null, clubs[k].id, clubs[k + 1].id, `mk${k}`, 0, false) : startMatch(w, null, clubs[k + 1].id, clubs[k].id, `mk${k}`, 0, false);
    for (const a of [0, 1, 2] as const) for (const b of [0, 1, 2] as const) {
      const m2 = withTactics(m, side, { marking: a, setMark: b }, get);
      sum[`${a}${b}`] = (sum[`${a}${b}`] ?? 0) + pointsLeft(m2, side, expected(m2, get));
    }
    n++;
  }
}
const base = sum['11'] / n;
for (const [k, v] of Object.entries(sum)) {
  const d = v / n / base - 1;
  ok(d <= 0.03, `${NAMES[+k[0]]} in open play, ${NAMES[+k[1]]} at set pieces: ${(v / n).toFixed(3)} points a match (${d >= 0 ? '+' : ''}${(100 * d).toFixed(1)}% vs mixed/mixed)`);
}

// Simulated: what each style gives away, for the side using it (home side, its match FULL).
const top = w.clubs.filter((c) => ['eng1', 'esp1', 'ita1', 'ger1', 'fra1'].includes(c.leagueId));
function play(a: 0 | 1 | 2, b: 0 | 1 | 2) {
  const t = { pts: 0, fouls: 0, flank: 0, combo: 0, corner: 0, header: 0, conceded: 0 };
  for (let i = 0; i < SIMS; i++) {
    let m = startMatch(w, null, top[(i * 7) % top.length].id, top[(i * 13 + 5) % top.length].id, `mks-${i}`, 1, true);
    m = withTactics(m, 0, { marking: a, setMark: b }, get);
    simulate(m, get);
    t.pts += m.goals[0] > m.goals[1] ? 3 : m.goals[0] === m.goals[1] ? 1 : 0;
    t.conceded += m.goals[1];
    for (const e of m.events) {
      if (e.kind === 'foul' && e.side === 0) t.fouls++;
      if (e.side === 1 && (e.kind === 'goal' || e.kind === 'save' || e.kind === 'miss' || e.kind === 'block')) {
        if (e.how === 'corner') t.corner++;
        else if (e.how === 'header') t.header++;
        else if (e.how === 'box' || e.how === 'through') t.combo++;
        else if (e.how === 'cutback') t.flank++;
      }
    }
  }
  const per = (x: number) => (x / SIMS).toFixed(2);
  console.log(`  ${NAMES[a]}/${NAMES[b]}: ${per(t.pts)} pts, conceded ${per(t.conceded)}, our fouls ${per(t.fouls)}; their shots from cutbacks ${per(t.flank)}, box/through ${per(t.combo)}, headers ${per(t.header)}, corners ${per(t.corner)}`);
  return t;
}
const Z = play(0, 0), X = play(1, 1), M = play(2, 2);
ok(M.fouls > X.fouls && X.fouls > Z.fouls, 'man-marking costs fouls, zonal the fewest');
ok(Z.flank + Z.header > X.flank + X.header && M.flank + M.header < X.flank + X.header, 'zonal gives away more from wide and in the air, man-marking less');
ok(M.combo > X.combo && Z.combo < X.combo, 'man-marking gives away more between the lines and in the box, zonal less');
ok(M.corner < Z.corner, 'man-marking at corners concedes fewer headed chances from them than zonal');
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
