// The engine contract (V2_DESIGN §3.3). A finished match hands the rest of the game ONE MatchRecord: the event log
// (the single source of truth), minutes per player, condition, ratings, man of the match, key moments and the Why.
// Every aftermath reducer (tables, fitness, morale, bans, injuries, player stats, ratings, board, records, the
// full-time card) reads this record, never the live engine state, and no screen works out a match's consequences.
import type { Career, LocalizedName, MatchRecordLite, Player } from '../model/types';
import type { LiveMatch, MatchEvent } from './match';
import { matchRatings } from './ratings';
import { explain, type Why } from './engine/story';

// gf-ref: cards, second yellows, penalties given, VAR reviews and disallowed goals are moments too.
export interface KeyMoment { min: number; plus?: number; side: 0 | 1; kind: 'goal' | 'chance' | 'save' | 'red' | 'injury' | 'pen' | 'yellow' | 'y2' | 'penGiven' | 'var' | 'nogoal'; playerId: string; xg?: number; ev: number; note?: string }

export interface MatchRecord {
  key: string; round: number; cup?: string; group?: boolean;
  comp?: string;                        // gf-ref: the competition (league id or cup id) whose rules apply
  clubs: [string, string];
  goals: [number, number]; pens?: [number, number];
  xg: [number, number];
  events: MatchEvent[];                 // the log itself: score, shots, cards, subs… are all counted from here
  minutes: Record<string, number>;      // who played how long
  condition: Record<string, number>;    // fitness at the final whistle
  played: string[];
  sideOf: Record<string, 0 | 1>;        // which side everyone who played was on
  ratings: Record<string, number>;
  motm: string;
  moments: KeyMoment[];                 // chances with xG ≥ 0.15, goals, penalties, big saves, red cards, injuries
  why: Why | null;                      // the user's matches: up to four causes and the engine's own suggestions
  full: boolean;
  ref?: MatchRecordLite['ref'];         // gf-ref: the referee and his numbers
}

const SHOT = new Set(['goal', 'miss', 'save', 'block']);
export const BIG_CHANCE = 0.15;

// Minutes on the pitch, from the substitutions, red cards and the clock.
export function minutesOf(m: LiveMatch): Record<string, number> {
  const end = Math.max(90, m.minute);
  const on = new Map<string, number>();
  const off = new Map<string, number>();
  const subIn = new Set(m.events.filter((e) => e.kind === 'sub' && e.inId).map((e) => e.inId!));
  for (const id of m.played) if (!subIn.has(id)) on.set(id, 0);
  for (const e of m.events) {
    if (e.kind === 'sub') { off.set(e.playerId, e.min); if (e.inId) on.set(e.inId, e.min); }
    if (e.kind === 'red') off.set(e.playerId, e.min);
  }
  const out: Record<string, number> = {};
  for (const id of m.played) out[id] = Math.max(0, Math.min(end, off.get(id) ?? end) - (on.get(id) ?? 0));
  return out;
}

export function momentsOf(m: LiveMatch): KeyMoment[] {
  const out: KeyMoment[] = [];
  m.events.forEach((e, i) => {
    const t = e.plus ? { min: e.min, plus: e.plus } : { min: e.min };
    if (e.kind === 'goal') out.push({ ...t, side: e.side, kind: 'goal', playerId: e.playerId, xg: e.xg, ev: i });
    else if (e.kind === 'red') out.push({ ...t, side: e.side, kind: e.how === '2y' ? 'y2' : 'red', playerId: e.playerId, ev: i, note: e.how });
    else if (e.kind === 'yellow') { if (!m.events.some((x, j) => j > i && x.kind === 'red' && x.how === '2y' && x.playerId === e.playerId && x.min === e.min)) out.push({ ...t, side: e.side, kind: 'yellow', playerId: e.playerId, ev: i, note: e.how }); }
    else if (e.kind === 'pen') out.push({ ...t, side: e.side, kind: 'penGiven', playerId: e.playerId, ev: i, note: e.note });
    else if (e.kind === 'var') out.push({ ...t, side: e.side, kind: 'var', playerId: e.playerId, ev: i, note: e.note });
    else if (e.kind === 'nogoal') out.push({ ...t, side: e.side, kind: 'nogoal', playerId: e.playerId, xg: e.xg, ev: i, note: e.note });
    else if (e.kind === 'injury') out.push({ ...t, side: e.side, kind: 'injury', playerId: e.playerId, ev: i });
    else if (SHOT.has(e.kind) && (e.xg ?? 0) >= BIG_CHANCE) {
      // A save is logged on the keeper's side; the chance belongs to the shooter's.
      const side = (e.kind === 'save' ? 1 - e.side : e.side) as 0 | 1;
      out.push({ ...t, side, kind: e.how === 'pen' ? 'pen' : e.kind === 'save' ? 'save' : 'chance', playerId: e.kind === 'save' ? e.by ?? e.playerId : e.playerId, xg: e.xg, ev: i });
    }
  });
  return out;
}

export function toRecord(m: LiveMatch, get: (id: string) => Player, userSide: 0 | 1 | -1): MatchRecord {
  const rt = matchRatings(m, get);
  const sideOf: Record<string, 0 | 1> = {};
  m.sides.forEach((s, i) => { for (const id of [...s.onPitch, ...s.bench]) if (id) sideOf[id] = i as 0 | 1; });
  for (const e of m.events) if (e.kind === 'sub') { sideOf[e.playerId] = e.side; if (e.inId) sideOf[e.inId] = e.side; }
  for (const e of m.events) if (e.kind !== 'save' && e.playerId && sideOf[e.playerId] === undefined) sideOf[e.playerId] = e.side;
  return {
    key: m.key, round: m.round, cup: m.cup, group: m.group, comp: m.cup ?? m.comp, clubs: [m.sides[0].clubId, m.sides[1].clubId],
    goals: [m.goals[0], m.goals[1]], pens: m.pens, xg: m.xg ? [m.xg[0], m.xg[1]] : [0, 0],
    events: m.events, minutes: minutesOf(m), condition: { ...m.fit }, played: [...m.played], sideOf,
    ratings: rt.rating, motm: rt.motm, moments: momentsOf(m),
    why: userSide >= 0 && m.full && m.tl ? explain(m, userSide as 0 | 1, get) : null,
    full: !!m.full,
    ...(m.ref ? { ref: { n: m.ref.n, strict: m.ref.strict, var: m.ref.var, fouls: [m.events.filter((e) => e.kind === 'foul' && e.side === 0).length, m.events.filter((e) => e.kind === 'foul' && e.side === 1).length] as [number, number], checks: m.ref.checks, reviews: m.ref.ofr, changed: m.ref.over } } : {}),
  };
}

// Invariant: the score, shots and cards the screens show are the ones the log holds.
export function reconcile(r: MatchRecord): string[] {
  const out: string[] = [];
  for (const i of [0, 1] as const) {
    const g = r.events.filter((e) => e.kind === 'goal' && e.side === i).length;
    if (g !== r.goals[i]) out.push(`${r.key}: side ${i} has ${r.goals[i]} goals but ${g} in the log`);
  }
  // gf-ref: a sent-off player does nothing after his red card, and nobody comes on for him.
  r.events.forEach((e, i) => {
    if (e.kind !== 'red') return;
    if (r.events.slice(i + 1).some((x) => (x.playerId === e.playerId && x.kind !== 'var') || x.assistId === e.playerId || x.inId === e.playerId)) out.push(`${r.key}: ${e.playerId} appears after his red card`);
  });
  return out;
}

// F09 (rework): the manager's last match at the club he manages now. `matches` is his own history (it follows him), so
// anything that talks about "our last match" (Today, the press, the dressing room) reads it through here.
export const lastMatchHere = (c: Pick<Career, 'matches' | 'clubId'>) => (c.matches ?? []).find((m) => m.home === c.clubId || m.away === c.clubId);

// What the career keeps of a user match after full time (the last few, newest first).
export const MATCHES_KEPT = 6;
export function keepRecord(c: Career, r: MatchRecord, get: (id: string) => Player | undefined, season: number): Career {
  const name = (id: string): LocalizedName => get(id)?.name ?? { en: '', ar: '' };
  const lite: MatchRecordLite = {
    key: r.key, season, round: r.round, cup: r.cup, home: r.clubs[0], away: r.clubs[1], goals: r.goals, pens: r.pens,
    xg: [Math.round(r.xg[0] * 100) / 100, Math.round(r.xg[1] * 100) / 100],
    scorers: r.events.filter((e) => e.kind === 'goal').map((e) => ({ side: e.side, pn: name(e.playerId), min: e.min })),
    motm: r.motm ? { pn: name(r.motm), rating: r.ratings[r.motm] ?? 0, side: r.sideOf[r.motm] ?? 0 } : undefined,
    why: (r.why?.points ?? []).slice(0, 3).map((p) => ({ k: p.k, good: p.good })),
    // gf-ref: the officials' part, kept with the match
    ...(r.ref ? { ref: r.ref } : {}),
    cards: r.events.filter((e) => e.kind === 'red' || (e.kind === 'yellow' && !r.events.some((x) => x.kind === 'red' && x.how === '2y' && x.playerId === e.playerId && x.min === e.min && (x.plus ?? 0) === (e.plus ?? 0))))
      .map((e) => ({ side: e.side, pn: name(e.playerId), min: e.min, ...(e.plus ? { plus: e.plus } : {}), k: e.kind === 'yellow' ? 'Y' as const : e.how === '2y' ? 'YR' as const : 'R' as const })),
    vars: r.events.filter((e) => e.kind === 'var').map((e) => ({ side: e.side, min: e.min, ...(e.plus ? { plus: e.plus } : {}), note: e.note ?? '', pn: name(e.playerId) })),
    nogoals: r.events.filter((e) => e.kind === 'nogoal').map((e) => ({ side: e.side, min: e.min, ...(e.plus ? { plus: e.plus } : {}), pn: name(e.playerId), why: e.note ?? '' })),
  };
  return { ...c, matches: [lite, ...(c.matches ?? []).filter((x) => x.key !== r.key)].slice(0, MATCHES_KEPT) };
}
