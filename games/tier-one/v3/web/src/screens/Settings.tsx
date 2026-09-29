// Settings (a sheet): language picker, edition, game toggles for sound and motion, your byline, how to play.
import { useState } from 'react';
import { useT, LANGS } from '../lib/i18n';
import { useSave, update } from '../lib/save';
import { sfx } from '../lib/sfx';
import { Sheet } from '../ui/bits';
import { Icon } from '../ui/game';
import { Toggle, Avatar } from '../ui/screenbits';
import type { Go } from '../App';

const LANG_TAG: Record<string, string> = { en: 'EN', ar: 'ع', es: 'ES' };

export function SettingsSheet({ open, onClose, go }: { open: boolean; onClose: () => void; go: Go }) {
  const t = useT();
  const s = useSave();
  const [nick, setNick] = useState(s.nick);
  const [saved, setSaved] = useState(false);
  const saveNick = () => { update((x) => { x.nick = nick.trim().slice(0, 16); }); sfx('ui.pop'); setSaved(true); setTimeout(() => setSaved(false), 1600); };
  return <Sheet open={open} onClose={onClose} label={t('common.settings')}>
    <div className="gset">
      <div className="gset__head">
        <span><span className="g-mono">{t('g.settings.k')}</span><h2 className="g-h2">{t('common.settings')}</h2></span>
        <button className="g-icbtn" onClick={onClose} aria-label={t('common.close')}><Icon n="x" /></button>
      </div>

      <h3 className="gset__t">{t('common.language')}</h3>
      <div className="langs" role="radiogroup" aria-label={t('common.language')}>
        {LANGS.map(([k, n]) => <button key={k} lang={k} role="radio" aria-checked={s.lang === k} onClick={() => { sfx('ui.tap'); update((x) => { x.lang = k; }); }}>
          <span className="langs__tag">{LANG_TAG[k]}</span><b>{n}</b>{s.lang === k && <Icon n="check" size={16} />}
        </button>)}
      </div>

      <h3 className="gset__t">{t('common.edition')}</h3>
      <div className="eds" role="radiogroup" aria-label={t('common.edition')}>
        {([['', 'auto', 'gear'], ['morning', 'morning', 'star'], ['late', 'late', 'moon']] as const).map(([k, lab, ic]) => <button key={k} role="radio" aria-checked={s.edition === k} title={k === '' ? t('brand.auto') : k === 'morning' ? t('brand.morning') : t('brand.late')} onClick={() => { sfx('ui.tap'); update((x) => { x.edition = k; }); }}>
          <span className={'eds__sw eds__sw--' + lab}><Icon n={ic} size={18} /></span><b>{t('g.settings.edition.' + lab)}</b>
        </button>)}
      </div>

      <div className="gset__rows">
        <div className="trow"><span className="trow__ic"><Icon n="sound" /></span><span className="trow__t"><b>{t('common.sound')}</b><small>{t('g.settings.soundD')}</small></span><Toggle on={s.sound} label={t('common.sound')} onChange={() => update((x) => { x.sound = !x.sound; })} /></div>
        <div className="trow"><span className="trow__ic"><Icon n="eye" /></span><span className="trow__t"><b>{t('common.motion')}</b><small>{t('g.settings.motionD')}</small></span><Toggle on={s.reduced} label={t('common.motion')} onChange={() => update((x) => { x.reduced = !x.reduced; })} /></div>
      </div>

      <h3 className="gset__t">{t('common.nick')}</h3>
      <form className="nickrow" onSubmit={(e) => { e.preventDefault(); saveNick(); }}>
        <Avatar name={nick || '?'} size={42} me />
        <input className="g-input" value={nick} maxLength={16} onChange={(e) => setNick(e.target.value)} aria-label={t('common.nick')} />
        <button type="submit" className="g-btn g-btn--sm g-btn--gold nickrow__save">{saved ? <Icon n="check" size={18} /> : t('common.save')}</button>
      </form>
      <p className="gset__hint">{t('common.nickHint')}</p>

      <button className="g-btn g-btn--dark" style={{ marginTop: 18 }} onClick={() => { sfx('ui.tap'); onClose(); go({ n: 'howto' }); }}><Icon n="help" size={22} />{t('nav.howto')}</button>
      <p className="gset__ver g-mono">Tier One {__APP_VERSION__} · {__BUILD__}</p>
    </div>
  </Sheet>;
}
