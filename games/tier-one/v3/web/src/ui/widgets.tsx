// The shell's looks and the home screen's widgets (CONCEPT4 §17, §18). Drawn, never illustrated: wallpapers are CSS
// fields with grain, halftone, terrace stripes, a grid or pitch lines; phones are drawn from their bezel/frame/radius;
// widgets are surfaces with one big number each. Styles: styles/home.css (`hw-`, `sh-`) and styles/phone.css (`lf-`).
//
// EXPORTS other lanes may use:
//   <Wall p/>                     a generative wallpaper / lock face field from a preview ({ bg, ink, accent, motif, c2 })
//   <DeviceArt p face?/>          a small drawing of a phone (Lens profile "Carries: …", Groups)
//   <PhonesShelf/>                Lens › Phones: one card per phone, four bars, one-tap upgrade with the price
//   <LookThumb item/>             a thumbnail for any shell look (lockface, iconpack, theme, device, widget, wallpaper)
//   <WidgetView w z edit?/>       one home widget
//   <EditSheet open tab onClose onPreviewLock/>  Edit home's sheet: widgets, lock face, icons, theme, phones
import { useEffect, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent, type MouseEvent as RMouseEvent } from 'react';
import { useT, num, resetAt } from '../lib/i18n';
import { useSave } from '../lib/save';
import { ymdUTC, seasonName } from '../lib/meta';
import { sfx, haptic } from '../lib/sfx';
import { bylineOf, nextUp, rankOf, rivalOf } from '../lib/byline';
import { catchphraseOf } from '../lib/catchphrase';
import { SEASON, SECRET_FILES, goldOn } from '../lib/economy';
import { seasonLevel } from '../lib/season';
import { chapterOf } from '../lib/storyMode';
import { active as activeDeals, brandOf } from '../lib/deals';
import { useWire } from '../lib/wireData';
import { item, itemsOf, priceNow, onSale, type Item, type Price } from '../lib/catalog';
import { owns, buy, bestCurrency, equipItem, equipped as equippedLook } from '../lib/wallet';
import type { Kind } from '../lib/kinds';
import {
  PHONES, PARTS, PART_VALUES, RANKED_NOTE_KEY, phoneItem, ownsPhone, partLevel, partValue, upgradePrice, upgrade, equipPhone, equipped as phoneIn,
  tryLook, useTry, slotsFor, type PhoneDef, type Part,
} from '../lib/phones';
import {
  WIDGETS, widgetDef, widgetOpen, widgetGate, homeLayout, placeWidget, unitsOf, followerSeries, watchIds, dailyNo,
  type WidgetId, type WSize,
} from '../lib/widgets';
import { Kit, Icon } from './game';
import { Count, Pop, Sheet, SheetHead } from './juice';
import { AppIcon, useTodayCast, type AppId } from './phone';
import type { Route } from '../App';

type T = ReturnType<typeof useT>;
const DAY = 864e5;

// ---------------------------------------------------------------- the field: wallpapers and lock faces
export interface WallP { bg: string; ink: string; accent: string; motif: string; c2?: string }
/** A generative field (CONCEPT4 §6 "Art"): colour, grain, and one drawn motif. `split` paints the club-colour split. */
export function Wall({ p, split, className = '', children }: { p: WallP; split?: boolean; className?: string; children?: ReactNode }) {
  return <div className={'sh-wall ' + className} data-motif={p.motif} data-split={split ? '' : undefined} aria-hidden="true"
    style={{ ['--w-bg' as string]: p.bg, ['--w-ink' as string]: p.ink, ['--w-acc' as string]: p.accent, ['--w-c2' as string]: p.c2 || p.accent }}>{children}</div>;
}

// ---------------------------------------------------------------- a drawn phone (the card picture, the profile line)
export function DeviceArt({ p, size = 84, face, className = '' }: { p: Item; size?: number; face?: Item; className?: string }) {
  const d = p.preview.k === 'device' ? p.preview : { bezel: '#1C1A17', frame: '#3A352D', radius: 44, notch: 'pill' as const, crack: false };
  const f = face && face.preview.k === 'lockface' ? face.preview : null;
  return <span className={'sh-dev ' + className} data-notch={d.notch} aria-hidden="true"
    style={{ ['--dv-w' as string]: size + 'px', ['--dv-bezel' as string]: d.bezel, ['--dv-frame' as string]: d.frame, ['--dv-r' as string]: Math.round(d.radius * size / 400) + 'px' }}>
    <span className="sh-dev__screen">{f ? <Wall p={f} split={f.clock === 'split'} /> : <Wall p={{ bg: '#14110D', ink: '#F3ECDD', accent: '#F2B632', motif: 'grain' }} />}<b className="sh-dev__time">09:41</b></span>
    {'crack' in d && d.crack && <svg className="sh-dev__crack" viewBox="0 0 40 80" preserveAspectRatio="none"><path d="M40 6 L27 19 L31 24 L18 38 L22 41 L9 58" fill="none" stroke="rgba(255,255,255,.75)" strokeWidth="1" /></svg>}
  </span>;
}

// ---------------------------------------------------------------- thumbnails for any shell look
const SAMPLE_APPS: AppId[] = ['blurt', 'dms', 'lens', 'market'];
export function LookThumb({ it }: { it: Item }) {
  const p = it.preview;
  switch (p.k) {
    case 'lockface': return <span className="sh-th sh-th--lf"><Wall p={p} split={p.clock === 'split'} /><b className={'sh-th__clock is-' + p.clock} style={{ color: p.ink }}>09<i>:</i>41</b><span className="sh-th__stamp" style={{ color: p.accent, borderColor: p.accent }} /></span>;
    case 'wallpaper': return <span className="sh-th sh-th--wp"><Wall p={p} /></span>;
    case 'iconpack': return <span className="sh-th sh-th--ip">{SAMPLE_APPS.map((a) => <AppIcon key={a} id={a} size={30} pack={p.style} tile={p.tile} ink={p.ink} />)}</span>;
    case 'theme': { const o = p.os || { bg: '#14110D', ink: '#F3ECDD', accent: '#F2B632', bar: '#1E1A15' }; return <span className="sh-th sh-th--th" style={{ background: o.bg, color: o.ink, borderRadius: (o.radius ?? 18) / 2 + 'px' }}><i style={{ background: o.bar }} /><b style={{ fontFamily: faceVar(o.face) }}>Aa</b><em style={{ background: o.accent }} /></span>; }
    case 'device': return <span className="sh-th sh-th--dv"><DeviceArt p={it} size={44} /></span>;
    case 'widget': return <span className="sh-th sh-th--wg"><b>{p.w === 'boss' ? '3–1' : '4/12'}</b></span>;
    default: return <span className="sh-th" />;
  }
}
export const faceVar = (f?: string) => (f === 'editorial' ? 'var(--f-display)' : f === 'cond' ? 'var(--f-cond)' : 'var(--f-text)');

// ---------------------------------------------------------------- the widgets
/** Opens an app or a route from a widget. Home passes these in. */
export interface WidgetNav { go: (r: Route) => void; openApp: (a: AppId) => void }
export function WidgetView({ w, z, nav, edit }: { w: WidgetId; z: WSize; nav: WidgetNav; edit?: boolean }) {
  const t = useT();
  const d = widgetDef(w);
  const body = (() => {
    switch (w) {
      case 'window': return <WWindow z={z} nav={nav} edit={edit} />;
      case 'followers': return <WFollowers z={z} />;
      case 'streak': return <WStreak z={z} />;
      case 'catch': return <WCatch z={z} />;
      case 'market': return <WMarket z={z} />;
      case 'sponsor': return <WSponsor z={z} />;
      case 'season': return <WSeason z={z} />;
      case 'group': return <WGroup z={z} />;
      case 'boss': return <WBoss z={z} />;
      case 'files': return <WFiles z={z} />;
    }
  })();
  if (w === 'window') return <section className={'hw hw--window hw--' + z} aria-label={t('sh.w.window.t')}>{body}</section>;
  return <Pop className={'hw hw--' + w + ' hw--' + z} sound={edit ? null : 'os.open'} haptic={!edit} onTap={edit ? undefined : () => nav.openApp(d.app)} tabIndex={edit ? -1 : 0}>
    <span className="hw__k">{t('sh.w.' + w + '.t')}</span>
    {body}
  </Pop>;
}

// Today's window: a matchday ticket. The five kits, the countdown, the one obvious action.
function WWindow({ z, nav, edit }: { z: WSize; nav: WidgetNav; edit?: boolean }) {
  const t = useT();
  const s = useSave();
  const cast = useTodayCast();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const today = ymdUTC();
  const rec = s.daily[today];
  const nx = nextUp(s);
  const live = nx.kind === 'daily' && nx.v?.d ? Number(nx.v.d) : 0;
  const left = Math.max(0, Math.floor((Date.parse(today + 'T00:00:00Z') + DAY - now) / 1000));
  const hms = [left / 3600, (left % 3600) / 60, left % 60].map((v) => String(Math.floor(v)).padStart(2, '0'));
  const label = rec ? t('os.tray.results') : live ? t('os.home.widget.resume', { d: live }) : t('os.home.widget.play');
  const tap = () => { if (edit) return; sfx('os.open'); haptic('tap'); nav.go({ n: 'daily' }); };
  return <>
    <div className="hw-tk__top">
      <span className="hw-tk__no">{t('sh.w.window.no', { n: dailyNo(today) })}</span>
      <span className="hw-tk__clock" role="timer" aria-label={t('sh.w.window.closes') + ' ' + hms.join(':')}><small>{rec ? t('os.home.widget.nextB', { t: resetAt() }) : t('sh.w.window.closes')}</small><b className="g-num">{hms[0]}<i>:</i>{hms[1]}<i>:</i>{hms[2]}</b></span>
    </div>
    {z === '4x2' && <div className="hw-tk__kits" aria-hidden="true">
      {Array.from({ length: 5 }, (_, k) => <span key={k} className="hw-tk__kit" style={{ ['--k' as string]: k }}>{cast?.[k] ? <Kit club={cast[k].from} player={cast[k].player} size={34} /> : <Kit mystery size={34} />}</span>)}
    </div>}
    {rec ? <p className="hw-tk__res">{t('os.home.widget.playedB', { tier: t('tier.' + rec.tier), n: num(rec.total) })}</p> : z === '2x2' ? <p className="hw-tk__res">{t('os.tray.windowOpenB')}</p> : null}
    <button type="button" className={'hw-tk__go' + (rec ? ' is-done' : '')} onClick={tap} tabIndex={edit ? -1 : 0}>
      <Icon n={rec ? 'news' : live ? 'uturn' : 'play'} size={20} /><span>{label}</span>
    </button>
  </>;
}

function Spark({ data, w = 140, h = 40 }: { data: number[]; w?: number; h?: number }) {
  if (data.length < 2) return <svg className="hw-spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><line x1="0" x2={w} y1={h - 4} y2={h - 4} /><circle cx={w - 3} cy={h - 4} r="3" /></svg>;
  const lo = Math.min(...data), hi = Math.max(...data), span = Math.max(1, hi - lo);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * (w - 6) + 3, h - 4 - ((v - lo) / span) * (h - 10)] as const);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const last = pts[pts.length - 1];
  return <svg className="hw-spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><path d={d} /><circle cx={last[0]} cy={last[1]} r="3" /></svg>;
}
function WFollowers({ z }: { z: WSize }) {
  const t = useT(); const s = useSave();
  const f = bylineOf(s).followers; const series = followerSeries(s);
  const d = series.length ? series[series.length - 1] - series[0] : 0;
  return <>
    <b className="hw__big g-num"><Count n={f} format={(n) => n.toLocaleString('en')} /></b>
    <Spark data={series} w={z === '4x2' ? 300 : 140} />
    <span className="hw__s" aria-label={t('sh.w.followers.aria', { d: Math.max(1, series.length) })}>{series.length > 1 ? t('sh.w.followers.since', { n: d.toLocaleString('en'), d: series.length }) : t('sh.w.followers.today')}</span>
  </>;
}
function WStreak({ z }: { z: WSize }) {
  const t = useT(); const s = useSave();
  const n = s.streak?.n || 0;
  const days = Array.from({ length: 7 }, (_, k) => ymdUTC(Date.now() - (6 - k) * DAY));
  return <>
    <span className="hw__row"><b className="hw__big g-num"><Count n={n} /></b><span className="hw__unit">{t('sh.w.streak.days')}</span></span>
    <span className="hw-week" aria-hidden="true">{days.map((d) => <i key={d} className={(s.daily[d] ? 'on' : '') + (d === ymdUTC() ? ' now' : '')} />)}</span>
    <span className="hw__s">{n ? (z === '4x2' && s.streak.grace ? t('sh.w.streak.grace', { n: s.streak.grace }) : t('sh.w.streak.best', { n: Math.max(n, s.streak.best || 0) })) : t('sh.w.streak.zero')}</span>
  </>;
}
function WCatch({ z }: { z: WSize }) {
  const t = useT(); const s = useSave();
  const cp = catchphraseOf(s);
  return <>
    <b className={'hw-catch hw-catch--' + cp.tone + (z === '4x2' ? ' is-wide' : '')} dir="auto">{cp.text}</b>
    <span className="hw__s">{t('sh.w.catch.fires')}</span>
  </>;
}
function WMarket({ z }: { z: WSize }) {
  const t = useT();
  const w = useWire();
  const ids = watchIds() || (w.mine?.calls || []).filter((c) => !c.done).map((c) => c.rid);
  const rows = ids.map((rid) => (w.rumours || []).find((r) => r.id === rid)).filter((r): r is NonNullable<typeof r> => !!r).slice(0, z === '4x2' ? 3 : 2);
  if (!w.online && !rows.length) return <span className="hw__s">{t('sh.w.market.off')}</span>;
  if (!rows.length) return <span className="hw__s hw__s--lead">{t('sh.w.market.empty')}</span>;
  return <ul className="hw-mkt">{rows.map((r) => { const b = w.board[r.id]; const m = Math.round((b ? b.market : 0.5) * 100); return <li key={r.id} aria-label={r.playerName + ' · ' + t('sh.w.market.says', { n: m })}><span dir="auto">{r.playerName}</span><b className="g-num">{m}<small>%</small></b></li>; })}</ul>;
}
function WSponsor({ z }: { z: WSize }) {
  const t = useT(); const s = useSave();
  const a = activeDeals(s)[0];
  if (!a) return <span className="hw__s hw__s--lead">{t('sh.w.sponsor.empty')}</span>;
  const left = Math.max(0, a.strikes - a.p.strikes);
  return <>
    <b className="hw-brand" style={{ color: brandOf(a.brand).accent }}>{t('e4.sp.brand.' + a.brand + '.n')}</b>
    <span className="hw__row"><b className="hw__mid g-num"><Count n={a.p.paid} /></b><span className="hw__unit">{t('sh.w.sponsor.unit')}</span></span>
    {z === '4x2' || a.p.strikes ? <span className="hw__s">{a.p.strikes ? t('sh.w.sponsor.left', { n: left }) : t('sh.w.sponsor.clean')}</span> : null}
  </>;
}
function WSeason({ z }: { z: WSize }) {
  const t = useT(); const s = useSave();
  const v = seasonLevel(s.season?.xp || 0);
  return <>
    <span className="hw__row"><b className="hw__big g-num">{v.n}</b><span className="hw__unit">/ {SEASON.tiers}</span></span>
    <span className="hw-bar" aria-hidden="true"><i style={{ width: v.pct + '%' }} /></span>
    <span className="hw__s" dir="auto">{z === '4x2' ? seasonName() + (goldOn(s) ? ' · ' + t('sh.w.season.gold') : '') : t('sh.w.season.tier', { n: v.n, of: SEASON.tiers })}</span>
  </>;
}
function WGroup({ z }: { z: WSize }) {
  const t = useT(); const s = useSave();
  const r = s.rooms?.[0];
  if (!r) return <span className="hw__s hw__s--lead">{t('sh.w.group.empty')}</span>;
  return <>
    <b className="hw__name" dir="auto">{r.name || r.code}</b>
    <span className="hw__s g-num">{t('sh.w.group.code', { c: r.code })}{z === '4x2' && s.rooms.length > 1 ? ' · +' + (s.rooms.length - 1) : ''}</span>
  </>;
}
const BOSSES = ['tabloid', 'itk', 'insider', 'roar', 'vince'] as const;
function WBoss({ z }: { z: WSize }) {
  const t = useT(); const s = useSave();
  const ch = chapterOf(s);
  if (!ch) return <span className="hw__s hw__s--lead">{t('sh.w.boss.none')}</span>;
  const id = BOSSES[Math.min(BOSSES.length - 1, ch.i)];
  const r = rivalOf(s, id);
  return <>
    <b className="hw__name" dir="auto">{id === 'roar' || id === 'vince' ? t('sh.w.boss.' + id) : t('rival.' + id)}</b>
    <span className="hw__row"><b className="hw__big g-num">{r.w}<i>–</i>{r.l}</b></span>
    {z === '4x2' && <span className="hw__s">{t('sh.w.boss.h2h', { w: r.w, l: r.l })}</span>}
  </>;
}
function WFiles({ z }: { z: WSize }) {
  const t = useT(); const s = useSave();
  const open = SECRET_FILES.filter((f) => s.ach?.[f]).length;
  return <>
    <span className="hw-files" aria-hidden="true">{SECRET_FILES.map((f) => <i key={f} className={s.ach?.[f] ? 'on' : ''} />)}</span>
    <span className="hw__row"><b className="hw__mid g-num">{open}</b><span className="hw__unit">/ {SECRET_FILES.length}</span></span>
    <span className="hw__s">{open >= SECRET_FILES.length ? t('sh.w.files.all') : z === '4x2' ? t('sh.w.files.open', { n: open, of: SECRET_FILES.length }) + ' · ' + t('sh.w.files.next') : t('sh.w.files.next')}</span>
  </>;
}

// ---------------------------------------------------------------- looks: status, price, buy, wear
const priceText = (t: T, p: Price) => (p.coins != null ? t('sh.home.coins', { n: p.coins.toLocaleString('en') }) : p.credits != null ? t('sh.home.credits', { n: p.credits }) : '');
function gateText(t: T, it: Item): string {
  const e = it.earn; if (!e) return '';
  if (e.via === 'story') return t('sh.home.story', { n: e.n || 1 });
  if (e.via === 'streak' && (e.n || 1) === 1) return t('sh.home.streak1');
  if (e.via === 'rank') return t('sh.home.rank', { rank: t('cn.tier.' + (e.ref || 'tierone')) });
  return t('sh.home.withLook');
}
/** One look's actions: wear it if it's yours, buy it if it's on sale (try-on is the row tap), else what earns it. */
export function LookActions({ it, kind }: { it: Item; kind: Kind }) {
  const t = useT(); const s = useSave(); const tr = useTry();
  const mine = owns(it.id, s);
  const on = kind === 'theme' ? (s.theme || 'standard') === it.id || (it.id.startsWith('std.') && (!s.theme || s.theme === 'standard')) : equippedLook(kind, s).id === it.id;
  const [msg, setMsg] = useState('');
  if (mine) {
    if (on && !tr[kind as 'theme']) return <span className="sh-pill is-on"><Icon n="check" size={14} />{t('sh.home.worn')}</span>;
    return <button type="button" className="sh-btn" onClick={() => { equipItem(it.id.startsWith('std.') ? null : it.id, kind); tryLook(null); sfx('ui.pop'); haptic('tap'); }}>{t('sh.home.wear')}</button>;
  }
  if (onSale(it)) {
    const p = priceNow(it); const cur = bestCurrency(p, s);
    return <span className="sh-buy">
      <button type="button" className="sh-btn sh-btn--buy" onClick={() => {
        if (!cur) return;
        const r = buy(it.id, cur);
        if (r.ok) { tryLook(null); sfx('coin'); haptic('stamp'); setMsg(t('sh.home.bought')); } else { sfx('os.locked'); setMsg(t('sh.home.short')); }
      }}>{t('sh.home.buy', { p: priceText(t, p) })}</button>
      {msg && <small role="status">{msg}</small>}
    </span>;
  }
  return <span className="sh-pill">{gateText(t, it)}</span>;
}

// ---------------------------------------------------------------- Edit home's sheet
export type EditTab = 'widgets' | 'face' | 'icons' | 'theme' | 'phone';
const TABS: EditTab[] = ['widgets', 'face', 'icons', 'theme', 'phone'];
export function EditSheet({ open, tab, setTab, onClose, onPreviewLock }: { open: boolean; tab: EditTab; setTab: (x: EditTab) => void; onClose: () => void; onPreviewLock: () => void }) {
  const t = useT();
  const close = () => { tryLook(null); onClose(); };
  return <Sheet open={open} onClose={close} label={t('sh.home.edit')} className="sh-sheet">
    <SheetHead title={t('sh.home.tabs.' + tab)} aside={tab === 'widgets' ? <SlotsLine /> : t('sh.home.previewNote')} onClose={close} />
    <div className="sh-tabs" role="tablist">
      {TABS.map((x) => <button key={x} type="button" role="tab" aria-selected={tab === x} className={'sh-tab' + (tab === x ? ' is-on' : '')} onClick={() => { sfx('ui.tap'); tryLook(null); setTab(x); }}>{t('sh.home.tabs.' + x)}</button>)}
    </div>
    <div className="sh-pane" role="tabpanel">
      {tab === 'widgets' && <WidgetPicker />}
      {tab === 'face' && <LookList kind="lockface" onTry={(id) => { tryLook(id); onPreviewLock(); }} />}
      {tab === 'icons' && <LookList kind="iconpack" />}
      {tab === 'theme' && <LookList kind="theme" />}
      {tab === 'phone' && <PhonesShelf />}
    </div>
  </Sheet>;
}
function SlotsLine() {
  const t = useT(); const s = useSave();
  const l = homeLayout(s);
  return <>{t('sh.home.slots', { used: unitsOf(l.p[0]) + unitsOf(l.p[1]), n: slotsFor(s) })}</>;
}
function WidgetPicker() {
  const t = useT(); const s = useSave();
  const l = homeLayout(s);
  const placed = new Set([...l.p[0], ...l.p[1]].map((x) => x.w));
  const [full, setFull] = useState(false);
  return <div className="sh-list">
    {full && <p className="sh-note" role="status">{t('sh.home.full')}</p>}
    {WIDGETS.map((d) => {
      const isOpen = widgetOpen(d.id, s); const g = widgetGate(d.id); const on = placed.has(d.id);
      return <div key={d.id} className={'sh-row' + (isOpen ? '' : ' is-shut')}>
        <span className={'sh-wgi sh-wgi--' + d.sizes[0]} aria-hidden="true"><i /></span>
        <span className="sh-row__t"><b>{t('sh.w.' + d.id + '.t')}</b><small>{d.sizes.join(' · ').replace(/x/g, '×')}</small></span>
        {on ? <span className="sh-pill is-on"><Icon n="check" size={14} />{t('sh.home.placed')}</span>
          : isOpen ? <button type="button" className="sh-btn" onClick={() => { const ok = placeWidget(d.id); setFull(!ok); sfx(ok ? 'ui.pop' : 'os.locked'); haptic('tap'); }}>{t('sh.home.place')}</button>
          : <span className="sh-pill">{g.level ? t('sh.home.reach', { n: g.level }) : g.look ? gateText(t, item(g.look)!) : ''}</span>}
      </div>;
    })}
  </div>;
}
function LookList({ kind, onTry }: { kind: 'lockface' | 'iconpack' | 'theme'; onTry?: (id: string) => void }) {
  const t = useT(); const tr = useTry(); const s = useSave();
  // Themes: only the 4.0 OS themes (the 3.x desk themes have no phone tokens).
  const list = itemsOf(kind).filter((it) => (owns(it.id, s) || onSale(it) || it.source === 'earned') && (kind !== 'theme' || it.source === 'standard' || (it.preview.k === 'theme' && !!it.preview.os)));
  return <div className="sh-list">
    {list.map((it) => {
      const trying = tr[kind] === it.id;
      return <div key={it.id} className={'sh-row sh-row--look' + (trying ? ' is-trying' : '')}>
        <button type="button" className="sh-row__try" onClick={() => { sfx('ui.tap'); if (onTry) onTry(it.id); else tryLook(trying ? null : it.id); }} aria-label={t('sh.home.tryOn') + ' · ' + t(it.nameKey, it.nameVars)}>
          <LookThumb it={it} />
          <span className="sh-row__t"><b dir="auto">{t(it.nameKey, it.nameVars)}</b><small>{trying ? t('sh.home.trying') : t('sh.home.tryOn')}</small></span>
        </button>
        <LookActions it={it} kind={kind} />
      </div>;
    })}
  </div>;
}

// ---------------------------------------------------------------- phones: one card each, four bars, one-tap upgrades
export function PhonesShelf() {
  const t = useT(); const s = useSave();
  const shown = PHONES.filter((p) => ownsPhone(p, s) || onSale(phoneItem(p)) || p.chapter != null);
  return <div className="sh-phones">
    <p className="sh-ranked"><Icon n="lock" size={14} />{t(RANKED_NOTE_KEY)} {t('sh.ph.perks')}</p>
    {shown.map((p) => <PhoneCard key={p.id} p={p} />)}
  </div>;
}
export function PhoneCard({ p }: { p: PhoneDef }) {
  const t = useT(); const s = useSave(); const tr = useTry();
  const it = phoneItem(p); const mine = ownsPhone(p, s);
  const inDaily = phoneIn(s, 'daily').id === p.id, inStory = phoneIn(s, 'career').id === p.id;
  const face = p.face ? item(p.face) || undefined : undefined;
  const [flash, setFlash] = useState<Part | null>(null);
  const up = (part: Part) => {
    const r = upgrade(p.id, part);
    if (r.ok) { sfx('coin'); haptic('stamp'); setFlash(part); setTimeout(() => setFlash(null), 900); } else { sfx('os.locked'); haptic('tap'); }
  };
  return <article className={'sh-ph' + (mine ? '' : ' is-shut') + (tr.device === it.id ? ' is-trying' : '')} aria-label={t('sh.ph.name.' + p.id)}>
    <div className="sh-ph__pic"><DeviceArt p={it} size={72} face={face} /></div>
    <div className="sh-ph__main">
      <b className="sh-ph__name" dir="auto">{t('sh.ph.name.' + p.id)}</b>
      <span className="sh-ph__feel" dir="auto">{p.second ? t('sh.ph.second') + ' · ' : ''}{t('sh.ph.feel.' + p.id)}</span>
      <ul className="sh-parts">
        {PARTS.map((part) => {
          const lv = partLevel(p.id, part, s), max = p.max[part], price = mine ? upgradePrice(p.id, part, s) : null;
          const steps = PART_VALUES[part].length - 1;
          if (max === 0 && lv === 0) return <li key={part} className="sh-part is-none"><span className="sh-part__k">{t('sh.ph.part.' + part)}</span><span className="sh-part__v">{t('sh.ph.locked')}</span></li>;
          return <li key={part} className={'sh-part' + (flash === part ? ' is-up' : '')}>
            <span className="sh-part__k">{t('sh.ph.part.' + part)}</span>
            <span className="sh-part__bar" aria-hidden="true">{Array.from({ length: steps }, (_, k) => <i key={k} className={(k < lv ? 'on' : '') + (k >= max ? ' cap' : '')} />)}</span>
            <span className="sh-part__v">{partLine(t, part, partValue(p.id, part, s))}</span>
            {price != null ? <button type="button" className="sh-up" disabled={s.credits < price} onClick={() => up(part)} aria-label={t('sh.ph.part.' + part) + ' · ' + t('sh.ph.up', { n: price })}><Icon n="bolt" size={13} />{price.toLocaleString('en')}</button>
              : mine && lv >= max ? <span className="sh-up is-max">{t('sh.ph.max')}</span> : null}
          </li>;
        })}
      </ul>
      <div className="sh-ph__act">
        {mine && !p.second && (inDaily ? <span className="sh-pill is-on"><Icon n="check" size={14} />{t('sh.ph.inDaily')}</span> : <button type="button" className="sh-btn" onClick={() => { equipPhone(p.id, 'daily'); tryLook(null); sfx('ui.pop'); }}>{t('sh.ph.daily')}</button>)}
        {mine && !p.second && p.chapter != null && (inStory ? <span className="sh-pill">{t('sh.ph.inStory')}</span> : <button type="button" className="sh-btn sh-btn--quiet" onClick={() => { equipPhone(p.id, 'career'); sfx('ui.tap'); }}>{t('sh.ph.story')}</button>)}
        {!mine && onSale(it) && <>
          <button type="button" className="sh-btn sh-btn--quiet" onClick={() => { tryLook(tr.device === it.id ? null : it.id); sfx('ui.tap'); }}>{tr.device === it.id ? t('sh.home.takeOff') : t('sh.home.tryOn')}</button>
          <LookActions it={it} kind="device" />
        </>}
        {!mine && !onSale(it) && p.chapter != null && <span className="sh-pill">{t('sh.ph.get', { n: p.chapter + 1 })}</span>}
      </div>
    </div>
  </article>;
}
function partLine(t: T, part: Part, v: number): string {
  if (part === 'screen') return t('sh.ph.v.screen', { n: v });
  if (part === 'battery') return v ? t('sh.ph.v.battery', { n: v }) : t('sh.ph.v.battery0');
  if (part === 'camera') return v === 1 ? t('sh.ph.v.camera1') : v ? t('sh.ph.v.camera', { n: v }) : t('sh.ph.v.camera0');
  return v ? t('sh.ph.v.sim', { n: Math.round(v * 100) }) : t('sh.ph.v.sim0');
}

// ---------------------------------------------------------------- the handle line (biggest thing after the window)
export function HandleLine({ onTap }: { onTap: () => void }) {
  const t = useT(); const s = useSave();
  const b = bylineOf(s);
  const rank = rankOf(s);
  return <Pop className="hm-me" onTap={onTap} label={t('os.app.lens')} sound="os.open">
    <span className="hm-me__name" dir="auto">{s.nick || t('g.home.noName')}</span>
    <span className="hm-me__meta"><b className={'hm-me__rank is-' + rank}>{t('cn.tier.' + rank)}</b><span className="g-num">{t('os.home.widget.rep', { n: b.rep })}</span></span>
  </Pop>;
}

/** Long-press detector: 520 ms still on the element starts Edit home. Movement or release cancels; the click that
 *  follows a long-press is swallowed so the widget under the finger doesn't open. */
export function useLongPress(on: () => void, ms = 520) {
  const tm = useRef(0); const p0 = useRef<[number, number] | null>(null); const fired = useRef(0);
  const clear = () => { clearTimeout(tm.current); p0.current = null; };
  return {
    onPointerDown: (e: RPointerEvent) => { if (e.button !== 0 && e.pointerType === 'mouse') return; p0.current = [e.clientX, e.clientY]; clearTimeout(tm.current); tm.current = window.setTimeout(() => { p0.current = null; fired.current = Date.now(); haptic('stamp'); sfx('lift'); on(); }, ms); },
    onPointerMove: (e: RPointerEvent) => { const p = p0.current; if (p && Math.hypot(e.clientX - p[0], e.clientY - p[1]) > 10) clear(); },
    onPointerUp: clear, onPointerCancel: clear, onPointerLeave: clear,
    onClickCapture: (e: RMouseEvent) => { if (Date.now() - fired.current < 700) { e.stopPropagation(); e.preventDefault(); } },
    onContextMenu: (e: RMouseEvent) => { e.preventDefault(); },
  };
}
