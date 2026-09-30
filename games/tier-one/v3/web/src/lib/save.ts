// The local save: one JSON document under `tierone_v3`, versioned from day one with a real migration chain.
// Ranked results live on the server; this holds settings, history, Career, Practice, the wallet and achievements.
import { useSyncExternalStore } from 'react';
import type { Pub, Tier, Act } from './engine';
import type { MissionState } from './progress';
import type { SeasonSave, SeasonRecap, WeekEvState, CosKind } from './season';
import type { Byline, BookEntry, RivalRec, FeedItem } from './byline';
import type { SocialSave } from './social';

export const SAVE_KEY = 'tierone_v3';
export const SAVE_V = 2;

export interface DailyRecord { no: number; total: number; tier: Tier; row: string; ex: number; rank?: number | null; players?: number; par?: number | null }
export interface LocalWindow { seed: string; mode: 'practice' | 'career'; log: Act[]; started: number; coach?: boolean; label?: string; favours?: { kind: string; i: number; day: number; info?: number }[]; ddAt?: number }
export interface Contact { trust: number }
export interface CareerSave {
  slot: number; paper: string; rank: number; windows: number; rep: number; followers: number; favours: { burner: number; tipoff: number; stakeout: number };
  contacts: Record<string, Contact>; relations: Record<string, { v: number; last: number }>; t1: number; exclusives: number; right: number; calls: number; uturns: number;
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
  const l = (navigator.language || 'en').slice(0, 2);
  return l === 'ar' ? 'ar' : l === 'es' ? 'es' : 'en';
}

// Migrations: MIG[n] turns a version-n save into version n+1. Add one per format change; never edit an old one.
const MIG: Record<number, (s: any) => any> = {
  0: (s) => ({ ...fresh(), ...s, v: 1 }),
  // v1 -> v2: the single career becomes slot 1 of 3.
  1: (s) => ({ ...s, v: 2, slot: 0, slots: [s.career ? { career: s.career, story: s.story } : null, null, null] }),
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

let state: Save = load();
const subs = new Set<() => void>();
function load(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return migrate(JSON.parse(raw));
    return fromV2(fresh());
  } catch { return fresh(); }
}
let timer = 0;
function persist() {
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    try {
      const cur = localStorage.getItem(SAVE_KEY);
      if (cur) localStorage.setItem(SAVE_KEY + '_bak', cur);
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch { /* storage full or blocked: the session still plays */ }
  }, 120);
}
export const getSave = () => state;
export function update(fn: (s: Save) => Save | void) {
  const draft = structuredClone(state);
  const next = fn(draft) || draft;
  state = next; persist(); subs.forEach((f) => f());
}
export function useSave(): Save { return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state); }
if (typeof window !== 'undefined') window.addEventListener('pagehide', () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* */ } });
