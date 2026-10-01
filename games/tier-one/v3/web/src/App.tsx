// Tier One 4.1 "The phone" (UI41.md): App.tsx is the router. Boot → lock screen → home screen (nine app tiles) → an app.
// Every routed screen renders inside ui/screen.tsx <Screen onBack>; `chrome.back` goes to the previous screen, or home
// from an app's first level. `?app=daily|career|deadline|wire|rooms|card|missions|shop|settings` opens an app (the 4.0
// ids blurt|lens|story|live|market|groups|boards|dms and the 3.x `?tab=` links still map).
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
import { Phone, readFeedFor, AppIcon, appOf, appById, routeOf, isUnlocked, levelInfo, unlockLevel, callLevel, APPS, HOME_ORDER, type AppId } from './ui/phone';
import { NotifyHost, notify, setTrayNav } from './ui/juice';
import { onGain, onDriverDone } from './lib/meta';
import { nextCareerWindow } from './lib/storyMode';
// Code-split: the home and lock screens ship with the shell; every app is its own chunk, fetched on first open.
const WindowScreen = lazy(() => import('./screens/Window').then((m) => ({ default: m.WindowScreen })));
const WireScreen = lazy(() => import('./screens/Wire').then((m) => ({ default: m.WireScreen })));
const StoryScreen = lazy(() => import('./screens/Story').then((m) => ({ default: m.StoryScreen })));
const PracticeScreen = lazy(() => import('./screens/Practice').then((m) => ({ default: m.PracticeScreen })));
const RoomsScreen = lazy(() => import('./screens/Rooms').then((m) => ({ default: m.RoomsScreen })));
const NewsroomScreen = lazy(() => import('./screens/Newsroom').then((m) => ({ default: m.NewsroomScreen })));
const HowTo = lazy(() => import('./screens/HowTo').then((m) => ({ default: m.HowTo })));
const SettingsScreen = lazy(() => import('./screens/Settings').then((m) => ({ default: m.SettingsScreen })));
const Onboarding = lazy(() => import('./screens/Onboarding').then((m) => ({ default: m.Onboarding })));
const ShopScreen = lazy(() => import('./screens/Customize').then((m) => ({ default: m.CustomizeScreen })));
const DDLiveScreen = lazy(() => import('./screens/DDLive').then((m) => ({ default: m.DDLiveScreen })));
const PressCardScreen = lazy(() => import('./screens/PressCard').then((m) => ({ default: m.PressCardScreen })));
const BoardsScreen = lazy(() => import('./screens/Leaderboards').then((m) => ({ default: m.BoardsScreen })));
const MissionsScreen = lazy(() => import('./screens/Missions').then((m) => ({ default: m.MissionsScreen })));
import { setNav } from './ui/connect';
import { SocialWatch } from './ui/social';
import { captureReferral, headlineVars, headlineStyle } from './lib/wallet';
import './lib/earned'; // registers the earned-looks hook (lib/earnhook.ts) the game events call
import { checkPrizes } from './lib/awards';
import { ymdUTC } from './lib/meta';
import { num } from './lib/i18n';
// Shell layer, loaded after the screen styles: motion tokens, the shared parts, the phone, the desk.
import './styles/motion.css';
import './styles/system.css';
import './styles/phone.css';
import './styles/desktop.css';

export type CardTab = 'overall' | 'daily' | 'career' | 'deadline' | 'wire' | 'rooms' | 'sponsor';
export type BoardTab = 'daily' | 'rooms' | 'wire';
export type ShopCat = 'lockface' | 'theme' | 'device' | 'catchphrase' | 'coins' | 'gold';
export type Route =
  | { n: 'front' } | { n: 'daily' } | { n: 'wire'; rid?: string } | { n: 'story' } | { n: 'practice' } | { n: 'ddlive' }
  | { n: 'rooms'; code?: string; challenge?: string } | { n: 'newsroom'; code?: string } | { n: 'howto' } | { n: 'settings' }
  | { n: 'card'; tab?: CardTab } | { n: 'boards'; tab?: BoardTab; period?: 'daily' | 'weekly' | 'wire' } | { n: 'missions' } | { n: 'shop'; cat?: ShopCat }
  // 4.0 / 3.x routes kept as aliases (normalized in go()): never rendered as themselves.
  | { n: 'desk' } | { n: 'editor' } | { n: 'me' } | { n: 'pass' } | { n: 'feed' } | { n: 'rivals' } | { n: 'contacts' } | { n: 'customize' }
  | { n: 'play'; mode: 'practice' | 'career' | 'tutorial' | 'deadline' | 'challenge'; key: number } | { n: 'room'; room: RoomRef; key: number };
export type Go = (r: Route) => void;
/** What every screen gets: `go` (any route), `back` (the previous screen, or home from an app's first level), `home`,
 *  `openApp` (an app by id), `openSettings`, `edition` (toggle light/dark). */
export type Chrome = { go: Go; back: () => void; openSettings: () => void; edition: () => void; home: () => void; openApp: (a: AppId) => void };

/** Old routes onto the 4.1 screens. */
function normalize(r: Route): Route {
  switch (r.n) {
    case 'feed': return { n: 'daily' };
    case 'desk': case 'editor': return { n: 'story' };
    case 'me': case 'pass': case 'rivals': case 'contacts': return { n: 'card' };
    case 'customize': return { n: 'shop' };
  }
  return r;
}
const LEGACY_TAB: Record<string, Route> = { desk: { n: 'story' }, daily: { n: 'daily' }, wire: { n: 'wire' }, story: { n: 'story' }, career: { n: 'story' }, me: { n: 'card' }, pass: { n: 'card' }, practice: { n: 'practice' }, howto: { n: 'howto' }, rooms: { n: 'rooms' }, newsroom: { n: 'newsroom' }, feed: { n: 'daily' }, rivals: { n: 'card' }, contacts: { n: 'card' }, customize: { n: 'shop' }, ddlive: { n: 'ddlive' }, editor: { n: 'story' }, boards: { n: 'boards' }, settings: { n: 'settings' }, missions: { n: 'missions' } };
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
  // Only the fields the shell reads: a save update elsewhere doesn't re-render the whole App.
  const s = useSaveSel((x) => ({ lang: x.lang, edition: x.edition, theme: x.theme, reduced: x.reduced, onboarded: x.onboarded, xp: x.xp, played: !!x.daily[ymdUTC()], total: x.daily[ymdUTC()]?.total, tier: x.daily[ymdUTC()]?.tier }), shallowEq);
  const t = useT();
  const [init] = useState(initialRoute);
  const [route, setRoute] = useState<Route>(init.route);
  const [locked, setLocked] = useState(init.locked);
  const [anim, setAnim] = useState<'open' | 'close' | 'app' | ''>('');
  useEffect(() => { checkPurchase(); bootPlatform(__APP_VERSION__).catch(() => { /* offline: the game runs on the local save */ }); }, []);
  useEffect(() => { captureReferral(); }, []);
  useEffect(() => { const id = setTimeout(() => { checkPrizes(); }, 2500); return () => clearTimeout(id); }, []);

  // Language, direction and the theme live on <html> so tokens and :lang(ar) rules apply everywhere.
  useEffect(() => {
    const h = document.documentElement;
    h.lang = s.lang; h.dir = s.lang === 'ar' ? 'rtl' : 'ltr';
    if (s.edition) h.setAttribute('data-edition', s.edition); else h.removeAttribute('data-edition');
    h.setAttribute('data-theme', s.theme || 'standard');
    h.classList.toggle('reduce', s.reduced);
    h.classList.add('os');
    document.title = 'Tier One';
  }, [s.lang, s.edition, s.theme, s.reduced]);

  // Routing. An app opens with the open transition and closes home with the close one; a move inside an app slides.
  // The back stack: back pops it; at an app's first level (or when the previous screen is in another app) it goes home.
  const routeRef = useRef(route); routeRef.current = route;
  const hist = useRef<Route[]>([]);
  const nav = useCallback((r0: Route, push: boolean) => {
    const r = normalize(r0);
    const from = routeRef.current, fa = appOf(from), ta = appOf(r);
    if (ta && !isUnlocked(ta)) { sfx('os.locked'); return; } // the tile says "Level N"; never a dead tap
    if (ta) readFeedFor(ta);
    const a = !ta && fa ? 'close' : ta && ta !== fa ? 'open' : r.n === from.n ? '' : 'app';
    sfx(a === 'open' ? 'os.open' : a === 'close' ? 'os.close' : a === 'app' ? 'page.turn' : 'ui.tap');
    if (r.n === 'front') hist.current = [];
    else if (push && from.n !== 'front' && from.n !== r.n) hist.current = [...hist.current.slice(-12), from];
    document.documentElement.dataset.route = r.n;
    setAnim(prefersReducedMotion() ? '' : a);
    setRoute(r);
    setLocked(false);
  }, []);
  const go: Go = useCallback((r: Route) => nav(r, true), [nav]);
  const home = useCallback(() => nav({ n: 'front' }, false), [nav]);
  const openApp = useCallback((a: AppId) => go(routeOf(a)), [go]);
  const back = useCallback((): boolean => {
    const cur = routeRef.current;
    if (cur.n === 'front') return false;
    const prev = hist.current.pop();
    if (prev && appOf(prev) === appOf(cur)) nav(prev, false); else nav({ n: 'front' }, false);
    return true;
  }, [nav]);
  useEffect(() => { setTrayNav(go, openApp); }, [go, openApp]);
  useEffect(() => { document.documentElement.dataset.route = locked ? 'lock' : routeRef.current.n; }, [locked]);
  // The equipped headline font rides on <html> (data-hd + --hd-*), so the results card and the share card pick it up.
  const hdId = useSaveSel((x) => x.desk?.equip?.headline || '');
  useEffect(() => {
    const h = document.documentElement; const on = !!hdId && !hdId.startsWith('std.');
    const v = headlineVars(); const face = headlineStyle().face;
    for (const k of ['--hd-face', '--hd-case', '--hd-ink']) { if (on && v[k]) h.style.setProperty(k, v[k]); else h.style.removeProperty(k); }
    if (on) h.setAttribute('data-hd', face); else h.removeAttribute('data-hd');
  }, [hdId]);

  // Android Back: the WebView calls window.__tierBack(); true when handled.
  useEffect(() => { (window as any).__tierBack = () => { if (locked) return false; const b = document.querySelector<HTMLButtonElement>('.scr__back:not(.scr__back--none)'); if (b) { b.click(); return true; } return back(); }; }, [locked, back]);

  // Keyboard: Esc = back (a <Screen> handles its own; this covers screens without one), 1–9 = the apps on the home
  // screen. Never while typing or in a dialog.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const modal = document.querySelector('[role="dialog"], [aria-modal="true"], .scrim, .g-overlay, .call-scene, .post-scene');
      if (locked) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sfx('os.unlock'); setLocked(false); } return; }
      if (modal) return;
      if (e.key === 'Escape') { if (!document.querySelector('.scr__back:not(.scr__back--none)') && back()) e.preventDefault(); return; }
      if (routeRef.current.n === 'front' && /^[1-9]$/.test(e.key)) { const a = HOME_ORDER[Number(e.key) - 1]; if (a && isUnlocked(a)) { e.preventDefault(); openApp(a); } }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [back, openApp, locked]);

  useEffect(() => installTilt(), []);

  // Every window runs on the driver (lib/driver.ts) and settles once through lib/meta.ts onDriverDone.
  const driver: Driver4 | null = useMemo(() => {
    if (route.n === 'daily') return makeDriver({ mode: 'daily', onDone: onDriverDone });
    if (route.n === 'room') return makeDriver({ mode: 'room', room: route.room, onDone: onDriverDone });
    if (route.n === 'play' && route.mode === 'career') {
      const w = nextCareerWindow(getSave());
      return makeDriver({ mode: 'career', seed: w.seed, rules: w.rules, cast: w.cast, label: w.label, onDone: w.onDone });
    }
    if (route.n === 'play') return makeDriver({ mode: route.mode, onDone: onDriverDone });
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.n === 'daily' ? 'daily' : route.n === 'room' || route.n === 'play' ? route.key : route.n]);

  // Real events into the notifications (never a nag): today's Daily, results in, a level up, an unlock.
  const lastLv = useRef(levelInfo(getSave()).n);
  useEffect(() => {
    const today = ymdUTC();
    if (!s.played) notify({ id: 'win:' + today, app: 'daily', title: t('s41.note.daily'), body: t('s41.note.dailyB'), action: { to: { n: 'daily' } }, silent: true });
    else notify({ id: 'res:' + today, app: 'daily', title: t('s41.note.results'), body: t('os.tray.resultsB', { tier: t('tier.' + s.tier), n: num(s.total || 0) }), action: { to: { n: 'daily' } }, tone: s.tier === 'T1' ? 'gold' : undefined, silent: routeRef.current.n === 'daily' });
    const lv = levelInfo(getSave()).n;
    if (lv > lastLv.current) {
      for (let n = lastLv.current + 1; n <= lv; n++) {
        notify({ id: 'lvl:' + n, app: 'card', title: t('os.tray.level', { n }), body: t('os.tray.levelB'), action: { app: 'card' }, tone: 'gold' });
        for (const a of APPS) if (unlockLevel(a.id) === n) notify({ id: 'unl:' + a.id, app: a.id, title: t('s41.note.open', { app: t('s41.app.' + a.id) }), body: t('os.tray.unlockB', { n }), action: { app: a.id }, tone: 'gold' });
        for (const a of APPS) if (a.calls && callLevel(a.id) === n) notify({ id: 'unl:' + a.id + ':calls', app: a.id, title: t('s41.note.calls'), body: t('os.tray.unlockB', { n }), action: { app: a.id }, tone: 'gold' });
      }
      sfx('level.up');
    }
    lastLv.current = lv;
  }, [s.played, s.xp, s.lang]); // eslint-disable-line react-hooks/exhaustive-deps
  // Sponsor offers arrive as a notification and live in Press Card › Sponsor (UI41: no separate app).
  useEffect(() => onGain((g) => {
    for (const o of g.offers || []) notify({ id: 'deal:' + o.id, app: 'card', title: t('os.tray.deal', { brand: t('e4.sp.brand.' + o.brand + '.n') }), body: t('s41.note.dealB'), action: { to: { n: 'card', tab: 'sponsor' } }, tone: 'gold' });
    if (g.deal?.status === 'pulled') notify({ id: 'walked:' + g.deal.brand + ':' + ymdUTC(), app: 'card', title: t('ma4.walked', { brand: t('e4.sp.brand.' + g.deal.brand + '.n') }), body: t('ma4.walkedB', { n: num(g.deal.coins) }), action: { to: { n: 'card', tab: 'sponsor' } }, tone: 'bad' });
  }), [t]);

  const edition = () => update((x) => { const cur = x.edition || (matchMedia('(prefers-color-scheme: dark)').matches ? 'late' : 'morning'); x.edition = cur === 'late' ? 'morning' : 'late'; });
  const app = appOf(route);
  const chrome: Chrome = { go, back: () => { back(); }, openSettings: () => go({ n: 'settings' }), edition, home, openApp };
  setNav(go);
  if (import.meta.env.DEV) (window as any).__t1go = go; // dev: the layout check drives routes

  let screen;
  switch (route.n) {
    case 'daily': case 'room': case 'play': screen = driver ? <WindowScreen key={route.n === 'daily' ? 'daily' : route.key} driver={driver} {...chrome} /> : <Home {...chrome} />; break;
    case 'wire': screen = <WireScreen {...chrome} rid={route.rid} />; break;
    case 'story': screen = <StoryScreen {...chrome} />; break;
    case 'practice': screen = <PracticeScreen {...chrome} />; break;
    case 'rooms': screen = <RoomsScreen {...chrome} code={route.code} challenge={route.challenge} />; break;
    case 'newsroom': screen = <NewsroomScreen {...chrome} code={route.code} />; break;
    case 'howto': screen = <HowTo {...chrome} />; break;
    case 'ddlive': screen = <DDLiveScreen {...chrome} />; break;
    case 'settings': screen = <SettingsScreen {...chrome} />; break;
    case 'card': screen = <PressCardScreen {...chrome} tab={route.tab} />; break;
    case 'boards': screen = <BoardsScreen {...chrome} tab={route.tab || (route.period === 'wire' ? 'wire' : undefined)} period={route.period === 'weekly' ? 'weekly' : undefined} />; break;
    case 'missions': screen = <MissionsScreen {...chrome} />; break;
    case 'shop': screen = <ShopScreen {...chrome} cat={route.cat} />; break;
    default: screen = <Home {...chrome} />;
  }
  const pageKey = route.n + ('key' in route ? ':' + route.key : '');
  return <Phone app={app} locked={locked}>
    {locked ? <LockScreen onUnlock={() => setLocked(false)} />
      : <div className="ph__page" key={pageKey} data-anim={anim || undefined} onAnimationEnd={() => setAnim('')}><Suspense fallback={<RouteStage />}>{screen}</Suspense></div>}
    <NotifyHost icon={(a) => <AppIcon id={a} size={28} />} />
    <Toasts />
    <Suspense fallback={null}>
      <Onboarding go={go} route={locked ? 'lock' : route.n} />
      <SocialWatch />
    </Suspense>
  </Phone>;
}
// A route's chunk on its first load: a quiet stage holds the screen so it never blinks empty.
function RouteStage() {
  return <div className="g-screen g-stage" aria-busy="true"><div className="g-stage__paper"><i /><i /><i /></div></div>;
}
