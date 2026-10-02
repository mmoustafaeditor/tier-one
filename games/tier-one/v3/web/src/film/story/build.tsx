// Career Mode films: story-<id> → a frame-drawn motion piece (GOTY.md §10; no clips, no people). Ids: story-prologue
// (the fall) · story-ch1-open … story-ch5-open (each stage's first day) · story-promo-2 … story-promo-5 (the press pass
// printed for the stage). 3.8 (LAUNCH_BRIEF §11) retired the case-file reveals, the finale and the epilogue with the
// conspiracy; Reveal / Finale / Epilogue in ./Chapters.tsx are unused and can go.
import { tr, trList } from '../../lib/i18n';
import type { Save } from '../../lib/save';
import type { SceneSpec } from '../registry';
import { C } from '../kit';
import { Prologue, PROLOGUE } from './Prologue';
import { ChapterOpen, OPEN_META, PassPrint, PASS_META, PASS_META_BIG } from './Chapters';

export const STORY_SCENE_IDS = ['story-prologue', 'story-ch1-open', 'story-ch2-open', 'story-promo-2', 'story-ch3-open', 'story-promo-3', 'story-ch4-open', 'story-promo-4', 'story-ch5-open', 'story-promo-5'] as const;
// The drawn sets keep their 3.4 keys in ./Chapters.tsx (post = a local desk, war = the press box's screen wall, chronicle = the old newsroom).
const CH = ['blog', 'post', 'nationals', 'war', 'chronicle'];
const STAGE = ['blog', 'local', 'nationals', 'pressbox', 'tierone'];
const stageName = (t: (k: string) => string, n: number) => t('cr38.stage.' + STAGE[n - 1] + '.name');

/** undefined: not a story id. null: a story id that can't be built. */
export function buildStory(id: string, s: Save): SceneSpec | null | undefined {
  if (!id.startsWith('story-')) return undefined;
  if (!(STORY_SCENE_IDS as readonly string[]).includes(id)) return null;
  const L = s.lang, rtl = L === 'ar', t = (k: string, v?: Record<string, string | number>) => tr(L, k, v);
  const G = 'g.story.film.', obj = (k: string) => (trList(L, G + k) || {}) as Record<string, any>;
  const byline = s.nick.trim() || t('film.cold.anon');
  const pro = obj('pro');
  const spec = (title: string, Comp: SceneSpec['Comp'], meta: SceneSpec['meta'], props: Record<string, unknown>): SceneSpec => ({ id, rtl, title, Comp, meta, props: { ...props, rtl }, skippable: false });

  if (id === 'story-prologue') {
    return spec(t('g.story.prologue') + ' · ' + t(G + 'prologueT'), Prologue, PROLOGUE, {
      byline, clock: pro.clock, caller: pro.caller, calling: pro.calling, masthead: pro.masthead, draft: pro.draft, board: pro.board || [],
      headline: pro.headline, stamp: pro.stamp, replies: pro.replies || [], followers: pro.followers, box: pro.box, unknown: pro.unknown, text: pro.text,
      blog: pro.blog, chapter: t('g.story.chapter', { n: 1 }), chapterName: stageName(t, 1),
    });
  }
  const m = /^story-ch(\d)-open$/.exec(id);
  if (m) {
    const n = +m[1];
    const kind = CH[n - 1], kicker = t('g.story.chapter', { n }) + ' · ' + t('career.ranks.' + (n - 1)), title = stageName(t, n);
    return spec(kicker + ' · ' + title, ChapterOpen, OPEN_META[kind], { kind, w: { ...obj('open.' + kind), box: pro.box }, kicker, title, byline });
  }
  const pm = /^story-promo-(\d)$/.exec(id);
  if (pm) {
    const n = +pm[1], tier = t('career.ranks.' + (n - 1)), big = n === 5;
    return spec(t('film.name.tier') + ' · ' + tier, PassPrint, big ? PASS_META_BIG : PASS_META,
      { byline, tier, kicker: t('film.m.tier.kicker'), press: t('film.m.tier.press'), stamp: t('film.m.tier.stamp'), accent: big ? C.gold : n >= 3 ? C.red : C.gold, big });
  }
  return null;
}
