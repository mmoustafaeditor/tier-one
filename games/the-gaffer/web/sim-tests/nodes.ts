// Prints each contest's odds and the node visit mix for one equal-ish fixture (tuning aid).
import { generateWorld, playerOf, strengthOf } from '../src/sim/world';
import { startMatch, modelOf } from '../src/sim/match';
import { N, solve } from '../src/sim/engine/model';
const w = generateWorld(7);
const get = (id: string) => playerOf(w, id)!;
const clubs = w.clubs.filter((c) => c.leagueId === 'eng1').sort((a, b) => strengthOf(w, b.id) - strengthOf(w, a.id));
const m = startMatch(w, null, clubs[8].id, clubs[10].id, 'n', 0, true);
const M = modelOf(m, get);
const names = Object.fromEntries(Object.entries(N).map(([k, v]) => [v, k]));
for (const s of [0, 1] as const) {
  const at = M.att[s];
  const row = at.nodes.map((n, i) => `${names[i] ?? 'S' + (i - 18)}:${n.duel ? n.duel.mean.toFixed(2) + `(${n.duel.na.toFixed(1)}v${n.duel.nd.toFixed(1)})` : ''} alt[${n.alt.map((e) => e.p.toFixed(2)).join(',')}]`).slice(0, 18);
  console.log(s, row.join('  '));
  const S = solve(at);
  console.log('per possession from S0/S1/S2 [time, play, shots, xg, goals, corners, fouls, end0,1,2]:', S.v.map((v) => v.map((x) => x.toFixed(2)).join(',')).join(' | '));
}
import { simulate } from '../src/sim/match';
{
  const cnt: Record<string, number> = {}; let poss = 0; const T = 30;
  const tl = { bu: [0, 0, 0, 0], mid: [0, 0, 0, 0], ent: [0, 0, 0, 0, 0, 0], hi: [0, 0], ctr: [0, 0] };
  for (let k = 0; k < T; k++) {
    const x = startMatch(w, null, clubs[k % 20].id, clubs[(k + 7) % 20].id, 'nn' + k, 0, true);
    simulate(x, get);
    for (const e of x.events) { const key = e.kind + (e.how ? ':' + e.how : '') + (e.ok !== undefined ? ':' + e.ok : ''); cnt[key] = (cnt[key] ?? 0) + 1; }
    for (const f of ['bu', 'mid', 'ent', 'hi', 'ctr'] as const) (x.tl as any)[f].forEach((v: number, i: number) => ((tl as any)[f][i] += v));
    poss += x.stats[0][0];
  }
  console.log(JSON.stringify(Object.fromEntries(Object.entries(cnt).sort().map(([k, v]) => [k, +(v / T).toFixed(1)]))));
  console.log(JSON.stringify(Object.fromEntries(Object.entries(tl).map(([k, v]) => [k, v.map((q) => +(q / T).toFixed(1))]))));
}
