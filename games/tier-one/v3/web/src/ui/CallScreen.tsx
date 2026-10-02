// The call (3.9, docs/UI39.md §4; owner: "an animation screen of the characters and animation sounds source dependent
// then what they say comes up"). No film: the source's own portrait breathes on the dark desk while their place's sound
// plays (synth presets, lib/sfx scene.*), then a murmur and the line types in on a paper card and the face swaps to the
// reaction. The engine already recorded the answer: the same line is in the file's "What they said" tab.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { E, type CastSaga, type Clue, type Rules } from '../lib/engine';
import { useT } from '../lib/i18n';
import { getSave } from '../lib/save';
import { sfx, voice, buzz, type Sfx } from '../lib/sfx';
import { voiceLine, saysWord, relKey } from '../lib/story';
import { srcNamed } from '../lib/storyMode';
import { Portrait, moodFor, accentOf } from './portrait';
import { Icon } from './bits';

const RING_MS = 1100, TYPE_MS = 700;
export function CallScreen({ src, clue, c, R, i, mode, onDone }: { src: string; clue: Clue; c: CastSaga; R: Rules; i: number; mode: string; onDone: () => void }) {
  const t = useT();
  const still = getSave().reduced || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const line = voiceLine(t.lang, c, clue);
  const w = E.weights(R, src, clue.r) || [0, 0, 0, 1]; const o = Math.max(0, w.indexOf(Math.max(...w)));
  const [phase, setPhase] = useState<'ring' | 'talk' | 'done'>(still ? 'done' : 'ring');
  const [n, setN] = useState(still ? line.length : 0);
  const root = useRef<HTMLDivElement>(null), back = useRef<HTMLButtonElement>(null);
  const cost = E.srcOf(R, i, src)?.cost ?? 1;
  useEffect(() => {
    sfx(('scene.' + src) as Sfx); buzz(16);
    if (still) return;
    const a = setTimeout(() => { setPhase('talk'); voice(src, 1.1); }, RING_MS);
    return () => clearTimeout(a);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase !== 'talk') return;
    const t0 = performance.now(); let raf = 0;
    const step = (now: number) => { const k = Math.min(1, (now - t0) / TYPE_MS); setN(Math.round(k * line.length)); if (k < 1) raf = requestAnimationFrame(step); else { setPhase('done'); sfx('ui.pop'); } };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [phase, line]);
  useLayoutEffect(() => { const ov = document.body.style.overflow; document.body.style.overflow = 'hidden'; root.current?.focus({ preventScroll: true }); return () => { document.body.style.overflow = ov; }; }, []);
  useEffect(() => { if (phase === 'done') back.current?.focus({ preventScroll: true }); }, [phase]);
  const finish = () => { if (phase !== 'done') { setPhase('done'); setN(line.length); return; } onDone(); };
  const who = mode === 'career' ? srcNamed(t, src) : t('src.' + src);
  const circle = R.CIRCLE?.[src];
  return <div ref={root} tabIndex={-1} className={'call39 is-' + phase + (still ? ' is-still' : '')} role="dialog" aria-modal="true" aria-label={t('u39.call.k') + ': ' + who}
    style={{ ['--acc' as string]: accentOf(src) }} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onDone(); } }}>
    <header className="call39__top">
      <button type="button" className="call39__back" onClick={onDone} aria-label={t('u39.call.back')}><Icon n={t.rtl ? 'arrow' : 'back'} size={20} /></button>
      <span><b>{t('u39.call.k')}</b><small className="g-mono">{t('common.day', { n: clue.day })} · {c.player.s}</small></span>
    </header>
    <h1 className="call39__hed g-hed">{t('u39.call.hed.' + src)}</h1>
    <div className="call39__stage" aria-hidden="true">
      <span className="call39__glow" />
      <span className="call39__face call39__face--a"><Portrait kind="source" id={src} size={300} /></span>
      <span className="call39__face call39__face--b"><Portrait kind="source" id={src} size={300} mood={moodFor(src, o)} /></span>
      {phase === 'ring' && <span className="call39__wave"><i /><i /><i /></span>}
    </div>
    <div className="call39__who"><span className="call39__disc"><Icon n="phone" size={22} /></span><span><b>{who}</b><small>{t(relKey(src))} · {cost ? t(cost === 1 ? 'u39.call.cost' : 'u39.call.costN', { n: cost }) : t('u39.call.free')}</small></span></div>
    <figure className="call39__quote" onClick={finish} aria-live="polite">
      <span className="call39__mark" aria-hidden="true">“</span>
      <blockquote dir="auto">{phase === 'ring' ? <span className="call39__dots" aria-label="…"><i /><i /><i /></span> : <>{line.slice(0, n)}{n < line.length && <span className="call39__caret" />}</>}</blockquote>
      <figcaption className="g-mono">{t('u39.call.about', { p: c.player.s, d: clue.day })}</figcaption>
    </figure>
    <div className="call39__meta">
      {circle && <span className="call39__chip">{String(circle)}</span>}
      <span className="call39__says">{saysWord(t.lang, src, clue.r, c)}</span>
      <span className="call39__ok"><Icon n="check" size={16} />{t('u39.call.added')}</span>
    </div>
    <button ref={back} type="button" className="g-btn g-btn--lg call39__go" onClick={finish}>{phase === 'done' ? t('u39.call.back') : t('u39.call.skip')}<Icon n={t.rtl ? 'back' : 'arrow'} size={20} /></button>
  </div>;
}
