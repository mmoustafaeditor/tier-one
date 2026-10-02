// Post-match analysis (like FM's Analysis screen), read only from what the engine recorded: the event log (shots with
// their zone, xG and kind; contests between two players with their zone and who won; fouls) and the match tally
// (where the ball was, build-up, progression, final-third entries by lane, high turnovers, counters) and the engine's
// pass count (m.ps, engine/play.ts): each player's passes and the pass network. Zones are absolute (col from the home
// goal × 5 + row).
import type { LiveMatch } from './match';
import { FORMATIONS, fullTactics } from './tactics';
import { planOf, spotOf } from './engine/phases';

export type ShotRes = 'g' | 'v' | 'b' | 'm'; // goal, saved, blocked, missed
export interface AnaShot { side: 0 | 1; z: number; xg: number; res: ShotRes; how: string; min: number; pid: string; i: number }
export interface AnaPlayer { z: number[]; won: number; lost: number; shots: number; xg: number; goals: number; assists: number; fouls: number; saves: number }
export interface Analysis {
  me: 0 | 1;
  shots: AnaShot[];
  zone: number[];                 // [side*30 + zone]: seconds on the ball (the tally keeps the column only: row 2)
  poss: [number, number];
  ent: number[];                  // final-third entries [side*3 + lane], lane 0/1/2 = the attacker's left / centre / right
  bu: number[]; mid: number[];    // [side*2] got through, [side*2+1] tried
  hi: [number, number]; ctr: [number, number];
  players: Record<string, AnaPlayer>;
  passes?: AnaPasses;             // from the engine's pass count (missing in matches played before it)
}
// pl[id]: [attempted, completed, key passes, long balls, crosses, received]; side: [attempted, completed] × 2.
// net[side]: each man where his role puts him with the ball (x along the pitch from his own goal, y across, metres),
// sized by the passes he completed; links: completed passes between two men, both ways together.
export interface AnaNode { id: string; x: number; y: number; n: number }
export interface AnaPasses { side: number[]; pl: Record<string, number[]>; net: { nodes: AnaNode[]; links: { a: string; b: string; n: number }[] }[] }
const SHOT_KINDS = new Set(['goal', 'save', 'block', 'miss']);
const blank = (): AnaPlayer => ({ z: new Array(30).fill(0), won: 0, lost: 0, shots: 0, xg: 0, goals: 0, assists: 0, fouls: 0, saves: 0 });

export function analysisOf(m: LiveMatch, me: 0 | 1): Analysis {
  const players: Record<string, AnaPlayer> = {};
  const P = (id?: string) => (id ? (players[id] ??= blank()) : null);
  const at = (p: AnaPlayer | null, z?: number, w = 1) => { if (p && z !== undefined && z >= 0 && z < 30) p.z[z] += w; };
  const shots: AnaShot[] = [];
  m.events.forEach((e, i) => {
    if (SHOT_KINDS.has(e.kind)) {
      // A save is logged on the keeper's side, with the shooter in `by`.
      const side = (e.kind === 'save' ? 1 - e.side : e.side) as 0 | 1;
      const pid = e.kind === 'save' ? e.by ?? '' : e.playerId;
      const res: ShotRes = e.kind === 'goal' ? 'g' : e.kind === 'save' ? 'v' : e.kind === 'block' ? 'b' : 'm';
      if (e.z !== undefined) shots.push({ side, z: e.z, xg: e.xg ?? 0.05, res, how: e.how ?? 'box', min: e.min, pid, i });
      const p = P(pid);
      if (p) { p.shots++; p.xg += e.xg ?? 0; if (res === 'g') p.goals++; at(p, e.z, 2); }
      if (res === 'g' && e.assistId) P(e.assistId)!.assists++;
      if (res === 'v') { const k = P(e.playerId); if (k) { k.saves++; at(k, e.z); } } // the keeper (the shot was at his goal)
    } else if (e.kind === 'duel') {
      const a = P(e.playerId), d = P(e.vs);
      if (a) { if (e.ok) a.won++; else a.lost++; at(a, e.z); }
      if (d) { if (e.ok) d.lost++; else d.won++; at(d, e.z); }
    } else if (e.kind === 'foul') {
      const p = P(e.playerId);
      if (p) { p.fouls++; at(p, e.z); }
    }
  });
  const tl = m.tl;
  const passes = m.ps ? passesOf(m) : undefined;
  return {
    passes,
    me, shots, players,
    zone: tl?.zone ? [...tl.zone] : new Array(60).fill(0),
    poss: tl?.poss ? [tl.poss[0], tl.poss[1]] : [1, 1],
    ent: tl?.ent ? [...tl.ent] : new Array(6).fill(0),
    bu: tl?.bu ? [...tl.bu] : [0, 0, 0, 0], mid: tl?.mid ? [...tl.mid] : [0, 0, 0, 0],
    hi: tl?.hi ? [tl.hi[0], tl.hi[1]] : [0, 0], ctr: tl?.ctr ? [tl.ctr[0], tl.ctr[1]] : [0, 0],
  };
}

// Where the chances came from: each kind of shot (the engine's `how`) grouped as the screen shows it.
export const SOURCES: Record<string, 'open' | 'set'> = { box: 'open', cutback: 'open', header: 'open', through: 'open', counter: 'open', press: 'open', long: 'open', corner: 'set', set: 'set', fk: 'set', pen: 'set' };
export function sourcesOf(a: Analysis, side: 0 | 1): { how: string; n: number; xg: number; goals: number }[] {
  const by = new Map<string, { how: string; n: number; xg: number; goals: number }>();
  for (const s of a.shots) {
    if (s.side !== side) continue;
    const r = by.get(s.how) ?? { how: s.how, n: 0, xg: 0, goals: 0 };
    r.n++; r.xg += s.xg; if (s.res === 'g') r.goals++;
    by.set(s.how, r);
  }
  return [...by.values()].sort((p, q) => q.xg - p.xg);
}

// The pass network: who passed to whom, each man at his spot in the shape with the ball (where his role puts him).
function passesOf(m: LiveMatch): AnaPasses {
  const ps = m.ps!;
  const net = ([0, 1] as const).map((side) => {
    const sd = m.sides[side], t = fullTactics(sd.tactics), plan = planOf(t), slots = FORMATIONS[t.formation].slots;
    // A man's slot: where he is now, or where the man who came on for him is.
    const slotOf = new Map<string, number>();
    sd.onPitch.forEach((id, k) => { if (id) slotOf.set(id, k); });
    for (const e of m.events) if (e.kind === 'sub' && e.side === side && e.inId) { const k = sd.onPitch.indexOf(e.inId); if (k >= 0 && !slotOf.has(e.playerId)) slotOf.set(e.playerId, k); }
    const nodes: AnaNode[] = [];
    for (const [id, k] of slotOf) {
      const a = ps.pl[id];
      if (!a || !slots[k]) continue;
      const sp = spotOf(null, k, t, plan);
      nodes.push({ id, x: slots[k].pos === 'GK' ? 4 : 4 + sp.y * 0.95, y: 3 + sp.x * 0.62, n: a[1] });
    }
    const on = new Set(nodes.map((n) => n.id));
    const pair = new Map<string, { a: string; b: string; n: number }>();
    for (const [k, v] of Object.entries(ps.ln)) {
      const [a, b] = k.split('>');
      if (!on.has(a) || !on.has(b) || v <= 0) continue;
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      const x = pair.get(key) ?? { a, b, n: 0 };
      x.n += v; pair.set(key, x);
    }
    return { nodes, links: [...pair.values()].sort((p, q) => q.n - p.n) };
  });
  return { side: [...ps.side], pl: ps.pl, net };
}
