// Tier One v3 — Daily Challenge reference engine (pure: no DOM, no i18n, no storage).
// This file IS the rule set. games/tier-one/v3/DESIGN.md §3 quotes these constants; the server runs this exact code to
// hold the board, answer asks and score the action log. Hidden truth lives only in `board`; the player-visible state is
// `g` minus `g.board`. Practice and Friends rooms use RULES unchanged; Career passes a modified copy (DESIGN.md §6).
import { RNG, hashStr } from './rng.mjs';

export const OUT = ['DONE', 'HIJACK', 'OFF', 'FAKE'];
export const [DONE, HIJACK, OFF, FAKE] = [0, 1, 2, 3];
const O4 = [0, 1, 2, 3];

export const RULES = {
  SAGAS: 5,
  DAYS: 7,                 // day 7 = Deadline Day
  CONTACTS: 4,             // contact points per day, days 1–6; unused points do not carry over
  DD_CONTACTS: 3,
  DD_POSTS: 3,             // Deadline Day: 60 s clock; the engine accepts at most 3 posts on day 7
  PRIOR: [0.35, 0.20, 0.25, 0.20],             // Done / Hijack / Off / Fake at the start of the window
  // Correlated misinformation: every era of a saga has one planted "spin" (a wrong outcome the rumour mill repeats).
  SPIN: [[0, 0.40, 0.40, 0.20], [0.70, 0, 0.20, 0.10], [0.60, 0.20, 0, 0.20], [0.70, 0.20, 0.10, 0]],
  // Twists: exactly one per window, on a real story (not Fake), landing at dawn on day 4 or 5 and announced.
  TWIST_DAY: [[4, 0.5], [5, 0.5]],
  TW_M: [[0, 0.5, 0.5, 0], [0.5, 0, 0.5, 0], [0.6, 0.4, 0, 0]],
  // Publishing strengths: 0 Talks, 1 Advanced, 2 Confirmed
  BASE: [10, 20, 40],
  LOSS: [5, 15, 60],
  EARLY: [1, 2, 4],        // per day left (7 − call day) on a right call
  EXCL: [0, 0, 20],        // right Confirmed call, posted no later than the first correct rival post, passing the two-source rule
  UT_PEN: [3, 8, 30],      // U-turn: the withdrawn call costs this; the new call scores normally but is never exclusive
  // Sources. kind 'own': fixed error table M[truth][report]. kind 'street': right w.p. rel, otherwise repeats the spin.
  SOURCES: {
    kitman:  { cost: 1, from: 1, kind: 'own', says: ['LEAVING', 'STAYING'],
               M: [[0.80, 0.20], [0.80, 0.20], [0.20, 0.80], [0.20, 0.80]] },
    barber:  { cost: 1, from: 1, kind: 'street', rel: 0.45, says: OUT },
    agent:   { cost: 2, from: 1, kind: 'own', says: OUT,
               M: [[0.85, 0.05, 0.05, 0.05], [0.35, 0.55, 0.05, 0.05], [0.35, 0.05, 0.55, 0.05], [0.60, 0.05, 0.10, 0.25]] },
    spotter: { cost: 2, from: 3, kind: 'own', says: ['LINKED', 'OTHER', 'NOTHING'],
               M: [[0.85, 0.08, 0.07], [0.08, 0.85, 0.07], [0.12, 0.12, 0.76], [0.12, 0.12, 0.76]] },
    physio:  { cost: 3, from: 5, kind: 'own', says: ['LINKED', 'OTHER', 'NO MEDICAL'],
               M: [[0.92, 0.04, 0.04], [0.04, 0.92, 0.04], [0.04, 0.04, 0.92], [0.04, 0.04, 0.92]] },
  },
  // Tiers: T1 also needs at least one exclusive. Spiked = below zero.
  TIERS: { T1: 180, T2: 120, T3: 70, T4: 0 },
  // Evidence circles: reads from the same circle are not independent (two-source rule counts circles, not reads).
  CIRCLE: { kitman: 'club', physio: 'club', agent: 'agent', spotter: 'travel', barber: 'street', tabloid: 'street', itk: 'street', insider: 'insider' },
  // Source-card tally weights (what each report points to); street voices and rivals point to the outcome they claim.
  TALLY: {
    kitman: [[1, 1, 0, 0], [0, 0, 1, 1]],
    agent: [[1, 0, 0, 0], [0, 3, 0, 0], [0, 0, 3, 0], [0, 0, 0, 3]],
    spotter: [[3, 0, 0, 0], [0, 3, 0, 0], [0, 0, 1, 1]],
    physio: [[5, 0, 0, 0], [0, 5, 0, 0], [0, 0, 2, 2]],
  },
  // Rivals post overnight and are visible next morning. street = errors repeat the spin; own = errors spread evenly.
  RIVALS: [
    { id: 'tabloid', days: [1, 2], p: 0.60, rel: 0.35, kind: 'street' },
    { id: 'itk',     days: [2, 4], p: 0.70, rel: 0.55, kind: 'street' },
    { id: 'insider', days: [5, 6], p: 0.85, rel: 0.75, kind: 'own' },
  ],
};
export const SRC = Object.keys(RULES.SOURCES);

// P(report r | truth t, spin sp) for any source or rival
export function lik(so, t, sp, r) {
  if (so.kind === 'street') return r === t ? so.rel : r === sp ? 1 - so.rel : 0;
  if (so.M) return so.M[t][r];
  return r === t ? so.rel : (1 - so.rel) / 3; // 'own' rival: errors spread evenly
}
const dist = (so, t, sp, n) => Array.from({ length: n }, (_, r) => lik(so, t, sp, r));
export const nSays = (so) => (so.says ? so.says.length : 4);

export function buildBoard(seed, R = RULES) {
  const rng = new RNG('v3d:' + seed);
  const sagas = [];
  for (let i = 0; i < R.SAGAS; i++) { const pre = rng.w(R.PRIOR); sagas.push({ i, pre, truth: pre, tw: 0, spin: [rng.w(R.SPIN[pre]), 0], rivals: [] }); }
  const real = sagas.filter((s) => s.pre !== FAKE);
  let twI = -1, twDay = 0;
  if (real.length) {
    const s = real[rng.int(real.length)]; twI = s.i; twDay = R.TWIST_DAY[rng.w(R.TWIST_DAY.map((x) => x[1]))][0];
    s.tw = twDay; s.truth = rng.w(R.TW_M[s.pre]); s.spin[1] = rng.w(R.SPIN[s.truth]);
  }
  for (const s of sagas) for (const rv of R.RIVALS) {
    if (!rng.chance(rv.p)) continue;
    const day = rv.days[0] + rng.int(rv.days[1] - rv.days[0] + 1), e = eraOf(s, day);
    s.rivals.push({ id: rv.id, day, claim: rng.w(dist(rv, truthAt(s, day), s.spin[e], 4)) });
  }
  return { seed: String(seed), sagas, twI, twDay };
}
export const truthAt = (s, day) => (s.tw && day >= s.tw ? s.truth : s.pre);
export const eraOf = (s, day) => (s.tw && day >= s.tw ? 1 : 0);

// The answer depends only on (seed, saga, source, era): the same question gets the same answer for everyone,
// in any order. That is what makes one seed a fair ranked board.
export function answer(board, i, src, day, R = RULES) {
  const s = board.sagas[i], e = eraOf(s, day), so = R.SOURCES[src];
  return new RNG(hashStr(`${board.seed}|${i}|${src}|${e}`)).w(dist(so, truthAt(s, day), s.spin[e], nSays(so)));
}

export function newGame(board, R = RULES) {
  return { board, R, day: 1, left: R.CONTACTS, posts7: 0, clues: board.sagas.map(() => []), calls: board.sagas.map(() => null), pens: board.sagas.map(() => 0), feed: [], twist: null };
}
export const canAsk = (g, i, src) => {
  const so = g.R.SOURCES[src], e = eraOf(g.board.sagas[i], g.day);
  return g.day <= g.R.DAYS && g.day >= so.from && so.cost <= g.left && !g.clues[i].some((c) => c.src === src && c.era === e);
};
export function ask(g, i, src) {
  if (!canAsk(g, i, src)) return null;
  g.left -= g.R.SOURCES[src].cost;
  const c = { src, day: g.day, r: answer(g.board, i, src, g.day, g.R), era: eraOf(g.board.sagas[i], g.day) };
  g.clues[i].push(c); return c;
}
const dd7 = (g) => g.day === g.R.DAYS && g.posts7 >= g.R.DD_POSTS;
const livePosts = (g, i) => { const tw = g.twist && g.twist.i === i ? g.twist.day : 0; return g.feed.filter((f) => f.i === i && (!tw || f.day >= tw)); };
const curReads = (g, i) => g.clues[i].filter((c) => c.era === eraOf(g.board.sagas[i], g.day));
// Which evidence circles currently point to outcome o on saga i (shown on the composer as the two-source check).
export function circlesFor(g, i, o) {
  const R = g.R, set = new Set();
  for (const c of curReads(g, i)) { const w = R.TALLY[c.src] ? R.TALLY[c.src][c.r][o] : (c.r === o ? 1 : 0); if (w > 0) set.add(R.CIRCLE[c.src]); }
  for (const f of livePosts(g, i)) if (f.claim === o) set.add(R.CIRCLE[f.id]);
  return set;
}
// No sources, no story: a call needs at least one read of your own on that saga in the current era
// (rival posts add evidence but can't be cited on their own).
export const hasEvidence = (g, i) => curReads(g, i).length > 0;
export const canCall = (g, i) => g.day <= g.R.DAYS && !g.calls[i] && !dd7(g) && hasEvidence(g, i);
export function call(g, i, o, s) {
  if (!canCall(g, i)) return false;
  g.calls[i] = { o, s, day: g.day, ut: false, two: circlesFor(g, i, o).size >= 2 }; if (g.day === g.R.DAYS) g.posts7++; return true;
}
export const canUturn = (g, i) => g.day <= g.R.DAYS && !!g.calls[i] && !g.calls[i].ut && !dd7(g);
export function uturn(g, i, o, s) {
  if (!canUturn(g, i) || g.calls[i].o === o) return false;
  g.pens[i] += g.R.UT_PEN[g.calls[i].s];
  g.calls[i] = { o, s, day: g.day, ut: true, two: false }; if (g.day === g.R.DAYS) g.posts7++; return true;
}
// End the day: tonight's rival posts go public; tomorrow's twist lands at dawn and wipes that saga's slate
// (its call and any U-turn penalty are void; its old reads are marked outdated; its sources can be asked again).
export function endDay(g) {
  const d = g.day;
  for (const s of g.board.sagas) for (const p of s.rivals) if (p.day === d) g.feed.push({ i: s.i, ...p });
  g.day = d + 1;
  if (g.day > g.R.DAYS) return g;
  const s = g.board.sagas[g.board.twI];
  if (s && s.tw === g.day) { g.twist = { i: s.i, day: g.day }; g.calls[s.i] = null; g.pens[s.i] = 0; }
  g.left = g.day === g.R.DAYS ? g.R.DD_CONTACTS : g.R.CONTACTS;
  return g;
}

export function resolve(g) {
  const R = g.R; let total = 0, right = 0, wrong = 0, ex = 0, called = 0, uturns = 0;
  const per = g.board.sagas.map((s) => {
    const c = g.calls[s.i], pen = g.pens[s.i];
    if (c && c.ut) uturns++;
    if (!c) { total -= pen; return { pts: -pen, called: false }; }
    called++;
    if (c.o !== s.truth) { wrong++; const pts = -R.LOSS[c.s] - pen; total += pts; return { pts, right: false }; }
    const first = s.rivals.filter((p) => p.claim === s.truth && (!s.tw || p.day >= s.tw)).reduce((m, p) => Math.min(m, p.day), 99);
    const excl = !c.ut && c.two && R.EXCL[c.s] > 0 && first >= c.day;
    const pts = R.BASE[c.s] + R.EARLY[c.s] * (R.DAYS - c.day) + (excl ? R.EXCL[c.s] : 0) - pen;
    right++; if (excl) ex++; total += pts;
    return { pts, right: true, excl };
  });
  return { total, right, wrong, ex, called, uturns, per, tier: tierFor(total, ex, R) };
}
export function tierFor(total, ex, R = RULES) {
  const T = R.TIERS;
  if (total < 0) return 'SPIKED';
  if (total >= T.T1 && ex >= 1) return 'T1';
  return total >= T.T2 ? 'T2' : total >= T.T3 ? 'T3' : 'T4';
}

// ---------- exact inference over what the player can see (Expert bot; never used for scoring) ----------
function eraLik(g, i, era, t) {
  const R = g.R, tw = g.twist && g.twist.i === i ? g.twist.day : 0;
  const posts = g.feed.filter((f) => f.i === i && (tw ? (era === 1 ? f.day >= tw : f.day < tw) : true));
  const clues = g.clues[i].filter((c) => c.era === era);
  let L = 0;
  for (let sp = 0; sp < 4; sp++) {
    let l = R.SPIN[t][sp]; if (!l) continue;
    for (const c of clues) l *= lik(R.SOURCES[c.src], t, sp, c.r);
    for (const f of posts) l *= lik(R.RIVALS.find((x) => x.id === f.id), t, sp, f.claim);
    L += l;
  }
  return L;
}
const norm = (a) => { const z = a.reduce((x, y) => x + y, 0) || 1; return a.map((x) => x / z); };
export function posterior(g, i) {
  const R = g.R;
  if (!(g.twist && g.twist.i === i)) return norm(O4.map((t) => R.PRIOR[t] * eraLik(g, i, 0, t)));
  const p0 = norm(O4.map((t) => (t === FAKE ? 0 : R.PRIOR[t] * eraLik(g, i, 0, t))));
  const pr = O4.map((n) => O4.reduce((a, o) => a + p0[o] * (R.TW_M[o] ? R.TW_M[o][n] : 0), 0));
  return norm(O4.map((t) => pr[t] * eraLik(g, i, 1, t)));
}
// P(this saga still twists after a call made today): one twist among the ~4 real stories, landing day 4 or 5.
export function twistHazard(g, i, p) {
  if (g.twist || g.day >= 5) return 0;
  const pReal = 1 - (p ? p[FAKE] : g.R.PRIOR[FAKE]);
  return Math.min(1, pReal / (g.R.SAGAS * (1 - g.R.PRIOR[FAKE])));
}
export function exclusiveOpen(g, i, o) {
  const tw = g.twist && g.twist.i === i ? g.twist.day : 0;
  return !g.feed.some((f) => f.i === i && f.claim === o && (!tw || f.day >= tw));
}
