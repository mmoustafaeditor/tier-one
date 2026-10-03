// Rework §Q "Trust changes must show cause": the board's last few confidence moves, each with its reason (a result
// against what they expected, a press answer, a public claim settled, the weekly table check, the season plan, the
// season review). Recorded where confidence moves; read by Club › Board. Changes no number.
import type { Career } from '../model/types';

export type BoardWhy = 'result' | 'press' | 'claim' | 'table' | 'plan' | 'review';
export interface BoardNote { t: [number, number]; d: number; why: BoardWhy; club?: string; s?: string; derby?: boolean }
export const BOARD_LOG_MAX = 8;

// `next` is the board after the move; the log carries over from `prev` (several callers rebuild the board object).
export function noteBoard<B extends Career['board']>(prev: Career['board'], next: B, c: Pick<Career, 'season' | 'round'>, why: BoardWhy, extra?: Omit<BoardNote, 't' | 'd' | 'why'>): B {
  const log = prev.log ?? [];
  const d = Math.round((next.confidence - prev.confidence) * 10) / 10;
  if (!d) return log.length ? { ...next, log } : next;
  return { ...next, log: [{ t: [c.season, c.round] as [number, number], d, why, ...extra }, ...log].slice(0, BOARD_LOG_MAX) };
}
