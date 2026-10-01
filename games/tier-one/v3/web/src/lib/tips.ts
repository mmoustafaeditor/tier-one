// Tips (CONCEPT4 §9): what a right Market call pays into the rest of the game. A Tip is a token; you hold up to three.
// Spend one in Career as a free extra (an extra DM or a tip-off) or in Practice as a free second opinion. Market calls
// earn them (lib/wireData.ts settleMarket); Career and Practice spend them through spendTip(). Nothing ranked ever
// reads a Tip. Lives in `save.tips` (optional; older saves load unchanged).
import { getSave, update, useSaveSel, type Save } from './save';

export const TIPS = { max: 3 } as const;
export type TipUse = 'extraDm' | 'tipoff' | 'second';
export interface TipsSave { n: number; got: number; spent: number; last?: { at: number; why: string } }
type Host = Save & { tips?: TipsSave };
const of = (s: Save): TipsSave => (s as Host).tips || { n: 0, got: 0, spent: 0 };
const draft = (s: Save): TipsSave => { const h = s as Host; return (h.tips = h.tips || { n: 0, got: 0, spent: 0 }); };

/** Tips held right now (0–3). */
export const tipsOf = (s: Save = getSave()) => Math.max(0, Math.min(TIPS.max, of(s).n | 0));
export const useTips = () => useSaveSel((s) => tipsOf(s));
/** Adds a Tip on the draft (inside update()). Returns false when the hand is already full (the Tip is not banked). */
export function grantTip(s: Save, why: string): boolean {
  const t = draft(s);
  if (t.n >= TIPS.max) return false;
  t.n++; t.got++; t.last = { at: Date.now(), why };
  return true;
}
/** Spends one Tip (Career: an extra DM or a tip-off; Practice: a second opinion). False when you hold none. */
export function spendTip(use: TipUse): boolean {
  if (tipsOf() <= 0) return false;
  let ok = false;
  update((s) => { const t = draft(s); if (t.n > 0) { t.n--; t.spent++; t.last = { at: Date.now(), why: 'spend:' + use }; ok = true; } });
  return ok;
}
