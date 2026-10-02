// Practice (LAUNCH_BRIEF §30, 3.8): OFF THE RECORD, the learning lab. Nothing here affects your reputation. Coach mode
// prints the exact odds on every file; every finished board explains why each source misled you; past Dailies replay
// as everyone played them; a board code is the same board for a friend. One screen, no scrolling; the week-event
// banner is gone from here (§34: its modifiers never applied, and its button looped back to this page).
import { useState } from 'react';
import { useT, fmtDate } from '../lib/i18n';
import { useSave, update } from '../lib/save';
import { randomSeed } from '../lib/driver';
import { v3 } from '../lib/api';
import { ymdUTC } from '../lib/meta';
import { sfx } from '../lib/sfx';
import { Icon, GBtn, TopBar } from '../ui/game';
import type { Chrome } from '../App';

const FIRST_DAILY = '2026-09-01';

export function PracticeScreen(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(-1);
  const begin = (seed: string, label?: string) => {
    update((x) => { x.practice.live = { seed, mode: 'practice', log: [], started: Date.now(), coach: x.practice.coach, label }; });
    chrome.go({ n: 'play', mode: 'practice', key: Date.now() });
  };
  const past = async (daysAgo: number) => {
    setBusy(daysAgo); setMsg('');
    const day = ymdUTC(Date.now() - daysAgo * 864e5);
    const r = await v3<{ seed: string; no: number }>('daily.seed', { day });
    setBusy(-1);
    if (!r.ok) { setMsg(t('practice.archiveNeedNet')); return; }
    begin(r.seed, t('front.dailyNo', { n: r.no }));
  };
  // Replays use the server's published seed (daily.seed), which exists from the first Daily (1 Sep 2026) up to yesterday.
  const pastDays = [1, 2, 3, 4, 5, 6, 7].filter((d) => ymdUTC(Date.now() - d * 864e5) >= FIRST_DAILY);
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return <div className="g-screen practice3 pr3 fit">
    <TopBar back={{ label: t('g.tabs.home'), onClick: () => chrome.go({ n: 'front' }) }} title={t('nav.practice')} onMenu={chrome.openSettings} />
    <div className="fit__body">
      <section className="g-hero g-hero--practice pr3__hero">
        <span className="g-hero__art" aria-hidden="true"><Icon n="target" /></span>
        <span className="g-mono g-hero__k">{t('c38.pr.k')} · {t('g.practice.played', { n: s.practice.played })}</span>
        <h1 className="g-hero__t">{t('c38.pr.hed')}</h1>
        <p className="g-hero__s">{t('c38.pr.sub')}</p>
        <div className="pr3__acts">
          {s.practice.live && <GBtn kind="dark" onClick={() => chrome.go({ n: 'play', mode: 'practice', key: Date.now() })}><Icon n="uturn" size={22} />{t('practice.resume')}<small>{s.practice.live.label || s.practice.live.seed}</small></GBtn>}
          <GBtn kind="green" size="lg" shine pulse={!s.practice.live} sound="open" onClick={() => begin(randomSeed())}><Icon n="bolt" size={24} />{t('practice.random')}</GBtn>
        </div>
      </section>

      <button className={'coach3 g-card g-card--desk' + (s.practice.coach ? ' is-on' : '')} onClick={() => { sfx('ui.tap'); update((x) => { x.practice.coach = !x.practice.coach; }); }} role="switch" aria-checked={s.practice.coach}>
        <span className="coach3__ic"><Icon n="eye" /></span>
        <span className="coach3__t"><b>{t('practice.coach')}</b><small>{s.practice.coach ? t('c38.pr.coachOn') : t('c38.pr.coachOff')}</small></span>
        <span className={'g-toggle' + (s.practice.coach ? ' is-on' : '')} aria-hidden="true"><span /></span>
      </button>

      <ul className="pr3__tools g-mono" aria-label={t('c38.pr.tools')}>
        {(['t1', 't2', 't3', 't4'] as const).map((k, i) => <li key={k}><Icon n={['eye', 'help', 'news', 'ticket'][i]} size={14} />{t('c38.pr.' + k)}</li>)}
      </ul>

      <form className="seedform g-card pr3__code" onSubmit={(e) => { e.preventDefault(); if (clean.length >= 4) { sfx('open'); begin(clean); } }}>
        <span className="seedform__h"><span className="rcard__ic rcard__ic--green"><Icon n="ticket" /></span><span><b className="g-h2">{t('g.practice.codeT')}</b><small className="g-sub">{t('practice.codeD')}</small></span></span>
        <div className="seedform__row">
          <input className="codebox codebox--sm" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="K7Q2PX" maxLength={20} aria-label={t('practice.code')} autoCapitalize="characters" spellCheck={false} />
          <button type="submit" className="g-btn g-btn--green seedform__go" disabled={clean.length < 4}><Icon n="arrow" size={22} /><span className="sr-only">{t('practice.play')}</span></button>
        </div>
      </form>

      {pastDays.length > 0 && <>
      <div className="g-sec pr3__sec"><h2>{t('g.practice.pastT')}</h2><span className="g-mono">{t('c38.pr.t3')}</span></div>
      <div className="pastgrid pr3__past">
        {pastDays.map((d) => { const ms = Date.now() - d * 864e5; return <button key={d} className={'past' + (busy === d ? ' is-busy' : '')} onClick={() => { sfx('ui.tap'); past(d); }} disabled={busy >= 0}>
          <span className="past__dow g-mono">{fmtDate(ms, t.lang, { weekday: 'short' })}</span>
          <b className="past__d g-num">{fmtDate(ms, t.lang, { day: 'numeric' })}</b>
          <span className="past__m g-mono">{fmtDate(ms, t.lang, { month: 'short' })}</span>
          <span className="past__ago">{busy === d ? <Icon n="clock" size={14} /> : t('g.practice.ago', { n: d })}</span>
        </button>; })}
      </div>
      </>}
      {msg && <p className="g-err" role="alert"><Icon n="x" size={16} />{msg}</p>}
    </div>
  </div>;
}
