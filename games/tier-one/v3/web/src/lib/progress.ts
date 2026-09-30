// Progress you can feel (HYBRID.md §8): level from Press Points and three daily missions. Local and cosmetic only:
// nothing here reaches a ranked score.
import type { Result } from './engine';
import { update, getSave, type Save } from './save';
import { addSeasonPP, goldBonus, seasonWindow } from './season';

export const MAX_LV = 40;
export function levelOf(pp: number) {
  const n = Math.min(MAX_LV, Math.floor(pp / 100) + 1);
  return { n, into: n >= MAX_LV ? 100 : pp % 100, need: 100, max: n >= MAX_LV };
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
export function claimMission(id: string) {
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
export const missionsReady = () => (missionsView(getSave()) || []).filter((m) => m.done && !m.claimed).length;
