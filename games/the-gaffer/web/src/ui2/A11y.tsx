// Accessibility settings (rework, handoff §A "accessibility entry before a career starts"): text size, reduced motion,
// stronger contrast. Kept in the device prefs (not the save), applied as attributes on <html> by App (`applyA11y`),
// so they work on the title screen, before any career exists.
import type { UiLang } from '../i18n';
import type { Prefs } from '../sim/prefs';
import { AX } from '../lang-a11y';
import { Seg, Switch } from './shell';

// The device asks for reduced motion: the switch shows on and the game stays calm whatever the pref says.
export const systemCalm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// True when anything should skip animation (used by script-driven effects too).
export const calmNow = () => systemCalm() || document.documentElement.dataset.calm === '1';

export function applyA11y(p: Prefs) {
  const d = document.documentElement.dataset;
  d.text = p.text ? String(p.text) : '';
  d.calm = p.calm ? '1' : '';
  d.contrast = p.contrast ? '1' : '';
}

export function A11yControls({ ui, prefs, onPrefs }: { ui: UiLang; prefs: Prefs; onPrefs: (p: Prefs) => void }) {
  const T = AX[ui];
  const sys = systemCalm();
  return (
    <div className="a11y">
      <div className="setrow"><span className="grow"><b>{T.text}</b></span></div>
      <Seg<0 | 1 | 2> label={T.text} value={prefs.text ?? 0} onChange={(text) => onPrefs({ ...prefs, text })}
        options={T.textOpts.map((l, i) => ({ v: i as 0 | 1 | 2, label: <span style={{ fontSize: `${[1, 1.1, 1.2][i]}em` }}>{l}</span> }))} />
      <div className="setrow">
        <span className="grow"><b>{T.calm}</b><small>{T.calmSub}</small></span>
        <Switch on={sys || !!prefs.calm} label={T.calm} onChange={(v) => { if (!sys) onPrefs({ ...prefs, calm: v }); }} />
      </div>
      <div className="setrow">
        <span className="grow"><b>{T.contrast}</b><small>{T.contrastSub}</small></span>
        <Switch on={!!prefs.contrast} label={T.contrast} onChange={(v) => onPrefs({ ...prefs, contrast: v })} />
      </div>
    </div>
  );
}
