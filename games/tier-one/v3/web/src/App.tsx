import { useEffect, useMemo, useState, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useSave, update, getSave } from './lib/save';
import { useT } from './lib/i18n';
import { sfx } from './lib/sfx';
import { onToasts } from './lib/meta';
import { remoteDriver, localDriver, type Driver, type RoomRef } from './lib/driver';
import { Front } from './screens/Front';
import { WindowScreen } from './screens/Window';
import { WireScreen } from './screens/Wire';
import { DeskScreen } from './screens/Desk';
import { PassScreen } from './screens/Pass';
import { PracticeScreen } from './screens/Practice';
import { RoomsScreen } from './screens/Rooms';
import { HowTo } from './screens/HowTo';
import { SettingsSheet } from './screens/Settings';
import { Onboarding } from './screens/Onboarding';

export type Route =
  | { n: 'front' } | { n: 'daily' } | { n: 'wire'; rid?: string } | { n: 'desk' } | { n: 'pass' } | { n: 'practice' }
  | { n: 'rooms'; code?: string } | { n: 'howto' }
  | { n: 'play'; mode: 'practice' | 'career'; key: number } | { n: 'room'; room: RoomRef; key: number };
export type Go = (r: Route) => void;

const TABS: { n: Route['n']; k: string; no: string }[] = [
  { n: 'front', k: 'tabs.front', no: '01' }, { n: 'daily', k: 'tabs.daily', no: '02' }, { n: 'wire', k: 'tabs.wire', no: '03' }, { n: 'desk', k: 'tabs.desk', no: '04' }, { n: 'pass', k: 'tabs.pass', no: '05' },
];
const tabOf = (r: Route): Route['n'] => (r.n === 'play' ? (r.mode === 'career' ? 'desk' : 'front') : r.n === 'room' || r.n === 'rooms' || r.n === 'practice' || r.n === 'howto' ? 'front' : r.n);

function initialRoute(): Route {
  const q = new URLSearchParams(location.search);
  if (q.get('room')) return { n: 'rooms', code: q.get('room')!.toUpperCase().slice(0, 8) };
  const tab = q.get('tab');
  if (tab === 'daily' || tab === 'wire' || tab === 'desk' || tab === 'pass' || tab === 'practice' || tab === 'howto') return { n: tab } as Route;
  return { n: 'front' };
}

export function App() {
  const s = useSave();
  const t = useT();
  const [route, setRoute] = useState<Route>(initialRoute);
  const [settings, setSettings] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; kind: string; title: string; body?: string }[]>([]);
  useEffect(() => onToasts(setToasts), []);

  // Language, direction and edition live on <html> so tokens.css and :lang(ar) rules apply everywhere.
  useEffect(() => {
    const h = document.documentElement;
    h.lang = s.lang; h.dir = s.lang === 'ar' ? 'rtl' : 'ltr';
    if (s.edition) h.setAttribute('data-edition', s.edition); else h.removeAttribute('data-edition');
    h.setAttribute('data-theme', s.theme || 'standard');
    h.classList.toggle('reduce', s.reduced);
    document.title = 'Tier One · ' + t('brand.edition');
  }, [s.lang, s.edition, s.theme, s.reduced]);

  const go: Go = useCallback((r: Route) => {
    const reduce = getSave().reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
    const swap = () => { setRoute(r); window.scrollTo(0, 0); };
    const d = document as Document & { startViewTransition?: (f: () => void) => unknown };
    sfx('page.turn');
    if (!reduce && d.startViewTransition) d.startViewTransition(() => flushSync(swap)); else swap();
  }, []);

  // Android Back: the WebView calls window.__tierBack(); true when handled.
  useEffect(() => {
    (window as any).__tierBack = () => { if (route.n !== 'front') { go({ n: 'front' }); return true; } return false; };
  }, [route, go]);

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
  const chrome = { go, openSettings: () => setSettings(true), edition };

  let screen;
  switch (route.n) {
    case 'front': screen = <Front {...chrome} />; break;
    case 'daily': case 'room': case 'play': screen = driver ? <WindowScreen key={route.n === 'daily' ? 'daily' : route.key} driver={driver} {...chrome} /> : <Front {...chrome} />; break;
    case 'wire': screen = <WireScreen {...chrome} rid={route.rid} />; break;
    case 'desk': screen = <DeskScreen {...chrome} />; break;
    case 'pass': screen = <PassScreen {...chrome} />; break;
    case 'practice': screen = <PracticeScreen {...chrome} />; break;
    case 'rooms': screen = <RoomsScreen {...chrome} code={route.code} />; break;
    case 'howto': screen = <HowTo {...chrome} />; break;
  }
  return <>
    {screen}
    <nav className="tabs" aria-label="Sections">
      {TABS.map((x) => <a key={x.n} href={'?tab=' + x.n} aria-current={tab === x.n ? 'page' : undefined} onClick={(e) => { e.preventDefault(); go({ n: x.n } as Route); }}><span className="n">{x.no}</span><span className="w">{t(x.k)}</span></a>)}
    </nav>
    <div className="toasts" aria-live="polite">{toasts.map((x) => <div key={x.id} className={'toast toast--' + x.kind}><b>{x.title}</b>{x.body && <span className="meta">{x.body}</span>}</div>)}</div>
    <SettingsSheet open={settings} onClose={() => setSettings(false)} go={go} />
    {!s.onboarded && <Onboarding go={go} />}
  </>;
}
export type Chrome = { go: Go; openSettings: () => void; edition: () => void };
export { TABS };
