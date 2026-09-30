// The post goes out (the classic composer, rebuilt for 3.2; 3.3 adds HERE WE GO and Delete & repost, and plays it as a
// film): your desk at night, hands on the keyboard, your post types itself on the laptop, the loudness stamp slams,
// it fires, and the film cuts to the fans: a terrace of phones lighting up while replies / reposts / likes tick up and
// a couple of reactions pop in. A Done call at Confirmed goes out as "HERE WE GO!" (gold frame, its own stamp, sound,
// floodlights and confetti). A U-turn plays first as a Delete & repost: the old post is struck through, "ratio" replies
// pile in, then the new post flies in. ~2.6 s (≈3.1 s for a repost), unskippable; static under reduced motion.
// Everything is derived from one elapsed-time clock. Fits the screen, never scrolls. The backdrop is a video slot
// (film/calls/manifest.ts: post-<kind>-<p|l>) with the SVG desk/crowd film as the fallback. Feel only: the engine
// call was already made.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { OUTS, type CastSaga } from '../lib/engine';
import { useT } from '../lib/i18n';
import { getSave } from '../lib/save';
import { sfx, buzz } from '../lib/sfx';
import { hash } from '../lib/kit';
import { hereWeGo } from '../lib/share';
import { outWord, strWord, vars } from '../lib/story';
import { Icon, Kit, confetti } from './game';
import { PostFilm, Hands } from '../film/calls/PostFilm';
import { postStem, aspectNow, type PostKind } from '../film/calls/manifest';
import { useFilmSlot, FilmVideo, FilmPoster } from '../film/calls/FilmSlot';
import { Beat } from './film'; // the filmed shred under a Delete & repost (GOTY.md §9); nothing without the clip
import '../film/calls/callfilms.css';

const T0 = 120, PER = 20, TYPE_MAX = 720, PRESS = 120, SENT_GAP = 100, HOLD = 1200, HOLD_UT = 900, OUT = 300, CUT = 260;
// Delete & repost prelude: strike, "Deleted", the ratio pile-on, then the old post drops away.
const UT_STRIKE = 100, UT_DEL = 200, UT_R0 = 300, UT_RSTEP = 120, UT_AWAY = 700, UT_PRE = 860;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? String(v[k]) : m));
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '').slice(0, 12) || 'fan';
const kfmt = (n: number) => (n >= 10000 ? Math.round(n / 1000) + 'K' : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : String(n));
const ease = (k: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);

export interface PostSceneProps { c: CastSaga; o: number; s: number; ut: boolean; prev?: { o: number; s: number } | null; onDone: () => void }

export function PostScene({ c, o, s, ut, prev, onDone }: PostSceneProps) {
  const t = useT();
  const reduced = getSave().reduced || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const nick = getSave().nick.trim();
  const hwg = hereWeGo({ o, s });
  const lineOf = (oo: number, ss: number) => { const l = t.list('d2.post.line.' + OUTS[oo]) as string[] | undefined; return fill((l && l[ss]) || '', vars(c)); };
  const text = useMemo(() => lineOf(o, s), [o, s, c]);
  const oldText = useMemo(() => (ut && prev ? lineOf(prev.o, prev.s) : ''), [ut, prev, c]);
  const chars = useMemo(() => Array.from(text), [text]);
  const pre = ut && prev && !reduced ? UT_PRE : 0;
  const typeMs = Math.min(TYPE_MAX, chars.length * PER);
  const tSend = pre + T0 + typeMs + PRESS, tSent = tSend + SENT_GAP, tOut = tSent + (pre ? HOLD_UT : HOLD), tEnd = tOut + OUT;
  const seed = hash(c.player.id + '|' + o + '|' + s);
  const base = [18, 64, 220][s] * (1 + c.player.star * .45) * (hwg ? 1.6 : 1);
  const goal = { r: Math.round(base * (0.8 + (seed % 40) / 100)), p: Math.round(base * 2.3 * (0.8 + (seed % 23) / 60)), l: Math.round(base * 7.5 * (0.8 + (seed % 31) / 80)) };
  const reacts = useMemo(() => {
    const l = (t.list('d2.post.react.' + OUTS[o]) as string[] | undefined) || [];
    const a = seed % Math.max(1, l.length), b = (a + 1 + (seed >> 3) % Math.max(1, l.length - 1)) % Math.max(1, l.length);
    return [{ h: '@' + slug(c.to.s) + '_ultra', club: c.to, line: fill(l[a] || '', vars(c)) }, { h: '@' + slug(c.from.s) + 'tilidie', club: c.from, line: fill(l[b] || '', vars(c)) }];
  }, [o, c]);
  // The ratio pile-on under the deleted post: 3–4 cheeky replies, seeded so a replay reads the same.
  const ratio = useMemo(() => {
    if (!pre) return [];
    const l = (t.list('calls.repost.replies') as string[] | undefined) || [];
    if (!l.length) return [];
    const n = 3 + (seed % 2), st = seed % l.length, hs = ['@' + slug(c.to.s) + '_ultra', '@ratio_fc', '@' + slug(c.from.s) + 'tilidie', '@receipts_hq'];
    return Array.from({ length: n }, (_, k) => ({ h: hs[k % hs.length], club: k % 2 ? c.from : c.to, line: fill(l[(st + k * 3) % l.length], vars(c)) }));
  }, [pre, c]);

  const [el, setEl] = useState(reduced ? tSent + 1000 : 0);
  const fired = useRef({ typed: 0, sent: false, r1: false, r2: false, done: false, strike: false, ratio: 0 });
  const root = useRef<HTMLDivElement>(null);
  const [aspect] = useState(aspectNow);
  const kind: PostKind = hwg ? 'hwg' : pre ? 'repost' : (['talks', 'advanced', 'confirmed'] as const)[s] || 'talks';
  const stem = postStem(kind, aspect);
  const slot = useFilmSlot(stem, !!reduced);
  const done = () => { if (fired.current.done) return; fired.current.done = true; if (!fired.current.sent) send(); onDone(); };
  const send = () => {
    fired.current.sent = true;
    if (hwg) {
      sfx('publish.hwg'); setTimeout(() => sfx('stamp.exclusive'), 260); buzz([30, 40, 30, 40, 90]);
      if (!reduced) confetti(['#F7B928', '#FFD76A', '#A36F00', '#F4EFE4', '#2FBF71'], 170);
      return;
    }
    sfx((['publish.talks', 'publish.advanced', 'publish.confirmed'] as const)[s]); setTimeout(() => sfx('stamp.done'), 120);
    buzz(s === 2 ? [20, 40, 30] : 18);
    if (s === 2 && !reduced) confetti(['#FF5A36', '#F7B928', '#F4EFE4', getComputedStyle(document.documentElement).getPropertyValue('--c-' + OUTS[o]).trim() || '#2FBF71'], 90);
  };

  useEffect(() => {
    if (reduced) { if (!fired.current.sent) send(); const id = setTimeout(done, 1500); return () => clearTimeout(id); }
    let raf = 0; const start = performance.now();
    const step = (now: number) => {
      const f = fired.current;
      const e = now - start; setEl(e);
      if (pre) {
        if (!f.strike && e >= UT_STRIKE) { f.strike = true; sfx('shred'); buzz(14); }
        const rn = ratio.filter((_, k) => e >= UT_R0 + k * UT_RSTEP).length;
        if (rn > f.ratio) { f.ratio = rn; sfx('ui.pop'); }
      }
      const n = Math.floor(Math.max(0, e - pre - T0) / Math.max(1, typeMs) * chars.length);
      if (n > f.typed && e < pre + T0 + typeMs) { if (Math.floor(n / 3) > Math.floor(f.typed / 3)) sfx('type'); f.typed = n; }
      if (!f.sent && e >= tSent) send();
      if (!f.r1 && e >= tSent + 380) { f.r1 = true; sfx('ui.pop'); }
      if (!f.r2 && e >= tSent + 720) { f.r2 = true; sfx('ui.pop'); }
      if (e >= tEnd) { done(); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  useLayoutEffect(() => {
    const was = document.activeElement as HTMLElement | null, ov = document.body.style.overflow, hov = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden'; root.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = ov; document.documentElement.style.overflow = hov; was?.focus?.({ preventScroll: true }); };
  }, []);

  const inPre = pre > 0 && el < pre;
  const typed = el >= pre + T0 + typeMs ? chars.length : Math.floor(Math.max(0, el - pre - T0) / Math.max(1, typeMs) * chars.length);
  const phase = inPre ? 'repost' : el >= tOut ? 'out' : el >= tSent ? 'sent' : el >= tSend - PRESS ? (el >= tSend ? 'press' : 'ready') : 'typing';
  const cut = !inPre && el >= tSent + CUT;
  const k = ease((el - tSent) / 1000);
  const who = nick || t('d2.post.you');
  const handle = <bdi dir="ltr">@{nick ? slug(nick) : 'tierone_desk'}</bdi>;
  const av = <span className="ps__av" aria-hidden="true">{nick ? Array.from(nick)[0].toUpperCase() : <Icon n="pen" size={20} />}</span>;
  const label = hwg ? t('calls.hwg.word') : t('g.saga.publish', { s: strWord(t.lang, s), o: outWord(t.lang, o) });
  const fr = (el * 30) / 1000, fCut = ((tSent + CUT) * 30) / 1000;
  const isTyping = inPre ? false : phase === 'typing';
  const backdrop = <PostFilm f={fr} fCut={fCut} hwg={hwg} cA={c.to.c1 || '#FF5A36'} cB={c.to.c2 || '#F4EFE4'} rtl={t.rtl} still={!!reduced} />;

  return <div className={'post-scene pf is-' + phase + (cut ? ' is-cut' : '') + (reduced ? ' is-rm' : '') + (hwg ? ' is-hwg' : '')} role="dialog" aria-modal="true" aria-label={label} ref={root} tabIndex={-1}>
    <div className="pf__frame">
      <div className="pf__shot">
        {slot.mode === 'poster' ? <FilmPoster stem={stem} fallback={backdrop} /> : <>{slot.mode !== 'video' && backdrop}<FilmVideo stem={stem} mode={slot.mode} setMode={slot.setMode} /></>}
      </div>
      {pre > 0 && <Beat stem="beat-shred" trigger={1} className="fl-beat--shred" />}
      <div className="pf__screen">
        {inPre && prev && <div className={'ps ps--old oc--' + OUTS[prev.o] + (el >= UT_STRIKE ? ' is-struck' : '') + (el >= UT_AWAY ? ' is-away' : '')}>
          <div className="ps__h">{av}<span className="ps__who"><b>{who}</b><span className="g-mono">{handle} · {strWord(t.lang, prev.s)} · {outWord(t.lang, prev.o)}</span></span></div>
          <p className="ps__txt ps__txt--old"><span>{oldText}</span></p>
          {el >= UT_DEL && <span className="g-stamp is-slam ps__stamp ps__del" style={{ ['--rot' as string]: '-7deg' }}><Icon n="x" size={15} />{t('calls.repost.deleted')}</span>}
          <ul className="ps__re ps__ratio">
            {ratio.map((r, n) => el >= UT_R0 + n * UT_RSTEP ? <li key={n}><Kit club={r.club} size={26} /><div><b className="g-mono" dir="ltr">{r.h}</b><p>{r.line}</p></div></li> : null)}
          </ul>
        </div>}
        {!inPre && <div className={'ps oc--' + OUTS[o] + ' ps--s' + s + (hwg ? ' ps--hwg' : '') + (pre ? ' ps--repost' : '')}>
          <span className="ps__roll" aria-hidden="true" />
          <div className="ps__h">
            {av}
            <span className="ps__who"><b>{who}</b><span className="g-mono">{handle} · {phase === 'typing' || phase === 'ready' ? t('d2.post.typing') : t('d2.post.now')}</span></span>
            <span className="ps__send" aria-hidden="true">{phase === 'sent' || phase === 'out' ? <Icon n="check" size={16} /> : t('d2.post.send')}</span>
          </div>
          <p className="ps__txt">{chars.slice(0, typed).join('')}{typed < chars.length && <span className="ps__caret" />}</p>
          {el >= tSent && (hwg
            ? <span className="g-stamp is-slam ps__stamp ps__stamp--hwg" style={{ ['--rot' as string]: '-6deg' }}><Icon n="star" size={18} />{t('calls.hwg.stamp')}</span>
            : <span className={'g-stamp is-slam ps__stamp g-stamp--' + OUTS[o]} style={{ ['--rot' as string]: '-7deg' }}>{ut && <Icon n="uturn" size={16} />}{strWord(t.lang, s)} · {outWord(t.lang, o)}</span>)}
          <div className="ps__foot" aria-hidden={el < tSent}>
            <span><Icon n="reply" size={16} />{kfmt(Math.round(goal.r * k))}</span>
            <span className="rp"><Icon n="repost" size={16} />{kfmt(Math.round(goal.p * k))}</span>
            <span className="lk"><Icon n="heart" size={16} />{kfmt(Math.round(goal.l * k))}</span>
          </div>
        </div>}
        {!cut && <Hands f={fr} typing={isTyping} />}
      </div>
      {cut && <ul className="pf__re">
        {reacts.map((r, n) => el >= tSent + 380 + n * 340 && r.line ? <li key={n}><Kit club={r.club} size={28} /><div><b className="g-mono" dir="ltr">{r.h}</b><p>{r.line}</p></div></li> : null)}
      </ul>}
    </div>
  </div>;
}
