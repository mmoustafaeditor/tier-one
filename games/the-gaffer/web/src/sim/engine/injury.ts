// Injuries (foundation step 4): a player can be hurt by a foul, and every player has a hidden injury proneness.
//   proneness: from the player (a hash of his id, so it never changes and needs no save field) and his physique: a
//              strong player is a little harder to hurt. Mean about 1, from 0.5 to 1.8.
//   fouls:     the fouled player is hurt with a chance by offence: a careless foul rarely, a reckless one more often,
//              serious foul play often (match.ts rulesOf → after the minute).
//   the rest:  the per-minute background chance (tiredness, load, pressing) is scaled down by BG so that injuries a
//              season stay as they were (sim-tests/injuries.ts compares with the baseline).
import type { Player } from '../../model/types';
const hashS = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h; };

export const HURT: Record<string, number> = { careless: 0.0032, reckless: 0.018, sfp: 0.14, dogso: 0.004, spa: 0.004 };
export const BG = 0.64;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const PRONE = new Map<string, number>();
export function proneness(p: Player | undefined): number {
  if (!p) return 1;
  let v = PRONE.get(p.id);
  if (v !== undefined) return v;
  const u = (hashS(`inj:${p.id}`) % 1000) / 1000;
  v = clamp(0.55 + 0.9 * u - 0.3 * ((p.attrs[5] ?? 60) - 60) / 40, 0.5, 1.8);
  if (PRONE.size > 20000) PRONE.clear();
  PRONE.set(p.id, v);
  return v;
}
