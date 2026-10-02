// The lines the game events call so earned-only looks and earned credits land the moment they are won, without an
// import cycle (byline.ts, meta.ts and screens call these; lib/earned.ts and lib/wallet.ts register the handlers).
// No imports at runtime. Cosmetic and currency only: nothing here touches a board or a score.
import type { Save } from './save';

let hook: ((s: Save) => string[]) | null = null;
export const setEarnHook = (f: (s: Save) => string[]) => { hook = f; };
/** Call inside an update() mutator after the event moved the save. Returns the ids of looks newly granted. */
export const earnHook = (s: Save): string[] => { try { return hook ? hook(s) : []; } catch { return []; } };

/** Credits earned by play (lib/wallet.ts CREDITS_EARN). Each handler is idempotent per key and safe inside a draft. */
export interface CreditHooks {
  firstTier1(s: Save): void;            // the first Daily at Tier 1
  streak(n: number, s: Save): void;     // every 30th consecutive Daily
  firstWindow(s: Save): void;           // the referral's friend side, after the first finished window
}
let credits: CreditHooks | null = null;
export const setCreditHooks = (h: CreditHooks | null) => { credits = h; };
export const creditHook = <K extends keyof CreditHooks>(k: K, ...args: Parameters<CreditHooks[K]>) => {
  try { (credits?.[k] as ((...a: Parameters<CreditHooks[K]>) => void) | undefined)?.(...args); } catch { /* retried by the next event */ }
};
