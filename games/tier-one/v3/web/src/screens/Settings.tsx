// Settings, the app (CONCEPT4.md §2): language, sound, motion, the phone theme, account (your handle), how to play,
// restore purchases, about. One list, big rows, nothing hidden. `SettingsSheet` stays for anything that still opens
// settings as a sheet (it wraps the same screen).
import { useState } from 'react';
import { useT, LANGS } from '../lib/i18n';
import { useSave, update } from '../lib/save';
import { sfx } from '../lib/sfx';
import { checkPurchase, MONET } from '../lib/monet';
import { reconcile } from '../lib/wallet';
import { Sheet } from '../ui/bits';
import { Icon, TopBar } from '../ui/game';
import { Toggle, Avatar, Seg } from '../ui/screenbits';
import { FilmSetting } from '../ui/film';
import { AppIcon } from '../ui/phone';
import type { Chrome, Go } from '../App';

const LANG_TAG: Record<string, string> = { en: 'EN', ar: 'ع', es: 'ES' };

export function SettingsScreen(chrome: Chrome) {
  const t = useT();
  return <div className="g-screen ph-set">
    <TopBar back={{ label: t('os.bar.home'), onClick: chrome.home }} title={t('os.settings.title')} />
    <SettingsBody go={chrome.go} />
  </div>;
}

function SettingsBody({ go, onClose }: { go: Go; onClose?: () => void }) {
  const t = useT();
  const s = useSave();
  const [nick, setNick] = useState(s.nick);
  const [saved, setSaved] = useState(false);
  const [restore, setRestore] = useState<'' | 'busy' | 'ok' | 'none' | 'off'>('');
  const saveNick = () => { update((x) => { x.nick = nick.trim().slice(0, 16); }); sfx('ui.pop'); setSaved(true); setTimeout(() => setSaved(false), 1600); };
  const doRestore = async () => {
    if (restore === 'busy') return;
    if (!MONET.enabled) { setRestore('off'); return; }
    setRestore('busy'); sfx('ui.tap');
    try { const r = await checkPurchase(); const w = await reconcile(); setRestore(r?.ok || w ? 'ok' : 'none'); if (r?.ok || w) sfx('deal'); } catch { setRestore('none'); }
  };
  return <div className="ph-set__body">
    <section className="ph-set__sec">
      <h3 className="ph-set__h g-mono">{t('os.settings.language')}</h3>
      <div className="langs" role="radiogroup" aria-label={t('os.settings.language')}>
        {LANGS.map(([k, n]) => <button key={k} lang={k} role="radio" aria-checked={s.lang === k} onClick={() => { sfx('ui.tap'); update((x) => { x.lang = k; }); }}>
          <span className="langs__tag">{LANG_TAG[k]}</span><b>{n}</b>{s.lang === k && <Icon n="check" size={16} />}
        </button>)}
      </div>
    </section>

    <section className="ph-set__sec">
      <h3 className="ph-set__h g-mono">{t('os.settings.k')}</h3>
      <div className="ph-set__rows">
        <div className="trow"><span className="trow__ic"><Icon n="sound" /></span><span className="trow__t"><b>{t('os.settings.sound')}</b><small>{t('os.settings.soundD')}</small></span><Toggle on={s.sound} label={t('os.settings.sound')} onChange={() => update((x) => { x.sound = !x.sound; })} /></div>
        <div className="trow"><span className="trow__ic"><Icon n="eye" /></span><span className="trow__t"><b>{t('os.settings.motion')}</b><small>{t('os.settings.motionD')}</small></span><Toggle on={s.reduced} label={t('os.settings.motion')} onChange={() => update((x) => { x.reduced = !x.reduced; })} /></div>
        <FilmSetting />
        <div className="trow trow--col"><span className="trow__t"><b>{t('os.settings.theme')}</b><small>{t('os.settings.themeD')}</small></span>
          <Seg value={s.edition} label={t('os.settings.theme')} onChange={(v) => update((x) => { x.edition = v; })} options={[{ v: '' as const, label: t('os.settings.auto') }, { v: 'late' as const, label: t('os.settings.dark') }, { v: 'morning' as const, label: t('os.settings.light') }]} />
        </div>
      </div>
    </section>

    <section className="ph-set__sec">
      <h3 className="ph-set__h g-mono">{t('os.settings.account')}</h3>
      <form className="nickrow" onSubmit={(e) => { e.preventDefault(); saveNick(); }}>
        <Avatar name={nick || '?'} size={42} me />
        <input className="g-input" value={nick} maxLength={16} onChange={(e) => setNick(e.target.value)} aria-label={t('os.settings.handle')} placeholder={t('os.settings.handle')} />
        <button type="submit" className="g-btn g-btn--sm g-btn--gold nickrow__save">{saved ? <Icon n="check" size={18} /> : t('os.settings.save')}</button>
      </form>
      <p className="gset__hint">{t('os.settings.handleHint')}</p>
      <p className="gset__hint g-mono">{t('os.settings.deviceId')}: {s.dev.slice(0, 8)}</p>
    </section>

    <section className="ph-set__sec ph-set__links">
      <button type="button" className="g-row" onClick={() => { sfx('ui.tap'); onClose?.(); go({ n: 'howto' }); }}><span className="g-row__ic"><Icon n="help" /></span><span className="g-row__b"><b>{t('os.settings.howto')}</b></span><span className="g-row__go"><Icon n="arrow" /></span></button>
      <button type="button" className="g-row" onClick={doRestore} aria-busy={restore === 'busy'}><span className="g-row__ic" style={{ ['--row-c' as string]: 'var(--gold)' }}><Icon n="gift" /></span><span className="g-row__b"><b>{t('os.settings.restore')}</b>{restore && <small>{t('os.settings.' + ({ busy: 'restoring', ok: 'restored', none: 'restoreNone', off: 'restoreOff' } as Record<string, string>)[restore])}</small>}</span><span className="g-row__go"><Icon n="arrow" /></span></button>
    </section>

    <section className="ph-set__sec ph-set__about">
      <AppIcon id="settings" size={44} />
      <h3 className="ph-set__h g-mono">{t('os.settings.about')}</h3>
      <p className="g-mono">{t('os.settings.version', { v: __APP_VERSION__, b: __BUILD__ })} · {t('os.settings.studio')}</p>
      <p>{t('os.settings.legal')}</p>
    </section>
  </div>;
}

/** Legacy entry: settings as a sheet (anything that still calls chrome.openSettings before App routes it to the app). */
export function SettingsSheet({ open, onClose, go }: { open: boolean; onClose: () => void; go: Go }) {
  const t = useT();
  return <Sheet open={open} onClose={onClose} label={t('os.settings.title')}>
    <div className="gset"><div className="gset__head"><span><span className="g-mono">{t('os.settings.k')}</span><h2 className="g-h2">{t('os.settings.title')}</h2></span><button className="g-icbtn" onClick={onClose} aria-label={t('common.close')}><Icon n="x" /></button></div><SettingsBody go={go} onClose={onClose} /></div>
  </Sheet>;
}
