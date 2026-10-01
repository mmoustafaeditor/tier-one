// The phone (UI41.md "The phone"): the game shell. This file is the OS: the nine apps (id, glyph, unlock level, red
// badge count), the app icon, the field a lock face paints, the look as CSS tokens, and the frame. On a phone the frame
// is the viewport; on desktop it is one phone, centred, at a fixed size (styles/desktop.css). No widgets, no dock, no
// status bar, no home-bar back arrow: every screen has its own back button (ui/screen.tsx <Screen onBack>).
//
// EXPORTS other lanes use:
//   AppId (the UI41 ids + the 4.0 ids as aliases), APPS, appById(id), appKey(id), appOf(route), routeOf(app)
//   <AppIcon id size locked/>, AppGlyph
//   levelInfo(save), unlockLevel(app), isUnlocked(app, save), callLevel(app), canCall(app, save)
//   badgeOf(app, save, trayAppIds?) → number, readFeedFor(app)
//   <Wall p/>, <LookThumb it/>, lookStyle(look), toneOf(look), useClock(ms)
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { Save } from '../lib/save';
import { getSave } from '../lib/save';
import { useLook, type Look } from '../lib/phones';
import type { Item } from '../lib/catalog';
import { ymdUTC } from '../lib/meta';
import { unreadOf, markRead } from '../lib/byline';
import { missionsView } from '../lib/progress';
import { offersFor } from '../lib/deals';
import { unpaid } from '../lib/awards';
import { weeklyReady } from '../lib/missions41';
import { trackView } from '../lib/season';
import { levelOfSave, levelUnlocks, type LevelView } from '../lib/economy';
import type { Route } from '../App';

// ---------------------------------------------------------------- the nine apps
export type AppKey = 'daily' | 'career' | 'deadline' | 'wire' | 'rooms' | 'card' | 'missions' | 'shop' | 'settings';
/** 4.0 ids still used by tray items and older code; each resolves to an AppKey through appById(). */
export type LegacyApp = 'blurt' | 'dms' | 'lens' | 'story' | 'live' | 'market' | 'groups' | 'boards';
export type AppId = AppKey | LegacyApp;
export type Badge = number;
export interface AppDef { id: AppKey; accent: string; unlock: number; calls?: number; route: Route; aliases: string[] }
const today = () => ymdUTC();
export const APPS: AppDef[] = [
  { id: 'daily', accent: '#E8462A', unlock: 1, route: { n: 'daily' }, aliases: ['blurt', 'window', 'feed', 'practice'] },
  { id: 'career', accent: '#C9466A', unlock: 1, route: { n: 'story' }, aliases: ['story', 'desk', 'editor'] },
  { id: 'deadline', accent: '#B51B2C', unlock: levelUnlocks.live, route: { n: 'ddlive' }, aliases: ['live', 'ddlive', 'dd'] },
  { id: 'wire', accent: '#2A93C2', unlock: 1, calls: levelUnlocks.market, route: { n: 'wire' }, aliases: ['market', 'rumours'] },
  { id: 'rooms', accent: '#3E8C86', unlock: levelUnlocks.groups, route: { n: 'rooms' }, aliases: ['groups', 'newsroom', 'friends', 'room'] },
  { id: 'card', accent: '#E3A92B', unlock: 1, route: { n: 'card' }, aliases: ['lens', 'me', 'profile', 'boards', 'leaderboards', 'lb', 'pass', 'dms', 'contacts', 'press'] },
  { id: 'missions', accent: '#2E9E61', unlock: 1, route: { n: 'missions' }, aliases: ['mission', 'season'] },
  { id: 'shop', accent: '#7C5CFF', unlock: 1, route: { n: 'shop' }, aliases: ['customize', 'looks', 'store'] },
  { id: 'settings', accent: '#7A7266', unlock: 1, route: { n: 'settings' }, aliases: ['howto', 'options'] },
];
export const APP_IDS = APPS.map((a) => a.id);
export const appById = (id: string): AppDef | null => APPS.find((a) => a.id === id || a.aliases.includes(id)) || null;
export const appKey = (id: string): AppKey | null => appById(id)?.id || null;
/** The app a route lives in (null for the home screen). */
export function appOf(r: Route): AppKey | null {
  switch (r.n) {
    case 'front': return null;
    case 'daily': case 'feed': case 'practice': return 'daily';
    case 'play': return r.mode === 'career' ? 'career' : r.mode === 'deadline' ? 'deadline' : r.mode === 'challenge' ? 'rooms' : 'daily';
    case 'room': case 'rooms': case 'newsroom': return 'rooms';
    case 'story': case 'desk': case 'editor': return 'career';
    case 'ddlive': return 'deadline';
    case 'wire': return 'wire';
    case 'card': case 'me': case 'pass': case 'boards': case 'contacts': case 'rivals': return 'card';
    case 'missions': return 'missions';
    case 'shop': case 'customize': return 'shop';
    case 'howto': case 'settings': return 'settings';
  }
  return null;
}
export const routeOf = (app: AppId): Route => (appById(app) || APPS[0]).route;

// ---------------------------------------------------------------- badges: a red count for things that need you
const FEED_KINDS: Partial<Record<AppKey, string[]>> = { wire: ['wire'], rooms: ['room', 'challenge', 'friend', 'newsroom'] };
const feedFor = (s: Save, a: AppKey) => { const k = FEED_KINDS[a] || []; return unreadOf(s).filter((f) => k.includes(f.kind)); };
/** Marks the app's feed lines read (App.tsx calls it when an app opens). */
export function readFeedFor(a: AppId) { const k = appKey(a); if (!k) return; const ids = feedFor(getSave(), k).map((f) => f.id); if (ids.length) markRead(ids); }
/** The count on a tile: Daily not played, missions to claim, a resolved Wire call, a room round, a prize or offer.
 *  `tray` = the app ids of unread tray items (any spelling). */
export function badgeOf(app: AppDef | AppKey, s: Save, tray: string[] = []): Badge {
  const id = typeof app === 'string' ? app : app.id;
  if (!isUnlocked(id, s)) return 0;
  const fromTray = id === 'wire' || id === 'rooms' ? tray.filter((x) => appKey(x) === id).length : 0;
  switch (id) {
    case 'daily': return s.daily[today()] ? 0 : 1;
    case 'missions': return (missionsView(s) || []).filter((m) => m.done && !m.claimed).length + weeklyReady(s) + trackView(s).ready;
    case 'wire': return feedFor(s, 'wire').length + fromTray;
    case 'rooms': return feedFor(s, 'rooms').length + fromTray;
    case 'card': return unpaid(s).length + offersFor(s).length;
    default: return 0;
  }
}

// ---------------------------------------------------------------- level and unlocks (lib/economy.ts is the source)
export const levelInfo = (s: Save = getSave()): LevelView => levelOfSave(s);
export const unlockLevel = (app: AppId) => appById(app)?.unlock || 1;
export const isUnlocked = (app: AppId, s: Save = getSave()) => levelInfo(s).n >= unlockLevel(app);
/** The level an app's own call action opens at (the Wire: watching is free, calls at Level 2). */
export const callLevel = (app: AppId) => appById(app)?.calls || 1;
export const canCall = (app: AppId, s: Save = getSave()) => levelInfo(s).n >= callLevel(app);

// ---------------------------------------------------------------- the icons (24-grid line glyphs, one family)
const IC: Record<AppKey, string> = {
  daily: 'M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2zM4.5 9.5h15M8.5 2.5V6M15.5 2.5V6M12.8 12l-2.3 3.2h3l-2.3 3.3',
  career: 'M5 4h14v16l-7-4-7 4zM8.5 8.5h7M8.5 12h4.5',
  deadline: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4.2l2.8 1.8M9.5 2.5h5M19 5.5l1.5 1.5',
  wire: 'M3 19h18M3.5 14.5l5-5.5 4 3.5 6.5-7M14.5 5.5H19V10',
  rooms: 'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16.5 10.5a3 3 0 1 0 0-6M18 14.2c2.3.7 3.5 2.6 3.5 5.8',
  card: 'M3 6.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8.5 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5.5 16.2c.4-1.6 1.6-2.4 3-2.4s2.6.8 3 2.4M14 9.5h4M14 13h4',
  missions: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  shop: 'M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8zM9 10.5V6.5a3 3 0 0 1 6 0v4',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
};
export function AppGlyph({ id, size = 24 }: { id: AppId; size?: number }) {
  const k = appKey(id) || 'daily';
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={k === 'settings' ? 1.8 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={IC[k]} /></svg>;
}
/** The app icon: the app's colour on a rounded square, the glyph in white. `locked` greys it. */
export function AppIcon({ id, size = 56, locked, className = '', style }: { id: AppId; size?: number; locked?: boolean; className?: string; style?: CSSProperties }) {
  const a = appById(id) || APPS[0];
  return <span className={'ph-ic' + (locked ? ' is-locked' : '') + (className ? ' ' + className : '')} data-app={a.id}
    style={{ ['--a' as string]: a.accent, ['--sz' as string]: size + 'px', ...style }} aria-hidden="true">
    <AppGlyph id={a.id} size={Math.round(size * 0.5)} />
  </span>;
}

// ---------------------------------------------------------------- the clock
export function useClock(ms = 15000) {
  const [now, set] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => set(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

// ---------------------------------------------------------------- the field: lock faces and wallpapers
export interface WallP { bg: string; ink: string; accent: string; motif: string; c2?: string }
/** A generative field: colour, grain and one drawn motif. `split` paints the club-colour split. */
export function Wall({ p, split, className = '', children }: { p: WallP; split?: boolean; className?: string; children?: ReactNode }) {
  return <div className={'sh-wall ' + className} data-motif={p.motif} data-split={split ? '' : undefined} aria-hidden="true"
    style={{ ['--w-bg' as string]: p.bg, ['--w-ink' as string]: p.ink, ['--w-acc' as string]: p.accent, ['--w-c2' as string]: p.c2 || p.accent }}>{children}</div>;
}
const faceVar = (f?: string) => (f === 'editorial' ? 'var(--f-display)' : f === 'cond' ? 'var(--f-cond)' : 'var(--f-text)');
/** A small picture of a phone look (Shop tiles): lock face, wallpaper, theme or phone skin. */
export function LookThumb({ it }: { it: Item }) {
  const p = it.preview;
  switch (p.k) {
    case 'lockface': return <span className="sh-th sh-th--lf"><Wall p={p} split={p.clock === 'split'} /><b style={{ color: p.ink }}>09<i style={{ color: p.accent }}>:</i>41</b></span>;
    case 'wallpaper': return <span className="sh-th sh-th--lf"><Wall p={p} /></span>;
    case 'theme': { const o = p.os || { bg: '#14110D', ink: '#F3ECDD', accent: '#F2B632', bar: '#1E1A15' }; return <span className="sh-th sh-th--th" style={{ background: o.bg, color: o.ink }}><i style={{ background: o.bar }} /><b style={{ fontFamily: faceVar(o.face) }}>Aa</b><em style={{ background: o.accent }} /></span>; }
    case 'device': return <span className="sh-th sh-th--dv" style={{ ['--dv-bezel' as string]: p.bezel, ['--dv-frame' as string]: p.frame, ['--dv-r' as string]: Math.round(p.radius / 4) + 'px' }}><i /></span>;
    default: return <span className="sh-th" />;
  }
}

// ---------------------------------------------------------------- the frame
/** The phone. Below 1024px it is the viewport; from 1024px one phone sits centred on the desk at a fixed size. */
export function Phone({ app, locked, children }: { app: AppKey | null; locked: boolean; children: ReactNode }) {
  const look = useLook();
  const dv = look.device.preview.k === 'device' ? look.device.preview : null;
  const a = app ? appById(app) : null;
  return <div className="ph-desk" style={lookStyle(look)} data-tone={toneOf(look)} data-notch={dv?.notch || 'pill'} data-crack={dv?.crack ? '' : undefined}>
    <div className={'ph' + (locked ? ' is-locked' : '') + (app ? ' has-app' : '')} data-app={app || 'home'} style={a ? { ['--app-c' as string]: a.accent } : undefined}>
      <div className="ph__screen">{children}</div>
    </div>
  </div>;
}

// ---------------------------------------------------------------- the look as tokens
const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
/** 'light' when the equipped theme is a pale surface, so the tokens and glyphs flip. */
export const toneOf = (look: Look): 'light' | 'dark' => { const o = look.theme.preview.k === 'theme' && look.theme.source !== 'standard' ? look.theme.preview.os : null; return o && lum(o.bg) > 0.4 ? 'light' : 'dark'; };
/** The CSS variables the phone wears: the accent, the theme's surface and ink, and the phone skin's frame. Secondary
 *  ink is mixed no lighter than 62% so small text keeps 4.5:1 on its own surface. */
export function lookStyle(look: Look): CSSProperties {
  const v: Record<string, string> = { '--acc': look.accent };
  const o = look.theme.preview.k === 'theme' && look.theme.source !== 'standard' ? look.theme.preview.os : null;
  if (o) {
    Object.assign(v, {
      '--os-bg': o.bg, '--os-bg-2': `color-mix(in srgb, ${o.bg} 90%, ${o.ink})`, '--os-bg-3': `color-mix(in srgb, ${o.bg} 80%, ${o.ink})`,
      '--os-ink': o.ink, '--os-ink-2': `color-mix(in srgb, ${o.ink} 80%, ${o.bg})`, '--os-ink-3': `color-mix(in srgb, ${o.ink} 66%, ${o.bg})`,
      '--os-line': `color-mix(in srgb, ${o.ink} 14%, transparent)`, '--os-bar': o.bar,
      '--os-desk': `color-mix(in srgb, ${o.bg} 70%, #000)`, '--os-desk-2': `color-mix(in srgb, ${o.bg} 88%, ${o.ink})`,
    });
    if (o.radius != null) v['--os-r-card'] = o.radius + 'px';
    if (o.face) v['--os-face'] = faceVar(o.face);
  }
  const d = look.device.preview.k === 'device' ? look.device.preview : null;
  if (d) Object.assign(v, { '--dv-bezel': d.bezel, '--dv-frame': d.frame, '--os-r-phone': d.radius + 'px' });
  return v as CSSProperties;
}
