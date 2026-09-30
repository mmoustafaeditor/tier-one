// Competition rules (gf-ref): VAR, yellow-card accumulation, red-card bans, extra time and substitutions, per
// competition and per season. Each is ONE table, so correcting a rule is a one-line change. Competition ids are the
// league ids (`eng1`, `esp2` …), the national cups (`eng_cup` …) and the continental cups (`ucl`, `uel`, `ccl`, `acl`).
//
// Sources: IFAB Laws of the Game 2026/27 (in force from 1 July 2026) for the law-version gates; the VAR and
// accumulation defaults were supplied by the research lane. Anything not confirmed there is marked `// unverified`.

// ---------- VAR ----------

// true / false: VAR at every match of that competition. 'ko': knockout rounds only (not the group stage).
// { last: n }: from the round with n clubs left onward (e.g. 16 = the round of 16).
export type VarSetting = boolean | 'ko' | { last: number };

// competition → season (first season the setting applies from) → setting. A season with no entry uses the latest
// earlier one; a competition with no entry has no VAR.
export const VAR_TABLE: Record<string, Record<number, VarSetting>> = {
  eng1: { 2026: true },
  esp1: { 2026: true },
  ita1: { 2026: true },
  ger1: { 2026: true },
  fra1: { 2026: true },
  eng2: { 2026: false },            // Championship: goal-line technology only (confirmed for 2026/27)
  esp2: { 2026: false },            // unverified
  ita2: { 2026: false },            // unverified
  ger2: { 2026: false },            // unverified
  fra2: { 2026: false },            // unverified
  egy1: { 2026: true },             // unverified
  egy2: { 2026: false },            // unverified
  ksa1: { 2026: true },             // unverified
  mar1: { 2026: true },             // unverified
  tun1: { 2026: false },            // unverified
  alg1: { 2026: false },            // unverified
  uae1: { 2026: true },             // unverified
  qat1: { 2026: true },             // unverified
  eng_cup: { 2026: { last: 16 } },  // FA Cup: from round 5 (the last 16) onward
  esp_cup: { 2026: false },         // unverified
  ita_cup: { 2026: false },         // unverified
  ger_cup: { 2026: false },         // unverified
  fra_cup: { 2026: false },         // unverified
  ucl: { 2026: true },
  uel: { 2026: true },
  ccl: { 2026: 'ko' },              // unverified: knockout stage only
  acl: { 2026: 'ko' },              // unverified: knockout stage only
};

function bySeason<T>(t: Record<number, T> | undefined, season: number): T | undefined {
  if (!t) return undefined;
  const ks = Object.keys(t).map(Number).sort((a, b) => a - b);
  let v: T | undefined;
  for (const k of ks) if (k <= season) v = t[k];
  return v ?? (ks.length ? t[ks[0]] : undefined);
}

// Is VAR in use? `left`: clubs still in a cup round (a knockout tie); undefined for a league or a group game.
export function varFor(comp: string | undefined, season: number, left?: number): boolean {
  const s = comp ? bySeason(VAR_TABLE[comp], season) : undefined;
  if (s === undefined || s === false) return false;
  if (s === true) return true;
  if (s === 'ko') return left !== undefined;
  return left !== undefined && left <= s.last;
}

// ---------- the Laws edition in force ----------

export interface Laws {
  year: number;
  var2y: boolean;          // VAR may review a red card that came from a clearly wrong second yellow
  idYellow: boolean;       // mistaken identity covers yellow cards too (either team)
  dogsoAdvGoal: boolean;   // DOGSO, advantage played and a goal scored: no caution
}
// 2026/27 edition: the three changes above. Seasons before keep the old protocol.
export const lawsFor = (season: number): Laws => ({ year: season, var2y: season >= 2026, idYellow: season >= 2026, dogsoAdvGoal: season >= 2026 });

// ---------- suspensions ----------

// Yellow-card accumulation. `steps`: bans at a count reached within the club's first `before` matches of the
// competition (99 = any time). Otherwise `first`, then every `every` yellows after it, a `ban` of that many matches.
export interface Accum { first: number; every: number; ban: number; steps?: { at: number; before: number; ban: number }[] }
export const ACCUM: Record<string, Accum> = {
  eng1: { first: 5, every: 5, ban: 1, steps: [{ at: 5, before: 19, ban: 1 }, { at: 10, before: 32, ban: 2 }, { at: 15, before: 99, ban: 3 }] },
  fra1: { first: 5, every: 5, ban: 1 },
  fra2: { first: 5, every: 5, ban: 1 },
  ita1: { first: 5, every: 5, ban: 1 },   // simplified: the first ban at 5, then every 5
  league: { first: 5, every: 5, ban: 1 }, // every other league
  national: { first: 3, every: 3, ban: 1 }, // national cups: their own count, a lower threshold (unverified)
  continental: { first: 3, every: 2, ban: 1 }, // 3rd, 5th, 7th… (unverified)
};

// Matches banned for a sending-off, by what it was for.
export interface RedBans { second: number; dogso: number; hand: number; sfp: number; violent: number; other: number }
export const RED_BANS: Record<string, RedBans> = {
  default: { second: 1, dogso: 1, hand: 1, sfp: 1, violent: 3, other: 1 },
  eng1: { second: 1, dogso: 1, hand: 1, sfp: 3, violent: 3, other: 1 }, // unverified: serious foul play is 3 in England
};

export type CompKind = 'league' | 'national' | 'continental';
export const CONTINENTAL_IDS = ['ucl', 'uel', 'ccl', 'acl'];
export const compKind = (comp: string): CompKind => (CONTINENTAL_IDS.includes(comp) ? 'continental' : comp.endsWith('_cup') ? 'national' : 'league');
export const accumOf = (comp: string): Accum => ACCUM[comp] ?? ACCUM[compKind(comp)];
export const redBansOf = (comp: string): RedBans => RED_BANS[comp] ?? RED_BANS.default;

// Matches banned when a player reaches `count` yellows in `comp`; `played`: the club's matches in it, this one included.
export function accumBan(comp: string, count: number, played: number): number {
  const a = accumOf(comp);
  if (a.steps) return a.steps.find((s) => s.at === count && played <= s.before)?.ban ?? 0;
  return count >= a.first && (count - a.first) % a.every === 0 ? a.ban : 0;
}

// ---------- extra time and substitutions ----------

// Knockout ties that end level: extra time (two halves of 15) and then penalties. false = straight to penalties.
export const EXTRA_TIME: Record<string, boolean> = { default: true };
export const extraTimeFor = (comp: string | undefined) => EXTRA_TIME[comp ?? ''] ?? EXTRA_TIME.default;

// Five substitutes in three windows (half-time is free); one more of each in extra time (IFAB Law 3).
export const SUBS = { max: 5, windows: 3, etExtra: 1 };
