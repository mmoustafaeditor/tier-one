// V2.10 club looks: the app's ground colours (presentation only, META: the simulation never reads it). Look 0 is the
// free Semba teal; 1-3 come with the Supporter pack or cost LOOK_PRICE Semba Credits each, kept on this device.
import { spendCredits } from './wallet';

export const LOOK_PRICE = 250;
export const LOOK_SWATCH: [string, string][] = [['#0B3B35', '#7DEBCB'], ['#7A263A', '#95BFE5'], ['#0B3B5C', '#7DEBCB'], ['#A87612', '#0B2A26']];
const KEY = 'gaffer.looks.v1';

export function ownedLooks(): number[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v.filter((x) => [1, 2, 3].includes(x)) : []; } catch { return []; }
}
export function buyLook(id: number): boolean {
  if (![1, 2, 3].includes(id) || ownedLooks().includes(id) || !spendCredits(LOOK_PRICE)) return false;
  try { localStorage.setItem(KEY, JSON.stringify([...ownedLooks(), id])); } catch { /* the look lasts this session only */ }
  return true;
}
export const canUseLook = (id: number, supporter: boolean) => id === 0 || supporter || ownedLooks().includes(id);
