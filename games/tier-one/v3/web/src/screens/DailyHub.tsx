// Daily Challenge (3.6): today's Daily first, then Deadline Day Live and Practice, then the Daily leaderboard. And the
// Missions screen (Home's compact row). Both fit one screen.
import { useEffect, useState } from 'react';
import { useT, num, resetAt } from '../lib/i18n';
import { update, useSave, getSave } from '../lib/save';
import { v3 } from '../lib/api';
import type { CastSaga } from '../lib/engine';
import { ymdUTC } from '../lib/meta';
import { ensureMissions, missionsView, claimMission } from '../lib/progress';
import { sfx } from '../lib/sfx';
import { Icon, Kit, GBtn, TopBar, confetti } from '../ui/game';
import { useNow } from '../ui/bits';
import { DDLiveBanner } from '../ui/live';
import { dailyNoToday } from './Front';
import { hms, dailyLiveDay } from './Home';
import { usePaged, Pager } from '../ui/fit';
import type { Chrome } from '../App';

const TIER_STAMP: Record<string, string> = { T1: 'gold', T2: 'done', T3: 'done', T4: 'off', SPIKED: '' };

export function DailyHubScreen(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const now = useNow(1000);
  const today = ymdUTC(), no = dailyNoToday();
  const cast = useTodayCast(today);
  const played = s.daily[today];
  const live = dailyLiveDay(s);
  const closes = Date.parse(today + 'T00:00:00Z') + 864e5 - now;
  const d0 = new Date(today + 'T00:00:00Z'); const dow = (d0.getUTCDay() + 6) % 7;
  const week = Array.from({ length: 7 }, (_, k) => { const d = new Date(d0.getTime() + (k - dow) * 864e5).toISOString().slice(0, 10); return { d, on: !!s.daily[d], now: d === today }; });
  const back = { label: t('g.tabs.home'), onClick: () => chrome.go({ n: 'front' }) };
  return <div className="g-screen dh fit">
    <TopBar back={back} title={t('hub.daily.title')} />
    <div className="fit__body">
      <section className="five g-card m-hero dh-five" aria-label={t('hub.daily.title')}>
        <div className="five__band"><span className="g-mono">{t('g.home.dailyNo', { n: no })}</span><span className="five__clock g-num" role="timer" aria-label={t('daily.closes', { t: resetAt() })}>{hms(closes)}</span></div>
        <div className="five__body">
          <h2 className="g-h1">{t('g.home.todaysFive')}</h2>
          <div className="five__kits" aria-hidden="true">
            {Array.from({ length: 5 }, (_, k) => <span key={k} className="five__kit" style={{ ['--r' as string]: [-5, 3, -2, 4, -3][k] + 'deg', animationDelay: 120 + k * 70 + 'ms' }}>
              {cast?.[k] ? <Kit club={cast[k].from} player={cast[k].player} size={44} /> : <Kit mystery size={44} />}
              {cast?.[k] && <span className="five__name">{cast[k].player.s || cast[k].player.n}</span>}
            </span>)}
          </div>
          <div className="week" aria-label={t('g.home.weekAria')}>
            {week.map((x, k) => <span key={x.d} className={(x.on ? 'on ' : '') + (x.now ? 'now' : '')}><i>{x.on ? <Icon n="check" /> : null}</i><b>{t('g.home.dow.' + k)}</b></span>)}
          </div>
          {played ? <div className="dh-filed">
            <span className={'g-stamp g-stamp--' + (TIER_STAMP[played.tier] || '')}>{t('tier.' + played.tier)}</span>
            <span className="g-mono">{t('hub.sub.dailyFiled', { p: num(played.total) })}{played.rank ? ' · #' + played.rank : ''}</span>
          </div> : null}
          <GBtn size="lg" pulse={!played && !live} shine sound="open" onClick={() => chrome.go({ n: 'daily' })} style={{ marginTop: 12 }}>
            <Icon n={played ? 'news' : live ? 'uturn' : 'phone'} size={24} />{played ? t('hub.daily.read') : live ? t('hub.daily.resume', { d: live }) : t('hub.daily.play')}
          </GBtn>
        </div>
      </section>
      <DDLiveBanner go={chrome.go} />
      <div className="dh-two">
        <button className="dh-card dh-card--dd" onClick={() => { sfx('open'); chrome.go({ n: 'ddlive' }); }}>
          <span className="dh-card__ic" aria-hidden="true"><Icon n="clock" size={22} /></span>
          <b>{t('hub.daily.dd')}</b><small>{t('hub.daily.ddSub')}</small>
        </button>
        <button className="dh-card dh-card--practice" onClick={() => { sfx('open'); chrome.go(s.practice.live ? { n: 'play', mode: 'practice', key: Date.now() } : { n: 'practice' }); }}>
          <span className="dh-card__ic" aria-hidden="true"><Icon n="target" size={22} /></span>
          <b>{t('hub.daily.practice')}</b><small>{s.practice.live ? t('g.home.resume', { d: s.practice.live.log.filter((a) => a[0] === 'e').length + 1 }) : t('hub.daily.practiceSub')}</small>
        </button>
      </div>
      <GBtn kind="dark" size="sm" onClick={() => chrome.go({ n: 'boards', period: 'daily', from: { n: 'today' } })}><Icon n="trophy" size={18} />{t('hub.board')}</GBtn>
    </div>
  </div>;
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

// ---------------------------------------------------------------- Missions
function claimAll(ids: string[]) {
  let paid = 0;
  for (const id of ids) paid += claimMission(id) || 0;
  if (paid) { sfx('coin'); confetti(['#F7B928', '#FFD35C', '#fff'], 60); }
}
const MI: Record<string, string> = { daily: 'phone', right3: 'check', excl: 'bolt', confRight: 'star', physio: 'pulse', spotter: 'plane', barber: 'scissors', agent: 'briefcase', practice: 'target', story: 'story', wire: 'wire', twist: 'uturn', room: 'friends' };
export function MissionsScreen(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  useEffect(() => { update((x) => { ensureMissions(x); }); }, []);
  const ms = missionsView(s) || [];
  const ready = ms.filter((m) => m.done && !m.claimed);
  const pg = usePaged(ms, 6);
  return <div className="g-screen msn fit">
    <TopBar back={{ label: t('g.tabs.home'), onClick: () => chrome.go({ n: 'front' }) }} title={t('hub.missions.title')} />
    <div className="fit__body">
      <div className="g-sec" style={{ margin: 0 }}><h2>{t('hub.missions.title')}</h2><span className="g-mono">{t('hub.missions.reset', { t: resetAt() })}</span></div>
      {ms.length ? <div className="missions missions--sheet g-card">
        {pg.rows.map((m) => <div key={m.id} className={'mission' + (m.done ? ' is-done' : '') + (m.claimed ? ' is-claimed' : '')}>
          <span className="mission__ic"><Icon n={m.claimed ? 'check' : MI[m.id] || 'target'} /></span>
          <span className="mission__t"><b>{t('g.missions.' + m.id, { n: m.n })}</b>
            <span className="g-bar g-bar--sm" style={{ ['--bar' as string]: m.done ? 'var(--c-done)' : 'var(--gold)' }}><i style={{ width: (100 * m.have) / m.n + '%' }} /></span></span>
          {m.done && !m.claimed ? <button className="claim" onClick={() => claimAll([m.id])}><span className="g-coin" />+{m.coins}</button>
            : <span className="mission__r g-mono">{m.claimed ? t('g.home.claimed') : <>{m.have + '/' + m.n}<span className="mission__c"><span className="g-coin" />+{m.coins}</span></>}</span>}
        </div>)}
      </div> : <p className="g-empty">{t('hub.missions.none')}</p>}
      <Pager p={pg} />
      {ready.length > 1 && <GBtn kind="gold" onClick={() => claimAll(ready.map((m) => m.id))}><Icon n="gift" size={20} />{t('hub.missions.claimAll')}</GBtn>}
    </div>
  </div>;
}
