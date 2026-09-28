// Minute-by-minute match engine. Every match (AI or the user's) runs through it, so a live match, a quick result
// and the other games of the round follow the same rules. Each minute has its own seeded random stream, so a match
// resumed after the app was closed plays out the same way for the same decisions.
import type { Career, Player, Position } from '../model/types';
import { bell, clamp, makeRng, type Rng } from './rng';
import { playerOf, squadOf, type World } from './world';
import { balanceOf, oppBoost } from './balance';
import {
  BEATS, FORMATIONS, TRAP_VS, aiTactics, autoXI, available, formOf, setPieces, slotValue, xiFor, DEFAULT_TACTICS, type Tactics,
} from './tactics';

export type EventKind = 'goal' | 'miss' | 'save' | 'yellow' | 'red' | 'injury' | 'sub';
export interface MatchEvent {
  min: number; side: 0 | 1; kind: EventKind; playerId: string;
  assistId?: string; how?: 'pen' | 'fk' | 'corner'; out?: number; inId?: string;
}
// [possession %, shots, on target, corners, fouls, yellows, reds]
export type TeamStats = [number, number, number, number, number, number, number];
export type Talk = 0 | 1 | 2 | 3; // none, fire them up, calm down, focus

export interface SideState {
  clubId: string;
  ai: boolean;         // the computer manages this side (tactics and subs)
  autoSubs: boolean;   // the computer makes this side's subs (quick result)
  tactics: Tactics;
  talk: Talk;
  onPitch: string[];   // slot order; '' = slot empty after a red card or an injury with no subs left
  bench: string[];
  subs: number;
  pieces: { captain: string; penalties: string; freeKicks: string; corners: string };
  form: number;        // match-day form, ~0.92 … 1.08
  mods?: { fatigue: number; press: number; level: number }; // the user's courses and staff
  mastery?: number;    // how well the side knows its philosophy, 0-100
}

export interface LiveMatch {
  key: string;
  round: number;
  sides: [SideState, SideState];
  minute: number;
  goals: [number, number];
  events: MatchEvent[];
  stats: [TeamStats, TeamStats];
  possSum: number;     // sum of home possession share per minute
  fit: Record<string, number>;
  played: string[];    // everyone who got on the pitch
  cup?: string;        // cup id for a knockout tie: a draw goes to penalties
  group?: boolean;     // a cup group game: a draw stays a draw
  injuries?: number;   // injury chance × (balance settings, user's matches)
  pens?: [number, number];
  kicks?: [0 | 1, string, boolean][]; // shootout: side, taker, scored
}

export const SUBS_MAX = 5;
export const BENCH_MAX = 9;

const hash = (s: string) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 17);
export const rngFor = (key: string, minute: number) => makeRng(hash(`${key}:${minute}`));

const level = (squad: Player[]) => {
  const best = squad.map((p) => p.rating).sort((a, b) => b - a).slice(0, 11);
  return best.reduce((s, x) => s + x, 0) / Math.max(1, best.length);
};

function side(w: World, c: Career | null, clubId: string, oppLevel: number, form: number): SideState {
  const squad = squadOf(w, clubId);
  const mine = c?.clubId === clubId;
  const tactics: Tactics = mine ? (c!.tactics ?? DEFAULT_TACTICS) : aiTactics(squad, level(squad), oppLevel);
  const xi = mine ? xiFor(w, c!).xi : autoXI(squad, tactics.formation);
  const inXI = new Set(xi.map((p) => p.id));
  const bench = squad.filter((p) => !inXI.has(p.id) && available(p)).sort((a, b) => formOf(b) - formOf(a)).slice(0, BENCH_MAX);
  const sp = setPieces(xi, mine ? c!.tactics ?? DEFAULT_TACTICS : tactics, c?.season ?? 2026);
  return {
    clubId, ai: !mine, autoSubs: !mine,
    tactics: {
      formation: tactics.formation, mentality: tactics.mentality, pressing: tactics.pressing, passing: tactics.passing,
      fullback: tactics.fullback ?? 0, striker: tactics.striker ?? 0, trap: tactics.trap ?? 0, philosophy: tactics.philosophy ?? 'balanced',
    },
    mastery: mine ? c!.mastery?.[tactics.philosophy ?? 'balanced'] ?? 60 : 60,
    talk: 0, onPitch: xi.map((p) => p.id), bench: bench.map((p) => p.id), subs: 0,
    pieces: { captain: sp.captain.id, penalties: sp.penalties.id, freeKicks: sp.freeKicks.id, corners: sp.corners.id }, form,
    mods: mine ? {
      fatigue: (c!.coach?.courses.includes('conditioning') ? 0.85 : 1) * (1 - (c!.ops?.staff.fitness?.quality ?? 0) / 500),
      press: c!.coach?.courses.includes('gegenpress') ? 1.03 : 1,
      level: (c!.ops?.staff.assistant?.quality ?? 0) / 100, // a great assistant is worth up to one rating point
    } : undefined,
  };
}

export function startMatch(w: World, c: Career | null, home: string, away: string, key: string, round: number): LiveMatch {
  const r = rngFor(key, -1);
  const lh = level(squadOf(w, home)), la = level(squadOf(w, away));
  const sides: [SideState, SideState] = [side(w, c, home, la, 1 + bell(r) * 0.07), side(w, c, away, lh, 1 + bell(r) * 0.07)];
  // Balance settings: stronger or weaker opponents in the user's matches.
  const b = c && (home === c.clubId || away === c.clubId) ? balanceOf(c) : null;
  if (b?.difficulty) for (const s of sides) if (s.clubId !== c!.clubId) s.mods = { fatigue: s.mods?.fatigue ?? 1, press: s.mods?.press ?? 1, level: (s.mods?.level ?? 0) + oppBoost(b) };
  const fit: Record<string, number> = {};
  for (const s of sides) for (const id of [...s.onPitch, ...s.bench]) fit[id] = playerOf(w, id)!.fitness;
  return {
    key, round, sides, minute: 0, goals: [0, 0], events: [], possSum: 0, fit, injuries: b?.injuries ?? 1,
    stats: [[50, 0, 0, 0, 0, 0, 0], [50, 0, 0, 0, 0, 0, 0]], played: [...sides[0].onPitch, ...sides[1].onPitch],
  };
}

// ---------- strength and rates ----------

type Lookup = (id: string) => Player;

export function sideLevel(m: LiveMatch, i: 0 | 1, get: Lookup): number {
  const s = m.sides[i];
  const slots = FORMATIONS[s.tactics.formation].slots;
  let sum = 0, n = 0;
  s.onPitch.forEach((id, k) => {
    if (!id) return;
    sum += slotValue(get(id), slots[k]?.pos ?? 'CM', m.fit[id] ?? 100);
    n++;
  });
  const captainOn = s.onPitch.includes(s.pieces.captain) ? 0.5 : 0;
  // Missing players count as nothing: 10 men are weaker than 11.
  return n ? (sum / n) * (n / 11) ** 0.35 + captainOn + (s.mods?.level ?? 0) : 0;
}

const avgAttr = (m: LiveMatch, i: 0 | 1, a: number, get: Lookup) => {
  const ps = m.sides[i].onPitch.filter(Boolean).map(get).filter((p) => p.position !== 'GK');
  return ps.reduce((s, p) => s + p.attrs[a], 0) / Math.max(1, ps.length);
};

// Expected goals per 90 minutes for each side right now.
export function rates(m: LiveMatch, get: Lookup): [number, number] {
  const L = [sideLevel(m, 0, get), sideLevel(m, 1, get)];
  const d = L[0] - L[1];
  const x: [number, number] = [1.33 * Math.exp(0.058 * d), 1.06 * Math.exp(-0.058 * d)];
  for (const i of [0, 1] as const) {
    const me = m.sides[i], them = m.sides[1 - i], o = (1 - i) as 0 | 1;
    const f = FORMATIONS[me.tactics.formation], g = FORMATIONS[them.tactics.formation];
    x[i] *= (1 + 0.05 * f.attack) * (1 - 0.05 * g.defence) * me.form;
    x[i] *= 1 + 0.12 * me.tactics.mentality;
    x[o] *= 1 + 0.07 * me.tactics.mentality;
    if (me.tactics.pressing === 2) { x[i] *= 1.05 * (me.mods?.press ?? 1); x[o] *= 0.95; }
    if (me.tactics.pressing === 0) { x[i] *= 0.95; x[o] *= 0.97; }
    if (me.tactics.passing === 0) x[i] *= 1 + (avgAttr(m, i, 2, get) - 65) * 0.004;
    if (me.tactics.passing === 2) x[i] *= 1 + (avgAttr(m, i, 0, get) - 65) * 0.004;
    if (me.talk === 1) { x[i] *= 1.06; x[o] *= 1.03; }
    if (me.talk === 3) { x[i] *= 0.97; x[o] *= 0.94; }
    styleMods(m, i, L, x, get);
  }
  return [Math.max(0.05, x[0]), Math.max(0.05, x[1])];
}

// Philosophy, roles and pressing traps. A philosophy pays off with mastery; one that beats the opponent's adds 5%.
function styleMods(m: LiveMatch, i: 0 | 1, L: number[], x: [number, number], get: Lookup) {
  const me = m.sides[i], them = m.sides[1 - i], o = (1 - i) as 0 | 1;
  const t = me.tactics;
  const ph = t.philosophy ?? 'balanced', opp = them.tactics.philosophy ?? 'balanced';
  const k = (me.mastery ?? 60) / 100;
  const on = me.onPitch.filter(Boolean).map(get);
  const at = (pos: Position[], a: number) => { const ps = on.filter((p) => pos.includes(p.position)); return ps.length ? ps.reduce((s, p) => s + p.attrs[a], 0) / ps.length : 50; };
  if (ph === 'possession') { x[i] *= 1 + 0.04 * k; x[o] *= 1 - 0.03 * k; }
  if (ph === 'counter') { x[i] *= 1 + (L[i] < L[o] ? 0.06 : 0.02) * k; x[o] *= 1 - 0.02 * k; }
  if (ph === 'gegenpress') { x[i] *= 1 + 0.05 * k; x[o] *= 1 - 0.04 * k; }
  if (ph === 'bus') { x[i] *= 0.92; x[o] *= 1 - 0.1 * k; }
  if (ph === 'wings') x[i] *= 1 + (at(['LW', 'RW', 'LB', 'RB'], 0) >= 70 ? 0.05 : 0.01) * k;
  if (ph === 'direct') x[i] *= 1 + (Math.max(at(['ST'], 5), at(['ST'], 0)) >= 72 ? 0.05 : 0.01) * k;
  if (BEATS[ph].includes(opp)) x[i] *= 1.05;
  if (t.fullback === 1) { x[i] *= 1.03; x[o] *= 1.02; } else if (t.fullback === 2) x[i] *= 1.01; else x[o] *= 0.98;
  if (t.striker === 0 && at(['ST'], 0) >= 70) x[i] *= 1.02;
  if (t.striker === 1 && at(['ST'], 5) >= 72) x[i] *= 1.03;
  if (t.striker === 2 && at(['ST'], 2) >= 72) x[i] *= 1.02;
  if (t.striker === 3) x[o] *= 0.98;
  if (t.trap && t.pressing >= 1) { x[o] *= 0.97; if (TRAP_VS[opp] === t.trap) x[o] *= 0.95; }
}

// Win / draw / loss chances for the home side, from the current rates (E2E #15, #46: tactics change it).
export function predict(m: LiveMatch, get: Lookup): [number, number, number] {
  const [a, b] = rates(m, get);
  const pois = (l: number, k: number) => { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; };
  let win = 0, draw = 0, loss = 0;
  for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) {
    const p = pois(a, i) * pois(b, j);
    if (i > j) win += p; else if (i === j) draw += p; else loss += p;
  }
  const t = win + draw + loss;
  return [win / t, draw / t, loss / t];
}

// ---------- one minute ----------

const SCORE_WEIGHT: Record<Position, number> = { GK: 0, CB: 0.6, LB: 0.4, RB: 0.4, CDM: 0.7, CM: 1.4, CAM: 2.6, LW: 2.8, RW: 2.8, ST: 3.4 };
const ASSIST_WEIGHT: Record<Position, number> = { GK: 0.05, CB: 0.3, LB: 1, RB: 1, CDM: 0.8, CM: 2, CAM: 3.2, LW: 2.8, RW: 2.8, ST: 1.4 };

function weighted(r: Rng, ps: Player[], wt: (p: Player) => number): Player {
  const total = ps.reduce((s, p) => s + wt(p), 0);
  let x = r() * total;
  for (const p of ps) { x -= wt(p); if (x <= 0) return p; }
  return ps[ps.length - 1];
}

function sub(m: LiveMatch, i: 0 | 1, outId: string, inId: string) {
  const s = m.sides[i];
  const k = s.onPitch.indexOf(outId);
  if (k < 0 || s.subs >= SUBS_MAX || !s.bench.includes(inId)) return false;
  s.onPitch[k] = inId;
  s.bench = s.bench.filter((x) => x !== inId);
  s.subs++;
  if (!m.played.includes(inId)) m.played.push(inId);
  m.events.push({ min: m.minute, side: i, kind: 'sub', playerId: outId, inId });
  return true;
}

// Best bench player for a slot.
function bestIn(m: LiveMatch, i: 0 | 1, slotPos: Position, get: Lookup): string | null {
  const s = m.sides[i];
  const opts = s.bench.map(get).filter(available);
  if (!opts.length) return null;
  return opts.sort((a, b) => slotValue(b, slotPos, m.fit[b.id]) - slotValue(a, slotPos, m.fit[a.id]))[0].id;
}

export function userSub(m: LiveMatch, i: 0 | 1, outId: string, inId: string): boolean {
  return sub(m, i, outId, inId);
}

function aiDecisions(m: LiveMatch, i: 0 | 1, get: Lookup) {
  const s = m.sides[i];
  const diff = m.goals[i] - m.goals[1 - i];
  if (s.ai && (m.minute === 46 || m.minute === 75)) {
    if (diff < 0) s.tactics.mentality = Math.min(2, s.tactics.mentality + 1);
    else if (diff > 0 && m.minute === 75) s.tactics.mentality = Math.max(-1, s.tactics.mentality - 1);
  }
  // Fresh legs around the hour: swap the most tired outfield player when the bench has someone nearly as good.
  if (s.autoSubs && [58, 66, 72, 78, 84].includes(m.minute) && s.subs < SUBS_MAX) {
    const slots = FORMATIONS[s.tactics.formation].slots;
    const tired = s.onPitch
      .map((id, k) => ({ id, k }))
      .filter(({ id, k }) => id && slots[k].pos !== 'GK')
      .sort((a, b) => (m.fit[a.id] ?? 100) - (m.fit[b.id] ?? 100))[0];
    const inId = tired && bestIn(m, i, slots[tired.k].pos, get);
    if (tired && inId) {
      const now = slotValue(get(tired.id), slots[tired.k].pos, m.fit[tired.id]);
      const fresh = slotValue(get(inId), slots[tired.k].pos, m.fit[inId]);
      if (fresh >= now - 7) sub(m, i, tired.id, inId);
    }
  }
}

// Chance rates and side levels for this minute. Matches between two AI clubs (all but the user's, ~160 a matchday)
// reuse them for 3 minutes unless the line-ups change (sub, card, injury): a full season simulates about twice as fast.
// The user's match is always computed fresh, so a match resumed after a restart plays out exactly the same.
const STRENGTH = new WeakMap<LiveMatch, { key: string; x: [number, number]; L: [number, number] }>();
function strengthNow(m: LiveMatch, get: Lookup): { x: [number, number]; L: [number, number] } {
  const ai = m.sides[0].ai && m.sides[1].ai;
  const key = ai ? `${Math.floor(m.minute / 3)}|${m.events.length}|${m.sides[0].talk}${m.sides[1].talk}|${m.sides[0].tactics.mentality},${m.sides[1].tactics.mentality}` : '';
  const c = ai ? STRENGTH.get(m) : undefined;
  if (c && c.key === key) return c;
  const v = { key, x: rates(m, get), L: [sideLevel(m, 0, get), sideLevel(m, 1, get)] as [number, number] };
  if (ai) STRENGTH.set(m, v);
  return v;
}

// Possession leanings of a passing style and a shape.
const style = (p: 0 | 1 | 2) => (p === 0 ? 4 : p === 2 ? -4 : 0);
const shape = (x: Tactics) => (x.philosophy === 'possession' ? 5 : x.philosophy === 'bus' ? -6 : x.philosophy === 'counter' ? -4 : 0)
  + (x.fullback === 2 ? 3 : 0) + (x.striker === 2 ? 3 : 0);
// Overlapping full-backs and a pressing striker run more.
const runExtra = (p: Player, t: Tactics) => ((p.position === 'LB' || p.position === 'RB') && t.fullback === 1 ? 1.2 : p.position === 'ST' && t.striker === 3 ? 1.2 : 1);

export function stepMinute(m: LiveMatch, get: Lookup) {
  m.minute++;
  const r = rngFor(m.key, m.minute);
  for (const i of [0, 1] as const) aiDecisions(m, i, get);
  const { x: [xh, xa], L: [Lh, La] } = strengthNow(m, get);
  const t = [m.sides[0].tactics, m.sides[1].tactics];
  m.possSum += clamp(50 + (Lh - La) * 0.8 + style(t[0].passing) - style(t[1].passing) + (t[0].mentality - t[1].mentality) * 1.5 + shape(t[0]) - shape(t[1]), 25, 75);

  for (const i of [0, 1] as const) {
    const s = m.sides[i], o = (1 - i) as 0 | 1;
    const mine = s.onPitch.filter(Boolean).map(get);
    if (!mine.length) continue;
    const x = (i === 0 ? xh : xa) / 90;
    const st = m.stats[i];
    // Goals and chances
    if (r() < x) {
      const roll = r();
      let scorer: Player, assist: Player | undefined, how: MatchEvent['how'];
      const pen = get(s.pieces.penalties), fk = get(s.pieces.freeKicks), ck = get(s.pieces.corners);
      if (roll < 0.1 && s.onPitch.includes(pen.id)) { scorer = pen; how = 'pen'; }
      else if (roll < 0.14 && s.onPitch.includes(fk.id)) { scorer = fk; how = 'fk'; }
      else if (roll < 0.22 && s.onPitch.includes(ck.id)) {
        scorer = weighted(r, mine.filter((p) => p.id !== ck.id), (p) => (['CB', 'ST'].includes(p.position) ? 3 : 1) * (p.attrs[5] / 70));
        assist = r() < 0.6 ? ck : undefined; how = 'corner';
      } else {
        scorer = weighted(r, mine, (p) => SCORE_WEIGHT[p.position] * (p.attrs[1] / 70));
        if (r() < 0.72) assist = weighted(r, mine.filter((p) => p.id !== scorer.id), (p) => ASSIST_WEIGHT[p.position] * (p.attrs[2] / 70));
      }
      m.goals[i]++;
      st[1]++; st[2]++;
      m.events.push({ min: m.minute, side: i, kind: 'goal', playerId: scorer.id, assistId: assist?.id, how });
    } else if (r() < x * 7) {
      const shooter = weighted(r, mine, (p) => SCORE_WEIGHT[p.position]);
      st[1]++;
      const gkId = m.sides[o].onPitch.find((id) => id && get(id).position === 'GK');
      const gk = gkId ? get(gkId) : undefined;
      if (r() < 0.4) {
        st[2]++;
        if (gk && r() < 0.5) m.events.push({ min: m.minute, side: o, kind: 'save', playerId: gk.id });
      } else if (r() < 0.35) m.events.push({ min: m.minute, side: i, kind: 'miss', playerId: shooter.id });
    }
    if (r() < x * 3) st[3]++;
    // Fouls and cards
    const foulRate = 0.12 * (s.talk === 2 ? 0.7 : 1) * (s.tactics.pressing === 2 ? 1.25 : s.tactics.pressing === 0 ? 0.85 : 1);
    if (r() < foulRate) {
      st[4]++;
      const who = weighted(r, mine, (p) => (p.position === 'GK' ? 0.1 : p.position === 'ST' ? 0.6 : 1));
      const booked = m.events.some((e) => e.kind === 'yellow' && e.playerId === who.id);
      if (r() < 0.13) {
        st[5]++;
        m.events.push({ min: m.minute, side: i, kind: 'yellow', playerId: who.id });
        if (booked) sendOff(m, i, who.id);
      } else if (r() < 0.004) sendOff(m, i, who.id);
    }
    // Injuries
    if (r() < 0.0014 * (m.injuries ?? 1)) {
      const hurt = mine[Math.floor(r() * mine.length)];
      const out = r() < 0.12 ? 6 + Math.floor(r() * 7) : 1 + Math.floor(r() * 5);
      m.events.push({ min: m.minute, side: i, kind: 'injury', playerId: hurt.id, out });
      const k = s.onPitch.indexOf(hurt.id);
      const pos = FORMATIONS[s.tactics.formation].slots[k]?.pos ?? 'CM';
      const inId = s.subs < SUBS_MAX ? bestIn(m, i, pos, get) : null;
      if (inId) sub(m, i, hurt.id, inId); else s.onPitch[k] = '';
    }
    // Fatigue
    const press = (s.tactics.pressing === 2 ? 1.35 : s.tactics.pressing === 0 ? 0.75 : 1) * (s.mods?.fatigue ?? 1) * (s.tactics.philosophy === 'gegenpress' ? 1.1 : 1);
    for (const p of mine) m.fit[p.id] = Math.max(20, (m.fit[p.id] ?? 100) - (p.position === 'GK' ? 0.04 : 0.15 * press * runExtra(p, s.tactics)));
  }
  m.stats[0][0] = Math.round(m.possSum / m.minute);
  m.stats[1][0] = 100 - m.stats[0][0];
  if (m.minute === 90 && m.cup && !m.group && m.goals[0] === m.goals[1]) shootout(m, get);
}

// Knockout draw: five penalties each, then sudden death. Takers go by shooting, the set penalty taker first.
function shootout(m: LiveMatch, get: Lookup) {
  const r = rngFor(m.key, 91);
  const order = ([0, 1] as const).map((i) => {
    const s = m.sides[i];
    const on = s.onPitch.filter(Boolean).map(get);
    const first = on.find((p) => p.id === s.pieces.penalties);
    const rest = on.filter((p) => p !== first).sort((a, b) => (a.position === 'GK' ? 1 : 0) - (b.position === 'GK' ? 1 : 0) || b.attrs[1] - a.attrs[1]);
    return first ? [first, ...rest] : rest;
  });
  const keeper = (i: 0 | 1) => m.sides[i].onPitch.filter(Boolean).map(get).find((p) => p.position === 'GK');
  const pens: [number, number] = [0, 0];
  const kicks: [0 | 1, string, boolean][] = [];
  for (let k = 0; k < 30; k++) {
    for (const i of [0, 1] as const) {
      const taker = order[i][k % Math.max(1, order[i].length)];
      if (!taker) continue;
      const gk = keeper((1 - i) as 0 | 1);
      const p = clamp(0.74 + (taker.attrs[1] - 70) * 0.004 - ((gk?.attrs[6] ?? 60) - 70) * 0.003, 0.5, 0.92);
      const scored = r() < p;
      if (scored) pens[i]++;
      kicks.push([i, taker.id, scored]);
    }
    const n = k + 1;
    if (n <= 5) {
      // Stop early once one side can't catch up.
      if (pens[0] > pens[1] + (5 - n) || pens[1] > pens[0] + (5 - n)) break;
    } else if (pens[0] !== pens[1]) break;
  }
  m.pens = pens;
  m.kicks = kicks;
}

// Who went through: goals, then penalties.
export const winnerOf = (m: LiveMatch): 0 | 1 =>
  m.goals[0] !== m.goals[1] ? (m.goals[0] > m.goals[1] ? 0 : 1) : ((m.pens?.[0] ?? 0) >= (m.pens?.[1] ?? 0) ? 0 : 1);

function sendOff(m: LiveMatch, i: 0 | 1, id: string) {
  m.stats[i][6]++;
  m.events.push({ min: m.minute, side: i, kind: 'red', playerId: id });
  const k = m.sides[i].onPitch.indexOf(id);
  if (k >= 0) m.sides[i].onPitch[k] = '';
}

export function simulate(m: LiveMatch, get: Lookup, until = 90) {
  while (m.minute < until) stepMinute(m, get);
}

export const isUserSide = (m: LiveMatch, c: Career) => (m.sides[0].clubId === c.clubId ? 0 : m.sides[1].clubId === c.clubId ? 1 : -1);
