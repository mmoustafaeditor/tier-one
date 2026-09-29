// Practice (DESIGN §5): off the record, any seed, Coach mode shows the exact odds. Replays past Dailies once their
// seed is published (the day after).
import { useState } from 'react';
import { useT, fmtDate } from '../lib/i18n';
import { useSave, update } from '../lib/save';
import { randomSeed } from '../lib/driver';
import { v3 } from '../lib/api';
import { ymdUTC } from '../lib/meta';
import { Bar } from '../ui/chrome';
import { Flag, Btn, Arr } from '../ui/bits';
import type { Chrome } from '../App';

export function PracticeScreen(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const begin = (seed: string, label?: string) => {
    update((x) => { x.practice.live = { seed, mode: 'practice', log: [], started: Date.now(), coach: x.practice.coach, label }; });
    chrome.go({ n: 'play', mode: 'practice', key: Date.now() });
  };
  const past = async (daysAgo: number) => {
    const day = ymdUTC(Date.now() - daysAgo * 864e5);
    const r = await v3<{ seed: string; no: number }>('daily.seed', { day });
    if (!r.ok) { setMsg(t('practice.archiveNeedNet')); return; }
    begin(r.seed, t('front.dailyNo', { n: r.no }));
  };
  return <div className="page practice">
    <Bar chrome={chrome} back={{ label: t('nav.front') }} cur="front" end={<span className="meta">{t('practice.played', { n: s.practice.played })}</span>} />
    <div className="cols cols--2">
      <main>
        <section className="head"><div className="kicker">{t('practice.kicker')}</div><h1 className="hed hed--1">{t('practice.hed')}</h1></section>
        <div className="toggle-row">
          <div><div className="label" style={{ color: 'var(--ink)' }}>{t('practice.coach')}</div><p className="note">{t('practice.coachD')}</p></div>
          <button className="switch" role="switch" aria-checked={s.practice.coach} onClick={() => update((x) => { x.practice.coach = !x.practice.coach; })}><span /></button>
        </div>
        {s.practice.live && <Btn kind="accent" style={{ marginTop: 16 }} onClick={() => chrome.go({ n: 'play', mode: 'practice', key: Date.now() })}>{t('practice.resume')} · {s.practice.live.label || s.practice.live.seed} <Arr /></Btn>}
        <Btn kind="primary" style={{ marginTop: 10 }} onClick={() => begin(randomSeed())}>{t('practice.random')} <Arr /></Btn>
        <Flag title={t('practice.code')} />
        <p className="note">{t('practice.codeD')}</p>
        <form className="codeform" onSubmit={(e) => { e.preventDefault(); const c = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, ''); if (c.length >= 4) begin(c); }}>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="K7Q2PX" maxLength={20} aria-label={t('practice.code')} />
          <Btn kind="ghost" type="submit" className="btn--inline">{t('practice.play')}</Btn>
        </form>
      </main>
      <aside>
        <Flag title={t('practice.archive')} aside={t('common.concept')} />
        <p className="note">{t('practice.archiveD')}</p>
        {[1, 2, 3, 4, 5, 6, 7].map((d) => <button key={d} className="item item--link" onClick={() => past(d)}><span className="item__n">{d}</span><div><h3 className="item__hed">{fmtDate(Date.now() - d * 864e5, t.lang)}</h3></div><Arr /></button>)}
        {msg && <p className="note accent" style={{ marginTop: 8 }}>{msg}</p>}
      </aside>
    </div>
  </div>;
}
