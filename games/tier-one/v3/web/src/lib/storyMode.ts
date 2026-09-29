// Story mode (HYBRID.md §7): the Career, told as a comeback. Chapters sit on the existing ranks so every save maps
// straight in; the finale asks for three Tier 1 windows once you're back at Tier One rank.
import { RANKS, type CareerReport } from './career';
import type { Result } from './engine';
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

// ---------- story beats (HYBRID.md §7): the editor's inbox and the rivals' taunts after each Career window.
export type BeatFrom = 'editor' | 'tabloid' | 'itk' | 'insider';
export interface Beat { from: BeatFrom; key: string; v?: Record<string, string | number> }
const RIVAL_IDS = ['tabloid', 'itk', 'insider'];
// Follower milestones that earn an inbox line. 38,200 is what the prologue cost you.
export const BEAT_FOLLOWERS = [1000, 5000, 10000, 38200, 50000, 100000, 250000];

// One-time beats carry an id in save.story.beats; repeatable ones return ''.
export function beatOnce(b: Beat): string {
  if (b.key === 'firstRight' || b.key === 'firstExcl' || b.key === 'finale') return b.key;
  if (/^promo\d$/.test(b.key)) return b.key;
  if (b.key === 'followers' || b.key === 'followersBack') return 'followers.' + (b.v?.m ?? '');
  return '';
}
// The i18n key for a beat's line; the sender's name is `g.story.from.<from>`.
export const beatKey = (b: Beat) => 'g.story.beat.' + b.key;

/** The 0–2 most relevant lines for a finished Career window. Call it after applyWindow(c, …) returned `rep`. */
export function storyBeats(c: CareerSave, res: Result, rep: CareerReport): Beat[] {
  const out: Beat[] = [];
  const name = (i: number) => res.cast?.[i]?.player.n || '';
  const called = res.per.filter((p) => p.call);
  const right = called.filter((p) => p.right), excl = right.filter((p) => p.excl);
  // 1. Promotion: a new chapter.
  if (rep.promoted != null) out.push({ from: 'editor', key: 'promo' + rep.promoted, v: { rank: rep.promoted } });
  // 2. Tier 1 at the top rank: the finale count.
  if (res.tier === 'T1' && c.rank === RANKS.length - 1) {
    const n = c.t1Top ?? 0;
    out.push(n >= FINALE_T1 ? { from: 'editor', key: 'finale' } : { from: 'editor', key: 't1Top', v: { n, of: FINALE_T1 } });
  }
  // 3. A big miss: a wrong Confirmed. The tabloid never lets it go.
  const miss = called.find((p) => !p.right && p.call!.s === 2);
  if (miss) out.push(name(miss.i) ? { from: 'tabloid', key: 'bigMiss', v: { p: name(miss.i) } } : { from: 'tabloid', key: 'bigMiss0' });
  // 4. A rival beat you to a story you had right.
  const beat = res.per.find((p) => p.why === 'beaten' && p.firstRight && RIVAL_IDS.includes(p.firstRight.id));
  if (beat) out.push({ from: beat.firstRight!.id as BeatFrom, key: 'beaten', v: { p: name(beat.i), d: beat.firstRight!.day } });
  // 5. Firsts (counters are already updated by applyWindow).
  if (excl.length && c.exclusives === excl.length) out.push({ from: 'editor', key: 'firstExcl', v: { p: name(excl[0].i) } });
  else if (right.length && c.right === right.length) out.push({ from: 'editor', key: 'firstRight' });
  // 6. A follower milestone crossed this window.
  const before = c.followers - rep.followers;
  const m = [...BEAT_FOLLOWERS].reverse().find((x) => before < x && c.followers >= x);
  if (m) out.push({ from: 'editor', key: m === 38200 ? 'followersBack' : 'followers', v: { m, n: c.followers } });
  // 7. Nothing happened: the editor still has an opinion.
  if (!out.length) out.push({ from: 'editor', key: !called.length ? 'quiet' : res.tier === 'T1' || res.tier === 'T2' ? 'solid' : 'meh' });
  return out.slice(0, 2);
}

/** Append beats to the inbox (last 30 kept) and mark the one-time ones. Returns the beats actually added. */
export function pushBeats(s: Save, beats: Beat[]): Beat[] {
  const st = (s.story = s.story || {});
  const seen = (st.beats = st.beats || {});
  const inbox = st.inbox || [];
  const added: Beat[] = [];
  const at = Date.now();
  for (const b of beats) {
    const id = beatOnce(b);
    if (id && seen[id]) continue;
    if (id) seen[id] = at;
    inbox.push({ at, from: b.from, key: b.key, ...(b.v ? { v: b.v } : {}) });
    added.push(b);
  }
  st.inbox = inbox.slice(-30);
  return added;
}

// What a chapter opens: new sources and rivals versus the chapter before (chapters 1–5 are ranks 0–4).
export function chapterNew(i: number): { src: string[]; rivals: string[] } {
  if (i > RANKS.length - 1) return { src: [], rivals: [] };
  const prev = i > 0 ? RANKS[i - 1] : { src: [] as string[], rivals: [] as string[] };
  return { src: RANKS[i].src.filter((k) => !prev.src.includes(k)), rivals: RANKS[i].rivals.filter((k) => !prev.rivals.includes(k)) };
}
