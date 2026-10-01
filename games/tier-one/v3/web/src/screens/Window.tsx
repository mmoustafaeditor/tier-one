// 4.1 play screen (UI41 §Daily Challenge, §Deadline Day). App mounts it for the Daily, a room round, Practice, Career,
// the first window and Deadline Day, each on lib/driver.ts makeDriver with onDone = lib/meta.ts onDriverDone (App
// builds the driver). One screen at a time, nothing scrolls:
//   board (Day N of 5, calls left, five player rows, End Day) → player screen (screens/Saga.tsx) → decide sheet →
//   post animation (ui/PostScene.tsx) → back to the board … → Results (screens/Results.tsx).
// Deadline Day: the same flow on one 90-second day: the countdown hero, a rival ticker, six players in a grid, two-tap
// posting, red under 15 s with ticks, then "window shut".
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { isV4Day, V4_FROM, type Clue4, type Pub4 } from '../lib/engine';
import type { Driver4 } from '../lib/driver';
import { useT, fmtDate, tr } from '../lib/i18n';
import { useSave } from '../lib/save';
import { sfx, buzz } from '../lib/sfx';
import { prefersReducedMotion } from '../lib/motion';
import { onGain, toast, ymdUTC } from '../lib/meta';
import type { Gain } from '../lib/economy';
import { outWord4 } from '../lib/story';
import { bossNow } from '../lib/rivals';
import { nextCareerWindow } from '../lib/storyMode';
import { catchphraseOf } from '../lib/catchphrase';
import { Kit } from '../ui/game';
import { Pop } from '../ui/juice';
import { Hint } from '../ui/hint';
import { Screen } from '../ui/screen';
import { TutorialLayer } from '../ui/tutorial';
import { CallScene, lockShort } from '../ui/CallScene';
import { PostScene } from '../ui/PostScene';
import { PlayerScreen, DecideSheet, StatusChip, Route, windowLabel, dayWord, callsWord, OUT_KEYS } from './Saga';
import { ResultsScreen, nextRoute } from './Results';
import type { Chrome } from '../App';
import '../styles/daily41.css';

const gainMode = (m: Driver4['mode']) => (m === 'tutorial' || m === 'challenge' ? 'practice' : m);
const errKey = (e: string | null) => 'drv4.err.' + (e && ['net', 'offline', 'rule', 'clock', 'done', 'version', 'dev'].includes(e) ? e : 'net');

type Posting = { i: number; o: number; s: number; k: number };
type Turn = { k: number; day: number; left: number; posts: number; dd: boolean };

export function WindowScreen({ driver, ...chrome }: { driver: Driver4 } & Chrome) {
  const t = useT();
  const s = useSave();
  useSyncExternalStore(driver.subscribe, driver.version, driver.version);
  const [phase, setPhase] = useState<'load' | 'err' | 'play'>('load');
  const [gain, setGain] = useState<Gain | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [decide, setDecide] = useState(false);
  const [calling, setCalling] = useState<{ i: number; src: string; clue: Clue4 | null; k: number } | null>(null);
  const [landed, setLanded] = useState<Record<string, number>>({});
  const [posting, setPosting] = useState<Posting | null>(null);
  const [turn, setTurn] = useState<Turn | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => onGain((g, m) => { if (m === gainMode(driver.mode)) setGain(g); }), [driver]);
  const load = useCallback(async () => { setPhase('load'); const p = await driver.start(); setPhase(p ? 'play' : 'err'); }, [driver]);
  useEffect(() => { void load(); }, [load]);
  const over = driver.isOver(), res = driver.result();
  useEffect(() => { if (phase === 'play' && over && !res) void driver.finish(); }, [phase, over, !!res]); // eslint-disable-line react-hooks/exhaustive-deps

  const pub = driver.pub();
  const R = driver.R, cast = driver.cast;
  const live = !!R.CLOCK_S;
  const clock = useClock(driver, live && phase === 'play' && !over);
  const back = () => chrome.go(nextRoute(driver));
  const handle = '@' + (s.nick || t('d41.you'));
  const open = useCallback((i: number) => { sfx('page.turn'); setSel(i); }, []);

  // Career: the story's tips and Vince's clients for this window (lib/storyMode.ts). The planted contact stays secret.
  const cw = useMemo(() => { if (driver.mode !== 'career') return null; const w = nextCareerWindow(); return w.seed === driver.seed ? w : null; }, [driver]);
  const notesFor = (i: number): string[] => {
    if (!cw) return [];
    const out: string[] = [];
    if (cw.tagged.includes(i)) out.push(t('st4.next.clientD'));
    for (const x of cw.tips) {
      if (x.i !== i) continue;
      const c = cast[x.i]; const v = { p: c ? c.player.s : '', to: c ? c.to.s : '', o: x.o != null ? outWord4(t.lang, x.o) : '' };
      const text = x.kind === 'whistle' ? t(x.from === 'priya' ? 'st4.tip.priya' : 'st4.tip.whistle', v) : x.kind === 'pitch' ? t('st4.tip.pitch', v) : t(x.stays ? 'st4.tip.stays' : 'st4.tip.goes', v);
      out.push(t('st4.who.' + x.from) + ': ' + text);
    }
    return out;
  };

  // ---- actions
  const ask = async (i: number, src: string) => {
    const st = driver.askState(i, src);
    if (st === 'closed') { toast('info', lockShort(t.lang, src, R)); sfx('os.locked'); return; }
    if (st === 'broke') { toast('warn', t('d41.calls.none')); sfx('os.locked'); return; }
    if (st !== 'ok' || busy) return;
    const k = Date.now();
    setCalling({ i, src, clue: null, k }); buzz(12); setBusy(true);
    const clue = await driver.ask(i, src);
    setBusy(false);
    if (!clue) { setCalling(null); toast('warn', t(errKey(driver.error()))); return; }
    setCalling((c) => (c && c.k === k ? { ...c, clue } : c));
  };
  const endCall = () => { if (calling) setLanded((l) => ({ ...l, [calling.src]: Date.now() })); setCalling(null); };
  const post = async (i: number, o: number, s2: number) => {
    if (busy) return;
    setBusy(true); setDecide(false);
    const ok = await driver.post(i, o, s2);
    setBusy(false);
    if (!ok) { toast('warn', t(errKey(driver.error()))); return; }
    setPosting({ i, o, s: s2, k: Date.now() });
  };
  const endDay = async () => {
    setConfirmEnd(false);
    if (busy) return;
    const feedN = pub.feed.length;
    setBusy(true); sfx('whoosh');
    const ok = await driver.endDay();
    setBusy(false);
    if (!ok) { toast('warn', t(errKey(driver.error()))); return; }
    setSel(null);
    const p = driver.pub();
    if (p.over || driver.isOver()) return;
    setTurn({ k: Date.now(), day: p.day, left: p.left, posts: p.feed.length - feedN, dd: p.day >= R.DAYS });
  };
  const closeNow = async () => { setConfirmEnd(false); setBusy(true); sfx('dd.whistle'); await driver.finish(); setBusy(false); };
  const last = R.DAYS === 1 || pub.day >= R.DAYS;
  const onEnd = () => (pub.left > 0 ? setConfirmEnd(true) : last ? closeNow() : endDay());

  // ---- states
  if (phase === 'err') {
    const e = driver.error();
    const soon = driver.mode === 'daily' && (e === 'version' || !isV4Day(ymdUTC()));
    return <div className="d41"><Screen title={windowLabel(t, driver)} onBack={back}
      footer={<>{!soon && <Pop className="d41-btn" onTap={load}>{t('d41.err.retry')}</Pop>}<Pop className={'d41-btn' + (soon ? '' : ' d41-btn--quiet')} onTap={() => chrome.go({ n: 'play', mode: 'practice', key: Date.now() })}>{t('d41.err.practice')}</Pop></>}>
      <div className="d41-empty"><h2>{soon ? t('pl4.win.soon', { d: fmtDate(Date.parse(V4_FROM + 'T12:00:00Z'), t.lang, { day: 'numeric', month: 'long' }) }) : t(errKey(e))}</h2>{soon && <p>{t('pl4.win.soonB')}</p>}</div>
    </Screen></div>;
  }
  if (phase === 'load' || !cast.length) return <div className="d41"><Screen title={windowLabel(t, driver)} onBack={back}><div className="d41-empty" aria-busy="true"><p>{t('d41.loading')}</p></div></Screen></div>;
  if (over && res) return <div className="d41"><ResultsScreen driver={driver} out={res} gain={gain} chrome={chrome} /></div>;

  const right = live ? <MiniClock c={clock} /> : undefined;
  const c = sel != null ? cast[sel] : null;
  return <div className={'d41' + (live ? ' is-live' : '') + (live && clock.sec <= 15 ? ' is-hurry' : '')}>
    {c && sel != null
      ? <PlayerScreen key={sel} driver={driver} pub={pub} i={sel} landed={landed} notes={notesFor(sel)} right={right}
        onBack={() => { sfx('ui.tap'); setSel(null); }} onAsk={(src) => ask(sel, src)} onDecide={() => setDecide(true)} />
      : live
        ? <DeadlineBoard driver={driver} pub={pub} clock={clock} busy={busy} onBack={back} onOpen={open} onEnd={onEnd} />
        : <Board driver={driver} pub={pub} busy={busy} tagged={cw ? cw.tagged : []} keys={!calling && !posting && !decide && !confirmEnd && !turn} onBack={back} onOpen={open} onEnd={onEnd} />}

    {decide && sel != null && <DecideSheet driver={driver} i={sel} quick={live} onClose={() => setDecide(false)} onPost={(o, s2) => post(sel, o, s2)} />}
    {confirmEnd && <div className="d41-sheet" onClick={() => setConfirmEnd(false)}>
      <div className="d41-sheet__card sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="d41-sheet__h"><span><small>{last ? t('pl4.end.goLast') : dayWord(t, pub.day, R.DAYS)}</small><b>{pub.left === 1 ? t('d41.end.confirm1') : t('d41.end.confirm', { n: pub.left })}</b></span></header>
        <p className="d41-deal">{t('d41.end.confirmB')}</p>
        <div className="d41-row2">
          <Pop className="d41-btn d41-btn--quiet" onTap={() => setConfirmEnd(false)}>{t('pl4.end.keep')}</Pop>
          <Pop className="d41-btn" onTap={() => (last ? closeNow() : endDay())} data-autofocus="">{last ? t('pl4.end.goLast') : t('pl4.end.ok')}</Pop>
        </div>
      </div>
    </div>}
    {calling && <CallScene key={calling.k} src={calling.src} clue={calling.clue} c={cast[calling.i]} onDone={endCall} />}
    {posting && <PostScene key={posting.k} c={cast[posting.i]} o={posting.o} s={posting.s} handle={handle} phrase={catchphraseOf(s).text} quick={live}
      onDone={() => { setPosting(null); setSel(null); }} />}
    {turn && <DayTurn key={turn.k} m={turn} onDone={() => setTurn(null)} />}
    {driver.mode === 'tutorial' && <TutorialLayer driver={driver} story={sel} />}
  </div>;
}

// ---------------------------------------------------------------- the board (Daily, Practice, Career, rooms)
function Board({ driver, pub, busy, tagged, keys, onBack, onOpen, onEnd }: { driver: Driver4; pub: Pub4; busy: boolean; tagged: number[]; keys: boolean; onBack: () => void; onOpen: (i: number) => void; onEnd: () => void }) {
  const t = useT();
  const R = driver.R, cast = driver.cast;
  const last = R.DAYS === 1 || pub.day >= R.DAYS;
  const boss = driver.mode === 'career' ? bossNow() : null;
  const label = last ? t('pl4.end.goLast') : pub.day === R.DAYS - 1 ? t('pl4.end.goDD') : t('d41.end.day', { d: pub.day });
  useEffect(() => {
    if (!keys) return;
    const k = (e: KeyboardEvent) => { const n = Number(e.key); if (n >= 1 && n <= cast.length && !(e.target instanceof HTMLInputElement)) onOpen(n - 1); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [cast.length, onOpen, keys]);
  return <Screen title={windowLabel(t, driver)} sub={boss ? t('d41.boss', { who: boss.handle, a: boss.you, b: boss.them }) : undefined} onBack={onBack}
    footer={<Pop className={'d41-btn d41-btn--big' + (last ? ' is-last' : '')} onTap={onEnd} disabled={busy} sound="whoosh" data-tut="end-day">{label}</Pop>}>
    <div className="d41-dayhead">
      <span className="d41-dayhead__d">
        <b>{dayWord(t, pub.day, R.DAYS)}</b>
        {R.DAYS > 1 && <span className="d41-daybar" aria-hidden="true">{Array.from({ length: R.DAYS }, (_, k) => <i key={k} className={k + 1 < pub.day ? 'past' : k + 1 === pub.day ? 'now' : ''} />)}</span>}
      </span>
      <span className="d41-calls" key={pub.day + ':' + pub.left} aria-label={callsWord(t, pub.left)}><b className="g-num">{pub.left}</b><small>{pub.left === 1 ? t('d41.calls.leftOne') : t('d41.calls.left')}</small></span>
    </div>
    <div className="d41-rows" style={{ ['--n' as string]: cast.length } as CSSProperties}>
      {cast.map((c, i) => <button key={i} type="button" className={'d41-prow' + (pub.calls[i] ? ' is-called' : '')} data-pick={i + 1} data-tut={'story-' + i} onClick={() => onOpen(i)}
        style={{ ['--c1' as string]: c.from.c1, ['--c2' as string]: c.from.c2 } as CSSProperties} aria-label={c.player.n + ' · ' + c.from.s + ' → ' + c.to.s}>
        <Kit club={c.from} player={c.player} size={40} />
        <span className="d41-prow__b">
          <b dir="auto">{c.player.s || c.player.n}{tagged.includes(i) && <small className="d41-tag">{t('st4.next.client')}</small>}</b>
          <Route c={c} />
        </span>
        <StatusChip pub={pub} i={i} />
      </button>)}
    </div>
  {driver.mode !== 'tutorial' && <Hint id="board">{t('s41.hint.board')}</Hint>}</Screen>;
}

// ---------------------------------------------------------------- Deadline Day
type Clock = { ms: number; sec: number; total: number };
function useClock(driver: Driver4, on: boolean): Clock {
  const total = (driver.R.CLOCK_S || 90) * 1000;
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!on) return; const id = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(id); }, [on]);
  const end = driver.clock() ?? now + total;
  const ms = Math.max(0, end - now), sec = Math.ceil(ms / 1000);
  const tick = useRef(999), fired = useRef(false);
  useEffect(() => {
    if (!on) return;
    if (sec !== tick.current && ms > 0) { tick.current = sec; if (sec <= 15) { sfx('dd.tick'); if (sec <= 5) buzz(8); } else if (sec <= 30) sfx('dd.heart'); }
    if (ms <= 0 && !fired.current && !driver.isOver()) { fired.current = true; sfx('dd.whistle'); void driver.finish(); }
  }, [sec, ms, on, driver]);
  return { ms, sec, total };
}
const clockText = (ms: number) => {
  if (ms < 15000) return (ms / 1000).toFixed(1);
  const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};
function MiniClock({ c }: { c: Clock }) {
  const t = useT();
  return <span className={'d41-mini g-num' + (c.sec <= 15 ? ' is-hurry' : '')} role="timer" aria-label={t('d41.dd.left', { s: c.sec })}>{clockText(c.ms)}</span>;
}

function DeadlineBoard({ driver, pub, clock, busy, onBack, onOpen, onEnd }: { driver: Driver4; pub: Pub4; clock: Clock; busy: boolean; onBack: () => void; onOpen: (i: number) => void; onEnd: () => void }) {
  const t = useT();
  const cast = driver.cast;
  const hurry = clock.sec <= 15;
  const frac = clock.ms / clock.total;
  const SEG = 18;
  const label = windowLabel(t, driver);
  return <Screen title={t('d41.win.deadline')} sub={label !== t('d41.win.deadline') ? label : t('d41.dd.night')} onBack={onBack}
    footer={<Pop className="d41-btn d41-btn--big is-last" onTap={onEnd} disabled={busy} sound={null}>{t('d41.dd.shut')}</Pop>}>
    <section className={'d41-dd' + (hurry ? ' is-hurry' : '')} role="timer" aria-label={t('d41.dd.left', { s: clock.sec })}>
      <span className="d41-dd__k"><i aria-hidden="true" />{hurry ? t('d41.dd.hurry') : t('d41.dd.open')}</span>
      <b className="d41-dd__n g-num" key={hurry ? clock.sec : 'n'}>{clockText(clock.ms)}</b>
      <span className="d41-dd__calls"><b className="g-num">{pub.left}</b><small>{pub.left === 1 ? t('d41.calls.leftOne') : t('d41.calls.left')}</small></span>
      <span className="d41-dd__rail" aria-hidden="true">{Array.from({ length: SEG }, (_, k) => <i key={k} className={k / SEG < frac ? 'on' : ''} />)}</span>
    </section>
    <Ticker pub={pub} driver={driver} />
    <div className="d41-grid">
      {cast.map((c, i) => <button key={i} type="button" className={'d41-tile' + (pub.calls[i] ? ' is-called' : '')} data-pick={i + 1} onClick={() => onOpen(i)}
        style={{ ['--c1' as string]: c.from.c1, ['--t1' as string]: c.to.c1 } as CSSProperties} aria-label={c.player.n + ' · ' + c.from.s + ' → ' + c.to.s}>
        <span className="d41-tile__top"><Kit club={c.from} player={c.player} size={30} /><b dir="auto">{c.player.s || c.player.n}</b></span>
        <span className="d41-tile__to" dir="auto">{t.rtl ? '←' : '→'} {c.to.s}</span>
        <StatusChip pub={pub} i={i} />
      </button>)}
    </div>
  <Hint id="deadline">{t('s41.hint.deadline')}</Hint></Screen>;
}

/** The rival ticker: one post at a time slides in. */
function Ticker({ pub, driver }: { pub: Pub4; driver: Driver4 }) {
  const t = useT();
  const [k, setK] = useState(0);
  const n = pub.feed.length;
  useEffect(() => { if (n < 2) return; const id = setInterval(() => setK((x) => x + 1), 2600); return () => clearInterval(id); }, [n]);
  const f = n ? pub.feed[k % n] : null;
  const c = f ? driver.cast[f.i] : null;
  return <div className="d41-ticker" aria-live="off">
    <span className="d41-ticker__k">{t('d41.dd.wire')}</span>
    {f && c ? <span key={k} className="d41-ticker__l" dir="auto"><b dir="ltr">{tr(t.lang, 'rival4.' + f.id)}</b> {c.player.s} <em className={'d41-o d41-o--' + OUT_KEYS[f.claim]}>{outWord4(t.lang, f.claim)}</em></span>
      : <span className="d41-ticker__l is-quiet">{t('d41.dd.noWire')}</span>}
  </div>;
}

// ---------------------------------------------------------------- day turn: the night passes, the calls refill
function DayTurn({ m, onDone }: { m: Turn; onDone: () => void }) {
  const t = useT();
  const end = useRef(onDone); end.current = onDone;
  useEffect(() => { sfx(m.dd ? 'dd.siren' : 'dm.in'); const id = setTimeout(() => end.current(), prefersReducedMotion() ? 900 : 1700); return () => clearTimeout(id); }, [m.dd]);
  return <div className={'d41-turn' + (m.dd ? ' is-dd' : '')} role="dialog" aria-modal="true" onClick={() => end.current()}>
    <small>{t('d41.turn.morning')}</small>
    <b>{m.dd ? t('d41.turn.dd') : t('d41.turn.day', { d: m.day })}</b>
    <span>{callsWord(t, m.left)}</span>
    <span>{m.posts > 1 ? t('d41.turn.posts', { n: m.posts }) : m.posts === 1 ? t('d41.turn.post1') : t('d41.turn.none')}</span>
  </div>;
}
