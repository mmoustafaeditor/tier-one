// 4.1 call screen (UI41 §Daily Challenge): tapping a source on the player screen rings them. The contact's name, a
// running timer, a live waveform and their ambient sound bed (lib/sfx.ts presets: the salon, the kit room, a car on
// speaker, the airport, the treatment room), a few seconds, then the answer in one line. Tap or Skip ends it at once;
// the answer then lands on that source's button (the driver keeps it). It sits inside the play screen, never a page.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useT, tr } from '../lib/i18n';
import { sfx, voice, haptic, type Sfx } from '../lib/sfx';
import { prefersReducedMotion } from '../lib/motion';
import { RULES4, type CastSaga, type Clue4, type Rules4 } from '../lib/engine';
import { saysWord4 } from '../lib/story';

export const CONTACTS = ['barber', 'kitman', 'agent', 'spotter', 'physio'] as const;
const MONO: Record<string, string> = { barber: 'BA', kitman: 'KM', agent: 'AG', spotter: 'SP', physio: 'PH', tabloid: 'BB', itk: 'IK', insider: 'PP' };
/** One colour per person: the avatar disc and the call screen's wash. */
export const CONTACT_TINT: Record<string, string> = { barber: '#C8743A', kitman: '#3F9A5E', agent: '#3B6FD1', spotter: '#8A63D2', physio: '#169AA0', tabloid: '#E0442A', itk: '#D9A21B', insider: '#5C6B7A' };
const BED: Record<string, [Sfx, number]> = { barber: ['scene.barber', 1700], kitman: ['scene.kitman', 2300], agent: ['car.pass', 1900], spotter: ['scene.spotter', 2700], physio: ['scene.physio', 1900] };

export function ContactAvatar({ src, size = 40 }: { src: string; size?: number }) {
  return <span className="d41-av" style={{ ['--av' as string]: CONTACT_TINT[src] || '#666', ['--sz' as string]: size + 'px' } as CSSProperties} aria-hidden="true"><b>{MONO[src] || src.slice(0, 2).toUpperCase()}</b></span>;
}

/** How often a contact is right under these rules, in tenths, from the engine's own tables. */
export function accTenths(R: Rules4, src: string): number {
  const so = R.SOURCES[src]; if (!so) return 0;
  if (so.kind === 'street') return (so.rel ?? 0.5) * 10;
  const M = so.M || []; let a = 0;
  for (let t = 0; t < 3; t++) { const row = M[t] || []; const k = row.length === 2 ? (t === 2 ? 1 : 0) : t; a += R.PRIOR[t] * (row[k] || 0); }
  return a * 10;
}
/** "8 in 10" / "19 in 20". */
export function accShort(lang: string, R: Rules4, src: string): string {
  const a = accTenths(R, src);
  return a >= 9.3 ? tr(lang, 'd41.src.acc20') : tr(lang, 'd41.src.acc', { n: Math.round(a) });
}
/** The spoken answer: "Heard he's off to Leeds. Heard it from a guy." */
export function askLine(lang: string, src: string, r: number, c?: CastSaga): string {
  const l = tr(lang, 'pl4.call.line.' + src + '.' + r);
  return l.startsWith('pl4.') ? saysWord4(lang, src, r) : l.replace(/\{to\}/g, c ? c.to.s : '');
}
/** Why a source is shut today: "From Day 3" (or "Deadline Day"). */
export function lockShort(lang: string, src: string, R: Rules4 = RULES4): string {
  const so = R.SOURCES[src]; const d = so ? so.from : 1;
  return d >= R.DAYS && R.DAYS > 1 ? tr(lang, 'd41.src.fromDD') : tr(lang, 'd41.src.from', { d });
}

type Phase = 'ring' | 'live' | 'done';
/** `clue` may arrive late (the Daily asks the server): it rings until it does. */
export function CallScene({ src, clue, c, onDone }: { src: string; clue: Clue4 | null; c?: CastSaga; onDone: () => void }) {
  const t = useT();
  const reduce = prefersReducedMotion();
  const [phase, setPhase] = useState<Phase>('ring');
  const [secs, setSecs] = useState(0);
  const bars = useRef<HTMLSpanElement>(null);
  const close = useRef(onDone); close.current = onDone;
  const line = clue ? askLine(t.lang, src, clue.r, c) : '';

  useEffect(() => { if (!reduce) { sfx('phone.ring'); haptic('tap'); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // ring (a beat) → the line is open (the bed plays, the voice) → the answer
  useEffect(() => {
    if (phase !== 'ring' || !clue) return;
    const id = setTimeout(() => { setPhase('live'); sfx('dm.in'); voice(src, 1.2); }, reduce ? 0 : 800);
    return () => clearTimeout(id);
  }, [phase, clue, reduce, src]);
  useEffect(() => {
    if (phase !== 'live') return;
    const id = setTimeout(() => setPhase('done'), reduce ? 0 : 1700);
    return () => clearTimeout(id);
  }, [phase, reduce]);
  useEffect(() => { if (phase !== 'done') return; sfx('ui.pop'); const id = setTimeout(() => close.current(), 1500); return () => clearTimeout(id); }, [phase]);
  useEffect(() => {
    if (reduce || phase !== 'live') return;
    const [cue, ms] = BED[src] || BED.barber;
    sfx(cue); const id = setInterval(() => sfx(cue), ms);
    return () => clearInterval(id);
  }, [phase, src, reduce]);
  // timer + waveform (transforms only)
  useEffect(() => {
    if (reduce) return;
    let raf = 0, last = 0; const t0 = performance.now();
    const loop = (ms: number) => {
      raf = requestAnimationFrame(loop);
      if (ms - last < 70) return; last = ms;
      setSecs(Math.floor((ms - t0) / 1000));
      const el = bars.current; if (!el) return;
      const talk = phase === 'live' ? 1 : phase === 'ring' ? 0.15 : 0.05;
      Array.from(el.children).forEach((b, k) => { const h = 0.1 + talk * (0.5 + 0.5 * Math.sin(ms / (90 + (k % 5) * 23) + k * 1.7)) * (0.55 + ((k * 37) % 11) / 22); (b as HTMLElement).style.transform = `scaleY(${Math.min(1, h).toFixed(3)})`; });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, reduce]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); skip(); } }; window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true); });

  const skip = () => { if (phase === 'done') close.current(); else if (clue) setPhase('done'); };
  const name = t('src4.name.' + src);
  return <div className={'d41-call is-' + phase} role="dialog" aria-modal="true" aria-label={name} style={{ ['--av' as string]: CONTACT_TINT[src] } as CSSProperties} onClick={skip}>
    <span className="d41-call__state">{phase === 'ring' ? t('d41.call.ringing') : phase === 'live' ? t('d41.call.onLine') : t('d41.call.saved')}</span>
    <ContactAvatar src={src} size={96} />
    <b className="d41-call__name" dir="auto">{name}</b>
    <span className="d41-call__time g-num">{c ? c.player.n + ' · ' : ''}{String(Math.floor(secs / 60)).padStart(2, '0')}:{String(secs % 60).padStart(2, '0')}</span>
    <span className="d41-call__wave" ref={bars} aria-hidden="true">{Array.from({ length: 24 }, (_, k) => <i key={k} />)}</span>
    <p className="d41-call__line" aria-live="polite" dir="auto">{phase === 'done' && clue ? <>“{line}”<b>{saysWord4(t.lang, src, clue.r)}</b></> : ' '}</p>
    <button type="button" className="d41-call__skip" onClick={(e) => { e.stopPropagation(); skip(); }}>{phase === 'done' ? t('d41.call.close') : t('d41.call.skip')}</button>
  </div>;
}
