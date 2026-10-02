// Home (brief §25): one viewport, the Daily dominates.
//   top     the Tier One masthead, a compact wallet pill, the bell, the menu          (ui/chrome.tsx TopBar)
//   hero    THE DAILY: number, reset clock, five hidden shirts, streak, reporters on it, one big PLAY TODAY'S DAILY
//   strip   season level and the next reward (opens the season track)
//   cards   Career Mode · Transfer Market · Multiplayer · Practice (one line of state each)
//   row     compact Missions · compact Shop
// No page scroll at 390×664 and up (styles/home.css): the hero takes what's left; everything else has a fixed height.
import { useEffect, useState, type CSSProperties } from 'react';
import { useT, num } from '../lib/i18n';
import { update, useSave } from '../lib/save';
import type { Save } from '../lib/save';
import { useWire } from '../lib/wireData';
import { ymdUTC } from '../lib/meta';
import { ensureMissions, allMissions, levelOf, MAX_LV } from '../lib/progress';
import { seasonAt, freeReward } from '../lib/season';
import { newThisWeek } from '../lib/catalog';
import { presence } from '../lib/live';
import { sfx } from '../lib/sfx';
import { Icon, useNow } from '../ui/bits';
import { GBtn, Kit, TopBar } from '../ui/game';
import { chapterOf } from '../lib/storyMode';
import type { Chrome } from '../App';
import { dailyFeed } from '../lib/byline';
import { HomeFilm } from '../ui/film';
import { lampStyle } from '../lib/wallet';
import { Tip } from '../ui/fit';
import { dailyNoToday } from './Front';

export const hms = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return [s / 3600, (s % 3600) / 60, s % 60].map((x) => String(Math.floor(x)).padStart(2, '0')).join(':'); };
/** The day of today's Daily still in progress (0 when none). */
export const dailyLiveDay = (s: Save) => { const today = ymdUTC(); return !s.daily[today] && s.last && new Date(s.last.at).toISOString().slice(0, 10) === today && !s.last.pub.over ? Number(s.last.pub.day) || 0 : 0; };

const TIER_STAMP: Record<string, string> = { T1: 'gold', T2: 'done', T3: 'done', T4: 'off', SPIKED: '' };
// Reporters on today's board: one call on open, refreshed every two minutes while Home is up. Cached across mounts.
let hereCache: { day: string; n: number; at: number } | null = null;
function useReporters(day: string) {
  const [n, setN] = useState(hereCache?.day === day ? hereCache.n : 0);
  useEffect(() => {
    let on = true;
    const tick = () => { if (hereCache?.day === day && Date.now() - hereCache.at < 120e3) return; presence().then((r) => { if (!on || !r.ok) return; hereCache = { day, n: r.now, at: Date.now() }; setN(r.now); }); };
    tick(); const id = setInterval(tick, 125e3);
    return () => { on = false; clearInterval(id); };
  }, [day]);
  return n;
}

export function Home(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const w = useWire();
  const now = useNow(1000);
  useEffect(() => { update((x) => { ensureMissions(x); }); dailyFeed(); }, []);
  const today = ymdUTC(), no = dailyNoToday();
  const played = s.daily[today];
  const liveD = dailyLiveDay(s);
  const closes = Date.parse(today + 'T00:00:00Z') + 864e5 - now;
  const here = useReporters(today);
  const ch = chapterOf(s);
  const openCalls = (w.mine?.calls || []).filter((c) => !c.done).length;
  const lamp = lampStyle(s);
  const playDaily = () => { sfx('open'); chrome.go({ n: 'daily' }); };

  const cards: { id: string; icon: string; title: string; sub: string; hot?: boolean; go: () => void }[] = [
    { id: 'career', icon: 'career', title: t('sh.home.modes.career'), hot: !!s.career?.live,
      sub: s.career?.live ? t('sh.home.sub.careerLive') : ch && s.career ? t('sh.home.sub.careerAt', { c: ch.n, n: s.career.windows + 1 }) : t('sh.home.sub.careerNew'),
      go: () => chrome.go({ n: 'story' }) },
    { id: 'market', icon: 'market', title: t('sh.home.modes.market'),
      sub: openCalls ? t('sh.home.sub.marketCalls', { n: openCalls }) : t('sh.home.sub.marketNone'),
      go: () => chrome.go({ n: 'wire' }) },
    { id: 'rooms', icon: 'rooms', title: t('sh.home.modes.rooms'),
      sub: s.rooms.length > 1 ? t('sh.home.sub.roomsN', { n: s.rooms.length }) : s.rooms.length ? t('sh.home.sub.rooms1') : t('sh.home.sub.roomsNone'),
      go: () => chrome.go({ n: 'rooms' }) },
    { id: 'practice', icon: 'target', title: t('sh.home.modes.practice'), hot: !!s.practice.live,
      sub: s.practice.live ? t('sh.home.sub.practiceLive', { d: s.practice.live.log.filter((a) => a[0] === 'e').length + 1 }) : t('sh.home.sub.practice'),
      go: () => chrome.go(s.practice.live ? { n: 'play', mode: 'practice', key: Date.now() } : { n: 'practice' }) },
  ];
  return <div className="g-screen home hm fit" data-lamp={lamp.on ? lamp.warmth : undefined} style={lamp.on ? (lamp.vars as CSSProperties) : undefined}>
    <HomeFilm tone={lamp.on ? 'night' : undefined} />
    <TopBar onMenu={chrome.openSettings} />
    <div className="fit__body hm__body">
      <Tip id="home" />

      <section className={'hm-hero g-card' + (played ? ' is-filed' : '')} aria-label={t('sh.home.kicker')}>
        <div className="hm-hero__band">
          <span className="hm-hero__k">{t('sh.home.kicker')} <b>{t('sh.home.no', { n: no })}</b></span>
          <span className="hm-hero__clock g-num" role="timer" aria-label={t('sh.home.closes', { t: hms(closes) })}><Icon n="clock" size={13} />{hms(closes)}</span>
        </div>
        <div className="hm-hero__body">
          <div className="hm-hero__kits" aria-hidden="true">
            {[-6, 3, -2, 5, -4].map((r, k) => <span key={k} className="hm-hero__kit" style={{ ['--r' as string]: r + 'deg', animationDelay: 80 + k * 60 + 'ms' }}><Kit mystery size={40} /></span>)}
          </div>
          {played ? <div className="hm-hero__filed">
            <span className={'g-stamp g-stamp--' + (TIER_STAMP[played.tier] || '')}>{t('tier.' + played.tier)}</span>
            <span className="hm-hero__pts g-num">{t('sh.home.filed', { p: num(played.total) })}{played.rank ? ' · ' + t('sh.home.rank', { r: played.rank, n: played.players || 1 }) : ''}</span>
          </div> : <p className="hm-hero__s">{t('sh.home.hidden')}</p>}
          <div className="hm-hero__meta">
            <span className={'hm-hero__streak' + (s.streak.n ? ' is-lit' : '')}><Icon n="flame" size={15} />{s.streak.n ? t('sh.home.streak', { n: s.streak.n }) : t('sh.home.streak0')}</span>
            <span className="hm-hero__here"><Icon n="rooms" size={15} />{here > 1 ? t('sh.home.here', { n: here.toLocaleString('en') }) : t('sh.home.hereOne')}</span>
          </div>
          <GBtn size="lg" primary={!played} pulse={!played && !liveD} shine={!played} sound={null} onClick={playDaily} className="hm-hero__cta">
            <Icon n={played ? 'daily' : liveD ? 'uturn' : 'phone'} size={24} />{played ? t('sh.home.result') : liveD ? t('sh.home.resume', { d: liveD }) : t('sh.home.play')}
          </GBtn>
        </div>
      </section>

      <SeasonStrip s={s} go={() => chrome.go({ n: 'pass' })} />

      <section className="hm-cards" aria-label={t('g.home.modes')}>
        {cards.map((m, k) => <button key={m.id} className={'hm-card hm-card--' + m.id + (m.hot ? ' is-hot' : '')} style={{ ['--i' as string]: k }} onClick={() => { sfx('open'); m.go(); }}>
          <span className="hm-card__ic" aria-hidden="true"><Icon n={m.icon} size={22} /></span>
          <span className="hm-card__b"><b>{m.title}</b><small dir="auto">{m.sub}</small></span>
        </button>)}
      </section>

      <div className="hm-row">
        <MissionsTile s={s} go={() => chrome.go({ n: 'missions' })} />
        <ShopTile now={now} go={() => chrome.go({ n: 'customize' })} />
      </div>
    </div>
  </div>;
}

// ---------------------------------------------------------------- the season strip: level, bar, next reward (§25 "secondary progression strip")
function SeasonStrip({ s, go }: { s: Save; go: () => void }) {
  const t = useT();
  const lv = levelOf(s.pp, s);
  const def = seasonAt();
  let next: { lv: number; label: string } | null = null;
  for (let L = lv.n + 1; L <= MAX_LV && !next; L++) { const r = freeReward(def.id, L); if (r) next = { lv: L, label: r.coins ? t('sh.home.nextCoins', { n: r.coins }) : t('sh.home.nextLook') }; }
  return <button type="button" className="hm-season" onClick={() => { sfx('ui.tap'); go(); }} aria-label={t('sh.home.season', { s: t(def.nameKey), n: lv.n })}>
    <span className="hm-season__lv g-num">{t('g.lv', { n: lv.n })}</span>
    <span className="hm-season__b">
      <span className="hm-season__k"><b dir="auto">{t(def.nameKey)}</b><small>{next ? t('sh.home.next', { r: next.label, n: next.lv }) : t('sh.home.seasonMax')}</small></span>
      <span className="g-bar g-bar--sm" style={{ ['--bar' as string]: 'var(--gold)' }}><i style={{ width: Math.max(2, Math.min(100, lv.pct)) + '%' }} /></span>
    </span>
    <Icon n={t.rtl ? 'back' : 'arrow'} size={16} className="hm-season__go" />
  </button>;
}

// ---------------------------------------------------------------- compact Missions and Shop
function MissionsTile({ s, go }: { s: Save; go: () => void }) {
  const t = useT();
  const ms = allMissions(s);
  const done = ms.filter((m) => m.done).length, ready = ms.filter((m) => m.done && !m.claimed).length;
  return <button type="button" className={'hm-tile hm-tile--missions' + (ready ? ' is-ready' : '')} onClick={() => { sfx('ui.tap'); go(); }}>
    <span className="hm-tile__ic" aria-hidden="true"><Icon n="missions" size={20} />{ready > 0 && <span className="g-badge hm-tile__badge">{ready}</span>}</span>
    <span className="hm-tile__b"><b>{t('sh.home.missions')}</b><small>{ready ? t('sh.home.missionsReady', { n: ready }) : t('sh.home.missionsSub', { a: done, b: ms.length })}</small></span>
  </button>;
}
function ShopTile({ now, go }: { now: number; go: () => void }) {
  const t = useT();
  const fresh = newThisWeek(now).length;
  return <button type="button" className="hm-tile hm-tile--shop" onClick={() => { sfx('ui.tap'); go(); }}>
    <span className="hm-tile__ic" aria-hidden="true"><Icon n="shop" size={20} /></span>
    <span className="hm-tile__b"><b>{t('sh.home.shop')}</b><small>{fresh ? t('sh.home.shopNew', { n: fresh }) : t('sh.home.shopSub')}</small></span>
  </button>;
}
