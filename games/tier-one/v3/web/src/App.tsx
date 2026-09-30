import { useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { flushSync } from 'react-dom';
import { useSaveSel, shallowEq, update, getSave } from './lib/save';
import { useT } from './lib/i18n';
import { sfx } from './lib/sfx';
import { onToasts } from './lib/meta';
import { checkPurchase } from './lib/monet';
import { bootPlatform } from './lib/account';
import { remoteDriver, localDriver, type Driver, type RoomRef } from './lib/driver';
import { Home } from './screens/Home';
import { Icon, installTilt, prefersReducedMotion } from './ui/game';
// Code-split web build (GOTY.md §8.2): Home ships with the shell; every other screen, the settings sheet, onboarding
// and the scene host (with the films) are their own chunks, fetched on first use (the service worker keeps the play
// loop's chunks cached after its install; nothing is evaluated early, so idle time stays free for scrolling).
// The single-file build inlines them all the same (Vite folds dynamic imports into one bundle there).
const MeScreen = lazy(() => import('./screens/Me').then((m) => ({ default: m.MeScreen })));
const WindowScreen = lazy(() => import('./screens/Window').then((m) => ({ default: m.WindowScreen })));
const WireScreen = lazy(() => import('./screens/Wire').then((m) => ({ default: m.WireScreen })));
const StoryScreen = lazy(() => import('./screens/Story').then((m) => ({ default: m.StoryScreen })));
const PassScreen = lazy(() => import('./screens/Pass').then((m) => ({ default: m.PassScreen })));
const PracticeScreen = lazy(() => import('./screens/Practice').then((m) => ({ default: m.PracticeScreen })));
const RoomsScreen = lazy(() => import('./screens/Rooms').then((m) => ({ default: m.RoomsScreen })));
const NewsroomScreen = lazy(() => import('./screens/Newsroom').then((m) => ({ default: m.NewsroomScreen })));
const HowTo = lazy(() => import('./screens/HowTo').then((m) => ({ default: m.HowTo })));
const SettingsSheet = lazy(() => import('./screens/Settings').then((m) => ({ default: m.SettingsSheet })));
const Onboarding = lazy(() => import('./screens/Onboarding').then((m) => ({ default: m.Onboarding })));
const SceneHost = lazy(() => import('./lib/scenes').then((m) => ({ default: m.SceneHost })));
const FeedScreen = lazy(() => import('./screens/Connect').then((m) => ({ default: m.FeedScreen })));
const RivalsScreen = lazy(() => import('./screens/Connect').then((m) => ({ default: m.RivalsScreen })));
const ContactsScreen = lazy(() => import('./screens/Connect').then((m) => ({ default: m.ContactsScreen })));
const CustomizeScreen = lazy(() => import('./screens/Customize').then((m) => ({ default: m.CustomizeScreen })));
const DDLiveScreen = lazy(() => import('./screens/DDLive').then((m) => ({ default: m.DDLiveScreen })));
const EditorDeskScreen = lazy(() => import('./screens/Editor').then((m) => ({ default: m.EditorDeskScreen })));
import { setNav } from './screens/Connect';
import { SocialWatch } from './ui/social';
import { captureReferral } from './lib/wallet';
import { MorningPapers } from './ui/live';
// Shell layer (GOTY.md §4): motion tokens + view transitions, then the tablet/desktop layouts. Loaded after the screen styles.
import './styles/motion.css';
import './styles/desktop.css';

export type Route =
  | { n: 'front' } | { n: 'daily' } | { n: 'wire'; rid?: string } | { n: 'desk' } | { n: 'story' } | { n: 'me' } | { n: 'pass' } | { n: 'practice' }
  | { n: 'rooms'; code?: string; challenge?: string } | { n: 'newsroom'; code?: string } | { n: 'howto' } | { n: 'feed' } | { n: 'rivals' } | { n: 'contacts' } | { n: 'customize' } | { n: 'ddlive' } | { n: 'editor' }
  | { n: 'play'; mode: 'practice' | 'career'; key: number } | { n: 'room'; room: RoomRef; key: number };
export type Go = (r: Route) => void;

const TABS: { n: Route['n']; k: string; icon: string; c: string }[] = [
  { n: 'front', k: 'g.tabs.home', icon: 'home', c: 'var(--red)' }, { n: 'story', k: 'g.tabs.story', icon: 'story', c: 'var(--m-story)' }, { n: 'wire', k: 'g.tabs.wire', icon: 'wire', c: 'var(--m-wire)' },
  { n: 'rooms', k: 'g.tabs.friends', icon: 'friends', c: 'var(--m-rooms)' }, { n: 'me', k: 'g.tabs.me', icon: 'me', c: 'var(--gold)' },
];
const tabOf = (r: Route): Route['n'] => (r.n === 'play' ? (r.mode === 'career' ? 'story' : 'front') : r.n === 'desk' ? 'story' : r.n === 'room' || r.n === 'newsroom' ? 'rooms' : r.n === 'pass' || r.n === 'rivals' || r.n === 'contacts' || r.n === 'customize' ? 'me' : r.n === 'daily' || r.n === 'practice' || r.n === 'howto' || r.n === 'ddlive' || r.n === 'editor' ? 'front' : r.n);

function initialRoute(): Route {
  const q = new URLSearchParams(location.search);
  if (q.get('room')) return { n: 'rooms', code: q.get('room')!.toUpperCase().slice(0, 8) };
  if (q.get('challenge')) return { n: 'rooms', challenge: q.get('challenge')!.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) };
  if (q.get('newsroom')) return { n: 'newsroom', code: q.get('newsroom')!.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) };
  const tab = q.get('tab');
  if (tab === 'desk') return { n: 'story' };
  if (tab === 'daily' || tab === 'wire' || tab === 'story' || tab === 'me' || tab === 'pass' || tab === 'practice' || tab === 'howto' || tab === 'rooms' || tab === 'newsroom' || tab === 'feed' || tab === 'rivals' || tab === 'contacts' || tab === 'customize' || tab === 'ddlive' || tab === 'editor') return { n: tab } as Route;
  return { n: 'front' };
}

export function App() {
  // Only the fields the shell reads: a save update elsewhere (a call, coins, a mission) doesn't re-render the whole App.
  const s = useSaveSel((x) => ({ lang: x.lang, edition: x.edition, theme: x.theme, reduced: x.reduced, onboarded: x.onboarded }), shallowEq);
  const t = useT();
  const [route, setRoute] = useState<Route>(initialRoute);
  const [settings, setSettings] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; kind: string; title: string; body?: string }[]>([]);
  useEffect(() => onToasts(setToasts), []);
  useEffect(() => { checkPurchase(); bootPlatform(__APP_VERSION__).catch(() => { /* offline: the game runs on the local save */ }); }, []);
  useEffect(() => { captureReferral(); }, []); // ?ref=CODE (lib/wallet.ts): both players earn credits after the friend's first window

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
    const swap = () => { setRoute(r); window.scrollTo(0, 0); };
    const d = document as Document & { startViewTransition?: (f: () => void) => { finished: Promise<void> } };
    const h = document.documentElement;
    sfx('page.turn');
    h.dataset.route = r.n;
    h.dataset.vt = reduce ? 'none' : vtDir(routeRef.current, r);
    if (!reduce && d.startViewTransition) {
      try { d.startViewTransition(() => flushSync(swap)).finished.finally(() => { if (h.dataset.vt !== 'none') delete h.dataset.vt; }); return; } catch { /* fall through */ }
    }
    swap();
  }, []);
  useEffect(() => { document.documentElement.classList.toggle('has-vt', 'startViewTransition' in document); }, []);

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
      const modal = document.querySelector('[role="dialog"], [aria-modal="true"], .scrim, .g-overlay, .call-scene, .post-scene');
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
    case 'pass': screen = <PassScreen {...chrome} />; break;
    case 'practice': screen = <PracticeScreen {...chrome} />; break;
    case 'rooms': screen = <RoomsScreen {...chrome} code={route.code} challenge={route.challenge} />; break;
    case 'newsroom': screen = <NewsroomScreen {...chrome} code={route.code} />; break;
    case 'howto': screen = <HowTo {...chrome} />; break;
    case 'feed': screen = <FeedScreen {...chrome} />; break;
    case 'rivals': screen = <RivalsScreen {...chrome} />; break;
    case 'contacts': screen = <ContactsScreen {...chrome} />; break;
    case 'customize': screen = <CustomizeScreen {...chrome} />; break;
    case 'ddlive': screen = <DDLiveScreen {...chrome} />; break;
    case 'editor': screen = <EditorDeskScreen {...chrome} />; break;
  }
  return <>
    <Suspense fallback={null}>{screen}</Suspense>
    {!inWindow && <nav className="g-tabs" aria-label="Sections" style={{ ['--tab-i' as string]: Math.max(0, TABS.findIndex((x) => x.n === tab)), ['--tab-c' as string]: TABS.find((x) => x.n === tab)?.c }}>
      <span className="g-tabs__brand" aria-hidden="true">T<b>1</b></span>
      {TABS.map((x) => <a key={x.n} href={'?tab=' + x.n} style={{ ['--tab-c' as string]: x.c }} aria-current={tab === x.n ? 'page' : undefined} onClick={(e) => { e.preventDefault(); go({ n: x.n } as Route); }}><Icon n={x.icon} /><span>{t(x.k)}</span></a>)}
    </nav>}
    <div className="toasts" aria-live="polite">{toasts.map((x) => <div key={x.id} className={'toast toast--' + x.kind}><b>{x.title}</b>{x.body && <span className="meta">{x.body}</span>}</div>)}</div>
    <Suspense fallback={null}>
      {settings && <SettingsSheet open={settings} onClose={() => setSettings(false)} go={go} />}
      {!s.onboarded && <Onboarding go={go} />}
      <MorningPapers route={route.n} />
      <SceneHost />
      <SocialWatch />
    </Suspense>
  </>;
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
