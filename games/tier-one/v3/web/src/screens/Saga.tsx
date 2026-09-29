// The file: one saga in full. The read (six questions), the evidence trail by circle, the tally, the phones, the
// composer with its stakes printed on the buttons, and the rivals. Layout follows look/mockups/rumour.html.
import { useEffect, useMemo, useState } from 'react';
import { E, OUTS, STRENGTHS, type Game, type Clue } from '../lib/engine';
import { useT, num } from '../lib/i18n';
import { leanOf, voiceLine, postLine, saysWord, addsText, outWord, strWord, nextMove, streetCount, CIRCLE_LETTER, GRADE, INITIALS, vars, varsH } from '../lib/story';
import { Crest, Portrait, Stamp, Flag, Glyph, Btn, Arr, Lines } from '../ui/bits';
import { hash } from '../lib/kit';
import type { View } from '../lib/driver';

export interface SagaProps {
  view: View; g: Game; i: number; busy: boolean; last: { i: number; c: Clue } | null; dd: boolean;
  onAsk: (src: string) => void; onPost: (o: number, s: number, ut: boolean) => void; favours?: React.ReactNode;
}

export function SagaFile({ view, g, i, busy, last, dd, onAsk, onPost, favours }: SagaProps) {
  const t = useT();
  const c = view.cast[i];
  const ln = leanOf(g, i);
  const call = g.calls[i];
  const cs = E.callState(g, i);
  const canUt = !!call && E.canUturn(g, i);
  const [o, setO] = useState<number | null>(null);
  const [s, setS] = useState(1);
  useEffect(() => { setO(null); setS(1); }, [i, call ? call.o + ':' + call.s : '']);
  const selO = o ?? (call ? null : ln.none ? null : ln.o);
  const pv = selO != null && (cs === 'ok' || canUt) && !(call && call.o === selO) ? E.preview(g, i, selO, s) : null;
  const tw = g.twist && g.twist.i === i ? g.twist : null;
  const reads = g.clues[i];
  const era = tw && g.day >= tw.day ? 1 : 0;
  const curReads = reads.filter((r) => r.era === era);
  const oldReads = reads.filter((r) => r.era !== era);
  const posts = g.feed.filter((f) => f.i === i);
  const livePosts = E.livePosts(g, i);
  const oldPosts = posts.filter((p) => !livePosts.includes(p));
  const circles = ln.none ? 0 : E.circlesFor(g, i, ln.o).size;
  const nm = nextMove(g, i);
  const srcs = E.sourcesFor(g.R, i);
  const hedPack = t.list(ln.none ? 'saga.heroHed.none' : 'saga.heroHed.lean') as string[];
  const hed = hedPack[hash(c.player.id) % hedPack.length].replace(/\{(\w+)\}/g, (m, k) => String(vars(c)[k] ?? m));

  // ---- the six lines
  const reported = ln.none ? t('saga.reportedNone') : ln.split ? t('saga.reportedSplit', { a: outWord(t.lang, ln.o), b: outWord(t.lang, ln.second) })
    : t('saga.reportedLean', { o: outWord(t.lang, ln.o), d: t('out.' + OUTS[ln.o] + 'D', varsH(c)) });
  const evidence = !E.curReads(g, i).length ? t('saga.evNone') : circles >= 2 ? t('saga.evStrongN', { n: circles, o: outWord(t.lang, ln.o) }) : t('saga.evWeak');
  const unknown = (() => {
    if (ln.none) return t('saga.unkNone');
    if (ln.split) return t('saga.unkClose', { a: outWord(t.lang, ln.o), b: outWord(t.lang, ln.second) });
    const asked = (x: string) => curReads.some((r) => r.src === x);
    if (ln.o <= 1 && !asked('spotter') && srcs.includes('spotter')) return t('saga.unkDoneHijack');
    if (ln.o >= 2 && !asked('agent')) return t('saga.unkOffFake');
    if (!asked('kitman')) return t('saga.unkMoving');
    return t('saga.unkSettled');
  })();
  const pubLine = call ? t('saga.pubFiled', { s: strWord(t.lang, call.s), o: outWord(t.lang, call.o), d: call.day })
    : cs === 'nosource' ? t('saga.pubNone')
    : (() => { const p = E.preview(g, i, ln.o, 1); return t('saga.pubAs', { s: strWord(t.lang, 1), o: outWord(t.lang, ln.o), w: p.win, l: num(p.lose) }); })();
  const rivLine = (() => {
    if (livePosts.length) { const p = livePosts[livePosts.length - 1]; return t('saga.rivPosted', { r: t('rival.' + p.id), o: outWord(t.lang, p.claim) }); }
    const nx = g.R.RIVALS.find((r) => r.days[1] >= g.day);
    return nx ? t('saga.rivNone', { r: t('rival.' + nx.id), a: nx.days[0], b: nx.days[1] }) : t('saga.rivDone');
  })();
  const WHY: Record<string, string> = { kitman: 'saga.whyKit', agent: 'saga.whyAgent', barber: 'saga.whyBarber', spotter: 'saga.whySpotter', physio: 'saga.whyPhysio', leak: 'saga.whyLeak' };
  const nextLine = nm.kind === 'ask' ? t('saga.nextAsk', { s: t('src.' + nm.src), why: t(WHY[nm.src]) })
    : nm.kind === 'file' ? t('saga.nextFile', { o: outWord(t.lang, nm.o) })
    : nm.kind === 'wait' ? t('saga.nextWait', { s: t('src.' + nm.src), d: nm.day }) : t('saga.nextLeave');

  const post = () => { if (selO == null) return; onPost(selO, s, !!call); };
  const streetN = streetCount(g, i);
  const firstStreet = useMemo(() => {
    const items = [...curReads.map((r) => ({ k: 'r' + reads.indexOf(r), day: r.day, st: g.R.CIRCLE[r.src] === 'street' })), ...livePosts.map((p) => ({ k: 'p' + posts.indexOf(p), day: p.day, st: g.R.CIRCLE[p.id] === 'street' }))].filter((x) => x.st).sort((a, b) => a.day - b.day);
    return items.length ? items[0].k : '';
  }, [curReads.length, livePosts.length]);
  const post_ = (p: typeof posts[number], key: string, old: boolean) => {
    const echo = !old && g.R.CIRCLE[p.id] === 'street' && firstStreet !== key;
    return <li key={key} className={'trail__i' + (echo ? ' is-echo' : '') + (old ? ' is-old' : '')}>
      <span className={'trail__o' + (echo ? ' echo' : '')}>{CIRCLE_LETTER[g.R.CIRCLE[p.id]]}{echo ? '′' : ''}</span>
      <div>
        <div className="trail__head"><span className={'grade grade--' + GRADE[p.id].toLowerCase()}>{GRADE[p.id]}</span><span className="trail__who">{t('rival.' + p.id)}</span><span className="meta">{t('common.day', { n: p.day })} · {t('circle.' + g.R.CIRCLE[p.id])}</span><Stamp kind={OUTS[p.claim]} size="sm" flat sound={false}>{outWord(t.lang, p.claim)}</Stamp></div>
        <p className="trail__q">{postLine(t.lang, c, p)}</p>
        <p className="trail__note">{echo ? t('saga.echo') : t('saga.adds', { x: addsText(t.lang, E.weights(g.R, p.id, p.claim)) })}</p>
      </div>
    </li>;
  };
  const read_ = (r: Clue, key: string, old: boolean) => {
    const echo = !old && g.R.CIRCLE[r.src] === 'street' && firstStreet !== key;
    const mine = !old && !echo;
    return <li key={key} className={'trail__i' + (echo ? ' is-echo' : '') + (old ? ' is-old' : '')}>
      <span className={'trail__o' + (echo ? ' echo' : mine ? ' mine' : '')}>{CIRCLE_LETTER[g.R.CIRCLE[r.src]]}{echo ? '′' : ''}</span>
      <div>
        <div className="trail__head"><span className={'grade grade--' + GRADE[r.src].toLowerCase()}>{GRADE[r.src]}</span><span className="trail__who">{t('src.' + r.src)}</span><span className="meta">{t('common.day', { n: r.day })} · {saysWord(t.lang, r.src, r.r, c)}</span></div>
        <p className="trail__q">{voiceLine(t.lang, c, r)}</p>
        <p className="trail__note">{echo ? t('saga.echo') : t('saga.adds', { x: addsText(t.lang, E.weights(g.R, r.src, r.r)) })}</p>
      </div>
    </li>;
  };
  const curItems = [...curReads.map((r) => ({ day: r.day, el: read_(r, 'r' + reads.indexOf(r), false) })), ...livePosts.map((p) => ({ day: p.day + 0.5, el: post_(p, 'p' + posts.indexOf(p), false) }))].sort((a, b) => a.day - b.day);
  const oldItems = [...oldReads.map((r) => ({ day: r.day, el: read_(r, 'r' + reads.indexOf(r), true) })), ...oldPosts.map((p) => ({ day: p.day + 0.5, el: post_(p, 'p' + posts.indexOf(p), true) }))].sort((a, b) => a.day - b.day);
  const lastHere = last && last.i === i ? last.c : null;
  const maxT = Math.max(3, ...ln.tally);
  const post7 = g.day === g.R.DAYS ? g.R.DD_POSTS - g.posts7 : null;

  return <div className="file set">
    <div className="top">
      <div className="hero jolt-host">
        <Portrait club={c.from} no={c.player.no || ''} variant="wide" who={c.player.id} className="only-mobile" />
        <Portrait club={c.from} no={c.player.no || ''} who={c.player.id} className="only-desk" />
        {call && <span className="hero__stamp"><Stamp kind={OUTS[call.o]} size="lg" slam>{strWord(t.lang, call.s)} · {outWord(t.lang, call.o)}</Stamp></span>}
      </div>
      <div>
        <div className="who"><span className="kicker">{t('common.saga', { n: i + 1, m: view.cast.length })}</span><span className="meta" style={{ marginInlineStart: 'auto' }}>{t('common.dayOf', { n: Math.min(g.day, g.R.DAYS), m: g.R.DAYS })}</span></div>
        <h1 className="hed name">{c.player.n}</h1>
        <p className="meta meta--ink dot-sep" style={{ marginTop: 6 }}><span>{t('pos.' + c.player.pos)}</span>{c.player.age > 0 && <span>{c.player.age}</span>}{c.player.nat && <span>{c.player.nat}</span>}{c.player.no > 0 && <span>{t('common.no', { n: c.player.no })}</span>}</p>
        <div className="route" style={{ marginTop: 16 }}><Crest club={c.from} size={34} /><span className="route__arrow" /><Crest club={c.to} size={34} /><span className="route__names meta"><b>{c.from.s}</b> → <b>{c.to.s}</b></span></div>
        <h2 className="hed hed--3" style={{ marginTop: 14 }}>{hed}</h2>
      </div>
    </div>

    {tw && <div className="twist-banner" role="status"><Stamp kind="" flat size="sm" sound={false}>{t('saga.twistBanner', { p: c.player.s })}</Stamp><p className="note">{t('saga.twistNote')}</p></div>}
    {g.tips && i in g.tips && <p className="tip note">{t(g.tips[i] ? 'career.tipFake' : 'career.tipReal', { p: c.player.s })}</p>}

    <section className="read" style={{ marginTop: 22 }} aria-label={t('saga.read')}>
      <Row k={t('saga.reported')} v={reported} />
      <Row k={t('saga.evidence')} v={evidence + (streetN >= 2 ? ' ' + t('saga.echo') : '')} lines={circles} />
      <Row k={t('saga.unknown')} v={unknown} />
      <Row k={t('saga.publish')} v={pubLine} />
      <Row k={t('saga.rivals')} v={rivLine} />
      <Row k={t('saga.next')} v={nextLine} next />
    </section>

    {lastHere && <div className="transcript" aria-live="polite">
      <div className="transcript__line"><span className="meta live-dot">{t('saga.lineOpen')}</span><span className="meta">{t('src.' + lastHere.src)}</span></div>
      <p className="prose">{voiceLine(t.lang, c, lastHere)}</p>
      <div className="gain">
        <div><span className="label">{t('circle.' + g.R.CIRCLE[lastHere.src])}</span><span className="cond">{CIRCLE_LETTER[g.R.CIRCLE[lastHere.src]]}</span></div>
        <div><span className="label">{t('saga.tallyFlag')}</span><span className="cond accent" style={{ fontSize: 20, paddingTop: 4 }}>{addsText(t.lang, E.weights(g.R, lastHere.src, lastHere.r)) || '—'}</span></div>
        <div><span className="label">{t('saga.says')}</span><span className="cond says">{saysWord(t.lang, lastHere.src, lastHere.r, c)}</span></div>
      </div>
    </div>}

    <div className="cols-inner">
      <div>
        <Flag title={t('saga.ringFlag')} aside={t('saga.ringAside', { n: g.left })} />
        <div className="contacts">
          {srcs.map((k) => {
            const st = E.askState(g, i, k), so = E.srcOf(g.R, i, k)!;
            const frozen = k === 'kitman' && so.kind === 'street';
            const right = st === 'asked' ? t('src.asked') : st === 'closed' ? t('src.opens', { n: so.from }) : st === 'broke' ? t('src.broke') : so.cost === 1 ? t('src.cost', { n: 1 }) : t('src.costs', { n: so.cost });
            const again = st === 'ok' && curReads.some((r) => r.src === k);
            return <button key={k} className={'contact' + (st !== 'ok' ? ' is-cold' : '')} aria-pressed={lastHere && lastHere.src === k ? 'true' : 'false'} disabled={st !== 'ok' || busy} onClick={() => onAsk(k)}>
              <span className="contact__av">{INITIALS[k]}</span>
              <span><span className="contact__n">{t('src.' + k)}{again && <em className="meta"> · {t('src.again')}</em>}</span><br /><span className="contact__d">{frozen ? t('src.frozen') : t('src.' + k + 'P')}</span><br /><span className="contact__rule meta">{t('src.' + k + 'Rule')}</span></span>
              <span className="contact__r"><span className="cond">{so.cost}</span><span className="meta">{right}</span></span>
            </button>;
          })}
        </div>
        {favours}
      </div>

      <div>
        <Flag title={t('saga.evidenceFlag')} aside={t('saga.evidenceAside', { r: curReads.length + livePosts.length, c: new Set([...curReads.map((r) => g.R.CIRCLE[r.src]), ...livePosts.map((p) => g.R.CIRCLE[p.id])]).size })} />
        {curItems.length ? <ol className="trail">{curItems.map((x) => x.el)}</ol> : <p className="note empty">{t('saga.noReads')}</p>}
        {oldItems.length > 0 && <><div className="label before">{t('saga.beforeTwist')}</div><p className="note">{t('saga.beforeTwistNote')}</p><ol className="trail trail--old">{oldItems.map((x) => x.el)}</ol></>}

        <Flag title={t('saga.tallyFlag')} aside={t('saga.tallyAside')} />
        <div className="market">
          {[0, 1, 2, 3].map((k) => {
            const cn = E.circlesFor(g, i, k).size;
            return <div key={k} className={'market__r outcome--' + OUTS[k]}>
              <span className="glyph"><Glyph o={k} /></span>
              <div><div className="market__name">{outWord(t.lang, k)} <small>{cn >= 2 ? '✓✓ ' : cn === 1 ? '✓ ' : ''}{t('daily.circles', { n: cn })}</small></div><div className="meter"><i style={{ width: (100 * ln.tally[k]) / maxT + '%', background: 'var(--oc)' }} /></div></div>
              <span className="market__pct">{ln.tally[k]}</span>
            </div>;
          })}
        </div>
        {view.posterior && <p className="coach note"><b>{t('saga.coach')}</b> {view.posterior(i).map((p, k) => `${outWord(t.lang, k)} ${Math.round(p * 100)}%`).join(' · ')}<br /><span className="meta">{t('saga.coachNote')}</span></p>}
      </div>
    </div>

    <section className="composer" id={'file-' + i}>
      <Flag title={call ? t('saga.uturnFlag') : t('saga.fileFlag')} aside={post7 != null ? t('dd.posts', { n: post7 }) : t('saga.fileAside')} />
      {call && <div className="filed">
        <Stamp kind={OUTS[call.o]} sound={false}>{strWord(t.lang, call.s)} · {outWord(t.lang, call.o)}</Stamp>
        <p className="note">{t('saga.pubFiled', { s: strWord(t.lang, call.s), o: outWord(t.lang, call.o), d: call.day }).replace(/<[^>]+>/g, '')}</p>
        <p className="note">{canUt ? t('saga.uturnNote', { p: g.R.UT_PEN[call.s] }) : call.ut ? t('saga.uturnUsed') : cs === 'over' ? '' : t('saga.ddcap')}</p>
      </div>}
      {(cs === 'ok' || canUt) && <>
        <div className="field">
          <div className="label"><span>{t('saga.outcome')}</span></div>
          <div className="outcomes">
            {[0, 1, 2, 3].map((k) => <button key={k} className={'outcome outcome--' + OUTS[k]} aria-pressed={selO === k} disabled={!!call && call.o === k} onClick={() => setO(k)}><Glyph o={k} /><b>{outWord(t.lang, k)}</b><span>{t('out.' + OUTS[k] + 'D', vars(c))}</span></button>)}
          </div>
        </div>
        <div className="field">
          <div className="label"><span>{t('saga.strength')}</span><span className="meta">{t('saga.strengthAside')}</span></div>
          <div className="pub">
            {[0, 1, 2].map((k) => { const p = selO != null ? E.preview(g, i, selO, k) : null; return <button key={k} aria-pressed={s === k} onClick={() => setS(k)} data-sfx={'publish.' + STRENGTHS[k]}>
              <b>{strWord(t.lang, k)}</b><span className="odds">{p ? <><span className="w">+{p.win}</span><br /><span className="l">{num(p.lose)}</span></> : <span className="muted">{t('str.' + STRENGTHS[k] + 'D')}</span>}</span></button>; })}
          </div>
        </div>
        {pv && <>
          <div className="summary">
            <div><span className="label">{t('saga.ifRight')}</span><span className="cond win">+{pv.win}</span><span className="meta">{t('saga.earlyNote', { b: pv.base, e: pv.early })}{pv.excl ? ' ' + t('saga.exclNote', { x: pv.excl }) : ''}{pv.pen ? ' ' + t('saga.penNote', { p: pv.pen }) : ''}</span></div>
            <div><span className="label">{t('saga.ifWrong')}</span><span className="cond accent">{num(pv.lose)}</span><span className="meta">{call ? t('saga.penNote', { p: pv.pen }) : ''}</span></div>
          </div>
          <p className="excl">{pv.exclPossible ? <><Stamp size="sm" flat sound={false}>{t('stamp.exclusive')}</Stamp> {t('saga.exclOpen')}</> : call ? t('saga.exclUturn') : !pv.open ? t('saga.exclGone', { o: outWord(t.lang, selO!) }) : s !== 2 ? t('saga.exclStrength') : t('saga.exclTwo', { n: E.circlesFor(g, i, selO!).size, o: outWord(t.lang, selO!) })}</p>
        </>}
        <Btn kind={dd ? 'accent' : 'primary'} disabled={selO == null || busy || (!!call && call.o === selO)} onClick={post} sound={null} style={{ marginTop: 16 }}>
          {selO == null ? t('saga.pick') : t(call ? 'saga.uturnBtn' : 'saga.publishBtn', { s: strWord(t.lang, s), o: outWord(t.lang, selO) })} <Arr />
        </Btn>
      </>}
      {cs === 'nosource' && !call && <p className="note nostory">{t('saga.noStory')}</p>}
    </section>

    <Flag title={t('saga.beatFlag')} />
    {g.R.RIVALS.map((r) => {
      const mine = livePosts.filter((p) => p.id === r.id);
      return <div key={r.id} className="rival"><span className="rival__av">{INITIALS[r.id]}</span><div><div className="rival__n">{t('rival.' + r.id)}</div><div className="rival__o">{t('rival.' + r.id + 'O')}</div></div>
        <div className="rival__s">{mine.length ? <><Stamp kind={OUTS[mine[0].claim]} size="sm" flat sound={false}>{outWord(t.lang, mine[0].claim)}</Stamp><br />{t('common.day', { n: mine[0].day })}</> : <span className="muted">{t('rival.when', { a: r.days[0], b: r.days[1], p: Math.round(r.p * 100) })}</span>}</div></div>;
    })}
  </div>;
}

function Row({ k, v, next, lines }: { k: string; v: string; next?: boolean; lines?: number }) {
  return <div className={'read__row' + (next ? ' read__row--next' : '')}><span className="read__k">{k}</span><span className="read__v">{lines != null && lines > 0 && <><Lines n={lines} max={2} /> </>}<span dangerouslySetInnerHTML={{ __html: v }} /></span></div>;
}
