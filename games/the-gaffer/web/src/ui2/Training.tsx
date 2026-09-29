// Training week (V2.6): how hard they work (intensity), the week's one focus, who is carrying too much (load and risk),
// up to five individual plans (an attribute, or a new position), and what last week did. Every control is a command;
// the fitness coach runs all of it when Fitness & medical is delegated (Club › Staff), through the same commands.
import { useMemo, useState } from 'react';
import type { Position, PrepFocus } from '../model/types';
import { squadOf } from '../sim/world';
import { staffQ } from '../sim/economy';
import { levelOf } from '../sim/delegation';
import { FOCUS_ICON } from '../sim/decisions';
import { PLANS_MAX, congested, matchRisk, plansOf, riskBand, riskMult, anyPlayer } from '../sim/youth';
import { I, Meter, Portrait } from './kit';
import { Panel, PanelHead, Seg, Sheet, Steps } from './shell';
import { useGame, nm, sn } from './game';
import { ageOf } from './util';
import { Y } from '../lang-youth-all';
import '../styles/youth.css';

const FOCI: PrepFocus[] = ['recovery', 'tactical', 'opposition', 'development'];
const POSITIONS: Position[] = ['CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
export const BAND_TONE = ['good', 'warn', 'bad'] as const;
export const BAND_ICON = ['check', 'alert', 'medic'];

export function TrainingScreen() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const Yx = Y[g.ui];
  const T = Yx.tw;
  const ops = c.ops;
  const squad = useMemo(() => squadOf(w, c.clubId).sort((a, b) => (b.load ?? 0) - (a.load ?? 0) || b.rating - a.rating), [w, c.clubId]);
  const [all, setAll] = useState(false);
  const [adding, setAdding] = useState(false);
  const exact = staffQ(ops, 'fitness') >= 60;
  const busy = congested(c);
  const plans = plansOf(c);
  const rep = c.trainRep;
  const name = (id: string) => { const p = anyPlayer(w, id); return p ? sn(p, lang) : ''; };
  const focusName = x.train.focusNames[c.prep ?? 'tactical'];
  const shown = all ? squad : squad.slice(0, 8);
  const high = squad.filter((p) => riskBand(p) === 2);
  return (
    <div className="sc-train sc-youth">
      <div className="h-head on-ground">
        <button className="link on-ground" onClick={() => g.go({ s: 'squad' })}><I n="back" size="sm" flip={g.rtl} />{x.player.back}</button>
        <h1 className="h-hero">{T.title}</h1>
        <p className="lead">{T.head(ops.training.load, focusName, plans.length)}</p>
        <YouthDoors here="train" />
      </div>
      <div className="grid2">
        <Panel i={0} label={T.intensity}>
          <PanelHead title={T.intensity} right={levelOf(c, 'fitness') === 'staff' ? <span className="tag">{x.office.levels.staff}</span> : undefined} />
          <Steps label={T.intensity} value={ops.training.load} options={Yx.intens} onChange={(load) => void g.run({ type: 'training.set', load })} />
          <p className="small muted">{T.intFx[ops.training.load]}</p>
          {busy && <p className="small"><span className="tag tag--warn"><I n="cal" size="sm" />{T.congested}</span></p>}
          {rep?.heavyDropped && <p className="small muted">{T.dropped}</p>}
          <h3 className="h3">{T.focus}</h3>
          <div className="focus-grid">
            {FOCI.map((f) => (
              <button key={f} className="focus" aria-pressed={c.prep === f} onClick={() => void g.run({ type: 'prep.set', focus: f }, { toast: false })}>
                <I n={FOCUS_ICON[f]} />
                <b>{x.train.focusNames[f]}</b>
                <span className="small">{x.train.focusFx[f]}</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel i={1} label={T.load}>
          <PanelHead title={T.load} right={<span className="eyebrow">{T.loadSub}</span>} />
          <div className="rows">
            {shown.map((p) => {
              const b = riskBand(p);
              const fragile = !!p.rr && p.rr[1] > 0;
              const band = fragile ? 2 : b;
              return (
                <button key={p.id} className="row linkrow load-row" onClick={() => g.player(p.id)}>
                  <Portrait p={p} club={g.club} size={36} />
                  <span className="grow">
                    <span className="name">{nm(p, lang)}</span>
                    <span className="sub">{x.common.pos[p.position]} · {exact ? T.loadN(p.load ?? 0) : Yx.bands[b]}{b ? ` · ${T.riskX(riskMult(p.load).toFixed(1))}` : ''}{fragile ? ` · ${T.fragile(p.rr![1])}` : ''}{p.injured ? ` · ${x.squad.sub2.inj(p.injured)}` : ''}</span>
                    <Meter v={p.load ?? 0} tone={b === 2 ? 'bad' : b === 1 ? 'warn' : undefined} />
                  </span>
                  <span className={`tag tag--${BAND_TONE[band]}`}><I n={BAND_ICON[band]} size="sm" />{Yx.bands[band]}</span>
                </button>
              );
            })}
          </div>
          <div className="between">
            <span className="small muted">{exact ? (high.length ? '' : T.allFresh) : T.loadHidden}</span>
            {squad.length > 8 && <button className="btn btn--ghost btn--sm" onClick={() => setAll(!all)}>{all ? x.close : `+${squad.length - 8}`}</button>}
          </div>
        </Panel>

        <Panel i={2} label={T.plans}>
          <PanelHead title={T.plans} right={<span className="eyebrow">{T.plansN(plans.length, PLANS_MAX)}</span>} />
          <div className="rows">
            {plans.map((id) => {
              const p = anyPlayer(w, id);
              if (!p) return null;
              const attr = ops.training.focus?.[id];
              const pos = ops.training.pos?.[id];
              const pct = Math.min(99, Math.round(ops.training.posProg?.[id] ?? 0));
              return (
                <div key={id} className="row plan-row">
                  <Portrait p={p} club={g.club} size={36} />
                  <span className="grow">
                    <span className="name">{nm(p, lang)}</span>
                    <span className="sub">{pos ? T.learning(x.common.posLong[pos], pct) : attr !== undefined ? T.sharpening(x.player.attrs[attr]) : ''}{p.alt ? ` · ${T.also(x.common.pos[p.alt])}` : ''}</span>
                    {pos && <Meter v={pct} />}
                  </span>
                  <button className="btn btn--ghost btn--sm" onClick={() => void g.run(pos ? { type: 'training.set', pos: { playerId: id, pos: null } } : { type: 'training.set', focus: { playerId: id, attr: null } }, { toast: false })}>{T.remove}</button>
                </div>
              );
            })}
            {!plans.length && <p className="muted small">{T.plansNone}</p>}
          </div>
          <div className="between">
            <span className="small muted">{plans.length >= PLANS_MAX ? T.plansFull : ''}</span>
            <button className="btn btn--accent btn--sm" disabled={plans.length >= PLANS_MAX} onClick={() => setAdding(true)}><I n="plus" size="sm" />{T.add}</button>
          </div>
        </Panel>

        <Panel i={3} label={T.report}>
          <PanelHead title={T.report} />
          {rep && (rep.up.length || rep.near.length || rep.knocks.length || rep.academyUp.length) ? (
            <div className="report">
              {rep.up.length > 0 && <p className="small"><span className="tag tag--good"><I n="trend" size="sm" />{T.up(rep.up.length)}</span> {rep.up.map(name).join(', ')}</p>}
              {rep.near.length > 0 && <p className="small"><span className="tag"><I n="grow" size="sm" />{T.near}</span> {rep.near.slice(0, 5).map(name).join(', ')}</p>}
              {rep.knocks.length > 0 && <p className="small"><span className="tag tag--bad"><I n="medic" size="sm" />{T.knocks(rep.knocks.length)}</span> {rep.knocks.map(name).join(', ')}</p>}
              {rep.academyUp.length > 0 && <p className="small"><button className="tag tag--good tagbtn" onClick={() => g.go({ s: 'academy' })}><I n="grad" size="sm" />{T.academyUp(rep.academyUp.length)}</button></p>}
            </div>
          ) : <p className="muted small">{T.quiet}</p>}
          {high.length > 0 && (
            <button className="row linkrow" onClick={() => g.go({ s: 'medical' })}><I n="medic" /><span className="grow"><span className="name">{Yx.md.edge}</span><span className="sub">{high.map((p) => `${sn(p, lang)} ${Yx.md.thisMatch(matchRisk(p))}`).join(' · ')}</span></span><I n="chev" size="sm" flip={g.rtl} /></button>
          )}
        </Panel>
      </div>
      {adding && <PlanSheet onClose={() => setAdding(false)} />}
    </div>
  );
}

function PlanSheet({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const { w, c, x, lang } = g;
  const T = Y[g.ui].tw;
  const taken = new Set(plansOf(c));
  const squad = squadOf(w, c.clubId).filter((p) => !taken.has(p.id)).sort((a, b) => ageOf(a, c.season) - ageOf(b, c.season) || b.potential - a.potential);
  const [who, setWho] = useState(squad[0]?.id ?? '');
  const [kind, setKind] = useState<'attr' | 'pos'>('attr');
  const [attr, setAttr] = useState<number | null>(null);
  const [pos, setPos] = useState<Position | null>(null);
  const p = squad.find((q) => q.id === who);
  const gk = p?.position === 'GK';
  const attrs = x.player.attrs.map((a, i) => ({ a, i })).filter(({ i }) => (gk ? [6, 2, 0, 5].includes(i) : i !== 6));
  const byAttr = kind === 'attr' || gk;
  const ok = !!p && (byAttr ? attr !== null : !!pos);
  const save = async () => {
    if (!p) return;
    const r = await g.run(byAttr ? { type: 'training.set', focus: { playerId: p.id, attr } } : { type: 'training.set', pos: { playerId: p.id, pos } }, { toast: false });
    if (r.ok) onClose();
  };
  return (
    <Sheet label={T.add} onClose={onClose}>
      <h2 className="h2">{T.add}</h2>
      <div className="plan-sheet">
        <label className="fieldl">
          <span className="small muted">{T.who}</span>
          <select className="field" value={who} onChange={(e) => { setWho(e.target.value); setAttr(null); setPos(null); }}>
            {squad.map((q) => <option key={q.id} value={q.id}>{nm(q, lang)} · {x.common.pos[q.position]} · {ageOf(q, c.season)}</option>)}
          </select>
        </label>
        {p && !gk && <Seg label={T.add} value={kind} onChange={setKind} options={[{ v: 'attr', label: T.attr }, { v: 'pos', label: T.pos }]} />}
        {byAttr ? (
          <div className="chips wrap" role="group" aria-label={T.attr}>
            {attrs.map(({ a, i }) => <button key={a} className="chip" aria-pressed={attr === i} onClick={() => setAttr(i)}>{a} <b className="num">{p?.attrs[i]}</b></button>)}
          </div>
        ) : (
          <div className="chips wrap" role="group" aria-label={T.pos}>
            {POSITIONS.filter((q) => q !== p?.position && q !== p?.alt).map((q) => <button key={q} className="chip" aria-pressed={pos === q} onClick={() => setPos(q)}>{x.common.posLong[q]}</button>)}
          </div>
        )}
        <p className="small muted">{byAttr ? T.attrFx : T.posFx}</p>
      </div>
      <div className="sheet-actions"><button className="btn btn--accent" disabled={!ok} onClick={() => void save()}>{T.save}</button></div>
    </Sheet>
  );
}

// The three rooms of the training ground, one tap apart.
export function YouthDoors({ here }: { here: 'train' | 'medical' | 'academy' }) {
  const g = useGame();
  const D = Y[g.ui].doors;
  const items: { s: 'train' | 'medical' | 'academy'; icon: string; label: string }[] = [{ s: 'train', icon: 'bolt', label: D.train }, { s: 'medical', icon: 'medic', label: D.medical }, { s: 'academy', icon: 'grad', label: D.academy }];
  return (
    <div className="ydoors chips chips--scroll" role="group">
      {items.map((d) => <button key={d.s} aria-pressed={d.s === here} className="chip" onClick={() => d.s !== here && g.go({ s: d.s })}><I n={d.icon} size="sm" />{d.label}</button>)}
    </div>
  );
}
