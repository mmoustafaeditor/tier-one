// Results (GOTY pass; HYBRID.md §6): the front page, on one screen. "The paper's out" plays first (lib/moments.ts), then
// the verdict card lands with share beside it, ONE strip says how your name moved (followers, reputation, contacts and
// rivals that moved, level), and the five calls sit as one compact list: the replies thread and every point are a tap
// away in sheets. Every window mode (Daily, rooms, Practice, Career) lands here.
//
// INTEGRATION SLOT (social lane, ui/social.tsx): ChallengeButton, see below.
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { OUTS, type ResultSaga, type Result, type CastSaga } from '../lib/engine';
import type { View } from '../lib/driver';
import { useT, num, fmtDate, resetAt } from '../lib/i18n';
import { useSave, getSave } from '../lib/save';
import { outWord, strWord, saysWord } from '../lib/story';
import { onShared } from '../lib/meta';
import { RANKS } from '../lib/career';
import type { CareerReport } from '../lib/career';
import { levelOf } from '../lib/progress';
import { beatKey, type Beat } from '../lib/storyMode';
import { sfx, buzz } from '../lib/sfx';
import { v3 } from '../lib/api';
import { Banter, compact, type Thread, type Reply } from '../lib/banter';
import { Icon, Kit, GBtn, TopBar, CountUp, confetti, shake, SrcIcon, useCountUp } from '../ui/game';
import { Avatar } from '../ui/screenbits';
import { useRecordWindow } from '../ui/connect';
import { Sheet } from '../ui/bits';
import { renderCard, hereWeGoOf, viralLines, viralText, type ViralCtx } from '../lib/share';
import { whyKey } from '../lib/story';
import { Portrait } from '../ui/portrait';
import type { Chrome } from '../App';
import '../styles/results.css';
import { flushDeferredScenes, playScene, afterScenes, seen } from '../lib/scenes';
import { windowKey, bylineOf, repTier, REP_TIERS, type WindowSummary } from '../lib/byline';
import { catchphraseOf } from '../lib/catchphrase';
import { ShareToX } from '../ui/sharex';
import { shareStyle } from '../lib/wallet';

/** SLOT (social lane, ui/social.tsx): `<ChallengeButton/>`. Assign the real component here; it renders beside Share.
 *  Props: { view, result }. */
// 3.6: Multiplayer is Rooms only, so the challenge link is off (the slot stays for the social lane).
const ChallengeButton: ComponentType<{ view: View; result: Result }> | null = null;

const TIER_C: Record<string, string> = { T1: 'gold', T2: 'done', T3: 'done', T4: 'off', SPIKED: '' };
export interface Start { pp: number; credits: number; streak: number }
type Modal = null | { k: 'thread'; i: number } | { k: 'replies' } | { k: 'breakdown' } | { k: 'board' };
const verdictOf = (p: ResultSaga) => (!p.call ? 'none' : p.excl ? 'excl' : p.right ? 'right' : 'wrong');

export function Results({ view, chrome, report, start, beat, ddLast15 }: { view: View; chrome: Chrome; report: CareerReport | null; start?: Start; beat?: Beat | null; ddLast15?: boolean }) {
  const t = useT();
  const s = useSave();
  const r = view.result!;
  const cast = (r.cast && r.cast.length ? r.cast : view.cast) as CastSaga[];
  const [stage, setStage] = useState(s.reduced ? 99 : 0);
  const tutorial = view.mode === 'practice' && view.label === 'tutorial';
  // "The paper's out" (§40): the full film plays the first time a window ever lands; after that the presses roll for
  // half a second and the page is up. Nobody waits through the same film twice. Revisits (recorded windows) skip it.
  const [film, setFilm] = useState(() => stage === 0 && view.mode !== 'room' && !tutorial && !seen('paper') && !matchMedia('(prefers-reduced-motion: reduce)').matches && !(getSave().byline?.keys || []).includes(windowKey(view)));
  const [modal, setModal] = useState<Modal>(null);
  const [pane, setPane] = useState<'page' | 'calls'>('page'); // 3.6: one screen on phones, front page · your calls
  const root = useRef<HTMLDivElement>(null);
  const byline = useRecordWindow(view, beat, start?.pp); // One Byline (lib/byline.ts)
  const what = view.mode === 'daily' ? t('g.win.daily', { n: view.no || '' }) : view.mode === 'room' ? t('nav.rooms') + ' · ' + t('rooms.round', { n: (view.room?.round || 0) + 1 }) : view.mode === 'career' ? t('g.tabs.story') : t('nav.practice');
  const home = () => chrome.go({ n: 'front' });
  const again = () => chrome.go(view.mode === 'career' ? { n: 'story' } : view.mode === 'practice' ? { n: 'practice' } : view.mode === 'room' ? { n: 'rooms', code: view.room?.code } : { n: 'front' });

  // One seed per window: the same result always draws the same replies, in every language's own pools.
  const seed = view.seed || (view.no ? 'daily-' + view.no : view.room ? 'room-' + view.room.code + '-' + view.room.round : r.row || 'w');
  const { threads, verdict } = useMemo(() => {
    const b = new Banter(t.lang, seed, catchphraseOf().text, s.nick.trim());
    const th = r.per.map((p) => b.thread(p, cast[p.i], view.R));
    return { threads: th, verdict: b.verdict(r.tier) };
  }, [t.lang, seed, r]);

  // stage: 0 press · 1 verdict · 2..1+n rows (board order) · 2+n tier stamp · 3+n the rest
  const n = r.per.length;
  const TIER = 2 + n, PROG = 3 + n;
  useEffect(() => { if (stage >= PROG) flushDeferredScenes(); }, [stage >= PROG]);
  const filmOn = useRef(false);
  useEffect(() => {
    if (!film || filmOn.current) return;
    filmOn.current = true; // once, even under StrictMode's double effects
    playScene('paper', { hed, what, paper: view.mode === 'career' ? s.career?.paper || undefined : undefined });
    afterScenes(() => { setFilm(false); setStage((x) => Math.max(x, 1)); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // The reveal (§40): presses 500 ms, the verdict card 450, each call 260, the tier stamp 600. About 2.9 s for five
  // sagas, and a tap skips to the end at any point.
  useEffect(() => {
    if (stage >= PROG || film) return;
    const ms = stage === 0 ? 500 : stage === 1 ? 450 : stage < TIER ? 260 : 600;
    const id = setTimeout(() => setStage(stage + 1), ms);
    if (stage === 0) sfx('typewriter');
    if (stage === 1) sfx('reveal');
    if (stage >= 2 && stage < TIER) { const v = verdictOf(r.per[stage - 2]); if (v !== 'none') sfx(v === 'excl' ? 'excl.stamp' : v === 'right' ? 'good' : 'bad', stage - 2); }
    return () => clearTimeout(id);
  }, [stage, film]);
  // The tier lands. Gold (and the fanfare) is Tier 1's alone (§8): Tier 2 gets a green stamp, no confetti.
  useEffect(() => {
    if (stage !== TIER) return;
    if (r.tier === 'T1') { sfx('fanfare'); confetti(); buzz([30, 60, 30, 60, 80]); }
    else if (r.tier === 'SPIKED') { sfx('sad'); shake(root.current); buzz(120); }
    else { sfx('stamp.done'); buzz(30); }
  }, [stage]);
  const skip = () => { if (stage < PROG) setStage(99); };
  // §8 the Exclusive moment: once the page is up, the stamp slams with its own sound and the follower spike beside it.
  const [exclUp, setExclUp] = useState(false);
  useEffect(() => { if (stage >= PROG && r.ex > 0 && !exclUp) { const id = setTimeout(() => { setExclUp(true); sfx('excl.stamp'); buzz([20, 40, 20, 60]); }, 250); return () => clearTimeout(id); } }, [stage >= PROG]); // eslint-disable-line react-hooks/exhaustive-deps

  const best = [...r.per].sort((a, b) => b.pts - a.pts)[0];
  const bc = best ? cast[best.i] : cast[0];
  const bestDest = best && best.truth === 1 && bc.alt ? bc.alt : bc.to;
  const hed = best && best.right && best.call ? (best.truth <= 1 ? t('g.res.hedMove', { p: bc.player.s, c: bestDest.s }) : t('g.res.hedOut', { p: bc.player.s, o: outWord(t.lang, best.truth) })) : t('g.res.hedNone');
  const me = { name: s.nick || t('g.home.noName'), handle: '@' + ((s.nick || 'reporter').toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'reporter') };
  const open = (m: Modal) => (e?: React.MouseEvent) => { e?.stopPropagation(); sfx('ui.tap'); setModal(m); };
  const close = () => setModal(null);
  const boardLabel = view.mode === 'room' ? t('bn.ui.roomBoard') : view.mode === 'career' ? t('bn.ui.desk') : t('bn.ui.board');
  const onBoard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (view.mode === 'room') chrome.go({ n: 'rooms', code: view.room?.code });
    else if (view.mode === 'career') chrome.go({ n: 'story' });
    else open({ k: 'board' })();
  };
  const cur = modal && modal.k === 'thread' ? threads.find((x) => x.i === modal.i) : null;
  const replies = threads.reduce((a, th) => a + th.replies.length, 0);
  // §10 the viral object: the same lines on screen, in the share sheet and on the clipboard.
  const vctx: ViralCtx = { mode: view.mode, no: view.no, what, r, daysTotal: view.R.DAYS, streak: s.streak.n, streakBest: s.streak.best, firstT1: r.tier === 'T1' && (s.stats.t1 || 0) <= 1, ddLast15, promoted: report && report.promoted != null ? t('career.ranks.' + report.promoted) : null };
  const viral = viralLines(t, vctx);
  const share = useShare(view, r, what, hed, bestDest, bc, viralText(t, vctx));
  const exclSaga = r.per.find((p) => p.excl);
  const exclGain = byline && byline.followers > 0 ? byline.followers : 0;

  return <div className="g-screen results2 res4 fit fit--full" data-pane={pane} ref={root} onClick={skip}>
    <TopBar bare={stage < PROG} back={{ label: t('g.tabs.home'), onClick: home }} />
    {stage >= PROG && <div className="g-tabs2 res-tabs" role="tablist">
      {(['page', 'calls'] as const).map((k) => <button key={k} role="tab" aria-selected={pane === k} onClick={(e) => { e.stopPropagation(); sfx('ui.tap'); setPane(k); }}>{t('hub.res.' + k)}</button>)}
    </div>}

    {stage === 0 && !film && <div className="press" aria-hidden="true"><div className="press__roll" /><div className="press__sheet" /><p className="g-mono">{t('g.res.rolling')}</p></div>}

    {stage >= 1 && <>
      <div className="res4__lead">
        {/* ---- the verdict: your front page ---- */}
        <article className={'vcard g-card tier--' + r.tier}>
          <div className="vcard__mast"><span className="vcard__name">Tier One</span><span className="g-mono">{what} · {fmtDate(Date.now(), t.lang, { day: 'numeric', month: 'short' })}</span></div>
          <div className="vcard__row">
            <div className="vcard__main">
              <div className="g-mono vcard__k" dir="auto">{r.ex > 0 ? t('g.res.byline', { n: me.name }) : t('hr.res.by', { n: me.name })}</div>
              <h1 className="vcard__hed">{hed}</h1>
            </div>
            <div className="vcard__stampwrap">
              {stage >= TIER ? <span className={'vcard__stamp g-stamp is-slam g-stamp--' + (TIER_C[r.tier] || '')}>{t('tier.' + r.tier)}</span> : <Portrait kind="player" id={bc.player.id} club={bestDest} size={72} />}
            </div>
          </div>
          <div className="vcard__score">
            <div className="vcard__pts"><b className={'g-num' + (r.total < 0 ? ' neg' : '')}><CountUp to={r.total} ms={700 + n * 220} tick /></b><span className="g-mono">{t('results.total')}</span></div>
            <div><b className="g-num">{r.right}/{r.called}</b><span className="g-mono">{t('career.right')}</span></div>
            {r.ex > 0 && <div><b className="g-num">{r.ex}</b><span className="g-mono">{t('results.exclusives')}</span></div>}
            {r.rank ? <div><b className="g-num">#{r.rank}</b><span className="g-mono">{r.players ? t('hr.res.ofN', { n: r.players }) : t('hr.res.rank')}</span></div> : null}
          </div>
          {stage >= TIER && <div className="vcard__pub">
            <p className="vcard__quip">{r.tier === 'SPIKED' ? t('c38.share.line.spiked') : verdict.quip}</p>
            {verdict.idiom && <p className="vcard__idiom"><span className="g-mono">{t('bn.ui.pub')}</span> {verdict.idiom}</p>}
          </div>}
          {/* §8 the Exclusive: gold, its own stamp and sound, the follower spike, who you beat to it */}
          {exclUp && exclSaga && <div className="exclm" role="status">
            <span className="g-stamp g-stamp--gold is-slam exclm__stamp">{t('c38.excl.stamp')}</span>
            <div className="exclm__b">
              <b>{r.ex > 1 ? t('c38.excl.lines', { n: r.ex }) : t('c38.excl.line')}</b>
              <span className="g-mono">{cast[exclSaga.i].player.s} · {t('g.saga.dayShort', { n: exclSaga.call?.day || 0 })}{exclGain > 0 ? ' · ' + t('c38.excl.followers', { n: exclGain.toLocaleString('en') }) : ''}</span>
            </div>
            <button type="button" className="exclm__share" onClick={(e) => { e.stopPropagation(); share.send(); }} aria-label={t('c38.excl.share')}><Icon n="share" size={18} /></button>
          </div>}
        </article>

        {/* ---- the result card: what travels (§10) ---- */}
        {stage >= PROG && <section className={'vobj' + (r.tier === 'T1' ? ' is-t1' : r.tier === 'SPIKED' ? ' is-spiked' : '')} aria-label={t('c38.share.card')} onClick={(e) => e.stopPropagation()}>
          <div className="vobj__head g-mono">{viral.head}</div>
          <div className="vobj__row" aria-label={r.row || ''}>{Array.from(viral.row).map((ch, k) => <i key={k} className={'vobj__c vobj__c--' + (ch === '★' ? 'x' : ch === '■' ? 'r' : ch === '□' ? 'w' : 'n')}>{ch}</i>)}</div>
          {viral.meta && <div className="vobj__meta">{viral.meta}</div>}
          {viral.lines.length > 0 && <div className="vobj__lines">{viral.lines.map((l, k) => <span key={k}>{l}</span>)}</div>}
          <button type="button" className="vobj__copy" onClick={share.copy} aria-label={t('c38.res.copyAria')}><Icon n="news" size={15} />{share.msg || t('c38.share.copy')}</button>
        </section>}

        {stage >= PROG && <div className="res4__share stagger">
          <GBtn size="sm" sound="open" onClick={share.send}><Icon n="share" />{t('bn.ui.share')}</GBtn>
          <ShareToX r={r} cast={cast} seed={seed} v={{ hed, what, tier: t('tier.' + r.tier), pts: num(r.total), row: r.row || '' }} card={share.card} />
          {ChallengeButton ? <ChallengeButton view={view} result={r} /> : null}
          <button className="res4__save" onClick={share.save}>{t('results.saveImg')}</button>
        </div>}

        {/* ---- how your name moved: ONE strip ---- */}
        {stage >= PROG && <NameStrip sum={byline} s={s} start={start} mode={view.mode} tier={r.tier} report={report} beat={beat || null} />}
      </div>

      <div className="res4__desk">
        {/* ---- the five calls: one line each; the thread and every point one tap away ---- */}
        <div className="res4__sec"><h2>{t('bn.ui.calls')}</h2><span className="g-mono">{t('bn.ui.callsAside', { a: r.right, b: r.called })}</span></div>
        <section className="calls">
          {r.per.map((p, k) => stage >= 2 + k
            ? <CallRow key={p.i} p={p} c={cast[p.i]} th={threads[p.i]} k={k} onOpen={open({ k: 'thread', i: p.i })} />
            : <div key={p.i} className="call4 call4--ghost" />)}
        </section>

        {stage >= PROG && <section className="res4__tail stagger">
          <nav className="doors" style={{ ['--i' as string]: 0 }}>
            <button className="door" onClick={open({ k: 'replies' })}><Icon n="reply" /><span>{t('hr.res.repliesN', { n: replies })}</span></button>
            <button className="door" onClick={open({ k: 'breakdown' })}><Icon n="news" /><span>{t('bn.ui.breakdown')}</span></button>
            {view.mode !== 'practice' && <button className="door" onClick={onBoard}><Icon n={view.mode === 'career' ? 'story' : 'trophy'} /><span>{boardLabel}</span></button>}
            {/* no dead ends: the rivals' reply and the feed are one tap from every result */}
            <button className="door" onClick={() => chrome.go({ n: 'rivals' })}><Icon n="friends" /><span>{t('cn.rivals.title')}</span></button>
            <button className="door" onClick={() => chrome.go({ n: 'feed' })}><Icon n="news" /><span>{t('cn.feed.title')}</span></button>
          </nav>
          <div className="prog__acts" style={{ ['--i' as string]: 1 }}>
            {tutorial ? <GBtn size="lg" shine primary sound="open" onClick={home}><Icon n="phone" />{t('c38.tut.home')}</GBtn>
              : <GBtn size="lg" shine primary onClick={view.mode === 'daily' ? () => chrome.go({ n: 'practice' }) : again}><Icon n={view.mode === 'daily' ? 'target' : 'phone'} />{view.mode === 'daily' ? t('g.res.practice') : view.mode === 'career' ? t('g.res.nextWindow') : view.mode === 'room' ? t('bn.ui.openRoom') : t('results.again')}</GBtn>}
            {!tutorial && <GBtn kind="dark" onClick={home}><Icon n="home" />{t('g.res.home')}</GBtn>}
          </div>
          {tutorial && <p className="g-mono prog__tomorrow">{t('c38.tut.done')}</p>}
          {view.mode === 'daily' && <p className="g-mono prog__tomorrow">{t('results.tomorrow', { t: resetAt() })}</p>}
        </section>}
      </div>
    </>}
    {stage < PROG && stage > 0 && <p className="g-mono results2__skip">{t('c38.res.skip')}</p>}

    {/* ---- the sheets ---- */}
    <Sheet open={!!cur} onClose={close} label={t('bn.ui.allReplies')}>
      {cur && <div className="sheet__body res3sheet">
        <SheetHead title={cast[cur.i].player.n} aside={t('bn.ui.allReplies')} onClose={close} />
        {cur.verdict === 'none' ? <div className="quietsaga">
          <div className="quietsaga__h"><Kit club={cast[cur.i].from} player={cast[cur.i].player} size={36} /><b>{t('bn.ui.quietN', { n: cast[cur.i].player.s })}</b><span className={'g-stamp g-stamp--' + OUTS[r.per[cur.i].truth]}>{outWord(t.lang, r.per[cur.i].truth)}</span></div>
          <Replies list={cur.replies} replyTo={me.handle} />
        </div> : <Tweet th={cur} p={r.per[cur.i]} c={cast[cur.i]} me={me} k={0} top={99} still />}
        <div className="res3sheet__sub g-mono">{t('bn.ui.breakdown')}</div>
        <SagaRow p={r.per[cur.i]} c={cast[cur.i]} R={view.R} k={0} startOpen coach={view.mode === 'practice'} />
      </div>}
    </Sheet>
    <Sheet open={modal?.k === 'replies'} onClose={close} label={t('bn.ui.allReplies')} wide>
      <div className="sheet__body res3sheet">
        <SheetHead title={t('bn.ui.allReplies')} aside={t('hr.res.repliesN', { n: replies })} onClose={close} />
        <div className="tweets">
          {threads.filter((th) => th.verdict !== 'none').map((th) => <Tweet key={th.i} th={th} p={r.per[th.i]} c={cast[th.i]} me={me} k={0} top={99} still />)}
          {threads.filter((th) => th.verdict === 'none').map((q) => <div key={q.i} className="quietsaga">
            <div className="quietsaga__h"><Kit club={cast[q.i].from} player={cast[q.i].player} size={36} /><b>{t('bn.ui.quietN', { n: cast[q.i].player.s })}</b><span className={'g-stamp g-stamp--' + OUTS[r.per[q.i].truth]}>{outWord(t.lang, r.per[q.i].truth)}</span></div>
            <Replies list={q.replies} replyTo={me.handle} />
          </div>)}
        </div>
      </div>
    </Sheet>
    <Sheet open={modal?.k === 'breakdown'} onClose={close} label={t('bn.ui.breakdown')} wide>
      <div className="sheet__body res3sheet">
        <SheetHead title={t('bn.ui.breakdown')} aside={t('bn.ui.breakdownAside')} onClose={close} />
        <p className="res3sheet__tier">{t('tierLine.' + r.tier)}{r.tier !== 'T1' ? ' ' + t('results.t1Need', { n: view.R.TIERS.T1 }) : ''}</p>
        <section className="ledger2">{r.per.map((p, k) => <SagaRow key={p.i} p={p} c={cast[p.i]} R={view.R} k={k} coach={view.mode === 'practice'} />)}</section>
        {view.mode === 'daily' && r.par != null && <p className="g-mono res3sheet__par">{t('results.par', { n: num(r.par) })}{r.weekRank ? ' · ' + t('results.week', { r: r.weekRank, n: r.weekPlayers || 1 }) : ''}</p>}
      </div>
    </Sheet>
    <Sheet open={modal?.k === 'board'} onClose={close} label={t('bn.ui.board')}>
      <div className="sheet__body res3sheet">
        <SheetHead title={t('lb.title')} onClose={close} />
        {modal?.k === 'board' && <Board total={r.total} />}
        <GBtn kind="dark" size="sm" style={{ marginTop: 12 }} onClick={() => { close(); chrome.go({ n: 'boards' }); }}><Icon n="trophy" size={18} />{t('aw.all')}</GBtn>
      </div>
    </Sheet>
  </div>;
}

// ---------- one call, one line: kit, what happened, the verdict stamp, the points
function CallRow({ p, c, th, k, onOpen }: { p: ResultSaga; c: CastSaga; th: Thread; k: number; onOpen: (e: React.MouseEvent) => void }) {
  const t = useT();
  const v = verdictOf(p);
  const dest = p.truth === 1 && c.alt ? c.alt : p.truth === 0 ? c.to : c.from;
  return <button className={'call4 is-' + v} style={{ ['--k' as string]: k }} onClick={onOpen} aria-label={t('hr.res.openRow', { p: c.player.n })}>
    <Kit club={dest} player={c.player} size={40} />
    <span className="call4__who">
      <b dir="auto">{c.player.n}</b>
      <span className="call4__what" dir="auto">{t('out.' + OUTS[p.truth] + 'D', { to: c.to.s })}{p.truth === 1 && c.alt ? ' · ' + c.alt.s : ''}{p.call ? ' · ' + t('hr.res.filedDay', { d: p.call.day }) : ''}</span>
    </span>
    <span className={'call4__stamp g-stamp is-slam g-stamp--' + (v === 'excl' ? 'gold' : v === 'right' ? 'done' : v === 'none' ? 'off' : '')}>{v === 'excl' ? t('bn.ui.excl') : v === 'right' ? t('bn.ui.right') : v === 'wrong' ? t('bn.ui.wrong') : t('hr.res.noCall')}</span>
    <span className="call4__end"><b className={'call4__pts g-num' + (p.pts < 0 ? ' neg' : '')}>{num(p.pts, true)}</b>{th.replies.length > 0 && <small>{compact(th.replies.length, t.lang)} <Icon n="reply" size={11} /></small>}</span>
  </button>;
}

// ---------- how your name moved (GOTY §1): followers, reputation, contacts and rivals that moved, level; Career's report folds in
function NameStrip({ sum, s, start, mode, report, beat }: { sum: WindowSummary | null; s: ReturnType<typeof useSave>; start?: Start; mode: View['mode']; tier: Result['tier']; report: CareerReport | null; beat: Beat | null }) {
  const t = useT();
  const b = bylineOf(s);
  const rt = repTier(b.rep);
  const next = REP_TIERS.find(([, m]) => m > b.rep);
  const lv0 = levelOf(start ? start.pp : s.pp), lv1 = levelOf(s.pp);
  const coins = start ? Math.max(0, s.credits - start.credits) : 0;
  const rivals = new Map<string, { w: number; l: number }>();
  for (const x of sum?.rivals || []) { const e = rivals.get(x.id) || { w: 0, l: 0 }; if (x.r === 'w') e.w++; else if (x.r === 'l') e.l++; rivals.set(x.id, e); }
  const chips: { k: string; cls: string; txt: React.ReactNode }[] = [];
  if (sum && sum.hot > 0) chips.push({ k: 'hot', cls: 'is-hot', txt: <><Icon n="flame" size={13} />{t('cn.res.hot', { n: sum.hot })}</> });
  for (const l of sum?.levels || []) chips.push({ k: 'lv' + l.src, cls: 'is-gold', txt: t('hr.res.lvChip', { s: t('src.' + l.src), n: l.lv }) });
  for (const [id, e] of rivals) chips.push({ k: 'r' + id, cls: e.w > e.l ? 'is-up' : e.l > e.w ? 'is-down' : '', txt: t(e.w > e.l ? 'hr.res.beat' : e.l > e.w ? 'hr.res.lostTo' : 'hr.res.drew', { r: t('rival.' + id) }) });
  if (mode === 'daily') chips.push({ k: 'streak', cls: 'is-hot', txt: <><Icon n="flame" size={13} />{t('g.res.streak', { n: s.streak.n })}</> }); // 3.8: the invisible weekly league is gone (brief §35)
  if (report) {
    chips.push({ k: 'cred', cls: report.repAfter >= report.repBefore ? 'is-up' : 'is-down', txt: t('hr.res.cred', { a: Math.round(report.repBefore), b: Math.round(report.repAfter) }) });
    if (report.favours > 0) chips.push({ k: 'fav', cls: 'is-gold', txt: t('career.favours') + ' +' + report.favours });
  }
  const nx = s.career && report && report.promoted == null ? RANKS[s.career.rank + 1] : null;
  return <section className="name4 g-card g-card--desk" aria-label={t('hr.res.yourName')}>
    <div className="name4__h"><span className="g-mono">{t('hr.res.yourName')}</span><span className={'name4__tier cn-tier--' + rt}>{t('cn.tier.' + rt)}</span></div>
    <div className="name4__cells">
      {sum && <div className="name4__cell">
        <b className={'g-num' + (sum.followers < 0 ? ' neg' : sum.followers > 0 ? ' pos' : '')}><CountUp to={sum.followers} sign ms={1000} /></b>
        <span>{t('cn.res.followers')}</span>
      </div>}
      <div className="name4__cell">
        <b className="g-num">{b.rep}{sum && sum.rep !== 0 && <em className={sum.rep > 0 ? 'pos' : 'neg'}>{num(sum.rep, true)}</em>}</b>
        <span>{t('hr.res.rep')}</span>
        <span className="g-bar g-bar--sm" style={{ ['--bar' as string]: 'var(--m-wire)' }}><i style={{ width: Math.round(next ? (100 * (b.rep - (REP_TIERS.find(([k]) => k === rt)?.[1] || 0))) / (next[1] - (REP_TIERS.find(([k]) => k === rt)?.[1] || 0)) : 100) + '%' }} /></span>
        <small>{next ? t('hr.res.toNext', { n: next[1] - b.rep, tier: t('cn.tier.' + next[0]) }) : t('hr.res.top')}</small>
      </div>
      <div className="name4__cell">
        <b className="g-num">{lv1.n}{coins > 0 && <em className="pos name4__coins"><span className="g-coin" />+{coins}</em>}</b>
        <span>{t('g.me.level')}</span>
        <span className="g-bar g-bar--sm" style={{ ['--bar' as string]: 'linear-gradient(90deg,#FFD35C,#F7B928)' }}><i style={{ width: lv1.into + '%' }} /></span>
        <small>{lv1.n > lv0.n ? t('g.res.levelUp', { n: lv1.n }) : t('g.home.xp', { a: lv1.into, b: lv1.need })}</small>
      </div>
    </div>
    {chips.length > 0 && <div className="name4__chips">{chips.map((c) => <span key={c.k} className={'name4__chip ' + c.cls}>{c.txt}</span>)}</div>}
    {report && report.promoted != null && <div className="name4__promo"><span className="g-stamp g-stamp--gold is-slam">{t('g.res.promoted')}</span><b>{t('career.ranks.' + report.promoted)}</b><p>{t('career.unl.' + report.promoted)}</p></div>}
    {nx && s.career && <p className="name4__next">{t('career.toNext', { w: Math.max(0, nx.gate[0] - s.career.windows), r: nx.gate[1], rank: t('career.ranks.' + (s.career.rank + 1)) })}</p>}
    {beat && <div className={'name4__beat from--' + beat.from}><b>{t('g.story.from.' + beat.from)}</b><p dir="auto">{t(beatKey(beat), beat.v)}</p></div>}
  </section>;
}

function SheetHead({ title, aside, onClose }: { title: string; aside?: string; onClose: () => void }) {
  const t = useT();
  return <div className="res3sheet__h"><div><b dir="auto">{title}</b>{aside && <span className="g-mono">{aside}</span>}</div>
    <button className="g-icbtn res3sheet__x" onClick={onClose} aria-label={t('bn.ui.close')}><Icon n="x" /></button></div>;
}

// ---------- a call as a tweet, with its replies (in the sheets)
function Tweet({ th, p, c, me, k, top, onOpen, still }: { th: Thread; p: ResultSaga; c: CastSaga; me: { name: string; handle: string }; k: number; top: number; onOpen?: (e: React.MouseEvent) => void; still?: boolean }) {
  const t = useT();
  const shown = th.replies.slice(0, top);
  const more = th.replies.length - shown.length;
  const dest = p.truth === 1 && c.alt ? c.alt : p.truth === 0 ? c.to : c.from;
  return <article className={'tweet is-' + th.verdict + (still ? ' is-still' : '')} style={{ ['--k' as string]: k }}>
    <div className="tweet__main">
      <Avatar name={me.name} size={40} me />
      <div className="tweet__col">
        <div className="tweet__who"><b dir="auto">{me.name}</b><span className="g-mono">{me.handle} · {t('bn.ui.dayN', { n: th.day })}</span></div>
        {th.was && <p className="tweet__was"><span className="g-mono">{t('bn.ui.deleted')}</span> <s>{th.was}</s></p>}
        <p className="tweet__text" dir="auto">{th.text}</p>
        <div className="tweet__truth">
          <Kit club={dest} player={c.player} size={30} />
          <span className="tweet__truthtxt">{t('out.' + OUTS[p.truth] + 'D', { to: c.to.s })}{p.truth === 1 && c.alt ? ' · ' + c.alt.s : ''}</span>
          <span className={'tweet__stamp g-stamp is-slam g-stamp--' + (th.verdict === 'excl' ? 'gold' : th.verdict === 'right' ? 'done' : '')}>{th.verdict === 'excl' ? t('bn.ui.excl') : th.verdict === 'right' ? t('bn.ui.right') : t('bn.ui.wrong')}</span>
          <b className={'tweet__pts g-num' + (p.pts < 0 ? ' neg' : '')}>{num(p.pts, true)}</b>
        </div>
        <Stats th={th} still={still} />
      </div>
    </div>
    {shown.length > 0 && <Replies list={shown} replyTo={me.handle} />}
    {!still && onOpen && <button className="tweet__more" onClick={onOpen}>{more > 0 ? t('bn.ui.seeAll', { n: th.replies.length }) : t('bn.ui.breakdown')}<Icon n={t.rtl ? 'back' : 'arrow'} size={16} /></button>}
  </article>;
}

// Social glyphs for the tweet cards (kept local: the shared icon set is the game's, these are the timeline's).
const SOC: Record<string, string> = { chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z', repost: 'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4', heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z' };
const Ico = ({ n, size = 16 }: { n: string; size?: number }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={SOC[n]} /></svg>;

function Stats({ th, still }: { th: Thread; still?: boolean }) {
  const t = useT();
  const on = !still;
  const likes = useCountUp(th.likes, 1100, on), reps = useCountUp(th.reps, 1100, on), rts = useCountUp(th.reposts, 1100, on);
  return <div className="tweet__stats">
    <span title={t('bn.ui.replies')}><Ico n="chat" size={15} />{compact(reps, t.lang)}</span>
    <span title={t('bn.ui.reposts')}><Ico n="repost" size={15} />{compact(rts, t.lang)}</span>
    <span title={t('bn.ui.likes')} className={th.verdict === 'wrong' ? '' : 'is-liked'}><Ico n="heart" size={15} />{compact(likes, t.lang)}</span>
    {th.ratio && <span className="tweet__badge tweet__badge--ratio">{t('bn.ui.ratio')}</span>}
    {th.hot && <span className="tweet__badge tweet__badge--hot"><Icon n="flame" size={12} />{t('bn.ui.hot')}</span>}
  </div>;
}

function Replies({ list, replyTo }: { list: Reply[]; replyTo: string }) {
  const t = useT();
  return <ul className="replies">{list.map((x, j) => <li key={j} className={'reply reply--' + x.who} style={{ ['--j' as string]: j }}>
    {x.who === 'source' ? <span className="reply__ava reply__ava--src"><SrcIcon k={x.id} size={30} /></span>
      : x.who === 'rival' ? <span className="reply__ava reply__ava--rival">{x.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
      : <Avatar name={x.handle} size={30} />}
    <div className="reply__col">
      <div className="reply__who">
        <b>{x.who === 'source' ? t('src.' + x.id) : x.name}</b>
        <span className={'reply__tag reply__tag--' + x.who}>{t('bn.ui.' + x.who)}</span>
        {x.handle && <span className="g-mono reply__h">{x.handle}</span>}
      </div>
      {x.who !== 'source' && <span className="g-mono reply__to">{t('bn.ui.replying', { h: replyTo })}</span>}
      <p className="reply__text" dir="auto">{x.text}</p>
      {x.likes > 0 && <span className="reply__likes"><Ico n="heart" size={12} />{compact(x.likes, t.lang)}</span>}
    </div>
  </li>)}</ul>;
}

// ---------- today's table (Daily): the server's board, read-only
function Board({ total }: { total: number }) {
  const t = useT();
  const s = useSave();
  const [st, set] = useState<{ rows: { nick: string; score: number; tier: string; me: boolean }[]; me?: { rank: number; score: number }; players: number } | 'off' | null>(null);
  useEffect(() => { v3<{ rows: { nick: string; score: number; tier: string; me: boolean }[]; me?: { rank: number; score: number }; players: number }>('lb.top', { period: 'daily', dev: s.dev }).then((r) => set(r.ok ? r : 'off')); }, [s.dev]);
  if (st === null) return <p className="g-mono">{t('common.loading')}</p>;
  if (st === 'off') return <p className="g-sub">{t('bn.ui.boardOff')}</p>;
  if (!st.rows.length) return <p className="g-sub">{t('bn.ui.boardEmpty')}</p>;
  return <div className="lb3">
    {st.me && <p className="lb3__you"><b>{t('bn.ui.boardYou', { r: st.me.rank, n: st.players })}</b> · {num(st.me.score ?? total)} {t('bn.ui.score').toLowerCase()}</p>}
    <ol>{st.rows.slice(0, 15).map((x, k) => <li key={k} className={x.me ? 'is-me' : ''}><span className="lb3__r g-num">{k + 1}</span><Avatar name={x.nick} size={26} me={x.me} /><span className="lb3__n">{x.nick}</span>{x.tier && <span className="g-mono lb3__t">{t('tier.' + x.tier)}</span>}<b className="g-num">{num(x.score)}</b></li>)}</ol>
  </div>;
}

// ---------- one saga's truth and every point (inside the sheets). `coach` (Practice, §30): under every read, why it
// pointed where it did: the street echo, the agent's bias, Off/Fake blindness, the kit man's "whether, not where".
function SagaRow({ p, c, R, k, startOpen, coach }: { p: ResultSaga; c: CastSaga; R: View['R']; k: number; startOpen?: boolean; coach?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(!!startOpen);
  const hj = p.truth === 1 && c.alt ? ' · ' + t('results.hijackTo', { c: c.alt.s }) : '';
  const why = p.right && !p.excl && p.call ? (p.why === 'twosource' ? t('results.whyTwo', { o: outWord(t.lang, p.truth) }) : p.why === 'beaten' && p.firstRight ? t('results.whyBeaten', { r: t('rival.' + p.firstRight.id), d: p.firstRight.day }) : p.why === 'uturn' ? t('results.whyUturn') : p.why === 'strength' ? t('results.whyStrength') : '') : '';
  const verdict = verdictOf(p);
  return <div className={'rrow is-' + verdict} style={{ ['--k' as string]: k }}>
    <button className="rrow__head" onClick={(e) => { e.stopPropagation(); setOpen(!open); }} aria-expanded={open}>
      <Kit club={p.truth === 1 && c.alt ? c.alt : p.truth === 0 ? c.to : c.from} player={c.player} size={44} />
      <span className="rrow__who"><b>{c.player.n}</b><span className="g-mono">{p.call ? strWord(t.lang, p.call.s) + ' ' + outWord(t.lang, p.call.o) + ' · ' + t('g.saga.dayShort', { n: p.call.day }) : t('results.notCalled')}</span></span>
      <span className={'g-stamp g-stamp--' + OUTS[p.truth]}>{outWord(t.lang, p.truth)}</span>
      <span className="rrow__pts g-num">{verdict === 'excl' && <Icon n="bolt" size={16} />}{num(p.pts, true)}</span>
    </button>
    {open && <div className="rrow__body">
      <p>{t('results.happened')}: <b>{outWord(t.lang, p.truth)}</b> · {t('out.' + OUTS[p.truth] + 'D', { to: c.to.s })}{hj}</p>
      {p.tw > 0 && <p>{t('results.twisted', { d: p.tw, a: outWord(t.lang, p.pre), b: outWord(t.lang, p.truth) })}</p>}
      {p.call && (p.right ? <>
        <Line l={t('results.base', { s: strWord(t.lang, p.call.s) })} v={p.parts.base} />
        {p.parts.early > 0 && <Line l={t('results.early', { d: p.call.day, n: R.DAYS - p.call.day })} v={p.parts.early} />}
        {p.parts.excl > 0 && <Line l={t('results.excl')} v={p.parts.excl} hot />}
      </> : <Line l={t('results.wrong', { s: strWord(t.lang, p.call.s) })} v={-p.parts.loss} />)}
      {p.parts.pen > 0 && <Line l={t('results.pen', { s: p.call && p.call.from ? strWord(t.lang, p.call.from.s) + ' ' + outWord(t.lang, p.call.from.o) : '' })} v={-p.parts.pen} />}
      {why && <p className="rrow__why">{why}</p>}
      <p className="rrow__spin">{t('results.spin', { o: outWord(t.lang, p.spin) })}</p>
      {(p.reads.length > 0 || p.posts.length > 0) && <ul className={'rrow__reads' + (coach ? ' is-coach' : '')}>
        {p.reads.map((x, j) => <li key={j} className={x.right ? 'ok' : 'no'}><span>{t('src.' + x.src)} · {t('common.day', { n: x.day })}</span><span>{saysWord(t.lang, x.src, x.r, c)}</span><Icon n={x.right ? 'check' : 'x'} size={16} />
          {coach && !x.right && <em className="rrow__why2">{t(whyKey(R, x, p.truth, p.tw))}</em>}</li>)}
        {p.posts.map((x, j) => <li key={'p' + j} className={x.right ? 'ok' : 'no'}><span>{t('rival.' + x.id)} · {t('common.day', { n: x.day })}</span><span>{outWord(t.lang, x.claim)}</span><Icon n={x.right ? 'check' : 'x'} size={16} />
          {coach && !x.right && R.CIRCLE[x.id] === 'street' && <em className="rrow__why2">{t('c38.why.rivalStreet')}</em>}</li>)}
      </ul>}
    </div>}
  </div>;
}
const Line = ({ l, v, hot }: { l: string; v: number; hot?: boolean }) => <div className="rrow__line"><span>{l}</span><b className={v < 0 ? 'neg' : hot ? 'hot' : ''}>{num(v, true)}</b></div>;

// ---------- share: the scoop card as an image where the device can share files, the text otherwise
function useShare(view: View, r: Result, what: string, hed: string, bestDest: CastSaga['to'], bc: CastSaga, text: string) {
  const t = useT();
  const s = useSave();
  const [msg, setMsg] = useState('');
  const best = [...r.per].sort((a, b) => b.pts - a.pts)[0];
  const sub = best && best.right && best.call ? (best.call.day >= view.R.DAYS ? t('results.calledItDD') : t('results.calledIt', { n: view.R.DAYS - best.call.day })) : r.called ? (r.tier === 'SPIKED' ? t('c38.share.line.spiked') : t('tierLine.' + r.tier)) : t('results.nothing');
  const url = 'sembagames.app/tier-one';
  const hwgIdx = hereWeGoOf(r);
  const card = () => ({ style: shareStyle(), hed, sub, kick: t('tier.' + r.tier) + (r.ex ? ' · ' + r.ex + '× ' + t('stamp.exclusive') : ''), no: what, date: fmtDate(Date.now(), t.lang, { day: 'numeric', month: 'short', year: 'numeric' }), by: t('share.by', { n: s.nick || 'Tier One' }), url, stats: [[num(r.total, true), t('results.total')], [`${r.right}/${r.per.length}`, t('career.right')], [String(r.ex), t('results.exclusives')]] as [string, string][], stamp: r.ex ? t('stamp.exclusive') : t('tier.' + r.tier), stampKind: r.ex ? 'exclusive' : r.tier === 'T1' ? 'exclusive' : r.tier === 'SPIKED' ? 'dead' : 'done', club: bestDest, no2: bc.player.no, who: bc.player.id, rtl: t.rtl, hwg: hwgIdx >= 0 ? catchphraseOf().text.toUpperCase() + ' · ' + bc.player.s : undefined });
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2400); };
  const send = async () => {
    onShared();
    try {
      const blob = await renderCard(card());
      const file = blob ? new File([blob], 'tier-one-scoop.png', { type: 'image/png' }) : null;
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (file && nav.canShare && nav.canShare({ files: [file] })) { await nav.share({ files: [file], text }); return; }
      if (nav.share) { await nav.share({ text }); return; }
      await navigator.clipboard.writeText(text); flash(t('c38.share.copied'));
    } catch { /* cancelled */ }
  };
  // The result text alone (the Wordle move): straight to the clipboard, no sheet.
  const copy = async (e?: React.MouseEvent) => {
    e?.stopPropagation(); onShared();
    try { await navigator.clipboard.writeText(text); flash(t('c38.share.copied')); } catch { flash(text); }
  };
  const save = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = await renderCard(card()); if (!blob) return;
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tier-one-scoop.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); onShared();
  };
  return { send, save, copy, msg, card };
}
