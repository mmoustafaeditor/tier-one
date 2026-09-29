// Scouting uncertainty: players outside the user's league show a rating range until the scouts have watched them.
// Shortlisting a player puts the scouts on him; after 2 matchdays his real level is known.
// Screens sort and rank by the range's midpoint, never by the hidden true value (audit Part C).
import type { Career, Player } from '../model/types';
import { staffQ } from './economy';
import type { World } from './world';

const hash = (s: string) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 5);
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

export interface Estimate { exact: boolean; lo: number; hi: number; plo: number; phi: number }

function estimateWith(c: Career, p: Player, myLeague: string | undefined, hisLeague: string | undefined, width: number): Estimate {
  const watched = c.watch?.[p.id] !== undefined && now(c) - c.watch[p.id] >= 2;
  if (p.clubId === c.clubId || (myLeague && hisLeague === myLeague) || watched) return { exact: true, lo: p.rating, hi: p.rating, plo: p.potential, phi: p.potential };
  const off = hash(p.id) % (width + 1);
  const lo = Math.max(1, p.rating - off), hi = Math.min(99, lo + width);
  const pw = width + 4, poff = hash(`${p.id}p`) % (pw + 1);
  const plo = Math.max(lo, p.potential - poff), phi = Math.min(99, plo + pw);
  return { exact: false, lo, hi, plo, phi };
}

const widthFor = (c: Career) => Math.round(2 + (100 - staffQ(c.ops, 'scout')) / 10);

export function estimate(w: World, c: Career, p: Player): Estimate {
  const myLeague = w.clubs.find((x) => x.id === c.clubId)?.leagueId;
  const hisLeague = w.clubs.find((x) => x.id === p.clubId)?.leagueId;
  return estimateWith(c, p, myLeague, hisLeague, widthFor(c));
}

// Estimates for many players at once (the market sorts thousands): one club→league lookup for the lot.
export function estimateAll(w: World, c: Career, ps: Player[]): Map<string, Estimate> {
  const leagueOf = new Map(w.clubs.map((x) => [x.id, x.leagueId]));
  const myLeague = leagueOf.get(c.clubId);
  const width = widthFor(c);
  return new Map(ps.map((p) => [p.id, estimateWith(c, p, myLeague, leagueOf.get(p.clubId), width)]));
}

// What the scouts think the player is: the middle of the range (the true value when it's known).
export const estimateMid = (e: Estimate) => (e.lo + e.hi) / 2;
export const potentialMid = (e: Estimate) => (e.plo + e.phi) / 2;
