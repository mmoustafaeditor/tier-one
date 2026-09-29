// Tier One v3 — the rule set (pure: no DOM, no i18n, no storage).
// This file IS the rules. games/tier-one/v3/DESIGN.md §3 quotes these constants. The server runs this exact code to hold
// the board, answer asks and score the action log; Practice and Career run it in the browser. Hidden truth lives only in
// `board`; what a player may see is `pub(g)`.
//
// Changes from the reference engine (games/tier-one/v3/engine, never played before this build):
//  · rivals now carry their card tally weights (Tabloid +1, ITK +2, Insider +3), as DESIGN §3.5 prints them;
//  · per-saga source overrides (Career: club leaks, frozen-out kit men, Trust, early access, second opinions);
//  · an explicit action log + replay (the server scores from it), a public view, a composer preview and a
//    per-saga results explanation (what the call scored, what the exclusive needed, which reads were right);
//  · score bounds widened to 420: a board with no twist (all five Fake) can reach 5 × 84;
//  · "no twist this window" is announced on the morning of day 5 when the board has none (DESIGN §3.3 edge case).
import { RNG, hashStr } from './rng.mjs';

export const OUT = ['DONE', 'HIJACK', 'OFF', 'FAKE'];
export const DONE = 0, HIJACK = 1, OFF = 2, FAKE = 3;
const O4 = [0, 1, 2, 3];

export const RULES = {
  SAGAS: 5,
  DAYS: 7,                 // day 7 = Deadline Day
  CONTACTS: 4,             // contact points per day, days 1–6; unused points do not carry over
  DD_CONTACTS: 3,
  DD_POSTS: 3,             // Deadline Day: at most 3 posts (calls or U-turns)
  DD_SECONDS: 60,          // Deadline Day real clock
  DD_SNAP: 15,             // the last 15 s open the Quick post composer (posts at Advanced)
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
  // Career only: a club that likes you leaks (DESIGN §6.4). Never on a Daily board.
  LEAK: { cost: 2, from: 1, kind: 'own', says: OUT,
          M: [[0.85, 0.05, 0.05, 0.05], [0.05, 0.85, 0.05, 0.05], [0.05, 0.05, 0.85, 0.05], [0.05, 0.05, 0.05, 0.85]] },
  // Tiers: T1 also needs at least one exclusive. Spiked = below zero.
  TIERS: { T1: 180, T2: 120, T3: 70, T4: 0 },
  // Evidence circles: reads from the same circle are not independent (two-source rule counts circles, not reads).
  CIRCLE: { kitman: 'club', physio: 'club', agent: 'agent', spotter: 'travel', barber: 'street', tabloid: 'street', itk: 'street', insider: 'insider', leak: 'office' },
  // Source-card tally weights (what each report points to); street voices and rivals point to the outcome they claim.
  TALLY: {
    kitman: [[1, 1, 0, 0], [0, 0, 1, 1]],
    agent: [[1, 0, 0, 0], [0, 3, 0, 0], [0, 0, 3, 0], [0, 0, 0, 3]],
    spotter: [[3, 0, 0, 0], [0, 3, 0, 0], [0, 0, 1, 1]],
    physio: [[5, 0, 0, 0], [0, 5, 0, 0], [0, 0, 2, 2]],
    leak: [[3, 0, 0, 0], [0, 3, 0, 0], [0, 0, 3, 0], [0, 0, 0, 3]],
  },
  CLAIM_TALLY: { barber: 1, tabloid: 1, itk: 2, insider: 3 },
  // Rivals post overnight and are visible next morning. street = errors repeat the spin; own = errors spread evenly.
  RIVALS: [
    { id: 'tabloid', days: [1, 2], p: 0.60, rel: 0.35, kind: 'street' },
    { id: 'itk',     days: [2, 4], p: 0.70, rel: 0.55, kind: 'street' },
    { id: 'insider', days: [5, 6], p: 0.85, rel: 0.75, kind: 'own' },
  ],
  // The server rejects a stored Daily total outside these (5 × (−60 − 30) and 5 × 84).
  SCORE_MIN: -450, SCORE_MAX: 420,
};
export const SRC = ['kitman', 'barber', 'agent', 'spotter', 'physio'];
export const RIVAL_IDS = ['tabloid', 'itk', 'insider'];

// Which source a saga uses for `src` (Career may override one saga's source: leaks, frozen-out kit men, stakeouts).
export const srcOf = (R, i, src) => (R.PER && R.PER[i] && R.PER[i][src]) || (src === 'leak' ? null : R.SOURCES[src]) || null;
export const sourcesFor = (R, i) => {
  const out = Object.keys(R.SOURCES).filter((k) => srcOf(R, i, k));
  if (R.PER && R.PER[i] && R.PER[i].leak) out.push('leak');
  return out;
};

// P(report r | truth t, spin sp) for any source or rival
export function lik(so, t, sp, r) {
  if (so.kind === 'street') {
    // A street voice with its own vocabulary (Career: a frozen-out kit man) maps outcomes to what he says.
    if (so.map) return (so.map[t] === r ? so.rel : 0) + (so.map[sp] === r ? 1 - so.rel : 0);
    return r === t ? so.rel : r === sp ? 1 - so.rel : 0;
  }
  if (so.M) return so.M[t][r];
  return r === t ? so.rel : (1 - so.rel) / 3; // 'own' rival: errors spread evenly
}
const dist = (so, t, sp, n) => Array.from({ length: n }, (_, r) => lik(so, t, sp, r));
export const nSays = (so) => (so.says ? so.says.length : 4);

export const truthAt = (s, day) => (s.tw && day >= s.tw ? s.truth : s.pre);
export const eraOf = (s, day) => (s.tw && day >= s.tw ? 1 : 0);

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

// The answer depends only on (seed, saga, source, era[, second opinion]): the same question gets the same answer for
// everyone, in any order. That is what makes one seed a fair ranked board.
export function answer(board, i, src, day, R = RULES, again = false) {
  const s = board.sagas[i], e = eraOf(s, day), so = srcOf(R, i, src);
  return new RNG(hashStr(`${board.seed}|${i}|${src}|${e}${again ? '|2' : ''}`)).w(dist(so, truthAt(s, day), s.spin[e], nSays(so)));
}

export function newGame(board, R = RULES) {
  return { board, R, day: 1, left: R.CONTACTS, posts7: 0, clues: board.sagas.map(() => []), calls: board.sagas.map(() => null), pens: board.sagas.map(() => 0), feed: [], twist: null, noTwist: false, log: [] };
}
export const isOver = (g) => g.day > g.R.DAYS;
const asked = (g, i, src, e) => g.clues[i].filter((c) => c.src === src && c.era === e).length;
export function askState(g, i, src) {
  const so = srcOf(g.R, i, src);
  if (!so) return 'none';
  if (isOver(g)) return 'over';
  const e = eraOf(g.board.sagas[i], g.day), n = asked(g, i, src, e);
  const again = g.R.AGAIN && g.R.AGAIN.includes(src);
  if (n >= (again ? 2 : 1)) return 'asked';
  if (g.day < so.from) return 'closed';
  if (so.cost > g.left) return 'broke';
  return 'ok';
}
export const canAsk = (g, i, src) => i >= 0 && i < g.board.sagas.length && askState(g, i, src) === 'ok';
export function ask(g, i, src) {
  if (!canAsk(g, i, src)) return null;
  const so = srcOf(g.R, i, src), e = eraOf(g.board.sagas[i], g.day), again = asked(g, i, src, e) > 0;
  g.left -= so.cost;
  const c = { src, day: g.day, r: answer(g.board, i, src, g.day, g.R, again), era: e };
  if (again) c.again = true;
  g.clues[i].push(c); g.log.push(['a', i, src]); return c;
}
const dd7 = (g) => g.day === g.R.DAYS && g.posts7 >= g.R.DD_POSTS;
export const twistDayOf = (g, i) => (g.twist && g.twist.i === i ? g.twist.day : 0);
// Rival posts that still count on saga i (after its twist, only the ones posted since).
export const livePosts = (g, i) => { const tw = twistDayOf(g, i); return g.feed.filter((f) => f.i === i && (!tw || f.day >= tw)); };
export const curReads = (g, i) => g.clues[i].filter((c) => c.era === eraOf(g.board.sagas[i], g.day));
// What one read or post adds to each outcome on the card tally.
export function weights(R, key, r) {
  if (R.TALLY[key]) return R.TALLY[key][r];
  const w = R.CLAIM_TALLY[key] || 1;
  return O4.map((o) => (o === r ? w : 0));
}
// Which evidence circles currently point to outcome o on saga i (shown on the composer as the two-source check).
export function circlesFor(g, i, o) {
  const R = g.R, set = new Set();
  for (const c of curReads(g, i)) if (weights(R, c.src, c.r)[o] > 0) set.add(R.CIRCLE[c.src]);
  for (const f of livePosts(g, i)) if (f.claim === o) set.add(R.CIRCLE[f.id]);
  return set;
}
// Running tally per outcome from current reads + live rival posts.
export function tally(g, i) {
  const t = [0, 0, 0, 0];
  for (const c of curReads(g, i)) weights(g.R, c.src, c.r).forEach((w, o) => (t[o] += w));
  for (const f of livePosts(g, i)) weights(g.R, f.id, f.claim).forEach((w, o) => (t[o] += w));
  return t;
}
// No sources, no story: a call needs at least one read of your own on that saga in the current era
// (rival posts add evidence but can't be cited on their own).
export const hasEvidence = (g, i) => curReads(g, i).length > 0;
export function callState(g, i) {
  if (isOver(g)) return 'over';
  if (g.calls[i]) return 'called';
  if (dd7(g)) return 'ddcap';
  if (!hasEvidence(g, i)) return 'nosource';
  return 'ok';
}
export const canCall = (g, i) => i >= 0 && i < g.board.sagas.length && callState(g, i) === 'ok';
const okOS = (o, s) => Number.isInteger(o) && o >= 0 && o < 4 && Number.isInteger(s) && s >= 0 && s < 3;
export function call(g, i, o, s) {
  if (!okOS(o, s) || !canCall(g, i)) return false;
  g.calls[i] = { o, s, day: g.day, ut: false, two: circlesFor(g, i, o).size >= 2 }; if (g.day === g.R.DAYS) g.posts7++;
  g.log.push(['c', i, o, s]); return true;
}
export const canUturn = (g, i) => i >= 0 && i < g.board.sagas.length && !isOver(g) && !!g.calls[i] && !g.calls[i].ut && !dd7(g);
export function uturn(g, i, o, s) {
  if (!okOS(o, s) || !canUturn(g, i) || g.calls[i].o === o) return false;
  g.pens[i] += g.R.UT_PEN[g.calls[i].s];
  g.calls[i] = { o, s, day: g.day, ut: true, two: false, from: { o: g.calls[i].o, s: g.calls[i].s, day: g.calls[i].day } }; if (g.day === g.R.DAYS) g.posts7++;
  g.log.push(['u', i, o, s]); return true;
}
// End the day: tonight's rival posts go public; tomorrow's twist lands at dawn and wipes that saga's slate
// (its call and any U-turn penalty are void; its old reads are marked outdated; its sources can be asked again).
export function endDay(g) {
  if (isOver(g)) return false;
  const d = g.day;
  for (const s of g.board.sagas) for (const p of s.rivals) if (p.day === d) g.feed.push({ i: s.i, ...p });
  g.day = d + 1; g.log.push(['e']);
  if (isOver(g)) return true;
  const s = g.board.sagas[g.board.twI];
  if (s && s.tw === g.day) {
    const voided = g.calls[s.i] ? { ...g.calls[s.i] } : null;
    g.twist = { i: s.i, day: g.day, voided, pen: g.pens[s.i] }; g.calls[s.i] = null; g.pens[s.i] = 0;
  }
  if (g.board.twI < 0 && g.day === 5) g.noTwist = true;
  g.left = g.day === g.R.DAYS ? g.R.DD_CONTACTS : g.R.CONTACTS;
  return true;
}
// Skip to the end (Deadline Day clock ran out, or the player walks away): every remaining day ends.
export function finish(g) { while (!isOver(g)) endDay(g); return g; }

// One entry of the action log: ['a', i, src] ask · ['c', i, o, s] call · ['u', i, o, s] U-turn · ['e'] end day
export function apply(g, a) {
  if (!Array.isArray(a)) return false;
  switch (a[0]) {
    case 'a': return !!ask(g, a[1], String(a[2]));
    case 'c': return call(g, a[1], a[2], a[3]);
    case 'u': return uturn(g, a[1], a[2], a[3]);
    case 'e': return endDay(g);
    case 'f': return favour(g, String(a[1]), a[2]);
    default: return false;
  }
}
// Career Favours (never on a ranked board: only a rule set with FAVOURS accepts them). DESIGN §6.6.
export function favour(g, kind, i) {
  if (!g.R.FAVOURS || isOver(g)) return false;
  if (kind === 'burner') { g.left += 1; }
  else if (kind === 'tipoff' && g.board.sagas[i]) { g.tips = g.tips || {}; if (i in g.tips) return false; g.tips[i] = g.board.sagas[i].pre === FAKE ? 1 : 0; }
  else if (kind === 'stakeout' && g.board.sagas[i]) {
    const base = srcOf(g.R, i, 'spotter'); if (!base || base.from <= 1) return false;
    g.R.PER = g.R.PER || {}; g.R.PER[i] = { ...(g.R.PER[i] || {}), spotter: { ...base, from: Math.max(1, base.from - 1) } };
  } else return false;
  g.log.push(['f', kind, i]); return true;
}
export function replay(board, log, R = RULES) {
  const g = newGame(board, R);
  for (const a of log) if (!apply(g, a)) return null;
  return g;
}

// What a player may see. Never includes truth, spin, the twist day in advance or future rival posts.
export function pub(g) {
  return {
    day: g.day, left: g.left, posts7: g.posts7, over: isOver(g),
    clues: g.clues.map((a) => a.map((c) => ({ ...c }))), calls: g.calls.map((c) => (c ? { ...c } : null)),
    pens: g.pens.slice(), feed: g.feed.map((f) => ({ ...f })), twist: g.twist ? { ...g.twist } : null, noTwist: g.noTwist,
    ...(g.tips ? { tips: { ...g.tips } } : {}),
  };
}

// The composer: exactly what posting outcome o at strength s on saga i wins or loses today.
export function preview(g, i, o, s) {
  const R = g.R, c = g.calls[i], ut = !!c;
  const two = circlesFor(g, i, o).size >= 2, open = exclusiveOpen(g, i, o);
  const pen = g.pens[i] + (ut ? R.UT_PEN[c.s] : 0);
  const excl = !ut && R.EXCL[s] > 0 && two && open;
  const early = R.EARLY[s] * Math.max(0, R.DAYS - g.day);
  return { base: R.BASE[s], early, excl: excl ? R.EXCL[s] : 0, exclPossible: excl, two, open, pen, win: R.BASE[s] + early + (excl ? R.EXCL[s] : 0) - pen, lose: -R.LOSS[s] - pen, ut };
}

export function exclusiveOpen(g, i, o) { return !livePosts(g, i).some((f) => f.claim === o); }

// Score the window. Per saga: the full breakdown the Results page prints.
export function resolve(g) {
  const R = g.R; let total = 0, right = 0, wrong = 0, ex = 0, called = 0, uturns = 0;
  const per = g.board.sagas.map((s) => {
    const c = g.calls[s.i], pen = g.pens[s.i];
    const reads = g.clues[s.i].map((cl) => ({ ...cl, right: readRight(R, s, cl) }));
    const posts = g.feed.filter((f) => f.i === s.i).map((f) => ({ ...f, right: f.claim === truthAt(s, f.day) }));
    const firstRight = s.rivals.filter((p) => p.claim === s.truth && (!s.tw || p.day >= s.tw)).reduce((m, p) => (m && m.day <= p.day ? m : p), null);
    const base = { i: s.i, truth: s.truth, pre: s.pre, tw: s.tw, spin: s.spin[eraOf(s, R.DAYS)], spinPre: s.spin[0], reads, posts, firstRight, call: c ? { ...c } : null, pen };
    if (c && c.ut) uturns++;
    if (!c) { total -= pen; return { ...base, pts: -pen, called: false, right: false, excl: false, why: 'uncalled', parts: { base: 0, early: 0, excl: 0, loss: 0, pen } }; }
    called++;
    if (c.o !== s.truth) { wrong++; const pts = -R.LOSS[c.s] - pen; total += pts; return { ...base, pts, called: true, right: false, excl: false, why: 'wrong', parts: { base: 0, early: 0, excl: 0, loss: R.LOSS[c.s], pen } }; }
    const first = firstRight ? firstRight.day : 99;
    let why = 'ok';
    if (R.EXCL[c.s] <= 0) why = 'strength'; else if (c.ut) why = 'uturn'; else if (!c.two) why = 'twosource'; else if (first < c.day) why = 'beaten';
    const excl = why === 'ok';
    const early = R.EARLY[c.s] * (R.DAYS - c.day);
    const pts = R.BASE[c.s] + early + (excl ? R.EXCL[c.s] : 0) - pen;
    right++; if (excl) ex++; total += pts;
    return { ...base, pts, called: true, right: true, excl, why, parts: { base: R.BASE[c.s], early, excl: excl ? R.EXCL[c.s] : 0, loss: 0, pen } };
  });
  return { total, right, wrong, ex, called, uturns, per, tier: tierFor(total, ex, R) };
}
// Did this read point at what was true when it was given?
export function readRight(R, s, c) {
  const t = truthAt(s, c.day), w = weights(R, c.src, c.r);
  return w[t] > 0 && w[t] === Math.max(...w);
}
export function tierFor(total, ex, R = RULES) {
  const T = R.TIERS;
  if (total < 0) return 'SPIKED';
  if (total >= T.T1 && ex >= 1) return 'T1';
  return total >= T.T2 ? 'T2' : total >= T.T3 ? 'T3' : 'T4';
}
// Result grid for share text: one cell per saga.
export function gridRow(res) {
  return res.per.map((p) => (!p.called ? '·' : p.excl ? '★' : p.right ? '■' : '□')).join('');
}

// ---------- exact inference over what the player can see (Practice Coach mode; never used for scoring) ----------
function eraLik(g, i, era, t) {
  const R = g.R, tw = twistDayOf(g, i);
  const posts = g.feed.filter((f) => f.i === i && (tw ? (era === 1 ? f.day >= tw : f.day < tw) : true));
  const clues = g.clues[i].filter((c) => c.era === era);
  let L = 0;
  for (let sp = 0; sp < 4; sp++) {
    let l = R.SPIN[t][sp]; if (!l) continue;
    for (const c of clues) l *= lik(srcOf(R, i, c.src), t, sp, c.r);
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
