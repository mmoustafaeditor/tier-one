// The press box films (GOTY.md §7.3): moment-room-win (a results board flips to your name), moment-friend-scalp (their
// laptop slams shut under your post on the TV wall), moment-newsroom-week (the masthead lights, the table is circled).
// Frame-drawn motion pieces (film/moments/Motion.tsx, §10): no people, every string printed on a thing. Unskippable.
import { tr } from '../../lib/i18n';
import type { Save } from '../../lib/save';
import type { SceneSpec } from '../registry';
import { C } from '../kit';
import { Board, BOARD, LaptopSlam, SLAM } from '../moments/Motion';

export const SOCIAL_IDS = ['moment-room-win', 'moment-friend-scalp', 'moment-newsroom-week'] as const;

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
  const title = t('film.name.' + id);
  if (id === 'moment-friend-scalp')
    return { id, rtl, title, Comp: LaptopSlam, meta: SLAM, skippable: false, props: { handle: words.title, byline, post: t('film.m.scalp.post'), theirs: t('film.m.scalp.theirs'), viral: t('film.m.scalp.viral'), record: words.sub, stamp: words.stamp, rtl } };
  return { id, rtl, title, Comp: Board, meta: BOARD, skippable: false, props: { ...words, variant: id === 'moment-room-win' ? 'room' : 'week', byline, rtl } };
}
