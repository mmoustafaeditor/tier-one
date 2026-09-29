// Results (HYBRID.md §6): the presses roll, your front page drops, each saga flips to the truth with its points, the tier
// badge lands, then XP, coins, streak and the story. Every point is still explained, one tap down.
import { useEffect, useRef, useState } from 'react';
import { OUTS, type ResultSaga, type Result, type CastSaga } from '../lib/engine';
import type { View } from '../lib/driver';
import { useT, num, fmtDate } from '../lib/i18n';
import { useSave } from '../lib/save';
import { outWord, strWord, saysWord } from '../lib/story';
import { onShared } from '../lib/meta';
import { RANKS } from '../lib/career';
import type { CareerReport } from '../lib/career';
import { levelOf } from '../lib/progress';
import { beatKey, type Beat } from '../lib/storyMode';
import { sfx, buzz } from '../lib/sfx';
import { Icon, Kit, GBtn, TopBar, CountUp, confetti, shake } from '../ui/game';
import { renderCard, shareText } from '../lib/share';
import type { Chrome } from '../App';

const TIER_C: Record<string, string> = { T1: 'gold', T2: 'done', T3: 'done', T4: 'off', SPIKED: '' };
export interface Start { pp: number; credits: number; streak: number }

export function Results({ view, chrome, report, start, beat }: { view: View; chrome: Chrome; report: CareerReport | null; start?: Start; beat?: Beat | null }) {
  const t = useT();
  const s = useSave();
  const r = view.result!;
  const cast = (r.cast && r.cast.length ? r.cast : view.cast) as CastSaga[];
  const n = r.per.length;
  const [stage, setStage] = useState(s.reduced ? 99 : 0);
  const root = useRef<HTMLDivElement>(null);
  const what = view.mode === 'daily' ? t('g.win.daily', { n: view.no || '' }) : view.mode === 'room' ? t('nav.rooms') + ' · ' + t('rooms.round', { n: (view.room?.round || 0) + 1 }) : view.mode === 'career' ? t('g.tabs.story') : t('nav.practice');
  const home = () => chrome.go({ n: 'front' });
  const again = () => chrome.go(view.mode === 'career' ? { n: 'story' } : view.mode === 'practice' ? { n: 'practice' } : view.mode === 'room' ? { n: 'rooms' } : { n: 'front' });
  // stage: 0 press · 1 page · 2..1+n sagas · 2+n tier · 3+n progress
  const TIER = 2 + n, PROG = 3 + n;
  useEffect(() => {
    if (stage >= PROG) return;
    const ms = stage === 0 ? 1100 : stage === 1 ? 700 : stage < TIER ? 480 : 900;
    const id = setTimeout(() => setStage(stage + 1), ms);
    if (stage === 0) sfx('typewriter');
    if (stage === 1) sfx('reveal');
    if (stage >= 2 && stage < TIER) { const p = r.per[stage - 2]; sfx(p.excl ? 'star' : p.right ? 'good' : p.call ? 'bad' : 'page.turn', stage - 2); }
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

  return <div className="g-screen results2" ref={root} onClick={skip}>
    <TopBar back={{ label: t('g.tabs.home'), onClick: home }} title={what} />

    {stage === 0 && <div className="press" aria-hidden="true"><div className="press__roll" /><div className="press__sheet" /><p className="g-mono">{t('g.res.rolling')}</p></div>}

    {stage >= 1 && <>
      <article className="front g-card">
        <div className="front__mast"><span className="front__name">Tier One</span><span className="g-mono">{what}<br />{fmtDate(Date.now(), t.lang, { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
        <div className="front__rule" />
        <div className="front__row">
          <div className="front__main">
            <div className="g-mono front__k">{t('g.res.byline', { n: s.nick || t('g.home.noName') })}</div>
            <h1 className="front__hed">{hed}</h1>
            {stage >= TIER && <span className={'front__tier g-stamp is-slam g-stamp--' + (TIER_C[r.tier] || '')}>{t('tier.' + r.tier)}</span>}
          </div>
          <div className="front__kit"><Kit club={bestDest} player={bc.player} size={86} /></div>
        </div>
        <div className="front__score">
          <div><span className="g-mono">{t('results.total')}</span><b className={'g-num' + (r.total < 0 ? ' neg' : '')}><CountUp to={r.total} ms={900 + n * 480} tick /></b></div>
          <div><span className="g-mono">{t('career.right')}</span><b className="g-num">{r.right}/{r.called}</b></div>
          <div><span className="g-mono">{t('results.exclusives')}</span><b className="g-num">{r.ex}</b></div>
          {r.rank ? <div><span className="g-mono">{t('g.res.rank')}</span><b className="g-num">#{r.rank}</b></div> : null}
        </div>
      </article>

      {stage >= TIER && <p className="tierline">{t('tierLine.' + r.tier)}{r.tier !== 'T1' ? ' ' + t('results.t1Need', { n: view.R.TIERS.T1 }) : ''}</p>}

      <section className="ledger2">
        {r.per.map((p, k) => stage >= 2 + k ? <SagaRow key={p.i} p={p} c={cast[p.i]} R={view.R} k={k} /> : <div key={p.i} className="lrow lrow--hidden" />)}
      </section>

      {stage >= PROG && <section className="prog stagger">
        <div className="prog__row g-card g-card--desk" style={{ ['--i' as string]: 0 }}>
          <span className="prog__lv"><b>{lv1.n}</b><span className="g-mono">{t('g.me.level')}</span></span>
          <span className="prog__bar"><span className="g-mono">{lv1.n > lv0.n ? t('g.res.levelUp', { n: lv1.n }) : t('g.home.xp', { a: lv1.into, b: lv1.need })}</span>
            <span className="g-bar" style={{ ['--bar' as string]: 'linear-gradient(90deg,#FFD35C,#F7B928)' }}><i style={{ width: lv1.into + '%' }} /></span></span>
          {coins > 0 && <span className="prog__coins"><span className="g-coin" />+{coins}</span>}
        </div>
        {view.mode === 'daily' && <div className="prog__row g-card g-card--desk" style={{ ['--i' as string]: 1 }}>
          <span className="prog__flame"><Icon n="flame" /></span>
          <span className="prog__bar"><b>{t('g.res.streak', { n: s.streak.n })}</b><span className="g-mono">{r.par != null ? t('results.par', { n: num(r.par) }) : ''}{r.weekRank ? ' · ' + t('results.week', { r: r.weekRank, n: r.weekPlayers || 1 }) : ''}</span></span>
          <span className="g-chip g-chip--gold">{t('results.league', { n: { T1: 30, T2: 20, T3: 12, T4: 6, SPIKED: 2 }[r.tier] })}</span>
        </div>}
        {report && s.career && <StoryBlock report={report} beat={beat || null} style={{ ['--i' as string]: 2 }} />}
        <ShareBlock view={view} r={r} cast={cast} what={what} hed={hed} bestDest={bestDest} bc={bc} />
        <div className="prog__acts" style={{ ['--i' as string]: 4 }}>
          <GBtn size="lg" shine onClick={view.mode === 'daily' ? () => chrome.go({ n: 'practice' }) : again}><Icon n={view.mode === 'daily' ? 'target' : 'phone'} />{view.mode === 'daily' ? t('g.res.practice') : view.mode === 'career' ? t('g.res.nextWindow') : t('results.again')}</GBtn>
          <GBtn kind="dark" onClick={home}><Icon n="home" />{t('g.res.home')}</GBtn>
        </div>
        {view.mode === 'daily' && <p className="g-mono prog__tomorrow">{t('results.tomorrow')}</p>}
      </section>}
    </>}
    {stage < PROG && stage > 0 && <p className="g-mono results2__skip">{t('g.call.tapSkip')}</p>}
  </div>;
}

function SagaRow({ p, c, R, k }: { p: ResultSaga; c: CastSaga; R: View['R']; k: number }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const hj = p.truth === 1 && c.alt ? ' · ' + t('results.hijackTo', { c: c.alt.s }) : '';
  const why = p.right && !p.excl && p.call ? (p.why === 'twosource' ? t('results.whyTwo', { o: outWord(t.lang, p.truth) }) : p.why === 'beaten' && p.firstRight ? t('results.whyBeaten', { r: t('rival.' + p.firstRight.id), d: p.firstRight.day }) : p.why === 'uturn' ? t('results.whyUturn') : p.why === 'strength' ? t('results.whyStrength') : '') : '';
  const verdict = !p.call ? 'none' : p.excl ? 'excl' : p.right ? 'right' : 'wrong';
  return <div className={'lrow is-' + verdict} style={{ ['--k' as string]: k }}>
    <button className="lrow__head" onClick={(e) => { e.stopPropagation(); setOpen(!open); }} aria-expanded={open}>
      <Kit club={p.truth === 1 && c.alt ? c.alt : p.truth === 0 ? c.to : c.from} player={c.player} size={44} />
      <span className="lrow__who"><b>{c.player.n}</b><span className="g-mono">{p.call ? strWord(t.lang, p.call.s) + ' ' + outWord(t.lang, p.call.o) + ' · ' + t('g.saga.dayShort', { n: p.call.day }) : t('results.notCalled')}</span></span>
      <span className={'g-stamp g-stamp--' + OUTS[p.truth]}>{outWord(t.lang, p.truth)}</span>
      <span className="lrow__pts g-num">{verdict === 'excl' && <Icon n="bolt" size={16} />}{num(p.pts, true)}</span>
    </button>
    {open && <div className="lrow__body">
      <p>{t('results.happened')}: <b>{outWord(t.lang, p.truth)}</b> · {t('out.' + OUTS[p.truth] + 'D', { to: c.to.s })}{hj}</p>
      {p.tw > 0 && <p>{t('results.twisted', { d: p.tw, a: outWord(t.lang, p.pre), b: outWord(t.lang, p.truth) })}</p>}
      {p.call && (p.right ? <>
        <Line l={t('results.base', { s: strWord(t.lang, p.call.s) })} v={p.parts.base} />
        {p.parts.early > 0 && <Line l={t('results.early', { d: p.call.day, n: R.DAYS - p.call.day })} v={p.parts.early} />}
        {p.parts.excl > 0 && <Line l={t('results.excl')} v={p.parts.excl} hot />}
      </> : <Line l={t('results.wrong', { s: strWord(t.lang, p.call.s) })} v={-p.parts.loss} />)}
      {p.parts.pen > 0 && <Line l={t('results.pen', { s: p.call && p.call.from ? strWord(t.lang, p.call.from.s) + ' ' + outWord(t.lang, p.call.from.o) : '' })} v={-p.parts.pen} />}
      {why && <p className="lrow__why">{why}</p>}
      <p className="lrow__spin">{t('results.spin', { o: outWord(t.lang, p.spin) })}</p>
      {(p.reads.length > 0 || p.posts.length > 0) && <ul className="lrow__reads">
        {p.reads.map((x, j) => <li key={j} className={x.right ? 'ok' : 'no'}><span>{t('src.' + x.src)} · {t('common.day', { n: x.day })}</span><span>{saysWord(t.lang, x.src, x.r, c)}</span><Icon n={x.right ? 'check' : 'x'} size={16} /></li>)}
        {p.posts.map((x, j) => <li key={'p' + j} className={x.right ? 'ok' : 'no'}><span>{t('rival.' + x.id)} · {t('common.day', { n: x.day })}</span><span>{outWord(t.lang, x.claim)}</span><Icon n={x.right ? 'check' : 'x'} size={16} /></li>)}
      </ul>}
    </div>}
  </div>;
}
const Line = ({ l, v, hot }: { l: string; v: number; hot?: boolean }) => <div className="lrow__line"><span>{l}</span><b className={v < 0 ? 'neg' : hot ? 'hot' : ''}>{num(v, true)}</b></div>;

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

function ShareBlock({ view, r, cast, what, hed, bestDest, bc }: { view: View; r: Result; cast: CastSaga[]; what: string; hed: string; bestDest: CastSaga['to']; bc: CastSaga }) {
  const t = useT();
  const s = useSave();
  const [msg, setMsg] = useState('');
  const best = [...r.per].sort((a, b) => b.pts - a.pts)[0];
  const sub = best && best.right && best.call ? (best.call.day >= view.R.DAYS ? t('results.calledItDD') : t('results.calledIt', { n: view.R.DAYS - best.call.day })) : r.called ? t('tierLine.' + r.tier) : t('results.nothing');
  const url = 'sembagames.app/tier-one';
  const text = shareText(t, { what, tier: t('tier.' + r.tier), pts: num(r.total), row: r.row || '', url: 'https://' + url });
  const card = { hed, sub, kick: t('tier.' + r.tier) + (r.ex ? ' · ' + r.ex + '× ' + t('stamp.exclusive') : ''), no: what, date: fmtDate(Date.now(), t.lang, { day: 'numeric', month: 'short', year: 'numeric' }), by: t('share.by', { n: s.nick || 'Tier One' }), url, stats: [[num(r.total, true), t('results.total')], [`${r.right}/${r.per.length}`, t('career.right')], [String(r.ex), t('results.exclusives')]] as [string, string][], stamp: r.ex ? t('stamp.exclusive') : t('tier.' + r.tier), stampKind: r.ex ? 'exclusive' : r.tier === 'T1' ? 'exclusive' : r.tier === 'SPIKED' ? 'dead' : 'done', club: bestDest, no2: bc.player.no, who: bc.player.id, rtl: t.rtl };
  void cast;
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
  return <div className="sharebox g-card" style={{ ['--i' as string]: 3 }}>
    <div className="sharebox__h"><Icon n="share" /><b>{t('g.res.share')}</b></div>
    <p className="g-sub">{t('g.res.shareSub')}</p>
    <div className="sharebox__row">{(r.row || '').split('').map((ch, k) => <i key={k} className={ch === '★' ? 'x' : ch === '■' ? 'r' : ch === '□' ? 'w' : 'n'}>{ch === '★' ? <Icon n="bolt" /> : ch === '■' ? <Icon n="check" /> : ch === '□' ? <Icon n="x" /> : '·'}</i>)}</div>
    <div className="sharebox__acts">
      <button className="g-btn g-btn--sm" onClick={send}><Icon n="share" />{t('common.share')}</button>
      <button className="g-btn g-btn--sm g-btn--paper" onClick={save}>{t('results.saveImg')}</button>
    </div>
    {msg && <p className="g-mono" style={{ marginTop: 8 }}>{msg}</p>}
  </div>;
}
