// Rooms widgets other screens drop in (UI41: Multiplayer = Rooms only; challenge and crew widgets are cut):
//   <LivePresence board="daily" />    the Daily board: how many players are on it now, and who broke it first.
//   <SocialWatch />                   App mounts it once: the settle hooks (challenge answers, the ranked DD Live log)
//                                     and the Market watchlist's tray lines.
//   <Handle>, <Flair>, <Byline>       handles inside <bdi dir="ltr">, the equipped flair glyph, a byline chip.
//   <GridRow row/>, ordinal(t, n)     the v4 result grid (Scoop · right · wrong · no call) and "1st" / "2nd".
import { Fragment, useEffect, useState, type CSSProperties } from 'react';
import { useSave, getSave } from '../lib/save';
import { useT, type T } from '../lib/i18n';
import { v3 } from '../lib/api';
import { ymdUTC } from '../lib/meta';
import { cosmetic } from '../lib/season';
import { installGroupHooks, type Who } from '../lib/social';
import { installLiveHooks } from '../lib/live';
import { refreshWire, watchEvents, takeLanded, marketOf } from '../lib/wireData';
import { Avatar } from './screenbits';
import { notify } from './juice';
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
