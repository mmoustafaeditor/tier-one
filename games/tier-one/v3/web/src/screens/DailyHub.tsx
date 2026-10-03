// Daily Challenge (3.6): today's Daily first, then Deadline Day Live and Practice, then the Daily leaderboard. And the
// Missions screen (Home's Missions box). Both fit one screen.
import { useEffect, useState } from 'react';
import { useT, num, resetAt } from '../lib/i18n';
import { update, useSave, getSave } from '../lib/save';
import { v3 } from '../lib/api';
import type { CastSaga } from '../lib/engine';
import { ymdUTC } from '../lib/meta';
import { ensureMissions, allMissions, claimMission, MODE_ORDER, type MissionMode } from '../lib/progress';
import { sfx } from '../lib/sfx';
import { Icon, Kit, GBtn, TopBar, confetti } from '../ui/game';
import { useNow } from '../ui/bits';
import { dailyNoToday } from './Front';
import { hms, dailyLiveDay, PastResults } from './Home';
import { shareText } from '../lib/share';
import { toast } from '../lib/meta';
import '../styles/daily39.css';
import { usePaged, Pager } from '../ui/fit';
import type { Chrome } from '../App';


// 3.9.16 (owner mockups, before and after play): the coral band (Daily No. · resets in), the title, today's five sagas
// (mystery shirts until you have played, then each kit with the player's name), the week, the streak and today's status,
// then Play Daily Challenge (or Share results), Leaderboard and Past Results.
export function DailyHubScreen(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const now = useNow(1000);
  const today = ymdUTC(), no = dailyNoToday();
  const played = s.daily[today];
  const cast = useTodayCast(today, !!played);
  const live = dailyLiveDay(s);
  const closes = Date.parse(today + 'T00:00:00Z') + 864e5 - now;
  const d0 = new Date(today + 'T00:00:00Z'); const dow = (d0.getUTCDay() + 6) % 7;
  const week = Array.from({ length: 7 }, (_, k) => { const d = new Date(d0.getTime() + (k - dow) * 864e5).toISOString().slice(0, 10); return { d, on: !!s.daily[d], now: d === today }; });
  const [past, setPast] = useState(false);
  const share = async () => {
    if (!played) return;
    const txt = shareText(t, { what: t('g.win.daily', { n: no }), tier: t('tier.' + played.tier), pts: num(played.total, true), row: played.row, url: location.origin + location.pathname });
    try { if (navigator.share) { await navigator.share({ text: txt }); return; } await navigator.clipboard.writeText(txt); toast('info', t('u39.dh.copied')); } catch { /* cancelled */ }
  };
  const arrow = <Icon n={t.rtl ? 'back' : 'arrow'} size={20} />;
  return <div className="g-screen dh dh39 fit">
    <TopBar back={{ label: t('u39.tabs.desk'), onClick: () => chrome.go({ n: 'front' }) }} title={t('u39.dh.title')} />
    <div className="fit__body">
      <section className="dh39__card" aria-label={t('u39.home.title')}>
        <div className="dh39__band"><span className="g-mono">{t('u39.dh.no', { n: String(no).padStart(3, '0') })}</span><i aria-hidden="true" /><span className="dh39__clock" role="timer">{t('u39.home.resets')} <b className="g-num">{hms(closes)}</b></span></div>
        <div className="dh39__body">
          <h1 className="dh39__t g-hed">{t('u39.home.title')}</h1>
          <p className="dh39__sub">{t('u39.dh.sub')}</p>
          <h2 className="dh39__h">{t('u39.dh.five')}</h2>
          <div className="dh39__kits">
            {Array.from({ length: 5 }, (_, k) => { const c = played ? cast?.[k] : undefined;
              return <span key={k} className={'dh39__kit' + (c ? ' is-on' : '')}>
                {c ? <Kit club={c.from} player={c.player} size={44} /> : <Kit mystery size={44} />}
                {c && <b dir="auto">{c.player.s || c.player.n}</b>}
              </span>; })}
          </div>
          <div className="dh39__week" aria-label={t('g.home.weekAria')}>
            {week.map((x, k) => <span key={x.d} className={(x.on ? 'is-on ' : '') + (x.now ? 'is-now' : '')}><i>{x.on ? <Icon n="check" size={16} /> : null}</i><b>{t('g.home.dow.' + k)}</b></span>)}
          </div>
          <div className="dh39__meta">
            <span className={'dh39__streak' + (s.streak.n ? ' is-lit' : '')}><Icon n="flame" size={18} />{s.streak.n ? t('sh.home.streak', { n: s.streak.n }) : t('sh.home.streak0')}</span>
            {played ? <span className="dh39__status is-done"><Icon n="check" size={16} />{t('u39.dh.done')}</span> : <span className="dh39__status">{live ? t('u39.home.resume', { d: live }) : t('u39.dh.reveal')}</span>}
          </div>
          {played ? <button type="button" className="dh39__cta" onClick={() => { sfx('ui.tap'); share(); }}><Icon n="share" size={22} />{t('u39.dh.share')}{arrow}</button>
            : <button type="button" className="dh39__cta" onClick={() => { sfx('open'); chrome.go({ n: 'daily' }); }}>{live ? t('u39.home.resume', { d: live }) : t('u39.dh.play')}{arrow}</button>}
        </div>
      </section>
      <button type="button" className="dh39__row" onClick={() => { sfx('ui.tap'); chrome.go({ n: 'boards', period: 'daily', from: { n: 'today' } }); }}><Icon n="trophy" size={24} /><b>{t('u39.dh.lb')}</b><span className="dh39__go" aria-hidden="true">{arrow}</span></button>
      <button type="button" className="dh39__row" onClick={() => { sfx('ui.tap'); setPast(true); }}><Icon n="daily" size={24} /><b>{t('u39.dh.past')}</b><span className="dh39__go" aria-hidden="true">{arrow}</span></button>
      {played && <button type="button" className="dh39__link" onClick={() => { sfx('open'); chrome.go({ n: 'daily' }); }}>{t('hub.daily.read')}</button>}
    </div>
    <PastResults open={past} onClose={() => setPast(false)} />
  </div>;
}

// Today's five players (names and clubs; outcomes stay secret). Same call the Daily makes on open, cached per day.
let castCache: { day: string; cast: CastSaga[] } | null = null;
function useTodayCast(day: string, on = true) {
  const [c, setC] = useState(castCache?.day === day ? castCache.cast : null);
  useEffect(() => {
    if (!on || castCache?.day === day) return;
    const x = getSave();
    v3<{ cast: CastSaga[] }>('daily.start', { dev: x.dev, nick: x.nick }).then((r) => { if (r.ok && r.cast) { castCache = { day, cast: r.cast }; setC(r.cast); } }).catch(() => {});
  }, [day, on]);
  return c;
}

// ---------------------------------------------------------------- Missions
function claimAll(ids: string[]) {
  let paid = 0;
  for (const id of ids) paid += claimMission(id) || 0;
  if (paid) { sfx('coin'); confetti(['#F7B928', '#FFD35C', '#fff'], 60); }
}
const MI: Record<string, string> = { daily: 'phone', right3: 'check', excl: 'bolt', confRight: 'star', physio: 'pulse', spotter: 'plane', barber: 'scissors', agent: 'briefcase', practice: 'target', story: 'story', wire: 'wire', twist: 'uturn', room: 'friends', 'w.daily': 'news', 'w.story': 'story', 'w.room': 'friends', 'w.wire': 'wire', 'w.right': 'check' };
const MODE_KEY: Record<MissionMode, string> = { daily: 'hub.mode.daily', career: 'hub.mode.career', multi: 'hub.mode.multi', market: 'hub.mode.market', any: 'hub.missions.any' };
// Missions (3.7): today's daily missions and this week's weekly ones, grouped by game mode, payouts and Claim. Paged.
export function MissionsScreen(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  useEffect(() => { update((x) => { ensureMissions(x); }); }, []);
  const ms = allMissions(s).sort((a, b) => MODE_ORDER.indexOf(a.mode) - MODE_ORDER.indexOf(b.mode) || Number(a.weekly) - Number(b.weekly));
  const ready = ms.filter((m) => m.done && !m.claimed);
  const pg = usePaged(ms, 5);
  return <div className="g-screen msn fit">
    <TopBar back={{ label: t('g.tabs.home'), onClick: () => chrome.go({ n: 'front' }) }} title={t('hub.missions.title')} />
    <div className="fit__body">
      <div className="g-sec" style={{ margin: 0 }}><h2>{t('hub.missions.title')}</h2><span className="g-mono">{t('hub.missions.reset', { t: resetAt() })} · {t('hub.missions.weekReset')}</span></div>
      {ms.length ? <div className="missions missions--sheet g-card">
        {pg.rows.map((m, k) => <div key={m.id} className="msn-item">
          {(k === 0 || pg.rows[k - 1].mode !== m.mode) && <h3 className="msn-group">{t(MODE_KEY[m.mode])}</h3>}
          <div className={'mission' + (m.done ? ' is-done' : '') + (m.claimed ? ' is-claimed' : '')}>
            <span className="mission__ic"><Icon n={m.claimed ? 'check' : MI[m.id] || 'target'} /></span>
            <span className="mission__t"><b>{t(m.label, { n: m.n })}</b>
              <span className="msn-meta"><span className={'msn-tag' + (m.weekly ? ' msn-tag--w' : '')}>{t(m.weekly ? 'hub.missions.weekly' : 'hub.missions.daily')}</span>
                <span className="g-bar g-bar--sm" style={{ ['--bar' as string]: m.done ? 'var(--c-done)' : 'var(--gold)' }}><i style={{ width: (100 * m.have) / m.n + '%' }} /></span></span></span>
            {m.done && !m.claimed ? <button className="claim" onClick={() => claimAll([m.id])}><span className="g-coin" />{t('hub.missions.claim', { n: m.coins })}</button>
              : <span className="mission__r g-mono">{m.claimed ? t('g.home.claimed') : <>{m.have + '/' + m.n}<span className="mission__c"><span className="g-coin" />+{m.coins}</span></>}</span>}
          </div>
        </div>)}
      </div> : <p className="g-empty">{t('hub.missions.none')}</p>}
      <Pager p={pg} />
      {ready.length > 1 && <GBtn kind="gold" onClick={() => claimAll(ready.map((m) => m.id))}><Icon n="gift" size={20} />{t('hub.missions.claimAll')}</GBtn>}
    </div>
  </div>;
}
