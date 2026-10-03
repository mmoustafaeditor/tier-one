// Rework (handoff §B, A–Z "Arrival"): the first-week guide on Today. It teaches through the real first week instead of a
// manual: five steps, each ticked off by the career's own state (never by having looked at a screen), each with a
// "Show me" that goes where the step is done. Optional: one tap hides it for good (a per-device preference).
import { useState } from 'react';
import { visionOf, VISION_DEADLINE } from '../sim/vision';
import { nextUserMatch } from '../sim/season';
import { useGame } from './game';
import { Panel, PanelHead } from './shell';
import { I } from './kit';
import { GD } from '../lang-guide';

const HIDE = 'gaffer.guide.hidden';
const hidden = () => { try { return localStorage.getItem(HIDE) === '1'; } catch { return false; } };

export function FirstWeekGuide() {
  const g = useGame();
  const { w, c } = g;
  const [off, setOff] = useState(hidden);
  const S = GD[g.ui];
  const m = nextUserMatch(w, c);
  const steps: { key: keyof typeof S.steps; done: boolean; go?: () => void }[] = [
    { key: 'board', done: !!visionOf(c) || c.round >= VISION_DEADLINE },
    { key: 'staff', done: c.done?.welcome !== undefined },
    { key: 'xi', done: !!c.tactics, go: () => g.go({ s: 'match', tab: 0 }) },
    { key: 'report', done: !m || !!c.scouted?.[m.key], go: () => g.go({ s: 'match', tab: 0 }) },
    { key: 'match', done: (c.matches ?? []).length > 0 },
  ];
  const n = steps.filter((s) => s.done).length;
  if (off || c.history.length > 0 || (c.matches ?? []).length > 1 || n === steps.length) return null;
  const hide = () => { try { localStorage.setItem(HIDE, '1'); } catch { /* private mode: hidden for this session */ } setOff(true); };
  return (
    <Panel className="guide" i={0} label={S.title}>
      <PanelHead title={S.title} right={<span className="eyebrow">{S.progress(n, steps.length)}</span>} />
      <p className="small muted">{S.lead}</p>
      <ol className="guide-steps">
        {steps.map((s) => (
          <li key={s.key} className={s.done ? 'done' : ''}>
            <I n={s.done ? 'check' : 'chev'} size="sm" />
            <div className="grow"><b>{S.steps[s.key][0]}</b><span className="small">{S.steps[s.key][1]}</span></div>
            {!s.done && s.go && <button className="btn btn--ghost btn--sm" onClick={s.go}>{S.show}</button>}
          </li>
        ))}
      </ol>
      <button className="link small" onClick={hide}>{S.hide}</button>
    </Panel>
  );
}
