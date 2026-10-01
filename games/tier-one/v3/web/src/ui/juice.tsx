// Juice (CONCEPT4.md §6, GOTY.md §12): the primitives every app on the phone uses, so nobody reinvents a counter.
// Styles: styles/phone.css (the `jc-` block). Everything here collapses under Reduce motion.
//
//   <Count n format sign className/>        a rolling number (digits spin to their value; from the last value, never 0)
//   <Pop onTap sound haptic as className/>  tap scale wrapper: any tappable thing that isn't a GBtn (press = scale .96 + sfx + haptic)
//   <Ticker n label icon tone/>             follower / coin roll: the number rolls and a "+N" (or "−N") floater rises when it changes
//   <Typing name/>                          three dots before a contact answers (sfx 'dm.typing' once)
//   notify({ app, title, body, action })    puts a real event in the tray: a banner drops in at the top of the screen for 3.6 s,
//                                           and the lock screen / tray list keep it until it is opened or cleared. Never a nag.
//   <NotifyHost/>                           the banner layer (App mounts it once); useTray() → { items, unread, open(id), clear() }
//   <Ratio n/>                              the reply counter on a wrong post: ticks up from 0, red, one 'ratio' sound
//   <Stamp text tone/>                      the catchphrase / Scoop stamp (slams once); text is always the player's line or "Scoop"
//   <Sheet/> <SheetHead/>                   the one bottom sheet (ui/bits.tsx), re-exported so apps import from here
//   useHaptic() → { tap, hit, ratio }       the tap sfx + haptic hook (sfx 'ui.tap' + vibrate)
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode, type ElementType } from 'react';
import { sfx, haptic, buzz, type Sfx } from '../lib/sfx';
import { prefersReducedMotion } from '../lib/motion';
import { Roll, Icon } from './game';
import { Stamp as InkStamp, Sheet, SheetHead } from './bits';
import type { Route } from '../App';
import type { AppId } from './phone';

export { Sheet, SheetHead };

// ---------------------------------------------------------------- <Count>: a rolling number
export function Count({ n, format, sign, className = '' }: { n: number; format?: (n: number) => string; sign?: boolean; className?: string }) {
  return <Roll n={n} sign={sign} format={format} from0={false} className={'jc-count ' + className} />;
}

// ---------------------------------------------------------------- <Pop>: tap scale wrapper
export function Pop({ children, onTap, sound = 'ui.tap', haptic: hap = true, as: As = 'button', className = '', style, disabled, label, ...rest }: { children: ReactNode; onTap?: () => void; sound?: Sfx | null; haptic?: boolean; as?: ElementType; className?: string; style?: CSSProperties; disabled?: boolean; label?: string } & Record<string, unknown>) {
  const props: Record<string, unknown> = { ...rest };
  if (As === 'button') { props.type = 'button'; props.disabled = disabled; }
  return <As className={'jc-pop ' + className} style={style} aria-label={label} onClick={() => { if (disabled) return; if (sound) sfx(sound); if (hap) haptic('tap'); onTap?.(); }} {...props}>{children}</As>;
}

// ---------------------------------------------------------------- <Ticker>: follower / coin rolls with a floater
const fmtK = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n));
export function Ticker({ n, label, icon, tone, compact, className = '' }: { n: number; label?: ReactNode; icon?: string; tone?: 'good' | 'bad' | 'gold'; compact?: boolean; className?: string }) {
  const prev = useRef(n);
  const [floats, setFloats] = useState<{ id: number; d: number }[]>([]);
  useEffect(() => {
    const d = n - prev.current; prev.current = n;
    if (!d) return;
    const id = Date.now() + Math.random();
    setFloats((f) => [...f.slice(-2), { id, d }]);
    sfx('count.roll');
    const tm = setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), prefersReducedMotion() ? 10 : 1100);
    return () => clearTimeout(tm);
  }, [n]);
  return <span className={'jc-ticker' + (tone ? ' jc-ticker--' + tone : '') + ' ' + className}>
    {icon && <Icon n={icon} size={16} />}
    <Count n={n} format={compact ? fmtK : undefined} />
    {label && <small>{label}</small>}
    <span className="jc-ticker__floats" aria-hidden="true">{floats.map((f) => <i key={f.id} className={f.d > 0 ? 'up' : 'down'}>{f.d > 0 ? '+' : '−'}{compact ? fmtK(Math.abs(f.d)) : Math.abs(f.d)}</i>)}</span>
  </span>;
}

// ---------------------------------------------------------------- <Typing>: dots before a contact answers
export function Typing({ name, sound = true, className = '' }: { name?: string; sound?: boolean; className?: string }) {
  useEffect(() => { if (sound) sfx('dm.typing'); }, [sound]);
  return <span className={'jc-typing ' + className} role="status" aria-label={name ? name + '…' : '…'}>{name && <small>{name}</small>}<span className="jc-typing__dots"><i /><i /><i /></span></span>;
}

// ---------------------------------------------------------------- notify(): the tray
export interface TrayAction { label?: string; to?: Route; app?: AppId; onClick?: () => void }
export interface TrayItem { id: string; at: number; app: AppId; title: string; body?: string; action?: TrayAction; read?: boolean; tone?: 'good' | 'bad' | 'gold' }
export interface NotifyIn { app: AppId; title: string; body?: string; action?: TrayAction; id?: string; tone?: TrayItem['tone']; silent?: boolean }
const TRAY_KEY = 'tierone_tray';
const TRAY_CAP = 30;
let tray: TrayItem[] = (() => { try { const x = JSON.parse(localStorage.getItem(TRAY_KEY) || '[]'); return Array.isArray(x) ? x.filter((i) => i && i.id && i.title).slice(0, TRAY_CAP) : []; } catch { return []; } })();
let banner: TrayItem[] = [];
const traySubs = new Set<() => void>();
const emit = () => { traySubs.forEach((f) => f()); };
const persist = () => { try { localStorage.setItem(TRAY_KEY, JSON.stringify(tray.map(({ action, ...x }) => ({ ...x, action: action ? { label: action.label, to: action.to, app: action.app } : undefined })))); } catch { /* storage blocked: the tray lives for the session */ } };
let navTo: ((r: Route) => void) | null = null;
let openApp: ((a: AppId) => void) | null = null;
/** App registers the two ways a tray item can open something. */
export function setTrayNav(go: (r: Route) => void, app: (a: AppId) => void) { navTo = go; openApp = app; }

/** Put a real event in the tray (a result, a deal, a rival, an unlock, what's next). Idempotent per `id`. */
export function notify(x: NotifyIn): TrayItem | null {
  const id = x.id || x.app + ':' + Date.now().toString(36) + ':' + Math.floor(Math.random() * 1e4).toString(36);
  if (tray.some((i) => i.id === id)) return null;
  const it: TrayItem = { id, at: Date.now(), app: x.app, title: x.title, body: x.body, action: x.action, tone: x.tone };
  tray = [it, ...tray].slice(0, TRAY_CAP);
  if (!x.silent) { banner = [...banner.slice(-1), it]; sfx('tray'); buzz(10); setTimeout(() => { banner = banner.filter((b) => b.id !== id); emit(); }, prefersReducedMotion() ? 2400 : 3600); }
  persist(); emit();
  return it;
}
export function openTrayItem(id: string) {
  const it = tray.find((i) => i.id === id); if (!it) return;
  tray = tray.map((i) => (i.id === id ? { ...i, read: true } : i)); banner = banner.filter((b) => b.id !== id); persist(); emit();
  const a = it.action; if (!a) { openApp?.(it.app); return; }
  if (a.onClick) { a.onClick(); return; }
  if (a.to) { navTo?.(a.to); return; }
  openApp?.(a.app || it.app);
}
export function dismissTray(id?: string) { tray = id ? tray.filter((i) => i.id !== id) : []; banner = id ? banner.filter((b) => b.id !== id) : []; persist(); emit(); }
export function markTrayRead(ids?: string[]) { tray = tray.map((i) => (!ids || ids.includes(i.id) ? { ...i, read: true } : i)); persist(); emit(); }
const getTray = () => tray;
const getBanner = () => banner;
const sub = (f: () => void) => { traySubs.add(f); return () => { traySubs.delete(f); }; };
export function useTray() {
  const items = useSyncExternalStore(sub, getTray, getTray);
  return { items, unread: items.filter((i) => !i.read).length, open: openTrayItem, dismiss: dismissTray, clear: () => dismissTray(), markRead: markTrayRead };
}
export const trayUnread = () => tray.filter((i) => !i.read).length;
export const trayUnreadFor = (app: AppId) => tray.filter((i) => !i.read && i.app === app).length;

/** The banner layer: a tray item drops in under the status bar, tap opens it, swipe up (or wait) bins it. */
export function NotifyHost({ icon }: { icon?: (app: AppId) => ReactNode }) {
  const list = useSyncExternalStore(sub, getBanner, getBanner);
  return <div className="jc-banners" aria-live="polite">{list.map((b) => <Banner key={b.id} it={b} icon={icon} />)}</div>;
}
function Banner({ it, icon }: { it: TrayItem; icon?: (app: AppId) => ReactNode }) {
  const y0 = useRef(0);
  return <div className={'jc-banner' + (it.tone ? ' jc-banner--' + it.tone : '')} role="status" data-app={it.app}
    onPointerDown={(e) => { y0.current = e.clientY; }} onPointerUp={(e) => { if (y0.current - e.clientY > 24) { banner = banner.filter((b) => b.id !== it.id); emit(); } }}>
    <button type="button" className="jc-banner__hit" onClick={() => openTrayItem(it.id)}>
      <span className="jc-banner__ic" aria-hidden="true">{icon ? icon(it.app) : null}</span>
      <span className="jc-banner__b"><b dir="auto">{it.title}</b>{it.body && <span dir="auto">{it.body}</span>}</span>
      <span className="jc-banner__at">{it.app}</span>
    </button>
  </div>;
}

// ---------------------------------------------------------------- <Ratio>: the reply counter on a wrong post
export function Ratio({ n, label, className = '' }: { n: number; label?: ReactNode; className?: string }) {
  const [v, setV] = useState(prefersReducedMotion() ? n : 0);
  useEffect(() => {
    if (prefersReducedMotion()) { setV(n); return; }
    sfx('ratio'); buzz([20, 30, 20]);
    let raf = 0; const t0 = performance.now(), ms = 900;
    const step = (t: number) => { const k = Math.min(1, (t - t0) / ms); setV(Math.round(n * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [n]);
  return <span className={'jc-ratio ' + className} role="status"><Icon n="reply" size={16} /><b className="g-num">{v.toLocaleString('en')}</b>{label && <small>{label}</small>}</span>;
}

// ---------------------------------------------------------------- <Stamp>: the catchphrase / Scoop stamp
export function Stamp({ text, tone = 'loud', size = 'lg', slam = true, sound = true, className = '' }: { text: string; tone?: 'loud' | 'cool' | 'dry' | 'gold' | 'scoop'; size?: 'sm' | 'lg' | 'xl' | ''; slam?: boolean; sound?: boolean; className?: string }) {
  useEffect(() => { if (slam && sound) sfx(tone === 'scoop' ? 'scoop' : 'drop'); }, [slam, sound, tone]);
  return <InkStamp kind={tone === 'scoop' ? 'exclusive' : 'catch'} size={size} slam={slam} sound={false}><span dir="auto" className={'jc-stamp jc-stamp--' + tone + ' ' + className}>{text}</span></InkStamp>;
}

// ---------------------------------------------------------------- useHaptic: tap sfx + vibration in one call
export function useHaptic() {
  return useRef({
    tap: () => { sfx('ui.tap'); haptic('tap'); },
    hit: () => { sfx('thock'); haptic('stamp'); },
    ratio: () => { sfx('ratio'); buzz([20, 30, 20]); },
    open: () => { sfx('os.open'); haptic('tap'); },
  }).current;
}
export const tapSfx = () => { sfx('ui.tap'); haptic('tap'); };
