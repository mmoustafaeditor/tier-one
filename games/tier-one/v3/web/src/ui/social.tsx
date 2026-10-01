// Groups widgets other screens drop in (CONCEPT4 §2 Groups, §10: on a ranked board your rivals are real players):
//   <ChallengeButton view={view} />   Results: "Challenge a friend" for the window just played (or, with no view, the
//                                     last finished window). The friend plays the exact rules you played.
//   <LivePresence board="daily" />    the Daily board: how many players are on it now, and who broke it first.
//   <FriendRivalCard rec={r} i={k} /> Rivals screen: a friend you keep meeting in rooms and challenges.
//   <SocialWatch />                   App mounts it once: the settle hooks (challenge answers, the ranked DD Live log)
//                                     and the Market watchlist's tray lines.
//   <Handle>, <Flair>, <Byline>       handles inside <bdi dir="ltr">, the equipped flair glyph, a byline chip.
//   <GridRow row/>, ordinal(t, n)     the v4 result grid (Scoop · right · wrong · no call) and "1st" / "2nd".
import { Fragment, useEffect, useState, type CSSProperties } from 'react';
import { useSave, getSave } from '../lib/save';
import { useT, type T } from '../lib/i18n';
import { sfx, buzz } from '../lib/sfx';
import { v3 } from '../lib/api';
import { ymdUTC } from '../lib/meta';
import { cosmetic } from '../lib/season';
import { netOf, rivalState, SCALP_NET, type RivalRec } from '../lib/byline';
import { mintable, mintChallenge, challengeUrl, installGroupHooks, friendTaunt, shortRecord, FRIEND_MIN, type Who } from '../lib/social';
import { installLiveHooks } from '../lib/live';
import { refreshWire, watchEvents, takeLanded, marketOf } from '../lib/wireData';
import { Icon, CountUp } from './game';
import { Avatar } from './screenbits';
import { notify } from './juice';
import { tn } from './connect';
import '../styles/social.css';

/** A byline or handle: always left-to-right, whatever the page direction. */
export const Handle = ({ children, className }: { children: string; className?: string }) => <bdi dir="ltr" className={className}>{children}</bdi>;
/** A translated line with a byline in it: `withHandle(t('…', { n: '{n}' }), name)` keeps the handle in a <bdi>. */
export function withHandle(line: string, name: string, key = '{n}') {
  const parts = line.split(key);
  return parts.map((part, i) => <Fragment key={i}>{i > 0 && <Handle className="so-h">{name}</Handle>}{part}</Fragment>);
}
/** The flair glyph a player has equipped (a cosmetic id), or nothing. */
export function Flair({ id, size = 14 }: { id?: string; size?: number }) {
  const c = id ? cosmetic(id) : null;
  if (!c || c.kind !== 'flair' || !c.g) return null;
  return <span className="so-flair" style={{ color: c.c, fontSize: size }} aria-hidden="true">{c.g}</span>;
}
/** Avatar, handle, flair and rank on one chip. */
export function Byline({ who, me, size = 28, tier = true, style }: { who: Who; me?: boolean; size?: number; tier?: boolean; style?: CSSProperties }) {
  const t = useT();
  return <span className={'so-by' + (me ? ' is-me' : '')} style={style}>
    <Avatar name={who.nick} size={size} me={me} />
    <b className="so-by__n"><Handle>{me ? t('common.you') : who.nick}</Handle><Flair id={who.flair} /></b>
    {tier && who.tier && <small className="so-by__t">{t('cn.tier.' + who.tier)}</small>}
  </span>;
}

// ---------------------------------------------------------------- "1st", never a crown (RULES4 §4)
export function ordinal(t: T, n: number): string {
  const k = n === 1 ? 'one' : n === 2 ? 'two' : n === 3 ? 'three' : 'n';
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th';
  return t('md4.ord.' + k, { n, s });
}
// ---------------------------------------------------------------- the v4 grid: one cell per story
export function GridRow({ row, size = 'md', className = '' }: { row: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const t = useT();
  const cells = (row || '').split('');
  const word = (c: string) => (c === '★' ? 'scoop' : c === '■' ? 'right' : c === '□' ? 'wrong' : 'none');
  const label = cells.map((c) => t('md4.grid.' + word(c))).join(', ');
  return <span className={'gp-grid gp-grid--' + size + ' ' + className} role="img" aria-label={label}>{cells.map((c, k) => <i key={k} className={'is-' + word(c)} />)}</span>;
}

// ---------------------------------------------------------------- Challenge a friend
type ViewLike = { mode: string; seed?: string; done?: boolean } | null | undefined;
export function ChallengeButton({ view, size = 'sm', className = '', style }: { view?: ViewLike; size?: '' | 'sm' | 'lg'; className?: string; style?: CSSProperties }) {
  const t = useT(); const s = useSave();
  const [st, setSt] = useState<'idle' | 'busy' | 'done' | 'err'>('idle');
  const [err, setErr] = useState('');
  const all = mintable(s);
  const m = !view ? all[0] || null : !view.done ? null : view.mode === 'daily' ? all.find((x) => x.mode === 'daily' && x.day === ymdUTC()) || null : view.mode === 'room' ? null : all.find((x) => x.seed && x.seed === view.seed) || null;
  if (!m) return null;
  const go = async () => {
    if (st === 'busy') return;
    sfx('ui.tap'); setSt('busy'); setErr('');
    const r = await mintChallenge(m);
    if (!r.ok) { setSt('err'); setErr(t.or('md4.gp.ch.err.' + r.error, 'err.generic')); return; }
    const url = challengeUrl(r.challenge.code), text = t('md4.gp.ch.share', { s: m.score, w: m.label, u: url });
    try { await navigator.clipboard?.writeText(url); } catch { /* clipboard blocked */ }
    setSt('done'); sfx('ui.pop'); buzz(15);
    const nav = navigator as Navigator & { share?: (d: { text: string; url?: string }) => Promise<void> };
    if (nav.share) { try { await nav.share({ text, url }); } catch { /* cancelled */ } }
    setTimeout(() => setSt('idle'), 4000);
  };
  return <span className={'so-chbtn ' + className} style={style}>
    <button type="button" className={'g-btn g-btn--rooms' + (size ? ' g-btn--' + size : '')} onClick={go} disabled={st === 'busy'} aria-live="polite">
      <Icon n={st === 'done' ? 'check' : 'target'} size={18} />{st === 'busy' ? t('md4.gp.ch.minting') : st === 'done' ? t('md4.gp.ch.minted') : t('md4.gp.ch.mint')}
    </button>
    {err && <small className="g-err" role="alert">{err}</small>}
  </span>;
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
    <span className="so-live__n">{n <= 1 ? t('md4.presence.one') : t('md4.presence.n', { n })}</span>
    {over && <span className="so-live__first">{first === 'locked' ? t('md4.presence.locked') : !first ? t('md4.presence.none') : first.me ? t('md4.presence.firstMe', { p: first.p }) : withHandle(t('md4.presence.first', { n: '{n}', p: first.p }), first.nick)}</span>}
  </div>;
}

// ---------------------------------------------------------------- a friend rival (Connect.tsx)
export function FriendRivalCard({ rec, i = 0, style }: { rec: RivalRec & { id: string; pub: string; named: boolean }; i?: number; style?: CSSProperties }) {
  const t = useT(); const s = useSave();
  const n = netOf(rec), st = rivalState(rec), plays = rec.plays || 0;
  const pct = Math.max(0, Math.min(100, (100 * Math.max(0, n)) / SCALP_NET));
  const taunt = rec.named ? friendTaunt(rec) : '';
  useEffect(() => { if (rec.scalp && !s.reduced) { const id = setTimeout(() => { sfx('stamp.done'); buzz(25); }, 380 + i * 160); return () => clearTimeout(id); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <article className={'cn-rival so-friend is-' + st + (rec.named ? ' is-named' : '')} style={{ ['--i' as string]: i, ...style }}>
    <header className="cn-rival__h">
      <Avatar name={rec.name || '?'} size={48} />
      <div><h2><Handle>{rec.name || '?'}</Handle></h2><p>{rec.named ? t('md4.gp.fr.named', { n: plays }) : t('md4.gp.fr.toRival', { n: Math.max(0, FRIEND_MIN - plays) })}</p></div>
    </header>
    <div className="cn-rec" aria-label={`${t('cn.rivals.you')} ${rec.w}, ${t('cn.rivals.them')} ${rec.l}, ${t('cn.rivals.drawn')} ${rec.d}`}>
      <span className="cn-rec__side"><b className="g-num"><CountUp to={rec.w} ms={700} /></b><small>{t('cn.rivals.you')}</small></span>
      <span className="cn-rec__dash" aria-hidden="true">–</span>
      <span className="cn-rec__side"><b className="g-num"><CountUp to={rec.l} ms={700} /></b><small>{t('cn.rivals.them')}</small></span>
      {rec.scalp && <span className="g-stamp cn-rival__stamp is-slam" style={{ animationDelay: 380 + i * 160 + 'ms' }}>{t('md4.gp.fr.scalp')}</span>}
    </div>
    <p className="cn-rival__streak">{rec.streak > 0 ? tn(t, 'cn.rivals.runW', rec.streak) : rec.streak < 0 ? tn(t, 'cn.rivals.runL', -rec.streak) : t('cn.rivals.even')}{rec.d > 0 && <span className="cn-rec__d">{tn(t, 'cn.rivals.draws', rec.d)}</span>}</p>
    {rec.named && !rec.scalp && <div className="cn-rival__goal"><span className="g-bar g-bar--sm" style={{ ['--bar' as string]: 'var(--app-groups)' }}><i style={{ width: pct + '%' }} /></span><small>{t('cn.rivals.toScalp', { n: Math.max(0, SCALP_NET - n) })}</small></div>}
    {taunt && <blockquote className="cn-rival__said"><small>{t('md4.gp.fr.said')}</small><p dir="auto">{taunt}</p></blockquote>}
    <span className="sr-only">{shortRecord(rec)}</span>
  </article>;
}

// ---------------------------------------------------------------- the watcher (App mounts it once)
const WATCH_MS = 10 * 60e3;
export function SocialWatch() {
  const t = useT();
  useEffect(() => { installGroupHooks(); installLiveHooks(); }, []);
  // The Market: a real event on a watched rumour, or a call of yours that landed, goes to the tray. Never a nag.
  useEffect(() => {
    let alive = true, timer = 0;
    const tick = async () => {
      const s = getSave(), watching = Object.keys(marketOf(s).watch || {}).length;
      if (document.visibilityState !== 'hidden' && (watching || s.stats.wire)) {
        await refreshWire(true);
        if (!alive) return;
        for (const e of watchEvents()) notify({ id: 'mkw:' + e.rid + ':' + e.kind + ':' + Math.round(e.to * 100) + ':' + e.status + ':' + e.stage, app: 'market', title: t('md4.mk.tray.' + e.kind, { p: e.name }), body: e.kind === 'move' ? t('md4.mk.tray.moveB', { a: Math.round(e.from * 100), b: Math.round(e.to * 100) }) : e.kind === 'status' ? t('md4.mk.stage.' + e.stage) : t('md4.mk.tray.resolvedB'), action: { to: { n: 'wire', rid: e.rid } } });
        for (const l of takeLanded()) notify({ id: 'mkl:' + l.rid, app: 'market', title: t(l.right ? 'md4.mk.tray.right' : 'md4.mk.tray.wrong', { p: l.name }), body: l.right ? t(l.tip ? 'md4.mk.tray.rightTipB' : 'md4.mk.tray.rightB', { n: l.coins }) : t('md4.mk.tray.wrongB'), action: { to: { n: 'wire', rid: l.rid } }, tone: l.right ? 'good' : 'bad' });
      }
      if (alive) timer = window.setTimeout(tick, WATCH_MS);
    };
    timer = window.setTimeout(tick, 4000);
    return () => { alive = false; clearTimeout(timer); };
  }, [t.lang]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
