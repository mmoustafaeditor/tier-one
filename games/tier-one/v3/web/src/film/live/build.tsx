// Live-lane moment ids → scene specs (pattern: film/moments/build.tsx). Ids:
//   ddlive:open | ddlive:close     Deadline Day Live opens / the board closes     (clips moment-ddlive-open / -close)
//   style:<id>                     a playstyle title earned (lib/style.ts)        (clip moment-style-<id>)
//   streak:<7|30|100>              a Daily streak milestone                       (clip moment-streak-<n>)
// A bare family id (ddlive, style, streak) is the Me-page replay: the latest one seen. Rendered clips play when the
// film lane lists them in film/moments/manifest.ts (or LIVE_CLIPS below); the TitleCard drawing is the fallback.
import { tr, fmtDate } from '../../lib/i18n';
import type { Save } from '../../lib/save';
import type { SceneSpec } from '../registry';
import { C } from '../kit';
import { FPS } from '../cues';
import { clipOf, type Clip } from '../moments/manifest';
import { MomentOverlay } from '../moments/Overlay';
import { TitleCard, TITLE_CARD, TITLE_CARD_LOUD, TITLE_CARD_GOLD } from './TitleCard';
import { STYLE_IDS } from '../../lib/style';

/** What the 3D film lane should render for each stem (same contract as film/moments/manifest.ts). */
export const LIVE_CLIPS: Clip[] = [
  { id: 'moment-ddlive-open', seconds: 3, overlayAt: 1.6, shows: 'A newsroom at dawn: every desk lamp comes on at once, the big wall clock reads 00:00, a red ON AIR sign lights over the door (the game prints LIVE and the date).' },
  { id: 'moment-ddlive-close', seconds: 2.6, overlayAt: 1.2, shows: 'The same newsroom at midnight: the ON AIR sign goes dark, the last lamp clicks off, a referee’s whistle hangs from the clock (the game prints BOARD CLOSED).' },
  ...STYLE_IDS.map((id): Clip => ({ id: 'moment-style-' + id, seconds: 2.8, overlayAt: 1.4, shows: 'A press card on the desk is turned over; a new line is stamped under the byline (the game prints the title).' })),
  ...[7, 30, 100].map((n): Clip => ({ id: 'moment-streak-' + n, seconds: 2.6, overlayAt: 1.2, shows: 'A desk calendar; ' + n + ' days are struck through in one continuous motion; the pen is set down (the game prints the number).' })),
];
export const LIVE_IDS = ['ddlive', 'style', 'streak'];
const FAMILY = /^(ddlive|style|streak)(:|$)/;
const STREAKS = ['7', '30', '100'];
const liveClip = (id: string) => clipOf(id) || LIVE_CLIPS.find((c) => c.id === id);

function latest(s: Save, prefix: string): string | null {
  const got = ((s as Save & { film?: string[] }).film || []).filter((k) => k.startsWith(prefix + ':'));
  return got.length ? got[got.length - 1] : null;
}

/** undefined: not a live-lane id. null: a live-lane id that can't be built. */
export function buildLive(id0: string, s: Save, extra: Record<string, unknown> = {}): SceneSpec | null | undefined {
  if (!FAMILY.test(id0)) return undefined;
  const L = s.lang, rtl = L === 'ar', t = (k: string, v?: Record<string, string | number>) => tr(L, k, v);
  const byline = s.nick.trim() || t('film.cold.anon');
  const date = fmtDate(Date.now(), L, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  let id = id0;
  if (id === 'ddlive') id = latest(s, 'ddlive') || 'ddlive:open';
  if (id === 'style') id = latest(s, 'style') || 'style:steady';
  if (id === 'streak') id = latest(s, 'streak') || 'streak:7';
  const [fam, arg = ''] = id.split(':');
  const spec = (clip: string, props: Record<string, unknown>, meta: SceneSpec['meta'], over: Record<string, unknown>, title: string): SceneSpec => {
    const c = liveClip(clip);
    return {
      id: id0, rtl, title, Comp: TitleCard, props: { ...props, rtl }, meta, skippable: false,
      video: c ? { stem: c.id, dur: Math.round(c.seconds * FPS), Overlay: MomentOverlay, overlayProps: { ...over, at: Math.round(c.overlayAt * FPS), rtl } } : undefined,
    };
  };
  if (fam === 'ddlive') {
    const open = arg !== 'close', k = open ? 'open' : 'close';
    const kicker = t('film.m.live.' + k + '.k') + ' · ' + String(extra.when || date);
    return spec('moment-ddlive-' + k, { kicker, title: t('film.m.live.' + k + '.t'), sub: t('film.m.live.' + k + '.s'), stamp: t('film.m.live.' + k + '.stamp'), accent: C.red, glyph: open ? 'clock' : 'whistle' },
      open ? TITLE_CARD_LOUD : TITLE_CARD, { kicker, title: t('film.m.live.' + k + '.t'), sub: t('film.m.live.' + k + '.s'), stamp: t('film.m.live.' + k + '.stamp') }, t('film.name.ddlive'));
  }
  if (fam === 'style') {
    if (!(STYLE_IDS as string[]).includes(arg)) return null;
    const title = t('live.style.' + arg + '.t'), line = t('live.style.' + arg + '.line');
    return spec('moment-style-' + arg, { kicker: t('film.m.live.style.k') + ' · ' + byline, title, sub: line, stamp: t('film.m.live.style.stamp'), accent: C.gold, glyph: 'pen', confetti: true },
      TITLE_CARD_GOLD, { kicker: t('film.m.live.style.k'), title, sub: line, stamp: t('film.m.live.style.stamp'), accent: C.gold }, t('film.name.style') + ' · ' + title);
  }
  if (fam === 'streak') {
    if (!STREAKS.includes(arg)) return null;
    const n = Number(arg), big = n >= 30;
    return spec('moment-streak-' + arg, { kicker: t('film.m.live.streak.k') + ' · ' + byline, big: String(n), title: t('film.m.live.streak.t', { n }), sub: t('film.m.live.streak.s'), stamp: t('film.m.live.streak.stamp'), accent: big ? C.gold : C.red, glyph: 'flame', confetti: big },
      big ? TITLE_CARD_GOLD : TITLE_CARD, { kicker: t('film.m.live.streak.k'), title: t('film.m.live.streak.t', { n }), sub: byline, stamp: t('film.m.live.streak.stamp'), accent: big ? C.gold : C.red }, t('film.name.streak') + ' · ' + n);
  }
  return null;
}
