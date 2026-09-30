// The press box films (GOTY.md §7.3): moment-room-win, moment-friend-scalp, moment-newsroom-week. Same pattern as
// film/moments/build.tsx: the rendered clip (when the film lane delivers it) with the game's words on top, and a
// frame-drawn title card as the fallback. Nobody speaks; every string is printed on a card. Unskippable, short.
import { tr } from '../../lib/i18n';
import type { Save } from '../../lib/save';
import type { SceneSpec } from '../registry';
import type { SceneMeta } from '../cues';
import { FPS } from '../cues';
import { C } from '../kit';
import { MomentOverlay } from '../moments/Overlay';
import { TitleCard, TITLE_CARD } from './TitleCard';
import type { Clip } from '../moments/manifest';

export const SOCIAL_IDS = ['moment-room-win', 'moment-friend-scalp', 'moment-newsroom-week'] as const;
/** For the film lane (see moments/manifest.ts for the stem/poster contract). */
export const SOCIAL_CLIPS: Clip[] = [
  { id: 'moment-room-win', seconds: 3.2, overlayAt: 1.8, shows: 'The press box at a stadium: a row of reporters on laptops; the one in the middle leans back and stretches while the others slump; the scoreboard behind them flips to show a single name at the top of a table (the game prints the room and the round).' },
  { id: 'moment-friend-scalp', seconds: 3.2, overlayAt: 2, shows: 'Two reporters at neighbouring desks; the TV between them shows your post going viral; the friend slides a coffee across in surrender and turns their laptop away (the game prints their byline and the record).' },
  { id: 'moment-newsroom-week', seconds: 3.4, overlayAt: 2.2, shows: 'A newsroom on Sunday night: the masthead on the wall lights up; a printed weekly table is pinned to the board and a hand circles the newsroom’s line (the game prints the name, the rank and the points).' },
];
const clipOf = (id: string) => SOCIAL_CLIPS.find((c) => c.id === id);
const META: SceneMeta = TITLE_CARD;

/** undefined: not a social film id. null: can't be built. */
export function buildSocial(id: string, s: Save, extra: Record<string, unknown> = {}): SceneSpec | null | undefined {
  if (!(SOCIAL_IDS as readonly string[]).includes(id)) return undefined;
  const L = s.lang, rtl = L === 'ar', t = (k: string, v?: Record<string, string | number>) => tr(L, k, v);
  const byline = s.nick.trim() || t('film.cold.anon');
  const v = (x: unknown, d: string | number = '') => (x == null || x === '' ? d : (x as string | number));
  let words: { kicker: string; title: string; sub: string; stamp: string; accent: string; ltrTitle?: boolean };
  if (id === 'moment-room-win') {
    words = { kicker: t('so.film.roomWin.kicker'), title: t('so.film.roomWin.title', { n: v(extra.round, 1) }), sub: t('so.film.roomWin.sub', { room: v(extra.room, 'Tier One'), s: v(extra.score, 0) }) + (extra.who ? ' · ' + t('so.film.roomWin.by', { who: String(extra.who) }) : ''), stamp: t('so.film.roomWin.stamp'), accent: '#9E7BFF' };
  } else if (id === 'moment-friend-scalp') {
    // Replays (the Me gallery) name the latest friend whose scalp you took; a fresh save gets the byline placeholder.
    const latest = Object.entries(s.rivals || {}).filter(([id, r]) => id.startsWith('friend:') && r.scalp).sort((a, b) => (b[1].scalp || 0) - (a[1].scalp || 0))[0];
    const name = String(v(extra.name, (latest && latest[1].name) || t('film.cold.anon')));
    words = { kicker: t('so.film.friendScalp.kicker'), title: name, sub: t('so.film.friendScalp.sub', { w: v(extra.w, 5), l: v(extra.l, 0) }), stamp: t('so.film.friendScalp.stamp'), accent: C.red, ltrTitle: true };
  } else {
    words = { kicker: t('so.film.nrWeek.kicker'), title: String(v(extra.name, 'Tier One')), sub: t('so.film.nrWeek.sub', { r: v(extra.rank, 1), p: v(extra.pts, 0) }), stamp: t('so.film.nrWeek.stamp'), accent: C.gold, ltrTitle: true };
  }
  const c = clipOf(id)!;
  return {
    id, rtl, title: t('film.name.' + id), Comp: TitleCard, meta: META, skippable: false,
    props: { ...words, byline, rtl },
    video: { stem: c.id, dur: Math.round(c.seconds * FPS), Overlay: MomentOverlay, overlayProps: { kicker: words.kicker, title: words.title, sub: words.sub, stamp: words.stamp, accent: words.accent, at: Math.round(c.overlayAt * FPS), rtl } },
  };
}
