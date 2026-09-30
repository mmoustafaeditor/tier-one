// Timekeeping (gf-ref): halves, added time from what actually stopped play, extra time and the end of a match.
//
// The regulation clock is `m.minute` (1…90, then 91…120 in extra time). At the end of each period the fourth official
// shows the added time (`m.added[period]`), worked out from the period's events; those minutes are then played with
// the clock standing at 45, 90, 105 or 120 and `m.plus` counting them (events carry `plus`, shown as 45+2′).
import type { LiveMatch, MatchEvent } from '../match';
import { extraTimeFor } from '../competitions';

export const PERIOD_END = [45, 90, 105, 120];

// Seconds of play lost to each kind of stoppage (IFAB Law 7: substitutions, injuries, cards, goal celebrations,
// VAR checks and reviews, time-wasting). The base covers the ordinary stoppages every half has.
export const STOP = { base: [35, 60, 15, 25], goal: 45, sub: 25, window: 20, yellow: 20, red: 45, injury: 70, var: 50, ofr: 110, pen: 40, waste: 25 };

const periodOfMinute = (min: number) => (min <= 45 ? 0 : min <= 90 ? 1 : min <= 105 ? 2 : 3);

// Seconds lost in period p, from the event log.
export function stoppageSecs(m: LiveMatch, p: number): number {
  let s = STOP.base[p];
  let lastWin = -1;
  for (const e of m.events) {
    if (periodOfMinute(e.min) !== p || e.plus) continue;
    switch (e.kind) {
      case 'goal': s += STOP.goal; break;
      case 'sub': s += STOP.sub; if (e.min !== lastWin) { s += STOP.window; lastWin = e.min; } break;
      case 'yellow': s += e.how === 'waste' ? STOP.waste + STOP.yellow : STOP.yellow; break;
      case 'red': s += STOP.red; break;
      case 'injury': s += STOP.injury; break;
      case 'var': s += e.note?.includes(':ofr') ? STOP.ofr : STOP.var; break;
      case 'pen': s += STOP.pen; break;
      case 'nogoal': s += STOP.goal / 2; break;
    }
  }
  // A side running the clock down while ahead adds to it.
  if (p === 1) for (const i of [0, 1] as const) if (m.sides[i].tactics.waste && m.goals[i] > m.goals[1 - i]) s += 40;
  return s;
}

// The board: whole minutes, at least one (none needed only in extra time's first half), at most 12.
export function addedMinutes(m: LiveMatch, p: number): number {
  const secs = stoppageSecs(m, p);
  return Math.max(p === 2 ? 0 : 1, Math.min(12, Math.round(secs / 60)));
}

const added = (m: LiveMatch, p: number) => m.added?.[p];
// The regulation time of period p is over and its added time has been played.
export function periodOver(m: LiveMatch, p: number): boolean {
  const a = added(m, p);
  return m.minute === PERIOD_END[p] && a !== undefined && (m.plus ?? 0) >= a;
}

// A knockout tie level after 90 minutes needs extra time (or penalties).
export const knockout = (m: LiveMatch) => !!m.cup && !m.group;
export const needsExtra = (m: LiveMatch) => knockout(m) && extraTimeFor(m.cup) && m.goals[0] === m.goals[1];

// Before the next tick: move the clock on (a regular minute, or one more minute of added time).
export function tick(m: LiveMatch) {
  const p = PERIOD_END.indexOf(m.minute);
  if (p >= 0) {
    if (added(m, p) === undefined) showBoard(m, p); // a match saved before added time existed
    if ((m.plus ?? 0) < added(m, p)!) { m.plus = (m.plus ?? 0) + 1; return; }
  }
  m.minute++;
  m.plus = 0;
}

// After the tick that ends a period's regulation time: the fourth official holds up the board.
export function showBoard(m: LiveMatch, p: number) {
  const a = m.added ? [...m.added] : [];
  a[p] = addedMinutes(m, p);
  m.added = a;
}
export function afterTick(m: LiveMatch) {
  const p = PERIOD_END.indexOf(m.minute);
  if (p >= 0 && !m.plus && added(m, p) === undefined) showBoard(m, p);
}

// Normal time (and extra time when it was needed) is over: the match is decided, or goes to penalties.
export function playOver(m: LiveMatch): boolean {
  if (m.minute > 120) return true;
  if (periodOver(m, 3)) return true;
  if (periodOver(m, 1)) return !needsExtra(m);
  return false;
}
export const isOver = playOver;
export const isHalfTime = (m: LiveMatch) => periodOver(m, 0);
export const isExtraBreak = (m: LiveMatch) => periodOver(m, 1) && needsExtra(m);

// The minute on the scoreboard: 67′, 45+2′, 105+1′.
export const clockOf = (m: Pick<LiveMatch, 'minute' | 'plus'>): string => (m.plus ? `${m.minute}+${m.plus}` : `${m.minute}`);
export const minOf = (e: Pick<MatchEvent, 'min' | 'plus'>): string => (e.plus ? `${e.min}+${e.plus}` : `${e.min}`);
// A sortable time: 45+2 sorts after 45 and before 46.
export const atOf = (e: Pick<MatchEvent, 'min' | 'plus'>): number => e.min + (e.plus ? e.plus / 100 : 0);
