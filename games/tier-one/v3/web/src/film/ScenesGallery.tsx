// The replay list for the Me page: every cutscene you've seen, one tap to watch it again.
// INTEGRATOR: render <ScenesGallery /> in Me.tsx (e.g. under the trophy shelf). It needs <SceneHost /> mounted in App.
import { useT } from '../lib/i18n';
import { useSave } from '../lib/save';
import { playScene } from '../lib/scenes';
import { sfx } from '../lib/sfx';
import { SCENE_IDS } from './registry';
import { STORY_SCENE_IDS, buildStoryScene } from './story';
import { ICON, SRC_C } from './kit';
import { seasonOf } from './season';

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
        const on = id === 'season' ? got.some((x) => x.startsWith('season')) : got.includes(id);
        const title = src ? t('film.name.source', { n: t('g.story.who.' + src) }) : id === 'season' ? t('film.season.names.' + se.key) : id.startsWith('story-') ? buildStoryScene(id, s)?.title || id : t('film.name.' + id);
        const col = src ? SRC_C[src] : id === 'season' ? se.accent : '#FF5A36';
        const ic = src ? ICON[src] : id === 'season' ? 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5' : 'M4 5h13v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2zM17 9h3v10a2 2 0 0 1-2 2M7 9h7M7 13h7M7 17h4';
        return <div key={id} className={'reels__row' + (on ? '' : ' is-locked')} style={{ ['--rc' as string]: col }}>
          <span className="reels__ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={on ? ic : 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4'} /></svg></span>
          <span className="reels__t"><b>{title}</b>{!on && <span>{t('film.gallery.locked')}</span>}</span>
          {on && <button type="button" className="g-btn g-btn--sm g-btn--dark" onClick={() => { sfx('ui.tap'); playScene(id); }} aria-label={t('film.gallery.play') + ': ' + title}>{t('film.gallery.play')}</button>}
        </div>;
      })}
    </div>
  </section>;
}
