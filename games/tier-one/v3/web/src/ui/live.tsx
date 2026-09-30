// The editor's desk on screen (GOTY.md §7.1–7.2). Drop-ins for the other lanes:
//   Home     <NextUp go={go}/>  <DDLiveBanner go={go}/>  <StreakStake go={go}/>     (the morning papers mount in App.tsx)
//   Me       <StyleCard/>
//   Window   <DailyBriefSheet view={view} go={go}/>  <DDLiveTicker go={go}/>         (already wired, additive)
// Logic lives in lib/desk.ts, lib/live.ts and lib/style.ts; this file only draws it.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useSave, getSave, type Save } from '../lib/save';
import { useT, fmtDate, num, resetAt, type T } from '../lib/i18n';
import { sfx, buzz } from '../lib/sfx';
import { v3 } from '../lib/api';
import type { Go, Route } from '../App';
import type { View } from '../lib/driver';
import { OUTS } from '../lib/engine';
import { useWire } from '../lib/wireData';
import { markRead, unreadOf, type FeedItem } from '../lib/byline';
import { playScene, afterScenes, firstToday } from '../lib/scenes';
import { assignments, morningPaper, markPaperSeen, touchDesk, streakStake, briefSeenToday, markBriefSeen, leadAssignment, type Assignment, type DeskCtx, type Paper } from '../lib/desk';
import { ddLiveActive, ddResultsDue, ddCountdown, hms, presence, fetchDDBoard, fetchDDTally, ddMark, markDD, myDDCalls, DD_OUT, type DDBoard, type DDTally } from '../lib/live';
import { styleOf, STYLE_MIN } from '../lib/style';
import { Icon, GBtn, Kit } from './game';
import { Sheet, useNow, Crest } from './bits';
import { FeedRow, RivalMark, feedText, navTo } from './connect';
import '../styles/live.css';

const KIND_IC: Record<string, string> = { ddlive: 'clock', ddresults: 'trophy', daily: 'phone', resume: 'uturn', wire: 'wire', career: 'story', room: 'friends', wireSettling: 'wire', mission: 'gift', practice: 'target' };
const KIND_BTN: Record<string, '' | 'gold' | 'dark' | 'paper' | 'green' | 'ghost'> = { ddlive: '', daily: '', mission: 'gold', ddresults: 'dark', resume: 'dark', wire: 'dark', career: 'dark', room: 'dark', wireSettling: 'dark', practice: 'dark' };
const nav = (go: Go, a: Assignment) => { if (a.feedId) markRead([a.feedId]); go(a.to.n === 'play' ? { ...a.to, key: Date.now() } as Route : a.to); };
export const editorName = (t: T) => t('g.story.from.editor');

// ---------- what the desk knows from elsewhere: the Wire cache and the rooms with a round open
let roomsCache: { at: number; open: number; code?: string } | null = null;
export function useDeskCtx(): DeskCtx {
  const w = useWire(); const s = useSave();
  const [rooms, setRooms] = useState(roomsCache);
  useEffect(() => {
    if (!s.rooms.length || (roomsCache && Date.now() - roomsCache.at < 10 * 60e3)) return;
    let live = true;
    (async () => {
      let open = 0, code: string | undefined;
      for (const r of s.rooms.slice(0, 4)) {
        const x = await v3<{ room: { created: number; rounds: number; roundHours: number; players: { pid: string; results: unknown[] }[] } }>('room.get', { code: r.code }, 6000);
        if (!x.ok) continue;
        const me = x.room.players.find((p) => p.pid === r.pid), now = Date.now();
        for (let k = 0; k < x.room.rounds; k++) { const o = x.room.created + k * 864e5; if (now >= o && now <= o + x.room.roundHours * 3600e3 && !(me && me.results[k])) { open++; code = code || r.code; } }
      }
      roomsCache = { at: Date.now(), open, code };
      if (live) setRooms(roomsCache);
    })();
    return () => { live = false; };
  }, [s.rooms.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return useMemo(() => ({ wire: w.mine ? { calls: w.mine.calls, board: w.board } : null, roomsOpen: rooms?.open || 0, roomCode: rooms?.code }), [w.mine, w.board, rooms]);
}
function assignSub(t: T, a: Assignment) {
  const v: Record<string, string | number> = { ...(a.v || {}) };
  if (v.m) v.m = t('cn.mode.' + v.m);
  if (a.kind === 'daily' && v.d) return t('live.desk.s.dailyResume', v);
  if (a.kind === 'room' && v.n) return t('live.desk.s.roomOpen', v);
  return t('live.desk.s.' + a.kind, v);
}
const voiceOf = (t: T, a: Assignment) => { const l = t.list('live.desk.voice.' + a.kind) as string[] | undefined; return l && l.length ? l[a.voice % l.length] : ''; };

// ---------- Home: the queue
export function NextUp({ go, style, max = 3, full }: { go: Go; style?: CSSProperties; max?: number; full?: boolean }) {
  const t = useT(); const s = useSave(); const ctx = useDeskCtx();
  const now = useNow(60e3);
  const list = useMemo(() => assignments(s, now, ctx).slice(0, max), [s, now, ctx, max]);
  return <section className={'lv-desk' + (full ? ' lv-desk--full' : '')} style={style} aria-labelledby="lv-desk-h">
    <header className="lv-desk__h">
      <span className="lv-desk__tape" aria-hidden="true" />
      <div><span className="g-mono lv-desk__k">{t('live.desk.k')}</span><h2 id="lv-desk-h">{t('live.desk.title')}</h2></div>
      <span className="lv-desk__ed"><Icon n="pen" size={14} />{editorName(t)}</span>
    </header>
    {list.length ? <ol className="lv-desk__list">{list.map((a, k) => <li key={a.kind + k} className={'lv-asg lv-asg--' + a.kind + (k === 0 ? ' is-lead' : '') + (a.hot ? ' is-hot' : '')} style={{ ['--i' as string]: k }}>
      <span className="lv-asg__n" aria-hidden="true"><Icon n={KIND_IC[a.kind] || 'news'} size={18} /></span>
      <div className="lv-asg__b">
        <b className="lv-asg__t">{t('live.desk.t.' + a.kind)}{a.kind === 'ddlive' && <span className="lv-live"><i />{t('live.dd.live')}</span>}</b>
        <p className="lv-asg__s">{assignSub(t, a)}</p>
        {k === 0 && <p className="lv-asg__voice" dir="auto">“{voiceOf(t, a)}”</p>}
      </div>
      <GBtn size="sm" kind={KIND_BTN[a.kind] || 'dark'} sound="open" onClick={() => nav(go, a)}>{t('live.desk.b.' + a.kind)}</GBtn>
    </li>)}</ol> : <p className="lv-desk__clear">{t('live.desk.clear')}</p>}
  </section>;
}

// ---------- the morning papers (mount once in App.tsx; shows itself on Home, first open of the day)
export function MorningPapers({ route }: { route: string }) {
  const t = useT(); const s = useSave(); const ctx = useDeskCtx();
  const [paper, setPaper] = useState<Paper | null>(null);
  const armed = useRef('');
  // The route as of now: the page swap can land a frame after this effect ran (view transitions), and onboarding flips
  // `onboarded` while Home is still the route, so the paper only opens if the desk is still where the player is.
  const routeRef = useRef(route); routeRef.current = route;
  useEffect(() => {
    if (route !== 'front' || !s.onboarded || paper) return;
    touchDesk();
    const p = morningPaper(getSave(), Date.now(), ctx);
    const day = p?.day || '';
    if (!p || armed.current === day) return;
    armed.current = day;
    // Never stack on another film (the prologue, a moment): wait it out, then check the desk is still on screen.
    afterScenes(() => {
      if (routeRef.current !== 'front') { armed.current = ''; return; }
      const hed = paperHed(t, p, getSave());
      playScene(firstToday('paper') ? 'paper' : 'paper-short', { hed, what: t('live.paper.k') });
      afterScenes(() => { if (routeRef.current === 'front') setPaper(p); else armed.current = ''; });
    });
  }, [route, s.onboarded]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = useCallback(() => { markPaperSeen(); setPaper(null); }, []);
  if (!paper) return null;
  return <MorningPaperSheet paper={paper} onClose={close} />;
}
function paperHed(t: T, p: Paper, s: Save) {
  // The welcome-back note is its own box, so its headline moves on to the news; the slot line waits for a normal day.
  if (p.dd) return t('live.paper.hedDD');
  if (p.stake.lost && !p.welcome) return t('live.paper.hedSlot', { r: t('rival.' + p.stake.lost.by) });
  const wire = p.items.find((f) => f.kind === 'wire');
  if (wire && wire.v?.p) return t('live.paper.hedWire', { p: wire.v.p });
  if (p.rank) return t('live.paper.hedRank', { n: p.rank.no, tier: t('tier.' + p.rank.tier) });
  if (p.taunts[0]?.from) return t('live.paper.hedTaunt', { r: t('rival.' + p.taunts[0].from) });
  if (p.welcome) return t('live.paper.hedWelcome', { n: s.nick || t('g.home.noName') });
  return t('live.paper.hedQuiet');
}
export function MorningPaperSheet({ paper: p, onClose }: { paper: Paper; onClose: () => void }) {
  const t = useT(); const s = useSave();
  const go = useGo();
  useEffect(() => { sfx('typewriter'); }, []);
  const hed = paperHed(t, p, s);
  const st = p.stake;
  const followers = s.byline?.followers || 0;
  return <Sheet open onClose={onClose} label={t('live.paper.title')} wide>
    <div className="sheet__body lv-paper">
      <header className="lv-paper__mast">
        <span className="g-mono">{t('live.paper.k')} · {fmtDate(Date.now(), t.lang, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        <h2 className="lv-paper__t">{t('live.paper.title')}</h2>
      </header>
      {p.welcome && <div className="lv-paper__welcome" role="note">
        <b>{t('live.paper.welcome')}</b><p>{t('live.paper.welcomeSub', { d: p.welcome.days })} {t('live.paper.welcomeNext')}</p>
        <span className="g-mono">{t('live.paper.best', { n: st.best })} · {t('live.paper.followers', { n: followers.toLocaleString('en') })}</span>
      </div>}
      <h3 className="lv-paper__hed" dir="auto">{hed}</h3>
      <div className="lv-paper__cols">
        <section className="lv-paper__sec">
          <h4 className="g-mono">{t('live.paper.overnight')}</h4>
          {p.items.length ? <div className="lv-paper__list">{p.items.slice(0, 3).map((f) => <PaperLine key={f.id} f={f} go={go} onClose={onClose} />)}</div> : <p className="lv-paper__quiet">{t('live.paper.quiet')}</p>}
          {p.taunts.length > 0 && <><h4 className="g-mono">{t('live.paper.taunts')}</h4><div className="lv-paper__list">{p.taunts.slice(0, 1).map((f) => <PaperLine key={f.id} f={f} go={go} onClose={onClose} />)}</div></>}
        </section>
        <section className="lv-paper__sec">
          <div className="lv-paper__chips">
            {p.rank && <span className="lv-chip"><Icon n="news" size={14} /><span>{t('live.paper.rank', { n: p.rank.no, tier: t('tier.' + p.rank.tier), p: num(p.rank.total) })} · {p.rank.rank ? t('live.paper.rankOf', { r: p.rank.rank, n: p.rank.players || 1 }) : t('live.paper.noRank')}</span></span>}
            <StakeLine stake={st} compact />
          </div>
          <h4 className="g-mono">{t('live.paper.today')}</h4>
          <ol className="lv-paper__asg">{p.assignments.slice(0, 3).map((a, k) => <li key={a.kind + k} className={'lv-asg lv-asg--sm lv-asg--' + a.kind}>
            <span className="lv-asg__n" aria-hidden="true"><Icon n={KIND_IC[a.kind] || 'news'} size={16} /></span>
            <div className="lv-asg__b"><b className="lv-asg__t">{t('live.desk.t.' + a.kind)}</b><p className="lv-asg__s">{assignSub(t, a)}</p></div>
            <button className="lv-asg__go" onClick={() => { onClose(); nav(go, a); }} aria-label={t('live.desk.b.' + a.kind)}><Icon n={t.rtl ? 'back' : 'arrow'} size={16} /></button>
          </li>)}</ol>
        </section>
      </div>
      <GBtn size="lg" sound="open" onClick={onClose} style={{ marginTop: 14 }}><Icon n="pen" />{t('live.paper.go')}</GBtn>
    </div>
  </Sheet>;
}
function PaperLine({ f, go, onClose }: { f: FeedItem; go: Go; onClose: () => void }) {
  return <FeedRow f={{ ...f, read: true }} onOpen={() => { onClose(); markRead([f.id]); go(routeOf(f)); }} />;
}
const routeOf = (f: FeedItem): Route => { const r = f.to; if (!r) return { n: 'feed' }; if (r.n === 'wire') return { n: 'wire', rid: r.rid }; if (r.n === 'rooms') return { n: 'rooms', code: r.code }; return { n: r.n } as Route; };
// Components mounted outside a screen (the sheet in App) navigate through the connect lane's nav bridge.
function useGo(): Go { return useCallback((r: Route) => navTo(r), []); }

// ---------- the stake
function StakeLine({ stake: st, compact }: { stake: ReturnType<typeof streakStake>; compact?: boolean }) {
  const t = useT();
  const r = t('rival.' + st.taker);
  const txt = st.lost ? t('live.stake.lost', { r, n: st.lost.n }) : st.playedToday && st.n ? t('live.stake.safe', { n: st.n }) : st.atRisk ? t('live.stake.line', { n: st.n, t: resetAt(), r }) : t('live.stake.none');
  return <span className={'lv-chip lv-chip--stake' + (st.lost ? ' is-lost' : st.atRisk ? ' is-risk' : st.n ? ' is-safe' : '') + (compact ? ' is-compact' : '')}>
    {st.lost ? <RivalMark id={st.lost.by} size={22} /> : <Icon n="flame" size={16} />}<span dir="auto">{txt}</span>
  </span>;
}
export function StreakStake({ go, style }: { go: Go; style?: CSSProperties }) {
  const t = useT(); const s = useSave(); const now = useNow(30e3);
  const st = streakStake(s, now);
  if (!st.lost && !st.atRisk && !st.n) return null;
  const r = t('rival.' + st.taker);
  return <section className={'lv-stake' + (st.lost ? ' is-lost' : st.atRisk ? ' is-risk' : ' is-safe')} style={style} aria-label={t('live.stake.title')}>
    <span className="lv-stake__ic" aria-hidden="true">{st.lost ? <RivalMark id={st.lost.by} size={36} /> : <Icon n="flame" size={26} />}</span>
    <div className="lv-stake__b">
      <b className="g-num lv-stake__n">{st.lost ? st.lost.n : st.n}</b>
      <span className="lv-stake__t" dir="auto">{st.lost ? t('live.stake.lost', { r, n: st.lost.n }) : st.playedToday ? t('live.stake.safe', { n: st.n }) : t('live.stake.line', { n: st.n, t: resetAt(), r })}</span>
      {st.grace > 0 && !st.lost && <span className="g-mono lv-stake__g">{t('live.stake.grace', { n: st.grace })}</span>}
    </div>
    {!st.playedToday && <GBtn size="sm" kind={st.lost ? '' : 'dark'} sound="open" onClick={() => go({ n: 'daily' })}><Icon n="phone" />{t('live.stake.play')}</GBtn>}
  </section>;
}

// ---------- the Daily brief (Window.tsx, before day 1 begins)
export function DailyBriefSheet({ view, go }: { view: View; go: Go }) {
  const t = useT(); const s = useSave();
  const fresh = view.mode === 'daily' && !view.done && view.state.day === 1 && !view.state.clues.some((c) => c.length) && !view.state.calls.some(Boolean);
  const [open, setOpen] = useState(() => fresh && !briefSeenToday(getSave()));
  const [here, setHere] = useState<number | null>(null);
  useEffect(() => { if (open) { sfx('sheet.open'); presence().then((r) => { if (r.ok) setHere(r.now); }); } }, [open]);
  const close = () => { markBriefSeen(); setOpen(false); };
  const lead = leadAssignment(s, Date.now());
  const dailyA = lead && lead.kind === 'daily' ? lead : { kind: 'daily', voice: 0 } as Assignment;
  const st = styleOf(s), stake = streakStake(s), dd = ddLiveActive();
  const cast = view.cast;
  return <Sheet open={open} onClose={close} label={t('live.brief.title')}>
    <div className="sheet__body lv-brief">
      <header className="lv-brief__h">
        <span className="g-mono">{t('live.brief.k', { n: view.no || '' })} · {fmtDate(Date.now(), t.lang)}</span>
        <h2 className="lv-brief__t">{t('live.brief.title')}</h2>
      </header>
      <blockquote className="lv-brief__voice"><span className="lv-brief__ed"><Icon n="pen" size={14} />{editorName(t)}</span><p dir="auto">{voiceOf(t, dailyA)}</p></blockquote>
      <div className="lv-brief__five" aria-label={t('live.brief.five')}>
        {cast.map((c) => <span key={c.i} className="lv-brief__kit"><Kit club={c.from} player={c.player} size={44} /><span>{c.player.s || c.player.n}</span><span className="lv-brief__route"><Crest club={c.from} size={12} /><Icon n={t.rtl ? 'back' : 'arrow'} size={10} /><Crest club={c.to} size={12} /></span></span>)}
      </div>
      <ul className="lv-brief__notes">
        <li><Icon n="pen" size={16} /><span><b>{t('live.style.' + st.id + '.t')}</b> · {t('live.brief.styleNote.' + st.id, { n: st.n, m: STYLE_MIN })}</span></li>
        <li className={stake.lost ? 'is-lost' : stake.atRisk ? 'is-risk' : ''}><Icon n="flame" size={16} /><span>{stake.lost ? t('live.brief.stakeLost', { r: t('rival.' + stake.lost.by), n: stake.lost.n }) : stake.n ? t('live.brief.stakeLine', { n: stake.n, r: t('rival.' + stake.taker) }) : t('live.brief.stakeNone')}</span></li>
        {here != null && <li><Icon n="eye" size={16} /><span>{here > 1 ? t('live.brief.presence', { n: here }) : t('live.brief.presenceOne')}</span></li>}
        {dd && <li className="is-live"><Icon n="clock" size={16} /><span>{t('live.brief.dd')} <button className="lv-link" onClick={() => { close(); go({ n: 'ddlive' } as Route); }}>{t('live.dd.open')}</button></span></li>}
      </ul>
      <GBtn size="lg" sound="open" onClick={close} pulse><Icon n="phone" size={22} />{t('live.brief.go')}</GBtn>
    </div>
  </Sheet>;
}

// ---------- Deadline Day Live: the banner (Home) and the ticker strip (Window)
let boardCache: { day: string; b: DDBoard } | null = null;
export function useDDBoardLite(day?: string) {
  const [b, setB] = useState<DDBoard | null>(boardCache && boardCache.day === day ? boardCache.b : null);
  useEffect(() => { if (!day || (boardCache && boardCache.day === day)) return; fetchDDBoard(day).then((r) => { if (r.ok) { boardCache = { day, b: r }; setB(r); } }); }, [day]);
  return b;
}
export function useDDTally(day: string | undefined, ms = 30e3) {
  const [tl, setTl] = useState<DDTally | null>(null);
  useEffect(() => {
    if (!day) return;
    let on = true;
    const tick = () => fetchDDTally(day).then((r) => { if (on && r.ok) setTl(r); });
    tick(); const id = setInterval(tick, ms);
    return () => { on = false; clearInterval(id); };
  }, [day, ms]);
  return tl;
}
export function DDLiveBanner({ go, style }: { go: Go; style?: CSSProperties }) {
  const t = useT(); const s = useSave(); const now = useNow(1000);
  const dd = ddLiveActive(now), res = ddResultsDue(now);
  const [here, setHere] = useState<number | null>(null);
  useEffect(() => { if (dd) presence().then((r) => { if (r.ok) setHere(r.now); }); }, [dd?.day]); // eslint-disable-line react-hooks/exhaustive-deps
  if (dd) {
    const c = ddCountdown(dd, now), n = Object.keys(myDDCalls(s, dd.day)).length;
    return <section className="lv-ddb" style={style} aria-label={t('live.dd.banner.t')}>
      <span className="lv-live lv-live--lg"><i />{t('live.dd.live')}</span>
      <div className="lv-ddb__b">
        <b>{t('live.dd.banner.t')}</b>
        <p>{here && here > 1 ? t('live.dd.banner.s', { n: here }) : t('live.dd.banner.s0')} {t('live.dd.filed', { n, m: 5 })}.</p>
      </div>
      <span className="lv-ddb__clock g-num" role="timer">{hms(c.ms)}</span>
      <GBtn size="sm" sound="open" onClick={() => go({ n: 'ddlive' } as Route)}><Icon n="clock" />{t('live.dd.banner.b')}</GBtn>
    </section>;
  }
  if (res && !ddMark(s, res.day, 'resultsSeen')) return <section className="lv-ddb lv-ddb--res" style={style} aria-label={t('live.dd.banner.rt')}>
    <span className="lv-ddb__ic"><Icon n="trophy" /></span>
    <div className="lv-ddb__b"><b>{t('live.dd.banner.rt')}</b><p>{t('live.dd.banner.rs')}</p></div>
    <GBtn size="sm" kind="gold" sound="open" onClick={() => go({ n: 'ddlive' } as Route)}><Icon n="trophy" />{t('live.dd.banner.rb')}</GBtn>
  </section>;
  return null;
}
export function DDLiveTicker({ go }: { go: Go }) {
  const t = useT(); const now = useNow(60e3);
  const dd = ddLiveActive(now);
  const b = useDDBoardLite(dd?.day);
  const tl = useDDTally(dd?.day, 30e3);
  if (!dd) return null;
  const items = (b?.sagas || []).map((sg) => {
    const c = (tl?.counts || b?.counts || {})[sg.rid] || [0, 0, 0], tot = c[0] + c[1] + c[2];
    const pct = (k: number) => (tot ? Math.round((100 * c[k]) / tot) : 0);
    return { key: sg.rid, name: sg.player, to: sg.to.name, tot, parts: DD_OUT.map((o, k) => t('live.dd.outS.' + o) + ' ' + pct(k) + '%') };
  });
  return <button className="g-ticker lv-tick" onClick={() => { sfx('ui.tap'); go({ n: 'ddlive' } as Route); }} aria-label={t('live.dd.tickerOpen')}>
    <span className="g-ticker__l"><i />{t('live.dd.ticker')}</span>
    <span className="g-ticker__vp"><span className="g-ticker__track">{[0, 1].map((dup) => <span key={dup} aria-hidden={dup === 1 ? 'true' : undefined}>
      {items.length ? items.map((x) => <span key={x.key}><b>{x.name}</b> → {x.to} · {x.tot ? x.parts.join(' · ') : t('live.dd.roomNone')} {x.tot ? <em>{x.tot}</em> : null}</span>) : <span>{t('live.dd.tickerOpen')} · {tl ? t('live.dd.reporters', { n: tl.players }) : ''}</span>}
    </span>)}</span></span>
  </button>;
}
/** Plays the Deadline Day Live open film once per deadline day (call from the DD screen). */
export function useDDOpenFilm(day?: string, live?: boolean) {
  useEffect(() => { if (!day || !live || ddMark(getSave(), day, 'openFilm')) return; markDD(day, 'openFilm'); playScene('ddlive:open', { when: fmtDate(Date.parse(day + 'T12:00:00Z'), getSave().lang, { day: 'numeric', month: 'short', year: 'numeric' }) }); }, [day, live]);
}
export function useDDCloseFilm(day?: string, on?: boolean) {
  useEffect(() => { if (!day || !on || ddMark(getSave(), day, 'closeFilm')) return; markDD(day, 'closeFilm'); playScene('ddlive:close', { when: fmtDate(Date.parse(day + 'T12:00:00Z'), getSave().lang, { day: 'numeric', month: 'short', year: 'numeric' }) }); }, [day, on]);
}

// ---------- Me: the playstyle card
const outName = (t: T, o: number) => t('out.' + OUTS[o]);
export function StyleCard({ style }: { style?: CSSProperties }) {
  const t = useT(); const s = useSave();
  const st = styleOf(s);
  const rookie = st.id === 'rookie';
  const rows: [string, number][] = [['hit', st.stats.hit], ['early', st.stats.early], ['loud', st.stats.loud], ['ut', st.stats.ut]];
  const earned = Object.entries(st.titles).sort((a, b) => a[1] - b[1]).map(([id]) => id);
  return <section className={'lv-style' + (rookie ? ' is-rookie' : '')} style={style} aria-labelledby="lv-style-h">
    <div className="lv-style__top">
      <div><span className="g-mono lv-style__k">{t('live.style.title')}</span><h2 id="lv-style-h" className="lv-style__t">{t('live.style.' + st.id + '.t')}</h2></div>
      <span className={'g-stamp lv-style__stamp' + (rookie ? '' : ' is-slam')}>{rookie ? t('live.style.ready', { n: st.ready, m: STYLE_MIN }) : t('live.style.calls', { n: st.n })}</span>
    </div>
    <p className="lv-style__line" dir="auto">{t('live.style.' + st.id + '.line', { n: st.n, m: STYLE_MIN })}</p>
    {rookie ? <div className="lv-style__ready"><span className="g-bar g-bar--sm"><i style={{ width: (100 * st.ready) / STYLE_MIN + '%' }} /></span></div>
      : <dl className="lv-style__stats">
        {rows.map(([k, v]) => <div key={k}><dt>{t('live.style.' + k)}</dt><dd><b className="g-num">{Math.round(v * 100)}%</b><span className="g-bar g-bar--sm" style={{ ['--bar' as string]: k === 'hit' ? 'var(--c-done)' : k === 'ut' ? 'var(--c-fake)' : 'var(--gold)' }}><i style={{ width: Math.round(v * 100) + '%' }} /></span></dd></div>)}
      </dl>}
    <div className="lv-style__foot">
      {st.bestO != null && <span className={'g-chip g-chip--' + OUTS[st.bestO]}>{t('live.style.best', { o: outName(t, st.bestO) })}</span>}
      {earned.length > 1 && <span className="lv-style__earned g-mono">{t('live.style.earned')}: {earned.map((id) => t('live.style.' + id + '.t')).join(' · ')}</span>}
    </div>
  </section>;
}

// A tiny helper other lanes may want: the number of unread items, for badges.
export const unreadCount = (s: Save) => unreadOf(s).length;
export { feedText, buzz };
