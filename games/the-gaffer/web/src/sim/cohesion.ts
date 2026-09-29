// V2.4 dressing room: the one number the match engine reads from it. Kept apart from sim/room.ts (and import-free) so the
// engine can use it without pulling the rest of the dressing room in.
//
// Team cohesion (0-100) belongs to the club (world.clubs[i].cohesion), so it stays with the club when the manager moves.
// Engine input (V2_DESIGN §3.2): (cohesion − 50) / 25 rating levels for the user's side, clamped to ±2. At 55 (a new
// career) that is +0.2; a settled, winning room near 85 is worth about +1.4; a room in pieces near 20 costs −1.2.
export const COH0 = 55;
export const COH_MAX_LEVEL = 2;
export const cohLevel = (cohesion: number) => Math.max(-COH_MAX_LEVEL, Math.min(COH_MAX_LEVEL, (cohesion - 50) / 25));
// The other side in the user's matches plays as a normal room (60, +0.4): cohesion above that is an edge, below it a cost.
export const AI_COH = 60;
export const cohesionOfClub = (clubs: { id: string; cohesion?: number }[], clubId: string) => clubs.find((x) => x.id === clubId)?.cohesion ?? COH0;
