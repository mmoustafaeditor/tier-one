// V2.6 training & pathway: one quick sanity run (not a suite). node sim-tests/build.mjs youth [seed] [seasons]
// Checks: the world passes its invariants with academies; growth by minutes and age; AI prospects on the same function;
// load → injury risk; Intake Day happens once; a season end promotes/releases academy kids; save → upgrade path.
import { generateRealWorld } from '../src/sim/seed';
import { newCareer, seasonOver } from '../src/sim/season';
import { advance, endOfSeason } from '../src/sim/clock';
import { checkWorld, playerOf, squadOf } from '../src/sim/world';
import { checkCareer } from '../src/sim/save';
import { seedAcademies, growth, minutesFactor, riskMult, intakeDay, academyOf, dec } from '../src/sim/youth';
import { dispatch } from '../src/sim/commands';
import type { Player } from '../src/model/types';

const seed = +(process.argv[2] ?? 7);
const seasons = +(process.argv[3] ?? 1);
let w = generateRealWorld(seed);
let c = newCareer(w, seed, 'eng-aston-villa', 'Test', { age: 40, nationality: 'ENG' }, 2026);
w = seedAcademies(w, c);
console.log('academy kids', (w.academy ?? []).length, 'world issues', checkWorld(w).length);

// The function itself: a 19-year-old, 900 vs 90 minutes over the last five matchdays.
const kid = { ...squadOf(w, c.clubId)[0], rating: 60, potential: 80, birthYear: 2007 } as Player;
const g = (m5: number) => growth(kid, 19, 1.2, minutesFactor({ ...kid, m5 }), 1);
console.log(`19yo growth per matchday: 900 min ${g(900).toFixed(2)} vs 90 min ${g(90).toFixed(2)} (×${(g(900) / g(90)).toFixed(2)})`);
console.log('risk multiplier at load 40/60/75/90:', [40, 60, 75, 90].map(riskMult).join(' / '));

const buckets = (ps: Player[], season: number) => [[15, 19], [20, 23], [24, 27], [28, 30], [31, 33], [34, 40]].map(([a, b]) => {
  const xs = ps.filter((p) => p.clubId !== 'free' && season - p.birthYear >= a && season - p.birthYear <= b);
  return `${a}-${b}: ${(xs.reduce((s, p) => s + p.rating, 0) / Math.max(1, xs.length)).toFixed(1)}`;
}).join(' | ');
const top = (ps: Player[]) => ps.filter((p) => p.clubId !== 'free').map((p) => p.rating).sort((a, b) => b - a).slice(0, 100).reduce((s, v) => s + v, 0) / 100;
console.log('start by age', buckets(w.players, c.season), 'top100', top(w.players).toFixed(1));
const t0 = performance.now();
const aiKid = (w.academy ?? []).find((k) => k.clubId === 'eng-arsenal')!;
const aiYoung = squadOf(w, 'eng-chelsea').filter((p) => c.season - p.birthYear <= 21).sort((a, b) => b.rating - a.rating)[0];
const start = { aiKid: aiKid.rating, aiYoung: aiYoung.rating };
let injuries = 0, userInjuries = 0, intakes = 0;
for (let s = 0; s < seasons; s++) {
  // Heavy training for the first half, to see load and knocks.
  let r = dispatch(w, c, { type: 'training.set', load: 2 }); if (r.ok) { w = r.world; c = r.career; }
  while (!seasonOver(c)) {
    const before = c;
    const st = advance(w, c);
    w = st.world; c = st.career;
    if (st.mine) {
      injuries += st.mine.events.filter((e) => e.kind === 'injury').length;
      userInjuries += st.mine.events.filter((e) => e.kind === 'injury' && st.mine!.sides[e.side].clubId === c.clubId).length;
    }
    if (c.intake?.arrived && !before.intake?.arrived) intakes++;
    if (c.round === 20) { r = dispatch(w, c, { type: 'training.set', load: 1 }); if (r.ok) { w = r.world; c = r.career; } }
  }
  const high = squadOf(w, c.clubId).filter((p) => (p.load ?? 0) > 75).length;
  console.log(`season ${c.season}: intake day ${intakeDay(c)}, intakes ${intakes}, my academy ${academyOf(w, c.clubId).length}, high-load now ${high}, user-match injuries ${userInjuries}/${injuries}`);
  const e = endOfSeason(w, c);
  w = e.world; c = e.career;
  console.log(`  season end: promoted to my squad ${e.summary.academy.length}, world ${checkWorld(w).length} issues, career ${checkCareer(w, c).join(";") || 0}`);
}
const k2 = (w.academy ?? []).find((k) => k.id === aiKid.id) ?? playerOf(w, aiKid.id);
const y2 = playerOf(w, aiYoung.id);
console.log(`Arsenal academy kid ${aiKid.id}: ${start.aiKid} → ${k2?.rating} (${k2?.clubId})`);
console.log(`Chelsea youngster ${aiYoung.name.en}: ${start.aiYoung} → ${y2?.rating}, minutes ${y2?.ms ?? 0}, history ${(y2?.rh ?? []).map((v) => dec(v).rating).join(',')}`);
console.log('end by age  ', buckets(w.players, c.season), 'top100', top(w.players).toFixed(1));
const all = w.players.filter((p) => p.clubId !== 'free');
console.log('mean rating now', (all.reduce((a, p) => a + p.rating, 0) / all.length).toFixed(2), 'players', all.length, `${((performance.now() - t0) / 1000).toFixed(1)} s`);
console.log('my academy:', academyOf(w, c.clubId).map((k) => `${k.position} ${c.season - k.birthYear}y ${k.rating}/${k.potential}`).join(', '));
console.log('staff log:', (c.staffLog ?? []).filter((l) => l.duty === 'academy' || l.duty === 'medical').slice(0, 8).map((l) => `${l.duty}:${l.key}`).join(' '));
console.log('loans out:', (c.loans ?? []).map((l) => `${l.playerId}${l.ya ? '(ya)' : ''}→${l.to}`).join(' '));
