// 4.1 Practice (UI41; RULES4.md §2): one screen, no scroll. Off the record, the Daily's rules exactly, the Coach shows
// the odds in words. New window (the main button), Resume, the Coach switch, a friend's code, and a row of past
// Dailies. Every window starts through lib/driver.ts makeDriver and plays on the Daily Challenge screen (Window.tsx).
import { useState } from 'react';
import { useT, fmtDate } from '../lib/i18n';
import { useSave, update } from '../lib/save';
import { makeDriver, randomSeed, liveWindow, dayOfLog, oddsWords } from '../lib/driver';
import { V4_FROM } from '../lib/engine';
import { v3 } from '../lib/api';
import { ymdUTC } from '../lib/meta';
import { sfx } from '../lib/sfx';
import { Pop } from '../ui/juice';
import { Screen } from '../ui/screen';
import type { Chrome } from '../App';
import '../styles/daily41.css';

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
    void begin(r.seed, t('d41.win.dailyN', { n: r.no }));
  };
  const pastDays = [1, 2, 3, 4, 5, 6, 7].filter((d) => ymdUTC(Date.now() - d * 864e5) >= V4_FROM);
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return <div className="d41"><Screen title={t('d41.prac.title')} sub={t('d41.prac.played', { n: played })} onBack={chrome.home}
    footer={<Pop className="d41-btn d41-btn--big" onTap={() => { void begin(randomSeed()); }} sound="os.open">{t('d41.prac.new')}</Pop>}>
    <div className="d41-lede"><b>{t('d41.prac.hed')}</b><p>{t('d41.prac.sub')}</p></div>
    {live && <Pop className="d41-card d41-card--go" onTap={play}>
      <span><b>{t('d41.prac.resume', { d: dayOfLog(live.log) })}</b><small className="g-num">{live.label || live.seed}</small></span><i aria-hidden="true">{t.rtl ? '‹' : '›'}</i>
    </Pop>}
    <button type="button" className={'d41-card d41-switch' + (coach ? ' is-on' : '')} role="switch" aria-checked={coach}
      onClick={() => { sfx('ui.tap'); update((x) => { const v = (x.v4 = x.v4 || {}); v.practice = { ...(v.practice || {}), coach: !coach }; }); }}>
      <span><b>{t('coach4.name')}</b><small>{coach ? t('d41.prac.coachOn', { ex: t('coach4.line', { out: t('out4.signs'), odds: oddsWords(t.lang, 0.7) }) }) : t('d41.prac.coachOff')}</small></span>
      <i className="d41-toggle" aria-hidden="true" />
    </button>
    <form className="d41-card d41-code" onSubmit={(e) => { e.preventDefault(); if (clean.length >= 4) { sfx('os.open'); void begin(clean); } }}>
      <label><b>{t('d41.prac.code')}</b><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="K7Q2PX" maxLength={20} autoCapitalize="characters" spellCheck={false} /></label>
      <button type="submit" className="d41-btn" disabled={clean.length < 4}>{t('d41.prac.play')}</button>
    </form>
    {pastDays.length > 0 && <div className="d41-past" aria-label={t('d41.prac.past')}>
      <small>{t('d41.prac.past')}</small>
      <div>{pastDays.map((d) => { const ms = Date.now() - d * 864e5; return <button key={d} type="button" className={busy === d ? 'is-busy' : ''} disabled={busy >= 0} onClick={() => { sfx('ui.tap'); void past(d); }}>
        <small>{fmtDate(ms, t.lang, { weekday: 'short' })}</small><b className="g-num">{fmtDate(ms, t.lang, { day: 'numeric' })}</b>
      </button>; })}</div>
    </div>}
    {msg && <p className="d41-err" role="alert">{msg}</p>}
  </Screen></div>;
}
