// Transfer Market (LAUNCH_BRIEF §18–§19, §42, Addendum B; spec I): the hardcore mode. Real rumours priced by the desk,
// settled by what actually happens. One viewport (owner rule): tabs Market · My calls · Table, filters + search, five
// rows a page, the file sheet (YES/NO → name the club and fee → how sure → file), the settled reel, the season table.
// Every number comes from lib/wireData.ts (which reads the server's wire.mjs); every date from the server calendar.
import { useEffect, useState, type CSSProperties } from 'react';
import { useT, num, fmtDate } from '../lib/i18n';
import { useSave, getSave, update } from '../lib/save';
import { v3, data } from '../lib/api';
import { Portrait } from '../ui/portrait';
import { useWire, refreshWire, gradeOf, stageOf, windowParts, windowLine, stakeOf, WIRE, marketOf, type Rumour, type WireCall, type FreeAgent, type BoardItem } from '../lib/wireData';
import { clubById, WORLD } from '../lib/engine';
import { onWireFiled, onWireRight, toast } from '../lib/meta';
import { sfx } from '../lib/sfx';
import { Crest, Sheet } from '../ui/bits';
import { Icon, Kit, GBtn, TopBar, useCountUp, confetti } from '../ui/game';
import { Avatar } from '../ui/screenbits';
import { wireReply } from '../lib/banter';
import { rumourHed } from './Front';
import type { Chrome } from '../App';
import '../styles/football.css';
import '../styles/market39.css';
import { usePaged, Pager } from '../ui/fit';

const round1 = (x: number) => Math.round(x * 10) / 10;
const STR = ['talks', 'advanced', 'confirmed'];
const STAGES = ['interest', 'talks', 'bid', 'agreed'];
const stageKey = (s: string) => (STAGES.includes(s) ? s : 'interest');
const pct = (x: number) => Math.round(x * 100);
type TF = ReturnType<typeof useT>;
// '2027-01' → 'Winter window 2027' (long) or 'Jan 2027' (short); anything else as it is.
export const winLabel = (t: TF, w: string, short = false) => { const p = windowParts(w); return p ? t('fb.win.' + p.k + (short ? 'S' : ''), { y: p.y }) : w; };
// Coins for a right call, by the player's star level (0 = unrated). Cosmetic currency only; Cred is never bought.
const STAR_COINS = [15, 25, 40, 70];
const starOf = (r?: Rumour) => (r && WORLD.players.find((x) => x.id === r.playerId)?.star) || 0;
const dayStr = (t: TF, iso: string) => (iso ? fmtDate(Date.parse(iso.length === 10 ? iso + 'T00:00:00Z' : iso), t.lang, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const GAME_URL = 'https://www.sembagames.app/tier-one';

type MTab = 'market' | 'mine' | 'table';
void Pager; void usePaged;
const lgName = (t: TF, k: string) => { const x = t('m.wire.lg.' + k); return x === 'm.wire.lg.' + k ? k : x; };

export function WireScreen({ rid, ...chrome }: Chrome & { rid?: string }) {
  const t = useT();
  const w = useWire();
  const [sel, setSel] = useState<string | undefined>(rid);
  const [pre, setPre] = useState<boolean | undefined>();
  const rs = w.rumours || [];
  const cur = sel ? rs.find((r) => r.id === sel) : undefined;
  useEffect(() => {
    if (!w.mine || !w.rumours) return;
    const fresh = w.mine.calls.filter((c) => c.done && c.right && !getSave().stats['wr:' + c.rid]);
    if (!fresh.length) return;
    const coins = fresh.reduce((a, c) => a + STAR_COINS[starOf(rs.find((r) => r.id === c.rid))], 0);
    update((s) => { for (const c of fresh) s.stats['wr:' + c.rid] = 1; s.credits += coins; s.ledger = [{ at: Date.now(), d: coins, why: 'wire' }, ...s.ledger].slice(0, 30); });
    fresh.forEach(() => onWireRight());
    toast('info', t('m.wire.paid', { n: coins }));
  }, [w.mine, w.rumours]); // eslint-disable-line react-hooks/exhaustive-deps
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 30e3); return () => clearInterval(i); }, []);
  const win = windowLine(now, w.calendar);
  const [tab, setTab] = useState<MTab>('market');
  const [stars] = useState(0);
  const [heat, setHeat] = useState(0);
  const [league, setLeague] = useState('');
  const [team] = useState('');
  const [fa, setFa] = useState(false);
  const [q, setQ] = useState('');
  const leagues = [...new Set(rs.map((r) => clubById(r.currentClubId)?.l || '').filter(Boolean))].sort();
  const needle = q.trim().toLowerCase();
  const faIds = new Set(w.freeAgents.map((x) => x.id));
  const list = rs.filter((r) => starOf(r) >= stars && r.heat >= heat
    && (!league || clubById(r.currentClubId)?.l === league)
    && (!team || r.currentClubName === team || r.linked.some((l) => l.name === team))
    && (!fa || faIds.has(r.playerId) || w.board[r.id]?.ps === 'free')
    && (!needle || [r.playerName, r.currentClubName, ...r.linked.map((l) => l.name)].some((x) => (x || '').toLowerCase().includes(needle))))
    .sort((a, b) => b.heat - a.heat);
  const faList = fa ? w.freeAgents.filter((x) => !needle || x.n.toLowerCase().includes(needle) || (x.lastClub || '').toLowerCase().includes(needle)) : [];
  const open = (id: string, yes?: boolean) => { sfx('sheet.open'); setPre(yes); setSel(id); };
  const m = w.mine;
  const calls = m?.calls || [];
  const openCalls = calls.filter((c) => !c.done).length;
  const left = Math.max(0, w.limits.daily - w.callsToday);
  const paper = calls.filter((c) => !c.done).reduce((a, c) => a + (c.paper || 0), 0);
  const fresh = calls.filter((c) => c.done && !getSave().stats['ws:' + c.rid]);
  const winChip = win ? t('m.wire.' + win.k, { t: win.d ? t('m.wire.leftDh', { d: win.d, h: win.h }) : t('m.wire.leftHm', { h: win.h, m: win.m }) }) : '';

  const [view, setView] = useState<'rum' | 'tr' | 'mine' | 'pl'>(tab === 'mine' ? 'mine' : 'rum');
  const go = (k: 'rum' | 'tr' | 'mine' | 'pl') => { sfx('ui.tap'); setView(k); setTab(k === 'mine' ? 'mine' : 'market'); };
  const hed = view === 'tr' ? t('u39.mk.hed.tr') : t('u39.mk.hed.' + view);
  const fresh2 = w.asOf ? t('u39.mk.refresh', { d: dayStr(t, w.asOf) }) : t('mk.dataOff');
  return <div className="g-screen wire3 mk39 fit">
    <TopBar back={{ label: t('u39.tabs.desk'), onClick: () => chrome.go({ n: 'front' }) }} onHelp={() => chrome.go({ n: 'howto' })} />
    <div className="fit__body">
      <div className="mk39__tabs" role="tablist">
        {(['rum', 'tr', 'mine', 'pl'] as const).map((k) => <button key={k} role="tab" aria-selected={view === k} onClick={() => go(k)}>{t('u39.mk.tabs.' + k)}{k === 'mine' && openCalls > 0 ? <b className="g-badge">{openCalls}</b> : null}</button>)}
      </div>
      <h1 className="mk39__hed g-hed">{hed}</h1>
      {view !== 'mine' && <label className="mk39__search"><Icon n="eye" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('u39.mk.search')} aria-label={t('u39.mk.search')} />{q && <button type="button" aria-label={t('common.close')} onClick={() => setQ('')}><Icon n="x" size={16} /></button>}</label>}
      {view === 'rum' && <div className="mk39__filters">
        <select value={league} onChange={(e) => setLeague(e.target.value)} aria-label={t('hub.market.league')}><option value="">{t('u39.mk.allLeagues')}</option>{leagues.map((k) => <option key={k} value={k}>{lgName(t, k)}</option>)}</select>
        <select value={fa ? 'fa' : heat ? 'hot' : 'all'} onChange={(e) => { const v = e.target.value; setFa(v === 'fa'); setHeat(v === 'hot' ? 60 : 0); }} aria-label={t('m.wire.group')}>
          <option value="all">{t('u39.mk.all')}</option><option value="hot">{t('u39.mk.hot')}</option><option value="fa">{t('u39.mk.fa')}{w.freeAgents.length ? ' (' + w.freeAgents.length + ')' : ''}</option>
        </select>
      </div>}
      {view !== 'pl' && <p className="mk39__date g-mono">{view === 'mine' ? t('mk.settle', { h: w.calendar.settleGraceH }) : fresh2}{winChip ? ' · ' + winChip : ''}</p>}
      {!w.market.open && view === 'rum' && <p className="mk-closed"><Icon n="lock" size={14} /> {t('mk.closed')} {w.market.note || t('mk.closedWhy.' + (w.market.why || 'flag'))}</p>}

      <div className="mk39__list">
        {view === 'rum' && <>
          {!w.rumours && <p className="g-empty">{w.loading ? t('common.loading') : t('wire.needNet')}</p>}
          {w.rumours && !list.length && !faList.length && <p className="g-empty">{fa ? t('mk.faNone', { d: dayStr(t, w.asOf) }) : t('hub.market.none')}</p>}
          {list.slice(0, 40).map((r) => <RumRow key={r.id} r={r} onOpen={() => open(r.id)} />)}
          {faList.slice(0, 40).map((x) => <FARow key={x.id} x={x} />)}
        </>}
        {view === 'tr' && <Transfers q={needle} />}
        {view === 'pl' && <Players q={needle} rs={rs} onOpen={(id) => open(id)} />}
        {view === 'mine' && (fresh.length ? <SettledReel /> : tab === 'table' ? <MarketTable /> : <>
          <div className="kpis3">
            <span><b className="g-num">{m ? num(Math.round(m.cred)) : '–'}</b><small className="g-mono">{t('mk.kpi.cred')}</small></span>
            <span><b className="g-num">{m && m.resolved > 0 ? pct(m.hitRate) + '%' : '–'}</b><small className="g-mono">{t('mk.kpi.hit')}</small></span>
            <span><b className={'g-num ' + (paper < 0 ? 'neg' : 'pos')}>{num(round1(paper), true)}</b><small className="g-mono">{t('mk.kpi.paper')}</small></span>
            <span><b className="g-num">{left}<em>/{w.limits.daily}</em></b><small className="g-mono">{t('mk.kpi.today')}</small></span>
          </div>
          {calls.length ? calls.slice(0, 40).map((c) => <CallRow key={c.rid} c={c} onOpen={() => open(c.rid)} />)
            : <p className="g-empty">{t('hub.market.mineNone')}</p>}
          <button type="button" className="mk39__row" onClick={() => { sfx('ui.tap'); setTab('table'); }}><Icon n="trophy" size={22} /><span><b>{t('u39.mk.table')}</b></span><Icon n={t.rtl ? 'back' : 'arrow'} size={18} /></button>
        </>)}
        {view === 'tr' && <>
          <div className="mk39__note"><Portrait kind="staff" id="editor" size={56} round /><b>{t('u39.mk.note')}</b></div>
          <button type="button" className="mk39__row" onClick={() => { sfx('ui.tap'); setFa(true); setHeat(0); setView('rum'); }}><Icon n="card" size={24} /><span><b>{t('u39.mk.faRow')}</b><small>{t('u39.mk.faSub')}</small></span><Icon n={t.rtl ? 'back' : 'arrow'} size={18} /></button>
        </>}
        <p className="mk39__fair"><Icon n="help" size={16} />{t('u39.mk.fair')}</p>
      </div>
    </div>
    {cur && <RumourSheet key={cur.id} r={cur} pre={pre} onClose={() => setSel(undefined)} />}
  </div>;
}

// ---------- 3.9 Transfers: confirmed moves from the data snapshot (/api/data/transfers), newest first, with the source
type Tr = { id: string; playerId: string; playerName: string; fromClubId: string | null; fromName: string | null; toClubId: string | null; toName: string | null; date: string; type: string; feeText?: string; sources?: string[] };
let trCache: { at: number; list: Tr[]; asOf: string } | null = null;
function Transfers({ q }: { q: string }) {
  const t = useT();
  const [st, setSt] = useState<{ list: Tr[]; asOf: string } | 'off' | null>(trCache);
  const [ty, setTy] = useState('');
  const [lg, setLg] = useState('');
  useEffect(() => {
    if (trCache && Date.now() - trCache.at < 6e5) return;
    data<{ transfers: Tr[]; asOf?: string; meta?: { asOf?: string } }>('transfers?limit=200').then((r) => {
      if (!r || !r.transfers) { setSt((x) => x || 'off'); return; }
      trCache = { at: Date.now(), list: r.transfers, asOf: r.asOf || r.meta?.asOf || '' }; setSt(trCache);
    });
  }, []);
  if (st === null) return <p className="g-empty">{t('common.loading')}</p>;
  if (st === 'off') return <p className="g-empty">{t('u39.mk.trOff')}</p>;
  const lgs = [...new Set(st.list.flatMap((x) => [clubById(x.fromClubId || '')?.l, clubById(x.toClubId || '')?.l]).filter(Boolean) as string[])].sort();
  const rows = st.list.filter((x) => (!ty || x.type === ty) && (!lg || clubById(x.fromClubId || '')?.l === lg || clubById(x.toClubId || '')?.l === lg)
    && (!q || [x.playerName, x.fromName, x.toName].some((v) => (v || '').toLowerCase().includes(q)))).slice(0, 40);
  return <>
    <div className="mk39__filters">
      <select value={lg} onChange={(e) => setLg(e.target.value)} aria-label={t('hub.market.league')}><option value="">{t('u39.mk.allLeagues')}</option>{lgs.map((k) => <option key={k} value={k}>{lgName(t, k)}</option>)}</select>
      <select value={ty} onChange={(e) => setTy(e.target.value)} aria-label={t('u39.mk.tabs.tr')}><option value="">{t('u39.mk.all')}</option>{['transfer', 'loan', 'free', 'undisclosed'].map((k) => <option key={k} value={k}>{t('u39.mk.ty.' + k)}</option>)}</select>
    </div>
    {!rows.length && <p className="g-empty">{t('u39.mk.trNone')}</p>}
    {rows.map((x) => {
      const from = clubById(x.fromClubId || ''), to = clubById(x.toClubId || ''); const p = WORLD.players.find((y) => y.id === x.playerId);
      const src = (x.sources || [])[0];
      return <div key={x.id} className="mk39__card">
        <Kit club={to || from} player={p} size={56} />
        <span className="mk39__b">
          <span className="mk39__top"><b dir="auto">{x.playerName}</b><span className="mk39__pill is-ok">{t('u39.mk.confirmed')}</span></span>
          <span className="mk39__route"><bdi>{x.fromName || '—'}</bdi><Icon n={t.rtl ? 'back' : 'arrow'} size={14} /><bdi>{x.toName || '—'}</bdi></span>
          <small>{t('u39.mk.announced', { d: dayStr(t, x.date) })}{x.feeText ? ' · ' + x.feeText : ''}</small>
          {src && <a className="mk39__src" href={src} target="_blank" rel="noopener noreferrer"><Icon n="news" size={14} />{t('u39.mk.source')}</a>}
        </span>
      </div>;
    })}
  </>;
}
// ---------- 3.9 Players: the game's player database (top leagues), search by name or club; on-Market players open
function Players({ q, rs, onOpen }: { q: string; rs: Rumour[]; onOpen: (rid: string) => void }) {
  const t = useT();
  const live = new Map(rs.map((r) => [r.playerId, r.id]));
  const rows = WORLD.players.filter((p) => !q || p.n.toLowerCase().includes(q) || (clubById(p.c)?.n || '').toLowerCase().includes(q))
    .sort((a, b) => (live.has(b.id) ? 1 : 0) - (live.has(a.id) ? 1 : 0) || b.star - a.star || a.n.localeCompare(b.n)).slice(0, 40);
  if (!rows.length) return <p className="g-empty">{t('u39.mk.plNone')}</p>;
  return <>{rows.map((p) => { const c = clubById(p.c); const rid = live.get(p.id);
    const body = <><Portrait kind="player" id={p.id} club={c} size={56} round /><span className="mk39__b"><span className="mk39__top"><b dir="auto">{p.n}</b>{rid && <span className="mk39__pill">{t('u39.mk.onMarket')}</span>}</span><small>{[c?.n, t('pos.' + p.pos), p.age ? String(p.age) : ''].filter(Boolean).join(' · ')}</small></span>{rid && <Icon n={t.rtl ? 'back' : 'arrow'} size={18} />}</>;
    return rid ? <button key={p.id} type="button" className="mk39__card is-btn" onClick={() => onOpen(rid)}>{body}</button> : <div key={p.id} className="mk39__card">{body}</div>;
  })}</>;
}

// ---------- one rumour, one row: kit (the portrait slot), name, the headline, stars · heat · stage · status, the price
function RumRow({ r, onOpen }: { r: Rumour; onOpen: () => void }) {
  const t = useT();
  const w = useWire();
  const b = w.board[r.id];
  const mine = b?.mine || (w.mine?.calls || []).find((c) => c.rid === r.id) || null;
  const m = b ? b.market : marketOf(r);
  const from = clubById(r.currentClubId);
  const st = stageOf(r);
  const star = starOf(r);
  const closed = b && b.state !== 'open';
  return <button className={'tm-row mk39__card is-btn' + (mine ? ' is-called' : '')} onClick={onOpen} aria-label={r.playerName}>
    <Portrait kind="player" id={r.playerId} club={from} size={56} round />
    <span className="tm-row__b">
      <span className="tm-row__n" dir="auto">{r.playerName}</span>
      <span className="tm-row__h" dir="auto">{rumourHed(t, r)}</span>
      <span className="tm-row__m">{star ? <span>{'★'.repeat(star)}</span> : null}<span><Icon n="flame" size={11} />{r.heat}</span><span className={'stage stage--' + st}>{t('g.wire.stage.' + st)}</span><StatusChip b={b} /></span>
    </span>
    <span className="tm-row__p">{mine ? <span className={'yn-tag ' + (mine.yes ? 'is-yes' : 'is-no')}>{mine.yes ? t('wire.yesS') : t('wire.noS')}</span> : closed ? <small>{t('mk.frozenRow')}</small> : null}<b className="g-num">{pct(m)}<small>%</small></b><small>{t('g.wire.market')}</small></span>
  </button>;
}
// The player's roster status from the snapshot (Addendum B): on loan, free agent, or nothing for a plain club player.
function StatusChip({ b }: { b?: BoardItem }) {
  const t = useT();
  if (!b || !b.ps || b.ps === 'club') return null;
  if (b.ps === 'loan') return <span className="mk-status">{b.loanFrom ? t('mk.status.loan', { c: b.loanFrom }) : t('mk.status.loanS')}</span>;
  return <span className={'mk-status' + (b.ps === 'free' ? ' is-free' : '')}>{t('mk.status.' + b.ps)}</span>;
}
// A free agent from the snapshot: identity and status only, never a call (Addendum B: eligibility needs a live rumour).
function FARow({ x }: { x: FreeAgent }) {
  const t = useT();
  const last = x.lastClubId ? clubById(x.lastClubId) : undefined;
  return <div className="tm-row mk-fa mk39__card" aria-label={x.n}>
    <Portrait kind="player" id={x.id} club={last} size={56} round />
    <span className="tm-row__b">
      <span className="tm-row__n" dir="auto">{x.n}</span>
      <span className="tm-row__h">{t('mk.faSince', { d: dayStr(t, x.since) })}{x.lastClub ? ' · ' + t('mk.faLast', { c: x.lastClub }) : ''}</span>
    </span>
    <span className="mk-status is-free">{t('mk.status.free')}</span>
  </div>;
}
function HeatLine({ a, b, yes }: { a: number; b: number; yes: boolean }) {
  const good = yes ? b >= a : b <= a;
  return <svg className="heatline3" viewBox="0 0 120 26" preserveAspectRatio="none" aria-hidden="true"><line x1="2" x2="118" y1={24 - a * 22} y2={24 - a * 22} stroke="currentColor" strokeOpacity=".35" strokeDasharray="3 3" /><path d={`M2 ${24 - a * 22} L116 ${24 - b * 22}`} stroke={good ? 'var(--c-done)' : 'var(--red)'} strokeWidth="2.5" fill="none" strokeLinecap="round" /><circle cx="116" cy={24 - b * 22} r="3.5" fill={good ? 'var(--c-done)' : 'var(--red)'} /></svg>;
}
// ---------- one of your calls
function CallRow({ c, onOpen }: { c: WireCall; onOpen: () => void }) {
  const t = useT();
  const now = c.mNow ?? c.m;
  const v = c.done ? c.pts || 0 : c.paper || 0;
  return <button className="tm-row" onClick={() => { sfx('ui.tap'); onOpen(); }}>
    <span className={'yn-tag ' + (c.yes ? 'is-yes' : 'is-no')}>{c.yes ? t('wire.yesS') : t('wire.noS')}</span>
    <span className="tm-row__b">
      <span className="tm-row__n" dir="auto">{c.player || '—'}</span>
      <span className="tm-row__m"><span>{t('str.' + STR[c.s - 1])}</span><span>{c.done ? (c.outcome === 'void' ? t('wire.voidS') : c.right ? t('wire.right') : t('wire.wrong')) : pct(c.m) + '% → ' + pct(now) + '%'}</span>{c.room === 'beat' && <span className="mk-beat">{t('mk.beat')}</span>}</span>
    </span>
    <span className="tm-row__p"><b className={'g-num ' + (v < 0 ? 'neg' : 'pos')}>{num(round1(v), true)}</b><small>{c.done ? t('g.wire.settledPts') : t('mk.kpi.paper')}</small></span>
  </button>;
}

// ---------- the season table (lb.top period 'wire'): settled Cred only, server-scored
function MarketTable() {
  const t = useT();
  const s = useSave();
  const [b, setB] = useState<{ rows: { nick: string; score: number; me: boolean }[]; players: number; me?: { rank: number; score: number } } | 'off' | null>(null);
  useEffect(() => { v3<{ rows: { nick: string; score: number; me: boolean }[]; players: number; me?: { rank: number; score: number } }>('lb.top', { period: 'wire', dev: s.dev }).then((r) => setB(r.ok ? { rows: r.rows, players: r.players, me: r.me } : 'off')); }, [s.dev]);
  const rows = b && b !== 'off' ? b.rows : [];
  const pg = usePaged(rows, 6);
  return <>
    <div className="mk-tablehead"><b>{t('mk.table')}</b><span className="g-mono">{t('mk.tableAside')}</span></div>
    {b === null ? <p className="g-empty">{t('common.loading')}</p> : b === 'off' ? <p className="g-empty">{t('wire.needNet')}</p> : <>
      <p className="mk-you">{b.me ? t('mk.you', { r: b.me.rank, p: num(Math.round(b.me.score)) }) : t('mk.notOn')}<span className="g-mono">{t('mk.reporters', { n: b.players })}</span></p>
      {!rows.length ? <p className="g-empty">{t('mk.tableEmpty')}</p> : <ol className="mk-table" start={pg.page * 6 + 1}>
        {pg.rows.map((r, k) => <li key={k} className={r.me ? 'is-me' : ''}><span className="g-num mk-table__r">{pg.page * 6 + k + 1}</span><span className="mk-table__n" dir="auto">{r.nick}</span><b className="g-num">{num(Math.round(r.score))}</b></li>)}
      </ol>}
      <Pager p={pg} />
    </>}
    <p className="mk-fresh g-mono"><span>{t('mk.fair')}</span></p>
  </>;
}

// ---------- the file: a bottom sheet
function RumourSheet({ r, pre, onClose }: { r: Rumour; pre?: boolean; onClose: () => void }) {
  const t = useT();
  const s = useSave();
  const w = useWire();
  const b = w.board[r.id];
  const mine = b?.mine || (w.mine?.calls || []).find((c) => c.rid === r.id) || null;
  const m = b ? b.market : marketOf(r);
  const [yes, setYes] = useState(pre ?? true);
  const [picked, setPicked] = useState(pre != null);
  const [st, setSt] = useState(2);
  const [club, setClub] = useState<string | null>(null);
  const [fee, setFee] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const from = clubById(r.currentClubId);
  const p = WORLD.players.find((x) => x.id === r.playerId);
  const o = stakeOf(yes, st, m);
  const split = b ? b.split : { yes: 0, no: 0 };
  const tot = split.yes + split.no;
  const correctable = mine && !mine.corrected && !mine.done && Date.now() - mine.at < w.limits.correctMin * 60e3;
  const open = (!b || b.state === 'open') && w.market.open;
  const st8 = stageOf(r);
  const mySide = tot >= WIRE.ROOM_MIN ? (yes ? split.yes : split.no) / tot : null;
  const file = async (correct: boolean) => {
    setBusy(true);
    const res = await v3<{ call: WireCall }>(correct ? 'wire.correct' : 'wire.file', { dev: s.dev, nick: s.nick, rid: r.id, yes, s: st, club: yes ? club : null, fee: yes ? fee : null });
    setBusy(false);
    if (!res.ok) { toast('warn', t.or('mk.errors.' + res.error, t.or('wire.errors.' + res.error, 'err.' + (res.error === 'net' ? 'net' : 'generic')))); return; }
    sfx(st === 3 ? 'publish.confirmed' : st === 2 ? 'publish.advanced' : 'publish.talks');
    onWireFiled(); await refreshWire(true);
  };
  const FEES = WIRE.FEE_BANDS;
  const pickYN = (y: boolean) => { sfx('ui.tap'); setYes(y); setPicked(true); };
  return <Sheet open onClose={onClose} label={r.playerName} wide accent="var(--m-wire)">
    <div className="wsheet">
      <div className="wsheet__band"><span className="g-mono"><i className="g-dot" />{t('nav.wire')} · {t('wire.window', { w: winLabel(t, r.window) })}</span>
        <button className="wsheet__x" onClick={() => { sfx('ui.tap'); onClose(); }} aria-label={t('g.wire.close')}><Icon n="x" size={20} /></button></div>

      <header className="wsheet__head">
        {/* Portrait slot (Addendum A): <Portrait kind="player" id={r.playerId} club={from} size={84} name={r.playerName} />. Club and status stay live text below. */}
        <Kit club={from} player={p} size={84} />
        <div className="wsheet__who">
          <span className={'stage stage--' + st8}>{t('g.wire.stage.' + st8)}</span>
          <h2 className="g-h2">{r.playerName}</h2>
          <p className="g-mono wsheet__meta">{[p && t('pos.' + p.pos), p && p.age > 0 ? String(p.age) : '', r.currentClubName].filter(Boolean).join(' · ')}<StatusChip b={b} /></p>
          <p className="g-mono wsheet__meta">{w.asOf ? t('mk.squadAsOf', { d: dayStr(t, w.asOf) }) : t('mk.dataOff')}</p>
        </div>
      </header>
      <p className="wsheet__hed">{rumourHed(t, r)}</p>

      <div className="wsheet__gauges">
        <div className="gauge"><span className="g-mono">{t('g.wire.market')}</span><b className="g-num">{pct(m)}%</b><span className="g-bar g-bar--sm" style={{ ['--bar' as string]: 'var(--m-wire)' }}><i style={{ width: pct(m) + '%' }} /></span><small>{t('g.wire.yesSub')}</small></div>
        <div className="gauge"><span className="g-mono">{t('g.wire.heat')}</span><b className="g-num">{r.heat}</b><span className="g-bar g-bar--sm" style={{ ['--bar' as string]: 'linear-gradient(90deg,#F7B928,#FF5A36)' }}><i style={{ width: Math.min(100, r.heat) + '%' }} /></span><small>/ 100</small></div>
      </div>

      <section className="wsheet__sec">
        <h3 className="g-mono">{t('g.wire.linked')}</h3>
        <div className="wsheet__route"><span className="rclub rclub--from"><Crest club={from} size={30} /><b>{r.currentClubName}</b></span><Icon n={t.rtl ? 'back' : 'arrow'} size={18} />
          <span className="rclubs">{r.linked.map((l, k) => <span key={k} className="rclub"><Crest club={l.clubId ? clubById(l.clubId) : undefined} size={26} /><b>{l.name}</b><span className={'stage stage--' + stageKey(l.stage)}>{t('g.wire.stage.' + stageKey(l.stage))}</span></span>)}</span></div>
        <h3 className="g-mono" style={{ marginTop: 16 }}>{t('g.wire.reported')}</h3>
        <div className="outlets3">{r.outlets.map((x, k) => { const g = gradeOf(x.tier); return <span key={k} className="outlet3"><span className={'grade3 grade3--' + g.toLowerCase()}>{g}</span>{x.name || '—'}{x.date ? <small className="g-mono">{x.date}</small> : null}</span>; })}</div>
        {r.fact && t.lang === 'en' && <p className="wsheet__fact">{r.fact}</p>}
        <h3 className="g-mono" style={{ marginTop: 16 }}>{t('mk.room')}</h3>
        {tot > 0 ? <><div className="split" aria-label={t('mk.roomLine', { y: Math.round((100 * split.yes) / tot), n: Math.round((100 * split.no) / tot), r: tot })}><span className="split__y" style={{ flex: Math.max(1, split.yes) }}>{t('wire.yesS')} {Math.round((100 * split.yes) / tot)}%</span><span className="split__n" style={{ flex: Math.max(1, split.no) }}>{t('wire.noS')} {Math.round((100 * split.no) / tot)}%</span></div>
          <p className="step__hint g-mono">{t('mk.roomLine', { y: Math.round((100 * split.yes) / tot), n: Math.round((100 * split.no) / tot), r: tot })}</p></>
          : <p className="wsheet__note">{t('mk.roomNone')}</p>}
      </section>

      <section className="wsheet__file">
        <div className="wsheet__fileh"><h3 className="g-h2">{mine ? t('g.wire.yourCall') : t('wire.file')}</h3><span className="g-mono">{t('g.wire.left', { n: Math.max(0, w.limits.daily - w.callsToday), m: w.limits.daily })}</span></div>
        {mine && !correctable ? <FiledCard c={mine} r={r} />
          : !open ? <p className="wsheet__note"><Icon n="lock" size={16} /> {w.market.open ? t('wire.frozen') : t('mk.closed')}</p> : <>
            {correctable && mine && <FiledCard c={mine} r={r} />}
            <div className="step"><span className="step__n">1</span><b>{t('mk.q1')}</b></div>
            <div className="ynbig">
              <button className={'yn yn--yes yn--lg' + (picked && yes ? ' is-on' : '') + (picked && !yes ? ' is-off' : '')} aria-pressed={picked && yes} onClick={() => pickYN(true)}><Icon n="check" /><span><b>{t('wire.yesS')}</b><small>{t('mk.yesSub')} · {pct(m)}%</small></span></button>
              <button className={'yn yn--no yn--lg' + (picked && !yes ? ' is-on' : '') + (picked && yes ? ' is-off' : '')} aria-pressed={picked && !yes} onClick={() => pickYN(false)}><Icon n="x" /><span><b>{t('wire.noS')}</b><small>{t('mk.noSub')} · {100 - pct(m)}%</small></span></button>
            </div>
            {picked && mySide != null && mySide < WIRE.ROOM_X && <p className="mk-against"><Icon n="bolt" size={14} /> {t('mk.againstYou', { p: Math.round((1 - mySide) * 100) })}</p>}
            {picked && yes && <>
              <div className="step"><span className="step__n step__n--opt">+</span><b>{t('mk.name')}</b><span className="g-mono">{t('mk.nameAside')}</span></div>
              <div className="pick">{r.linked.filter((l) => l.clubId).map((l) => <button key={l.clubId!} className="pick__c" aria-pressed={club === l.clubId} onClick={() => { sfx('ui.tap'); setClub(club === l.clubId ? null : l.clubId); }}><Crest club={clubById(l.clubId!)} size={20} />{l.name}</button>)}
                <button className="pick__c" aria-pressed={club === 'other'} onClick={() => { sfx('ui.tap'); setClub(club === 'other' ? null : 'other'); }}>{t('wire.other')}</button></div>
              <div className="pick" style={{ marginTop: 8 }}>{FEES.map((f) => <button key={f} className="pick__c" aria-pressed={fee === f} onClick={() => { sfx('ui.tap'); setFee(fee === f ? null : f); }}>{t('wire.fees.' + f)}</button>)}</div>
              <p className="step__hint g-mono">{t('mk.nameHint', { a: WIRE.DEST_RIGHT, b: WIRE.DEST_WRONG, c: WIRE.FEE_RIGHT, d: WIRE.FEE_WRONG })}</p>
            </>}
            {picked && <>
              <div className="step"><span className="step__n">2</span><b>{t('mk.q2')}</b></div>
              <div className="loud">{[1, 2, 3].map((k) => { const x = stakeOf(yes, k, m); return <button key={k} className="loud__b" aria-pressed={st === k} onClick={() => { sfx('ui.tap'); setSt(k); }}>
                <span className="loud__bars" aria-hidden="true">{[1, 2, 3].map((i) => <i key={i} className={i <= k ? 'on' : ''} />)}</span>
                <b>{t('str.' + STR[k - 1])}</b><small className="loud__sub">{t('mk.sure.' + STR[k - 1])}</small><span className="loud__w g-num">+{x.win}</span><span className="loud__l g-num">−{x.lose}</span></button>; })}</div>
              <div className="wsum"><span><small className="g-mono">{t('mk.ifRight')}</small><b className="g-num pos">+{o.win}</b></span><span><small className="g-mono">{t('mk.ifWrong')}</small><b className="g-num neg">−{o.lose}</b></span></div>
              <p className="step__hint g-mono">{t('mk.early', { x: 1 + WIRE.LEAD_X, d: WIRE.LEAD_DAYS })}</p>
              <GBtn size="lg" kind={yes ? 'green' : ''} sound={null} disabled={busy || !w.online} onClick={() => file(!!correctable)} style={{ marginTop: 14 }}>
                <Icon n="fax" size={22} />{correctable ? t('wire.correct') : t('mk.file', { s: t('str.' + STR[st - 1]), y: yes ? t('wire.yesS') : t('wire.noS') })}
              </GBtn>
              <p className="wsheet__lock g-mono"><Icon n="lock" size={12} /> {t('mk.lock', { n: w.limits.correctMin })}</p>
            </>}
          </>}
        <details className="g-more">
          <summary><Icon n="help" size={16} />{t('mk.how')}</summary>
          {(t.list('mk.howL') as string[]).map((x, k) => <p key={k}>{x.replace('{h}', String(WIRE.LATE_HOURS))}</p>)}
          <p>{t('mk.settle', { h: w.calendar.settleGraceH })}</p>
        </details>
      </section>
    </div>
  </Sheet>;
}

function FiledCard({ c, r }: { c: WireCall; r: Rumour }) {
  const t = useT();
  const now = c.mNow ?? c.m;
  const v = c.done ? c.pts || 0 : c.paper || 0;
  const parts = c.parts || {};
  const breakdown = c.done && c.outcome !== 'void' ? [
    parts.main != null ? '+' + parts.main + ' ' + t('mk.parts.main') : parts.lose != null ? parts.lose + ' ' + t('mk.parts.main') : '',
    parts.lead && parts.lead > 1 ? t('mk.parts.lead', { x: parts.lead }) : '',
    parts.where ? num(round1(parts.where), true) + ' ' + t('mk.parts.where') : '',
    parts.fee ? num(parts.fee, true) + ' ' + t('mk.parts.fee') : '',
    parts.late ? t('mk.parts.late') : '',
  ].filter(Boolean).join(' · ') : '';
  const [copied, setCopied] = useState(false);
  const share = async () => {
    sfx('ui.tap');
    const text = t('mk.shareBeat', { p: c.player || r.playerName, y: c.yes ? t('wire.yesS') : t('wire.noS'), pct: Math.round((1 - (c.cRoom ?? 0)) * 100), u: GAME_URL });
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch { /* cancelled */ }
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* no clipboard */ }
  };
  return <div className="filed3">
    <span className={'g-stamp g-stamp--xl is-slam ' + (c.done ? (c.right ? 'g-stamp--done' : '') : 'g-stamp--wire')}>{c.done ? (c.outcome === 'void' ? t('wire.voidS') : c.right ? t('wire.right') : t('wire.wrong')) : (c.yes ? t('wire.yesS') : t('wire.noS'))}</span>
    <div className="filed3__meta">
      <span className="g-chip">{t('str.' + STR[c.s - 1])}</span>
      <span className="g-mono">{t('g.wire.locked', { m: pct(c.m) })}</span>
      {!c.done && <span className="g-mono">{t('g.wire.now', { m: pct(now) })}</span>}
      {!c.done && c.frozen && <span className="g-mono">{t('wire.frozen')}</span>}
    </div>
    {!c.done && <HeatLine a={c.m} b={now} yes={c.yes} />}
    <div className="filed3__pnl"><small className="g-mono">{c.done ? t('g.wire.settledPts') : t('mk.kpi.paper')}</small><b className={'g-num ' + (v < 0 ? 'neg' : 'pos')}>{c.done ? <Roll v={v} ms={1100} /> : num(round1(v), true)}</b></div>
    {breakdown && <p className="step__hint g-mono" style={{ marginTop: 0 }}>{breakdown}</p>}
    {c.done && c.room === 'beat' && <div className="mk-beatcard"><span className="g-stamp g-stamp--gold is-slam">{t('mk.beat')}</span><GBtn size="sm" kind="gold" sound={null} onClick={share}><Icon n="share" size={16} />{copied ? t('mk.copied') : t('mk.share')}</GBtn></div>}
    {c.done && c.room === 'lost' && <span className="mk-status">{t('mk.lostRoom')}</span>}
    {c.done && c.outcome !== 'void' && c.right != null && <WireReply c={c} />}
  </div>;
}

// The mentions under a settled call: one fan, reacting to what really happened.
function WireReply({ c }: { c: WireCall }) {
  const t = useT();
  const x = wireReply(t.lang, c.rid, !!c.right, c.s >= 3, c.player || '');
  if (!x.text) return null;
  return <div className="wreply"><Avatar name={x.handle} size={28} /><div><b>{x.name}</b> <bdi dir="ltr" className="g-mono">{x.handle}</bdi><p dir="auto">{x.text}</p></div></div>;
}

// A settled number rolls up to its value (one decimal, like the scores).
function Roll({ v, ms = 900 }: { v: number; ms?: number }) {
  const x = useCountUp(Math.round(v * 10), ms) / 10;
  return <>{num(round1(x), true)}</>;
}

// ---------- settled since you last looked: stamps slam in one by one, the total rolls up. Shown in place of the list
// until dismissed (one viewport); each call is shown once (save.stats['ws:'+rid]).
function SettledReel({ style }: { style?: CSSProperties }) {
  const t = useT();
  const w = useWire();
  const s = useSave();
  const fresh = (w.mine?.calls || []).filter((c) => c.done && !s.stats['ws:' + c.rid]);
  const key = fresh.map((c) => c.rid).join('|');
  const right = fresh.filter((c) => c.right && c.outcome !== 'void').length;
  const total = round1(fresh.reduce((a, c) => a + (c.outcome === 'void' ? 0 : c.pts || 0), 0));
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!key) return;
    setShown(true);
    const tm = setTimeout(() => { sfx(right ? 'stamp.done' : 'stamp.wrong'); if (right) { confetti(); if (navigator.vibrate) try { navigator.vibrate(30); } catch { /* not supported */ } } }, 260);
    return () => clearTimeout(tm);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown2 = useCountUp(Math.round(total * 10), 1200, shown) / 10;
  if (!fresh.length) return null;
  const seen = () => { sfx('ui.tap'); update((x) => { for (const c of fresh) x.stats['ws:' + c.rid] = 1; }); };
  return <section className={'wreel g-card' + (total >= 0 ? ' is-up' : ' is-down')} style={style} aria-live="polite">
    <h2 className="wreel__head">{t('fb.settled.n', { n: fresh.length })}</h2>
    <div className="wreel__total"><b className={'g-num ' + (total < 0 ? 'neg' : 'pos')}>{num(round1(shown2), true)}</b><small className="g-mono">{t('fb.settled.total')}</small></div>
    <div className="wreel__row">{fresh.slice(0, 8).map((c, k) => <div key={c.rid} className="wreel__c" style={{ ['--k' as string]: k }}>
      <span className={'g-stamp is-slam ' + (c.outcome === 'void' ? '' : c.right ? 'g-stamp--done' : 'g-stamp--fake')} style={{ ['--rot' as string]: (k % 2 ? 4 : -5) + 'deg' }}>{c.outcome === 'void' ? t('fb.settled.void') : c.right ? t('fb.settled.right') : t('fb.settled.wrong')}</span>
      <b>{c.player || '—'}</b>
      <b className={'g-num ' + ((c.pts || 0) < 0 ? 'neg' : 'pos')}>{c.outcome === 'void' ? '0' : num(round1(c.pts || 0), true)}</b>
      {c.room === 'beat' && <small className="mk-beat">{t('mk.beat')}</small>}
    </div>)}</div>
    <GBtn kind={total >= 0 ? 'green' : ''} sound={null} onClick={seen}>{t('common.done')}</GBtn>
  </section>;
}
