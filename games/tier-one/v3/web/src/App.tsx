// Tier One 4.0 "Insider": the game is your phone (CONCEPT4.md §2). App.tsx is the OS's router: boot → lock screen →
// home screen → apps. Every screen keeps its Route (other lanes rewrite the screens in phase B); the apps are the
// registry in ui/phone.tsx (appOf(route) says which app a route lives in). `?app=blurt|dms|lens|story|live|market|
// groups|boards|settings` opens an app (`?app=wire` is Market); the legacy `?tab=` links still map.
import { useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { useSaveSel, shallowEq, update, getSave } from './lib/save';
import { useT } from './lib/i18n';
import { sfx } from './lib/sfx';
import { checkPurchase } from './lib/monet';
import { Toasts } from './ui/bits';
import { bootPlatform } from './lib/account';
import { makeDriver, type Driver4, type RoomRef } from './lib/driver';
import { Home } from './screens/Home';
import { LockScreen } from './screens/Front';
import { installTilt, prefersReducedMotion } from './ui/game';
import { Phone, DeskPanel, readFeedFor, AppIcon, appOf, appById, routeOf, isUnlocked, bumpUse, batteryMode, levelInfo, unlockLevel, callLevel, APPS, type AppId } from './ui/phone';
import { NotifyHost, notify, setTrayNav } from './ui/juice';
import { onGain, onDriverDone } from './lib/meta';
import { nextCareerWindow } from './lib/storyMode';
import { setWatchSource } from './lib/widgets';
import { watchList } from './lib/wireData';
// The home screen's Market widget shows the watchlist (lib/wireData.ts save.market.watch).
setWatchSource(() => watchList(getSave()).map((w) => w.rid));
// Code-split web build (GOTY.md §8.2): the home screen and the lock screen ship with the shell; every app is its own
// chunk, fetched on first open (the service worker keeps the play loop's chunks cached after its install).
const MeScreen = lazy(() => import('./screens/Me').then((m) => ({ default: m.MeScreen })));
const WindowScreen = lazy(() => import('./screens/Window').then((m) => ({ default: m.WindowScreen })));
const WireScreen = lazy(() => import('./screens/Wire').then((m) => ({ default: m.WireScreen })));
const StoryScreen = lazy(() => import('./screens/Story').then((m) => ({ default: m.StoryScreen })));
const PassScreen = lazy(() => import('./screens/Pass').then((m) => ({ default: m.PassScreen })));
const PracticeScreen = lazy(() => import('./screens/Practice').then((m) => ({ default: m.PracticeScreen })));
const RoomsScreen = lazy(() => import('./screens/Rooms').then((m) => ({ default: m.RoomsScreen })));
const NewsroomScreen = lazy(() => import('./screens/Newsroom').then((m) => ({ default: m.NewsroomScreen })));
const HowTo = lazy(() => import('./screens/HowTo').then((m) => ({ default: m.HowTo })));
const SettingsScreen = lazy(() => import('./screens/Settings').then((m) => ({ default: m.SettingsScreen })));
const Onboarding = lazy(() => import('./screens/Onboarding').then((m) => ({ default: m.Onboarding })));
const ContactsScreen = lazy(() => import('./screens/Connect').then((m) => ({ default: m.ContactsScreen })));
const CustomizeScreen = lazy(() => import('./screens/Customize').then((m) => ({ default: m.CustomizeScreen })));
const DDLiveScreen = lazy(() => import('./screens/DDLive').then((m) => ({ default: m.DDLiveScreen })));
const EditorDeskScreen = lazy(() => import('./screens/Editor').then((m) => ({ default: m.EditorDeskScreen })));
const BoardsScreen = lazy(() => import('./screens/Boards').then((m) => ({ default: m.BoardsScreen })));
import { setNav } from './screens/Connect';
import { SocialWatch } from './ui/social';
import { captureReferral, headlineVars, headlineStyle } from './lib/wallet';
import './lib/earned'; // registers the earned-looks hook (lib/earnhook.ts) the game events call
import { checkPrizes } from './lib/awards';
import { ymdUTC } from './lib/meta';
import { num } from './lib/i18n';
// Shell layer: motion tokens, the one design system, then the phone OS (styles/phone.css) and the desk (desktop.css). Loaded after the screen styles.
import './styles/motion.css';
import './styles/system.css'; // the shared parts (docs/DESIGN_SYSTEM.md)
import './styles/phone.css'; // the OS: tokens, lock, home, status bar, dock, juice
import './styles/desktop.css'; // ≥1024px: the phone on the desk

export type Route =
  | { n: 'front' } | { n: 'daily' } | { n: 'wire'; rid?: string } | { n: 'desk' } | { n: 'story' } | { n: 'me' } | { n: 'pass' } | { n: 'practice' }
  | { n: 'rooms'; code?: string; challenge?: string } | { n: 'newsroom'; code?: string } | { n: 'howto' } | { n: 'feed' } | { n: 'rivals' } | { n: 'contacts' } | { n: 'customize' } | { n: 'ddlive' } | { n: 'editor' } | { n: 'boards'; period?: 'daily' | 'weekly' | 'wire' }
  | { n: 'settings' }
  | { n: 'play'; mode: 'practice' | 'career' | 'tutorial' | 'deadline' | 'challenge'; key: number } | { n: 'room'; room: RoomRef; key: number };
export type Go = (r: Route) => void;
/** What every screen gets: `go` (any route), `home` (the home screen), `openApp` (an app by id), `openSettings` (the
 *  Settings app), `edition` (toggle the phone's light/dark theme). */
export type Chrome = { go: Go; openSettings: () => void; edition: () => void; home: () => void; openApp: (a: AppId) => void };

const LEGACY_TAB: Record<string, Route> = { desk: { n: 'story' }, daily: { n: 'daily' }, wire: { n: 'wire' }, story: { n: 'story' }, me: { n: 'me' }, pass: { n: 'pass' }, practice: { n: 'practice' }, howto: { n: 'howto' }, rooms: { n: 'rooms' }, newsroom: { n: 'newsroom' }, feed: { n: 'feed' }, rivals: { n: 'rivals' }, contacts: { n: 'contacts' }, customize: { n: 'customize' }, ddlive: { n: 'ddlive' }, editor: { n: 'editor' }, boards: { n: 'boards' }, settings: { n: 'settings' } };
function initialRoute(): { route: Route; locked: boolean } {
  const q = new URLSearchParams(location.search);
  if (q.get('room')) return { route: { n: 'rooms', code: q.get('room')!.toUpperCase().slice(0, 8) }, locked: false };
  if (q.get('challenge')) return { route: { n: 'rooms', challenge: q.get('challenge')!.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) }, locked: false };
  if (q.get('newsroom')) return { route: { n: 'newsroom', code: q.get('newsroom')!.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) }, locked: false };
  const app = q.get('app'); const def = app ? appById(app) : null;
  if (def) return { route: isUnlocked(def.id) ? def.route : { n: 'front' }, locked: false };
  const tab = q.get('tab');
  if (tab && LEGACY_TAB[tab]) return { route: LEGACY_TAB[tab], locked: false };
  return { route: { n: 'front' }, locked: true };
}

export function App() {
  // Only the fields the shell reads: a save update elsewhere (a call, coins, a mission) doesn't re-render the whole App.
  const s = useSaveSel((x) => ({ lang: x.lang, edition: x.edition, theme: x.theme, reduced: x.reduced, onboarded: x.onboarded, xp: x.xp, played: !!x.daily[ymdUTC()], total: x.daily[ymdUTC()]?.total, tier: x.daily[ymdUTC()]?.tier }), shallowEq);
  const t = useT();
  const [init] = useState(initialRoute);
  const [route, setRoute] = useState<Route>(init.route);
  const [locked, setLocked] = useState(init.locked);
  const [anim, setAnim] = useState<'open' | 'close' | 'home' | 'app' | ''>('');
  const [wide, setWide] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(min-width: 1024px)').matches);
  useEffect(() => { const mq = matchMedia('(min-width: 1024px)'); const f = () => setWide(mq.matches); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, []);
  useEffect(() => { checkPurchase(); bootPlatform(__APP_VERSION__).catch(() => { /* offline: the game runs on the local save */ }); }, []);
  useEffect(() => { captureReferral(); }, []);
  useEffect(() => { const id = setTimeout(() => { checkPrizes(); }, 2500); return () => clearTimeout(id); }, []); // yesterday's / last week's placing

  // Language, direction and the phone theme live on <html> so tokens.css and :lang(ar) rules apply everywhere.
  useEffect(() => {
    const h = document.documentElement;
    h.lang = s.lang; h.dir = s.lang === 'ar' ? 'rtl' : 'ltr';
    if (s.edition) h.setAttribute('data-edition', s.edition); else h.removeAttribute('data-edition');
    h.setAttribute('data-theme', s.theme || 'standard');
    h.classList.toggle('reduce', s.reduced);
    h.classList.add('os');
    document.title = 'Tier One';
  }, [s.lang, s.edition, s.theme, s.reduced]);

  // Routing. An app opens with the phone's open transition, closes back to the home screen with the close one; a move
  // inside an app slides. The back stack is the OS's: back pops it, and at an app's root goes home.
  const routeRef = useRef(route); routeRef.current = route;
  const hist = useRef<Route[]>([]);
  const go: Go = useCallback((r0: Route) => {
    // 3.x routes with no 4.0 screen: the feed is Blurt, the rivals are the accounts and bosses in Lens › Profile.
    const r: Route = r0.n === 'feed' ? { n: 'daily' } : r0.n === 'rivals' ? { n: 'me' } : r0;
    const from = routeRef.current, fa = appOf(from), ta = appOf(r);
    if (ta && !isUnlocked(ta)) { sfx('os.locked'); return; } // the tile says "Reach Level N"; never a bare lock
    if (ta && ta !== fa) bumpUse(ta);
    if (ta) readFeedFor(ta); // the app's unread lines (rival posts, contact level-ups …) are seen when it opens
    const a = !ta && fa ? 'close' : ta && !fa ? 'open' : ta !== fa ? 'open' : r.n === from.n ? '' : 'app';
    sfx(a === 'open' ? 'os.open' : a === 'close' ? 'os.close' : a === 'app' ? 'page.turn' : 'ui.tap');
    if (r.n === 'front') hist.current = []; else if (from.n !== 'front' && from.n !== r.n) hist.current = [...hist.current.slice(-12), from];
    document.documentElement.dataset.route = r.n;
    setAnim(prefersReducedMotion() ? '' : a);
    setRoute(r); window.scrollTo(0, 0);
    setLocked(false);
  }, []);
  const home = useCallback(() => go({ n: 'front' }), [go]);
  const openApp = useCallback((a: AppId) => go(routeOf(a)), [go]);
  const back = useCallback((): boolean => {
    const cur = routeRef.current;
    if (cur.n === 'front') return false;
    const prev = hist.current.pop();
    if (prev && appOf(prev) === appOf(cur)) { go(prev); hist.current.pop(); return true; }
    go({ n: 'front' }); return true;
  }, [go]);
  useEffect(() => { setTrayNav(go, openApp); }, [go, openApp]);
  // The lock screen is not Home: anything that waits for Home waits for the unlock.
  useEffect(() => { document.documentElement.dataset.route = locked ? 'lock' : routeRef.current.n; }, [locked]);
  useEffect(() => { document.documentElement.classList.toggle('has-vt', 'startViewTransition' in document); }, []);
  // The equipped headline font rides on <html> (data-hd + --hd-*), so the results card and the share card pick it up from CSS.
  const hdId = useSaveSel((x) => x.desk?.equip?.headline || '');
  useEffect(() => {
    const h = document.documentElement; const on = !!hdId && !hdId.startsWith('std.');
    const v = headlineVars(); const face = headlineStyle().face;
    for (const k of ['--hd-face', '--hd-case', '--hd-ink']) { if (on && v[k]) h.style.setProperty(k, v[k]); else h.style.removeProperty(k); }
    if (on) h.setAttribute('data-hd', face); else h.removeAttribute('data-hd');
  }, [hdId]);

  // Android Back: the WebView calls window.__tierBack(); true when handled.
  useEffect(() => { (window as any).__tierBack = () => (locked ? false : back()); }, [locked, back]);

  // Keyboard: Esc = back / home, 1–9 = the apps in grid order (inside a window 1–5 still pick the cards). Never while typing or in a dialog.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const modal = document.querySelector('[role="dialog"], [aria-modal="true"], .scrim, .g-overlay, .call-scene, .post-scene');
      if (locked) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sfx('os.unlock'); setLocked(false); } return; }
      if (e.key === 'Escape') {
        if (modal) return; // sheets and scenes close themselves
        const b = document.querySelector<HTMLButtonElement>('.g-top__back, .bar__back');
        if (b) { e.preventDefault(); b.click(); return; }
        if (back()) e.preventDefault();
        return;
      }
      if (modal) return;
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) { e.preventDefault(); if (routeRef.current.n !== 'howto') go({ n: 'howto' }); return; }
      if (/^[1-9]$/.test(e.key)) {
        const cur = routeRef.current;
        if (cur.n === 'daily' || cur.n === 'play' || cur.n === 'room' || cur.n === 'ddlive') {
          const cards = document.querySelectorAll<HTMLButtonElement>('[data-pick], .sagas .scard, .ddb .ddc__who');
          const c = cards[Number(e.key) - 1];
          if (c && !c.disabled) { e.preventDefault(); c.click(); c.focus({ preventScroll: true }); }
          return;
        }
        const a = APPS[Number(e.key) - 1]; if (a) { e.preventDefault(); openApp(a.id); }
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [go, back, openApp, locked]);

  useEffect(() => installTilt(), []);

  // Every window runs on the 4.0 driver (lib/driver.ts) and settles once through lib/meta.ts onDriverDone; Blurt
  // (screens/Blurt.tsx via screens/Window.tsx) reads the Gain it fires. 'play' resumes the mode's live window or starts one.
  const driver: Driver4 | null = useMemo(() => {
    if (route.n === 'daily') return makeDriver({ mode: 'daily', onDone: onDriverDone });
    if (route.n === 'room') return makeDriver({ mode: 'room', room: route.room, onDone: onDriverDone });
    if (route.n === 'play' && route.mode === 'career') {
      // Story (lib/storyMode.ts): the chapter's rules, cast and boss; onStoryDone scores the head-to-head, then onCareerDone.
      const w = nextCareerWindow(getSave());
      return makeDriver({ mode: 'career', seed: w.seed, rules: w.rules, cast: w.cast, label: w.label, onDone: w.onDone });
    }
    if (route.n === 'play') return makeDriver({ mode: route.mode, onDone: onDriverDone });
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.n === 'daily' ? 'daily' : route.n === 'room' || route.n === 'play' ? route.key : route.n]);

  const inWindow = (route.n === 'daily' || route.n === 'room' || route.n === 'play') && !!driver;
  // The battery: a window drains it, results recharge it, the rest of the phone holds.
  useEffect(() => { batteryMode(inWindow && !(route.n === 'daily' && s.played) ? 'window' : route.n === 'daily' && s.played ? 'charge' : 'idle'); }, [inWindow, route.n, s.played]);
  // Real events into the tray (never a nag): today's window opening, results in, a level up, an unlock.
  const lastLv = useRef(levelInfo(getSave()).n);
  useEffect(() => {
    const today = ymdUTC();
    if (!s.played) notify({ id: 'win:' + today, app: 'blurt', title: t('os.tray.windowOpen'), body: t('os.tray.windowOpenB'), action: { to: { n: 'daily' } }, silent: true });
    else notify({ id: 'res:' + today, app: 'blurt', title: t('os.tray.results'), body: t('os.tray.resultsB', { tier: t('tier.' + s.tier), n: num(s.total || 0) }), action: { to: { n: 'daily' } }, tone: s.tier === 'T1' ? 'gold' : undefined, silent: routeRef.current.n === 'daily' });
    const lv = levelInfo(getSave()).n;
    if (lv > lastLv.current) {
      for (let n = lastLv.current + 1; n <= lv; n++) {
        notify({ id: 'lvl:' + n, app: 'lens', title: t('os.tray.level', { n }), body: t('os.tray.levelB'), action: { app: 'lens' }, tone: 'gold' });
        for (const a of APPS) if (unlockLevel(a.id) === n) notify({ id: 'unl:' + a.id, app: a.id, title: t('os.tray.unlock', { app: t('os.app.' + a.id) }), body: t('os.tray.unlockB', { n }), action: { app: a.id }, tone: 'gold' });
        for (const a of APPS) if (a.calls && callLevel(a.id) === n) notify({ id: 'unl:' + a.id + ':calls', app: a.id, title: t('ma4.callsOpen', { app: t('os.app.' + a.id) }), body: t('os.tray.unlockB', { n }), action: { app: a.id }, tone: 'gold' });
      }
      sfx('level.up');
    }
    lastLv.current = lv;
  }, [s.played, s.xp, s.lang]); // eslint-disable-line react-hooks/exhaustive-deps
  // Sponsors into the tray (CONCEPT4 §4): an offer lands in the DMs; a brand that walked says so once. lib/meta.ts fires
  // every Gain it returns; the tray is idempotent per id, so a Results screen re-reading a window never repeats it.
  useEffect(() => onGain((g) => {
    for (const o of g.offers || []) notify({ id: 'deal:' + o.id, app: 'dms', title: t('os.tray.deal', { brand: t('e4.sp.brand.' + o.brand + '.n') }), body: t(o.first ? 'ma4.dealFirstB' : 'os.tray.dealB'), action: { app: 'dms' }, tone: 'gold' });
    if (g.deal?.status === 'pulled') notify({ id: 'walked:' + g.deal.brand + ':' + ymdUTC(), app: 'dms', title: t('ma4.walked', { brand: t('e4.sp.brand.' + g.deal.brand + '.n') }), body: t('ma4.walkedB', { n: num(g.deal.coins) }), action: { app: 'lens' }, tone: 'bad' });
  }), [t]);

  const edition = () => update((x) => { const cur = x.edition || (matchMedia('(prefers-color-scheme: dark)').matches ? 'late' : 'morning'); x.edition = cur === 'late' ? 'morning' : 'late'; });
  const app = appOf(route);
  const chrome: Chrome = { go, openSettings: () => go({ n: 'settings' }), edition, home, openApp };
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
    case 'feed': case 'rivals': screen = <Home {...chrome} />; break; // normalized in go(); never rendered
    case 'contacts': screen = <ContactsScreen {...chrome} />; break;
    case 'customize': screen = <CustomizeScreen {...chrome} />; break;
    case 'ddlive': screen = <DDLiveScreen {...chrome} />; break;
    case 'editor': screen = <EditorDeskScreen {...chrome} />; break;
    case 'boards': screen = <BoardsScreen {...chrome} period={route.period} />; break;
    case 'settings': screen = <SettingsScreen {...chrome} />; break;
  }
  const pageKey = route.n + ('key' in route ? ':' + route.key : '');
  return <Phone app={app} anim={anim} locked={locked} onHome={home} onBack={() => { back(); }} canBack={route.n !== 'front'} side={wide ? <DeskPanel app={app} go={go} /> : undefined}>
    {locked ? <LockScreen onUnlock={() => setLocked(false)} go={go} />
      : <div className="ph__page" key={pageKey} data-anim={anim || undefined} onAnimationEnd={() => setAnim('')}><Suspense fallback={<RouteStage />}>{screen}</Suspense></div>}
    <NotifyHost icon={(a) => <AppIcon id={a} size={28} />} />
    <Toasts />
    <Suspense fallback={null}>
      <Onboarding go={go} route={locked ? 'lock' : route.n} />
      <SocialWatch />
    </Suspense>
  </Phone>;
}
// A route's chunk on its first (uncached) load: the app's frame stays put and a quiet stage holds the content area, so
// the screen never blinks empty. It fades in after 120 ms (a cached chunk never shows it).
function RouteStage() {
  return <div className="g-screen g-stage" aria-busy="true"><div className="g-stage__paper"><i /><i /><i /></div></div>;
}
