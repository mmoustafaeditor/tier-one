// Player match ratings (4.0-10.0) and the man of the match, worked out from what happened in the match.
// The same numbers show live, at full time, on the player sheet and in the season averages.
import type { Player } from '../model/types';
import { FORMATIONS } from './tactics';
import type { LiveMatch } from './match';

const hash = (s: string) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 11);
const DEF = new Set(['GK', 'CB', 'LB', 'RB', 'CDM']);

export interface Ratings { rating: Record<string, number>; motm: string }

export function matchRatings(m: LiveMatch, get: (id: string) => Player): Ratings {
  const rating: Record<string, number> = {};
  const minutes = Math.max(1, m.minute);
  // Where each player played (last known slot), for clean sheets.
  const posOf = new Map<string, string>();
  for (const s of m.sides) s.onPitch.forEach((id, k) => { if (id) posOf.set(id, FORMATIONS[s.tactics.formation].slots[k]?.pos ?? get(id).position); });
  const sideOf = new Map<string, 0 | 1>();
  m.sides.forEach((s, i) => { for (const id of [...s.onPitch, ...s.bench]) if (id) sideOf.set(id, i as 0 | 1); });
  for (const e of m.events) if (e.kind === 'sub' && e.inId) sideOf.set(e.inId, e.side);

  for (const id of m.played) {
    const p = get(id);
    if (!p) continue;
    const i = sideOf.get(id) ?? 0;
    const diff = m.goals[i] - m.goals[1 - i];
    const pos = posOf.get(id) ?? p.position;
    // A small, repeatable wobble per player and match, so a quiet game isn't a wall of 6.5s.
    const noise = ((hash(`${m.key}:${id}`) % 1000) / 1000 - 0.5) * 0.8;
    let v = 6.2 + noise + (p.rating - 75) * 0.03 + (diff > 0 ? 0.35 : diff < 0 ? -0.3 : 0);
    if (DEF.has(pos) && m.goals[1 - i] === 0 && minutes >= 60) v += pos === 'GK' ? 0.8 : 0.5;
    if (DEF.has(pos)) v -= Math.min(3, m.goals[1 - i]) * (pos === 'GK' ? 0.3 : 0.15);
    rating[id] = v;
  }
  for (const e of m.events) {
    const add = (id: string | undefined, d: number) => { if (id && rating[id] !== undefined) rating[id] += d; };
    if (e.kind === 'goal') { add(e.playerId, e.how === 'pen' ? 0.8 : 1.1); add(e.assistId, 0.6); }
    if (e.kind === 'save') add(e.playerId, 0.35);
    if (e.kind === 'miss') add(e.playerId, -0.15);
    if (e.kind === 'yellow') add(e.playerId, -0.3);
    if (e.kind === 'red') add(e.playerId, -1.8);
  }
  // Subs who came on late get pulled towards 6.5.
  for (const e of m.events) if (e.kind === 'sub' && e.inId && rating[e.inId] !== undefined) {
    const share = Math.max(0.2, (90 - e.min) / 90);
    rating[e.inId] = 6.5 + (rating[e.inId] - 6.5) * share;
  }
  let motm = '', best = -1;
  for (const [id, v] of Object.entries(rating)) {
    const r = Math.round(Math.min(10, Math.max(4, v)) * 10) / 10;
    rating[id] = r;
    // The man of the match comes from the winning side when there is one.
    const i = sideOf.get(id) ?? 0;
    const bonus = m.goals[i] > m.goals[1 - i] ? 0.3 : 0;
    if (r + bonus > best) { best = r + bonus; motm = id; }
  }
  return { rating, motm };
}

// Season average from the career's running totals.
export const avgRating = (r: [number, number, number] | undefined) => (r && r[1] ? Math.round((r[0] / r[1]) * 100) / 100 : 0);
