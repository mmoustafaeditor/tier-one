// Social widgets other screens drop in (3.8, spec H):
//   <LivePresence board="daily" />    the Daily board: "N reporters on this board now" and, after results, who broke it first.
//   <FriendRivalCard rec={r} i={k} /> Rivals screen: a friend rival in the existing rival-card look (friendRivals(save)).
//   <SocialWatch />                   App: kept as a mount point (challenges are gone; it does nothing now).
//   <Handle>, <Flair>, <Byline>       handles inside <bdi dir="ltr">, the equipped flair glyph, a byline chip.
//   <RecapCard />                     the Press Box recap (Rooms, and anywhere a round recap is shown).
import { Fragment, useEffect, useState, type CSSProperties } from 'react';
import { useSave } from '../lib/save';
import { useT } from '../lib/i18n';
import { sfx, buzz } from '../lib/sfx';
import { v3 } from '../lib/api';
import { ymdUTC } from '../lib/meta';
import { cosmetic } from '../lib/season';
import { netOf, rivalState, SCALP_NET, type RivalRec } from '../lib/byline';
import { friendTaunt, shortRecord, FRIEND_MIN, type Who, type RecapView } from '../lib/social';
import { CountUp } from './game';
import { Avatar } from './screenbits';
import { tn } from './connect';
import '../styles/social.css';

/** A byline or handle: always left-to-right, whatever the page direction. */
export const Handle = ({ children, className }: { children: string; className?: string }) => <bdi dir="ltr" className={className}>{children}</bdi>;
/** A translated line with a byline in it: `withHandle(t('so.room.ev.join', { n: '{n}' }), name)` keeps the handle in a <bdi>. */
export function withHandle(line: string, name: string, key = '{n}') {
  const parts = line.split(key);
  return parts.map((part, i) => <Fragment key={i}>{i > 0 && <Handle className="so-h">{name}</Handle>}{part}</Fragment>);
}
/** The flair glyph a reporter has equipped (a cosmetic id from the Shop), or nothing. */
export function Flair({ id, size = 14 }: { id?: string; size?: number }) {
  const c = id ? cosmetic(id) : null;
  if (!c || c.kind !== 'flair' || !c.g) return null;
  return <span className="so-flair" style={{ color: c.c, fontSize: size }} aria-hidden="true">{c.g}</span>;
}
/** Avatar, byline, flair and rep tier on one chip. Friends are real people: initials, never character art. */
export function Byline({ who, me, size = 28, tier = true, style }: { who: Who; me?: boolean; size?: number; tier?: boolean; style?: CSSProperties }) {
  const t = useT();
  return <span className={'so-by' + (me ? ' is-me' : '')} style={style}>
    <Avatar name={who.nick} size={size} me={me} />
    <b className="so-by__n"><Handle>{me ? t('common.you') : who.nick}</Handle><Flair id={who.flair} /></b>
    {tier && who.tier && <small className="so-by__t g-mono">{t('cn.tier.' + who.tier)}</small>}
  </span>;
}

// ---------------------------------------------------------------- THE PRESS BOX · ROUND N (paper card)
export function RecapCard({ v, compact }: { v: RecapView; compact?: boolean }) {
  const t = useT();
  const move = (m: number) => (m ? <span className={'rm-move ' + (m > 0 ? 'is-up' : 'is-down')} aria-label={t(m > 0 ? 'rm.recap.up' : 'rm.recap.down', { n: Math.abs(m) })}>{m > 0 ? '▲' : '▼'}{Math.abs(m)}</span> : null);
  return <article className={'rm-recap g-card' + (compact ? ' is-compact' : '')} aria-label={t('rm.recap.head', { n: v.round })}>
    <header className="rm-recap__h"><span className="g-mono">{v.room}</span><b>{t('rm.recap.head', { n: v.round })}</b></header>
    <ol className="rm-recap__t">
      {v.lines.slice(0, compact ? 3 : 8).map((l, i) => <li key={i} className={(l.me ? 'is-me' : '') + (i === 0 ? ' is-top' : '')}>
        <span className="rm-recap__n g-num">{i + 1}</span><Handle className="rm-recap__who">{l.nick}</Handle>{move(l.move)}<b className="rm-recap__p g-num">{l.score}{l.ex ? <i aria-label={t('rm.recap.exclN', { n: l.ex })}> ★{l.ex > 1 ? l.ex : ''}</i> : null}</b>
      </li>)}
      {v.lines.length > (compact ? 3 : 8) && <li className="rm-recap__more g-mono">{t('rm.recap.more', { n: v.lines.length - (compact ? 3 : 8) })}</li>}
    </ol>
    <dl className="rm-recap__aw">
      <div className="is-gold"><dt>{t('rm.recap.scoop')}</dt><dd dir="auto">{v.scoop}</dd></div>
      <div className="is-coral"><dt>{t('rm.recap.disaster')}</dt><dd dir="auto">{v.disaster}</dd></div>
      {!compact && <div><dt>{t('rm.recap.first')}</dt><dd dir="auto">{v.first}</dd></div>}
      {!compact && v.missed.length > 0 && <div><dt>{t('rm.recap.missedT')}</dt><dd dir="auto">{v.missed.join(', ')}</dd></div>}
    </dl>
  </article>;
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
    <p className="cn-rival__streak">{rec.streak > 0 ? tn(t, 'cn.rivals.runW', rec.streak) : rec.streak < 0 ? tn(t, 'cn.rivals.runL', -rec.streak) : t('cn.rivals.even')}{rec.d > 0 && <span className="cn-rec__d">{tn(t, 'cn.rivals.draws', rec.d)}</span>}</p>
    {rec.named && !rec.scalp && <div className="cn-rival__goal"><span className="g-bar g-bar--sm" style={{ ['--bar' as string]: 'var(--m-rooms)' }}><i style={{ width: pct + '%' }} /></span><small>{t('cn.rivals.toScalp', { n: Math.max(0, SCALP_NET - n) })}</small></div>}
    {taunt && <blockquote className="cn-rival__said"><small>{t('so.fr.said')}</small><p dir="auto">{taunt}</p></blockquote>}
    <span className="sr-only">{shortRecord(rec)}</span>
  </article>;
}

// ---------------------------------------------------------------- the watcher (a mount point; challenges are gone)
export function SocialWatch() { return null; }
