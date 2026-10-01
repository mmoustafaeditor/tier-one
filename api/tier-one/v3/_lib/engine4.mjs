// Tier One 4 — "The Call". The whole rule set in one pure file (no DOM, no i18n, no storage).
// games/tier-one/v3/RULES4.md explains every number here in plain words; the server and the browser run this exact code.
//
// The game in one breath: a window of transfer stories. Each day you get a few phone calls to make to your contacts.
// When you think you know how a story ends, you post your call and back it: ×1, ×2 or ×3. Right pays, wrong costs,
// earlier pays more, and being first with a backed call is a Scoop. The truth never changes; evidence just gets better.
import { RNG, hashStr } from './rng.mjs';

export const V = 4;
export const OUT = ['SIGNS', 'ELSEWHERE', 'STAYS'];   // joins the linked club · joins another club · doesn't move
export const SIGNS = 0, ELSEWHERE = 1, STAYS = 2;
const O3 = [0, 1, 2];

export const RULES = {
  STORIES: 5,
  DAYS: 5,                      // day 5 is Deadline Day
  CALLS: [3, 3, 3, 3, 2],       // phone calls you can make on each day; unused calls don't carry over
  PRIOR: [0.40, 0.25, 0.35],    // how stories end before anyone has asked anything
  // The rumour mill: every story has one wrong ending the street keeps repeating (it loves "he signs").
  SPIN: [[0, 0.5, 0.5], [0.7, 0, 0.3], [0.75, 0.25, 0]],
  // Backing: ×1, ×2, ×3. What a right call wins, what a wrong one costs, what each day early adds, the Scoop.
  WIN: [10, 20, 30],
  LOSS: [5, 20, 60],        // All in is loud: only worth it when you're really sure
  EARLY: [2, 3, 4],             // per day before Deadline Day, right calls only
  SCOOP: [0, 0, 25],            // right, All in, and posted before any rival posted that ending
  // Contacts. 'own' = an error table M[truth][what they say]; 'street' = right w.p. rel, otherwise repeats the mill.
  // cost = phone calls it uses; from = first day they know anything.
  SOURCES: {
    barber:  { cost: 0, from: 1, kind: 'street', rel: 0.50 },
    kitman:  { cost: 1, from: 1, kind: 'own', says: ['LEAVING', 'STAYING'], M: [[0.85, 0.15], [0.85, 0.15], [0.20, 0.80]] },
    agent:   { cost: 1, from: 1, kind: 'own', M: [[0.80, 0.10, 0.10], [0.30, 0.60, 0.10], [0.25, 0.05, 0.70]] },
    spotter: { cost: 1, from: 3, kind: 'own', says: ['SEEN THERE', 'SEEN ELSEWHERE', 'NOT SEEN'], M: [[0.85, 0.05, 0.10], [0.05, 0.85, 0.10], [0.08, 0.07, 0.85]] },
    physio:  { cost: 1, from: 5, kind: 'own', says: ['MEDICAL THERE', 'MEDICAL ELSEWHERE', 'NO MEDICAL'], M: [[0.95, 0.03, 0.02], [0.03, 0.95, 0.02], [0.03, 0.02, 0.95]] },
  },
  // Rivals post overnight; you see it the next morning. A rival's post is evidence and the clock on your Scoop.
  RIVALS: [
    { id: 'tabloid', days: [1, 2], p: 0.70, kind: 'street', rel: 0.40 },
    { id: 'itk',     days: [2, 3], p: 0.70, kind: 'street', rel: 0.60 },
    { id: 'insider', days: [3, 4], p: 0.80, kind: 'own',    rel: 0.85 },
  ],
  // Grades, per story on the board (a 5-story Daily: 180 / 120 / 60). Tier One also needs a Scoop.
  TIERS: { T1: 36, T2: 24, T3: 12, T4: 0 },
};
export const SRC = ['barber', 'kitman', 'agent', 'spotter', 'physio'];
export const RIVAL_IDS = ['tabloid', 'itk', 'insider'];
// Daily boards from this UTC date play by 4.0 (client and server); older Dailies keep v3 so the archive still replays.
export const V4_FROM = '2026-10-05';
export const isV4Day = (ymd) => String(ymd) >= V4_FROM;
// The first window (tutorial): one fixed seed, Career rank 0 rules (3 stories), Coach on.
export const TUTORIAL_SEED = 'tutorial-1';
// Deadline Day's clock, in seconds (RULES4.md §2).
export const DEADLINE_SECONDS = 90;
// Every mode a driver can run. 'daily', 'room', 'practice' and 'challenge' play RULES exactly.
export const MODES = ['daily', 'practice', 'career', 'deadline', 'room', 'challenge', 'tutorial'];

// Mode rule sets. Every mode is the same game; only these knobs move.
export function rulesFor(mode, opts = {}) {
  const R = structuredClone(RULES);
  if (mode === 'deadline' || (mode === 'career' && opts.live)) {   // Deadline Day: one day, six stories, a clock, the physio from the start
    R.STORIES = 6; R.DAYS = 1; R.CALLS = [6]; R.EARLY = [0, 0, 0]; R.CLOCK_S = DEADLINE_SECONDS;
    for (const k of SRC) R.SOURCES[k].from = 1;
    R.RIVALS = [{ id: 'tabloid', days: [0, 0], p: 0.6, kind: 'street', rel: 0.4 }, { id: 'itk', days: [0, 0], p: 0.5, kind: 'street', rel: 0.6 }];
    R.TIERS = { T1: 42, T2: 30, T3: 15, T4: 0 };      // no early bonus, but the physio is in from the start
    if (mode === 'deadline') return R;
    R.CLOCK_S = Math.max(15, Math.min(DEADLINE_SECONDS, opts.live | 0));   // Story's finale: a shorter Live (45 s)
  }
  if (mode === 'career' || mode === 'tutorial') {     // Career: rank sets the board size and how good your contacts are
    const rank = mode === 'tutorial' ? 0 : Math.min(4, Math.max(0, opts.rank | 0));    // 0 Nobody … 4 Tier One
    if (!opts.live || mode === 'tutorial') {
      R.STORIES = [3, 4, 5, 5, 6][rank];
      R.CALLS = [[3, 3, 3, 3, 2], [3, 3, 3, 3, 2], [3, 3, 3, 3, 2], [4, 3, 3, 3, 2], [4, 4, 3, 3, 2]][rank];
    }
    if (mode === 'career') story(R, rank, opts);
  }
  return R;
}
// ---------- Story mode (CONCEPT4 §10, §16): bosses, contacts by chapter, extras, Vince's clients, Vince's play.
// Every option is optional; without them Career plays exactly as before. All of it is plain data on R, so a window's
// rules rebuild from its spec (rulesOf) and a resumed window is the same window.
//   boss       'bants' | 'kev' | 'pete' | 'roar' | 'vince': the chapter's boss posts on (almost) every story; their
//              accuracy (rel), posting chance (p) and days come from BOSSES[boss][bossRank] (bossRank defaults to rank),
//              so a boss met again at a higher rank posts earlier and is right more often.
//   rivals     which ordinary rival accounts post (ids from RIVAL_IDS); the boss is added on top.
//   contacts   which contacts exist this window (others answer 'none'); missing = all five.
//   extraDm    1–2 more DMs on day 1 (a bought Career extra).
//   tagged     story indexes that are Vince's clients: the agent talks the deal up (TALK) and @ITK_Kev posts a day early.
//   planted    { i, src }: Vince's play; that contact repeats the rumour mill on story i whatever the truth.
//   live       seconds: the finale, a Deadline Day window on a shorter clock.
export const BOSSES = {
  bants: { id: 'tabloid', kind: 'street', t: [[0.95, 0.40, 1, 2], [0.95, 0.45, 1, 2], [0.95, 0.50, 1, 1], [1, 0.55, 1, 1], [1, 0.60, 1, 1]] },
  kev:   { id: 'itk',     kind: 'street', t: [[0.90, 0.55, 2, 3], [0.90, 0.60, 2, 3], [0.90, 0.65, 1, 3], [0.95, 0.70, 1, 2], [0.95, 0.75, 1, 2]] },
  pete:  { id: 'insider', kind: 'own',    t: [[0.85, 0.85, 3, 4], [0.85, 0.87, 3, 4], [0.90, 0.90, 3, 4], [0.90, 0.92, 2, 4], [0.95, 0.94, 2, 3]] },
  roar:  { id: 'roar',    kind: 'street', t: [[0.90, 0.55, 1, 3], [0.90, 0.60, 1, 3], [0.95, 0.65, 1, 3], [0.95, 0.70, 1, 2], [1, 0.75, 1, 2]] },
  vince: { id: 'vince',   kind: 'own',    t: [[1, 0.60, 1, 2], [1, 0.65, 1, 2], [1, 0.70, 1, 2], [1, 0.75, 1, 2], [1, 0.80, 1, 1]] },
};
// The agent on a Vince's-client story: talks the deal up (says SIGNS far more often when it isn't true).
export const TALK = [[0.85, 0.08, 0.07], [0.45, 0.45, 0.10], [0.40, 0.05, 0.55]];
const clampI = (x, lo, hi) => Math.min(hi, Math.max(lo, x | 0));
function story(R, rank, o) {
  if (o.trust) for (const [k, t] of Object.entries(o.trust)) sharpen(R.SOURCES[k], Math.min(1, Math.max(0, Number(t) || 0)));
  if (Array.isArray(o.contacts) && o.contacts.length) for (const k of SRC) if (!o.contacts.includes(k)) delete R.SOURCES[k];
  if (Array.isArray(o.rivals)) R.RIVALS = R.RIVALS.filter((r) => o.rivals.includes(r.id));
  const b = o.boss && BOSSES[o.boss];
  if (b) {
    const [p, rel, d0, d1] = b.t[clampI(o.bossRank ?? rank, 0, 4)];
    const days = R.DAYS === 1 ? [0, 0] : [Math.min(d0, R.DAYS - 1), Math.min(d1, R.DAYS - 1)];
    R.RIVALS = R.RIVALS.filter((r) => r.id !== b.id).concat([{ id: b.id, days, p, kind: b.kind, rel, boss: o.boss }]);
  }
  if (o.extraDm) R.CALLS[0] += clampI(o.extraDm, 0, 2);
  const per = {};
  if (Array.isArray(o.tagged) && o.tagged.length) {
    R.TAGGED = o.tagged.filter((i) => Number.isInteger(i) && i >= 0 && i < R.STORIES);
    if (R.SOURCES.agent) for (const i of R.TAGGED) per[i] = { agent: { ...R.SOURCES.agent, M: TALK.map((r) => r.slice()) } };
  }
  const pl = o.planted;
  if (pl && Number.isInteger(pl.i) && pl.i >= 0 && pl.i < R.STORIES && R.SOURCES[pl.src] && !(R.SOURCES[pl.src].says && R.SOURCES[pl.src].says.length === 2)) {
    const so = R.SOURCES[pl.src];   // a three-way contact (barber, agent, spotter, physio) whose words line up with the endings
    per[pl.i] = { ...(per[pl.i] || {}), [pl.src]: { cost: so.cost, from: so.from, ...(so.says ? { says: so.says } : {}), kind: 'street', rel: 0, planted: true } };
  }
  if (Object.keys(per).length) R.PER = per;
}
/** The source that answers on story i (a per-story override from Story mode, else the contact's own card). */
export const srcOf = (R, i, src) => (R.PER && R.PER[i] && R.PER[i][src]) || R.SOURCES[src];
// A rule spec that can travel (a challenge, a saved window): the mode and the knobs, nothing else. Unknown modes play RULES.
export function specOf(mode, opts = {}) {
  const m = MODES.includes(mode) ? mode : 'daily';
  const out = { mode: m };
  if (m === 'career') {
    out.opts = { rank: Math.min(4, Math.max(0, opts.rank | 0)) };
    if (opts.trust && typeof opts.trust === 'object') {
      const trust = {};
      for (const k of SRC) if (typeof opts.trust[k] === 'number' && opts.trust[k] > 0) trust[k] = Math.min(1, Math.round(opts.trust[k] * 100) / 100);
      if (Object.keys(trust).length) out.opts.trust = trust;
    }
    const o = out.opts, ids = (a, ok) => (Array.isArray(a) ? a.filter((x) => ok.includes(x)) : null);
    if (opts.boss && BOSSES[opts.boss]) { o.boss = opts.boss; if (opts.bossRank != null) o.bossRank = clampI(opts.bossRank, 0, 4); }
    const c = ids(opts.contacts, SRC); if (c && c.length) o.contacts = c;
    const r = ids(opts.rivals, RIVAL_IDS); if (r) o.rivals = r;
    if (opts.extraDm) o.extraDm = clampI(opts.extraDm, 0, 2);
    if (Array.isArray(opts.tagged) && opts.tagged.length) o.tagged = opts.tagged.filter((i) => Number.isInteger(i) && i >= 0 && i < 6);
    if (opts.planted && Number.isInteger(opts.planted.i) && SRC.includes(opts.planted.src)) o.planted = { i: opts.planted.i, src: opts.planted.src };
    if (opts.live) o.live = clampI(opts.live, 15, DEADLINE_SECONDS);
  }
  return out;
}
export const rulesOf = (spec) => rulesFor(spec && spec.mode, (spec && spec.opts) || {});
// What a finished window can score at most and at least (the server rejects a replay outside these).
export function bounds(R = RULES) {
  const max = (R.WIN[2] + R.EARLY[2] * Math.max(0, R.DAYS - 1) + R.SCOOP[2]) * R.STORIES;
  return { min: -Math.max(...R.LOSS) * R.STORIES, max };
}
// Trust: a contact you use gets a little more accurate (t = 0…1 → up to +8 points on the diagonal).
function sharpen(so, t) {
  if (!so) return;
  if (so.kind === 'street') { so.rel = Math.min(0.75, so.rel + 0.15 * t); return; }
  so.M = so.M.map((row, i) => {
    const k = row.length === 2 ? (i === STAYS ? 1 : 0) : i;   // the column that's the right answer for this truth
    const d = Math.min(0.97, row[k] + 0.08 * t), rest = row.reduce((a, x, j) => a + (j === k ? 0 : x), 0) || 1;
    return row.map((x, j) => (j === k ? d : (x / rest) * (1 - d)));
  });
}

// P(report r | truth t, spin sp)
export function lik(so, t, sp, r) {
  if (so.kind === 'street') return (r === t ? so.rel : 0) + (r === sp ? 1 - so.rel : 0);
  if (so.M) return so.M[t][r];
  return r === t ? so.rel : (1 - so.rel) / 2;
}
const nSays = (so) => (so.says ? so.says.length : 3);
const dist = (so, t, sp) => Array.from({ length: nSays(so) }, (_, r) => lik(so, t, sp, r));

export function buildBoard(seed, R = RULES) {
  const rng = new RNG('v4:' + seed), stories = [];
  for (let i = 0; i < R.STORIES; i++) {
    const truth = rng.w(R.PRIOR), spin = rng.w(R.SPIN[truth]), rivals = [];
    for (const rv of R.RIVALS) {
      if (!rng.chance(rv.p)) continue;
      let day = rv.days[0] + rng.int(rv.days[1] - rv.days[0] + 1);
      if (rv.id === 'itk' && R.TAGGED && R.TAGGED.includes(i)) day = Math.max(Math.min(1, day), day - 1);   // Vince's client: Kev hears first
      rivals.push({ id: rv.id, day, claim: rng.w(dist(rv, truth, spin)) });
    }
    stories.push({ i, truth, spin, rivals });
  }
  return { v: V, seed: String(seed), stories };
}
// Same question, same answer, for everyone, in any order: one seed is one fair ranked board.
export function answer(board, i, src, R = RULES) {
  const s = board.stories[i];
  return new RNG(hashStr(`${board.seed}|${i}|${src}`)).w(dist(srcOf(R, i, src), s.truth, s.spin));
}

export function newGame(board, R = RULES) {
  const g = { board, R, day: 1, left: R.CALLS[0], clues: board.stories.map(() => []), calls: board.stories.map(() => null), feed: [], log: [] };
  for (const s of board.stories) for (const p of s.rivals) if (p.day === 0) g.feed.push({ i: s.i, ...p });  // Deadline Day: already out
  return g;
}
export const isOver = (g) => g.day > g.R.DAYS;
export function askState(g, i, src) {
  const so = g.R.SOURCES[src];
  if (!so || !g.board.stories[i]) return 'none';
  if (isOver(g)) return 'over';
  if (g.clues[i].some((c) => c.src === src)) return 'asked';
  if (g.day < so.from) return 'closed';
  if (so.cost > g.left) return 'broke';
  return 'ok';
}
export function ask(g, i, src) {
  if (askState(g, i, src) !== 'ok') return null;
  g.left -= g.R.SOURCES[src].cost;
  const c = { src, day: g.day, r: answer(g.board, i, src, g.R) };
  g.clues[i].push(c); g.log.push(['a', i, src]); return c;
}
export function callState(g, i) {
  if (!g.board.stories[i]) return 'none';
  if (isOver(g)) return 'over';
  if (g.calls[i]) return 'called';
  if (!g.clues[i].length) return 'nosource';   // no contact, no story
  return 'ok';
}
const okOS = (o, s) => Number.isInteger(o) && o >= 0 && o < 3 && Number.isInteger(s) && s >= 0 && s < 3;
export function call(g, i, o, s) {
  if (!okOS(o, s) || callState(g, i) !== 'ok') return false;
  g.calls[i] = { o, s, day: g.day }; g.log.push(['c', i, o, s]); return true;
}
export function endDay(g) {
  if (isOver(g)) return false;
  for (const s of g.board.stories) for (const p of s.rivals) if (p.day === g.day) g.feed.push({ i: s.i, ...p });
  g.day++; g.log.push(['e']);
  if (!isOver(g)) g.left = g.R.CALLS[g.day - 1];
  return true;
}
export function finish(g) { while (!isOver(g)) endDay(g); return g; }
export function apply(g, a) {
  if (!Array.isArray(a)) return false;
  if (a[0] === 'a') return !!ask(g, a[1], String(a[2]));
  if (a[0] === 'c') return call(g, a[1], a[2], a[3]);
  if (a[0] === 'e') return endDay(g);
  return false;
}
export function replay(board, log, R = RULES) { const g = newGame(board, R); for (const a of log) if (!apply(g, a)) return null; return g; }
export function pub(g) {
  return { v: V, day: g.day, left: g.left, over: isOver(g), clues: g.clues.map((a) => a.map((c) => ({ ...c }))), calls: g.calls.map((c) => (c ? { ...c } : null)), feed: g.feed.map((f) => ({ ...f })) };
}

// A Scoop is still on if no rival has posted that ending yet.
export const scoopOpen = (g, i, o) => !g.feed.some((f) => f.i === i && f.claim === o);
const daysLeft = (R, day) => Math.max(0, R.DAYS - day);
// The post screen: exactly what this call wins or costs if you post it now.
export function preview(g, i, o, s) {
  const R = g.R, early = R.EARLY[s] * daysLeft(R, g.day), scoop = R.SCOOP[s] > 0 && scoopOpen(g, i, o);
  return { win: R.WIN[s] + early + (scoop ? R.SCOOP[s] : 0), lose: -R.LOSS[s], early, scoop: scoop ? R.SCOOP[s] : 0 };
}
export function resolve(g) {
  const R = g.R; let total = 0, right = 0, wrong = 0, scoops = 0, called = 0;
  const per = g.board.stories.map((s) => {
    const c = g.calls[s.i];
    const firstRight = s.rivals.filter((p) => p.claim === s.truth).reduce((m, p) => (m && m.day <= p.day ? m : p), null);
    const reads = g.clues[s.i].map((cl) => ({ ...cl, right: readRight(R, s, cl) }));
    const base = { i: s.i, truth: s.truth, spin: s.spin, reads, rivals: s.rivals.map((p) => ({ ...p, right: p.claim === s.truth })), firstRight, call: c ? { ...c } : null };
    if (!c) return { ...base, pts: 0, right: false, scoop: false, why: 'uncalled', parts: { win: 0, early: 0, scoop: 0, loss: 0 } };
    called++;
    if (c.o !== s.truth) { wrong++; total -= R.LOSS[c.s]; return { ...base, pts: -R.LOSS[c.s], right: false, scoop: false, why: 'wrong', parts: { win: 0, early: 0, scoop: 0, loss: R.LOSS[c.s] } }; }
    // Rivals post overnight, so a rival's day-d post beats only calls made after day d.
    const beaten = firstRight && firstRight.day < c.day;
    const scoop = R.SCOOP[c.s] > 0 && !beaten;
    const early = R.EARLY[c.s] * daysLeft(R, c.day), pts = R.WIN[c.s] + early + (scoop ? R.SCOOP[c.s] : 0);
    right++; if (scoop) scoops++; total += pts;
    return { ...base, pts, right: true, scoop, why: scoop ? 'scoop' : R.SCOOP[c.s] <= 0 ? 'small' : 'beaten', parts: { win: R.WIN[c.s], early, scoop: scoop ? R.SCOOP[c.s] : 0, loss: 0 } };
  });
  return { v: V, total, right, wrong, scoops, called, per, tier: tierFor(total, scoops, R) };
}
export function readRight(R, s, c) {
  const so = R.SOURCES[c.src];
  if (so.says && so.says.length === 2) return c.r === (s.truth === STAYS ? 1 : 0);
  return c.r === s.truth;
}
export function tierFor(total, scoops, R = RULES) {
  const n = R.STORIES, T = { T1: R.TIERS.T1 * n, T2: R.TIERS.T2 * n, T3: R.TIERS.T3 * n };
  if (total < 0) return 'SPIKED';
  if (total >= T.T1 && (scoops >= 1 || !R.SCOOP[2])) return 'T1';
  return total >= T.T2 ? 'T2' : total >= T.T3 ? 'T3' : 'T4';
}
export const tierBars = (R = RULES) => ({ T1: R.TIERS.T1 * R.STORIES, T2: R.TIERS.T2 * R.STORIES, T3: R.TIERS.T3 * R.STORIES });
export const gridRow = (res) => res.per.map((p) => (!p.call ? '·' : p.scoop ? '★' : p.right ? '■' : '□')).join('');

// Exact odds from what the player can see (Practice "Coach"; the sims' skilled player). Never used for scoring.
export function posterior(g, i) {
  const R = g.R, L = [0, 0, 0];
  for (const t of O3) for (const sp of O3) {
    let l = R.PRIOR[t] * R.SPIN[t][sp]; if (!l) continue;
    for (const c of g.clues[i]) l *= lik(srcOf(R, i, c.src), t, sp, c.r);
    for (const f of g.feed) if (f.i === i) l *= lik(R.RIVALS.find((x) => x.id === f.id), t, sp, f.claim);
    L[t] += l;
  }
  const z = L[0] + L[1] + L[2] || 1; return L.map((x) => x / z);
}
