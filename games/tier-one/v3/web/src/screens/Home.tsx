// Home (GOTY.md §1.5 and §4, HYBRID.md §4): the newsroom desk. One assignment, chosen by priority, fills the first
// screen; two things sit beside it; one strip; everything else is a link (Me, Feed, Pass). At 1024px+ it is a real desk:
// the assignment on the left, the cards in the middle, the feed and rivals down the side.
//
// INTEGRATION SLOTS (other lanes): see LiveNextUp / LiveDDBanner below. Drop the real components in and the layout keeps.
import { useEffect, useState, type ComponentType, type CSSProperties } from 'react';
import { useT, num, resetAt } from '../lib/i18n';
import { update, useSave, getSave } from '../lib/save';
import type { Save } from '../lib/save';
import { v3 } from '../lib/api';
import type { CastSaga } from '../lib/engine';
import type { League } from '../lib/leagueData';
import { useWire, stageOf } from '../lib/wireData';
import { useLeague, myRow } from '../lib/leagueData';
import { ymdUTC } from '../lib/meta';
import { levelOf, ensureMissions, missionsView, claimMission } from '../lib/progress';
import { sfx } from '../lib/sfx';
import { Icon, Kit, GBtn, TopBar, confetti } from '../ui/game';
import { useNow, Sheet } from '../ui/bits';
import { dailyNoToday } from './Front';
import { chapterOf } from '../lib/storyMode';
import type { Chrome, Go, Route } from '../App';
import { weekEventView } from '../lib/season';
import { bylineOf, dailyFeed, nextUp, unreadOf, markRead, toRoute, repTier, BOOK_SRC, bookOf, type NextUp } from '../lib/byline';
import { FeedRow, RivalStrip, feedText, kindIcon, kindColor, ago } from '../ui/connect';
import { DDLiveBanner } from '../ui/live';
import { HomeFilm } from '../ui/film';
import { lampStyle } from '../lib/wallet';

// ---------------------------------------------------------------- integration slots
/** SLOT (live lane, ui/live.tsx): `<NextUp/>`. When it lands, import it and assign it here; Home renders it as the hero
 *  in place of the built-in <Assignment/> (which stays as the fallback). Props: { go }. */
const LiveNextUp: ComponentType<{ go: Go }> | null = null;
/** SLOT (live lane, ui/live.tsx): `<DDLiveBanner/>`. When it lands, assign it here; it takes the desk's one strip
 *  whenever it renders something (For you / the wire ticker step aside). Props: { go }. */
const LiveDDBanner: ComponentType<{ go: Go }> | null = DDLiveBanner;

const hms = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return [s / 3600, (s % 3600) / 60, s % 60].map((x) => String(Math.floor(x)).padStart(2, '0')).join(':'); };
const TIER_STAMP: Record<string, string> = { T1: 'gold', T2: 'done', T3: 'done', T4: 'off', SPIKED: '' };
const fmtK = (n: number) => (n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n));
function useMedia(q: string) {
  const [m, setM] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => { const mq = matchMedia(q); const f = () => setM(mq.matches); f(); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, [q]);
  return m;
}

export function Home(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const w = useWire();
  const lg = useLeague();
  const wide = useMedia('(min-width: 1024px)');
  const [missionsOpen, setMissionsOpen] = useState(false);
  useEffect(() => { update((x) => { ensureMissions(x); }); dailyFeed(); }, []);
  const today = ymdUTC();
  const played = s.daily[today];
  const ev = weekEventView(s);
  const nx = nextUp(s, t(ev.ev.nameKey));
  const ms = missionsView(s) || [];
  const ready = ms.filter((m) => m.done && !m.claimed).length;
  const unread = unreadOf(s);
  const ch = chapterOf(s);
  const me = myRow(lg);
  const openCalls = (w.mine?.calls || []).filter((c) => !c.done).length;
  const rs = (w.rumours || []).slice(0, 8);

  // The two (four on a desk) secondary slots, by priority. Anything actionable jumps the queue; the hero's own mode is skipped.
  type Card = { id: string; c: string; icon: string; k: string; title: string; sub: string; hot?: boolean; badge?: number; progress?: number; stamp?: string; go: () => void };
  const cards: Card[] = [];
  if (played && nx.kind !== 'daily') cards.push({ id: 'daily', c: 'daily', icon: 'news', k: t('hr.home.filedK'), title: t('cn.mode.daily'), sub: t('hr.home.pts', { n: num(played.total) }) + (played.rank ? ' · ' + t('hr.home.seeTable', { r: '#' + played.rank, n: played.players || 1 }) : ''), stamp: played.tier, go: () => chrome.go({ n: 'daily' }) });
  if (ms.length) cards.push({ id: 'missions', c: 'pass', icon: 'target', k: t('g.coins', { n: ms.filter((m) => !m.claimed).reduce((a, m) => a + m.coins, 0) }), title: t('hr.home.missions'), sub: ready ? t('hr.home.claimN', { n: ready }) : t('hr.home.missionsSub', { a: ms.filter((m) => m.done).length, b: ms.length }), hot: ready > 0 && nx.kind !== 'mission', badge: ready || undefined, progress: ms.reduce((a, m) => a + m.have / m.n, 0) / ms.length, go: () => setMissionsOpen(true) });
  if (nx.kind !== 'career' && !(nx.kind === 'resume' && s.career?.live)) cards.push({ id: 'story', c: 'story', icon: 'story', k: t('g.home.storyK'), title: t('g.tabs.story'), sub: ch ? (s.career?.live ? t('g.home.resume', { d: s.career.live.log.filter((a) => a[0] === 'e').length + 1 }) : t('g.home.storySub', { c: ch.n, name: t('g.story.ch.' + ch.id + '.name') })) : t('hr.home.storyStart'), hot: !!s.career?.live, progress: ch ? ch.progress : undefined, go: () => chrome.go({ n: 'story' }) });
  if (nx.kind !== 'wire') cards.push({ id: 'wire', c: 'wire', icon: 'wire', k: t('g.home.wireK'), title: t('nav.wire'), sub: openCalls ? t('hr.home.wireOpen', { n: openCalls }) : rs[0] ? rs[0].playerName + ' ' + t('g.home.tick.' + stageOf(rs[0]), { c: rs[0].linked[0]?.name || '' }) : t('hr.home.wireQuiet'), badge: openCalls || undefined, go: () => chrome.go({ n: 'wire' }) });
  if (nx.kind !== 'room') cards.push({ id: 'rooms', c: 'rooms', icon: 'friends', k: t('g.home.roomsK'), title: t('g.tabs.friends'), sub: me >= 0 && lg && lg.rows[me].pts > 0 ? t('g.home.leaguePos', { r: me + 1 }) : t('g.home.roomsSub'), go: () => chrome.go({ n: 'rooms' }) });
  if (nx.kind !== 'practice' && !(nx.kind === 'resume' && s.practice.live)) cards.push({ id: 'practice', c: 'practice', icon: 'target', k: t('g.home.practiceK'), title: t('nav.practice'), sub: s.practice.live ? t('g.home.resume', { d: s.practice.live.log.filter((a) => a[0] === 'e').length + 1 }) : t('hr.home.event', { e: t(ev.ev.nameKey) }), hot: !!s.practice.live, go: () => chrome.go(s.practice.live ? { n: 'play', mode: 'practice', key: Date.now() } : { n: 'practice' }) });
  const shown = [...cards.filter((c) => c.hot), ...cards.filter((c) => !c.hot)].slice(0, wide ? 4 : 2);

  // The one strip: a live Deadline Day banner (slot) > the newest unread feed item > the wire ticker.
  const top = unread[0];
  const strip = LiveDDBanner ? <LiveDDBanner go={chrome.go} />
    : top ? <button className="desk-strip" style={{ ['--kc' as string]: kindColor(top.kind) }} onClick={() => { sfx('ui.tap'); markRead([top.id]); chrome.go(toRoute(top.to)); }}>
      <span className="desk-strip__ic" aria-hidden="true"><Icon n={kindIcon(top.kind)} size={16} /></span>
      <span className="desk-strip__k">{t('cn.home.forYou')}{unread.length > 1 && <b className="g-badge">{unread.length}</b>}</span>
      <span className="desk-strip__txt" dir="auto">{feedText(t, top)}</span>
      <time className="desk-strip__at" dateTime={new Date(top.at).toISOString()}>{ago(top.at, t.lang)}</time>
    </button>
    : rs.length > 0 ? <button className="g-ticker" onClick={() => chrome.go({ n: 'wire' })}>
      <span className="g-ticker__l"><i />{t('nav.wire')}</span>
      <span className="g-ticker__vp"><span className="g-ticker__track">{[0, 1].map((dup) => <span key={dup} aria-hidden={dup === 1 ? 'true' : undefined}>{rs.map((r) => <span key={r.id}><b>{r.playerName}</b> {t('g.home.tick.' + stageOf(r), { c: r.linked[0]?.name || '' })} <em>▲{r.heat}</em></span>)}</span>)}</span></span>
    </button> : null;

  const lamp = lampStyle(s); // the desk lamp (Your desk): a pool of light over Home's film stage
  return <div className="g-screen home desk" data-lamp={lamp.on ? lamp.warmth : undefined} style={lamp.on ? (lamp.vars as CSSProperties) : undefined}>
    <HomeFilm tone={lamp.on ? 'night' : undefined} />
    <TopBar onMenu={chrome.openSettings} />
    <div className="desk__grid">
      <DeskByline s={s} go={chrome.go} />

      {/* ---------- the assignment: the one thing to do next (GOTY §1.5) */}
      <div className="desk__hero">
        {LiveNextUp ? <LiveNextUp go={chrome.go} /> : <Assignment nx={nx} go={chrome.go} s={s} onClaim={() => claimAll(ms.filter((m) => m.done && !m.claimed).map((m) => m.id))} />}
      </div>

      {/* ---------- two things beside it */}
      <section className="desk__cards" aria-label={t('hr.home.also')}>
        {shown.map((c, k) => <DeskCard key={c.id} {...c} i={k} />)}
      </section>

      {/* ---------- one strip */}
      {strip && <div className="desk__strip">{strip}</div>}

      {/* ---------- the rest is a link away */}
      <nav className="desk__links" aria-label={t('hr.home.links')}>
        <button onClick={() => chrome.go({ n: 'feed' })}><Icon n="news" size={16} />{t('cn.me.feed')}{unread.length > 0 && <b className="g-badge">{unread.length}</b>}</button>
        <button onClick={() => chrome.go({ n: 'pass' })}><Icon n="crown" size={16} />{t('g.home.passT')}</button>
        <button onClick={() => chrome.go({ n: 'rivals' })}><Icon n="reply" size={16} />{t('hr.home.rivals')}</button>
        <button onClick={() => chrome.go({ n: 'contacts' })}><Icon n="phone" size={16} />{t('hr.home.contacts')}</button>
        <button onClick={() => chrome.go({ n: 'editor' })}><Icon n="pen" size={16} />{t('live.desk.title')}</button>
        <button onClick={() => chrome.go({ n: 'howto' })}><Icon n="help" size={16} />{t('nav.howto')}</button>
      </nav>

      {/* ---------- desk only (1024px+): the feed and the rivals down the side */}
      {wide && <aside className="desk__side">
        <section aria-label={t('cn.home.forYou')}>
          <div className="desk__sidehead"><h2>{t('cn.home.forYou')}</h2><button className="cn-link" onClick={() => chrome.go({ n: 'feed' })}>{t('cn.home.all')}</button></div>
          {unread.length ? <div className="cn-sheet">{unread.slice(0, 4).map((f) => <FeedRow key={f.id} f={f} onOpen={() => chrome.go(toRoute(f.to))} />)}</div>
            : <p className="desk__quiet">{t('cn.feed.empty')}</p>}
        </section>
        <RivalStrip go={chrome.go} />
        <ContactsMini s={s} go={chrome.go} />
      </aside>}
    </div>

    <Sheet open={missionsOpen} onClose={() => setMissionsOpen(false)} label={t('g.home.missions')}>
      <div className="sheet__body">
        <div className="g-sec" style={{ margin: '0 0 8px' }}><h2 style={{ color: 'var(--card-ink)' }}>{t('g.home.missions')}</h2><span className="g-mono" style={{ color: 'var(--card-ink-3)' }}>{t('g.home.missionsReset', { t: resetAt() })}</span></div>
        <Missions ms={ms} />
      </div>
    </Sheet>
  </div>;
}

function claimAll(ids: string[]) {
  let paid = 0;
  for (const id of ids) paid += claimMission(id) || 0;
  if (paid) { sfx('coin'); confetti(['#F7B928', '#FFD35C', '#fff'], 60); }
}

// ---------------------------------------------------------------- the byline strip: how is my name doing, in one line
function DeskByline({ s, go }: { s: Save; go: Go }) {
  const t = useT();
  const b = bylineOf(s);
  const tier = repTier(b.rep);
  const initials = (s.nick || 'You').split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  const name = s.nick || t('g.home.noName');
  return <button className="desk-by" onClick={() => { sfx('ui.tap'); go({ n: 'me' }); }} aria-label={t('hr.home.bylineAria', { n: name, tier: t('cn.tier.' + tier), f: b.followers, s: s.streak.n })}>
    <span className="desk-by__badge" aria-hidden="true">{initials}</span>
    <span className="desk-by__who"><b dir="auto">{name}</b><span className={'desk-by__tier cn-tier--' + tier}>{t('cn.tier.' + tier)}</span></span>
    <span className="desk-by__stat"><b className="g-num">{fmtK(b.followers)}</b><small>{t('cn.me.followers')}</small></span>
    <span className={'desk-by__stat desk-by__streak' + (s.streak.n > 0 ? ' is-lit' : '')}><Icon n="flame" size={18} /><b className="g-num">{s.streak.n}</b><small>{t('g.home.streak')}</small></span>
  </button>;
}

// ---------------------------------------------------------------- the assignment hero
function Assignment({ nx, go, s, onClaim }: { nx: NextUp; go: Go; s: Save; onClaim: () => void }) {
  const t = useT();
  const now = useNow(1000);
  const today = ymdUTC(), no = dailyNoToday();
  const cast = useTodayCast(today);
  const live = nx.kind === 'daily' && nx.v?.d ? Number(nx.v.d) : 0;
  const closes = Date.parse(today + 'T00:00:00Z') + 864e5 - now;
  const d0 = new Date(today + 'T00:00:00Z'); const dow = (d0.getUTCDay() + 6) % 7;
  const week = Array.from({ length: 7 }, (_, k) => { const d = new Date(d0.getTime() + (k - dow) * 864e5).toISOString().slice(0, 10); return { d, on: !!s.daily[d], now: d === today }; });

  if (nx.kind === 'daily') return <section className="five g-card m-hero" aria-label={t('hr.home.assignment')}>
    <span className="desk-tape" aria-hidden="true">{t('hr.home.assignment')}</span>
    <div className="five__band"><span className="g-mono">{t('g.home.dailyNo', { n: no })}</span><span className="five__clock g-num" role="timer" aria-label={t('daily.closes', { t: resetAt() })}>{hms(closes)}</span></div>
    <div className="five__body">
      <h2 className="g-h1">{t('g.home.todaysFive')}</h2>
      <p className="g-sub five__tag">{t('g.home.tag')}</p>
      <div className="five__kits" aria-hidden="true">
        {Array.from({ length: 5 }, (_, k) => <span key={k} className="five__kit" style={{ ['--r' as string]: [-5, 3, -2, 4, -3][k] + 'deg', ['--dx' as string]: (k - 2) * 30 + 'px', animationDelay: 120 + k * 70 + 'ms' }}>
          {cast?.[k] ? <Kit club={cast[k].from} player={cast[k].player} size={56} /> : <Kit mystery size={56} />}
          {cast?.[k] && <span className="five__name">{cast[k].player.s || cast[k].player.n}</span>}
        </span>)}
      </div>
      <div className="week" aria-label={t('g.home.weekAria')}>
        {week.map((x, k) => <span key={x.d} className={(x.on ? 'on ' : '') + (x.now ? 'now' : '')}><i>{x.on ? <Icon n="check" /> : null}</i><b>{t('g.home.dow.' + k)}</b></span>)}
      </div>
      <GBtn size="lg" pulse={!live} shine sound="open" onClick={() => go({ n: 'daily' })} style={{ marginTop: 14 }}>
        <Icon n={live ? 'uturn' : 'phone'} size={24} />{live ? t('g.home.resume', { d: live }) : t('g.home.play')}
      </GBtn>
      <p className="five__fair g-mono">{t('g.home.fair')}</p>
    </div>
  </section>;

  // The Daily is filed: the next assignment, by priority (resume · wire · career · room · mission · practice).
  const k = 'cn.next.' + nx.kind;
  const v: Record<string, string | number> = { ...(nx.v || {}) };
  if (v.m) v.m = t('cn.mode.' + v.m);
  const sub = nx.kind === 'practice' && v.e ? t(k + '.se', v) : t(k + '.s', v);
  const icon = nx.kind === 'wire' ? 'wire' : nx.kind === 'career' ? 'story' : nx.kind === 'room' ? 'friends' : nx.kind === 'mission' ? 'gift' : nx.kind === 'resume' ? 'uturn' : 'target';
  const act = () => {
    if (nx.kind === 'mission') { onClaim(); return; }
    if (nx.feedId) markRead([nx.feedId]);
    go(nx.to.n === 'play' ? { ...nx.to, key: Date.now() } as Route : nx.to);
  };
  return <section className={'assign g-card m-hero assign--' + nx.kind} aria-label={t('hr.home.assignment')}>
    <span className="desk-tape" aria-hidden="true">{t('hr.home.assignment')}</span>
    <span className="assign__art" aria-hidden="true"><Icon n={icon} /></span>
    <span className="assign__k g-mono">{nx.kind === 'mission' ? t('hr.home.missions') : t('cn.mode.' + (nx.kind === 'resume' ? String(nx.v?.m || 'practice') : nx.kind === 'career' ? 'career' : nx.kind === 'room' ? 'room' : nx.kind === 'wire' ? 'wire' : 'practice'))}</span>
    <h2 className="assign__t">{t(k + '.t')}</h2>
    <p className="assign__s">{sub}</p>
    <GBtn size="lg" kind={nx.kind === 'mission' ? 'gold' : ''} shine sound="open" onClick={act}><Icon n={icon} size={24} />{t(k + '.b')}</GBtn>
  </section>;
}

// ---------------------------------------------------------------- a secondary card
function DeskCard({ c, icon, k, title, sub, badge, progress, stamp, go, i, hot }: { c: string; icon: string; k: string; title: string; sub: string; badge?: number; progress?: number; stamp?: string; go: () => void; i: number; hot?: boolean }) {
  const t = useT();
  return <button className={'dcard dcard--' + c + (hot ? ' is-hot' : '')} style={{ ['--i' as string]: i } as CSSProperties} onClick={() => { sfx('ui.tap'); go(); }}>
    <span className="dcard__art" aria-hidden="true"><Icon n={icon} /></span>
    {badge ? <span className="g-badge dcard__badge">{badge}</span> : null}
    <span className="dcard__k g-mono">{k}</span>
    <span className="dcard__t" dir="auto">{title}{stamp && <span className={'g-stamp dcard__stamp g-stamp--' + (TIER_STAMP[stamp] || '')}>{t('tier.' + stamp)}</span>}</span>
    <span className="dcard__s" dir="auto">{sub}</span>
    {progress != null && <span className="g-bar g-bar--sm dcard__bar" style={{ ['--bar' as string]: 'var(--mc)' }}><i style={{ width: Math.round(progress * 100) + '%' }} /></span>}
  </button>;
}

// ---------------------------------------------------------------- missions (in a sheet; the card is the door)
const MI: Record<string, string> = { daily: 'phone', right3: 'check', excl: 'bolt', confRight: 'star', physio: 'pulse', spotter: 'plane', barber: 'scissors', agent: 'briefcase', practice: 'target', story: 'story', wire: 'wire', twist: 'uturn', room: 'friends' };
function Missions({ ms }: { ms: NonNullable<ReturnType<typeof missionsView>> }) {
  const t = useT();
  return <div className="missions missions--sheet">
    {ms.map((m) => <div key={m.id} className={'mission' + (m.done ? ' is-done' : '') + (m.claimed ? ' is-claimed' : '')}>
      <span className="mission__ic"><Icon n={m.claimed ? 'check' : MI[m.id] || 'target'} /></span>
      <span className="mission__t"><b>{t('g.missions.' + m.id, { n: m.n })}</b>
        <span className="g-bar g-bar--sm" style={{ ['--bar' as string]: m.done ? 'var(--c-done)' : 'var(--gold)' }}><i style={{ width: (100 * m.have) / m.n + '%' }} /></span></span>
      {m.done && !m.claimed ? <button className="claim" onClick={() => claimAll([m.id])}><span className="g-coin" />+{m.coins}</button>
        : <span className="mission__r g-mono">{m.claimed ? t('g.home.claimed') : <>{m.have + '/' + m.n}<span className="mission__c"><span className="g-coin" />+{m.coins}</span></>}</span>}
    </div>)}
  </div>;
}

// ---------------------------------------------------------------- desk side: the contacts book at a glance
function ContactsMini({ s, go }: { s: Save; go: Go }) {
  const t = useT();
  return <button className="cn-strip" onClick={() => { sfx('ui.tap'); go({ n: 'contacts' }); }}>
    <span className="cn-strip__k">{t('hr.home.contacts')}</span>
    {BOOK_SRC.map((src) => <span key={src} className="cn-strip__i"><b className="g-num" title={t('src.' + src)}>{bookOf(s, src).lv}</b></span>)}
  </button>;
}

// Today's five players (names and clubs; outcomes stay secret). Same call the Daily makes on open, cached per day.
let castCache: { day: string; cast: CastSaga[] } | null = null;
function useTodayCast(day: string) {
  const [c, setC] = useState(castCache?.day === day ? castCache.cast : null);
  useEffect(() => {
    if (castCache?.day === day) return;
    const x = getSave();
    v3<{ cast: CastSaga[] }>('daily.start', { dev: x.dev, nick: x.nick }).then((r) => { if (r.ok && r.cast) { castCache = { day, cast: r.cast }; setC(r.cast); } }).catch(() => {});
  }, [day]);
  return c;
}

// ---------------------------------------------------------------- kept for Me (screens/Me.tsx): the press pass and the mode bar
export function ModeBar({ chrome, s, lg }: { chrome: Chrome; s: Save; lg: League | null }) {
  const t = useT();
  const played = s.daily[ymdUTC()];
  const ch = chapterOf(s);
  const me = myRow(lg);
  const room = lg && me >= 0 && lg.rows[me].pts > 0 ? t('g.bar.rank', { r: me + 1 }) : t('g.bar.noRank');
  const daily = played ? t('tier.' + played.tier) + (played.rank ? ' · #' + played.rank : '') : t('g.bar.toPlay');
  const items = [
    { c: 'daily', ic: 'flame', k: t('g.bar.daily'), v: daily, x: s.streak.n ? String(s.streak.n) : '', go: () => chrome.go({ n: 'daily' }) },
    { c: 'story', ic: 'story', k: t('g.bar.career'), v: ch ? t('g.bar.ch', { c: ch.n, n: levelOf(s.pp).n }) : t('g.bar.start'), x: '', go: () => chrome.go({ n: 'story' }) },
    { c: 'rooms', ic: 'friends', k: t('g.bar.room'), v: room, x: '', go: () => chrome.go({ n: 'rooms' }) },
  ];
  return <div className="mbar">{items.map((m) => <button key={m.c} className={'mbar__i mode--' + m.c} onClick={() => { sfx('ui.tap'); m.go(); }}>
    <span className="mbar__k g-mono"><Icon n={m.ic} />{m.k}{m.x && <b className="mbar__x">{m.x}</b>}</span>
    <span className="mbar__v">{m.v}</span>
  </button>)}</div>;
}
export function PressPass({ chrome, s, lg, onTop }: { chrome: Chrome; s: Save; lg: League | null; onTop: () => void }) {
  const t = useT();
  const lv = levelOf(s.pp);
  const ch = chapterOf(s);
  const initials = (s.nick || 'You').split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  return <div className="pass g-card g-card--desk">
    <button className="pass__id" onClick={onTop}>
      <span className="pass__badge"><span className="pass__init">{initials}</span><span className="pass__lv">{lv.n}</span></span>
      <span className="pass__main">
        <span className="pass__name">{s.nick || t('g.home.noName')}</span>
        <span className="pass__rank">{ch ? t('g.story.ch.' + ch.id + '.name') : t('g.home.freelance')}</span>
        <span className="g-bar g-bar--sm" style={{ marginTop: 8, ['--bar' as string]: 'linear-gradient(90deg,#FFD35C,#F7B928)' }}><i style={{ width: lv.into + '%' }} /></span>
        <span className="pass__meta"><span>{t('g.home.xp', { a: lv.into, b: lv.need })}</span><span>{t('g.home.followers', { n: fmtK(bylineOf(s).followers) })}</span></span>
      </span>
      <span className="pass__coins" aria-label={t('g.coins', { n: s.credits })}><span className="g-coin" /><b className="g-num">{num(s.credits)}</b></span>
    </button>
    <ModeBar chrome={chrome} s={s} lg={lg} />
  </div>;
}
