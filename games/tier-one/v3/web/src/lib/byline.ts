// One Byline (GOTY.md §1): the four shared systems every mode feeds. Followers + reputation + the hot hand (§1.1),
// the Contacts Book (§1.2), the rival ledgers (§1.3), the Feed (§1.4) and Home's next-up picker (§1.5).
// Local and cosmetic: nothing here changes a Daily board, its sources or its score. The Career/Practice perks are
// exposed as pure helpers (bookPerks, askCost) for the local engine callers; the Daily and rooms never read them.
//
// One career (3.4, GOTY.md §7.2): these four systems are the player's only numbers. A Career window moves them through
// recordInto() exactly like a Daily, a room, a Practice board or a Wire call (lib/career.ts applyWindow calls it), and
// every screen reads them from here: Me, the Story hub, Results (careerDelta), the Contacts screen, share cards.
import { update, getSave, type Save } from './save';
import type { ResultSaga, ResultStory4, CastSaga, Tier } from './engine';
import { credit, toast, ymdUTC } from './meta';
import { missionsView } from './progress';
import { t, trList } from './i18n';
import {
  RANKS, RANK_IDS, rankByRep, rankHeld, rankIndex, underReview, repDelta as repDelta4, clampRep, REP,
  followerDelta as followerDelta4, hotMult as hotMult4, FOLLOWERS, BOOK, bookLevel, trustOfLevel, COINS, levelOf, xpOf, type RankId,
} from './economy';
import type { Route } from '../App';
import { moment } from './moments';
import { earnHook } from './earnhook';
import { onCall as sponsorCall, type CallOutcome } from './deals';

// ---------------------------------------------------------------- types (stored in the save; all optional there)
export type BMode = 'daily' | 'career' | 'room' | 'wire' | 'practice';
export interface Byline {
  followers: number; rep: number; hot: number; best: number; keys?: string[]; last?: WindowSummary;
  /** 4.0: the highest rank index reached (RANKS). A rank, once reached, stays; see rankOf() / isUnderReview(). */
  rank?: number;
}
export interface BookEntry { xp: number; lv: number; coffee?: string; asks?: number; hits?: number }
export type RivalResult = 'w' | 'l' | 'd';
// 3.4 friend rivals (§7.3, lib/social.ts) share this shape under the `friend:<pub>` id namespace: `name` is the friend's
// byline, `plays` how many rooms/challenges you've met in (3+ makes them a named rival), `pub` their public id.
export interface RivalRec { w: number; l: number; d: number; streak: number; last: RivalResult | ''; at?: number; taunt?: string; tp?: string; scalp?: number; trophy?: number; name?: string; plays?: number; pub?: string }
export type FeedKind = 'editor' | 'rival' | 'wire' | 'room' | 'contact' | 'mission' | 'level' | 'season' | 'streak' | 'window' | 'hot' | 'challenge' | 'friend' | 'newsroom';
export type FeedRoute = { n: 'front' | 'daily' | 'wire' | 'story' | 'me' | 'pass' | 'practice' | 'rooms' | 'rivals' | 'contacts' | 'feed' | 'newsroom'; rid?: string; code?: string; challenge?: string };
export const FRIEND_NS = 'friend:';
export const isFriendRival = (id: string) => id.startsWith(FRIEND_NS);
export interface FeedItem { id: string; at: number; kind: FeedKind; key: string; v?: Record<string, string | number>; to?: FeedRoute; from?: string; tone?: 'good' | 'bad' | 'gold'; read?: boolean }
export interface WindowSummary {
  key: string; mode: BMode; followers: number; rep: number; hot: number; hotBefore: number;
  levels: { src: string; lv: number }[]; xp: Record<string, number>; rivals: { id: string; r: RivalResult }[];
  /** 4.0: the rank held before and after, whether this window reached a new one, and the "under review" flag. */
  rankBefore?: RankId; rank?: RankId; rankUp?: boolean; review?: boolean;
  /** The player's numbers before this window (careerSnapshot), so Results can show careerDelta(snap, save). */
  snap?: CareerSnap;
}

// ---------------------------------------------------------------- §1.1 numbers (RULES4 §3; every number is in lib/economy.ts)
export const MODE_F: Record<BMode, number> = FOLLOWERS.modeFactor as Record<BMode, number>;
export const BASE_RIGHT = FOLLOWERS.right, BASE_WRONG = FOLLOWERS.wrong, EXCL_BONUS = FOLLOWERS.scoop, HOT_CAP = FOLLOWERS.hotCap;
// The one ladder: Rep 0–100 reads as a Rank. Nobody 0 · Rising 40 · ITK 55 · Insider 70 · Tier One 85. The Career
// ranks (lib/career.ts RANKS) read their rep gates from here, so the byline's word and the story's word are one word.
export const REP_TIERS = RANKS;
export type RepTier = RankId;
/** The rank a reputation reads as right now (no memory). For the rank the player holds, use rankOf(save). */
export const repTier = (rep: number): RepTier => rankByRep(rep);
export const hotMult = hotMult4;
/** Followers for one resolved call (§1.1). `s` is backing 0 ×1 · 1 ×2 · 2 Drop; `excl` is a Scoop. */
export const followerDelta = (mode: BMode | string, s: number, right: boolean, excl: boolean, hot: number): number => followerDelta4(mode, s, right, excl, hot);
export const freshByline = (): Byline => ({ followers: 0, rep: REP.start, hot: 0, best: 0, rank: 0 });
export const bylineOf = (s: Save): Byline => s.byline || freshByline();
/** The rank the player holds: once reached it stays (a title); `rank` on the byline is the high-water mark. */
export const rankOf = (s: Save): RankId => { const b = bylineOf(s); return rankHeld(b.rep, b.rank || 0); };
/** "Under review": rep has dropped 10 under the held rank's bar (RULES4 §3 Reputation). Shown next to the rank. */
export const isUnderReview = (s: Save): boolean => { const b = bylineOf(s); return underReview(b.rep, b.rank || 0); };
/** Keeps the high-water mark; returns true when a new rank was just reached. */
function keepRank(b: Byline): boolean {
  const now = rankIndex(rankByRep(b.rep)), kept = b.rank || 0;
  if (now > kept) { b.rank = now; return true; }
  if (b.rank == null) b.rank = now;
  return false;
}
// Follower milestones are a line in the feed (4.0 pays coins only from the RULES4 §3 table; milestones pay none).
export const FOLLOWER_MILESTONES: [number, number][] = [[1000, 0], [10000, 0], [50000, 0], [100000, 0], [250000, 0], [1000000, 0]];
function payMilestones(s: Save) {
  const b = bylineOf(s);
  for (const [f, cr] of FOLLOWER_MILESTONES) if (b.followers >= f && !s.milestones['f' + f]) {
    s.milestones['f' + f] = Date.now(); if (cr) credit(s, cr, 'followers:' + f);
    pushFeed(s, { id: 'followers:' + f, kind: 'level', key: 'cn.feed.followers', v: { n: f.toLocaleString('en'), c: cr }, to: { n: 'me' }, tone: 'gold' });
  }
}

// ---------------------------------------------------------------- §1.2 the Contacts Book
export const BOOK_SRC = ['kitman', 'barber', 'agent', 'spotter', 'physio'] as const;
export const BOOK_LV: readonly number[] = BOOK.levels;
export const XP_ASK = BOOK.xpAsk, XP_MATCH = BOOK.xpMatch, XP_IGNORE = BOOK.xpIgnore, XP_COFFEE = BOOK.xpCoffee, COFFEE_COST = BOOK.coffee;
export const lvOfXp = bookLevel;
export const bookOf = (s: Save, src: string): BookEntry => (s.book && s.book[src]) || { xp: 0, lv: 1 };
/** 4.0 Contacts Book trust 0–1 for engine4 `rulesFor('career', { trust })`: level 1 → 0, level 5 → 1. */
export const trustFor = (src: string, s: Save = getSave()): number => trustOfLevel(lvOfXp(bookOf(s, src).xp));
/** Every contact's trust at once, the shape rulesFor wants. */
export const trustMap = (s: Save = getSave()): Record<string, number> => Object.fromEntries(BOOK_SRC.map((src) => [src, trustFor(src, s)]));
export function bookProgress(e: BookEntry) {
  const lv = lvOfXp(e.xp), max = lv >= BOOK_LV.length;
  const from = BOOK_LV[lv - 1], to = max ? from : BOOK_LV[lv];
  return { lv, max, into: e.xp - from, need: to - from, pct: max ? 100 : Math.round((100 * (e.xp - from)) / Math.max(1, to - from)) };
}
/** Cosmetic unlocks, every mode (§1.2). */
export function bookCosmetics(src: string, s: Save = getSave()) {
  const lv = lvOfXp(bookOf(s, src).xp);
  return { lv, frame: lv >= 2, warm: lv >= 3, nick: lv >= 4, gold: lv >= 5 };
}
/** The nickname a Lv4+ contact calls you, or '' (i18n `cn.nick.<src>`). */
export const contactNick = (src: string, s: Save = getSave()) => (bookCosmetics(src, s).nick ? t('cn.nick.' + src) : '');
/** Career and Practice only: Lv3 first ask each window costs 1 less (min 1); Lv5 one free second-opinion re-ask per window.
 *  Always zero for the Daily and rooms. */
export function bookPerks(src: string, mode: BMode | string, s: Save = getSave()) {
  const on = mode === 'career' || mode === 'practice';
  const lv = lvOfXp(bookOf(s, src).xp);
  return { discount: on && lv >= 3 ? 1 : 0, secondOpinion: on && lv >= 5 };
}
/** What an ask costs with the Lv3 perk: `firstThisWindow` = this source hasn't been asked yet in this window. */
export function askCost(src: string, base: number, mode: BMode | string, firstThisWindow: boolean, s: Save = getSave()) {
  const p = bookPerks(src, mode, s);
  return firstThisWindow && p.discount ? Math.max(1, base - p.discount) : base;
}
export const coffeeToday = (s: Save, src: string) => bookOf(s, src).coffee === ymdUTC();

// ---------------------------------------------------------------- §1.3 rivals
export const RIVALS = ['tabloid', 'itk', 'insider'] as const;
export const SCALP_NET = 5, TROPHY_NET = 10, SCALP_COINS = 50, TROPHY_COINS = 150;
export const rivalOf = (s: Save, id: string): RivalRec => (s.rivals && s.rivals[id]) || { w: 0, l: 0, d: 0, streak: 0, last: '' };
/** Your record against a rival, for the saga race strip in every mode (screens/Window.tsx picks this up by name). */
export const rivalRecord = (id: string): { w: number; l: number; d: number } => { const r = rivalOf(getSave(), id); return { w: r.w, l: r.l, d: r.d }; };
export const netOf = (r: RivalRec) => r.w - r.l;
export type RivalState = 'winning' | 'losing' | 'level';
export const rivalState = (r: RivalRec): RivalState => (netOf(r) > 0 ? 'winning' : netOf(r) < 0 ? 'losing' : 'level');
export const TAUNTS = 8; // the legacy floor: friend pools (so.taunt) and old feed items index into the first 8
/** How many feed taunts a house rival has for a state. English sizes the pool (every language keeps the same length),
 *  so the whole 32-line voice pack in i18n/parts/rivals.ts is reachable, not just the first 8. */
export const tauntCount = (id: string, st: string): number => { const l = trList('en', 'cn.taunt.' + id + '.' + st); return Math.max(TAUNTS, Array.isArray(l) ? l.length : 0); };
/** Head-to-head on one story (§1.3): null when the rival didn't post or nobody was right. */
export function duel(p: ResultSaga | ResultStory4 | CallLite, rival: string): RivalResult | null {
  const l = 'reads' in p && 'rivals' in p && 'called' in p && !('truth' in p) ? (p as CallLite) : liteOf(p as ResultSaga | ResultStory4);
  const posts = l.rivals.filter((x) => x.id === rival);
  if (!posts.length) return null;
  const theirs = posts[posts.length - 1].right, mine = l.called && l.right;
  if (mine && !theirs) return 'w';
  if (theirs && !mine) return 'l';
  if (mine && theirs) return 'd';
  return null;
}

// ---------------------------------------------------------------- §1.4 the feed
export const FEED_CAP = 60;
const KEYS_CAP = 240;
const hash = (x: string) => { let h = 0x811c9dc5; for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
export function pushFeed(s: Save, it: Omit<FeedItem, 'id' | 'at'> & { id?: string; at?: number }) {
  const feed = s.feed || [];
  const id = it.id || it.kind + ':' + Date.now().toString(36) + ':' + (hash(it.key + JSON.stringify(it.v || {})) % 1e6).toString(36);
  if (feed.some((f) => f.id === id)) return;
  s.feed = [{ ...it, id, at: it.at || Date.now() }, ...feed].slice(0, FEED_CAP);
}
export const unreadOf = (s: Save) => (s.feed || []).filter((f) => !f.read);
export function markRead(ids?: string[]) {
  update((s) => { for (const f of s.feed || []) if (!ids || ids.includes(f.id)) f.read = true; });
}
export function toRoute(f?: FeedRoute): Route {
  if (!f) return { n: 'feed' } as Route;
  if (f.n === 'wire') return { n: 'wire', rid: f.rid };
  if (f.n === 'rooms') return { n: 'rooms', code: f.code, challenge: f.challenge };
  if (f.n === 'newsroom') return { n: 'newsroom', code: f.code };
  return { n: f.n } as Route;
}
const seen = (b: Byline, key: string) => (b.keys || []).includes(key);
const mark = (b: Byline, key: string) => { b.keys = [key, ...(b.keys || []).filter((k) => k !== key)].slice(0, KEYS_CAP); };
const modeRoute = (mode: BMode, code?: string): FeedRoute => (mode === 'daily' ? { n: 'daily' } : mode === 'room' ? { n: 'rooms', code } : mode === 'career' ? { n: 'story' } : mode === 'practice' ? { n: 'practice' } : { n: 'wire' });

// ---------------------------------------------------------------- the one entry point per resolved window
/** One story's result in the shape the byline needs, whatever engine produced it (v3 ResultSaga or v4 ResultStory4). */
export interface CallLite { i: number; called: boolean; right: boolean; s: number; day: number; scoop: boolean; reads: { src: string; right: boolean; day: number }[]; rivals: { id: string; day: number; right: boolean }[] }
export const isStory4 = (p: ResultSaga | ResultStory4): p is ResultStory4 => 'scoop' in p && 'rivals' in p;
export function liteOf(p: ResultSaga | ResultStory4): CallLite {
  if (isStory4(p)) return { i: p.i, called: !!p.call, right: p.right, s: p.call ? p.call.s : 0, day: p.call ? p.call.day : 0, scoop: p.scoop, reads: p.reads.map((r) => ({ src: r.src, right: r.right, day: r.day })), rivals: p.rivals.map((r) => ({ id: r.id, day: r.day, right: r.right })) };
  return { i: p.i, called: !!p.call, right: p.right, s: p.call ? p.call.s : 0, day: p.call ? p.call.day : 0, scoop: p.excl, reads: p.reads.map((r) => ({ src: r.src, right: r.right, day: r.day })), rivals: p.posts.map((r) => ({ id: r.id, day: r.day, right: r.right })) };
}
export interface WindowIn {
  mode: 'daily' | 'room' | 'practice' | 'career' | 'deadline';
  /** Idempotency key: see windowKey(). */
  key: string;
  /** The engine's per-story results (v3 or v4): reads (who was asked, right or not), rival posts, the call (backing s), right, Scoop. */
  per: (ResultSaga | ResultStory4)[];
  cast?: CastSaga[];
  tier?: Tier; total?: number;
  /** XP before the window (for the level-up feed item). `ppBefore` is the 3.x name of the same number. */
  xpBefore?: number; ppBefore?: number;
  /** A Career story beat to mirror into the feed. */
  beat?: { from: string; key: string; v?: Record<string, string | number> } | null;
  room?: { code: string; round: number };
  no?: number;
}
// A window recorded before its Results screen mounts (a Career window, from lib/career.ts applyWindow) is keyed
// 'pre:<key>': Results still sees a first visit (its film plays), and recordWindow treats the two keys as one window.
const PRE = 'pre:';
const preKey = (k: string) => PRE + k;
export const careerWindowKey = (seed: string) => preKey(windowKey({ mode: 'career', seed }));
export function windowKey(v: { mode: string; no?: number; seed?: string; room?: { code: string; round: number } }) {
  if (v.mode === 'daily') return 'daily:' + (v.no || ymdUTC());
  if (v.mode === 'room' && v.room) return 'room:' + v.room.code + ':' + v.room.round;
  return v.mode + ':' + (v.seed || '');
}

/** Records one resolved window into the byline, the book, the rival ledgers and the feed. Idempotent per `key`:
 *  a second call returns the stored summary and changes nothing. Practice, the Daily and rooms call this from Results
 *  (ui/connect.tsx useRecordWindow); a Career window is recorded by lib/career.ts applyWindow through recordInto(), in
 *  the same update as the story's own bookkeeping, so its promotion gate reads the reputation this window earned. */
export function recordWindow(w: WindowIn): WindowSummary | null {
  const pre = getSave().byline;
  if (pre && (seen(pre, w.key) || seen(pre, preKey(w.key)))) {
    // Recorded at settle time under the pre-key (a Career window): the plain key is marked now, on the first Results
    // mount, so a revisit skips the results film exactly as it does for every other mode.
    if (!seen(pre, w.key)) update((s) => { mark(s.byline!, w.key); });
    levelFeed(w.xpBefore ?? w.ppBefore);
    return pre.last && (pre.last.key === w.key || pre.last.key === preKey(w.key)) ? pre.last : null;
  }
  let out: WindowSummary | null = null;
  const toasts: [string, string][] = [];
  update((s) => {
    out = recordInto(s, w, toasts);
    const before = w.xpBefore ?? w.ppBefore;
    if (before != null) passLevelFeed(s, before);
    earnHook(s); // rank and rivalry-trophy looks (lib/earned.ts)
  });
  for (const [a, c] of toasts) toast('ach', a, c);
  return out;
}
// The level-up line is keyed by level, not by window, so a Career window (recorded before Results mounts, without
// the XP it is about to earn) still gets its line when Results calls recordWindow with xpBefore.
function levelFeed(xpBefore?: number) { if (xpBefore == null) return; if (levelOf(xpBefore).n < levelOf(xpOf(getSave())).n) update((s) => passLevelFeed(s, xpBefore)); }
function passLevelFeed(s: Save, xpBefore: number) {
  const a = levelOf(xpBefore).n, c = levelOf(xpOf(s)).n;
  for (let n = a + 1; n <= c; n++) pushFeed(s, { id: 'pass:' + n, kind: 'level', key: 'cn.feed.level', v: { n }, to: { n: 'pass' }, tone: 'gold' });
}

/** The mutator behind recordWindow: moves the numbers on the draft `s` and returns what changed, or null when this
 *  window key was already recorded. Toasts are collected for the caller to fire after the update commits. */
export function recordInto(s: Save, w: WindowIn, toasts: [string, string][] = []): WindowSummary | null {
  const b = (s.byline = s.byline || freshByline());
  if (seen(b, w.key) || seen(b, preKey(w.key)) || (w.key.startsWith(PRE) && seen(b, w.key.slice(PRE.length)))) return null;
  const snap = careerSnapshot(s);
  mark(b, w.key);
  const mode: BMode = w.mode === 'deadline' ? 'daily' : w.mode;
  const name = (i: number) => w.cast?.[i]?.player.s || w.cast?.[i]?.player.n || '';
  const sum: WindowSummary = { key: w.key, mode, followers: 0, rep: 0, hot: b.hot, hotBefore: b.hot, levels: [], xp: {}, rivals: [], snap, rankBefore: rankOf(s) };
  const per = w.per.map(liteOf);
  // 1.1 followers / rep / hot streak, in the order the calls were posted (RULES4 §3: by backing, +Scoop, mode factor)
  const calls = per.filter((p) => p.called).sort((a, c) => a.day - c.day || a.i - c.i);
  let repMove = 0;
  for (const p of calls) {
    const d = followerDelta(mode, p.s, p.right, p.scoop, b.hot);
    sum.followers += d;
    repMove += repDelta4(w.mode, p.s, p.right, p.scoop);
    if (p.right) { b.hot++; b.best = Math.max(b.best, b.hot); } else b.hot = 0;
  }
  b.followers = Math.max(0, b.followers + sum.followers);
  const rep0 = b.rep; b.rep = clampRep(b.rep + repMove); sum.rep = b.rep - rep0;
  sum.hot = b.hot;
  const rankUp = keepRank(b);
  sum.rank = rankOf(s); sum.rankUp = rankUp; sum.review = isUnderReview(s);
  if (b.hot > sum.hotBefore && [3, 5, 10, 15, 20].some((m) => sum.hotBefore < m && b.hot >= m)) pushFeed(s, { kind: 'hot', key: 'cn.feed.hot', v: { n: b.hot }, to: { n: 'me' }, tone: 'gold' });
  if (rankUp) { pushFeed(s, { kind: 'level', key: 'cn.feed.tierUp', v: { rt: sum.rank }, to: { n: 'me' }, tone: 'gold' }); moment('tier:' + sum.rank, undefined, true); } // film: the new rank
  else if (sum.review && !underReview(rep0, b.rank || 0)) pushFeed(s, { kind: 'level', key: 'cn.feed.tierDown', v: { rt: sum.rank }, to: { n: 'me' }, tone: 'bad' });
  payMilestones(s);

  // 1.2 contacts: +10 per ask, +25 read right and call matched, +5 right call that ignored a wrong read
  const book = (s.book = s.book || {});
  for (const p of per) for (const r of p.reads) {
    if (!(BOOK_SRC as readonly string[]).includes(r.src)) continue;
    const x = XP_ASK + (p.right && p.called ? (r.right ? XP_MATCH : XP_IGNORE) : 0);
    sum.xp[r.src] = (sum.xp[r.src] || 0) + x;
  }
  for (const [src, x] of Object.entries(sum.xp)) {
    const e = (book[src] = book[src] || { xp: 0, lv: 1 });
    const lv0 = lvOfXp(e.xp);
    e.xp += x; e.asks = (e.asks || 0) + per.reduce((a, p) => a + p.reads.filter((r) => r.src === src).length, 0);
    e.hits = (e.hits || 0) + per.reduce((a, p) => a + p.reads.filter((r) => r.src === src && r.right).length, 0);
    e.lv = lvOfXp(e.xp);
    for (let lv = lv0 + 1; lv <= e.lv; lv++) levelUp(s, src, lv, sum, toasts);
  }

  // 1.3 rival ledgers
  const rv = (s.rivals = s.rivals || {});
  const touched = new Map<string, { r: RivalResult; p: string }>();
  for (const p of per) for (const id of RIVALS) {
    const r = duel(p, id); if (!r) continue;
    const rec = (rv[id] = rv[id] || { w: 0, l: 0, d: 0, streak: 0, last: '' });
    if (r === 'w') { rec.w++; rec.streak = rec.streak > 0 ? rec.streak + 1 : 1; }
    else if (r === 'l') { rec.l++; rec.streak = rec.streak < 0 ? rec.streak - 1 : -1; }
    else rec.d++;
    rec.last = r; rec.at = Date.now();
    sum.rivals.push({ id, r });
    const prev = touched.get(id);
    // The feed line reacts to the window's headline duel: a loss beats a win beats a draw.
    if (!prev || (r === 'l') || (r === 'w' && prev.r === 'd')) touched.set(id, { r, p: name(p.i) });
  }
  for (const [id, x] of touched) {
    const rec = rv[id];
    if (netOf(rec) >= SCALP_NET && !rec.scalp) { rec.scalp = Date.now(); credit(s, SCALP_COINS, 'scalp:' + id); pushFeed(s, { kind: 'rival', from: id, key: 'cn.feed.scalp', v: { rival: id, n: SCALP_COINS }, to: { n: 'rivals' }, tone: 'gold' }); toasts.push([t('cn.toast.scalp', { r: t('rival.' + id) }), t('cn.toast.coins', { n: SCALP_COINS })]); moment('scalp:' + id, undefined, true); }
    if (netOf(rec) >= TROPHY_NET && !rec.trophy) { rec.trophy = Date.now(); credit(s, TROPHY_COINS, 'rivalry:' + id); pushFeed(s, { kind: 'rival', from: id, key: 'cn.feed.trophy', v: { rival: id, n: TROPHY_COINS }, to: { n: 'rivals' }, tone: 'gold' }); moment('trophy:' + id, undefined, true); }
    const st = rivalState(rec);
    const prevIdx = rec.taunt && rec.taunt.startsWith(st + '.') ? Number(rec.taunt.split('.')[1]) : -1;
    const nT = tauntCount(id, st);
    let idx = hash(w.key + id) % nT; if (idx === prevIdx) idx = (idx + 1) % nT;
    rec.taunt = st + '.' + idx; rec.tp = x.p || '';
    pushFeed(s, { kind: 'rival', from: id, key: 'cn.taunt.' + id + '.' + st + '.' + idx, v: { rec: rec.w + '–' + rec.l + (rec.d ? '–' + rec.d : ''), p: x.p || '?' }, to: { n: 'rivals' }, tone: x.r === 'l' ? 'bad' : x.r === 'w' ? 'good' : undefined });
  }

  // 1.4 the window's own line, the editor's beat and missions
  if (w.beat) feedBeat(s, w.beat);
  const f = sum.followers;
  pushFeed(s, {
    kind: mode === 'room' ? 'room' : 'window', key: mode === 'room' ? 'cn.feed.room' : 'cn.feed.window',
    v: { mode, f: (f > 0 ? '+' : f < 0 ? '−' : '') + Math.abs(f).toLocaleString('en'), tier: w.tier || '', n: w.no || (w.room ? w.room.round + 1 : '') },
    to: modeRoute(mode, w.room?.code), tone: f > 0 ? 'good' : f < 0 ? 'bad' : undefined,
  });
  missionFeed(s);
  b.last = sum;
  // §7.1 cross-mode consequences: the desk (lib/desk.ts) listens and writes into this same draft.
  emitByline({ kind: 'window', sum, w, save: s });
  if (mode === 'daily' && w.tier === 'T1') emitByline({ kind: 'daily-t1', no: w.no || 0, save: s });
  if (mode === 'room' && w.room) emitByline({ kind: 'room-window', code: w.room.code, round: w.room.round, sum, tier: w.tier, total: w.total, save: s });
  const promo = w.beat && /^promo(\d)$/.exec(w.beat.key); if (promo) emitByline({ kind: 'career-promo', rank: Number(promo[1]), save: s });
  return sum;
}
/** Mirrors a Career story beat (an inbox line) into the feed. Idempotent per sender + key + vars. */
export function feedBeat(s: Save, beat: { from: string; key: string; v?: Record<string, string | number> }) {
  pushFeed(s, { id: 'beat:' + beat.from + ':' + beat.key + ':' + (hash(JSON.stringify(beat.v || {})) % 1e6).toString(36), kind: 'editor', from: beat.from, key: 'g.story.beat.' + beat.key, v: beat.v, to: { n: 'story' } });
}
function levelUp(s: Save, src: string, lv: number, sum: WindowSummary | null, toasts: [string, string][]) {
  const coins = lv * COINS.contactLevel;
  credit(s, coins, 'contact:' + src + ':' + lv);
  sum?.levels.push({ src, lv });
  pushFeed(s, { kind: 'contact', from: src, key: 'cn.feed.contact', v: { src, lv, perk: 'cn.perk.l' + lv, n: coins }, to: { n: 'contacts' }, tone: lv >= 5 ? 'gold' : 'good' });
  toasts.push([t('cn.toast.contact', { s: t('src.' + src), n: lv }), t('cn.perk.l' + lv) + ' · ' + t('cn.toast.coins', { n: coins })]);
  if (lv >= 5) moment('contact:' + src, undefined, true); // film: the gold card
}
function missionFeed(s: Save) {
  const b = (s.byline = s.byline || freshByline());
  for (const m of missionsView(s) || []) {
    const k = 'm:' + (s.missions?.day || '') + ':' + m.id;
    if (!m.done || m.claimed || seen(b, k)) continue;
    mark(b, k);
    pushFeed(s, { kind: 'mission', key: 'cn.feed.mission', v: { m: 'g.missions.' + m.id, mn: m.n, n: m.coins }, to: { n: 'front' }, tone: 'gold' });
  }
}

// ---------------------------------------------------------------- the Wire (§1.6): resolved real-football calls
export interface WireResolved { rid: string; right?: boolean | null; done?: boolean; s: number; at: number; player?: string; pts?: number; sponsor?: CallOutcome | null }
/** Call with the player's Wire calls whenever they refresh; each resolved call is recorded once. */
export function recordWireResolution(calls: WireResolved[], nameOf?: (rid: string) => string | undefined) {
  const b0 = getSave().byline;
  const fresh = calls.filter((c) => c.done && (c.right === true || c.right === false) && !(b0 && seen(b0, 'wire:' + c.rid + ':' + c.at)));
  if (!fresh.length) return;
  let official: string | null = null;
  const repW0 = (getSave().byline || freshByline()).rep;
  update((s) => {
    const b = (s.byline = s.byline || freshByline());
    const list = fresh.filter((c) => !seen(b, 'wire:' + c.rid + ':' + c.at)).sort((a, c) => a.at - c.at);
    list.forEach((c, k) => {
      mark(b, 'wire:' + c.rid + ':' + c.at);
      const st = Math.max(0, Math.min(2, (c.s || 1) - 1));
      // §7.1: a Wire credit (earned by a Daily Tier 1) shields one wrong call's followers and rep; the hot streak still resets.
      const shielded = !c.right && !!wireShield && wireShield(s, c);
      const d = shielded ? 0 : followerDelta('wire', st, !!c.right, false, b.hot);
      if (c.right) { b.hot++; b.best = Math.max(b.best, b.hot); official = nameOf?.(c.rid) || c.player || ''; }
      else b.hot = 0;
      if (!shielded) b.rep = clampRep(b.rep + repDelta4('wire', st, !!c.right, false)); // Wire moves Rep at half (RULES4 §3)
      b.followers = Math.max(0, b.followers + d);
      c.sponsor = sponsorCall(s, { mode: 'wire', right: !!c.right, s: st }); // the Market keeps paying the sponsor (CONCEPT4 §4)
      if (keepRank(b)) pushFeed(s, { kind: 'level', key: 'cn.feed.tierUp', v: { rt: rankOf(s) }, to: { n: 'me' }, tone: 'gold' });
      payMilestones(s);
      // Old backlog lands quietly; the newest few make the feed.
      if (k >= list.length - 5) pushFeed(s, { id: 'wire:' + c.rid + ':' + c.at, kind: 'wire', key: c.right ? 'cn.feed.wireRight' : shielded ? 'cn.feed.wireShield' : 'cn.feed.wireWrong', v: { p: nameOf?.(c.rid) || c.player || '?', f: (d > 0 ? '+' : d < 0 ? '−' : '') + Math.abs(d).toLocaleString('en') }, to: { n: 'wire', rid: c.rid }, tone: c.right ? 'good' : shielded ? undefined : 'bad' });
      emitByline({ kind: 'wire', call: c, player: nameOf?.(c.rid) || c.player || '', d, shielded, save: s });
    });
    earnHook(s);
  });
  // Film: the newest call that settled your way gets its OFFICIAL broadcast (one per refresh).
  if (official != null) moment('official', official ? { p: official } : undefined);
  const b1 = getSave().byline;
  if (b1 && b1.rep > repW0 && rankIndex(rankByRep(repW0)) < rankIndex(rankOf(getSave()))) moment('tier:' + rankOf(getSave()), undefined, true);
}

// ---------------------------------------------------------------- the player's numbers, before and after (Results)
/** Everything a result screen can say moved: the byline, the book, the ledgers, the story rank, coins and the Pass. */
export interface CareerSnap {
  followers: number; rep: number; tier: RepTier; hot: number; best: number;
  book: Record<string, number>; rivals: Record<string, { w: number; l: number; d: number }>;
  rank: number; windows: number; t1: number; favours: number; credits: number;
  /** The account level (forever) and lifetime XP; `pass` is the 3.x name of the level. */
  level: number; xp: number; pass: number;
}
export function careerSnapshot(s: Save): CareerSnap {
  const b = bylineOf(s), c = s.career;
  const book: Record<string, number> = {}; for (const src of BOOK_SRC) book[src] = lvOfXp(bookOf(s, src).xp);
  const rivals: CareerSnap['rivals'] = {}; for (const id of RIVALS) { const r = rivalOf(s, id); rivals[id] = { w: r.w, l: r.l, d: r.d }; }
  const lv = levelOf(xpOf(s)).n;
  return {
    followers: b.followers, rep: b.rep, tier: rankOf(s), hot: b.hot, best: b.best, book, rivals,
    rank: c ? c.rank : -1, windows: c ? c.windows : 0, t1: c ? c.t1 : 0, favours: c ? c.favours.burner + c.favours.tipoff + c.favours.stakeout : 0,
    credits: s.credits, level: lv, xp: xpOf(s), pass: lv,
  };
}
export interface CareerDelta {
  followers: number; rep: number; tierBefore: RepTier; tierAfter: RepTier; tierUp: boolean; tierDown: boolean;
  hot: number; hotBefore: number;
  contacts: { src: string; from: number; to: number }[]; // only the contacts whose level changed
  rivals: { id: string; w: number; l: number; d: number }[]; // only the duels this window added
  rank: { from: number; to: number; promoted: boolean }; windows: number; t1: number; favours: number; coins: number;
  pass: { from: number; to: number; up: boolean };
  before: CareerSnap; after: CareerSnap;
}
const isSave = (x: CareerSnap | Save): x is Save => 'v' in x && 'daily' in x;
/** What one window (or anything else) did to the player's name: pass two snapshots, or a snapshot and the save.
 *  Results reads it as careerDelta(byline.last.snap, save); see lastDelta(). */
export function careerDelta(before: CareerSnap | Save, after: CareerSnap | Save): CareerDelta {
  const a = isSave(before) ? careerSnapshot(before) : before, b = isSave(after) ? careerSnapshot(after) : after;
  const ti = (x: RepTier) => RANK_IDS.indexOf(x);
  return {
    followers: b.followers - a.followers, rep: b.rep - a.rep, tierBefore: a.tier, tierAfter: b.tier, tierUp: ti(b.tier) > ti(a.tier), tierDown: ti(b.tier) < ti(a.tier),
    hot: b.hot, hotBefore: a.hot,
    contacts: BOOK_SRC.filter((src) => (b.book[src] || 1) !== (a.book[src] || 1)).map((src) => ({ src, from: a.book[src] || 1, to: b.book[src] || 1 })),
    rivals: RIVALS.map((id) => { const x = a.rivals[id] || { w: 0, l: 0, d: 0 }, y = b.rivals[id] || { w: 0, l: 0, d: 0 }; return { id, w: y.w - x.w, l: y.l - x.l, d: y.d - x.d }; }).filter((r) => r.w || r.l || r.d),
    rank: { from: a.rank, to: b.rank, promoted: b.rank > a.rank && a.rank >= 0 }, windows: b.windows - a.windows, t1: b.t1 - a.t1, favours: b.favours - a.favours, coins: b.credits - a.credits,
    pass: { from: a.pass, to: b.pass, up: b.pass > a.pass },
    before: a, after: b,
  };
}
/** The delta of the last recorded window against the save as it is now, or null. */
export function lastDelta(s: Save = getSave()): CareerDelta | null { const l = s.byline?.last; return l && l.snap ? careerDelta(l.snap, s) : null; }

// ---------------------------------------------------------------- contacts: coffee
export function buyCoffee(src: string, spend: (n: number, why: string) => boolean): boolean {
  const s = getSave();
  if (coffeeToday(s, src) || s.credits < COFFEE_COST) return false;
  if (!spend(COFFEE_COST, 'coffee:' + src)) return false;
  const toasts: [string, string][] = [];
  update((x) => {
    const book = (x.book = x.book || {});
    const e = (book[src] = book[src] || { xp: 0, lv: 1 });
    const lv0 = lvOfXp(e.xp);
    e.xp += XP_COFFEE; e.coffee = ymdUTC(); e.lv = lvOfXp(e.xp);
    for (let lv = lv0 + 1; lv <= e.lv; lv++) levelUp(x, src, lv, null, toasts);
  });
  for (const [a, c] of toasts) toast('ach', a, c);
  return true;
}

// ---------------------------------------------------------------- daily upkeep: streak alerts (call from Home)
export function dailyFeed() {
  const s = getSave(), today = ymdUTC();
  const y = ymdUTC(Date.now() - 864e5);
  if (s.daily[today] || s.streak.n < 2 || s.streak.last !== y) return;
  const id = 'streak:' + today;
  if ((s.feed || []).some((f) => f.id === id)) return;
  update((x) => pushFeed(x, { id, kind: 'streak', key: 'cn.feed.streak', v: { n: x.streak.n + 1 }, to: { n: 'daily' }, tone: 'gold' }));
}

// ---------------------------------------------------------------- §1.5 next up
export type NextKind = 'daily' | 'resume' | 'wire' | 'career' | 'room' | 'mission' | 'practice';
export interface NextUp { kind: NextKind; to: Route; v?: Record<string, string | number>; feedId?: string }
/** Home's hero, by priority. `event` is this week's Practice event name, when the season lane has one. */
export function nextUp(s: Save, event?: string): NextUp {
  const today = ymdUTC();
  if (!s.daily[today]) {
    const live = s.last && new Date(s.last.at).toISOString().slice(0, 10) === today && !s.last.pub.over ? s.last.pub : null;
    return { kind: 'daily', to: { n: 'daily' }, v: live ? { d: live.day } : undefined };
  }
  if (s.practice.live) return { kind: 'resume', to: { n: 'play', mode: 'practice', key: Date.now() }, v: { m: 'practice', d: s.practice.live.log.filter((a) => a[0] === 'e').length + 1 } };
  if (s.career && s.career.live) return { kind: 'resume', to: { n: 'story' }, v: { m: 'career', d: s.career.live.log.filter((a) => a[0] === 'e').length + 1 } };
  const un = unreadOf(s);
  const wire = un.find((f) => f.kind === 'wire');
  if (wire) return { kind: 'wire', to: toRoute(wire.to), v: wire.v, feedId: wire.id };
  if (s.career && !(s.career.history[0] && ymdUTC(s.career.history[0].at) === today)) return { kind: 'career', to: { n: 'story' }, v: { w: s.career.windows + 1 } };
  const room = un.find((f) => f.kind === 'room');
  if (room) return { kind: 'room', to: toRoute(room.to), v: room.v, feedId: room.id };
  const ready = (missionsView(s) || []).filter((m) => m.done && !m.claimed).length;
  if (ready) return { kind: 'mission', to: { n: 'front' }, v: { n: ready } };
  return { kind: 'practice', to: { n: 'practice' }, v: event ? { e: event } : undefined };
}

// ---------------------------------------------------------------- §7.1 cross-mode events (the desk in lib/desk.ts listens)
// Emitted from inside the save mutators above, so a listener writes into the same draft and lands in the same save.
// Listeners never change a board, a score or the follower maths; they add consequences (an inbox line, a favour, a
// credit, a film) and stay idempotent by their own keys.
export type BylineEvent =
  | { kind: 'window'; sum: WindowSummary; w: WindowIn; save: Save }
  | { kind: 'daily-t1'; no: number; save: Save }
  | { kind: 'room-window'; code: string; round: number; sum: WindowSummary; tier?: Tier; total?: number; save: Save }
  | { kind: 'career-promo'; rank: number; save: Save }
  | { kind: 'wire'; call: WireResolved; player: string; d: number; shielded: boolean; save: Save };
const bylineSubs = new Set<(e: BylineEvent) => void>();
export function onByline(f: (e: BylineEvent) => void) { bylineSubs.add(f); return () => { bylineSubs.delete(f); }; }
function emitByline(e: BylineEvent) { for (const f of bylineSubs) { try { f(e); } catch { /* a listener never breaks the record */ } } }
/** A Wire credit hook: return true to shield one wrong call (consume the credit in the same draft). */
let wireShield: ((s: Save, c: WireResolved) => boolean) | null = null;
export const setWireShield = (f: ((s: Save, c: WireResolved) => boolean) | null) => { wireShield = f; };
