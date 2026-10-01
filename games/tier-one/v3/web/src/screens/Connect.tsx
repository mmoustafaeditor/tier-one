// One Byline screens (GOTY.md §1.2–1.4): the Feed, Rivals and the Contacts Book.
// Each screen has one moment: the feed prints its new copy, the rivals' scalp stamps slam, a contact's card fills.
import { useEffect, useState, type CSSProperties } from 'react';
import { useT } from '../lib/i18n';
import { useSave, getSave } from '../lib/save';
import { sfx, buzz } from '../lib/sfx';
import { markRead, rivalOf, netOf, rivalState, RIVALS, SCALP_NET, TROPHY_NET, toRoute, type FeedItem } from '../lib/byline';
import { TopBar, CountUp } from '../ui/game';
import { FeedRow, RivalMark, Handle, tn } from '../ui/connect';
import { Empty } from '../ui/bits';
import type { Chrome } from '../App';

export { setNav } from '../ui/connect';

// ---------------------------------------------------------------- Feed
function dayGroup(at: number): 'today' | 'yesterday' | 'earlier' {
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  return at >= d0.getTime() ? 'today' : at >= d0.getTime() - 864e5 ? 'yesterday' : 'earlier';
}
export function FeedScreen(chrome: Chrome) {
  const t = useT(); const s = useSave();
  const feed = s.feed || [];
  // The unread set is frozen on open, so the copy that prints in stays marked as new while you read it.
  const [fresh] = useState(() => new Set(feed.filter((f) => !f.read).map((f) => f.id)));
  useEffect(() => { if (fresh.size) { sfx('typewriter'); const id = setTimeout(() => markRead(), 900); return () => clearTimeout(id); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const groups: [string, FeedItem[]][] = [];
  for (const f of feed) { const g = dayGroup(f.at); const last = groups[groups.length - 1]; if (last && last[0] === g) last[1].push(f); else groups.push([g, [f]]); }
  let k = 0;
  return <div className="g-screen cn-screen cn-feed">
    <TopBar back={{ label: t('g.tabs.home'), onClick: () => chrome.go({ n: 'front' }) }} title={t('cn.feed.title')} />
    {!feed.length ? <Empty card big icon="news" title={t('cn.feed.empty')} action={{ label: t('cn.feed.play'), icon: 'phone', kind: '', onClick: () => chrome.go({ n: 'daily' }) }} /> : groups.map(([g, items]) => <section key={g} className="cn-day">
      <h2 className="cn-day__h">{t('cn.feed.' + g)}{g === 'today' && fresh.size > 0 && <span className="cn-day__new">{t('cn.feed.unread', { n: fresh.size })}</span>}</h2>
      <div className="cn-sheet">{items.map((f) => { const isNew = fresh.has(f.id); const style = isNew ? { ['--k' as string]: k++ } as CSSProperties : undefined;
        return <FeedRow key={f.id} f={isNew ? { ...f, read: false } : f} onOpen={() => chrome.go(toRoute(f.to))} style={style} />; })}</div>
    </section>)}
  </div>;
}

// ---------------------------------------------------------------- Rivals
// Friend rivals (GOTY.md §7.3): the friends you duel with, listed under the three house rivals.
import { friendRivals } from '../lib/social';
import { FriendRivalCard } from '../ui/social';
export function RivalsScreen(chrome: Chrome) {
  const t = useT(); const s = useSave();
  const friends = friendRivals(s);
  return <div className="g-screen g-screen--wide cn-screen cn-rivals">
    <TopBar back={{ label: t('g.tabs.me'), onClick: () => chrome.go({ n: 'me' }) }} title={t('cn.rivals.title')} />
    <header className="cn-head"><h1>{t('cn.rivals.hed')}</h1><p>{t('cn.rivals.sub')}</p></header>
    <RivalsTotal />
    <div className="cn-rgrid">{RIVALS.map((id, i) => <RivalCard key={id} id={id} i={i} />)}</div>
    {friends.length > 0 && <div className="cn-rgrid cn-rgrid--friends">{friends.map((r, k) => <FriendRivalCard key={r.id} rec={r} i={RIVALS.length + k} />)}</div>}
    {!RIVALS.some((id) => { const r = rivalOf(s, id); return r.w + r.l + r.d; }) && <Empty card big icon="friends" title={t('cn.rivals.none')} action={{ label: t('cn.feed.play'), icon: 'phone', kind: '', onClick: () => chrome.go({ n: 'daily' }) }} />}
  </div>;
}
// The whole ledger in one line: your record against all three, how many you lead and how many scalps you hold.
function RivalsTotal() {
  const t = useT(); const s = useSave();
  const rs = RIVALS.map((id) => rivalOf(s, id));
  const w = rs.reduce((a, r) => a + r.w, 0), l = rs.reduce((a, r) => a + r.l, 0), d = rs.reduce((a, r) => a + r.d, 0);
  if (!(w + l + d)) return null;
  const ahead = rs.filter((r) => netOf(r) > 0).length, scalps = rs.filter((r) => r.scalp).length;
  return <p className="cn-total">
    <span className="cn-total__k">{t('cn.rivals.total')}</span>
    <b className="g-num" dir="ltr">{w}–{l}</b>
    {d > 0 && <span>{tn(t, 'cn.rivals.draws', d)}</span>}
    <span>{tn(t, 'cn.rivals.beaten', ahead)}</span>
    {scalps > 0 && <span className="cn-total__scalp">{tn(t, 'cn.rivals.scalps', scalps)}</span>}
  </p>;
}
function RivalCard({ id, i }: { id: string; i: number }) {
  const t = useT(); const s = useSave();
  const r = rivalOf(s, id), n = netOf(r), played = r.w + r.l + r.d;
  const goal = r.scalp ? TROPHY_NET : SCALP_NET;
  const pct = Math.max(0, Math.min(100, (100 * Math.max(0, n)) / goal));
  const st = rivalState(r);
  const taunt = r.taunt ? t('cn.taunt.' + id + '.' + r.taunt, { rec: '\u2066' + r.w + '–' + r.l + (r.d ? '–' + r.d : '') + '\u2069', p: r.tp ? '\u2068' + r.tp + '\u2069' : '', name: '\u2068' + (getSave().nick.trim() || t('d2.post.you')) + '\u2069' }) : '';
  useEffect(() => { if (r.scalp && !s.reduced) { const id2 = setTimeout(() => { sfx('stamp.done'); buzz(25); }, 380 + i * 160); return () => clearTimeout(id2); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <article className={'cn-rival cn-rival--' + id + ' is-' + st} style={{ ['--i' as string]: i }}>
    <header className="cn-rival__h">
      <RivalMark id={id} size={48} />
      <div><h2><Handle id={id} /></h2><p>{t('cn.rivals.blurb.' + id)}</p></div>
    </header>
    <div className="cn-rec" aria-label={`${t('cn.rivals.you')} ${r.w}, ${t('cn.rivals.them')} ${r.l}, ${t('cn.rivals.drawn')} ${r.d}`}>
      <span className="cn-rec__side"><b className="g-num"><CountUp to={r.w} ms={700} /></b><small>{t('cn.rivals.you')}</small></span>
      <span className="cn-rec__dash" aria-hidden="true">–</span>
      <span className="cn-rec__side"><b className="g-num"><CountUp to={r.l} ms={700} /></b><small>{t('cn.rivals.them')}</small></span>
      {r.scalp && <span className={'g-stamp cn-rival__stamp is-slam' + (r.trophy ? ' g-stamp--gold' : '')} style={{ animationDelay: 380 + i * 160 + 'ms' }}>{r.trophy ? t('cn.rivals.trophy') : t('cn.rivals.scalp')}</span>}
    </div>
    {played > 0 ? <>
      <p className="cn-rival__streak"><span>{r.streak > 0 ? tn(t, 'cn.rivals.runW', r.streak) : r.streak < 0 ? tn(t, 'cn.rivals.runL', -r.streak) : t('cn.rivals.even')}</span>{r.d > 0 && <span className="cn-rec__d">{tn(t, 'cn.rivals.draws', r.d)}</span>}</p>
      {!r.trophy && <div className="cn-rival__goal"><span className="g-bar g-bar--sm" style={{ ['--bar' as string]: r.scalp ? 'var(--gold)' : 'var(--red)' }}><i style={{ width: pct + '%' }} /></span>
        <small>{r.scalp ? t('cn.rivals.toTrophy', { n: Math.max(0, TROPHY_NET - n) }) : t('cn.rivals.toScalp', { n: Math.max(0, SCALP_NET - n) })}</small></div>}
      {taunt && <blockquote className="cn-rival__said"><small>{t('cn.rivals.said')}</small><p dir="auto">{taunt}</p></blockquote>}
    </> : <p className="cn-rival__streak">{t('cn.rivals.none')}</p>}
  </article>;
}

// ---------------------------------------------------------------- Contacts
// The Contacts Book became the DMs app (CONCEPT4 §2): screens/DMs.tsx. The route ('contacts') keeps its name.
export { DMsScreen as ContactsScreen } from './DMs';
