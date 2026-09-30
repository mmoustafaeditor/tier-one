// Playstyle profile (GOTY.md §7.2): how you file, tracked from every resolved call in the Daily, Story and rooms, and
// distilled into a title the rivals, the editor and the Daily brief can use. `save.style` is optional in the save
// (older saves load unchanged). Nothing here touches a board or a score: it only reads results.
//
// Signals per call (a ResultSaga with a call):
//   early    filed by day 3 of 7           late     filed on day 6 or Deadline Day
//   quiet    published at Talks            loud     published at Confirmed
//   ut       a Delete & repost (U-turn)    contra   filed against every rival who had already posted
//   trust    a source read pointing at the truth was in hand and the call landed (you believed a good read)
//   ignore   every read in hand was wrong and the call still landed (you saw through them)
//   right / wrong, and [right, wrong] per outcome (Done, Hijack, Off, Fake)
//
// Titles need STYLE_MIN calls; checked in order, the first match wins:
//   sniper       hit ≥ .65 and early ≥ .50    files early, rarely wrong
//   contrarian   contra ≥ .35 and hit ≥ .50   goes against the rivals and gets away with it
//   loudmouth    loud ≥ .50                   half your calls are Confirmed
//   quiet        quiet ≥ .50                  half your calls are Talks
//   earlybird    early ≥ .60                  files in the first three days
//   nightowl     late ≥ .45                   files late, often on Deadline Day
//   uturner      ut ≥ .20                     one call in five is a Delete & repost
//   believer     trust ≥ .60                  follows a good read
//   sceptic      ignore ≥ .30                 wins without the sources
//   steady       (everything else)
// Under STYLE_MIN calls the profile is `rookie`. A title is announced once (film moment-style-<id>, a feed line).
import type { Save } from './save';
import type { ResultSaga } from './engine';
import { moment } from './moments';
import { pushFeed } from './byline';
import { t } from './i18n';

export type StyleId = 'rookie' | 'sniper' | 'contrarian' | 'loudmouth' | 'quiet' | 'earlybird' | 'nightowl' | 'uturner' | 'believer' | 'sceptic' | 'steady';
export const STYLE_IDS: StyleId[] = ['sniper', 'contrarian', 'loudmouth', 'quiet', 'earlybird', 'nightowl', 'uturner', 'believer', 'sceptic', 'steady'];
export const STYLE_MIN = 10;
export const STYLE_EARLY_DAY = 3, STYLE_LATE_DAY = 6;

export interface StyleSave {
  n: number; early: number; late: number; quiet: number; loud: number; ut: number; trust: number; ignore: number; contra: number;
  right: number; wrong: number; byO: [number, number][];
  title?: StyleId; titles?: Record<string, number>; at?: number;
}
export type StyleHost = Save & { style?: StyleSave };
export const freshStyle = (): StyleSave => ({ n: 0, early: 0, late: 0, quiet: 0, loud: 0, ut: 0, trust: 0, ignore: 0, contra: 0, right: 0, wrong: 0, byO: [[0, 0], [0, 0], [0, 0], [0, 0]] });
export const styleSaveOf = (s: Save): StyleSave => (s as StyleHost).style || freshStyle();

export interface StyleStats { hit: number; early: number; late: number; quiet: number; loud: number; ut: number; trust: number; ignore: number; contra: number }
export interface StyleView { id: StyleId; n: number; ready: number; stats: StyleStats; bestO: number | null; titles: Record<string, number>; since?: number }

const ratio = (a: number, n: number) => (n ? a / n : 0);
export function styleStats(x: StyleSave): StyleStats {
  const n = x.n || 0, called = x.right + x.wrong;
  return { hit: ratio(x.right, called), early: ratio(x.early, n), late: ratio(x.late, n), quiet: ratio(x.quiet, n), loud: ratio(x.loud, n), ut: ratio(x.ut, n), trust: ratio(x.trust, n), ignore: ratio(x.ignore, n), contra: ratio(x.contra, n) };
}
/** The title the numbers earn right now (rookie under STYLE_MIN calls). */
export function titleFor(x: StyleSave): StyleId {
  if ((x.n || 0) < STYLE_MIN) return 'rookie';
  const s = styleStats(x);
  if (s.hit >= 0.65 && s.early >= 0.5) return 'sniper';
  if (s.contra >= 0.35 && s.hit >= 0.5) return 'contrarian';
  if (s.loud >= 0.5) return 'loudmouth';
  if (s.quiet >= 0.5) return 'quiet';
  if (s.early >= 0.6) return 'earlybird';
  if (s.late >= 0.45) return 'nightowl';
  if (s.ut >= 0.2) return 'uturner';
  if (s.trust >= 0.6) return 'believer';
  if (s.ignore >= 0.3) return 'sceptic';
  return 'steady';
}
export function styleOf(s: Save): StyleView {
  const x = styleSaveOf(s);
  const id = x.title || titleFor(x);
  const best = x.byO.map(([r, w], o) => ({ o, r, n: r + w })).filter((b) => b.n >= 2).sort((a, b) => b.r / b.n - a.r / a.n || b.n - a.n)[0];
  return { id, n: x.n, ready: Math.min(STYLE_MIN, x.n), stats: styleStats(x), bestO: best ? best.o : null, titles: x.titles || {}, since: x.at };
}

/** One call's signals. `days` is the window length (7 in every mode today). */
export function callSignals(p: ResultSaga, days = 7) {
  const c = p.call!;
  const before = (d: number) => d <= c.day;
  const reads = p.reads.filter((r) => before(r.day));
  const posts = p.posts.filter((f) => f.day < c.day);
  return {
    early: c.day <= STYLE_EARLY_DAY, late: c.day >= Math.min(STYLE_LATE_DAY, days - 1), quiet: c.s === 0, loud: c.s === 2,
    ut: !!c.ut || !!c.from,
    trust: p.right && reads.some((r) => r.right),
    ignore: p.right && reads.length > 0 && reads.every((r) => !r.right),
    contra: posts.length > 0 && posts.every((f) => f.claim !== c.o),
    right: p.right,
  };
}
/** Folds one resolved window into the profile (call from the byline's window event, inside the save draft).
 *  Returns the title newly earned by this window, or null. Practice is skipped: the coach shows the odds there. */
export function trackStyle(s: Save, per: ResultSaga[], mode: string, days = 7): StyleId | null {
  if (mode === 'practice') return null;
  const host = s as StyleHost;
  const x = (host.style = host.style || freshStyle());
  for (const p of per) {
    if (!p.call) continue;
    const g = callSignals(p, days);
    x.n++;
    if (g.early) x.early++; if (g.late) x.late++; if (g.quiet) x.quiet++; if (g.loud) x.loud++; if (g.ut) x.ut++;
    if (g.trust) x.trust++; if (g.ignore) x.ignore++; if (g.contra) x.contra++;
    if (g.right) x.right++; else x.wrong++;
    const o = Math.max(0, Math.min(3, p.call.o)); x.byO[o] = x.byO[o] || [0, 0]; x.byO[o][g.right ? 0 : 1]++;
  }
  const id = titleFor(x);
  if (id === 'rookie') return null;
  const titles = (x.titles = x.titles || {});
  const changed = x.title !== id;
  x.title = id; x.at = changed ? Date.now() : x.at || Date.now();
  if (titles[id]) return null;
  titles[id] = Date.now();
  pushFeed(s, { kind: 'level', key: 'live.feed.style', v: { m: 'live.style.' + id + '.t' }, to: { n: 'me' }, tone: 'gold' });
  moment('style:' + id, undefined, true); // film: moment-style-<id>, once per title
  return id;
}
/** The i18n key of a one-line read of your style (rivals' banter, the editor's notes, the Daily brief). */
export const styleLineKey = (s: Save) => 'live.style.' + styleOf(s).id + '.line';
export const styleTitleKey = (s: Save) => 'live.style.' + styleOf(s).id + '.t';
/** The line itself, in the player's language ("The Sniper: files early, rarely wrong."). */
export const styleLine = (s: Save) => t(styleLineKey(s), { n: styleOf(s).n, m: STYLE_MIN });
export const styleTitle = (s: Save) => t(styleTitleKey(s));
