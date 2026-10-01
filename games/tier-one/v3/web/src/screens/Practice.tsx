// Practice (RULES4.md §2): off the record, 4.0 rules exactly, the Coach shows the odds in words ("about 7 in 10").
// A random window, a past Daily (from the 4.0 cutover, once its seed is published the day after) or a friend's code.
// Every window starts through lib/driver.ts makeDriver, which keeps it in save.v4.live.practice until it's over.
import { useState } from 'react';
import { useT, fmtDate } from '../lib/i18n';
import { useSave, update } from '../lib/save';
import { makeDriver, randomSeed, liveWindow, dayOfLog, oddsWords } from '../lib/driver';
import { V4_FROM } from '../lib/engine';
import { v3 } from '../lib/api';
import { ymdUTC } from '../lib/meta';
import { sfx } from '../lib/sfx';
import { Icon, GBtn, TopBar, Kit } from '../ui/game';
import type { Chrome } from '../App';

export function PracticeScreen(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(-1);
  const coach = s.v4?.practice?.coach !== false;
  const live = liveWindow('practice', s);
  const played = s.v4?.practice?.played || 0;
  const play = () => chrome.go({ n: 'play', mode: 'practice', key: Date.now() });
  const begin = async (seed: string, label?: string) => {
    const d = makeDriver({ mode: 'practice', seed, label, coach, resume: false });
    await d.start();
    play();
  };
  const past = async (daysAgo: number) => {
    setBusy(daysAgo); setMsg('');
    const day = ymdUTC(Date.now() - daysAgo * 864e5);
    const r = await v3<{ seed: string; no: number; v?: number }>('daily.seed', { day });
    setBusy(-1);
    if (!r.ok) { setMsg(t('prac4.net')); return; }
    if (r.v !== 4) { setMsg(t('prac4.old', { d: V4_FROM })); return; }
    void begin(r.seed, t('front.dailyNo', { n: r.no }));
  };
  // Replays use the server's published seed (daily.seed): 4.0 Dailies only, from the cutover up to yesterday.
  const pastDays = [1, 2, 3, 4, 5, 6, 7].filter((d) => ymdUTC(Date.now() - d * 864e5) >= V4_FROM);
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return <div className="g-screen practice3">
    <TopBar back={{ label: t('g.tabs.home'), onClick: () => chrome.go({ n: 'front' }) }} title={t('prac4.title')} onMenu={chrome.openSettings} />
    <div className="stagger g-stack">
      <section className="g-hero g-hero--practice" style={{ ['--i' as string]: 0 }}>
        <span className="g-hero__art" aria-hidden="true"><Icon n="target" /></span>
        <span className="g-mono g-hero__k">{t('prac4.k')} · {t('prac4.played', { n: played })}</span>
        <h1 className="g-hero__t">{t('prac4.hed')}</h1>
        <p className="g-hero__s">{t('prac4.sub')}</p>
        <div className="pkits" aria-hidden="true">{[0, 1, 2, 3, 4].map((k) => <span key={k} style={{ ['--r' as string]: [-7, 4, -2, 6, -4][k] + 'deg', animationDelay: 100 + k * 70 + 'ms' }}><Kit mystery size={44} /></span>)}</div>
        {live && <GBtn kind="dark" onClick={play} style={{ marginBottom: 12 }}><Icon n="uturn" size={22} />{t('prac4.resume', { d: dayOfLog(live.log) })}<small>{live.label || live.seed}</small></GBtn>}
        <GBtn kind="green" size="lg" shine pulse={!live} sound="open" onClick={() => { void begin(randomSeed()); }}><Icon n="bolt" size={24} />{t('prac4.random')}</GBtn>
      </section>

      <button className={'coach3 g-card g-card--desk' + (coach ? ' is-on' : '')} style={{ ['--i' as string]: 1 }} onClick={() => { sfx('ui.tap'); update((x) => { const v = (x.v4 = x.v4 || {}); v.practice = { ...(v.practice || {}), coach: !coach }; }); }} role="switch" aria-checked={coach}>
        <span className="coach3__ic"><Icon n="eye" /></span>
        <span className="coach3__t"><b>{t('coach4.name')}</b><small>{coach ? t('coach4.on') : t('coach4.off')}</small><span className="coach3__d">{t('coach4.d')} {t('coach4.line', { out: t('out4.signs'), odds: oddsWords(t.lang, 0.7) })}.</span></span>
        <span className={'g-toggle' + (coach ? ' is-on' : '')} aria-hidden="true"><span /></span>
      </button>

      <form className="seedform g-card" style={{ ['--i' as string]: 2 }} onSubmit={(e) => { e.preventDefault(); if (clean.length >= 4) { sfx('open'); void begin(clean); } }}>
        <span className="seedform__h"><span className="rcard__ic rcard__ic--green"><Icon n="ticket" /></span><span><b className="g-h2">{t('prac4.codeT')}</b><small className="g-sub">{t('prac4.codeD')}</small></span></span>
        <div className="seedform__row">
          <input className="codebox codebox--sm" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="K7Q2PX" maxLength={20} aria-label={t('prac4.code')} autoCapitalize="characters" spellCheck={false} />
          <button type="submit" className="g-btn g-btn--green seedform__go" disabled={clean.length < 4}><Icon n="arrow" size={22} /><span className="sr-only">{t('prac4.go')}</span></button>
        </div>
        {live && <p className="g-fine">{t('prac4.share')} · <b className="g-mono">{live.seed}</b></p>}
      </form>

      {pastDays.length > 0 && <>
      <div className="g-sec" style={{ ['--i' as string]: 3 }}><h2>{t('prac4.pastT')}</h2></div>
      <div className="pastgrid" style={{ ['--i' as string]: 3 }}>
        {pastDays.map((d) => { const ms = Date.now() - d * 864e5; return <button key={d} className={'past' + (busy === d ? ' is-busy' : '')} onClick={() => { sfx('ui.tap'); void past(d); }} disabled={busy >= 0}>
          <span className="past__dow g-mono">{fmtDate(ms, t.lang, { weekday: 'short' })}</span>
          <b className="past__d g-num">{fmtDate(ms, t.lang, { day: 'numeric' })}</b>
          <span className="past__m g-mono">{fmtDate(ms, t.lang, { month: 'short' })}</span>
          <span className="past__ago">{busy === d ? <Icon n="clock" size={14} /> : t('prac4.ago', { n: d })}</span>
        </button>; })}
      </div>
      <p className="g-fine" style={{ ['--i' as string]: 4 }}>{t('prac4.pastD')}</p>
      </>}
      {msg && <p className="g-err" role="alert"><Icon n="x" size={16} />{msg}</p>}
    </div>
  </div>;
}
