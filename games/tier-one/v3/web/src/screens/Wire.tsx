// The Wire (DESIGN §4, HYBRID.md): calls on real rumours, priced at the Market, settled by what actually happens.
// 3.1: an evidence wall of rumour cards, a live-calls strip with paper P&L, and a bottom-sheet file with a clear
// "file your call" flow. All the maths and data live in lib/wireData.ts and the server, untouched.
import { useEffect, useState, type CSSProperties } from 'react';
import { useT, num } from '../lib/i18n';
import { useSave, getSave, update } from '../lib/save';
import { v3 } from '../lib/api';
import { useWire, refreshWire, gradeOf, bestTier, stageOf, type Rumour, type WireCall } from '../lib/wireData';
import { clubById, WORLD, WR } from '../lib/engine';
import { onWireFiled, onWireRight, toast } from '../lib/meta';
import { sfx } from '../lib/sfx';
import { Crest } from '../ui/bits';
import { Icon, Kit, GBtn, TopBar } from '../ui/game';
import { HeatMeter } from '../ui/screenbits';
import { rumourHed } from './Front';
import type { Chrome } from '../App';

const round1 = (x: number) => Math.round(x * 10) / 10;
function odds(yes: boolean, s: number, m: number) { const c = yes ? m : 1 - m; return { win: round1(s * (10 * (1 - c) + 2)), lose: round1(s * 10 * c), c }; }
const STR = ['talks', 'advanced', 'confirmed'];
const STAGES = ['interest', 'talks', 'bid', 'agreed'];
const stageKey = (s: string) => (STAGES.includes(s) ? s : 'interest');
const pct = (x: number) => Math.round(x * 100);

export function WireScreen({ rid, ...chrome }: Chrome & { rid?: string }) {
  const t = useT();
  const w = useWire();
  const [sel, setSel] = useState<string | undefined>(rid);
  const [pre, setPre] = useState<boolean | undefined>();
  const rs = w.rumours || [];
  const cur = sel ? rs.find((r) => r.id === sel) : undefined;
  useEffect(() => {
    if (!w.mine) return;
    const fresh = w.mine.calls.filter((c) => c.done && c.right && !getSave().stats['wr:' + c.rid]);
    if (!fresh.length) return;
    update((s) => { for (const c of fresh) s.stats['wr:' + c.rid] = 1; });
    fresh.forEach(() => onWireRight());
  }, [w.mine]);
  const open = (id: string, yes?: boolean) => { sfx('sheet.open'); setPre(yes); setSel(id); };
  const m = w.mine;
  const openCalls = m ? m.calls.filter((c) => !c.done).length : 0;
  const left = Math.max(0, WR.WIRE.DAILY_CALLS - w.callsToday);

  return <div className="g-screen g-screen--wide wire3">
    <TopBar onHelp={() => chrome.go({ n: 'howto' })} onMenu={chrome.openSettings} />
    <div className="stagger g-stack">
      <section className="g-hero g-hero--wire" style={{ ['--i' as string]: 0 }}>
        <span className="g-hero__art" aria-hidden="true"><Icon n="wire" /></span>
        <span className="g-mono g-hero__k"><i className="g-dot" />{t('g.wire.k')}</span>
        <h1 className="g-hero__t">{t('g.wire.hed')}</h1>
        <ol className="wire3__how">{(t.list('g.wire.how') as string[]).map((x, k) => <li key={k}><span className="g-num">{k + 1}</span>{x}</li>)}</ol>
        <div className="kpis3">
          <span><b className="g-num">{m ? num(Math.round(m.cred)) : '–'}</b><small className="g-mono">{t('wire.cred')}</small></span>
          <span><b className="g-num">{m ? pct(m.hitRate) + '%' : '–'}</b><small className="g-mono">{t('wire.hit')}</small></span>
          <span><b className="g-num">{openCalls}</b><small className="g-mono">{t('wire.open')}</small></span>
          <span><b className="g-num">{left}<em>/{WR.WIRE.DAILY_CALLS}</em></b><small className="g-mono">{t('common.today')}</small></span>
        </div>
      </section>

      <LiveCalls onOpen={(id) => open(id)} style={{ ['--i' as string]: 1 }} />

      <div className="g-sec" style={{ ['--i' as string]: 2 }}><h2>{t('g.wire.wall')}</h2><span className="g-mono">{w.asOf ? t('wire.asOfD', { d: w.asOf }) : t('g.wire.wallAside')}</span></div>
      {!w.rumours && <p className="g-empty" style={{ ['--i' as string]: 2 }}>{w.loading ? t('common.loading') : t('wire.needNet')}</p>}
      {w.rumours && !w.online && <p className="g-empty">{t('wire.needNet')}</p>}
      <div className="wall" style={{ ['--i' as string]: 3 }}>
        {rs.map((r, k) => <RumourCard key={r.id} r={r} k={k} onOpen={(yes) => open(r.id, yes)} />)}
      </div>
    </div>
    {cur && <RumourSheet key={cur.id} r={cur} pre={pre} onClose={() => setSel(undefined)} />}
  </div>;
}

// ---------- live calls strip
function LiveCalls({ onOpen, style }: { onOpen: (id: string) => void; style?: CSSProperties }) {
  const t = useT();
  const w = useWire();
  const calls = w.mine?.calls || [];
  const paper = calls.filter((c) => !c.done).reduce((a, c) => a + (c.paper || 0), 0);
  return <section className="live" style={style}>
    <div className="g-sec"><h2>{t('g.wire.live')}</h2>{calls.length > 0 && <span className={'live__pnl' + (paper < 0 ? ' is-neg' : '')}><small className="g-mono">{t('g.wire.pnl')}</small><b className="g-num">{num(round1(paper), true)}</b></span>}</div>
    {calls.length ? <div className="live__row">{calls.map((c) => <CallChip key={c.rid} c={c} onOpen={() => onOpen(c.rid)} />)}</div>
      : <div className="live__empty g-card g-card--desk"><span className="live__ic"><Icon n="target" /></span><span>{t('g.wire.empty')}</span></div>}
  </section>;
}
function CallChip({ c, onOpen }: { c: WireCall; onOpen: () => void }) {
  const t = useT();
  const now = c.mNow ?? c.m;
  const v = c.done ? c.pts || 0 : c.paper || 0;
  return <button className={'cchip' + (c.done ? ' is-done' : '')} onClick={() => { sfx('ui.tap'); onOpen(); }}>
    <span className="cchip__top"><span className={'yn-tag ' + (c.yes ? 'is-yes' : 'is-no')}>{c.yes ? t('wire.yesS') : t('wire.noS')}</span><span className="g-mono">{t('str.' + STR[c.s - 1])}</span></span>
    <b className="cchip__name">{c.player || '—'}</b>
    {c.done ? <span className="cchip__res">{c.outcome === 'void' ? <span className="g-mono">{t('wire.voidS')}</span> : <span className={'g-stamp ' + (c.right ? 'g-stamp--done' : '')} style={{ ['--rot' as string]: '-4deg', fontSize: 14 }}>{c.right ? t('wire.right') : t('wire.wrong')}</span>}</span>
      : <HeatLine a={c.m} b={now} yes={c.yes} />}
    <span className="cchip__foot"><span className="g-mono">{c.done ? t('g.wire.settledPts') : pct(c.m) + '% → ' + pct(now) + '%'}</span><b className={'g-num ' + (v < 0 ? 'neg' : 'pos')}>{num(round1(v), true)}</b></span>
  </button>;
}
function HeatLine({ a, b, yes }: { a: number; b: number; yes: boolean }) {
  const good = yes ? b >= a : b <= a;
  return <svg className="heatline3" viewBox="0 0 120 26" preserveAspectRatio="none" aria-hidden="true"><line x1="2" x2="118" y1={24 - a * 22} y2={24 - a * 22} stroke="currentColor" strokeOpacity=".35" strokeDasharray="3 3" /><path d={`M2 ${24 - a * 22} L116 ${24 - b * 22}`} stroke={good ? 'var(--c-done)' : 'var(--red)'} strokeWidth="2.5" fill="none" strokeLinecap="round" /><circle cx="116" cy={24 - b * 22} r="3.5" fill={good ? 'var(--c-done)' : 'var(--red)'} /></svg>;
}

// ---------- a rumour on the wall
function RumourCard({ r, k, onOpen }: { r: Rumour; k: number; onOpen: (yes?: boolean) => void }) {
  const t = useT();
  const w = useWire();
  const b = w.board[r.id];
  const mine = b?.mine || (w.mine?.calls || []).find((c) => c.rid === r.id) || null;
  const m = b ? b.market : WR.marketOf(r);
  const from = clubById(r.currentClubId);
  const p = WORLD.players.find((x) => x.id === r.playerId);
  const st = stageOf(r);
  const g = gradeOf(bestTier(r));
  const open = !b || b.state === 'open';
  const pv = (mine?.done ? mine.pts : mine?.paper) || 0;
  return <article className={'rum g-card' + (mine ? ' is-called' : '')} style={{ ['--tilt' as string]: [-0.6, 0.5, -0.3, 0.7][k % 4] + 'deg' }}>
    <span className="rum__pin" aria-hidden="true" />
    <button className="rum__head" onClick={() => onOpen()}>
      <span className="rum__kit"><Kit club={from} player={p} size={58} /></span>
      <span className="rum__main">
        <span className="rum__chips"><span className={'stage stage--' + st}>{t('g.wire.stage.' + st)}</span><span className={'grade3 grade3--' + g.toLowerCase()}>{g}</span><span className="g-mono rum__win">{r.window}</span></span>
        <span className="rum__hed">{rumourHed(t, r)}</span>
        <span className="rum__route"><Crest club={from} size={20} /><Icon n={t.rtl ? 'back' : 'arrow'} size={14} />{r.linked.slice(0, 3).map((l, i) => <Crest key={i} club={l.clubId ? clubById(l.clubId) : undefined} size={20} />)}{r.linked.length > 3 && <span className="g-mono">+{r.linked.length - 3}</span>}</span>
      </span>
      <span className="rum__mkt"><b className="g-num">{pct(m)}<small>%</small></b><span className="g-mono">{t('g.wire.market')}</span></span>
    </button>
    <HeatMeter v={r.heat} label={t('g.wire.heat')} />
    {mine ? <button className="rum__mine" onClick={() => onOpen()}>
      <span className={'g-stamp ' + (mine.done ? (mine.right ? 'g-stamp--done' : '') : 'g-stamp--wire')} style={{ ['--rot' as string]: '-5deg' }}>{t('g.wire.you', { s: mine.yes ? t('wire.yesS') : t('wire.noS') })}</span>
      <span className="rum__pnl"><small className="g-mono">{mine.done ? t('g.wire.settledPts') : t('g.wire.pnl')}</small><b className={'g-num ' + (pv < 0 ? 'neg' : 'pos')}>{num(round1(pv), true)}</b></span>
    </button>
      : open ? <div className="rum__file">
        <button className="yn yn--yes" onClick={() => onOpen(true)}><Icon n="check" /><span><b>{t('wire.yesS')}</b><small>{t('g.wire.yesSub')}</small></span></button>
        <button className="yn yn--no" onClick={() => onOpen(false)}><Icon n="x" /><span><b>{t('wire.noS')}</b><small>{t('g.wire.noSub')}</small></span></button>
      </div>
        : <p className="rum__closed g-mono"><Icon n="lock" size={14} />{t('g.wire.closed')}</p>}
  </article>;
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
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    const ov = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ov; };
  }, [onClose]);
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
  return <div className="g-overlay wsheet-wrap" onClick={onClose}>
    <div className="wsheet" role="dialog" aria-modal="true" aria-label={r.playerName} onClick={(e) => e.stopPropagation()}>
      <div className="wsheet__band"><span className="g-mono"><i className="g-dot" />{t('nav.wire')} · {t('wire.window', { w: r.window })}</span>
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
  </div>;
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
    <div className="filed3__pnl"><small className="g-mono">{c.done ? t('g.wire.settledPts') : t('g.wire.pnl')}</small><b className={'g-num ' + (v < 0 ? 'neg' : 'pos')}>{num(round1(v), true)}</b></div>
  </div>;
}
