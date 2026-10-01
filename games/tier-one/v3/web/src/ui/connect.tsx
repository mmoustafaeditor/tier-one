// One Byline widgets (GOTY.md §1): the top-bar bell, Home's next-up slip, "For you", the head-to-head strip, the byline
// card on Me, and the byline line on Results. Screens live in screens/Connect.tsx; the logic in lib/byline.ts.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useSave, getSave, type Save } from '../lib/save';
import { useT, type T } from '../lib/i18n';
import { sfx } from '../lib/sfx';
import {
  unreadOf, toRoute, nextUp, markRead, bylineOf, repTier, REP_TIERS, rivalOf, netOf, RIVALS, recordWindow, windowKey,
  type FeedItem, type WindowSummary,
} from '../lib/byline';
import type { View } from '../lib/driver';
import type { Beat } from '../lib/storyMode';
import type { Route, Go } from '../App';
import { Icon, GBtn, CountUp, useCountUp } from './game';
import '../styles/connect.css';
import { feedSkin } from '../lib/wallet';
import { CatchLine, Showcase } from './customize';
import { BadgeRow } from './awards';

// ---------- navigation for components that don't get chrome (the bell lives in every TopBar)
let navGo: Go | null = null;
export const setNav = (g: Go) => { navGo = g; };
export const navTo = (r: Route) => navGo?.(r);

// ---------- plurals: key.{zero|one|two|few|many|other} picked by the language's own rules (Arabic has six)
export function tn(t: T, key: string, n: number, v?: Record<string, string | number>): string {
  const o = t.list(key) as Record<string, string> | string | undefined;
  if (!o || typeof o === 'string') return t(key, { n, ...v });
  let cat = 'other';
  try { cat = new Intl.PluralRules(t.lang).select(n); } catch { /* old engine: fall back to other */ }
  const s = (n === 0 && o.zero) || o[cat] || o.other || '';
  return s.replace(/\{(\w+)\}/g, (m, k) => (k === 'n' ? String(n) : v && v[k] != null ? String(v[k]) : m));
}
// A handle like @BackPageBants is Latin inside Arabic copy: isolate it so the @ stays on its left.
export const LTR = (x: string) => '\u2066' + x + '\u2069';
const FSI = (x: string) => '\u2068' + x + '\u2069';
export function Handle({ id, className }: { id: string; className?: string }) {
  const t = useT();
  return <bdi dir="ltr" className={className}>{t('rival.' + id)}</bdi>;
}

// ---------- feed text: stored as key + raw vars, translated at read time so a language switch re-reads everything
export function feedText(t: T, f: FeedItem): string {
  const v: Record<string, string | number> = { ...(f.v || {}) };
  if (v.mode) v.mode = t('cn.mode.' + v.mode);
  if (v.src) v.src = t('src.' + v.src);
  if (v.rival) v.rival = LTR(t('rival.' + v.rival));
  if (v.rec) v.rec = LTR(String(v.rec));
  if (v.p) v.p = FSI(String(v.p));
  if (v.rt) v.rt = t('cn.tier.' + v.rt);
  if ('tier' in v) v.tier = v.tier ? ', ' + t('tier.' + v.tier) : '';
  if (v.perk) v.perk = t(String(v.perk)).toLowerCase();
  if (v.m) v.m = t(String(v.m), { n: v.mn ?? '' });
  if (v.name == null) v.name = FSI(getSave().nick.trim() || t('d2.post.you')); // rival taunts aim at your byline
  return t(f.key, v);
}
const KIND_IC: Record<string, string> = { editor: 'story', rival: 'reply', wire: 'wire', room: 'friends', contact: 'phone', mission: 'target', level: 'crown', season: 'gift', streak: 'flame', window: 'news', hot: 'flame' };
const KIND_C: Record<string, string> = { editor: 'var(--m-story)', rival: 'var(--red)', wire: 'var(--m-wire)', room: 'var(--m-rooms)', contact: 'var(--m-practice)', mission: 'var(--gold)', level: 'var(--gold)', season: 'var(--gold)', streak: 'var(--red)', window: 'var(--on-desk-3)', hot: 'var(--c-hijack)' };
export const kindIcon = (k: string) => KIND_IC[k] || 'news';
export const kindColor = (k: string) => KIND_C[k] || 'var(--on-desk-3)';
export function ago(ms: number, lang: string) {
  const d = (ms - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : lang, { numeric: 'auto', style: 'short' });
  const a = Math.abs(d);
  return a < 60 ? rtf.format(0, 'second') : a < 3600 ? rtf.format(Math.round(d / 60), 'minute') : a < 86400 ? rtf.format(Math.round(d / 3600), 'hour') : rtf.format(Math.round(d / 86400), 'day');
}

// ---------- one line of wire copy (Feed screen and Home's "For you")
export function FeedRow({ f, onOpen, style }: { f: FeedItem; onOpen?: () => void; style?: CSSProperties }) {
  const t = useT(); useSave(); const fs = feedSkin(); // the feed skin (Your desk): rows restyle live when it changes
  const open = () => { sfx('ui.tap'); markRead([f.id]); onOpen ? onOpen() : navTo(toRoute(f.to)); };
  return <button className={'cn-row' + (f.read ? '' : ' is-new') + (f.tone ? ' is-' + f.tone : '')} data-skin={fs.skin || undefined} style={{ ['--kc' as string]: kindColor(f.kind), ...fs.vars, ...style }} onClick={open}>
    <span className="cn-row__ic" aria-hidden="true">{f.kind === 'rival' && f.from ? <RivalMark id={f.from} size={30} /> : <Icon n={kindIcon(f.kind)} size={18} />}</span>
    <span className="cn-row__body">
      {f.kind === 'rival' && f.from && <b className="cn-row__who"><Handle id={f.from} /></b>}
      {f.kind === 'editor' && f.from && <b className="cn-row__who">{f.from === 'editor' ? t('g.story.from.' + f.from) : <bdi dir="ltr">{t('g.story.from.' + f.from)}</bdi>}</b>}
      <span className="cn-row__txt" dir="auto">{feedText(t, f)}</span>
    </span>
    <time className="cn-row__at" dateTime={new Date(f.at).toISOString()}>{ago(f.at, t.lang)}</time>
  </button>;
}
export function RivalMark({ id, size = 40 }: { id: string; size?: number }) {
  return <span className={'cn-rmark cn-rmark--' + id} style={{ ['--sz' as string]: size + 'px' }} aria-hidden="true">{{ tabloid: 'BP', itk: 'IT', insider: 'PP' }[id] || '?'}</span>;
}

// ---------- the bell (TopBar)
const BELL = 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 20.5a2 2 0 0 0 4 0';
export function Bell() {
  const s = useSave(); const t = useT();
  const n = unreadOf(s).length;
  const prev = useRef(n);
  const [pop, setPop] = useState(false);
  useEffect(() => { if (n > prev.current) { setPop(true); const id = setTimeout(() => setPop(false), 600); prev.current = n; return () => clearTimeout(id); } prev.current = n; }, [n]);
  return <button className={'g-icbtn cn-bell' + (pop ? ' is-pop' : '')} onClick={() => { sfx('ui.tap'); navTo({ n: 'feed' }); }} aria-label={t('cn.bell', { n })}>
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={BELL} /></svg>
    {n > 0 && <span className="cn-bell__n">{n > 9 ? '9+' : n}</span>}
  </button>;
}

// ---------- Home: the assignment slip (next up, when it isn't the Daily) and "For you"
export function NextUpSlip({ go, event, style }: { go: Go; event?: string; style?: CSSProperties }) {
  const t = useT(); const s = useSave();
  const nx = nextUp(s, event);
  if (nx.kind === 'daily') return null;
  const k = 'cn.next.' + nx.kind;
  const v: Record<string, string | number> = { ...(nx.v || {}) };
  if (v.m) v.m = t('cn.mode.' + v.m);
  const sub = nx.kind === 'practice' && v.e ? t(k + '.se', v) : t(k + '.s', v);
  const act = () => {
    if (nx.feedId) markRead([nx.feedId]);
    go(nx.to.n === 'play' ? { ...nx.to, key: Date.now() } as Route : nx.to);
  };
  return <section className={'cn-slip cn-slip--' + nx.kind} style={style}>
    <span className="cn-slip__tape" aria-hidden="true" />
    <h2 className="cn-slip__t">{t(k + '.t')}</h2>
    <p className="cn-slip__s">{sub}</p>
    <GBtn size="sm" kind={nx.kind === 'mission' ? 'gold' : ''} sound="open" onClick={act}><Icon n={nx.kind === 'wire' ? 'wire' : nx.kind === 'career' ? 'story' : nx.kind === 'room' ? 'friends' : nx.kind === 'mission' ? 'gift' : nx.kind === 'resume' ? 'uturn' : 'target'} />{t(k + '.b')}</GBtn>
  </section>;
}
export function ForYou({ go, style }: { go: Go; style?: CSSProperties }) {
  const t = useT(); const s = useSave();
  const top = unreadOf(s).slice(0, 2);
  if (!top.length) return null;
  return <section className="cn-foryou" style={style} aria-label={t('cn.home.forYou')}>
    <div className="cn-foryou__h"><h2>{t('cn.home.forYou')}</h2><button className="cn-link" onClick={() => go({ n: 'feed' })}>{t('cn.home.all')}</button></div>
    <div className="cn-sheet">{top.map((f) => <FeedRow key={f.id} f={f} onOpen={() => go(toRoute(f.to))} />)}</div>
  </section>;
}
export function RivalStrip({ go, style }: { go: Go; style?: CSSProperties }) {
  const t = useT(); const s = useSave();
  const any = RIVALS.some((id) => { const r = rivalOf(s, id); return r.w + r.l + r.d > 0; });
  if (!any) return null;
  return <button className="cn-strip" style={style} onClick={() => { sfx('ui.tap'); go({ n: 'rivals' }); }} aria-label={t('cn.home.rivalsAll')}>
    <span className="cn-strip__k">{t('cn.home.rivals')}</span>
    {RIVALS.map((id) => { const r = rivalOf(s, id); const n = netOf(r); return <span key={id} className={'cn-strip__i' + (n > 0 ? ' is-up' : n < 0 ? ' is-down' : '')}>
      <RivalMark id={id} size={26} /><b className="g-num">{r.w}–{r.l}</b>
    </span>; })}
  </button>;
}

// ---------- Me: the byline itself. Who you are, what the trade calls you, and how far to the next rung.
export function BylineCard({ s, style }: { s: Save; style?: CSSProperties }) {
  const t = useT();
  const b = bylineOf(s);
  const tier = repTier(b.rep);
  const ti = REP_TIERS.findIndex(([k]) => k === tier);
  const nxt = REP_TIERS[ti + 1];
  const floor = REP_TIERS[ti][1], ceil = nxt ? nxt[1] : 100;
  const into = nxt ? Math.round((100 * (b.rep - floor)) / (ceil - floor)) : 100;
  const name = s.nick || t('g.home.noName');
  const initials = name.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  return <section className={'cn-byline cn-tier--' + tier} style={style} aria-label={t('cn.me.byline')}>
    <div className="cn-byline__top">
      <span className="cn-byline__av" aria-hidden="true">{initials}</span>
      <div className="cn-byline__id">
        <p className="cn-byline__by" dir="auto">{t('share.by', { n: name })}</p>
        <span className={'g-stamp cn-byline__stamp is-slam'}>{t('cn.tier.' + tier)}</span>
      </div>
    </div>
    <div className="cn-ladder" role="img" aria-label={t('cn.me.ladder') + ': ' + t('cn.tier.' + tier) + '. ' + (nxt ? t('cn.me.toTier', { n: ceil - b.rep, rt: t('cn.tier.' + nxt[0]) }) : t('cn.me.topTier'))}>
      <ol className="cn-ladder__rungs" aria-hidden="true">{REP_TIERS.map(([k], i) => <li key={k} className={i < ti ? 'is-past' : i === ti ? 'is-now' : ''}>
        <i style={i === ti ? { ['--into' as string]: into + '%' } : undefined} /><span>{t('cn.tier.' + k)}</span>
      </li>)}</ol>
      <p className="cn-ladder__next">{nxt ? t('cn.me.toTier', { n: ceil - b.rep, rt: t('cn.tier.' + nxt[0]) }) : t('cn.me.topTier')}</p>
    </div>
    <dl className="cn-byline__stats">
      <div><dt>{t('cn.me.followers')}</dt><dd className="g-num"><Rolling to={b.followers} /></dd></div>
      <div><dt>{t('cn.me.rep')}</dt><dd className="g-num">{b.rep}<small>/100</small></dd></div>
      <div className={'cn-hot' + (b.hot ? ' is-lit' : '')}><dt>{t('cn.me.hot')}</dt><dd className="g-num"><Icon n="flame" size={22} />{b.hot}</dd><small>{b.hot ? t('cn.me.best', { n: b.best }) : t('cn.me.cold')}</small></div>
    </dl>
    {/* Your desk (GOTY §8.4, §12): the line a Confirmed call that lands fires, and three pinned looks */}
    <div className="cn-byline__desk">
      <span className="cn-byline__cpk">{t('cp.ui.tab')}</span>
      <CatchLine s={s} className="cn-byline__cp" />
      <Showcase s={s} />
    </div>
    <BadgeRow s={s} />
  </section>;
}

// ---------- Results: records the window once, then shows what it did to the byline
/** Records the finished window once (idempotent per window key) and returns what it did to the byline. Results calls
 *  this on mount, so the window counts even if the player leaves before the tail of the page. */
export function useRecordWindow(view: View, beat?: Beat | null, ppBefore?: number): WindowSummary | null {
  const [sum, setSum] = useState<WindowSummary | null>(() => { const l = getSave().byline?.last; return l && l.key === windowKey(view) ? l : null; });
  useEffect(() => {
    if (!view.done || !view.result) return;
    const r = view.result;
    const out = recordWindow({ mode: view.mode, key: windowKey(view), per: r.per, cast: r.cast && r.cast.length ? r.cast : view.cast, tier: r.tier, total: r.total, ppBefore, beat, room: view.room, no: view.no });
    if (out) setSum(out);
  }, [view.done, beat]); // eslint-disable-line react-hooks/exhaustive-deps
  return sum;
}
export function BylineLine({ sum, style }: { sum: WindowSummary | null; style?: CSSProperties }) {
  const t = useT();
  if (!sum) return null;
  const f = sum.followers;
  return <div className="cn-resline" style={style}>
    <span className="cn-resline__k">{t('cn.res.byline')}</span>
    <b className={'g-num cn-resline__f' + (f < 0 ? ' neg' : '')}><CountUp to={f} sign ms={1000} /></b><span>{t('cn.res.followers')}</span>
    {sum.hot > 0 && <span className="cn-resline__hot"><Icon n="flame" size={16} />{t('cn.res.hot', { n: sum.hot })}</span>}
    {sum.levels.map((l) => <span key={l.src + l.lv} className="cn-resline__lv">{t('cn.res.lv', { s: t('src.' + l.src), n: l.lv })}</span>)}
  </div>;
}

function Rolling({ to }: { to: number }) { const v = useCountUp(to, 1100); return <>{v.toLocaleString('en')}</>; }
