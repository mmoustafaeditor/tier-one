// Weekly missions (UI41.md §Missions: "3 daily + 3 weekly"). The daily three are lib/progress.ts; these are the week's
// three, read off the same counters (save.stats.m_<counter>), reset Monday 00:00 UTC. State lives in save.stats so the
// save shape doesn't change: wk = the week index, wk:p0..2 = the picks, wkb:<id> = the counter at the week's start,
// wkc:<id> = the week it was claimed. Claim pays coins (lib/meta.ts credit, Gold +10%) and the daily mission's XP.
import { update, type Save } from './save';
import { credit, addXP } from './meta';
import { MISSION_XP, type Counter } from './progress';

export interface WeeklyDef { id: string; c: Counter; n: number; coins: number }
export const WEEKLY: WeeklyDef[] = [
  { id: 'daily5', c: 'daily', n: 5, coins: 40 },
  { id: 'right12', c: 'right', n: 12, coins: 50 },
  { id: 'scoop3', c: 'excl', n: 3, coins: 60 },
  { id: 'drop3', c: 'confRight', n: 3, coins: 60 },
  { id: 'story2', c: 'story', n: 2, coins: 50 },
  { id: 'wire3', c: 'wire', n: 3, coins: 40 },
  { id: 'room2', c: 'room', n: 2, coins: 50 },
];
/** Monday-based week index (1 Jan 1970 was a Thursday). */
export const weekIndex = (ms = Date.now()) => Math.floor((Math.floor(ms / 864e5) + 3) / 7);
/** When this week's missions reset (ms UTC). */
export const weekEnds = (ms = Date.now()) => (weekIndex(ms) + 1) * 7 * 864e5 - 3 * 864e5;
const cnt = (s: Save, c: Counter) => s.stats['m_' + c] || 0;

function pick(s: Save, wk: number): number[] {
  const ok = WEEKLY.map((w, i) => ({ w, i })).filter(({ w }) => w.id !== 'daily5' && (w.id !== 'story2' || !!s.career) && (w.id !== 'room2' || !!s.rooms?.length));
  const a = ok[wk % ok.length], rest = ok.filter((x) => x !== a), b = rest[(wk * 7 + 3) % rest.length];
  return [0, a.i, b.i];
}
/** Starts the week if it turned (call inside update()). */
export function ensureWeekly(s: Save) {
  const wk = weekIndex();
  if (s.stats.wk === wk) return;
  const p = pick(s, wk);
  s.stats.wk = wk;
  p.forEach((i, k) => { s.stats['wk:p' + k] = i; const w = WEEKLY[i]; s.stats['wkb:' + w.id] = cnt(s, w.c); });
}
export interface WeeklyView extends WeeklyDef { have: number; done: boolean; claimed: boolean; xp: number }
/** This week's three (empty until ensureWeekly ran this week). */
export function weeklyView(s: Save): WeeklyView[] {
  const wk = weekIndex();
  if (s.stats.wk !== wk) return [];
  return [0, 1, 2].map((k) => WEEKLY[s.stats['wk:p' + k] ?? k] || WEEKLY[k]).map((w) => {
    const have = Math.max(0, Math.min(w.n, cnt(s, w.c) - (s.stats['wkb:' + w.id] || 0)));
    return { ...w, have, done: have >= w.n, claimed: s.stats['wkc:' + w.id] === wk, xp: MISSION_XP };
  });
}
export const weeklyReady = (s: Save) => weeklyView(s).filter((m) => m.done && !m.claimed).length;
/** Pays a done weekly mission. Returns the coins paid (0 if it wasn't claimable). */
export function claimWeekly(id: string): number {
  let paid = 0;
  update((s) => {
    const v = weeklyView(s).find((m) => m.id === id);
    if (!v || !v.done || v.claimed) return;
    s.stats['wkc:' + id] = weekIndex();
    paid = credit(s, v.coins, 'mission:w:' + id);
    addXP(s, MISSION_XP);
  });
  return paid;
}
