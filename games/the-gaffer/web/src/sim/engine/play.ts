// Engine v2 — RESOLUTION layer: walks the possession graph second by second and appends canonical events.
// FULL play (the user's match) samples the two players in every contest, records the duel and the ball's path;
// FAST play (every other match) samples the contest's average odds and records only what the league tables and
// player stats need. Both walk the same graph with the same odds, so they agree by construction.
import type { Rng } from '../rng';
import { END, EV, F_GK, N, QUAL, QUAL_W, SHOTS, START, TUNE, shotEdges, type Duel, type Edge, type Model } from './model';
import type { LiveMatch, MatchEvent } from '../match';
import { chainOf } from './passes';

// The ball's path for the pitch (FULL only; nothing reads it back). Every stoppage carries its cause: a foul who
// brought down whom, a corner who put it out, a throw-in or goal kick who touched it last.
// k: p a pass (`p` to `q`, `ty` its kind: passes.ts),
// w a contest won by the attacker `p` against `q`, l lost: the defender `p` (side `s`) takes the ball off `q`, r lost but
// the ball kept: `p` is forced back by `q` and his side keeps it, f foul, g goal, v save, b block, m miss, ti throw-in,
// gk goal kick (the side `s` restarts), c a corner to `s`, o `s` caught offside. t: seconds into the minute when it
// happens; n: the engine node it happened at (model.ts N: the kind of action, e.g. a cross or a through ball).
export interface Flow { s: 0 | 1; z: number; k: string; p?: string; q?: string; ty?: string; t?: number; n?: number }
// The passes of a FULL match, counted (passes.ts plays them; nothing reads this back into a result). pl[id]: [attempted,
// completed, key passes (the ball to a shooter), long balls, crosses, received]; side: [attempted, completed] × 2;
// ln["a>b"]: passes a completed to b (the pass map).
export interface PassTally { pl: Record<string, number[]>; side: number[]; ln: Record<string, number> }
export const newPassTally = (): PassTally => ({ pl: {}, side: [0, 0, 0, 0], ln: {} });
// A contest lost with the ball handed over: how often the pass into it is what failed. Into a through ball, a cross,
// a long ball or a set-piece delivery it always is (cut out, won in the air, cleared); in midfield and around the box
// most are interceptions; on the wing (a dribble) and in build-up (pressed on the ball) fewer. The rest are tackles.
const FAILS: Record<number, number> = { [N.THR]: 1, [N.CRS]: 1, [N.LONG]: 1, [N.SETH]: 1, [N.CRN]: 1, [N.P0]: 0.75, [N.P1]: 0.75, [N.P2]: 0.75, [N.F1]: 0.75, [N.CTR]: 0.6, [N.B]: 0.5, [N.F0]: 0.35, [N.F2]: 0.35, [N.RHIGH]: 0.5 };

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
// gf-ref: the referee (engine/referee.ts) rules on every foul; `go` is where play goes from it:
// fk the engine's free-kick route, pen a penalty, adv advantage (the attack carries on), on no foul given, turn the
// defending side restarts. `turnover` counts throw-ins and goal kicks when the ball changes hands.
export type FoulGo = 'fk' | 'pen' | 'adv' | 'on' | 'turn';
export interface FoulAt { box: boolean; z: number; phase: 0 | 1 | 2 }
export interface Rules {
  foul(side: 0 | 1, id: string, victim: string | undefined, kind: 'foul' | 'tfoul' | 'pen', r: Rng, at?: FoulAt): { red: boolean; go: FoulGo }; // red = the model is stale
  event(e: MatchEvent): void;
  turnover?(s: 0 | 1, node: number, start: number, ev: number | undefined): 'ti' | 'gk' | void; // how the other side restarts
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

// How long the ball takes to reach the shooter (s), by kind of pass: he strikes it when it gets to him.
const FLIGHT: Record<string, number> = { g: 1.4, t: 2, c: 2.2, x: 2.2, l: 2.5 };

// gf-ref: with added time played on top of the 90, each regulation minute carries 55 s of the engine's clock, so a
// match (about 90 + 9 minutes) still plays the engine's calibrated 5,400 s.
export const TICK_SECS = 55;

// Seconds into the minute when an action that takes `t` seconds ends (`left` is the budget before it), within the minute.
const clockAt = (secs: number, left: number, t: number) => Math.max(0, Math.min(60, Math.round(secs - left + t)));

// Plays one minute (60 s of the match clock, carrying over what the last action overran).
// `rp`: the passes' own random stream (FULL play; passes.ts), so the result never depends on them.
export function playMinute(m: LiveMatch, r: Rng, model: () => Model, rules: Rules, full: boolean, rp?: Rng) {
  const b = m.ball!;
  const tl = m.tl!;
  let budget = (m.ref ? TICK_SECS : 60) + b.c; // gf-ref: a little less per minute, the added time makes it up
  const threat = [0, 0];
  const flow: Flow[] = [];
  const secs = budget;
  let cornerAfter: Flow | null = null;
  // Who has the ball (for the passes): the last man the previous minute's path left it with.
  const last = m.flow?.[m.flow.length - 1];
  let hold: string | undefined = last && last.s === b.s ? (last.k === 'p' ? last.q : last.k === 'w' || last.k === 'l' || last.k === 'r' ? last.p : undefined) : undefined;
  const ps = full && rp ? (m.ps ??= newPassTally()) : null;
  const tallyPass = (s: 0 | 1, p: string, q: string, ty: string, d: 1 | -1, done = true) => {
    if (!ps) return;
    const a = (ps.pl[p] ??= [0, 0, 0, 0, 0, 0]), b = (ps.pl[q] ??= [0, 0, 0, 0, 0, 0]);
    if (done) { a[0] += d; if (ty === 'l') a[3] += d; if (ty === 'x') a[4] += d; ps.side[s * 2] += d; }
    a[1] += d; b[5] += d; ps.side[s * 2 + 1] += d; ps.ln[`${p}>${q}`] = (ps.ln[`${p}>${q}`] ?? 0) + d;
  };
  let lastPass: { s: 0 | 1; p: string; q: string; ty: string; node: number } | null = null; // this node's last pass (a failed one is taken back)
  const passes = (s: 0 | 1, M: Model, node: number, target: string | undefined, t0: number, t1: number): { t: number; ty: string } | undefined => {
    if (!full || !rp) return;
    const t = m.sides[s].tactics;
    const c = chainOf(rp, M.actors[s], node, hold, target, t0, t1, t.passing ?? 1, t.tempo ?? 1);
    for (const x of c.passes) { flow.push({ s, z: 0, k: 'p', p: x.p, q: x.q, ty: x.ty, t: x.t, n: node }); tallyPass(s, x.p, x.q, x.ty, 1); }
    const lp = c.passes[c.passes.length - 1];
    lastPass = lp ? { s, p: lp.p, q: lp.q, ty: lp.ty, node } : null;
    hold = c.holder;
    return c.passes.length ? c.passes[c.passes.length - 1] : undefined;
  };
  let guard = 0;
  while (budget > 0 && guard++ < 400) {
    const M = model();
    const s = b.s, o = (1 - s) as 0 | 1;
    const at = M.att[s];
    const node = at.nodes[b.n];
    const nodeIx = b.n;
    let edge: Edge | null = null;
    let to = -1, dt = 0; // gf-ref: where play goes and the dead time, when the referee changes the engine's route
    let won: boolean | undefined;
    let aId: string | undefined, dId: string | undefined;
    let ax: number | undefined;
    const lastOn = hold; // who had the ball as this action began (for who put it out)
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
      const passT = passes(s, M, nodeIx, shooter, clockAt(secs, budget, 0), clockAt(secs, budget, 0) + 0.4);
      // The ball that set the shot up is a key pass (this node's own pass to the shooter, or the last one into him).
      const lp0 = lastPass as { p: string; q: string } | null; // (set inside passes() above)
      const kp = passT && lp0?.q === shooter ? lp0 : null;
      if (ps && kp) { const a = (ps.pl[kp.p] ??= [0, 0, 0, 0, 0, 0]); a[2]++; }
      hold = undefined;
      // (the shot is struck once the ball has reached him: its moment on the pitch, not its result)
      const shotT = Math.min(60, Math.max(clockAt(secs, budget, node.t), passT === undefined ? 0 : passT.t + (FLIGHT[passT.ty] ?? 1.4)));
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
      if (full) flow.push({ s, z, k: edge.ev === EV.GOAL ? 'g' : edge.ev === EV.SAVE ? 'v' : edge.ev === EV.BLOCK ? 'b' : 'm', p: shooter, t: shotT, n: nodeIx });
      if (edge.to === N.CRN) {
        const taker = m.sides[s].pieces.corners;
        rules.event({ min: m.minute, side: s, kind: 'corner', playerId: m.sides[s].onPitch.includes(taker) ? taker : '' });
        // (put out by the keeper's save or the man who blocked it)
        if (full) flow.push({ s, z: absZone(s, 5, z % 5 < 2 ? 0 : 4), k: 'c', p: m.sides[s].onPitch.includes(taker) ? taker : undefined, q: edge.ev === EV.SAVE ? at.keeper : edge.ev === EV.BLOCK ? b.d : undefined, t: shotT, n: nodeIx });
        hold = m.sides[s].onPitch.includes(taker) ? taker : undefined;
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
      // The passes in this action, before what ends it (a contest's own come with it, below).
      const foulEdge = edge.ev === EV.FOUL || edge.ev === EV.TFOUL || edge.ev === EV.PENFOUL;
      if (full && won === undefined && !foulEdge) passes(s, M, nodeIx, undefined, clockAt(secs, budget, 0), clockAt(secs, budget, node.t) - 0.5);
      // Fouls: the defender in the contest (or one of them) brings the attacker down.
      if (edge.ev === EV.FOUL || edge.ev === EV.TFOUL || edge.ev === EV.PENFOUL) {
        // gf-ref: a foul that leads to the free-kick node is placed now: in the box (a penalty) or outside it.
        let fk: Edge | null = null;
        if (edge.to === N.FK) fk = pickEdge(r, at.nodes[N.FK].alt);
        const box = edge.ev === EV.PENFOUL || fk?.ev === EV.PENFOUL;
        const d = node.duel ?? at.nodes[N.F1].duel!;
        const j = dId ? -1 : pickW(r, d.wf ?? d.wd); // [tactics v3] the aggressive roles in the contest foul more
        const fouler = dId ?? d.d[j]?.id ?? '';
        const victim = aId ?? d.a[pickW(r, d.wa)]?.id;
        // The ball goes to the man who is brought down (passes.ts: its own stream, so nothing above moves).
        if (full && won === undefined) passes(s, M, nodeIx, victim, clockAt(secs, budget, 0), clockAt(secs, budget, node.t) - 1);
        const fz = absZone(s, box ? 5 : COL[nodeIx] ?? 3, 2);
        let go: FoulGo = box ? 'pen' : 'fk';
        if (fouler) {
          const phase = nodeIx === N.B ? 0 : nodeIx >= N.P0 && nodeIx <= N.P2 ? 1 : 2;
          const call = rules.foul(o, fouler, victim, edge.ev === EV.TFOUL ? 'tfoul' : box ? 'pen' : 'foul', r, { box, z: fz, phase });
          if (call.red) m.dirty = true;
          go = call.go;
        }
        // gf-ref: the route from the referee's ruling.
        if (go === 'pen') { to = N.SHOT + 10; dt = TUNE.dead.PEN; }
        else if (go === 'fk') { to = fk && fk.ev !== EV.PENFOUL ? fk.to : edge.to === N.FK ? (r() < 0.2 ? N.SHOT + 9 : N.SETH) : edge.to; dt = edge.dt ?? 0; }
        else if (go === 'adv') { to = nodeIx; dt = 0; }
        else if (go === 'on') { to = N.FCH; dt = 0; }
        else { to = END; dt = TUNE.dead.FOUL; }
        if (full) { flow.push({ s, z: fz, k: 'f', p: victim, q: fouler || undefined, t: clockAt(secs, budget, node.t), n: nodeIx }); hold = go === 'turn' ? undefined : victim; }
      }
      if (edge.ev === EV.CORNER || (edge.to === N.CRN && edge.ev === undefined)) {
        const taker = m.sides[s].pieces.corners;
        rules.event({ min: m.minute, side: s, kind: 'corner', playerId: m.sides[s].onPitch.includes(taker) ? taker : '' });
        // after the contest that put it out: the defender in it (`q`) blocked or headed it behind
        if (full) cornerAfter = { s, z: absZone(s, 5, ax !== undefined && rowOf(ax) >= 2 ? 4 : 0), k: 'c', p: m.sides[s].onPitch.includes(taker) ? taker : undefined, q: dId, t: clockAt(secs, budget, node.t), n: nodeIx };
      }
      if (edge.ev === EV.OFFSIDE) {
        const d = node.duel!;
        const who = aId ?? d.a[pickW(r, d.wa)].id;
        rules.event({ min: m.minute, side: s, kind: 'offside', playerId: who });
        if (full) { flow.push({ s, z: absZone(s, COL[nodeIx] ?? 4, 2), k: 'o', p: who, t: clockAt(secs, budget, node.t), n: nodeIx }); hold = undefined; }
      }
      // Recording (FULL): the passes into the contest, duels that decide the story, zones, the ball's path.
      if (full && won !== undefined) {
        passes(s, M, nodeIx, aId, clockAt(secs, budget, 0), clockAt(secs, budget, node.t) - 0.8);
        const lane = nodeIx === N.F0 ? 0 : nodeIx === N.F2 ? 2 : nodeIx >= N.P0 && nodeIx <= N.P2 ? nodeIx - N.P0 : 1;
        const col = COL[nodeIx] ?? 3;
        const z = absZone(s, col, laneRow(lane, ax));
        const how = nodeIx === N.F0 || nodeIx === N.F2 ? 'wing' : nodeIx === N.F1 ? 'mid' : nodeIx === N.THR ? 'run' : nodeIx === N.CTR ? 'break'
          : nodeIx === N.RHIGH ? 'press' : nodeIx === N.CRS || nodeIx === N.CRN || nodeIx === N.SETH ? 'air'
          : nodeIx === N.B ? 'build' : ''; // [tactics v3] build-up duels the press WON: who won it back from whom
        if (how && aId && dId && (how !== 'build' || !won)) rules.event({ min: m.minute, side: s, kind: 'duel', playerId: aId, vs: dId, how, ok: won ? 1 : 0, z });
        if (nodeIx === N.B) { tl.bu[s * 2 + 1]++; if (won) tl.bu[s * 2]++; }
        if (nodeIx >= N.P0 && nodeIx <= N.P2) { tl.mid[s * 2 + 1]++; if (won) { tl.mid[s * 2]++; tl.ent[s * 3 + lane]++; threat[s] += 0.03; } }
        if (won) { b.a = aId; b.d = dId; } else b.d = dId;
        // Lost, but the ball stays with the attacking side (pressed back, recycled): not a turnover.
        const kept = !won && (to >= 0 ? to : edge.to) < END;
        flow.push(won ? { s, z, k: 'w', p: aId, q: dId, t: clockAt(secs, budget, node.t), n: nodeIx }
          : kept ? { s, z, k: 'r', p: aId, q: dId, t: clockAt(secs, budget, node.t), n: nodeIx }
          : { s: o, z, k: 'l', p: dId, q: aId, t: clockAt(secs, budget, node.t), n: nodeIx });
        hold = won || kept ? aId : dId;
        const lp = lastPass as { s: 0 | 1; p: string; q: string; ty: string; node: number } | null;
        if (!won && !kept && lp && lp.node === nodeIx && lp.q === aId && rp && rp() < (FAILS[nodeIx] ?? 0)) tallyPass(lp.s, lp.p, lp.q, lp.ty, -1, false);
      }
      if (cornerAfter) { flow.push(cornerAfter); hold = cornerAfter.p; cornerAfter = null; }
      if (full && edge.to === N.CTR) tl.ctr[s]++;
      if (full) {
        const col = COL[nodeIx] ?? 3;
        tl.zone[s * 30 + absZone(s, col, 2)] += node.t;
      }
    }
    if (to < 0) { to = edge.to; dt = edge.dt ?? 0; }
    budget -= node.t + dt;
    tl.poss[s] += node.t;
    // Hand-over: the other side starts a possession (settled, won in midfield, or won high up after a press).
    if (to >= END) {
      const st = to - END;
      const out = rules.turnover?.(s, nodeIx, st, edge.ev); // gf-ref: throw-ins and goal kicks
      // The pitch shows the restart: a throw-in on the touchline level with the action, a goal kick from the other side's box.
      // (`p`: the man of the side that put it out who touched it last: the one in the contest, or the one on the ball)
      if (full && out) flow.push({ s: o, z: out === 'gk' ? absZone(o, 0, 2) : absZone(s, COL[nodeIx] ?? 3, (flow.length & 1) * 4), k: out, p: aId ?? lastOn ?? undefined, t: clockAt(secs, budget, 0), n: nodeIx });
      if (full && st === 2) { tl.hi[o]++; threat[o] += 0.05; }
      b.s = o; b.n = START[st]; b.a = undefined; b.d = undefined;
      // A restart or a ball won without a contest: the next chain starts from where play does (a goal kick: the keeper).
      if (out || won !== false) hold = out === 'gk' ? M.actors[o].find((x) => x.f & F_GK)?.id : undefined;
    } else b.n = to;
  }
  b.c = Math.min(0, budget);
  if (full) {
    m.flow = flow;
    tl.mom.push(Math.round((threat[0] - threat[1]) * 100));
  }
}
