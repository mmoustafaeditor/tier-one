// Home (3.7, owner decisions on the 3.x desk): a mini My Press Card (one stat per mode, each opening its mode) and the
// Missions box on top, then the four modes (Daily Challenge, Career Mode, Multiplayer, Transfer Market) and the Shop.
// Leaderboards live inside each mode. One screen, no page scroll. The film stage and the desk lamp stay from the 3.x desk.
import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { useT, num } from '../lib/i18n';
import { update, useSave } from '../lib/save';
import type { Save } from '../lib/save';
import { useWire } from '../lib/wireData';
import { ymdUTC } from '../lib/meta';
import { ensureMissions, topMissions, levelOf, missionsReady } from '../lib/progress';
import { sfx } from '../lib/sfx';
import { Icon, TopBar } from '../ui/game';
import { useNow } from '../ui/bits';
import { chapterOf } from '../lib/storyMode';
import type { Chrome, Go } from '../App';
import { bylineOf, dailyFeed } from '../lib/byline';
import { HomeFilm } from '../ui/film';
import { lampStyle } from '../lib/wallet';
import { Tip } from '../ui/fit';
import type { WireState } from '../lib/wireData';

export const hms = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return [s / 3600, (s % 3600) / 60, s % 60].map((x) => String(Math.floor(x)).padStart(2, '0')).join(':'); };
const fmtK = (n: number) => (n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n));
/** The day of today's Daily still in progress (0 when none). */
export const dailyLiveDay = (s: Save) => { const today = ymdUTC(); return !s.daily[today] && s.last && new Date(s.last.at).toISOString().slice(0, 10) === today && !s.last.pub.over ? Number(s.last.pub.day) || 0 : 0; };

export function Home(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const w = useWire();
  const now = useNow(1000);
  useEffect(() => { update((x) => { ensureMissions(x); }); dailyFeed(); }, []);
  const today = ymdUTC();
  const played = s.daily[today];
  const liveD = dailyLiveDay(s);
  const ch = chapterOf(s);
  const openCalls = (w.mine?.calls || []).filter((c) => !c.done).length;
  const closes = Date.parse(today + 'T00:00:00Z') + 864e5 - now;

  const modes: { id: string; icon: string; title: string; sub: string; hot?: boolean; go: () => void }[] = [
    { id: 'daily', icon: 'news', title: t('hub.mode.daily'), hot: !played,
      sub: played ? t('hub.sub.dailyFiled', { p: num(played.total) }) : liveD ? t('hub.sub.dailyResume', { d: liveD }) : t('hub.sub.dailyPlay', { t: hms(closes) }),
      go: () => chrome.go({ n: 'today' }) },
    { id: 'story', icon: 'story', title: t('hub.mode.career'), hot: !!s.career?.live,
      sub: s.career?.live ? t('hub.sub.careerLive') : ch && s.career ? t('hub.sub.careerAt', { c: ch.n, n: s.career.windows + 1 }) : t('hub.sub.careerNew'),
      go: () => chrome.go({ n: 'story' }) },
    { id: 'rooms', icon: 'friends', title: t('hub.mode.multi'),
      sub: s.rooms.length > 1 ? t('hub.sub.multiN', { n: s.rooms.length }) : s.rooms.length ? t('hub.sub.multi1') : t('hub.sub.multiNone'),
      go: () => chrome.go({ n: 'rooms' }) },
    { id: 'wire', icon: 'wire', title: t('hub.mode.market'),
      sub: openCalls ? t('hub.sub.marketCalls', { n: openCalls }) : t('hub.sub.marketNone'),
      go: () => chrome.go({ n: 'wire' }) },
  ];
  const lamp = lampStyle(s); // the desk lamp (Your desk): a pool of light over Home's film stage
  return <div className="g-screen home desk hm fit" data-lamp={lamp.on ? lamp.warmth : undefined} style={lamp.on ? (lamp.vars as CSSProperties) : undefined}>
    <HomeFilm tone={lamp.on ? 'night' : undefined} />
    <TopBar onMenu={chrome.openSettings} />
    <div className="fit__body">
      <Tip id="home" />
      <div className="hm-top">
        <MiniCard s={s} w={w} go={chrome.go} />
        <MissionsBox s={s} go={chrome.go} />
      </div>
      <section className="hm-modes" aria-label={t('g.home.modes')}>
        {modes.map((m, k) => <button key={m.id} className={'hm-mode hm-mode--' + m.id + (m.hot ? ' is-hot' : '')} style={{ ['--i' as string]: k }} onClick={() => { sfx('open'); m.go(); }}>
          <span className="hm-mode__ic" aria-hidden="true"><Icon n={m.icon} size={26} /></span>
          <b className="hm-mode__t">{m.title}</b>
          <span className="hm-mode__s" dir="auto">{m.sub}</span>
          <span className="hm-mode__go" aria-hidden="true"><Icon n={t.rtl ? 'back' : 'arrow'} size={18} /></span>
        </button>)}
      </section>
      <button className="hm-shop" onClick={() => { sfx('open'); chrome.go({ n: 'customize' }); }}>
        <span className="hm-shop__ic" aria-hidden="true"><Icon n="gift" size={22} /></span>
        <span className="hm-shop__b"><b>{t('hub.row.shop')}</b><small dir="auto">{t('hub.shopSub')}</small></span>
        <span className="hm-shop__go" aria-hidden="true"><Icon n={t.rtl ? 'back' : 'arrow'} size={18} /></span>
      </button>
    </div>
  </div>;
}

// ---------------------------------------------------------------- the mini My Press Card: one stat per mode
function MiniCard({ s, w, go }: { s: Save; w: WireState; go: Go }) {
  const t = useT();
  const b = bylineOf(s);
  const lv = levelOf(s.pp, s);
  const initials = (s.nick || 'You').split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  const name = s.nick || t('g.home.noName');
  const days = Object.values(s.daily);
  const best = days.reduce<null | (typeof days)[number]>((m, d) => (!m || d.total > m.total ? d : m), null);
  const calls = w.mine?.calls || [];
  const right = calls.filter((c) => c.right === true).length;
  const resolved = w.mine?.resolved || calls.filter((c) => c.done).length;
  const wins = s.stats.roomWins || 0;
  const stats: { id: string; mode: string; val: ReactNode; cap: string; sub: string; go: () => void }[] = [
    { id: 'daily', mode: t('hub.mode.daily'), val: <><Icon n="flame" size={15} />{s.streak.n}</>, cap: t('hub.mini.streak'),
      sub: best ? t('hub.mini.dailyBest', { tier: t('tier.' + best.tier), p: num(best.total) }) : t('hub.mini.dailyNone'), go: () => go({ n: 'today' }) },
    { id: 'story', mode: t('hub.mode.career'), val: fmtK(b.followers), cap: t('hub.mini.followers'),
      sub: s.career ? t('career.ranks.' + s.career.rank) : t('hub.mini.careerNone'), go: () => go({ n: 'story' }) },
    { id: 'wire', mode: t('hub.mode.market'), val: right + '/' + resolved, cap: t('hub.mini.right'),
      sub: resolved ? t('hub.mini.hit', { n: Math.round((w.mine?.hitRate ?? right / resolved) * 100) }) : t('hub.mini.marketNone'), go: () => go({ n: 'wire' }) },
    { id: 'rooms', mode: t('hub.mode.multi'), val: String(s.rooms.length), cap: t('hub.mini.rooms'),
      sub: t('hub.mini.wins', { n: wins }), go: () => go({ n: 'rooms' }) },
  ];
  return <section className="hm-card" aria-label={t('hub.row.card')}>
    <button className="hm-card__head" onClick={() => { sfx('ui.tap'); go({ n: 'me' }); }} aria-label={t('hub.mini.open', { n: name, l: lv.n })}>
      <span className="hm-card__badge" aria-hidden="true">{initials}</span>
      <span className="hm-card__who"><small>{t('hub.row.card')}</small><b dir="auto">{name}</b></span>
      <span className="hm-card__lv g-num">{t('g.lv', { n: lv.n })}</span>
    </button>
    <div className="hm-card__grid">
      {stats.map((x) => <button key={x.id} className={'hm-st hm-st--' + x.id} onClick={() => { sfx('ui.tap'); x.go(); }}>
        <small className="hm-st__m">{x.mode}</small>
        <b className="hm-st__v g-num">{x.val}</b>
        <small className="hm-st__c">{x.cap}</small>
        <small className="hm-st__s" dir="auto">{x.sub}</small>
      </button>)}
    </div>
  </section>;
}

// ---------------------------------------------------------------- the Missions box: the top three, a badge when one pays
function MissionsBox({ s, go }: { s: Save; go: Go }) {
  const t = useT();
  const top = topMissions(s, 3);
  const ready = missionsReady(s);
  return <button className="hm-ms" onClick={() => { sfx('ui.tap'); go({ n: 'missions' }); }} aria-label={t('hub.missions.title') + (ready ? ' · ' + t('hub.missions.ready', { n: ready }) : '')}>
    <span className="hm-ms__h"><b>{t('hub.missions.title')}</b>{ready > 0 && <span className="g-badge hm-ms__badge">{ready}</span>}<Icon n={t.rtl ? 'back' : 'arrow'} size={16} /></span>
    {top.length ? top.map((m) => <span key={m.id} className={'hm-ms__r' + (m.done && !m.claimed ? ' is-ready' : '') + (m.claimed ? ' is-claimed' : '')}>
      <span className="hm-ms__t" dir="auto">{t(m.label, { n: m.n })}</span>
      <span className="hm-ms__l">
        <span className="g-bar g-bar--sm" style={{ ['--bar' as string]: m.done ? 'var(--c-done)' : 'var(--gold)' }}><i style={{ width: (100 * m.have) / m.n + '%' }} /></span>
        <span className="hm-ms__p g-num">{m.claimed ? <Icon n="check" size={13} /> : <><span className="g-coin" aria-hidden="true" />+{m.coins}</>}</span>
      </span>
    </span>) : <span className="hm-ms__t">{t('hub.missions.none')}</span>}
  </button>;
}
