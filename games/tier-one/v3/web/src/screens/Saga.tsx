// The file: one saga on one screen (HYBRID.md §5). Player card, What we know, source tiles (locked ones say when they open),
// Make the call (Make a call / Decide later → what happens → how loud → stake line → hold to publish), the rival race.
// The maths sits behind "How's this scored?". 3.3 (GOTY.md §2) changes feel only: every number comes from the engine.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { E, OUTS, type Game, type Clue } from '../lib/engine';
import { useT, num } from '../lib/i18n';
import { leanOf, voiceLine, postLine, saysWord, addsText, outWord, strWord, streetCount, GRADE, vars, varsH } from '../lib/story';
import { Glyph, Lines, Crest } from '../ui/bits';
import { Icon, Kit, SrcIcon, Rel, GBtn } from '../ui/game';
import { GRADE_BARS } from '../ui/CallScene';
import { sfx, buzz } from '../lib/sfx';
import { hereWeGo } from '../lib/share';
import type { View } from '../lib/driver';

// Your head-to-head ledger against one rival (GOTY.md §1.3). Filled by the connect lane's rivalRecord(id).
export interface RivalRecord { w: number; l: number; d: number }
export interface SagaProps {
  view: View; g: Game; i: number; busy: boolean; last: { i: number; c: Clue } | null; dd: boolean;
  onAsk: (src: string) => void; onPost: (o: number, s: number, ut: boolean) => void; favours?: ReactNode; justFiled?: number; onLater?: () => void;
  /** Optional: the record shown under each rival avatar in the race strip. Nothing renders when absent or null. */
  rivalRecord?: (id: string) => RivalRecord | null | undefined;
}
export const RIVAL_IC: Record<string, string> = { tabloid: 'BB', itk: '?', insider: 'PP' };

export function SagaFile({ view, g, i, busy, dd, onAsk, onPost, favours, justFiled, onLater, rivalRecord }: SagaProps) {
  const t = useT();
  const c = view.cast[i];
  const ln = leanOf(g, i);
  const call = g.calls[i];
  const cs = E.callState(g, i);
  const canUt = !!call && E.canUturn(g, i);
  const [o, setO] = useState<number | null>(null);
  const [s, setS] = useState(1);
  const [how, setHow] = useState(false);
  const [clips, setClips] = useState(true);
  const [utOpen, setUtOpen] = useState(false);
  const [going, setGoing] = useState(false);
  useEffect(() => { setO(null); setS(1); setUtOpen(false); setGoing(false); }, [i, call ? call.o + ':' + call.s : '']);
  // Nothing is pre-picked: the call is yours.
  const selO = o;
  const pv = selO != null && (cs === 'ok' || canUt) && !(call && call.o === selO) ? E.preview(g, i, selO, s) : null;
  const tw = g.twist && g.twist.i === i ? g.twist : null;
  const reads = g.clues[i];
  const era = tw && g.day >= tw.day ? 1 : 0;
  const curReads = reads.filter((r) => r.era === era);
  const livePosts = E.livePosts(g, i);
  const srcs = E.sourcesFor(g.R, i);
  const post7 = g.day === g.R.DAYS ? g.R.DD_POSTS - g.posts7 : null;
  const maxT = Math.max(3, ...ln.tally);

  const backers = (k: number) => [
    ...curReads.filter((r) => { const w = E.weights(g.R, r.src, r.r); return w[k] > 0 && w[k] === Math.max(...w); }).map((r) => ({ k: r.src, rival: false })),
    ...livePosts.filter((p) => p.claim === k).map((p) => ({ k: p.id, rival: true })),
  ];
  const post = () => { if (selO == null) return; onPost(selO, s, !!call); };
  // The stake line's third beat: is the exclusive still there for this call, and if not, why (or who took it).
  const beatenBy = selO != null ? livePosts.find((p) => p.claim === selO) : undefined;
  const exTail = !pv ? null : pv.exclPossible ? <span className="stake__ex"><Icon n="bolt" size={14} />{t('calls.stake.open', { n: pv.excl })}</span>
    : call ? <span className="stake__no">{t('calls.stake.repost')}</span>
    : !E.exclusiveOpen(g, i, selO!) ? <span className="stake__no stake__beat">{beatenBy && <span className={'rv-av rv-av--sm rv-av--' + beatenBy.id}>{RIVAL_IC[beatenBy.id]}</span>}{t('calls.stake.beaten', { r: beatenBy ? t('rival.' + beatenBy.id) : '' })}</span>
    : s !== 2 ? <span className="stake__no">{t('calls.stake.loud')}</span>
    : <span className="stake__no">{t('calls.stake.two')}</span>;

  return <div className="file2">
    <div className={'pcard g-card' + (justFiled ? ' is-filed' : '')}>
      <div className="pcard__kit"><Kit club={c.from} player={c.player} size={92} /></div>
      <div className="pcard__main">
        <div className="g-mono pcard__k">{t('common.saga', { n: i + 1, m: view.cast.length })}{c.player.star >= 3 ? <span className="g-chip g-chip--gold pcard__star"><Icon n="star" />{t('g.saga.star')}</span> : null}</div>
        <h1 className="pcard__n">{c.player.n}</h1>
        <div className="pcard__m g-mono">{[t('pos.' + c.player.pos), c.player.age > 0 ? String(c.player.age) : '', c.player.nat].filter(Boolean).join(' · ')}</div>
        <div className="pcard__route"><Crest club={c.from} size={28} /><span className="pcard__arrow"><Icon n={t.rtl ? 'back' : 'arrow'} size={18} /></span><Crest club={c.to} size={28} /><span className="pcard__to"><bdi><b>{c.to.s}</b>?</bdi></span></div>
      </div>
      {call && <span key={call.o + ':' + call.s + ':' + (justFiled || 0)} className={'pcard__stamp g-stamp g-stamp--' + (hereWeGo(call) ? 'gold' : OUTS[call.o]) + (justFiled ? ' is-slam' : '')}>{hereWeGo(call) ? t('calls.hwg.stamp') : strWord(t.lang, call.s) + ' · ' + outWord(t.lang, call.o)}</span>}
    </div>

    {tw && <div className="stoppress"><b>{t('g.saga.stopPress')}</b><span>{t('saga.twistBanner', { p: c.player.s })} {t('saga.twistNote')}</span></div>}
    {g.tips && i in g.tips && <div className="g-chip g-chip--gold tipchip">{t(g.tips[i] ? 'career.tipFake' : 'career.tipReal', { p: c.player.s })}</div>}

    <section className="know g-card">
      <div className="know__h"><h2>{t('g.saga.know')}</h2><span className="g-mono">{t('g.saga.reports', { n: curReads.length + livePosts.length })}</span></div>
      {ln.none && <p className="know__none">{t('g.saga.knowNone')}</p>}
      <div className="know__rows">
        {[0, 1, 2, 3].map((k) => {
          const b = backers(k), cn = E.circlesFor(g, i, k).size;
          return <div key={k} className={'know__r oc--' + OUTS[k] + (!ln.none && ln.o === k ? ' is-lead' : '') + (ln.tally[k] ? '' : ' is-zero')}>
            <span className="know__o"><Glyph o={k} /><b>{outWord(t.lang, k)}</b></span>
            <span className="know__bar"><i style={{ width: (100 * ln.tally[k]) / maxT + '%' }} /></span>
            <span className="know__who">{b.slice(0, 4).map((x, n) => x.rival ? <span key={n} className={'rv-av rv-av--sm rv-av--' + x.k}>{RIVAL_IC[x.k]}</span> : <SrcIcon key={n} k={x.k} size={22} />)}{cn >= 2 && <span className="g-chip g-chip--done know__two" title={t('daily.circles', { n: cn })}><Icon n="check" />{cn}</span>}</span>
          </div>;
        })}
      </div>
      {streetCount(g, i) >= 2 && <p className="know__warn"><Icon n="eye" size={14} /> {t('g.saga.echo')}</p>}
      {view.posterior && <p className="know__coach g-mono">{t('saga.coach')} · {view.posterior(i).map((p, k) => `${outWord(t.lang, k)} ${Math.round(p * 100)}%`).join(' · ')}</p>}
    </section>

    <section>
      <div className="g-sec"><h2>{t('g.saga.ring')}</h2><span className="g-mono phones-left"><span className="phones">{Array.from({ length: Math.min(8, Math.max(g.left, 0)) }, (_, k) => <Icon key={k} n="phone" size={13} />)}</span>{t('g.saga.left', { n: g.left })}</span></div>
      <div className="srcs">
        {srcs.map((k) => {
          const st = E.askState(g, i, k), so = E.srcOf(g.R, i, k)!;
          const asked = curReads.filter((r) => r.src === k);
          const lastR = asked[asked.length - 1];
          const lw = lastR ? E.weights(g.R, k, lastR.r) : null;
          return <button key={k} className={'src' + (st === 'ok' ? '' : ' is-' + st)} data-src={k} disabled={st !== 'ok' || busy} onClick={() => onAsk(k)}>
            <span className="src__cost">{st === 'closed' ? <Icon n="lock" size={11} /> : <><Icon n="phone" size={11} />{so.cost}</>}</span>
            <SrcIcon k={k} size={46} />
            <span className="src__n">{t('g.src.' + k)}</span>
            {lastR && lw ? <span className={'g-chip src__says g-chip--' + OUTS[lw.indexOf(Math.max(...lw))]}>{saysWord(t.lang, k, lastR.r, c)}</span>
              : st === 'closed' ? <span className="src__opens">{t('d2.opens', { n: so.from })}</span>
              : <span className="src__rel"><Rel n={GRADE_BARS[GRADE[k]] || 1} /></span>}
          </button>;
        })}
      </div>
      {favours}
    </section>

    {(curReads.length > 0 || livePosts.length > 0) && <section className="clips">
      <button className="clips__h" onClick={() => setClips(!clips)} aria-expanded={clips}><span>{t('g.saga.clippings', { n: curReads.length + livePosts.length })}</span><Icon n={clips ? 'x' : 'news'} size={18} /></button>
      {clips && <ol className="clips__l">
        {[...curReads.map((r, k) => ({ d: r.day, el: <li key={'r' + k} className="clip"><SrcIcon k={r.src} size={30} /><div><div className="clip__h"><b>{t('src.' + r.src)}</b><span className="g-mono">{t('common.day', { n: r.day })}</span><span className="g-chip">{saysWord(t.lang, r.src, r.r, c)}</span></div><p>{voiceLine(t.lang, c, r)}</p><span className="clip__adds g-mono">{addsText(t.lang, E.weights(g.R, r.src, r.r))}</span></div></li> })),
          ...livePosts.map((p, k) => ({ d: p.day + .5, el: <li key={'p' + k} className="clip clip--rival"><span className={'rv-av rv-av--' + p.id}>{RIVAL_IC[p.id]}</span><div><div className="clip__h"><b>{t('rival.' + p.id)}</b><span className="g-mono">{t('common.day', { n: p.day })}</span><span className={'g-chip g-chip--' + OUTS[p.claim]}>{outWord(t.lang, p.claim)}</span></div><p>{postLine(t.lang, c, p)}</p></div></li> }))].sort((a, b) => b.d - a.d).map((x) => x.el)}
      </ol>}
    </section>}

    <section className={'callbox g-card' + (dd ? ' is-dd' : '')} id={'file-' + i}>
      <div className="callbox__h"><h2>{call ? (utOpen ? t('g.saga.changeCall') : t('g.saga.yourCall')) : t('g.saga.makeCall')}</h2>{post7 != null && <span className="g-chip g-chip--red">{t('dd.posts', { n: post7 })}</span>}</div>
      {call && <p className="callbox__filed">{t('g.saga.filedLine', { s: strWord(t.lang, call.s), o: outWord(t.lang, call.o), d: call.day })}{canUt ? ' ' + t('saga.uturnNote', { p: g.R.UT_PEN[call.s] }) : call.ut ? ' ' + t('saga.uturnUsed') : ''}</p>}
      {canUt && !utOpen && <GBtn kind="paper" size="sm" className="callbox__ut" onClick={() => setUtOpen(true)}><Icon n="uturn" />{t('calls.repost.open')}</GBtn>}
      {cs === 'ok' && !call && !going && <div className="callgate">
        <p className="callgate__q">{t('d2.call.lead', { p: c.player.s })}</p>
        <div className="callgate__b">
          <GBtn kind="paper" onClick={() => onLater?.()}><Icon n="clock" />{t('d2.call.later')}</GBtn>
          <GBtn onClick={() => setGoing(true)} sound="page.turn"><Icon n="pen" />{t('d2.call.make')}</GBtn>
        </div>
      </div>}
      {((cs === 'ok' && (going || !!call)) || (canUt && utOpen)) && <div className="callform">
        <div className="step"><span className="step__n">1</span>{t('g.saga.what')}</div>
        <div className="outs">
          {[0, 1, 2, 3].map((k) => <button key={k} className={'out oc--' + OUTS[k]} aria-pressed={selO === k} disabled={!!call && call.o === k} onClick={() => { sfx('thock', OUTS[k]); setO(k); }}>
            <Glyph o={k} /><b>{outWord(t.lang, k)}</b><span>{t('out.' + OUTS[k] + 'D', vars(c))}</span>
          </button>)}
        </div>
        <div className="step"><span className="step__n">2</span>{t('g.saga.loud')}</div>
        <div className="vols">
          {[0, 1, 2].map((k) => { const p = selO != null ? E.preview(g, i, selO, k) : null; return <button key={k} className={'vol vol--' + k} aria-pressed={s === k} onClick={() => { sfx('ui.tap'); setS(k); }}>
            <span className="vol__meter">{[0, 1, 2].map((m) => <i key={m} className={m <= k ? 'on' : ''} />)}</span>
            <b>{strWord(t.lang, k)}</b>
            {p ? <span className="vol__odds"><span className="w">+{p.win}</span><span className="l">{num(p.lose)}</span></span> : <span className="vol__d">{t('str.' + ['talks', 'advanced', 'confirmed'][k] + 'D')}</span>}
          </button>; })}
        </div>
        {pv && <p className="stake" aria-live="polite"><span className="stake__w">{t('calls.stake.right', { n: pv.win })}</span><span className="stake__l">{t('calls.stake.wrong', { n: num(pv.lose) })}</span>{exTail}</p>}
        <HoldPublish disabled={selO == null || busy || (!!call && call.o === selO)} shine={selO != null} gold={selO === 0 && s === 2 && !call} onCommit={post}
          label={selO == null ? t('saga.pick') : call ? t('calls.repost.btn', { o: outWord(t.lang, selO) }) : t('g.saga.publish', { s: strWord(t.lang, s), o: outWord(t.lang, selO) })}>
          <Icon n={call ? 'uturn' : 'news'} size={24} /><span className="publish__t">{selO == null ? t('saga.pick') : call ? t('calls.repost.btn', { o: outWord(t.lang, selO) }) : selO === 0 && s === 2 ? <><b>{t('calls.hwg.word')}</b><em>{t('g.saga.publish', { s: strWord(t.lang, s), o: outWord(t.lang, selO) })}</em></> : (() => { const [h, ...rest] = t('g.saga.publish', { s: strWord(t.lang, s), o: outWord(t.lang, selO) }).split(' · '); return rest.length ? <><b>{h}</b><em>{rest.join(' · ')}</em></> : h; })()}</span>
        </HoldPublish>
      </div>}
      {cs === 'nosource' && !call && <p className="callbox__none"><Icon n="phone" size={16} /> {t('g.saga.noStory')}</p>}
    </section>

    <section className="rivals race">
      <div className="g-sec"><h2>{t('calls.race.h')}</h2></div>
      <div className="rivals__row">
        {g.R.RIVALS.map((r) => {
          const mine = livePosts.filter((p) => p.id === r.id), rec = rivalRecord?.(r.id), name = t('rival.' + r.id);
          return <div key={r.id + (mine.length ? ':' + mine[0].claim : '')} className={'rv' + (mine.length ? ' is-posted rv--' + OUTS[mine[0].claim] : '')}>
            <span className={'rv-av rv-av--' + r.id}>{RIVAL_IC[r.id]}</span>
            <span className="rv__n">{name}</span>
            {mine.length ? <span className={'g-chip g-chip--' + OUTS[mine[0].claim]}>{outWord(t.lang, mine[0].claim)} · {t('g.saga.dayShort', { n: mine[0].day })}</span> : <span className="rv__when g-mono">{t('g.saga.rivalWhen', { a: r.days[0], b: r.days[1] })}</span>}
            {rec && <span className="rv__rec g-mono" aria-label={t('calls.race.recAria', { w: rec.w, l: rec.l, d: rec.d, r: name })}>{t('calls.race.rec', { w: rec.w, l: rec.l, d: rec.d })}</span>}
          </div>;
        })}
      </div>
    </section>

    <button className="howbtn" onClick={() => setHow(!how)} aria-expanded={how}><Icon n="help" size={16} />{t('g.saga.how')}</button>
    {how && <HowScored g={g} i={i} view={view} />}
  </div>;
}

// Hold to publish (GOTY.md §2): the button fills over 600 ms while held and fires when full. A tap (press and release
// early) still publishes, as do Enter and Space. Sliding off or a scroll cancels. A buzz on commit.
const HOLD_MS = 600;
function HoldPublish({ disabled, onCommit, children, label, shine, gold }: { disabled: boolean; onCommit: () => void; children: ReactNode; label: string; shine?: boolean; gold?: boolean }) {
  const t = useT();
  const [k, setK] = useState(0);
  const st = useRef({ on: false, done: false, t0: 0, raf: 0, tick: 0 });
  useEffect(() => { st.current.done = false; setK(0); }, [disabled]);
  useEffect(() => () => cancelAnimationFrame(st.current.raf), []);
  const stop = () => { const x = st.current; x.on = false; cancelAnimationFrame(x.raf); if (!x.done) setK(0); };
  const commit = () => {
    const x = st.current; if (x.done || disabled) return;
    x.done = true; x.on = false; cancelAnimationFrame(x.raf); setK(1);
    buzz(gold ? [18, 30, 40] : [12, 24, 30]);
    onCommit();
  };
  const down = (e: React.PointerEvent) => {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const x = st.current; x.on = true; x.done = false; x.t0 = performance.now(); x.tick = 0; sfx('ui.tap');
    const step = (now: number) => {
      if (!x.on) return;
      const f = Math.min(1, (now - x.t0) / HOLD_MS); setK(f);
      const q = Math.floor(f * 4); if (q > x.tick && f < 1) { x.tick = q; sfx('count'); }
      if (f >= 1) commit(); else x.raf = requestAnimationFrame(step);
    };
    x.raf = requestAnimationFrame(step);
  };
  const up = () => { if (st.current.on && !st.current.done) commit(); };
  return <button type="button" className={'g-btn g-btn--lg publish hold' + (gold ? ' g-btn--gold is-hwg' : '') + (k > 0 && k < 1 ? ' is-holding' : '') + (k >= 1 ? ' is-full' : '')}
    style={{ ['--hold' as string]: String(k) }} disabled={disabled} aria-label={t('calls.hold.aria', { l: label })} title={t('calls.hold.hint')}
    onPointerDown={down} onPointerUp={up} onPointerLeave={stop} onPointerCancel={stop} onContextMenu={(e) => e.preventDefault()}
    onClick={(e) => { if (e.detail === 0) commit(); }}>
    <span className="hold__fill" aria-hidden="true" />{shine && <span className="shine" />}{children}
  </button>;
}

function HowScored({ g, i, view }: { g: Game; i: number; view: View }) {
  const t = useT();
  const c = view.cast[i];
  const ln = leanOf(g, i);
  const srcs = E.sourcesFor(g.R, i);
  return <div className="g-card howbox">
    <p className="g-sub">{t('g.saga.howIntro')}</p>
    <ul className="howbox__src">{srcs.map((k) => <li key={k}><SrcIcon k={k} size={26} /><div><b>{t('src.' + k)}</b><span>{t('src.' + k + 'P')}</span><em className="g-mono">{t('src.' + k + 'Rule', varsH(c))}</em></div></li>)}</ul>
    <div className="howbox__tally">{[0, 1, 2, 3].map((k) => <span key={k} className={'oc--' + OUTS[k]}><Glyph o={k} />{outWord(t.lang, k)} <b>{ln.tally[k]}</b> <Lines n={E.circlesFor(g, i, k).size} max={2} /></span>)}</div>
    <p className="g-sub">{t('g.saga.howPoints', { t: g.R.BASE.join(' / '), l: g.R.LOSS.join(' / ') })}</p>
  </div>;
}
