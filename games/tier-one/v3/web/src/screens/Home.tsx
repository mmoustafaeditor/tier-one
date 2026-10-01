// Home (3.6, owner decisions on the 3.x desk): four modes are the main thing — Daily Challenge, Career, Multiplayer
// (Rooms) and Transfer Market — with a compact row below for Press Card, Leaderboards, Missions, Shop and Settings.
// One screen, no page scroll. The byline strip, the film stage and the desk lamp stay from the 3.x desk.
import { useEffect, type CSSProperties } from 'react';
import { useT, num } from '../lib/i18n';
import { update, useSave } from '../lib/save';
import type { Save } from '../lib/save';
import { useWire } from '../lib/wireData';
import { ymdUTC } from '../lib/meta';
import { ensureMissions, missionsView } from '../lib/progress';
import { sfx } from '../lib/sfx';
import { Icon, TopBar } from '../ui/game';
import { useNow } from '../ui/bits';
import { chapterOf } from '../lib/storyMode';
import type { Chrome, Go } from '../App';
import { bylineOf, dailyFeed, repTier } from '../lib/byline';
import { HomeFilm } from '../ui/film';
import { lampStyle } from '../lib/wallet';
import { Tip } from '../ui/fit';

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
  const ms = missionsView(s) || [];
  const ready = ms.filter((m) => m.done && !m.claimed).length;
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
  const row: { id: string; icon: string; label: string; badge?: number; go: () => void }[] = [
    { id: 'card', icon: 'me', label: t('hub.row.card'), go: () => chrome.go({ n: 'me' }) },
    { id: 'boards', icon: 'trophy', label: t('hub.row.boards'), go: () => chrome.go({ n: 'boards' }) },
    { id: 'missions', icon: 'target', label: t('hub.row.missions'), badge: ready || undefined, go: () => chrome.go({ n: 'missions' }) },
    { id: 'shop', icon: 'pen', label: t('hub.row.shop'), go: () => chrome.go({ n: 'customize' }) },
    { id: 'settings', icon: 'gear', label: t('hub.row.settings'), go: chrome.openSettings },
  ];

  const lamp = lampStyle(s); // the desk lamp (Your desk): a pool of light over Home's film stage
  return <div className="g-screen home desk hm fit" data-lamp={lamp.on ? lamp.warmth : undefined} style={lamp.on ? (lamp.vars as CSSProperties) : undefined}>
    <HomeFilm tone={lamp.on ? 'night' : undefined} />
    <TopBar onMenu={chrome.openSettings} />
    <div className="fit__body">
      <DeskByline s={s} go={chrome.go} />
      <Tip id="home" />
      <section className="hm-modes" aria-label={t('g.home.modes')}>
        {modes.map((m, k) => <button key={m.id} className={'hm-mode hm-mode--' + m.id + (m.hot ? ' is-hot' : '')} style={{ ['--i' as string]: k }} onClick={() => { sfx('open'); m.go(); }}>
          <span className="hm-mode__ic" aria-hidden="true"><Icon n={m.icon} size={30} /></span>
          <b className="hm-mode__t">{m.title}</b>
          <span className="hm-mode__s" dir="auto">{m.sub}</span>
          <span className="hm-mode__go" aria-hidden="true"><Icon n={t.rtl ? 'back' : 'arrow'} size={18} /></span>
        </button>)}
      </section>
      <nav className="hm-row" aria-label={t('hub.row.card')}>
        {row.map((x) => <button key={x.id} className={'hm-row__b hm-row__b--' + x.id} onClick={() => { sfx('ui.tap'); x.go(); }}>
          <span className="hm-row__ic" aria-hidden="true"><Icon n={x.icon} size={20} />{x.badge ? <b className="g-badge hm-row__badge">{x.badge}</b> : null}</span>
          <span className="hm-row__l">{x.label}</span>
        </button>)}
      </nav>
    </div>
  </div>;
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
