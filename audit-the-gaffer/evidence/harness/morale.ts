import { generateRealWorld } from '/home/user/tier-one/games/the-gaffer/web/src/sim/seed';
import { newCareer, seasonOver, table } from '/home/user/tier-one/games/the-gaffer/web/src/sim/season';
import { playDay } from '/home/user/tier-one/games/the-gaffer/web/src/sim/season';
import { squadOf, type World } from '/home/user/tier-one/games/the-gaffer/web/src/sim/world';
const seed = +(process.argv[2] ?? 7);
let w: World = generateRealWorld(seed);
let c = newCareer(w, seed, 'ita-bologna', 'Audit', { age: 40, nationality: 'ENG' }, 2026);
const out: string[] = [];
while (!seasonOver(c)) { const r = playDay(w, c); w = r.world; c = r.career;
  if (c.round === 30) for (const lg of ['eng1', 'egy1']) { const tb = table(w, c, lg);
    out.push(lg + ' r30: ' + tb.map((row, i) => { const sq = squadOf(w, row.clubId); const m = sq.reduce((a, p) => a + p.morale, 0) / sq.length; return (i + 1) + ':' + row.clubId.replace(/^(eng|egy|eg1)[-_]/, '') + ' ' + row.pts + 'p m' + Math.round(m) + ' lo' + Math.min(...sq.map(p=>p.morale)); }).join(' | ')); } }
console.log(out.join('\n'));
