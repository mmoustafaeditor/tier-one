// Blurt (CONCEPT4.md §2, §6, §7, §10): the timeline app, where every window is played. One screen for the Daily, a group
// round, Practice, Story, the first window and Live (Deadline Day: one day, a 90-second clock bar). Built on the 4.0
// driver (lib/driver.ts makeDriver) and the juice primitives (ui/juice.tsx). Motion is the phone's own UI motion:
//   • a DM opens the call screen (screens/DMs.tsx CallScreen); the answer lands as a chip on the story card
//   • posting: the composer card lifts, flies into the timeline and its like/reply counters start (spring, sfx)
//   • a Drop is a square card composed and published, then flipped: the catchphrase typed on, one slam
//   • ending a day: the clock runs to morning and the timeline refreshes with the accounts' overnight posts
//   • pull to refresh; the Live clock bar
// Keyboard: 1–6 open a story (App clicks [data-pick]), Enter posts, Esc goes back (App clicks .g-top__back).
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { isV4Day, V4_FROM, type CastSaga, type Clue4, type Post4, type Pub4, type WClub } from '../lib/engine';
import { coachLine, type Driver4 } from '../lib/driver';
import { useT, fmtDate, tr } from '../lib/i18n';
import { useSave } from '../lib/save';
import { sfx, buzz, haptic } from '../lib/sfx';
import { prefersReducedMotion } from '../lib/motion';
import { onGain, toast, ymdUTC } from '../lib/meta';
import type { Gain } from '../lib/economy';
import { saysWord4, outWord4, backWord4 } from '../lib/story';
import { accountPost4 } from '../lib/banter';
import { bossNow } from '../lib/rivals';
import { catchphraseOf } from '../lib/catchphrase';
import { Icon, Kit, useTyped } from '../ui/game';
import { Crest } from '../ui/bits';
import { Pop, Count, Stamp, Sheet, SheetHead } from '../ui/juice';
import { TutorialLayer } from '../ui/tutorial';
import { CallScreen, ContactAvatar, AnswerChip, CONTACTS, CONTACT_TINT, lockLine, accWords } from './DMs';
import { ResultsThread } from './Results';
import type { Chrome } from '../App';
import '../styles/blurt.css';

const OUT_KEYS = ['signs', 'elsewhere', 'stays'] as const;
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/** Readable ink on a club colour (the linked club's chip). */
export function inkOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#fff';
  const n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#111' : '#fff';
}
export function ClubChip({ club, size = 'md' }: { club: WClub; size?: 'sm' | 'md' }) {
  return <span className={'bl-club bl-club--' + size} style={{ ['--c1' as string]: club.c1, ['--c2' as string]: club.c2, ['--ci' as string]: inkOn(club.c1) } as CSSProperties}><Crest club={club} size={size === 'sm' ? 14 : 18} /><b dir="auto">{club.s}</b></span>;
}
/** The window's name on the timeline: "Daily #41", "Practice", "Story", "Live" … */
export function windowLabel(t: ReturnType<typeof useT>, d: Driver4): string {
  switch (d.mode) {
    case 'daily': return d.no ? t('pl4.win.daily', { n: d.no }) : t('pl4.win.dailyNo');
    case 'room': return t('pl4.win.room', { n: (d.room?.round || 0) + 1 });
    case 'career': return t('pl4.win.career');
    case 'tutorial': return t('pl4.win.tutorial');
    case 'deadline': return t('pl4.win.deadline');
    case 'challenge': return t('pl4.win.challenge');
    default: return d.label || t('pl4.win.practice');
  }
}
/** The economy mode a driver's Gain arrives under (lib/meta.ts onDriverDone). */
const gainMode = (m: Driver4['mode']) => (m === 'tutorial' || m === 'challenge' ? 'practice' : m);
const errKey = (e: string | null) => 'drv4.err.' + (e && ['net', 'offline', 'rule', 'clock', 'done', 'version', 'dev'].includes(e) ? e : 'net');

// ---------------------------------------------------------------- the screen
type Fly = { i: number; o: number; s: number; k: number };
type Morning = { k: number; day: number; posts: number; dms: number; dd: boolean };
export function BlurtScreen({ driver, ...chrome }: { driver: Driver4 } & Chrome) {
  const t = useT();
  useSyncExternalStore(driver.subscribe, driver.version, driver.version);
  const [phase, setPhase] = useState<'load' | 'err' | 'play'>('load');
  const [gain, setGain] = useState<Gain | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const [calling, setCalling] = useState<{ i: number; src: string; clue: Clue4 | null; k: number } | null>(null);
  const [fly, setFly] = useState<Fly | null>(null);
  const [landed, setLanded] = useState<Record<number, number>>({});
  const [morning, setMorning] = useState<Morning | null>(null);
  const [fresh, setFresh] = useState<number>(-1);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [busy, setBusy] = useState(false);

  // The Gain the results thread reads: lib/meta.ts fires it from the driver's onDone (App passes onDriverDone).
  useEffect(() => onGain((g, m) => { if (m === gainMode(driver.mode)) setGain(g); }), [driver]);
  const load = useCallback(async () => { setPhase('load'); const p = await driver.start(); setPhase(p ? 'play' : 'err'); }, [driver]);
  useEffect(() => { void load(); }, [load]);
  // A server-held window that's over but not yet scored: fetch the result.
  const over = driver.isOver(), res = driver.result();
  useEffect(() => { if (phase === 'play' && over && !res) void driver.finish(); }, [phase, over, !!res]); // eslint-disable-line react-hooks/exhaustive-deps

  const pub = driver.pub();
  const R = driver.R, cast = driver.cast;
  const live = !!R.CLOCK_S;
  const dd = pub.day >= R.DAYS;

  // ---- actions
  const ask = async (i: number, src: string) => {
    const st = driver.askState(i, src);
    if (st === 'closed') { const so = R.SOURCES[src]; toast('info', lockLine(t.lang, src, so ? so.from : 1, R)); sfx('os.locked'); return; }
    if (st === 'broke') { toast('warn', t('pl4.st.dm0')); sfx('os.locked'); return; }
    if (st !== 'ok' || busy) return;
    const k = Date.now();
    setCalling({ i, src, clue: null, k }); buzz(12); setBusy(true);
    const clue = await driver.ask(i, src);
    setBusy(false);
    if (!clue) { setCalling(null); toast('warn', t(errKey(driver.error()))); return; }
    setCalling((c) => (c && c.k === k ? { ...c, clue } : c));
  };
  const post = async (i: number, o: number, s: number) => {
    if (busy) return;
    setBusy(true); setSheet(false);
    const ok = await driver.post(i, o, s);
    setBusy(false);
    if (!ok) { toast('warn', t(errKey(driver.error()))); return; }
    setSel(null);
    if (prefersReducedMotion()) { setLanded((l) => ({ ...l, [i]: Date.now() })); sfx(s === 2 ? 'drop' : 'post'); return; }
    setFly({ i, o, s, k: Date.now() });
  };
  const endDay = async () => {
    setConfirmEnd(false);
    if (busy) return;
    const before = pub.day, feedN = pub.feed.length;
    setBusy(true); sfx('whoosh');
    const ok = await driver.endDay();
    setBusy(false);
    if (!ok) { toast('warn', t(errKey(driver.error()))); return; }
    setSel(null);
    const p = driver.pub();
    if (p.over || driver.isOver()) return;
    const n = p.feed.length - feedN;
    setFresh(before);
    if (prefersReducedMotion()) return;
    setMorning({ k: Date.now(), day: p.day, posts: n, dms: p.left, dd: p.day >= R.DAYS });
  };
  const closeNow = async () => { setConfirmEnd(false); setBusy(true); await driver.finish(); setBusy(false); };

  // ---- keyboard: Enter opens the post sheet on a story (the sheet confirms itself)
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.defaultPrevented || sheet || calling || fly || morning) return;
      const el = e.target as HTMLElement | null; if (el && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName)) return;
      if (sel != null && driver.callState(sel) === 'ok') { e.preventDefault(); sfx('sheet.open'); setSheet(true); }
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [sel, sheet, calling, fly, morning, driver]);

  // ---- states
  const back = () => chrome.go(driver.mode === 'career' ? { n: 'story' } : driver.mode === 'room' ? { n: 'rooms' } : driver.mode === 'practice' || driver.mode === 'challenge' ? { n: 'practice' } : driver.mode === 'deadline' ? { n: 'ddlive' } : { n: 'front' });
  if (phase === 'err') {
    const e = driver.error();
    const soon = driver.mode === 'daily' && (e === 'version' || !isV4Day(ymdUTC()));
    return <div className="g-screen bl">
      <BlurtBar title={t('pl4.app.blurt')} onBack={back} />
      <section className="bl-empty">
        <h1>{soon ? t('pl4.win.soon', { d: fmtDate(Date.parse(V4_FROM + 'T12:00:00Z'), t.lang, { day: 'numeric', month: 'long' }) }) : t(errKey(e))}</h1>
        {soon && <p>{t('pl4.win.soonB')}</p>}
        <span className="bl-empty__acts">
          {!soon && <Pop className="bl-btn" onTap={load}>{t('pl4.win.retry')}</Pop>}
          <Pop className={'bl-btn' + (soon ? '' : ' bl-btn--quiet')} onTap={() => chrome.go({ n: 'play', mode: 'practice', key: Date.now() })}>{t('pl4.win.practice2')}</Pop>
        </span>
      </section>
    </div>;
  }
  if (phase === 'load' || !cast.length) return <div className="g-screen bl"><BlurtBar title={t('pl4.app.blurt')} onBack={back} /><Skeleton /></div>;
  if (over && res) return <ResultsThread driver={driver} out={res} gain={gain} chrome={chrome} />;

  const label = windowLabel(t, driver);
  const story = sel != null ? cast[sel] : null;
  return <div className={'g-screen bl' + (live ? ' is-live' : '') + (dd ? ' is-dd' : '')}>
    {story && sel != null
      ? <StoryView key={sel} driver={driver} pub={pub} i={sel} c={story} onBack={() => { sfx('ui.tap'); setSel(null); }} onAsk={(src) => ask(sel, src)} onPost={() => { sfx('sheet.open'); setSheet(true); }} />
      : <Timeline driver={driver} pub={pub} label={label} landed={landed} flying={fly ? fly.i : -1} fresh={fresh} onBack={back} onOpen={(i) => { sfx('page.turn'); setSel(i); window.scrollTo(0, 0); }} onRefresh={async () => { if (driver.remote) await driver.start(); else await new Promise((r) => setTimeout(r, 450)); }} />}

    {!story && <EndBar driver={driver} pub={pub} busy={busy} onEnd={() => (pub.left > 0 && !live ? setConfirmEnd(true) : live || dd ? closeNow() : endDay())} />}

    {sel != null && story && <PostSheet open={sheet} driver={driver} i={sel} c={story} onClose={() => setSheet(false)} onPost={(o, s) => post(sel, o, s)} />}
    <Sheet open={confirmEnd} onClose={() => setConfirmEnd(false)} label={t('pl4.end.ok')}>
      <SheetHead title={t('pl4.end.confirm', { n: pub.left })} aside={t('pl4.st.dayOf', { d: pub.day, n: R.DAYS })} onClose={() => setConfirmEnd(false)} />
      <div className="sheet__body bl-confirm"><p>{t('pl4.end.confirmB')}</p>
        <Pop className="bl-btn" onTap={() => (dd ? closeNow() : endDay())} data-autofocus="">{dd ? t('pl4.end.goLast') : t('pl4.end.ok')}</Pop>
        <Pop className="bl-btn bl-btn--quiet" onTap={() => setConfirmEnd(false)}>{t('pl4.end.keep')}</Pop></div>
    </Sheet>

    {calling && createPortal(<CallScreen key={calling.k} src={calling.src} clue={calling.clue} c={cast[calling.i]} R={R} onDone={() => setCalling(null)} />, document.body)}
    {fly && createPortal(<PostFly key={fly.k} fly={fly} c={cast[fly.i]} onLand={() => { const i = fly.i; setFly(null); setLanded((l) => ({ ...l, [i]: Date.now() })); }} />, document.body)}
    {morning && createPortal(<MorningRun key={morning.k} m={morning} onDone={() => setMorning(null)} />, document.body)}
    {driver.mode === 'tutorial' && <TutorialLayer driver={driver} story={sel} />}
  </div>;
}

// ---------------------------------------------------------------- the top of the app
function BlurtBar({ title, onBack, children }: { title: string; onBack: () => void; children?: React.ReactNode }) {
  const t = useT();
  return <header className="bl-bar">
    <button type="button" className="g-top__back bl-bar__back" onClick={() => { sfx('ui.tap'); onBack(); }} aria-label={t('os.bar.backAria')}><Icon n={t.rtl ? 'arrow' : 'back'} size={20} /></button>
    <span className="bl-bar__word">{title}</span>
    {children}
  </header>;
}
function Skeleton() { return <div className="bl-skel" aria-busy="true">{[0, 1, 2].map((k) => <i key={k} style={{ ['--k' as string]: k } as CSSProperties} />)}</div>; }

function StatusPill({ driver, pub }: { driver: Driver4; pub: Pub4 }) {
  const t = useT();
  const R = driver.R, dd = pub.day >= R.DAYS;
  const day = R.DAYS === 1 ? t('pl4.st.live') : dd ? t('pl4.st.dd') : t('pl4.st.dayOf', { d: pub.day, n: R.DAYS });
  const dms = pub.left === 0 ? t('pl4.st.dm0') : pub.left === 1 ? t('pl4.st.dm1') : t('pl4.st.dms', { n: pub.left });
  return <span className="bl-pill" role="status"><b>{day}</b><span key={pub.day + ':' + pub.left} className="bl-pill__dm">{dms}</span></span>;
}
function DayTicks({ day, days }: { day: number; days: number }) {
  if (days < 2) return null;
  return <span className="bl-ticks" aria-hidden="true">{Array.from({ length: days }, (_, k) => <i key={k} className={k + 1 < day ? 'past' : k + 1 === day ? 'now' : ''} />)}</span>;
}
/** Live: the stream clock bar. At zero the window ends, whatever was tapped (the driver enforces it too). */
function LiveBar({ driver }: { driver: Driver4 }) {
  const t = useT();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(id); }, []);
  const total = (driver.R.CLOCK_S || 90) * 1000, end = driver.clock() ?? now + total;
  const ms = Math.max(0, end - now), sec = Math.ceil(ms / 1000);
  const fired = useRef(false), tick = useRef(99);
  useEffect(() => {
    if (sec !== tick.current && ms > 0) { tick.current = sec; if (sec <= 10) { sfx('dd.tick'); buzz(8); } else if (sec <= 20) sfx('dd.heart'); }
    if (ms <= 0 && !fired.current && !driver.isOver()) { fired.current = true; sfx('dd.whistle'); void driver.finish(); }
  }, [sec, ms, driver]);
  return <div className={'bl-live' + (sec <= 15 ? ' is-hurry' : '')} role="timer" aria-label={t('pl4.st.liveS', { s: sec })}>
    <span className="bl-live__dot" aria-hidden="true" /><b>{t('pl4.live.k')}</b>
    <span className="bl-live__s g-num">{t('pl4.live.s', { s: sec })}</span>
    <span className="bl-live__bar" aria-hidden="true"><i style={{ transform: `scaleX(${(ms / total).toFixed(4)})` }} /></span>
  </div>;
}

// ---------------------------------------------------------------- the timeline
function Timeline({ driver, pub, label, landed, flying, fresh, onOpen, onBack, onRefresh }: { driver: Driver4; pub: Pub4; label: string; landed: Record<number, number>; flying: number; fresh: number; onOpen: (i: number) => void; onBack: () => void; onRefresh: () => Promise<void> }) {
  const t = useT();
  const s = useSave();
  const R = driver.R, cast = driver.cast;
  const boss = driver.mode === 'career' ? bossNow() : null;
  const pull = usePull(onRefresh);
  const days = Array.from({ length: Math.min(pub.day, R.DAYS) }, (_, k) => Math.min(pub.day, R.DAYS) - k);
  const handle = '@' + (s.nick || t('pl4.tl.you'));
  return <div className="bl-tl" {...pull.bind}>
    <div className={'bl-pull is-' + pull.state} style={{ ['--pull' as string]: pull.dy } as CSSProperties} aria-hidden={pull.state === 'idle'}><i /><span>{t(pull.state === 'ready' ? 'pl4.pull.release' : pull.state === 'busy' ? 'pl4.pull.fresh' : 'pl4.pull.pull')}</span></div>
    <BlurtBar title={t('pl4.app.blurt')} onBack={onBack}><StatusPill driver={driver} pub={pub} /></BlurtBar>
    {R.CLOCK_S ? <LiveBar driver={driver} /> : null}
    <section className="bl-win" aria-label={label}>
      <div className="bl-win__h"><span className="bl-win__k">{t('pl4.tl.pinned')}</span><h1 className="bl-win__t" dir="auto">{label}</h1><DayTicks day={pub.day} days={R.DAYS} /></div>
      {boss && <BossStrip />}
      <div className="bl-stories">{cast.map((c, i) => <StoryCard key={i} i={i} c={c} pub={pub} driver={driver} landed={landed[i]} onOpen={() => onOpen(i)} />)}</div>
    </section>
    <section className="bl-feed" aria-label={t('pl4.app.blurt')}>
      {days.map((d) => {
        const mine = pub.calls.map((cl, i) => (cl && cl.day === d ? i : -1)).filter((i) => i >= 0).reverse();
        const night = pub.feed.filter((f) => (R.DAYS === 1 ? f.day === 0 : f.day === d - 1 && d > 1));
        if (!mine.length && !night.length) return null;
        return <div key={d} className="bl-day">
          <h2 className="bl-day__h">{R.DAYS === 1 ? t('pl4.tl.already') : d >= R.DAYS ? t('pl4.tl.dd') : t('pl4.tl.today', { d })}{night.length > 0 && R.DAYS > 1 && <small> · {t('pl4.tl.overnight')}</small>}</h2>
          {mine.map((i) => <YourPost key={'y' + i} i={i} c={cast[i]} o={pub.calls[i]!.o} s={pub.calls[i]!.s} handle={handle} pending={flying === i} landed={landed[i]} onOpen={() => onOpen(i)} />)}
          {night.map((f, k) => <AccountPost key={'a' + f.i + f.id} f={f} c={cast[f.i]} seed={driver.seed} fresh={fresh === d - 1} k={k} onOpen={() => onOpen(f.i)} />)}
        </div>;
      })}
      {!pub.feed.length && !pub.calls.some(Boolean) && <p className="bl-quiet">{t('pl4.tl.empty')}</p>}
    </section>
  </div>;
}

function BossStrip() {
  const t = useT();
  const b = bossNow(); if (!b) return null;
  return <div className="bl-boss" style={{ ['--av' as string]: CONTACT_TINT[b.id] || '#888' } as CSSProperties}>
    <ContactAvatar src={b.id} size={34} />
    <span className="bl-boss__b"><small>{t('pl4.boss.k')}</small><b dir="auto">{b.handle}</b>{b.acc != null && <small>{t('pl4.boss.acc', { n: b.acc })}</small>}</span>
    <span className="bl-boss__h2h g-num" aria-label={t('pl4.boss.vs', { a: b.you, b: b.them, who: b.handle })}><b>{b.you}</b><i>·</i><b>{b.them}</b></span>
  </div>;
}

/** A story as a big card: the player, his club → the linked club in club colours, and its state at a glance. */
function StoryCard({ i, c, pub, driver, landed, onOpen }: { i: number; c: CastSaga; pub: Pub4; driver: Driver4; landed?: number; onOpen: () => void }) {
  const t = useT();
  const clues = pub.clues[i] || [], call = pub.calls[i], posts = pub.feed.filter((f) => f.i === i);
  const state = call ? 'posted' : clues.length ? 'read' : 'cold';
  return <button type="button" className={'bl-story is-' + state + (call && call.s === 2 ? ' is-drop' : '')} data-pick={i + 1} data-tut={'story-' + i} onClick={onOpen}
    style={{ ['--c1' as string]: c.from.c1, ['--c2' as string]: c.from.c2, ['--t1' as string]: c.to.c1, ['--t2' as string]: c.to.c2, ['--ti' as string]: inkOn(c.to.c1) } as CSSProperties}
    aria-label={c.player.n + ' · ' + c.from.s + ' → ' + c.to.s}>
    <span className="bl-story__edge" aria-hidden="true" />
    <Kit club={c.from} player={c.player} size={54} />
    <span className="bl-story__b">
      <span className="bl-story__n" dir="auto">{c.player.s || c.player.n}</span>
      <span className="bl-story__r"><span className="bl-story__from" dir="auto">{c.from.s}</span><Icon n={t.rtl ? 'back' : 'arrow'} size={14} /><ClubChip club={c.to} size="sm" /></span>
      <span className="bl-story__st">
        {state === 'cold' && <span className="bl-story__cold">{t('pl4.card.noDm')}</span>}
        {clues.map((cl, k) => <AnswerChip key={cl.src + k} clue={cl} lang={t.lang} size="sm" />)}
        {!call && posts.length > 0 && <span className="bl-story__acc">{t('pl4.card.accounts', { n: posts.length })}</span>}
      </span>
    </span>
    {call ? <span key={landed || 0} className={'bl-story__stamp bl-o--' + OUT_KEYS[call.o] + (landed ? ' is-slam' : '')}><b>{outWord4(t.lang, call.o)}</b><small>{backWord4(t.lang, call.s)}</small></span>
      : <span className="bl-story__go"><Icon n={t.rtl ? 'back' : 'arrow'} size={20} /></span>}
    {driver.coach && !call && <CoachTag p={driver.coach(i)} />}
  </button>;
}
function CoachTag({ p }: { p: number[] }) {
  const t = useT();
  const c = coachLine(t.lang, p);
  return <span className="bl-coach">{t('coach4.name')} · {outWord4(t.lang, c.o)} · {c.words}</span>;
}

/** An account's overnight post: avatar, handle, accuracy, the line and the ending it claims. */
function AccountPost({ f, c, seed, fresh, k, onOpen }: { f: Post4; c?: CastSaga; seed: string; fresh: boolean; k: number; onOpen: () => void }) {
  const t = useT();
  if (!c) return null;
  return <article className={'bl-post bl-post--acct' + (fresh ? ' is-fresh' : '')} style={{ ['--k' as string]: k, ['--av' as string]: CONTACT_TINT[f.id] } as CSSProperties}>
    <ContactAvatar src={f.id} size={40} />
    <div className="bl-post__b">
      <div className="bl-post__h"><b dir="ltr">{t('rival4.' + f.id)}</b><small>{t('rival4.right.' + f.id)}</small></div>
      <p dir="auto">{accountPost4(t.lang, f.id, f.claim, c, seed)}</p>
      <button type="button" className={'bl-post__tag bl-o--' + OUT_KEYS[f.claim]} onClick={onOpen}><b>{outWord4(t.lang, f.claim)}</b><span dir="auto">{c.player.s}</span></button>
    </div>
  </article>;
}

/** Your post on the timeline. A Drop is a big card; its counters start once it has landed. */
function YourPost({ i, c, o, s, handle, pending, landed, onOpen }: { i: number; c: CastSaga; o: number; s: number; handle: string; pending: boolean; landed?: number; onOpen: () => void }) {
  const t = useT();
  const text = (t.list('pl4.say') as string[][] | undefined)?.[s]?.[o] || '';
  const line = text.replace('{p}', c.player.s).replace('{to}', c.to.s);
  const seed = handle + c.player.id + o + s;
  const goal = [60, 240, 900][s] + (hash(seed) % [140, 400, 1600][s]);
  const likes = useTick(goal, !pending, landed);
  const reps = Math.round(likes * 0.11);
  return <article className={'bl-post bl-post--me' + (s === 2 ? ' is-drop' : '') + (pending ? ' is-pending' : '') + (landed ? ' is-landed' : '')} data-post={i}>
    <span className="bl-me-av" aria-hidden="true">{handle.slice(1, 3).toUpperCase()}</span>
    <div className="bl-post__b">
      <div className="bl-post__h"><b dir="auto">{handle}</b><small>{backWord4(t.lang, s)}</small></div>
      {s === 2 ? <DropFace c={c} o={o} handle={handle} onOpen={onOpen} /> : <p dir="auto">{line}</p>}
      {s < 2 && <button type="button" className={'bl-post__tag bl-o--' + OUT_KEYS[o]} onClick={onOpen}><b>{outWord4(t.lang, o)}</b><span dir="auto">{c.player.s}</span></button>}
      <div className="bl-post__ct" aria-label={t('pl4.tl.likes', { n: likes }) + ' · ' + t('pl4.tl.replies', { n: reps })}>
        <span><Icon n="heart" size={15} /><Count n={likes} /></span><span><Icon n="reply" size={15} /><Count n={reps} /></span><span><Icon n="repost" size={15} /><Count n={Math.round(likes * 0.06)} /></span>
      </div>
    </div>
  </article>;
}
/** Counters that start at zero when a post lands and climb to their figure (transforms only: <Count> rolls digits). */
function useTick(goal: number, on: boolean, landed?: number) {
  const [v, setV] = useState(landed || !on ? 0 : goal);
  useEffect(() => {
    if (!on) return;
    if (!landed || prefersReducedMotion()) { setV(goal); return; }
    setV(0); let k = 0;
    const id = setInterval(() => { k++; setV(Math.round(goal * (1 - Math.pow(0.62, k)))); if (k >= 9) { setV(goal); clearInterval(id); } }, 650);
    return () => clearInterval(id);
  }, [goal, on, landed]);
  return v;
}
/** The Drop card (the Instagram-style square): club-colour field, the surname big, the ending stamped. */
function DropFace({ c, o, handle, onOpen, back }: { c: CastSaga; o: number; handle: string; onOpen?: () => void; back?: boolean }) {
  const t = useT();
  const club = o === 2 ? c.from : c.to;
  return <button type="button" className={'bl-drop' + (back ? ' is-back' : '')} onClick={onOpen} style={{ ['--c1' as string]: club.c1, ['--c2' as string]: club.c2, ['--ci' as string]: inkOn(club.c1) } as CSSProperties} tabIndex={onOpen ? 0 : -1}>
    <span className="bl-drop__grain" aria-hidden="true" />
    <span className="bl-drop__k">{t('back4.allin')} · {handle}</span>
    <span className="bl-drop__n" dir="auto">{c.player.s || c.player.n}</span>
    <span className={'bl-drop__o bl-o--' + OUT_KEYS[o]}>{outWord4(t.lang, o)}</span>
    <span className="bl-drop__c" dir="auto">{o === 0 ? c.to.n || c.to.s : o === 2 ? c.from.n || c.from.s : t('pl4.out.elsewhereC', { to: c.to.s })}</span>
  </button>;
}

// ---------------------------------------------------------------- the end-of-day bar: one obvious action
function EndBar({ driver, pub, busy, onEnd }: { driver: Driver4; pub: Pub4; busy: boolean; onEnd: () => void }) {
  const t = useT();
  const R = driver.R, dd = pub.day >= R.DAYS, last = R.DAYS === 1 || dd;
  const lab = last ? t('pl4.end.goLast') : pub.day === R.DAYS - 1 ? t('pl4.end.goDD') : t('pl4.end.go', { d: pub.day });
  return <div className="bl-endbar"><Pop className={'bl-btn bl-btn--end' + (last ? ' is-last' : '')} onTap={onEnd} disabled={busy} sound="whoosh" data-tut="end-day"><Icon n={last ? 'clock' : 'moon'} size={20} />{lab}</Pop></div>;
}

// ---------------------------------------------------------------- one story
function StoryView({ driver, pub, i, c, onBack, onAsk, onPost }: { driver: Driver4; pub: Pub4; i: number; c: CastSaga; onBack: () => void; onAsk: (src: string) => void; onPost: () => void }) {
  const t = useT();
  const R = driver.R;
  const clues = pub.clues[i] || [], call = pub.calls[i], posts = pub.feed.filter((f) => f.i === i);
  const cs = driver.callState(i);
  return <div className="bl-sv" style={{ ['--c1' as string]: c.from.c1, ['--c2' as string]: c.from.c2, ['--t1' as string]: c.to.c1, ['--ti' as string]: inkOn(c.to.c1) } as CSSProperties}>
    <header className="bl-bar">
      <button type="button" className="g-top__back bl-bar__back" onClick={onBack} aria-label={t('pl4.story.back')}><Icon n={t.rtl ? 'arrow' : 'back'} size={20} /><span>{t('pl4.story.back')}</span></button>
      <StatusPill driver={driver} pub={pub} />
    </header>
    {R.CLOCK_S ? <LiveBar driver={driver} /> : null}
    <section className="bl-sv__hero">
      <Kit club={c.from} player={c.player} size={72} />
      <div><h1 className="bl-sv__n" dir="auto">{c.player.n}</h1><span className="bl-story__r"><span className="bl-story__from" dir="auto">{c.from.s}</span><Icon n={t.rtl ? 'back' : 'arrow'} size={14} /><ClubChip club={c.to} /></span></div>
    </section>

    <h2 className="bl-sec">{t('pl4.story.ask')}</h2>
    <div className="bl-asks" role="list">
      {CONTACTS.map((src) => {
        const st = driver.askState(i, src), so = R.SOURCES[src];
        const sub = st === 'asked' ? t('pl4.story.asked') : st === 'closed' ? (so && so.from >= R.DAYS && R.DAYS > 1 ? t('pl4.story.lockDD') : t('pl4.story.lock', { d: so ? so.from : 1 })) : st === 'broke' ? t('pl4.story.broke') : so && so.cost ? t('pl4.story.dm') : t('pl4.story.free');
        return <Pop key={src} as="button" role="listitem" className={'bl-ask is-' + st} onTap={() => onAsk(src)} disabled={st === 'asked' || st === 'over' || st === 'none'} sound={st === 'ok' ? 'ui.tap' : null} data-tut={'dm-' + src} label={t('src4.name.' + src) + ' · ' + sub} title={accWords(t.lang, R, src)}>
          <ContactAvatar src={src} size={46} />
          <b dir="auto">{t('src4.name.' + src).replace(/^(The|El|La)\s+/i, '')}</b><small>{sub}</small>
        </Pop>;
      })}
    </div>

    <h2 className="bl-sec">{t('pl4.story.know')}</h2>
    {clues.length || posts.length ? <ul className="bl-know">
      {clues.map((cl, k) => <li key={'c' + k} className="bl-know__i" style={{ ['--av' as string]: CONTACT_TINT[cl.src] } as CSSProperties}><ContactAvatar src={cl.src} size={30} /><span><b>{saysWord4(t.lang, cl.src, cl.r)}</b><small dir="auto">{t('src4.name.' + cl.src)} · {t('day4.n', { d: cl.day })}</small></span></li>)}
      {posts.map((f, k) => <li key={'p' + k} className="bl-know__i bl-know__i--acct" style={{ ['--av' as string]: CONTACT_TINT[f.id] } as CSSProperties}><ContactAvatar src={f.id} size={30} /><span><b>{outWord4(t.lang, f.claim)}</b><small dir="ltr">{t('rival4.' + f.id)} · {t('rival4.right.' + f.id)}</small></span></li>)}
    </ul> : <p className="bl-quiet">{t('pl4.story.nothing')}</p>}
    {driver.coach && !call && <p className="bl-sv__coach"><CoachTag p={driver.coach(i)} /></p>}

    <div className="bl-sv__foot">
      {call ? <p className="bl-sv__done"><span className={'bl-story__stamp bl-o--' + OUT_KEYS[call.o]}><b>{outWord4(t.lang, call.o)}</b><small>{backWord4(t.lang, call.s)}</small></span>{t('pl4.story.done')}</p>
        : <>
          {cs === 'nosource' && <p className="bl-sv__hint">{t('pl4.story.needDm')}</p>}
          {cs === 'over' && <p className="bl-sv__hint">{t('pl4.story.over')}</p>}
          <Pop className="bl-btn bl-btn--post" onTap={onPost} disabled={cs !== 'ok'} sound="sheet.open" data-tut="post" data-primary=""><Icon n="pen" size={20} />{t('pl4.story.post')}</Pop>
        </>}
    </div>
  </div>;
}

// ---------------------------------------------------------------- the post sheet: ending, loudness, the deal in a sentence
function PostSheet({ open, driver, i, c, onClose, onPost }: { open: boolean; driver: Driver4; i: number; c: CastSaga; onClose: () => void; onPost: (o: number, s: number) => void }) {
  const t = useT();
  const [o, setO] = useState<number | null>(null);
  const [s, setS] = useState(0);
  useEffect(() => { if (open) { setO(null); setS(0); } }, [open]);
  const pv = o != null ? driver.preview(i, o, s) : null;
  const scoopWho = o != null ? driver.pub().feed.find((f) => f.i === i && f.claim === o) : undefined;
  const go = () => { if (o == null) return; haptic('publish'); onPost(o, s); };
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Enter' && o != null) { e.preventDefault(); go(); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }); // re-bound each render so it sees the current pick
  const sub = (k: number) => k === 0 ? t('pl4.out.signsC', { to: c.to.s }) : k === 1 ? t('pl4.out.elsewhereC', { to: c.to.s }) : t('pl4.out.staysC', { from: c.from.s });
  return <Sheet open={open} onClose={onClose} label={t('pl4.sheet.title')} className="bl-sheet">
    <SheetHead title={c.player.n} kicker={t('pl4.sheet.title')} aside={driver.R.DAYS > 1 ? t('pl4.st.dayOf', { d: driver.pub().day, n: driver.R.DAYS }) : t('pl4.st.live')} onClose={onClose} />
    <div className="sheet__body bl-ps">
      <h3 className="bl-ps__h">{t('pl4.sheet.how')}</h3>
      <div className="bl-ps__outs" role="radiogroup" aria-label={t('pl4.sheet.how')}>
        {OUT_KEYS.map((k, n) => <Pop key={k} role="radio" aria-checked={o === n} className={'bl-out bl-o--' + k + (o === n ? ' is-on' : '')} onTap={() => setO(n)} data-tut={'how-' + n} style={n === 0 ? { ['--oc' as string]: c.to.c1, ['--oi' as string]: inkOn(c.to.c1) } as CSSProperties : n === 2 ? { ['--oc' as string]: c.from.c1, ['--oi' as string]: inkOn(c.from.c1) } as CSSProperties : undefined}>
          <b>{outWord4(t.lang, n)}</b><small dir="auto">{sub(n)}</small>
        </Pop>)}
      </div>
      <h3 className="bl-ps__h">{t('pl4.sheet.loud')}</h3>
      <div className="bl-ps__louds" role="radiogroup" aria-label={t('pl4.sheet.loud')}>
        {[0, 1, 2].map((n) => <Pop key={n} role="radio" aria-checked={s === n} className={'bl-loud' + (s === n ? ' is-on' : '') + (n === 2 ? ' is-drop' : '')} onTap={() => setS(n)} data-tut={'loud-' + n}>
          <b>{backWord4(t.lang, n)}</b><span className="g-num">{t('back4.' + ['x1D', 'x2D', 'allinD'][n])}</span><small>{(t.list('pl4.sheet.sure') as string[])[n]}</small>
        </Pop>)}
      </div>
      <div className={'bl-deal' + (pv ? '' : ' is-empty')} aria-live="polite">
        {pv && o != null ? <>
          <p className="bl-deal__line" dir="auto">{(t.list('pl4.deal') as string[])[o].replace('{w}', String(pv.win)).replace('{l}', String(Math.abs(pv.lose))).replace('{to}', c.to.s)}</p>
          <p className="bl-deal__sub">{s === 2 ? (pv.scoop ? t('pl4.sheet.scoopOn', { out: outWord4(t.lang, o) }) : t('pl4.sheet.scoopOff', { who: scoopWho ? tr(t.lang, 'rival4.' + scoopWho.id) : '', out: outWord4(t.lang, o) })) : t('pl4.sheet.scoopNa')}{pv.early > 0 ? ' ' + t('pl4.sheet.early', { n: pv.early }) : ''}</p>
        </> : <p className="bl-deal__sub">{t('pl4.sheet.pick')}</p>}
      </div>
      <Pop className={'bl-btn bl-btn--post' + (s === 2 ? ' is-drop' : '')} onTap={go} disabled={o == null} sound={null} data-tut="publish" data-autofocus="">{(t.list('pl4.sheet.go') as string[])[s]}</Pop>
      <p className="bl-ps__final">{t('pl4.sheet.final')}</p>
    </div>
  </Sheet>;
}

// ---------------------------------------------------------------- posting: the composer lifts, flies, lands
// Hint / Post: the composer card rises from where the sheet was, lifts, and flies into its slot on the timeline (FLIP on
// transforms). Drop: a square card is composed (field, name, ending), published (a bar fills), flipped to its back
// (the catchphrase typed on, one slam), then flies. Tap skips to the flight.
function PostFly({ fly, c, onLand }: { fly: Fly; c: CastSaga; onLand: () => void }) {
  const t = useT();
  const s = useSave();
  const ref = useRef<HTMLDivElement>(null);
  const drop = fly.s === 2;
  const [step, setStep] = useState(0); // drop: 0 field · 1 name · 2 ending · 3 publishing · 4 flipped · 5 flying; post: 0 up · 1 lift · 5 flying
  const done = useRef(false);
  const phrase = catchphraseOf().text;
  const typed = useTyped(phrase, 22, step >= 4);
  const handle = '@' + (s.nick || t('pl4.tl.you'));
  const line = ((t.list('pl4.say') as string[][] | undefined)?.[fly.s]?.[fly.o] || '').replace('{p}', c.player.s).replace('{to}', c.to.s);
  useEffect(() => {
    const plan = drop ? [[1, 260], [2, 620], [3, 980], [4, 1700], [5, 3000]] as const : [[1, 160], [5, 520]] as const;
    sfx(drop ? 'type' : 'post');
    const ids = plan.map(([st, ms]) => setTimeout(() => setStep((x) => Math.max(x, st)), ms));
    return () => ids.forEach(clearTimeout);
  }, [drop]);
  useEffect(() => {
    if (step === 2 && drop) sfx('thock');
    if (step === 3 && drop) sfx('whoosh');
    if (step === 4 && drop) { sfx('reveal'); haptic('stamp'); }
    if (step !== 5 || done.current) return;
    done.current = true;
    const el = ref.current, target = document.querySelector<HTMLElement>(`[data-post="${fly.i}"]`);
    if (!el || !target) { onLand(); return; }
    target.scrollIntoView({ block: 'center', behavior: 'auto' });
    const a = el.getBoundingClientRect(), b = target.getBoundingClientRect();
    const sc = Math.max(0.3, Math.min(1.2, b.width / Math.max(1, a.width)));
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const anim = el.animate([{ transform: 'translate(0,0) scale(1.04)', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(${sc})`, opacity: 0.6 }], { duration: 480, easing: 'cubic-bezier(.34,1.2,.64,1)', fill: 'forwards' });
    anim.onfinish = () => { sfx('ui.pop'); buzz(14); onLand(); };
    return () => { anim.onfinish = null; };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
  const skip = () => setStep((x) => (x < 4 && drop ? 4 : 5));
  return <div className="bl-fly" role="dialog" aria-modal="true" aria-label={t('pl4.sheet.title')} onClick={skip}>
    <div ref={ref} className={'bl-fly__card' + (drop ? ' is-drop' : '') + ' st-' + step}>
      {drop ? <div className="bl-flip">
        <div className="bl-flip__f"><DropFace c={c} o={fly.o} handle={handle} />{step >= 3 && <span className="bl-fly__pub"><i /><small>{t('pl4.sheet.publishing')}</small></span>}</div>
        <div className="bl-flip__b" style={{ ['--c1' as string]: (fly.o === 2 ? c.from : c.to).c1, ['--ci' as string]: inkOn((fly.o === 2 ? c.from : c.to).c1) } as CSSProperties}>
          <span className="bl-flip__q" dir="auto">{typed}<i className="dm-call__caret" aria-hidden="true" /></span>
          {step >= 4 && typed.length >= phrase.length && <Stamp text={phrase} tone="gold" size="lg" />}
          <span className="bl-flip__who">{handle}</span>
        </div>
      </div> : <article className="bl-post bl-post--me bl-post--fly">
        <span className="bl-me-av" aria-hidden="true">{handle.slice(1, 3).toUpperCase()}</span>
        <div className="bl-post__b"><div className="bl-post__h"><b dir="auto">{handle}</b><small>{backWord4(t.lang, fly.s)}</small></div><p dir="auto">{line}</p>
          <span className={'bl-post__tag bl-o--' + OUT_KEYS[fly.o]}><b>{outWord4(t.lang, fly.o)}</b><span dir="auto">{c.player.s}</span></span></div>
      </article>}
    </div>
  </div>;
}

// ---------------------------------------------------------------- night to morning: the clock runs, the feed refreshes
function MorningRun({ m, onDone }: { m: Morning; onDone: () => void }) {
  const t = useT();
  const [min, setMin] = useState(23 * 60 + 41);
  const [stage, setStage] = useState(0);
  const end = useRef(onDone); end.current = onDone;
  useEffect(() => {
    const from = 23 * 60 + 41, to = 24 * 60 + 7 * 60, t0 = performance.now(), ms = 1100;
    let raf = 0;
    const step = (now: number) => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); setMin(Math.round(from + (to - from) * e)); if (k < 1) raf = requestAnimationFrame(step); else { setStage(1); sfx(m.dd ? 'dd.siren' : 'dm.in'); } };
    raf = requestAnimationFrame(step);
    const out = setTimeout(() => setStage(2), 2100), fin = setTimeout(() => end.current(), 2450);
    return () => { cancelAnimationFrame(raf); clearTimeout(out); clearTimeout(fin); };
  }, [m.dd]);
  const hh = Math.floor(min / 60) % 24, mm = min % 60;
  return <div className={'bl-night st-' + stage} role="dialog" aria-modal="true" aria-label={t('pl4.end.morning')} onClick={() => end.current()}>
    <span className="bl-night__clock g-num">{String(hh).padStart(2, '0')}:{String(mm).padStart(2, '0')}</span>
    {stage >= 1 && <div className="bl-night__b">
      <b>{m.dd ? t('pl4.st.dd') : t('pl4.end.morning') + ' · ' + t('day4.n', { d: m.day })}</b>
      <span>{m.posts > 1 ? t('pl4.end.fresh', { n: m.posts }) : m.posts === 1 ? t('pl4.end.fresh1') : t('pl4.end.none')}</span>
      <span className="bl-night__dm">{t('pl4.end.refill', { n: m.dms })}</span>
    </div>}
    <small className="bl-night__skip">{t('pl4.end.skip')}</small>
  </div>;
}

// ---------------------------------------------------------------- pull to refresh (touch; the page scroller is the window)
function usePull(onRefresh: () => Promise<void>) {
  const [dy, setDy] = useState(0);
  const [state, setState] = useState<'idle' | 'pull' | 'ready' | 'busy'>('idle');
  const y0 = useRef<number | null>(null);
  const bind = useMemo(() => ({
    onTouchStart: (e: React.TouchEvent) => { if (window.scrollY <= 0 && state !== 'busy') y0.current = e.touches[0].clientY; },
    onTouchMove: (e: React.TouchEvent) => { if (y0.current == null) return; const d = Math.max(0, Math.min(110, (e.touches[0].clientY - y0.current) * 0.55)); setDy(d); setState(d > 64 ? 'ready' : d > 4 ? 'pull' : 'idle'); },
    onTouchEnd: async () => {
      if (y0.current == null) return; y0.current = null;
      if (state === 'ready') { setState('busy'); setDy(56); sfx('ui.tap'); try { await onRefresh(); } finally { sfx('ui.pop'); setTimeout(() => { setState('idle'); setDy(0); }, 350); } }
      else { setState('idle'); setDy(0); }
    },
  }), [state, onRefresh]);
  return { dy, state, bind };
}

