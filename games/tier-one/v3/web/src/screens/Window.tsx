// A transfer window: the board, the file, the overnight sheet, Deadline Day and the results. The same screen runs the
// Daily and rooms (server-held) and Practice/Career (local). Layout: look/mockups/challenge.html + deadline.html.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { E, OUTS, shadow, type Act, type Clue, type Post, type Game } from '../lib/engine';
import type { Driver, View } from '../lib/driver';
import { useT, fmtDate } from '../lib/i18n';
import { getSave, update, useSave } from '../lib/save';
import { sfx, buzz } from '../lib/sfx';
import { leanOf, outWord, strWord, postLine, vars } from '../lib/story';
import { onDailyDone, onPracticeDone, onCareerDone, onRoomDone, toast, ymdUTC } from '../lib/meta';
import { applyWindow, totalFavours, type CareerReport } from '../lib/career';
import { Portrait, Route, Stamp, Flag, Btn, Arr, Lines, Sheet, useNow, Crest } from '../ui/bits';
import { Bar } from '../ui/chrome';
import { SagaFile } from './Saga';
import { Results } from './Results';
import type { Chrome } from '../App';

interface Night { day: number; posts: Post[]; twist: View['state']['twist']; noTwist: boolean; dd: boolean }

export function WindowScreen({ driver, ...chrome }: { driver: Driver } & Chrome) {
  const t = useT();
  const sv = useSave();
  const [view, setView] = useState<View | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ i: number; c: Clue } | null>(null);
  const [night, setNight] = useState<Night | null>(null);
  const [report, setReport] = useState<CareerReport | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const recorded = useRef(false);
  const ddLate = useRef(false);
  const deskSel = sel ?? 0;

  const settle = useCallback((v: View) => {
    if (!v.done || !v.result || recorded.current) return;
    recorded.current = true;
    const r = v.result;
    if (v.mode === 'daily') onDailyDone(ymdUTC(), v.no || 0, r, { ddLast15: ddLate.current });
    else if (v.mode === 'room') onRoomDone(r);
    else if (v.mode === 'practice') onPracticeDone(r, !!v.coach);
    else if (v.mode === 'career') {
      const d = driver as Driver & { game?: () => Game };
      const g = d.game ? d.game() : null;
      let rep: CareerReport | null = null;
      update((s) => { if (s.career && g) rep = applyWindow(s.career, g, r, v.cast, s.milestones); });
      if (rep) {
        setReport(rep); onCareerDone(r, (rep as CareerReport).milestoneCredits);
        const cr = (rep as CareerReport);
        cr.leaks.forEach((id) => toast('info', t('career.leakToast', { c: v.cast.flatMap((x) => [x.from, x.to]).find((c) => c.id === id)?.s || id })));
        cr.frozen.forEach((id) => toast('warn', t('career.frozenToast', { c: v.cast.flatMap((x) => [x.from, x.to]).find((c) => c.id === id)?.s || id })));
      }
    }
  }, [driver]);

  const load = useCallback(async () => {
    setErr(null);
    const v = await driver.start();
    if ('error' in v) { setErr(v.error); return; }
    setView(v); settle(v);
    if (v.state.day === v.R.DAYS && !v.ddEndsAt && !v.done) setNight({ day: 7, posts: [], twist: null, noTwist: false, dd: true });
  }, [driver, settle]);
  useEffect(() => { load(); }, [load]);

  const g = useMemo(() => (view ? shadow(view.state, view.R) : null), [view]);

  const act = async (a: Act) => {
    if (busy) return null;
    setBusy(true);
    const out = await driver.act(a);
    setBusy(false);
    if (out.view) { setView(out.view); settle(out.view); }
    if (out.error) toast('warn', t('err.' + out.error) !== 'err.' + out.error ? t('err.' + out.error) : t('err.generic'));
    return out;
  };
  const ask = async (i: number, src: string) => {
    sfx('phone.ring'); buzz(12);
    const out = await act(['a', i, src]);
    if (out && out.answer) setLast({ i, c: out.answer });
  };
  const postCall = async (i: number, o: number, s: number, ut: boolean) => {
    const out = await act(ut ? ['u', i, o, s] : ['c', i, o, s]);
    if (out && !out.error) { sfx((['publish.talks', 'publish.advanced', 'publish.confirmed'] as const)[s]); buzz(s === 2 ? [20, 40, 30] : 18); if (view && view.state.day === view.R.DAYS && view.ddEndsAt && view.ddEndsAt - Date.now() <= 15000) ddLate.current = true; }
  };
  const endDay = async () => {
    if (!view) return;
    setConfirmEnd(false);
    const before = view.state;
    const out = await act(['e']);
    if (!out || out.error) return;
    const st = out.view.state;
    setSel(null); setLast(null);
    if (st.over) return;
    const posts = st.feed.filter((f) => f.day === before.day);
    const twist = st.twist && !before.twist ? st.twist : null;
    if (twist) sfx('twist');
    setNight({ day: st.day, posts, twist, noTwist: st.noTwist && !before.noTwist, dd: st.day === view.R.DAYS });
  };
  const startDD = async () => { setNight(null); const v = await driver.dd(); setView(v); };
  const finish = useCallback(async () => { const v = await driver.finish(); setView(v); settle(v); sfx('dd.whistle'); }, [driver, settle]);

  // ---------- states
  const back = { label: t('nav.front'), to: { n: 'front' as const } };
  const title = view?.mode === 'daily' ? t('common.no', { n: view.no || '' }) : view?.mode === 'room' ? t('rooms.round', { n: (view.room?.round || 0) + 1 }) : view?.mode === 'career' ? t('nav.desk') : t('nav.practice');
  if (err) return <div className="page"><Bar chrome={chrome} back={back} cur="daily" />
    <section className="head"><div className="kicker">{t('nav.daily')}</div><h1 className="hed hed--1">{t('daily.hed')}</h1>
      <p className="dek" style={{ marginTop: 12 }}>{err === 'offline' ? t('err.offline') : t('daily.needNet')}</p>
      <Btn kind="primary" style={{ marginTop: 18 }} onClick={load}>{t('common.retry')} <Arr /></Btn>
      <Btn kind="ghost" style={{ marginTop: 8 }} onClick={() => chrome.go({ n: 'practice' })}>{t('daily.practiceInstead')} <Arr /></Btn></section></div>;
  if (!view || !g) return <div className="page"><Bar chrome={chrome} back={back} cur="daily" /><p className="loading meta">{t('common.loading')}</p></div>;
  if (view.done && view.result) return <Results view={view} chrome={chrome} report={report} />;

  const dd = view.state.day === view.R.DAYS;
  const mob = sel != null;
  const cur = view.mode === 'career' ? 'desk' : view.mode === 'daily' ? 'daily' : 'front';
  const favours = view.mode === 'career' ? <FavourTray g={g} i={deskSel} onUse={(k) => act(['f', k, deskSel])} /> : null;
  const file = <SagaFile view={view} g={g} i={deskSel} busy={busy} last={last} dd={dd} onAsk={(s) => ask(deskSel, s)} onPost={(o, s, ut) => postCall(deskSel, o, s, ut)} favours={favours} />;

  return <div className={'page window' + (dd ? ' is-dd' : '')}>
    {dd ? <DDHead view={view} onZero={finish} /> : <Bar chrome={chrome} back={mob ? { label: t('nav.board'), onClick: () => setSel(null) } : back} end={<span className="meta">{title}</span>} cur={cur} />}
    <div className="cols cols--2 window__cols">
      <main className={mob ? 'only-desk' : ''}>
        {!dd && <section className="head">
          <div className="row row--between"><span className="kicker">{view.mode === 'daily' ? t('daily.kicker', { date: fmtDate(Date.now(), t.lang) }) : view.mode === 'career' ? t('career.ranks.' + (sv.career?.rank || 0)) : view.mode === 'room' ? t('nav.rooms') : t('practice.kicker')}</span><span className="meta">{view.mode === 'daily' ? t('daily.closes') : view.seed ? t('practice.code') + ' ' + view.seed : ''}</span></div>
          <h1 className="hed hed--1">{t('daily.hed')}</h1>
          <WindowStrip day={view.state.day} days={view.R.DAYS} />
          <Budget left={view.state.left} max={view.R.CONTACTS} />
        </section>}
        {dd ? <DDBoard view={view} g={g} busy={busy} onOpen={setSel} onQuick={(i, o) => postCall(i, o, 1, !!g.calls[i])} />
          : <>
            <Flag title={t('daily.board')} aside={t('daily.boardAside')} />
            {view.cast.map((_, i) => <SagaRow key={i} view={view} g={g} i={i} open={i === deskSel} onOpen={() => { setSel(i); setLast((l) => (l && l.i === i ? l : null)); if (window.matchMedia('(max-width: 959.98px)').matches) window.scrollTo(0, 0); }} />)}
            <Btn kind="ghost" style={{ marginTop: 18 }} disabled={busy} onClick={() => (view.state.left > 0 ? setConfirmEnd(true) : endDay())}>{view.state.day === view.R.DAYS - 1 ? t('daily.sleepDD') : t('daily.sleep', { n: view.state.day + 1 })} <Arr /></Btn>
            <p className="note" style={{ marginTop: 10 }}>{view.mode === 'daily' || view.mode === 'room' ? t('daily.fair') : ''}</p>
          </>}
      </main>
      <aside className={'window__file' + (mob ? '' : ' only-desk')}>{file}</aside>
    </div>

    <Sheet open={confirmEnd} onClose={() => setConfirmEnd(false)} label={t('daily.endConfirmOk')}>
      <div className="sheet__body"><h2 className="hed hed--2">{t('daily.endConfirm', { n: view.state.day, c: view.state.left })}</h2><p className="note" style={{ marginTop: 8 }}>{t('daily.contactsNote')}</p>
        <Btn kind="primary" style={{ marginTop: 16 }} onClick={endDay}>{t('daily.endConfirmOk')} <Arr /></Btn><Btn kind="quiet" style={{ marginTop: 6 }} onClick={() => setConfirmEnd(false)}>{t('common.cancel')}</Btn></div>
    </Sheet>
    <Sheet open={!!night} onClose={() => (night && night.dd ? startDD() : setNight(null))} label={t('night.title')}>
      {night && <NightSheet night={night} view={view} onGo={() => (night.dd ? startDD() : setNight(null))} />}
    </Sheet>
  </div>;
}

function WindowStrip({ day, days }: { day: number; days: number }) {
  const t = useT();
  return <div className="window-strip" aria-label={t('common.dayOf', { n: day, m: days })}>
    {Array.from({ length: days }, (_, k) => { const d = k + 1; return <div key={d} className={d < day ? 'past' : d === day ? 'now' : d === days ? 'dd' : ''}><b>{d}</b><span>{d === day ? t('common.today') : d === days ? t('common.dd') : '·'}</span></div>; })}
  </div>;
}
function Budget({ left, max }: { left: number; max: number }) {
  const t = useT();
  const n = Math.max(max, left);
  return <div className="budget">
    <div className="cards" aria-label={t('daily.contactsLeft', { n: left })}>{Array.from({ length: n }, (_, k) => <i key={k} className={k >= left ? 'used' : ''} />)}</div>
    <div><div className="label" style={{ color: 'var(--ink)' }}>{left ? t('daily.contactsLeft', { n: left }) : t('daily.contactsNone')}</div><div className="note">{t('daily.contactsNote')}</div></div>
  </div>;
}
function SagaRow({ view, g, i, open, onOpen }: { view: View; g: Game; i: number; open: boolean; onOpen: () => void }) {
  const t = useT();
  const c = view.cast[i], call = g.calls[i], ln = leanOf(g, i);
  const circ = ln.none ? 0 : E.circlesFor(g, i, ln.o).size;
  const tw = g.twist && g.twist.i === i;
  return <button className={'saga' + (open ? ' is-open' : '')} onClick={onOpen} aria-label={c.player.n}>
    <Portrait club={c.from} no={c.player.no || ''} variant="left" who={c.player.id} />
    <div className="saga__body">
      <div className="saga__n">{c.player.n}</div>
      <div className="saga__m"><Route from={c.from} to={c.to} /><span className="meta">{c.to.s}</span>{tw && <span className="status accent">{t('stamp.twist')}</span>}</div>
      <div className={'meta' + (call ? '' : ln.none ? '' : ' accent')} style={{ marginTop: 4 }}>
        {call ? t('daily.called', { s: strWord(t.lang, call.s), o: outWord(t.lang, call.o) }) : ln.none ? t('daily.noReads') : ln.split ? t('daily.split') + ' · ' + outWord(t.lang, ln.o) + ' / ' + outWord(t.lang, ln.second) : t('daily.lean', { o: outWord(t.lang, ln.o) }) + ' · ' + t('daily.circles', { n: circ })}
      </div>
    </div>
    <span className="saga__end">{call ? <Stamp kind={OUTS[call.o]} size="sm" sound={false}>{outWord(t.lang, call.o)}</Stamp> : <Lines n={circ} max={2} />}</span>
  </button>;
}

function NightSheet({ night, view, onGo }: { night: Night; view: View; onGo: () => void }) {
  const t = useT();
  const g = shadow(view.state, view.R);
  const lost = night.posts.filter((p) => !g.calls[p.i]);
  return <div className="sheet__body night jolt-host">
    <div className="row row--between"><span className="kicker">{t('night.kicker', { n: night.day })}</span><span className="meta">{t('night.title')}</span></div>
    {night.dd ? <>
      <div className="extra-band"><b>{t('dd.band')}</b></div>
      <h2 className="hed hed--2" style={{ marginTop: 12 }}>{t('night.ddBody')}</h2>
    </> : <h2 className="hed hed--2" style={{ marginTop: 8 }}>{night.posts.length ? t('night.title') : t('night.none')}</h2>}
    {night.twist && <div className="twist-banner" style={{ marginTop: 14 }}><Stamp kind="" slam size="lg">{t('night.twist', { p: view.cast[night.twist.i].player.s })}</Stamp><p className="note" style={{ marginTop: 10 }}>{t('night.twistBody')}</p></div>}
    {night.noTwist && <p className="note" style={{ marginTop: 12 }}>{t('night.noTwist')}</p>}
    {night.posts.map((p, k) => { const c = view.cast[p.i]; return <div key={k} className="breaking">
      <span className="breaking__t">{t('common.day', { n: p.day })}</span>
      <div><p className="breaking__h">{postLine(t.lang, c, p)}</p><p className="meta" style={{ marginTop: 6 }}>{t('rival.' + p.id)} · {c.player.n}</p></div>
      <span className="breaking__s"><Stamp kind={OUTS[p.claim]} size="sm" slam={k === 0} sound={k === 0}>{outWord(t.lang, p.claim)}</Stamp></span>
    </div>; })}
    {lost.map((p, k) => <p key={'l' + k} className="note contested">{t('night.contested', { o: outWord(t.lang, p.claim), p: view.cast[p.i].player.s, r: t('rival.' + p.id) })}</p>)}
    <Btn kind={night.dd ? 'accent' : 'primary'} style={{ marginTop: 18 }} onClick={onGo}>{night.dd ? t('night.ddGo') : t('night.back', { n: night.day })} <Arr /></Btn>
  </div>;
}

// ---------- Deadline Day
function DDHead({ view, onZero }: { view: View; onZero: () => void }) {
  const t = useT();
  const now = useNow(100, true);
  const end = view.ddEndsAt || now + view.R.DD_SECONDS * 1000;
  const ms = Math.max(0, end - now), sec = Math.floor(ms / 1000), cs = Math.floor((ms % 1000) / 100);
  const fired = useRef(false), lastTick = useRef(99);
  useEffect(() => {
    if (sec <= 10 && sec !== lastTick.current && ms > 0) { lastTick.current = sec; sfx('dd.tick'); buzz(8); }
    if (ms <= 0 && !fired.current) { fired.current = true; onZero(); }
  }, [sec, ms, onZero]);
  const total = view.R.DD_SECONDS;
  return <div className="dd-head" style={{ ['--ddp' as string]: String(1 - ms / (total * 1000)) }}>
    <div className="extra"><b>{t('dd.band')}</b><span className="meta">{t('dd.posts', { n: view.R.DD_POSTS - view.state.posts7 })}</span></div>
    <section className={'clock' + (sec <= 10 ? ' is-last' : '')} aria-live="polite">
      <div className="clock__l">{t('dd.clockL')}</div>
      <div className="clock__n" role="timer" aria-label={sec + 's'}>0<span className="colon">:</span><span className="s">{String(sec).padStart(2, '0')}</span><span className="cs">.{cs}</span></div>
      <div className="clock__bar"><i style={{ width: (100 * ms) / (total * 1000) + '%' }} /></div>
      <div className="clock__ticks"><span className="meta">{total} s</span><span className="meta">0</span></div>
      <p className="note" style={{ margin: '10px auto 0' }}>{t('dd.note')}</p>
    </section>
  </div>;
}
function DDBoard({ view, g, busy, onOpen, onQuick }: { view: View; g: Game; busy: boolean; onOpen: (i: number) => void; onQuick: (i: number, o: number) => void }) {
  const t = useT();
  const now = useNow(250, true);
  const quick = !!view.ddEndsAt && view.ddEndsAt - now <= view.R.DD_SNAP * 1000;
  return <>
    <Flag tight title={quick ? t('dd.quick') : t('dd.stillOpen')} aside={quick ? t('dd.quickNote') : t('dd.stillAside')} />
    {view.cast.map((c, i) => {
      const call = g.calls[i], ln = leanOf(g, i), cs = E.callState(g, i);
      const canPost = cs === 'ok' && !ln.none;
      const canUt = !!call && E.canUturn(g, i) && !ln.none && ln.o !== call.o;
      return <div key={i} className={'live-call' + (quick && canPost ? ' is-quick' : '')}>
        <button className="live-call__who" onClick={() => onOpen(i)}><Crest club={c.to} size={22} /><span><span className="live-call__n">{c.player.s} → {c.to.s}</span><br /><span className="meta">{call ? t('dd.filed', { s: strWord(t.lang, call.s), o: outWord(t.lang, call.o) }) : ln.none ? t('dd.noLean') : t('daily.lean', { o: outWord(t.lang, ln.o) }) + ' · ' + t('daily.circles', { n: E.circlesFor(g, i, ln.o).size })}</span></span></button>
        {canPost ? <button className={'up-btn' + (quick ? ' up-btn--hot' : '')} disabled={busy} onClick={() => onQuick(i, ln.o)} data-sfx="publish.advanced">{t('dd.postLean', { o: outWord(t.lang, ln.o) })}</button>
          : canUt ? <button className="up-btn" disabled={busy} onClick={() => onQuick(i, ln.o)}>{t('dd.uturn', { o: outWord(t.lang, ln.o) })}</button>
          : call ? <Stamp kind={OUTS[call.o]} size="sm" sound={false}>{outWord(t.lang, call.o)}</Stamp>
          : <button className="up-btn" onClick={() => onOpen(i)}>{t('dd.ring')}</button>}
      </div>;
    })}
  </>;
}

function FavourTray({ g, i, onUse }: { g: Game; i: number; onUse: (k: string) => void }) {
  const t = useT();
  const c = getSave().career;
  if (!c) return null;
  const n = totalFavours(c);
  const use = (k: 'burner' | 'tipoff' | 'stakeout') => { update((s) => { if (s.career && s.career.favours[k] > 0) s.career.favours[k]--; }); onUse(k); };
  const spotter = E.srcOf(g.R, i, 'spotter');
  const opts: { k: 'burner' | 'tipoff' | 'stakeout'; ok: boolean }[] = [
    { k: 'burner', ok: true }, { k: 'tipoff', ok: !(g.tips && i in g.tips) }, { k: 'stakeout', ok: !!spotter && spotter.from > g.day && spotter.from > 1 },
  ];
  return <div className="favours">
    <Flag title={t('career.favours')} aside={t('career.favoursAside', { n })} />
    {opts.map(({ k, ok }) => <div key={k} className="unlock"><span className="unlock__box">{c.favours[k]}</span><div><div className="unlock__t">{t('career.' + k)}</div><div className="unlock__d">{t('career.' + k + 'D')}</div></div>
      <button className="btn btn--quiet" disabled={!ok || c.favours[k] < 1 || g.over} onClick={() => use(k)}>{k === 'burner' ? t('career.use') : t('career.useOn')}</button></div>)}
  </div>;
}
export { vars };
