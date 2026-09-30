// The local save: one JSON document under `tierone_v3`, versioned from day one with a real migration chain.
// Ranked results live on the server; this holds settings, history, Career, Practice, the wallet and achievements.
//
// One career (3.4, GOTY.md §7.2): the player's numbers live once, at the top of the save, whatever mode moved them:
//   byline  followers, reputation (0–100), the hot hand        lib/byline.ts §1.1
//   book    the five contacts' XP and level                      lib/byline.ts §1.2
//   rivals  the head-to-head ledgers                             lib/byline.ts §1.3
//   pp      lifetime Press Points; the season Pass is the one visible level (lib/progress.ts levelOf)
// A Career slot keeps only what is its own story: rank/chapter, windows, favours, club relations, counters, history.
import { useRef, useSyncExternalStore } from 'react';
import type { Pub, Tier, Act } from './engine';
import type { MissionState } from './progress';
import type { SeasonSave, SeasonRecap, WeekEvState, CosKind } from './season';
import type { Byline, BookEntry, RivalRec, FeedItem } from './byline';
import type { SocialSave } from './social';

export const SAVE_KEY = 'tierone_v3';
export const SAVE_V = 3;

export interface DailyRecord { no: number; total: number; tier: Tier; row: string; ex: number; rank?: number | null; players?: number; par?: number | null }
export interface LocalWindow { seed: string; mode: 'practice' | 'career'; log: Act[]; started: number; coach?: boolean; label?: string; favours?: { kind: string; i: number; day: number; info?: number }[]; ddAt?: number }
export interface CareerSave {
  slot: number; paper: string; rank: number; windows: number; favours: { burner: number; tipoff: number; stakeout: number };
  relations: Record<string, { v: number; last: number }>; t1: number; exclusives: number; right: number; calls: number; uturns: number;
  history: { n: number; total: number; tier: Tier; repAfter: number; at: number }[]; live: LocalWindow | null; restarts: number;
  t1Top?: number; // Tier 1 windows played at the top rank (Story finale)
  renames?: number; // blog renames so far (the first is free)
}
export interface CareerSlot { career: CareerSave; story?: Save['story'] }
export interface Save {
  v: number; dev: string; nick: string; lang: 'en' | 'ar' | 'es'; edition: '' | 'morning' | 'late'; sound: boolean; reduced: boolean; onboarded: boolean;
  daily: Record<string, DailyRecord>;
  streak: { n: number; best: number; last: string; grace: number };
  credits: number; ledger: { at: number; d: number; why: string }[]; owned: string[]; theme: string; pp: number;
  ach: Record<string, number>; stats: Record<string, number>;
  practice: { coach: boolean; live: LocalWindow | null; played: number; day: string; today: number };
  career: CareerSave | null;
  rooms: { code: string; name: string; pid: string; sec: string; nick: string }[];
  milestones: Record<string, number>;
  wireSeen: string[];
  last?: { pub: Pub; at: number };
  // 3.1 game layer (all optional: older saves load unchanged)
  missions?: MissionState;
  story?: { prologue?: boolean; chapterSeen?: number; beats?: Record<string, number>; inbox?: { at: number; from: string; key: string; v?: Record<string, string | number>; read?: boolean }[] };
  tut?: { done?: boolean; seen?: Record<string, boolean> };
  scenes?: Record<string, number>;
  // v2: career save slots. `career`/`story` are the live copy of slots[slot]; the others sit here.
  slots?: (CareerSlot | null)[];
  slot?: number;
  // 3.3 seasons and the store (lib/season.ts, lib/monet.ts); all optional. Cosmetics live in `owned`, desk themes in `theme`.
  season?: SeasonSave; seasonLog?: SeasonRecap[]; equip?: Partial<Record<Exclude<CosKind, 'theme'>, string>>; weekEv?: WeekEvState; adDay?: string;
  // 3.3 One Byline (lib/byline.ts): global followers/rep/hot hand, the Contacts Book, rival ledgers, the Feed.
  // v3: these are the only copies. Career slots no longer carry followers, rep or contact trust.
  byline?: Byline; book?: Record<string, BookEntry>; rivals?: Record<string, RivalRec>; feed?: FeedItem[];
  // 3.4 the press box (lib/social.ts): challenges, the newsroom, friend-rival bookkeeping, the last local window.
  social?: SocialSave;
}

const rid = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; let s = ''; const b = new Uint8Array(16); crypto.getRandomValues(b); for (const x of b) s += a[x % a.length]; return s; };
export function fresh(): Save {
  return {
    v: SAVE_V, dev: rid(), nick: '', lang: guessLang(), edition: '', sound: true, reduced: false, onboarded: false,
    daily: {}, streak: { n: 0, best: 0, last: '', grace: 0 }, credits: 0, ledger: [], owned: [], theme: 'standard', pp: 0,
    ach: {}, stats: {}, practice: { coach: true, live: null, played: 0, day: '', today: 0 }, career: null, rooms: [], milestones: {}, wireSeen: [],
    slots: [null, null, null], slot: 0,
  };
}
function guessLang(): Save['lang'] {
  try { const l = (navigator.language || 'en').slice(0, 2); return l === 'ar' ? 'ar' : l === 'es' ? 'es' : 'en'; } catch { return 'en'; }
}

// ---------------------------------------------------------------- v2 → v3: one career (the numbers a 3.3 slot carried)
// Frozen copies of the 3.3 ladders, so this migration never drifts when lib/byline.ts or lib/career.ts change.
const V2_TRUST = [0, 6, 15, 28, 45, 70]; // Career trust points → trust level 0–5
const V3_BOOK = [0, 60, 160, 320, 560, 560]; // Contacts Book XP → level 1–5
/** 3.3 Career trust points as Contacts Book XP: level L becomes book level L+1 (a new contact starts at level 1),
 *  keeping the progress inside the band. 70+ points (trust 5) is the gold card. */
export function trustToXp(t: number): number {
  const pts = Math.max(0, Number(t) || 0);
  const L = V2_TRUST.filter((x) => pts >= x).length - 1;
  if (L >= 4) return V3_BOOK[4];
  const f = (pts - V2_TRUST[L]) / (V2_TRUST[L + 1] - V2_TRUST[L]);
  return Math.round(V3_BOOK[L] + f * (V3_BOOK[L + 1] - V3_BOOK[L]));
}
const bookLv = (xp: number) => V3_BOOK.slice(0, 5).filter((x) => xp >= x).length;
type LegacyCareer = CareerSave & { rep?: number; followers?: number; contacts?: Record<string, { trust: number }> };
/** Folds the numbers a 3.3 Career carried into the one byline (max, once) and strips them from the career. Used by the
 *  v2→v3 migration and by slot restores, whose transfer codes may come from a 3.3 device. Mutates both. */
export function absorbLegacyCareer(s: Save, c: LegacyCareer | null | undefined) {
  if (!c || typeof c !== 'object') return;
  const b = (s.byline = s.byline || { followers: 0, rep: 50, hot: 0, best: 0 });
  if (typeof c.followers === 'number') b.followers = Math.max(b.followers || 0, Math.round(c.followers));
  if (typeof c.rep === 'number') b.rep = Math.max(0, Math.min(100, Math.max(b.rep ?? 50, Math.round(c.rep))));
  if (c.contacts && typeof c.contacts === 'object') {
    const book = (s.book = s.book || {});
    for (const [src, e] of Object.entries(c.contacts)) {
      const xp = trustToXp(e && typeof e.trust === 'number' ? e.trust : 0);
      const cur = book[src] || { xp: 0, lv: 1 };
      if (xp > cur.xp) book[src] = { ...cur, xp, lv: bookLv(xp) };
    }
  }
  delete c.followers; delete c.rep; delete c.contacts;
}

// Migrations: MIG[n] turns a version-n save into version n+1. Add one per format change; never edit an old one.
const MIG: Record<number, (s: any) => any> = {
  0: (s) => ({ ...fresh(), ...s, v: 1 }),
  // v1 -> v2: the single career becomes slot 1 of 3.
  1: (s) => ({ ...s, v: 2, slot: 0, slots: [s.career ? { career: s.career, story: s.story } : null, null, null] }),
  // v2 -> v3: one career. Every slot's followers, reputation and contact trust fold into the global byline and the
  // Contacts Book (the higher number wins, once); the slots keep only their story. Rank, windows, favours, relations,
  // history and the inbox are untouched, so a save maps straight into the same chapter.
  2: (s) => {
    const out = { ...s, v: 3 };
    absorbLegacyCareer(out, out.career);
    if (Array.isArray(out.slots)) for (const sl of out.slots) if (sl && sl.career) absorbLegacyCareer(out, sl.career);
    return out;
  },
};
export function migrate(raw: any): Save {
  let s = raw && typeof raw === 'object' ? raw : fresh();
  if (typeof s.v !== 'number') s.v = 0;
  while (s.v < SAVE_V) { const f = MIG[s.v]; if (!f) break; s = f(s); }
  return { ...fresh(), ...s };
}

// The v2 game (tierone_v1) is read once on first run: device id, nickname and language carry over.
function fromV2(s: Save): Save {
  try {
    const v2 = JSON.parse(localStorage.getItem('tierone_v1') || 'null');
    if (!v2) return s;
    const dev = v2.online && typeof v2.online.dev === 'string' && /^[A-Za-z0-9]{8,24}$/.test(v2.online.dev) ? v2.online.dev : s.dev;
    const nick = (v2.online && (v2.online.nick || v2.online.nickname)) || v2.nick || '';
    const lang = ['en', 'ar', 'es'].includes(v2.lang) ? v2.lang : s.lang;
    return { ...s, dev, nick: String(nick).slice(0, 16), lang };
  } catch { return s; }
}

let migratedOnLoad = false;
let state: Save = load();
const subs = new Set<() => void>();
function load(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { const j = JSON.parse(raw); migratedOnLoad = !j || typeof j.v !== 'number' || j.v < SAVE_V; return migrate(j); }
    return fromV2(fresh());
  } catch { return fresh(); }
}
// Writes are batched and land when the main thread is idle (never inside a frame during a reveal or a film): a burst
// of update() calls costs one stringify. The pagehide/hidden flush keeps the last state safe on the way out.
let timer = 0, idleId = 0, dirty = false;
type IdleWindow = Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
function flush() {
  clearTimeout(timer); timer = 0;
  const w = window as IdleWindow;
  if (idleId && w.cancelIdleCallback) w.cancelIdleCallback(idleId);
  idleId = 0;
  if (!dirty) return;
  dirty = false;
  try {
    const cur = localStorage.getItem(SAVE_KEY);
    if (cur) localStorage.setItem(SAVE_KEY + '_bak', cur);
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch { /* storage full or blocked: the session still plays */ }
}
function persist() {
  dirty = true;
  if (timer) return;
  timer = window.setTimeout(() => {
    timer = 0;
    const w = window as IdleWindow;
    if (w.requestIdleCallback) { if (!idleId) idleId = w.requestIdleCallback(flush, { timeout: 1500 }); } else flush();
  }, 120);
}
export const getSave = () => state;
if (migratedOnLoad) persist(); // a silent migration is written back at once, not on the first move
// The draft an update() mutator is working on, for helpers that are handed one part of it (lib/career.ts applyWindow
// gets `s.career` and still has to move the byline that lives beside it). Null outside a mutator.
let active: Save | null = null;
export const activeDraft = () => active;
export function update(fn: (s: Save) => Save | void) {
  const draft = structuredClone(state);
  const prev = active; active = draft;
  let next: Save;
  try { next = fn(draft) || draft; } finally { active = prev; }
  state = next; persist(); subs.forEach((f) => f());
}
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function useSave(): Save { return useSyncExternalStore(subscribe, () => state); }
/**
 * Subscribe to a slice: the component re-renders only when `sel(save)` changes (Object.is, or `eq`). For a slice that
 * is an object or array, pass `shallowEq`. Same store, same timing as useSave(); only the re-render count differs.
 *   const lang = useSaveSel((s) => s.lang);
 *   const [nick, credits] = useSaveSel((s) => [s.nick, s.credits] as const, shallowEq);
 */
export function useSaveSel<T>(sel: (s: Save) => T, eq: (a: T, b: T) => boolean = Object.is): T {
  const ref = useRef<{ st: Save; v: T } | null>(null);
  const get = () => {
    const c = ref.current;
    if (c && c.st === state) return c.v;
    const v = sel(state);
    const keep = c && eq(c.v, v) ? c.v : v;
    ref.current = { st: state, v: keep };
    return keep;
  };
  return useSyncExternalStore(subscribe, get);
}
export function shallowEq(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
}
