// The home screen (CONCEPT4.md §2): a wallpaper you own, one widget (the one obvious action: today's window), your
// name line, the app grid with badges and "Reach Level N" gates, and the dock. Nothing else. Everything is one tap.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useT, num, resetAt } from '../lib/i18n';
import { useSave } from '../lib/save';
import { ymdUTC } from '../lib/meta';
import { bylineOf, nextUp, type NextUp } from '../lib/byline';
import { sfx, haptic } from '../lib/sfx';
import { shake, Icon, GBtn } from '../ui/game';
import { APPS, AppIcon, badgeOf, isUnlocked, unlockLevel, levelInfo, dockApps, type AppId, type AppDef } from '../ui/phone';
import { Ticker, Pop } from '../ui/juice';
import { lampStyle } from '../lib/wallet';
import type { Chrome, Route } from '../App';

export function Home(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const lv = levelInfo(s);
  const b = bylineOf(s);
  const dock = dockApps(s);
  const grid = APPS.filter((a) => !dock.includes(a.id));
  const lamp = lampStyle(s);
  return <div className="ph-home" data-wall={s.theme || 'standard'} data-lamp={lamp.on ? lamp.warmth : undefined} style={lamp.on ? (lamp.vars as CSSProperties) : undefined}>
    <div className="ph-wall" aria-hidden="true" />
    <div className="ph-home__in">
      {/* ---------- your name line */}
      <Pop className="ph-me" onTap={() => chrome.openApp('lens')} label={t('os.app.lens')}>
        <span className="ph-me__ava" aria-hidden="true">{(s.nick || 'You').split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase()}</span>
        <span className="ph-me__who"><b dir="auto">{s.nick || t('g.home.noName')}</b><small className="g-mono">{t('os.home.widget.level', { n: lv.n })} · {t('os.home.widget.rep', { n: b.rep })}</small></span>
        <Ticker n={b.followers} compact icon="me" label={t('cn.me.followers')} className="ph-me__f" />
        <Ticker n={s.credits} icon="gift" tone="gold" className="ph-me__c" />
      </Pop>

      {/* ---------- the widget: one obvious action */}
      <Widget nx={nextUp(s)} go={chrome.go} played={!!s.daily[ymdUTC()]} total={s.daily[ymdUTC()]?.total} tier={s.daily[ymdUTC()]?.tier} />

      {/* ---------- the apps */}
      <div className="ph-grid" role="list" aria-label={t('os.home.apps')}>
        {grid.map((a, k) => <Tile key={a.id} a={a} i={k} openApp={chrome.openApp} />)}
      </div>
    </div>
    <div className="ph-dock" role="list" aria-label={t('os.home.dock')}>
      {dock.map((id) => <Tile key={id} a={APPS.find((x) => x.id === id)!} i={0} openApp={chrome.openApp} dock />)}
    </div>
  </div>;
}

function Tile({ a, i, openApp, dock }: { a: AppDef; i: number; openApp: (id: AppId) => void; dock?: boolean }) {
  const t = useT();
  const s = useSave();
  const ref = useRef<HTMLButtonElement>(null);
  const open = isUnlocked(a.id, s);
  const badge = open ? badgeOf(a, s) : 0;
  const lv = levelInfo(s), need = unlockLevel(a.id);
  const tap = () => {
    if (!open) { sfx('os.locked'); haptic('stamp'); shake(ref.current); return; }
    sfx('os.open'); haptic('tap'); openApp(a.id);
  };
  return <button ref={ref} type="button" role="listitem" className={'ph-tile' + (open ? '' : ' is-locked') + (dock ? ' ph-tile--dock' : '')} style={{ ['--i' as string]: i }} onClick={tap}
    aria-label={open ? t('os.app.' + a.id) + (badge ? ' · ' + (badge === 'dot' ? t('os.home.open') : t('os.home.badgeAria', { n: badge })) : '') : t('os.home.reachAria', { app: t('os.app.' + a.id), n: need })}>
    <span className="ph-tile__ic">
      <AppIcon id={a.id} size={dock ? 56 : 60} locked={!open} />
      {badge === 'dot' && <i className="ph-tile__dot" aria-hidden="true" />}
      {typeof badge === 'number' && badge > 0 && <b className="ph-tile__n" aria-hidden="true">{badge > 99 ? '99+' : badge}</b>}
    </span>
    {!dock && <span className="ph-tile__l" dir="auto">{open ? t('os.app.' + a.id) : t('os.home.reach', { n: need })}</span>}
    {!dock && !open && <span className="ph-tile__bar" aria-hidden="true"><i style={{ width: Math.round((100 * (lv.n - 1 + lv.pct / 100)) / (need - 1)) + '%' }} /></span>}
  </button>;
}

// ---------------------------------------------------------------- the widget: today's window first, then the next thing
function Widget({ nx, go, played, total, tier }: { nx: NextUp; go: (r: Route) => void; played: boolean; total?: number; tier?: string }) {
  const t = useT();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const today = ymdUTC();
  const closes = Date.parse(today + 'T00:00:00Z') + 864e5 - now;
  const hms = (() => { const x = Math.max(0, Math.floor(closes / 1000)); return [x / 3600, (x % 3600) / 60, x % 60].map((v) => String(Math.floor(v)).padStart(2, '0')).join(':'); })();
  const live = nx.kind === 'daily' && nx.v?.d ? Number(nx.v.d) : 0;
  if (nx.kind === 'daily' || played) {
    return <section className="ph-widget" data-app="blurt" aria-label={t('os.app.blurt')}>
      <span className="ph-widget__k"><AppIcon id="blurt" size={22} /><b>{t('os.app.blurt')}</b><span className="g-num ph-widget__clock">{hms}</span></span>
      <h2 className="ph-widget__t">{played ? t('os.home.widget.played') : live ? t('os.home.widget.resume', { d: live }) : t('os.tray.windowOpen')}</h2>
      <p className="ph-widget__s">{played ? t('os.home.widget.playedB', { tier: t('tier.' + tier), n: num(total || 0) }) + ' · ' + t('os.home.widget.nextB', { t: resetAt() }) : t('os.tray.windowOpenB')}</p>
      <GBtn size="lg" primary={!played} shine={!played} kind={played ? 'dark' : ''} sound="os.open" onClick={() => go({ n: 'daily' })}>
        <Icon n={played ? 'news' : live ? 'uturn' : 'play'} size={24} />{played ? t('os.tray.results') : live ? t('os.home.widget.resume', { d: live }) : t('os.home.widget.play')}
      </GBtn>
    </section>;
  }
  const app: AppId = nx.kind === 'career' || (nx.kind === 'resume' && nx.v?.m === 'career') ? 'story' : nx.kind === 'wire' ? 'market' : nx.kind === 'room' ? 'groups' : nx.kind === 'mission' ? 'lens' : 'blurt';
  const k = 'cn.next.' + nx.kind;
  const v: Record<string, string | number> = { ...(nx.v || {}) };
  if (v.m) v.m = t('cn.mode.' + v.m);
  return <section className="ph-widget" data-app={app} aria-label={t('os.app.' + app)}>
    <span className="ph-widget__k"><AppIcon id={app} size={22} /><b>{t('os.app.' + app)}</b></span>
    <h2 className="ph-widget__t">{t(k + '.t')}</h2>
    <p className="ph-widget__s">{nx.kind === 'practice' && v.e ? t(k + '.se', v) : t(k + '.s', v)}</p>
    <GBtn size="lg" kind={nx.kind === 'mission' ? 'gold' : 'dark'} sound="os.open" onClick={() => go(nx.kind === 'mission' ? { n: 'me' } : nx.to.n === 'play' ? ({ ...nx.to, key: Date.now() } as Route) : nx.to)}>{t(k + '.b')}<Icon n="arrow" size={22} /></GBtn>
  </section>;
}
