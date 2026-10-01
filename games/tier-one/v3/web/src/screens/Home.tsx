// The home screen (CONCEPT4.md §2, §17): the player's desk. Your handle and rank (the biggest thing after the window),
// your widgets in the slots your phone's Screen gives you (Today's window first: the one obvious action), the apps with
// their badges and "Reach Level N" bars, and the dock. Two pages. Hold anywhere to edit: move, resize, remove and add
// widgets, and change the lock face, icons, theme and phone, each tried on this phone before you pay.
// The field is the equipped wallpaper (or the lock face's own field); the only motion at rest is the widgets ticking.
import { useEffect, useRef, useState } from 'react';
import { useT } from '../lib/i18n';
import { useSave } from '../lib/save';
import { sfx, haptic } from '../lib/sfx';
import { shake } from '../ui/game';
import { APPS, AppIcon, badgeOf, isUnlocked, unlockLevel, levelInfo, dockApps, type AppId, type AppDef } from '../ui/phone';
import { Ticker } from '../ui/juice';
import { bylineOf } from '../lib/byline';
import { useLook, pagesFor, slotsFor, tryLook } from '../lib/phones';
import { homeLayout, recordFollowers, removeWidget, moveWidget, resizeWidget, swapPage, widgetDef, unitsOf, type Placed } from '../lib/widgets';
import { Wall, WidgetView, HandleLine, EditSheet, LookActions, useLongPress, type EditTab, type WidgetNav } from '../ui/widgets';
import { LockFaceView } from './Front';
import { useTray } from '../ui/juice';
import type { Chrome } from '../App';

export function Home(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const look = useLook();
  const [edit, setEdit] = useState(false);
  const [tab, setTab] = useState<EditTab>('widgets');
  const [sheet, setSheet] = useState(false);
  const [preview, setPreview] = useState(false);
  const [page, setPage] = useState(0);
  const pagesRef = useRef<HTMLDivElement>(null);
  const followers = bylineOf(s).followers;
  useEffect(() => { recordFollowers(); }, [followers]);
  useEffect(() => () => { tryLook(null); }, []);
  const lp = useLongPress(() => setEdit(true));
  const layout = homeLayout(s);
  const pages = pagesFor(s);
  const showP2 = pages > 1 && (layout.p[1].length > 0 || edit);
  const dock = dockApps(s);
  const grid = APPS.filter((a) => !dock.includes(a.id));
  const wp = look.wallpaper.source !== 'standard' && look.wallpaper.preview.k === 'wallpaper' ? look.wallpaper.preview : null;
  const lf = look.lockface.preview.k === 'lockface' ? look.lockface.preview : null;
  // The field: the equipped wallpaper, else the phone's own surface wearing the lock face's motif and the one accent
  // (so a pale lock face never puts pale labels on a pale home).
  const field = wp || { bg: 'var(--os-bg)', ink: 'var(--os-ink)', accent: look.accent, motif: lf && lf.motif !== 'plain' ? lf.motif : 'grain' };
  const nav: WidgetNav = { go: chrome.go, openApp: chrome.openApp };
  const toPage = (n: number) => { const el = pagesRef.current; if (!el) return; const w = el.clientWidth; el.scrollTo({ left: (t.rtl ? -1 : 1) * n * w, behavior: 'smooth' }); setPage(n); };
  const openSheet = (x: EditTab) => { sfx('sheet.open'); setTab(x); setSheet(true); };
  const done = () => { sfx('ui.pop'); haptic('tap'); setEdit(false); setSheet(false); tryLook(null); };
  const tray = useTray();

  return <div className={'ph-home hm' + (edit ? ' is-edit' : '')} {...(edit ? {} : lp)}>
    <Wall p={field} className="hm-wall" />
    <div className="hm-in">
      {edit
        ? <div className="hm-editbar" role="toolbar" aria-label={t('sh.home.edit')}>
            <span className="hm-editbar__t"><b>{t('sh.home.edit')}</b><small className="g-num">{t('sh.home.slots', { used: unitsOf(layout.p[0]) + unitsOf(layout.p[1]), n: slotsFor(s) })}</small></span>
            <button type="button" className="hm-done" onClick={done}>{t('sh.home.done')}</button>
          </div>
        : <div className="hm-head">
            <HandleLine onTap={() => chrome.openApp('lens')} />
            <Ticker n={s.credits} icon="gift" tone="gold" className="hm-coins" label={t('sh.w.sponsor.unit')} />
          </div>}

      <div className="hm-pages" ref={pagesRef} onScroll={(e) => { const el = e.currentTarget; const n = Math.round(Math.abs(el.scrollLeft) / Math.max(1, el.clientWidth)); if (n !== page) setPage(n); }}>
        <section className="hm-page" aria-label={t('sh.home.page', { n: 1, of: showP2 ? 2 : 1 })}>
          <Widgets list={layout.p[0]} page={0} edit={edit} nav={nav} />
          <div className="ph-grid" role="list" aria-label={t('os.home.apps')}>
            {grid.map((a, k) => <Tile key={a.id} a={a} i={k} openApp={chrome.openApp} edit={edit} />)}
          </div>
        </section>
        {showP2 && <section className="hm-page" aria-label={t('sh.home.page', { n: 2, of: 2 })}>
          {layout.p[1].length ? <Widgets list={layout.p[1]} page={1} edit={edit} nav={nav} /> : <p className="hm-empty">{t('sh.home.empty2')}</p>}
        </section>}
      </div>
      {showP2 && <div className="hm-dots">{[0, 1].map((n) => <button key={n} type="button" className={page === n ? 'is-on' : ''} aria-label={t('sh.home.pageAria', { n: n + 1 })} aria-current={page === n} onClick={() => toPage(n)}><i /></button>)}</div>}

      {edit && <div className="hm-tools">
        <button type="button" className="hm-tool hm-tool--add" onClick={() => openSheet('widgets')}><b>+</b>{t('sh.home.add')}</button>
        {(['face', 'icons', 'theme', 'phone'] as EditTab[]).map((x) => <button key={x} type="button" className="hm-tool" onClick={() => openSheet(x)}>{t('sh.home.tabs.' + x)}</button>)}
      </div>}
      {!edit && !s.home?.layout && levelInfo(s).n >= 2 && <p className="hm-hint">{t('sh.home.hold')}</p>}
    </div>

    <div className="ph-dock" role="list" aria-label={t('os.home.dock')}>
      {dock.map((id) => <Tile key={id} a={APPS.find((x) => x.id === id)!} i={0} openApp={chrome.openApp} dock edit={edit} />)}
    </div>

    <EditSheet open={sheet} tab={tab} setTab={setTab} onClose={() => setSheet(false)} onPreviewLock={() => { setSheet(false); setPreview(true); }} />
    {preview && <div className="hm-preview" role="dialog" aria-modal="true" aria-label={t('sh.home.tabs.face')}>
      <LockFaceView items={tray.items.slice(0, 3)} footer={<div className="hm-preview__bar" onClick={(e) => e.stopPropagation()}>
        <span className="hm-preview__name" dir="auto">{t(look.lockface.nameKey, look.lockface.nameVars)}</span>
        <LookActions it={look.lockface} kind="lockface" />
        <button type="button" className="sh-btn sh-btn--quiet" onClick={() => { sfx('os.close'); tryLook(null); setPreview(false); setSheet(true); }}>{t('sh.home.takeOff')}</button>
      </div>} />
    </div>}
  </div>;
}

function Widgets({ list, page, edit, nav }: { list: Placed[]; page: number; edit: boolean; nav: WidgetNav }) {
  const t = useT();
  if (!list.length) return null;
  return <div className="hw-grid">
    {list.map((x, i) => <div key={x.w} className={'hw-cell hw-cell--' + x.z} style={{ ['--i' as string]: i }}>
      <WidgetView w={x.w} z={x.z} nav={nav} edit={edit} />
      {edit && <div className="hw-ctl" role="group" aria-label={t('sh.w.' + x.w + '.t')}>
        <button type="button" aria-label={t('sh.home.earlier')} disabled={i === 0} onClick={() => { sfx('ui.tap'); moveWidget(page, i, -1); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg></button>
        <button type="button" aria-label={t('sh.home.later')} disabled={i === list.length - 1} onClick={() => { sfx('ui.tap'); moveWidget(page, i, 1); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg></button>
        {widgetDef(x.w).sizes.length > 1 && <button type="button" aria-label={x.z === '2x2' ? t('sh.home.bigger') : t('sh.home.smaller')} onClick={() => { const ok = resizeWidget(page, i); sfx(ok ? 'ui.pop' : 'os.locked'); }}><svg viewBox="0 0 24 24" aria-hidden="true">{x.z === '2x2' ? <path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6" /> : <path d="M10 4v6H4M14 20v-6h6M4 4l6 6M20 20l-6-6" />}</svg></button>}
        <button type="button" aria-label={t('sh.home.toPage', { n: page ? 1 : 2 })} onClick={() => { const ok = swapPage(page, i); sfx(ok ? 'whoosh' : 'os.locked'); }}><b className="g-num">{page ? 1 : 2}</b></button>
        <button type="button" className="hw-ctl__x" aria-label={t('sh.home.remove')} onClick={() => { sfx('shred'); haptic('tap'); removeWidget(page, i); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
      </div>}
    </div>)}
  </div>;
}

function Tile({ a, i, openApp, dock, edit }: { a: AppDef; i: number; openApp: (id: AppId) => void; dock?: boolean; edit?: boolean }) {
  const t = useT();
  const s = useSave();
  const ref = useRef<HTMLButtonElement>(null);
  const open = isUnlocked(a.id, s);
  const badge = open ? badgeOf(a, s) : 0;
  const lv = levelInfo(s), need = unlockLevel(a.id);
  const tap = () => {
    if (edit) return;
    if (!open) { sfx('os.locked'); haptic('stamp'); shake(ref.current); return; }
    sfx('os.open'); haptic('tap'); openApp(a.id);
  };
  return <button ref={ref} type="button" role="listitem" className={'ph-tile' + (open ? '' : ' is-locked') + (dock ? ' ph-tile--dock' : '')} style={{ ['--i' as string]: i }} onClick={tap}
    aria-label={open ? t('os.app.' + a.id) + (badge ? ' · ' + (badge === 'dot' ? t('os.home.open') : t('os.home.badgeAria', { n: badge })) : '') : t('os.home.reachAria', { app: t('os.app.' + a.id), n: need })}>
    <span className="ph-tile__ic">
      <AppIcon id={a.id} size={dock ? 54 : 58} locked={!open} />
      {badge === 'dot' && <i className="ph-tile__dot" aria-hidden="true" />}
      {typeof badge === 'number' && badge > 0 && <b className="ph-tile__n" aria-hidden="true">{badge > 99 ? '99+' : badge}</b>}
    </span>
    <span className="ph-tile__l" dir="auto">{open ? t('os.app.' + a.id) : t('os.home.reach', { n: need })}</span>
    {!dock && !open && <span className="ph-tile__bar" aria-hidden="true"><i style={{ width: Math.max(4, Math.min(100, Math.round((100 * (lv.n - 1 + lv.pct / 100)) / Math.max(1, need - 1)))) + '%' }} /></span>}
  </button>;
}
