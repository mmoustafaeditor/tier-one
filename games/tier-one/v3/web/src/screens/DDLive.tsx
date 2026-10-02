// Deadline Day Live (GOTY.md §7.1): on the real deadline days, one shared 24 h board of five real sagas for every
// reporter in the game. The room's calls show as counts (never names), the clock runs to 23:00 local, and the global
// table lands after midnight UTC. Reached from the Daily hero (DDLiveBanner), the desk queue and the Window ticker.
import { useEffect, useMemo, useState } from 'react';
import { useT, num, fmtDate } from '../lib/i18n';
import { useSave } from '../lib/save';
import { WORLD, clubById } from '../lib/engine';
import { sfx, buzz } from '../lib/sfx';
import { toast } from '../lib/meta';
import { Icon, GBtn, TopBar, Kit, confetti, shake, CountUp } from '../ui/game';
import { Crest, useNow } from '../ui/bits';
import { Avatar } from '../ui/screenbits';
import { useDDOpenFilm, useDDCloseFilm, useDDTally } from '../ui/live';
import { afterScenes } from '../lib/scenes';
import { ddLiveActive, ddResultsDue, ddNext, ddCountdown, hms, ddStake, ddIsEarly, presence, fetchDDBoard, fetchDDResults, fileDDCall, markDD, DD_OUT, DD_RIGHT, DD_WRONG, type DDBoard, type DDSaga, type DDResults, type DDCall } from '../lib/live';
import { winLabel } from './Wire';
import { usePaged, Pager } from '../ui/fit';
import type { Chrome } from '../App';

const OUT_CLS = ['done', 'hijack', 'off'];
const pct = (x: number) => Math.round(x * 100);

export function DDLiveScreen(chrome: Chrome) {
  const t = useT(); const s = useSave();
  const now = useNow(1000);
  const dd = ddLiveActive(now), res = ddResultsDue(now);
  const day = dd?.day || res?.day;
  const [board, setBoard] = useState<DDBoard | null>(null);
  const [results, setResults] = useState<DDResults | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [here, setHere] = useState<number | null>(null);
  const tally = useDDTally(dd ? day : undefined, 20e3);
  const home = () => chrome.go({ n: 'front' });
  useEffect(() => {
    if (!day) return;
    let on = true;
    fetchDDBoard(day).then((r) => { if (!on) return; if (r.ok) setBoard(r); else setErr(r.error); });
    if (!dd) fetchDDResults(day).then((r) => { if (on && r.ok) { setResults(r); markDD(day, 'resultsSeen'); } });
    return () => { on = false; };
  }, [day, !!dd]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!dd) return;
    let on = true;
    const ping = () => presence().then((r) => { if (on && r.ok) setHere(r.now); });
    ping(); const id = setInterval(ping, 60e3);
    markDD(dd.day, 'seen');
    return () => { on = false; clearInterval(id); };
  }, [dd?.day]); // eslint-disable-line react-hooks/exhaustive-deps
  useDDOpenFilm(day, !!dd && !!board);
  useDDCloseFilm(day, !!results);
  // One screen (owner rule): the five sagas are paged two at a time; the results page likewise.
  const pg = usePaged(board?.sagas || [], 2, day);

  if (!day) {
    const nx = ddNext(now);
    return <div className="g-screen lv-ddscreen fit">
      <TopBar back={{ label: t('g.tabs.home'), onClick: home }} title={t('live.dd.title')} />
      <div className="fit__body">
        <section className="g-hero lv-ddhero is-off">
          <span className="g-hero__art" aria-hidden="true"><Icon n="clock" /></span>
          <span className="g-mono g-hero__k">{t('live.dd.title')}</span>
          <h1 className="g-hero__t">{nx ? t('live.dd.notLive', { d: fmtDate(nx.opensAt + 12 * 3600e3, t.lang, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) }) : t('live.dd.over')}</h1>
          <p className="g-hero__s">{t('live.dd.sub')}</p>
        </section>
        <GBtn kind="dark" onClick={home}><Icon n="home" />{t('live.dd.back')}</GBtn>
      </div>
    </div>;
  }
  const c = dd ? ddCountdown(dd, now) : null;
  const counts = tally?.counts || board?.counts || {};
  const players = tally?.players ?? board?.players ?? 0;
  const mine = board?.mine || {};
  const filed = Object.keys(mine).length;
  const win = board ? winLabel(t, board.window) : '';
  return <div className="g-screen g-screen--wide lv-ddscreen fit">
    <TopBar back={{ label: t('g.tabs.home'), onClick: home }} title={t('live.dd.title')} />
    <div className="fit__body lv-ddscreen__body">
      <section className={'g-hero lv-ddhero' + (dd ? ' is-live' : ' is-res')}>
        <span className="g-hero__art" aria-hidden="true"><Icon n={dd ? 'clock' : 'trophy'} /></span>
        <span className="g-mono g-hero__k">{dd && <span className="lv-live lv-live--lg"><i />{t('live.dd.live')}</span>}{t('live.dd.k', { w: win })}</span>
        <h1 className="g-hero__t">{dd ? t('live.dd.title') : t('live.dd.results')}</h1>
        {c && c.phase !== 'over' && <div className="lv-ddhero__clock"><span className="g-num" role="timer" aria-live="off">{hms(c.ms)}</span><span className="g-mono">{c.phase === 'window' ? t('live.dd.closes') : t('live.dd.boardCloses')}</span></div>}
        <p className="g-hero__s">{t('live.dd.sub')}</p>
        <div className="lv-ddhero__row">
          <span className="lv-chip"><Icon n="eye" size={14} />{here && here > 1 ? t('live.dd.reporters', { n: here }) : players > 1 ? t('live.dd.reporters', { n: players }) : t('live.dd.reportersOne')}</span>
          {dd && <span className="lv-chip"><Icon n="pen" size={14} />{t('live.dd.filed', { n: filed, m: board?.sagas.length || 5 })}</span>}
          {dd && board && ddIsEarly(board.opensAt, now) && <span className="lv-chip lv-chip--gold"><Icon n="bolt" size={14} />{t('live.dd.earlyOn')}</span>}
        </div>
      </section>

      {err && <p className="g-err" role="alert"><Icon n="x" size={16} />{t('live.dd.err.' + err) === 'live.dd.err.' + err ? t('err.generic') : t('live.dd.err.' + err)}</p>}
      {!board && !err && <p className="g-empty">{t('common.loading')}</p>}

      {board && dd && <section className="lv-sagas">
        {pg.rows.map((sg, k) => <SagaCard key={sg.rid} sg={sg} k={k} day={board.day} opensAt={board.opensAt} counts={counts[sg.rid] || [0, 0, 0]} mine={mine[sg.rid] || null} onFiled={(call, cts) => { setBoard((b) => b && { ...b, mine: { ...b.mine, [sg.rid]: call }, counts: { ...b.counts, ...cts } }); }} />)}
      </section>}
      {board && dd && <Pager p={pg} />}

      {results && <ResultsBlock r={results} nick={s.nick} />}

      <details className="g-more g-more--desk"><summary><Icon n="help" size={16} />{t('live.dd.how')}</summary>{(t.list('live.dd.howBody') as string[]).map((x, i) => <p key={i}>{x}</p>)}</details>
      <p className="g-fine g-mono">{t('live.dd.fair')}</p>
    </div>
  </div>;
}

// ---------- one saga on the board
function SagaCard({ sg, k, day, opensAt, counts, mine, onFiled }: { sg: DDSaga; k: number; day: string; opensAt: number; counts: number[]; mine: DDCall | null; onFiled: (c: DDCall, counts: Record<string, number[]>) => void }) {
  const t = useT();
  const p = useMemo(() => WORLD.players.find((x) => x.id === sg.playerId), [sg.playerId]);
  const from = clubById(sg.fromId), to = sg.to.id ? clubById(sg.to.id) : undefined;
  const [o, setO] = useState<number | null>(null);
  const [st, setSt] = useState(2);
  const [busy, setBusy] = useState(false);
  const [redo, setRedo] = useState(false);
  const [slam, setSlam] = useState(0);
  const tot = counts.reduce((a, b) => a + b, 0);
  const stake = ddStake(st, Date.now(), opensAt);
  const file = async () => {
    if (o == null || busy) return;
    setBusy(true);
    const r = await fileDDCall(sg.rid, o, st, day);
    setBusy(false);
    if (!r.ok) { const k2 = 'live.dd.err.' + r.error; toast('warn', t(k2) === k2 ? t('err.generic') : t(k2)); return; }
    sfx(st === 3 ? 'publish.confirmed' : st === 2 ? 'publish.advanced' : 'publish.talks'); setTimeout(() => sfx('stamp.done'), 140); buzz([18, 40, 26]);
    if (st === 3) confetti(['#FF5A36', '#F7B928', '#F4EFE4'], 40);
    setRedo(false); setSlam(Date.now()); onFiled(r.call, r.counts);
  };
  const outLabel = (i: number) => (i === 0 ? t('live.dd.outs.done', { c: sg.to.name }) : t('live.dd.outs.' + DD_OUT[i]));
  return <article className={'lv-saga g-card' + (mine ? ' is-filed' : '')} style={{ ['--i' as string]: k }}>
    <header className="lv-saga__h">
      <Kit club={from} player={p} size={54} />
      <div className="lv-saga__who">
        <b>{sg.player}</b>
        <span className="lv-saga__route"><Crest club={from} size={18} /><span>{sg.from}</span><Icon n={t.rtl ? 'back' : 'arrow'} size={14} /><Crest club={to} size={18} /><span>{sg.to.name}</span><span className={'stage stage--' + sg.to.stage}>{t('g.wire.stage.' + sg.to.stage)}</span></span>
      </div>
      <span className="lv-saga__mkt"><b className="g-num">{pct(sg.market)}<small>%</small></b><span className="g-mono">{t('g.wire.market')}</span></span>
    </header>
    {sg.fact && t.lang === 'en' && <p className="lv-saga__fact">{sg.fact}</p>}
    <div className="lv-tally" role="img" aria-label={t('live.dd.room') + ': ' + DD_OUT.map((x, i) => t('live.dd.outS.' + x) + ' ' + counts[i]).join(', ')}>
      <span className="g-mono lv-tally__k">{t('live.dd.room')}</span>
      {tot ? <div className="lv-tally__bar">{counts.map((n, i) => n > 0 && <span key={i} className={'lv-tally__seg lv-tally__seg--' + OUT_CLS[i]} style={{ flex: n }}>{n / tot >= 0.22 && <b>{t('live.dd.outS.' + DD_OUT[i])}</b>}<span className="g-num">{Math.round((100 * n) / tot)}%</span></span>)}</div>
        : <p className="lv-tally__none">{t('live.dd.roomNone')}</p>}
      {tot > 0 && <span className="g-mono lv-tally__n">{tot}</span>}
      {tot > 0 && <p className="lv-tally__legend g-mono">{counts.map((n, i) => <span key={i} className={'lv-tally__lg--' + OUT_CLS[i]}><i />{t('live.dd.outS.' + DD_OUT[i])} {n}</span>)}</p>}
    </div>
    {mine && !redo ? <div className="lv-filed">
      <span key={slam} className={'g-stamp g-stamp--' + (mine.o === 0 ? 'done' : mine.o === 1 ? 'hijack' : 'off') + (slam ? ' is-slam' : '')}>{t('live.dd.outS.' + DD_OUT[mine.o])}</span>
      <div className="lv-filed__b">
        <b>{outLabel(mine.o)} · {(t.list('live.dd.loud') as string[])[mine.s - 1]}</b>
        <span className="g-mono">{t('live.dd.stake', { w: ddStake(mine.s, mine.utAt || mine.at, opensAt).win, l: ddStake(mine.s).lose })}{mine.ut ? ' · ' + t('live.dd.locked') : ''}</span>
      </div>
      {!mine.ut && <button className="lv-link" onClick={() => { sfx('ui.tap'); setO(mine.o); setSt(mine.s); setRedo(true); }}><Icon n="uturn" size={14} />{t('live.dd.ut')}</button>}
    </div> : <div className="lv-call">
      <div className="lv-call__outs" role="group">
        {DD_OUT.map((_, i) => <button key={i} className={'lv-oc lv-oc--' + OUT_CLS[i]} aria-pressed={o === i} onClick={() => { sfx('ui.tap'); setO(i); }}>{outLabel(i)}</button>)}
      </div>
      {o != null && <div className="lv-call__loud" role="group">
        {[1, 2, 3].map((n) => { const x = ddStake(n, Date.now(), opensAt); return <button key={n} className="lv-loud" aria-pressed={st === n} onClick={() => { sfx('ui.tap'); setSt(n); }}>
          <span className="lv-loud__bars" aria-hidden="true">{[1, 2, 3].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}</span>
          <b>{(t.list('live.dd.loud') as string[])[n - 1]}</b><span className="g-num pos">+{x.win}</span><span className="g-num neg">−{x.lose}</span>
        </button>; })}
      </div>}
      {o != null && <div className="lv-call__go">
        <span className="g-mono">{t('live.dd.stake', { w: stake.win, l: stake.lose })}{stake.early ? ' · ' + t('live.dd.early') : ''}</span>
        <GBtn size="sm" kind={o === 0 ? 'green' : ''} sound={null} disabled={busy} onClick={file}><Icon n="fax" size={18} />{redo ? t('live.dd.ut') : t('live.dd.file')}</GBtn>
      </div>}
    </div>}
  </article>;
}

// ---------- results: each saga's real outcome, my points, the global table
function ResultsBlock({ r, nick }: { r: DDResults; nick: string }) {
  const t = useT();
  const mineCalls = r.me?.calls || {};
  const [rootShake, setRootShake] = useState<HTMLElement | null>(null);
  const tbl = usePaged(r.rows.slice(0, 15), 5, r.day);
  // The verdict lands after the close film (afterScenes): fanfare and confetti for a plus, a shake for a minus.
  useEffect(() => { afterScenes(() => { if (r.me && r.me.pts > 0) { sfx('fanfare'); confetti(); } else if (r.me && r.me.pts < 0) { sfx('sad'); shake(rootShake); } }); }, [r.day]); // eslint-disable-line react-hooks/exhaustive-deps
  return <section className="lv-res" ref={setRootShake}>
    <div className="g-sec"><h2>{t('live.dd.results')}</h2><span className="g-mono">{r.final ? t('live.dd.resultsFinal') : t('live.dd.resultsSub', { s: r.settled, n: r.sagas.length })}</span></div>
    <div className="lv-res__sagas">
      {r.sagas.map((sg) => {
        const c = mineCalls[sg.rid], from = clubById(sg.fromId);
        const p = WORLD.players.find((x) => x.id === sg.playerId);
        const right = c && sg.out != null && c.o === sg.out;
        const pts = c && sg.out != null ? (right ? Math.round(DD_RIGHT[c.s - 1] * (((c.utAt || c.at) < r.opensAt + 12 * 3600e3) ? 1.25 : 1)) : -DD_WRONG[c.s - 1]) : null;
        return <div key={sg.rid} className={'lv-rrow' + (c ? (sg.out == null ? ' is-pending' : right ? ' is-right' : ' is-wrong') : ' is-none')}>
          <Kit club={from} player={p} size={40} />
          <div className="lv-rrow__b"><b>{sg.player}</b><span className="g-mono">{sg.out == null ? t('live.dd.pending') : sg.out === 0 ? t('live.dd.outD.done', { c: sg.to.name }) : sg.out === 1 ? t('live.dd.outD.hijack') : t('live.dd.outD.stays', { c: sg.from })}{c ? ' · ' + t('g.wire.you', { s: t('live.dd.outS.' + DD_OUT[c.o]) }) : ''}</span></div>
          <span className={'g-stamp' + (sg.out == null ? ' lv-rrow__pend' : ' is-slam g-stamp--' + OUT_CLS[sg.out])}>{sg.out == null ? t('live.dd.pending') : t('live.dd.outS.' + DD_OUT[sg.out])}</span>
          <b className={'g-num lv-rrow__pts' + (pts != null && pts < 0 ? ' neg' : pts ? ' pos' : '')}>{pts == null ? '·' : num(pts, true)}</b>
        </div>;
      })}
    </div>
    <div className="g-sec"><h2>{t('live.dd.table')}</h2><span className="g-mono">{r.me ? t('live.dd.you', { r: r.me.rank, n: r.players, p: num(r.me.pts) }) : t('live.dd.youNone')}</span></div>
    {r.rows.length ? <div className="ltable g-card lv-table">
      <div className="ltable__h g-mono"><span>#</span><span>{t('league.reporter')}</span><span>{t('career.right')}</span><span>{t('league.pts')}</span></div>
      {tbl.rows.map((row, j) => { const k = tbl.page * 5 + j; return <div key={k} className={'lrow' + (row.me ? ' is-me' : '') + (k === 0 ? ' is-top' : '')}>
        <span className="lrow__n g-num">{k === 0 ? <Icon n="crown" size={18} /> : k + 1}</span>
        <span className="lrow__who"><Avatar name={row.me ? nick || row.nick : row.nick} size={28} me={row.me} /><b>{row.me ? t('common.you') : row.nick}</b></span>
        <span className="lrow__x">{row.right}/{row.n}</span><b className={'lrow__p g-num' + (row.pts < 0 ? ' neg' : '')}>{row.me ? <CountUp to={row.pts} ms={900} sign /> : num(row.pts, true)}</b>
      </div>; })}
      <Pager p={tbl} />
    </div> : <p className="g-empty">{t('live.dd.tableEmpty')}</p>}
  </section>;
}
