// B4: the hidden traits in the engine (engine/traits.ts, model.ts TRAIT). The same matches with the traits on and off:
// the totals stay football (goals and xG within 3%), and the differences between players show: composed finishers
// beat their xG, men with vision make more of the assists, good movers take more of the shots.
//   node sim-tests/build.mjs traitsengine [matches=1500]
import { generateWorld, playerOf } from '../src/sim/world';
import { startMatch, simulate } from '../src/sim/match';
import { TRAIT } from '../src/sim/engine/model';
import { traitsOf } from '../src/sim/engine/traits';
const w = generateWorld(7); const get = (id: string) => playerOf(w, id)!;
const clubs = w.clubs.filter((c) => ['eng1', 'esp1', 'ita1', 'ger1', 'fra1', 'egy1'].includes(c.leagueId));
const N = +(process.argv[2] ?? 1500);
const ON = { ...TRAIT };
type P = { g: number; xg: number; sh: number; as: number };
function run(on: boolean) {
  Object.assign(TRAIT, on ? ON : { CALM: 0, MOVE: 0, VISION: 0, PEN: 0 });
  const per: Record<string, P> = {}; let goals = 0, xg = 0;
  for (let i = 0; i < N; i++) {
    const h = clubs[(i * 7) % clubs.length], a = clubs[(i * 13 + 5) % clubs.length];
    if (h.id === a.id) continue;
    const m = startMatch(w, null, h.id, a.id, `te-${i}`, 0, false);
    simulate(m, get);
    goals += m.goals[0] + m.goals[1]; xg += m.xg![0] + m.xg![1];
    for (const e of m.events) {
      if (!['goal', 'miss', 'save', 'block'].includes(e.kind) || e.how === 'pen' || !e.playerId) continue;
      const q = (per[e.playerId] ??= { g: 0, xg: 0, sh: 0, as: 0 }); q.sh++; q.xg += e.xg ?? 0; if (e.kind === 'goal') { q.g++; if (e.assistId) (per[e.assistId] ??= { g: 0, xg: 0, sh: 0, as: 0 }).as++; }
    }
  }
  return { per, goals, xg };
}
const on = run(true), off = run(false);
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };
const dG = on.goals / off.goals - 1, dX = on.xg / off.xg - 1;
ok(Math.abs(dG) < 0.03 && Math.abs(dX) < 0.03, `totals stay football: goals ${(100 * dG).toFixed(1)}%, xG ${(100 * dX).toFixed(1)}% (within 3%)`);
// Thirds by trait, among players with enough of the thing measured.
const thirds = (rows: { t: number; v: number; n: number }[]) => { const s = [...rows].sort((a, b) => a.t - b.t), k = Math.floor(s.length / 3); const m = (xs: typeof s) => xs.reduce((a, b) => a + b.v, 0) / Math.max(1, xs.reduce((a, b) => a + b.n, 0)); return [m(s.slice(0, k)), m(s.slice(-k))]; };
const tr = (id: string) => traitsOf(get(id));
const fin = (r: typeof on) => thirds(Object.entries(r.per).filter(([, q]) => q.sh >= 15).map(([id, q]) => ({ t: tr(id).calm, v: q.g - q.xg, n: q.sh })));
const [fLo, fHi] = fin(on), [f0Lo, f0Hi] = fin(off);
ok(fHi - fLo > (f0Hi - f0Lo) + 0.01, `composed finishers beat their xG: goals over xG a shot, most vs least composed third ${(fHi - fLo).toFixed(3)} (traits off ${(f0Hi - f0Lo).toFixed(3)})`);
const ast = (r: typeof on) => thirds(Object.keys(r.per).filter((id) => ['CM', 'CAM', 'CDM'].includes(get(id).position)).map((id) => ({ t: tr(id).vision, v: r.per[id].as, n: 1 })));
const [aLo, aHi] = ast(on), [a0Lo, a0Hi] = ast(off);
ok(aHi / Math.max(0.01, aLo) > (a0Hi / Math.max(0.01, a0Lo)) * 1.05, `vision makes assists: midfielders' assists, most vs least vision third ×${(aHi / aLo).toFixed(2)} (traits off ×${(a0Hi / a0Lo).toFixed(2)})`);
const shots = (r: typeof on) => thirds(Object.keys(r.per).filter((id) => ['ST', 'LW', 'RW'].includes(get(id).position)).map((id) => ({ t: tr(id).offBall, v: r.per[id].sh, n: 1 })));
const [sLo, sHi] = shots(on), [s0Lo, s0Hi] = shots(off);
ok(sHi / sLo > (s0Hi / s0Lo) * 1.05, `good movers take more of the shots: forwards' shots, best vs worst third ×${(sHi / sLo).toFixed(2)} (traits off ×${(s0Hi / s0Lo).toFixed(2)})`);
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
