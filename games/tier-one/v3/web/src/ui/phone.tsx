// The phone (CONCEPT4.md §2, §6): a fictional OS as the game shell. This file is the OS: the app registry (icon, label,
// unlock level, badge), the one drawn icon set, the status bar (time, signal, a battery that drains in a window and
// recharges at results), the frame with its home bar and back gesture, the dock (your 4 most-used apps), and the
// desktop side panel. Screens live in their apps; App.tsx routes. Styles: styles/phone.css.
//
// EXPORTS other lanes use:
//   AppId, APPS, appById(id), appOf(route) → AppId | null, routeOf(app) → Route
//   <AppIcon id size/>                       the app's tile icon (one icon system, no emoji)
//   levelInfo(save) → LevelView { n, into, need, pct, total }  the player's level (lib/economy.ts levelOf on save.xp)
//   unlockLevel(app), isUnlocked(app, save)   "Reach Level N" tile gates (lib/economy.ts levelUnlocks: Live 3, Groups 4)
//   callLevel(app), canCall(app, save)        the gate INSIDE an open app (Market: watching free, calls at Level 2)
//   batteryMode('idle' | 'window' | 'charge') the status-bar battery, driven by the route
//   bumpUse(app), dockApps(save)              the dock
//   <StatusBar/>, <Phone/>, <HomeBar/>, <DeskPanel/>
//   lookStyle(look) → the CSS variables the phone wears (theme tokens, the one accent, the device frame)
//
// 4.0 shell redesign (CONCEPT4 §17/§18): the phone wears the player's look. Phone reads lib/phones.ts useLook() (the
// equipped lock face, wallpaper, OS theme, icon pack and device, plus anything being tried on) and sets the theme
// tokens, the accent and the device frame as CSS variables on the desk; AppIcon draws the equipped icon pack.
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode, type PointerEvent as RPointerEvent } from 'react';
import type { Save } from '../lib/save';
import { getSave, useSave, useSaveSel } from '../lib/save';
import { item } from '../lib/catalog';
import { equipped as equippedLook } from '../lib/wallet';
import { useLook, useTry, type Look } from '../lib/phones';
import type { IconStyle } from '../lib/kinds';
import { useT, resetAt, num } from '../lib/i18n';
import { sfx, haptic } from '../lib/sfx';
import { prefersReducedMotion } from '../lib/motion';
import { ymdUTC } from '../lib/meta';
import { unreadOf, bylineOf, nextUp } from '../lib/byline';
import { missionsView } from '../lib/progress';
import { levelOfSave, levelUnlocks, type LevelView } from '../lib/economy';
import { ddLiveDates } from '../lib/flags';
import { v3 } from '../lib/api';
import type { CastSaga } from '../lib/engine';
import { Icon, Kit } from './game';
import { useTray, trayUnreadFor } from './juice';
import type { Route } from '../App';

// ---------------------------------------------------------------- the apps
export type AppId = 'blurt' | 'dms' | 'lens' | 'story' | 'live' | 'market' | 'groups' | 'boards' | 'settings';
export type Badge = number | 'dot' | 0;
/** `unlock`: the level the tile opens at (lib/economy.ts levelUnlocks). `calls`: the level the app's own call / post
 *  action opens at while the rest of the app is free to use from the start (the Market, CONCEPT4 §9). */
export interface AppDef { id: AppId; accent: string; ink?: string; unlock: number; calls?: number; route: Route; aliases: string[]; badge: (s: Save) => Badge }
const today = () => ymdUTC();
export const APPS: AppDef[] = [
  { id: 'blurt', accent: '#FF4D2E', unlock: 1, route: { n: 'daily' }, aliases: ['daily', 'window', 'feed'], badge: (s) => (!s.daily[today()] ? 'dot' : unreadOf(s).filter((f) => f.kind === 'window' || f.kind === 'rival' || f.kind === 'hot').length) },
  { id: 'dms', accent: '#1DB46A', unlock: 1, route: { n: 'contacts' }, aliases: ['contacts', 'calls'], badge: (s) => unreadOf(s).filter((f) => f.kind === 'contact' || f.kind === 'editor').length },
  { id: 'lens', accent: '#F2B632', ink: '#2A1C00', unlock: 1, route: { n: 'me' }, aliases: ['me', 'profile', 'pass', 'looks', 'customize'], badge: (s) => (missionsView(s) || []).filter((m) => m.done && !m.claimed).length + Object.values(s.prizes || {}).filter((p) => !p.paid).length + unreadOf(s).filter((f) => f.kind === 'level' || f.kind === 'season' || f.kind === 'mission').length },
  { id: 'story', accent: '#D9486F', unlock: 1, route: { n: 'story' }, aliases: ['career', 'desk', 'editor'], badge: (s) => (s.career?.live ? 'dot' : (s.story?.inbox || []).filter((x) => !x.read).length) },
  { id: 'live', accent: '#B51B2C', unlock: levelUnlocks.live, route: { n: 'ddlive' }, aliases: ['ddlive', 'deadline'], badge: () => (ddLiveDates().some((d) => d.day === today() && d.live) ? 'dot' : 0) },
  { id: 'market', accent: '#1FA7D9', unlock: 1, calls: levelUnlocks.market, route: { n: 'wire' }, aliases: ['wire', 'rumours'], badge: (s) => unreadOf(s).filter((f) => f.kind === 'wire').length }, // watching is free; calls at Level 2
  { id: 'groups', accent: '#7C5CFF', unlock: levelUnlocks.groups, route: { n: 'rooms' }, aliases: ['rooms', 'newsroom', 'friends', 'room'], badge: (s) => unreadOf(s).filter((f) => f.kind === 'room' || f.kind === 'challenge' || f.kind === 'friend' || f.kind === 'newsroom').length },
  { id: 'boards', accent: '#3B82F6', unlock: 1, route: { n: 'boards' }, aliases: ['leaderboards', 'lb'], badge: () => 0 },
  { id: 'settings', accent: '#6B7280', unlock: 1, route: { n: 'settings' }, aliases: ['howto', 'options'], badge: () => 0 },
];
export const APP_IDS = APPS.map((a) => a.id);
export const appById = (id: string): AppDef | null => APPS.find((a) => a.id === id || a.aliases.includes(id)) || null;
/** The app a route lives in (null for the home screen). */
export function appOf(r: Route): AppId | null {
  switch (r.n) {
    case 'front': return null;
    case 'daily': case 'feed': case 'practice': case 'rivals': return 'blurt';
    case 'play': return r.mode === 'career' ? 'story' : 'blurt';
    case 'room': return 'groups';
    case 'contacts': return 'dms';
    case 'me': case 'pass': case 'customize': return 'lens';
    case 'story': case 'desk': case 'editor': return 'story';
    case 'ddlive': return 'live';
    case 'wire': return 'market';
    case 'rooms': case 'newsroom': return 'groups';
    case 'boards': return 'boards';
    case 'howto': case 'settings': return 'settings';
  }
  return null;
}
export const routeOf = (app: AppId): Route => appById(app)!.route;
/** The combined badge: the app's own count plus unread tray items for it. */
export function badgeOf(app: AppDef, s: Save): Badge {
  const own = app.badge(s), tray = trayUnreadFor(app.id);
  if (own === 'dot') return tray ? tray : 'dot';
  return own + tray;
}

// ---------------------------------------------------------------- level and unlocks (lib/economy.ts is the source)
/** The player's account level off lifetime XP (`save.xp`; `pp` mirrors it): RULES4 §3, 100 + 30 × (level − 1) a level. */
export const levelInfo = (s: Save = getSave()): LevelView => levelOfSave(s);
/** The level an app's tile opens at, straight from the registry (lib/economy.ts levelUnlocks). The Market is open from
 *  Level 1 to watch; calling inside it opens at `levelUnlocks.market` (Level 2), see callLevel / canCall. */
export const UNLOCKS: Partial<Record<AppId, number>> = Object.fromEntries(APPS.filter((a) => a.unlock > 1).map((a) => [a.id, a.unlock]));
export const unlockLevel = (app: AppId) => appById(app)?.unlock || 1;
export const isUnlocked = (app: AppId, s: Save = getSave()) => levelInfo(s).n >= unlockLevel(app);
/** The level an app's own call action opens at (1 when the app has no inner gate). */
export const callLevel = (app: AppId) => appById(app)?.calls || 1;
export const canCall = (app: AppId, s: Save = getSave()) => levelInfo(s).n >= callLevel(app);

// ---------------------------------------------------------------- the dock: your four most-used apps
const USE_KEY = 't1.phone.use';
let use: Record<string, number> | null = null;
const readUse = () => { if (use) return use; try { use = JSON.parse(localStorage.getItem(USE_KEY) || '{}') || {}; } catch { use = {}; } return use!; };
export function bumpUse(app: AppId) { const u = readUse(); u[app] = (u[app] || 0) + 1; try { localStorage.setItem(USE_KEY, JSON.stringify(u)); } catch { /* */ } }
const DOCK_DEFAULT: AppId[] = ['blurt', 'dms', 'lens', 'story'];
export function dockApps(s: Save = getSave()): AppId[] {
  const u = readUse();
  const open = APPS.filter((a) => a.id !== 'settings' && isUnlocked(a.id, s)).map((a) => a.id);
  const used = open.filter((id) => u[id]).sort((a, b) => (u[b] || 0) - (u[a] || 0));
  const out: AppId[] = [];
  for (const id of [...used, ...DOCK_DEFAULT, ...open]) if (!out.includes(id) && open.includes(id)) { out.push(id); if (out.length === 4) break; }
  return out;
}

// ---------------------------------------------------------------- the icons (24-grid line icons on a tile; one system)
const IC: Record<AppId, string> = {
  blurt: 'M4 4.5h12.5a2 2 0 0 1 2 2V14a2 2 0 0 1-2 2H9.5L5 20v-4H4a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2zM11.5 7.5l-2.2 3.6h3.4L10.5 15',
  dms: 'M3 6.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2V11a2 2 0 0 1-2 2H8.5L5.5 16v-3H5a2 2 0 0 1-2-2zM17.5 9.5H19a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2h-.5v3l-3-3H11a2 2 0 0 1-2-2v-.5',
  lens: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM14.5 9.8 19.5 7M9.5 9.8 4.5 7M12 15.5V21',
  story: 'M5 4h14v16l-7-4-7 4zM8.5 8.5h7M8.5 12h4.5',
  live: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM10.2 9.2l4.6 2.8-4.6 2.8zM19 3.5a2 2 0 1 0 0 .1',
  market: 'M3 19h18M3.5 14.5l5-5.5 4 3.5 6.5-7M14.5 5.5H19V10',
  groups: 'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16.5 10.5a3 3 0 1 0 0-6M18 14.2c2.3.7 3.5 2.6 3.5 5.8',
  boards: 'M3 20.5h18M5 20.5v-7.5h4v7.5M10 20.5V8h4v12.5M15 20.5V14h4v6.5',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
};
export function AppGlyph({ id, size = 24 }: { id: AppId; size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={id === 'settings' ? 1.8 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={IC[id]} /></svg>;
}
/** The icon pack in use (equipped, or the one being tried on). */
export function useIconPack(): { style: IconStyle; tile: string; ink: string } {
  const eq = useSaveSel((x) => x.desk?.equip?.iconpack || '');
  const tr = useTry();
  const it = (tr.iconpack && item(tr.iconpack)) || (eq ? equippedLook('iconpack', getSave()) : null);
  return it && it.preview.k === 'iconpack' ? { style: it.preview.style, tile: it.preview.tile, ink: it.preview.ink } : { style: 'paper', tile: '#EDE4D0', ink: '#1A1611' };
}
/** The app icon: one drawn family (2px line glyphs on the 24 grid) in the equipped pack's style. Paper (default): a
 *  paper tile with an ink glyph, the app's colour as a tab and a pressed edge. Outline, stamp, crest and retro restyle
 *  the same glyphs. `pack`/`tile`/`ink` force a style (pack previews). `locked` greys it. */
export function AppIcon({ id, size = 60, locked, className = '', style, pack, tile, ink }: { id: AppId; size?: number; locked?: boolean; className?: string; style?: CSSProperties; pack?: IconStyle; tile?: string; ink?: string }) {
  const a = appById(id)!;
  const cur = useIconPack();
  const st = pack || cur.style;
  return <span className={'ph-ic ph-ic--' + st + (locked ? ' is-locked' : '') + ' ' + className} data-app={id}
    style={{ ['--a' as string]: a.accent, ['--a-ink' as string]: a.ink || '#fff', ['--ip-tile' as string]: tile || cur.tile, ['--ip-ink' as string]: ink || cur.ink, ['--sz' as string]: size + 'px', ...style }} aria-hidden="true">
    {st === 'crest' && <svg className="ph-ic__shield" viewBox="0 0 24 26" aria-hidden="true"><path d="M12 1.2 21.6 4v8.2c0 6.3-4.3 10.3-9.6 12.6C6.7 22.5 2.4 18.5 2.4 12.2V4z" /></svg>}
    <AppGlyph id={id} size={Math.round(size * (st === 'crest' ? 0.42 : st === 'stamp' ? 0.46 : 0.5))} />
  </span>;
}

// ---------------------------------------------------------------- the clock and the battery
export function useClock(ms = 15000) {
  const [now, set] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => set(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}
type BatteryMode = 'idle' | 'window' | 'charge';
let battery = { level: 100, mode: 'idle' as BatteryMode };
const bSubs = new Set<() => void>();
let bTimer = 0;
const bEmit = () => bSubs.forEach((f) => f());
/** A window drains the battery (1% every 12 s, floor 9%); results recharge it; idle holds. */
export function batteryMode(mode: BatteryMode) {
  if (battery.mode === mode) return;
  battery = { ...battery, mode }; clearInterval(bTimer); bTimer = 0;
  if (mode === 'window') bTimer = window.setInterval(() => { if (battery.level > 9) { battery = { ...battery, level: battery.level - 1 }; bEmit(); } }, 12000);
  if (mode === 'charge') bTimer = window.setInterval(() => { if (battery.level < 100) { battery = { ...battery, level: Math.min(100, battery.level + 3) }; bEmit(); } else { clearInterval(bTimer); bTimer = 0; battery = { ...battery, mode: 'idle' }; bEmit(); } }, prefersReducedMotion() ? 60 : 220);
  bEmit();
}
const getB = () => battery;
export const useBattery = () => useSyncExternalStore((f) => { bSubs.add(f); return () => { bSubs.delete(f); }; }, getB, getB);

export function StatusBar({ className = '' }: { className?: string }) {
  const t = useT();
  const now = useClock();
  const b = useBattery();
  const time = new Date(now).toLocaleTimeString(t.lang === 'ar' ? 'ar-EG-u-nu-latn' : t.lang === 'es' ? 'es-ES' : 'en-GB', { hour: 'numeric', minute: '2-digit' });
  return <div className={'ph-status ' + className} role="status" aria-label={time + ' · ' + t('os.status.battery', { n: b.level })}>
    <span className="ph-status__time g-num">{time}</span>
    <span className="ph-status__end">
      <span className="ph-status__sig" aria-hidden="true"><i /><i /><i /><i /></span>
      <span className={'ph-status__bat' + (b.mode === 'charge' ? ' is-charging' : '') + (b.level <= 20 ? ' is-low' : '')} aria-hidden="true" style={{ ['--lv' as string]: b.level }}><i /><b>{b.level}</b></span>
    </span>
  </div>;
}

// ---------------------------------------------------------------- the frame, the home bar, the back gesture
export function HomeBar({ onHome, onBack, canBack }: { onHome: () => void; onBack: () => void; canBack: boolean }) {
  const t = useT();
  const y0 = useRef(0);
  return <div className="ph-bar">
    {canBack && <button type="button" className="ph-bar__back" onClick={() => { sfx('os.close'); onBack(); }} aria-label={t('os.bar.backAria')}><Icon n={t.rtl ? 'arrow' : 'back'} size={20} /></button>}
    <button type="button" className="ph-bar__home" aria-label={t('os.bar.homeAria')} onClick={() => { sfx('os.home'); haptic('tap'); onHome(); }}
      onPointerDown={(e) => { y0.current = e.clientY; }} onPointerUp={(e) => { if (y0.current - e.clientY > 30) { sfx('os.home'); onHome(); } }}><i /></button>
  </div>;
}
/** The phone. Below 1024px it is the viewport; from 1024px it sits on the desk (styles/phone.css). `app` colours the
 *  frame's accent; `anim` plays the open / close transition on the screen. */
export function Phone({ app, anim, locked, onHome, onBack, canBack, children, side }: { app: AppId | null; anim: 'open' | 'close' | 'home' | 'app' | ''; locked: boolean; onHome: () => void; onBack: () => void; canBack: boolean; children: ReactNode; side?: ReactNode }) {
  const x0 = useRef<number | null>(null);
  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  const down = (e: RPointerEvent) => { const w = (e.currentTarget as HTMLElement).getBoundingClientRect(); const x = e.clientX - w.left; x0.current = (rtl ? w.width - x : x) <= 24 ? e.clientX : null; };
  const up = (e: RPointerEvent) => { if (x0.current == null) return; const dx = (e.clientX - x0.current) * (rtl ? -1 : 1); x0.current = null; if (dx > 70 && canBack) { sfx('os.close'); onBack(); } };
  const a = app ? appById(app) : null;
  const look = useLook();
  const dv = look.device.preview.k === 'device' ? look.device.preview : null;
  return <div className="ph-desk" style={lookStyle(look)} data-tone={toneOf(look)} data-notch={dv?.notch || 'pill'} data-crack={dv?.crack ? '' : undefined}>
    <div className={'ph' + (locked ? ' is-locked' : '') + (app ? ' has-app' : '')} data-app={app || 'home'} data-anim={anim || undefined} style={a ? { ['--app-c' as string]: a.accent } : undefined}>
      <StatusBar />
      <div className="ph__screen" onPointerDown={down} onPointerUp={up} onPointerCancel={() => { x0.current = null; }}>{children}</div>
      {!locked && <HomeBar onHome={onHome} onBack={onBack} canBack={canBack} />}
    </div>
    {side && <aside className="ph-side" aria-label="Context">{side}</aside>}
  </div>;
}

// ---------------------------------------------------------------- the look as tokens
const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
/** 'light' when the equipped OS theme is a pale surface (the paper themes), so the tokens and glyphs flip. */
export const toneOf = (look: Look): 'light' | 'dark' => { const o = look.theme.preview.k === 'theme' && look.theme.source !== 'standard' ? look.theme.preview.os : null; return o && lum(o.bg) > 0.4 ? 'light' : 'dark'; };
/** The CSS variables the phone wears: the one accent, the OS theme's tokens (surface, ink, radius, type) and the device
 *  frame (bezel, frame, corner radius). Standard theme = the tokens in styles/phone.css. */
export function lookStyle(look: Look): CSSProperties {
  const v: Record<string, string> = { '--acc': look.accent };
  const o = look.theme.preview.k === 'theme' && look.theme.source !== 'standard' ? look.theme.preview.os : null;
  if (o) {
    Object.assign(v, {
      '--os-bg': o.bg, '--os-bg-2': `color-mix(in srgb, ${o.bg} 90%, ${o.ink})`, '--os-bg-3': `color-mix(in srgb, ${o.bg} 80%, ${o.ink})`,
      '--os-ink': o.ink, '--os-ink-2': `color-mix(in srgb, ${o.ink} 74%, ${o.bg})`, '--os-ink-3': `color-mix(in srgb, ${o.ink} 52%, ${o.bg})`,
      '--os-line': `color-mix(in srgb, ${o.ink} 13%, transparent)`, '--os-bar': o.bar, '--os-note': `color-mix(in srgb, ${o.bar} 94%, ${o.ink})`, '--os-note-ink': o.ink,
      '--os-glass': o.bg, '--os-desk': `color-mix(in srgb, ${o.bg} 70%, #000)`, '--os-desk-2': `color-mix(in srgb, ${o.bg} 88%, ${o.ink})`,
    });
    if (o.radius != null) { v['--os-r-card'] = o.radius + 'px'; v['--os-r-widget'] = Math.round(o.radius * 1.15) + 'px'; }
    if (o.face) v['--os-face'] = o.face === 'editorial' ? 'var(--f-display)' : o.face === 'cond' ? 'var(--f-cond)' : 'var(--f-text)';
  }
  const d = look.device.preview.k === 'device' ? look.device.preview : null;
  if (d) Object.assign(v, { '--dv-bezel': d.bezel, '--dv-frame': d.frame, '--os-r-phone': d.radius + 'px' });
  return v as CSSProperties;
}

// ---------------------------------------------------------------- today's five (names and clubs; outcomes stay secret)
let castCache: { day: string; cast: CastSaga[] } | null = null;
export function useTodayCast(day: string = ymdUTC()) {
  const [c, setC] = useState(castCache?.day === day ? castCache.cast : null);
  useEffect(() => {
    if (castCache?.day === day) return;
    const x = getSave();
    v3<{ cast: CastSaga[] }>('daily.start', { dev: x.dev, nick: x.nick }).then((r) => { if (r.ok && r.cast) { castCache = { day, cast: r.cast }; setC(r.cast); } }).catch(() => {});
  }, [day]);
  return c;
}

// ---------------------------------------------------------------- the desk panel (≥1024px): the current app's context
export function DeskPanel({ app, go }: { app: AppId | null; go: (r: Route) => void }) {
  const t = useT();
  const s = useSave();
  const tray = useTray();
  const cast = useTodayCast();
  const b = bylineOf(s);
  const lv = levelInfo(s);
  const played = s.daily[ymdUTC()];
  const nx = nextUp(s);
  const drops = Object.entries(s.daily).sort(([a], [c]) => (a < c ? 1 : -1)).slice(0, 9);
  const def = app ? appById(app) : null;
  return <div className="ph-side__in">
    <div className="ph-side__me">
      <span className="ph-side__name" dir="auto">{s.nick || t('g.home.noName')}</span>
      <span className="ph-side__stats g-mono">{t('os.home.widget.level', { n: lv.n })} · {t('os.home.widget.rep', { n: b.rep })} · {t('os.home.widget.followers', { n: b.followers.toLocaleString('en') })}</span>
      <span className="g-bar g-bar--sm ph-side__lv"><i style={{ width: lv.pct + '%' }} /></span>
    </div>
    {def && <section className="ph-side__sec"><h3 className="g-mono">{t('os.desk.aboutApp')}</h3><div className="ph-side__app"><AppIcon id={def.id} size={44} /><div><b>{t('os.app.' + def.id)}</b><p>{t('os.tag.' + def.id)}</p></div></div></section>}
    <section className="ph-side__sec">
      <h3 className="g-mono">{t('os.desk.board')}</h3>
      <div className="ph-side__board">
        {Array.from({ length: 5 }, (_, k) => <span key={k} className="ph-side__kit">{cast?.[k] ? <Kit club={cast[k].from} player={cast[k].player} size={40} /> : <Kit mystery size={40} />}<small dir="auto">{cast?.[k] ? cast[k].player.s || cast[k].player.n : '—'}</small></span>)}
      </div>
      <button type="button" className="ph-side__go" onClick={() => go({ n: 'daily' })}>{played ? t('os.home.widget.playedB', { tier: t('tier.' + played.tier), n: num(played.total) }) : nx.kind === 'daily' && nx.v?.d ? t('os.home.widget.resume', { d: nx.v.d }) : t('os.home.widget.play')}<Icon n="arrow" size={16} /></button>
    </section>
    <section className="ph-side__sec">
      <h3 className="g-mono">{t('os.desk.grid')}</h3>
      {drops.length ? <div className="ph-side__grid">{drops.map(([d, r]) => <span key={d} className={'ph-side__cell is-' + r.tier.toLowerCase()} title={d}><b>{t('tier.' + r.tier)}</b><small className="g-num">{num(r.total)}</small></span>)}</div> : <p className="ph-side__quiet">{t('os.desk.noGrid')}</p>}
    </section>
    <section className="ph-side__sec">
      <h3 className="g-mono">{t('os.desk.tray')}{tray.unread > 0 && <b className="g-badge">{tray.unread}</b>}</h3>
      {tray.items.length ? <div className="ph-side__tray">{tray.items.slice(0, 5).map((it) => <button key={it.id} type="button" className={'ph-side__row' + (it.read ? ' is-read' : '')} onClick={() => tray.open(it.id)}><AppIcon id={it.app} size={28} /><span><b dir="auto">{it.title}</b>{it.body && <small dir="auto">{it.body}</small>}</span></button>)}</div> : <p className="ph-side__quiet">{t('os.lock.empty')}</p>}
    </section>
    <p className="ph-side__keys g-mono">{t('os.desk.keys')} · {t('os.home.widget.nextB', { t: resetAt() })}</p>
  </div>;
}
