// The chrome (brief §28–§29): one top bar that shows only what the current screen needs, and the five-destination
// bottom bar (Home · Daily · Career · Rooms · My Press Card). Screens pass `back`, `title`, `onHelp`, `onMenu`; what
// else appears is decided here from the route App sets with setChromeRoute():
//   bell     Home and the hubs (today, me, story, rooms, wire) and the small pages; never inside a window or the Shop
//   wallet   only where currency matters: the Shop, the season track, Contacts (coffee), Missions; Home shows a compact pill
//   help     where the screen passes it (Career, Market, Rooms)
import { useSyncExternalStore, type ReactNode } from 'react';
import { useT } from '../lib/i18n';
import { useSave } from '../lib/save';
import { sfx } from '../lib/sfx';
import type { Route } from '../App';
import { Icon } from './bits';
import { Roll } from './game';
import { Bell, navTo } from './connect';

// ---------- the route, for components that render inside every screen (TopBar) but get no props about it
let chromeRoute: Route['n'] = 'front';
const routeSubs = new Set<() => void>();
export function setChromeRoute(n: Route['n']) { if (n === chromeRoute) return; chromeRoute = n; routeSubs.forEach((f) => f()); }
export const getChromeRoute = () => chromeRoute;
export function useChromeRoute(): Route['n'] { return useSyncExternalStore((f) => { routeSubs.add(f); return () => routeSubs.delete(f); }, () => chromeRoute); }

const WALLET_ROUTES = new Set<Route['n']>(['customize', 'pass', 'contacts', 'missions']);
const NO_BELL = new Set<Route['n']>(['daily', 'room', 'play', 'customize', 'howto', 'ddlive']);

// ---------- the five destinations (§29). Transfer Market is a Home card (and the bell's notes), not a tab.
export const TABS: { n: Route['n']; k: string; icon: string; c: string }[] = [
  { n: 'front', k: 'sh.tabs.home', icon: 'desk', c: 'var(--red)' },
  { n: 'today', k: 'sh.tabs.daily', icon: 'daily', c: 'var(--m-daily)' },
  { n: 'story', k: 'sh.tabs.career', icon: 'career', c: 'var(--m-story)' },
  { n: 'rooms', k: 'sh.tabs.rooms', icon: 'rooms', c: 'var(--m-rooms)' },
  { n: 'me', k: 'sh.tabs.me', icon: 'card', c: 'var(--gold)' },
];
/** Which tab a route lights up. Everything the Daily owns (the hub, the board, Practice, Deadline Day Live, the Daily
 *  table) is the Daily tab; everything about your name is My Press Card; the Market, Shop, Missions and How to play
 *  are reached from Home and keep Home lit. */
export function tabOf(r: Route): Route['n'] {
  switch (r.n) {
    case 'play': return r.mode === 'career' ? 'story' : 'today';
    case 'daily': case 'today': case 'practice': case 'ddlive': return 'today';
    case 'boards': return r.period === 'rooms' ? 'rooms' : r.period === 'wire' ? 'front' : r.from && r.from.n === 'me' ? 'me' : 'today';
    case 'desk': case 'story': return 'story';
    case 'room': case 'newsroom': case 'rooms': return 'rooms';
    case 'me': case 'pass': case 'rivals': case 'contacts': case 'feed': return 'me';
    default: return 'front';
  }
}

// ---------- the compact wallet pill: coins · credits in one target, opens the Shop (§25 "compact currency area")
export function WalletPill({ compact }: { compact?: boolean }) {
  const s = useSave(); const t = useT();
  const cr = s.wallet?.credits || 0;
  return <button type="button" className={'g-wal' + (compact ? ' g-wal--compact' : '')} onClick={() => { sfx('ui.tap'); navTo({ n: 'customize' }); }} aria-label={t('sh.top.wallet', { c: s.credits, k: cr })}>
    <span className="g-wal__b"><span className="g-coin" aria-hidden="true" /><Roll n={s.credits} from0={false} /></span>
    <span className="g-wal__b g-wal__b--c"><Icon n="credit" size={15} /><Roll n={cr} from0={false} /></span>
  </button>;
}

// ---------- the top bar
export function TopBar({ back, title, onHelp, onMenu, children, bell, wallet }: { back?: { label: string; onClick: () => void }; title?: ReactNode; onHelp?: () => void; onMenu?: () => void; children?: ReactNode; bell?: boolean; wallet?: boolean }) {
  const t = useT();
  const route = useChromeRoute();
  const showBell = bell ?? !NO_BELL.has(route);
  const showWallet = wallet ?? (WALLET_ROUTES.has(route) || route === 'front');
  return <header className="g-top">
    {back ? <button className="g-top__back" onClick={() => { sfx('ui.tap'); back.onClick(); }} aria-label={t('sh.top.back') + ': ' + back.label}><Icon n={t.rtl ? 'arrow' : 'back'} size={20} /><span>{back.label}</span></button>
      : <span className="g-top__logo">Tier One</span>}
    {title && <span className="g-top__title" dir="auto">{title}</span>}
    <span className="g-top__end">
      {children}
      {showWallet && <WalletPill compact={route === 'front'} />}
      {showBell && <Bell />}
      {onHelp && <button className="g-icbtn" onClick={onHelp} aria-label={t('nav.howto')}><Icon n="help" /></button>}
      {onMenu && <button className="g-icbtn" onClick={onMenu} aria-label={t('sh.top.menu')}><Icon n="menu" /></button>}
    </span>
  </header>;
}
