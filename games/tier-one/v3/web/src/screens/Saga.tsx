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
import { leanOf, voiceLine, postLine, saysWord, outWord, strWord, vars, varsH, evidenceOf, heatOf, relKey } from '../lib/story';
import { Glyph, Lines, Crest } from '../ui/bits';
import { Icon, Kit, SrcIcon, GBtn } from '../ui/game';
import { Portrait, moodFor, accentOf } from '../ui/portrait';
import { sfx, buzz } from '../lib/sfx';
import { hereWeGo } from '../lib/share';
import type { View } from '../lib/driver';
import { vinceOf } from '../lib/career';
import { srcNamed } from '../lib/storyMode';
import { Tip } from '../ui/fit';
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

export function SagaFile({ view, g, i, busy, last, dd, onAsk, onPost, favours, justFiled, onLater, rivalRecord }: SagaProps) {
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
  const heat = heatOf(g, i);
  // The quote that just came in (after the call film): the newest read matching the last answer, for this saga.
  const newK = last && last.i === i ? curReads.map((r, k) => (r.src === last.c.src && r.day === last.c.day && r.r === last.c.r ? k : -1)).reduce((a, b) => Math.max(a, b), -1) : -1;
  const newRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (newK < 0) return;
    const id = setTimeout(() => newRef.current?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), 80);
    return () => clearTimeout(id);
  }, [newK, last]);

  const backers = (k: number) => [
    ...curReads.filter((r) => { const w = E.weights(g.R, r.src, r.r); return w[k] > 0 && w[k] === Math.max(...w); }).map((r) => ({ k: r.src, rival: false })),
    ...livePosts.filter((p) => p.claim === k).map((p) => ({ k: p.id, rival: true })),
  ];
  const post = () => { if (selO == null) return; onPost(selO, s, !!call); };
  // §7: the Exclusive line, one sentence, always explained.
  const beatenBy = selO != null ? livePosts.find((p) => p.claim === selO) : undefined;
  const exLine = !pv ? '' : pv.exclPossible ? t('c38.pub.exOk', { n: pv.excl })
    : call ? t('c38.pub.exRepost')
    : !E.exclusiveOpen(g, i, selO!) ? t('c38.pub.exBeaten', { r: beatenBy ? t('rival.' + beatenBy.id) : '' })
    : s !== 2 ? t('c38.pub.exNeedConf')
    : t('c38.pub.exNeedTwo', { n: E.circlesFor(g, i, selO!).size });
  const canCall = cs === 'ok' || canUt;
  const evWord = t('c38.ev.' + ev.word);
  const evLine = ev.word === 'none' ? '' : ev.echo ? t('c38.ev.echo') : ev.agree >= 2 ? t('c38.ev.agree', { n: ev.agree }) : t('c38.ev.one');

  const rivalsRace = <section className="rivals race">
    <div className="g-sec"><h2>{t('calls.race.h')}</h2></div>
    <div className="rivals__row">
      {g.R.RIVALS.map((r) => {
        const mine = livePosts.filter((p) => p.id === r.id), rec = rivalRecord?.(r.id), name = t('rival.' + r.id);
        return <div key={r.id + (mine.length ? ':' + mine[0].claim : '')} className={'rv' + (mine.length ? ' is-posted rv--' + OUTS[mine[0].claim] : '')}>
          <RivalFace id={r.id} name={name} />
          <span className="rv__n">{name}</span>
          <span className="rv__rel g-mono">{t(relKey(r.id))}</span>
          {mine.length ? <span className={'g-chip g-chip--' + OUTS[mine[0].claim]}>{outWord(t.lang, mine[0].claim)} · {t('g.saga.dayShort', { n: mine[0].day })}</span> : <span className="rv__when g-mono">{t('g.saga.rivalWhen', { a: r.days[0], b: r.days[1] })}</span>}
          {rec && <span className="rv__rec g-mono" aria-label={t('calls.race.recAria', { w: rec.w, l: rec.l, d: rec.d, r: name })}>{t('calls.race.rec', { w: rec.w, l: rec.l, d: rec.d })}</span>}
        </div>;
      })}
    </div>
  </section>;

  return <div className="file2 file3">
    {/* ---- header: who, where from, where to, how hot ---- */}
    <header className={'pcard pcard3 g-card' + (justFiled ? ' is-filed' : '')}>
      <div className="pcard3__art">
        <Portrait kind="player" id={c.player.id} club={c.from} size={84} name={t('c38.art.portrait', { n: c.player.n })} />
        <Kit club={c.from} player={c.player} size={34} style={{ position: 'absolute', insetInlineEnd: -6, bottom: -6 }} />
      </div>
      <div className="pcard__main">
        <div className="g-mono pcard__k">
          <span>{t('c38.file.sagaNo', { n: i + 1, m: view.cast.length })}</span>
          <span className={'pcard3__heat heat--' + heat} title={t('c38.file.heat')}><Icon n="flame" size={12} />{t.list('c38.file.heatN')[heat]}</span>
          {c.player.star >= 3 ? <span className="g-chip g-chip--gold pcard__star"><Icon n="star" />{t('g.saga.star')}</span> : null}
        </div>
        <h1 className="pcard__n" dir="auto">{c.player.n}</h1>
        <div className="pcard__m g-mono">{[t('pos.' + c.player.pos), c.player.age > 0 ? String(c.player.age) : '', c.player.nat].filter(Boolean).join(' · ')}</div>
        <div className="pcard__route"><Crest club={c.from} size={24} /><span className="pcard3__club">{c.from.s}</span><span className="pcard__arrow"><Icon n={t.rtl ? 'back' : 'arrow'} size={16} /></span><Crest club={c.to} size={24} /><span className="pcard__to"><bdi><b>{c.to.s}</b>?</bdi></span></div>
      </div>
      {call && <span key={call.o + ':' + call.s + ':' + (justFiled || 0)} className={'pcard__stamp g-stamp g-stamp--' + (hereWeGo(call) ? 'gold' : OUTS[call.o]) + (justFiled ? ' is-slam' : '')}>{hereWeGo(call) ? catchphraseOf().text : strWord(t.lang, call.s) + ' · ' + outWord(t.lang, call.o)}</span>}
    </header>

    {tw && <div className="stoppress"><b>{t('g.saga.stopPress')}</b><span>{t('saga.twistBanner', { p: c.player.s })} {t('saga.twistNote')}</span></div>}
    {view.mode === 'career' && vinceOf(g.R)?.i === i && <div className="vince-banner"><Icon n="eye" size={18} /><span><b>{t('g.story.vince.chip')}</b> {t('g.story.vince.banner')}</span></div>}
    {g.tips && i in g.tips && <div className="g-chip g-chip--gold tipchip">{t(g.tips[i] ? 'career.tipFake' : 'career.tipReal', { p: c.player.s })}</div>}

    {/* ---- evidence summary: bars, circle markers, one word, one line ---- */}
    <section className={'know evsum g-card ev--' + ev.word}>
      <div className="know__h">
        <h2>{t('c38.ev.summary')}</h2>
        <span className={'evsum__word evw--' + ev.word}>{evWord}</span>
      </div>
      {ln.none ? <p className="know__none">{t('g.saga.knowNone')}</p> : <p className={'evsum__line' + (ev.echo ? ' is-echo' : ev.agree >= 2 ? ' is-two' : '')}><Icon n={ev.echo ? 'eye' : ev.agree >= 2 ? 'check' : 'phone'} size={14} />{evLine}{!ev.echo && !ln.split && <> · {t('c38.ev.leans', { o: outWord(t.lang, ln.o) })}</>}</p>}
      <div className="know__rows">
        {[0, 1, 2, 3].map((k) => {
          const b = backers(k), cn = E.circlesFor(g, i, k).size;
          return <div key={k} className={'know__r oc--' + OUTS[k] + (!ln.none && ln.o === k ? ' is-lead' : '') + (ln.tally[k] ? '' : ' is-zero')}>
            <span className="know__o"><Glyph o={k} /><b>{outWord(t.lang, k)}</b></span>
            <span className="know__bar"><i style={{ width: (100 * ln.tally[k]) / maxT + '%' }} /></span>
            <span className="know__who">{b.slice(0, 4).map((x, n) => x.rival ? <RivalFace key={n} id={x.k} size={22} /> : <SrcIcon key={n} k={x.k} size={22} />)}{cn >= 2 && <span className="g-chip g-chip--done know__two" title={t('c38.ev.circles', { n: cn })}><Icon n="check" />{cn}</span>}</span>
          </div>;
        })}
      </div>
      {view.posterior && <p className="know__coach g-mono"><Icon n="eye" size={12} /> {t('c38.ev.coach')} · {view.posterior(i).map((p, k) => `${outWord(t.lang, k)} ${Math.round(p * 100)}%`).join(' · ')}</p>}
    </section>

    <Tip id="player" />
    <div className="sg-tabs" role="tablist">
      {(['ring', 'clips', 'call'] as const).map((k) => <button key={k} role="tab" aria-selected={pane === k} onClick={() => { sfx('ui.tap'); setPane(k); }}>
        {k === 'ring' ? t('c38.file.tabs.sources') : k === 'clips' ? t('u39.said.tab') + (curReads.length + livePosts.length ? ` (${curReads.length + livePosts.length})` : '') : t('c38.file.tabs.call')}
      </button>)}
    </div>

    {pane === 'ring' && <section className="srcsec">
      <div className="g-sec"><h2>{t('g.saga.ring')}</h2><span className="g-mono phones-left"><span className="phones">{Array.from({ length: Math.min(8, Math.max(g.left, 0)) }, (_, k) => <Icon key={k} n="phone" size={13} />)}</span>{t('g.saga.left', { n: g.left })}</span></div>
      <div className="srcs srcs3">
        {srcs.map((k) => {
          const st = E.askState(g, i, k), so = E.srcOf(g.R, i, k)!;
          const asked = curReads.filter((r) => r.src === k);
          const lastR = asked[asked.length - 1];
          const lw = lastR ? E.weights(g.R, k, lastR.r) : null;
          const lo = lw ? lw.indexOf(Math.max(...lw)) : 0;
          const street = g.R.CIRCLE[k] === 'street';
          return <button key={k} className={'src src3' + (st === 'ok' ? '' : ' is-' + st)} data-src={k} disabled={st !== 'ok' || busy} onClick={() => onAsk(k)} aria-label={t(view.mode === 'career' ? '' : 'g.src.' + k) || k}>
            <span className="src__cost">{st === 'closed' ? <Icon n="lock" size={11} /> : <><Icon n="phone" size={11} />{so.cost}</>}</span>
            <span className="src3__face"><Portrait kind="source" id={k} size={44} mood={lastR ? moodFor(k, lo) : 'neutral'} /><SrcIcon k={k} size={18} /></span>
            <span className="src__n">{view.mode === 'career' ? srcNamed(t, k) : t('g.src.' + k)}</span>
            {lastR && lw ? <><span className={'g-chip src__says g-chip--' + OUTS[lo]}>{saysWord(t.lang, k, lastR.r, c)}</span><span className="src3__called g-mono">{t('c38.file.called', { d: lastR.day })}</span></>
              : st === 'closed' ? <span className="src__opens">{t('c38.file.opens', { n: so.from })}</span>
              : <span className="src3__rel">{t(relKey(k))}{street ? <em>{t('c38.rel.once')}</em> : null}</span>}
          </button>;
        })}
      </div>
      {favours}
    </section>}

    {pane === 'clips' && <>
      {!(curReads.length > 0 || livePosts.length > 0) && <p className="know__none">{t('u39.said.none')}</p>}
      {(curReads.length > 0 || livePosts.length > 0) && <section className="clips is-open">
        <ol className="clips__l">
          {[...curReads.map((r, k) => {
            const w = E.weights(g.R, r.src, r.r), isNew = k === newK;
            return { d: r.day + k / 1000, el: <li key={'r' + k} ref={isNew ? newRef : undefined} className={'clip clip--q' + (isNew ? ' is-new' : '')} style={{ ['--acc' as string]: accentOf(r.src) }}>
              <Portrait kind="source" id={r.src} size={36} mood={moodFor(r.src, w.indexOf(Math.max(...w)))} />
              <div className="clip__b">
                <div className="clip__h"><b>{view.mode === 'career' ? srcNamed(t, r.src) : t('src.' + r.src)}</b><span className="g-mono">{t('common.day', { n: r.day })}</span>{isNew && <span className="clip__new">{t('cf.new')}</span>}</div>
                <blockquote className="clip__q" cite={t('src.' + r.src)}>{voiceLine(t.lang, c, r)}</blockquote>
                <div className="clip__f"><span className={'g-stamp clip__says g-stamp--' + OUTS[w.indexOf(Math.max(...w))]}>{saysWord(t.lang, r.src, r.r, c)}</span><span className="clip__adds g-mono">{t(relKey(r.src))}</span></div>
              </div>
            </li> };
          }),
            ...livePosts.map((p, k) => ({ d: p.day + .5, el: <li key={'p' + k} className="clip clip--rival"><RivalFace id={p.id} name={t('rival.' + p.id)} /><div><div className="clip__h"><b>{t('rival.' + p.id)}</b><span className="g-mono">{t('common.day', { n: p.day })}</span><span className={'g-chip g-chip--' + OUTS[p.claim]}>{outWord(t.lang, p.claim)}</span></div><p>{postLine(t.lang, c, p)}</p><span className="clip__adds g-mono">{t(relKey(p.id))}</span></div></li> }))].sort((a, b) => b.d - a.d).map((x) => x.el)}
        </ol>
      </section>}
      {rivalsRace}
    </>}

    {pane === 'call' && <>
    <section className={'callbox g-card' + (dd ? ' is-dd' : '')} id={'file-' + i}>
      <div className="callbox__h"><h2>{call ? (utOpen ? t('c38.file.change') : t('g.saga.yourCall')) : t('c38.file.call')}</h2>{post7 != null && <span className="g-chip g-chip--red">{t('dd.posts', { n: post7 })}</span>}</div>
      {call && <p className="callbox__filed">{t('g.saga.filedLine', { s: strWord(t.lang, call.s), o: outWord(t.lang, call.o), d: call.day })}{canUt ? ' ' + t('saga.uturnNote', { p: g.R.UT_PEN[call.s] }) : call.ut ? ' ' + t('saga.uturnUsed') : ''}</p>}
      {canUt && !utOpen && <GBtn kind="paper" size="sm" className="callbox__ut" onClick={() => setUtOpen(true)}><Icon n="uturn" />{t('calls.repost.open')}</GBtn>}
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
        <HoldPublish disabled={selO == null || busy || (!!call && call.o === selO)} shine={selO != null} gold={selO === 0 && s === 2 && !call} onCommit={post}
          label={selO == null ? t('saga.pick') : call ? t('calls.repost.btn', { o: outWord(t.lang, selO) }) : t('g.saga.publish', { s: strWord(t.lang, s), o: outWord(t.lang, selO) })}>
          <Icon n={call ? 'uturn' : 'news'} size={24} /><span className="publish__t">{selO == null ? t('saga.pick') : call ? t('calls.repost.btn', { o: outWord(t.lang, selO) }) : selO === 0 && s === 2 ? <><b>{catchphraseOf().text.toUpperCase()}</b><em>{t('g.saga.publish', { s: strWord(t.lang, s), o: outWord(t.lang, selO) })}</em></> : (() => { const [h, ...rest] = t('g.saga.publish', { s: strWord(t.lang, s), o: outWord(t.lang, selO) }).split(' · '); return rest.length ? <><b>{h}</b><em>{rest.join(' · ')}</em></> : h; })()}</span>
        </HoldPublish>
        {view.mode !== 'practice' && <p className="stake3__coach g-mono">{t('c38.pub.coachOnly')}</p>}
      </div>}
      {cs === 'nosource' && !call && <p className="callbox__none"><Icon n="phone" size={16} /> {t('c38.file.ringFirst')}</p>}
      {cs === 'ddcap' && !call && <p className="callbox__none"><Icon n="clock" size={16} /> {t('saga.ddcap')}</p>}
    </section>
    <button className="howbtn" onClick={() => setHow(!how)} aria-expanded={how}><Icon n="help" size={16} />{t('g.saga.how')}</button>
    {how && <HowScored g={g} i={i} view={view} />}
    </>}

    {/* ---- sticky: Back to Board · Make the Call ---- */}
    <div className="file3__bar">
      <button type="button" className="file3__back" onClick={() => { sfx('ui.tap'); onLater?.(); }}><Icon n={t.rtl ? 'arrow' : 'back'} size={18} />{t('c38.file.back')}</button>
      {pane !== 'call' && (canCall ? <GBtn size="sm" sound="page.turn" className="file3__go" onClick={() => { if (call) setUtOpen(true); setPane('call'); }}><Icon n="pen" size={18} />{call ? t('c38.file.change') : t('c38.file.call')}</GBtn>
        : call ? <span className={'g-stamp file3__filed g-stamp--' + OUTS[call.o]}>{t('c38.file.filed')}</span>
        : <span className="file3__hint g-mono">{t('c38.file.ringFirst')}</span>)}
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
