// One Byline screens (GOTY.md §1.2–1.4): the Feed, Rivals and the Contacts Book.
// Each screen has one moment: the feed prints its new copy, the rivals' scalp stamps slam, a contact's card fills.
import { useEffect, useState, type CSSProperties } from 'react';
import { useT, num } from '../lib/i18n';
import { useSave, type Save } from '../lib/save';
import { spend } from '../lib/meta';
import { sfx, buzz } from '../lib/sfx';
import {
  markRead, rivalOf, netOf, rivalState, RIVALS, SCALP_NET, TROPHY_NET, BOOK_SRC, bookOf, bookProgress, coffeeToday, buyCoffee,
  COFFEE_COST, XP_COFFEE, BOOK_LV, toRoute, type FeedItem,
} from '../lib/byline';
import { Icon, GBtn, TopBar, SrcIcon, CountUp } from '../ui/game';
import { FeedRow, RivalMark, Handle, tn } from '../ui/connect';
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
    {!feed.length ? <div className="cn-empty">
      <Icon n="news" size={40} />
      <p>{t('cn.feed.empty')}</p>
      <GBtn onClick={() => chrome.go({ n: 'daily' })}><Icon n="phone" />{t('cn.feed.play')}</GBtn>
    </div> : groups.map(([g, items]) => <section key={g} className="cn-day">
      <h2 className="cn-day__h">{t('cn.feed.' + g)}{g === 'today' && fresh.size > 0 && <span className="cn-day__new">{t('cn.feed.unread', { n: fresh.size })}</span>}</h2>
      <div className="cn-sheet">{items.map((f) => { const isNew = fresh.has(f.id); const style = isNew ? { ['--k' as string]: k++ } as CSSProperties : undefined;
        return <FeedRow key={f.id} f={isNew ? { ...f, read: false } : f} onOpen={() => chrome.go(toRoute(f.to))} style={style} />; })}</div>
    </section>)}
  </div>;
}

// ---------------------------------------------------------------- Rivals
// GOTY.md §7 slot: friendRivals(save) from lib/social.ts (social lane) lists the friends you duel with, under the three
// house rivals. A no-op until that lane lands: the list is empty, so nothing renders.
const friendRivals = (_s: Save): { id: string; nick: string }[] => [];
export function RivalsScreen(chrome: Chrome) {
  const t = useT(); const s = useSave();
  const friends = friendRivals(s);
  return <div className="g-screen g-screen--wide cn-screen cn-rivals">
    <TopBar back={{ label: t('g.tabs.me'), onClick: () => chrome.go({ n: 'me' }) }} title={t('cn.rivals.title')} />
    <header className="cn-head"><h1>{t('cn.rivals.hed')}</h1><p>{t('cn.rivals.sub')}</p></header>
    <RivalsTotal />
    <div className="cn-rgrid">{RIVALS.map((id, i) => <RivalCard key={id} id={id} i={i} />)}</div>
    {friends.length > 0 && <div className="cn-rgrid cn-rgrid--friends">{/* social lane: one card per friend rival */}</div>}
    {!RIVALS.some((id) => { const r = rivalOf(s, id); return r.w + r.l + r.d; }) && <div className="cn-empty cn-empty--inline">
      <p>{t('cn.rivals.none')}</p>
      <GBtn size="sm" onClick={() => chrome.go({ n: 'daily' })}><Icon n="phone" />{t('cn.feed.play')}</GBtn>
    </div>}
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
  const taunt = r.taunt ? t('cn.taunt.' + id + '.' + r.taunt, { rec: '\u2066' + r.w + '–' + r.l + (r.d ? '–' + r.d : '') + '\u2069', p: r.tp ? '\u2068' + r.tp + '\u2069' : '' }) : '';
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
export function ContactsScreen(chrome: Chrome) {
  const t = useT();
  return <div className="g-screen g-screen--wide cn-screen cn-contacts">
    <TopBar back={{ label: t('g.tabs.me'), onClick: () => chrome.go({ n: 'me' }) }} title={t('cn.contacts.title')} />
    <header className="cn-head"><h1>{t('cn.contacts.hed')}</h1><p>{t('cn.contacts.sub')}</p></header>
    <div className="cn-cgrid">{BOOK_SRC.map((src) => <ContactCard key={src} src={src} />)}</div>
    <p className="cn-fair">{t('cn.contacts.fair')}</p>
  </div>;
}
function ContactCard({ src }: { src: string }) {
  const t = useT(); const s = useSave();
  const e = bookOf(s, src), p = bookProgress(e);
  const [bump, setBump] = useState(0);
  const had = coffeeToday(s, src), broke = s.credits < COFFEE_COST;
  const coffee = () => { if (buyCoffee(src, spend)) { sfx('coin'); buzz(20); setBump((x) => x + 1); } };
  const perks: [number, string, boolean][] = [[2, 'l2', false], [3, 'l3', false], [3, 'p3', true], [4, 'l4', false], [5, 'l5', false], [5, 'p5', true]];
  const next = perks.find(([lv]) => lv > p.lv);
  return <article className={'cn-contact' + (p.lv >= 2 ? ' has-frame' : '') + (p.lv >= 5 ? ' is-gold' : '')} style={{ ['--sc' as string]: SRC_C[src] }}>
    <header className="cn-contact__h">
      <SrcIcon k={src} size={48} />
      <div className="cn-contact__id">
        <h2>{t('g.story.who.' + src)}<span className="cn-contact__role"> · {t('src.' + src)}</span></h2>
        {p.lv >= 4 ? <p className="cn-contact__nick">{t('cn.contacts.calls', { n: t('cn.nick.' + src) })}</p> : <p>{t('src.' + src + 'P')}</p>}
      </div>
      <span className="cn-lv" aria-label={t('cn.contacts.lv', { n: p.lv })}>
        <b className="g-num" key={p.lv}>{p.lv}</b>
        <span className="cn-lv__pips" aria-hidden="true">{BOOK_LV.map((_, k) => <i key={k} className={k < p.lv ? 'on' : ''} />)}</span>
      </span>
    </header>
    <div className="cn-xp">
      <span className="g-bar" style={{ ['--bar' as string]: p.lv >= 5 ? 'linear-gradient(90deg,#FFD35C,#F7B928)' : 'var(--sc)' }}><i key={bump} style={{ width: p.pct + '%' }} /></span>
      <small>{p.max ? t('cn.contacts.max') : t('cn.contacts.xp', { a: p.into, b: p.need, n: p.lv + 1 })}</small>
      {bump > 0 && <span className="cn-xp__pop" key={bump} aria-hidden="true">+{XP_COFFEE}</span>}
    </div>
    <div className="cn-perks">
      {perks.filter(([lv]) => lv <= p.lv).map(([, k, play]) => <span key={k} className="cn-perk"><Icon n="check" size={13} />{t('cn.perk.' + k)}{play && <em>{t('cn.contacts.storyOnly')}</em>}</span>)}
      {next && <p className="cn-perks__next"><Icon n="lock" size={13} />{t('cn.contacts.next', { n: next[0], p: t('cn.perk.' + next[1]) })}</p>}
    </div>
    <footer className="cn-contact__f">
      <small>{t('cn.contacts.asked', { a: num(e.asks || 0), b: num(e.hits || 0) })}</small>
      <GBtn size="sm" kind={had ? 'ghost' : 'paper'} disabled={had || broke} onClick={coffee} sound={null} label={had ? t('cn.contacts.coffeeDone') : broke ? t('cn.contacts.coffeeBroke') : t('cn.contacts.coffee')}>
        <CoffeeCup />{had ? t('cn.contacts.coffeeDone') : t('cn.contacts.coffee')}{!had && <span className="cn-price"><span className="g-coin" />{COFFEE_COST}</span>}
      </GBtn>
      {!had && broke && <small className="cn-contact__why">{t('cn.contacts.coffeeBroke')}</small>}
    </footer>
  </article>;
}
const SRC_C: Record<string, string> = { kitman: '#1C8A50', barber: '#C26B00', agent: '#B8830B', spotter: '#1F8FB0', physio: '#D93A5E' };
const CoffeeCup = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6zM17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3" /></svg>;
