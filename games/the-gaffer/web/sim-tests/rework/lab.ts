// Rework §J Tactics Lab: "try another plan" vs the next opponent. Over several weeks of a season, the lab's odds for the
// current plan are the pre-match odds; using a lab plan (tactics.set with it) makes the pre-match odds exactly the lab's
// row for it; the plans really differ; a new shape refills the XI; nothing changes until Use; it is quick enough to
// run on open. node sim-tests/build.mjs rework/lab
import { generateRealWorld } from '../../src/sim/seed';
import { newCareer, nextUserMatch, seasonOver } from '../../src/sim/season';
import { advance } from '../../src/sim/clock';
import { dispatch } from '../../src/sim/commands';
import { playerOf } from '../../src/sim/world';
import { predict, expected } from '../../src/sim/match';
import { tacticsLab, labOdds } from '../../src/sim/lab';

let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
let w = generateRealWorld(7);
let c = newCareer(w, 7, 'eng-aston-villa', 'Test', { age: 40, nationality: 'ENG' }, 2026);
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
let weeks = 0, sameNow = 0, sameUse = 0, spread = 0, shapes = 0, untouched = 0, ms = 0;
for (let i = 0; i < 12 && !seasonOver(c); i++) {
  const m = nextUserMatch(w, c);
  if (m) {
    weeks++;
    const me = m.sides[0].clubId === c.clubId ? 0 : 1;
    const get = (id: string) => playerOf(w, id)!;
    const p = predict(m, get), xg = expected(m, get).xg;
    const before = JSON.stringify(c);
    const t0 = performance.now();
    const lab = tacticsLab(w, c)!;
    ms = Math.max(ms, performance.now() - t0);
    if (JSON.stringify(c) === before) untouched++;
    if (near(lab.now.win, me === 0 ? p[0] : p[2]) && near(lab.now.xg[0], xg[me]) && near(lab.now.xg[1], xg[1 - me])) sameNow++;
    const wins = lab.rows.map((r) => r.win);
    if (Math.max(...wins) - Math.min(...wins) > 0.02) spread++;
    // Use a plan that isn't the current one and check the pre-match odds agree with the lab's row.
    const pick = lab.rows.find((r) => r.ph !== lab.now.ph)!;
    const u = dispatch(w, c, { type: 'tactics.set', tactics: pick.tactics });
    if (u.ok) {
      const m2 = nextUserMatch(u.world, u.career)!;
      const g2 = (id: string) => playerOf(u.world, id)!;
      const p2 = predict(m2, g2);
      if (near(me === 0 ? p2[0] : p2[2], pick.win)) sameUse++;
    }
    // Another shape: the XI is picked again and the odds still come from the same engine.
    const other = (c.tactics?.formation ?? '4-3-3') === '4-4-2' ? '4-3-3' : '4-4-2';
    const lab2 = tacticsLab(w, c, other)!;
    const o = labOdds(w, c, lab2.rows[0].tactics)!;
    if (lab2.rows.every((r) => r.tactics.formation === other && r.tactics.xi === null) && near(o.win, lab2.rows[0].win)) shapes++;
  }
  const a = advance(w, c); w = a.world; c = a.career;
}
console.log(`  ${weeks} matches checked, slowest lab ${ms.toFixed(0)} ms`);
ok(weeks >= 8, 'enough matches to check');
ok(sameNow === weeks, `the lab's current plan = the pre-match odds and xG (${sameNow}/${weeks})`);
ok(sameUse === weeks, `after Use, the pre-match odds = the lab's row (${sameUse}/${weeks})`);
ok(spread >= weeks * 0.75, `the plans give different odds (${spread}/${weeks} weeks spread over 2 points)`);
ok(shapes === weeks, `another shape refills the XI and its odds are the engine's (${shapes}/${weeks})`);
ok(untouched === weeks, 'opening the lab changes nothing');
ok(ms < 1500, 'quick enough to run when the panel opens');
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
