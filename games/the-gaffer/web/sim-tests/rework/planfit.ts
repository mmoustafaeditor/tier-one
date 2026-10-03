// Rework §I: "In your plan" on the player page (sim/planfit.ts). Every starter reads as starting in his own slot; every
// comparison is the real slot-value difference against the man who plays there; "no natural place" means more than six
// below his level everywhere in the shape; keepers only compare with the keeper. node sim-tests/build.mjs rework/planfit
import { generateRealWorld } from '../../src/sim/seed';
import { newCareer } from '../../src/sim/season';
import { squadOf } from '../../src/sim/world';
import { DEFAULT_TACTICS, FORMATIONS, slotValue, xiFor } from '../../src/sim/tactics';
import { planFit } from '../../src/sim/planfit';

let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const w = generateRealWorld(7);
const c = newCareer(w, 7, 'eng-aston-villa', 'Test', { age: 40, nationality: 'ENG' }, 2026);
const slots = FORMATIONS[(c.tactics ?? DEFAULT_TACTICS).formation].slots;
const { xi } = xiFor(w, c);
const val = (p: (typeof xi)[number], pos: (typeof slots)[number]['pos']) => slotValue({ ...p, fitness: 100, morale: 60 }, pos);

ok(xi.every((p, i) => { const f = planFit(w, c, p); return f?.k === 'starts' && f.pos === slots[i].pos; }), `all ${xi.length} starters read "starts" in their own slot`);
const bench = squadOf(w, c.clubId).filter((p) => !xi.some((q) => q.id === p.id));
const fits = bench.map((p) => ({ p, f: planFit(w, c, p)! }));
ok(fits.every(({ f }) => !!f), `every squad player outside the XI gets a reading (${bench.length})`);
ok(fits.every(({ p, f }) => f.k !== 'ahead' && f.k !== 'close' && f.k !== 'behind' ? true : Math.round(val(p, f.pos) - val(f.vs, f.pos)) === f.d && xi.includes(f.vs)), 'each comparison is the slot-value difference against that slot\'s starter');
ok(fits.every(({ f }) => f.k !== 'ahead' || f.d > 0) && fits.every(({ f }) => f.k !== 'behind' || f.d < -3), 'ahead means better, behind means more than 3 worse');
const gks = fits.filter(({ p }) => p.position === 'GK');
ok(gks.length > 0 && gks.every(({ f }) => f.pos === 'GK'), `back-up keepers are compared with the keeper (${gks.length})`);
// Targets from the rest of the world: a sample of every kind.
const others = w.players.filter((p) => p.clubId !== c.clubId && p.clubId !== 'free').slice(0, 3000).map((p) => ({ p, f: planFit(w, c, p)! }));
const kinds = new Map<string, number>(); for (const { f } of others) kinds.set(f.k, (kinds.get(f.k) ?? 0) + 1);
console.log(`  3,000 players elsewhere: ${[...kinds].map(([k, n]) => `${k} ${n}`).join(', ')}`);
ok(others.every(({ f }) => f.k !== 'starts'), 'nobody from another club reads as already starting');
const none = others.filter(({ f }) => f.k === 'none');
ok(none.every(({ p, f }) => f.d > 6 && slots.every((s) => (s.pos === 'GK') !== (p.position === 'GK') || val(p, s.pos) < p.rating - 6)), `"no natural place" is more than six below his level everywhere in the shape (${none.length})`);
const stars = w.players.filter((p) => p.clubId !== c.clubId && p.clubId !== 'free' && p.rating >= 88).map((p) => ({ p, f: planFit(w, c, p)! }));
ok(stars.length > 0 && stars.every(({ f }) => f.k === 'ahead' || f.k === 'close' || f.k === 'none'), `stars (88+) would start or push for a place (${stars.length})`);
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
