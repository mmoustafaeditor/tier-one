// The one line the game events call so earned-only looks (lib/catalog.ts `earn`) are granted the moment they are won:
// a Daily finishing (streaks), a window recorded or a Wire call settling (rank, rivalry trophies), a story chapter.
// No imports at runtime, so byline.ts, meta.ts and screens can call it without an import cycle; lib/earned.ts sets it.
// Cosmetic only: it adds ids to save.owned and nothing else.
import type { Save } from './save';

let hook: ((s: Save) => string[]) | null = null;
export const setEarnHook = (f: (s: Save) => string[]) => { hook = f; };
/** Call inside an update() mutator after the event moved the save. */
export const earnHook = (s: Save): string[] => { try { return hook ? hook(s) : []; } catch { return []; } };
