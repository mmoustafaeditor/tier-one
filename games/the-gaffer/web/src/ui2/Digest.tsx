// "While you were away": what happened during a multi-week sim — results, the staff's calls, why it stopped.
import { Crest, I } from './kit';
import { Panel, PanelHead } from './shell';
import { useGame, clubOf, cn } from './game';
import { logText } from './text';

export function Digest({ onDone }: { onDone: () => void }) {
  const g = useGame();
  const { w, c, x, lang } = g;
  const d = c.lastDigest;
  if (!d) { onDone(); return null; }
  const D = x.digest;
  const log = (c.staffLog ?? []).filter((l) => l.season === d.to[0] && l.round >= d.from[1] - 1).slice(0, 8);
  return (
    <div className="sc-digest">
      <section className="on-ground digest-head">
        <span className="eyebrow">{D.sub(x.common.matchday(d.from[1] + 1), x.common.matchday(d.to[1]))}</span>
        <h1 className="h-hero">{D.title}</h1>
        <p className="lead">{D.stopped[d.stopped] ?? ''}</p>
      </section>
      <div className="grid2">
        <Panel i={1} label={D.results}>
          <PanelHead title={D.results} />
          <div className="rows">
            {d.results.map((r) => {
              const home = r.home === c.clubId;
              const o = clubOf(w, home ? r.away : r.home);
              const [gf, ga] = home ? r.goals : [r.goals[1], r.goals[0]];
              const res = gf > ga ? 0 : gf === ga ? 1 : 2;
              return (
                <div key={r.key} className="row">
                  <Crest club={o} size={28} />
                  <span className="grow"><span className="name">{cn(o, lang)}</span><span className="sub">{r.cup ? c.cups[r.cup]?.name[lang] : home ? x.today.home : x.today.away}</span></span>
                  <span className={`res r${res}`}><b className="ltr">{gf}–{ga}</b><em>{x.wdl[res]}</em></span>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel i={2} label={D.staff(d.staff)}>
          <PanelHead title={D.staff(d.staff)} />
          <div className="rows">
            {log.map((l, i) => <div key={i} className="row"><I n="check" size="sm" /><span className="grow small">{logText(g.t, x, lang, w, l)}</span></div>)}
            {!log.length && <p className="muted small">{x.office.logEmpty}</p>}
          </div>
        </Panel>
      </div>
      <div className="mbar" role="toolbar"><span className="grow" /><button className="btn btn--accent" onClick={onDone}>{D.back}<I n="arrowr" size="sm" /></button></div>
    </div>
  );
}
