// Results: the tier stamp, every point shown per saga, what the exclusive needed, which reads were right, where the
// spin came from, and the scoop card (look/mockups/share.html).
import { useState } from 'react';
import { OUTS, type ResultSaga, type Result, type CastSaga } from '../lib/engine';
import type { View } from '../lib/driver';
import { useT, num, fmtDate } from '../lib/i18n';
import { useSave } from '../lib/save';
import { outWord, strWord, saysWord } from '../lib/story';
import { onShared } from '../lib/meta';
import { RANKS } from '../lib/career';
import type { CareerReport } from '../lib/career';
import { Stamp, Flag, Btn, Arr, Portrait, Crest } from '../ui/bits';
import { Bar } from '../ui/chrome';
import { renderCard, shareText } from '../lib/share';
import type { Chrome } from '../App';

export function Results({ view, chrome, report }: { view: View; chrome: Chrome; report: CareerReport | null }) {
  const t = useT();
  const s = useSave();
  const r = view.result!;
  const cast = (r.cast && r.cast.length ? r.cast : view.cast) as CastSaga[];
  const what = view.mode === 'daily' ? t('nav.daily') + ' · ' + t('common.no', { n: view.no || '' }) : view.mode === 'room' ? t('nav.rooms') + ' · ' + t('rooms.round', { n: (view.room?.round || 0) + 1 }) : view.mode === 'career' ? t('nav.desk') : t('nav.practice');
  const tierKind = r.tier === 'T1' ? 'exclusive' : r.tier === 'SPIKED' ? 'dead' : 'done';
  const again = () => chrome.go(view.mode === 'career' ? { n: 'desk' } : view.mode === 'practice' ? { n: 'practice' } : view.mode === 'room' ? { n: 'rooms' } : { n: 'front' });

  return <div className="page results">
    <Bar chrome={chrome} back={{ label: t('results.backFront'), to: { n: 'front' } }} end={<span className="meta">{what}</span>} cur={view.mode === 'daily' ? 'daily' : view.mode === 'career' ? 'desk' : 'front'} />
    <div className="share-grid">
      <div>
        <section className="res-head jolt-host">
          <div className="row row--between" style={{ marginTop: 18 }}><span className="kicker">{t('results.kicker', { what })}</span><span className="meta">{fmtDate(Date.now(), t.lang)}</span></div>
          <div className="res-score">
            <div><span className="label">{t('results.total')}</span><div className={'res-total cond' + (r.total < 0 ? ' accent' : '')}>{num(r.total)}</div></div>
            <Stamp kind={tierKind} size="xl" slam>{t('tier.' + r.tier)}</Stamp>
          </div>
          <p className="dek">{t('tierLine.' + r.tier)}</p>
          <div className="kpis">
            <div><span className="label">{t('career.right')}</span><span className="cond">{r.right}/{r.called}</span><span className="meta">{t('results.ofRight', { a: r.right, b: r.per.length })}</span></div>
            <div><span className="label">{t('results.exclusives')}</span><span className="cond">{r.ex}</span><span className="meta">{r.tier !== 'T1' ? t('results.t1Need', { n: view.R.TIERS.T1 }) : '★'.repeat(r.ex)}</span></div>
            <div><span className="label">{r.rank ? t('lb.title') : t('results.total')}</span><span className="cond">{r.rank ? '#' + r.rank : num(r.total)}</span><span className="meta">{r.rank ? t('results.rank', { r: r.rank, n: r.players || 1 }) : r.par != null ? t('results.par', { n: r.par }) : ''}</span></div>
          </div>
          {(r.par != null || r.weekRank) && <p className="note" style={{ marginTop: 8 }}>{r.par != null && t('results.par', { n: num(r.par) })}{r.weekRank ? ' · ' + t('results.week', { r: r.weekRank, n: r.weekPlayers || 1 }) : ''}{view.mode === 'daily' ? ' · ' + t('results.league', { n: { T1: 30, T2: 20, T3: 12, T4: 6, SPIKED: 2 }[r.tier] }) : ''}</p>}
        </section>

        {report && <section className="career-report">
          <Flag title={t('nav.desk')} aside={t('career.ranks.' + (s.career?.rank || 0))} />
          <p className="note">{t('career.repLine', { a: report.repBefore, b: report.repAfter })} · {t('career.followersLine', { n: report.followers })}{report.favours ? ' · ' + t('career.favoursEarned', { n: report.favours }) : ''}</p>
          {report.promoted != null && <div style={{ marginTop: 10 }}><Stamp kind="exclusive" slam>{t('career.promoted', { rank: t('career.ranks.' + report.promoted) })}</Stamp><p className="note" style={{ marginTop: 8 }}>{t('career.unl.' + report.promoted)}</p></div>}
          {s.career && s.career.rank < RANKS.length - 1 && <p className="meta" style={{ marginTop: 6 }}>{t('career.toNext', { w: Math.max(0, RANKS[s.career.rank + 1].gate[0] - s.career.windows), r: RANKS[s.career.rank + 1].gate[1], rank: t('career.ranks.' + (s.career.rank + 1)) })}</p>}
        </section>}

        <ShareBlock view={view} r={r} cast={cast} what={what} />
      </div>

      <div>
        <Flag title={t('results.howFlag')} aside={t('results.howAside')} />
        {r.per.map((p) => <SagaLedger key={p.i} p={p} c={cast[p.i]} R={view.R} />)}
        <div className="ledger__r ledger__t"><span className="hed hed--3">{t('results.total')}</span><span className={'cond' + (r.total < 0 ? ' accent' : '')}>{num(r.total, true)}</span></div>
        <p className="note" style={{ marginTop: 14 }}>{view.mode === 'daily' ? t('results.tomorrow') : ''}</p>
        <Btn kind="primary" style={{ marginTop: 16 }} onClick={again}>{view.mode === 'daily' ? t('results.backFront') : t('results.again')} <Arr /></Btn>
      </div>
    </div>
  </div>;
}

function SagaLedger({ p, c, R }: { p: ResultSaga; c: CastSaga; R: View['R'] }) {
  const t = useT();
  const [open, setOpen] = useState(p.called);
  const truthStamp = <Stamp kind={OUTS[p.truth]} size="sm" sound={false}>{outWord(t.lang, p.truth)}</Stamp>;
  const hj = p.truth === 1 && c.alt ? ' · ' + t('results.hijackTo', { c: c.alt.s }) : '';
  const why = p.right && !p.excl && p.call ? (p.why === 'twosource' ? t('results.whyTwo', { o: outWord(t.lang, p.truth) }) : p.why === 'beaten' && p.firstRight ? t('results.whyBeaten', { r: t('rival.' + p.firstRight.id), d: p.firstRight.day }) : p.why === 'uturn' ? t('results.whyUturn') : p.why === 'strength' ? t('results.whyStrength') : '') : '';
  return <div className={'ledger' + (open ? ' is-open' : '')}>
    <button className="ledger__r ledger__head" onClick={() => setOpen(!open)} aria-expanded={open}>
      <span className="ledger__who"><Crest club={p.truth === 1 && c.alt ? c.alt : p.truth === 0 ? c.to : c.from} size={22} /><span><b>{c.player.n}</b><br /><span className="meta">{p.call ? t('results.youCalled') + ' · ' + strWord(t.lang, p.call.s) + ' ' + outWord(t.lang, p.call.o) + ' · ' + t('common.day', { n: p.call.day }) : t('results.notCalled')}</span></span></span>
      <span className="ledger__end">{truthStamp}<span className={'cond' + (p.pts < 0 ? ' accent' : p.pts > 0 ? ' win' : ' muted')}>{num(p.pts, true)}</span></span>
    </button>
    {open && <div className="ledger__body">
      <p className="note">{t('results.happened')}: <b>{outWord(t.lang, p.truth)}</b> · {t('out.' + OUTS[p.truth] + 'D', { to: c.to.s })}{hj}</p>
      {p.tw > 0 && <p className="note">{t('results.twisted', { d: p.tw, a: outWord(t.lang, p.pre), b: outWord(t.lang, p.truth) })}</p>}
      {p.call && (p.right ? <>
        <Line l={t('results.base', { s: strWord(t.lang, p.call.s) })} v={p.parts.base} />
        {p.parts.early > 0 && <Line l={t('results.early', { d: p.call.day, n: R.DAYS - p.call.day })} v={p.parts.early} />}
        {p.parts.excl > 0 && <Line l={t('results.excl')} v={p.parts.excl} hot />}
      </> : <Line l={t('results.wrong', { s: strWord(t.lang, p.call.s) })} v={-p.parts.loss} />)}
      {p.parts.pen > 0 && <Line l={t('results.pen', { s: p.call && p.call.from ? strWord(t.lang, p.call.from.s) + ' ' + outWord(t.lang, p.call.from.o) : '' })} v={-p.parts.pen} />}
      {why && <p className="note why">{why}</p>}
      <p className="note spin">{t('results.spin', { o: outWord(t.lang, p.spin) })}</p>
      {(p.reads.length > 0 || p.posts.length > 0) && <ul className="reads">
        {p.reads.map((x, k) => <li key={k} className={x.right ? 'ok' : 'no'}><span>{t('src.' + x.src)} · {t('common.day', { n: x.day })}</span><span>{saysWord(t.lang, x.src, x.r, c)}</span><b>{x.right ? t('results.readRight') : t('results.readWrong')}</b></li>)}
        {p.posts.map((x, k) => <li key={'p' + k} className={x.right ? 'ok' : 'no'}><span>{t('rival.' + x.id)} · {t('common.day', { n: x.day })}</span><span>{outWord(t.lang, x.claim)}</span><b>{x.right ? t('results.readRight') : t('results.readWrong')}</b></li>)}
      </ul>}
    </div>}
  </div>;
}
const Line = ({ l, v, hot }: { l: string; v: number; hot?: boolean }) => <div className="ledger__line"><span>{l}</span><span className={'cond' + (v < 0 ? ' accent' : hot ? ' win' : '')}>{num(v, true)}</span></div>;

function ShareBlock({ view, r, cast, what }: { view: View; r: Result; cast: CastSaga[]; what: string }) {
  const t = useT();
  const s = useSave();
  const [msg, setMsg] = useState('');
  const best = [...r.per].sort((a, b) => b.pts - a.pts)[0];
  const bc = best ? cast[best.i] : cast[0];
  const bestDest = best && best.truth === 1 && bc.alt ? bc.alt : bc.to;
  const hed = best && best.right && best.call ? (best.truth === 0 || best.truth === 1 ? `${bc.player.s} ${t.rtl ? '←' : 'to'} ${bestDest.s}` : `${bc.player.s}: ${outWord(t.lang, best.truth)}`) : t('tier.' + r.tier);
  const sub = best && best.right && best.call ? (best.call.day >= view.R.DAYS ? t('results.calledItDD') : t('results.calledIt', { n: view.R.DAYS - best.call.day })) : r.called ? t('tierLine.' + r.tier) : t('results.nothing');
  const url = 'sembagames.app/tier-one';
  const text = shareText(t, { what, tier: t('tier.' + r.tier), pts: num(r.total), row: r.row || '', url: 'https://' + url });
  const card = { hed, sub, kick: t('tier.' + r.tier) + (r.ex ? ' · ' + r.ex + '× ' + t('stamp.exclusive') : ''), no: what, date: fmtDate(Date.now(), t.lang, { day: 'numeric', month: 'short', year: 'numeric' }), by: t('share.by', { n: s.nick || 'Tier One' }), url, stats: [[num(r.total, true), t('results.total')], [`${r.right}/${r.per.length}`, t('career.right')], [String(r.ex), t('results.exclusives')]] as [string, string][], stamp: r.ex ? t('stamp.exclusive') : t('tier.' + r.tier), stampKind: r.ex ? 'exclusive' : tierKindOf(r.tier), club: bestDest, no2: bc.player.no, who: bc.player.id, rtl: t.rtl };
  const send = async () => {
    onShared();
    try {
      const blob = await renderCard(card);
      const file = blob ? new File([blob], 'tier-one-scoop.png', { type: 'image/png' }) : null;
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (file && nav.canShare && nav.canShare({ files: [file] })) { await nav.share({ files: [file], text }); return; }
      if (nav.share) { await nav.share({ text }); return; }
      await navigator.clipboard.writeText(text); setMsg(t('common.copied'));
    } catch { /* cancelled */ }
  };
  const save = async () => {
    const blob = await renderCard(card); if (!blob) return;
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tier-one-scoop.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); onShared();
  };
  const copy = async () => { try { await navigator.clipboard.writeText(text); setMsg(t('common.copied')); } catch { setMsg(text); } };
  return <section className="scoop">
    <Flag title={t('results.shareFlag')} />
    <article className="card" aria-label={t('results.shareFlag')} lang={t.lang}>
      <div className="card__mast"><span className="card__name">Tier One</span><span className="card__ed">{card.no}<br />{card.date}</span></div>
      <div className="card__thin" />
      <div className="card__kick">{card.kick}</div>
      <h1 className="card__hed">{hed}</h1>
      <p className="card__sub">{sub}</p>
      <div className="card__body">
        <Portrait club={bestDest} no={bc.player.no || ''} who={bc.player.id} />
        <div className="card__stats">{card.stats.map(([b, l], k) => <div key={k} className="card__stat"><b className={k === 0 && r.total > 0 ? 'win' : ''}>{b}</b><span>{l}</span></div>)}</div>
      </div>
      <div className="card__foot"><span className="card__by">{card.by}</span><span>{url}</span></div>
      <span className={'card__stamp stamp stamp--' + card.stampKind + ' is-slam'}>{card.stamp}</span>
    </article>
    <div className="shareacts">
      <Btn kind="accent" onClick={send}>{t('results.send')} <Arr /></Btn>
      <Btn kind="ghost" onClick={save}>{t('results.saveImg')}</Btn>
      <Btn kind="ghost" onClick={copy}>{t('results.copyText')}</Btn>
    </div>
    {msg && <p className="meta" style={{ marginTop: 8 }}>{msg}</p>}
  </section>;
}
const tierKindOf = (tier: string) => (tier === 'T1' ? 'exclusive' : tier === 'SPIKED' ? 'dead' : 'done');
