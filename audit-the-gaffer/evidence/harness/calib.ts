import { generateRealWorld } from '/home/user/tier-one/games/the-gaffer/web/src/sim/seed';
import { newCareer, seasonOver, expectedPoints } from '/home/user/tier-one/games/the-gaffer/web/src/sim/season';
import { advance, endOfSeason } from '/home/user/tier-one/games/the-gaffer/web/src/sim/clock';
import { dispatch } from '/home/user/tier-one/games/the-gaffer/web/src/sim/commands';
import { decisions } from '/home/user/tier-one/games/the-gaffer/web/src/sim/decisions';
import type { World } from '/home/user/tier-one/games/the-gaffer/web/src/sim/world';
const [clubId, seed, seasons = '1'] = process.argv.slice(2);
let w: World = generateRealWorld(+seed);
let c = newCareer(w, +seed, clubId, 'Audit', { age: 40, nationality: 'ENG' }, 2026);
for (let s = 0; s < +seasons; s++) {
  let E = 0, A = 0, n = 0, league = [0, 0, 0], cup = [0, 0, 0]; const b0 = c.board.confidence; const bins: Record<string, number[]> = {};
  while (!seasonOver(c) && !c.sacked) {
    for (const d of decisions(w, c)) { const ch = d.kind === 'job' ? d.choices.find((x) => x.id === 'stay')! : (d.choices.find((x) => x.pick) ?? d.choices[0]);
      for (const cmd of ch.cmds) { const r = dispatch(w, c, cmd); if (r.ok) { w = r.world; c = r.career; } }
      const r = dispatch(w, c, { type: 'decision.done', id: d.id }); if (r.ok) { w = r.world; c = r.career; } }
    const pw = w, pc = c;
    const st = advance(w, c); w = st.world; c = st.career;
    if (st.mine) { const k = st.mine.sides[0].clubId === clubId ? 0 : 1; const e = expectedPoints(pw, pc, st.mine, k as 0 | 1);
      const g = st.mine.goals; const pts = g[k] > g[1 - k] ? 3 : g[k] === g[1 - k] ? 1 : 0; E += e; A += pts; n++;
      const bk = e >= 2.3 ? 'fav>=2.3' : e >= 1.8 ? 'fav1.8-2.3' : e >= 1.2 ? 'even' : 'dog'; (bins[bk] ??= [0, 0, 0]); bins[bk][0]++; bins[bk][1] += e; bins[bk][2] += pts;
      (st.mine.cup ? cup : league)[0]++; (st.mine.cup ? cup : league)[1] += e; (st.mine.cup ? cup : league)[2] += pts; }
  }
  console.log(JSON.stringify({ club: clubId, seed: +seed, season: c.season, n, expPerGame: +(E / n).toFixed(2), actPerGame: +(A / n).toFixed(2), league: league.map((x, i) => i ? +(x / league[0]).toFixed(2) : x), cup: cup.map((x, i) => i ? +(x / Math.max(1, cup[0])).toFixed(2) : x), bins: Object.fromEntries(Object.entries(bins).map(([k, v]) => [k, [v[0], +(v[1] / v[0]).toFixed(2), +(v[2] / v[0]).toFixed(2)]])), board: [Math.round(b0), Math.round(c.board.confidence)], sacked: !!c.sacked }));
  if (c.sacked) break;
  const e = endOfSeason(w, c); w = e.world; c = e.career;
}
