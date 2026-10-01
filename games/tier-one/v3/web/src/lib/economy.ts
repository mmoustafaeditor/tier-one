// Tier One 4 economy: the single source of every progression and economy number (RULES4.md §3, CONCEPT4.md §4–5).
// Four things grow and each has one job: XP (how much you've played → Level forever + the Season track), Rep 0–100
// (how good you are → Rank), Followers (how famous you are) and Coins (what you spend). Credits are the paid currency.
// Pure: no DOM, no i18n, no storage. Every other lib (meta, byline, season, deals, catalog, wallet) reads from here;
// prices that the server must agree on (credit packs, Gold, coin packs, the starter bundle, credit earns) are read
// from api/tier-one/v4/config/catalog.json by lib/catalog.ts and lib/wallet.ts, so they can't drift.
import type { Save } from './save';

// ---------------------------------------------------------------- XP (RULES4 §3 "XP")
export const XP = {
  daily: 60, dailyTier: { T1: 40, T2: 25, T3: 10, T4: 0, SPIKED: 0 } as Record<string, number>,
  career: 40, practice: 20, practiceFreePerDay: 3, deadline: 40,
  wire: 10, wireRight: 15, room: 30, achievement: 50, mission: 25,
} as const;
export type Mode4 = 'daily' | 'career' | 'practice' | 'deadline' | 'wire' | 'room';
/** XP for one finished window of a mode (Wire and Practice extras are added by their hooks). */
export function xpForWindow(mode: Mode4, tier?: string): number {
  if (mode === 'daily') return XP.daily + (tier ? XP.dailyTier[tier] || 0 : 0);
  if (mode === 'career') return XP.career;
  if (mode === 'practice') return XP.practice;
  if (mode === 'deadline') return XP.deadline;
  if (mode === 'room') return XP.room;
  return XP.wire;
}

// ---------------------------------------------------------------- Level (never ends)
export const LEVEL = { base: 100, step: 30, coinsPerLevel: 10, coinsCap: 200 } as const;
/** XP needed to go from level L to L+1: 100 + 30 × (L − 1). */
export const xpForLevel = (L: number) => LEVEL.base + LEVEL.step * (Math.max(1, L) - 1);
/** Coins a level-up pays: 10 × level, capped at 200. */
export const levelCoins = (L: number) => Math.min(LEVEL.coinsCap, LEVEL.coinsPerLevel * Math.max(1, L));
export interface LevelView { n: number; into: number; need: number; pct: number; total: number; max: false }
/** The level lifetime XP stands at, and how far into it. Level 2 in the first session, 5 on day 2–3, 10 in about a week. */
export function levelOf(xp: number): LevelView {
  let L = 1, left = Math.max(0, Math.floor(xp || 0));
  while (left >= xpForLevel(L)) { left -= xpForLevel(L); L++; }
  const need = xpForLevel(L);
  return { n: L, into: left, need, pct: Math.round((100 * left) / need), total: Math.max(0, Math.floor(xp || 0)), max: false };
}
/** Lifetime XP at which level L begins. */
export function xpAtLevel(L: number): number { let x = 0; for (let k = 1; k < L; k++) x += xpForLevel(k); return x; }
/** The apps a level opens (CONCEPT4 §5): shown as "Reach Level 5" with the bar, never as a lock alone. */
export const levelUnlocks = { live: 3, groups: 4, wire: 5 } as const;
export type Unlock = keyof typeof levelUnlocks;
export const UNLOCKS: Unlock[] = ['live', 'groups', 'wire'];
export const unlockedAt = (level: number): Unlock[] => UNLOCKS.filter((k) => level >= levelUnlocks[k]);
export const isUnlocked = (k: Unlock, level: number) => level >= levelUnlocks[k];
/** Unlocks crossed between two levels (for the results thread's "Live is open" line). */
export const newUnlocks = (from: number, to: number): Unlock[] => UNLOCKS.filter((k) => from < levelUnlocks[k] && to >= levelUnlocks[k]);

// ---------------------------------------------------------------- Season track
export const SEASON = { tiers: 30, xpPerTier: 400, goldCredits: 350, goldCoinBonus: 0.10, freeLookEvery: 5, goldLookEvery: 3, freeCoins: 20, goldCoins: 15 } as const;
export interface TierView { n: number; into: number; need: number; pct: number; max: boolean }
export function seasonTierOf(xp: number): TierView {
  const n = Math.min(SEASON.tiers, Math.floor(Math.max(0, xp) / SEASON.xpPerTier) + 1);
  const max = n >= SEASON.tiers, into = max ? SEASON.xpPerTier : Math.max(0, xp) - (n - 1) * SEASON.xpPerTier;
  return { n, into, need: SEASON.xpPerTier, pct: Math.round((100 * into) / SEASON.xpPerTier), max };
}

// ---------------------------------------------------------------- Reputation 0–100 and Rank
export const REP = {
  start: 30, min: 0, max: 100,
  right: [1, 2, 3] as const, scoop: 2, wrong: [1, 3, 6] as const,
  modeFactor: { daily: 1, career: 1, deadline: 1, room: 1, wire: 0.5, practice: 0 } as Record<string, number>,
  reviewBelow: 10, // dropping 10 under a rank's bar shows "under review" until you climb back
} as const;
export type RankId = 'nobody' | 'rising' | 'itk' | 'insider' | 'tierone';
export const RANKS: readonly (readonly [RankId, number])[] = [['nobody', 0], ['rising', 40], ['itk', 55], ['insider', 70], ['tierone', 85]] as const;
export const RANK_IDS: RankId[] = RANKS.map(([id]) => id);
export const rankIndex = (id: string) => RANK_IDS.indexOf(id as RankId);
export const rankBar = (id: RankId) => RANKS[rankIndex(id)][1];
/** The rank a reputation reads as right now (no memory). */
export const rankByRep = (rep: number): RankId => [...RANKS].reverse().find(([, m]) => rep >= m)![0];
/** Rep moved by one call (Rep delta, before the mode factor). `s` = backing 0 ×1 · 1 ×2 · 2 Drop. */
export function repDelta(mode: string, s: number, right: boolean, scoop: boolean): number {
  const b = Math.max(0, Math.min(2, s)), f = REP.modeFactor[mode] ?? 1;
  const d = right ? REP.right[b] + (scoop ? REP.scoop : 0) : -REP.wrong[b];
  return Math.round(d * f);
}
export const clampRep = (x: number) => Math.max(REP.min, Math.min(REP.max, Math.round(x)));
/** The rank the player holds: a rank, once reached, stays (it's a title). `kept` is the highest index reached. */
export const rankHeld = (rep: number, kept = 0): RankId => RANK_IDS[Math.max(rankIndex(rankByRep(rep)), Math.max(0, Math.min(RANK_IDS.length - 1, kept)))];
/** "Under review": the held rank's bar is more than REP.reviewBelow above the current rep. */
export const underReview = (rep: number, kept = 0): boolean => rep < rankBar(rankHeld(rep, kept)) - REP.reviewBelow;
/** The next bar above the current rep, or null at Tier One. */
export const nextRank = (rep: number): { id: RankId; at: number } | null => { const n = RANKS.find(([, m]) => m > rep); return n ? { id: n[0], at: n[1] } : null; };

// ---------------------------------------------------------------- Followers
export const FOLLOWERS = {
  right: [40, 100, 220] as const, scoop: 300, wrong: [20, 60, 250] as const,
  hotStep: 0.10, hotCap: 10, // +10% per right call in a row, up to +100%
  modeFactor: { daily: 1, career: 1, deadline: 1, room: 0.8, wire: 1.5, practice: 0.25 } as Record<string, number>,
} as const;
export const hotMult = (hot: number) => 1 + FOLLOWERS.hotStep * Math.max(0, Math.min(hot, FOLLOWERS.hotCap));
/** Followers for one resolved call: right pays by backing (+Scoop) × mode × hot streak; wrong costs by backing × mode. */
export function followerDelta(mode: string, s: number, right: boolean, scoop: boolean, hot: number): number {
  const b = Math.max(0, Math.min(2, s)), f = FOLLOWERS.modeFactor[mode] ?? 1;
  if (right) return Math.round((FOLLOWERS.right[b] + (scoop ? FOLLOWERS.scoop : 0)) * f * hotMult(hot));
  return -Math.round(FOLLOWERS.wrong[b] * f);
}

// ---------------------------------------------------------------- Coins: earn table and prices
export const COINS = {
  daily: 15, dailyT1: 15, career: 10, deadline: 0, room: 0, practice: 0,
  mission: [10, 20] as const, missionsPerDay: 3,
  prizeDaily: [60, 40, 25, 10] as const, prizeWeekly: [200, 120, 80, 30] as const, prizeMinPlayers: 3,
  scalp: 50, trophy: 150,
  streak7: 20, // a seven-day streak banks a grace day and a few coins (kept from 3.x)
  contactLevel: 10, // × level, on a Contacts Book level-up
} as const;
export const coinsForWindow = (mode: Mode4, tier?: string) => (mode === 'daily' ? COINS.daily + (tier === 'T1' ? COINS.dailyT1 : 0) : mode === 'career' ? COINS.career : 0);
export const PRICES = {
  look: { common: 150, rare: 400, epic: 900 } as Record<string, number>, legendaryCredits: 300,
  coffee: 30, extraDm: 40, tipoff: 60, extrasPerWindow: 2, rename: 250,
} as const;
export const CAREER_EXTRAS = { extraDm: PRICES.extraDm, tipoff: PRICES.tipoff, maxPerWindow: PRICES.extrasPerWindow } as const;
export type CareerExtra = 'extraDm' | 'tipoff';
export const RENAME_COINS = PRICES.rename;
export type Rarity4 = 'common' | 'rare' | 'epic' | 'legendary';
/** The coin price of a look by rarity; legendary is credits (or the Gold lane), never coins. */
export const lookPrice = (r: Rarity4): { coins?: number; credits?: number } => (r === 'legendary' ? { credits: PRICES.legendaryCredits } : { coins: PRICES.look[r] });

// ---------------------------------------------------------------- Sponsors (CONCEPT4 §4): paid per right call, by loudness
export type SponsorTier = 'local' | 'national' | 'global';
export interface SponsorTierDef { rate: readonly [number, number, number]; bonus: number; strikes: number; term: 'window' | 'week'; warnFirst: boolean; rank: RankId; followers: number }
export const SPONSOR = {
  tiers: {
    local: { rate: [4, 8, 16], bonus: 60, strikes: 3, term: 'window', warnFirst: false, rank: 'nobody', followers: 0 },
    national: { rate: [8, 16, 32], bonus: 150, strikes: 2, term: 'window', warnFirst: false, rank: 'rising', followers: 2000 },
    global: { rate: [15, 30, 60], bonus: 400, strikes: 1, term: 'week', warnFirst: true, rank: 'itk', followers: 10000 },
  } as Record<SponsorTier, SponsorTierDef>,
  scoopMult: 2,            // a Scoop pays double the Drop rate
  starRate: 0.25, maxStars: 3, // standing 0–3 stars: +25% on the rate card per star; a branded look and a long-term deal at 3
  offersMax: 3, slots: { free: 1, gold: 2 },
  cool: { clean: 1, walked: 7, declined: 2 }, // days before a brand offers again
} as const;
export const sponsorRate = (tier: SponsorTier, stars: number): [number, number, number] => SPONSOR.tiers[tier].rate.map((r) => Math.round(r * (1 + SPONSOR.starRate * Math.max(0, Math.min(SPONSOR.maxStars, stars))))) as [number, number, number];

// ---------------------------------------------------------------- Contacts Book (trust by use)
export const BOOK = { xpAsk: 10, xpMatch: 25, xpIgnore: 5, xpCoffee: 20, coffee: PRICES.coffee, levels: [0, 60, 160, 320, 560] as const } as const;
export const bookLevel = (xp: number) => BOOK.levels.filter((x) => xp >= x).length; // 1–5
/** Trust 0–1 for engine4 rulesFor('career', { trust }): level 1 → 0, level 5 → 1. */
export const trustOfLevel = (lv: number) => Math.max(0, Math.min(1, (lv - 1) / (BOOK.levels.length - 1)));
export const trustOfXp = (xp: number) => trustOfLevel(bookLevel(xp));

// ---------------------------------------------------------------- Secret files (12 hidden achievements, sealed until earned)
// Each is a rule over a v4 Result4 or the save; lib/meta.ts evaluates them after every window. Names and the one-line
// "how" live in i18n/parts/economy4.ts (sf.<id>); the Lens lane shows a sealed file until `save.ach[id]` is set.
export const SECRET_FILES = ['stays3', 'cleanSheet', 'scoop2', 'physioNo', 'dayOne', 'noBarber', 'quiet', 'ratioed', 'hot10', 'rivalBeat', 'liveT1', 'deal3'] as const;
export type SecretFile = typeof SECRET_FILES[number];
export const SECRET_FILE_XP = XP.achievement;

// ---------------------------------------------------------------- the one shape every results thread reads
/** What a finished window (or a Wire call, or a room round) did to the account, returned by lib/meta.ts on*Done. */
export interface Gain {
  xp: number; level: number; levelUp: boolean;
  coins: number;
  rep: number; repDelta: number;
  followers: number; followersDelta: number;
  rank: RankId; rankUp: boolean; review: boolean;
  unlocked: Unlock[];
  /** The sponsor's lines this window (CONCEPT4 §4): per call, the clean-finish bonus, a walk, a star. */
  sponsor?: SponsorGain;
  /** Summary of `sponsor` in the shape the results thread's one line reads: paid = coins this window, pulled = the brand walked. */
  deal?: { brand: string; status: 'paid' | 'pulled'; coins: number };
  files?: SecretFile[]; // secret files opened by this window
}
export interface SponsorLine { i?: number; kind: 'right' | 'scoop' | 'miss' | 'warn' | 'strike' | 'walked' | 'bonus' | 'done' | 'star' | 'look'; paid: number; key: string; v: Record<string, string | number> }
export interface SponsorGain { brand: string; tier: SponsorTier; paid: number; lines: SponsorLine[]; bonus?: number; walked?: boolean; star?: number; look?: string }
export const emptyGain = (level: number, rep: number, followers: number, rank: RankId): Gain => ({ xp: 0, level, levelUp: false, coins: 0, rep, repDelta: 0, followers, followersDelta: 0, rank, rankUp: false, review: false, unlocked: [] });

// ---------------------------------------------------------------- a regular day, for the balance note in RULES4
/** XP a regular player earns a day (Daily + a Career window + a minute of Wire): about 180. */
export const regularDayXp = () => XP.daily + XP.dailyTier.T2 + XP.career + 3 * XP.wire + XP.wireRight;
/** Coins a regular free player earns a day: about 80 (Daily, Career, missions, a level now and then). */
export const regularDayCoins = () => COINS.daily + COINS.career + COINS.missionsPerDay * 15 + 10;

/** The save's XP, tolerant of a 3.x save that still only has Press Points. */
export const xpOf = (s: { xp?: number; pp?: number }) => Math.max(0, Math.round(s.xp ?? s.pp ?? 0));
export const levelOfSave = (s: Save) => levelOf(xpOf(s));

// ---------------------------------------------------------------- credits earned by playing (lib/wallet.ts registers)
// The wallet owns earned credits (idempotent per key, pushed to the server with matching amounts from catalog.json);
// lib/meta.ts and lib/season.ts fire these at the real events. A registry, so wallet → meta never becomes a cycle.
export interface CreditHooks { firstT1?: (s: Save, day: string) => void; streak?: (s: Save, n: number) => void; seasonEnd?: (s: Save, sid: string, tier: number) => void; firstWindow?: (s: Save) => void }
export const creditHooks: CreditHooks = {};
export const setCreditHooks = (h: CreditHooks) => { Object.assign(creditHooks, h); };

// ---------------------------------------------------------------- the coin ledger: every coin grant goes through here
// credit() is THE one way coins land on a save (lib/meta.ts re-exports it; byline, awards, deals, missions, prizes,
// level-ups and the season track all call it). The Gold lane's +10% is applied here, once, through a check lib/season.ts
// registers (no import cycle: season → economy, meta → season). Mutates the draft `s` only; never touches storage.
let goldCheck: ((s: Save) => boolean) | null = null;
export const setGoldCheck = (f: (s: Save) => boolean) => { goldCheck = f; };
export const goldOn = (s: Save) => { try { return !!goldCheck && goldCheck(s); } catch { return false; } };
/** +10% coins for Gold holders, on coins earned by playing. Rounded up so small rewards still show it. */
export const goldBonus = (s: Save, d: number) => (d > 0 && goldOn(s) ? Math.ceil(d * (1 + SEASON.goldCoinBonus)) : d);
export const LEDGER_CAP = 30;
/** Adds `d` coins (after the Gold bonus when d > 0) and writes the line. Returns what landed. */
export function credit(s: Save, d: number, why: string): number {
  if (!d) return 0;
  d = goldBonus(s, Math.round(d));
  s.credits = Math.max(0, (s.credits || 0) + d);
  s.ledger = [{ at: Date.now(), d, why }, ...(s.ledger || [])].slice(0, LEDGER_CAP);
  s.stats = s.stats || {};
  if (d > 0) s.stats.earned = (s.stats.earned || 0) + d;
  return d;
}
/** Takes `n` coins off the draft, or returns false when short. No bonus, no negatives. */
export function debit(s: Save, n: number, why: string): boolean {
  n = Math.max(0, Math.round(n));
  if ((s.credits || 0) < n) return false;
  if (n) { s.credits -= n; s.ledger = [{ at: Date.now(), d: -n, why }, ...(s.ledger || [])].slice(0, LEDGER_CAP); s.stats = s.stats || {}; s.stats.spent = (s.stats.spent || 0) + n; }
  return true;
}
