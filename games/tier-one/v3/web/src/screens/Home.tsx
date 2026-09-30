// Home: the game hub (HYBRID.md §4). Press pass, Today's five, missions, the modes, the wire ticker.
import { useEffect, useState } from 'react';
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
import { useNow } from '../ui/bits';
import { dailyNoToday } from './Front';
import { chapterOf } from '../lib/storyMode';
import type { Chrome } from '../App';
import { WeekEventBanner } from '../ui/season';
import { bylineOf, dailyFeed } from '../lib/byline';
import { NextUpSlip, ForYou, RivalStrip } from '../ui/connect';

const hms = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return [s / 3600, (s % 3600) / 60, s % 60].map((x) => String(Math.floor(x)).padStart(2, '0')).join(':'); };
const TIER_STAMP: Record<string, string> = { T1: 'gold', T2: 'done', T3: 'done', T4: 'off', SPIKED: '' };

export function Home(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const w = useWire();
  const lg = useLeague();
  const now = useNow(1000);
  useEffect(() => { update((x) => { ensureMissions(x); }); dailyFeed(); }, []);
  const today = ymdUTC(), no = dailyNoToday();
  const played = s.daily[today];
  const live = s.last && new Date(s.last.at).toISOString().slice(0, 10) === today && !s.last.pub.over ? s.last.pub : null;
  const closes = Date.parse(today + 'T00:00:00Z') + 864e5 - now;
  const lv = levelOf(s.pp);
  const ch = chapterOf(s);
  const me = myRow(lg);
  const cast = useTodayCast(today);
  // The week strip: Monday-first, UTC.
  const d0 = new Date(today + 'T00:00:00Z'); const dow = (d0.getUTCDay() + 6) % 7;
  const week = Array.from({ length: 7 }, (_, k) => { const d = new Date(d0.getTime() + (k - dow) * 864e5).toISOString().slice(0, 10); return { d, on: !!s.daily[d], now: d === today }; });
  const ms = missionsView(s) || [];
  const rs = (w.rumours || []).slice(0, 8);
  const openCalls = (w.mine?.calls || []).filter((c) => !c.done).length;

  return <div className="g-screen home">
    <TopBar onHelp={() => chrome.go({ n: 'howto' })} onMenu={chrome.openSettings} />
    <div className="stagger">

      {/* ---------- press pass + the three modes at a glance */}
      <PressPass chrome={chrome} s={s} lg={lg} onTop={() => chrome.go({ n: 'me' })} />

      {/* ---------- next up (GOTY §1.5): the hero when the Daily is done */}
      <NextUpSlip go={chrome.go} style={{ ['--i' as string]: 1 }} />

      {/* ---------- today's five */}
      <section className="five g-card" style={{ ['--i' as string]: 1 }}>
        <div className="five__band"><span className="g-mono">{t('g.home.dailyNo', { n: no })}</span><span className="five__clock g-num" role="timer">{hms(closes)}</span></div>
        <div className="five__body">
          <div className="five__row">
            <h2 className="g-h1">{played ? t('g.home.filed') : t('g.home.todaysFive')}</h2>
            {played && <span className={'g-stamp is-slam g-stamp--' + (TIER_STAMP[played.tier] || '')}>{t('tier.' + played.tier)}</span>}
          </div>
          <p className="g-sub five__tag">{played ? t('g.home.filedSub', { p: num(played.total), r: played.rank ? t('daily.rank', { r: played.rank, n: played.players || 1 }) : '' }) : t('g.home.tag')}</p>
          <div className="five__kits" aria-hidden="true">
            {Array.from({ length: 5 }, (_, k) => {
              const res = played?.row ? played.row[k] : '';
              return <span key={k} className={'five__kit' + (res ? ' is-' + (res === '■' || res === '★' ? 'win' : res === '□' ? 'lose' : 'none') : '')} style={{ ['--r' as string]: [-6, 3, -2, 5, -4][k] + 'deg', ['--dx' as string]: (k - 2) * 30 + 'px', animationDelay: 120 + k * 70 + 'ms' }}>
                {cast?.[k] ? <Kit club={cast[k].from} player={cast[k].player} size={58} /> : <Kit mystery size={58} />}
                {cast?.[k] && <span className="five__name">{cast[k].player.s || cast[k].player.n}</span>}
                {res && <i className="five__res">{res === '★' ? <Icon n="bolt" /> : res === '■' ? <Icon n="check" /> : res === '□' ? <Icon n="x" /> : '–'}</i>}
              </span>;
            })}
          </div>
          <div className="week" aria-label={t('g.home.weekAria')}>
            {week.map((x, k) => <span key={x.d} className={(x.on ? 'on ' : '') + (x.now ? 'now' : '')}><i>{x.on ? <Icon n="check" /> : null}</i><b>{t('g.home.dow.' + k)}</b></span>)}
          </div>
          <GBtn size="lg" pulse={!played && !live} shine={!played} sound="open" onClick={() => chrome.go({ n: 'daily' })} style={{ marginTop: 14 }}>
            <Icon n={played ? 'news' : 'phone'} size={24} />{played ? t('g.home.seePage') : live ? t('g.home.resume', { d: live.day }) : t('g.home.play')}
          </GBtn>
          <p className="five__fair g-mono">{played ? t('g.home.tomorrow', { t: resetAt() }) : t('g.home.fair')}</p>
        </div>
      </section>

      <ForYou go={chrome.go} style={{ ['--i' as string]: 2 }} />

      {/* ---------- missions */}
      {ms.length > 0 && <section className="missions g-card g-card--desk" style={{ ['--i' as string]: 2 }}>
        <div className="g-sec" style={{ margin: '0 0 8px' }}><h2>{t('g.home.missions')}</h2><span className="g-mono">{t('g.home.missionsReset', { t: resetAt() })}</span></div>
        {ms.map((m) => <div key={m.id} className={'mission' + (m.done ? ' is-done' : '') + (m.claimed ? ' is-claimed' : '')}>
          <span className="mission__ic"><Icon n={m.claimed ? 'check' : MI[m.id] || 'target'} /></span>
          <span className="mission__t"><b>{t('g.missions.' + m.id, { n: m.n })}</b>
            <span className="g-bar g-bar--sm" style={{ ['--bar' as string]: m.done ? 'var(--c-done)' : 'var(--gold)' }}><i style={{ width: (100 * m.have) / m.n + '%' }} /></span></span>
          {m.done && !m.claimed ? <button className="claim" onClick={() => { const c = claimMission(m.id); if (c) { sfx('coin'); confetti(['#F7B928', '#FFD35C', '#fff'], 60); } }}><span className="g-coin" />+{m.coins}</button>
            : <span className="mission__r g-mono">{m.claimed ? t('g.home.claimed') : <>{m.have + '/' + m.n}<span className="mission__c"><span className="g-coin" />+{m.coins}</span></>}</span>}
        </div>)}
      </section>}

      {/* ---------- weekly event banner */}
      <WeekEventBanner onPlay={() => chrome.go({ n: 'practice' })} />

      <RivalStrip go={chrome.go} style={{ ['--i' as string]: 3 }} />

      {/* ---------- modes */}
      <div className="g-sec" style={{ ['--i' as string]: 3 }}><h2>{t('g.home.modes')}</h2></div>
      <div className="modes" style={{ ['--i' as string]: 3 }}>
        <ModeTile c="story" icon="story" k={t('g.home.storyK')} title={t('g.tabs.story')} sub={ch ? t('g.home.storySub', { c: ch.n, name: t('g.story.ch.' + ch.id + '.name') }) : t('g.home.storyNew')} progress={ch ? ch.progress : undefined} onClick={() => chrome.go({ n: 'story' })} wide />
        <ModeTile c="wire" icon="wire" k={t('g.home.wireK')} title={t('nav.wire')} sub={openCalls ? t('g.home.wireLive', { n: openCalls }) : t('g.home.wireSub')} badge={openCalls || undefined} onClick={() => chrome.go({ n: 'wire' })} />
        <ModeTile c="rooms" icon="friends" k={t('g.home.roomsK')} title={t('g.tabs.friends')} sub={me >= 0 && lg && lg.rows[me].pts > 0 ? t('g.home.leaguePos', { r: me + 1 }) : t('g.home.roomsSub')} onClick={() => chrome.go({ n: 'rooms' })} />
        <ModeTile c="practice" icon="target" k={t('g.home.practiceK')} title={t('nav.practice')} sub={t('g.home.practiceSub')} onClick={() => chrome.go({ n: 'practice' })} />
        <ModeTile c="pass" icon="crown" k={t('g.home.passK')} title={t('g.home.passT')} sub={t('g.home.passSub', { n: lv.n })} onClick={() => chrome.go({ n: 'pass' })} />
      </div>

      {/* ---------- wire ticker */}
      {rs.length > 0 && <button className="g-ticker" style={{ ['--i' as string]: 4 }} onClick={() => chrome.go({ n: 'wire' })}>
        <span className="g-ticker__l"><i />{t('nav.wire')}</span>
        <span className="g-ticker__vp"><span className="g-ticker__track">{[0, 1].map((dup) => <span key={dup} aria-hidden={dup === 1 ? 'true' : undefined}>{rs.map((r) => <span key={r.id}><b>{r.playerName}</b> {t('g.home.tick.' + stageOf(r), { c: r.linked[0]?.name || '' })} <em>▲{r.heat}</em></span>)}</span>)}</span></span>
      </button>}
    </div>
  </div>;
}
const MI: Record<string, string> = { daily: 'phone', right3: 'check', excl: 'bolt', confRight: 'star', physio: 'pulse', spotter: 'plane', barber: 'scissors', agent: 'briefcase', practice: 'target', story: 'story', wire: 'wire', twist: 'uturn', room: 'friends' };
const fmtK = (n: number) => (n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n));

function ModeTile({ c, icon, k, title, sub, onClick, wide, badge, progress }: { c: string; icon: string; k: string; title: string; sub: string; onClick: () => void; wide?: boolean; badge?: number; progress?: number }) {
  return <button className={'mode mode--' + c + (wide ? ' mode--wide' : '')} onClick={() => { sfx('ui.tap'); onClick(); }}>
    <span className="mode__art" aria-hidden="true"><Icon n={icon} /></span>
    {badge ? <span className="g-badge mode__badge">{badge}</span> : null}
    <span className="mode__k g-mono">{k}</span>
    <span className="mode__t">{title}</span>
    <span className="mode__s">{sub}</span>
    {progress != null && <span className="g-bar g-bar--sm" style={{ marginTop: 8, ['--bar' as string]: 'var(--mc)' }}><i style={{ width: Math.round(progress * 100) + '%' }} /></span>}
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

// The three modes in one strip: Daily (tier/streak), Career (chapter/level), Room (league rank). Home's pass and Me's card.
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

// The press pass: who you are, level, coins, and the three modes. Home's top bar; Me's press card.
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
