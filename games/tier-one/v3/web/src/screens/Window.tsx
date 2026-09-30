// A transfer window: the board, the file, the overnight sheet, Deadline Day and the results. The same screen runs the
// Daily and rooms (server-held) and Practice/Career (local). Layout: look/mockups/challenge.html + deadline.html.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { E, OUTS, shadow, type Act, type Call, type Clue, type Post, type Game } from '../lib/engine';
import type { Driver, View } from '../lib/driver';
import { useT, fmtDate } from '../lib/i18n';
import { getSave, update, useSave } from '../lib/save';
import { sfx, buzz } from '../lib/sfx';
import { leanOf, outWord, strWord, postLine, vars } from '../lib/story';
import { Icon, Kit, GBtn, TopBar, shake } from '../ui/game';
import { CallScene } from '../ui/CallScene';
import { PostScene } from '../ui/PostScene';
import { onDailyDone, onPracticeDone, onCareerDone, onRoomDone, toast, ymdUTC } from '../lib/meta';
import { applyWindow, totalFavours, type CareerReport } from '../lib/career';
import { storyBeats, pushBeats, type Beat } from '../lib/storyMode';
import { Sheet, useNow, Crest } from '../ui/bits';
import { SagaFile, RIVAL_IC, type RivalRecord } from './Saga';
import { hereWeGo } from '../lib/share';
import { Results } from './Results';
import { playScene, afterScenes, firstToday } from '../lib/scenes';
import type { Chrome } from '../App';
// The editor's desk (GOTY.md §7.1): the Daily brief before day 1 and the Deadline Day Live ticker (ui/live.tsx).
import { DailyBriefSheet, DDLiveTicker } from '../ui/live';

// The rival ledger (GOTY.md §1.3) lives in the connect lane's lib/byline.ts. Picked up here if that module exists and
// exports rivalRecord(id); otherwise the race strip and overnight taunts simply run without it.
const BYLINE = Object.values(import.meta.glob('../lib/byline.ts', { eager: true })) as { rivalRecord?: (id: string) => unknown }[];
export function rivalRecordOf(id: string): RivalRecord | null {
  const f = BYLINE[0]?.rivalRecord; if (typeof f !== 'function') return null;
  try { const r = f(id) as Partial<RivalRecord> | null | undefined; return r && typeof r.w === 'number' && typeof r.l === 'number' ? { w: r.w, l: r.l, d: r.d || 0 } : null; } catch { return null; }
}
const hasRecords = () => typeof BYLINE[0]?.rivalRecord === 'function';

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
  const [beat, setBeat] = useState<Beat | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [calling, setCalling] = useState<{ i: number; c: Clue } | null>(null);
  const [burst, setBurst] = useState<{ k: number; kind: number; hwg: boolean } | null>(null);
  const [filedAt, setFiledAt] = useState<Record<number, number>>({});
  const [posting, setPosting] = useState<{ i: number; o: number; s: number; ut: boolean; k: number; prev: Call | null; hwg: boolean } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const startRef = useRef({ pp: getSave().pp, credits: getSave().credits, streak: getSave().streak.n });
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
      let added: Beat[] = [];
      update((s) => { if (s.career && g) { rep = applyWindow(s.career, g, r, v.cast, s.milestones); added = pushBeats(s, storyBeats(s.career, { ...r, cast: r.cast && r.cast.length ? r.cast : v.cast }, rep)); } });
      if (added[0]) setBeat(added[0]);
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
    buzz(12);
    const out = await act(['a', i, src]);
    if (out && out.answer) { setLast({ i, c: out.answer }); setCalling({ i, c: out.answer }); }
  };
  const postCall = async (i: number, o: number, s: number, ut: boolean) => {
    const prev = g && g.calls[i] ? { ...g.calls[i]! } : null;
    const out = await act(ut ? ['u', i, o, s] : ['c', i, o, s]);
    if (out && !out.error) {
      const late = view && view.state.day === view.R.DAYS;
      if (late) {
        // Deadline Day: the clock is running, so the quick burst instead of the full post.
        const hwg = hereWeGo({ o, s });
        sfx(hwg ? 'publish.hwg' : (['publish.talks', 'publish.advanced', 'publish.confirmed'] as const)[s]); setTimeout(() => sfx('stamp.done'), 120); buzz(s === 2 ? [20, 40, 30] : 18);
        setFiledAt((f) => ({ ...f, [i]: Date.now() })); setBurst({ k: Date.now(), kind: s, hwg }); setTimeout(() => setBurst(null), 1700); shake(rootRef.current);
      } else setPosting({ i, o, s, ut, k: Date.now(), prev, hwg: hereWeGo({ o, s }) });
      if (view && view.state.day === view.R.DAYS && view.ddEndsAt && view.ddEndsAt - Date.now() <= 15000) ddLate.current = true;
    }
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
    setNight({ day: st.day, posts, twist, noTwist: st.noTwist && !before.noTwist, dd: st.day === view.R.DAYS });
  };
  // Deadline Day opens with its film (full once a day, the short cut after); the clock only starts once it ends.
  const startDD = () => { setNight(null); playScene(firstToday('deadline') ? 'deadline' : 'deadline-short'); afterScenes(async () => { const v = await driver.dd(); setView(v); }); };
  const finish = useCallback(async () => { const v = await driver.finish(); setView(v); settle(v); sfx('dd.whistle'); }, [driver, settle]);

  // ---------- states
  const home = () => chrome.go(view?.mode === 'career' ? { n: 'story' } : view?.mode === 'practice' ? { n: 'practice' } : view?.mode === 'room' ? { n: 'rooms' } : { n: 'front' });
  const title = view?.mode === 'daily' ? t('g.win.daily', { n: view.no || '' }) : view?.mode === 'room' ? t('rooms.round', { n: (view.room?.round || 0) + 1 }) : view?.mode === 'career' ? t('g.tabs.story') : t('nav.practice');
  if (err) return <div className="g-screen play"><TopBar back={{ label: t('g.tabs.home'), onClick: home }} />
    <div className="g-card" style={{ marginTop: 20 }}><h1 className="g-h1">{t('g.win.offlineH')}</h1>
      <p className="g-sub" style={{ marginTop: 10 }}>{err === 'offline' ? t('err.offline') : t('daily.needNet')}</p>
      <GBtn style={{ marginTop: 18 }} onClick={load}><Icon n="phone" />{t('common.retry')}</GBtn>
      <GBtn kind="paper" style={{ marginTop: 12 }} onClick={() => chrome.go({ n: 'practice' })}>{t('daily.practiceInstead')}</GBtn></div></div>;
  if (!view || !g) return <div className="g-screen play"><TopBar back={{ label: t('g.tabs.home'), onClick: home }} /><div className="loading-press"><span /><p className="g-mono">{t('common.loading')}</p></div></div>;
  if (view.done && view.result) return <Results view={view} chrome={chrome} report={report} start={startRef.current} beat={beat} />;

  const dd = view.state.day === view.R.DAYS;
  const mob = sel != null;
  const tutor = view.mode === 'practice' && view.label === 'tutorial' && !(sv.tut && sv.tut.done);
  const favours = view.mode === 'career' ? <FavourTray g={g} i={deskSel} onUse={(k) => act(['f', k, deskSel])} /> : null;
  const file = <SagaFile view={view} g={g} i={deskSel} busy={busy || !!posting} onLater={() => { if (window.matchMedia('(max-width: 959.98px)').matches) { setSel(null); window.scrollTo(0, 0); } }} last={calling ? null : last} dd={dd} onAsk={(src) => ask(deskSel, src)} onPost={(o, s, ut) => postCall(deskSel, o, s, ut)} favours={favours} justFiled={filedAt[deskSel]} rivalRecord={hasRecords() ? rivalRecordOf : undefined} />;

  return <div className={'g-screen g-screen--wide play' + (dd ? ' is-dd' : '')} ref={rootRef}>
    <TopBar back={mob ? { label: t('g.win.board'), onClick: () => setSel(null) } : { label: t('g.tabs.home'), onClick: home }} title={mob ? undefined : title} />
    {dd && <DDHead view={view} onZero={finish} />}
    <div className="play__cols">
      <main className={mob ? 'only-desk' : ''}>
        {view.mode === 'daily' && !dd && <DDLiveTicker go={chrome.go} />}
        {!dd && <section className="dayhead">
          <DayStrip day={view.state.day} days={view.R.DAYS} />
          <div className="dayhead__row">
            <div><div className="g-mono dayhead__k">{view.mode === 'daily' ? t('g.win.dailyK', { date: fmtDate(Date.now(), t.lang) }) : view.mode === 'career' ? t('career.ranks.' + (sv.career?.rank || 0)) : view.mode === 'room' ? t('nav.rooms') : t('practice.kicker')}</div>
              <h1 className="g-h2 dayhead__h">{t('g.win.dayH', { n: view.state.day })}</h1></div>
            <Phones left={view.state.left} max={view.R.CONTACTS} />
          </div>
        </section>}
        {dd ? <DDBoard view={view} g={g} busy={busy} onOpen={setSel} onQuick={(i, o) => postCall(i, o, 1, !!g.calls[i])} />
          : <>
            <div className="sagas stagger">
              {view.cast.map((_, i) => <SagaCard key={i} view={view} g={g} i={i} hint={tutor && sel == null && i === 0} open={i === deskSel} filed={filedAt[i]} onOpen={() => { sfx('page.turn'); setSel(i); setLast((l) => (l && l.i === i ? l : null)); if (window.matchMedia('(max-width: 959.98px)').matches) window.scrollTo(0, 0); }} />)}
            </div>
            <GBtn kind="dark" size="lg" style={{ marginTop: 18 }} disabled={busy} sound="whoosh" onClick={() => (view.state.left > 0 ? setConfirmEnd(true) : endDay())}><Icon n="moon" size={22} />{view.state.day === view.R.DAYS - 1 ? t('daily.sleepDD') : t('g.win.sleep', { n: view.state.day + 1 })}</GBtn>
            {(view.mode === 'daily' || view.mode === 'room') && <p className="play__fair g-mono">{t('daily.fair')}</p>}
          </>}
      </main>
      <aside className={'play__file' + (mob ? '' : ' only-desk')}>{file}</aside>
    </div>

    {tutor && !calling && !night && <TutorCoach g={g} sel={sel} onDone={() => update((x) => { x.tut = { ...(x.tut || {}), done: true }; })} />}
    {calling && view.cast[calling.i] && createPortal(<CallScene src={calling.c.src} clue={calling.c} c={view.cast[calling.i]} R={view.R} mode={view.mode} onDone={() => setCalling(null)} />, document.body)}
    {burst && createPortal(<Burst key={burst.k} kind={burst.kind} hwg={burst.hwg} />, document.body)}
    {posting && view.cast[posting.i] && createPortal(<PostScene key={posting.k} c={view.cast[posting.i]} o={posting.o} s={posting.s} ut={posting.ut} prev={posting.prev} onDone={() => { const p = posting; setPosting(null); setFiledAt((f) => ({ ...f, [p.i]: Date.now() })); shake(rootRef.current); }} />, document.body)}

    <Sheet open={confirmEnd} onClose={() => setConfirmEnd(false)} label={t('daily.endConfirmOk')}>
      <div className="sheet__body"><h2 className="g-h2">{t('daily.endConfirm', { n: view.state.day, c: view.state.left })}</h2><p className="g-sub" style={{ marginTop: 8 }}>{t('daily.contactsNote')}</p>
        <GBtn kind="dark" style={{ marginTop: 16 }} onClick={endDay}><Icon n="moon" />{t('daily.endConfirmOk')}</GBtn><GBtn kind="paper" style={{ marginTop: 12 }} onClick={() => setConfirmEnd(false)}>{t('common.cancel')}</GBtn></div>
    </Sheet>
    {night && createPortal(<NightScene night={night} view={view} onGo={() => (night.dd ? startDD() : setNight(null))} />, document.body)}
    {view.mode === 'daily' && !night && !calling && <DailyBriefSheet view={view} go={chrome.go} />}
  </div>;
}

function DayStrip({ day, days }: { day: number; days: number }) {
  const t = useT();
  return <div className="daystrip" aria-label={t('common.dayOf', { n: day, m: days })}>
    {Array.from({ length: days }, (_, k) => { const d = k + 1; return <span key={d} className={(d < day ? 'past' : d === day ? 'now' : '') + (d === days ? ' dd' : '')}><i>{d < day ? <Icon n="check" /> : d === days ? <Icon n="clock" /> : d}</i></span>; })}
  </div>;
}
function Phones({ left, max }: { left: number; max: number }) {
  const t = useT();
  const n = Math.max(max, left);
  return <div className="phones-box" aria-label={t('daily.contactsLeft', { n: left })}>
    <div className="phones-box__i">{Array.from({ length: n }, (_, k) => <i key={k} className={k < left ? 'on' : ''}><Icon n="phone" /></i>)}</div>
    <span className="g-mono">{left ? t('g.win.callsLeft', { n: left }) : t('g.win.noCalls')}</span>
  </div>;
}
function SagaCard({ view, g, i, open, onOpen, filed, hint }: { view: View; g: Game; i: number; open: boolean; onOpen: () => void; filed?: number; hint?: boolean }) {
  const t = useT();
  const c = view.cast[i], call = g.calls[i], ln = leanOf(g, i);
  const circ = ln.none ? 0 : E.circlesFor(g, i, ln.o).size;
  const tw = g.twist && g.twist.i === i;
  const posted = E.livePosts(g, i).length;
  return <button className={'scard' + (open ? ' is-open' : '') + (call ? ' is-called' : '') + (hint ? ' is-hint' : '')} style={{ ['--i' as string]: i }} onClick={onOpen} aria-label={c.player.n}>
    <Kit club={c.from} player={c.player} size={58} />
    <span className="scard__b">
      <span className="scard__n">{c.player.n}</span>
      <span className="scard__r"><Crest club={c.from} size={18} /><Icon n={t.rtl ? 'back' : 'arrow'} size={14} /><Crest club={c.to} size={18} /><span>{c.to.s}</span></span>
      <span className="scard__st">
        {tw && <span key="tw" className="g-chip g-chip--red chip-in">{t('stamp.twist')}</span>}
        {!call && (ln.none ? <span className="g-chip">{t('g.win.notRung')}</span> : <span key={'ln' + ln.o + (ln.split ? 's' : '') + circ} className={'g-chip chip-in g-chip--' + OUTS[ln.o]}>{ln.split ? t('daily.split') : t('daily.lean', { o: outWord(t.lang, ln.o) })}{circ >= 2 ? ' ✓✓' : ''}</span>)}
        {posted > 0 && !call && <span key={'rv' + posted} className="g-chip scard__riv chip-in"><Icon n="bolt" />{t('g.win.rivalPosted', { n: posted })}</span>}
      </span>
    </span>
    <span className="scard__end">{call ? <span key={filed || 0} className={'g-stamp g-stamp--' + (hereWeGo(call) ? 'gold scard__hwg' : OUTS[call.o]) + (filed ? ' is-slam' : '')}>{hereWeGo(call) ? t('calls.hwg.stamp') : outWord(t.lang, call.o)}</span> : <Icon n={t.rtl ? 'back' : 'arrow'} size={22} />}</span>
  </button>;
}

// The guided first saga (HYBRID.md §9): one step at a time, read from the live state.
function TutorCoach({ g, sel, onDone }: { g: Game; sel: number | null; onDone: () => void }) {
  const t = useT();
  const i = sel ?? 0;
  const reads = E.curReads(g, i).length, call = g.calls[i], ln = leanOf(g, i);
  const step = call || g.calls.some(Boolean) ? 'sleep' : sel == null ? 'open' : !reads ? 'ring' : ln.none || (E.circlesFor(g, i, ln.o).size < 2 && g.left > 0 && reads < 2) ? 'second' : 'call';
  const n = ['open', 'ring', 'second', 'call', 'sleep'].indexOf(step) + 1;
  useEffect(() => { sfx('ui.pop'); const id = setTimeout(() => document.querySelector(step === 'call' ? '.callbox' : '.is-hint')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350); return () => clearTimeout(id); }, [step]);
  return <div className="tutor" role="status" key={step}>
    <span className="tutor__n">{n}/5</span>
    <div className="tutor__b"><b>{t('g.tut.' + step)}</b><p>{t('g.tut.' + step + 'P')}</p></div>
    {step === 'sleep' ? <button className="tutor__ok" onClick={onDone}>{t('g.tut.gotIt')}</button> : <button className="tutor__skip" onClick={onDone}>{t('g.tut.skip')}</button>}
  </div>;
}

// A publish goes out: reactions float up off the page.
function Burst({ kind, hwg }: { kind: number; hwg?: boolean }) {
  const t = useT();
  const bits = ['share', 'flame', 'eye', 'share', 'star', 'flame', 'eye', 'bolt', 'share', 'flame'];
  return <div className={'burst' + (hwg ? ' is-hwg' : '')} aria-hidden="true">
    <span className="burst__word">{hwg ? t('calls.hwg.burst') : t('g.win.published.' + kind)}</span>
    {bits.map((b, k) => <i key={k} style={{ left: 10 + (k * 83) % 80 + '%', animationDelay: k * 70 + 'ms' }}><Icon n={b} /></i>)}
  </div>;
}

// Overnight (GOTY.md §2): dusk to dawn, then each rival post lands as a BREAKING card with the rival's avatar and a
// taunt that fits your call (and the ledger when the connect lane provides one). A twist glitches the screen and slams
// STOP PRESS. ~2 s at most; a tap skips straight to the end state; reduced motion shows it static.
const NIGHT_SKY = 700, NIGHT_STEP = 140, NIGHT_TWIST = 450;
function tauntFor(t: ReturnType<typeof useT>, g: Game, p: Post): string {
  const mine = g.calls[p.i], rec = rivalRecordOf(p.id);
  let mood = !mine ? 'beat' : mine.o === p.claim ? 'copy' : 'clash';
  if (mood === 'beat' && rec && rec.l > rec.w + 1) mood = 'ahead';
  const l = (t.list('calls.night.' + mood) as string[] | undefined) || [];
  return l.length ? l[(p.i * 7 + p.day * 3 + p.id.length) % l.length] : '';
}
function NightScene({ night, view, onGo }: { night: Night; view: View; onGo: () => void }) {
  const t = useT();
  const g = shadow(view.state, view.R);
  const reduced = getSave().reduced;
  const [stage, setStage] = useState(reduced ? 2 : 0);
  const [skip, setSkip] = useState(reduced);
  const lead = night.twist ? NIGHT_TWIST : 0;
  const cardsMs = Math.min(night.posts.length * NIGHT_STEP, 700);
  useEffect(() => {
    if (stage >= 2) return;
    if (stage === 0) {
      const id = setTimeout(() => {
        setStage(1);
        if (night.twist) { sfx('stop.press'); buzz([40, 30, 80]); } else sfx(night.dd ? 'dd.siren' : 'dayhit');
      }, NIGHT_SKY);
      return () => clearTimeout(id);
    }
    const pops = night.posts.slice(0, 5).map((_, k) => setTimeout(() => sfx('ui.pop'), lead + k * NIGHT_STEP + 120));
    const id = setTimeout(() => setStage(2), lead + cardsMs + 250);
    return () => { clearTimeout(id); pops.forEach(clearTimeout); };
  }, [stage]);
  const skipAll = () => { if (stage < 2) { setSkip(true); setStage(2); } };
  return <div className={'night2' + (night.dd ? ' is-dd' : '') + (night.twist ? ' is-twist' : '') + (night.twist && stage === 1 && !skip ? ' is-glitch' : '') + (skip ? ' is-skip' : '') + ' st-' + stage} role="dialog" aria-modal="true" aria-label={t('night.title')} onClick={skipAll}>
    <div className="night2__sky" aria-hidden="true"><span className="night2__moon" /><span className="night2__sun" />{Array.from({ length: 24 }, (_, k) => <i key={k} className="night2__star" style={{ left: (k * 41) % 100 + '%', top: (k * 23) % 60 + '%', animationDelay: k * 90 + 'ms' }} />)}<span className="night2__city" /></div>
    <div className="night2__body">
      <div className="g-mono night2__k">{t('night.kicker', { n: night.day })}</div>
      <h2 className="night2__h">{night.dd ? t('g.win.ddIncoming') : night.posts.length ? t('g.win.overnight', { n: night.posts.length }) : t('night.none')}</h2>
      {stage >= 1 && night.twist && <div className="twistcard"><span className={'g-stamp g-stamp--xl' + (skip ? '' : ' is-slam')} style={{ ['--sc' as string]: '#fff' }}>{t('g.saga.stopPress')}</span><b>{t('night.twist', { p: view.cast[night.twist.i].player.s })}</b><p>{t('night.twistBody')}</p></div>}
      {stage >= 1 && night.dd && <p className="night2__dd">{t('night.ddBody')}</p>}
      {stage >= 1 && night.posts.length > 0 && <div className="breaks">{night.posts.map((p, k) => { const c = view.cast[p.i]; const tn = tauntFor(t, g, p); return <div key={k} className="brk" style={{ animationDelay: skip ? '0ms' : lead + Math.min(k, 5) * NIGHT_STEP + 'ms' }}>
        <span className={'rv-av rv-av--' + p.id}>{RIVAL_IC[p.id]}</span>
        <div className="brk__b">
          <div className="brk__h"><span className="brk__tag">{t('calls.night.breaking')}</span><b>{t('rival.' + p.id)}</b><span className={'g-chip g-chip--' + OUTS[p.claim]}>{outWord(t.lang, p.claim)}</span></div>
          <p>{postLine(t.lang, c, p)}</p>
          {tn && <p className="brk__taunt">“{tn}”</p>}
          <span className="g-mono">{c.player.n}</span>
        </div>
      </div>; })}</div>}
      {stage >= 2 && <GBtn kind={night.dd ? '' : 'gold'} size="lg" pulse onClick={onGo} sound={night.dd ? 'dd.siren' : 'open'} style={{ marginTop: 18 }}><Icon n={night.dd ? 'clock' : 'phone'} />{night.dd ? t('night.ddGo') : t('g.win.nightGo', { n: night.day })}</GBtn>}
      {stage < 2 && <p className="night2__skip g-mono">{t('calls.night.skip')}</p>}
    </div>
  </div>;
}

// ---------- Deadline Day: a red takeover, a heartbeat, one-tap posts.
function DDHead({ view, onZero }: { view: View; onZero: () => void }) {
  const t = useT();
  const now = useNow(100, true);
  const end = view.ddEndsAt || now + view.R.DD_SECONDS * 1000;
  const ms = Math.max(0, end - now), sec = Math.floor(ms / 1000), cs = Math.floor((ms % 1000) / 100);
  const fired = useRef(false), lastTick = useRef(99);
  useEffect(() => {
    if (sec !== lastTick.current && ms > 0) {
      lastTick.current = sec;
      if (sec <= 10) { sfx('dd.tick'); buzz(8); } else if (sec <= 30) sfx('dd.heart');
    }
    if (ms <= 0 && !fired.current) { fired.current = true; onZero(); }
  }, [sec, ms, onZero]);
  const total = view.R.DD_SECONDS;
  return <div className={'ddh' + (sec <= 10 ? ' is-last' : sec <= 30 ? ' is-hot' : '')} style={{ ['--ddp' as string]: String(1 - ms / (total * 1000)) }}>
    <div className="ddh__band"><b>{t('dd.band')}</b><span>{t('dd.posts', { n: view.R.DD_POSTS - view.state.posts7 })}</span></div>
    <div className="ddh__clock" role="timer" aria-live="off" aria-label={sec + 's'}><span className="ddh__s">{String(sec).padStart(2, '0')}</span><span className="ddh__cs">.{cs}</span></div>
    <div className="ddh__bar"><i style={{ width: (100 * ms) / (total * 1000) + '%' }} /></div>
    <p className="ddh__note">{t('dd.note')}</p>
  </div>;
}
function DDBoard({ view, g, busy, onOpen, onQuick }: { view: View; g: Game; busy: boolean; onOpen: (i: number) => void; onQuick: (i: number, o: number) => void }) {
  const t = useT();
  const now = useNow(250, true);
  const quick = !!view.ddEndsAt && view.ddEndsAt - now <= view.R.DD_SNAP * 1000;
  return <div className="ddb">
    <div className="g-sec"><h2>{quick ? t('dd.quick') : t('dd.stillOpen')}</h2><span className="g-mono">{quick ? t('dd.quickNote') : t('dd.stillAside')}</span></div>
    {view.cast.map((c, i) => {
      const call = g.calls[i], ln = leanOf(g, i), cs = E.callState(g, i);
      const canPost = cs === 'ok' && !ln.none;
      const canUt = !!call && E.canUturn(g, i) && !ln.none && ln.o !== call.o;
      return <div key={i} className={'ddc' + (quick && canPost ? ' is-quick' : '')}>
        <button className="ddc__who" onClick={() => onOpen(i)}><Kit club={c.from} player={c.player} size={44} /><span><b>{c.player.s} → {c.to.s}</b><span className="g-mono">{call ? t('dd.filed', { s: strWord(t.lang, call.s), o: outWord(t.lang, call.o) }) : ln.none ? t('dd.noLean') : t('daily.lean', { o: outWord(t.lang, ln.o) }) + ' · ' + t('daily.circles', { n: E.circlesFor(g, i, ln.o).size })}</span></span></button>
        {canPost ? <button className={'ddc__go oc--' + OUTS[ln.o]} disabled={busy} onClick={() => onQuick(i, ln.o)}>{t('g.win.ddPost', { o: outWord(t.lang, ln.o) })}</button>
          : canUt ? <button className="ddc__go" disabled={busy} onClick={() => onQuick(i, ln.o)}>{t('dd.uturn', { o: outWord(t.lang, ln.o) })}</button>
          : call ? <span className={'g-stamp g-stamp--' + OUTS[call.o]}>{outWord(t.lang, call.o)}</span>
          : <button className="ddc__go ddc__go--ring" onClick={() => onOpen(i)}><Icon n="phone" size={16} />{t('dd.ring')}</button>}
      </div>;
    })}
  </div>;
}

function FavourTray({ g, i, onUse }: { g: Game; i: number; onUse: (k: string) => void }) {
  const t = useT();
  const c = getSave().career;
  if (!c) return null;
  const n = totalFavours(c);
  const use = (k: 'burner' | 'tipoff' | 'stakeout') => { update((s) => { if (s.career && s.career.favours[k] > 0) s.career.favours[k]--; }); sfx('sparkle'); onUse(k); };
  const spotter = E.srcOf(g.R, i, 'spotter');
  const opts: { k: 'burner' | 'tipoff' | 'stakeout'; ok: boolean; ic: string }[] = [
    { k: 'burner', ok: true, ic: 'phone' }, { k: 'tipoff', ok: !(g.tips && i in g.tips), ic: 'eye' }, { k: 'stakeout', ok: !!spotter && spotter.from > g.day && spotter.from > 1, ic: 'plane' },
  ];
  return <div className="favs">
    <div className="g-sec"><h2>{t('career.favours')}</h2><span className="g-mono">{t('career.favoursAside', { n })}</span></div>
    <div className="favs__row">{opts.map(({ k, ok, ic }) => <button key={k} className="fav" disabled={!ok || c.favours[k] < 1 || g.over} onClick={() => use(k)} title={t('career.' + k + 'D')}>
      <span className="fav__ic"><Icon n={ic} /><b>{c.favours[k]}</b></span><span className="fav__t">{t('career.' + k)}</span>
    </button>)}</div>
  </div>;
}
export { vars };
