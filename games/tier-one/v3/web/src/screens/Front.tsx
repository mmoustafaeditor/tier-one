// The lock screen (CONCEPT4.md §2, §17): the phone on boot, and the player's face to the world. A Lock face is a bundle
// (a `lockface` look): its field (colour, grain and one motif), a clock style (big numerals · stacked editorial · ticker
// · club split), the stamp under the clock (handle and rank · catchphrase · followers · streak) and a tray style
// (cards · strip · paper slips). The device's bezel frames it (lib/phones.ts device look), and a slow phone takes a beat
// to boot. The tray is real events only. A tap or a swipe up unlocks; tapping a tray item unlocks straight into it.
// `LockFaceView` also draws the Edit-home try-on (screens/Home.tsx), so a face is previewed on your own phone.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type PointerEvent as RPointerEvent } from 'react';
import { useT, fmtDate, resetAt, num } from '../lib/i18n';
import { useSave } from '../lib/save';
import { stageOf, type Rumour } from '../lib/wireData';
import { sfx, haptic } from '../lib/sfx';
import { prefersReducedMotion } from '../lib/motion';
import { bylineOf, rankOf } from '../lib/byline';
import { catchphraseOf } from '../lib/catchphrase';
import { useLook } from '../lib/phones';
import { dailyNo } from '../lib/widgets';
import { Icon } from '../ui/game';
import { useClock, AppIcon, type AppId } from '../ui/phone';
import { useTray, type TrayItem } from '../ui/juice';
import { Wall } from '../ui/widgets';
import type { Go } from '../App';

export const dailyNoToday = () => dailyNo();
/** A rumour's one-line head (screens/Wire.tsx reads this; the Market lane owns the words in phase B). */
export function rumourHed(t: ReturnType<typeof useT>, r: Rumour) {
  const l = r.linked[0];
  return t('wire.heds.' + stageOf(r), { c: l ? l.name : '', p: r.playerName });
}

/** Tray lines the save itself implies and nobody stored (a live Story window). Today's window and today's result are
 *  posted by App.tsx through notify(), so they are not repeated here. */
function derivedTray(s: ReturnType<typeof useSave>, t: ReturnType<typeof useT>): TrayItem[] {
  const out: TrayItem[] = [];
  if (s.career?.live) out.push({ id: 'd:story', at: Date.now(), app: 'story', title: t('os.app.story'), body: t('os.tray.resumeB', { d: s.career.live.log.filter((a) => a[0] === 'e').length + 1 }), action: { to: { n: 'story' } } });
  return out;
}
const locOf = (lang: string) => (lang === 'ar' ? 'ar-EG-u-nu-latn' : lang === 'es' ? 'es-ES' : 'en-GB');

/** The face itself: field, bezel, date, clock, stamp, tray. Used by the lock screen and by Edit home's try-on. */
export function LockFaceView({ items, onItem, onClear, footer, className = '', onPointerDown, onPointerUp, onClick }: {
  items: TrayItem[]; onItem?: (it: TrayItem) => void; onClear?: () => void; footer?: ReactNode; className?: string;
  onPointerDown?: (e: RPointerEvent) => void; onPointerUp?: (e: RPointerEvent) => void; onClick?: () => void;
}) {
  const t = useT();
  const s = useSave();
  const now = useClock(5000);
  const look = useLook();
  const f = look.lockface.preview.k === 'lockface' ? look.lockface.preview : { bg: '#14110D', ink: '#F3ECDD', accent: '#F2B632', motif: 'grain' as const, clock: 'numerals' as const, stamp: 'handle' as const, tray: 'cards' as const };
  const d = new Date(now);
  const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
  const loc = locOf(t.lang);
  const date = fmtDate(now, t.lang, { weekday: 'long', day: 'numeric', month: 'long' });
  const wd = d.toLocaleDateString(loc, { weekday: 'long' }), dm = d.toLocaleDateString(loc, { day: 'numeric', month: 'long' });
  const vars = { ['--lf-bg' as string]: f.bg, ['--lf-ink' as string]: f.ink, ['--lf-acc' as string]: f.accent, ['--lf-c2' as string]: ('c2' in f && f.c2) || f.accent } as CSSProperties;
  const last = Object.entries(s.daily).sort(([a], [b]) => (a < b ? 1 : -1))[0]?.[1];
  return <div className={'ph-lock lf ' + className} data-clock={f.clock} data-tray={f.tray} style={vars} onClick={onClick} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
    <Wall p={f} split={f.clock === 'split'} />
    <span className="lf-bezel" aria-hidden="true" />
    <div className="lf-top">
      {f.clock === 'stacked' ? <>
        <span className="lf-clock lf-clock--stacked g-num" aria-label={hh + ':' + mm}><em dir="auto">{wd}</em><b>{hh}</b><b>{mm}</b></span>
        <span className="lf-date" dir="auto">{dm}</span>
      </> : f.clock === 'split' ? <>
        <span className="lf-date" dir="auto">{date}</span>
        <span className="lf-clock lf-clock--split g-num" aria-label={hh + ':' + mm}><b>{hh}</b><b>{mm}</b></span>
      </> : <>
        <span className="lf-date" dir="auto">{date}</span>
        <span className={'lf-clock lf-clock--' + f.clock + ' g-num'} aria-label={hh + ':' + mm}><b>{hh}</b><i>:</i><b>{mm}</b></span>
        {f.clock === 'ticker' && <span className="lf-ticker" dir="auto"><span>{last ? t('sh.lock.last', { tier: t('tier.' + last.tier), n: num(last.total) }) : t('sh.lock.lastNone')} · {t('sh.w.window.no', { n: dailyNo() })}</span></span>}
      </>}
      <LockStampView kind={f.stamp} />
    </div>
    <div className={'lf-tray lf-tray--' + f.tray} role="list" aria-label={t('os.tray.title')} onClick={(e) => e.stopPropagation()}>
      {items.length ? items.map((it, k) => <button key={it.id} type="button" role="listitem" className="ph-note" style={{ ['--i' as string]: k }} onClick={() => onItem?.(it)}>
        <AppIcon id={it.app as AppId} size={34} />
        <span className="ph-note__b"><span className="ph-note__k"><b>{t('os.app.' + it.app)}</b><small>{it.id.startsWith('d:') ? t('os.tray.now') : ago(it.at, t)}</small></span><b className="ph-note__t" dir="auto">{it.title}</b>{it.body && <span className="ph-note__s" dir="auto">{it.body}</span>}</span>
      </button>) : <p className="ph-lock__empty">{t('os.lock.empty')} · {t('os.home.widget.nextB', { t: resetAt() })}</p>}
      {onClear && <button type="button" className="ph-lock__clear" onClick={onClear}>{t('os.lock.clear')}</button>}
    </div>
    {footer}
  </div>;
}

/** The stamp under the clock: who you are, your line, your followers or your streak, inked once. */
function LockStampView({ kind }: { kind: 'handle' | 'catch' | 'followers' | 'streak' }) {
  const t = useT();
  const s = useSave();
  const b = bylineOf(s);
  let big = '', small = '';
  if (kind === 'handle') { big = s.nick || t('g.home.noName'); small = t('sh.lock.rankRep', { rank: t('cn.tier.' + rankOf(s)), rep: b.rep }); }
  else if (kind === 'catch') { big = catchphraseOf(s).text; small = s.nick || ''; }
  else if (kind === 'followers') { big = b.followers.toLocaleString('en'); small = t('sh.w.followers.t'); }
  else { big = String(s.streak?.n || 0); small = s.streak?.n ? t('sh.lock.streak', { n: s.streak.n }) : t('sh.lock.streak0'); }
  return <span className={'lf-stamp lf-stamp--' + kind}><b dir="auto">{big}</b>{small && <small dir="auto">{small}</small>}</span>;
}

export function LockScreen({ onUnlock, go }: { onUnlock: () => void; go: Go }) {
  const t = useT();
  const s = useSave();
  const tray = useTray();
  const look = useLook();
  const [out, setOut] = useState(false);
  const dv = look.device.preview.k === 'device' ? look.device.preview : null;
  const [boot, setBoot] = useState(() => !!dv && dv.boot === 'beat' && !prefersReducedMotion());
  useEffect(() => { if (!boot) return; const id = setTimeout(() => setBoot(false), 900); return () => clearTimeout(id); }, [boot]);
  const y0 = useRef(0);
  const items = [...derivedTray(s, t), ...tray.items.filter((i) => !i.read)].slice(0, 6);
  const unlock = (then?: () => void) => {
    if (out || boot) return;
    sfx('os.unlock'); haptic('tap'); setOut(true);
    setTimeout(() => { onUnlock(); then?.(); }, 240);
  };
  const openItem = (it: TrayItem) => {
    if (it.id.startsWith('d:')) { unlock(() => { if (it.action?.to) go(it.action.to); }); return; }
    unlock(() => tray.open(it.id));
  };
  return <LockFaceView items={items} onItem={openItem} onClear={tray.unread > 0 ? () => tray.markRead() : undefined}
    className={(out ? 'is-out' : '') + (boot ? ' is-boot' : '')}
    onClick={() => unlock()} onPointerDown={(e) => { y0.current = e.clientY; }} onPointerUp={(e) => { if (y0.current - e.clientY > 40) unlock(); }}
    footer={<button type="button" className="ph-lock__unlock" aria-label={t('os.lock.unlockAria')} onClick={(e) => { e.stopPropagation(); unlock(); }}>
      <Icon n="down" size={22} style={{ transform: 'rotate(180deg)' }} /><span>{t('sh.lock.unlock')}</span>
    </button>} />;
}
function ago(ms: number, t: ReturnType<typeof useT>) {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60000));
  return m < 1 ? t('os.tray.now') : m < 60 ? t('os.tray.ago', { n: m }) : t('os.tray.agoH', { n: Math.round(m / 60) });
}
