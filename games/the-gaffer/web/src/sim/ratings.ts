// Player match ratings (4.0-10.0) and the man of the match, worked out from what happened in the match.
// The same numbers show live, at full time, on the player sheet and in the season averages.
// GF-10: a keeper's rating is bounded by the shots on target he faced, and a keeper who faced at most one
// can't be man of the match: a quiet clean sheet is a good day, not a heroic one.
import type { Player } from '../model/types';
import { FORMATIONS } from './tactics';
import type { LiveMatch } from './match';

const hash = (s: string) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 11);
const DEF = new Set(['GK', 'CB', 'LB', 'RB', 'CDM']);

export interface Ratings { rating: Record<string, number>; motm: string }

// The most a keeper can be worth after facing `faced` shots on target.
export const keeperCap = (faced: number) => 6.5 + 0.5 * faced;
export const MOTM_MIN_FACED = 2;

export function matchRatings(m: LiveMatch, get: (id: string) => Player): Ratings {
  const rating: Record<string, number> = {};
  const minutes = Math.max(1, m.minute);
  // Where each player played (last known slot), for clean sheets.
  const posOf = new Map<string, string>();
  for (const s of m.sides) s.onPitch.forEach((id, k) => { if (id) posOf.set(id, FORMATIONS[s.tactics.formation].slots[k]?.pos ?? get(id).position); });
  const sideOf = new Map<string, 0 | 1>();
  m.sides.forEach((s, i) => { for (const id of [...s.onPitch, ...s.bench]) if (id) sideOf.set(id, i as 0 | 1); });
  for (const e of m.events) if (e.kind === 'sub' && e.inId) sideOf.set(e.inId, e.side);
  const keepers = new Map<string, 0 | 1>();

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
    if (pos === 'GK') keepers.set(id, i);
    rating[id] = v;
  }
  // Engine v2 logs every shot and (in the user's match) every decisive duel, so each counts for a little.
  for (const e of m.events) {
    const add = (id: string | undefined, d: number) => { if (id && rating[id] !== undefined) rating[id] += d; };
    if (e.kind === 'goal') { add(e.playerId, e.how === 'pen' ? 0.8 : 1.1); add(e.assistId, 0.6); }
    if (e.kind === 'save') { add(e.playerId, m.v === 2 ? 0.25 : 0.35); add(e.assistId, 0.08); }
    if (e.kind === 'miss') { add(e.playerId, m.v === 2 ? -0.06 : -0.15); add(e.assistId, 0.05); }
    if (e.kind === 'block') { add(e.playerId, -0.03); add(e.vs, 0.12); }
    if (e.kind === 'duel') { add(e.playerId, e.ok ? 0.06 : -0.03); add(e.vs, e.ok ? -0.05 : 0.06); }
    if (e.kind === 'foul') add(e.playerId, -0.03);
    if (e.kind === 'offside') add(e.playerId, -0.02);
    if (e.kind === 'yellow') add(e.playerId, -0.3);
    if (e.kind === 'red') add(e.playerId, -1.8);
  }
  // Subs who came on late get pulled towards 6.5.
  for (const e of m.events) if (e.kind === 'sub' && e.inId && rating[e.inId] !== undefined) {
    const share = Math.max(0.2, (90 - e.min) / 90);
    rating[e.inId] = 6.5 + (rating[e.inId] - 6.5) * share;
  }
  // Keepers: no better than the shots on target they actually faced allow.
  const faced = (i: 0 | 1) => m.stats[1 - i][2];
  for (const [id, i] of keepers) rating[id] = Math.min(rating[id], keeperCap(faced(i)));
  let motm = '', best = -1;
  for (const [id, v] of Object.entries(rating)) {
    const r = Math.round(Math.min(10, Math.max(4, v)) * 10) / 10;
    rating[id] = r;
    // The man of the match comes from the winning side when there is one.
    const i = sideOf.get(id) ?? 0;
    const k = keepers.get(id);
    if (k !== undefined && faced(k) < MOTM_MIN_FACED) continue;
    const bonus = m.goals[i] > m.goals[1 - i] ? 0.3 : 0;
    if (r + bonus > best) { best = r + bonus; motm = id; }
  }
  return { rating, motm };
}

// Season average from the career's running totals.
export const avgRating = (r: [number, number, number] | undefined) => (r && r[1] ? Math.round((r[0] / r[1]) * 100) / 100 : 0);
