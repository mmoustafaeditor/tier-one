// Moment ids → scene specs: frame-drawn motion pieces (GOTY.md §10: objects, places, paper, ink, light, type; no
// people, no clips). Ids: paper | paper-short | tier[:<tier>] | contact[:<src>] | scalp[:<rival>] | trophy:<rival> |
// deadline | deadline-short | official | catchphrase (herewego is an alias: the player's line replaces it, §12).
// A bare family id (tier, contact, scalp) is the Me-page replay: it plays the latest one seen.
import { tr, trList, fmtDate } from '../../lib/i18n';
import type { Save } from '../../lib/save';
import type { SceneSpec } from '../registry';
import { C, SRC_C, SOURCES } from '../kit';
import { filmCatchphrase } from '../catchphrase';
import { Deadline, DEADLINE, DEADLINE_SHORT } from '../scenes/Deadline';
import { PassPrint, PASS_META, PASS_META_BIG } from '../story/Chapters';
import { PressRun, PRESS_RUN, PRESS_RUN_SHORT, Breaking, BREAKING, PlaceGold, PLACE_GOLD, LaptopSlam, SLAM, Catchphrase, CATCHPHRASE } from './Motion';

/** The replay list's moment rows (Me page), after the cold open, the contacts and the season. */
export const MOMENT_IDS = ['paper', 'deadline', 'tier', 'contact', 'scalp', 'official', 'catchphrase'];
const TIERS = ['blogger', 'stringer', 'correspondent', 'chief', 'tierone'];
const RIVALS = ['tabloid', 'itk', 'insider'];
const FAMILY = /^(paper|paper-short|tier|contact|scalp|trophy|deadline|deadline-short|official|catchphrase|herewego)(:|$)/;
/** Save.film key a moment marks as seen (short cuts share their film's key). */
export const momentKey = (id: string) => id.replace(/-short$/, '');

function latest(s: Save, prefix: string[]): string | null {
  const got = ((s as Save & { film?: string[] }).film || []).filter((k) => prefix.some((p) => k.startsWith(p + ':')));
  return got.length ? got[got.length - 1] : null;
}

/** undefined: not a moment id. null: a moment id that can't be built. */
export function buildMoment(id0: string, s: Save, extra: Record<string, unknown> = {}): SceneSpec | null | undefined {
  if (!FAMILY.test(id0)) return undefined;
  const L = s.lang, rtl = L === 'ar', t = (k: string, v?: Record<string, string | number>) => tr(L, k, v);
  const byline = s.nick.trim() || t('film.cold.anon');
  const date = fmtDate(Date.now(), L, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  let id = id0;
  if (id === 'tier') id = latest(s, ['tier']) || 'tier:stringer';
  if (id === 'contact') id = latest(s, ['contact']) || 'contact:barber';
  if (id === 'scalp') id = latest(s, ['scalp', 'trophy']) || 'scalp:itk';
  const [fam, arg = ''] = id.split(':');
  const spec = (_clip: string, Comp: SceneSpec['Comp'], props: Record<string, unknown>, meta: SceneSpec['meta'], _over: Record<string, unknown>, title: string): SceneSpec =>
    ({ id: id0, rtl, title, Comp, props: { ...props, rtl }, meta, skippable: false });

  if (fam === 'catchphrase' || fam === 'herewego') {
    const line = String(extra.line || filmCatchphrase(s));
    return spec('', Catchphrase, { line, byline, kicker: t('film.m.motion.cp') }, CATCHPHRASE, {}, t('film.name.catchphrase'));
  }
  if (fam === 'paper' || fam === 'paper-short') {
    const short = fam === 'paper-short';
    const headline = String(extra.hed || t('film.m.paper.demo'));
    const kicker = String(extra.what || t('film.m.paper.kicker'));
    const masthead = String(extra.paper || 'Tier One');
    return spec('', PressRun,
      { masthead, edition: t('film.m.paper.edition'), dateline: date, headline, byline: t('film.cold.by', { n: byline }), kicker, stamp: t('film.m.paper.stamp'), cut: short ? 'short' : 'full' },
      short ? PRESS_RUN_SHORT : PRESS_RUN, { kicker: masthead + ' · ' + date, title: headline, sub: t('film.cold.by', { n: byline }), stamp: t('film.m.paper.stamp') }, t('film.name.paper'));
  }
  if (fam === 'tier') {
    if (!TIERS.includes(arg)) return null;
    const big = arg === 'tierone', tier = t('cn.tier.' + arg);
    return spec('', PassPrint, { tier, byline, press: t('film.m.tier.press'), stamp: t('film.m.tier.stamp'), kicker: t('film.m.tier.kicker'), big, accent: C.gold },
      big ? PASS_META_BIG : PASS_META, { kicker: t('film.m.tier.kicker'), title: tier, sub: byline, stamp: t('film.m.tier.stamp'), accent: C.gold }, t('film.name.tier') + ' · ' + tier);
  }
  if (fam === 'contact') {
    if (!(SOURCES as readonly string[]).includes(arg)) return null;
    const name = t('src.' + arg);
    return spec('', PlaceGold, { src: arg, name, kicker: t('film.m.contact.kicker'), lv: t('film.m.contact.lv'), perk: t('film.m.contact.perk'), stamp: t('film.m.contact.stamp') },
      PLACE_GOLD, { kicker: t('film.m.contact.kicker'), title: name, sub: t('film.m.contact.lv'), stamp: t('film.m.contact.stamp'), accent: SRC_C[arg] || C.gold }, t('film.name.contact') + ' · ' + name);
  }
  if (fam === 'scalp' || fam === 'trophy') {
    if (!RIVALS.includes(arg)) return null;
    const trophy = fam === 'trophy', handle = t('rival.' + arg);
    const rec = s.rivals?.[arg] || { w: 0, l: 0 };
    const record = t('film.m.scalp.record', { w: rec.w, l: rec.l, r: handle });
    const stamp = t(trophy ? 'film.m.scalp.trophy' : 'film.m.scalp.stamp');
    return spec('', LaptopSlam, { handle, byline, post: t('film.m.scalp.post'), theirs: t('film.m.scalp.theirs'), viral: t('film.m.scalp.viral'), record, stamp, trophy },
      SLAM, { kicker: handle, title: stamp, sub: record, accent: trophy ? C.gold : C.red }, t('film.name.scalp') + ' · ' + handle);
  }
  if (fam === 'deadline' || fam === 'deadline-short') {
    const short = fam === 'deadline-short';
    return spec(short ? 'moment-deadline-short' : 'moment-deadline', Deadline, { title: t('film.m.dd.title'), kicker: t('film.m.dd.kicker'), pings: (trList(L, 'film.m.dd.pings') as string[]) || [], gate: t('film.m.dd.gate'), cut: short ? 'short' : 'full' },
      short ? DEADLINE_SHORT : DEADLINE, { kicker: date, title: t('film.m.dd.title') }, t('film.name.deadline'));
  }
  if (fam === 'official') {
    const player = String(extra.p || t('film.m.official.demo'));
    return spec('', Breaking, { player, breaking: t('film.m.official.breaking'), official: t('film.m.official.official'), ticker: t('film.m.official.ticker', { p: player, n: byline }), credit: t('film.m.official.credit'), byline },
      BREAKING, { kicker: t('film.m.official.official'), title: player, sub: t('film.m.official.credit') + ': ' + byline, stamp: t('film.m.official.official') }, t('film.name.official'));
  }
  return null;
}
