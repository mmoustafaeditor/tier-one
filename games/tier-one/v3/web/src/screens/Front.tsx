// The lock screen (UI41.md "The phone"): the title screen. The equipped lock face (Shop) paints the field and picks the
// clock style; under the clock, your Press Card stamp (handle · rank); at the bottom, "Tap to open". One tap (or a
// swipe up, or Enter) opens the home screen. Nothing else lives here.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useT, fmtDate } from '../lib/i18n';
import { useSave } from '../lib/save';
import { stageOf, type Rumour } from '../lib/wireData';
import { sfx, haptic } from '../lib/sfx';
import { prefersReducedMotion } from '../lib/motion';
import { rankOf } from '../lib/byline';
import { useLook } from '../lib/phones';
import { useClock, Wall, levelInfo } from '../ui/phone';

/** A rumour's one-line head (kept for screens/Wire.tsx). */
export function rumourHed(t: ReturnType<typeof useT>, r: Rumour) {
  const l = r.linked[0];
  return t('wire.heds.' + stageOf(r), { c: l ? l.name : '', p: r.playerName });
}
const locOf = (lang: string) => (lang === 'ar' ? 'ar-EG-u-nu-latn' : lang === 'es' ? 'es-ES' : 'en-GB');

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const t = useT();
  const s = useSave();
  const look = useLook();
  const now = useClock(5000);
  const [out, setOut] = useState(false);
  const dv = look.device.preview.k === 'device' ? look.device.preview : null;
  const [boot, setBoot] = useState(() => !!dv && dv.boot === 'beat' && !prefersReducedMotion());
  useEffect(() => { if (!boot) return; const id = setTimeout(() => setBoot(false), 900); return () => clearTimeout(id); }, [boot]);
  const y0 = useRef(0);
  const f = look.lockface.preview.k === 'lockface' ? look.lockface.preview : { bg: '#14110D', ink: '#F3ECDD', accent: '#F2B632', motif: 'grain' as const, clock: 'numerals' as const, c2: undefined };
  const d = new Date(now);
  const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
  const date = fmtDate(now, t.lang, { weekday: 'long', day: 'numeric', month: 'long' });
  const wd = d.toLocaleDateString(locOf(t.lang), { weekday: 'long' });
  const vars = { ['--lf-bg' as string]: f.bg, ['--lf-ink' as string]: f.ink, ['--lf-acc' as string]: f.accent, ['--lf-c2' as string]: f.c2 || f.accent } as CSSProperties;
  const unlock = () => {
    if (out || boot) return;
    sfx('os.unlock'); haptic('tap'); setOut(true);
    setTimeout(onUnlock, prefersReducedMotion() ? 0 : 220);
  };
  const clock = f.clock === 'stacked'
    ? <span className="lf-clock lf-clock--stacked g-num" aria-label={hh + ':' + mm}><em dir="auto">{wd}</em><b>{hh}</b><b>{mm}</b></span>
    : f.clock === 'split'
      ? <span className="lf-clock lf-clock--split g-num" aria-label={hh + ':' + mm}><b>{hh}</b><b>{mm}</b></span>
      : <span className="lf-clock lf-clock--numerals g-num" aria-label={hh + ':' + mm}><b>{hh}</b><i>:</i><b>{mm}</b></span>;
  return <div className={'ph-lock lf' + (out ? ' is-out' : '') + (boot ? ' is-boot' : '')} data-clock={f.clock === 'ticker' ? 'numerals' : f.clock} style={vars}
    role="button" tabIndex={0} aria-label={t('s41.lock.open')} onClick={unlock}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); unlock(); } }}
    onPointerDown={(e) => { y0.current = e.clientY; }} onPointerUp={(e) => { if (y0.current - e.clientY > 40) unlock(); }}>
    <Wall p={f} split={f.clock === 'split'} />
    <span className="lf-bezel" aria-hidden="true" />
    <div className="lf-top">
      {f.clock !== 'stacked' && <span className="lf-date" dir="auto">{date}</span>}
      {clock}
      {f.clock === 'stacked' && <span className="lf-date" dir="auto">{fmtDate(now, t.lang, { day: 'numeric', month: 'long' })}</span>}
      <span className="lf-stamp">
        <b dir="auto">@{s.nick || t('s41.lock.noName')}</b>
        <small>{t('cn.tier.' + rankOf(s))} · {t('s41.lv', { n: levelInfo(s).n })}</small>
      </span>
    </div>
    <span className="lf-brand">Tier One</span>
    <span className="ph-lock__unlock" aria-hidden="true"><i /><span>{t('s41.lock.open')}</span></span>
  </div>;
}
