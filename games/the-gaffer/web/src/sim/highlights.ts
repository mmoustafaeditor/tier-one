// Match highlights, like Football Manager's (Commentary only / Key / Extended / Comprehensive / Full match). The engine
// plays every minute in full; this only decides what the live screen SHOWS of it, and for how long. Nothing here
// changes a result. A highlight is one passage of play: from the start of the move to a moment after its end, timed by
// the engine's own clock (flow `t`, seconds into the minute, since foundation step 3).
//   level 3 key: a goal, a penalty, a sending-off, a big chance (xG 0.25+)
//   level 2 extended: any shot, a corner, a free kick in range
//   level 1 comprehensive: a dangerous attack (a ball in behind, a cross, a counter)
import type { LiveMatch, MatchEvent } from './match';
import { N } from './engine/model';

export type HlMode = 0 | 1 | 2 | 3 | 4; // commentary only, key, extended, comprehensive, full match
export interface Highlight { level: 0 | 1 | 2 | 3; from: number; to: number } // seconds into the minute
const NEED: Record<HlMode, number> = { 0: 9, 1: 3, 2: 2, 3: 1, 4: 0 };
const LEAD = 18, TAIL = 3; // a passage starts this many seconds before its moment (the build-up) and ends a little after
const FINAL = new Set<number>([N.THR, N.CRS, N.CTR]); // a dangerous attack: a ball in behind, a cross, a counter (a duel on the wing alone is not)

const nowOf = (m: LiveMatch) => (e: MatchEvent) => e.min === m.minute && (e.plus ?? 0) === (m.plus ?? 0);

// The minute just played: its most important passage (or none).
export function highlightOf(m: LiveMatch): Highlight {
  const flow = m.flow ?? [];
  const now = m.events.filter(nowOf(m));
  let level: Highlight['level'] = 0, at = -1;
  const up = (l: Highlight['level'], t: number | undefined) => { if (l > level || (l === level && at < 0)) { level = l; at = t ?? 30; } };
  // Key moments from the event log (the flow has no cards); shots and set pieces from the flow, where their time is.
  if (now.some((e) => e.kind === 'goal' || e.kind === 'pen' || e.kind === 'red' || e.kind === 'nogoal')) {
    const g = flow.find((f) => f.k === 'g') ?? flow.find((f) => f.k === 'v' || f.k === 'm' || f.k === 'b' || f.k === 'f');
    up(3, g?.t);
  }
  if (now.some((e) => (e.kind === 'save' || e.kind === 'miss' || e.kind === 'block') && (e.xg ?? 0) >= 0.25)) up(3, flow.find((f) => f.k === 'v' || f.k === 'm' || f.k === 'b')?.t);
  for (const f of flow) {
    if (f.k === 'g' || f.k === 'v' || f.k === 'm' || f.k === 'b' || f.k === 'c') up(2, f.t);
    else if (f.k === 'f' && depthOfZone(f.s, f.z) >= 4) up(2, f.t);
    else if ((f.k === 'w' || f.k === 'l' || f.k === 'r') && f.n !== undefined && FINAL.has(f.n)) up(1, f.t);
  }
  if (!level) return { level: 0, from: 0, to: 0 };
  return { level, from: Math.max(0, at - LEAD), to: Math.min(60, at + TAIL) };
}
// The zone's column counted from the attacking side's own goal (0-5): 4 and 5 are the last third.
const depthOfZone = (s: 0 | 1, z: number) => (s === 0 ? Math.floor(z / 5) : 5 - Math.floor(z / 5));

// Is this minute shown on the pitch in this mode, and which seconds of it? Full match shows the whole minute.
export function shownOf(m: LiveMatch, mode: HlMode): { from: number; to: number } | null {
  if (mode === 4) return { from: 0, to: 60 };
  const h = highlightOf(m);
  return h.level >= NEED[mode] ? { from: h.from, to: h.to } : null;
}

// Full match, like FM: live play runs at the chosen speed; dead time (a corner or a free kick being set up, the ball
// out of play, a goal celebrated) is shown at DEAD_K of its length, so the picture never stands still for long. A stretch
// with no action for more than LIVE_GAP seconds of the engine's clock counts as dead beyond that. `at(t)` maps the
// engine's second to the minute's seconds on screen (at the chosen speed: × 1000 / rate ms), `len` = the minute's length.
const DEAD_K = 0.3, LIVE_GAP = 7;
export function squeeze(m: LiveMatch): { at: (t: number) => number; len: number } {
  const ts = [0, ...(m.flow ?? []).map((f) => f.t).filter((t): t is number => t !== undefined).map((t) => Math.max(0, Math.min(60, t))).sort((a, b) => a - b), 60];
  const knots: [number, number][] = [[0, 0]];
  for (let i = 1; i < ts.length; i++) {
    const g = ts[i] - ts[i - 1], live = Math.min(g, LIVE_GAP);
    knots.push([ts[i], knots[knots.length - 1][1] + live + (g - live) * DEAD_K]);
  }
  const len = knots[knots.length - 1][1];
  const at = (t: number) => {
    for (let i = 1; i < knots.length; i++) if (t <= knots[i][0]) { const [a0, b0] = knots[i - 1], [a1, b1] = knots[i]; return a1 > a0 ? b0 + ((t - a0) / (a1 - a0)) * (b1 - b0) : b1; }
    return len;
  };
  return { at, len: Math.max(1, len) };
}

// How long the minute takes on screen (ms): a highlight plays at `rate` × real time (FM's "match speed during
// highlights"); between highlights the clock runs on quickly; a full match squeezes its dead time (squeeze above).
export const BETWEEN_MS = 260;
export function minuteMs(m: LiveMatch, mode: HlMode, rate: number): number {
  if (mode === 4) return Math.round((squeeze(m).len * 1000) / rate);
  const s = shownOf(m, mode);
  return s ? Math.round(((s.to - s.from) * 1000) / rate) : BETWEEN_MS;
}
// The highlight speed for each pace setting (× real time): slow, normal, fast.
export const RATES = [1.5, 2.5, 4];
// The match speed bar (like FM's): any speed from RATE_MIN to RATE_MAX × real time, in RATE_STEP steps; the normal pace
// is RATES[1]. A saved pace (0-2) from before the bar is read as its rate.
export const RATE_MIN = 1, RATE_MAX = 6, RATE_STEP = 0.5;
export const rateOf = (p: { rate?: number; pace?: 0 | 1 | 2 }) => p.rate ?? RATES[p.pace ?? 1];
