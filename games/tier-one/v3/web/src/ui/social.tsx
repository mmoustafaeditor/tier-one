// The press box widgets (GOTY.md §7.3) other screens drop in:
//   <ChallengeButton view={view} />   Results: mints a "beat my board" link for the window just played (or, with no
//                                     view, for the last finished window: the press box uses it that way).
//   <LivePresence board="daily" />    the Daily board: "N reporters on this board now" and, after results, who broke it first.
//   <FriendRivalCard rec={r} i={k} /> Rivals screen: a friend rival in the existing rival-card look (friendRivals(save)).
//   <SocialWatch />                   App: watches the save for a local window ending; answers a pending challenge.
//   <Handle>, <Flair>, <Byline>       handles inside <bdi dir="ltr">, the equipped flair glyph, a byline chip.
import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useSave, getSave, type Save } from '../lib/save';
import { useT } from '../lib/i18n';
import { sfx, buzz } from '../lib/sfx';
import { v3 } from '../lib/api';
import { ymdUTC } from '../lib/meta';
import { cosmetic } from '../lib/season';
import { netOf, rivalState, SCALP_NET, type RivalRec } from '../lib/byline';
import { mintable, mintChallenge, challengeUrl, onSaveChange, friendTaunt, shortRecord, FRIEND_MIN, type Who } from '../lib/social';
import type { View } from '../lib/driver';
import { Icon, CountUp } from './game';
import { Avatar } from './screenbits';
import '../styles/social.css';

/** A byline or handle: always left-to-right, whatever the page direction. */
export const Handle = ({ children, className }: { children: string; className?: string }) => <bdi dir="ltr" className={className}>{children}</bdi>;
/** A translated line with a byline in it: `withHandle(t('so.ch.card', { n: '{n}' }), name)` keeps the handle in a <bdi>. */
export function withHandle(line: string, name: string, key = '{n}') {
  const parts = line.split(key);
  return parts.map((part, i) => <Fragment key={i}>{i > 0 && <Handle className="so-h">{name}</Handle>}{part}</Fragment>);
}
/** The flair glyph a reporter has equipped (a cosmetic id from the Pass), or nothing. */
export function Flair({ id, size = 14 }: { id?: string; size?: number }) {
  const c = id ? cosmetic(id) : null;
  if (!c || c.kind !== 'flair' || !c.g) return null;
  return <span className="so-flair" style={{ color: c.c, fontSize: size }} aria-hidden="true">{c.g}</span>;
}
/** Avatar, byline, flair and rep tier on one chip. */
export function Byline({ who, me, size = 28, tier = true, style }: { who: Who; me?: boolean; size?: number; tier?: boolean; style?: CSSProperties }) {
  const t = useT();
  return <span className={'so-by' + (me ? ' is-me' : '')} style={style}>
    <Avatar name={who.nick} size={size} me={me} />
    <b className="so-by__n"><Handle>{me ? t('common.you') : who.nick}</Handle><Flair id={who.flair} /></b>
    {tier && who.tier && <small className="so-by__t g-mono">{t('cn.tier.' + who.tier)}</small>}
  </span>;
}

// ---------------------------------------------------------------- Beat my board
export function ChallengeButton({ view, size = 'sm', className = '', style }: { view?: View; size?: '' | 'sm' | 'lg'; className?: string; style?: CSSProperties }) {
  const t = useT(); const s = useSave();
  const [st, setSt] = useState<'idle' | 'busy' | 'done' | 'err'>('idle');
  const [err, setErr] = useState('');
  const m = pick(s, view);
  if (!m) return null;
  const go = async () => {
    if (st === 'busy') return;
    sfx('ui.tap'); setSt('busy'); setErr('');
    const r = await mintChallenge(m);
    if (!r.ok) { setSt('err'); setErr(t.or('so.ch.errors.' + r.error, 'err.generic')); return; }
    const url = challengeUrl(r.challenge.code), text = t('so.ch.share', { s: m.score, w: m.label, u: url });
    try { await navigator.clipboard?.writeText(url); } catch { /* clipboard blocked */ }
    setSt('done'); sfx('ui.pop'); buzz(15);
    const nav = navigator as Navigator & { share?: (d: { text: string; url?: string }) => Promise<void> };
    if (nav.share) { try { await nav.share({ text, url }); } catch { /* cancelled */ } }
    setTimeout(() => setSt('idle'), 4000);
  };
  return <span className={'so-chbtn ' + className} style={style}>
    <button type="button" className={'g-btn g-btn--rooms' + (size ? ' g-btn--' + size : '')} onClick={go} disabled={st === 'busy'} aria-live="polite">
      <Icon n={st === 'done' ? 'check' : 'target'} size={18} />{st === 'busy' ? t('so.ch.minting') : st === 'done' ? t('so.ch.minted') : t('so.ch.mint')}
    </button>
    {err && <small className="g-err" role="alert">{err}</small>}
  </span>;
}
function pick(s: Save, view?: View) {
  const all = mintable(s);
  if (!view) return all[0] || null;
  if (!view.done || !view.result) return null;
  if (view.mode === 'daily') return all.find((m) => m.mode === 'daily' && m.day === ymdUTC()) || null;
  if (view.mode === 'room') return null; // a room round is already shared with the room
  return all.find((m) => m.seed && m.seed === view.seed) || null;
}

// ---------------------------------------------------------------- live presence (the Daily board)
export function LivePresence({ board = 'daily', done, style }: { board?: string; done?: boolean; style?: CSSProperties }) {
  const t = useT(); const s = useSave();
  const [n, setN] = useState<number | null>(null);
  const [first, setFirst] = useState<{ nick: string; p: string; me: boolean } | null | 'locked'>('locked');
  const over = done ?? (board === 'daily' ? !!s.daily[ymdUTC()] : false);
  useEffect(() => {
    let alive = true, timer = 0;
    const tick = async () => {
      if (document.visibilityState === 'hidden') { timer = window.setTimeout(tick, 60000); return; }
      const r = await v3<{ n: number }>('live.count', { board, dev: s.dev }, 6000);
      if (alive && r.ok) setN(r.n);
      timer = window.setTimeout(tick, 60000);
    };
    tick();
    return () => { alive = false; clearTimeout(timer); };
  }, [board, s.dev]);
  useEffect(() => {
    if (!over || board !== 'daily') return;
    let alive = true;
    v3<{ first: { nick: string; p: string; me: boolean } | null; locked: boolean }>('live.first', { dev: s.dev }, 6000).then((r) => { if (alive && r.ok) setFirst(r.locked ? 'locked' : r.first); });
    return () => { alive = false; };
  }, [over, board, s.dev]);
  if (n == null) return null;
  return <div className="so-live" style={style} aria-live="polite">
    <span className="so-live__dot" aria-hidden="true" />
    <span className="so-live__n">{n <= 1 ? t('so.live.one') : t('so.live.n', { n })}</span>
    {over && <span className="so-live__first">{first === 'locked' ? t('so.live.locked') : !first ? t('so.live.none') : first.me ? t('so.live.firstMe', { p: first.p }) : withHandle(t('so.live.first', { n: '{n}', p: first.p }), first.nick)}</span>}
  </div>;
}

// ---------------------------------------------------------------- a friend rival, in the rival-card look (Connect.tsx)
export function FriendRivalCard({ rec, i = 0, style }: { rec: RivalRec & { id: string; pub: string; named: boolean }; i?: number; style?: CSSProperties }) {
  const t = useT(); const s = useSave();
  const n = netOf(rec), st = rivalState(rec), plays = rec.plays || 0;
  const pct = Math.max(0, Math.min(100, (100 * Math.max(0, n)) / SCALP_NET));
  const taunt = rec.named ? friendTaunt(rec) : '';
  useEffect(() => { if (rec.scalp && !s.reduced) { const id = setTimeout(() => { sfx('stamp.done'); buzz(25); }, 380 + i * 160); return () => clearTimeout(id); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <article className={'cn-rival so-friend is-' + st + (rec.named ? ' is-named' : '')} style={{ ['--i' as string]: i, ...style }}>
    <header className="cn-rival__h">
      <Avatar name={rec.name || '?'} size={48} />
      <div><h2><Handle>{rec.name || '?'}</Handle></h2><p>{rec.named ? t('so.fr.named') + ' · ' + t('so.fr.plays', { n: plays }) : t('so.fr.toRival', { n: Math.max(0, FRIEND_MIN - plays) })}</p></div>
    </header>
    <div className="cn-rec" aria-label={`${t('cn.rivals.you')} ${rec.w}, ${t('cn.rivals.them')} ${rec.l}, ${t('cn.rivals.drawn')} ${rec.d}`}>
      <span className="cn-rec__side"><b className="g-num"><CountUp to={rec.w} ms={700} /></b><small>{t('cn.rivals.you')}</small></span>
      <span className="cn-rec__dash" aria-hidden="true">–</span>
      <span className="cn-rec__side"><b className="g-num"><CountUp to={rec.l} ms={700} /></b><small>{t('cn.rivals.them')}</small></span>
      {rec.scalp && <span className="g-stamp cn-rival__stamp is-slam" style={{ animationDelay: 380 + i * 160 + 'ms' }}>{t('so.fr.scalp')}</span>}
    </div>
    <p className="cn-rival__streak">{rec.streak > 0 ? t('cn.rivals.streakW', { n: rec.streak }) : rec.streak < 0 ? t('cn.rivals.streakL', { n: -rec.streak }) : t('cn.rivals.even')}{rec.d > 0 && <span className="cn-rec__d">{rec.d} {t('cn.rivals.drawn')}</span>}</p>
    {rec.named && !rec.scalp && <div className="cn-rival__goal"><span className="g-bar g-bar--sm" style={{ ['--bar' as string]: 'var(--m-rooms)' }}><i style={{ width: pct + '%' }} /></span><small>{t('cn.rivals.toScalp', { n: Math.max(0, SCALP_NET - n) })}</small></div>}
    {taunt && <blockquote className="cn-rival__said"><small>{t('so.fr.said')}</small><p dir="auto">{taunt}</p></blockquote>}
    <span className="sr-only">{shortRecord(rec)}</span>
  </article>;
}

// ---------------------------------------------------------------- the watcher
export function SocialWatch() {
  const s = useSave();
  const prev = useRef<Save>(s);
  useEffect(() => { const p = prev.current; prev.current = s; if (p !== s) onSaveChange(p, s); }, [s]);
  useEffect(() => { prev.current = getSave(); }, []);
  return null;
}
