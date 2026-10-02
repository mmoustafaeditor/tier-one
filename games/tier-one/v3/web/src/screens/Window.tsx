// A transfer window: the board, the file, the overnight sheet, Deadline Day and the results. The same screen runs the
// Daily and rooms (server-held) and Practice/Career (local). Layout: look/mockups/challenge.html + deadline.html.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { E, OUTS, shadow, type Act, type Call, type Clue, type Post, type Game } from '../lib/engine';
import type { Driver, View } from '../lib/driver';
import { useT, fmtDate } from '../lib/i18n';
import { getSave, update, useSave } from '../lib/save';
import { sfx, buzz } from '../lib/sfx';
import { leanOf, outWord, strWord, postLine, vars, evidenceOf } from '../lib/story';
import { Icon, Kit, GBtn, TopBar, shake } from '../ui/game';
import { Portrait } from '../ui/portrait';
import { CallScene } from '../ui/CallScene';
import { PostScene } from '../ui/PostScene';
import { onDailyDone, onPracticeDone, onCareerDone, onRoomDone, toast, ymdUTC } from '../lib/meta';
import { applyWindow, totalFavours, vinceOf, type CareerReport } from '../lib/career';
import { storyBeats, pushBeats, beatScene, type Beat } from '../lib/storyMode';
import { Sheet, useNow, Crest } from '../ui/bits';
import { SagaFile, RivalFace, type RivalRecord } from './Saga';
import { Tip } from '../ui/fit';
import { hereWeGo } from '../lib/share';
import { Results } from './Results';
import { playScene, afterScenes, seen } from '../lib/scenes';
// Surface films (GOTY.md §9, ui/film.tsx): the source's place behind the file, the city on Deadline Day, the clock
// behind the countdown, the phone pick-up before a call, the stamp under a filed call. All additive: nothing without clips.
import { WindowFilm, ResultsFilm, DDClockFilm, Beat as FilmBeat, playBeat, warmBeat } from '../ui/film';
import { pickupBeat, stampBeat, SRCS as FILM_SRCS } from '../film/surfaces/manifest';
import type { Chrome } from '../App';
import { DayEnd } from '../film/calls/DayEnd'; // GOTY.md §10: the 1.5 s day end between window days (additive)
// The editor's desk (GOTY.md §7.1): the Daily brief before day 1 and the Deadline Day Live ticker (ui/live.tsx).
import { DailyBriefSheet, DDLiveTicker } from '../ui/live';
import { LivePresence } from '../ui/social';
import { catchphraseOf } from '../lib/catchphrase';

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
  const [dayEnd, setDayEnd] = useState<{ k: number; day: number } | null>(null);
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
  const sceneUp = useSceneUp();

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
      // Vince's play (Story, chapter 4 on): who lied is revealed with the results, by name.
      const vp = vinceOf(v.R);
      const vince = vp ? { ...vp, who: t('g.story.who.' + vp.src) } : null;
      update((s) => { if (s.career && g) { rep = applyWindow(s.career, g, r, v.cast, s.milestones); added = pushBeats(s, storyBeats(s.career, { ...r, cast: r.cast && r.cast.length ? r.cast : v.cast }, rep, { seen: { ...(s.story?.beats || {}) }, vince })); } });
      if (added[0]) setBeat(added[0]);
      // The story's films: a mid-chapter reveal or the finale plays over the results.
      added.map(beatScene).forEach((id) => { if (id) playScene(id); });
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
    // The phone lifts off the counter (beat-pickup-<src>, 0.6 s) while the ask goes to the engine; the call film follows
    // once both are done. Without the clip the beat resolves at once and the flow is exactly as before.
    const beat = playBeat(pickupBeat(src));
    const out = await act(['a', i, src]);
    await beat.done;
    if (out && out.answer) { setLast({ i, c: out.answer }); setCalling({ i, c: out.answer }); }
  };
  // Beats are preloaded with the screen: the six pick-ups, once the board is up (a no-op when film is gated).
  useEffect(() => { if (view && !view.done) FILM_SRCS.forEach((s) => warmBeat(pickupBeat(s))); }, [!!view && !view.done]);
  const postCall = async (i: number, o: number, s: number, ut: boolean) => {
    const prev = g && g.calls[i] ? { ...g.calls[i]! } : null;
    const out = await act(ut ? ['u', i, o, s] : ['c', i, o, s]);
    if (out && !out.error) {
      const late = view && view.state.day === view.R.DAYS;
      if (late) {
        // Deadline Day: the clock is running, so the quick burst instead of the full post.
        const hwg = hereWeGo({ o, s });
        sfx(hwg ? 'publish.hwg' : (['publish.talks', 'publish.advanced', 'publish.confirmed'] as const)[s]); setTimeout(() => sfx('stamp.done'), 120); buzz(s === 2 ? [20, 40, 30] : 18);
        setFiledAt((f) => ({ ...f, [i]: Date.now() })); setBurst({ k: Date.now(), kind: s, hwg }); setTimeout(() => setBurst(null), 1100); shake(rootRef.current);
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
    setDayEnd({ k: Date.now(), day: st.day });
  };
  // Deadline Day opens with its film (the full cut the first time ever, the short skippable cut after, §40); the clock
  // only starts once it ends, so the film never eats the sixty seconds.
  const startDD = () => { setNight(null); playScene(seen('deadline') ? 'deadline-short' : 'deadline'); afterScenes(async () => { const v = await driver.dd(); setView(v); }); };
  const finish = useCallback(async () => { const v = await driver.finish(); setView(v); settle(v); sfx('dd.whistle'); }, [driver, settle]);
  // The training board's consequence (§31): the week plays out at once (rivals post, the twist lands, the window
  // shuts) and the results land, so the first five minutes end on "I published, and this is what it cost / paid".
  const fastForward = useCallback(async () => { setSel(null); setNight(null); const v = await driver.finish(); setView(v); settle(v); }, [driver, settle]);

  // ---------- states
  const home = () => chrome.go(view?.mode === 'career' ? { n: 'story' } : view?.mode === 'practice' ? { n: 'practice' } : view?.mode === 'room' ? { n: 'rooms' } : { n: 'front' });
  const title = view?.mode === 'daily' ? t('g.win.daily', { n: view.no || '' }) : view?.mode === 'room' ? t('rooms.round', { n: (view.room?.round || 0) + 1 }) : view?.mode === 'career' ? t('g.tabs.story') : t('nav.practice');
  if (err) return <div className="g-screen play"><TopBar bare back={{ label: t('g.tabs.home'), onClick: home }} />
    <div className="g-card" style={{ marginTop: 20 }}><h1 className="g-h1">{t('g.win.offlineH')}</h1>
      <p className="g-sub" style={{ marginTop: 10 }}>{err === 'offline' ? t('err.offline') : t('daily.needNet')}</p>
      <GBtn style={{ marginTop: 18 }} onClick={load}><Icon n="phone" />{t('common.retry')}</GBtn>
      <GBtn kind="paper" style={{ marginTop: 12 }} onClick={() => chrome.go({ n: 'practice' })}>{t('daily.practiceInstead')}</GBtn></div></div>;
  if (!view || !g) return <div className="g-screen play"><TopBar bare back={{ label: t('g.tabs.home'), onClick: home }} /><div className="loading-press"><span /><p className="g-mono">{t('common.loading')}</p></div></div>;
  if (view.done && view.result) return <><Results view={view} chrome={chrome} report={report} start={startRef.current} beat={beat} ddLast15={ddLate.current} /><ResultsFilm /></>;

  const dd = view.state.day === view.R.DAYS;
  const mob = sel != null;
  const tutor = view.mode === 'practice' && view.label === 'tutorial' && !(sv.tut && sv.tut.done);
  // The tutorial ends here either way; the hand-off also drops the training board, so nothing nags to resume it.
  const endTut = (handoff: boolean) => update((x) => { x.tut = { ...(x.tut || {}), done: true }; if (handoff) x.practice.live = null; });
  const favours = view.mode === 'career' ? <FavourTray g={g} i={deskSel} onUse={(k) => act(['f', k, deskSel])} /> : null;
  const toBoard = () => { if (window.matchMedia('(max-width: 959.98px)').matches) { setSel(null); window.scrollTo(0, 0); } };
  const file = <SagaFile view={view} g={g} i={deskSel} busy={busy || !!posting} onLater={toBoard} last={calling ? null : last} dd={dd} onAsk={(src) => ask(deskSel, src)} onPost={(o, s, ut) => postCall(deskSel, o, s, ut)} favours={favours} justFiled={filedAt[deskSel]} rivalRecord={hasRecords() ? rivalRecordOf : undefined} />;
  // §28: during play the top bar carries only the way back and where you are (the wallet and the bell stay off).
  const dayTitle = <span className="play__title"><span>{title}</span><span className="g-mono">{t('c38.win.day', { n: view.state.day, m: view.R.DAYS })}</span></span>;

  return <div className={'g-screen g-screen--wide play fit fit--full' + (dd ? ' is-dd' : '')} ref={rootRef}>
    <WindowFilm src={calling ? calling.c.src : last ? last.c.src : null} dd={dd} />
    <TopBar bare back={mob ? { label: t('c38.file.back'), onClick: () => setSel(null) } : { label: t('g.tabs.home'), onClick: home }} title={mob ? undefined : dayTitle} />
    {dd && <DDHead view={view} onZero={finish} />}
    <div className="play__cols">
      <main className={mob ? 'only-desk' : ''}>
        {view.mode === 'daily' && !dd && <DDLiveTicker go={chrome.go} />}
        {view.mode === 'daily' && !dd && <LivePresence board="daily" />}
        {!dd && <section className="dayhead">
          <DayStrip day={view.state.day} days={view.R.DAYS} />
          <div className="dayhead__row">
            <div><div className="g-mono dayhead__k">{view.mode === 'daily' ? t('g.win.dailyK', { date: fmtDate(Date.now(), t.lang) }) : view.mode === 'career' ? t('career.ranks.' + (sv.career?.rank || 0)) : view.mode === 'room' ? t('nav.rooms') : tutor ? t('c38.onb.training') : t('c38.pr.k')}</div>
              <h1 className="g-h2 dayhead__h">{t('g.win.dayH', { n: view.state.day })}</h1></div>
            <Phones left={view.state.left} max={view.R.CONTACTS} />
          </div>
        </section>}
        {!dd && !tutor && <Tip id="board" />}
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

    {tutor && !sceneUp && !calling && !night && !posting && !burst && <TutorCoach g={g} sel={sel} onDone={() => endTut(false)} onFinish={() => { endTut(false); fastForward(); }} />}
    {calling && view.cast[calling.i] && createPortal(<CallScene src={calling.c.src} clue={calling.c} c={view.cast[calling.i]} R={view.R} mode={view.mode} onDone={() => setCalling(null)} />, document.body)}
    {burst && createPortal(<Burst key={burst.k} kind={burst.kind} hwg={burst.hwg} />, document.body)}
    {posting && view.cast[posting.i] && createPortal(<PostScene key={posting.k} c={view.cast[posting.i]} o={posting.o} s={posting.s} ut={posting.ut} prev={posting.prev} onDone={() => { const p = posting; setPosting(null); setFiledAt((f) => ({ ...f, [p.i]: Date.now() })); shake(rootRef.current); }} />, document.body)}

    <Sheet open={confirmEnd} onClose={() => setConfirmEnd(false)} label={t('daily.endConfirmOk')}>
      <div className="sheet__body"><h2 className="g-h2">{t('daily.endConfirm', { n: view.state.day, c: view.state.left })}</h2><p className="g-sub" style={{ marginTop: 8 }}>{t('daily.contactsNote')}</p>
        <GBtn kind="dark" style={{ marginTop: 16 }} onClick={endDay}><Icon n="moon" />{t('daily.endConfirmOk')}</GBtn><GBtn kind="paper" style={{ marginTop: 12 }} onClick={() => setConfirmEnd(false)}>{t('common.cancel')}</GBtn></div>
    </Sheet>
    {dayEnd && createPortal(<DayEnd key={dayEnd.k} day={dayEnd.day} lang={t.lang} rtl={t.rtl} label={t('g.win.dayH', { n: dayEnd.day })} kicker={t('mo.dawn')} onDone={() => setDayEnd(null)} />, document.body)}
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
// A saga on the board (§28): who, where to, and the evidence in one word (Strong / Split / Weak, "2 agree", Echo).
function SagaCard({ view, g, i, open, onOpen, filed, hint }: { view: View; g: Game; i: number; open: boolean; onOpen: () => void; filed?: number; hint?: boolean }) {
  const t = useT();
  const c = view.cast[i], call = g.calls[i], ln = leanOf(g, i), ev = evidenceOf(g, i);
  const tw = g.twist && g.twist.i === i;
  const posted = E.livePosts(g, i).length;
  const vince = view.mode === 'career' && vinceOf(view.R)?.i === i;
  return <button className={'scard' + (open ? ' is-open' : '') + (call ? ' is-called' : '') + (hint ? ' is-hint' : '')} style={{ ['--i' as string]: i }} onClick={onOpen} aria-label={c.player.n}>
    {call && <FilmBeat stem={stampBeat(OUTS[call.o])} trigger={filed || null} className="fl-beat--stamp" />}
    <span className="scard__face"><Portrait kind="player" id={c.player.id} club={c.from} size={52} /><Kit club={c.from} player={c.player} size={22} style={{ position: 'absolute', insetInlineEnd: -5, bottom: -5 }} /></span>
    <span className="scard__b">
      <span className="scard__n" dir="auto">{c.player.n}</span>
      <span className="scard__r"><Crest club={c.from} size={18} /><Icon n={t.rtl ? 'back' : 'arrow'} size={14} /><Crest club={c.to} size={18} /><span>{c.to.s}</span></span>
      <span className="scard__st">
        {tw && <span key="tw" className="g-chip g-chip--red chip-in">{t('stamp.twist')}</span>}
        {vince && <span key="vp" className="g-chip vince-chip" title={t('g.story.vince.banner')}><Icon n="eye" />{t('g.story.vince.chip')}</span>}
        {!call && (ln.none ? <span className="g-chip">{t('g.win.notRung')}</span>
          : <span key={'ev' + ev.word + ln.o + ev.agree + (ev.echo ? 'e' : '')} className={'g-chip chip-in scard__ev evw--' + ev.word + (ev.echo ? ' is-echo' : '') + ' g-chip--' + OUTS[ln.o]}>
            {ev.echo ? <><Icon n="eye" />{t('c38.ev.' + ev.word)}</> : <>{t('c38.ev.' + ev.word)}{!ln.split && <> · {outWord(t.lang, ln.o)}</>}{ev.agree >= 2 ? <> · {t('c38.ev.circles', { n: ev.agree })}</> : null}</>}
          </span>)}
        {posted > 0 && !call && <span key={'rv' + posted} className="g-chip scard__riv chip-in"><Icon n="bolt" />{posted === 1 ? t('c38.ev.rivalOne') : t('c38.ev.rival', { n: posted })}</span>}
      </span>
    </span>
    <span className="scard__end">{call ? <span key={filed || 0} className={'g-stamp g-stamp--' + (hereWeGo(call) ? 'gold scard__hwg' : OUTS[call.o]) + (filed ? ' is-slam' : '')}>{hereWeGo(call) ? catchphraseOf().text : outWord(t.lang, call.o)}</span> : <Icon n={t.rtl ? 'back' : 'arrow'} size={22} />}</span>
  </button>;
}

// ---------- The guided first day (HYBRID.md §9; GOTY.md "one opening"). Each step is read from the live game and from
// the DOM (is the call panel open, what's pressed), so the tip always matches what's on screen. A coach mark sits above
// or below its target with a spotlight around it and never over it; the page scrolls so both fit. Day one ends with the
// hand-off to the Story: the story lane decides what plays next (its prologue), nothing here knows its internals.
// 3.8 (LAUNCH_BRIEF §31): open a file → ring the Kit Man → ring a second kind of source → read the evidence and make the
// call → what happens → how sure, hold Publish → (phones: back to the board) → the consequence: fast-forward the week.
const TUT_STEPS = ['open', 'ring', 'second', 'read', 'what', 'loud', 'back', 'result'] as const;
type TutStep = (typeof TUT_STEPS)[number];
// What each step points at (a union of several boxes when the step is about more than one control).
const TUT_TARGET: Record<TutStep, string[]> = {
  open: ['.sagas .scard.is-hint'], ring: ['.file2 .src[data-src="kitman"]', '.file2 .srcs'], second: ['.file2 .srcs'], read: ['.file2 .evsum', '.file3__bar'],
  what: ['.callform .outs'], loud: ['.callform .vols', '.callbox .publish'], back: ['.play .g-top__back'], result: ['.play__cols > main > .g-btn'],
};
// The words for each step: the 3.8 lines where the step changed, the 3.6 lines where it did not.
const TUT_KEY: Record<TutStep, string> = { open: 'g.tut.open', ring: 'c38.tut.ring', second: 'c38.tut.second', read: 'c38.tut.read', what: 'g.tut.what', loud: 'g.tut.loud', back: 'g.tut.back', result: 'c38.tut.result' };
const TUT_TOP = 64, TUT_GAP = 12, TUT_PAD = 6, TUT_HEAD = 52; // sticky bar, tip gap, ring padding, headroom for a section heading
const isDesk = () => window.matchMedia('(min-width: 960px)').matches;
const q = (sel: string) => document.querySelector<HTMLElement>(sel);
// True while a film (the cold open, a source intro, a moment) is on screen: the tutor waits for it to end.
function useSceneUp() {
  const [up, setUp] = useState(() => !!q('.film'));
  useEffect(() => {
    const mo = new MutationObserver(() => setUp(!!q('.film')));
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
  return up;
}
function tutStep(g: Game, sel: number | null): TutStep {
  const desk = isDesk(), i = sel ?? 0;
  if (g.calls.some(Boolean)) return !desk && sel != null ? 'back' : 'result';
  if (sel == null && !desk) return 'open';
  if (q('.callform')) return q('.callform .out[aria-pressed="true"]') ? 'loud' : 'what';
  const reads = E.curReads(g, i).length, ln = leanOf(g, i);
  if (!reads) return 'ring';
  const more = g.left > 0 && !!q('.file2 .src:not(:disabled)');
  if (more && (ln.none || (E.circlesFor(g, i, ln.o).size < 2 && reads < 2))) return 'second';
  return 'read';
}
type Box = { top: number; left: number; bottom: number; right: number };
const boxOf = (step: TutStep): Box | null => {
  const rs = TUT_TARGET[step].map(q).filter((e): e is HTMLElement => !!e).map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
  if (!rs.length) return null;
  return { top: Math.min(...rs.map((r) => r.top)), left: Math.min(...rs.map((r) => r.left)), bottom: Math.max(...rs.map((r) => r.bottom)), right: Math.max(...rs.map((r) => r.right)) };
};
// The element that scrolls the target: the desktop file is its own scroll box (.play__file); otherwise the window.
const scrollerOf = (step: TutStep): HTMLElement | null => {
  for (let el = q(TUT_TARGET[step][0])?.parentElement; el && el !== document.body; el = el.parentElement) {
    const o = getComputedStyle(el).overflowY;
    if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight + 1) return el;
  }
  return null;
};
// The band of the viewport the target can be seen in: under the sticky bar, or the scroll box's own visible area.
const viewBand = (sc: HTMLElement | null) => (sc ? { top: sc.getBoundingClientRect().top, bottom: sc.getBoundingClientRect().bottom } : { top: TUT_TOP, bottom: innerHeight - 8 });

function TutorCoach({ g, sel, onDone, onFinish }: { g: Game; sel: number | null; onDone: () => void; onFinish: () => void }) {
  const t = useT();
  const [, bump] = useState(0);
  const tip = useRef<HTMLDivElement>(null), ring = useRef<HTMLDivElement>(null);
  const side = useRef<'below' | 'above'>('below');
  // The play surface is part of the state: re-read it when it changes (one render per frame at most). The coach mark
  // itself lives on document.body, outside the watched tree.
  useEffect(() => {
    const root = document.querySelector('.play'); if (!root) return;
    let raf = 0;
    const mo = new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; bump((n) => n + 1); }); });
    mo.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-pressed', 'class', 'disabled'] });
    return () => { mo.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  const step = tutStep(g, sel);
  const list = TUT_STEPS.filter((s) => !isDesk() || (s !== 'open' && s !== 'back'));
  const n = list.indexOf(step) + 1;

  // Places the spotlight on the target and the tip above or below it (in page coordinates, so they scroll with the
  // page). `pick` decides the side afresh, allowing for the scroll that a new step is about to make.
  const place = useCallback((pick: boolean, delta = 0) => {
    const el = tip.current, rg = ring.current; if (!el || !rg) return;
    const b = boxOf(step), vw = innerWidth, vh = innerHeight, sx = scrollX, sy = scrollY;
    if (!b) { // nothing to point at (a panel mid-change): park the tip at the bottom for a frame
      rg.style.display = 'none'; el.style.position = 'fixed'; el.style.top = 'auto'; el.style.bottom = 'calc(14px + env(safe-area-inset-bottom, 0px))';
      el.style.left = '12px'; el.style.width = Math.min(vw - 24, 440) + 'px'; delete el.dataset.side; return;
    }
    rg.style.display = ''; rg.style.top = sy + b.top - TUT_PAD + 'px'; rg.style.left = sx + b.left - TUT_PAD + 'px';
    rg.style.width = b.right - b.left + 2 * TUT_PAD + 'px'; rg.style.height = b.bottom - b.top + 2 * TUT_PAD + 'px';
    const tw = Math.min(vw - 24, 440);
    el.style.position = 'absolute'; el.style.bottom = 'auto'; el.style.width = tw + 'px';
    const th = el.offsetHeight;
    if (pick) {
      const band = viewBand(scrollerOf(step)), top = b.top - delta, bottom = b.bottom - delta;
      const belowFits = bottom + TUT_GAP + th <= Math.min(band.bottom, vh - 8), aboveFits = top - TUT_GAP - th >= Math.max(band.top, TUT_TOP);
      side.current = belowFits || !aboveFits ? 'below' : 'above';
    }
    const y = side.current === 'below' ? b.bottom + TUT_GAP : b.top - TUT_GAP - th;
    const cx = (b.left + b.right) / 2, left = Math.round(Math.min(Math.max(12, cx - tw / 2), vw - tw - 12));
    el.style.top = sy + y + 'px'; el.style.left = sx + left + 'px';
    el.style.setProperty('--cx', Math.round(Math.min(Math.max(22, cx - left), tw - 22)) + 'px');
    el.dataset.side = side.current;
  }, [step]);

  // Brings the target into the top of the view (unless it's already comfortably in view) and places the mark for that
  // position. Idempotent, so it also runs again after the panel's entrance animation and the smooth scroll settle.
  const focus = useCallback(() => {
    const b = boxOf(step), sc = scrollerOf(step), band = viewBand(sc);
    const reduce = getSave().reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const want = Math.max(band.top, TUT_TOP) + TUT_HEAD;
    let delta = 0;
    if (b && step !== 'back' && (b.top < want || b.bottom > band.bottom - 150)) delta = b.top - want;
    place(true, delta);
    if (Math.abs(delta) > 2) (sc || window).scrollBy({ top: delta, behavior: reduce ? 'auto' : 'smooth' });
  }, [step, place]);
  useLayoutEffect(() => {
    sfx('ui.pop'); focus();
    const ids = [450, 1000].map((ms) => setTimeout(focus, ms));
    return () => ids.forEach(clearTimeout);
  }, [step, focus]);
  // Every render (the play surface changed), and on scroll/resize/animation end: keep the mark on its target.
  useLayoutEffect(() => { place(false); });
  useEffect(() => {
    let raf = 0;
    const on = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; place(false); }); };
    const re = () => place(true);
    const anim = (e: Event) => { if ((e.target as Element | null)?.closest?.('.play')) focus(); };
    // Scroll is caught in the capture phase so the desktop file's own scroll box counts too.
    document.addEventListener('scroll', on, { passive: true, capture: true }); addEventListener('resize', re);
    document.addEventListener('animationend', anim, true); document.addEventListener('transitionend', anim, true);
    return () => { document.removeEventListener('scroll', on, { capture: true }); removeEventListener('resize', re); document.removeEventListener('animationend', anim, true); document.removeEventListener('transitionend', anim, true); cancelAnimationFrame(raf); };
  }, [place, focus]);

  const last = step === 'result';
  return createPortal(<>
    <div ref={ring} className="tutor-ring" aria-hidden="true" />
    <div ref={tip} className={'tutor' + (last ? ' tutor--last' : '')} role="status" data-step={step} key={step}>
      <span className="tutor__n" aria-label={t('g.tut.step', { n, m: list.length })}>{n}/{list.length}</span>
      <div className="tutor__b">
        <b>{t(TUT_KEY[step])}</b><p>{t(TUT_KEY[step] + 'P')}</p>
        {last && <div className="tutor__acts">
          <button type="button" className="tutor__go" onClick={() => { sfx('open'); onFinish(); }}><Icon n="bolt" size={18} />{t('c38.tut.ff')}</button>
          <button type="button" className="tutor__ok" onClick={() => { sfx('ui.tap'); onDone(); }}>{t('c38.tut.keep')}</button>
        </div>}
      </div>
      {!last && <button type="button" className="tutor__skip" onClick={() => { sfx('ui.tap'); onDone(); }}>{t('g.tut.skip')}</button>}
    </div>
  </>, document.body);
}

// A publish goes out (Deadline Day): reactions float up off the page. Pointer events pass through: input is never blocked.
function Burst({ kind, hwg }: { kind: number; hwg?: boolean }) {
  const t = useT();
  const bits = ['share', 'flame', 'eye', 'share', 'star', 'flame', 'eye', 'bolt', 'share', 'flame'];
  return <div className={'burst' + (hwg ? ' is-hwg' : '')} aria-hidden="true" style={{ pointerEvents: 'none' }}>
    <span className="burst__word">{hwg ? catchphraseOf().text.toUpperCase() : t('g.win.published.' + kind)}</span>
    {bits.map((b, k) => <i key={k} style={{ left: 10 + (k * 83) % 80 + '%', animationDelay: k * 70 + 'ms' }}><Icon n={b} /></i>)}
  </div>;
}

// Overnight (GOTY.md §2): dusk to dawn, then each rival post lands as a BREAKING card with the rival's avatar and a
// taunt that fits your call (and the ledger when the connect lane provides one). A twist glitches the screen and slams
// STOP PRESS. ~2 s at most; a tap skips straight to the end state; reduced motion shows it static.
// 3.8 (§40): the sky turns in 450 ms, the cards land 110 ms apart (≤ 550 ms), a twist takes 350 ms more; a tap skips.
const NIGHT_SKY = 450, NIGHT_STEP = 110, NIGHT_TWIST = 350;
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
  const cardsMs = Math.min(night.posts.length * NIGHT_STEP, 550);
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
      <h2 className="night2__h">{night.dd ? t('g.win.ddIncoming') : night.posts.length ? t('g.win.overnight', { n: night.posts.length }) : t('night.none', { n: view.cast.length })}</h2>
      {stage >= 1 && night.twist && <div className="twistcard"><span className={'g-stamp g-stamp--xl' + (skip ? '' : ' is-slam')} style={{ ['--sc' as string]: '#fff' }}>{t('g.saga.stopPress')}</span><b>{t('night.twist', { p: view.cast[night.twist.i].player.s })}</b><p>{t('night.twistBody')}</p></div>}
      {stage >= 1 && night.dd && <p className="night2__dd">{t('night.ddBody')}</p>}
      {stage >= 1 && night.posts.length > 0 && <div className="breaks">{night.posts.map((p, k) => { const c = view.cast[p.i]; const tn = tauntFor(t, g, p); return <div key={k} className="brk" style={{ animationDelay: skip ? '0ms' : lead + Math.min(k, 5) * NIGHT_STEP + 'ms' }}>
        <RivalFace id={p.id} size={42} name={t('rival.' + p.id)} />
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

// ---------- Deadline Day (3.8, LAUNCH_BRIEF §9): a red takeover with five phases on one fair clock.
//   60 s normal urgency · 30 s the heartbeat · 15 s Quick Post (one tap files the lean at Advanced) · 10 s the ticking
//   doubles · 5 s the clock pulses · 0 the whistle. The deadline comes from the server's own count (lib/driver.ts,
//   latency-corrected) and the server keeps a few seconds of grace, so a slow line never robs a post that was sent in
//   time. Under reduced motion the shake and pulse are off (styles) and the phone stays still; the phases still sound.
//   Nothing here ever blocks input: the clock is a separate layer and the board below stays live to the last tenth.
type DDPhase = 'normal' | 'heart' | 'quick' | 'tick' | 'pulse';
const ddPhase = (sec: number, R: View['R']): DDPhase => (sec <= 5 ? 'pulse' : sec <= 10 ? 'tick' : sec <= R.DD_SNAP ? 'quick' : sec <= 30 ? 'heart' : 'normal');
function DDHead({ view, onZero }: { view: View; onZero: () => void }) {
  const t = useT();
  const now = useNow(100, true);
  const end = view.ddEndsAt || now + view.R.DD_SECONDS * 1000;
  const ms = Math.max(0, end - now), sec = Math.floor(ms / 1000), cs = Math.floor((ms % 1000) / 100);
  const fired = useRef(false), lastTick = useRef(99);
  const phase = ddPhase(sec, view.R);
  useEffect(() => {
    if (sec !== lastTick.current && ms > 0) {
      lastTick.current = sec;
      if (phase === 'pulse') { sfx('dd.pulse'); buzz(14); } else if (phase === 'tick') { sfx('dd.tick'); buzz(8); } else if (phase !== 'normal') sfx('dd.heart');
      if (sec === 15 || sec === 10 || sec === 5) buzz([20, 30, 20]);
    }
    if (ms <= 0 && !fired.current) { fired.current = true; onZero(); }
  }, [sec, ms, onZero, phase]);
  const total = view.R.DD_SECONDS;
  const open = view.cast.filter((_, i) => !view.state.calls[i]).length;
  const note = phase === 'normal' ? t('dd.note') : phase === 'heart' ? t('c38.dd.phase.heart') : phase === 'quick' ? t('c38.dd.phase.quick') : phase === 'tick' ? t('c38.dd.phase.tick') : t('c38.dd.phase.pulse');
  return <div className={'ddh ph-' + phase + (phase === 'pulse' ? ' is-pulse' : '') + (phase === 'tick' ? ' is-last' : '') + (phase === 'heart' || phase === 'quick' ? ' is-hot' : '')} style={{ ['--ddp' as string]: String(1 - ms / (total * 1000)) }}>
    <DDClockFilm />
    <div className="ddh__band"><b>{t('dd.band')}</b><span>{t('dd.posts', { n: view.R.DD_POSTS - view.state.posts7 })} · {open ? t('c38.dd.open', { n: open }) : t('c38.dd.allFiled')}</span></div>
    <div className="ddh__clock" role="timer" aria-live="off" aria-label={sec + 's'}><span className="ddh__s">{String(sec).padStart(2, '0')}</span><span className="ddh__cs">.{cs}</span></div>
    <div className="ddh__bar"><i style={{ width: (100 * ms) / (total * 1000) + '%' }} /><span className="ddh__marks" aria-hidden="true">{[30, view.R.DD_SNAP, 10, 5].map((m) => <i key={m} style={{ insetInlineStart: (100 * m) / total + '%' }} />)}</span></div>
    <p className="ddh__note" aria-live="polite">{note}{view.ddGraceMs ? <span className="ddh__sync g-mono"> · {t('c38.dd.synced', { n: Math.round(view.ddGraceMs / 1000) })}</span> : null}</p>
  </div>;
}
// The board on Deadline Day: unresolved sagas first and marked, one tap posts the lean (Advanced); Quick Post in the last
// DD_SNAP seconds only changes the words and the glow, never the controls, so nothing has to be relearned at 14 s.
function DDBoard({ view, g, busy, onOpen, onQuick }: { view: View; g: Game; busy: boolean; onOpen: (i: number) => void; onQuick: (i: number, o: number) => void }) {
  const t = useT();
  const now = useNow(250, true);
  const quick = !!view.ddEndsAt && view.ddEndsAt - now <= view.R.DD_SNAP * 1000;
  const order = view.cast.map((_, i) => i).sort((a, b) => Number(!!g.calls[a]) - Number(!!g.calls[b]) || a - b);
  const open = order.filter((i) => !g.calls[i]).length;
  return <div className={'ddb' + (quick ? ' is-quick' : '')}>
    <div className="g-sec"><h2>{quick ? t('c38.dd.quick') : t('dd.stillOpen')}</h2><span className="g-mono">{quick ? t('c38.dd.quickNote') : open ? t('c38.dd.open', { n: open }) : t('c38.dd.allFiled')}</span></div>
    {order.map((i) => {
      const c = view.cast[i];
      const call = g.calls[i], ln = leanOf(g, i), ev = evidenceOf(g, i), cs = E.callState(g, i);
      const canPost = cs === 'ok' && !ln.none;
      const canUt = !!call && E.canUturn(g, i) && !ln.none && ln.o !== call.o;
      return <div key={i} className={'ddc' + (quick && canPost ? ' is-quick' : '') + (!call ? ' is-open' : '')}>
        <button className="ddc__who" onClick={() => onOpen(i)}><Kit club={c.from} player={c.player} size={44} /><span><b>{c.player.s} → {c.to.s}</b><span className="g-mono">{call ? t('dd.filed', { s: strWord(t.lang, call.s), o: outWord(t.lang, call.o) }) : ln.none ? t('dd.noLean') : t('c38.ev.' + ev.word) + (ln.split ? '' : ' · ' + outWord(t.lang, ln.o)) + (ev.agree >= 2 ? ' · ' + t('c38.ev.circles', { n: ev.agree }) : '')}</span>{!call && <span className="ddc__tag">{t('c38.dd.unresolved')}</span>}</span></button>
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
