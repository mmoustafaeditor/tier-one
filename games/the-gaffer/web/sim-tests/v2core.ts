// V2.0–V2.3 core: a real-world career through commands and the clock. node sim-tests/build.mjs v2core [seed] [rounds]
import { generateRealWorld } from '../src/sim/seed';
import { newCareer, seasonOver } from '../src/sim/season';
import { advance, simUntil, endOfSeason, finishSeason } from '../src/sim/clock';
import { dispatch } from '../src/sim/commands';
import { decisions } from '../src/sim/decisions';
import { checkWorld, playerOf } from '../src/sim/world';
import { checkCareer } from '../src/sim/save';
import { checkEvents } from '../src/sim/events';
import { table } from '../src/sim/season';

const seed = +(process.argv[2] ?? 7);
const rounds = +(process.argv[3] ?? 6);
let w = generateRealWorld(seed);
let c = newCareer(w, seed, 'eng-aston-villa', 'Test', { age: 40, nationality: 'ENG' }, 2026);
const t0 = performance.now();
for (let i = 0; i < rounds; i++) {
  const ds = decisions(w, c);
  console.log(`md${c.round + 1}: ${ds.length} decisions: ${ds.map((d) => `${d.kind}/${d.title.key}`).join(', ')}`);
  for (const d of ds) {
    const ch = d.choices.find((x) => x.pick) ?? d.choices[0];
    for (const cmd of ch.cmds) { const r = dispatch(w, c, cmd); if (r.ok) { w = r.world; c = r.career; } else console.log('  refused', cmd.type, r.reason); }
    const r = dispatch(w, c, { type: 'decision.done', id: d.id }); if (r.ok) { w = r.world; c = r.career; }
  }
  const s = advance(w, c);
  w = s.world; c = s.career;
  if (s.after) console.log(`  ${s.after.res} ${s.after.mine}-${s.after.theirs} v ${s.after.opp} xG ${s.after.xg.map((x) => x.toFixed(2)).join('-')} pos ${s.after.pos} board ${s.after.board.map(Math.round)} why ${s.after.why?.points.map((p) => p.k).join(',')}`);
}
console.log('staff log:', (c.staffLog ?? []).slice(0, 6).map((l) => `${l.duty}:${l.key}${l.b ? `(${l.b})` : ''}`).join(' | '));
console.log('events:', (c.events ?? []).length, 'check', checkEvents(c).length, 'world', checkWorld(w).length, 'career', checkCareer(w, c).length);
const sim = simUntil(w, c, (ww, cc) => (decisions(ww, cc).length ? 'decision' : null), 8);
console.log('simUntil:', sim.digest.results.length, 'results, stopped:', sim.digest.stopped, 'staff calls', sim.digest.staff);
w = sim.world; c = sim.career;
const fin = finishSeason(w, c);
const eos = endOfSeason(fin.world, fin.career);
console.log(`season done in ${((performance.now() - t0) / 1000).toFixed(1)} s: finished ${eos.summary.record.position}, champion ${eos.summary.record.champion}`, seasonOver(fin.career));
console.log('top 5:', table(fin.world, fin.career, 'eng1').slice(0, 5).map((r) => `${r.clubId} ${r.pts}`).join(', '));
console.log('mbappe', playerOf(eos.world, 'p-kylian-mbappe')?.rating);
