// Career sim (lane38/career, brief §11–13, §20–21; spec F §2, spec J §3): the live engine + the math lane's archetypes
// (./sim3.mjs, lane38/math) played through the five stages with the stage gates and the follower/reputation model.
// node career38.mjs [n] [gates]   gates: code (lib/career.ts STAGES, default) | math (D §8 proposal) | tiers (the byline words)
import * as E from '../../../../api/tier-one/v3/_lib/engine.mjs';
import { PLAYERS } from './sim3.mjs';
import { RNG, mean, q } from '../../../../api/tier-one/v3/_lib/rng.mjs';
const N = +process.argv[2] || 150, GATES = process.argv[3] || 'code';
const REP_GATES = GATES === 'tiers' ? [0, 55, 65, 75, 85] : GATES === 'math' ? [0, 55, 62, 70, 78] : [0, 55, 60, 65, 70];
const WIN_GATES = [0, 3, 7, 12, 17];
const STAGES = [
  { id: 'blog', sagas: 3, contacts: 3, src: ['kitman', 'barber', 'agent'], rivals: ['tabloid'], stars: [1, 1, 1, 2], reach: 0.5 },
  { id: 'local', sagas: 4, contacts: 4, src: ['kitman', 'barber', 'agent', 'spotter'], rivals: ['tabloid', 'itk'], stars: [1, 1, 2, 2], reach: 0.75 },
  { id: 'nationals', sagas: 5, contacts: 4, src: ['kitman', 'barber', 'agent', 'spotter', 'physio'], rivals: ['tabloid', 'itk', 'insider'], stars: [1, 2, 2, 3], reach: 1 },
  { id: 'pressbox', sagas: 5, contacts: 4, src: ['kitman', 'barber', 'agent', 'spotter', 'physio'], rivals: ['tabloid', 'itk', 'insider'], stars: [1, 2, 2, 3], reach: 1.5 },
  { id: 'tierone', sagas: 6, contacts: 5, src: ['kitman', 'barber', 'agent', 'spotter', 'physio'], rivals: ['tabloid', 'itk', 'insider'], stars: [2, 2, 3, 3], reach: 2 },
];
// §21 follower model (math lane D§8): base × early × star × reach × hot; exclusive +400 × star × reach; wrong −15/−50/−200 × star × reach.
const BASE = [30, 80, 200], WRONG = [15, 50, 200], EXCL = 400, HOT_CAP = 5;
const STAR_F = (st) => (st >= 3 ? 2 : st === 2 ? 1.5 : 1);
function followers(p, star, reach, hot, days) {
  const s = p.call.s, sf = STAR_F(star);
  if (p.right) return Math.round((BASE[s] * (1 + 0.1 * Math.max(0, days - p.call.day)) + (p.excl ? EXCL : 0)) * sf * reach * (1 + 0.1 * Math.min(hot, HOT_CAP)));
  return -Math.round(WRONG[s] * sf * reach);
}
function rulesFor(st) {
  const SOURCES = {}; for (const k of st.src) SOURCES[k] = E.RULES.SOURCES[k];
  return { ...E.RULES, SAGAS: st.sagas, CONTACTS: st.contacts, SOURCES, RIVALS: E.RULES.RIVALS.filter((r) => st.rivals.includes(r.id)) };
}
function career(name, seed, maxW = 45) {
  const rng = new RNG('c:' + name + seed);
  let rank = 0, windows = 0, rep = 50, fol = 0, hot = 0, t1Top = 0, done = -1, back = -1;
  const at = [0, -1, -1, -1, -1], folAt = [0, 0, 0, 0, 0], tiers = [];
  const cumT1 = [];
  for (let w = 1; w <= maxW; w++) {
    const st = STAGES[rank], R = rulesFor(st);
    const g = E.newGame(E.buildBoard(seed + ':' + w, R), R);
    const stars = Array.from({ length: R.SAGAS }, () => rng.pick(st.stars));
    while (!E.isOver(g)) { PLAYERS[name](g, rng); E.endDay(g); }
    const r = E.resolve(g);
    windows++; tiers.push(r.tier);
    const calls = r.per.filter((p) => p.call).sort((a, b) => a.call.day - b.call.day);
    for (const p of calls) {
      fol = Math.max(0, fol + followers(p, stars[p.i], st.reach, hot, R.DAYS));
      // rep model v4 (equilibrium): right +1/+1/+2 (+1 exclusive) × (100−rep)/50; wrong 0/−1/−3 × rep/50. Rep settles near
      // weighted accuracy: a 75% Advanced caller sits ~71, an 88% expert ~85, a 60% caller ~60. Volume cannot inflate it.
      if (p.right) { hot++; const g0 = [1, 1, 2][p.call.s] + (p.excl ? 1 : 0); rep = Math.min(100, rep + g0 * (100 - rep) / 50); } else { hot = 0; rep = Math.max(0, rep - [0, 1, 3][p.call.s] * rep / 50); }
    }
    if (back < 0 && fol >= 38200) back = w;
    if (rank === 4) { t1Top++; if (t1Top >= 3 && done < 0) done = w; }
    if (rank < 4 && windows >= WIN_GATES[rank + 1] && rep >= REP_GATES[rank + 1]) { rank++; at[rank] = w; folAt[rank] = fol; }
    if (done > 0) break;
  }
  return { at, folAt, back, done, rep, fol, windows, t1: tiers.filter((t) => t === 'T1').length, spiked: tiers.filter((t) => t === 'SPIKED').length };
}
const fmt = (xs) => `${q(xs, 0.5).toFixed(0)} (${q(xs, 0.1).toFixed(0)}–${q(xs, 0.9).toFixed(0)})`;
console.log(`career sim · n=${N} · gates windows ${WIN_GATES} · rep ${REP_GATES}`);
for (const name of ['cautious', 'tally', 'lateConservative', 'bayes', 'echoChamber']) {
  const rs = Array.from({ length: N }, (_, k) => career(name, 'car' + k));
  const reach = (i) => rs.map((r) => (r.at[i] < 0 ? 99 : r.at[i]));
  const row = { player: name };
  for (let i = 1; i < 5; i++) row[STAGES[i].id + ' @w'] = fmt(reach(i));
  row['stuck<T1 %'] = Math.round((100 * rs.filter((r) => r.at[4] < 0).length) / N);
  row['3w@TierOne @w'] = fmt(rs.map((r) => (r.done < 0 ? 99 : r.done)));
  row['38.2k back @w'] = fmt(rs.map((r) => (r.back < 0 ? 99 : r.back)));
  row['fol@nationals'] = fmt(rs.filter((r) => r.at[2] > 0).map((r) => r.folAt[2]));
  row['fol@tierone'] = fmt(rs.filter((r) => r.at[4] > 0).map((r) => r.folAt[4]));
  row['rep end'] = fmt(rs.map((r) => r.rep));
  row['T1/career'] = mean(rs.map((r) => r.t1)).toFixed(1);
  row['spiked/career'] = mean(rs.map((r) => r.spiked)).toFixed(1);
  console.table([row]);
}
