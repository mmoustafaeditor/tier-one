// Rivals (banter lane): the house roster, the Creator Rivals roster from remote config, and the voice-pack helpers
// every surface uses to make a rival talk. Nothing here changes the engine: the three posting rivals (tabloid, itk,
// insider) still come from the rules, their ledgers still live in lib/byline.ts. This file only answers "who is this
// account, what does it sound like, and which line does it say now".
//
// Voice packs are i18n (parts/rivals.ts, en/ar/es):
//   cn.taunt.<id>.<winning|losing|level>[]   feed taunts/concessions after a window ({rec} record, {p} player, {name} you)
//   rv.<id>.cp.right[] / rv.<id>.cp.wrong[]   reactions to your catchphrase call landing or not ({p}, {phrase})
//   rv.<id>.uturn[]                            reactions to a Delete & repost ({p})
//   rv.<id>.dd[]                               Deadline Day lines (the in-window day 7)
//   rv.<id>.ddlive.<open|close|lead|trail>[]   Deadline Day Live lines (the calendar event)
// A creator rival points at a house voice pack (`voice`), so a creator never needs their own copy to go live.
//
// INTEGRATION (one line each):
//   • byline.ts / social.ts   pick a taunt with tauntIndex() so pools longer than 8 are reachable (done on this branch).
//   • Window.tsx overnight    rivalLine(lang, id, 'dd', seed, { p }) beside the generic calls.night.* line.
//   • DDLive.tsx / ui/live.tsx rivalLine(lang, id, 'ddlive.open' | 'ddlive.close' | 'ddlive.lead' | 'ddlive.trail', seed, { p, name }).
//   • PostScene / Results     rivalLine(lang, id, 'cp.right' | 'cp.wrong' | 'uturn', seed, { p }) ({phrase} defaults to yours).
//   • Rivals screen           rivalRoster() lists house + active creator rivals; creator cards carry `creator: true`.
import { trList, tr, fill, type Vars } from './i18n';
import { getConfig, flag } from './flags';
import { getSave } from './save';
import { myCatchphrase } from './banter';

export type RivalKind = 'press' | 'creator';
export interface RivalCard {
  id: string;
  /** i18n key for the handle when house (`rival.<id>`), or the literal handle for a creator. */
  handle: string;
  name: string;
  initials: string;
  avatar?: string;
  kind: RivalKind;
  /** Which voice pack this account speaks with (a house id). */
  voice: Voice;
  /** True for the three engine rivals that post on sagas and keep a ledger. */
  ledger: boolean;
  creator?: CreatorRival;
}
/** One entry of api/tier-one/v4/config/rivals.json, as config.get returns it (consent metadata stays server-side). */
export interface CreatorRival {
  id: string; handle: string; name: string; initials?: string; avatar?: string;
  voice: Voice;
  /** The creator code players type to follow them (and, later, the revenue-share attribution). */
  code?: string; from?: string; until?: string; active?: boolean; lang?: string[];
}

export type Voice = 'tabloid' | 'itk' | 'insider';
const VOICES: Voice[] = ['tabloid', 'itk', 'insider'];
// The house: three fictional accounts. Never a real reporter or account (docs/LEGAL_NAMES.md).
export const HOUSE: RivalCard[] = [
  { id: 'tabloid', handle: 'rival.tabloid', name: 'Back Page Bants', initials: 'BB', kind: 'press', voice: 'tabloid', ledger: true },
  { id: 'itk', handle: 'rival.itk', name: 'ITK Kev', initials: '?', kind: 'press', voice: 'itk', ledger: true },
  { id: 'insider', handle: 'rival.insider', name: 'Press Box Pete', initials: 'PP', kind: 'press', voice: 'insider', ledger: true },
];
export const HOUSE_IDS = HOUSE.map((r) => r.id);
export const houseOf = (id: string) => HOUSE.find((r) => r.id === id) || null;
/** The pack an id speaks with: a house id is its own pack; a creator id resolves through the roster; unknown → tabloid. */
export function voiceOf(id: string): Voice {
  const h = houseOf(id); if (h) return h.voice;
  const c = creatorRivals().find((r) => r.id === id); return c ? c.voice : 'tabloid';
}
/** Display handle for any rival id (house through i18n, creator literal). */
export function rivalHandle(id: string): string {
  const h = houseOf(id); if (h) return tr(getSave().lang, h.handle);
  const c = creatorRivals().find((r) => r.id === id); return c ? c.handle : '@' + id;
}

// ---------------------------------------------------------------- the Creator Rivals program (flag: creatorRivals, off by default)
const dayNow = () => new Date().toISOString().slice(0, 10);
/** Active creator rivals from the last config.get (already filtered by consent server-side; the window is re-checked here). */
export function creatorRivals(lang: string = getSave().lang, day = dayNow()): CreatorRival[] {
  if (!flag('creatorRivals', false)) return [];
  const cfg = getConfig() as (ReturnType<typeof getConfig> & { rivals?: CreatorRival[] }) | null;
  const list = cfg && Array.isArray(cfg.rivals) ? cfg.rivals : [];
  return list.filter((r) => r && r.id && r.handle && r.active !== false && (!r.from || r.from <= day) && (!r.until || r.until >= day) && (!r.lang || !r.lang.length || r.lang.includes(lang)))
    .filter((r) => VOICES.includes(r.voice));
}
/** House rivals first, then every active creator rival. Screens render `creator` cards with the literal handle. */
export function rivalRoster(): RivalCard[] {
  const creators = creatorRivals().map<RivalCard>((c) => ({
    id: 'creator:' + c.id, handle: c.handle, name: c.name, initials: c.initials || c.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
    avatar: c.avatar, kind: 'creator', voice: c.voice, ledger: false, creator: c,
  }));
  return [...HOUSE, ...creators];
}
export const isCreatorRival = (id: string) => id.startsWith('creator:');

// ---------------------------------------------------------------- pools
const hash = (x: string) => { let h = 0x811c9dc5; for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
export const LEGACY_TAUNTS = 8; // the pool size before this lane: the first 8 lines of every state pool are kept as they were
/** How many lines a feed taunt pool has in the current language (never below the legacy 8, so old indices stay valid). */
export function tauntPoolSize(id: string, st: string, lang: string = getSave().lang): number {
  const l = trList(lang, 'cn.taunt.' + voiceOf(id) + '.' + st);
  return Math.max(LEGACY_TAUNTS, Array.isArray(l) ? l.length : 0);
}
/** The index of the next taunt for a rival state: seeded, never the same as the last one. English sizes the pool so
 *  every language walks the same indices (each language keeps its pools the same length; scripts/i18n-check.mjs enforces it). */
export function tauntIndex(seed: string, id: string, st: string, prev = -1): number {
  const n = tauntPoolSize(id, st, 'en');
  let idx = hash(seed) % n; if (idx === prev) idx = (idx + 1) % n;
  return idx;
}
/** Friend pool (so.taunt.<st>) size, same rule. */
export function friendPoolSize(st: string): number { const l = trList('en', 'so.taunt.' + st); return Math.max(LEGACY_TAUNTS, Array.isArray(l) ? l.length : 0); }

export type RivalLineKind = 'cp.right' | 'cp.wrong' | 'uturn' | 'dd' | 'ddlive.open' | 'ddlive.close' | 'ddlive.lead' | 'ddlive.trail';
/** One line from a rival's voice pack, seeded (same seed, same line), with {p} {name} {rec} filled. '' when the pack is missing. */
export function rivalLine(lang: string, id: string, kind: RivalLineKind, seed: string | number, v: Vars = {}): string {
  const l = trList(lang, 'rv.' + voiceOf(id) + '.' + kind) as string[] | undefined;
  if (!Array.isArray(l) || !l.length) return '';
  const vars: Vars = { name: getSave().nick || tr(lang, 'd2.post.you'), phrase: myCatchphrase(lang), ...v };
  return fill(l[hash(id + '|' + kind + '|' + seed) % l.length], vars);
}
/** A feed-style taunt for any state, outside the ledger flow (DD Live tables, creator cards, previews). */
export function tauntLine(lang: string, id: string, st: 'winning' | 'losing' | 'level', seed: string | number, v: Vars = {}): string {
  const l = trList(lang, 'cn.taunt.' + voiceOf(id) + '.' + st) as string[] | undefined;
  if (!Array.isArray(l) || !l.length) return '';
  const vars: Vars = { name: getSave().nick || tr(lang, 'd2.post.you'), rec: '0–0', p: '', ...v };
  return fill(l[hash(id + '|' + st + '|' + seed) % l.length], vars);
}

/** Creator lookup by code (the "beat @creator" board and the follow flow). Case-insensitive; null when off or unknown. */
export function creatorByCode(code: string): CreatorRival | null {
  const k = code.trim().toUpperCase();
  return (k && creatorRivals().find((c) => (c.code || '').toUpperCase() === k)) || null;
}
