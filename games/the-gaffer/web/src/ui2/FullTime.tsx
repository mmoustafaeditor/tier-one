// Full-time: the score under the lights, the line of the match, how the chances piled up, what it changed (table,
// board, fans, dressing room — all read from the same MatchRecord), and the ratings.
import { OfficialsPanel } from './Officials';
import { RF } from '../lang-ref-all';
import { useState } from 'react';
import type { Aftermath } from '../sim/aftermath';
import { playerOf } from '../sim/world';
import { Crest, I, LineChart, Portrait } from './kit';
import { Panel, PanelHead } from './shell';
import { useGame, clubOf, cn } from './game';
import { verdictText } from './why';
import { D } from '../lang-dressing-all';
import { AI_COH, cohLevel } from '../sim/cohesion';
import { levelText } from './roomText';
import { Analysis } from './Analysis';
import { AN } from '../lang-ana';

export function FullTime({ a, onDone }: { a: Aftermath; onDone: () => void }) {
  const g = useGame();
  const { w, c, x, lang } = g;
  const [all, setAll] = useState(false);
  const [ana, setAna] = useState(false); // the post-match analysis (FM's Analysis screen)
  const me = clubOf(w, c.clubId)!, opp = clubOf(w, a.opp)!;
  const home = a.home ? me : opp, away = a.home ? opp : me;
  const hg = a.home ? a.mine : a.theirs, ag = a.home ? a.theirs : a.mine;
  const F = x.ft;
  const lines = F.heads[a.res](cn(me, lang), cn(opp, lang));
  const pick = lines[(a.key.length + a.mine * 3 + a.theirs) % lines.length];
  const tail = a.pos && a.pos[0] ? (a.pos[1] < a.pos[0] ? F.tail.up(x.place(a.pos[1])) : a.pos[1] > a.pos[0] ? F.tail.down(x.place(a.pos[1])) : F.tail.same(x.place(a.pos[1]))) : '';
  const d = (p: [number, number]) => Math.round(p[1] - p[0]);
  const delta = (n: number) => (n === 0 ? '±0' : n > 0 ? `+${n}` : `${n}`);
  const ratings = all ? a.ratings : a.ratings.slice(0, 4);
  const why = a.why ? verdictText(a.why, g.t) : '';
  const doc = c.ops.staff.assistant;
  const ground = a.home ? x.today.ourGround : x.today.theirGround;
  return (
    <div className="sc-ft">
      <div className="grid">
        <Panel className="g-ft ft" i={0} label={`${cn(home, lang)} ${hg} ${cn(away, lang)} ${ag}`}>
          <span className="eyebrow">{F.eyebrow(ground)}</span>
          <div className="line">
            <Crest club={home} size={60} />
            <span className="score ltr">{hg}–{ag}{a.pens ? <small className="pens"> ({a.home ? a.pens[0] : a.pens[1]}–{a.home ? a.pens[1] : a.pens[0]})</small> : null}</span>
            <Crest club={away} size={60} />
          </div>
          <div className="head">{pick}{tail}</div>
          <div className="goals">{a.scorers.map((s, i) => <span key={i}>{s.pn[lang]} {s.min}′</span>)}</div>
        </Panel>

        <Panel className="g-xg" i={1} label={F.xg90}>
          <div className="between"><span className="eyebrow">{F.xg90}</span><div className="legend"><span><i />{cn(me, lang)} {a.xg[0].toFixed(2)}</span><span><i className="them" />{cn(opp, lang)} {a.xg[1].toFixed(2)}</span></div></div>
          <h2 className="h2">{why}</h2>
          <LineChart h={170} step rtl={g.rtl} fmt={(v) => v.toFixed(1)} x={a.xgLine[0].map((_, i) => (i % 15 === 0 ? `${i}′` : ''))} tipX={(i) => `${i}′`}
            series={[{ data: a.xgLine[0], label: cn(me, lang) }, { data: a.xgLine[1], them: true, label: cn(opp, lang) }]}
            markers={a.scorers.map((s) => ({ i: s.min, label: s.pn[lang].split(' ').slice(-1)[0] }))} />
        </Panel>

        <Panel i={2} label={F.changed}>
          <PanelHead title={F.changed} />
          <div className="changes">
            {a.pos && a.pos[1] > 0 && (
              <div className="chg"><span className="l"><I n="trend" size="sm" />{F.league}</span><span className="v">{x.place(a.pos[1])}{a.pos[0] && a.pos[0] !== a.pos[1] ? <small className={a.pos[1] < a.pos[0] ? 'up' : 'down'}>{a.pos[1] < a.pos[0] ? '↑' : '↓'}{Math.abs(a.pos[0] - a.pos[1])}</small> : null}</span></div>
            )}
            <div className="chg"><span className="l"><I n="board" size="sm" />{F.board}</span><span className="v">{Math.round(a.board[1])}<small className={d(a.board) >= 0 ? 'up' : 'down'}>{delta(d(a.board))}</small></span><p>{F.boardQuote(a.board[1] - a.board[0])}</p></div>
            <div className="chg"><span className="l"><I n="fans" size="sm" />{F.fans}</span><span className="v">{Math.round(a.fans[1])}<small className={d(a.fans) >= 0 ? 'up' : 'down'}>{delta(d(a.fans))}</small></span><p>{F.fansQuote(a.fans[1] - a.fans[0])}</p></div>
            {a.coh && <div className="chg chg-link" role="button" tabIndex={0} onClick={() => g.go({ s: 'room' })}><span className="l"><I n="handshake" size="sm" />{D[g.ui].ftCoh}</span><span className="v">{Math.round(a.coh[1])}<small className={a.coh[1] - a.coh[0] >= 0 ? 'up' : 'down'}>{delta(Math.round(a.coh[1] - a.coh[0]))}</small></span><p>{D[g.ui].ftCohQuote(levelText(cohLevel(a.coh[0]) - cohLevel(AI_COH)))}</p></div>}
            <div className="chg"><span className="l"><I n="room" size="sm" />{F.room}</span><span className="v">{a.room[1]}<small className={d(a.room) >= 0 ? 'up' : 'down'}>{delta(d(a.room))}</small></span><p>{F.roomQuote(a.room[1] - a.room[0])}</p></div>
          </div>
          {a.out.length > 0 && <div className="outs">{a.out.map((o, i) => <span key={i} className="tag tag--bad"><I n={o.ban ? 'x' : 'medic'} size="sm" />{o.ban ? F.bannedFor(o.pn[lang], o.n) : F.injuredFor(o.pn[lang], o.n)}</span>)}</div>}
          {a.records.length > 0 && <p className="small"><span className="tag tag--good"><I n="star" size="sm" />{F.record}</span> {a.records.map((r) => x.career.recs[r]).join(' · ')}</p>}
          {a.why?.tips[0] && doc && (
            <div className="advice ft-note">
              <span className="staff" aria-hidden="true">AS</span>
              <div><div className="who">{doc.name[lang]}, <span>{x.office.roles.assistant.toLowerCase()}</span></div><q>{why}</q></div>
            </div>
          )}
        </Panel>

        {a.ref && (
          <Panel i={4} label={RF[g.ui].report.title}>
            <PanelHead title={RF[g.ui].report.title} />
            <OfficialsPanel a={a} me={a.me} home={cn(home, lang)} away={cn(away, lang)} />
          </Panel>
        )}

        <Panel i={3} label={F.ratings}>
          <PanelHead title={F.ratings} right={a.ratings.length > 4 ? <button className="link" onClick={() => setAll(!all)}>{F.all(a.ratings.length)}</button> : undefined} />
          <div className="ratings">
            {ratings.map((r) => {
              const p = playerOf(w, r.id);
              return (
                <button key={r.id} className="rt" onClick={() => g.player(r.id)}>
                  {p ? <Portrait p={p} club={me} size={40} /> : <span />}
                  <span><b>{r.pn[lang]}{a.motm?.id === r.id && <span className="motm">{F.motm}</span>}</b><span className="s">{r.mins}′</span></span>
                  <span className={`r${a.motm?.id === r.id ? ' top' : ''}`}>{r.rating.toFixed(1)}</span>
                </button>
              );
            })}
          </div>
        </Panel>
        {ana && a.ana && <Analysis a={a} />}
      </div>
      <div className="mbar" role="toolbar">
        {a.ana && <button className="btn btn--ghost" aria-pressed={ana} onClick={() => { setAna(!ana); if (!ana) requestAnimationFrame(() => document.querySelector('.g-ana')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }}>{AN[g.ui].open}</button>}
        <span className="grow" />
        <button className="btn btn--accent" onClick={onDone}>{F.done}<I n="arrowr" size="sm" /></button>
      </div>
    </div>
  );
}
