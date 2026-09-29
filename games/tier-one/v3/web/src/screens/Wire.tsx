// The Wire (DESIGN §4): calls on real rumours, priced at the Market, settled by what actually happens.
import { useEffect, useState } from 'react';
import { useT, num } from '../lib/i18n';
import { useSave, getSave, update } from '../lib/save';
import { v3 } from '../lib/api';
import { useWire, refreshWire, gradeOf, bestTier, type Rumour, type WireCall } from '../lib/wireData';
import { clubById, WORLD, WR } from '../lib/engine';
import { onWireFiled, onWireRight, toast } from '../lib/meta';
import { Bar } from '../ui/chrome';
import { Flag, Heat, Crest, Portrait, Btn, Arr, Stamp } from '../ui/bits';
import { rumourHed } from './Front';
import type { Chrome } from '../App';

const round1 = (x: number) => Math.round(x * 10) / 10;
function odds(yes: boolean, s: number, m: number) { const c = yes ? m : 1 - m; return { win: round1(s * (10 * (1 - c) + 2)), lose: round1(s * 10 * c), c }; }

export function WireScreen({ rid, ...chrome }: Chrome & { rid?: string }) {
  const t = useT();
  const w = useWire();
  const [sel, setSel] = useState<string | undefined>(rid);
  const rs = w.rumours || [];
  const cur = sel ? rs.find((r) => r.id === sel) : undefined;
  useEffect(() => {
    if (!w.mine) return;
    const fresh = w.mine.calls.filter((c) => c.done && c.right && !getSave().stats['wr:' + c.rid]);
    if (!fresh.length) return;
    update((s) => { for (const c of fresh) s.stats['wr:' + c.rid] = 1; });
    fresh.forEach(() => onWireRight());
  }, [w.mine]);

  if (cur) return <div className="page wire"><Bar chrome={chrome} back={{ label: t('wire.back'), onClick: () => setSel(undefined) }} cur="wire" /><RumourFile r={cur} /></div>;
  return <div className="page wire">
    <Bar chrome={chrome} title={t('wire.title')} cur="wire" end={w.mine ? <span className="meta">{t('wire.cred')} <b>{num(Math.round(w.mine.cred))}</b></span> : null} />
    <div className="cols cols--2">
      <main>
        <section className="head"><div className="kicker">{t('wire.kicker')}</div><h1 className="hed hed--1">{t('wire.hed')}</h1>
          {w.asOf && <p className="meta" style={{ marginTop: 10 }}>{t('wire.asOfD', { d: w.asOf })}</p>}</section>
        <Flag title={t('wire.feed')} aside={t('front.heat')} />
        {!w.rumours && <p className="note">{w.loading ? t('common.loading') : t('wire.needNet')}</p>}
        {w.rumours && !w.online && <p className="note">{t('wire.needNet')}</p>}
        <ol>{rs.map((r, k) => {
          const b = w.board[r.id];
          return <li key={r.id} className="item item--wire" role="link" tabIndex={0} onClick={() => { setSel(r.id); window.scrollTo(0, 0); }} onKeyDown={(e) => e.key === 'Enter' && setSel(r.id)}>
            <span className="item__n">{k + 1}</span>
            <div><h3 className="item__hed">{rumourHed(t, r)}</h3>
              <div className="item__meta"><Crest club={clubById(r.currentClubId)} size={18} /><span className={'grade grade--' + gradeOf(bestTier(r)).toLowerCase()}>{gradeOf(bestTier(r))}</span><span className="meta">{t('wire.window', { w: r.window })}{b ? ' · ' + t('wire.market') + ' ' + Math.round(b.market * 100) + '%' : ''}</span>{b && b.mine && <Stamp kind="done" size="sm" flat sound={false}>{b.mine.yes ? t('wire.yesS') : t('wire.noS')}</Stamp>}</div></div>
            <Heat v={r.heat} />
          </li>;
        })}</ol>
      </main>
      <aside>
        <MyCalls onOpen={(id) => { setSel(id); window.scrollTo(0, 0); }} />
      </aside>
    </div>
  </div>;
}

function MyCalls({ onOpen }: { onOpen: (id: string) => void }) {
  const t = useT();
  const w = useWire();
  const m = w.mine;
  return <section>
    <Flag title={t('wire.mine')} aside={m ? t('wire.capDay', { n: w.callsToday, m: WR.WIRE.DAILY_CALLS }) : ''} />
    {m && <div className="kpis">
      <div><span className="label">{t('wire.cred')}</span><span className="cond">{num(Math.round(m.cred))}</span></div>
      <div><span className="label">{t('wire.hit')}</span><span className="cond">{Math.round(m.hitRate * 100)}%</span><span className="meta">{t('wire.resolved', { n: m.resolved })}</span></div>
      <div><span className="label">{t('wire.open')}</span><span className="cond">{m.calls.filter((c) => !c.done).length}</span></div>
    </div>}
    {m && m.calls.length ? m.calls.map((c) => <CallRow key={c.rid} c={c} onOpen={() => onOpen(c.rid)} />) : <p className="note" style={{ marginTop: 10 }}>{t('wire.empty')}</p>}
  </section>;
}
function CallRow({ c, onOpen }: { c: WireCall; onOpen: () => void }) {
  const t = useT();
  const now = c.mNow ?? c.m;
  return <button className="call" onClick={onOpen}>
    <div><div className="call__h">{c.player}</div>
      <div className="meta" style={{ marginTop: 4 }}>{c.yes ? t('wire.yesS') : t('wire.noS')} · {t('str.' + ['talks', 'advanced', 'confirmed'][c.s - 1])} · {t('wire.lockAt', { a: Math.round(c.m * 100), b: Math.round(now * 100) })}</div>
      {!c.done && <HeatLine a={c.m} b={now} yes={c.yes} />}</div>
    <div style={{ textAlign: 'end' }}>{c.done ? <>{c.outcome === 'void' ? <span className="meta">{t('wire.voidS')}</span> : <Stamp kind={c.right ? 'done' : 'dead'} size="sm" sound={false}>{c.right ? t('wire.right') : t('wire.wrong')}</Stamp>}<div className={'call__pts' + ((c.pts || 0) < 0 ? ' accent' : ' win')}>{num(Math.round(c.pts || 0), true)}</div></> : <span className="meta paper">{t('wire.paper', { n: num(Math.round(c.paper || 0), true) })}</span>}</div>
  </button>;
}
function HeatLine({ a, b, yes }: { a: number; b: number; yes: boolean }) {
  const good = yes ? b >= a : b <= a;
  return <svg className="heatline" viewBox="0 0 90 18" width="90" height="18" aria-hidden="true"><line x1="2" x2="88" y1={16 - a * 14} y2={16 - a * 14} stroke="var(--rule-2)" strokeDasharray="2 3" /><path d={`M2 ${16 - a * 14} L88 ${16 - b * 14}`} stroke="currentColor" strokeWidth="1.5" fill="none" /><circle cx="88" cy={16 - b * 14} r="2.6" fill={good ? 'var(--o-done)' : 'var(--accent)'} /></svg>;
}

function RumourFile({ r }: { r: Rumour }) {
  const t = useT();
  const s = useSave();
  const w = useWire();
  const b = w.board[r.id];
  const mine = b?.mine || (w.mine?.calls || []).find((c) => c.rid === r.id) || null;
  const m = b ? b.market : WR.marketOf(r);
  const [yes, setYes] = useState(true);
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
  const file = async (correct: boolean) => {
    setBusy(true);
    const res = await v3<{ call: WireCall }>(correct ? 'wire.correct' : 'wire.file', { dev: s.dev, nick: s.nick, rid: r.id, yes, s: st, club: yes ? club : null, fee: yes ? fee : null });
    setBusy(false);
    if (!res.ok) { const e = t('wire.errors.' + res.error); toast('warn', e.startsWith('wire.') ? t('err.' + (res.error === 'net' ? 'net' : 'generic')) : e); return; }
    onWireFiled(); await refreshWire(true);
  };
  const FEES = WR.WIRE.FEE_BANDS;
  return <div className="cols cols--2">
    <main className="desk-l">
      <div className="top">
        <div className="hero"><Portrait club={from} no={p?.no || ''} variant="wide" who={r.playerId} className="only-mobile" /><Portrait club={from} no={p?.no || ''} who={r.playerId} className="only-desk" /></div>
        <div>
          <div className="who"><span className="kicker">{t('front.heat')} {r.heat}</span><span className="meta" style={{ marginInlineStart: 'auto' }}>{t('wire.window', { w: r.window })}</span></div>
          <h1 className="hed name">{r.playerName}</h1>
          <p className="meta meta--ink dot-sep" style={{ marginTop: 6 }}>{p && <span>{t('pos.' + p.pos)}</span>}{p && p.age > 0 && <span>{p.age}</span>}<span>{r.currentClubName}</span></p>
          <div className="route" style={{ marginTop: 16 }}><Crest club={from} size={34} /><span className="route__arrow" />{r.linked.map((l, k) => <Crest key={k} club={l.clubId ? clubById(l.clubId) : undefined} size={k ? 26 : 34} />)}</div>
          <h2 className="hed hed--3" style={{ marginTop: 14 }}>{rumourHed(t, r)}</h2>
        </div>
      </div>
      {r.fact && t.lang === 'en' && <p className="dek" style={{ marginTop: 16 }}>{r.fact}</p>}
      <section className="read" style={{ marginTop: 22 }}>
        <div className="read__row"><span className="read__k">{t('wire.market')}</span><span className="read__v"><b className="cond" style={{ fontSize: 30 }}>{Math.round(m * 100)}%</b> <span className="meta">{t('wire.formula', { c: (yes ? m : 1 - m).toFixed(2) })}</span></span></div>
        <div className="read__row"><span className="read__k">{t('wire.linkedTo')}</span><span className="read__v">{r.linked.map((l) => l.name + ' (' + l.stage + ')').join(' · ')}</span></div>
        <div className="read__row"><span className="read__k">{t('wire.outlets')}</span><span className="read__v">{r.outlets.map((x, k) => <span key={k} className="outlet"><span className={'grade grade--' + gradeOf(x.tier).toLowerCase()}>{gradeOf(x.tier)}</span> {x.name || ''} {x.date ? <span className="meta">{x.date}</span> : null}</span>)}</span></div>
        <div className="read__row"><span className="read__k">{t('saga.rivals')}</span><span className="read__v">{tot ? t('wire.crowd', { p: Math.round((100 * (mine ? (mine.yes ? split.yes : split.no) : split.yes)) / tot), s: mine ? (mine.yes ? t('wire.yesS') : t('wire.noS')) : t('wire.yesS') }) : t('wire.crowdNone')}</span></div>
        <div className="read__row read__row--next"><span className="read__k">{t('saga.next')}</span><span className="read__v">{t('wire.lead')}</span></div>
      </section>
      {tot > 0 && <div className="consensus" style={{ marginTop: 14 }} aria-label={`YES ${split.yes} NO ${split.no}`}><span className="c1" style={{ flex: Math.max(1, split.yes) }}>{t('wire.yesS')} {Math.round((100 * split.yes) / tot)}%</span><span className="c3" style={{ flex: Math.max(1, split.no) }}>{t('wire.noS')}</span></div>}
    </main>
    <aside><div className="sticky">
      <section className="file">
        <Flag tight title={mine && !correctable ? t('wire.filed', { m: Math.round(mine.m * 100) }) : t('wire.file')} aside={t('wire.capDay', { n: w.callsToday, m: WR.WIRE.DAILY_CALLS })} />
        {mine && !correctable ? <CallRow c={{ ...mine, player: r.playerName }} onOpen={() => {}} /> : !open ? <p className="note">{t('wire.frozen')}</p> : <>
          <div className="field"><div className="label"><span>{t('wire.happens')}</span></div>
            <div className="seg"><button aria-pressed={yes} onClick={() => setYes(true)}>{t('wire.yes')}<small>{Math.round(m * 100)}%</small></button><button aria-pressed={!yes} onClick={() => setYes(false)}>{t('wire.no')}<small>{Math.round((1 - m) * 100)}%</small></button></div></div>
          {yes && <div className="field"><div className="label"><span>{t('wire.where')}</span><span className="meta">{t('wire.whereAside')}</span></div>
            <div className="chips">{r.linked.filter((l) => l.clubId).map((l) => <button key={l.clubId!} className="chip" aria-pressed={club === l.clubId} onClick={() => setClub(club === l.clubId ? null : l.clubId)}><Crest club={clubById(l.clubId!)} size={18} />{l.name}</button>)}<button className="chip" aria-pressed={club === 'other'} onClick={() => setClub(club === 'other' ? null : 'other')}>{t('wire.other')}</button></div></div>}
          {yes && <div className="field"><div className="label"><span>{t('wire.fee')}</span><span className="meta">{t('wire.feeAside')}</span></div>
            <div className="chips">{FEES.map((f) => <button key={f} className="chip" aria-pressed={fee === f} onClick={() => setFee(fee === f ? null : f)}>{t('wire.fees.' + f)}</button>)}</div></div>}
          <div className="field"><div className="label"><span>{t('wire.stake')}</span><span className="meta">{t('saga.strengthAside')}</span></div>
            <div className="pub">{[1, 2, 3].map((k) => { const x = odds(yes, k, m); return <button key={k} aria-pressed={st === k} onClick={() => setSt(k)}><b>{t('str.' + ['talks', 'advanced', 'confirmed'][k - 1])}</b><span className="odds"><span className="w">+{x.win}</span><br /><span className="l">−{x.lose}</span></span></button>; })}</div></div>
          <div className="summary"><div><span className="label">{t('saga.ifRight')}</span><span className="cond win">+{o.win}</span></div><div><span className="label">{t('saga.ifWrong')}</span><span className="cond accent">−{o.lose}</span></div></div>
          <p className="note" style={{ marginTop: 10 }}>{t('wire.lockNote')}</p>
          <Btn kind="primary" style={{ marginTop: 14 }} disabled={busy || !w.online} onClick={() => file(!!correctable)}>{correctable ? t('wire.correct') : t('wire.publish', { s: t('str.' + ['talks', 'advanced', 'confirmed'][st - 1]), y: yes ? t('wire.yesS') : t('wire.noS') })} <Arr /></Btn>
        </>}
      </section>
    </div></aside>
  </div>;
}
