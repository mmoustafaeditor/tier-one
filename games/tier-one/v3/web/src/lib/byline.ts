// One Byline (GOTY.md §1): the four shared systems every mode feeds. Followers + reputation + the hot hand (§1.1),
// the Contacts Book (§1.2), the rival ledgers (§1.3), the Feed (§1.4) and Home's next-up picker (§1.5).
// Local and cosmetic: nothing here changes a Daily board, its sources or its score. The Career/Practice perks are
// exposed as pure helpers (bookPerks, askCost) for the local engine callers; the Daily and rooms never read them.
import { update, getSave, type Save } from './save';
import type { ResultSaga, CastSaga, Tier } from './engine';
import { credit, toast, ymdUTC } from './meta';
import { levelOf, missionsView } from './progress';
import { t } from './i18n';
import type { Route } from '../App';
import { moment } from './moments';

// ---------------------------------------------------------------- types (stored in the save; all optional there)
export type BMode = 'daily' | 'career' | 'room' | 'wire' | 'practice';
export interface Byline { followers: number; rep: number; hot: number; best: number; keys?: string[]; last?: WindowSummary }
export interface BookEntry { xp: number; lv: number; coffee?: string; asks?: number; hits?: number }
export type RivalResult = 'w' | 'l' | 'd';
export interface RivalRec { w: number; l: number; d: number; streak: number; last: RivalResult | ''; at?: number; taunt?: string; tp?: string; scalp?: number; trophy?: number }
export type FeedKind = 'editor' | 'rival' | 'wire' | 'room' | 'contact' | 'mission' | 'level' | 'season' | 'streak' | 'window' | 'hot';
export type FeedRoute = { n: 'front' | 'daily' | 'wire' | 'story' | 'me' | 'pass' | 'practice' | 'rooms' | 'rivals' | 'contacts' | 'feed'; rid?: string; code?: string };
export interface FeedItem { id: string; at: number; kind: FeedKind; key: string; v?: Record<string, string | number>; to?: FeedRoute; from?: string; tone?: 'good' | 'bad' | 'gold'; read?: boolean }
export interface WindowSummary {
  key: string; mode: BMode; followers: number; rep: number; hot: number; hotBefore: number;
  levels: { src: string; lv: number }[]; xp: Record<string, number>; rivals: { id: string; r: RivalResult }[];
}

// ---------------------------------------------------------------- §1.1 numbers
export const MODE_F: Record<BMode, number> = { daily: 1, career: 1, room: 0.8, wire: 1.5, practice: 0.25 };
export const BASE_RIGHT = [40, 90, 220];
export const BASE_WRONG = [20, 60, 260];
export const EXCL_BONUS = 300;
export const HOT_CAP = 10;
export const REP_TIERS = [['blogger', 0], ['stringer', 20], ['correspondent', 40], ['chief', 60], ['tierone', 80]] as const;
export type RepTier = typeof REP_TIERS[number][0];
export const repTier = (rep: number): RepTier => [...REP_TIERS].reverse().find(([, m]) => rep >= m)![0];
export const hotMult = (hot: number) => 1 + 0.1 * Math.min(hot, HOT_CAP);
/** Followers for one resolved call (§1.1). `s` is loudness 0 Talks · 1 Advanced · 2 Confirmed. */
export function followerDelta(mode: BMode, s: number, right: boolean, excl: boolean, hot: number): number {
  const st = Math.max(0, Math.min(2, s));
  if (right) return Math.round((BASE_RIGHT[st] + (excl ? EXCL_BONUS : 0)) * MODE_F[mode] * hotMult(hot));
  return -Math.round(BASE_WRONG[st] * MODE_F[mode] * 0.5);
}
export const freshByline = (): Byline => ({ followers: 0, rep: 50, hot: 0, best: 0 });
export const bylineOf = (s: Save): Byline => s.byline || freshByline();

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
export const netOf = (r: RivalRec) => r.w - r.l;
export type RivalState = 'winning' | 'losing' | 'level';
export const rivalState = (r: RivalRec): RivalState => (netOf(r) > 0 ? 'winning' : netOf(r) < 0 ? 'losing' : 'level');
export const TAUNTS = 8;
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
  if (f.n === 'rooms') return { n: 'rooms', code: f.code };
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
  /** Press Points before the window (for the level-up feed item). */
  ppBefore?: number;
  /** A Career story beat to mirror into the feed. */
  beat?: { from: string; key: string; v?: Record<string, string | number> } | null;
  room?: { code: string; round: number };
  no?: number;
}
export function windowKey(v: { mode: string; no?: number; seed?: string; room?: { code: string; round: number } }) {
  if (v.mode === 'daily') return 'daily:' + (v.no || ymdUTC());
  if (v.mode === 'room' && v.room) return 'room:' + v.room.code + ':' + v.room.round;
  return v.mode + ':' + (v.seed || '');
}

/** Records one resolved window into the byline, the book, the rival ledgers and the feed. Idempotent per `key`:
 *  a second call returns the stored summary and changes nothing. */
export function recordWindow(w: WindowIn): WindowSummary | null {
  const pre = getSave().byline;
  if (pre && seen(pre, w.key)) return pre.last && pre.last.key === w.key ? pre.last : null;
  let out: WindowSummary | null = null;
  const toasts: [string, string][] = [];
  update((s) => {
    const b = (s.byline = s.byline || freshByline());
    if (seen(b, w.key)) return;
    mark(b, w.key);
    const mode: BMode = w.mode;
    const name = (i: number) => w.cast?.[i]?.player.s || w.cast?.[i]?.player.n || '';
    const sum: WindowSummary = { key: w.key, mode, followers: 0, rep: 0, hot: b.hot, hotBefore: b.hot, levels: [], xp: {}, rivals: [] };
    // 1.1 followers / rep / hot hand, in the order the calls were filed
    const calls = w.per.filter((p) => p.call).sort((a, c) => a.call!.day - c.call!.day || a.i - c.i);
    for (const p of calls) {
      const d = followerDelta(mode, p.call!.s, p.right, p.excl, b.hot);
      sum.followers += d;
      if (p.right) { b.hot++; b.best = Math.max(b.best, b.hot); sum.rep += 1; }
      else { b.hot = 0; if (p.call!.s === 2) sum.rep -= 2; }
    }
    b.followers = Math.max(0, b.followers + sum.followers);
    const rep0 = b.rep; b.rep = Math.max(0, Math.min(100, b.rep + sum.rep)); sum.rep = b.rep - rep0;
    sum.hot = b.hot;
    if (b.hot > sum.hotBefore && [3, 5, 10, 15, 20].some((m) => sum.hotBefore < m && b.hot >= m)) pushFeed(s, { kind: 'hot', key: 'cn.feed.hot', v: { n: b.hot }, to: { n: 'me' }, tone: 'gold' });
    if (repTier(rep0) !== repTier(b.rep)) pushFeed(s, { kind: 'level', key: b.rep > rep0 ? 'cn.feed.tierUp' : 'cn.feed.tierDown', v: { rt: repTier(b.rep) }, to: { n: 'me' }, tone: b.rep > rep0 ? 'gold' : 'bad' });
    if (b.rep > rep0 && repTier(rep0) !== repTier(b.rep)) moment('tier:' + repTier(b.rep), undefined, true); // film: the new press pass

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

    // 1.3 rival ledgers
    const rv = (s.rivals = s.rivals || {});
    const touched = new Map<string, { r: RivalResult; p: string }>();
    for (const p of w.per) for (const id of RIVALS) {
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
      let idx = hash(w.key + id) % TAUNTS; if (idx === prevIdx) idx = (idx + 1) % TAUNTS;
      rec.taunt = st + '.' + idx; rec.tp = x.p || '';
      pushFeed(s, { kind: 'rival', from: id, key: 'cn.taunt.' + id + '.' + st + '.' + idx, v: { rec: rec.w + '–' + rec.l + (rec.d ? '–' + rec.d : ''), p: x.p || '?' }, to: { n: 'rivals' }, tone: x.r === 'l' ? 'bad' : x.r === 'w' ? 'good' : undefined });
    }

    // 1.4 the window's own line, the editor's beat, level-ups and missions
    if (w.beat) pushFeed(s, { kind: 'editor', from: w.beat.from, key: 'g.story.beat.' + w.beat.key, v: w.beat.v, to: { n: 'story' } });
    const f = sum.followers;
    pushFeed(s, {
      kind: mode === 'room' ? 'room' : 'window', key: mode === 'room' ? 'cn.feed.room' : 'cn.feed.window',
      v: { mode, f: (f > 0 ? '+' : f < 0 ? '−' : '') + Math.abs(f).toLocaleString('en'), tier: w.tier || '', n: w.no || (w.room ? w.room.round + 1 : '') },
      to: modeRoute(mode, w.room?.code), tone: f > 0 ? 'good' : f < 0 ? 'bad' : undefined,
    });
    if (w.ppBefore != null) { const a = levelOf(w.ppBefore).n, c = levelOf(s.pp).n; if (c > a) pushFeed(s, { kind: 'level', key: 'cn.feed.level', v: { n: c }, to: { n: 'pass' }, tone: 'gold' }); }
    missionFeed(s);
    b.last = sum; out = sum;
  });
  for (const [a, c] of toasts) toast('ach', a, c);
  return out;
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
export interface WireResolved { rid: string; right?: boolean | null; done?: boolean; s: number; at: number; player?: string; pts?: number }
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
      const d = followerDelta('wire', st, !!c.right, false, b.hot);
      if (c.right) { b.hot++; b.best = Math.max(b.best, b.hot); b.rep = Math.min(100, b.rep + 1); official = nameOf?.(c.rid) || c.player || ''; }
      else { b.hot = 0; if (st === 2) b.rep = Math.max(0, b.rep - 2); }
      b.followers = Math.max(0, b.followers + d);
      // Old backlog lands quietly; the newest few make the feed.
      if (k >= list.length - 5) pushFeed(s, { id: 'wire:' + c.rid + ':' + c.at, kind: 'wire', key: c.right ? 'cn.feed.wireRight' : 'cn.feed.wireWrong', v: { p: nameOf?.(c.rid) || c.player || '?', f: (d > 0 ? '+' : '−') + Math.abs(d).toLocaleString('en') }, to: { n: 'wire', rid: c.rid }, tone: c.right ? 'good' : 'bad' });
    });
  });
  // Film: the newest call that settled your way gets its OFFICIAL broadcast (one per refresh).
  if (official != null) moment('official', official ? { p: official } : undefined);
  const b1 = getSave().byline;
  if (b1 && b1.rep > repW0 && repTier(repW0) !== repTier(b1.rep)) moment('tier:' + repTier(b1.rep), undefined, true);
}

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
