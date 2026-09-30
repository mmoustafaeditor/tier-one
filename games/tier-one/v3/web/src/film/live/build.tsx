// Live-lane moment ids → scene specs (pattern: film/moments/build.tsx). Ids:
//   ddlive:open | ddlive:close     Deadline Day Live opens / the board closes     (clips moment-ddlive-open / -close)
//   style:<id>                     a playstyle title earned (lib/style.ts)        (clip moment-style-<id>)
//   streak:<7|30|100>              a Daily streak milestone                       (clip moment-streak-<n>)
// A bare family id (ddlive, style, streak) is the Me-page replay: the latest one seen. Rendered clips play when the
// Frame-drawn motion pieces (film/moments/Motion.tsx): the ON AIR sign, a typewritten dossier card, a wall calendar.
import { tr, fmtDate } from '../../lib/i18n';
import type { Save } from '../../lib/save';
import type { SceneSpec } from '../registry';
import { STYLE_IDS } from '../../lib/style';
import { OnAir, ON_AIR, OFF_AIR, Dossier, DOSSIER, CalendarFill, CALENDAR_FILL } from '../moments/Motion';

export const LIVE_IDS = ['ddlive', 'style', 'streak'];
const FAMILY = /^(ddlive|style|streak)(:|$)/;
const STREAKS = ['7', '30', '100'];

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
  const spec = (Comp: SceneSpec['Comp'], props: Record<string, unknown>, meta: SceneSpec['meta'], title: string): SceneSpec =>
    ({ id: id0, rtl, title, Comp, props: { ...props, rtl }, meta, skippable: false });
  if (fam === 'ddlive') {
    const open = arg !== 'close', k = open ? 'open' : 'close';
    const kicker = t('film.m.live.' + k + '.k') + ' · ' + String(extra.when || date);
    return spec(OnAir, { open, kicker, title: t('film.m.live.' + k + '.t'), sub: t('film.m.live.' + k + '.s'), stamp: t('film.m.live.' + k + '.stamp'), onAir: t('film.m.motion.onAir') }, open ? ON_AIR : OFF_AIR, t('film.name.ddlive'));
  }
  if (fam === 'style') {
    if (!(STYLE_IDS as string[]).includes(arg)) return null;
    const title = t('live.style.' + arg + '.t'), line = t('live.style.' + arg + '.line');
    return spec(Dossier, { kicker: t('film.m.live.style.k'), title, line, stamp: t('film.m.live.style.stamp'), byline }, DOSSIER, t('film.name.style') + ' · ' + title);
  }
  if (fam === 'streak') {
    if (!STREAKS.includes(arg)) return null;
    const n = Number(arg);
    return spec(CalendarFill, { n, month: fmtDate(Date.now(), L, { month: 'long' }), kicker: t('film.m.live.streak.k') + ' · ' + byline, title: t('film.m.live.streak.t', { n }), sub: t('film.m.live.streak.s'), stamp: t('film.m.live.streak.stamp') }, CALENDAR_FILL, t('film.name.streak') + ' · ' + n);
  }
  return null;
}
