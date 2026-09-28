// Transfer windows. Summer: the first three matchdays of a season. Winter: the three matchdays around mid-season.
// The last matchday of each window is deadline day. Free agents can be signed at any time.
import type { Career } from '../model/types';

export type TransferWindow = 'summer' | 'winter';
const roundsOf = (c: Career) => Math.max(...Object.values(c.fixtures).map((f) => f.length));
const mid = (c: Career) => Math.floor(roundsOf(c) / 2);

export function windowOf(c: Career): TransferWindow | null {
  if (c.round <= 2) return 'summer';
  if (c.round >= mid(c) - 1 && c.round <= mid(c) + 1) return 'winter';
  return null;
}

export const isDeadlineDay = (c: Career) => {
  const w = windowOf(c);
  return w === 'summer' ? c.round === 2 : w === 'winter' ? c.round === mid(c) + 1 : false;
};

// Matchdays until the window opens (0 = open now).
export function untilWindow(c: Career): number {
  if (windowOf(c)) return 0;
  if (c.round < mid(c) - 1) return mid(c) - 1 - c.round;
  return roundsOf(c) - c.round; // next summer
}

// Matchdays left in the open window, deadline day included.
export function windowLeft(c: Career): number {
  const w = windowOf(c);
  if (!w) return 0;
  return (w === 'summer' ? 2 : mid(c) + 1) - c.round + 1;
}
