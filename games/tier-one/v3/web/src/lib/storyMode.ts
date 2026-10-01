// Story mode, "The Comeback" (CONCEPT4 §16, §10): Career IS Story. Five chapters and an epilogue, told as a DM thread by
// the people in it, on the 4.0 engine. Each chapter changes the game you play: who guides you, which contacts pick up,
// one mechanic, one boss, one reveal and one unlock. Nothing here is a separate grind: it all runs on the windows you play.
//
//   Chapter        guide             contacts                mechanic                          boss
//   1 The Blog     Rosa              barber, kit man, agent  the three tells                   @BackPageBants
//   2 The Post     Hana Okafor       + spotter (day 3)       Vince's clients (tagged stories)  @ITK_Kev
//   3 Nationals    Hana + Tony       all five                the race (Market Tips spendable)  @PressBoxPete
//   4 The War      Priya; Mags calls all five                Vince's play (a planted contact)  The Daily Roar (Carl Stubbs)
//   5 Chronicle    Mags              all five                the trap; 3 Tier One; Live 45 s   Vince Marlow
//
// For the play lane, one call is the whole contract:
//
//   const w = nextCareerWindow(getSave());
//   const d = makeDriver({ mode: 'career', seed: w.seed, rules: w.rules, cast: w.cast, label: w.label, onDone: w.onDone });
//
// `w.onDone` (= onStoryDone) moves the byline, scores the head-to-head, writes the thread and then runs lib/meta.ts
// onCareerDone (XP, coins, sponsors, files), returning the Gain. `w.tips` are the DMs that arrive before day 1 (the
// whistleblower, a bought tip-off, Vince's pitch in Chapter 5); `w.tagged` marks Vince's clients; `w.boss` is the stats
// card. Vince's planted contact (`w.planted`) is a secret until the window is over: the thread tells it after.
// If a window ever settles through plain onDriverDone instead, catchUpStory() (the Story screen calls it) settles the
// story side from save.v4.last.career, once per seed.
//
// Save: save.story.c4 (Story4Save), per career slot. A 3.x career maps in on first read (story4Of): rank r → chapter
// r + 1, its windows kept, 3.x favours folded into free extras. save.career stays the slot container; its rank mirrors
// the chapter (chapter − 1) so the driver's cast pool and older readers keep working.
import { E4, type Boss4, type CastSaga, type RuleSpec4, type Rules4, type Result, type Tier, type CareerOpts4 } from './engine';
import { getSave, update, type Save, type CareerSave } from './save';
import { RANKS, newCareer, type CareerReport } from './career';
import { bylineOf, rankOf, recordInto, careerWindowKey } from './byline';
import { rankIndex, RANKS as REP_RANKS, debit, PRICES, type Gain, type RankId } from './economy';
import { castForSpec, trustFor, liveWindow, lastWindow, type Outcome4, type Driver4 } from './driver';
import { onCareerDone, toast } from './meta';
import { setBoss } from './rivals';
import { t } from './i18n';
import { earnHook } from './earnhook';

// ---------------------------------------------------------------- the chapters
export const CHAPTERS = ['blog', 'post', 'nationals', 'war', 'chronicle', 'front'] as const;
export type ChapterId = typeof CHAPTERS[number];
export const LEGACY_CHAPTER: Record<string, ChapterId> = { comeback: 'post', stringer: 'nationals', rival: 'war' };
export const chapterId = (id: string): ChapterId => (LEGACY_CHAPTER[id] || id) as ChapterId;
/** Chapter numbers are 1–5; 6 is the epilogue. */
export const EPILOGUE_CH = 6;
/** Chapters 1–5 are indexes 0–4; index 5 is the epilogue (3.x callers). */
export const EPILOGUE = 5;
export const FINALE_T1 = 3;
/** The finale's Live clock (seconds), a Deadline Day window on Story's rules. */
export const FINALE_SECONDS = 45;

export type Person = 'mags' | 'rosa' | 'hana' | 'tony' | 'priya' | 'vince' | 'carl' | 'unknown' | 'you' | 'bants' | 'kev' | 'pete' | 'sal' | 'dougie' | 'ines';
export interface ChapterDef {
  n: number; id: ChapterId;
  /** Who's in your DMs this chapter (the first one heads the thread). */
  guide: Person[];
  /** Contacts that pick up (rulesFor contacts option). */
  contacts: string[];
  /** Ordinary rival accounts on the timeline (the boss is added on top). */
  rivals: string[];
  boss: Boss4;
  /** Board rank for rulesFor (stories 3 → 6). */
  rank: number;
  /** The gate: windows played in the chapter, the Rep bar (a rank's), head-to-head wins against the boss. */
  windows: number; rep: number; repRank: RankId; wins: number;
  /** Story's own unlocks at the end of the chapter (looks come from lib/catalog.ts earn { via: 'story', n }). */
  unlock: string[];
}
const ALL5 = ['barber', 'kitman', 'agent', 'spotter', 'physio'];
const bar = (id: RankId) => REP_RANKS[rankIndex(id)][1];
export const CH: ChapterDef[] = [
  { n: 1, id: 'blog', guide: ['rosa'], contacts: ['barber', 'kitman', 'agent'], rivals: [], boss: 'bants', rank: 0, windows: 8, rep: bar('rising'), repRank: 'rising', wins: 3, unlock: ['spotter', 'wallpaper'] },
  { n: 2, id: 'post', guide: ['hana'], contacts: ['barber', 'kitman', 'agent', 'spotter'], rivals: ['tabloid'], boss: 'kev', rank: 1, windows: 12, rep: bar('itk'), repRank: 'itk', wins: 5, unlock: ['physio', 'national', 'catchphrase'] },
  { n: 3, id: 'nationals', guide: ['hana', 'tony'], contacts: ALL5, rivals: ['tabloid', 'itk'], boss: 'pete', rank: 2, windows: 16, rep: bar('insider'), repRank: 'insider', wins: 7, unlock: ['live', 'global', 'dropStyle'] },
  { n: 4, id: 'war', guide: ['priya', 'mags'], contacts: ALL5, rivals: ['tabloid', 'itk', 'insider'], boss: 'roar', rank: 3, windows: 20, rep: bar('tierone'), repRank: 'tierone', wins: 9, unlock: ['customLine', 'wall'] },
  { n: 5, id: 'chronicle', guide: ['mags'], contacts: ALL5, rivals: ['tabloid', 'itk', 'insider'], boss: 'vince', rank: 4, windows: 0, rep: bar('tierone'), repRank: 'tierone', wins: 0, unlock: ['tierone', 'chronicleWall', 'longDeal'] },
];
export const chapterDef = (n: number): ChapterDef => CH[Math.max(1, Math.min(5, n)) - 1];

// ---------------------------------------------------------------- the bosses (CONCEPT4 §10)
export interface BossDef { id: Boss4; handle: string; ch: number; followers: number; days: string }
/** Handles are rival ids (i18n rival.<id>); followers are the account's own size, a fixed fact of the world. */
export const BOSS: Record<Boss4, BossDef> = {
  bants: { id: 'bants', handle: 'tabloid', ch: 1, followers: 84200, days: 'early' },
  kev: { id: 'kev', handle: 'itk', ch: 2, followers: 212000, days: 'early' },
  pete: { id: 'pete', handle: 'insider', ch: 3, followers: 640000, days: 'late' },
  roar: { id: 'roar', handle: 'roar', ch: 4, followers: 1300000, days: 'early' },
  vince: { id: 'vince', handle: 'vince', ch: 5, followers: 96000, days: 'early' },
};
export interface BossView {
  id: Boss4; handle: string; ch: number; followers: number;
  /** Right this often (0–1), at the rank they meet you at. */
  acc: number;
  /** The days they post on (the finale: before you start, 0). */
  days: [number, number];
  /** Your record against them, all time, and this chapter. */
  vs: WLD; chapter: WLD; need: number;
}
export interface WLD { w: number; l: number; d: number }
const wld0 = (): WLD => ({ w: 0, l: 0, d: 0 });

// ---------------------------------------------------------------- the save
export interface StoryNext {
  /** The window these extras are for (Story4Save.windows + 1). */
  w: number;
  /** Bought extra DMs (day 1). */
  dm: number;
  /** Bought tip-offs: the story indexes asked about. */
  tips: number[];
  /** Coins paid, free extras used (for the receipt line). */
  paid: number; free: number;
}
export interface Story4Save {
  ch: number; inCh: number; windows: number;
  h2h: WLD; vs?: Partial<Record<Boss4, WLD>>;
  /** Tier One windows in Chapter 5 (the finale needs three). */
  t1: number;
  /** Free extras (3.x favours folded in; a right Market call can add one through desk.ts). */
  free?: number;
  next?: StoryNext | null;
  /** Window seeds already settled (idempotence). */
  done?: string[];
  /** One-time beats: reveal<n>, wb (the first whistleblower), vince (the first planted line), finale, epilogue. */
  seen?: Record<string, number>;
  /** Rep when the chapter began: the pinned "Rep 47 → 55". */
  rep0?: number;
  /** Finale tries (Chapter 5's Live). */
  tries?: number;
  /** The rank index you held when the chapter began: the boss's accuracy and speed (and Chapter 4's sixth story) scale
   *  with it, and it stays put for the whole chapter so a window's board never shifts between Story and play. */
  rk?: number;
}
type StorySave = NonNullable<Save['story']> & { c4?: Story4Save };
const storyOf = (s: Save) => (s.story || {}) as StorySave;

/** The Story state for a save (derived, never written): a 3.x career maps straight in. Null before the prologue. */
export function story4Of(s: Save): Story4Save | null {
  const c4 = storyOf(s).c4;
  if (c4) return c4;
  const c = s.career;
  if (!c) return null;
  const done = c.rank >= 4 && (c.t1Top || 0) >= FINALE_T1;
  const fav = c.favours ? c.favours.burner + c.favours.tipoff + c.favours.stakeout : 0;
  return { ch: done ? EPILOGUE_CH : Math.min(5, c.rank + 1), inCh: 0, windows: c.windows, h2h: wld0(), t1: c.rank >= 4 ? Math.min(FINALE_T1, c.t1Top || 0) : 0, free: Math.min(4, fav), rep0: Math.round(bylineOf(s).rep) };
}
function draft4(x: Save): Story4Save {
  const st = (x.story = x.story || {}) as StorySave;
  if (!st.c4) st.c4 = story4Of(x) || { ch: 1, inCh: 0, windows: 0, h2h: wld0(), t1: 0, rep0: Math.round(bylineOf(x).rep) };
  return st.c4;
}
const mirror = (x: Save, c4: Story4Save) => {
  if (!x.career) return;
  x.career.rank = Math.max(0, Math.min(RANKS.length - 1, Math.min(5, c4.ch) - 1));
  x.story!.chapterSeen = Math.min(5, c4.ch - 1); // chapters behind you: lib/earned.ts pays the story looks off this
};

// ---------------------------------------------------------------- the thread (save.story.inbox)
/** A thread message. `key` is an i18n key (st4.*), or 'st4.banter' (v: pool, seed, salt → lib/banter.ts Banter.pick),
 *  or a card: 'st4.card.result' | 'st4.card.chapter' | 'st4.card.unlock' | 'st4.card.boss'. */
export interface Msg { at: number; from: string; key: string; v?: Record<string, string | number>; read?: boolean }
export const THREAD_CAP = 80;
function say(x: Save, from: Person | 'sys', key: string, v?: Record<string, string | number>, at = Date.now()) {
  const st = (x.story = x.story || {});
  st.inbox = [...(st.inbox || []), { at, from, key, ...(v ? { v } : {}) }].slice(-THREAD_CAP);
}
const once = (c4: Story4Save, id: string) => { const seen = (c4.seen = c4.seen || {}); if (seen[id]) return false; seen[id] = Date.now(); return true; };

/** Chapter n opens: the guide's opening lines, then the boss card. */
function openChapter(x: Save, c4: Story4Save, n: number) {
  const d = chapterDef(n);
  c4.ch = n; c4.inCh = 0; c4.h2h = wld0(); c4.rep0 = Math.round(bylineOf(x).rep); c4.next = null; c4.rk = Math.max(0, rankIndex(rankOf(x)));
  if (n === 5) { c4.t1 = 0; c4.tries = 0; }
  mirror(x, c4);
  const t0 = Date.now();
  say(x, 'sys', 'st4.card.chapter', { n }, t0);
  const lines = OPEN_LINES[n] || [];
  lines.forEach(([from, k], j) => say(x, from, 'st4.open.' + n + '.' + k, undefined, t0 + 1 + j));
  say(x, 'sys', 'st4.card.boss', { boss: d.boss }, t0 + 9);
}
/** Who says each chapter's opening lines (st4.open.<n>.<k>). */
const OPEN_LINES: Record<number, [Person, string][]> = {
  1: [['rosa', 'a'], ['rosa', 'b'], ['rosa', 'c']],
  2: [['hana', 'a'], ['hana', 'b'], ['hana', 'c']],
  3: [['hana', 'a'], ['tony', 'b'], ['hana', 'c']],
  4: [['priya', 'a'], ['priya', 'b'], ['mags', 'c']],
  5: [['mags', 'a'], ['mags', 'b'], ['vince', 'c']],
};
/** The mid-chapter reveal: who tells it. */
const REVEAL_BY: Record<number, Person> = { 1: 'rosa', 2: 'hana', 3: 'tony', 4: 'priya', 5: 'mags' };

// ---------------------------------------------------------------- the prologue
/** The fall is played: a new career at Chapter 1 (or the slot's career marked as past its prologue). Idempotent. */
export function finishPrologue() {
  update((x) => {
    const st = (x.story = x.story || {});
    const fresh = !st.prologue || !x.career;
    st.prologue = true;
    if (!x.career) x.career = newCareer((x.slot || 0) + 1);
    const had = !!(st as StorySave).c4;
    const c4 = draft4(x);
    if (fresh && !had) openChapter(x, c4, c4.ch);
    mirror(x, c4);
    earnHook(x);
  });
}
/** A save that is past the prologue but has no Story 4 state yet (a 3.x career, or one onboarding opened and the
 *  prologue already played): materialise it and open the current chapter in the thread. Idempotent. */
export function ensureStory4() {
  const s = getSave();
  if (!s.career || !s.story?.prologue || storyOf(s).c4) return;
  // The 3.x inbox spoke the old words (front pages, the editor's desk): the thread starts clean at the current chapter.
  update((x) => { const c4 = draft4(x); x.story!.inbox = []; if (c4.ch < EPILOGUE_CH) openChapter(x, c4, c4.ch); else mirror(x, c4); });
}
/** The epilogue's last tap: you send Vince the text. */
export function sendEpilogue() { update((x) => { const c4 = draft4(x); once(c4, 'epiSent'); }); }
/** Start the story over from the prologue (after the epilogue). Followers, Rep and contacts stay: they're the account's. */
export function restartStory() {
  update((x) => {
    x.career = newCareer((x.slot || 0) + 1, (x.career?.restarts || 0) + 1);
    x.story = { prologue: false, chapterSeen: 0, inbox: [] };
  });
}

// ---------------------------------------------------------------- per-window secrets, from the seed
function h32(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/** A window's seed: fixed by the slot and the window number, so Story can show the cast before you open it. */
export const seedFor = (s: Save, w: number) => 'car-' + (h32(s.dev + '|' + (s.slot || 0) + '|' + (s.career?.restarts || 0) + '|' + w) >>> 0).toString(36).toUpperCase();
/** Vince's clients (Chapter 2 on): about one story in three, at least one. */
function taggedFor(seed: string, n: number): number[] {
  const out = Array.from({ length: n }, (_, i) => i).filter((i) => h32(seed + '|tag|' + i) % 3 === 0);
  return out.length ? out : [h32(seed + '|tag') % n];
}
/** Vince's play (Chapter 4 on): one story, one three-way contact fed the line. */
function plantedFor(seed: string, n: number, contacts: string[]): { i: number; src: string } | null {
  const opts = ['agent', 'barber', 'spotter'].filter((k) => contacts.includes(k));
  if (!opts.length) return null;
  const h = h32(seed + '|vince');
  return { i: h % n, src: opts[(h >>> 9) % opts.length] };
}
/** A DM that lands before day 1: the whistleblower (75%, Priya's 90% from Chapter 4), a bought tip-off, Vince's pitch. */
export interface Tip4 { i: number; kind: 'whistle' | 'tipoff' | 'pitch'; from: Person; o?: number; stays?: boolean }
export const WHISTLE = { every: 8, right: 0.75, priyaEvery: 4, priyaRight: 0.9 } as const;

export interface Extras4 {
  /** What's bought for this window. */
  dm: number; tips: number[];
  /** What another extra costs now (0 = a free one is next), and whether one more is allowed. */
  priceDm: number; priceTip: number; left: number; free: number; marketTips: number;
  /** Extras are bought before the window opens; a started window has them locked in. */
  locked: boolean;
}
/** Everything the next Career window is, for the play lane and the Story screen. */
export interface CareerWindow4 {
  seed: string; rules: RuleSpec4; R: Rules4; cast: CastSaga[];
  /** Window number (all-time) and the chapter it belongs to. */
  n: number; ch: number; label: string;
  extras: Extras4; boss: BossView;
  /** DMs that arrive before day 1. */
  tips: Tip4[];
  /** Vince's clients (the play lane tags these stories). */
  tagged: number[];
  /** Vince's planted contact: SECRET until the window is over (never show it during play). */
  planted: { i: number; src: string } | null;
  /** The finale: a 45-second Live. */
  live: boolean;
  /** A live window of this mode is in the save: open it with resume (the driver picks it up). */
  resume: boolean;
  /** Pass as makeDriver({ onDone }). */
  onDone: (r: Outcome4, d: Driver4) => Gain;
}
/** Market Tips are spendable in Story from Chapter 3 (CONCEPT4 §9). */
const marketTipsOf = (s: Save, ch: number) => (ch >= 3 ? Math.max(0, Math.min(3, s.v4?.tips || 0)) : 0);

/** The boss a chapter's windows play against, scaled to the rank you hold. */
export function bossView(s: Save, ch: number, c4: Story4Save | null = story4Of(s), live = false): BossView {
  const d = chapterDef(ch), b = BOSS[d.boss], rk = c4?.rk ?? Math.max(0, rankIndex(rankOf(s)));
  const [, rel, d0, d1] = E4.BOSSES[d.boss].t[rk];
  return { id: d.boss, handle: b.handle, ch: b.ch, followers: b.followers, acc: rel, days: live ? [0, 0] : [Math.min(d0, 4), Math.min(d1, 4)], vs: { ...wld0(), ...(c4?.vs?.[d.boss] || {}) }, chapter: c4 && c4.ch === ch ? { ...c4.h2h } : wld0(), need: d.wins };
}

/** The next Career window: its seed, rules (chapter contacts, boss, extras, Vince's clients, Vince's play), cast,
 *  the DMs that land before day 1, the boss card and the settle. Pure: reads the save, writes nothing. */
export function nextCareerWindow(s: Save = getSave()): CareerWindow4 {
  const c4 = story4Of(s) || { ch: 1, inCh: 0, windows: 0, h2h: wld0(), t1: 0 };
  const ch = Math.min(5, c4.ch), d = chapterDef(ch);
  const lw = liveWindow('career', s);
  const n = c4.windows + 1;
  const live = c4.ch === 5 && c4.t1 >= FINALE_T1;   // after the epilogue, windows carry on as Chapter 5's, no finale
  const seed = lw ? lw.seed : seedFor(s, n);
  const nx = c4.next && c4.next.w === n ? c4.next : null;
  const dm = nx ? nx.dm : 0, bought = nx ? nx.tips : [];
  const repRank = c4.rk ?? Math.max(0, rankIndex(rankOf(s)));
  // Chapter 4: five stories, six if you came into it holding Tier One (CONCEPT4 §16 "5–6 stories").
  const rank = ch === 4 && repRank >= 4 ? 4 : d.rank;
  const nStories = live ? 6 : [3, 4, 5, 5, 6][rank];
  const tagged = ch >= 2 ? taggedFor(seed, nStories) : [];
  const planted = ch >= 4 ? plantedFor(seed, nStories, d.contacts) : null;
  const opts: CareerOpts4 = {
    rank, trust: trustFor(s), boss: d.boss, bossRank: repRank, contacts: d.contacts, rivals: d.rivals,
    ...(dm ? { extraDm: dm } : {}), ...(tagged.length ? { tagged } : {}), ...(planted ? { planted } : {}), ...(live ? { live: FINALE_SECONDS } : {}),
  };
  const rules: RuleSpec4 = lw ? lw.rules : E4.specOf('career', opts);
  const R = E4.rulesOf(rules);
  const cast = castForSpec(seed, rules, R);
  const board = E4.buildBoard(seed, R);
  const tips: Tip4[] = [];
  // The whistleblower: about one window in eight before Chapter 4 (75% right), then Priya on the second line (90%).
  const wbEvery = ch >= 4 ? WHISTLE.priyaEvery : WHISTLE.every, wbRight = ch >= 4 ? WHISTLE.priyaRight : WHISTLE.right;
  const hw = h32(seed + '|wb');
  if (c4.windows >= 1 && hw % wbEvery === 0) {
    const i = (hw >>> 5) % R.STORIES, st = board.stories[i];
    const right = ((hw >>> 13) % 1000) / 1000 < wbRight;
    tips.push({ i, kind: 'whistle', from: ch >= 4 ? 'priya' : 'unknown', o: right ? st.truth : st.spin });
  }
  for (const i of bought) if (board.stories[i]) tips.push({ i, kind: 'tipoff', from: d.guide[0], stays: board.stories[i].truth === 2 });
  // Chapter 5, the trap: Vince pitches the same "Done deal", word for word, on a story that isn't signing.
  if (ch === 5) { const k = board.stories.filter((x) => x.truth !== 0); if (k.length) tips.push({ i: k[h32(seed + '|pitch') % k.length].i, kind: 'pitch', from: 'vince', o: 0 }); }
  const free = c4.free || 0, mt = marketTipsOf(s, ch), used = dm + bought.length;
  const freeLeft = free + mt;
  return {
    seed, rules, R, cast, n, ch, label: 'story:' + ch + ':' + n,
    extras: { dm, tips: bought, priceDm: freeLeft ? 0 : PRICES.extraDm, priceTip: freeLeft ? 0 : PRICES.tipoff, left: Math.max(0, PRICES.extrasPerWindow - used), free: free, marketTips: mt, locked: !!lw },
    boss: bossView(s, ch, c4, live), tips, tagged, planted, live, resume: !!lw,
    onDone: onStoryDone,
  };
}

// ---------------------------------------------------------------- buying extras (coins or a free one, before the window)
export type ExtraKind = 'dm' | 'tip';
/** Buys one extra for the next window. Free extras (and Market Tips from Chapter 3) go first. Returns false when not
 *  allowed (two already, the window has started, a tip-off on a story already asked) or short of coins. */
export function buyExtra(kind: ExtraKind, story = -1): boolean {
  const s = getSave(), w = nextCareerWindow(s);
  if (w.extras.locked || w.extras.left <= 0) return false;
  if (kind === 'tip' && (story < 0 || story >= w.R.STORIES || w.extras.tips.includes(story))) return false;
  if (kind === 'dm' && w.extras.dm >= 2) return false;
  let ok = false;
  update((x) => {
    const c4 = draft4(x);
    const nx = (c4.next = c4.next && c4.next.w === w.n ? c4.next : { w: w.n, dm: 0, tips: [], paid: 0, free: 0 });
    const price = kind === 'dm' ? PRICES.extraDm : PRICES.tipoff;
    if ((c4.free || 0) > 0) { c4.free = (c4.free || 0) - 1; nx.free++; }
    else if (marketTipsOf(x, c4.ch) > 0) { x.v4 = x.v4 || {}; x.v4.tips = (x.v4.tips || 0) - 1; nx.free++; }
    else if (debit(x, price, 'story:' + kind)) nx.paid += price;
    else return;
    if (kind === 'dm') nx.dm++; else nx.tips.push(story);
    ok = true;
  });
  return ok;
}

// ---------------------------------------------------------------- after a window: the story side of the settle
export interface StorySettle {
  res: 'w' | 'l' | 'd'; you: number; boss: number; scoopOff: boolean;
  /** A chapter cleared by this window (the new chapter number), or the epilogue (6). */
  promoted: number | null;
}
/** Scores the head-to-head, moves the byline (once per seed), writes the thread, clears chapters. Idempotent per seed.
 *  Returns null when this seed was already settled. Call outside any update(). */
export function settleStory(r: Outcome4, seed: string, spec?: RuleSpec4): StorySettle | null {
  let out: StorySettle | null = null;
  const toasts: [string, string][] = [];
  update((x) => {
    const c4 = draft4(x);
    if ((c4.done || []).includes(seed)) return;
    c4.done = [seed, ...(c4.done || [])].slice(0, 24);
    const opts = spec?.opts || lastWindow('career', x)?.rules.opts || {};
    const ch = Math.min(5, c4.ch), d = chapterDef(ch), epi = c4.ch >= EPILOGUE_CH;
    const live = !!opts.live && !epi;
    // One career: the byline (followers, Rep, the contacts' book, rival ledgers) moves exactly as in every mode.
    recordInto(x, { mode: 'career', key: careerWindowKey(seed), per: r.per, cast: r.cast, tier: r.tier, total: r.total }, toasts);
    const c = x.career;
    c4.windows++; c4.inCh++;
    if (c) {
      c.windows++; c.calls += r.called; c.right += r.right; c.exclusives += r.scoops;
      if (r.tier === 'T1') c.t1++;
      c.history = [{ n: c.windows, total: r.total, tier: r.tier, repAfter: Math.round(bylineOf(x).rep), at: Date.now() }, ...c.history].slice(0, 12);
      c.live = null;
    }
    // The head-to-head: your stories right plus your Scoops, against the boss's right posts.
    const bid = E4.BOSSES[d.boss].id;
    const you = r.right + r.scoops;
    const boss = r.per.filter((p) => p.rivals.some((f) => f.id === bid && f.right)).length;
    const res: StorySettle['res'] = you > boss ? 'w' : you < boss ? 'l' : 'd';
    c4.h2h[res]++;
    const vs = (c4.vs = c4.vs || {}); const rec = (vs[d.boss] = vs[d.boss] || wld0()); rec[res]++;
    const off = r.per.find((p) => p.scoop && p.rivals.some((f) => f.id === bid && f.right)), scoopOff = !!off;
    const offP = off ? r.cast[off.i]?.player.s || '' : '';
    const t0 = Date.now();
    let k = 0; const at = () => t0 + k++;
    say(x, 'sys', 'st4.card.result', { n: c4.windows, tier: r.tier, total: r.total, you, boss, res, b: d.boss, row: r.row }, at());
    // The boss has something to say (lib/banter.ts pools bn3.boss.<boss>.<win|loss|scoop>), and DMs you after a Scoop.
    const mood = scoopOff ? 'scoop' : res === 'w' ? 'loss' : 'win';   // the boss's mood: they lost, or they won
    say(x, BOSS_PERSON[d.boss], 'st4.banter', { pool: 'boss.' + d.boss + '.' + mood, seed, salt: String(c4.windows), p: offP }, at());
    if (scoopOff) say(x, BOSS_PERSON[d.boss], 'st4.banter', { pool: 'boss.' + d.boss + '.dm', seed, salt: 'dm' + c4.windows, p: offP }, at());
    // Vince's play, told after: who was fed the line, and whether you bit.
    const pl = opts.planted;
    if (pl && r.per[pl.i]) {
      const p = r.per[pl.i], asked = p.reads.some((q) => q.src === pl.src);
      const how = p.call && !p.right && asked ? 'bit' : p.call && p.right ? 'dodged' : 'quiet';
      say(x, 'priya', 'st4.vince.' + how, { p: r.cast[pl.i]?.player.s || '', src: pl.src }, at());
      if (once(c4, 'vince')) say(x, 'priya', 'st4.vince.first', undefined, at());
    }
    // Chapter 5: a Tier One window counts toward the finale.
    if (ch === 5 && !epi && !live && r.tier === 'T1' && c4.t1 < FINALE_T1) {
      c4.t1++;
      say(x, 'mags', c4.t1 >= FINALE_T1 ? 'st4.finale.ready' : 'st4.finale.count', { n: c4.t1, of: FINALE_T1 }, at());
    }
    if (live) c4.tries = (c4.tries || 0) + 1;
    if (epi) c4.inCh = 0;
    // The reveal: halfway through the chapter's windows (Chapter 5: the night the call log goes public, at the finale).
    if (ch < 5 && c4.inCh >= Math.ceil(d.windows / 2) && once(c4, 'reveal' + ch)) say(x, REVEAL_BY[ch], 'st4.reveal.' + ch, undefined, at());
    // The gate.
    let promoted: number | null = null;
    const rep = bylineOf(x).rep;
    if (ch < 5 && c4.inCh >= d.windows && rep >= d.rep && c4.h2h.w >= d.wins) {
      say(x, 'sys', 'st4.card.unlock', { n: ch }, at());
      promoted = ch + 1; openChapter(x, c4, ch + 1);
    } else if (ch === 5 && live && res === 'w') {
      say(x, 'mags', 'st4.reveal.5', undefined, at());
      say(x, 'sys', 'st4.card.unlock', { n: 5 }, at());
      c4.ch = EPILOGUE_CH; mirror(x, c4); promoted = EPILOGUE_CH;
      if (x.byline) x.byline.rank = Math.max(x.byline.rank || 0, 4);   // the title is yours for good
      once(c4, 'finale');
    } else if (ch === 5 && live) say(x, 'mags', 'st4.finale.again', undefined, at());
    else if (ch < 5) {
      // Not yet: one line from the guide on what's missing, only when the windows are done.
      if (c4.inCh >= d.windows && (c4.inCh - d.windows) % 4 === 0) say(x, d.guide[0], rep < d.rep ? 'st4.gate.rep' : 'st4.gate.boss', { rep: d.rep, rank: d.repRank, b: d.boss }, at());
    }
    c4.next = null;
    mirror(x, c4);
    earnHook(x);
    out = { res, you, boss, scoopOff, promoted };
  });
  if (toasts.length) setTimeout(() => { for (const [a, b] of toasts) toast('ach', a, b); }, 0);
  return out;
}
const BOSS_PERSON: Record<Boss4, Person> = { bants: 'bants', kev: 'kev', pete: 'pete', roar: 'carl', vince: 'vince' };
export const bossPerson = (b: Boss4) => BOSS_PERSON[b];

/** The settle a Story window passes to makeDriver({ onDone }): the story first, then lib/meta.ts onCareerDone. */
export function onStoryDone(r: Outcome4, d: Pick<Driver4, 'seed'>): Gain {
  const last = lastWindow('career');
  settleStory(r, d.seed, last && last.seed === d.seed ? last.rules : undefined);
  return onCareerDone(r);
}
/** A window that ended without onStoryDone (say through plain onDriverDone) still reaches the story: the Story screen
 *  calls this on open. Settles save.v4.last.career once. */
export function catchUpStory(): StorySettle | null {
  const s = getSave(), last = lastWindow('career', s), c4 = story4Of(s);
  if (!last || !c4 || (c4.done || []).includes(last.seed) || !s.story?.prologue) return null;
  const R = E4.rulesOf(last.rules), board = E4.buildBoard(last.seed, R), g = E4.replay(board, last.log, R);
  if (!g || !E4.isOver(g)) return null;
  const r0 = E4.resolve(g);
  const r: Outcome4 = { ...r0, row: E4.gridRow(r0), cast: castForSpec(last.seed, last.rules, R) };
  return settleStory(r, last.seed, last.rules);
}

// ---------------------------------------------------------------- the pinned goal
export interface Goal4 {
  ch: number; def: ChapterDef;
  windows: { have: number; need: number };
  rep: { from: number; have: number; need: number };
  boss: { have: number; need: number };
  /** Chapter 5: Tier One windows toward the finale, and whether the next window is the finale. */
  t1?: { have: number; need: number }; finale: boolean;
  epilogue: boolean;
}
export function goalOf(s: Save): Goal4 | null {
  const c4 = story4Of(s); if (!c4) return null;
  const ch = Math.min(5, c4.ch), def = chapterDef(ch), rep = Math.round(bylineOf(s).rep);
  return {
    ch, def, windows: { have: c4.inCh, need: def.windows }, rep: { from: c4.rep0 ?? rep, have: rep, need: def.rep }, boss: { have: c4.h2h.w, need: def.wins },
    ...(ch === 5 ? { t1: { have: c4.t1, need: FINALE_T1 } } : {}), finale: ch === 5 && c4.t1 >= FINALE_T1, epilogue: c4.ch >= EPILOGUE_CH,
  };
}

// ---------------------------------------------------------------- readers for other screens (Me, Home)
export interface Chapter { i: number; id: ChapterId; n: number; progress: number; goal: { windows: number; rep: number; t1?: number; haveW: number; haveRep: number; haveT1?: number } | null; done: boolean }
/** The chapter a save is in (Me, Home's widget). */
export function chapterOf(s: Save): Chapter | null {
  const g = goalOf(s); if (!g) return null;
  if (g.epilogue) return { i: EPILOGUE, id: 'front', n: 5, progress: 1, goal: null, done: true };
  const p = g.t1 ? g.t1.have / g.t1.need : (Math.min(1, g.windows.have / Math.max(1, g.windows.need)) + Math.min(1, g.boss.have / Math.max(1, g.boss.need)) + Math.min(1, g.rep.have / g.rep.need)) / 3;
  return { i: g.ch - 1, id: g.def.id, n: g.ch, progress: p, goal: { windows: g.windows.need, rep: g.rep.need, haveW: g.windows.have, haveRep: g.rep.have, ...(g.t1 ? { t1: g.t1.need, haveT1: g.t1.have } : {}) }, done: false };
}
/** The i18n key of a chapter's full name. Old ids are mapped. */
export const chapterName = (id: string) => 'g.story.ch.' + chapterId(id) + '.name';

// ---------------------------------------------------------------- 3.x Career beats (screens/Window.tsx, Results.tsx)
// The v3 Career window still settles through lib/career.ts applyWindow until the play lane moves to Driver4; these
// keep its inbox lines. The film hooks are gone (CONCEPT4 §6): beatScene() never returns a film.
export type BeatFrom = 'editor' | 'hana' | 'tabloid' | 'itk' | 'insider' | 'agent' | 'spotter' | 'kitman' | 'barber' | 'physio' | 'unknown';
export interface Beat { from: BeatFrom; key: string; v?: Record<string, string | number> }
const RIVAL_IDS = ['tabloid', 'itk', 'insider'];
export const BEAT_FOLLOWERS = [1000, 5000, 10000, 38200, 50000, 100000, 250000];
const BEAT_SENDER: Record<string, BeatFrom> = { promo1: 'hana', promo2: 'hana', promo3: 'tabloid', promo4: 'editor', reveal1: 'agent', reveal2: 'hana', reveal3: 'spotter', reveal4: 'itk', vinceBurned: 'tabloid' };
export const beatFrom = (b: { from: string; key: string }): string => BEAT_SENDER[b.key] || b.from;
export function beatOnce(b: Beat): string {
  if (b.key === 'firstRight' || b.key === 'firstExcl' || b.key === 'finale' || b.key === 'vinceFirst') return b.key;
  if (/^(promo|reveal)\d$/.test(b.key)) return b.key;
  if (b.key === 'followers' || b.key === 'followersBack') return 'followers.' + (b.v?.m ?? '');
  return '';
}
export const beatKey = (b: { key: string }) => (b.key.startsWith('st4.') ? b.key : 'g.story.beat.' + b.key);
export interface BeatOpts { seen?: Record<string, number>; vince?: { i: number; src: string; who: string } | null }
/** The 0–2 lines for a finished 3.x Career window. */
export function storyBeats(c: CareerSave, res: Result, rep: CareerReport, o: BeatOpts = {}): Beat[] {
  const out: Beat[] = [];
  const name = (i: number) => res.cast?.[i]?.player.n || '';
  const called = res.per.filter((p) => p.call), right = called.filter((p) => p.right), excl = right.filter((p) => p.excl);
  if (rep.promoted != null) out.push({ from: BEAT_SENDER['promo' + rep.promoted] || 'editor', key: 'promo' + rep.promoted, v: { rank: rep.promoted } });
  if (o.vince) {
    const p = res.per.find((x) => x.i === o.vince!.i), v = { p: name(o.vince.i), s: o.vince.who };
    if (p && p.call && !p.right) out.push({ from: 'tabloid', key: 'vinceBurned', v });
    else if (p && p.call && p.right) out.push({ from: 'editor', key: o.seen?.vinceFirst ? 'vinceDodged' : 'vinceFirst', v });
    else out.push({ from: 'editor', key: 'vinceQuiet', v });
  }
  const miss = called.find((p) => !p.right && p.call!.s === 2);
  if (miss) out.push(name(miss.i) ? { from: 'tabloid', key: 'bigMiss', v: { p: name(miss.i) } } : { from: 'tabloid', key: 'bigMiss0' });
  const beat = res.per.find((p) => p.why === 'beaten' && p.firstRight && RIVAL_IDS.includes(p.firstRight.id));
  if (beat) out.push({ from: beat.firstRight!.id as BeatFrom, key: 'beaten_' + beat.firstRight!.id, v: { p: name(beat.i), d: beat.firstRight!.day } });
  if (excl.length && c.exclusives === excl.length) out.push({ from: 'editor', key: 'firstExcl', v: { p: name(excl[0].i) } });
  else if (right.length && c.right === right.length) out.push({ from: 'editor', key: 'firstRight' });
  const before = rep.followersAfter - rep.followers;
  const m = [...BEAT_FOLLOWERS].reverse().find((x) => before < x && rep.followersAfter >= x);
  if (m) out.push({ from: 'editor', key: m === 38200 ? 'followersBack' : 'followers', v: { m, n: rep.followersAfter } });
  if (!out.length) out.push({ from: 'editor', key: !called.length ? 'quiet' : res.tier === 'T1' || res.tier === 'T2' ? 'solid' : 'meh' });
  return out.slice(0, 2);
}
export function pushBeats(s: Save, beats: Beat[]): Beat[] {
  const st = (s.story = s.story || {}), seen = (st.beats = st.beats || {}), inbox = st.inbox || [], added: Beat[] = [], at = Date.now();
  for (const b of beats) {
    const id = beatOnce(b);
    if (id && seen[id]) continue;
    if (id) seen[id] = at;
    inbox.push({ at, from: b.from, key: b.key, ...(b.v ? { v: b.v } : {}) });
    added.push(b);
  }
  st.inbox = inbox.slice(-THREAD_CAP);
  return added;
}
/** Films were cut (CONCEPT4 §6): no beat plays one. Kept so 3.x callers compile until they move. */
export const beatScene = (_b: Beat): string | null => null;

// ---------------------------------------------------------------- the contacts by name
export const STORY_SOURCES = ['kitman', 'barber', 'agent', 'spotter', 'physio'] as const;
/** "Sal · The barber". `t` is any translate function. */
export const srcNamed = (t: (k: string) => string, k: string) => (STORY_SOURCES as readonly string[]).includes(k) ? t('g.story.who.' + k) + ' · ' + t('src.' + k) : t('src.' + k);
/** Window tiers in Story's words: the grade only (Tier One … Spiked). */
export const tierKey = (t: Tier) => 'tier.' + t;

// ---------------------------------------------------------------- the boss registry (lib/rivals.ts setBoss)
// Blurt shows the boss strip at the top of a Career window and the head-to-head on the results thread from this.
// The boss is the one the window was built against (save.v4.live / last .rules.opts.boss), else the chapter's.
setBoss({
  boss: () => {
    const s = getSave(), c4 = story4Of(s); if (!c4) return null;
    const v = bossView(s, Math.min(5, c4.ch), c4);
    return { id: E4.BOSSES[v.id].id, handle: t('rival.' + v.handle), acc: Math.round(v.acc * 10), you: v.chapter.w, them: v.chapter.l };
  },
  result: (out) => {
    const s = getSave(), spec = (liveWindow('career', s) || lastWindow('career', s))?.rules;
    const c4 = story4Of(s);
    const b = (spec?.opts?.boss as Boss4 | undefined) || chapterDef(Math.min(5, c4?.ch || 1)).boss;
    const bid = E4.BOSSES[b].id;
    const per = out.per as unknown as { right: boolean; scoop: boolean; rivals?: { id: string; right: boolean }[] }[];
    const you = per.filter((p) => p.right).length + per.filter((p) => p.scoop).length;
    const them = per.filter((p) => (p.rivals || []).some((f) => f.id === bid && f.right)).length;
    return { won: you > them, you, them };
  },
});
