// Scouting uncertainty: what the club knows about a player is a range, never a fake exact number (audit Part C).
// v2.5: the old binary reveal (a range, then exact after 2 matchdays on the shortlist) is replaced by the knowledge fog
// of sim/recruit/knowledge.ts: 0-100 per player, rising with scout assignments, the shortlist and matches against him,
// narrowing the range gradually and always around the truth. Screens sort and rank by the range's midpoint.
import type { Career, Player } from '../model/types';
import type { World } from './world';
import { estimateOf, type Estimate } from './recruit/knowledge';
import { rcOf } from './recruit/state';

export type { Estimate } from './recruit/knowledge';

const now = (c: Career) => c.season * 100 + c.round;

export const shortlisted = (c: Career, id: string) => (c.shortlist ?? []).includes(id);

export function toggleShortlist(c: Career, id: string): Career {
  if (shortlisted(c, id)) {
    const watch = { ...(c.watch ?? {}) };
    delete watch[id];
    return { ...c, shortlist: (c.shortlist ?? []).filter((x) => x !== id), watch };
  }
  return { ...c, shortlist: [...(c.shortlist ?? []), id], watch: { ...(c.watch ?? {}), [id]: now(c) } };
}

export const estimate = (w: World, c: Career, p: Player): Estimate => estimateOf(w, c, p);

// Estimates for many players at once (the market sorts thousands).
export function estimateAll(w: World, c: Career, ps: Player[]): Map<string, Estimate> {
  const rc = rcOf(c);
  return new Map(ps.map((p) => [p.id, estimateOf(w, c, p, rc)]));
}

// What the scouts think the player is: the middle of the range (the true value when it's known).
export const estimateMid = (e: Estimate) => (e.lo + e.hi) / 2;
export const potentialMid = (e: Estimate) => (e.plo + e.phi) / 2;
