// Engine v2 — RESOLUTION layer: walks the possession graph second by second and appends canonical events.
// FULL play (the user's match) samples the two players in every contest, records the duel and the ball's path;
// FAST play (every other match) samples the contest's average odds and records only what the league tables and
// player stats need. Both walk the same graph with the same odds, so they agree by construction.
import type { Rng } from '../rng';
import { END, EV, N, QUAL, QUAL_W, SHOTS, START, shotEdges, type Duel, type Edge, type Model } from './model';
import type { LiveMatch, MatchEvent } from '../match';

export interface Flow { s: 0 | 1; z: number; k: string; p?: string }
export interface Tally {
  poss: [number, number];   // in-play seconds on the ball
  zone: number[];           // [side*30 + zone]: seconds on the ball per zone (absolute: col from the home goal × 5 + row)
  bu: number[];             // build-up: [side*2] through, [side*2+1] tried
  mid: number[];            // progression through midfield: same layout
  hi: [number, number];     // balls won high up the pitch
  ctr: [number, number];    // counter-attacks launched
  ent: number[];            // final-third entries [side*3 + lane]
  mom: number[];            // per minute: home threat − away threat (×100)
  fit: number[][];          // [side][n]: mean outfield fitness every 15 minutes
}
export const newTally = (): Tally => ({
  poss: [0, 0], zone: new Array(60).fill(0), bu: [0, 0, 0, 0], mid: [0, 0, 0, 0], hi: [0, 0], ctr: [0, 0], ent: [0, 0, 0, 0, 0, 0], mom: [], fit: [[], []],
});

export interface Ball { s: 0 | 1; n: number; c: number; a?: string; d?: string; press?: boolean }

// What the rules layer does with a foul, a goal or a shot (match.ts): cards, send-offs, the score.
export interface Rules {
  foul(side: 0 | 1, id: string, victim: string | undefined, kind: 'foul' | 'tfoul' | 'pen', r: Rng): boolean; // true = a red card (model is stale)
  event(e: MatchEvent): void;
}

const pickW = (r: Rng, w: number[]) => { let u = r(); for (let i = 0; i < w.length; i++) { u -= w[i]; if (u <= 0) return i; } return w.length - 1; };
function pickEdge(r: Rng, es: Edge[]): Edge {
  let u = r();
  for (const e of es) { if (u < e.p) return e; u -= e.p; }
  return es[es.length - 1];
}

// Column (attacker's frame, 0 = own goal) of each node, for the ball's path and territory.
const COL: number[] = [1, 3, 2, 2, 2, 2, 4, 4, 4, 4, 5, 5, 4, 5, 5, 3, 2, 4];
const rowOf = (x: number) => Math.max(0, Math.min(4, Math.floor(x / 20)));
const laneRow = (lane: number, x?: number) => (x === undefined ? [1, 2, 3][lane] : lane === 1 ? 2 : rowOf(x));
export const absZone = (s: 0 | 1, col: number, row: number) => (s === 0 ? col * 5 + row : (5 - col) * 5 + (4 - row));

// Plays one minute (60 s of the match clock, carrying over what the last action overran).
export function playMinute(m: LiveMatch, r: Rng, model: () => Model, rules: Rules, full: boolean) {
  const b = m.ball!;
  const tl = m.tl!;
  let budget = 60 + b.c;
  const threat = [0, 0];
  const flow: Flow[] = [];
  let guard = 0;
  while (budget > 0 && guard++ < 400) {
    const M = model();
    const s = b.s, o = (1 - s) as 0 | 1;
    const at = M.att[s];
    const node = at.nodes[b.n];
    const nodeIx = b.n;
    let edge: Edge | null = null;
    let won: boolean | undefined;
    let aId: string | undefined, dId: string | undefined;
    let ax: number | undefined;
    if (node.shot !== undefined) {
      // A shot: the shooter from the chance's table, his finishing against their keeper.
      const i = node.shot, tab = at.shooters[i];
      const k = pickW(r, tab.w);
      const shooter = tab.ids[k];
      const q = i === 10 ? 1 : QUAL[pickW(r, QUAL_W)];
      edge = pickEdge(r, shotEdges(i, Math.min(0.95, tab.conv[k] * q)));
      const xg = Math.round(Math.min(0.95, at.xg[i] * q) * 100) / 100;
      const col = i === 6 || i === 9 ? 4 : 5;
      const actor = M.actors[s].find((x) => x.id === shooter);
      const z = absZone(s, col, i === 7 ? (r() < 0.5 ? 1 : 3) : actor ? Math.max(1, Math.min(3, rowOf(actor.x))) : 2);
      threat[s] += xg;
      let assist = full ? b.a : undefined;
      if (assist === shooter) assist = undefined;
      const how = SHOTS[i];
      if (edge.ev === EV.GOAL) {
        if (!full && i !== 9 && i !== 10 && r() < 0.72) {
          const cr = at.creators, w = cr.w.map((v, j) => (cr.ids[j] === shooter ? 0 : v));
          const tot = w.reduce((a, v) => a + v, 0);
          if (tot > 0) assist = cr.ids[pickW(r, w.map((v) => v / tot))];
        }
        if (i === 9 || i === 10) assist = undefined;
        rules.event({ min: m.minute, side: s, kind: 'goal', playerId: shooter, assistId: assist, how, xg, z, vs: at.keeper });
      } else if (edge.ev === EV.SAVE) rules.event({ min: m.minute, side: o, kind: 'save', playerId: at.keeper, by: shooter, assistId: assist, how, xg, z });
      else if (edge.ev === EV.BLOCK) rules.event({ min: m.minute, side: s, kind: 'block', playerId: shooter, how, xg, z, vs: full ? b.d : undefined });
      else rules.event({ min: m.minute, side: s, kind: 'miss', playerId: shooter, assistId: assist, how, xg, z });
      if (full) flow.push({ s, z, k: edge.ev === EV.GOAL ? 'g' : edge.ev === EV.SAVE ? 'v' : edge.ev === EV.BLOCK ? 'b' : 'm', p: shooter });
      if (edge.to === N.CRN) {
        const taker = m.sides[s].pieces.corners;
        rules.event({ min: m.minute, side: s, kind: 'corner', playerId: m.sides[s].onPitch.includes(taker) ? taker : '' });
      }
    } else {
      let u = r();
      for (const e of node.alt) { if (u < e.p) { edge = e; break; } u -= e.p; }
      if (!edge && node.duel) {
        const d: Duel = node.duel;
        let p = d.mean;
        if (full) {
          const i = pickW(r, d.wa), j = pickW(r, d.wd);
          p = d.p[i * d.d.length + j];
          aId = d.a[i].id; dId = d.d[j].id || undefined; ax = d.a[i].x;
        }
        won = r() < p;
        edge = pickEdge(r, won ? node.win! : node.lose!);
      } else if (!edge) edge = node.alt[node.alt.length - 1];
      // Fouls: the defender in the contest (or one of them) brings the attacker down.
      if (edge.ev === EV.FOUL || edge.ev === EV.TFOUL || edge.ev === EV.PENFOUL) {
        const d = node.duel ?? at.nodes[N.F1].duel!;
        const j = dId ? -1 : pickW(r, d.wd);
        const fouler = dId ?? d.d[j]?.id ?? '';
        const victim = aId ?? d.a[pickW(r, d.wa)]?.id;
        if (fouler) {
          const red = rules.foul(o, fouler, victim, edge.ev === EV.TFOUL ? 'tfoul' : edge.ev === EV.PENFOUL ? 'pen' : 'foul', r);
          if (red) m.dirty = true;
        }
        if (full) flow.push({ s, z: absZone(s, COL[nodeIx] ?? 3, 2), k: 'f', p: victim });
      }
      if (edge.ev === EV.CORNER || (edge.to === N.CRN && edge.ev === undefined)) {
        const taker = m.sides[s].pieces.corners;
        rules.event({ min: m.minute, side: s, kind: 'corner', playerId: m.sides[s].onPitch.includes(taker) ? taker : '' });
      }
      if (edge.ev === EV.OFFSIDE) {
        const d = node.duel!;
        rules.event({ min: m.minute, side: s, kind: 'offside', playerId: aId ?? d.a[pickW(r, d.wa)].id });
      }
      // Recording (FULL): duels that decide the story, zones, the ball's path.
      if (full && won !== undefined) {
        const lane = nodeIx === N.F0 ? 0 : nodeIx === N.F2 ? 2 : nodeIx >= N.P0 && nodeIx <= N.P2 ? nodeIx - N.P0 : 1;
        const col = COL[nodeIx] ?? 3;
        const z = absZone(s, col, laneRow(lane, ax));
        const how = nodeIx === N.F0 || nodeIx === N.F2 ? 'wing' : nodeIx === N.F1 ? 'mid' : nodeIx === N.THR ? 'run' : nodeIx === N.CTR ? 'break'
          : nodeIx === N.RHIGH ? 'press' : nodeIx === N.CRS || nodeIx === N.CRN || nodeIx === N.SETH ? 'air' : '';
        if (how && aId && dId) rules.event({ min: m.minute, side: s, kind: 'duel', playerId: aId, vs: dId, how, ok: won ? 1 : 0, z });
        if (nodeIx === N.B) { tl.bu[s * 2 + 1]++; if (won) tl.bu[s * 2]++; }
        if (nodeIx >= N.P0 && nodeIx <= N.P2) { tl.mid[s * 2 + 1]++; if (won) { tl.mid[s * 2]++; tl.ent[s * 3 + lane]++; threat[s] += 0.03; } }
        if (won) { b.a = aId; b.d = dId; } else b.d = dId;
        flow.push({ s: won ? s : o, z, k: won ? 'w' : 'l', p: won ? aId : dId });
      }
      if (full && edge.to === N.CTR) tl.ctr[s]++;
      if (full) {
        const col = COL[nodeIx] ?? 3;
        tl.zone[s * 30 + absZone(s, col, 2)] += node.t;
      }
    }
    budget -= node.t + (edge.dt ?? 0);
    tl.poss[s] += node.t;
    // Hand-over: the other side starts a possession (settled, won in midfield, or won high up after a press).
    if (edge.to >= END) {
      const st = edge.to - END;
      if (full && st === 2) { tl.hi[o]++; threat[o] += 0.05; }
      b.s = o; b.n = START[st]; b.a = undefined; b.d = undefined;
    } else b.n = edge.to;
  }
  b.c = Math.min(0, budget);
  if (full) {
    m.flow = flow;
    tl.mom.push(Math.round((threat[0] - threat[1]) * 100));
  }
}
