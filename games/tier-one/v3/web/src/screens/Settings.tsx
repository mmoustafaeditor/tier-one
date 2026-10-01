// Settings (UI41.md "The phone" › Settings): language, sound, motion, light/dark, your handle, How to play, restore
// purchases and the version, on one screen with no scroll.
import { useState } from 'react';
import { useT, LANGS } from '../lib/i18n';
import { useSave, update } from '../lib/save';
import { sfx } from '../lib/sfx';
import { checkPurchase, MONET } from '../lib/monet';
import { reconcile } from '../lib/wallet';
import { Toggle, Seg } from '../ui/screenbits';
import { Screen } from '../ui/screen';
import type { Chrome } from '../App';

export function SettingsScreen(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const [nick, setNick] = useState(s.nick);
  const [saved, setSaved] = useState(false);
  const [restore, setRestore] = useState<'' | 'busy' | 'ok' | 'none' | 'off'>('');
  const clean = nick.replace(/^@+/, '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 16);
  const saveNick = () => { if (clean.length < 3) { sfx('bad'); return; } update((x) => { x.nick = clean; }); sfx('ui.pop'); setSaved(true); setTimeout(() => setSaved(false), 1600); };
  const doRestore = async () => {
    if (restore === 'busy') return;
    if (!MONET.enabled) { setRestore('off'); return; }
    setRestore('busy'); sfx('ui.tap');
    try { const r = await checkPurchase(); const w = await reconcile(); setRestore(r?.ok || w ? 'ok' : 'none'); if (r?.ok || w) sfx('deal'); } catch { setRestore('none'); }
  };
  return <Screen title={t('s41.app.settings')} onBack={chrome.back}>
    <div className="st-langs" role="radiogroup" aria-label={t('os.settings.language')}>
      {LANGS.map(([k, n]) => <button key={k} type="button" lang={k} role="radio" aria-checked={s.lang === k} className={s.lang === k ? 'on' : ''} onClick={() => { sfx('ui.tap'); update((x) => { x.lang = k; }); }}>{n}</button>)}
    </div>
    <div className="st-row"><span>{t('os.settings.sound')}</span><Toggle on={s.sound} label={t('os.settings.sound')} onChange={() => update((x) => { x.sound = !x.sound; })} /></div>
    <div className="st-row"><span>{t('os.settings.motion')}</span><Toggle on={s.reduced} label={t('os.settings.motion')} onChange={() => update((x) => { x.reduced = !x.reduced; })} /></div>
    <div className="st-row st-row--seg"><span>{t('os.settings.theme')}</span>
      <Seg value={s.edition} label={t('os.settings.theme')} onChange={(v) => update((x) => { x.edition = v; })} options={[{ v: '' as const, label: t('os.settings.auto') }, { v: 'late' as const, label: t('os.settings.dark') }, { v: 'morning' as const, label: t('os.settings.light') }]} />
    </div>
    <form className="st-row st-nick" onSubmit={(e) => { e.preventDefault(); saveNick(); }}>
      <label dir="ltr"><span aria-hidden="true">@</span><input value={nick} maxLength={17} autoCapitalize="off" autoCorrect="off" spellCheck={false} onChange={(e) => setNick(e.target.value)} aria-label={t('os.settings.handle')} /></label>
      <button type="submit" className="s41-btn s41-btn--sm" disabled={clean === s.nick || clean.length < 3}>{saved ? t('os.settings.saved') : t('os.settings.save')}</button>
    </form>
    <button type="button" className="st-link" onClick={() => chrome.go({ n: 'howto' })}><span>{t('s41.howto')}</span><i aria-hidden="true">›</i></button>
    <button type="button" className="st-link" onClick={doRestore} aria-busy={restore === 'busy'}>
      <span>{t('os.settings.restore')}{restore && <small>{t('os.settings.' + ({ busy: 'restoring', ok: 'restored', none: 'restoreNone', off: 'restoreOff' } as Record<string, string>)[restore])}</small>}</span><i aria-hidden="true">›</i>
    </button>
    <p className="st-about">{t('os.settings.version', { v: __APP_VERSION__, b: __BUILD__ })} · {t('os.settings.studio')}</p>
  </Screen>;
}
