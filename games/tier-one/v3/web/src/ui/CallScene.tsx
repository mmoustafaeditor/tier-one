// The source call (HYBRID.md §5): a full-screen scene per source. Ring (the classic sound scene), the line opens,
// a mumbled voice with the subtitle typing out, the "says" stamp, and the clue clipped to the file.
// Characters appear only as painted art (ART) when it exists; until then the caller card is an icon, never a drawing.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CastSaga, Clue, Rules } from '../lib/engine';
import { E, OUTS } from '../lib/engine';
import { useT } from '../lib/i18n';
import { getSave, update } from '../lib/save';
import { sfx, voice, buzz, type Sfx } from '../lib/sfx';
import { voiceLine, saysWord, addsText, GRADE } from '../lib/story';
import { Icon, SRC_ICON, Rel, kitSVG, useTyped } from './game';
import { ringtoneSfx } from '../lib/season';

// Painted character art slots (the art pack). Keys: source id → image URL. Empty until the art lands.
export const ART: Record<string, string> = {};
// Source intros (scenes lane): lib/scenes.ts exports maybeSourceIntro(src, mode), a no-op when not applicable. Loaded
// through an eager glob so this file still builds if that module hasn't merged yet. Integrator: once lib/scenes.ts is
// on the branch this can become `import { maybeSourceIntro } from '../lib/scenes'`.
const SCENES = Object.values(import.meta.glob('../lib/scenes.ts', { eager: true })) as { maybeSourceIntro?: (src: string, mode: string) => void }[];
const maybeSourceIntro = (src: string, mode: string) => { try { SCENES[0]?.maybeSourceIntro?.(src, mode); } catch { /* optional */ } };
const RING_MS: Record<string, number> = { agent: 2150, barber: 1250, spotter: 1500, physio: 1300, kitman: 1100, leak: 1450 };
export const GRADE_BARS: Record<string, number> = { A: 3, B: 2, C: 1, D: 1 };

export function CallScene({ src, clue, c, R, onDone, mode }: { src: string; clue: Clue; c: CastSaga; R: Rules; onDone: () => void; mode?: string }) {
  const t = useT();
  const reduced = getSave().reduced;
  // The first call to a source in a session plays the whole scene; repeats go straight to the line.
  const full = useMemo(() => { const seen = getSave().scenes || {}; return !reduced && !(seen[src] && Date.now() - seen[src] < 6 * 3600e3); }, [src]);
  const [phase, setPhase] = useState<'ring' | 'talk' | 'said'>(full ? 'ring' : 'talk');
  const line = voiceLine(t.lang, c, clue) || '…';
  const typed = useTyped(line, full ? 34 : 60, phase !== 'ring');
  const says = saysWord(t.lang, src, clue.r, c);
  const adds = addsText(t.lang, E.weights(R, src, clue.r));
  const w = E.weights(R, src, clue.r); const best = w.indexOf(Math.max(...w));
  const done = useRef(false);
  const finish = () => { if (done.current) return; done.current = true; sfx('ui.pop'); onDone(); };

  useEffect(() => {
    if (mode && mode !== 'daily') maybeSourceIntro(src, mode);
    update((s) => { s.scenes = { ...(s.scenes || {}), [src]: Date.now() }; });
    if (full) { sfx(('scene.' + src) as Sfx); buzz(src === 'agent' ? [60, 120, 60, 500, 60, 120, 60] : 30); const id = setTimeout(() => setPhase('talk'), RING_MS[src] || 1200); return () => clearTimeout(id); }
    sfx(ringtoneSfx());
  }, []);
  useEffect(() => { if (phase === 'talk') voice(src, Math.min(2.2, 0.5 + line.length / 45)); }, [phase]);
  useEffect(() => { if (phase === 'talk' && typed.length >= line.length) { const id = setTimeout(() => { setPhase('said'); sfx('stamp.done'); buzz(18); }, full ? 350 : 120); return () => clearTimeout(id); } }, [typed, phase]);

  const skip = () => { if (phase === 'said') finish(); else { setPhase('said'); } };
  const art = ART[src];
  return <div className={'call-scene cs--' + src + ' is-' + phase} role="dialog" aria-modal="true" aria-label={t('src.' + src)} onClick={skip}>
    <Scenery src={src} c={c} />
    <div className="cs__top">
      <span className="g-mono cs__status">{phase === 'ring' ? t('g.call.calling') : t('g.call.onLine')}{phase !== 'ring' && <i className="cs__live" />}</span>
      <h2 className="cs__who">{t('src.' + src)}</h2>
      <p className="cs__about">{t('g.call.about', { p: c.player.s, to: c.to.s })}</p>
    </div>
    <div className="cs__caller">
      {phase === 'ring' && <><i className="cs__ring" /><i className="cs__ring cs__ring--2" /><i className="cs__ring cs__ring--3" /></>}
      <span className="cs__avatar">{art ? <img src={art} alt="" /> : <Icon n={SRC_ICON[src] || 'phone'} />}</span>
      <span className="cs__rel"><Rel n={GRADE_BARS[GRADE[src]] || 1} /> {t('g.call.rel.' + (GRADE[src] || 'C'))}</span>
    </div>
    <div className="cs__wave" aria-hidden="true">{Array.from({ length: 18 }, (_, k) => <i key={k} style={{ animationDelay: (k * 53) % 400 + 'ms' }} />)}</div>
    {phase !== 'ring' && <div className="cs__bubble" aria-live="polite">
      <p>{typed}<span className="cs__caret" /></p>
    </div>}
    {phase === 'said' && <div className="cs__clip" onClick={(e) => { e.stopPropagation(); finish(); }}>
      <span className={'g-stamp is-slam g-stamp--' + OUTS[best]} style={{ ['--rot' as string]: '-7deg' }}>{says}</span>
      <span className="cs__clipt"><b>{t('g.call.clipped')}</b><span>{adds || t('g.call.nothingNew')}</span></span>
      <span className="g-btn g-btn--sm cs__ok">{t('g.call.toFile')}<Icon n="arrow" size={18} /></span>
    </div>}
    <p className="cs__skip g-mono">{phase === 'said' ? '' : t('g.call.tapSkip')}</p>
  </div>;
}

// Moving backdrops, one per source. CSS-driven; no people.
function Scenery({ src, c }: { src: string; c: CastSaga }) {
  if (src === 'barber') return <div className="sc sc--barber" aria-hidden="true"><span className="sc__pole"><i /></span><span className="sc__mirror">{Array.from({ length: 6 }, (_, k) => <i key={k} />)}</span>{Array.from({ length: 16 }, (_, k) => <b key={k} className="sc__hair" style={{ left: (k * 61) % 100 + '%', animationDelay: (k * 170) % 2400 + 'ms', ['--rot' as string]: (k * 47) % 180 + 'deg' }} />)}</div>;
  if (src === 'agent') return <div className="sc sc--agent" aria-hidden="true">{Array.from({ length: 12 }, (_, k) => <i key={k} className="sc__bokeh" style={{ left: (k * 37) % 100 + '%', top: (k * 53) % 70 + '%', animationDelay: k * 300 + 'ms', ['--s' as string]: 30 + (k * 17) % 60 + 'px' }} />)}<span className="sc__rain" /></div>;
  if (src === 'spotter') return <div className="sc sc--spotter" aria-hidden="true"><span className="sc__sun" /><span className="sc__plane"><Icon n="plane" /></span><span className="sc__runway">{Array.from({ length: 10 }, (_, k) => <i key={k} style={{ animationDelay: k * 120 + 'ms' }} />)}</span><span className="sc__fence" /></div>;
  if (src === 'physio') return <div className="sc sc--physio" aria-hidden="true"><svg className="sc__ecg" viewBox="0 0 400 100" preserveAspectRatio="none"><path d="M0 60 H90 L105 60 L115 20 L128 95 L140 50 L150 60 H250 L265 60 L275 20 L288 95 L300 50 L310 60 H400" /></svg><span className="sc__grid" /></div>;
  if (src === 'kitman') return <div className="sc sc--kitman" aria-hidden="true"><span className="sc__lamp" /><span className="sc__rail">{[0, 1, 2, 3, 4].map((k) => <i key={k} className="sc__shirt" style={{ animationDelay: k * 260 + 'ms' }} dangerouslySetInnerHTML={{ __html: kitSVG(c.from, String([7, 9, 10, 11, 4][k])) }} />)}</span></div>;
  return <div className="sc sc--leak" aria-hidden="true">{Array.from({ length: 5 }, (_, k) => <i key={k} className="sc__flash" style={{ left: 10 + k * 20 + '%', animationDelay: k * 530 + 'ms' }} />)}<span className="sc__paper" /></div>;
}
