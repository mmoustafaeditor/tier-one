// Story mode films ("The Comeback", STORY.html): story-<id> → a frame-drawn motion piece (GOTY.md §10; no clips, no
// people). Ids: story-prologue · story-ch1-open … story-ch5-open · story-ch1-reveal … story-ch4-reveal ·
// story-promo-2 … story-promo-5 (the press pass printed for the chapter's rank) · story-finale · story-epilogue.
import { tr, trList, fmtDate } from '../../lib/i18n';
import type { Save } from '../../lib/save';
import type { SceneSpec } from '../registry';
import { C } from '../kit';
import { Prologue, PROLOGUE } from './Prologue';
import { ChapterOpen, OPEN_META, Reveal, REVEAL_META, PassPrint, PASS_META, PASS_META_BIG, Finale, FINALE_META, Epilogue, EPI_META } from './Chapters';

export const STORY_SCENE_IDS = ['story-prologue', 'story-ch1-open', 'story-ch1-reveal', 'story-ch2-open', 'story-promo-2', 'story-ch2-reveal', 'story-ch3-open', 'story-promo-3', 'story-ch3-reveal',
  'story-ch4-open', 'story-promo-4', 'story-ch4-reveal', 'story-ch5-open', 'story-promo-5', 'story-finale', 'story-epilogue'] as const;
const CH = ['blog', 'post', 'nationals', 'war', 'chronicle'];
const EV = ['rosa', 'kev', 'tony', 'priya'];
const bare = (name: string) => { const k = name.indexOf(' · '); return k >= 0 ? name.slice(k + 3) : name; };

/** undefined: not a story id. null: a story id that can't be built. */
export function buildStory(id: string, s: Save): SceneSpec | null | undefined {
  if (!id.startsWith('story-')) return undefined;
  if (!(STORY_SCENE_IDS as readonly string[]).includes(id)) return null;
  const L = s.lang, rtl = L === 'ar', t = (k: string, v?: Record<string, string | number>) => tr(L, k, v);
  const G = 'g.story.film.', obj = (k: string) => (trList(L, G + k) || {}) as Record<string, any>;
  const byline = s.nick.trim() || t('film.cold.anon');
  const date = fmtDate(Date.now(), L, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const pro = obj('pro');
  const spec = (title: string, Comp: SceneSpec['Comp'], meta: SceneSpec['meta'], props: Record<string, unknown>): SceneSpec => ({ id, rtl, title, Comp, meta, props: { ...props, rtl }, skippable: false });

  if (id === 'story-prologue') {
    return spec(t('g.story.prologue') + ' · ' + t(G + 'prologueT'), Prologue, PROLOGUE, {
      byline, clock: pro.clock, caller: pro.caller, calling: pro.calling, masthead: pro.masthead, draft: pro.draft, board: pro.board || [],
      headline: pro.headline, stamp: pro.stamp, replies: pro.replies || [], followers: pro.followers, box: pro.box, unknown: pro.unknown, text: pro.text,
      blog: pro.blog, chapter: t('g.story.chapter', { n: 1 }), chapterName: bare(t('g.story.ch.blog.name')),
    });
  }
  const m = /^story-ch(\d)-(open|reveal)$/.exec(id);
  if (m) {
    const n = +m[1];
    if (m[2] === 'open') {
      const kind = CH[n - 1], kicker = t('g.story.chapter', { n }) + ' · ' + t('career.ranks.' + (n - 1)), title = bare(t('g.story.ch.' + kind + '.name'));
      return spec(kicker + ' · ' + title, ChapterOpen, OPEN_META[kind], { kind, w: { ...obj('open.' + kind), box: pro.box }, kicker, title, byline });
    }
    const kind = EV[n - 1], kicker = t('g.story.caseFile.title') + ' · ' + t('g.story.chapter', { n }), title = t('g.story.caseFile.ev.' + kind + '.t');
    return spec(kicker + ' · ' + title, Reveal, REVEAL_META[kind], { kind, w: obj('reveal.' + kind), kicker, title, byline });
  }
  const pm = /^story-promo-(\d)$/.exec(id);
  if (pm) {
    const n = +pm[1], tier = t('career.ranks.' + (n - 1)), big = n === 5;
    return spec(t('film.name.tier') + ' · ' + tier, PassPrint, big ? PASS_META_BIG : PASS_META,
      { byline, tier, kicker: t('film.m.tier.kicker'), press: t('film.m.tier.press'), stamp: t('film.m.tier.stamp'), accent: big ? C.gold : n >= 3 ? C.red : C.gold, big });
  }
  const fin = obj('finale'), epi = obj('epi');
  const page = { masthead: pro.masthead, edition: t('film.m.paper.edition'), date, kicker: fin.kicker, headline: fin.headline, stamp: t('film.m.paper.stamp') };
  if (id === 'story-finale') {
    const kicker = t('g.story.chapter', { n: 5 }) + ' · ' + t(G + 'finaleK');
    return spec(kicker + ' · ' + t(G + 'finaleT'), Finale, FINALE_META, { kind: 'finale', w: { ...fin, ...page }, kicker, title: t(G + 'finaleT'), byline });
  }
  return spec(t('g.story.epilogue') + ' · ' + bare(t('g.story.ch.front.name')), Epilogue, EPI_META, { kind: 'epilogue', w: { ...epi, ...page }, kicker: t('g.story.epilogue'), title: '', byline });
}
