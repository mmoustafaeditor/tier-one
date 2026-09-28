// Realism / balance settings (the old admin panel's multipliers, now in Settings for the player).
import type { Balance, Career } from '../model/types';

export const DEFAULT_BALANCE: Balance = { income: 1, wages: 1, prices: 1, injuries: 1, difficulty: 0, patience: 0 };
export const balanceOf = (c: Pick<Career, 'balance'> | null | undefined): Balance => ({ ...DEFAULT_BALANCE, ...(c?.balance ?? {}) });

export const MULTS = [0.5, 0.75, 1, 1.5, 2] as const;
export const INJURY_MULTS = [0, 0.5, 1, 2] as const;
// Board: sacked below this confidence during the season / at the end of it.
export const sackLine = (b: Balance) => [5, 12, 20][b.patience + 1];
export const seasonSackLine = (b: Balance) => [15, 25, 35][b.patience + 1];
// Opponent strength in the user's matches, in rating points.
export const oppBoost = (b: Balance) => b.difficulty * 3;
