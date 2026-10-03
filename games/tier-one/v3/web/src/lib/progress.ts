// Progress you can feel (LAUNCH_BRIEF §20, §47; docs/spec/E-economy.md): the season level from Season XP, and the
// missions. Local and cosmetic only: nothing here reaches a ranked score.
import type { Result } from './engine';
import { update, getSave, type Save } from './save';
import { addSeasonPP, seasonWindow, seasonAt, seasonLevel, MAX_SLV } from './season';

// One visible level (brief §20: Season XP = the temporary progression track): the season level, 1–40, which starts
// again each season (the recap keeps what you reached). `save.pp` stays as lifetime Press Points and keeps feeding the
// season track (lib/season.ts addSeasonPP), so nothing a player earned is lost. levelOf(pp) answers "what was the
// season level when the account stood at `pp` Press Points": both counters grow by the same amounts, so the season's
// points at that moment were season.pp − (save.pp − pp). Results compares levelOf(start.pp) with levelOf(save.pp).
// `into`/`need` are a percentage (0–100) so bars drawn as `into%` fill correctly whatever the season's points per level.
export const MAX_LV = MAX_SLV;
export function levelOf(pp: number, s: Save = getSave()) {
  const def = seasonAt();
  // 3.9.11: a missing or corrupt number in an old save must never show "Lv NaN": everything is coerced to a finite number.
  const fin = (x: unknown) => { const v = Number(x); return Number.isFinite(v) ? v : 0; };
  const cur = s.season && s.season.id === def.id ? fin(s.season.pp) : 0;
  const spp = Math.max(0, cur - Math.max(0, fin(s.pp) - fin(pp)));
  const lv = seasonLevel(spp, def.ppPerLv);
  return { n: lv.n, into: lv.max ? 100 : lv.pct, need: 100, max: lv.max, pct: lv.pct, pp: spp, per: def.ppPerLv };
}

// ---------------------------------------------------------------- missions (brief §47: reward enjoying the game, never a chore)
// Every counter a mission can read (save.stats['m_' + counter]). Bumped by trackWindow() and a few direct hooks.
export type Counter = 'daily' | 'practice' | 'story' | 'room' | 'right' | 'excl' | 'advRight' | 'wire' | 'twistRight' | 'rivalBeat' | 'share' | 'early';
export interface MissionDef { id: string; c: Counter; n: number; coins: number }
/** Daily pool: "Play today's Daily" every day, plus two drawn from the rest. No source-ring chores (brief §47). */
export const MISSIONS: MissionDef[] = [
  { id: 'daily', c: 'daily', n: 1, coins: 5 },
  { id: 'right3', c: 'right', n: 3, coins: 5 },
  { id: 'adv', c: 'advRight', n: 1, coins: 5 },      // a correct Advanced or Confirmed call
  { id: 'excl', c: 'excl', n: 1, coins: 8 },         // land an Exclusive
  { id: 'rival', c: 'rivalBeat', n: 1, coins: 8 },   // beat a rival on a saga
  { id: 'early', c: 'early', n: 1, coins: 5 },       // a right call filed by day 3
  { id: 'practice', c: 'practice', n: 1, coins: 5 },
  { id: 'story', c: 'story', n: 1, coins: 5 },       // only once a career exists
  { id: 'wire', c: 'wire', n: 1, coins: 5 },
  { id: 'twist', c: 'twistRight', n: 1, coins: 8 },
  { id: 'room', c: 'room', n: 1, coins: 5 },
  { id: 'share', c: 'share', n: 1, coins: 5 },
];
export const MISSION_XP = { daily: 20, weekly: 40 } as const;
export interface MissionState { day: string; ids: string[]; base: Record<string, number>; claimed: string[] }
const today = () => new Date().toISOString().slice(0, 10);
const hash = (s: string) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
const cnt = (s: Save, c: Counter) => (s.stats['m_' + c] || 0);

// Three missions a day: always one about the Daily, two picked by a seeded shuffle of the rest.
function pick(s: Save, day: string) {
  const rest = MISSIONS.filter((m) => m.id !== 'daily' && (m.id !== 'story' || s.career));
  const h = hash(day + s.dev);
  const a = rest[h % rest.length], b = rest.filter((m) => m !== a)[(h >>> 8) % (rest.length - 1)];
  return ['daily', a.id, b.id];
}
export function ensureMissions(s: Save) {
  ensureWeekly(s);
  const d = today();
  if (s.missions && s.missions.day === d && s.missions.ids.every((id) => MISSIONS.some((m) => m.id === id))) return s.missions;
  const ids = pick(s, d), base: Record<string, number> = {};
  for (const id of ids) { const m = MISSIONS.find((x) => x.id === id)!; base[id] = cnt(s, m.c); }
  s.missions = { day: d, ids, base, claimed: [] };
  return s.missions;
}
export function missionsView(s: Save) {
  const ms = s.missions && s.missions.day === today() ? s.missions : null;
  if (!ms) return null;
  return ms.ids.map((id) => MISSIONS.find((x) => x.id === id)).filter((m): m is MissionDef => !!m).map((m) => {
    const have = Math.max(0, Math.min(m.n, cnt(s, m.c) - (ms.base[m.id] || 0)));
    return { ...m, have, done: have >= m.n, claimed: ms.claimed.includes(m.id) };
  });
}
// Weekly missions (Monday to Sunday, UTC): one per mode plus two about good journalism. Same counters, a weekly base,
// coins only (never a score). Ids carry a 'w.' prefix so a claim can never collide with a daily one.
export const WEEKLY: MissionDef[] = [
  { id: 'w.daily', c: 'daily', n: 5, coins: 25 },
  { id: 'w.story', c: 'story', n: 3, coins: 25 },
  { id: 'w.room', c: 'room', n: 2, coins: 25 },
  { id: 'w.wire', c: 'wire', n: 5, coins: 25 },
  { id: 'w.excl', c: 'excl', n: 2, coins: 30 },
  { id: 'w.right', c: 'right', n: 12, coins: 30 },
];
export interface WeekMissionState { wk: string; base: Record<string, number>; claimed: string[] }
declare module './save' { interface Save { missionsW?: WeekMissionState } }
/** The Monday (UTC, yyyy-mm-dd) of the current week. */
export const weekKey = (ms = Date.now()) => { const d = new Date(ms); const dow = (d.getUTCDay() + 6) % 7; return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow)).toISOString().slice(0, 10); };
export function ensureWeekly(s: Save) {
  const wk = weekKey();
  if (s.missionsW && s.missionsW.wk === wk && WEEKLY.every((m) => m.id in s.missionsW!.base)) return s.missionsW;
  const base: Record<string, number> = { ...(s.missionsW && s.missionsW.wk === wk ? s.missionsW.base : {}) };
  for (const m of WEEKLY) if (!(m.id in base)) base[m.id] = cnt(s, m.c);
  s.missionsW = { wk, base, claimed: s.missionsW && s.missionsW.wk === wk ? s.missionsW.claimed : [] };
  return s.missionsW;
}
/** Which mode a mission belongs to (the Missions page groups by it); 'any' counts in every mode. */
export type MissionMode = 'daily' | 'career' | 'multi' | 'market' | 'any';
const MODE_OF: Record<Counter, MissionMode> = { daily: 'daily', practice: 'daily', story: 'career', room: 'multi', wire: 'market', right: 'any', excl: 'any', advRight: 'any', twistRight: 'any', rivalBeat: 'any', share: 'any', early: 'any' };
export const MODE_ORDER: MissionMode[] = ['daily', 'career', 'multi', 'market', 'any'];
export interface MissionRow extends MissionDef { have: number; done: boolean; claimed: boolean; weekly: boolean; mode: MissionMode; label: string }
export function weeklyView(s: Save): MissionRow[] {
  const ms = s.missionsW && s.missionsW.wk === weekKey() ? s.missionsW : null;
  if (!ms) return [];
  return WEEKLY.filter((m) => m.id !== 'w.story' || s.career).map((m) => { const have = Math.max(0, Math.min(m.n, cnt(s, m.c) - (ms.base[m.id] || 0))); return { ...m, have, done: have >= m.n, claimed: ms.claimed.includes(m.id), weekly: true, mode: MODE_OF[m.c], label: 'eco38.missions.wk.' + m.id.slice(2) }; });
}
/** Today's three daily missions and this week's weekly ones, in one list. */
export function allMissions(s: Save): MissionRow[] {
  const d: MissionRow[] = (missionsView(s) || []).map((m) => ({ ...m, weekly: false, mode: MODE_OF[m.c], label: 'eco38.missions.d.' + m.id }));
  return [...d, ...weeklyView(s)];
}
/** Home's three: claimable first, then the closest to done, claimed last. */
export function topMissions(s: Save, n = 3): MissionRow[] {
  const score = (m: MissionRow) => (m.claimed ? -2 : m.done ? 2 : m.have / m.n);
  return [...allMissions(s)].sort((a, b) => score(b) - score(a)).slice(0, n);
}
/** Pays a done mission once: coins into the wallet, XP onto the season track. Returns the coins paid (0 = nothing). */
export function claimMission(id: string) {
  let paid = 0;
  update((s) => {
    const weekly = id.startsWith('w.');
    const v = weekly ? weeklyView(s).find((m) => m.id === id) : missionsView(s)?.find((m) => m.id === id);
    const st = weekly ? s.missionsW : s.missions;
    if (!v || !v.done || v.claimed || !st) return;
    st.claimed.push(id);
    s.credits += v.coins; s.ledger = [{ at: Date.now(), d: v.coins, why: 'mission:' + id }, ...s.ledger].slice(0, 30);
    s.stats.earned = (s.stats.earned || 0) + v.coins;
    const xp = weekly ? MISSION_XP.weekly : MISSION_XP.daily;
    s.pp += xp; addSeasonPP(s, xp); paid = v.coins;
  });
  return paid;
}
export function bump(s: Save, c: Counter, n = 1) { s.stats['m_' + c] = cnt(s, c) + n; }

// Called once per finished window, every mode.
export function trackWindow(s: Save, r: Result, mode: 'daily' | 'practice' | 'story' | 'room') {
  ensureMissions(s);
  bump(s, mode);
  for (const p of r.per) {
    if (p.right && p.call) bump(s, 'right');
    if (p.excl) bump(s, 'excl');
    if (p.right && p.call && p.call.s >= 1) bump(s, 'advRight');
    if (p.right && p.call && p.call.day <= 3) bump(s, 'early');
    if (p.right && p.tw) bump(s, 'twistRight');
    // Beat a rival: you were right where a rival posted wrong, or posted the truth before any rival who had it.
    if (p.right && p.call && p.posts.some((f) => !f.right || f.day > p.call!.day)) bump(s, 'rivalBeat');
  }
  seasonWindow(s, r, mode); // season recap (best tier, top call)
}
export const missionsReady = (s: Save = getSave()) => allMissions(s).filter((m) => m.done && !m.claimed).length;
