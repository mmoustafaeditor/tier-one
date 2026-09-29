// Story mode (HYBRID.md §7): the Career, told as a comeback. Chapters sit on the existing ranks so every save maps
// straight in; the finale asks for three Tier 1 windows once you're back at Tier One rank.
import { RANKS } from './career';
import type { Save, CareerSave } from './save';

export const CHAPTERS = ['blog', 'comeback', 'stringer', 'rival', 'chronicle', 'front'] as const;
export type ChapterId = typeof CHAPTERS[number];
export const FINALE_T1 = 3;

export interface Chapter { i: number; id: ChapterId; n: number; progress: number; goal: { windows: number; rep: number; t1?: number; haveW: number; haveRep: number; haveT1?: number } | null; done: boolean }

export function chapterFor(c: CareerSave): Chapter {
  const r = c.rank;
  if (r < RANKS.length - 1) {
    const [gw, grep] = RANKS[r + 1].gate;
    const pw = gw ? Math.min(1, c.windows / gw) : 1, pr = Math.min(1, Math.max(0, (c.rep - 40) / Math.max(1, grep - 40)));
    return { i: r, id: CHAPTERS[r], n: r + 1, progress: (pw + pr) / 2, goal: { windows: gw, rep: grep, haveW: c.windows, haveRep: Math.round(c.rep) }, done: false };
  }
  // Rank Tier One: the Chronicle wants you back; three Tier 1 windows and you own the front page.
  const t1 = c.t1Top ?? 0;
  if (t1 < FINALE_T1) return { i: 4, id: 'chronicle', n: 5, progress: t1 / FINALE_T1, goal: { windows: 0, rep: 0, t1: FINALE_T1, haveW: c.windows, haveRep: Math.round(c.rep), haveT1: t1 }, done: false };
  return { i: 5, id: 'front', n: 6, progress: 1, goal: null, done: true };
}
export function chapterOf(s: Save): Chapter | null { return s.career ? chapterFor(s.career) : null; }
