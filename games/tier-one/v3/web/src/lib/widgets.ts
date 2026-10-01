// Home widgets (CONCEPT4 §17): the home screen is the player's desk, a grid of widgets and app icons they arrange
// ("Edit home": long-press, move, two pages). This file is the data: which widgets exist, their sizes, how each one is
// opened (four free, the rest by level or with a look), and the layout in the save. ui/widgets.tsx draws them.
//
// Room on the home screen is the Daily phone's Screen part (lib/phones.ts slotsFor): a 2×2 widget takes one slot,
// a 4×2 takes two. Page 1 holds up to four slots above the apps; page 2 (from a Screen above the Brick's) holds the rest.
// A new player's first page is full: Today's window (4×2), Followers and Streak (2×2), then the apps.
//
// EXPORTS: WIDGETS, widgetDef(id), WidgetId, WSize, Placed, HomeLayout, widgetOpen(id, s?), widgetGate(id, s?),
//   homeLayout(s?), DEFAULT_LAYOUT, unitsOf(list), placeWidget(id, size, page?), removeWidget(page, i),
//   moveWidget(page, i, dir), resizeWidget(page, i), swapPage(page, i), recordFollowers(s), followerSeries(s, days?)
import { update, getSave, type Save } from './save';
import { levelUnlocks, levelOfSave } from './economy';
import { owns } from './wallet';
import { bylineOf } from './byline';
import { ymdUTC } from './meta';
import { slotsFor, pagesFor } from './phones';
import type { WidgetId } from './kinds';
export type { WidgetId };

/** Today's Daily number (No. 1 was 1 September 2026, UTC). screens/Front.tsx re-exports it as dailyNoToday. */
export const dailyNo = (day = ymdUTC()) => Math.floor((Date.parse(day + 'T00:00:00Z') - Date.parse('2026-09-01T00:00:00Z')) / 864e5) + 1;

export type WSize = '2x2' | '4x2';
export interface WidgetDef {
  id: WidgetId;
  /** Sizes it can take; the first is its default. */
  sizes: WSize[];
  /** How it opens: free, at a level (lib/economy.ts levelUnlocks), or with a look (a catalog item you own). */
  open: { free: true } | { level: number } | { look: string };
  /** The app it opens when tapped (ui/phone.tsx AppId). */
  app: 'blurt' | 'lens' | 'market' | 'story' | 'groups' | 'boards' | 'dms';
}
export const WIDGETS: WidgetDef[] = [
  { id: 'window', sizes: ['4x2', '2x2'], open: { free: true }, app: 'blurt' },
  { id: 'followers', sizes: ['2x2', '4x2'], open: { free: true }, app: 'lens' },
  { id: 'streak', sizes: ['2x2', '4x2'], open: { free: true }, app: 'blurt' },
  { id: 'catch', sizes: ['2x2', '4x2'], open: { free: true }, app: 'lens' },
  { id: 'market', sizes: ['4x2', '2x2'], open: { level: levelUnlocks.market }, app: 'market' },
  { id: 'sponsor', sizes: ['2x2', '4x2'], open: { level: levelUnlocks.live }, app: 'lens' },
  { id: 'season', sizes: ['2x2', '4x2'], open: { level: levelUnlocks.live }, app: 'lens' },
  { id: 'group', sizes: ['2x2', '4x2'], open: { level: levelUnlocks.groups }, app: 'groups' },
  { id: 'boss', sizes: ['4x2', '2x2'], open: { look: 'wg.boss' }, app: 'story' },
  { id: 'files', sizes: ['2x2', '4x2'], open: { look: 'wg.files' }, app: 'lens' },
];
export const widgetDef = (id: WidgetId): WidgetDef => WIDGETS.find((w) => w.id === id) || WIDGETS[0];
export const units = (z: WSize) => (z === '4x2' ? 2 : 1);

/** Is the widget yours to place? */
export function widgetOpen(id: WidgetId, s: Save = getSave()): boolean {
  const o = widgetDef(id).open;
  if ('free' in o) return true;
  if ('level' in o) return levelOfSave(s).n >= o.level;
  return owns(o.look, s);
}
/** What it takes to open one, for the "Reach Level N" / "Comes with a look" line. */
export const widgetGate = (id: WidgetId): { level?: number; look?: string } => { const o = widgetDef(id).open; return 'level' in o ? { level: o.level } : 'look' in o ? { look: o.look } : {}; };

// ---------------------------------------------------------------- the layout (module augmentation: no edit to save.ts)
export interface Placed { w: WidgetId; z: WSize }
export interface HomeLayout { p: [Placed[], Placed[]] }
export interface HomeSave { layout?: HomeLayout; fh?: [string, number][] }
declare module './save' { interface Save { home?: HomeSave } }
export const PAGE1_UNITS = 4;
export const DEFAULT_LAYOUT: HomeLayout = { p: [[{ w: 'window', z: '4x2' }, { w: 'followers', z: '2x2' }, { w: 'streak', z: '2x2' }], []] };
export const unitsOf = (list: Placed[]) => list.reduce((n, x) => n + units(x.z), 0);

/** The layout as it can be drawn right now: only open widgets, never over the phone's slots, page 2 only when the
 *  Screen allows it. A layout that no longer fits (a Brick equipped) trims from the end and keeps the save untouched. */
export function homeLayout(s: Save = getSave()): HomeLayout {
  const raw = s.home?.layout || DEFAULT_LAYOUT;
  let room = slotsFor(s); const pages = pagesFor(s);
  const out: [Placed[], Placed[]] = [[], []];
  raw.p.forEach((list, pg) => {
    if (pg >= pages) return;
    for (const x of list) {
      if (!WIDGETS.some((d) => d.id === x.w) || !widgetOpen(x.w, s)) continue;
      const z: WSize = widgetDef(x.w).sizes.includes(x.z) ? x.z : widgetDef(x.w).sizes[0];
      const u = units(z);
      if (u > room || (pg === 0 && unitsOf(out[0]) + u > PAGE1_UNITS)) continue;
      out[pg].push({ w: x.w, z }); room -= u;
    }
  });
  return { p: out };
}
export const slotsLeft = (s: Save = getSave()) => slotsFor(s) - unitsOf(homeLayout(s).p[0]) - unitsOf(homeLayout(s).p[1]);
const write = (f: (l: HomeLayout) => HomeLayout) => update((x) => { const cur = homeLayout(x); x.home = { ...(x.home || {}), layout: f({ p: [cur.p[0].slice(), cur.p[1].slice()] }) }; });

/** Adds a widget: on `page` if it fits there, else the other page. False when there is no room or it isn't open. */
export function placeWidget(id: WidgetId, z?: WSize, page = 0): boolean {
  const s = getSave(); if (!widgetOpen(id, s)) return false;
  const size = z && widgetDef(id).sizes.includes(z) ? z : widgetDef(id).sizes[0];
  const cur = homeLayout(s); const u = units(size);
  if (slotsLeft(s) < u) return false;
  const fits = (pg: number) => pg < pagesFor(s) && (pg > 0 || unitsOf(cur.p[0]) + u <= PAGE1_UNITS);
  const pg = fits(page) ? page : fits(1 - page) ? 1 - page : -1;
  if (pg < 0) return false;
  write((l) => { l.p[pg].push({ w: id, z: size }); return l; });
  return true;
}
export function removeWidget(page: number, i: number) { write((l) => { l.p[page].splice(i, 1); return l; }); }
/** Moves a widget one place earlier (-1) or later (+1) on its page. */
export function moveWidget(page: number, i: number, dir: -1 | 1) {
  write((l) => { const a = l.p[page]; const j = i + dir; if (j < 0 || j >= a.length) return l; [a[i], a[j]] = [a[j], a[i]]; return l; });
}
/** Moves a widget to the other page when it fits there. */
export function swapPage(page: number, i: number): boolean {
  const s = getSave(); const cur = homeLayout(s); const x = cur.p[page][i]; if (!x) return false;
  const to = 1 - page; if (to >= pagesFor(s)) return false;
  if (to === 0 && unitsOf(cur.p[0]) + units(x.z) > PAGE1_UNITS) return false;
  write((l) => { const [it] = l.p[page].splice(i, 1); l.p[to].push(it); return l; });
  return true;
}
/** Flips a widget between 2×2 and 4×2 when it can take both and there is room. */
export function resizeWidget(page: number, i: number): boolean {
  const s = getSave(); const cur = homeLayout(s); const x = cur.p[page][i]; if (!x) return false;
  const d = widgetDef(x.w); if (d.sizes.length < 2) return false;
  const z: WSize = x.z === '2x2' ? '4x2' : '2x2';
  const grow = units(z) - units(x.z);
  if (grow > 0 && (slotsLeft(s) < grow || (page === 0 && unitsOf(cur.p[0]) + grow > PAGE1_UNITS))) return false;
  write((l) => { l.p[page][i] = { ...l.p[page][i], z }; return l; });
  return true;
}
export function resetLayout() { update((x) => { x.home = { ...(x.home || {}), layout: undefined }; }); }

// ---------------------------------------------------------------- the Market watch list (the Market lane plugs in)
// CONCEPT4 §9: any rumour can be Watched. Until the Market app registers its watch list here, the widget shows the
// rumours you have open calls on. `setWatchSource(() => ids)` is the one adapter point.
let watchSource: (() => string[]) | null = null;
export function setWatchSource(f: (() => string[]) | null) { watchSource = f; }
export const watchIds = (): string[] | null => { try { return watchSource ? watchSource() : null; } catch { return null; } };

// ---------------------------------------------------------------- the followers line (30 days)
/** Notes today's follower count once (the Followers widget's sparkline). Safe to call on every Home render. */
export function recordFollowers(s: Save = getSave()) {
  const day = ymdUTC(); const f = bylineOf(s).followers; const fh = s.home?.fh || [];
  const last = fh[fh.length - 1];
  if (last && last[0] === day && last[1] === f) return;
  update((x) => { const h = (x.home?.fh || []).filter((p) => p[0] !== day); h.push([day, bylineOf(x).followers]); x.home = { ...(x.home || {}), fh: h.slice(-30) }; });
}
/** The last `days` daily follower counts, oldest first (one point per day the phone was opened). */
export const followerSeries = (s: Save = getSave(), days = 30): number[] => (s.home?.fh || []).slice(-days).map((p) => p[1]);
