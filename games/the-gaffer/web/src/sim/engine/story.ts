// Engine v2 — STORY layer: why the match went the way it did, and what would change it.
// Everything here reads the same event log the score came from, plus the engine's own model for "what if":
// a suggestion is only made when the engine itself says it helps, and by how much.
import type { Player } from '../../model/types';
import { FORMATIONS, FORMATION_IDS, fitPenalty, fullTactics, type FormationId, type Tactics } from '../tactics';
import { SHOTS, type Model, type Rates, type ShotType } from './model';
import { expected, modelOf, outcome, reshape, setTactics, type LiveMatch } from '../match';
import { cohLevel } from '../cohesion';

type Lookup = (id: string) => Player;

export type Theme = 'centre' | 'wide' | 'behind' | 'counter' | 'press' | 'setpiece' | 'long' | 'pen';
export const THEME_OF: Record<ShotType, Theme> = {
  box: 'centre', cutback: 'wide', header: 'wide', through: 'behind', counter: 'counter', press: 'press', long: 'long',
  corner: 'setpiece', set: 'setpiece', fk: 'setpiece', pen: 'pen',
};
const THEMES: Theme[] = ['centre', 'wide', 'behind', 'counter', 'press', 'setpiece', 'long', 'pen'];
const byTheme = (xgBy: number[]) => {
  const o: Record<Theme, number> = { centre: 0, wide: 0, behind: 0, counter: 0, press: 0, setpiece: 0, long: 0, pen: 0 };
  SHOTS.forEach((s, i) => { o[THEME_OF[s]] += xgBy[i]; });
  return o;
};

// ---------- what-if ----------

// The players on the pitch re-slotted for another formation (keeper first, then the best fit for each slot).
export function reslot(onPitch: string[], formation: FormationId, get: Lookup): string[] {
  const ids = onPitch.filter(Boolean);
  const slots = FORMATIONS[formation].slots;
  const used = new Set<string>();
  const out: string[] = new Array(slots.length).fill('');
  const order = slots.map((sl, k) => ({ sl, k })).sort((a, b) => (a.sl.pos === 'GK' ? -1 : b.sl.pos === 'GK' ? 1 : 0));
  const drop = slots.length - ids.length;
  const skip = new Set(order.filter(({ sl }) => sl.pos !== 'GK').sort((a, b) => b.sl.y - a.sl.y).slice(0, drop).map((x) => x.k));
  for (const { sl, k } of order) {
    if (skip.has(k)) continue;
    const best = ids.filter((id) => !used.has(id)).sort((a, b) => (fitPenalty(get(a).position, sl.pos) - fitPenalty(get(b).position, sl.pos)) || get(b).rating - get(a).rating)[0];
    if (best) { out[k] = best; used.add(best); }
  }
  return out;
}

// A copy of the match with one side's tactics changed (formation changes re-slot the players), for evaluation only.
export function withTactics(m: LiveMatch, side: 0 | 1, patch: Partial<Tactics>, get: Lookup): LiveMatch {
  const s = m.sides[side];
  const tactics = { ...s.tactics, ...patch };
  const onPitch = patch.formation && patch.formation !== s.tactics.formation ? reslot(s.onPitch, patch.formation, get) : s.onPitch;
  const sides = [...m.sides] as LiveMatch['sides'];
  sides[side] = { ...s, tactics, onPitch };
  return { ...m, sides };
}

// Expected points for `side` over the rest of the match from the current score.
export function pointsLeft(m: LiveMatch, side: 0 | 1, R: Rates): number {
  const mins = Math.max(1, 90 - m.minute);
  const [w, d, l] = outcome(R.goals, mins, m.goals[0] - m.goals[1]);
  return side === 0 ? 3 * w + d : 3 * l + d;
}
export function winChance(m: LiveMatch, side: 0 | 1, R: Rates): number {
  const [w, , l] = outcome(R.goals, Math.max(1, 90 - m.minute), m.goals[0] - m.goals[1]);
  return side === 0 ? w : l;
}

export interface Tip {
  patch: Partial<Tactics>;  // exactly what to change
  key: keyof Tactics;       // the instruction (for the text)
  gain: number;             // expected points gained over the rest of the match
  win: [number, number];    // win chance now → with the change
  theme: Theme;             // where it helps
  ours: boolean;            // true: more of our chances of that kind; false: fewer of theirs
  dxg: number;              // xG per 90 of that kind, change
  a?: string; d?: string;   // the matchup behind it: attacker and defender
}

function candidates(t: Tactics, m: LiveMatch, side: 0 | 1): Partial<Tactics>[] {
  const f = fullTactics(t);
  const out: Partial<Tactics>[] = [];
  const step = <K extends 'pressing' | 'passing' | 'line' | 'width' | 'tempo'>(k: K) => { for (const d of [-1, 1]) { const v = f[k] + d; if (v >= 0 && v <= 2) out.push({ [k]: v } as Partial<Tactics>); } };
  for (const d of [-1, 1]) { const v = f.mentality + d; if (v >= -2 && v <= 2) out.push({ mentality: v }); }
  step('pressing'); step('passing'); step('line'); step('width'); step('tempo');
  out.push({ counter: !f.counter });
  for (const v of [0, 1, 2] as const) if (v !== f.fullback) out.push({ fullback: v });
  for (const v of [0, 1, 2, 3] as const) if (v !== f.striker) out.push({ striker: v });
  if (f.pressing >= 1) for (const v of [0, 1, 2, 3] as const) if (v !== f.trap) out.push({ trap: v });
  for (const v of [0, 1, 2] as const) if (v !== f.routine) out.push({ routine: v });
  if (m.goals[side] > m.goals[1 - side] && m.minute >= 60 && !f.waste) out.push({ waste: true });
  for (const fm of FORMATION_IDS) if (fm !== f.formation) out.push({ formation: fm });
  return out;
}

// The one or two changes the engine itself rates best for `side` right now, and why.
export function suggest(m: LiveMatch, side: 0 | 1, get: Lookup, n = 2, minGain = 0.02, allowed?: (p: Partial<Tactics>) => boolean): Tip[] {
  const base = expected(m, get);
  const p0 = pointsLeft(m, side, base), w0 = winChance(m, side, base);
  const t0 = [byTheme(base.xgBy[side]), byTheme(base.xgBy[1 - side])];
  const tips: Tip[] = [];
  for (const patch of candidates(m.sides[side].tactics, m, side)) {
    if (allowed && !allowed(patch)) continue;
    const m2 = withTactics(m, side, patch, get);
    const model = modelOf(m2, get);
    const R = expected(m2, get);
    const gain = pointsLeft(m2, side, R) - p0;
    if (gain < minGain) continue;
    const t1 = [byTheme(R.xgBy[side]), byTheme(R.xgBy[1 - side])];
    let theme: Theme = 'centre', ours = true, best = -1;
    for (const th of THEMES) {
      const up = t1[0][th] - t0[0][th], down = t0[1][th] - t1[1][th];
      if (up > best) { best = up; theme = th; ours = true; }
      if (down > best) { best = down; theme = th; ours = false; }
    }
    const [a, d] = matchup(model, side, theme, ours);
    tips.push({ patch, key: Object.keys(patch)[0] as keyof Tactics, gain, win: [w0, winChance(m2, side, R)], theme, ours, dxg: best, a, d });
  }
  tips.sort((x, y) => y.gain - x.gain);
  // One change per instruction.
  const seen = new Set<string>();
  return tips.filter((t) => (seen.has(t.key) ? false : (seen.add(t.key), true))).slice(0, n);
}

// The two players a theme turns on (from the model): e.g. our winger against their full-back.
function matchup(model: Model, side: 0 | 1, theme: Theme, ours: boolean): [string | undefined, string | undefined] {
  const at = model.att[ours ? side : 1 - side];
  const nd = at.nodes;
  const duel = theme === 'wide' ? [nd[7].duel!, nd[9].duel!].sort((x, y) => y.mean - x.mean)[0]
    : theme === 'behind' ? nd[10].duel : theme === 'counter' ? nd[15].duel : theme === 'press' ? nd[17].duel
    : theme === 'setpiece' ? nd[14].duel : nd[8].duel;
  if (!duel) return [undefined, undefined];
  return [duel.a[0]?.id || undefined, duel.d[0]?.id || undefined];
}

// Facing a human, the AI manager reads the match at half-time and makes the one change that helps it most
// (never a formation change: it keeps its shape).
export function aiRead(m: LiveMatch, side: 0 | 1, get: Lookup) {
  const tip = suggest(m, side, get, 1, 0.04, (p) => !p.formation && p.routine === undefined)[0];
  if (tip) setTactics(m, side, tip.patch, `read:${tip.theme}:${tip.ours ? 1 : 0}`);
}
export function applyTip(m: LiveMatch, side: 0 | 1, tip: Tip, get: Lookup) {
  if (tip.patch.formation) reshape(m, side, tip.patch.formation, get, 'tip');
  else setTactics(m, side, tip.patch, 'tip');
}

// ---------- why it happened ----------

export type Verdict = 'deserved' | 'robbed' | 'smash' | 'beaten' | 'even' | 'clinical' | 'wasteful' | 'level';
export interface Point {
  k: 'source' | 'midfield' | 'pressed' | 'pressing' | 'duel' | 'finish' | 'keeper' | 'tired' | 'red' | 'change' | 'theyChanged' | 'setpiece' | 'cohesion';
  me: boolean;              // about us (true) or them
  theme?: Theme;
  n?: number; of?: number;  // counts
  x?: number; y?: number;   // xG / percentages
  a?: string; d?: string;   // players
  min?: number;
  note?: string;
  good: boolean;            // good news for us
  w: number;                // salience
}
export interface Why { goals: [number, number]; xg: [number, number]; verdict: Verdict; points: Point[]; tips: Tip[] }

export function explain(m: LiveMatch, me: 0 | 1, get: Lookup, tips = true): Why {
  const them = (1 - me) as 0 | 1;
  const ev = m.events;
  const xg: [number, number] = [0, 0];
  const themes = [byTheme(new Array(SHOTS.length).fill(0)), byTheme(new Array(SHOTS.length).fill(0))];
  const shots = [0, 0];
  const onT = [0, 0];
  let saved = [0, 0]; // xG of shots on target that the keeper of side i saved
  for (const e of ev) {
    if (e.kind !== 'goal' && e.kind !== 'miss' && e.kind !== 'save' && e.kind !== 'block') continue;
    const s = e.kind === 'save' ? 1 - e.side : e.side;
    const th = THEME_OF[(e.how ?? 'box') as ShotType] ?? 'centre';
    xg[s] += e.xg ?? 0; themes[s][th] += e.xg ?? 0; shots[s]++;
    if (e.kind === 'goal' || e.kind === 'save') onT[s]++;
    if (e.kind === 'save') saved = saved.map((v, i) => (i === e.side ? v + (e.xg ?? 0) : v));
  }
  const gd = m.goals[me] - m.goals[them], xd = xg[me] - xg[them];
  const verdict: Verdict = gd > 0 ? (xd >= 0.35 ? 'deserved' : xd <= -0.5 ? 'smash' : m.goals[me] - xg[me] >= 1 ? 'clinical' : 'deserved')
    : gd < 0 ? (xd >= 0.5 ? 'robbed' : xd <= -0.35 ? 'beaten' : m.goals[me] - xg[me] <= -1 ? 'wasteful' : 'beaten')
    : Math.abs(xd) < 0.4 ? 'level' : xd > 0 ? 'wasteful' : 'even';
  const pts: Point[] = [];
  const tl = m.tl;
  // Where the danger came from (each side's main kind of chance).
  for (const [s, mine] of [[me, true], [them, false]] as const) {
    const tot = xg[s];
    const top = THEMES.map((th) => [th, themes[s][th]] as const).sort((a, b) => b[1] - a[1])[0];
    if (tot >= 0.4 && top[1] >= 0.3 && top[1] / tot >= 0.4) {
      const n = ev.filter((e) => (e.kind === 'goal' || e.kind === 'miss' || e.kind === 'block' ? e.side === s : e.kind === 'save' && e.side !== s) && THEME_OF[(e.how ?? 'box') as ShotType] === top[0]).length;
      pts.push({ k: top[0] === 'setpiece' ? 'setpiece' : 'source', me: mine, theme: top[0], x: top[1], y: Math.round(100 * top[1] / tot), n, good: mine, w: 1 + top[1] });
    }
  }
  // Midfield: how often each side got through it.
  if (tl && tl.mid[me * 2 + 1] >= 10 && tl.mid[them * 2 + 1] >= 10) {
    const a = Math.round(100 * tl.mid[me * 2] / tl.mid[me * 2 + 1]), b = Math.round(100 * tl.mid[them * 2] / tl.mid[them * 2 + 1]);
    if (Math.abs(a - b) >= 10) pts.push({ k: 'midfield', me: a > b, x: a, y: b, good: a > b, w: 0.8 + Math.abs(a - b) / 25 });
  }
  // Pressing: balls won high up.
  if (tl) {
    const hiT = tl.hi[them], hiM = tl.hi[me];
    const pxg = (s: number) => themes[s].press;
    if (hiT >= 4 && hiT >= 2 * hiM) pts.push({ k: 'pressed', me: false, n: hiT, x: pxg(them), good: false, w: 0.7 + hiT / 6 + pxg(them) });
    else if (hiM >= 4 && hiM >= 2 * hiT) pts.push({ k: 'pressing', me: true, n: hiM, x: pxg(me), good: true, w: 0.7 + hiM / 6 + pxg(me) });
  }
  // The matchup: the most one-sided pair of players.
  const pairs = new Map<string, { a: string; d: string; side: 0 | 1; won: number; n: number; how: string }>();
  for (const e of ev) {
    if (e.kind !== 'duel' || !e.vs || e.how === 'air') continue;
    const key = `${e.playerId}>${e.vs}`;
    const p = pairs.get(key) ?? { a: e.playerId, d: e.vs, side: e.side, won: 0, n: 0, how: e.how ?? '' };
    p.n++; if (e.ok) p.won++;
    pairs.set(key, p);
  }
  const best = [...pairs.values()].filter((p) => p.n >= 5).map((p) => ({ ...p, edge: Math.abs(p.won / p.n - 0.35) * Math.sqrt(p.n) }))
    .sort((x, y) => y.edge - x.edge)[0];
  if (best && best.edge >= 0.7) {
    const attackerMine = best.side === me, attWon = best.won / best.n >= 0.35;
    pts.push({ k: 'duel', me: attackerMine, a: best.a, d: best.d, n: attWon ? best.won : best.n - best.won, of: best.n, note: attWon ? 'att' : 'def', good: attackerMine === attWon, w: 0.8 + best.edge / 2 });
  }
  // Finishing and goalkeeping against the chances.
  for (const [s, mine] of [[me, true], [them, false]] as const) {
    const diff = m.goals[s] - xg[s];
    if (Math.abs(diff) >= 0.9) pts.push({ k: 'finish', me: mine, n: m.goals[s], x: xg[s], good: mine ? diff > 0 : diff < 0, w: 0.6 + Math.abs(diff) / 1.5 });
  }
  for (const [s, mine] of [[me, true], [them, false]] as const) {
    const prevented = saved[s] - 0; // xG the keeper of side s kept out
    const gk = m.sides[s].onPitch.find((id) => id && get(id).position === 'GK');
    const saves = ev.filter((e) => e.kind === 'save' && e.side === s).length;
    if (gk && saves >= 4 && prevented >= 0.9) pts.push({ k: 'keeper', me: mine, a: gk, n: saves, x: prevented, good: mine, w: 0.6 + prevented / 1.5 });
  }
  // Legs: a side that ran out of them.
  if (tl && tl.fit[me].length >= 5) {
    const f = tl.fit[me][tl.fit[me].length - 1], g = tl.fit[them][tl.fit[them].length - 1] ?? f;
    const late = ev.filter((e) => e.kind === 'goal' && e.min >= 70).map((e) => e.side);
    if (f <= g - 6 && late.includes(them)) pts.push({ k: 'tired', me: true, n: f, y: g, good: false, w: 1.1 });
    if (g <= f - 6 && late.includes(me)) pts.push({ k: 'tired', me: false, n: g, y: f, good: true, w: 1.1 });
  }
  // Red cards.
  for (const e of ev) if (e.kind === 'red') pts.push({ k: 'red', me: e.side === me, a: e.playerId, min: e.min, good: e.side !== me, w: 1.3 });
  // Changes: did ours work? Did theirs?
  const change = [...ev].reverse().find((e) => e.kind === 'tactic' && e.side === me && !e.note?.startsWith('talk') && e.min <= m.minute - 12 && e.min >= 5);
  if (change) {
    const rate = (from: number, to: number) => ev.filter((e) => e.min > from && e.min <= to && (e.kind === 'goal' || e.kind === 'miss' || e.kind === 'block' ? e.side === me : e.kind === 'save' && e.side !== me))
      .reduce((a, e) => a + (e.xg ?? 0), 0) / Math.max(1, to - from) * 90;
    const before = rate(Math.max(0, change.min - 30), change.min), after = rate(change.min, m.minute);
    if (Math.abs(after - before) >= 0.4) pts.push({ k: 'change', me: true, note: change.note, min: change.min, x: before, y: after, good: after > before, w: 0.9 + Math.abs(after - before) / 2 });
  }
  const theirs = [...ev].reverse().find((e) => e.kind === 'tactic' && e.side === them && e.note?.includes('|read'));
  if (theirs) pts.push({ k: 'theyChanged', me: false, note: theirs.note, min: theirs.min, good: false, w: 0.9 });
  // v2.4: the dressing room on the pitch. Cohesion is a real input (±2 levels); it makes the Why when it was big enough.
  const coh = m.sides[me].coh;
  if (coh !== undefined) {
    const lv = cohLevel(coh) - (m.sides[them].coh !== undefined ? cohLevel(m.sides[them].coh!) : 0);
    if (Math.abs(lv) >= 0.5) pts.push({ k: 'cohesion', me: true, n: Math.round(coh), x: Math.round(lv * 10) / 10, good: lv > 0, w: 0.5 + Math.abs(lv) * 0.5 });
  }
  pts.sort((a, b) => b.w - a.w);
  return {
    goals: [m.goals[me], m.goals[them]], xg: [Math.round(xg[me] * 10) / 10, Math.round(xg[them] * 10) / 10], verdict,
    points: pts.slice(0, 4),
    // At full time the advice is for the next meeting: the same line-ups from kick-off.
    tips: !tips ? [] : m.minute < 90 ? suggest(m, me, get, 2) : suggest({ ...m, minute: 0, goals: [0, 0], fit: Object.fromEntries(Object.keys(m.fit).map((id) => [id, 96])) }, me, get, 2),
  };
}
