// Progress you can feel (HYBRID.md §8): the season level from Press Points and three daily missions. Local and
// cosmetic only: nothing here reaches a ranked score.
import type { Result } from './engine';
import { update, getSave, type Save } from './save';
import { addSeasonPP, goldBonus, seasonWindow, seasonAt, seasonLevel, MAX_SLV } from './season';

// One visible level (3.4, GOTY.md §7.2): the season Pass level. The old account level (floor(pp / 100) + 1) is gone
// from every screen; `save.pp` stays as lifetime Press Points and keeps feeding the season track (lib/season.ts
// addSeasonPP), so nothing a player earned is lost. levelOf(pp) answers "what was the Pass level when the account
// stood at `pp` Press Points": both counters grow by the same amounts, so the season's points at that moment were
// season.pp − (save.pp − pp). Results compares levelOf(start.pp) with levelOf(save.pp) for its level-up line.
// `into`/`need` are a percentage (0–100) so bars drawn as `into%` fill correctly whatever the season's points per level.
export const MAX_LV = MAX_SLV;
export function levelOf(pp: number, s: Save = getSave()) {
  const def = seasonAt();
  const cur = s.season && s.season.id === def.id ? s.season.pp : 0;
  const spp = Math.max(0, cur - Math.max(0, s.pp - pp));
  const lv = seasonLevel(spp, def.ppPerLv);
  return { n: lv.n, into: lv.max ? 100 : lv.pct, need: 100, max: lv.max, pct: lv.pct, pp: spp, per: def.ppPerLv };
}

// Every counter a mission can read. Bumped by trackWindow() and a few direct hooks.
export type Counter = 'daily' | 'practice' | 'story' | 'room' | 'right' | 'excl' | 'confRight' | 'wire' | 'src_physio' | 'src_spotter' | 'src_barber' | 'src_agent' | 'src_kitman' | 'twistRight' | 'uncalledZero';
export interface MissionDef { id: string; c: Counter; n: number; coins: number }
export const MISSIONS: MissionDef[] = [
  { id: 'daily', c: 'daily', n: 1, coins: 10 },
  { id: 'right3', c: 'right', n: 3, coins: 10 },
  { id: 'excl', c: 'excl', n: 1, coins: 15 },
  { id: 'confRight', c: 'confRight', n: 1, coins: 15 },
  { id: 'physio', c: 'src_physio', n: 2, coins: 5 },
  { id: 'spotter', c: 'src_spotter', n: 2, coins: 5 },
  { id: 'barber', c: 'src_barber', n: 3, coins: 5 },
  { id: 'agent', c: 'src_agent', n: 2, coins: 5 },
  { id: 'practice', c: 'practice', n: 1, coins: 5 },
  { id: 'story', c: 'story', n: 1, coins: 10 },
  { id: 'wire', c: 'wire', n: 1, coins: 5 },
  { id: 'twist', c: 'twistRight', n: 1, coins: 15 },
  { id: 'room', c: 'room', n: 1, coins: 10 },
];
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
    return { ...m, have, done: have >= m.n, claimed: ms.claimed.includes(id) };
  });
}
// 3.7: weekly missions, one per mode plus one for calls right anywhere. Same counters, a Monday-to-Sunday (UTC) base,
// coins only (never a score). Ids carry a 'w.' prefix so a claim can never collide with a daily one.
export const WEEKLY: MissionDef[] = [
  { id: 'w.daily', c: 'daily', n: 5, coins: 40 },
  { id: 'w.story', c: 'story', n: 3, coins: 40 },
  { id: 'w.room', c: 'room', n: 3, coins: 40 },
  { id: 'w.wire', c: 'wire', n: 5, coins: 40 },
  { id: 'w.right', c: 'right', n: 15, coins: 50 },
];
export interface WeekMissionState { wk: string; base: Record<string, number>; claimed: string[] }
declare module './save' { interface Save { missionsW?: WeekMissionState } }
/** The Monday (UTC, yyyy-mm-dd) of the current week. */
export const weekKey = (ms = Date.now()) => { const d = new Date(ms); const dow = (d.getUTCDay() + 6) % 7; return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow)).toISOString().slice(0, 10); };
export function ensureWeekly(s: Save) {
  const wk = weekKey();
  if (s.missionsW && s.missionsW.wk === wk) return s.missionsW;
  const base: Record<string, number> = {};
  for (const m of WEEKLY) base[m.id] = cnt(s, m.c);
  s.missionsW = { wk, base, claimed: [] };
  return s.missionsW;
}
/** Which mode a mission belongs to (the Missions page groups by it); 'any' counts in every mode. */
export type MissionMode = 'daily' | 'career' | 'multi' | 'market' | 'any';
const MODE_OF: Record<Counter, MissionMode> = { daily: 'daily', practice: 'daily', story: 'career', room: 'multi', wire: 'market', right: 'any', excl: 'any', confRight: 'any', src_physio: 'any', src_spotter: 'any', src_barber: 'any', src_agent: 'any', src_kitman: 'any', twistRight: 'any', uncalledZero: 'any' };
export const MODE_ORDER: MissionMode[] = ['daily', 'career', 'multi', 'market', 'any'];
export interface MissionRow extends MissionDef { have: number; done: boolean; claimed: boolean; weekly: boolean; mode: MissionMode; label: string }
export function weeklyView(s: Save): MissionRow[] {
  const ms = s.missionsW && s.missionsW.wk === weekKey() ? s.missionsW : null;
  if (!ms) return [];
  return WEEKLY.map((m) => { const have = Math.max(0, Math.min(m.n, cnt(s, m.c) - (ms.base[m.id] || 0))); return { ...m, have, done: have >= m.n, claimed: ms.claimed.includes(m.id), weekly: true, mode: MODE_OF[m.c], label: 'hub.missions.wk.' + m.id.slice(2) }; });
}
/** Today's three daily missions and this week's weekly ones, in one list. */
export function allMissions(s: Save): MissionRow[] {
  const d: MissionRow[] = (missionsView(s) || []).map((m) => ({ ...m, weekly: false, mode: MODE_OF[m.c], label: 'g.missions.' + m.id }));
  return [...d, ...weeklyView(s)];
}
/** Home's three: claimable first, then the closest to done, claimed last. */
export function topMissions(s: Save, n = 3): MissionRow[] {
  const score = (m: MissionRow) => (m.claimed ? -2 : m.done ? 2 : m.have / m.n);
  return [...allMissions(s)].sort((a, b) => score(b) - score(a)).slice(0, n);
}
export function claimMission(id: string) {
  if (id.startsWith('w.')) return claimWeekly(id);
  let paid = 0;
  update((s) => {
    const v = missionsView(s)?.find((m) => m.id === id);
    if (!v || !v.done || v.claimed || !s.missions) return;
    s.missions.claimed.push(id);
    const coins = goldBonus(s, v.coins); // Gold lane: +10%, rounded up
    s.credits += coins; s.ledger = [{ at: Date.now(), d: coins, why: 'mission:' + id }, ...s.ledger].slice(0, 30);
    s.stats.earned = (s.stats.earned || 0) + coins;
    s.pp += 20; addSeasonPP(s, 20); paid = coins;
  });
  return paid;
}
function claimWeekly(id: string) {
  let paid = 0;
  update((s) => {
    const v = weeklyView(s).find((m) => m.id === id);
    if (!v || !v.done || v.claimed || !s.missionsW) return;
    s.missionsW.claimed.push(id);
    const coins = goldBonus(s, v.coins);
    s.credits += coins; s.ledger = [{ at: Date.now(), d: coins, why: 'mission:' + id }, ...s.ledger].slice(0, 30);
    s.stats.earned = (s.stats.earned || 0) + coins;
    s.pp += 40; addSeasonPP(s, 40); paid = coins;
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
    if (p.right && p.call && p.call.s === 2) bump(s, 'confRight');
    if (p.right && p.tw) bump(s, 'twistRight');
    for (const c of p.reads) if (['physio', 'spotter', 'barber', 'agent', 'kitman'].includes(c.src)) bump(s, ('src_' + c.src) as Counter);
  }
  seasonWindow(s, r, mode); // season recap (best tier, top call) and the weekly event
}
export const missionsReady = (s: Save = getSave()) => allMissions(s).filter((m) => m.done && !m.claimed).length;
