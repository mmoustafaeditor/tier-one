import { useState } from 'react';
import { useT, LANGS } from '../lib/i18n';
import { useSave, update } from '../lib/save';
import { Sheet, Btn, Arr } from '../ui/bits';
import type { Go } from '../App';

export function SettingsSheet({ open, onClose, go }: { open: boolean; onClose: () => void; go: Go }) {
  const t = useT();
  const s = useSave();
  const [nick, setNick] = useState(s.nick);
  return <Sheet open={open} onClose={onClose} label={t('common.settings')}>
    <div className="sheet__body settings">
      <h2 className="hed hed--2">{t('common.settings')}</h2>
      <div className="field"><div className="label"><span>{t('common.language')}</span></div>
        <div className="seg">{LANGS.map(([k, n]) => <button key={k} lang={k} aria-pressed={s.lang === k} onClick={() => update((x) => { x.lang = k; })}>{n}</button>)}</div></div>
      <div className="field"><div className="label"><span>{t('common.edition')}</span></div>
        <div className="seg">{([['', t('brand.auto')], ['morning', t('brand.morning')], ['late', t('brand.late')]] as const).map(([k, n]) => <button key={k} aria-pressed={s.edition === k} onClick={() => update((x) => { x.edition = k; })}>{n}</button>)}</div></div>
      <div className="toggle-row"><div className="label" style={{ color: 'var(--ink)' }}>{t('common.sound')}</div><button className="switch" role="switch" aria-checked={s.sound} onClick={() => update((x) => { x.sound = !x.sound; })}><span /></button></div>
      <div className="toggle-row"><div className="label" style={{ color: 'var(--ink)' }}>{t('common.motion')}</div><button className="switch" role="switch" aria-checked={s.reduced} onClick={() => update((x) => { x.reduced = !x.reduced; })}><span /></button></div>
      <div className="field"><div className="label"><span>{t('common.nick')}</span></div>
        <form className="codeform" onSubmit={(e) => { e.preventDefault(); update((x) => { x.nick = nick.trim().slice(0, 16); }); }}><input className="input" value={nick} maxLength={16} onChange={(e) => setNick(e.target.value)} aria-label={t('common.nick')} /><Btn kind="ghost" type="submit" className="btn--inline">{t('common.save')}</Btn></form>
        <p className="note">{t('common.nickHint')}</p></div>
      <Btn kind="quiet" onClick={() => { onClose(); go({ n: 'howto' }); }}>{t('nav.howto')} <Arr /></Btn>
      <p className="meta" style={{ marginTop: 12 }}>Tier One {__APP_VERSION__} · {__BUILD__}</p>
    </div>
  </Sheet>;
}
