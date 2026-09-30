// Results (HYBRID.md §6, TIERONE-SAIF-01/02): the verdict lands first (tier stamp, score, rank, one line from the pub),
// then your calls as tweets, each with its best two or three replies from fans, rival journalists and your own sources.
// Everything else sits one tap away in a closable sheet: the whole thread, the full points breakdown, the table, sharing.
// Every game mode that plays a window (Daily, Friends rooms, Practice, Career) lands here.
import { useEffect, useMemo, useRef, useState } from 'react';
import { OUTS, type ResultSaga, type Result, type CastSaga } from '../lib/engine';
import type { View } from '../lib/driver';
import { useT, num, fmtDate, resetAt } from '../lib/i18n';
import { useSave } from '../lib/save';
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
import { BylineLine, useRecordWindow } from '../ui/connect';
import { Sheet } from '../ui/bits';
import { renderCard, shareText } from '../lib/share';
import type { Chrome } from '../App';
import '../styles/results.css';

const TIER_C: Record<string, string> = { T1: 'gold', T2: 'done', T3: 'done', T4: 'off', SPIKED: '' };
const LEAGUE_PTS: Record<string, number> = { T1: 30, T2: 20, T3: 12, T4: 6, SPIKED: 2 };
export interface Start { pp: number; credits: number; streak: number }
type Modal = null | { k: 'thread'; i: number } | { k: 'quiet' } | { k: 'breakdown' } | { k: 'board' } | { k: 'share' };
const ORDER: Record<string, number> = { excl: 0, right: 1, wrong: 2, none: 3 };

export function Results({ view, chrome, report, start, beat }: { view: View; chrome: Chrome; report: CareerReport | null; start?: Start; beat?: Beat | null }) {
  const t = useT();
  const s = useSave();
  const r = view.result!;
  const cast = (r.cast && r.cast.length ? r.cast : view.cast) as CastSaga[];
  const [stage, setStage] = useState(s.reduced ? 99 : 0);
  const [modal, setModal] = useState<Modal>(null);
  const root = useRef<HTMLDivElement>(null);
  const byline = useRecordWindow(view, beat, start?.pp); // One Byline (lib/byline.ts)
  const what = view.mode === 'daily' ? t('g.win.daily', { n: view.no || '' }) : view.mode === 'room' ? t('nav.rooms') + ' · ' + t('rooms.round', { n: (view.room?.round || 0) + 1 }) : view.mode === 'career' ? t('g.tabs.story') : t('nav.practice');
  const home = () => chrome.go({ n: 'front' });
  const again = () => chrome.go(view.mode === 'career' ? { n: 'story' } : view.mode === 'practice' ? { n: 'practice' } : view.mode === 'room' ? { n: 'rooms', code: view.room?.code } : { n: 'front' });

  // One seed per window: the same result always draws the same replies, in every language's own pools.
  const seed = view.seed || (view.no ? 'daily-' + view.no : view.room ? 'room-' + view.room.code + '-' + view.room.round : r.row || 'w');
  const { threads, verdict } = useMemo(() => {
    const b = new Banter(t.lang, seed);
    const th = r.per.map((p) => b.thread(p, cast[p.i], view.R));
    return { threads: th, verdict: b.verdict(r.tier) };
  }, [t.lang, seed, r]);
  const called = threads.filter((x) => x.verdict !== 'none').sort((a, b) => ORDER[a.verdict] - ORDER[b.verdict] || r.per[b.i].pts - r.per[a.i].pts);
  const quiet = threads.filter((x) => x.verdict === 'none');

  // stage: 0 press · 1 verdict · 2..1+n tweets · 2+n tier stamp · 3+n the rest
  const n = called.length;
  const TIER = 2 + n, PROG = 3 + n;
  useEffect(() => {
    if (stage >= PROG) return;
    const ms = stage === 0 ? 900 : stage === 1 ? 600 : stage < TIER ? 520 : 800;
    const id = setTimeout(() => setStage(stage + 1), ms);
    if (stage === 0) sfx('typewriter');
    if (stage === 1) sfx('reveal');
    if (stage >= 2 && stage < TIER) { const th = called[stage - 2]; sfx(th.verdict === 'excl' ? 'star' : th.verdict === 'right' ? 'good' : 'bad', stage - 2); }
    return () => clearTimeout(id);
  }, [stage]);
  useEffect(() => {
    if (stage !== TIER) return;
    if (r.tier === 'T1') { sfx('fanfare'); confetti(); buzz([30, 60, 30, 60, 80]); }
    else if (r.tier === 'SPIKED') { sfx('sad'); shake(root.current); buzz(120); }
    else { sfx('stamp.done'); buzz(30); if (r.tier === 'T2') confetti(['#2FBF71', '#F4EFE4', '#F7B928'], 60); }
  }, [stage]);
  const skip = () => { if (stage < PROG) setStage(99); };

  const best = [...r.per].sort((a, b) => b.pts - a.pts)[0];
  const bc = best ? cast[best.i] : cast[0];
  const bestDest = best && best.truth === 1 && bc.alt ? bc.alt : bc.to;
  const hed = best && best.right && best.call ? (best.truth <= 1 ? t('g.res.hedMove', { p: bc.player.s, c: bestDest.s }) : t('g.res.hedOut', { p: bc.player.s, o: outWord(t.lang, best.truth) })) : t('g.res.hedNone');
  const lv0 = levelOf(start ? start.pp : s.pp), lv1 = levelOf(s.pp);
  const coins = start ? Math.max(0, s.credits - start.credits) : 0;
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

  return <div className="g-screen results2 res3" ref={root} onClick={skip}>
    <TopBar back={{ label: t('g.tabs.home'), onClick: home }} title={what} />

    {stage === 0 && <div className="press" aria-hidden="true"><div className="press__roll" /><div className="press__sheet" /><p className="g-mono">{t('g.res.rolling')}</p></div>}

    {stage >= 1 && <>
      {/* ---- the verdict ---- */}
      <article className={'vcard g-card tier--' + r.tier}>
        <div className="vcard__mast"><span className="vcard__name">Tier One</span><span className="g-mono">{what} · {fmtDate(Date.now(), t.lang, { day: 'numeric', month: 'short' })}</span></div>
        <div className="vcard__row">
          <div className="vcard__main">
            <div className="g-mono vcard__k">{t('g.res.byline', { n: me.name })}</div>
            <h1 className="vcard__hed">{hed}</h1>
          </div>
          <div className="vcard__stampwrap">
            {stage >= TIER ? <span className={'vcard__stamp g-stamp is-slam g-stamp--' + (TIER_C[r.tier] || '')}>{t('tier.' + r.tier)}</span> : <Kit club={bestDest} player={bc.player} size={72} />}
          </div>
        </div>
        <div className="vcard__score">
          <div className="vcard__pts"><b className={'g-num' + (r.total < 0 ? ' neg' : '')}><CountUp to={r.total} ms={900 + n * 520} tick /></b><span className="g-mono">{t('results.total')}</span></div>
          <div><b className="g-num">{r.right}/{r.called}</b><span className="g-mono">{t('career.right')}</span></div>
          <div><b className="g-num">{r.ex}</b><span className="g-mono">{t('results.exclusives')}</span></div>
          {r.rank ? <div><b className="g-num">#{r.rank}</b><span className="g-mono">{r.players ? t('bn.ui.boardYou', { r: r.rank, n: r.players }) : t('g.res.rank')}</span></div> : null}
        </div>
        {stage >= TIER && <div className="vcard__pub">
          <p className="vcard__quip">{verdict.quip}</p>
          {verdict.idiom && <p className="vcard__idiom"><span className="g-mono">{t('bn.ui.pub')}</span> {verdict.idiom}</p>}
        </div>}
      </article>

      {/* ---- your calls, as tweets ---- */}
      <div className="res3__sec"><h2>{t('bn.ui.calls')}</h2><span className="g-mono">{t('bn.ui.callsAside', { a: r.right, b: r.called })}</span></div>
      <section className="tweets">
        {called.map((th, k) => stage >= 2 + k
          ? <Tweet key={th.i} th={th} p={r.per[th.i]} c={cast[th.i]} me={me} k={k} top={th.verdict === 'excl' ? 3 : 2} onOpen={open({ k: 'thread', i: th.i })} />
          : <div key={th.i} className="tweet tweet--ghost" />)}
        {quiet.length > 0 && stage >= TIER && <button className="quiet g-card g-card--desk" onClick={open({ k: 'quiet' })}>
          <span className="quiet__kits">{quiet.map((q) => <Kit key={q.i} club={cast[q.i].from} player={cast[q.i].player} size={30} />)}</span>
          <span className="quiet__txt"><b>{t('bn.ui.quiet')}</b><span className="g-mono">{t('bn.ui.quietN', { n: quiet.map((q) => cast[q.i].player.s).join(', ') })}</span>
            {quiet[0].replies[0] && <span className="quiet__line">“{quiet[0].replies[0].text}”</span>}</span>
          <Icon n={t.rtl ? 'back' : 'arrow'} size={18} />
        </button>}
        {n === 0 && stage >= TIER && <p className="tweets__none">{t('results.nothing')}</p>}
      </section>

      {stage >= PROG && <section className="res3__tail stagger">
        {/* ---- the doors: everything else is one tap away ---- */}
        <nav className="doors" style={{ ['--i' as string]: 0 }}>
          <button className="door" onClick={open({ k: 'breakdown' })}><Icon n="news" /><span>{t('bn.ui.breakdown')}</span></button>
          {view.mode !== 'practice' && <button className="door" onClick={onBoard}><Icon n={view.mode === 'career' ? 'story' : 'trophy'} /><span>{boardLabel}</span></button>}
          <button className="door door--hot" onClick={open({ k: 'share' })}><Icon n="share" /><span>{t('bn.ui.share')}</span></button>
        </nav>

        <div className="prog__row g-card g-card--desk" style={{ ['--i' as string]: 1 }}>
          <span className="prog__lv"><b>{lv1.n}</b><span className="g-mono">{t('g.me.level')}</span></span>
          <span className="prog__bar"><span className="g-mono">{lv1.n > lv0.n ? t('g.res.levelUp', { n: lv1.n }) : t('g.home.xp', { a: lv1.into, b: lv1.need })}</span>
            <span className="g-bar" style={{ ['--bar' as string]: 'linear-gradient(90deg,#FFD35C,#F7B928)' }}><i style={{ width: lv1.into + '%' }} /></span>
            {view.mode === 'daily' && <span className="g-mono res3__streak"><Icon n="flame" size={14} /> {t('g.res.streak', { n: s.streak.n })} · {t('results.league', { n: LEAGUE_PTS[r.tier] })}</span>}</span>
          {coins > 0 && <span className="prog__coins"><span className="g-coin" />+{coins}</span>}
        </div>
        <BylineLine sum={byline} style={{ ['--i' as string]: 1 }} />
        {report && s.career && <StoryBlock report={report} beat={beat || null} style={{ ['--i' as string]: 2 }} />}
        <div className="prog__acts" style={{ ['--i' as string]: 3 }}>
          <GBtn size="lg" shine onClick={view.mode === 'daily' ? () => chrome.go({ n: 'practice' }) : again}><Icon n={view.mode === 'daily' ? 'target' : 'phone'} />{view.mode === 'daily' ? t('g.res.practice') : view.mode === 'career' ? t('g.res.nextWindow') : view.mode === 'room' ? t('bn.ui.openRoom') : t('results.again')}</GBtn>
          <GBtn kind="dark" onClick={home}><Icon n="home" />{t('g.res.home')}</GBtn>
        </div>
        {view.mode === 'daily' && <p className="g-mono prog__tomorrow">{t('results.tomorrow', { t: resetAt() })}</p>}
      </section>}
    </>}
    {stage < PROG && stage > 0 && <p className="g-mono results2__skip">{t('g.call.tapSkip')}</p>}

    {/* ---- the sheets ---- */}
    <Sheet open={!!cur} onClose={close} label={t('bn.ui.allReplies')}>
      {cur && <div className="sheet__body res3sheet">
        <SheetHead title={t('bn.ui.allReplies')} onClose={close} />
        <Tweet th={cur} p={r.per[cur.i]} c={cast[cur.i]} me={me} k={0} top={99} still />
        <div className="res3sheet__sub g-mono">{t('bn.ui.breakdown')}</div>
        <SagaRow p={r.per[cur.i]} c={cast[cur.i]} R={view.R} k={0} startOpen />
      </div>}
    </Sheet>
    <Sheet open={modal?.k === 'quiet'} onClose={close} label={t('bn.ui.quiet')}>
      <div className="sheet__body res3sheet">
        <SheetHead title={t('bn.ui.quiet')} onClose={close} />
        {quiet.map((q) => <div key={q.i} className="quietsaga">
          <div className="quietsaga__h"><Kit club={cast[q.i].from} player={cast[q.i].player} size={36} /><b>{cast[q.i].player.n}</b><span className={'g-stamp g-stamp--' + OUTS[r.per[q.i].truth]}>{outWord(t.lang, r.per[q.i].truth)}</span></div>
          <Replies list={q.replies} replyTo={me.handle} />
        </div>)}
      </div>
    </Sheet>
    <Sheet open={modal?.k === 'breakdown'} onClose={close} label={t('bn.ui.breakdown')} wide>
      <div className="sheet__body res3sheet">
        <SheetHead title={t('bn.ui.breakdown')} aside={t('bn.ui.breakdownAside')} onClose={close} />
        <p className="res3sheet__tier">{t('tierLine.' + r.tier)}{r.tier !== 'T1' ? ' ' + t('results.t1Need', { n: view.R.TIERS.T1 }) : ''}</p>
        <section className="ledger2">{r.per.map((p, k) => <SagaRow key={p.i} p={p} c={cast[p.i]} R={view.R} k={k} />)}</section>
        {view.mode === 'daily' && r.par != null && <p className="g-mono res3sheet__par">{t('results.par', { n: num(r.par) })}{r.weekRank ? ' · ' + t('results.week', { r: r.weekRank, n: r.weekPlayers || 1 }) : ''}</p>}
      </div>
    </Sheet>
    <Sheet open={modal?.k === 'board'} onClose={close} label={t('bn.ui.board')}>
      <div className="sheet__body res3sheet">
        <SheetHead title={t('lb.title')} onClose={close} />
        {modal?.k === 'board' && <Board total={r.total} />}
      </div>
    </Sheet>
    <Sheet open={modal?.k === 'share'} onClose={close} label={t('bn.ui.share')}>
      <div className="sheet__body res3sheet">
        <SheetHead title={t('g.res.share')} onClose={close} />
        <ShareBlock view={view} r={r} what={what} hed={hed} bestDest={bestDest} bc={bc} />
      </div>
    </Sheet>
  </div>;
}

function SheetHead({ title, aside, onClose }: { title: string; aside?: string; onClose: () => void }) {
  const t = useT();
  return <div className="res3sheet__h"><div><b>{title}</b>{aside && <span className="g-mono">{aside}</span>}</div>
    <button className="g-icbtn res3sheet__x" onClick={onClose} aria-label={t('bn.ui.close')}><Icon n="x" /></button></div>;
}

// ---------- a call as a tweet, with its best replies
function Tweet({ th, p, c, me, k, top, onOpen, still }: { th: Thread; p: ResultSaga; c: CastSaga; me: { name: string; handle: string }; k: number; top: number; onOpen?: (e: React.MouseEvent) => void; still?: boolean }) {
  const t = useT();
  const shown = th.replies.slice(0, top);
  const more = th.replies.length - shown.length;
  const dest = p.truth === 1 && c.alt ? c.alt : p.truth === 0 ? c.to : c.from;
  return <article className={'tweet is-' + th.verdict + (still ? ' is-still' : '')} style={{ ['--k' as string]: k }}>
    <div className="tweet__main">
      <Avatar name={me.name} size={40} me />
      <div className="tweet__col">
        <div className="tweet__who"><b>{me.name}</b><span className="g-mono">{me.handle} · {t('bn.ui.dayN', { n: th.day })}</span></div>
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

// ---------- one saga's truth and every point (the old ledger row, now inside the sheets)
function SagaRow({ p, c, R, k, startOpen }: { p: ResultSaga; c: CastSaga; R: View['R']; k: number; startOpen?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(!!startOpen);
  const hj = p.truth === 1 && c.alt ? ' · ' + t('results.hijackTo', { c: c.alt.s }) : '';
  const why = p.right && !p.excl && p.call ? (p.why === 'twosource' ? t('results.whyTwo', { o: outWord(t.lang, p.truth) }) : p.why === 'beaten' && p.firstRight ? t('results.whyBeaten', { r: t('rival.' + p.firstRight.id), d: p.firstRight.day }) : p.why === 'uturn' ? t('results.whyUturn') : p.why === 'strength' ? t('results.whyStrength') : '') : '';
  const verdict = !p.call ? 'none' : p.excl ? 'excl' : p.right ? 'right' : 'wrong';
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
      {(p.reads.length > 0 || p.posts.length > 0) && <ul className="rrow__reads">
        {p.reads.map((x, j) => <li key={j} className={x.right ? 'ok' : 'no'}><span>{t('src.' + x.src)} · {t('common.day', { n: x.day })}</span><span>{saysWord(t.lang, x.src, x.r, c)}</span><Icon n={x.right ? 'check' : 'x'} size={16} /></li>)}
        {p.posts.map((x, j) => <li key={'p' + j} className={x.right ? 'ok' : 'no'}><span>{t('rival.' + x.id)} · {t('common.day', { n: x.day })}</span><span>{outWord(t.lang, x.claim)}</span><Icon n={x.right ? 'check' : 'x'} size={16} /></li>)}
      </ul>}
    </div>}
  </div>;
}
const Line = ({ l, v, hot }: { l: string; v: number; hot?: boolean }) => <div className="rrow__line"><span>{l}</span><b className={v < 0 ? 'neg' : hot ? 'hot' : ''}>{num(v, true)}</b></div>;

function StoryBlock({ report, beat, style }: { report: CareerReport; beat: Beat | null; style?: React.CSSProperties }) {
  const t = useT();
  const s = useSave();
  const c = s.career!;
  const nx = RANKS[c.rank + 1];
  return <div className="g-card storyres" style={style}>
    <div className="storyres__h"><Icon n="story" /><b>{t('g.story.ch.' + ['blog', 'comeback', 'stringer', 'rival', 'chronicle'][Math.min(4, c.rank)] + '.name')}</b></div>
    <div className="storyres__stats">
      <div><span className="g-mono">{t('g.res.cred')}</span><b className="g-num">{Math.round(report.repBefore)} → {Math.round(report.repAfter)}</b></div>
      <div><span className="g-mono">{t('g.me.followers')}</span><b className={'g-num' + (report.followers < 0 ? ' neg' : '')}>{num(report.followers, true)}</b></div>
      {report.favours > 0 && <div><span className="g-mono">{t('career.favours')}</span><b className="g-num">+{report.favours}</b></div>}
    </div>
    {report.promoted != null && <div className="storyres__promo"><span className="g-stamp g-stamp--gold is-slam">{t('g.res.promoted')}</span><b>{t('career.ranks.' + report.promoted)}</b><p>{t('career.unl.' + report.promoted)}</p></div>}
    {nx && report.promoted == null && <p className="storyres__next">{t('career.toNext', { w: Math.max(0, nx.gate[0] - c.windows), r: nx.gate[1], rank: t('career.ranks.' + (c.rank + 1)) })}</p>}
    {beat && <div className={'g-coach g-coach--editor storyres__beat from--' + beat.from}><b>{t('g.story.from.' + beat.from)}</b><p>{t(beatKey(beat), beat.v)}</p></div>}
  </div>;
}

function ShareBlock({ view, r, what, hed, bestDest, bc }: { view: View; r: Result; what: string; hed: string; bestDest: CastSaga['to']; bc: CastSaga }) {
  const t = useT();
  const s = useSave();
  const [msg, setMsg] = useState('');
  const best = [...r.per].sort((a, b) => b.pts - a.pts)[0];
  const sub = best && best.right && best.call ? (best.call.day >= view.R.DAYS ? t('results.calledItDD') : t('results.calledIt', { n: view.R.DAYS - best.call.day })) : r.called ? t('tierLine.' + r.tier) : t('results.nothing');
  const url = 'sembagames.app/tier-one';
  const text = shareText(t, { what, tier: t('tier.' + r.tier), pts: num(r.total), row: r.row || '', url: 'https://' + url });
  const card = { hed, sub, kick: t('tier.' + r.tier) + (r.ex ? ' · ' + r.ex + '× ' + t('stamp.exclusive') : ''), no: what, date: fmtDate(Date.now(), t.lang, { day: 'numeric', month: 'short', year: 'numeric' }), by: t('share.by', { n: s.nick || 'Tier One' }), url, stats: [[num(r.total, true), t('results.total')], [`${r.right}/${r.per.length}`, t('career.right')], [String(r.ex), t('results.exclusives')]] as [string, string][], stamp: r.ex ? t('stamp.exclusive') : t('tier.' + r.tier), stampKind: r.ex ? 'exclusive' : r.tier === 'T1' ? 'exclusive' : r.tier === 'SPIKED' ? 'dead' : 'done', club: bestDest, no2: bc.player.no, who: bc.player.id, rtl: t.rtl };
  const send = async (e: React.MouseEvent) => {
    e.stopPropagation(); onShared();
    try {
      const blob = await renderCard(card);
      const file = blob ? new File([blob], 'tier-one-scoop.png', { type: 'image/png' }) : null;
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (file && nav.canShare && nav.canShare({ files: [file] })) { await nav.share({ files: [file], text }); return; }
      if (nav.share) { await nav.share({ text }); return; }
      await navigator.clipboard.writeText(text); setMsg(t('common.copied'));
    } catch { /* cancelled */ }
  };
  const save = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = await renderCard(card); if (!blob) return;
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tier-one-scoop.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); onShared();
  };
  return <div className="sharebox g-card">
    <p className="g-sub">{t('g.res.shareSub')}</p>
    <div className="sharebox__row">{(r.row || '').split('').map((ch, k) => <i key={k} className={ch === '★' ? 'x' : ch === '■' ? 'r' : ch === '□' ? 'w' : 'n'}>{ch === '★' ? <Icon n="bolt" /> : ch === '■' ? <Icon n="check" /> : ch === '□' ? <Icon n="x" /> : '·'}</i>)}</div>
    <div className="sharebox__acts">
      <button className="g-btn g-btn--sm" onClick={send}><Icon n="share" />{t('common.share')}</button>
      <button className="g-btn g-btn--sm g-btn--paper" onClick={save}>{t('results.saveImg')}</button>
    </div>
    {msg && <p className="g-mono" style={{ marginTop: 8 }}>{msg}</p>}
  </div>;
}
