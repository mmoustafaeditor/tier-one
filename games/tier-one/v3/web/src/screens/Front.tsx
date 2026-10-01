// The lock screen (CONCEPT4.md §2): the phone on boot. The time, the date, the notification tray (real events only:
// what's next, results, deals, rivals, unlocks), and "Tap to unlock". A tap or a swipe up unlocks; tapping a tray
// item unlocks straight into it. The wallpaper is the one the home screen wears (styles/phone.css .ph-wall).
import { useRef, useState } from 'react';
import { useT, fmtDate, num, resetAt } from '../lib/i18n';
import { useSave } from '../lib/save';
import { ymdUTC } from '../lib/meta';
import { nextUp } from '../lib/byline';
import { stageOf, type Rumour } from '../lib/wireData';
import { sfx, haptic } from '../lib/sfx';
import { Icon } from '../ui/game';
import { useClock, AppIcon, type AppId } from '../ui/phone';
import { useTray, type TrayItem } from '../ui/juice';
import type { Go } from '../App';

export const dailyNoToday = () => Math.floor((Date.parse(ymdUTC() + 'T00:00:00Z') - Date.parse('2026-09-01T00:00:00Z')) / 864e5) + 1;
/** A rumour's one-line head (screens/Wire.tsx reads this; the Market lane owns the words in phase B). */
export function rumourHed(t: ReturnType<typeof useT>, r: Rumour) {
  const l = r.linked[0];
  return t('wire.heds.' + stageOf(r), { c: l ? l.name : '', p: r.playerName });
}

/** Tray lines the save itself implies (never stored): the window open / waiting, today's result. */
function derivedTray(s: ReturnType<typeof useSave>, t: ReturnType<typeof useT>): TrayItem[] {
  const today = ymdUTC(), out: TrayItem[] = [];
  const played = s.daily[today];
  const nx = nextUp(s);
  if (played) out.push({ id: 'd:res', at: Date.now(), app: 'blurt', title: t('os.tray.results'), body: t('os.tray.resultsB', { tier: t('tier.' + played.tier), n: num(played.total) }), action: { to: { n: 'daily' } } });
  else if (nx.kind === 'daily') out.push({ id: 'd:win', at: Date.now(), app: 'blurt', title: t('os.tray.windowOpen'), body: nx.v?.d ? t('os.tray.resumeB', { d: nx.v.d }) : t('os.tray.windowOpenB'), action: { to: { n: 'daily' } } });
  if (s.career?.live) out.push({ id: 'd:story', at: Date.now(), app: 'story', title: t('os.app.story'), body: t('os.tray.resumeB', { d: s.career.live.log.filter((a) => a[0] === 'e').length + 1 }), action: { to: { n: 'story' } } });
  return out;
}

export function LockScreen({ onUnlock, go }: { onUnlock: () => void; go: Go }) {
  const t = useT();
  const s = useSave();
  const now = useClock(5000);
  const tray = useTray();
  const [out, setOut] = useState(false);
  const y0 = useRef(0);
  const time = new Date(now).toLocaleTimeString(t.lang === 'ar' ? 'ar-EG-u-nu-latn' : t.lang === 'es' ? 'es-ES' : 'en-GB', { hour: 'numeric', minute: '2-digit' });
  const date = fmtDate(now, t.lang, { weekday: 'long', day: 'numeric', month: 'long' });
  const items = [...derivedTray(s, t), ...tray.items.filter((i) => !i.read)].slice(0, 6);
  const unlock = (then?: () => void) => {
    if (out) return;
    sfx('os.unlock'); haptic('tap'); setOut(true);
    setTimeout(() => { onUnlock(); then?.(); }, 240);
  };
  const openItem = (it: TrayItem) => {
    if (it.id.startsWith('d:')) { unlock(() => { if (it.action?.to) go(it.action.to); }); return; }
    unlock(() => tray.open(it.id));
  };
  return <div className={'ph-lock' + (out ? ' is-out' : '')} onClick={() => unlock()}
    onPointerDown={(e) => { y0.current = e.clientY; }} onPointerUp={(e) => { if (y0.current - e.clientY > 40) unlock(); }}>
    <div className="ph-wall" aria-hidden="true" />
    <div className="ph-lock__top">
      <span className="ph-lock__time g-num">{time}</span>
      <span className="ph-lock__date" dir="auto">{date}</span>
    </div>
    <div className="ph-lock__tray" role="list" aria-label={t('os.tray.title')} onClick={(e) => e.stopPropagation()}>
      {items.length ? items.map((it, k) => <button key={it.id} type="button" role="listitem" className="ph-note" style={{ ['--i' as string]: k }} onClick={() => openItem(it)}>
        <AppIcon id={it.app as AppId} size={34} />
        <span className="ph-note__b"><span className="ph-note__k"><b>{t('os.app.' + it.app)}</b><small>{it.id.startsWith('d:') ? t('os.tray.now') : ago(it.at, t)}</small></span><b className="ph-note__t" dir="auto">{it.title}</b>{it.body && <span className="ph-note__s" dir="auto">{it.body}</span>}</span>
      </button>) : <p className="ph-lock__empty">{t('os.lock.empty')} · {t('os.home.widget.nextB', { t: resetAt() })}</p>}
      {tray.unread > 0 && <button type="button" className="ph-lock__clear" onClick={() => tray.markRead()}>{t('os.lock.clear')}</button>}
    </div>
    <button type="button" className="ph-lock__unlock" aria-label={t('os.lock.unlockAria')} onClick={(e) => { e.stopPropagation(); unlock(); }}>
      <Icon n="down" size={22} style={{ transform: 'rotate(180deg)' }} /><span>{t('os.lock.unlock')}</span>
    </button>
  </div>;
}
function ago(ms: number, t: ReturnType<typeof useT>) {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60000));
  return m < 1 ? t('os.tray.now') : m < 60 ? t('os.tray.ago', { n: m }) : t('os.tray.agoH', { n: Math.round(m / 60) });
}
