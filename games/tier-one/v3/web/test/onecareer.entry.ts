// One career (GOTY.md §7.2) node tests: the v2 → v3 save migration on fixtures, and a simulated Career window, Daily
// and Wire settle moving the same numbers. Bundled by scripts/test-onecareer.mjs (vite SSR build) and run in node
// with a window/localStorage shim, so the real lib code runs, not a copy.
import assert from 'node:assert/strict';
import { migrate, fresh, update, getSave, trustToXp, SAVE_V } from '../src/lib/save';
import { E, castFor } from '../src/lib/engine';
import { newCareer, castOpts, careerRules, applyWindow, RANKS, careerTrust } from '../src/lib/career';
import { bylineOf, bookOf, rivalOf, RIVALS, recordWindow, recordWireResolution, careerDelta, lastDelta, REP_TIERS, repTier, followerDelta, lvOfXp, careerSnapshot } from '../src/lib/byline';
import { chapterOf, storyBeats, pushBeats } from '../src/lib/storyMode';
import { practiceRules } from '../src/lib/driver';
import { levelOf } from '../src/lib/progress';

type Any = Record<string, any>;
const tests: [string, () => void][] = [];
const test = (n: string, f: () => void) => tests.push([n, f]);

// ---------------------------------------------------------------- fixtures
const today = new Date().toISOString().slice(0, 10);
const base = (): Any => ({
  v: 2, dev: 'devFixture0001', nick: 'Sam Reyes', lang: 'en', edition: '', sound: false, reduced: true, onboarded: true,
  daily: { [today]: { no: 400, total: 180, tier: 'T3', row: '■□★··', ex: 1 } }, streak: { n: 4, best: 6, last: today, grace: 0 },
  credits: 90, ledger: [], owned: [], theme: 'standard', pp: 85, ach: {}, stats: {}, practice: { coach: true, live: null, played: 0, day: '', today: 0 },
  rooms: [], milestones: {}, wireSeen: [], slot: 0, story: { prologue: true, chapterSeen: 0 },
});
// A 3.3 career slot: its own followers, rep and contact trust, as saved before 3.4.
const legacyCareer = (o: Any = {}): Any => ({
  slot: 1, paper: 'The Reyes Report', rank: 0, windows: 3, rep: 62, followers: 8400, favours: { burner: 1, tipoff: 1, stakeout: 0 },
  contacts: { kitman: { trust: 30 }, barber: { trust: 3 } }, relations: { ars: { v: 2, last: 2 } }, t1: 0, exclusives: 1, right: 5, calls: 7, uturns: 1,
  history: [{ n: 3, total: 120, tier: 'T3', repAfter: 62, at: Date.now() }], live: null, restarts: 0, ...o,
});
/** 3.3: both systems side by side (the audit's two follower counts: 53 on the byline, 8,400 in Story). */
export const fixture33 = (): Any => {
  const c = legacyCareer();
  return { ...base(), career: c, slots: [{ career: c, story: { prologue: true, chapterSeen: 0 } }, null, null],
    byline: { followers: 53, rep: 50, hot: 1, best: 3 }, book: { kitman: { xp: 100, lv: 2, asks: 8, hits: 5 } },
    rivals: { tabloid: { w: 2, l: 1, d: 0, streak: 1, last: 'w' } }, feed: [] };
};
const fixture3slots = (): Any => {
  const a = legacyCareer({ rep: 40, followers: 100, contacts: { kitman: { trust: 10 } } });
  const b = legacyCareer({ slot: 2, rank: 2, windows: 22, rep: 70, followers: 9000, contacts: { agent: { trust: 75 }, kitman: { trust: 5 } } });
  const c = legacyCareer({ slot: 3, rank: 1, windows: 9, rep: 55, followers: 500, contacts: { barber: { trust: 20 } } });
  return { ...base(), career: a, slot: 0, slots: [a, { career: b }, { career: c }].map((x, k) => (k === 0 ? { career: x as Any } : x)), byline: { followers: 700, rep: 52, hot: 0, best: 2 } };
};

// ---------------------------------------------------------------- migration
test('fresh save is v3 with nothing to migrate', () => {
  const s = migrate(fresh());
  assert.equal(s.v, SAVE_V); assert.equal(s.career, null); assert.equal(s.byline, undefined);
  const e = migrate({}); assert.equal(e.v, SAVE_V); assert.ok(Array.isArray(e.slots));
});
test('3.3 save: the byline keeps the higher followers and rep once; trust becomes book XP where higher', () => {
  const s = migrate(fixture33());
  assert.equal(s.v, 3);
  assert.equal(s.byline!.followers, 8400, 'max(53, 8400)');
  assert.equal(s.byline!.rep, 62, 'max(50, 62)');
  assert.equal(s.byline!.hot, 1, 'the hot hand is untouched');
  assert.equal(s.book!.kitman.xp, trustToXp(30), 'trust 30 (level 3) beats 100 XP'); assert.equal(s.book!.kitman.lv, 4); assert.equal(s.book!.kitman.asks, 8, 'counters kept');
  assert.equal(s.book!.barber.xp, trustToXp(3)); assert.equal(s.book!.barber.lv, 1);
  const c = s.career as Any;
  for (const k of ['rep', 'followers', 'contacts']) assert.ok(!(k in c), 'career no longer stores ' + k);
  assert.equal(c.rank, 0); assert.equal(c.windows, 3); assert.equal(c.relations.ars.v, 2); assert.equal(c.history[0].repAfter, 62, 'history is a record');
  assert.ok(!('rep' in (s.slots![0] as Any).career));
  assert.deepEqual(s.rivals!.tabloid.w, 2, 'ledger untouched');
  // migrating twice changes nothing
  const t = migrate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(t.byline, s.byline); assert.deepEqual(t.book, s.book);
});
test('trust points map onto book levels band for band', () => {
  assert.equal(trustToXp(0), 0); assert.equal(lvOfXp(trustToXp(0)), 1);
  assert.equal(lvOfXp(trustToXp(6)), 2); assert.equal(lvOfXp(trustToXp(15)), 3); assert.equal(lvOfXp(trustToXp(28)), 4);
  assert.equal(trustToXp(45), 560); assert.equal(trustToXp(70), 560); assert.equal(lvOfXp(560), 5);
  assert.ok(trustToXp(10) > trustToXp(6) && trustToXp(10) < trustToXp(15), 'monotonic inside a band');
});
test('three career slots: one name takes the best of all three', () => {
  const s = migrate(fixture3slots());
  assert.equal(s.byline!.followers, 9000); assert.equal(s.byline!.rep, 70);
  assert.equal(lvOfXp(s.book!.agent.xp), 5, 'agent trust 75 is the gold card'); assert.equal(s.book!.kitman.xp, trustToXp(10)); assert.equal(lvOfXp(s.book!.barber.xp), 3);
  for (const sl of s.slots!) { const c = (sl as Any).career; assert.ok(c && !('rep' in c) && !('followers' in c) && !('contacts' in c)); }
  assert.equal((s.slots![1] as Any).career.rank, 2, 'each slot keeps its own story');
  assert.equal((s.slots![2] as Any).career.windows, 9);
});
test('a v0 save with a career runs the whole chain', () => {
  const raw: Any = { ...base(), career: legacyCareer({ rep: 58, followers: 1200 }) }; delete raw.v; delete raw.slots;
  const s = migrate(raw);
  assert.equal(s.v, 3); assert.equal(s.byline!.rep, 58); assert.equal(s.byline!.followers, 1200); assert.ok(!('rep' in (s.career as Any)));
  assert.equal((s.slots![0] as Any).career, s.career, 'v1→v2 put the career in slot 1');
});
test('rep tiers are the career rank gates', () => {
  RANKS.forEach((r, i) => assert.equal(r.gate[1], REP_TIERS[i][1]));
  assert.equal(repTier(50), 'blogger'); assert.equal(repTier(55), 'stringer'); assert.equal(repTier(85), 'tierone');
});

// ---------------------------------------------------------------- one window, three modes, the same numbers
function playWindow(seed: string, plan: { i: number; o: number; s: number }[], asks: [number, string][], R = E.RULES) {
  const board = E.buildBoard(seed, R), g = E.newGame(board, R);
  for (const [i, src] of asks) assert.ok(E.apply(g, ['a', i, src]), 'ask ' + src);
  for (const p of plan) assert.ok(E.apply(g, ['c', p.i, p.o, p.s]), 'call ' + JSON.stringify(p));
  E.finish(g);
  return { g, res: E.resolve(g) };
}
const reset = () => update(() => migrate(fixture33()));
test('a Career window moves the byline, the book and the ledger through applyWindow, once', () => {
  reset();
  update((s) => { s.career = newCareer(); s.story = { prologue: true, chapterSeen: 0 }; s.byline!.hot = 0; s.byline!.rep = 50; s.byline!.followers = 1000; });
  const s0 = getSave(); const c0 = s0.career!;
  const seed = 'ONECAR1';
  const cast = castFor(seed, castOpts(c0)); const R = careerRules(c0, cast, s0);
  const board = E.buildBoard(seed, R);
  const clean = board.sagas.filter((x) => x.i !== board.twI);
  const right = clean[0], wrong = clean[1];
  const { g, res } = playWindow(seed, [{ i: right.i, o: right.truth, s: 2 }, { i: wrong.i, o: (wrong.truth + 1) % 4, s: 2 }], [[right.i, 'kitman'], [wrong.i, 'barber']], R);
  const snap = careerSnapshot(getSave());
  const km0 = bookOf(getSave(), 'kitman');
  let rep: ReturnType<typeof applyWindow> | null = null;
  update((s) => { rep = applyWindow(s.career!, g, res, cast, s.milestones); pushBeats(s, storyBeats(s.career!, { ...res, cast }, rep, { seen: {} })); });
  const s1 = getSave(), b = bylineOf(s1), c = s1.career!;
  assert.ok(rep); const r = rep as ReturnType<typeof applyWindow>;
  // followers: the GOTY §1.1 maths with the Career factor (×1), in the order filed; both calls are day 1
  const order = res.per.filter((p) => p.call).sort((a, x) => a.call!.day - x.call!.day || a.i - x.i);
  let hot = 0, want = 0; for (const p of order) { want += followerDelta('career', p.call!.s, p.right, p.excl, hot); hot = p.right ? hot + 1 : 0; }
  assert.equal(r.followers, want); assert.equal(b.followers, 1000 + want); assert.equal(r.followersAfter, b.followers);
  assert.equal(r.repBefore, 50); assert.equal(b.rep, 49, '+1 right, −2 wrong Confirmed'); assert.equal(r.repAfter, 49);
  assert.equal(c.history[0].repAfter, 49, 'history records the one rep');
  assert.ok(!('rep' in (c as Any)) && !('followers' in (c as Any)) && !('contacts' in (c as Any)), 'the career stores no numbers of its own');
  assert.equal(c.windows, 1); assert.equal(c.right, 1); assert.equal(c.calls, 2);
  assert.ok(bookOf(s1, 'kitman').xp >= km0.xp + 10 && (bookOf(s1, 'kitman').asks || 0) === (km0.asks || 0) + 1, 'the book took the ask'); assert.ok(bookOf(s1, 'barber').xp >= 10);
  assert.equal(r.trust.kitman[1], careerTrust(s1, 'kitman'), 'the report reads the book level');
  const duels = RIVALS.reduce((a, id) => { const x = rivalOf(s1, id); return a + x.w + x.l + x.d; }, 0);
  assert.equal(duels, 3 + (r.byline ? r.byline.rivals.length : 0), 'the ledger took every duel on top of the fixture');
  assert.equal(chapterOf(s1)!.goal!.haveRep, 49, 'the story goal reads the global rep');
  // Results then records the same window under its own key: nothing moves twice
  const again = recordWindow({ mode: 'career', key: 'career:' + seed, per: res.per, cast, tier: res.tier, total: res.total, ppBefore: 0 });
  assert.ok(again && again.followers === want, 'recordWindow hands back the stored summary');
  assert.equal(bylineOf(getSave()).followers, 1000 + want); assert.equal(bylineOf(getSave()).rep, 49);
  assert.ok((getSave().byline!.keys || []).includes('career:' + seed), 'the plain key is marked for the results film');
  // careerDelta for the results strip
  const d = careerDelta(snap, getSave());
  assert.equal(d.followers, want); assert.equal(d.rep, -1); assert.equal(d.windows, 1); assert.equal(d.rank.promoted, false);
  assert.ok(lastDelta() && lastDelta()!.followers === want, 'lastDelta reads byline.last.snap');
  assert.ok(s1.feed!.some((f) => f.kind === 'window' && f.v!.mode === 'career'), 'the feed has the window line');
});
test('the Daily and the Wire move the same numbers', () => {
  reset();
  update((s) => { s.byline!.hot = 0; s.byline!.rep = 50; s.byline!.followers = 1000; s.book = {}; s.rivals = {}; });
  const seed = 'ONEDAY1';
  const board = E.buildBoard(seed);
  const clean = board.sagas.filter((x) => x.i !== board.twI);
  const right = clean[0];
  const cast = castFor(seed, { n: E.RULES.SAGAS });
  const { res } = playWindow(seed, [{ i: right.i, o: right.truth, s: 1 }], [[right.i, 'agent']]);
  const p = res.per.find((x) => x.i === right.i)!;
  const sum = recordWindow({ mode: 'daily', key: 'daily:401', per: res.per, cast, tier: res.tier, total: res.total, no: 401 })!;
  const b1 = bylineOf(getSave());
  assert.equal(sum.followers, followerDelta('daily', 1, true, p.excl, 0)); assert.equal(b1.followers, 1000 + sum.followers); assert.equal(b1.rep, 51); assert.equal(b1.hot, 1);
  assert.ok(bookOf(getSave(), 'agent').xp >= 10, 'the same book');
  assert.equal(recordWindow({ mode: 'daily', key: 'daily:401', per: res.per, cast, tier: res.tier, total: res.total })!.followers, sum.followers, 'idempotent');
  assert.equal(bylineOf(getSave()).followers, b1.followers);
  // the Wire: real football, ×1.5, hot hand 1
  recordWireResolution([{ rid: 'w1', right: true, done: true, s: 3, at: Date.now() }], () => 'Rodrygo');
  const b2 = bylineOf(getSave());
  assert.equal(b2.followers, b1.followers + followerDelta('wire', 2, true, false, 1)); assert.equal(b2.rep, 52); assert.equal(b2.hot, 2);
  // Practice never changes the Daily: its rules only gain the Lv5 second opinion
  assert.equal(practiceRules(getSave()).AGAIN, undefined);
  update((s) => { s.book!.kitman = { xp: 560, lv: 5 }; });
  assert.deepEqual(practiceRules(getSave()).AGAIN, ['kitman']);
});
test('promotion reads the reputation the window earned', () => {
  reset();
  update((s) => { s.career = newCareer(); s.career.windows = 7; s.byline!.rep = 54; s.byline!.hot = 0; });
  const s0 = getSave(); const c0 = s0.career!;
  const seed = 'PROMO1';
  const cast = castFor(seed, castOpts(c0)); const R = careerRules(c0, cast, s0);
  const board = E.buildBoard(seed, R); const right = board.sagas.find((x) => x.i !== board.twI)!;
  const { g, res } = playWindow(seed, [{ i: right.i, o: right.truth, s: 0 }], [[right.i, 'kitman']], R);
  let rep: ReturnType<typeof applyWindow> | null = null;
  update((s) => { rep = applyWindow(s.career!, g, res, cast, s.milestones); });
  assert.equal(bylineOf(getSave()).rep, 55); assert.equal((rep as unknown as Any).promoted, 1, 'window 8 and rep 55: Stringer'); assert.equal(getSave().career!.rank, 1);
  assert.equal(repTier(bylineOf(getSave()).rep), 'stringer', 'the byline says the same word');
  assert.ok(getSave().feed!.some((f) => f.key === 'cn.feed.tierUp'));
});
test('follower milestones pay in any mode, once', () => {
  reset();
  update((s) => { s.byline!.followers = 9990; s.byline!.hot = 0; s.milestones = {}; s.credits = 0; });
  recordWireResolution([{ rid: 'w9', right: true, done: true, s: 3, at: Date.now() }]);
  const s = getSave();
  assert.ok(s.byline!.followers >= 10000); assert.ok(s.milestones.f10000); assert.equal(s.credits, 50);
  recordWireResolution([{ rid: 'w10', right: true, done: true, s: 3, at: Date.now() + 1 }]);
  assert.equal(getSave().credits, 50, 'paid once');
});
test('one visible level: levelOf is the season Pass level', () => {
  reset();
  update((s) => { s.season = { id: 'x', pp: 0, gold: false, claimed: [] }; });
  const s = getSave();
  assert.equal(levelOf(s.pp, s).n, 1);
  update((x) => { x.pp += 500; x.season!.pp = 500; });
  const t = getSave();
  assert.equal(levelOf(t.pp, t).n, levelOf(t.pp - 500 + 500, t).n);
  assert.ok(levelOf(t.pp - 500, t).n <= levelOf(t.pp, t).n, 'earlier Press Points, an earlier Pass level');
  assert.equal(levelOf(t.pp, t).need, 100, 'into/need are a percentage for bars drawn as into%');
});

// ---------------------------------------------------------------- run
export async function run() {
  let fail = 0;
  for (const [n, f] of tests) {
    try { f(); console.log('ok   ' + n); } catch (e) { fail++; console.log('FAIL ' + n + '\n     ' + String((e as Error).stack || e).split('\n').slice(0, 4).join('\n     ')); }
  }
  console.log(`\n${tests.length - fail}/${tests.length} passed`);
  return fail;
}
