// The Player File (LAUNCH_BRIEF §27, 3.8): the best screen in the game. One saga, one screen, readable in two seconds:
//   header     portrait slot (Addendum A) · player, age / position · current club → linked club · saga no. · heat
//   evidence   Done / Hijack / Off / Fake bars with source-circle markers, one word (Strong / Split / Weak) and the
//              independence line ("2 independent sources agree" · "Echo chamber: …") (§6). No percentages in ranked
//              play; Practice Coach mode prints the exact odds (§5).
//   tabs       Sources · Clippings · Your Call
//   sources    identity, what it knows, cost, opening day, qualitative reliability, whether already called (§5)
//   your call  what happens → how sure → the stake in words, the Exclusive line, hold to publish (§7)
//   sticky     Back to Board · Make the Call
// Every number comes from the engine (E.preview, R.*); nothing here is typed in.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { E, OUTS, type Game, type Clue } from '../lib/engine';
import { useT, num } from '../lib/i18n';
import { leanOf, voiceLine, postLine, saysWord, outWord, strWord, vars, varsH, evidenceOf, relKey, GRADE } from '../lib/story';
import { Glyph, Lines, Crest } from '../ui/bits';
import { Icon, SrcIcon, GBtn } from '../ui/game';
import { Portrait, moodFor } from '../ui/portrait';
import { sfx, buzz } from '../lib/sfx';
import { hereWeGo } from '../lib/share';
import type { View } from '../lib/driver';
import { vinceOf } from '../lib/career';
import { srcNamed } from '../lib/storyMode';
import { catchphraseOf } from '../lib/catchphrase';

// Your head-to-head ledger against one rival (GOTY.md §1.3). Filled by the connect lane's rivalRecord(id).
export interface RivalRecord { w: number; l: number; d: number }
export interface SagaProps {
  view: View; g: Game; i: number; busy: boolean; last: { i: number; c: Clue } | null; dd: boolean;
  onAsk: (src: string) => void; onPost: (o: number, s: number, ut: boolean) => void; favours?: ReactNode; justFiled?: number; onLater?: () => void;
  /** Optional: the record shown under each rival avatar in the race strip. Nothing renders when absent or null. */
  rivalRecord?: (id: string) => RivalRecord | null | undefined;
}
export const RIVAL_IC: Record<string, string> = { tabloid: 'BB', itk: '?', insider: 'PP' };
/** A rival's face: the art slot (Addendum A), with the old initials as the accessible label. */
export const RivalFace = ({ id, size = 34, name }: { id: string; size?: number; name?: string }) => <Portrait kind="rival" id={id} size={size} round name={name} className={'rv-av rv-av--' + id} />;

/** The calls you have left today: a paper pill with a coral phone (board and Player File). */
export function CallsPill({ left }: { left: number }) {
  const t = useT();
  return <span className={'callpill' + (left ? '' : ' is-out')} aria-label={t('daily.contactsLeft', { n: left })}><Icon n="phone" size={18} /><b>{left ? t(left === 1 ? 'u39.file.callsOne' : 'u39.file.calls', { n: left }) : t('g.win.noCalls')}</b></span>;
}

export function SagaFile({ view, g, i, busy, last, dd, onAsk, onPost, favours, justFiled }: SagaProps) {
  const t = useT();
  const c = view.cast[i];
  const ln = leanOf(g, i);
  const ev = evidenceOf(g, i);
  const call = g.calls[i];
  const cs = E.callState(g, i);
  const canUt = !!call && E.canUturn(g, i);
  const [o, setO] = useState<number | null>(null);
  const [s, setS] = useState(1);
  const [how, setHow] = useState(false);
  const [utOpen, setUtOpen] = useState(false);
  // One pane at a time: Sources · Clippings · Your Call. "Make the Call" opens Your Call.
  const [pane, setPane] = useState<'ring' | 'clips' | 'call'>('ring');
  useEffect(() => { setO(null); setS(1); setUtOpen(false); }, [i, call ? call.o + ':' + call.s : '']);
  useEffect(() => { setPane('ring'); }, [i]);
  useEffect(() => { if (utOpen) setPane('call'); }, [utOpen]);
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
  // The quote that just came in (after the call film): the newest read matching the last answer, for this saga.
  const newK = last && last.i === i ? curReads.map((r, k) => (r.src === last.c.src && r.day === last.c.day && r.r === last.c.r ? k : -1)).reduce((a, b) => Math.max(a, b), -1) : -1;
  const newRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (newK < 0) return;
    const id = setTimeout(() => newRef.current?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), 80);
    return () => clearTimeout(id);
  }, [newK, last]);

  const post = () => { if (selO == null) return; onPost(selO, s, !!call); };
  // §7: the Exclusive line, one sentence, always explained.
  const beatenBy = selO != null ? livePosts.find((p) => p.claim === selO) : undefined;
  const exLine = !pv ? '' : pv.exclPossible ? t('c38.pub.exOk', { n: pv.excl })
    : call ? t('c38.pub.exRepost')
    : !E.exclusiveOpen(g, i, selO!) ? t('c38.pub.exBeaten', { r: beatenBy ? t('rival.' + beatenBy.id) : '' })
    : s !== 2 ? t('c38.pub.exNeedConf')
    : t('c38.pub.exNeedTwo', { n: E.circlesFor(g, i, selO!).size });

  const rivalsRace = <section className="rivals race">
    <div className="g-sec"><h2>{t('calls.race.h')}</h2></div>
    <div className="rivals__row">
      {g.R.RIVALS.map((r) => {
        const mine = livePosts.filter((p) => p.id === r.id), name = t('rival.' + r.id);
        return <div key={r.id + (mine.length ? ':' + mine[0].claim : '')} className={'rv' + (mine.length ? ' is-posted rv--' + OUTS[mine[0].claim] : '')}>
          <RivalFace id={r.id} name={name} />
          <span className="rv__n">{name}</span>
          <span className="rv__rel g-mono">{t(relKey(r.id))}</span>
          {mine.length ? <span className={'g-chip g-chip--' + OUTS[mine[0].claim]}>{outWord(t.lang, mine[0].claim)} · {t('g.saga.dayShort', { n: mine[0].day })}</span> : <span className="rv__when g-mono">{t('g.saga.rivalWhen', { a: r.days[0], b: r.days[1] })}</span>}
        </div>;
      })}
    </div>
  </section>;

  return <div className={'file2 file3' + (pane === 'call' ? ' is-call' : '')}>
    {/* ---- header (3.9, screenshot 03): the file card, the player's portrait large on the right ---- */}
    <header className={'pf39 pf40' + (justFiled ? ' is-filed' : '')}>
      <div className="pf39__txt">
        <span className="pf39__k g-mono">{view.mode === 'daily' && view.no ? t('u39.dh.no', { n: String(view.no).padStart(3, '0') }) : t('u39.file.k')} · {t('c38.file.sagaNo', { n: i + 1, m: view.cast.length })}</span>
        <h1 className="pf39__n" dir="auto">{c.player.n}</h1>
        <span className="pf39__m">{[t('pos.' + c.player.pos), c.player.age > 0 ? t('u39.file.age', { n: c.player.age }) : ''].filter(Boolean).join(' · ')}</span>
        <span className="pf39__route"><span className="pf39__cl"><Crest club={c.from} size={34} /><bdi>{c.from.s}</bdi></span><Icon n={t.rtl ? 'back' : 'arrow'} size={20} /><span className="pf39__cl"><Crest club={c.to} size={34} /><bdi><b>{c.to.s}</b></bdi></span></span>
        <em className="pf39__sim">{t('u39.file.sim')}</em>
      </div>
      <span className="pf39__art" aria-hidden="true"><Portrait kind="player" id={c.player.id} club={c.from} size={150} /></span>
      {call && <span key={call.o + ':' + call.s + ':' + (justFiled || 0)} className={'pf39__stamp g-stamp g-stamp--' + (hereWeGo(call) ? 'gold' : OUTS[call.o]) + (justFiled ? ' is-slam' : '')}>{hereWeGo(call) ? catchphraseOf().text : strWord(t.lang, call.s) + ' · ' + outWord(t.lang, call.o)}</span>}
    </header>

    {tw && <div className="stoppress"><b>{t('g.saga.stopPress')}</b><span>{t('saga.twistBanner', { p: c.player.s })} {t('saga.twistNote')}</span></div>}
    {view.mode === 'career' && vinceOf(g.R)?.i === i && <div className="vince-banner"><Icon n="eye" size={18} /><span><b>{t('g.story.vince.chip')}</b> {t('g.story.vince.banner')}</span></div>}
    {g.tips && i in g.tips && <div className="g-chip g-chip--gold tipchip">{t(g.tips[i] ? 'career.tipFake' : 'career.tipReal', { p: c.player.s })}</div>}

    {/* ---- evidence (3.9): four bars on the left, the independent circles on the right ---- */}
    <section className={'ev39 ev40 ev--' + ev.word + (curReads.length ? '' : ' is-empty')} aria-label={t('c38.ev.summary')}>
      <h2 className="ev39__h">{t('c38.ev.summary')}</h2>
      {curReads.length ? <>
        <div className="ev39__bars">
          {[0, 1, 2, 3].map((k) => <div key={k} className={'ev39__r oc--' + OUTS[k] + (!ln.none && ln.o === k ? ' is-lead' : '')}>
            <span>{outWord(t.lang, k)}</span><span className="ev39__bar"><i style={{ width: (100 * ln.tally[k]) / maxT + '%' }} /></span><b className="g-num">{ln.tally[k]}</b>
          </div>)}
        </div>
        <p className="ev40__hint">{t('u39.file.evNote')}</p>
        {view.posterior && <span className="ev39__coach g-mono">{view.posterior(i).map((p, k) => `${outWord(t.lang, k)[0]} ${Math.round(p * 100)}%`).join(' · ')}</span>}
      </> : <p className="ev40__none"><b>{t('u39.file.noEv')}</b> {t('u39.file.gather')}</p>}
    </section>

    <div className="sg-tabs sg39" role="tablist">
      {(['ring', 'clips', 'call'] as const).map((k) => <button key={k} role="tab" aria-selected={pane === k} aria-label={k === 'clips' ? t('u39.said.tab') : undefined} onClick={() => { sfx('ui.tap'); setPane(k); }}>
        {k === 'ring' ? t('c38.file.tabs.sources') : k === 'clips' ? t('u39.file.rivals') + (livePosts.length ? ` (${livePosts.length})` : '') : t('c38.file.tabs.call')}
      </button>)}
    </div>

    <div className="pf39__pane">
    {pane === 'ring' && <section className="src39" aria-label={t('g.saga.ring')}>
      {srcs.map((k) => {
        const st = E.askState(g, i, k), so = E.srcOf(g.R, i, k)!;
        const asked = curReads.filter((r) => r.src === k);
        const lastR = asked[asked.length - 1];
        const lw = lastR ? E.weights(g.R, k, lastR.r) : null;
        const lo = lw ? lw.indexOf(Math.max(...lw)) : 0;
        const grade = GRADE[k] || 'C', circ = g.R.CIRCLE[k];
        return <div key={k} className={'src39__row' + (lastR ? ' is-called' : '') + (st === 'closed' ? ' is-closed' : '')} data-src={k}>
          <span className="src39__face"><Portrait kind="source" id={k} size={64} mood={lastR ? moodFor(k, lo) : 'neutral'} /></span>
          <span className="src39__b">
            <b>{view.mode === 'career' ? srcNamed(t, k) : t('src.' + k)}</b>
            <small>{lastR ? saysWord(t.lang, k, lastR.r, c) : t(relKey(k))}</small>
            <span className="src39__rel"><em className={'g' + grade}>{t('c38.rel.short.' + k)}</em>{circ ? ' · ' + t('u39.file.circ.' + circ) : ''}</span>
          </span>
          {lastR && st !== 'ok' ? <span className="src39__act is-done"><Icon n="check" size={16} />{t('u39.file.called')}</span>
            : st === 'closed' ? <span className="src39__act is-shut"><Icon n="lock" size={14} />{t('u39.file.opens', { n: so.from })}</span>
            : <button type="button" className="src39__act is-ring src" data-src={k} disabled={st !== 'ok' || busy} onClick={() => onAsk(k)}><Icon n="phone" size={16} />{t(so.cost === 1 ? 'u39.file.ring' : 'u39.file.rings', { n: so.cost })}</button>}
          {lastR && <blockquote className={'src39__q' + (k === last?.c.src && last?.i === i ? ' is-new' : '')}><span>{voiceLine(t.lang, c, lastR)}</span><small className={'g-stamp g-stamp--' + OUTS[lo]}>{t('u39.file.added', { o: saysWord(t.lang, k, lastR.r, c) })}</small></blockquote>}
        </div>;
      })}
      {favours}
    </section>}

    {pane === 'clips' && <>
      {rivalsRace}
      {livePosts.length ? <section className="clips is-open">
        <ol className="clips__l">
          {[...livePosts].sort((x, y) => y.day - x.day).map((p, k) => <li key={'p' + k} className="clip clip--rival"><RivalFace id={p.id} name={t('rival.' + p.id)} /><div><div className="clip__h"><b>{t('rival.' + p.id)}</b><span className="g-mono">{t('common.day', { n: p.day })}</span><span className={'g-chip g-chip--' + OUTS[p.claim]}>{outWord(t.lang, p.claim)}</span></div><p>{postLine(t.lang, c, p)}</p></div></li>)}
        </ol>
      </section> : <p className="know__none">{t('u39.file.noRivals')}</p>}
    </>}

    {pane === 'call' && <>
    <section className={'callbox g-card' + (dd ? ' is-dd' : '')} id={'file-' + i}>
      <div className="callbox__h"><h2>{call ? (utOpen ? t('c38.file.change') : t('u39.call2.h')) : t('c38.file.call')}</h2>{post7 != null && <span className="g-chip g-chip--red">{t('dd.posts', { n: post7 })}</span>}</div>
      {call && !utOpen && <dl className="filed40">
        <div><dt>{t('u39.call2.player')}</dt><dd dir="auto">{c.player.n}</dd></div>
        <div><dt>{t('u39.call2.out')}</dt><dd>{outWord(t.lang, call.o)}</dd></div>
        <div><dt>{t('u39.call2.conf')}</dt><dd>{strWord(t.lang, call.s)}</dd></div>
        <div><dt>{t('u39.call2.day')}</dt><dd>{t('common.day', { n: call.day })}</dd></div>
        <div><dt>{t('u39.call2.ex')}</dt><dd>{call.two ? t('u39.call2.yes') : t('u39.call2.no')}</dd></div>
      </dl>}
      {call && !utOpen && <p className="filed40__note">{t('u39.call2.note')}</p>}
      {canUt && !utOpen && <><GBtn kind="paper" size="sm" className="callbox__ut" onClick={() => setUtOpen(true)}><Icon n="uturn" />{t('u39.call2.revise')}</GBtn><p className="filed40__ut">{t('saga.uturnNote', { p: g.R.UT_PEN[call!.s] })}</p></>}
      {call && !canUt && call.ut && <p className="filed40__ut">{t('saga.uturnUsed')}</p>}
      {canUt && utOpen && <p className="filed40__ut">{t('saga.uturnNote', { p: g.R.UT_PEN[call!.s] })} <button type="button" className="filed40__cancel" onClick={() => setUtOpen(false)}>{t('common.cancel')}</button></p>}
      {((cs === 'ok' && !call) || (canUt && utOpen)) && <div className="callform">
        <div className="step"><span className="step__n">1</span>{t('c38.pub.what')}</div>
        <div className="outs">
          {[0, 1, 2, 3].map((k) => <button key={k} className={'out oc--' + OUTS[k]} aria-pressed={selO === k} disabled={!!call && call.o === k} onClick={() => { sfx('thock', OUTS[k]); setO(k); }}>
            <Glyph o={k} /><b>{outWord(t.lang, k)}</b><span>{t('out.' + OUTS[k] + 'D', vars(c))}</span>
          </button>)}
        </div>
        <div className="step"><span className="step__n">2</span>{t('c38.pub.loud')}</div>
        <div className="vols">
          {[0, 1, 2].map((k) => { const p = selO != null ? E.preview(g, i, selO, k) : null; return <button key={k} className={'vol vol--' + k} aria-pressed={s === k} onClick={() => { sfx('ui.tap'); setS(k); }}>
            <span className="vol__meter">{[0, 1, 2].map((m) => <i key={m} className={m <= k ? 'on' : ''} />)}</span>
            <b>{strWord(t.lang, k)}</b>
            {p ? <span className="vol__odds"><span className="w">+{p.win}</span><span className="l">{num(p.lose)}</span></span> : <span className="vol__d">{t('c38.pub.' + ['talks', 'advanced', 'confirmed'][k] + 'D')}</span>}
          </button>; })}
        </div>
        {pv && <div className="stake3" aria-live="polite">
          <p><span className="stake__w">{t('c38.pub.win', { n: pv.win })}</span><span className="stake__l">{t('c38.pub.lose', { n: num(pv.lose) })}</span><span className="stake3__early g-mono">{pv.early > 0 ? t('c38.pub.early', { d: g.day, n: pv.early }) : g.day === g.R.DAYS ? t('c38.pub.dd') : ''}</span></p>
          <p className={'stake3__ex' + (pv.exclPossible ? ' is-on' : '')}><Icon n="bolt" size={14} />{exLine}</p>
        </div>}
        <HoldPublish disabled={selO == null || busy || (!!call && call.o === selO)} shine={selO != null} gold={false} onCommit={post}
          label={selO == null ? t('saga.pick') : call ? t('calls.repost.btn', { o: outWord(t.lang, selO) }) : t('u39.call2.publish') + ' · ' + outWord(t.lang, selO) + ' · ' + strWord(t.lang, s)}>
          <Icon n={call ? 'uturn' : 'news'} size={24} /><span className="publish__t">{selO == null ? t('saga.pick') : call ? t('calls.repost.btn', { o: outWord(t.lang, selO) }) : <><b>{t('u39.call2.publish')}</b><em>{outWord(t.lang, selO) + ' · ' + strWord(t.lang, s)}</em></>}</span>
        </HoldPublish>
        {view.mode !== 'practice' && <p className="stake3__coach g-mono">{t('c38.pub.coachOnly')}</p>}
      </div>}
      {cs === 'nosource' && !call && <p className="callbox__none"><Icon n="phone" size={16} /> {t('c38.file.ringFirst')}</p>}
      {cs === 'ddcap' && !call && <p className="callbox__none"><Icon n="clock" size={16} /> {t('saga.ddcap')}</p>}
    </section>
    <button className="howbtn" onClick={() => setHow(!how)} aria-expanded={how}><Icon n="help" size={16} />{t('g.saga.how')}</button>
    {how && <HowScored g={g} i={i} view={view} />}
    </>}

    </div>
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
    style={{ ['--hold' as string]: String(k) }} disabled={disabled} aria-label={t('calls.hold.aria', { l: label })} title={t('c38.pub.hold')}
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
