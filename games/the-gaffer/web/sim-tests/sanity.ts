// Quick sanity run: ~240 matches between clubs of five leagues (FAST), a few FULL ones, and the headline numbers.
// Usage: node sim-tests/build.mjs sanity [seed]
import { generateWorld, playerOf, strengthOf } from '../src/sim/world';
import { startMatch, simulate, predict, expected } from '../src/sim/match';

const seed = +(process.argv[2] ?? 7);
const w = generateWorld(seed);
const get = (id: string) => playerOf(w, id)!;
const clubs = w.clubs.filter((c) => ['eng1', 'esp1', 'egy1', 'eng2', 'ksa1'].includes(c.leagueId));
let n = 0, goals = 0, hw = 0, dr = 0, shots = 0, ont = 0, corners = 0, fouls = 0, yel = 0, red = 0, xg = 0, poss = 0, offs = 0, pens = 0, big = 0, fullN = 0, pred = 0, inj = 0, subs = 0;
const types: Record<string, number> = {};
const gap: Record<string, [number, number, number, number]> = {};
const t0 = performance.now();
const N = +(process.argv[3] ?? 240);
for (let k = 0; k < N; k++) {
  const h = clubs[(k * 7) % clubs.length], lg = clubs.filter((c) => c.leagueId === h.leagueId), a = lg[(k * 13 + 5) % lg.length];
  if (h.id === a.id) continue;
  const full = k % 10 === 0;
  const m = startMatch(w, null, h.id, a.id, `s:${seed}:${k}`, 0, full);
  const p = predict(m, get);
  simulate(m, get);
  n++; if (full) fullN++;
  goals += m.goals[0] + m.goals[1];
  if (m.goals[0] > m.goals[1]) hw++; else if (m.goals[0] === m.goals[1]) dr++;
  pred += p[0];
  for (const s of m.stats) { shots += s[1]; ont += s[2]; corners += s[3]; fouls += s[4]; yel += s[5]; red += s[6]; }
  poss += m.stats[0][0]; xg += m.xg![0] + m.xg![1];
  for (const e of m.events) {
    if (e.kind === 'offside') offs++;
    if (e.kind === 'injury') inj++;
    if (e.kind === 'sub') subs++;
    if (e.kind === 'goal') { types[e.how!] = (types[e.how!] ?? 0) + 1; if (e.how === 'pen') pens++; }
    if ((e.kind === 'goal' || e.kind === 'miss' || e.kind === 'save' || e.kind === 'block') && (e.xg ?? 0) >= 0.3) big++;
    if (e.kind === 'goal' || e.kind === 'miss' || e.kind === 'save' || e.kind === 'block') types['s_' + e.how] = (types['s_' + e.how] ?? 0) + 1;
  }
  const g = Math.max(-12, Math.min(12, Math.round((strengthOf(w, h.id) - strengthOf(w, a.id)) / 4) * 4));
  const b = gap[g] ?? (gap[g] = [0, 0, 0, 0]); b[0]++; if (m.goals[0] > m.goals[1]) b[1]++; else if (m.goals[0] === m.goals[1]) b[2]++; else b[3]++;
}
const ms = performance.now() - t0;
const f = (x: number) => +(x / n).toFixed(2);
console.log(JSON.stringify({ n, fullN, msPerMatch: +(ms / n).toFixed(2), goals: f(goals), homeWin: f(hw), draw: f(dr), predHome: f(pred), shots: f(shots), onTarget: f(ont), xg: f(xg), corners: f(corners), fouls: f(fouls), yellows: f(yel), reds: f(red), offsides: f(offs), pens: f(pens), bigChances: f(big), injuries: f(inj), subs: f(subs), homePoss: f(poss) }));
console.log(JSON.stringify(Object.fromEntries(Object.entries(gap).sort((a, b) => +a[0] - +b[0]).map(([k, v]) => [k, `${v[0]}: ${Math.round(100 * v[1] / v[0])}/${Math.round(100 * v[2] / v[0])}/${Math.round(100 * v[3] / v[0])}`]))));
console.log(JSON.stringify(types));
const m0 = startMatch(w, null, clubs[0].id, clubs[1].id, 'x', 0, true);
console.log(JSON.stringify(expected(m0, get)));
