// The replay list for the Me page: every cutscene you've seen, one tap to watch it again.
// INTEGRATOR: render <ScenesGallery /> in Me.tsx (e.g. under the trophy shelf). It needs <SceneHost /> mounted in App.
import { useT } from '../lib/i18n';
import { useSave } from '../lib/save';
import { playScene } from '../lib/scenes';
import { sfx } from '../lib/sfx';
import { SCENE_IDS } from './registry';
import { STORY_SCENE_IDS, buildStory } from './story/build';
import { ICON, SRC_C } from './kit';
import { seasonOf } from './season';

// Moment rows: accent and a 24px line icon.
const MOMENT_LOOK: Record<string, [string, string]> = {
  paper: ['#FF5A36', 'M4 5h13v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2zM17 9h3v10a2 2 0 0 1-2 2M7 9h7M7 13h7M7 17h4'],
  deadline: ['#FF5A36', 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2 2M9 2h6'],
  tier: ['#F7B928', 'M6 3h12v18H6zM9 7h6M9 17h6M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'],
  contact: ['#F7B928', 'M5 8h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 10h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2'],
  scalp: ['#FF5A36', 'M4 4l16 16M20 4L4 20'],
  official: ['#35C3E6', 'M3 6h18v12H3zM8 21h8M3 14h18'],
};

export function ScenesGallery() {
  const t = useT();
  const s = useSave() as ReturnType<typeof useSave> & { film?: string[] };
  const got = s.film || [];
  const se = seasonOf();
  return <section className="g-card g-card--desk" aria-labelledby="reels-h" style={{ padding: 16 }}>
    <div className="g-sec" style={{ margin: '0 0 10px' }}><h2 id="reels-h">{t('film.gallery.title')}</h2><span className="g-mono">{t('film.gallery.aside')}</span></div>
    <div className="reels">
      {[...SCENE_IDS, ...STORY_SCENE_IDS.filter((id) => got.includes(id))].map((id) => {
        const src = id.startsWith('source:') ? id.slice(7) : '';
        const on = id === 'season' ? got.some((x) => x.startsWith('season')) : got.includes(id) || got.some((x) => x.startsWith(id + ':') || (id === 'scalp' && x.startsWith('trophy:')));
        const title = src ? t('film.name.source', { n: t('g.story.who.' + src) }) : id === 'season' ? t('film.season.names.' + se.key) : id.startsWith('story-') ? buildStory(id, s)?.title || id : t('film.name.' + id);
        const mo = MOMENT_LOOK[id];
        const col = src ? SRC_C[src] : id === 'season' ? se.accent : mo ? mo[0] : '#FF5A36';
        const ic = src ? ICON[src] : id === 'season' ? 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5' : mo ? mo[1] : 'M4 5h13v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2zM17 9h3v10a2 2 0 0 1-2 2M7 9h7M7 13h7M7 17h4';
        return <div key={id} className={'reels__row' + (on ? '' : ' is-locked')} style={{ ['--rc' as string]: col }}>
          <span className="reels__ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={on ? ic : 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4'} /></svg></span>
          <span className="reels__t"><b>{title}</b>{!on && <span>{t('film.gallery.locked')}</span>}</span>
          {on && <button type="button" className="g-btn g-btn--sm g-btn--dark" onClick={() => { sfx('ui.tap'); playScene(id); }} aria-label={t('film.gallery.play') + ': ' + title}>{t('film.gallery.play')}</button>}
        </div>;
      })}
    </div>
  </section>;
}
