// A4: hidden movement traits (ui2/pitch/body.ts offBall, work, calm). Checks that they spread across players, that the
// same player always gets the same ones, and that on the pitch two players in the same role move differently: how
// often a man makes his role's run follows his movement off the ball (correlation over seeded matches).
//   node sim-tests/build.mjs traits [matches]
import { generateWorld, playerOf } from '../src/sim/world';
import { startMatch, stepMinute } from '../src/sim/match';
import { playOver } from '../src/sim/engine/clock';
import { newAnim, setPitchDebug, tick } from '../src/ui2/pitch/sim';
import { bodyOf } from '../src/ui2/pitch/body';
import { RATES, minuteMs, shownOf } from '../src/sim/highlights';
setPitchDebug(true);
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };
const corr = (xs: number[], ys: number[]) => {
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy || 1);
};
const sd = (xs: number[]) => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length); };
const w = generateWorld(7); const get = (id: string) => playerOf(w, id)!;
const ps = w.players.slice(0, 3000);
for (const k of ['offBall', 'work', 'calm'] as const) {
  const v = ps.map((p) => bodyOf(p, 100, 2026)[k]);
  ok(sd(v) > 0.1, `${k} spreads across players: sd ${sd(v).toFixed(2)} (> 0.1), range ${Math.min(...v).toFixed(2)}-${Math.max(...v).toFixed(2)}`);
}
ok(ps.every((p) => JSON.stringify(bodyOf(p, 100, 2026)) === JSON.stringify(bodyOf(p, 100, 2026))), 'the same player always gets the same traits');
// On the pitch: role runs on offer vs runs made, per player.
const N = +(process.argv[2] ?? 10);
const top = w.clubs.filter((c) => ['eng1', 'esp1', 'ita1', 'ger1', 'fra1'].includes(c.leagueId));
const stat: Record<string, [number, number]> = {};
for (let i = 0; i < N; i++) {
  let m = startMatch(w, null, top[(i * 7) % top.length].id, top[(i * 13 + 5) % top.length].id, `traits-${i}`, 1, true);
  const a: any = newAnim(m, w);
  let prevTo = -1;
  while (!playOver(m)) {
    const n = JSON.parse(JSON.stringify(m)); stepMinute(n, get); m = n;
    const ms = minuteMs(m, 2, RATES[1], prevTo); const sh = shownOf(m, 2, prevTo); prevTo = sh ? sh.to : -1;
    for (let t = 0; t < ms; t += 1000 / 60) tick(a, m, w, 1000 / 60, ms, true, 2, 2400);
  }
  for (const [id, [o, r]] of Object.entries(a.runStat ?? {}) as [string, [number, number]][]) { const s = (stat[id] ??= [0, 0]); s[0] += o; s[1] += r; }
}
const rows = Object.entries(stat).filter(([, [o]]) => o >= 60).map(([id, [o, r]]) => ({ ob: bodyOf(get(id), 100, 2026).offBall, rate: r / o }));
const r = corr(rows.map((x) => x.ob), rows.map((x) => x.rate));
console.log(`  ${rows.length} players with 60+ runs on offer; run rate ${Math.min(...rows.map((x) => x.rate)).toFixed(2)}-${Math.max(...rows.map((x) => x.rate)).toFixed(2)}`);
ok(r >= 0.4, `how often he makes his run follows his movement off the ball: r = ${r.toFixed(2)} (≥ 0.4)`);
process.exit(fails ? 1 : 0);
