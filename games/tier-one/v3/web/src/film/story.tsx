// Story mode films ("The Comeback"): the ids the game plays at each story moment, and the title-card fallback used for
// any of them that has no registered film yet. The clip lane plays films/story-<id>-<p|l>.mp4 when one exists; until
// then every id still gets a ~2.5 s card in the game's look, so a story moment never plays nothing.
import { tr } from '../lib/i18n';
import type { Save } from '../lib/save';
import type { SceneSpec } from './registry';
import { StoryCard, STORY_CARD } from './scenes/StoryCard';

export const STORY_SCENE_IDS = ['story-prologue', 'story-ch1-open', 'story-ch1-reveal', 'story-ch2-open', 'story-ch2-reveal', 'story-ch3-open', 'story-ch3-reveal',
  'story-ch4-open', 'story-ch4-reveal', 'story-ch5-open', 'story-finale', 'story-epilogue'] as const;
const CH = ['blog', 'post', 'nationals', 'war', 'chronicle'];
const bare = (name: string) => { const k = name.indexOf(' · '); return k >= 0 ? name.slice(k + 3) : name; };

/** The card for a story-<id>. Returns null for an id that isn't a story moment. */
export function buildStoryScene(id: string, s: Save): SceneSpec | null {
  if (!(STORY_SCENE_IDS as readonly string[]).includes(id)) return null;
  const L = s.lang, rtl = L === 'ar', t = (k: string, v?: Record<string, string | number>) => tr(L, k, v);
  let kicker = '', title = '', num = '', tone: 'gold' | 'red' = 'gold';
  const m = /^story-ch(\d)-(open|reveal)$/.exec(id);
  if (m) {
    const n = +m[1], ch = CH[n - 1];
    num = String(n);
    if (m[2] === 'open') { kicker = t('g.story.chapter', { n }) + ' · ' + t('career.ranks.' + (n - 1)); title = bare(t('g.story.ch.' + ch + '.name')); }
    else { kicker = t('g.story.caseFile.title') + ' · ' + t('g.story.chapter', { n }); title = t('g.story.caseFile.ev.' + ['rosa', 'kev', 'tony', 'priya'][n - 1] + '.t'); tone = 'red'; }
  } else if (id === 'story-prologue') { kicker = t('g.story.prologue'); title = t('g.story.film.prologueT'); tone = 'red'; }
  else if (id === 'story-finale') { kicker = t('g.story.chapter', { n: 5 }) + ' · ' + t('g.story.film.finaleK'); title = t('g.story.film.finaleT'); num = '5'; tone = 'red'; }
  else if (id === 'story-epilogue') { kicker = t('g.story.epilogue'); title = bare(t('g.story.ch.front.name')); }
  const line = t('g.story.film.' + id);
  return { id, rtl, title: kicker + ' · ' + title, Comp: StoryCard, meta: STORY_CARD, props: { kicker, title, line: line === 'g.story.film.' + id ? '' : line, num, tone, rtl } };
}
