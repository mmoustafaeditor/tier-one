// Career Mode's story layer (3.8, LAUNCH_BRIEF §11–§13, spec F §4): the five stages as "chapters" the screens can
// read, and the Career log: short reactions from the people around you to what you actually did this window. Nothing
// here is scripted ahead of play: no case file, no reveals, no villain. Mags Doyle still keeps score, Hana Okafor still
// gives you your first desk, Rosa still rings first when she trusts you, @BackPageBants still clips your misses.
//
// Save compatibility: `save.story.chapterSeen` is the stage index (0–5; 5 = established), the same index before and
// after 3.8. Only the ids were renamed (post → local, war → pressbox, chronicle → tierone, front → established);
// LEGACY_CHAPTER maps any old id that turns up. Inbox entries keep their keys; lines that no longer exist (reveal1–4,
// finale, vince*) are filtered out of the log by beatKnown().
import { STAGES, TOP, TOP_WINDOWS, topWindows, isEstablished, type CareerReport } from './career';
import { bylineOf, REP_TIERS } from './byline';
import { clubById, type Result } from './engine';
import type { Save, CareerSave } from './save';

export const CHAPTERS = ['blog', 'local', 'nationals', 'pressbox', 'tierone', 'established'] as const;
export type ChapterId = typeof CHAPTERS[number];
export const LEGACY_CHAPTER: Record<string, ChapterId> = { post: 'local', war: 'pressbox', chronicle: 'tierone', front: 'established', comeback: 'local', stringer: 'nationals', rival: 'pressbox' };
export const chapterId = (id: string): ChapterId => (LEGACY_CHAPTER[id] || id) as ChapterId;
/** Stages 1–5 are indexes 0–4; index 5 is the established career (endless + prestige). */
export const EPILOGUE = 5;

export interface Chapter {
  i: number; id: ChapterId; n: number; progress: number;
  goal: { windows: number; rep: number; haveW: number; haveRep: number; top?: number; haveTop?: number } | null; done: boolean;
}

/** The stage a career is in. `rep` is the one reputation (save.byline.rep). */
export function chapterFor(c: CareerSave, rep: number): Chapter {
  const r = c.rank;
  if (r < TOP) {
    const [gw, grep] = STAGES[r + 1].gate;
    const pw = gw ? Math.min(1, c.windows / gw) : 1, pr = Math.min(1, Math.max(0, (rep - 40) / Math.max(1, grep - 40)));
    return { i: r, id: CHAPTERS[r], n: r + 1, progress: (pw + pr) / 2, goal: { windows: gw, rep: grep, haveW: c.windows, haveRep: Math.round(rep) }, done: false };
  }
  if (!isEstablished(c)) return { i: TOP, id: 'tierone', n: TOP + 1, progress: topWindows(c) / TOP_WINDOWS, goal: { windows: 0, rep: 0, top: TOP_WINDOWS, haveTop: topWindows(c), haveW: c.windows, haveRep: Math.round(rep) }, done: false };
  return { i: EPILOGUE, id: 'established', n: TOP + 1, progress: 1, goal: null, done: true };
}
export function chapterOf(s: Save): Chapter | null { return s.career ? chapterFor(s.career, bylineOf(s).rep) : null; }
/** The i18n key of a stage's name ("Local Desk"). Old ids are mapped. */
export const chapterName = (id: string) => 'cr38.stage.' + chapterId(id) + '.name';
/** The film a stage opens with (lib/scenes.ts playScene ids). The established career has none. */
export const chapterScene = (i: number) => (i >= EPILOGUE ? '' : `story-ch${i + 1}-open`);
/** The reputation word the stage's gate asks for ("reputation 60 · Stringer"), for the goal line. */
export const gateTier = (rep: number) => [...REP_TIERS].reverse().find(([, m]) => rep >= m)![0];

// ---------- the Career log (§12): one to three lines after each window, from whoever has something to say.
export type BeatFrom = 'editor' | 'hana' | 'desk' | 'tabloid' | 'itk' | 'insider' | 'agent' | 'spotter' | 'kitman' | 'barber' | 'physio' | 'press' | 'player';
export interface Beat { from: BeatFrom; key: string; v?: Record<string, string | number> }
const RIVAL_IDS = ['tabloid', 'itk', 'insider'];
// Follower milestones that earn a line. 38,200 is what the opening cost you.
export const BEAT_FOLLOWERS = [1000, 5000, 10000, 38200, 50000, 100000, 250000];
export const FOLLOWERS_LOST = 38200;
// Who sends a line when it isn't the stored `from` (entries from before 3.4 stored 'editor' for every promotion).
const BEAT_SENDER: Record<string, BeatFrom> = { promo1: 'hana', promo2: 'desk', promo3: 'insider', promo4: 'editor' };
export const beatFrom = (b: { from: string; key: string }): BeatFrom => BEAT_SENDER[b.key] || (b.from as BeatFrom);
/** Lines that still exist in 3.8; older inbox entries with other keys are hidden, not deleted. */
export const BEAT_KEYS = new Set(['firstRight', 'firstExcl', 'exclusive', 'bigMiss', 'bigMiss0', 'catastrophe', 'beaten_tabloid', 'beaten_itk', 'beaten_insider',
  'promo1', 'promo2', 'promo3', 'promo4', 'established', 'topT1', 'followers', 'followersBack', 'quiet', 'solid', 'meh',
  'barberBurned', 'barberBurned3', 'leakRight', 'leakMissed', 'trust3', 'trust5', 'clubWarm', 'clubFrozen', 'rivalRun_tabloid', 'rivalRun_itk', 'rivalRun_insider',
  'rivalLoss_tabloid', 'rivalLoss_itk', 'rivalLoss_insider', 'style', 'wireLanded']);
export const beatKnown = (b: { key: string }) => BEAT_KEYS.has(b.key);

// One-time lines carry an id in save.story.beats; repeatable ones return ''.
export function beatOnce(b: Beat): string {
  if (['firstRight', 'firstExcl', 'established', 'barberBurned3'].includes(b.key)) return b.key;
  if (/^promo\d$/.test(b.key)) return b.key;
  if (b.key === 'followers' || b.key === 'followersBack') return 'followers.' + (b.v?.m ?? '');
  if (b.key === 'trust3' || b.key === 'trust5') return b.key + '.' + (b.v?.src ?? '');
  if (b.key === 'style') return 'style.' + (b.v?.id ?? '');
  return '';
}
// The i18n key for a line; the sender's name is `g.story.from.<beatFrom(b)>` ('player' and 'press' read {p} / {c}).
export const beatKey = (b: { key: string }) => 'g.story.beat.' + b.key;

export interface BeatOpts {
  /** save.story.beats: one-time lines already delivered. */
  seen?: Record<string, number>;
  /** Ignored since 3.8 (Vince's play is gone); kept so older callers compile. */
  vince?: unknown;
  /** Club names by id, for the press-office lines. */
  clubName?: (id: string) => string;
}

/** The 0–3 most relevant lines for a finished Career window, most important first. Call it after applyWindow(). */
export function storyBeats(c: CareerSave, res: Result, rep: CareerReport, o: BeatOpts = {}): Beat[] {
  const out: Beat[] = [];
  const seen = o.seen || {};
  const name = (i: number) => res.cast?.[i]?.player.n || '';
  const pid = (i: number) => res.cast?.[i]?.player.id || '';
  const star = (i: number) => res.cast?.[i]?.player.star || 0;
  const club = (id: string) => (o.clubName ? o.clubName(id) : clubById(id)?.n || id);
  const called = res.per.filter((p) => p.call);
  const right = called.filter((p) => p.right), excl = right.filter((p) => p.excl);
  // 1. A new desk: the publication's offer.
  if (rep.promoted != null) out.push({ from: BEAT_SENDER['promo' + rep.promoted] || 'editor', key: 'promo' + rep.promoted, v: { rank: rep.promoted } });
  if (rep.established) out.push({ from: 'editor', key: 'established' });
  // 2. A catastrophic miss: a wrong Confirmed on a star, or two wrong Confirmeds in one window. Mags, then the tabloid.
  const misses = called.filter((p) => !p.right && p.call!.s === 2);
  const cat = misses.find((p) => star(p.i) >= 3) || (misses.length >= 2 ? misses[0] : null);
  if (cat) out.push({ from: 'editor', key: 'catastrophe', v: { p: name(cat.i) } });
  else if (misses[0]) out.push(name(misses[0].i) ? { from: 'tabloid', key: 'bigMiss', v: { p: name(misses[0].i) } } : { from: 'tabloid', key: 'bigMiss0' });
  // 3. A player publicly confirms you were first (every exclusive), the first one from Mags.
  if (excl.length && c.exclusives === excl.length) out.push({ from: 'editor', key: 'firstExcl', v: { p: name(excl[0].i) } });
  else if (excl.length) out.push({ from: 'player', key: 'exclusive', v: { p: name(excl[0].i), pid: pid(excl[0].i) } });
  else if (right.length && c.right === right.length) out.push({ from: 'editor', key: 'firstRight' });
  // 4. The agent's leak: did you use it?
  if (rep.leak) out.push(rep.leak.right ? { from: 'agent', key: 'leakRight', v: { p: name(rep.leak.i) } } : { from: 'agent', key: 'leakMissed', v: { p: name(rep.leak.i) } });
  // 5. The barber burned you (the third time, Mags has had enough).
  if (rep.barberBurned && rep.barberBurnedTotal >= 3 && !seen.barberBurned3) out.push({ from: 'editor', key: 'barberBurned3', v: { n: rep.barberBurnedTotal } });
  else if (rep.barberBurned) out.push({ from: 'barber', key: 'barberBurned' });
  // 6. A club's press office changes its mind about you.
  for (const id of rep.leaks) out.push({ from: 'press', key: 'clubWarm', v: { c: club(id), cid: id } });
  for (const id of rep.frozen) out.push({ from: 'press', key: 'clubFrozen', v: { c: club(id), cid: id } });
  // 7. A contact now trusts you (Trusted at 3, Direct Line at 5): they say so themselves.
  for (const [src, [a, b]] of Object.entries(rep.trust)) { if (a < 3 && b >= 3) out.push({ from: src as BeatFrom, key: 'trust3', v: { src } }); else if (a < 5 && b >= 5) out.push({ from: src as BeatFrom, key: 'trust5', v: { src } }); }
  // 8. A rival run: three in a row either way, in their own voice.
  for (const r of rep.rivalRuns) out.push({ from: r.id as BeatFrom, key: (r.streak > 0 ? 'rivalRun_' : 'rivalLoss_') + r.id, v: { n: Math.abs(r.streak) } });
  // 9. A rival beat you to a story you had right.
  const beat = res.per.find((p) => p.why === 'beaten' && p.firstRight && RIVAL_IDS.includes(p.firstRight.id));
  if (beat && !rep.rivalRuns.some((r) => r.id === beat.firstRight!.id)) out.push({ from: beat.firstRight!.id as BeatFrom, key: 'beaten_' + beat.firstRight!.id, v: { p: name(beat.i), d: beat.firstRight!.day } });
  // 10. Known for something now: the playstyle title (lib/style.ts) once ten calls are in.
  if (rep.style) out.push({ from: 'editor', key: 'style', v: { id: rep.style, m: 'live.style.' + rep.style + '.t' } });
  // 11. A follower milestone crossed this window (the one global count).
  const before = rep.followersAfter - rep.followers;
  const m = [...BEAT_FOLLOWERS].reverse().find((x) => before < x && rep.followersAfter >= x);
  if (m) out.push({ from: 'editor', key: m === FOLLOWERS_LOST ? 'followersBack' : 'followers', v: { m, n: rep.followersAfter } });
  // 12. Tier 1 at Tier One.
  if (res.tier === 'T1' && c.rank === TOP && !rep.established) out.push({ from: 'editor', key: 'topT1', v: { n: c.t1Top || 0 } });
  // 13. Nothing happened: Mags still has an opinion.
  if (!out.length) out.push({ from: 'editor', key: !called.length ? 'quiet' : res.tier === 'T1' || res.tier === 'T2' ? 'solid' : 'meh' });
  return out.slice(0, 3);
}

/** Append lines to the Career log (last 40 kept) and mark the one-time ones. Returns the lines actually added. */
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
    if (/^promo\d$/.test(b.key) && s.career && seen['enter' + s.career.rank] == null) seen['enter' + s.career.rank] = s.career.windows;
    inbox.push({ at, from: b.from, key: b.key, ...(b.v ? { v: b.v } : {}) });
    added.push(b);
  }
  st.inbox = inbox.slice(-40);
  return added;
}
/** The film a freshly added line plays: none since 3.8 (the stage opener plays from the stage screen). Kept for callers. */
export function beatScene(_b: Beat): string | null { return null; }

// What a stage opens: new sources and rivals versus the stage before.
export function chapterNew(i: number): { src: string[]; rivals: string[] } {
  if (i > TOP) return { src: [], rivals: [] };
  const prev = i > 0 ? STAGES[i - 1] : { src: [] as string[], rivals: [] as string[] };
  return { src: STAGES[i].src.filter((k) => !prev.src.includes(k)), rivals: STAGES[i].rivals.filter((k) => !prev.rivals.includes(k)) };
}

// ---------- the cast. Sources keep their ids (kitman, barber, …); in Career they have names.
export const STORY_SOURCES = ['kitman', 'barber', 'agent', 'spotter', 'physio'] as const;
/** "Sal · The barber". `t` is any translate function. */
export const srcNamed = (t: (k: string) => string, k: string) => (STORY_SOURCES as readonly string[]).includes(k) ? t('g.story.who.' + k) + ' · ' + t('src.' + k) : t('src.' + k);
