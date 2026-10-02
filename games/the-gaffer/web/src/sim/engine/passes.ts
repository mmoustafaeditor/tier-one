// The passes inside each action (FULL play only). The engine resolves a possession as contests between players, one
// node of the graph every few seconds; this fills in how the ball got from the man who had it to the man in the next
// contest: a chain of passes between team-mates, each from where the passer stands to where the receiver stands, of
// the length the side's passing style plays, timed inside the node's own seconds. Like FM, the ball always goes to a
// player. It runs on its own random stream and reads nothing back into the result, so every score, stat and event is
// what it was without it (sim-tests/fingerprint.ts).
import type { Rng } from '../rng';
import { F_DEF, F_GK, F_MID, N, type Actor } from './model';

// A pass: from `p` to `q`, `t` seconds into the minute; `ty` g on the ground, l long, x a cross, t through, c cutback.
export interface Pass { p: string; q: string; t: number; ty: 'g' | 'l' | 'x' | 't' | 'c' }
export interface Pt { d: number; y: number } // metres: depth from the side's own goal, across from its left touchline

// Where an actor stands with the ball at `ballDepth` (the pitch's own rule, ui2/pitch/sim.ts target(): the team moves
// up with the ball, forwards lead and defenders hold a line behind).
export function standOf(a: Actor, ballDepth: number): Pt {
  const y = 3 + a.x * 0.62;
  if (a.f & F_GK) return { d: 7, y: 34 };
  const line = a.f & F_DEF ? 6 : a.f & F_MID ? 12 : 18;
  return { d: Math.min(103, 4 + a.y * 0.5 + Math.max(0, Math.min(30, (ballDepth - 35) * 0.6)) + line), y };
}
const dist = (a: Pt, b: Pt) => Math.hypot(a.d - b.d, a.y - b.y);

// Where the play of each node is (depth from own goal, lane: 0 left, 1 centre, 2 right).
const AREA: Partial<Record<number, number>> = {
  [N.B]: 22, [N.LONG]: 68, [N.P0]: 50, [N.P1]: 50, [N.P2]: 50, [N.F0]: 78, [N.F1]: 80, [N.F2]: 78, [N.THR]: 88,
  [N.CRS]: 92, [N.SETH]: 90, [N.CRN]: 95, [N.CTR]: 72, [N.RMID]: 50, [N.RHIGH]: 78,
};
const LANE: Partial<Record<number, number>> = { [N.P0]: 0, [N.P2]: 2, [N.F0]: 0, [N.F2]: 2 };
export const areaOf = (node: number): Pt => ({ d: AREA[node] ?? (node >= N.SHOT ? 90 : 50), y: [12, 34, 56][LANE[node] ?? 1] });

// The kind of pass a node's last ball is (the one into the contest).
const LAST: Partial<Record<number, Pass['ty']>> = { [N.LONG]: 'l', [N.THR]: 't', [N.CRS]: 'x', [N.SETH]: 'x', [N.CRN]: 'x' };
// Shots: the ball that sets each kind up (model.ts SHOTS order).
const SHOT_LAST: Pass['ty'][] = ['g', 'c', 'x', 't', 'g', 'g', 'g', 'x', 'x', 'g', 'g'];

// The chain of passes inside one node visit: from `holder` (who has the ball; unknown after a restart) to `target`
// (the man in this node's contest, or the shooter), between `t0` and `t1` seconds into the minute.
//   passing: 0 short, 1 mixed, 2 direct; tempo: 0 slow, 1 normal, 2 fast.
export function chainOf(r: Rng, team: Actor[], node: number, holder: string | undefined, target: string | undefined,
  t0: number, t1: number, passing: number, tempo: number): { passes: Pass[]; holder: string | undefined } {
  const out: Pass[] = [];
  const live = team.filter((a) => a.id);
  if (!live.length) return { passes: out, holder };
  const area = areaOf(node);
  const byId = (id: string | undefined) => (id ? live.find((a) => a.id === id) : undefined);
  // Nobody known on the ball (a restart, or a ball won back): the man nearest where the play starts has it.
  let h = byId(holder);
  if (!h) {
    const startAt: Pt = node === N.B ? { d: 15, y: 34 } : area;
    h = [...live].filter((a) => !(a.f & F_GK) || node === N.B).sort((p, q) => dist(standOf(p, startAt.d), startAt) - dist(standOf(q, startAt.d), startAt))[0];
  }
  const tgt = byId(target);
  const span = Math.max(0, t1 - t0);
  // How many passes fit: one every couple of seconds at the side's tempo; the last ball into a cross, a through ball
  // or a long ball is one pass of its own.
  const gap = [5.2, 4.4, 3.7][tempo] ?? 4.4;
  const typed = LAST[node] ?? (node >= N.SHOT ? SHOT_LAST[node - N.SHOT] : undefined);
  let n = node >= N.SHOT ? 0 : Math.max(0, Math.round(span / gap) - (tgt ? 1 : 0));
  if (typed && node < N.SHOT) n = Math.max(0, Math.min(n, 1)); // a quick lay-off at most before the delivery
  const ideal = [12, 16, 21][passing] ?? 16;
  let prev: Actor | undefined;
  const times: number[] = [];
  const total = n + (tgt && tgt.id !== h.id ? 1 : 0);
  for (let i = 0; i < total; i++) times.push(t0 + (span * (i + 0.6)) / (total + 0.4));
  for (let i = 0; i < n; i++) {
    const at = standOf(h, standOf(h, 50).d);
    const goal = tgt ? standOf(tgt, at.d) : area;
    let best: Actor | undefined, wsum = 0;
    const cand: [Actor, number][] = [];
    for (const c of live) {
      if (c.id === h.id || (tgt && c.id === tgt.id)) continue;
      if ((c.f & F_GK) && !(node === N.B && i === 0 && r() < 0.5)) continue;
      const cp = standOf(c, at.d), len = dist(at, cp);
      if (len < 5 || len > 34) continue;
      const lw = Math.exp(-(((len - ideal) / 8) ** 2));
      const prog = Math.exp((dist(at, goal) - dist(cp, goal)) / 14); // towards where the play is going
      const back = prev && c.id === prev.id ? 0.35 : 1;              // a one-two now and then
      const w = lw * prog * back;
      if (w > 0) { cand.push([c, w]); wsum += w; }
    }
    if (!wsum) break;
    let u = r() * wsum;
    for (const [c, w] of cand) { u -= w; if (u <= 0) { best = c; break; } }
    best ??= cand[cand.length - 1][0];
    const len = dist(at, standOf(best, at.d));
    out.push({ p: h.id, q: best.id, t: Math.round(times[out.length] * 10) / 10, ty: len > 32 ? 'l' : 'g' });
    prev = h; h = best;
  }
  if (tgt && tgt.id !== h.id) {
    const at = standOf(h, standOf(h, 50).d), len = dist(at, standOf(tgt, at.d));
    const ty = typed ?? (len > 32 ? 'l' : 'g');
    out.push({ p: h.id, q: tgt.id, t: Math.round((times[out.length] ?? t1) * 10) / 10, ty });
    h = tgt;
  }
  return { passes: out, holder: h.id };
}
