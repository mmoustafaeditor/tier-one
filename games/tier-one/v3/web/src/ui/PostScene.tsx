// The post goes out (the classic composer, rebuilt for 3.2): after Publish, your post types itself, the loudness stamp
// slams, it fires, and replies / reposts / likes tick up with a couple of instant reactions. ~2.4 s, tap to skip,
// static under reduced motion. Everything is derived from one elapsed-time clock so a skip lands on the same frame.
import { useEffect, useMemo, useRef, useState } from 'react';
import { OUTS, type CastSaga } from '../lib/engine';
import { useT } from '../lib/i18n';
import { getSave } from '../lib/save';
import { sfx, buzz } from '../lib/sfx';
import { hash } from '../lib/kit';
import { outWord, strWord, vars } from '../lib/story';
import { Icon, Kit, confetti } from './game';

const T0 = 120, PER = 20, TYPE_MAX = 720, PRESS = 120, SENT_GAP = 100, HOLD = 1150, OUT = 300;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? String(v[k]) : m));
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '').slice(0, 12) || 'fan';
const kfmt = (n: number) => (n >= 10000 ? Math.round(n / 1000) + 'K' : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : String(n));
const ease = (k: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);

export function PostScene({ c, o, s, ut, onDone }: { c: CastSaga; o: number; s: number; ut: boolean; onDone: () => void }) {
  const t = useT();
  const reduced = getSave().reduced || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const nick = getSave().nick.trim();
  const text = useMemo(() => { const l = t.list('d2.post.line.' + OUTS[o]) as string[] | undefined; return fill((l && l[s]) || '', vars(c)); }, [o, s, c]);
  const chars = useMemo(() => Array.from(text), [text]);
  const typeMs = Math.min(TYPE_MAX, chars.length * PER);
  const tSend = T0 + typeMs + PRESS, tSent = tSend + SENT_GAP, tOut = tSent + HOLD, tEnd = tOut + OUT;
  const seed = hash(c.player.id + '|' + o + '|' + s);
  const base = [18, 64, 220][s] * (1 + c.player.star * .45);
  const goal = { r: Math.round(base * (0.8 + (seed % 40) / 100)), p: Math.round(base * 2.3 * (0.8 + (seed % 23) / 60)), l: Math.round(base * 7.5 * (0.8 + (seed % 31) / 80)) };
  const reacts = useMemo(() => {
    const l = (t.list('d2.post.react.' + OUTS[o]) as string[] | undefined) || [];
    const a = seed % Math.max(1, l.length), b = (a + 1 + (seed >> 3) % Math.max(1, l.length - 1)) % Math.max(1, l.length);
    return [{ h: '@' + slug(c.to.s) + '_ultra', club: c.to, line: fill(l[a] || '', vars(c)) }, { h: '@' + slug(c.from.s) + 'tilidie', club: c.from, line: fill(l[b] || '', vars(c)) }];
  }, [o, c]);

  const [el, setEl] = useState(reduced ? tSent + 1000 : 0);
  const fired = useRef({ typed: 0, sent: false, r1: false, r2: false, done: false });
  const done = () => { if (fired.current.done) return; fired.current.done = true; if (!fired.current.sent) send(); onDone(); };
  const send = () => {
    fired.current.sent = true;
    sfx((['publish.talks', 'publish.advanced', 'publish.confirmed'] as const)[s]); setTimeout(() => sfx('stamp.done'), 120);
    buzz(s === 2 ? [20, 40, 30] : 18);
    if (s === 2 && !reduced) confetti(['#FF5A36', '#F7B928', '#F4EFE4', getComputedStyle(document.documentElement).getPropertyValue('--c-' + OUTS[o]).trim() || '#2FBF71'], 90);
  };

  useEffect(() => {
    if (reduced) { if (!fired.current.sent) send(); const id = setTimeout(done, 1500); return () => clearTimeout(id); }
    let raf = 0; const start = performance.now();
    const step = (now: number) => {
      const e = now - start; setEl(e);
      const f = fired.current;
      const n = Math.floor(Math.max(0, e - T0) / Math.max(1, typeMs) * chars.length);
      if (n > f.typed && e < T0 + typeMs) { if (Math.floor(n / 3) > Math.floor(f.typed / 3)) sfx('type'); f.typed = n; }
      if (!f.sent && e >= tSent) send();
      if (!f.r1 && e >= tSent + 380) { f.r1 = true; sfx('ui.pop'); }
      if (!f.r2 && e >= tSent + 720) { f.r2 = true; sfx('ui.pop'); }
      if (e >= tEnd) { done(); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const typed = el >= T0 + typeMs ? chars.length : Math.floor(Math.max(0, el - T0) / Math.max(1, typeMs) * chars.length);
  const phase = el >= tOut ? 'out' : el >= tSent ? 'sent' : el >= tSend - PRESS ? (el >= tSend ? 'press' : 'ready') : 'typing';
  const k = ease((el - tSent) / 1000);
  const who = nick || t('d2.post.you');
  return <div className={'post-scene is-' + phase + (reduced ? ' is-rm' : '')} role="dialog" aria-modal="true" aria-label={t('g.saga.publish', { s: strWord(t.lang, s), o: outWord(t.lang, o) })} onClick={done}>
    <div className={'ps oc--' + OUTS[o] + ' ps--s' + s}>
      <div className="ps__h">
        <span className="ps__av" aria-hidden="true">{nick ? Array.from(nick)[0].toUpperCase() : <Icon n="pen" size={20} />}</span>
        <span className="ps__who"><b>{who}</b><span className="g-mono"><bdi dir="ltr">@{nick ? slug(nick) : 'tierone_desk'}</bdi> · {phase === 'typing' || phase === 'ready' ? t('d2.post.typing') : t('d2.post.now')}</span></span>
        <span className="ps__send" aria-hidden="true">{phase === 'sent' || phase === 'out' ? <Icon n="check" size={16} /> : t('d2.post.send')}</span>
      </div>
      <p className="ps__txt">{chars.slice(0, typed).join('')}{typed < chars.length && <span className="ps__caret" />}</p>
      {el >= tSent && <span className={'g-stamp is-slam ps__stamp g-stamp--' + OUTS[o]} style={{ ['--rot' as string]: '-7deg' }}>{ut && <Icon n="uturn" size={16} />}{strWord(t.lang, s)} · {outWord(t.lang, o)}</span>}
      <div className="ps__foot" aria-hidden={el < tSent}>
        <span><Icon n="reply" size={16} />{kfmt(Math.round(goal.r * k))}</span>
        <span className="rp"><Icon n="repost" size={16} />{kfmt(Math.round(goal.p * k))}</span>
        <span className="lk"><Icon n="heart" size={16} />{kfmt(Math.round(goal.l * k))}</span>
      </div>
      <ul className="ps__re">
        {reacts.map((r, n) => el >= tSent + 380 + n * 340 && r.line ? <li key={n}><Kit club={r.club} size={28} /><div><b className="g-mono" dir="ltr">{r.h}</b><p>{r.line}</p></div></li> : null)}
      </ul>
    </div>
    <p className="post-scene__skip g-mono">{t('d2.post.skip')}</p>
  </div>;
}
