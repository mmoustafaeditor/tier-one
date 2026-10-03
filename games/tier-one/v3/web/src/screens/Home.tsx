// Desk (3.9.8, owner + handoff screenshot 01): one viewport. The newsroom banner (owner art), the Daily Challenge card
// (title, five shirts, streak · reset clock, Play today · Past results · Leaderboards · Streak), the season row with XP,
// the Career Mode card, then Multiplayer and Transfer Market. Practice, Missions and Shop are not on the Desk.
import { useEffect, useState } from 'react';
import { useT, num, fmtDate } from '../lib/i18n';
import { update, useSave } from '../lib/save';
import type { Save } from '../lib/save';
import { ymdUTC } from '../lib/meta';
import { ensureMissions, levelOf } from '../lib/progress';
import { sfx } from '../lib/sfx';
import { Icon, useNow, Sheet } from '../ui/bits';
import { TopBar } from '../ui/game';
import { Crest } from '../ui/bits';
import { Portrait } from '../ui/portrait';
import { outWord } from '../lib/story';
import { chapterOf, chapterName } from '../lib/storyMode';
import type { Chrome } from '../App';
import { dailyFeed } from '../lib/byline';
import { dailyNoToday } from './Front';
import '../styles/home39.css';

export const hms = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return [s / 3600, (s % 3600) / 60, s % 60].map((x) => String(Math.floor(x)).padStart(2, '0')).join(':'); };
/** The day of today's Daily still in progress (0 when none). */
export const dailyLiveDay = (s: Save) => { const today = ymdUTC(); return !s.daily[today] && s.last && new Date(s.last.at).toISOString().slice(0, 10) === today && !s.last.pub.over ? Number(s.last.pub.day) || 0 : 0; };
const TIER_STAMP: Record<string, string> = { T1: 'gold', T2: 'done', T3: 'done', T4: 'off', SPIKED: '' };
const pad3 = (n: number) => String(n).padStart(3, '0');

export function Home(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const now = useNow(1000);
  useEffect(() => { update((x) => { ensureMissions(x); }); dailyFeed(); }, []);
  const today = ymdUTC(), no = dailyNoToday();
  const played = s.daily[today];
  const liveD = dailyLiveDay(s);
  const closes = Date.parse(today + 'T00:00:00Z') + 864e5 - now;
  const ch = chapterOf(s);
  const [sheet, setSheet] = useState<null | 'past' | 'streak'>(null);
  const lv = levelOf(s.pp, s);
  const xpIn = lv.max ? lv.per : Math.round((lv.pct / 100) * lv.per);
  const arrow = <Icon n={t.rtl ? 'back' : 'arrow'} size={20} />;
  return <div className="g-screen home hm hm39 fit">
    <TopBar onMenu={chrome.openSettings} wallet={false} />
    <div className="fit__body hm__body">
      <div className="hm39__art" aria-hidden="true"><img className="hm39__photo" src="art/desk-hero-full.webp" alt="" decoding="async" /><img className="hm39__hair" src="art/desk-hero-full.webp" alt="" decoding="async" /></div>

      <section className={'hm39__daily' + (played ? ' is-filed' : '')} aria-label={t('u39.home.title')}>
        <div className="hm39__top">
          <span className="hm39__k g-mono">{t('u39.home.k', { n: pad3(no) })}</span>
        </div>
        <div className="hm39__mid">
          <div className="hm39__head">
            <h1 className="hm39__t g-hed">{t('u39.home.title')}</h1>
            {played ? <p className="hm39__sub"><span className={'g-stamp g-stamp--' + (TIER_STAMP[played.tier] || '')}>{t('tier.' + played.tier)}</span> <b className="g-num">{t('sh.home.filed', { p: num(played.total) })}</b>{played.rank ? ' · ' + t('sh.home.rank', { r: played.rank, n: played.players || 1 }) : ''}</p>
              : null}
          </div>
          <img className="hm39__shirts" src="art/daily-shirts.webp" alt="" aria-hidden="true" width={398} height={130} decoding="async" />
        </div>
        <div className="hm39__meta">
          <button type="button" className={'hm39__streak' + (s.streak.n ? ' is-lit' : '')} onClick={() => { sfx('ui.tap'); setSheet('streak'); }}><Icon n="flame" size={18} />{s.streak.n ? t('sh.home.streak', { n: s.streak.n }) : t('sh.home.streak0')}</button>
          <span className="hm39__clock" role="timer">{t('u39.home.resets')} <b className="g-num">{hms(closes)}</b></span>
        </div>
        <div className="hm39__acts">
          <button type="button" className="hm39__play" onClick={() => { sfx('open'); chrome.go({ n: 'today' }); }}>{played ? t('u39.home.result') : liveD ? t('u39.home.resume', { d: liveD }) : t('u39.home.play')}{arrow}</button>
          <button type="button" className="hm39__past" onClick={() => { sfx('ui.tap'); setSheet('past'); }}>{t('u39.home.past')}</button>
          <button type="button" className="hm39__ic" aria-label={t('u39.home.lb')} title={t('u39.home.lb')} onClick={() => { sfx('ui.tap'); chrome.go({ n: 'boards', period: 'daily', from: { n: 'front' } }); }}><Icon n="trophy" size={20} /></button>
        </div>
      </section>

      <button type="button" className={'hm39__careerc' + (s.career?.live ? ' is-hot' : '')} onClick={() => { sfx('open'); chrome.go({ n: 'story' }); }} aria-label={t('u39.home.career') + (s.career && ch ? ' · ' + t(chapterName(ch.id)) : '')}>
        <span className="hm39__ch"><b className="g-hed">{t('u39.home.career')}</b><Icon n="career" size={26} /></span>
        <span className="hm39__cr">
          {s.career && ch ? <><b>{t('u39.home.chapter', { n: ch.n })}</b><i aria-hidden="true" /><span className="hm39__lv">{t('g.lv', { n: lv.n })}</span><span className="hm39__bar" aria-hidden="true"><i style={{ width: Math.max(2, Math.min(100, lv.pct)) + '%' }} /></span><span className="hm39__xp g-num">{xpIn} / {lv.per} XP</span></>
            : <><b className="hm39__pro1">{t('u39.home.prologue')}</b><i aria-hidden="true" /><span className="hm39__pro">{t('u39.home.prologueSub')}</span></>}
        </span>
        <span className="hm39__go" aria-hidden="true">{arrow}</span>
      </button>
      <div className="hm39__modes">
        <button type="button" className="hm39__mp" onClick={() => { sfx('open'); chrome.go({ n: 'rooms' }); }}>
          <Icon n="rooms" size={30} />
          <b className="g-hed">{t('u39.home.rooms')}</b>
          <span className="hm39__go" aria-hidden="true">{arrow}</span>
        </button>
        <button type="button" className="hm39__row" onClick={() => { sfx('open'); chrome.go({ n: 'wire' }); }}>
          <Icon n="market" size={26} /><b>{t('u39.home.market')}</b><span className="hm39__go" aria-hidden="true">{arrow}</span>
        </button>
        <button type="button" className="hm39__row" onClick={() => { sfx('open'); chrome.go({ n: 'customize' }); }}>
          <Icon n="shop" size={26} /><b>{t('u39.home.shop')}</b><span className="hm39__go" aria-hidden="true">{arrow}</span>
        </button>
      </div>
    </div>

    <PastResults open={sheet === 'past'} onClose={() => setSheet(null)} />
    <Sheet open={sheet === 'streak'} onClose={() => setSheet(null)} label={t('u39.home.streakT')}>
      <div className="sheet__body hm39__streakbox">
        <span className="hm39__flame"><Icon n="flame" size={40} /></span>
        <h2 className="g-h2">{s.streak.n ? t('sh.home.streak', { n: s.streak.n }) : t('sh.home.streak0')}</h2>
        <p className="g-sub">{t('u39.home.best', { n: Math.max(s.streak.best || 0, s.streak.n) })}</p>
        <p className="g-sub">{t('u39.home.streakHow')}</p>
      </div>
    </Sheet>
  </div>;
}

/** Past Daily Challenge results (newest first). Tap one for the full result: score, rank, the row and each saga. */
export function PastResults({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const s = useSave();
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => { if (!open) setSel(null); }, [open]);
  const past = Object.entries(s.daily).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30);
  const r = sel ? s.daily[sel] : null;
  const arrow = <Icon n={t.rtl ? 'back' : 'arrow'} size={18} />;
  return <Sheet open={open} onClose={onClose} label={t('u39.home.past')}>
    {r && sel ? <div className="sheet__body hm39__list pr40">
      <button type="button" className="pr40__back" onClick={() => { sfx('ui.tap'); setSel(null); }}><Icon n={t.rtl ? 'arrow' : 'back'} size={18} />{t('u39.home.past')}</button>
      <span className="pr40__k g-mono">{t('u39.home.k', { n: pad3(r.no) })} · {fmtDate(Date.parse(sel + 'T12:00:00Z'), t.lang, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
      <div className="pr40__top">
        <span className={'g-stamp g-stamp--' + (TIER_STAMP[r.tier] || '')}>{t('tier.' + r.tier)}</span>
        <b className="g-num pr40__pts">{num(r.total, true)}</b>
        {r.rank ? <span className="pr40__rank">{t('sh.home.rank', { r: r.rank, n: r.players || 1 })}</span> : null}
      </div>
      {r.row ? <p className="pr40__row" aria-hidden="true">{r.row}</p> : null}
      {r.per?.length ? <ol className="pr40__sagas">
        {r.per.map((x, k) => <li key={k} className={x.called ? (x.right ? 'is-right' : 'is-wrong') : 'is-skip'}>
          <span className="pr40__face"><Portrait kind="player" id={x.pid} club={x.from} size={52} /></span>
          <span className="pr40__b"><b dir="auto">{x.n}</b>
            <span className="pr40__route"><Crest club={x.from} size={18} /><bdi>{x.from.s}</bdi>{arrow}<Crest club={x.to} size={18} /><bdi>{x.to.s}</bdi></span>
            <small>{t('u39.past.truth', { o: outWord(t.lang, x.truth) })}{x.excl ? ' · ' + t('u39.past.excl') : ''}</small></span>
          <span className="pr40__res"><b className="g-num">{x.called ? (x.pts > 0 ? '+' : '') + num(x.pts) : '–'}</b><small>{x.called ? t(x.right ? 'u39.past.right' : 'u39.past.wrong') : t('u39.past.skip')}</small></span>
        </li>)}
      </ol> : <p className="g-sub">{t('u39.past.noDetail')}</p>}
    </div>
    : <div className="sheet__body hm39__list">
      <h2 className="g-h2">{t('u39.home.past')}</h2>
      {!past.length ? <p className="g-sub">{t('u39.home.noPast')}</p> : <ol>
        {past.map(([d, r]) => <li key={d}><button type="button" className="pr40__item" onClick={() => { sfx('ui.tap'); setSel(d); }}>
          <span className="hm39__lw"><b>{t('u39.home.k', { n: pad3(r.no) })}</b><small className="g-mono">{fmtDate(Date.parse(d + 'T12:00:00Z'), t.lang, { day: 'numeric', month: 'short' })}{r.rank ? ' · #' + r.rank : ''}</small></span>
          <span className={'g-stamp g-stamp--' + (TIER_STAMP[r.tier] || '')}>{t('tier.' + r.tier)}</span>
          <b className="g-num hm39__lp">{num(r.total, true)}</b>{arrow}
        </button></li>)}
      </ol>}
    </div>}
  </Sheet>;
}
