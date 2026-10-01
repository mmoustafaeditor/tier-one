// DMs (CONCEPT4.md §2, §6): your five contacts as chat threads, the brands that slide in with deals, and the phone's
// own CALL SCREEN that opens when you ask a contact about a story. The call is UI, not a scene: a typographic avatar,
// the name and a running timer ("Barber · 00:07"), a live waveform, the contact's ambient sound bed (synth presets in
// lib/sfx.ts: the salon for the barber, the airport for the spotter, the kit room, a car on speaker for the agent, the
// treatment-room monitor for the physio), then the answer typed on screen as a voice-note transcript. Hang up or tap to
// skip; the answer lands as a chip in the thread and on the story card (the driver keeps it).
//
// EXPORTS (Blurt and other lanes): CallScreen, ContactAvatar, CONTACT_TINT, accTenths(R, src), accWords(lang, R, src),
//   askLine(lang, src, r, cast), lockLine(lang, src, day), warmthOf(save, src), DMsScreen (the app; Connect.tsx mounts it).
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useT, tr, num } from '../lib/i18n';
import { useSave, type Save } from '../lib/save';
import { sfx, voice, haptic, type Sfx } from '../lib/sfx';
import { prefersReducedMotion } from '../lib/motion';
import { E4, RULES4, type CastSaga, type Clue4, type Rules4, type Game4 } from '../lib/engine';
import { saysWord4 } from '../lib/story';
import { liveWindow, castForSpec, type Mode4 } from '../lib/driver';
import { bookOf, coffeeToday, buyCoffee, COFFEE_COST } from '../lib/byline';
import { spend, toast } from '../lib/meta';
import { offersFor, active, accept, decline, offerLine, offerDm, brandOf, syncSponsors, type Offer, type Active } from '../lib/deals';
import { Icon, useTyped } from '../ui/game';
import { Pop, Typing } from '../ui/juice';
import type { Chrome } from '../App';
import '../styles/blurt.css';

// ---------------------------------------------------------------- who they are
export const CONTACTS = ['barber', 'kitman', 'agent', 'spotter', 'physio'] as const;
const MONO: Record<string, string> = { barber: 'BA', kitman: 'KM', agent: 'AG', spotter: 'SP', physio: 'PH', tabloid: 'BB', itk: 'IK', insider: 'PP' };
/** One colour per person: the avatar disc, the call screen's wash, the chip edge. */
export const CONTACT_TINT: Record<string, string> = { barber: '#C8743A', kitman: '#3F9A5E', agent: '#3B6FD1', spotter: '#8A63D2', physio: '#169AA0', tabloid: '#E0442A', itk: '#D9A21B', insider: '#5C6B7A' };
/** The ambient bed under a call (lib/sfx.ts synth presets) and how often it loops. */
const BED: Record<string, [Sfx, number]> = { barber: ['scene.barber', 1700], kitman: ['scene.kitman', 2300], agent: ['car.pass', 1900], spotter: ['scene.spotter', 2700], physio: ['scene.physio', 1900] };

export function ContactAvatar({ src, size = 44, ring, className = '' }: { src: string; size?: number; ring?: number; className?: string }) {
  return <span className={'dm-av ' + className} data-src={src} style={{ ['--av' as string]: CONTACT_TINT[src] || '#666', ['--sz' as string]: size + 'px', ['--warm' as string]: ring ?? 0 } as CSSProperties} aria-hidden="true"><b>{MONO[src] || src.slice(0, 2).toUpperCase()}</b></span>;
}

/** How often a contact is right under these rules, in tenths (the barber 5, the kit man 8 …), from E4's own tables. */
export function accTenths(R: Rules4, src: string): number {
  const so = R.SOURCES[src]; if (!so) return 0;
  if (so.kind === 'street') return (so.rel ?? 0.5) * 10;
  const M = so.M || []; let a = 0;
  for (let t = 0; t < 3; t++) { const row = M[t] || []; const k = row.length === 2 ? (t === 2 ? 1 : 0) : t; a += R.PRIOR[t] * (row[k] || 0); }
  return a * 10;
}
/** "Right about 8 in 10" (or "Right 19 in 20" for the physio), plus the contact's tell when he's wrong. */
export function accWords(lang: string, R: Rules4, src: string): string {
  const a = accTenths(R, src);
  const head = a >= 9.3 ? tr(lang, 'pl4.dms.rightAll') : tr(lang, 'pl4.dms.right', { n: Math.round(a) });
  const tell = src === 'barber' ? ' ' + tr(lang, 'pl4.dms.street') : src === 'agent' ? ' ' + tr(lang, 'pl4.dms.agent') : '';
  return head + '.' + tell;
}
/** The voice-note transcript for an answer: "Heard he's off to Leeds. Heard it from a guy." */
export function askLine(lang: string, src: string, r: number, c?: CastSaga): string {
  const l = (tr(lang, 'pl4.call.line.' + src + '.' + r));
  return l.startsWith('pl4.') ? saysWord4(lang, src, r) : l.replace(/\{to\}/g, c ? c.to.s : '');
}
/** Why a contact can't be asked yet: "The spotter is at the airport from day 3." */
export function lockLine(lang: string, src: string, day: number, R: Rules4 = RULES4): string {
  if (src === 'spotter') return tr(lang, 'pl4.lock.spotter', { d: day });
  if (src === 'physio' && day >= R.DAYS) return tr(lang, 'pl4.lock.physio');
  return tr(lang, 'pl4.lock.other', { name: tr(lang, 'src4.name.' + src), d: day });
}
/** Trust as the contact's warmth: the Contacts Book level 1–5 → Cold … Trusted, and 0…1 for the avatar ring. */
export function warmthOf(s: Save, src: string): { lv: number; word: string; k: number } {
  const lv = Math.max(1, Math.min(5, bookOf(s, src).lv || 1));
  const words = tr(s.lang, 'pl4.dms.warm.' + (lv - 1));
  return { lv, word: words, k: (lv - 1) / 4 };
}

// ---------------------------------------------------------------- the call screen
type CallPhase = 'ring' | 'live' | 'note' | 'done';
/** The phone's call UI. `clue` may arrive late (the Daily asks the server): it rings until it does. */
export function CallScreen({ src, clue, c, onDone }: { src: string; clue: Clue4 | null; c?: CastSaga; R?: Rules4; onDone: () => void }) {
  const t = useT();
  const reduce = prefersReducedMotion();
  const [phase, setPhase] = useState<CallPhase>(reduce ? (clue ? 'done' : 'ring') : 'ring');
  const [t0, setT0] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const line = clue ? askLine(t.lang, src, clue.r, c) : '';
  const typed = useTyped(line, 34, phase === 'note' && !reduce);
  const shown = phase === 'done' || reduce ? line : phase === 'note' ? typed : '';
  const bars = useRef<HTMLSpanElement>(null);
  const close = useRef(onDone); close.current = onDone;

  // ring → connected (once the answer exists and the ring has had its beat) → typing → the note
  useEffect(() => { if (!reduce) { sfx('phone.ring'); haptic('tap'); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase !== 'ring' || !clue) return;
    if (reduce) { setPhase('done'); return; }
    const id = setTimeout(() => { setPhase('live'); setT0(Date.now()); sfx('dm.in'); }, 950);
    return () => clearTimeout(id);
  }, [phase, clue, reduce]);
  useEffect(() => {
    if (phase !== 'live') return;
    const id = setTimeout(() => { setPhase('note'); voice(src, 1.3); }, 900);
    return () => clearTimeout(id);
  }, [phase, src]);
  useEffect(() => { if (phase === 'note' && typed.length >= line.length && line) { const id = setTimeout(() => setPhase('done'), 250); return () => clearTimeout(id); } }, [phase, typed, line]);
  useEffect(() => { if (phase !== 'done') return; sfx('ui.pop'); const id = setTimeout(() => close.current(), reduce ? 2800 : 2300); return () => clearTimeout(id); }, [phase, reduce]);
  // the bed: the contact's room under the call, looping while the line is open
  useEffect(() => {
    if (reduce || (phase !== 'live' && phase !== 'note')) return;
    const [cue, ms] = BED[src] || BED.barber;
    sfx(cue); const id = setInterval(() => sfx(cue), ms);
    return () => clearInterval(id);
  }, [phase === 'live' || phase === 'note', src, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  // the timer and the waveform: transforms only, one frame loop
  useEffect(() => {
    if (reduce) return;
    let raf = 0, last = 0;
    const loop = (ms: number) => {
      raf = requestAnimationFrame(loop);
      if (ms - last < 60) return; last = ms;
      setNow(Date.now());
      const el = bars.current; if (!el) return;
      const talk = phase === 'note' ? 1 : phase === 'live' ? 0.35 : 0.08;
      Array.from(el.children).forEach((b, k) => { const h = 0.12 + talk * (0.5 + 0.5 * Math.sin(ms / (90 + (k % 5) * 23) + k * 1.7)) * (0.55 + ((k * 37) % 11) / 22); (b as HTMLElement).style.transform = `scaleY(${Math.min(1, h).toFixed(3)})`; });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, reduce]);
  // Esc hangs up (the call is a dialog: App leaves Esc to it)
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape' || (e.key === 'Enter' && phase === 'done')) { e.preventDefault(); e.stopPropagation(); close.current(); } }; window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true); }, [phase]);

  const secs = t0 ? Math.max(0, Math.floor((now - t0) / 1000)) : 0;
  const name = t('src4.name.' + src);
  const short = name.replace(/^(The|El|La)\s+/i, '').replace(/^ال/, '');
  const skip = () => { if (phase === 'done') onDone(); else if (clue) setPhase('done'); };
  return <div className={'dm-call is-' + phase} role="dialog" aria-modal="true" aria-label={name} style={{ ['--av' as string]: CONTACT_TINT[src] } as CSSProperties} onClick={skip}>
    <div className="dm-call__top">
      <span className="dm-call__state">{phase === 'ring' ? t('pl4.call.ringing') : t('pl4.call.note')}</span>
      <ContactAvatar src={src} size={112} className="dm-call__av" />
      <b className="dm-call__name" dir="auto">{name}</b>
      <span className="dm-call__time g-num" aria-live="off">{phase === 'ring' ? t('pl4.call.calling') : `${short} · ${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`}</span>
      {c && <span className="dm-call__about" dir="auto">{c.player.n}</span>}
    </div>
    <span className="dm-call__wave" ref={bars} aria-hidden="true">{Array.from({ length: 28 }, (_, k) => <i key={k} />)}</span>
    <div className="dm-call__note" aria-live="polite">
      {phase === 'live' && <Typing name={short} />}
      {shown && <p dir="auto">“{shown}”{phase === 'note' && <i className="dm-call__caret" aria-hidden="true" />}</p>}
      {phase === 'done' && clue && <span className="dm-chip dm-chip--in" style={{ ['--av' as string]: CONTACT_TINT[src] } as CSSProperties}><ContactAvatar src={src} size={20} />{saysWord4(t.lang, src, clue.r)}<small>{t('pl4.call.saved')}</small></span>}
    </div>
    <div className="dm-call__foot">
      <button type="button" className="dm-call__hang" onClick={(e) => { e.stopPropagation(); sfx('os.close'); onDone(); }} aria-label={t('pl4.call.hang')}><Icon n="phone" size={28} /></button>
      <span className="dm-call__hint">{phase === 'done' ? t('pl4.call.hang') : t('pl4.call.skip')}</span>
    </div>
  </div>;
}

/** A chip for one answer (the DM thread and the story card): the contact's mark and what they said. */
export function AnswerChip({ clue, lang, size = 'md' }: { clue: Clue4; lang: string; size?: 'sm' | 'md' }) {
  return <span className={'dm-chip dm-chip--' + size} style={{ ['--av' as string]: CONTACT_TINT[clue.src] } as CSSProperties}><ContactAvatar src={clue.src} size={size === 'sm' ? 16 : 20} /><b dir="auto">{saysWord4(lang, clue.src, clue.r)}</b></span>;
}

// ---------------------------------------------------------------- the app: threads
interface Msg { mode: Mode4; i: number; c: CastSaga; clue: Clue4 }
/** Every answer in the local windows still open (Practice, Story, the first window, Live): replayed from the save. */
function liveAnswers(s: Save): Msg[] {
  const out: Msg[] = [];
  for (const mode of ['tutorial', 'practice', 'career', 'deadline', 'challenge'] as Mode4[]) {
    const w = liveWindow(mode, s); if (!w) continue;
    try {
      const R = E4.rulesOf(w.rules); const g: Game4 | null = E4.replay(E4.buildBoard(w.seed, R), w.log, R); if (!g) continue;
      const cast = castForSpec(w.seed, w.rules, R);
      g.clues.forEach((cl, i) => cl.forEach((clue) => { if (cast[i]) out.push({ mode, i, c: cast[i], clue }); }));
    } catch { /* a window from another build: skip it */ }
  }
  return out;
}

export function DMsScreen(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { syncSponsors(); }, []);
  const msgs = useMemo(() => liveAnswers(s), [s.v4]); // eslint-disable-line react-hooks/exhaustive-deps
  const offers = offersFor(s), deals = active(s);
  if (open && (CONTACTS as readonly string[]).includes(open)) return <Thread src={open} msgs={msgs.filter((m) => m.clue.src === open)} onBack={() => setOpen(null)} chrome={chrome} />;
  if (open === 'brands') return <Brands offers={offers} deals={deals} onBack={() => setOpen(null)} />;
  return <div className="g-screen dm-app">
    <header className="dm-head">
      <button type="button" className="g-top__back dm-head__back" onClick={() => { sfx('ui.tap'); chrome.home(); }} aria-label={t('os.bar.homeAria')}><Icon n={t.rtl ? 'arrow' : 'back'} size={20} /></button>
      <h1 className="dm-head__t">{t('pl4.dms.title')}</h1>
    </header>
    <p className="dm-k">{t('pl4.dms.k')}</p>
    <ul className="dm-list">
      {CONTACTS.map((src) => {
        const last = msgs.filter((m) => m.clue.src === src).pop();
        const w = warmthOf(s, src);
        return <li key={src}><Pop className="dm-row" onTap={() => setOpen(src)} label={t('src4.name.' + src)}>
          <ContactAvatar src={src} size={52} ring={w.k} />
          <span className="dm-row__b">
            <b dir="auto">{t('src4.name.' + src)}</b>
            <span dir="auto">{last ? askLine(t.lang, src, last.clue.r, last.c) : t('src4.tells.' + src)}</span>
          </span>
          <span className="dm-row__end"><small>{w.word}</small>{last && <i className="dm-dot" aria-hidden="true" />}</span>
        </Pop></li>;
      })}
      <li><Pop className="dm-row dm-row--brand" onTap={() => setOpen('brands')} label={t('pl4.dms.brands')}>
        <span className="dm-av dm-av--brand" aria-hidden="true"><b>{offers[0] ? t('e4.sp.brand.' + offers[0].brand + '.n').slice(0, 1) : '¤'}</b></span>
        <span className="dm-row__b"><b>{t('pl4.dms.brands')}</b><span dir="auto">{offers[0] ? t(offerDm(offers[0]).key, { b: t(offerDm(offers[0]).v.b) }) : deals[0] ? t('e4.sp.brand.' + deals[0].brand + '.n') : t('pl4.dms.noBrands')}</span></span>
        <span className="dm-row__end">{offers.length > 0 && <b className="g-badge">{offers.length}</b>}</span>
      </Pop></li>
    </ul>
  </div>;
}

function Thread({ src, msgs, onBack, chrome }: { src: string; msgs: Msg[]; onBack: () => void; chrome: Chrome }) {
  const t = useT();
  const s = useSave();
  const w = warmthOf(s, src);
  const R = RULES4, so = R.SOURCES[src];
  const coffee = coffeeToday(s, src);
  const buy = () => { if (buyCoffee(src, spend)) { sfx('coin'); haptic('tap'); } else toast('warn', t('pl4.dms.coffee', { n: COFFEE_COST })); };
  return <div className="g-screen dm-app dm-thread" style={{ ['--av' as string]: CONTACT_TINT[src] } as CSSProperties}>
    <header className="dm-head">
      <button type="button" className="g-top__back dm-head__back" onClick={() => { sfx('ui.tap'); onBack(); }} aria-label={t('pl4.dms.title')}><Icon n={t.rtl ? 'arrow' : 'back'} size={20} /></button>
      <ContactAvatar src={src} size={36} ring={w.k} />
      <span className="dm-head__who"><b dir="auto">{t('src4.name.' + src)}</b><small>{t('pl4.dms.warmL', { w: w.word })}</small></span>
    </header>
    <section className="dm-card">
      <p className="dm-card__tells" dir="auto">{t('pl4.dms.tells', { x: t('src4.tells.' + src) })}</p>
      <p className="dm-card__right" dir="auto">{accWords(t.lang, R, src)}</p>
      <p className="dm-card__meta">{so && so.cost ? t('src4.cost.dm') : t('src4.cost.free')}{so && so.from > 1 ? ' · ' + lockLine(t.lang, src, so.from, R) : ''}</p>
      <span className="dm-warm" aria-label={t('pl4.dms.warmL', { w: w.word })}>{[1, 2, 3, 4, 5].map((k) => <i key={k} className={k <= w.lv ? 'on' : ''} />)}</span>
      <Pop className="dm-coffee" onTap={buy} disabled={coffee} sound="ui.tap">{coffee ? t('pl4.dms.coffeeDone') : t('pl4.dms.coffee', { n: COFFEE_COST })}</Pop>
      <small className="dm-card__note">{t('pl4.dms.coffeeD')}</small>
    </section>
    <div className="dm-msgs" aria-live="polite">
      {msgs.length ? msgs.map((m, k) => <div key={k} className="dm-pair">
        <p className="dm-b dm-b--me" dir="auto">{t('pl4.dms.q', { p: m.c.player.s })}<small>{t('pl4.dms.read')}</small></p>
        <p className="dm-b dm-b--them" dir="auto"><span className="dm-b__note"><Icon n="sound" size={14} />{t('pl4.call.note')}</span>“{askLine(t.lang, src, m.clue.r, m.c)}”<AnswerChip clue={m.clue} lang={t.lang} size="sm" /></p>
      </div>) : <p className="dm-empty">{t('pl4.dms.empty')}</p>}
    </div>
    <div className="dm-foot"><Pop className="dm-go" onTap={() => chrome.go({ n: 'daily' })}>{t('pl4.dms.ask')}<Icon n={t.rtl ? 'back' : 'arrow'} size={18} /></Pop></div>
  </div>;
}

function Brands({ offers, deals, onBack }: { offers: Offer[]; deals: Active[]; onBack: () => void }) {
  const t = useT();
  const v = (o: Record<string, string | number>) => Object.fromEntries(Object.entries(o).map(([k, x]) => [k, typeof x === 'string' && x.startsWith('e4.') ? t(x) : x]));
  return <div className="g-screen dm-app dm-thread">
    <header className="dm-head">
      <button type="button" className="g-top__back dm-head__back" onClick={() => { sfx('ui.tap'); onBack(); }} aria-label={t('pl4.dms.title')}><Icon n={t.rtl ? 'arrow' : 'back'} size={20} /></button>
      <span className="dm-head__who"><b>{t('pl4.dms.brands')}</b></span>
    </header>
    <div className="dm-msgs">
      {deals.map((a) => <div key={a.id} className="dm-offer is-active" style={{ ['--av' as string]: brandOf(a.brand).accent } as CSSProperties}>
        <b className="dm-offer__brand">{t('e4.sp.brand.' + a.brand + '.n')}</b>
        <p dir="auto">{t(offerLine(a).key, v(offerLine(a).v))}</p>
        <small className="g-num">{num(a.p.paid)} {t('pl4.res.coins')}</small>
      </div>)}
      {offers.map((o) => <div key={o.id} className="dm-offer" style={{ ['--av' as string]: brandOf(o.brand).accent } as CSSProperties}>
        <b className="dm-offer__brand">{t('e4.sp.brand.' + o.brand + '.n')}</b>
        <p className="dm-b dm-b--them" dir="auto">{t(offerDm(o).key, v(offerDm(o).v))}</p>
        <p className="dm-offer__line" dir="auto">{t(offerLine(o).key, v(offerLine(o).v))}</p>
        <span className="dm-offer__acts">
          <Pop className="dm-go" onTap={() => { if (accept(o.id)) sfx('deal'); else toast('warn', t('e4.sp.offer.full')); }}>{t('e4.sp.offer.accept')}</Pop>
          <Pop className="dm-go dm-go--quiet" onTap={() => { decline(o.id); }}>{t('e4.sp.offer.decline')}</Pop>
        </span>
      </div>)}
      {!offers.length && !deals.length && <p className="dm-empty">{t('pl4.dms.noBrands')}</p>}
    </div>
  </div>;
}
