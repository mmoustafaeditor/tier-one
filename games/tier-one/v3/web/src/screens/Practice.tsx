// Practice (DESIGN §5): off the record, any seed, Coach mode shows the exact odds. Replays past Dailies once their
// seed is published (the day after). 3.1: a green hero with one big button, a Coach toggle card, compact replays.
import { useState } from 'react';
import { useT, fmtDate } from '../lib/i18n';
import { useSave, update } from '../lib/save';
import { randomSeed } from '../lib/driver';
import { v3 } from '../lib/api';
import { ymdUTC } from '../lib/meta';
import { sfx } from '../lib/sfx';
import { Icon, GBtn, TopBar, Kit } from '../ui/game';
import type { Chrome } from '../App';
import { WeekEventBanner } from '../ui/season';

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
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return <div className="g-screen practice3">
    <TopBar back={{ label: t('g.tabs.home'), onClick: () => chrome.go({ n: 'front' }) }} title={t('nav.practice')} onMenu={chrome.openSettings} />
    <div className="stagger g-stack">
      <section className="g-hero g-hero--practice" style={{ ['--i' as string]: 0 }}>
        <span className="g-hero__art" aria-hidden="true"><Icon n="target" /></span>
        <span className="g-mono g-hero__k">{t('g.practice.k')} · {t('g.practice.played', { n: s.practice.played })}</span>
        <h1 className="g-hero__t">{t('g.practice.hed')}</h1>
        <p className="g-hero__s">{t('g.practice.sub')}</p>
        <div className="pkits" aria-hidden="true">{[0, 1, 2, 3, 4].map((k) => <span key={k} style={{ ['--r' as string]: [-7, 4, -2, 6, -4][k] + 'deg', animationDelay: 100 + k * 70 + 'ms' }}><Kit mystery size={44} /></span>)}</div>
        {s.practice.live && <GBtn kind="dark" onClick={() => chrome.go({ n: 'play', mode: 'practice', key: Date.now() })} style={{ marginBottom: 12 }}><Icon n="uturn" size={22} />{t('practice.resume')}<small>{s.practice.live.label || s.practice.live.seed}</small></GBtn>}
        <GBtn kind="green" size="lg" shine pulse={!s.practice.live} sound="open" onClick={() => begin(randomSeed())}><Icon n="bolt" size={24} />{t('practice.random')}</GBtn>
      </section>

      <button className={'coach3 g-card g-card--desk' + (s.practice.coach ? ' is-on' : '')} style={{ ['--i' as string]: 1 }} onClick={() => { sfx('ui.tap'); update((x) => { x.practice.coach = !x.practice.coach; }); }} role="switch" aria-checked={s.practice.coach}>
        <span className="coach3__ic"><Icon n="eye" /></span>
        <span className="coach3__t"><b>{t('practice.coach')}</b><small>{s.practice.coach ? t('g.practice.coachOn') : t('g.practice.coachOff')}</small><span className="coach3__d">{t('practice.coachD')}</span></span>
        <span className={'g-toggle' + (s.practice.coach ? ' is-on' : '')} aria-hidden="true"><span /></span>
      </button>

      <WeekEventBanner onPlay={() => chrome.go({ n: 'practice' })} />

      <form className="seedform g-card" style={{ ['--i' as string]: 2 }} onSubmit={(e) => { e.preventDefault(); if (clean.length >= 4) { sfx('open'); begin(clean); } }}>
        <span className="seedform__h"><span className="rcard__ic rcard__ic--green"><Icon n="ticket" /></span><span><b className="g-h2">{t('g.practice.codeT')}</b><small className="g-sub">{t('practice.codeD')}</small></span></span>
        <div className="seedform__row">
          <input className="codebox codebox--sm" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="K7Q2PX" maxLength={20} aria-label={t('practice.code')} autoCapitalize="characters" spellCheck={false} />
          <button type="submit" className="g-btn g-btn--green seedform__go" disabled={clean.length < 4}><Icon n="arrow" size={22} /><span className="sr-only">{t('practice.play')}</span></button>
        </div>
      </form>

      <div className="g-sec" style={{ ['--i' as string]: 3 }}><h2>{t('g.practice.pastT')}</h2><span className="g-chip g-chip--concept">{t('common.concept')}</span></div>
      <div className="pastgrid" style={{ ['--i' as string]: 3 }}>
        {[1, 2, 3, 4, 5, 6, 7].map((d) => { const ms = Date.now() - d * 864e5; return <button key={d} className={'past' + (busy === d ? ' is-busy' : '')} onClick={() => { sfx('ui.tap'); past(d); }} disabled={busy >= 0}>
          <span className="past__dow g-mono">{fmtDate(ms, t.lang, { weekday: 'short' })}</span>
          <b className="past__d g-num">{fmtDate(ms, t.lang, { day: 'numeric' })}</b>
          <span className="past__m g-mono">{fmtDate(ms, t.lang, { month: 'short' })}</span>
          <span className="past__ago">{busy === d ? <Icon n="clock" size={14} /> : t('g.practice.ago', { n: d })}</span>
        </button>; })}
      </div>
      <p className="g-fine" style={{ ['--i' as string]: 4 }}>{t('practice.archiveD')}</p>
      {msg && <p className="g-err" role="alert"><Icon n="x" size={16} />{msg}</p>}
    </div>
  </div>;
}
