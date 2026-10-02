import { useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { flushSync } from 'react-dom';
import { useSaveSel, shallowEq, update, getSave } from './lib/save';
import { useT } from './lib/i18n';
import { sfx } from './lib/sfx';
import { checkPurchase } from './lib/monet';
import { Toasts } from './ui/bits';
import { bootPlatform, detectPlatform } from './lib/account';
import { remoteDriver, localDriver, type Driver, type RoomRef } from './lib/driver';
import { Home, dailyLiveDay } from './screens/Home';
import { Icon, installTilt, prefersReducedMotion, TopBar } from './ui/game';
// 3.8 shell (launch brief §28–§29, §32–§33, §54): the chrome decides what the top bar shows per route, the five
// destinations live in ui/chrome.tsx, the morning briefing and the notification ask mount here, and the funnel's
// route-based events are sent from go() so no screen has to remember to.
import { TABS, tabOf, setChromeRoute } from './ui/chrome';
import { MorningPapers } from './ui/morning';
import { PushAsk } from './ui/notify';
import { trackAppOpen, funnel } from './lib/analytics';
import { onByline } from './lib/byline';
import { ymdUTC } from './lib/meta';
import { dailyNoToday } from './screens/Front';
// Code-split web build (GOTY.md §8.2): Home ships with the shell; every other screen, the settings sheet, onboarding
// and the scene host (with the films) are their own chunks, fetched on first use (the service worker keeps the play
// loop's chunks cached after its install; nothing is evaluated early, so idle time stays free for scrolling).
// The single-file build inlines them all the same (Vite folds dynamic imports into one bundle there).
const MeScreen = lazy(() => import('./screens/Me').then((m) => ({ default: m.MeScreen })));
const WindowScreen = lazy(() => import('./screens/Window').then((m) => ({ default: m.WindowScreen })));
const WireScreen = lazy(() => import('./screens/Wire').then((m) => ({ default: m.WireScreen })));
const StoryScreen = lazy(() => import('./screens/Story').then((m) => ({ default: m.StoryScreen })));
const PracticeScreen = lazy(() => import('./screens/Practice').then((m) => ({ default: m.PracticeScreen })));
const RoomsScreen = lazy(() => import('./screens/Rooms').then((m) => ({ default: m.RoomsScreen })));
const HowTo = lazy(() => import('./screens/HowTo').then((m) => ({ default: m.HowTo })));
const SettingsSheet = lazy(() => import('./screens/Settings').then((m) => ({ default: m.SettingsSheet })));
const Onboarding = lazy(() => import('./screens/Onboarding').then((m) => ({ default: m.Onboarding })));
const FeedScreen = lazy(() => import('./screens/Connect').then((m) => ({ default: m.FeedScreen })));
const RivalsScreen = lazy(() => import('./screens/Connect').then((m) => ({ default: m.RivalsScreen })));
const ContactsScreen = lazy(() => import('./screens/Connect').then((m) => ({ default: m.ContactsScreen })));
const CustomizeScreen = lazy(() => import('./screens/Customize').then((m) => ({ default: m.CustomizeScreen })));
const DDLiveScreen = lazy(() => import('./screens/DDLive').then((m) => ({ default: m.DDLiveScreen })));
const BoardsScreen = lazy(() => import('./screens/Boards').then((m) => ({ default: m.BoardsScreen })));
const DailyHubScreen = lazy(() => import('./screens/DailyHub').then((m) => ({ default: m.DailyHubScreen })));
const MissionsScreen = lazy(() => import('./screens/Missions').then((m) => ({ default: m.MissionsScreen })));
import { setNav } from './screens/Connect';
import { SocialWatch } from './ui/social';
import { captureReferral, headlineVars, headlineStyle } from './lib/wallet';
import './lib/earned'; // registers the earned-looks hook (lib/earnhook.ts) the game events call
import { checkPrizes } from './lib/awards';
// Shell layer (GOTY.md §4): motion tokens + view transitions, then the tablet/desktop layouts. Loaded after the screen styles.
import './styles/motion.css';
import './styles/desktop.css';
import './styles/system.css'; // the one design system (docs/spec/M-ui-design-system.md): tokens, then the last word on the shared parts
import './styles/fit.css'; // one-screen pages (no page scroll), pagers and tips
import './styles/theme39.css'; // 3.9 Newsroom (UI39.md): the one palette and type, last word on colour

export type Route =
  | { n: 'front' } | { n: 'daily' } | { n: 'wire'; rid?: string } | { n: 'desk' } | { n: 'story' } | { n: 'me' } | { n: 'pass' } | { n: 'practice' }
  | { n: 'rooms'; code?: string; challenge?: string; expired?: boolean } | { n: 'newsroom'; code?: string } | { n: 'howto' } | { n: 'feed' } | { n: 'rivals' } | { n: 'contacts' } | { n: 'customize'; sec?: 'featured' | 'cosmetics' | 'season' | 'owned'; cur?: 'coins' | 'credits' } | { n: 'ddlive' }
  | { n: 'boards'; period?: 'daily' | 'weekly' | 'rooms' | 'wire'; from?: Route } | { n: 'today' } | { n: 'missions' }
  | { n: 'play'; mode: 'practice' | 'career'; key: number } | { n: 'room'; room: RoomRef; key: number };
export type Go = (r: Route) => void;

function initialRoute(): Route {
  const q = new URLSearchParams(location.search);
  if (q.get('room')) return { n: 'rooms', code: q.get('room')!.toUpperCase().slice(0, 8) };
  // Multiplayer is Rooms only (3.6): challenge and newsroom links say they have expired and land on Rooms.
  if (q.get('challenge') || q.get('newsroom')) return { n: 'rooms', expired: true };
  const tab = q.get('tab');
  if (tab === 'desk') return { n: 'story' };
  if (tab === 'daily' || tab === 'wire' || tab === 'story' || tab === 'me' || tab === 'pass' || tab === 'practice' || tab === 'howto' || tab === 'rooms' || tab === 'feed' || tab === 'rivals' || tab === 'contacts' || tab === 'customize' || tab === 'ddlive' || tab === 'boards' || tab === 'today' || tab === 'missions') return { n: tab } as Route;
  if (tab === 'shop') return { n: 'customize' };
  if (tab === 'newsroom') return { n: 'rooms', expired: true };
  return { n: 'front' };
}

export function App() {
  // Only the fields the shell reads: a save update elsewhere (a call, coins, a mission) doesn't re-render the whole App.
  const s = useSaveSel((x) => ({ lang: x.lang, edition: x.edition, theme: x.theme, reduced: x.reduced, onboarded: x.onboarded, careerLive: !!(x.career && x.career.live) }), shallowEq);
  const t = useT();
  const [route, setRoute] = useState<Route>(() => { const r = initialRoute(); setChromeRoute(r.n); return r; });
  const [settings, setSettings] = useState(false);
  useEffect(() => { checkPurchase(); bootPlatform(__APP_VERSION__).catch(() => { /* offline: the game runs on the local save */ }); }, []);
  useEffect(() => { captureReferral(); }, []);
  useEffect(() => { const id = setTimeout(() => { checkPrizes(); }, 2500); return () => clearTimeout(id); }, []); // SAIF-03: yesterday's / last week's placing // ?ref=CODE (lib/wallet.ts): both players earn credits after the friend's first window

  // ---- the funnel (brief §54): app open + D1/D7/D30, onboarding started/completed, Daily finished, Career started
  useEffect(() => { trackAppOpen({ platform: detectPlatform(), onboarded: getSave().onboarded, pwa: matchMedia('(display-mode: standalone)').matches }); }, []);
  const wasOnboarded = useRef(s.onboarded);
  useEffect(() => {
    if (!s.onboarded) funnel.onboardingStarted();
    else if (!wasOnboarded.current) funnel.onboardingCompleted({ tutorial: !getSave().tut?.done });
    wasOnboarded.current = s.onboarded;
  }, [s.onboarded]);
  useEffect(() => { if (s.careerLive) funnel.careerStarted(); }, [s.careerLive]);
  useEffect(() => onByline((e) => { if (e.kind === 'window' && e.w.mode === 'daily') funnel.dailyFinished({ no: e.w.no || 0, tier: String(e.w.tier || ''), total: Number(e.w.total || 0) }); }), []);

  // Language, direction and edition live on <html> so tokens.css and :lang(ar) rules apply everywhere.
  useEffect(() => {
    const h = document.documentElement;
    h.lang = s.lang; h.dir = s.lang === 'ar' ? 'rtl' : 'ltr';
    if (s.edition) h.setAttribute('data-edition', s.edition); else h.removeAttribute('data-edition');
    h.setAttribute('data-theme', s.theme || 'standard');
    h.classList.toggle('reduce', s.reduced);
    document.title = 'Tier One · ' + t('brand.edition');
  }, [s.lang, s.edition, s.theme, s.reduced]);

  // Page changes: a View Transition where supported, sliding in tab order (left/right, mirrored in Arabic); into and out of
  // the window it scales like picking up a sheet. Without the API, motion.css plays the same slide on the new .g-screen.
  const routeRef = useRef(route); routeRef.current = route;
  const go: Go = useCallback((r: Route) => {
    const reduce = prefersReducedMotion();
    const from = routeRef.current;
    // Route-based funnel events, sent once here rather than from every button that leads somewhere.
    if (r.n === 'today' || (r.n === 'daily' && from.n !== 'today')) funnel.dailyViewed(dailyNoToday());
    if (r.n === 'daily') { const sv = getSave(); if (!sv.daily[ymdUTC()] && !dailyLiveDay(sv)) funnel.dailyStarted(dailyNoToday()); }
    if (r.n === 'customize' && from.n !== 'customize') funnel.storeOpened(from.n);
    setChromeRoute(r.n);
    const swap = () => { setRoute(r); window.scrollTo(0, 0); };
    const d = document as Document & { startViewTransition?: (f: () => void) => { finished: Promise<void> } };
    const h = document.documentElement;
    sfx('page.turn');
    h.dataset.route = r.n;
    const dir = reduce ? 'none' : vtDir(from, r);
    h.dataset.vt = dir;
    if (!reduce && d.startViewTransition) {
      try { d.startViewTransition(() => flushSync(swap)).finished.finally(() => { if (h.dataset.vt !== 'none') delete h.dataset.vt; }); return; } catch { /* fall through */ }
    }
    swap();
  }, []);
  useEffect(() => { document.documentElement.classList.toggle('has-vt', 'startViewTransition' in document); }, []);
  // Your desk: the equipped headline font rides on <html> (data-hd + --hd-*), so the results front page and the byline
  // card pick it up from CSS (styles/customize.css) without those screens knowing. The standard wood type sets nothing.
  const hdId = useSaveSel((x) => x.desk?.equip?.headline || '');
  useEffect(() => {
    const h = document.documentElement; const on = !!hdId && !hdId.startsWith('std.');
    const v = headlineVars(); const face = headlineStyle().face;
    for (const k of ['--hd-face', '--hd-case', '--hd-ink']) { if (on && v[k]) h.style.setProperty(k, v[k]); else h.style.removeProperty(k); }
    if (on) h.setAttribute('data-hd', face); else h.removeAttribute('data-hd');
  }, [hdId]);

  // Android Back: the WebView calls window.__tierBack(); true when handled.
  useEffect(() => {
    (window as any).__tierBack = () => { if (route.n !== 'front') { go({ n: 'front' }); return true; } return false; };
  }, [route, go]);

  // Desktop keyboard: 1–5 opens that saga on the board, Esc goes back, ? opens how to play. Never while typing or in a dialog.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const modal = document.querySelector('[role="dialog"], [aria-modal="true"], .scrim, .g-overlay');
      if (e.key === 'Escape') {
        if (modal) return; // sheets and scenes close themselves
        const back = document.querySelector<HTMLButtonElement>('.g-top__back, .bar__back');
        if (back) { e.preventDefault(); back.click(); return; }
        if ((window as any).__tierBack?.()) e.preventDefault();
        return;
      }
      if (modal) return;
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) { e.preventDefault(); if (routeRef.current.n !== 'howto') go({ n: 'howto' }); return; }
      if (/^[1-5]$/.test(e.key)) {
        const cards = document.querySelectorAll<HTMLButtonElement>('[data-pick], .sagas .scard, .ddb .ddc__who');
        const c = cards[Number(e.key) - 1];
        if (c && !c.disabled) { e.preventDefault(); c.click(); c.focus({ preventScroll: true }); }
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [go]);

  useEffect(() => installTilt(), []);

  const driver: Driver | null = useMemo(() => {
    if (route.n === 'daily') return remoteDriver();
    if (route.n === 'room') return remoteDriver(route.room);
    if (route.n === 'play') {
      const sv = getSave();
      const lw = route.mode === 'practice' ? sv.practice.live : sv.career && sv.career.live;
      return lw ? localDriver(route.mode, lw) : null;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.n === 'daily' ? 'daily' : route.n === 'room' || route.n === 'play' ? route.key : route.n]);

  const edition = () => update((x) => { const cur = x.edition || (matchMedia('(prefers-color-scheme: dark)').matches ? 'late' : 'morning'); x.edition = cur === 'late' ? 'morning' : 'late'; });
  const tab = tabOf(route);
  const inWindow = (route.n === 'daily' || route.n === 'room' || route.n === 'play') && !!driver;
  const chrome = { go, openSettings: () => setSettings(true), edition };
  setNav(go);

  let screen;
  switch (route.n) {
    case 'front': screen = <Home {...chrome} />; break;
    case 'daily': case 'room': case 'play': screen = driver ? <WindowScreen key={route.n === 'daily' ? 'daily' : route.key} driver={driver} {...chrome} /> : <Home {...chrome} />; break;
    case 'wire': screen = <WireScreen {...chrome} rid={route.rid} />; break;
    case 'desk': case 'story': screen = <StoryScreen {...chrome} />; break;
    case 'me': screen = <MeScreen {...chrome} />; break;
    case 'pass': screen = <CustomizeScreen key="season" {...chrome} sec="season" />; break; // 3.8: the season track lives in the one Store
    case 'practice': screen = <PracticeScreen {...chrome} />; break;
    case 'rooms': screen = <RoomsScreen {...chrome} code={route.code} expired={route.expired || !!route.challenge} />; break;
    case 'newsroom': screen = <RoomsScreen {...chrome} expired />; break;
    case 'howto': screen = <HowTo {...chrome} />; break;
    case 'feed': screen = <FeedScreen {...chrome} />; break;
    case 'rivals': screen = <RivalsScreen {...chrome} />; break;
    case 'contacts': screen = <ContactsScreen {...chrome} />; break;
    case 'customize': screen = <CustomizeScreen key={(route.sec || '') + (route.cur || '')} {...chrome} sec={route.sec} cur={route.cur} />; break;
    case 'ddlive': screen = <DDLiveScreen {...chrome} />; break;
    case 'boards': screen = <BoardsScreen {...chrome} period={route.period} from={route.from} />; break;
    case 'today': screen = <DailyHubScreen {...chrome} />; break;
    case 'missions': screen = <MissionsScreen {...chrome} />; break;
  }
  return <>
    <Suspense fallback={<RouteStage />}>{screen}</Suspense>
    {!inWindow && <nav className="g-tabs" aria-label="Sections" style={{ ['--tab-i' as string]: Math.max(0, TABS.findIndex((x) => x.n === tab)), ['--tab-c' as string]: TABS.find((x) => x.n === tab)?.c }}>
      <span className="g-tabs__brand" aria-hidden="true">T<b>1</b></span>
      {TABS.map((x) => <a key={x.n} href={'?tab=' + x.n} style={{ ['--tab-c' as string]: x.c }} aria-current={tab === x.n ? 'page' : undefined} onClick={(e) => { e.preventDefault(); if (tab === x.n && route.n === x.n) return; go({ n: x.n } as Route); }}><Icon n={x.icon} /><span>{t(x.k)}</span></a>)}
    </nav>}
    <Toasts />
    <Suspense fallback={null}>
      {settings && <SettingsSheet open={settings} onClose={() => setSettings(false)} go={go} />}
      {!s.onboarded && <Onboarding go={go} />}
      <MorningPapers route={route.n} />
      <PushAsk route={route.n} />
      <SocialWatch />
    </Suspense>
  </>;
}
// A route's chunk on its first (uncached) load: the top bar and tab bar stay put and a paper-toned stage holds the
// content area, so the page never blinks to an empty desk. It fades its paper in after 120 ms (a cached chunk never shows it).
function RouteStage() {
  return <div className="g-screen g-stage" aria-busy="true"><TopBar /><div className="g-stage__paper"><i /><i /><i /></div></div>;
}
const TAB_ORDER = TABS.map((x) => x.n);
const isWindow = (r: Route) => r.n === 'daily' || r.n === 'room' || r.n === 'play';
// Which way the page slides: forward/back along the tab bar, 'up' into the window, 'down' out of it, 'fade' within a tab.
function vtDir(from: Route, to: Route): string {
  if (isWindow(to) && !isWindow(from)) return 'up';
  if (isWindow(from) && !isWindow(to)) return 'down';
  const a = TAB_ORDER.indexOf(tabOf(from)), b = TAB_ORDER.indexOf(tabOf(to));
  return a === b ? 'fade' : b > a ? 'fwd' : 'back';
}
export type Chrome = { go: Go; openSettings: () => void; edition: () => void };
export { TABS };
