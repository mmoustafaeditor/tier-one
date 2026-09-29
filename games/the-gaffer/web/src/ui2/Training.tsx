// The training ground: how hard they work, the week's one focus, extra work for one player, the medical room and
// the academy. Every button is a command; the fitness coach, the doctor and the academy staff can do all of it for
// you (Club › Staff), and when they do it shows up here the same way.
import { useState } from 'react';
import type { PrepFocus } from '../model/types';
import { playerOf, squadOf } from '../sim/world';
import { ACADEMY_MAX, examsLeft, rightsFee, scoutCost, treatmentCost } from '../sim/training';
import { levelOf } from '../sim/delegation';
import { FOCUS_ICON } from '../sim/decisions';
import { I, Portrait } from './kit';
import { Panel, PanelHead, Steps } from './shell';
import { useGame, money, nm, sn } from './game';
import { ageOf } from './util';

const FOCI: PrepFocus[] = ['recovery', 'tactical', 'opposition', 'development'];

export function TrainingScreen() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const T = x.train;
  const ops = c.ops;
  const squad = squadOf(w, c.clubId).sort((a, b) => b.rating - a.rating);
  const [who, setWho] = useState(squad[0]?.id ?? '');
  const hurt = squad.filter((p) => p.injured > 0);
  const focusOf = (id: string) => ops.training.focus[id];
  const target = squad.find((p) => p.id === who);
  const staffRuns = (d: 'fitness' | 'development') => levelOf(c, d) === 'staff';
  return (
    <div className="sc-train">
      <div className="h-head on-ground">
        <button className="link on-ground" onClick={() => g.go({ s: 'squad' })}><I n="back" size="sm" flip={g.rtl} />{x.player.back}</button>
        <h1 className="h-hero">{T.title}</h1>
        <p className="lead">{T.sub}</p>
      </div>
      <div className="grid2">
        <Panel i={0} label={T.load}>
          <PanelHead title={T.load} right={staffRuns('fitness') ? <span className="tag">{x.office.levels.staff}</span> : undefined} />
          <Steps label={T.load} value={ops.training.load} options={T.loads} onChange={(load) => void g.run({ type: 'training.set', load }, { toast: false })} />
          <p className="small muted">{T.loadFx[ops.training.load]}</p>
          <h3 className="h3">{T.focus}</h3>
          <div className="focus-grid">
            {FOCI.map((f) => (
              <button key={f} className="focus" aria-pressed={c.prep === f} onClick={() => void g.run({ type: 'prep.set', focus: f }, { toast: false })}>
                <I n={FOCUS_ICON[f]} />
                <b>{T.focusNames[f]}</b>
                <span className="small">{T.focusFx[f]}</span>
              </button>
            ))}
          </div>
          <h3 className="h3">{T.report}</h3>
          <p className="small">
            {ops.report.improved.length ? <span className="tag tag--good">{T.improved(ops.report.improved.length)}</span> : null}{' '}
            {ops.report.improved.map((id) => { const p = playerOf(w, id); return p ? sn(p, lang) : ''; }).filter(Boolean).join(', ')}
          </p>
          {ops.report.hurt.length > 0 && <p className="small"><span className="tag tag--bad">{T.hurt(ops.report.hurt.length)}</span> {ops.report.hurt.map((id) => { const p = playerOf(w, id); return p ? sn(p, lang) : ''; }).join(', ')}</p>}
        </Panel>

        <Panel i={1} label={T.individual}>
          <PanelHead title={T.individual} />
          <label className="fieldl">
            <span className="small muted">{T.choose}</span>
            <select className="field" value={who} onChange={(e) => setWho(e.target.value)}>
              {squad.map((p) => <option key={p.id} value={p.id}>{nm(p, lang)} · {x.common.pos[p.position]} · {p.rating}</option>)}
            </select>
          </label>
          {target && (
            <>
              <div className="row">
                <Portrait p={target} club={g.club} size={44} />
                <span className="grow"><span className="name">{nm(target, lang)}</span><span className="sub">{ageOf(target, c.season)} · {x.common.posLong[target.position]}</span></span>
                <span className="num">{target.rating}<small className="muted">/{target.potential}</small></span>
              </div>
              <span className="small muted">{T.attr}</span>
              <div className="chips wrap" role="group" aria-label={T.attr}>
                <button className="chip" aria-pressed={focusOf(target.id) === undefined} onClick={() => void g.run({ type: 'training.set', focus: { playerId: target.id, attr: null } }, { toast: false })}>{T.none}</button>
                {x.player.attrs.map((a, i) => (i === 6 && target.position !== 'GK') || (i !== 6 && target.position === 'GK' && i < 4) ? null : (
                  <button key={a} className="chip" aria-pressed={focusOf(target.id) === i} onClick={() => void g.run({ type: 'training.set', focus: { playerId: target.id, attr: i } }, { toast: false })}>
                    {a} <b className="num">{target.attrs[i]}</b>
                  </button>
                ))}
              </div>
            </>
          )}
        </Panel>

        <Panel i={2} label={T.medical}>
          <PanelHead title={T.medical} right={<span className="small muted">{T.injuredN(hurt.length)}</span>} />
          <div className="rows">
            {hurt.map((p) => (
              <div key={p.id} className="row">
                <Portrait p={p} club={g.club} size={40} />
                <span className="grow"><span className="name">{nm(p, lang)}</span><span className="sub">{T.out(p.injured)}</span></span>
                <button className="btn btn--ghost btn--sm" onClick={() => void g.run({ type: 'medical.treat', playerId: p.id, treatment: 'rehab' })}>{T.rehab} · {money(treatmentCost(w, c, 'rehab'))}</button>
                <button className="btn btn--sm" onClick={() => void g.run({ type: 'medical.treat', playerId: p.id, treatment: 'specialist' })}>{T.specialist} · {money(treatmentCost(w, c, 'specialist'))}</button>
              </div>
            ))}
            {!hurt.length && <p className="muted small"><I n="heart" size="sm" /> {T.injuredN(0)}</p>}
          </div>
        </Panel>

        <Panel i={3} label={T.academy}>
          <PanelHead title={T.academy} right={<span className="small muted">{T.prospects(ops.academy.length)}</span>} />
          <div className="rows">
            {ops.academy.map((k) => (
              <div key={k.id} className="row wrap">
                <Portrait p={k} club={g.club} size={40} />
                <span className="grow"><span className="name">{nm(k, lang)}</span><span className="sub">{ageOf(k, c.season)} · {x.common.pos[k.position]} · {k.rating}<span className="muted">/{k.potential}</span></span></span>
                <span className="btns">
                  <button className="btn btn--sm" onClick={() => void g.run({ type: 'academy.promote', id: k.id })}>{T.promote}</button>
                  <button className="btn btn--ghost btn--sm" onClick={() => void g.run({ type: 'academy.sell', id: k.id })}>{T.sellRights(money(rightsFee(w, c, k)))}</button>
                  <button className="btn btn--ghost btn--sm" onClick={() => void g.run({ type: 'academy.release', id: k.id })}>{T.release}</button>
                </span>
              </div>
            ))}
          </div>
          <div className="between">
            <span className="small muted">{T.trialsLeft(examsLeft(ops))}</span>
            <button className="btn btn--accent btn--sm" disabled={!examsLeft(ops) || ops.academy.length >= ACADEMY_MAX} onClick={() => void g.run({ type: 'academy.scout' })}>
              <I n="grad" size="sm" />{T.trial(money(scoutCost(w, c)))}
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
