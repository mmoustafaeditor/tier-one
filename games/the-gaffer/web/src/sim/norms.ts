// What a club of its size normally has: the staff quality and facility levels every club starts with (economy.ts
// newOps). AI clubs play at this norm, so the user's staff and facilities count only as an edge (or a cost) against it:
// keeping the staff you inherit is neutral, hiring better is a real advantage (audit GF-002). Import-free apart from
// types and clamp, so the match engine can use it without a cycle.
import type { Club, ClubOps, StaffRole } from '../model/types';
import { clamp } from './rng';

export const staffNorm = (club: Club) => clamp(Math.round(35 + club.reputation * 0.35), 20, 90);
export const facilityNorm = (club: Club) => clamp(1 + Math.floor((club.reputation - 50) / 12), 1, 5);
export const staffEdge = (ops: ClubOps | undefined, club: Club | undefined, role: StaffRole) =>
  ops?.staff[role] && club ? ops.staff[role]!.quality - staffNorm(club) : 0;
