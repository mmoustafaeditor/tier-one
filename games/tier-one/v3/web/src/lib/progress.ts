// Progress you can feel: the account level (lib/economy.ts levelOf: forever, 100 + 30 × (L − 1) XP a level) and three
// daily missions (RULES4 §3: 25 XP and 10–20 coins each). Local and cosmetic only: nothing here reaches a ranked score.
import type { Result, ResultSaga, ResultStory4, Result4 } from './engine';
import { update, getSave, type Save } from './save';
import { seasonWindow, type SeasonResultLite } from './season';
import { levelOf as levelOf4, xpOf, XP, COINS, credit, type LevelView } from './economy';

/** There is no top level (RULES4 §3 "Level (never ends)"). Kept as a number for 3.x screens that print "of {MAX_LV}". */
export const MAX_LV = Number.POSITIVE_INFINITY;
/** The account level `xp` stands at (3.x called the number Press Points). `s` is accepted and ignored: a level is a
 *  function of lifetime XP alone now, so Results can compare levelOf(start.xp) with levelOf(save.xp). */
export function levelOf(xp: number, _s?: Save): LevelView { return levelOf4(xp); }
export const levelOfSave = (s: Save = getSave()) => levelOf4(xpOf(s));

// Every counter a mission can read. Bumped by trackWindow() and a few direct hooks.
export type Counter = 'daily' | 'practice' | 'story' | 'room' | 'deadline' | 'right' | 'excl' | 'confRight' | 'wire' | 'src_physio' | 'src_spotter' | 'src_barber' | 'src_agent' | 'src_kitman' | 'twistRight' | 'uncalledZero' | 'stays' | 'x1Right';
export interface MissionDef { id: string; c: Counter; n: number; coins: number }
// `excl` is a Scoop and `confRight` a right Drop in 4.0 words; the counter names stay so old saves keep their totals.
export const MISSIONS: MissionDef[] = [
  { id: 'daily', c: 'daily', n: 1, coins: 10 },
  { id: 'right3', c: 'right', n: 3, coins: 15 },
  { id: 'excl', c: 'excl', n: 1, coins: 20 },
  { id: 'confRight', c: 'confRight', n: 1, coins: 20 },
  { id: 'physio', c: 'src_physio', n: 2, coins: 10 },
  { id: 'spotter', c: 'src_spotter', n: 2, coins: 10 },
  { id: 'barber', c: 'src_barber', n: 3, coins: 10 },
  { id: 'agent', c: 'src_agent', n: 2, coins: 10 },
  { id: 'practice', c: 'practice', n: 1, coins: 10 },
  { id: 'story', c: 'story', n: 1, coins: 15 },
  { id: 'wire', c: 'wire', n: 1, coins: 10 },
  { id: 'stays', c: 'stays', n: 1, coins: 15 },
  { id: 'x1', c: 'x1Right', n: 2, coins: 10 },
  { id: 'room', c: 'room', n: 1, coins: 15 },
];
export const MISSION_XP = XP.mission;
export interface MissionState { day: string; ids: string[]; base: Record<string, number>; claimed: string[] }
const today = () => new Date().toISOString().slice(0, 10);
const hash = (s: string) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
const cnt = (s: Save, c: Counter) => (s.stats['m_' + c] || 0);

// Three missions a day: always one about the Daily, two picked by a seeded shuffle of the rest.
function pick(s: Save, day: string) {
  const rest = MISSIONS.filter((m) => m.id !== 'daily' && (m.id !== 'story' || s.career) && (m.id !== 'room' || (s.rooms && s.rooms.length)));
  const h = hash(day + s.dev);
  const a = rest[h % rest.length], b = rest.filter((m) => m !== a)[(h >>> 8) % (rest.length - 1)];
  return ['daily', a.id, b.id];
}
export function ensureMissions(s: Save) {
  const d = today();
  if (s.missions && s.missions.day === d) return s.missions;
  const ids = pick(s, d), base: Record<string, number> = {};
  for (const id of ids) { const m = MISSIONS.find((x) => x.id === id)!; base[id] = cnt(s, m.c); }
  s.missions = { day: d, ids, base, claimed: [] };
  return s.missions;
}
export function missionsView(s: Save) {
  const ms = s.missions && s.missions.day === today() ? s.missions : null;
  if (!ms) return null;
  return ms.ids.map((id) => {
    const m = MISSIONS.find((x) => x.id === id)!;
    const have = Math.min(m.n, cnt(s, m.c) - (ms.base[id] || 0));
    return { ...m, have, done: have >= m.n, claimed: ms.claimed.includes(id), xp: MISSION_XP };
  });
}
/** Pays a done mission: its coins through credit() (Gold +10%) and 25 XP (lib/meta.ts addXP). Returns the coins paid. */
export function claimMission(id: string) {
  let paid = 0;
  update((s) => {
    const v = missionsView(s)?.find((m) => m.id === id);
    if (!v || !v.done || v.claimed || !s.missions) return;
    s.missions.claimed.push(id);
    paid = credit(s, v.coins, 'mission:' + id);
    addXp(s, MISSION_XP);
  });
  return paid;
}
// lib/meta.ts owns addXP (level-ups pay coins); it registers here so progress → meta never becomes an import cycle.
let addXp: (s: Save, n: number) => void = (s, n) => { s.xp = xpOf(s) + n; s.pp = s.xp; };
export const setAddXp = (f: (s: Save, n: number) => void) => { addXp = f; };
export function bump(s: Save, c: Counter, n = 1) { s.stats['m_' + c] = cnt(s, c) + n; }

export type TrackMode = 'daily' | 'practice' | 'story' | 'room' | 'deadline';
const isV4 = (r: Result | Result4): r is Result4 => (r as Result4).v === 4;
/** Any result as the season lane wants it (tier, per-story right/points, ITK beaten). */
export function liteResult(r: Result | Result4): SeasonResultLite {
  if (isV4(r)) return { tier: r.tier, per: r.per.map((p) => ({ right: p.right, called: !!p.call, pts: p.pts, beatItk: p.right && !!p.call && p.rivals.some((f) => f.id === 'itk' && (!f.right || f.day >= p.call!.day)) })) };
  return { tier: r.tier, per: r.per.map((p) => ({ right: p.right, called: !!p.call, pts: p.pts, beatItk: p.right && !!p.call && p.posts.some((f) => f.id === 'itk' && (!f.right || f.day > p.call!.day)) })) };
}
// Called once per finished window, every mode, v3 or v4 results.
export function trackWindow(s: Save, r: Result | Result4, mode: TrackMode) {
  ensureMissions(s);
  bump(s, mode);
  if (isV4(r)) {
    for (const p of r.per as ResultStory4[]) {
      if (p.right && p.call) bump(s, 'right');
      if (p.scoop) bump(s, 'excl');
      if (p.right && p.call && p.call.s === 2) bump(s, 'confRight');
      if (p.right && p.call && p.call.s === 0) bump(s, 'x1Right');
      if (p.right && p.call && p.truth === 2) bump(s, 'stays');
      for (const c of p.reads) if (['physio', 'spotter', 'barber', 'agent', 'kitman'].includes(c.src)) bump(s, ('src_' + c.src) as Counter);
    }
  } else {
    for (const p of r.per as ResultSaga[]) {
      if (p.right && p.call) bump(s, 'right');
      if (p.excl) bump(s, 'excl');
      if (p.right && p.call && p.call.s === 2) bump(s, 'confRight');
      if (p.right && p.call && p.call.s === 0) bump(s, 'x1Right');
      if (p.right && p.tw) bump(s, 'twistRight');
      for (const c of p.reads) if (['physio', 'spotter', 'barber', 'agent', 'kitman'].includes(c.src)) bump(s, ('src_' + c.src) as Counter);
    }
  }
  seasonWindow(s, liteResult(r), mode); // season recap (best tier, top call) and the weekly event
}
export const missionsReady = () => (missionsView(getSave()) || []).filter((m) => m.done && !m.claimed).length;
/** Coins a day's three missions can pay, for the "80 coins a day" note (RULES4 §3). */
export const missionCoinsRange = (): [number, number] => [COINS.mission[0] * COINS.missionsPerDay, COINS.mission[1] * COINS.missionsPerDay];
