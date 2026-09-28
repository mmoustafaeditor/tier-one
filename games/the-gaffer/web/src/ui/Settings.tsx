// Settings (device: language, match speed, first live tab; career: realism / balance), How to play, Privacy.
import type { Strings, UiLang } from '../i18n';
import type { Balance, Career } from '../model/types';
import type { Prefs } from '../sim/prefs';
import { DEFAULT_BALANCE, INJURY_MULTS, MULTS, balanceOf } from '../sim/balance';
import { AppBar } from './parts';

import { BUILD } from '../update';
declare const __APP_VERSION__: string;

const LANGS: [UiLang, string][] = [['en', 'English'], ['ar', 'العربية'], ['es', 'Español'], ['fr', 'Français']];

function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map(([v, label]) => <button key={String(v)} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>{label}</button>)}
    </div>
  );
}

const x = (n: number) => `\u2066×${n}\u2069`;

export function Settings({ prefs, career, t, langs, onPrefs, onBalance, onBack, onHowTo, onPrivacy }: {
  prefs: Prefs; career: Career | null; t: Strings; langs: UiLang[];
  onPrefs: (p: Prefs) => void; onBalance: (b: Balance) => void; onBack: () => void; onHowTo: () => void; onPrivacy: () => void;
}) {
  const b = balanceOf(career);
  const set = <K extends keyof Balance>(k: K, v: Balance[K]) => onBalance({ ...b, [k]: v });
  const row = (label: string, el: React.ReactNode) => (
    <div className="g-setrow"><span className="over">{label}</span>{el}</div>
  );
  return (
    <>
      <AppBar back={onBack} backLabel={t.back} title={t.settings} />
      <div className="sechead"><span className="over">{t.languageT}</span></div>
      <Seg value={prefs.lang} options={LANGS.filter(([l]) => langs.includes(l))} onChange={(lang) => onPrefs({ ...prefs, lang })} />

      <div className="sechead"><span className="over">{t.matchPrefs}</span></div>
      <div className="card g-setcard">
        {row(t.defaultSpeed, <Seg value={prefs.speed} options={[[0, '1X'], [1, '2X'], [2, '4X']]} onChange={(speed) => onPrefs({ ...prefs, speed })} />)}
        {row(t.cameraT, <Seg value={prefs.camera} options={[[0, '2D'], [1, '2.5D'], [2, '3D']]} onChange={(camera) => onPrefs({ ...prefs, camera })} />)}
        {row(t.openOn, <Seg value={prefs.openOn} options={[[0, t.pitchT], [1, t.feed]]} onChange={(openOn) => onPrefs({ ...prefs, openOn })} />)}
      </div>

      {career && (
        <>
          <div className="sechead"><span className="over">{t.balanceT}</span></div>
          <div className="card g-setcard">
            <small className="muted">{t.balanceSub}</small>
            {row(t.balanceRows.income, <Seg value={b.income} options={MULTS.map((m) => [m, x(m)])} onChange={(v) => set('income', v)} />)}
            {row(t.balanceRows.wages, <Seg value={b.wages} options={MULTS.map((m) => [m, x(m)])} onChange={(v) => set('wages', v)} />)}
            {row(t.balanceRows.prices, <Seg value={b.prices} options={MULTS.map((m) => [m, x(m)])} onChange={(v) => set('prices', v)} />)}
            {row(t.balanceRows.injuries, <Seg value={b.injuries} options={INJURY_MULTS.map((m, i) => [m, t.injuryLv[i]])} onChange={(v) => set('injuries', v)} />)}
            {row(t.balanceRows.difficulty, <Seg value={b.difficulty} options={([-1, 0, 1] as const).map((m) => [m, t.difficultyLv[m + 1]])} onChange={(v) => set('difficulty', v)} />)}
            {row(t.balanceRows.patience, <Seg value={b.patience} options={([-1, 0, 1] as const).map((m) => [m, t.patienceLv[m + 1]])} onChange={(v) => set('patience', v)} />)}
            <button className="btn ghost sm" disabled={JSON.stringify(b) === JSON.stringify(DEFAULT_BALANCE)} onClick={() => onBalance(DEFAULT_BALANCE)}>{t.resetBalance}</button>
          </div>
        </>
      )}

      <div className="sechead" />
      <div className="list">
        <button className="cell" onClick={onHowTo}><span className="cmain"><b>{t.howTo}</b><span>{t.howToSub}</span></span></button>
        <button className="cell" onClick={onPrivacy}><span className="cmain"><b>{t.privacy}</b><span>{t.privacySub}</span></span></button>
      </div>
      <div className="sechead"><span className="over">{t.aboutT}</span></div>
      <p className="muted" style={{ margin: 0 }}>The Gaffer · {t.versionT(__APP_VERSION__)} · build {BUILD}<br />{t.madeBy}</p>
    </>
  );
}

export function TextPage({ title, body, foot, t, onBack }: { title: string; body: [string, string][]; foot?: string; t: Strings; onBack: () => void }) {
  return (
    <>
      <AppBar back={onBack} backLabel={t.back} title={title} />
      <div className="sechead" />
      <div className="list">
        {body.map(([h, p], i) => (
          <div key={i} className="cell g-row g-textrow">
            <span className="cmain"><b>{i + 1}. {h}</b><span>{p}</span></span>
          </div>
        ))}
      </div>
      {foot && <p className="muted" style={{ marginTop: 'var(--s3)' }}><small>{foot}</small></p>}
    </>
  );
}
