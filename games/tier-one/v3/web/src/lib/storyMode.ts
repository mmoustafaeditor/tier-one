// Story mode, "The Comeback" (games/tier-one/v3/STORY.html): the Career, told as a comeback and a mystery. Someone fed
// you the fake that ended you at The Chronicle; five chapters on the five ranks (Blogger → Tier One) find out who, and an
// epilogue puts your "Here we go" on the front page. Chapters sit on the existing ranks so every save maps straight in.
//
// Save compatibility: nothing stores a chapter id. `save.story.chapterSeen` is the chapter index (0–5), which is the same
// index before and after the 3.4 rewrite, and chapterFor() derives the chapter from rank + t1Top. Only the ids were
// renamed (comeback → post, stringer → nationals, rival → war); LEGACY_CHAPTER maps any old id that turns up.
// Inbox entries keep their old beat keys (promo1, firstRight, …): the keys still exist, only the lines were rewritten.
import { RANKS, type CareerReport } from './career';
import { bylineOf } from './byline';
import type { Result } from './engine';
import type { Save, CareerSave } from './save';

export const CHAPTERS = ['blog', 'post', 'nationals', 'war', 'chronicle', 'front'] as const;
export type ChapterId = typeof CHAPTERS[number];
export const LEGACY_CHAPTER: Record<string, ChapterId> = { comeback: 'post', stringer: 'nationals', rival: 'war' };
export const chapterId = (id: string): ChapterId => (LEGACY_CHAPTER[id] || id) as ChapterId;
/** Chapters 1–5 are indexes 0–4; index 5 is the epilogue. */
export const EPILOGUE = 5;
export const FINALE_T1 = 3;

export interface Chapter { i: number; id: ChapterId; n: number; progress: number; goal: { windows: number; rep: number; t1?: number; haveW: number; haveRep: number; haveT1?: number } | null; done: boolean }

/** The chapter a career is in. `rep` is the one reputation (save.byline.rep): Career's "credibility" gate. */
export function chapterFor(c: CareerSave, rep: number): Chapter {
  const r = c.rank;
  if (r < RANKS.length - 1) {
    const [gw, grep] = RANKS[r + 1].gate;
    const pw = gw ? Math.min(1, c.windows / gw) : 1, pr = Math.min(1, Math.max(0, (rep - 40) / Math.max(1, grep - 40)));
    return { i: r, id: CHAPTERS[r], n: r + 1, progress: (pw + pr) / 2, goal: { windows: gw, rep: grep, haveW: c.windows, haveRep: Math.round(rep) }, done: false };
  }
  // Rank Tier One: back at The Chronicle; three Tier 1 windows and the front page is yours.
  const t1 = c.t1Top ?? 0;
  if (t1 < FINALE_T1) return { i: 4, id: 'chronicle', n: 5, progress: t1 / FINALE_T1, goal: { windows: 0, rep: 0, t1: FINALE_T1, haveW: c.windows, haveRep: Math.round(rep), haveT1: t1 }, done: false };
  // The epilogue is still "chapter 5" wherever a number is shown (Home's mode bar): five chapters, then the front page.
  return { i: EPILOGUE, id: 'front', n: 5, progress: 1, goal: null, done: true };
}
export function chapterOf(s: Save): Chapter | null { return s.career ? chapterFor(s.career, bylineOf(s).rep) : null; }
/** The i18n key of a chapter's full name ("Ch. 2 · The Evening Post"). Old ids are mapped. */
export const chapterName = (id: string) => 'g.story.ch.' + chapterId(id) + '.name';

// ---------- the films (lib/scenes.ts playScene ids). Each chapter: an opener and one mid-chapter reveal; the finale and
// the epilogue close the story. Registered films play as clips; any id without one gets a title card (film/story.tsx).
export const chapterScene = (i: number) => (i >= EPILOGUE ? 'story-epilogue' : `story-ch${i + 1}-open`);
export const revealScene = (n: number) => `story-ch${n}-reveal`;

// ---------- the mystery: one reveal per chapter 1–4, each pins a piece of evidence to the case file.
// A reveal lands halfway to the chapter's window goal (and at least two windows after you arrived in the chapter), once
// (save.story.beats['reveal<n>']). Saves that are already past a chapter count its evidence as pinned.
export const EVIDENCE = ['rosa', 'kev', 'tony', 'priya'] as const;
export const REVEAL_FROM = ['agent', 'hana', 'spotter', 'itk'] as const;
export function revealAt(rank: number, seen?: Record<string, number>): number {
  if (rank >= RANKS.length - 1) return Infinity;
  const g0 = RANKS[rank].gate[0], goal = RANKS[rank + 1].gate[0];
  const from = seen?.['enter' + rank] ?? g0;
  return Math.max(from + 2, Math.ceil((g0 + goal) / 2));
}
/** Which evidence is pinned (four flags) for a chapter index, given the one-time beats seen. */
export function evidenceOpen(chI: number, seen?: Record<string, number>): boolean[] {
  return EVIDENCE.map((_, k) => chI > k || !!seen?.['reveal' + (k + 1)]);
}

// ---------- story beats: the inbox lines after each Career window.
export type BeatFrom = 'editor' | 'hana' | 'tabloid' | 'itk' | 'insider' | 'agent' | 'spotter' | 'kitman' | 'barber' | 'physio' | 'unknown';
export interface Beat { from: BeatFrom; key: string; v?: Record<string, string | number> }
const RIVAL_IDS = ['tabloid', 'itk', 'insider'];
// Follower milestones that earn an inbox line. 38,200 is what the prologue cost you.
export const BEAT_FOLLOWERS = [1000, 5000, 10000, 38200, 50000, 100000, 250000];
// Who sends a beat when it isn't the stored `from` (inbox entries from before 3.4 stored 'editor' for every promotion).
const BEAT_SENDER: Record<string, BeatFrom> = { promo1: 'hana', promo2: 'hana', promo3: 'tabloid', promo4: 'editor', reveal1: 'agent', reveal2: 'hana', reveal3: 'spotter', reveal4: 'itk', vinceBurned: 'tabloid' };
export const beatFrom = (b: { from: string; key: string }): string => BEAT_SENDER[b.key] || b.from;

// One-time beats carry an id in save.story.beats; repeatable ones return ''.
export function beatOnce(b: Beat): string {
  if (b.key === 'firstRight' || b.key === 'firstExcl' || b.key === 'finale' || b.key === 'vinceFirst') return b.key;
  if (/^(promo|reveal)\d$/.test(b.key)) return b.key;
  if (b.key === 'followers' || b.key === 'followersBack') return 'followers.' + (b.v?.m ?? '');
  return '';
}
// The i18n key for a beat's line; the sender's name is `g.story.from.<beatFrom(b)>`.
export const beatKey = (b: { key: string }) => 'g.story.beat.' + b.key;

export interface BeatOpts {
  /** save.story.beats: one-time beats already delivered (and the window each chapter began at). */
  seen?: Record<string, number>;
  /** Vince's play in this window (Career, chapter 4 on): the saga, the source that was fed the line, and its name. */
  vince?: { i: number; src: string; who: string } | null;
}

/** The 0–2 most relevant lines for a finished Career window. Call it after applyWindow(c, …) returned `rep`. */
export function storyBeats(c: CareerSave, res: Result, rep: CareerReport, o: BeatOpts = {}): Beat[] {
  const out: Beat[] = [];
  const seen = o.seen || {};
  const name = (i: number) => res.cast?.[i]?.player.n || '';
  const called = res.per.filter((p) => p.call);
  const right = called.filter((p) => p.right), excl = right.filter((p) => p.excl);
  // 1. Promotion: a new chapter.
  if (rep.promoted != null) out.push({ from: BEAT_SENDER['promo' + rep.promoted] || 'editor', key: 'promo' + rep.promoted, v: { rank: rep.promoted } });
  // 2. The mid-chapter reveal (never in the promotion window: that one belongs to the new chapter's opener).
  else if (c.rank < RANKS.length - 1 && !seen['reveal' + (c.rank + 1)] && c.windows >= revealAt(c.rank, seen)) out.push({ from: REVEAL_FROM[c.rank], key: 'reveal' + (c.rank + 1) });
  // 3. Tier 1 at the top rank: the finale count.
  if (res.tier === 'T1' && c.rank === RANKS.length - 1) {
    const n = c.t1Top ?? 0;
    out.push(n >= FINALE_T1 ? { from: 'editor', key: 'finale' } : { from: 'editor', key: 't1Top', v: { n, of: FINALE_T1 } });
  }
  // 4. Vince's play: the reveal ("Vince's play on X: Rosa lied"), and whether you bit. Always, so the file is complete.
  if (o.vince) {
    const p = res.per.find((x) => x.i === o.vince!.i);
    const v = { p: name(o.vince.i), s: o.vince.who };
    if (p && p.call && !p.right) out.push({ from: 'tabloid', key: 'vinceBurned', v });
    else if (p && p.call && p.right) out.push({ from: 'editor', key: seen.vinceFirst ? 'vinceDodged' : 'vinceFirst', v });
    else out.push({ from: 'editor', key: 'vinceQuiet', v });
  }
  // 5. A big miss: a wrong Confirmed. The tabloid never lets it go.
  const miss = called.find((p) => !p.right && p.call!.s === 2);
  if (miss) out.push(name(miss.i) ? { from: 'tabloid', key: 'bigMiss', v: { p: name(miss.i) } } : { from: 'tabloid', key: 'bigMiss0' });
  // 6. A rival beat you to a story you had right. Each of them says it their own way.
  const beat = res.per.find((p) => p.why === 'beaten' && p.firstRight && RIVAL_IDS.includes(p.firstRight.id));
  if (beat) out.push({ from: beat.firstRight!.id as BeatFrom, key: 'beaten_' + beat.firstRight!.id, v: { p: name(beat.i), d: beat.firstRight!.day } });
  // 7. Firsts (counters are already updated by applyWindow).
  if (excl.length && c.exclusives === excl.length) out.push({ from: 'editor', key: 'firstExcl', v: { p: name(excl[0].i) } });
  else if (right.length && c.right === right.length) out.push({ from: 'editor', key: 'firstRight' });
  // 8. A follower milestone crossed this window (the one global count, GOTY.md §1.1).
  const before = rep.followersAfter - rep.followers;
  const m = [...BEAT_FOLLOWERS].reverse().find((x) => before < x && rep.followersAfter >= x);
  if (m) out.push({ from: 'editor', key: m === 38200 ? 'followersBack' : 'followers', v: { m, n: rep.followersAfter } });
  // 9. Nothing happened: Mags still has an opinion.
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
    // A promotion records the window count you arrived with, so the new chapter's reveal waits its turn.
    if (/^promo\d$/.test(b.key) && s.career && seen['enter' + s.career.rank] == null) seen['enter' + s.career.rank] = s.career.windows;
    inbox.push({ at, from: b.from, key: b.key, ...(b.v ? { v: b.v } : {}) });
    added.push(b);
  }
  st.inbox = inbox.slice(-30);
  return added;
}
/** The film a freshly added beat plays, if any. */
export function beatScene(b: Beat): string | null {
  const m = /^reveal(\d)$/.exec(b.key);
  if (m) return revealScene(+m[1]);
  return b.key === 'finale' ? 'story-finale' : null;
}

// What a chapter opens: new sources and rivals versus the chapter before (chapters 1–5 are ranks 0–4).
export function chapterNew(i: number): { src: string[]; rivals: string[] } {
  if (i > RANKS.length - 1) return { src: [], rivals: [] };
  const prev = i > 0 ? RANKS[i - 1] : { src: [] as string[], rivals: [] as string[] };
  return { src: RANKS[i].src.filter((k) => !prev.src.includes(k)), rivals: RANKS[i].rivals.filter((k) => !prev.rivals.includes(k)) };
}

// ---------- the cast. Sources keep their ids (kitman, barber, …); in the story they have names.
export const STORY_SOURCES = ['kitman', 'barber', 'agent', 'spotter', 'physio'] as const;
/** "Sal · The barber". `t` is any translate function. */
export const srcNamed = (t: (k: string) => string, k: string) => (STORY_SOURCES as readonly string[]).includes(k) ? t('g.story.who.' + k) + ' · ' + t('src.' + k) : t('src.' + k);
