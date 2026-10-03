// The call (3.9.21, owner's clue pack + mockup): one connected card. The source's expression scene (public/art/calls/,
// chosen with the line from the source's answer, never the hidden truth) flows into the paper card with their role, name,
// what they can see, and the quote. Below it: "Saved to your notebook" and one Back to the story. No verdict chips: the
// player reads the clue. The text is there at once (a 200 ms fade, no typewriter); the room's sound and a murmur play.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CastSaga, Clue } from '../lib/engine';
import { useT } from '../lib/i18n';
import { getSave } from '../lib/save';
import { sfx, voice, buzz, type Sfx } from '../lib/sfx';
import { voiceLine, clueArt, accessLine } from '../lib/story';
import { srcNamed } from '../lib/storyMode';
import { Portrait } from './portrait';
import { Icon } from './bits';

export function CallScreen({ src, clue, c, mode, left, onDone }: { src: string; clue: Clue; c: CastSaga; mode: string; left?: number; onDone: () => void; [k: string]: unknown }) {
  const t = useT();
  const still = getSave().reduced || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const line = voiceLine(t.lang, c, clue);
  const art = clueArt(c, clue);
  const [artOk, setArtOk] = useState(true);
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => { sfx(('scene.' + src) as Sfx); buzz(16); if (!still) { const a = setTimeout(() => voice(src, 1.1), 250); return () => clearTimeout(a); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { const ov = document.body.style.overflow; document.body.style.overflow = 'hidden'; back.current?.focus({ preventScroll: true }); return () => { document.body.style.overflow = ov; }; }, []);
  const role = mode === 'career' ? srcNamed(t, src) : t('src.' + src);
  const name = t('u39.call.who.' + src);
  const hasName = !!name && name !== 'u39.call.who.' + src;
  return <div className={'call41' + (still ? ' is-still' : '')} role="dialog" aria-modal="true" aria-label={t('u39.call.k') + ': ' + role}
    onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onDone(); } }}>
    <header className="call41__top">
      <button type="button" className="call41__back" onClick={onDone} aria-label={t('u39.call.back')}><Icon n={t.rtl ? 'arrow' : 'back'} size={22} /></button>
      <b className="call41__t">{t('u39.call.k')}</b>
      <span className="call41__row"><small className="call41__sub">{c.player.s} · {t('common.day', { n: clue.day })}</small>{left != null && <span className={'callpill call41__pts' + (left ? '' : ' is-out')} aria-label={t('u39.call.after', { n: left })}><Icon n="phone" size={16} /><b>{t(left === 1 ? 'u39.file.callsOne' : 'u39.file.calls', { n: left })}</b></span>}</span>
    </header>
    <article className="call41__card">
      <div className="call41__art">
        {art && artOk ? <img src={art.src} alt="" width={art.w} height={art.h} style={{ objectPosition: art.pos }} decoding="async" onError={() => setArtOk(false)} />
          : <span className="call41__fb"><Portrait kind="source" id={src} size={220} /></span>}
        <span className="call41__id"><small>{role}</small>{hasName && <b>{name}</b>}</span>
      </div>
      <div className="call41__paper">
        <p className="call41__acc">{accessLine(t.lang, src)}</p>
        <blockquote className="call41__q" dir="auto"><span className="call41__qm" aria-hidden="true">{t.lang === 'es' ? '«' : '“'}</span>{line}<span className="call41__qm" aria-hidden="true">{t.lang === 'es' ? '»' : '”'}</span></blockquote>
        <p className="call41__saved"><span><Icon n="check" size={14} /></span>{t('u39.call.saved')}</p>
      </div>
    </article>
    <button ref={back} type="button" className="g-btn g-btn--lg call41__go" onClick={onDone}>{t('u39.call.back')}<Icon n={t.rtl ? 'back' : 'arrow'} size={22} /></button>
  </div>;
}
