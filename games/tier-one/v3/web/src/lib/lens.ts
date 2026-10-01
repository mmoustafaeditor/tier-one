// Lens (CONCEPT4.md §2, §10): what the profile remembers that nothing else keeps. The follower graph (one point a UTC
// day, 60 kept, the Lens draws 30), the grid of your Drops (every right All in, as the card it was published as, with
// the catchphrase it fired), opened Secret files, and the boss records the Story lane writes. lib/meta.ts settleWindow
// calls noteWindow() inside the same save update as the rest of a window's settle; the Lens screen calls noteToday()
// on open so a day with only Market calls still gets its point. Pure save bookkeeping: nothing here touches a score.
//
// CONTRACT for other lanes:
//   followerSeries(save, days = 30)   -> { day, n }[]   one point a day, gaps filled with the last known count
//   dropsOf(save)                     -> DropRec[]      newest first; the Lens grid and the share card read these
//   bossRecords(save)                 -> BossRec[]      chapter bosses: "Beat @BackPageBants 5–3" (Story lane: save.story.h2h)
//   fileOpened(save, id) / openFile(id)                  a Secret file earned but not yet opened shows "New file"
import { update, type Save } from './save';
import type { CastSaga, Result, Result4, ResultStory4 } from './engine';
import { OUTS4, TUTORIAL_SEED } from './engine';
import { catchphraseOf } from './catchphrase';
import { equipped } from './wallet';
import { bylineOf, rivalOf, RIVALS } from './byline';

export interface DropRec {
  at: number; mode: string; key: string;
  /** the player and the club the ending names (SIGNS: the buyer, ELSEWHERE: the other club, STAYS: his club) */
  player: string; club: { s: string; n: string; c1: string; c2: string };
  o: number; day: number; pts: number; scoop: boolean;
  /** the line it fired and the Drop card style it was published in (so an old Drop keeps its look) */
  cp: string; card: string;
}
export interface LensSave { hist?: Record<string, number>; drops?: DropRec[]; opened?: Record<string, number> }
declare module './save' { interface Save { lens?: LensSave } }

const HIST_DAYS = 60, DROPS_CAP = 90;
const ymd = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 10);
const lens = (s: Save): LensSave => (s.lens = s.lens || {});

/** Records today's follower count (call inside an update). Keeps the last 60 days. */
export function noteFollowers(s: Save, ms = Date.now()) {
  const L = lens(s), h = (L.hist = L.hist || {});
  h[ymd(ms)] = bylineOf(s).followers;
  const keys = Object.keys(h).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - HIST_DAYS))) delete h[k];
}
/** The Lens calls this when it opens: a day with no window (only Market calls, say) still gets its point. */
export function noteToday() { update((s) => { const h = s.lens?.hist; if (!h || h[ymd()] !== bylineOf(s).followers) noteFollowers(s); }); }

/** One point a day for the last `days` days, ending today. Before the first known day the line starts at the first
 *  known count; after it, a missing day carries the last known count. */
export function followerSeries(s: Save, days = 30, ms = Date.now()): { day: string; n: number }[] {
  const h = s.lens?.hist || {}, now = bylineOf(s).followers;
  const keys = Object.keys(h).sort();
  const out: { day: string; n: number }[] = [];
  let last = keys.length ? h[keys[0]] : now;
  for (let k = days - 1; k >= 0; k--) {
    const d = ymd(ms - k * 864e5);
    if (h[d] != null) last = h[d];
    else { const before = keys.filter((x) => x <= d).pop(); if (before) last = h[before]; }
    out.push({ day: d, n: k === 0 ? now : last });
  }
  return out;
}

type AnyPer = Result['per'][number] | ResultStory4;
const isStory4 = (p: AnyPer): p is ResultStory4 => 'scoop' in p && 'truth' in p;
/** Every right Drop of a finished window onto the grid (call inside the settle's update). Practice is not your
 *  account's grid, except the First window, whose Drop is the first catchphrase you ever fired. */
export function noteWindow(s: Save, r: Result | Result4, mode: string, key: string, cast?: CastSaga[]) {
  noteFollowers(s);
  if (mode === 'practice' && !key.includes(TUTORIAL_SEED)) return;
  const L = lens(s);
  const cs = (r as { cast?: CastSaga[] }).cast?.length ? (r as { cast?: CastSaga[] }).cast! : cast || [];
  const cp = catchphraseOf(s).text, card = equipped('dropcard', s).id, at = Date.now();
  const add: DropRec[] = [];
  for (const p of r.per as AnyPer[]) {
    if (!p.call || p.call.s !== 2 || !p.right) continue;
    const c = cs[p.i];
    const o = isStory4(p) ? p.call.o : Math.min(2, p.call.o);
    const club = c ? (o === 0 ? c.to : o === 1 ? c.alt || c.to : c.from) : null;
    const k = key + ':' + p.i;
    if ((L.drops || []).some((d) => d.key === k)) continue;
    add.push({ at, mode, key: k, player: c ? c.player.n : '', club: club ? { s: club.s, n: club.n, c1: club.c1, c2: club.c2 } : { s: '', n: '', c1: '#F2B632', c2: '#15130F' }, o, day: p.call.day, pts: p.pts, scoop: isStory4(p) ? p.scoop : !!(p as { excl?: boolean }).excl, cp, card });
  }
  if (add.length) L.drops = [...add, ...(L.drops || [])].slice(0, DROPS_CAP);
}
export const dropsOf = (s: Save): DropRec[] => s.lens?.drops || [];
export const OUT_WORD = OUTS4;

// ---------------------------------------------------------------- Secret files: earned, then opened with a reveal
export const fileOpened = (s: Save, id: string) => !!s.lens?.opened?.[id];
export const unopenedFiles = (s: Save) => Object.keys(s.ach || {}).filter((id) => s.ach[id] && !fileOpened(s, id));
export function openFile(id: string) { update((s) => { const L = lens(s); L.opened = { ...(L.opened || {}), [id]: Date.now() }; }); }

// ---------------------------------------------------------------- bosses (CONCEPT4 §10): the chapter head-to-heads
export interface BossRec { id: string; w: number; l: number; beaten: boolean; met: boolean }
type H2H = Record<string, { w?: number; l?: number; beaten?: boolean }>;
/** Your record against each boss. The Story lane keeps chapter head-to-heads in `save.story.h2h`; until it does (or
 *  for a boss not met in Story yet) the account's ledger against that account stands in. */
export function bossRecords(s: Save): BossRec[] {
  const h2h = ((s.story as { h2h?: H2H } | undefined)?.h2h) || {};
  return RIVALS.map((id) => {
    const x = h2h[id], r = rivalOf(s, id);
    const w = x?.w ?? r.w, l = x?.l ?? r.l;
    return { id, w, l, beaten: x?.beaten ?? w > l, met: w + l > 0 };
  });
}
