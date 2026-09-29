// The engine contract (V2_DESIGN §3.3). A finished match hands the rest of the game ONE MatchRecord: the event log
// (the single source of truth), minutes per player, condition, ratings, man of the match, key moments and the Why.
// Every aftermath reducer (tables, fitness, morale, bans, injuries, player stats, ratings, board, records, the
// full-time card) reads this record, never the live engine state, and no screen works out a match's consequences.
import type { Career, LocalizedName, MatchRecordLite, Player } from '../model/types';
import type { LiveMatch, MatchEvent } from './match';
import { matchRatings } from './ratings';
import { explain, type Why } from './engine/story';

export interface KeyMoment { min: number; side: 0 | 1; kind: 'goal' | 'chance' | 'save' | 'red' | 'injury' | 'pen'; playerId: string; xg?: number; ev: number }

export interface MatchRecord {
  key: string; round: number; cup?: string; group?: boolean;
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
    if (e.kind === 'goal') out.push({ min: e.min, side: e.side, kind: 'goal', playerId: e.playerId, xg: e.xg, ev: i });
    else if (e.kind === 'red') out.push({ min: e.min, side: e.side, kind: 'red', playerId: e.playerId, ev: i });
    else if (e.kind === 'injury') out.push({ min: e.min, side: e.side, kind: 'injury', playerId: e.playerId, ev: i });
    else if (SHOT.has(e.kind) && (e.xg ?? 0) >= BIG_CHANCE) {
      // A save is logged on the keeper's side; the chance belongs to the shooter's.
      const side = (e.kind === 'save' ? 1 - e.side : e.side) as 0 | 1;
      out.push({ min: e.min, side, kind: e.how === 'pen' ? 'pen' : e.kind === 'save' ? 'save' : 'chance', playerId: e.kind === 'save' ? e.by ?? e.playerId : e.playerId, xg: e.xg, ev: i });
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
    key: m.key, round: m.round, cup: m.cup, group: m.group, clubs: [m.sides[0].clubId, m.sides[1].clubId],
    goals: [m.goals[0], m.goals[1]], pens: m.pens, xg: m.xg ? [m.xg[0], m.xg[1]] : [0, 0],
    events: m.events, minutes: minutesOf(m), condition: { ...m.fit }, played: [...m.played], sideOf,
    ratings: rt.rating, motm: rt.motm, moments: momentsOf(m),
    why: userSide >= 0 && m.full && m.tl ? explain(m, userSide as 0 | 1, get) : null,
    full: !!m.full,
  };
}

// Invariant: the score, shots and cards the screens show are the ones the log holds.
export function reconcile(r: MatchRecord): string[] {
  const out: string[] = [];
  for (const i of [0, 1] as const) {
    const g = r.events.filter((e) => e.kind === 'goal' && e.side === i).length;
    if (g !== r.goals[i]) out.push(`${r.key}: side ${i} has ${r.goals[i]} goals but ${g} in the log`);
  }
  return out;
}

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
  };
  return { ...c, matches: [lite, ...(c.matches ?? []).filter((x) => x.key !== r.key)].slice(0, MATCHES_KEPT) };
}
