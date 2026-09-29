// Cash, commitments and spending room (V2_DESIGN §3.6: "three numbers"). A signing with instalments costs the fee
// now AND lowers the spending room by every future instalment at once, so no deal can spend the same money twice.
// Kept free of other sim imports so transfers.ts and loans.ts can use it without an import cycle.
import type { Career } from '../../model/types';
import type { World } from '../world';
import { rcOf } from './state';

export const committed = (c: Career) => rcOf(c).commits.reduce((s, x) => s + x.amount, 0);
// Committed within the next season (the ones that fall due at the next season start).
export const committedNext = (c: Career) => rcOf(c).commits.filter((x) => x.season <= c.season + 1).reduce((s, x) => s + x.amount, 0);

// Spending room: cash minus everything we already owe. Every transfer and loan checks against this, never cash.
export function spendingRoom(w: World, c: Career): number {
  const club = w.clubs.find((x) => x.id === c.clubId);
  return (club?.budget ?? 0) - committed(c);
}

// The monthly wage bill we actually pay: loaned-in players cost only our share; loaned-out ones still cost theirs.
export function wageBillPaid(w: World, c: Career): number {
  const rc = rcOf(c);
  let bill = 0;
  for (const p of w.players) if (p.clubId === c.clubId) bill += p.wage * (rc.loans[p.id] && rc.loans[p.id].to === c.clubId ? rc.loans[p.id].share : 1);
  for (const [id, l] of Object.entries(rc.loans)) {
    if (l.from !== c.clubId) continue;
    const p = w.players.find((x) => x.id === id);
    if (p && p.clubId === l.to) bill += p.wage * (1 - l.share);
  }
  return bill;
}

export function wageRoom(w: World, c: Career): number {
  const club = w.clubs.find((x) => x.id === c.clubId);
  return (club?.wageCap ?? 0) - wageBillPaid(w, c);
}
