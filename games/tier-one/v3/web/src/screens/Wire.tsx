// The Wire (DESIGN §4, HYBRID.md): calls on real rumours, priced at the Market, settled by what actually happens.
// 3.1: an evidence wall of rumour cards, a live-calls strip with paper P&L, and a bottom-sheet file with a clear
// "file your call" flow. All the maths and data live in lib/wireData.ts and the server, untouched.
// 3.3 (GOTY): the first view invites a call. A short hero, the how-to folded away after the first visit, and a
// "Most wrong right now" strip of three rumours above the (closed) groups, so there is always a YES/NO within reach.
import { useEffect, useState, type CSSProperties } from 'react';
import { useT, num } from '../lib/i18n';
import { useSave, getSave, update } from '../lib/save';
import { v3 } from '../lib/api';
import { useWire, refreshWire, gradeOf, stageOf, windowParts, type Rumour, type WireCall, type WireWindow } from '../lib/wireData';
import { clubById, WORLD, WR } from '../lib/engine';
import { onWireFiled, onWireRight, toast } from '../lib/meta';
import { sfx } from '../lib/sfx';
import { Crest, Sheet } from '../ui/bits';
import { Icon, Kit, GBtn, TopBar, useCountUp, confetti } from '../ui/game';
import { Avatar } from '../ui/screenbits';
import { wireReply } from '../lib/banter';
import { rumourHed } from './Front';
import type { Chrome } from '../App';
import '../styles/football.css';
import { Tip, usePaged, Pager } from '../ui/fit';

const round1 = (x: number) => Math.round(x * 10) / 10;
function odds(yes: boolean, s: number, m: number) { const c = yes ? m : 1 - m; return { win: round1(s * (10 * (1 - c) + 2)), lose: round1(s * 10 * c), c }; }
const STR = ['talks', 'advanced', 'confirmed'];
const STAGES = ['interest', 'talks', 'bid', 'agreed'];
const stageKey = (s: string) => (STAGES.includes(s) ? s : 'interest');
const pct = (x: number) => Math.round(x * 100);
// Real transfer windows (UK deadlines, UTC). The current one comes from the server (wire.mjs › WIRE.CURRENT); the rest
// of this table is the fallback and what follows it. Keep it current.
const WINDOWS: [string, string][] = [['2027-01-01T00:00:00Z', '2027-02-02T23:00:00Z'], ['2027-06-15T23:00:00Z', '2027-09-01T18:00:00Z']];
type TF = ReturnType<typeof useT>;
// '2027-01' → 'Winter window 2027' (long) or 'Jan 2027' (short); anything else as it is.
export const winLabel = (t: TF, w: string, short = false) => { const p = windowParts(w); return p ? t('fb.win.' + p.k + (short ? 'S' : ''), { y: p.y }) : w; };
// Coins for a right call, by the player's star level (0 = unrated).
const STAR_COINS = [15, 25, 40, 70];
const starOf = (r?: Rumour) => (r && WORLD.players.find((x) => x.id === r.playerId)?.star) || 0;
// The countdown's units are dictionary strings (m.wire.leftDh / leftHm), not the English letters they were.
function windowLine(now: number, cur?: WireWindow): { k: 'opens' | 'closes'; d: number; h: number; m: number } | null {
  for (const [a, b] of cur ? [[cur.opens, cur.closes] as [string, string], ...WINDOWS] : WINDOWS) {
    const o = Date.parse(a), c = Date.parse(b);
    if (now < o || now < c) { const ms = (now < o ? o : c) - now, d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4); return { k: now < o ? 'opens' : 'closes', d, h, m }; }
  }
  return null;
}

// 3.6 Transfer Market: two tabs (Market · My calls), filter chips (Stars, Heat, League, Team) and a search, five rumours a
// page. One screen, no page scroll. The file sheet, the settled reel and every number are unchanged.
type MTab = 'market' | 'mine';
const STAR_STEPS = [0, 1, 2, 3], HEAT_STEPS = [0, 50, 75];
const PER = 5;
const nextOf = (list: number[], v: number) => list[(list.indexOf(v) + 1) % list.length];
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
  const win = windowLine(now, w.window);
  const [tab, setTab] = useState<MTab>('market');
  const [stars, setStars] = useState(0);
  const [heat, setHeat] = useState(0);
  const [league, setLeague] = useState('');
  const [team, setTeam] = useState('');
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const leagues = [...new Set(rs.map((r) => clubById(r.currentClubId)?.l || '').filter(Boolean))].sort();
  const teams = [...new Set(rs.map((r) => r.currentClubName).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const needle = q.trim().toLowerCase();
  const list = rs.filter((r) => starOf(r) >= stars && r.heat >= heat
    && (!league || clubById(r.currentClubId)?.l === league)
    && (!team || r.currentClubName === team || r.linked.some((l) => l.name === team))
    && (!needle || [r.playerName, r.currentClubName, ...r.linked.map((l) => l.name)].some((x) => (x || '').toLowerCase().includes(needle))))
    .sort((a, b) => b.heat - a.heat);
  const pg = usePaged(list, PER, [stars, heat, league, team, needle].join('|'));
  const open = (id: string, yes?: boolean) => { sfx('sheet.open'); setPre(yes); setSel(id); };
  const m = w.mine;
  const calls = m?.calls || [];
  const cp = usePaged(calls, PER);
  const openCalls = calls.filter((c) => !c.done).length;
  const left = Math.max(0, WR.WIRE.DAILY_CALLS - w.callsToday);
  const paper = calls.filter((c) => !c.done).reduce((a, c) => a + (c.paper || 0), 0);

  return <div className="g-screen wire3 fit">
    <TopBar back={{ label: t('g.tabs.home'), onClick: () => chrome.go({ n: 'front' }) }} title={t('hub.mode.market')} onHelp={() => chrome.go({ n: 'howto' })} />
    <div className="fit__body">
      <Tip id="market" />
      <div className="tm-head">
        <div className="g-tabs2 tm-tabs" role="tablist" style={{ flex: 1 }}>
          {(['market', 'mine'] as const).map((k) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => { sfx('ui.tap'); setTab(k); }}>{t('hub.market.tabs.' + k)}{k === 'mine' && openCalls > 0 ? <b className="g-badge">{openCalls}</b> : null}</button>)}
        </div>
        <button className="g-icbtn" style={{ width: 44, height: 44 }} aria-label={t('hub.board')} onClick={() => chrome.go({ n: 'boards', period: 'wire', from: { n: 'wire' } })}><Icon n="trophy" /></button>
      </div>

      {tab === 'market' ? <>
        {searching ? <div className="tm-filters">
          <input className="tm-search" style={{ flex: 1, width: 'auto' }} autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('hub.market.search')} aria-label={t('hub.market.search')} />
          <button className="tm-chip" aria-label={t('common.close')} onClick={() => { setQ(''); setSearching(false); }}><Icon n="x" size={16} /></button>
        </div> : <div className="tm-filters" role="group" aria-label={t('m.wire.group')}>
          <button className="tm-chip" aria-pressed={stars > 0} onClick={() => { sfx('ui.tap'); setStars(nextOf(STAR_STEPS, stars)); }}><Icon n="star" size={14} />{stars ? t('hub.market.starsN', { n: stars }) : t('hub.market.stars')}</button>
          <button className="tm-chip" aria-pressed={heat > 0} onClick={() => { sfx('ui.tap'); setHeat(nextOf(HEAT_STEPS, heat)); }}><Icon n="flame" size={14} />{heat ? t('hub.market.heatN', { n: heat }) : t('hub.market.heat')}</button>
          <select className="tm-chip" aria-pressed={!!league} aria-label={t('hub.market.league')} value={league} onChange={(e) => setLeague(e.target.value)}>
            <option value="">{t('hub.market.league')}</option>
            {leagues.map((k) => <option key={k} value={k}>{lgName(t, k)}</option>)}
          </select>
          <select className="tm-chip" aria-pressed={!!team} aria-label={t('hub.market.team')} value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="">{t('hub.market.team')}</option>
            {teams.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <button className="tm-chip" aria-pressed={!!needle} aria-label={t('hub.market.search')} onClick={() => { sfx('ui.tap'); setSearching(true); }}><Icon n="eye" size={14} /></button>
        </div>}
        {!w.rumours && <p className="g-empty">{w.loading ? t('common.loading') : t('wire.needNet')}</p>}
        {w.rumours && !w.online && <p className="g-empty">{t('wire.needNet')}</p>}
        {w.rumours && !list.length && <p className="g-empty">{t('hub.market.none')}</p>}
        <div className="tm-list">{pg.rows.map((r) => <RumRow key={r.id} r={r} onOpen={() => open(r.id)} />)}</div>
        <Pager p={pg} />
      </> : <>
        <SettledReel />
        <div className="kpis3">
          <span><b className="g-num">{m ? num(Math.round(m.cred)) : '–'}</b><small className="g-mono">{t('wire.cred')}</small></span>
          <span><b className="g-num">{m && m.resolved > 0 ? pct(m.hitRate) + '%' : '–'}</b><small className="g-mono">{t('wire.hit')}</small></span>
          <span><b className={'g-num ' + (paper < 0 ? 'neg' : 'pos')}>{num(round1(paper), true)}</b><small className="g-mono">{t('g.wire.pnl')}</small></span>
          <span><b className="g-num">{left}<em>/{WR.WIRE.DAILY_CALLS}</em></b><small className="g-mono">{t('common.today')}</small></span>
        </div>
        {win && <span className="g-chip g-chip--gold" style={{ alignSelf: 'flex-start' }}><Icon n="clock" size={14} />{t('m.wire.' + win.k, { t: win.d ? t('m.wire.leftDh', { d: win.d, h: win.h }) : t('m.wire.leftHm', { h: win.h, m: win.m }) })}</span>}
        {calls.length ? <div className="tm-list">{cp.rows.map((c) => <CallRow key={c.rid} c={c} onOpen={() => open(c.rid)} />)}</div>
          : <div className="live__empty g-card g-card--desk"><span className="live__ic"><Icon n="target" /></span><span>{t('hub.market.mineNone')}</span></div>}
        <Pager p={cp} />
      </>}
    </div>
    {cur && <RumourSheet key={cur.id} r={cur} pre={pre} onClose={() => setSel(undefined)} />}
  </div>;
}

// ---------- one rumour, one row: kit, name, the headline, stars · heat · stage, the Market price
function RumRow({ r, onOpen }: { r: Rumour; onOpen: () => void }) {
  const t = useT();
  const w = useWire();
  const b = w.board[r.id];
  const mine = b?.mine || (w.mine?.calls || []).find((c) => c.rid === r.id) || null;
  const m = b ? b.market : WR.marketOf(r);
  const from = clubById(r.currentClubId);
  const p = WORLD.players.find((x) => x.id === r.playerId);
  const st = stageOf(r);
  const star = starOf(r);
  return <button className={'tm-row' + (mine ? ' is-called' : '')} onClick={onOpen} aria-label={r.playerName}>
    <Kit club={from} player={p} size={40} />
    <span className="tm-row__b">
      <span className="tm-row__n" dir="auto">{r.playerName}</span>
      <span className="tm-row__h" dir="auto">{rumourHed(t, r)}</span>
      <span className="tm-row__m">{star ? <span>{'★'.repeat(star)}</span> : null}<span><Icon n="flame" size={11} />{r.heat}</span><span className={'stage stage--' + st}>{t('g.wire.stage.' + st)}</span>{mine && <span className={'yn-tag ' + (mine.yes ? 'is-yes' : 'is-no')}>{mine.yes ? t('wire.yesS') : t('wire.noS')}</span>}</span>
    </span>
    <span className="tm-row__p"><b className="g-num">{pct(m)}<small>%</small></b><small>{t('g.wire.market')}</small></span>
  </button>;
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
      <span className="tm-row__m"><span>{t('str.' + STR[c.s - 1])}</span><span>{c.done ? (c.outcome === 'void' ? t('wire.voidS') : c.right ? t('wire.right') : t('wire.wrong')) : pct(c.m) + '% → ' + pct(now) + '%'}</span></span>
    </span>
    <span className="tm-row__p"><b className={'g-num ' + (v < 0 ? 'neg' : 'pos')}>{num(round1(v), true)}</b><small>{c.done ? t('g.wire.settledPts') : t('g.wire.pnl')}</small></span>
  </button>;
}

// ---------- the file: a bottom sheet
function RumourSheet({ r, pre, onClose }: { r: Rumour; pre?: boolean; onClose: () => void }) {
  const t = useT();
  const s = useSave();
  const w = useWire();
  const b = w.board[r.id];
  const mine = b?.mine || (w.mine?.calls || []).find((c) => c.rid === r.id) || null;
  const m = b ? b.market : WR.marketOf(r);
  const [yes, setYes] = useState(pre ?? true);
  const [picked, setPicked] = useState(pre != null);
  const [st, setSt] = useState(2);
  const [club, setClub] = useState<string | null>(null);
  const [fee, setFee] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const from = clubById(r.currentClubId);
  const p = WORLD.players.find((x) => x.id === r.playerId);
  const o = odds(yes, st, m);
  const split = b ? b.split : { yes: 0, no: 0 };
  const tot = split.yes + split.no;
  const correctable = mine && !mine.corrected && !mine.done && Date.now() - mine.at < WR.WIRE.CORRECT_MIN * 60e3;
  const open = !b || b.state === 'open';
  const st8 = stageOf(r);
  const file = async (correct: boolean) => {
    setBusy(true);
    const res = await v3<{ call: WireCall }>(correct ? 'wire.correct' : 'wire.file', { dev: s.dev, nick: s.nick, rid: r.id, yes, s: st, club: yes ? club : null, fee: yes ? fee : null });
    setBusy(false);
    if (!res.ok) { const e = t('wire.errors.' + res.error); toast('warn', e.startsWith('wire.') ? t('err.' + (res.error === 'net' ? 'net' : 'generic')) : e); return; }
    sfx(st === 3 ? 'publish.confirmed' : st === 2 ? 'publish.advanced' : 'publish.talks');
    onWireFiled(); await refreshWire(true);
  };
  const FEES = WR.WIRE.FEE_BANDS;
  const pickYN = (y: boolean) => { sfx('ui.tap'); setYes(y); setPicked(true); };
  return <Sheet open onClose={onClose} label={r.playerName} wide accent="var(--m-wire)">
    <div className="wsheet">
      <div className="wsheet__band"><span className="g-mono"><i className="g-dot" />{t('nav.wire')} · {t('wire.window', { w: winLabel(t, r.window) })}</span>
        <button className="wsheet__x" onClick={() => { sfx('ui.tap'); onClose(); }} aria-label={t('g.wire.close')}><Icon n="x" size={20} /></button></div>

      <header className="wsheet__head">
        <Kit club={from} player={p} size={84} />
        <div className="wsheet__who">
          <span className={'stage stage--' + st8}>{t('g.wire.stage.' + st8)}</span>
          <h2 className="g-h2">{r.playerName}</h2>
          <p className="g-mono wsheet__meta">{[p && t('pos.' + p.pos), p && p.age > 0 ? String(p.age) : '', r.currentClubName].filter(Boolean).join(' · ')}</p>
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
        <h3 className="g-mono" style={{ marginTop: 16 }}>{t('g.wire.crowd')}</h3>
        {tot > 0 ? <div className="split" aria-label={`YES ${split.yes} NO ${split.no}`}><span className="split__y" style={{ flex: Math.max(1, split.yes) }}>{t('wire.yesS')} {Math.round((100 * split.yes) / tot)}%</span><span className="split__n" style={{ flex: Math.max(1, split.no) }}>{t('wire.noS')} {Math.round((100 * split.no) / tot)}%</span></div>
          : <p className="wsheet__note">{t('wire.crowdNone')}</p>}
      </section>

      <section className="wsheet__file">
        <div className="wsheet__fileh"><h3 className="g-h2">{mine ? t('g.wire.yourCall') : t('wire.file')}</h3><span className="g-mono">{t('g.wire.left', { n: Math.max(0, WR.WIRE.DAILY_CALLS - w.callsToday), m: WR.WIRE.DAILY_CALLS })}</span></div>
        {mine && !correctable ? <FiledCard c={mine} />
          : !open ? <p className="wsheet__note"><Icon n="lock" size={16} /> {t('wire.frozen')}</p> : <>
            {correctable && mine && <FiledCard c={mine} />}
            <div className="step"><span className="step__n">1</span><b>{t('g.wire.step1')}</b></div>
            <div className="ynbig">
              <button className={'yn yn--yes yn--lg' + (picked && yes ? ' is-on' : '') + (picked && !yes ? ' is-off' : '')} aria-pressed={picked && yes} onClick={() => pickYN(true)}><Icon n="check" /><span><b>{t('wire.yesS')}</b><small>{t('g.wire.yesSub')} · {pct(m)}%</small></span></button>
              <button className={'yn yn--no yn--lg' + (picked && !yes ? ' is-on' : '') + (picked && yes ? ' is-off' : '')} aria-pressed={picked && !yes} onClick={() => pickYN(false)}><Icon n="x" /><span><b>{t('wire.noS')}</b><small>{t('g.wire.noSub')} · {100 - pct(m)}%</small></span></button>
            </div>
            {picked && yes && <>
              <div className="step"><span className="step__n step__n--opt">+</span><b>{t('g.wire.step2')}</b><span className="g-mono">{t('g.wire.step2Aside')}</span></div>
              <div className="pick">{r.linked.filter((l) => l.clubId).map((l) => <button key={l.clubId!} className="pick__c" aria-pressed={club === l.clubId} onClick={() => { sfx('ui.tap'); setClub(club === l.clubId ? null : l.clubId); }}><Crest club={clubById(l.clubId!)} size={20} />{l.name}</button>)}
                <button className="pick__c" aria-pressed={club === 'other'} onClick={() => { sfx('ui.tap'); setClub(club === 'other' ? null : 'other'); }}>{t('wire.other')}</button></div>
              <div className="pick" style={{ marginTop: 8 }}>{FEES.map((f) => <button key={f} className="pick__c" aria-pressed={fee === f} onClick={() => { sfx('ui.tap'); setFee(fee === f ? null : f); }}>{t('wire.fees.' + f)}</button>)}</div>
              <p className="step__hint g-mono">{t('wire.feeAside')}</p>
            </>}
            {picked && <>
              <div className="step"><span className="step__n">2</span><b>{t('g.wire.step3')}</b></div>
              <div className="loud">{[1, 2, 3].map((k) => { const x = odds(yes, k, m); return <button key={k} className="loud__b" aria-pressed={st === k} onClick={() => { sfx('ui.tap'); setSt(k); }}>
                <span className="loud__bars" aria-hidden="true">{[1, 2, 3].map((i) => <i key={i} className={i <= k ? 'on' : ''} />)}</span>
                <b>{t('str.' + STR[k - 1])}</b><span className="loud__w g-num">+{x.win}</span><span className="loud__l g-num">−{x.lose}</span></button>; })}</div>
              <div className="wsum"><span><small className="g-mono">{t('g.wire.ifRight')}</small><b className="g-num pos">+{o.win}</b></span><span><small className="g-mono">{t('g.wire.ifWrong')}</small><b className="g-num neg">−{o.lose}</b></span></div>
              <GBtn size="lg" kind={yes ? 'green' : ''} sound={null} disabled={busy || !w.online} onClick={() => file(!!correctable)} style={{ marginTop: 14 }}>
                <Icon n="fax" size={22} />{correctable ? t('wire.correct') : t('wire.publish', { s: t('str.' + STR[st - 1]), y: yes ? t('wire.yesS') : t('wire.noS') })}
              </GBtn>
              <p className="wsheet__lock g-mono"><Icon n="lock" size={12} /> {t('wire.lockNote')}</p>
            </>}
          </>}
        <details className="g-more">
          <summary><Icon n="help" size={16} />{t('g.wire.scored')}</summary>
          <p>{t('wire.formula', { c: (yes ? m : 1 - m).toFixed(2) })}</p>
          <p>{t('wire.lead')}</p>
          <p>{t('wire.lockNote')}</p>
        </details>
      </section>
    </div>
  </Sheet>;
}

function FiledCard({ c }: { c: WireCall }) {
  const t = useT();
  const now = c.mNow ?? c.m;
  const v = c.done ? c.pts || 0 : c.paper || 0;
  return <div className="filed3">
    <span className={'g-stamp g-stamp--xl is-slam ' + (c.done ? (c.right ? 'g-stamp--done' : '') : 'g-stamp--wire')}>{c.done ? (c.outcome === 'void' ? t('wire.voidS') : c.right ? t('wire.right') : t('wire.wrong')) : (c.yes ? t('wire.yesS') : t('wire.noS'))}</span>
    <div className="filed3__meta">
      <span className="g-chip">{t('str.' + STR[c.s - 1])}</span>
      <span className="g-mono">{t('g.wire.locked', { m: pct(c.m) })}</span>
      {!c.done && <span className="g-mono">{t('g.wire.now', { m: pct(now) })}</span>}
    </div>
    {!c.done && <HeatLine a={c.m} b={now} yes={c.yes} />}
    <div className="filed3__pnl"><small className="g-mono">{c.done ? t('g.wire.settledPts') : t('g.wire.pnl')}</small><b className={'g-num ' + (v < 0 ? 'neg' : 'pos')}>{c.done ? <Roll v={v} ms={1100} /> : num(round1(v), true)}</b></div>
    {c.done && c.outcome !== 'void' && c.right != null && <WireReply c={c} />}
  </div>;
}

// The mentions under a settled Wire call (TIERONE-SAIF-01): one fan, reacting to what really happened.
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

// ---------- settled since you last looked: stamps slam in one by one, the total rolls up (GOTY §1.6: resolved calls
// feed the byline, so they deserve a moment). Shown until dismissed; each call is shown once (save.stats['ws:'+rid]).
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
    </div>)}</div>
    <GBtn kind={total >= 0 ? 'green' : ''} sound={null} onClick={seen}>{t('common.done')}</GBtn>
  </section>;
}
