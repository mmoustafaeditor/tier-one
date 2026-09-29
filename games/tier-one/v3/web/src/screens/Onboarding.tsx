import { useState } from 'react';
import { useT, LANGS } from '../lib/i18n';
import { update, useSave } from '../lib/save';
import { Btn, Arr } from '../ui/bits';
import type { Go } from '../App';

export function Onboarding({ go }: { go: Go }) {
  const t = useT();
  const s = useSave();
  const [nick, setNick] = useState(s.nick);
  const done = (to: 'daily' | 'practice') => { update((x) => { x.onboarded = true; x.nick = nick.trim().slice(0, 16); }); go({ n: to }); };
  return <div className="scrim scrim--solid"><div className="onb sheet sheet--float" role="dialog" aria-modal="true" aria-label={t('onb.kicker')}>
    <div className="sheet__body">
      <div className="seg seg--sm">{LANGS.map(([k, n]) => <button key={k} lang={k} aria-pressed={s.lang === k} onClick={() => update((x) => { x.lang = k; })}>{n}</button>)}</div>
      <div className="kicker" style={{ marginTop: 18 }}>{t('onb.kicker')}</div>
      <h1 className="hed hed--1" style={{ marginTop: 8 }}>{t('onb.hed')}</h1>
      <p className="dek" style={{ marginTop: 10 }}>{t('onb.body')}</p>
      <div className="field"><div className="label"><span>{t('onb.nick')}</span></div><input className="input" value={nick} maxLength={16} onChange={(e) => setNick(e.target.value)} aria-label={t('onb.nick')} placeholder="M. Moustafa" /></div>
      <Btn kind="accent" style={{ marginTop: 16 }} onClick={() => done('daily')}>{t('onb.go')} <Arr /></Btn>
      <Btn kind="quiet" style={{ marginTop: 6 }} onClick={() => done('practice')}>{t('onb.practice')}</Btn>
    </div>
  </div></div>;
}
