// Home: the game hub (HYBRID.md §4). Press pass, Today's five, missions, the modes, the wire ticker.
import { useEffect } from 'react';
import { useT, num } from '../lib/i18n';
import { update, useSave } from '../lib/save';
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

const hms = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return [s / 3600, (s % 3600) / 60, s % 60].map((x) => String(Math.floor(x)).padStart(2, '0')).join(':'); };
const TIER_STAMP: Record<string, string> = { T1: 'gold', T2: 'done', T3: 'done', T4: 'off', SPIKED: '' };

export function Home(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const w = useWire();
  const lg = useLeague();
  const now = useNow(1000);
  useEffect(() => { update((x) => { ensureMissions(x); }); }, []);
  const today = ymdUTC(), no = dailyNoToday();
  const played = s.daily[today];
  const live = s.last && new Date(s.last.at).toISOString().slice(0, 10) === today && !s.last.pub.over ? s.last.pub : null;
  const closes = Date.parse(today + 'T00:00:00Z') + 864e5 - now;
  const lv = levelOf(s.pp);
  const ch = chapterOf(s);
  const me = myRow(lg);
  const initials = (s.nick || 'You').split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  // The week strip: Monday-first, UTC.
  const d0 = new Date(today + 'T00:00:00Z'); const dow = (d0.getUTCDay() + 6) % 7;
  const week = Array.from({ length: 7 }, (_, k) => { const d = new Date(d0.getTime() + (k - dow) * 864e5).toISOString().slice(0, 10); return { d, on: !!s.daily[d], now: d === today }; });
  const ms = missionsView(s) || [];
  const rs = (w.rumours || []).slice(0, 8);
  const openCalls = (w.mine?.calls || []).filter((c) => !c.done).length;

  return <div className="g-screen home">
    <TopBar onHelp={() => chrome.go({ n: 'howto' })} onMenu={chrome.openSettings} />
    <div className="stagger">

      {/* ---------- press pass */}
      <button className="pass g-card g-card--desk g-card--tap" style={{ ['--i' as string]: 0 }} onClick={() => chrome.go({ n: 'me' })}>
        <span className="pass__badge"><span className="pass__init">{initials}</span><span className="pass__lv">{lv.n}</span></span>
        <span className="pass__main">
          <span className="pass__name">{s.nick || t('g.home.noName')}</span>
          <span className="pass__rank">{ch ? t('g.story.ch.' + ch.id + '.name') : t('g.home.freelance')}</span>
          <span className="g-bar g-bar--sm" style={{ marginTop: 8, ['--bar' as string]: 'linear-gradient(90deg,#FFD35C,#F7B928)' }}><i style={{ width: lv.into + '%' }} /></span>
          <span className="pass__meta"><span>{t('g.home.xp', { a: lv.into, b: lv.need })}</span>{s.career && <span>{t('g.home.followers', { n: fmtK(s.career.followers) })}</span>}</span>
        </span>
        <span className="pass__streak" aria-label={t('front.tallyAria', { n: s.streak.n })}>
          <span className={'flame' + (s.streak.n ? ' is-lit' : '')}><Icon n="flame" /></span>
          <b className="g-num">{s.streak.n}</b><span className="g-mono">{t('g.home.streak')}</span>
        </span>
      </button>

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
                <Kit mystery size={58} />
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
          <p className="five__fair g-mono">{played ? t('g.home.tomorrow') : t('g.home.fair')}</p>
        </div>
      </section>

      {/* ---------- missions */}
      {ms.length > 0 && <section className="missions g-card g-card--desk" style={{ ['--i' as string]: 2 }}>
        <div className="g-sec" style={{ margin: '0 0 8px' }}><h2>{t('g.home.missions')}</h2><span className="g-mono">{t('g.home.missionsReset')}</span></div>
        {ms.map((m) => <div key={m.id} className={'mission' + (m.done ? ' is-done' : '') + (m.claimed ? ' is-claimed' : '')}>
          <span className="mission__ic"><Icon n={m.claimed ? 'check' : MI[m.id] || 'target'} /></span>
          <span className="mission__t"><b>{t('g.missions.' + m.id, { n: m.n })}</b>
            <span className="g-bar g-bar--sm" style={{ ['--bar' as string]: m.done ? 'var(--c-done)' : 'var(--gold)' }}><i style={{ width: (100 * m.have) / m.n + '%' }} /></span></span>
          {m.done && !m.claimed ? <button className="claim" onClick={() => { const c = claimMission(m.id); if (c) { sfx('coin'); confetti(['#F7B928', '#FFD35C', '#fff'], 60); } }}><span className="g-coin" />+{m.coins}</button>
            : <span className="mission__r g-mono">{m.claimed ? t('g.home.claimed') : m.have + '/' + m.n}</span>}
        </div>)}
      </section>}

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

