// One Byline (GOTY.md §1): the four shared systems every mode feeds. Followers + reputation + the hot hand (§1.1),
// the Contacts Book (§1.2), the rival ledgers (§1.3), the Feed (§1.4) and Home's next-up picker (§1.5).
// Local and cosmetic: nothing here changes a Daily board, its sources or its score. The Career/Practice perks are
// exposed as pure helpers (bookPerks, askCost) for the local engine callers; the Daily and rooms never read them.
//
// One career (3.4, GOTY.md §7.2): these four systems are the player's only numbers. A Career window moves them through
// recordInto() exactly like a Daily, a room, a Practice board or a Wire call (lib/career.ts applyWindow calls it), and
// every screen reads them from here: Me, the Story hub, Results (careerDelta), the Contacts screen, share cards.
import { update, getSave, type Save } from './save';
import type { ResultSaga, CastSaga, Tier } from './engine';
import { credit, toast, ymdUTC } from './meta';
import { levelOf, missionsView } from './progress';
import { t, trList } from './i18n';
import type { Route } from '../App';
import { moment } from './moments';
import { earnHook } from './earnhook';

// ---------------------------------------------------------------- types (stored in the save; all optional there)
export type BMode = 'daily' | 'career' | 'room' | 'wire' | 'practice';
export interface Byline { followers: number; rep: number; hot: number; best: number; keys?: string[]; last?: WindowSummary;
  /** 3.8: the exact reputation (repStep moves by fractions near the top); `rep` is its rounded, displayed value. */
  repX?: number }
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
  /** The player's numbers before this window (careerSnapshot), so Results can show careerDelta(snap, save). */
  snap?: CareerSnap;
}

// ---------------------------------------------------------------- §1.1 numbers (3.8: spec J, brief §20–§21)
// FOLLOWERS = how famous you are. REPUTATION = how trusted you are. Practice is off the record: neither moves.
export const MODE_F: Record<BMode, number> = { daily: 1, career: 1, room: 0.8, wire: 1.5, practice: 0 };
export const BASE_RIGHT = [30, 80, 200];
export const BASE_WRONG = [15, 50, 200];
export const EXCL_BONUS = 400;
/** ×1 / ×1.5 / ×2 for a 1★ / 2★ / 3★ (superstar) player; an unrated player counts as 1★. */
export const STAR_F = [1, 1, 1.5, 2];
/** +10% per day left when the call was filed (day 1 of 7 → ×1.6; Deadline Day → ×1). */
export const EARLY_F = 0.1;
/** The hot hand, kept but quiet: +10% per right call in a row, capped at ×1.5. */
export const HOT_CAP = 5;
// The one ladder, read as words on the Press Card: a new name starts at rep 50, a Blogger; 55 makes a Stringer. Since
// 3.8 reputation settles near your weighted accuracy (repStep), so Tier One (85) means "right about 85% of the time at
// the volume you file at", not "played a lot". Career's stage gates (lib/career.ts STAGES) are lower than these words.
export const REP_TIERS = [['blogger', 0], ['stringer', 55], ['correspondent', 65], ['chief', 75], ['tierone', 85]] as const;
export type RepTier = typeof REP_TIERS[number][0];
export const repTier = (rep: number): RepTier => [...REP_TIERS].reverse().find(([, m]) => rep >= m)![0];
export const hotMult = (hot: number) => 1 + 0.1 * Math.min(hot, HOT_CAP);
export interface FollowerOpts { star?: number; daysLeft?: number; reach?: number }
/** Followers for one resolved call (§21): base × early × star × reach × hot; an exclusive adds 400 × star × reach;
 *  a wrong call costs 15 / 50 / 200 × star × reach (a wrong Confirmed on a superstar at Tier One reach: −800).
 *  `s` is loudness 0 In talks · 1 Advanced · 2 Confirmed. */
export function followerDelta(mode: BMode, s: number, right: boolean, excl: boolean, hot: number, o: FollowerOpts = {}): number {
  const st = Math.max(0, Math.min(2, s));
  const sf = STAR_F[Math.max(0, Math.min(3, Math.round(o.star ?? 1)))], reach = o.reach ?? 1, early = 1 + EARLY_F * Math.max(0, o.daysLeft ?? 0);
  if (right) return Math.round((BASE_RIGHT[st] * early + (excl ? EXCL_BONUS : 0)) * sf * reach * MODE_F[mode] * hotMult(hot));
  return -Math.round(BASE_WRONG[st] * sf * reach * MODE_F[mode]);
}
/** Reputation after one resolved call. Right: +1 / +1 / +2 (+1 for an exclusive) scaled by (100 − rep) / 50; wrong:
 *  0 / −1 / −3 scaled by rep / 50. The scaling makes rep settle where your record puts it instead of climbing with
 *  volume: a 75% Advanced caller sits near 71, an 88% expert near 85, a 60% caller near 60 (spec J §2). */
export const REP_GAIN = [1, 1, 2], REP_GAIN_EXCL = 1, REP_LOSS = [0, 1, 3];
export function repStep(rep: number, s: number, right: boolean, excl = false): number {
  const st = Math.max(0, Math.min(2, s));
  if (right) return Math.min(100, rep + (REP_GAIN[st] + (excl ? REP_GAIN_EXCL : 0)) * (100 - rep) / 50);
  return Math.max(0, rep - REP_LOSS[st] * rep / 50);
}
/** The exact reputation behind the displayed integer (a save from before 3.8 has none: its integer is exact). */
export const repExact = (b: Byline) => (typeof b.repX === 'number' && Math.abs(b.repX - b.rep) < 1 ? b.repX : b.rep);
function setRep(b: Byline, x: number) { b.repX = Math.round(x * 1000) / 1000; b.rep = Math.max(0, Math.min(100, Math.round(b.repX))); }
// ---------------------------------------------------------------- §1.2 contact relationships (brief §15), as words
export const TRUST_WORDS = ['cold', 'familiar', 'trusted', 'inner', 'direct'] as const;
export type TrustWord = typeof TRUST_WORDS[number];
/** Cold · Familiar · Trusted · Inner Circle · Direct Line for a Contacts Book level 1–5 (i18n `cr38.trust.<word>`). */
export const trustWord = (lv: number): TrustWord => TRUST_WORDS[Math.max(0, Math.min(4, lv - 1))];
export const freshByline = (): Byline => ({ followers: 0, rep: 50, hot: 0, best: 0 });
export const bylineOf = (s: Save): Byline => s.byline || freshByline();
// Follower milestones pay coins once, whichever mode crosses them (was Career-only before 3.4).
export const FOLLOWER_MILESTONES: [number, number][] = [[10000, 50], [50000, 100], [100000, 200], [250000, 300]];
function payMilestones(s: Save) {
  const b = bylineOf(s);
  for (const [f, cr] of FOLLOWER_MILESTONES) if (b.followers >= f && !s.milestones['f' + f]) {
    s.milestones['f' + f] = Date.now(); credit(s, cr, 'followers:' + f);
    pushFeed(s, { id: 'followers:' + f, kind: 'level', key: 'cn.feed.followers', v: { n: f.toLocaleString('en'), c: cr }, to: { n: 'me' }, tone: 'gold' });
  }
}

// ---------------------------------------------------------------- §1.2 the Contacts Book
export const BOOK_SRC = ['kitman', 'barber', 'agent', 'spotter', 'physio'] as const;
export const BOOK_LV = [0, 60, 160, 320, 560];
export const XP_ASK = 10, XP_MATCH = 25, XP_IGNORE = 5, XP_COFFEE = 20, COFFEE_COST = 30;
export const lvOfXp = (xp: number) => BOOK_LV.filter((x) => xp >= x).length;
export const bookOf = (s: Save, src: string): BookEntry => (s.book && s.book[src]) || { xp: 0, lv: 1 };
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
/** Career and Practice only: Trusted (3) opens the spotter / physio a day early and trims a source's mistakes;
 *  Direct Line (5) gives one free second opinion per window. Always off for the Daily and rooms. (3.8 removed the
 *  "first ask costs 1 less" perk: it was shown but never applied, brief §35.) */
export function bookPerks(src: string, mode: BMode | string, s: Save = getSave()) {
  const on = mode === 'career' || mode === 'practice';
  const lv = lvOfXp(bookOf(s, src).xp);
  return { early: on && lv >= 3 && (src === 'spotter' || src === 'physio'), fewerMistakes: on && lv >= 2, secondOpinion: on && lv >= 5 };
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
/** Head-to-head on one saga (§1.3): null when the rival didn't post or nobody was right. */
export function duel(p: ResultSaga, rival: string): RivalResult | null {
  const posts = p.posts.filter((x) => x.id === rival);
  if (!posts.length) return null;
  const theirs = posts[posts.length - 1].right, mine = !!p.call && p.right;
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
export interface WindowIn {
  mode: 'daily' | 'room' | 'practice' | 'career';
  /** Idempotency key: see windowKey(). */
  key: string;
  /** The engine's per-saga results: reads (who was asked, right or not), rival posts, the call (loudness s), right, excl. */
  per: ResultSaga[];
  cast?: CastSaga[];
  tier?: Tier; total?: number;
  /** Days in the window (early bonus: days left when filed) and the publication reach (Career stage); 7 and ×1 by default. */
  days?: number; reach?: number;
  /** Press Points before the window (for the level-up feed item). */
  ppBefore?: number;
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
    levelFeed(w.ppBefore);
    return pre.last && (pre.last.key === w.key || pre.last.key === preKey(w.key)) ? pre.last : null;
  }
  let out: WindowSummary | null = null;
  const toasts: [string, string][] = [];
  update((s) => {
    out = recordInto(s, w, toasts);
    if (w.ppBefore != null) passLevelFeed(s, w.ppBefore);
    earnHook(s); // rank and rivalry-trophy looks (lib/earned.ts)
  });
  for (const [a, c] of toasts) toast('ach', a, c);
  return out;
}
// The Pass level-up line is keyed by level, not by window, so a Career window (recorded before Results mounts, without
// the Press Points it is about to earn) still gets its line when Results calls recordWindow with ppBefore.
function levelFeed(ppBefore?: number) { if (ppBefore == null) return; if (levelOf(ppBefore).n < levelOf(getSave().pp).n) update((s) => passLevelFeed(s, ppBefore)); }
function passLevelFeed(s: Save, ppBefore: number) {
  const a = levelOf(ppBefore, s).n, c = levelOf(s.pp, s).n;
  for (let n = a + 1; n <= c; n++) pushFeed(s, { id: 'pass:' + n, kind: 'level', key: 'cn.feed.level', v: { n }, to: { n: 'pass' }, tone: 'gold' });
}

/** The mutator behind recordWindow: moves the numbers on the draft `s` and returns what changed, or null when this
 *  window key was already recorded. Toasts are collected for the caller to fire after the update commits. */
export function recordInto(s: Save, w: WindowIn, toasts: [string, string][] = []): WindowSummary | null {
  const b = (s.byline = s.byline || freshByline());
  if (seen(b, w.key) || seen(b, preKey(w.key)) || (w.key.startsWith(PRE) && seen(b, w.key.slice(PRE.length)))) return null;
  const snap = careerSnapshot(s);
  mark(b, w.key);
  const mode: BMode = w.mode;
  const name = (i: number) => w.cast?.[i]?.player.s || w.cast?.[i]?.player.n || '';
  const sum: WindowSummary = { key: w.key, mode, followers: 0, rep: 0, hot: b.hot, hotBefore: b.hot, levels: [], xp: {}, rivals: [], snap };
  // 1.1 followers / rep / hot hand, in the order the calls were filed. Practice is off the record: none of them move.
  const calls = w.per.filter((p) => p.call).sort((a, c) => a.call!.day - c.call!.day || a.i - c.i);
  const rep0 = b.rep;
  let rx = repExact(b);
  if (mode !== 'practice') for (const p of calls) {
    const d = followerDelta(mode, p.call!.s, p.right, p.excl, b.hot, { star: w.cast?.[p.i]?.player.star, daysLeft: Math.max(0, (w.days ?? 7) - p.call!.day), reach: w.reach });
    sum.followers += d;
    rx = repStep(rx, p.call!.s, p.right, p.excl);
    if (p.right) { b.hot++; b.best = Math.max(b.best, b.hot); } else b.hot = 0;
  }
  b.followers = Math.max(0, b.followers + sum.followers);
  setRep(b, rx); sum.rep = b.rep - rep0;
  sum.hot = b.hot;
  if (b.hot > sum.hotBefore && [3, 5, 10, 15, 20].some((m) => sum.hotBefore < m && b.hot >= m)) pushFeed(s, { kind: 'hot', key: 'cn.feed.hot', v: { n: b.hot }, to: { n: 'me' }, tone: 'gold' });
  if (repTier(rep0) !== repTier(b.rep)) pushFeed(s, { kind: 'level', key: b.rep > rep0 ? 'cn.feed.tierUp' : 'cn.feed.tierDown', v: { rt: repTier(b.rep) }, to: { n: 'me' }, tone: b.rep > rep0 ? 'gold' : 'bad' });
  if (b.rep > rep0 && repTier(rep0) !== repTier(b.rep)) moment('tier:' + repTier(b.rep), undefined, true); // film: the new press pass
  payMilestones(s);

  // 1.2 contacts: +10 per ask, +25 read right and call matched, +5 right call that ignored a wrong read
  const book = (s.book = s.book || {});
  for (const p of w.per) for (const r of p.reads) {
    if (!(BOOK_SRC as readonly string[]).includes(r.src)) continue;
    const x = XP_ASK + (p.right && p.call ? (r.right ? XP_MATCH : XP_IGNORE) : 0);
    sum.xp[r.src] = (sum.xp[r.src] || 0) + x;
  }
  for (const [src, x] of Object.entries(sum.xp)) {
    const e = (book[src] = book[src] || { xp: 0, lv: 1 });
    const lv0 = lvOfXp(e.xp);
    e.xp += x; e.asks = (e.asks || 0) + w.per.reduce((a, p) => a + p.reads.filter((r) => r.src === src).length, 0);
    e.hits = (e.hits || 0) + w.per.reduce((a, p) => a + p.reads.filter((r) => r.src === src && r.right).length, 0);
    e.lv = lvOfXp(e.xp);
    for (let lv = lv0 + 1; lv <= e.lv; lv++) levelUp(s, src, lv, sum, toasts);
  }

  // 1.3 rival ledgers (not in Practice: off the record means no scalps to farm)
  const rv = (s.rivals = s.rivals || {});
  const touched = new Map<string, { r: RivalResult; p: string }>();
  if (mode !== 'practice') for (const p of w.per) for (const id of RIVALS) {
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
  const coins = lv * 10;
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
export interface WireResolved { rid: string; right?: boolean | null; done?: boolean; s: number; at: number; player?: string; pts?: number; star?: number }
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
      // §7.1: a Wire credit (earned by a Daily Tier 1) shields one wrong call's followers and rep; the hot hand still resets.
      const shielded = !c.right && !!wireShield && wireShield(s, c);
      const d = shielded ? 0 : followerDelta('wire', st, !!c.right, false, b.hot, { star: c.star, daysLeft: 0 });
      if (c.right) { b.hot++; b.best = Math.max(b.best, b.hot); setRep(b, repStep(repExact(b), st, true)); official = nameOf?.(c.rid) || c.player || ''; }
      else { b.hot = 0; if (!shielded) setRep(b, repStep(repExact(b), st, false)); }
      b.followers = Math.max(0, b.followers + d);
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
  if (b1 && b1.rep > repW0 && repTier(repW0) !== repTier(b1.rep)) moment('tier:' + repTier(b1.rep), undefined, true);
}

// ---------------------------------------------------------------- the player's numbers, before and after (Results)
/** Everything a result screen can say moved: the byline, the book, the ledgers, the story rank, coins and the Pass. */
export interface CareerSnap {
  followers: number; rep: number; tier: RepTier; hot: number; best: number;
  book: Record<string, number>; rivals: Record<string, { w: number; l: number; d: number }>;
  rank: number; windows: number; t1: number; favours: number; credits: number; pass: number;
}
export function careerSnapshot(s: Save): CareerSnap {
  const b = bylineOf(s), c = s.career;
  const book: Record<string, number> = {}; for (const src of BOOK_SRC) book[src] = lvOfXp(bookOf(s, src).xp);
  const rivals: CareerSnap['rivals'] = {}; for (const id of RIVALS) { const r = rivalOf(s, id); rivals[id] = { w: r.w, l: r.l, d: r.d }; }
  return {
    followers: b.followers, rep: b.rep, tier: repTier(b.rep), hot: b.hot, best: b.best, book, rivals,
    rank: c ? c.rank : -1, windows: c ? c.windows : 0, t1: c ? c.t1 : 0, favours: c ? c.favours.burner + c.favours.tipoff + c.favours.stakeout : 0,
    credits: s.credits, pass: levelOf(s.pp, s).n,
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
  const ti = (x: RepTier) => REP_TIERS.findIndex(([k]) => k === x);
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
