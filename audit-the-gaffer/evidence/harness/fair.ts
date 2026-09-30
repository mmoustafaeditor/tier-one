// Seeded A/B: one season. The user manages clubId; report points/position/morale of every target club.
import { generateRealWorld } from '/home/user/tier-one/games/the-gaffer/web/src/sim/seed';
import { newCareer, seasonOver, table } from '/home/user/tier-one/games/the-gaffer/web/src/sim/season';
import { advance } from '/home/user/tier-one/games/the-gaffer/web/src/sim/clock';
import { dispatch } from '/home/user/tier-one/games/the-gaffer/web/src/sim/commands';
import { decisions } from '/home/user/tier-one/games/the-gaffer/web/src/sim/decisions';
import { squadOf, type World } from '/home/user/tier-one/games/the-gaffer/web/src/sim/world';
const [clubId, seed, targets, mode = 'pick'] = process.argv.slice(2);
let w: World = generateRealWorld(+seed);
let c = newCareer(w, +seed, clubId, 'Audit', { age: 40, nationality: 'ENG' }, 2026);
const mor: Record<string, number[]> = {};
while (!seasonOver(c) && !c.sacked) {
  if (mode !== 'ignore') for (const d of decisions(w, c)) {
    const ch = d.kind === 'job' ? d.choices.find((x) => x.id === 'stay')! : (d.choices.find((x) => x.pick) ?? d.choices[0]);
    for (const cmd of ch.cmds) { const r = dispatch(w, c, cmd); if (r.ok) { w = r.world; c = r.career; } }
    const r = dispatch(w, c, { type: 'decision.done', id: d.id }); if (r.ok) { w = r.world; c = r.career; }
  }
  const s = advance(w, c); w = s.world; c = s.career;
  for (const t of targets.split(',')) { const sq = squadOf(w, t); (mor[t] ??= []).push(sq.reduce((a, p) => a + p.morale, 0) / sq.length); }
}
const out: any = { user: clubId, seed: +seed, mode, sacked: !!c.sacked, round: c.round };
for (const t of targets.split(',')) {
  const lg = w.clubs.find((x) => x.id === t)!.leagueId; const tb = table(w, c, lg); const i = tb.findIndex((x) => x.clubId === t);
  out[t] = { pos: i + 1, pts: tb[i].pts, p: tb[i].p, gd: tb[i].gf - tb[i].ga, morale: Math.round(mor[t].reduce((a, b) => a + b, 0) / mor[t].length) };
}
console.log(JSON.stringify(out));
