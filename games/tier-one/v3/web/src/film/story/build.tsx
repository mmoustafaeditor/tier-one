// Story mode films ("The Comeback"): story-<id> → the clip (story/manifest.ts) with the chapter plate drawn on top, and
// the frame-drawn title card (scenes/StoryCard) as its fallback, so a story moment always plays something.
// Ids: story-prologue · story-ch1-open … story-ch5-open · story-ch1-reveal … story-ch4-reveal · story-finale · story-epilogue.
import { tr } from '../../lib/i18n';
import type { Save } from '../../lib/save';
import type { SceneSpec } from '../registry';
import { C } from '../kit';
import { FPS } from '../cues';
import { MomentOverlay } from '../moments/Overlay';
import { StoryCard, STORY_CARD } from '../scenes/StoryCard';
import { storyClipOf } from './manifest';

export const STORY_SCENE_IDS = ['story-prologue', 'story-ch1-open', 'story-ch1-reveal', 'story-ch2-open', 'story-ch2-reveal', 'story-ch3-open', 'story-ch3-reveal',
  'story-ch4-open', 'story-ch4-reveal', 'story-ch5-open', 'story-finale', 'story-epilogue'] as const;
const CH = ['blog', 'post', 'nationals', 'war', 'chronicle'];
const EV = ['rosa', 'kev', 'tony', 'priya'];
const bare = (name: string) => { const k = name.indexOf(' · '); return k >= 0 ? name.slice(k + 3) : name; };

/** undefined: not a story id. null: a story id that can't be built. */
export function buildStory(id: string, s: Save): SceneSpec | null | undefined {
  if (!id.startsWith('story-')) return undefined;
  if (!(STORY_SCENE_IDS as readonly string[]).includes(id)) return null;
  const L = s.lang, rtl = L === 'ar', t = (k: string, v?: Record<string, string | number>) => tr(L, k, v);
  let kicker = '', title = '', num = '', tone: 'gold' | 'red' = 'gold';
  const m = /^story-ch(\d)-(open|reveal)$/.exec(id);
  if (m) {
    const n = +m[1];
    num = String(n);
    if (m[2] === 'open') { kicker = t('g.story.chapter', { n }) + ' · ' + t('career.ranks.' + (n - 1)); title = bare(t('g.story.ch.' + CH[n - 1] + '.name')); }
    else { kicker = t('g.story.caseFile.title') + ' · ' + t('g.story.chapter', { n }); title = t('g.story.caseFile.ev.' + EV[n - 1] + '.t'); tone = 'red'; }
  } else if (id === 'story-prologue') { kicker = t('g.story.prologue'); title = t('g.story.film.prologueT'); tone = 'red'; }
  else if (id === 'story-finale') { kicker = t('g.story.chapter', { n: 5 }) + ' · ' + t('g.story.film.finaleK'); title = t('g.story.film.finaleT'); num = '5'; tone = 'red'; }
  else { kicker = t('g.story.epilogue'); title = bare(t('g.story.ch.front.name')); }
  const k = 'g.story.film.' + id, line0 = t(k), line = line0 === k ? '' : line0;
  const c = storyClipOf(id);
  return {
    id, rtl, title: kicker + ' · ' + title, Comp: StoryCard, meta: STORY_CARD, props: { kicker, title, line, num, tone, rtl },
    video: c ? { stem: c.id, dur: Math.round(c.seconds * FPS), Overlay: MomentOverlay, overlayProps: { at: Math.round(c.overlayAt * FPS), kicker, title, sub: line, accent: tone === 'red' ? C.red : C.gold, rtl } } : undefined,
  };
}
