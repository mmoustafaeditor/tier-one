// Scene ids → the component, its translated props and its timing. The only place the game's i18n and save meet
// the scenes; the scenes themselves stay pure (props in, frames out).
import type { ComponentType } from 'react';
import { tr, trList, fmtDate } from '../lib/i18n';
import type { Save } from '../lib/save';
import type { SceneMeta } from './cues';
import { SOURCES } from './kit';
import { seasonOf } from './season';
import { ColdOpen, COLD_OPEN, COLD_OPEN_CAREER } from './scenes/ColdOpen';
import { SourceIntro, sourceIntroMeta } from './scenes/SourceIntro';
import { SeasonOpener, SEASON_OPENER } from './scenes/SeasonOpener';
import { buildMoment, MOMENT_IDS } from './moments/build';

/** A clip to play instead of the drawn scene: `stem` resolves to films/<stem>-p|l.mp4 (film/clips.ts), `dur` is its
 *  expected length in frames (drives the overlay clock and the stall safety net), and `Overlay` draws the game's own
 *  words on top with `overlayProps`. */
export type SceneVideo = { stem: string; dur: number; Overlay?: ComponentType<any>; overlayProps?: Record<string, unknown> };
/** Films play straight through (no Skip, tap-to-jump or Esc) unless `skippable: true`. */
export type SceneSpec = { id: string; title: string; Comp: ComponentType<any>; props: Record<string, unknown>; meta: SceneMeta; rtl: boolean; skippable?: boolean; video?: SceneVideo };
/** Every scene the replay list knows about, in story order. */
export const SCENE_IDS = ['coldopen', ...SOURCES.map((s) => 'source:' + s), 'season', ...MOMENT_IDS];

export function buildScene(id: string, s: Save, extra?: Record<string, unknown>): SceneSpec | null {
  const L = s.lang, rtl = L === 'ar', t = (k: string, v?: Record<string, string | number>) => tr(L, k, v);
  const m = buildMoment(id, s, extra);
  if (m !== undefined) return m;
  if (id === 'career') id = 'coldopen';
  if (id === 'coldopen' || id === 'coldopen-career') {
    const career = id === 'coldopen-career';
    const byline = s.nick.trim() || t('film.cold.anon');
    const paper = career ? (s.career?.paper || t('g.story.paperDefault', { n: s.nick.trim() || t('common.you') })) : 'Tier One';
    return {
      id, rtl, title: t('film.name.' + id), Comp: ColdOpen, meta: career ? COLD_OPEN_CAREER : COLD_OPEN,
      props: {
        byline, byLabel: t('film.cold.by', { n: byline }), paper, edition: career ? t('film.cold.night') : t('brand.edition'),
        memo: t('film.cold.memo'), note: t(career ? 'film.cold.careerNote' : 'film.cold.note'), sign: t('film.cold.sign'),
        headline: career ? t('film.cold.careerHeadline', { n: paper }) : t('film.cold.headline', { n: byline }),
        dateline: fmtDate(Date.now(), L, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
        sources: SOURCES.map((k) => t('src.' + k)), stamp: t('film.cold.stamp'), cut: career ? 'career' : 'full', rtl,
      },
    };
  }
  if (id.startsWith('source:')) {
    const src = id.slice(7);
    if (!(SOURCES as readonly string[]).includes(src)) return null;
    const name = t('src.' + src);
    return {
      id, rtl, title: t('film.name.source', { n: name }), Comp: SourceIntro, meta: sourceIntroMeta(src),
      props: { src, name, trait: t(`film.source.${src}.trait`), line: t(`film.source.${src}.line`), calling: t('film.source.calling'), unknown: t('film.source.unknown'), rtl },
    };
  }
  if (id === 'season' || id.startsWith('season:')) {
    const se = seasonOf();
    const title = t('film.season.names.' + se.key);
    const o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return {
      id: 'season', rtl, title, Comp: SeasonOpener, meta: SEASON_OPENER,
      props: { title, kicker: t('film.season.kicker'), dates: fmtDate(se.start, L, o) + ' – ' + fmtDate(se.end, L, { ...o, year: 'numeric' }), clippings: (trList(L, 'film.season.clips') as string[]) || [], accent: se.accent, rtl },
    };
  }
  return null;
}
