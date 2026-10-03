// The tunnel: the one moment before kick-off where the screen breathes. Team sheets, the last word in the dressing
// room, the odds, and three ways in: walk out, just the result, or sim on to the next decision.
import { pct1 } from './util';
import { RefLine } from './Officials';
import { isDerby } from '../sim/rivalry';
import { CL } from '../lang-club-all';
import { RF } from '../lang-ref-all';
import { squadOf } from '../sim/world';
import { useMemo, useState } from 'react';
import { nextUserMatch, table, leagueOf } from '../sim/season';
import { predict, expected, modelOf, type Talk } from '../sim/match';
import { N } from '../sim/engine/model';
import { TX } from '../lang-tac-all';
import { playerOf } from '../sim/world';
import { attendance, capacityOf } from '../sim/economy';
import { FORMATIONS } from '../sim/tactics';
import { dateOf, shortDate } from '../sim/calendar';
import { Crest, I, Portrait } from './kit';
import { StadiumScene } from './Scene';
import { Panel, PanelHead } from './shell';
import { useGame, clubOf, cn, sn, matchLabel } from './game';
import { tacticsLab } from '../sim/lab';
import { LB } from '../lang-lab';
import type { FormationId } from '../sim/tactics';

export function PreMatch() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const m = useMemo(() => nextUserMatch(w, c), [w, c]);
  // Our three words map onto the engine's team talks: fire them up (1), focus (3), calm them down (2).
  const TALK: Talk[] = [1, 3, 2];
  const [talk, setTalkState] = useState<Talk>(g.c.talk ?? 0);
  if (!m) return null;
  const me = (m.sides[0].clubId === c.clubId ? 0 : 1) as 0 | 1;
  const home = clubOf(w, m.sides[0].clubId)!, away = clubOf(w, m.sides[1].clubId)!;
  const opp = me === 0 ? away : home;
  const get = (id: string) => playerOf(w, id)!;
  const p = predict(m, get);
  const win = me === 0 ? p[0] : p[2];
  const xg = expected(m, get).xg;
  const cap = capacityOf(c.ops);
  const crowd = me === 0 ? attendance(w, c, c.ops.ticket) : Math.round(cap * 0.08);
  const rows = m.cup ? [] : table(w, c, leagueOf(w, c.clubId));
  const myPos = rows.findIndex((r) => r.clubId === c.clubId) + 1;
  const oppRow = rows.find((r) => r.clubId === opp.id);
  const myRow = rows.find((r) => r.clubId === c.clubId);
  const upPos = myRow && oppRow ? rows.filter((r) => r.pts > myRow.pts + 3 || (r.pts === myRow.pts + 3 && r.clubId !== c.clubId)).length + 1 : myPos;
  const date = dateOf(c.season, m.round, !!m.cup);
  const stakes = m.cup ? x.pre.stakesCup(matchLabel(g, m).split(' · ').pop() ?? '') : myRow && oppRow && Math.abs(myRow.pts - oppRow.pts) <= 6 ? x.pre.stakesUp(cn(opp, lang), x.place(Math.max(1, Math.min(myPos, upPos)))) : x.pre.stakesPlain;
  const cap0 = (s: 0 | 1) => { const sd = m.sides[s]; const pid = sd.pieces.captain || sd.onPitch[0]; return get(pid); };
  const sheet = (s: 0 | 1) => {
    const sd = m.sides[s];
    const slots = FORMATIONS[sd.tactics.formation].slots;
    return sd.onPitch.map((id, i) => ({ id, p: get(id), pos: slots[i]?.pos ?? get(id).position }));
  };
  const bars = [3, 2, 1];
  // The briefing: our biggest extra-man zone, theirs, and what the scouts know (engine/model.ts zone contests).
  const model = modelOf(m, get);
  const Z = TX[g.ui].preview.zones, lanes = x.tac.lanes as unknown as string[];
  const at = (n: number, side: 0 | 1) => model.att[side].nodes[n]?.duel;
  const cells = [[N.B, Z.build, 1], [N.P0, Z.mid, 0], [N.P1, Z.mid, 1], [N.P2, Z.mid, 2], [N.F0, Z.final, 0], [N.F1, Z.final, 1], [N.F2, Z.final, 2], [N.CRS, Z.box, 1]] as const;
  const theirZone = (n: number) => (n === N.B ? Z.press : n === N.CRS ? Z.box : n === N.F0 || n === N.F1 || n === N.F2 ? Z.defend : Z.screen);
  // Candidates: with the ball, where we have the extra man (edge) or they crowd us (crowd); without it, where they have it.
  const cand: { mag: number; text: string }[] = [];
  for (const [n, z, l] of cells) {
    const d = at(n, me);
    if (d && d.na - d.nd > 0.3) cand.push({ mag: d.na - d.nd, text: x.pre.edge(z, lanes[l], d.na.toFixed(1), d.nd.toFixed(1)) });
    if (d && d.nd - d.na > 0.3) cand.push({ mag: d.nd - d.na, text: x.pre.crowd2(z, lanes[l], d.na.toFixed(1), d.nd.toFixed(1)) });
    const e = at(n, (1 - me) as 0 | 1);
    if (e && e.na - e.nd > 0.3) cand.push({ mag: e.na - e.nd, text: x.pre.danger(theirZone(n), lanes[2 - l], e.nd.toFixed(1), e.na.toFixed(1)) });
  }
  const top = cand.sort((p, q) => q.mag - p.mag).slice(0, 2).map((cc) => cc.text);
  const report = c.scouted?.[m.key];
  const oppSide = m.sides[1 - me];
  const brief: string[] = [
    ...(top.length ? top : [x.pre.even]),
    report ? x.pre.known(x.tac.styles[report.plan.philosophy] ?? report.plan.philosophy, oppSide.tactics.formation) : x.pre.unknown(oppSide.tactics.formation),
  ];
  // gf-ref: our players suspended for this competition.
  const banned = squadOf(w, c.clubId).filter((p) => (m.cup ? (p.sus?.[m.cup] ?? 0) > 0 : p.banned > 0));
  return (
    <div className="sc-pre">
      <header className="topbar on-ground">
        <div className="club">
          <button className="icon-btn" aria-label={x.back} onClick={() => g.go({ s: 'today' })}><I n="back" /></button>
          <div className="grow"><b>{matchLabel(g, m)}</b><small>{shortDate(date, g.ui)}</small></div>
        </div>
      </header>
      <div className="grid">
        {/* Pack v2: the host's ground (its flags and banner), not a drawn tunnel; on an away day it is their stadium. */}
        <StadiumScene host={home} guest={away} className="tunnel g-t pre-scene">
          <div className="walkers" aria-hidden="true"><Portrait p={cap0(0)} club={home} bare /><Portrait p={cap0(1)} club={away} bare /></div>
          <div className="over">
            {isDerby(home.id, away.id) && <span className="tag tag--warn"><I n="fans" size="sm" />{CL[g.ui].derby}</span>}
            <span className="crowd">{me === 0 ? x.pre.crowd(crowd.toLocaleString(g.ui === 'ar' ? 'ar-EG' : g.ui), cn(home, lang)) : x.pre.crowdAway(crowd.toLocaleString(g.ui === 'ar' ? 'ar-EG' : g.ui))}</span>
            <h1 className="h-hero">{home.shortName && lang === 'en' ? home.shortName : cn(home, lang)} v {away.shortName && lang === 'en' ? away.shortName : cn(away, lang)}.</h1>
            <p className="stakes">{stakes}</p>
            <p className="refpre"><RefLine m={m} /></p>
            {banned.length > 0 && <p className="refpre"><span className="tag tag--bad"><I n="x" size="sm" />{RF[g.ui].outSuspended(banned.map((p) => sn(p, lang)).join(', '))}</span></p>}
          </div>
        </StadiumScene>

        <Panel i={1} label={x.pre.sheets}>
          <PanelHead title={x.pre.sheets} right={<span className="eyebrow">{x.pre.confirmed}</span>} />
          <div className="sheet-cols">
            {([0, 1] as const).map((s) => (
              <div key={s}>
                <div className="xi-h"><Crest club={s === 0 ? home : away} size={22} /><span>{cn(s === 0 ? home : away, lang)} · <span className="ltr">{m.sides[s].tactics.formation}</span></span></div>
                <div className="xi">
                  {sheet(s).map((r) => <div key={r.id}><span className="n">{r.p.shirtNumber}</span><span className="nm">{sn(r.p, lang)}</span><span className="p">{x.common.pos[r.pos]}</span></div>)}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel i={2} label={x.pre.talk}>
          <PanelHead title={x.pre.talk} />
          <div className="talk">
            {x.pre.talks.map(([a, b], i) => (
              <button key={i} aria-pressed={talk === TALK[i]} onClick={() => { setTalkState(TALK[i]); void g.run({ type: 'talk.set', talk: TALK[i] }, { toast: false }); }}>
                <b>{a}</b><span>{b}</span>
                <span className="r" aria-hidden="true">{[0, 1, 2].map((k) => <i key={k} className={k < bars[i] ? 'on' : ''} />)}</span>
              </button>
            ))}
          </div>
        </Panel>

        {/* Rework (handoff §K): a briefing, not a results preview — the engine's own zone numbers for this match (the same
            grid Tactics shows) and what the scouts know. */}
        <Panel i={3} className="brief" label={x.pre.brief}>
          <PanelHead title={x.pre.brief} right={<button className="btn btn--ghost btn--sm" onClick={() => g.go({ s: 'match', tab: 0 })}>{x.pre.openTac}</button>} />
          <ol className="brief-list">{brief.map((line, i) => <li key={i}>{line}</li>)}</ol>
        </Panel>

        <TacticsLab />

        <div className="stack">
          <Panel i={3}>
            <div className="facts">
              <div className="kpi"><span className="v">{pct1(win)}</span><span className="l">{x.pre.winChance}</span></div>
              <div className="kpi"><span className="v">{xg[me].toFixed(1)}</span><span className="l">{x.pre.ourXg}</span></div>
              <div className="kpi"><span className="v">{xg[1 - me].toFixed(1)}</span><span className="l">{x.pre.theirXg}</span></div>
            </div>
          </Panel>
          <div className="go">
            <button className="btn btn--accent" disabled={g.busy} onClick={() => g.play('live')}><I n="whistle" />{x.pre.walk}</button>
            <button className="btn btn--ghost on-ground" disabled={g.busy} onClick={() => g.play('quick')}><I n="ff" />{x.pre.result}</button>
            <button className="btn btn--ghost on-ground" disabled={g.busy} onClick={() => g.play('sim')}><I n="clock" />{x.pre.sim}</button>
            <p className="meta center dimg">{x.pre.simSub}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tactics Lab (rework, handoff §J): the next match in the engine's own odds under each style, in this shape or another
// (sim/lab.ts). Folded until asked for; worked out only when open.
function TacticsLab() {
  const g = useGame();
  const { w, c, x } = g;
  const T = LB[g.ui];
  const [open, setOpen] = useState(false);
  const cur = (c.tactics?.formation ?? '4-3-3') as FormationId;
  const [shape, setShape] = useState<FormationId>(cur);
  const lab = useMemo(() => (open ? tacticsLab(w, c, shape) : null), [open, w, c, shape]);
  const pts = (v: number) => (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(1);
  return (
    <Panel i={3} className="lab" label={T.title}>
      <PanelHead title={T.title} right={<button className="btn btn--ghost btn--sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? T.close : T.open}</button>} />
      {open && lab && <>
        <p className="meta dim">{T.sub}</p>
        <label className="lab-shape"><span>{T.shape}</span>
          <select value={shape} onChange={(e) => setShape(e.target.value as FormationId)}>
            {(Object.keys(FORMATIONS) as FormationId[]).map((f) => <option key={f} value={f}>{f}{f === cur ? ' ✓' : ''}</option>)}
          </select>
        </label>
        <div className="lab-rows">
          <div className="lab-row now">
            <span className="nm"><b>{T.now}</b><small className="ltr">{cur} · {x.tac.styles[lab.now.ph]}</small></span>
            <span className="v">{pct1(lab.now.win)}</span>
            <span className="x ltr">{T.xg(lab.now.xg[0].toFixed(1), lab.now.xg[1].toFixed(1))}</span>
            <span className="tag">{T.inUse}</span>
          </div>
          {lab.rows.map((r) => {
            const same = shape === cur && r.ph === lab.now.ph;
            const d = r.win - lab.now.win;
            return (
              <div key={r.ph} className="lab-row">
                <span className="nm"><b>{x.tac.styles[r.ph]}</b><small className={`ltr ${d > 0.005 ? 'up' : d < -0.005 ? 'down' : ''}`}>{T.diff(pts(d))}</small></span>
                <span className="v">{pct1(r.win)}</span>
                <span className="x ltr">{T.xg(r.xg[0].toFixed(1), r.xg[1].toFixed(1))}</span>
                {same ? <span className="tag">{T.inUse}</span>
                  : <button className="btn btn--ghost btn--sm" disabled={g.busy} onClick={() => void g.run({ type: 'tactics.set', tactics: r.tactics }, { toast: x.tac.locked })}>{T.use}</button>}
              </div>
            );
          })}
        </div>
        <p className="meta dim">{T.note}</p>
      </>}
    </Panel>
  );
}
