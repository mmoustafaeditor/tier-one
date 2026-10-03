// Squad planner (rework, handoff §D): the squad by line, with the four things a plan turns on (who the roles say plays,
// whose deal runs out, who is getting old, who is out) and the needs the scouts already derive from Plan A
// (sim/recruit/needs.ts), so a gap here is the same gap Transfers shows. Read-only: nothing here changes the game.
import { useMemo, useState } from 'react';
import type { Player } from '../model/types';
import { squadOf } from '../sim/world';
import { GROUP_OF } from '../sim/groups';
import { roleOf } from '../sim/room';
import { needs as needsOf } from '../sim/recruit/needs';
import { PL } from '../lang-planner';
import { R } from '../lang-recruit-all';
import { Panel, PanelHead } from './shell';
import { useGame } from './game';
import { ageOf } from './util';

const out = (p: Player) => p.injured > 0 || p.banned > 0;
// Folded on phones by default (one summary row, so the player list stays near the top), open on wider screens; the
// manager's choice is remembered.
const KEY = 'gaffer.plan.open';
function openAtStart(): boolean {
  try { const v = localStorage.getItem(KEY); if (v !== null) return v === '1'; } catch { /* no storage */ }
  return typeof matchMedia === 'function' ? matchMedia('(min-width: 760px)').matches : true;
}

export function SquadPlanner() {
  const g = useGame();
  const { w, c, x } = g;
  const T = PL[g.ui];
  const [open, setOpen] = useState(openAtStart);
  const toggle = () => setOpen((o) => { try { localStorage.setItem(KEY, o ? '0' : '1'); } catch { /* no storage */ } return !o; });
  const lines = useMemo(() => {
    const squad = squadOf(w, c.clubId);
    const open = needsOf(w, c);
    return [0, 1, 2, 3].map((grp) => {
      const ps = squad.filter((p) => GROUP_OF[p.position] === grp);
      const roles = ps.map((p) => roleOf(w, c, p));
      const ages = ps.map((p) => ageOf(p, c.season));
      return {
        grp, n: ps.length, out: ps.filter(out).length,
        first: roles.filter((r) => r === 'star' || r === 'starter').length,
        rot: roles.filter((r) => r === 'rotation').length,
        pros: roles.filter((r) => r === 'prospect').length,
        now: ps.filter((p) => p.contractUntil <= c.season).length,
        next: ps.filter((p) => p.contractUntil === c.season + 1).length,
        avg: ages.length ? (ages.reduce((s, a) => s + a, 0) / ages.length).toFixed(1) : '—',
        old: ages.filter((a) => a >= 31).length,
        needs: open.filter((nd) => GROUP_OF[nd.pos] === grp),
      };
    });
  }, [w, c]);
  return (
    <Panel className="g-plan" i={2} label={T.title}>
      <PanelHead title={T.title} right={<button className="btn btn--ghost btn--sm" aria-expanded={open} onClick={toggle}>{open ? T.less : T.more}</button>} />
      {!open && (
        <button className="plan-fold" onClick={toggle}>
          {lines.map((l) => <span key={l.grp} className={`tag ${l.needs.some((nd) => nd.level === 'red') ? 'tag--bad' : l.needs.length ? 'tag--warn' : 'tag--good'}`}>{T.lines[l.grp]}{l.needs.length ? ` · ${l.needs.length}` : ''}</span>)}
        </button>
      )}
      {open && <p className="meta dim plan-sub">{T.sub}</p>}
      {open && <div className="plan">
        {lines.map((l) => (
          <div key={l.grp} className={`plan-line${l.needs.some((nd) => nd.level === 'red') ? ' red' : l.needs.length ? ' amber' : ''}`}>
            <div className="plan-h"><b>{T.lines[l.grp]}</b><span className="dim">{T.players(l.n, l.out)}</span></div>
            <div className="plan-f">{T.roles(l.first, l.rot, l.pros)}</div>
            <div className={`plan-f${l.now ? ' hot' : l.next ? ' warm' : ''}`}>{l.now || l.next ? T.deals(l.now, l.next) : T.dealsNone}</div>
            <div className="plan-f">{T.age(l.avg, l.old)}</div>
            <div className="plan-needs">
              {l.needs.length ? l.needs.map((nd) => (
                <button key={nd.id} className={`tag ${nd.level === 'red' ? 'tag--bad' : 'tag--warn'}`} onClick={() => g.go({ s: 'transfers', tab: 5 })}>
                  {x.common.pos[nd.pos]}: {nd.why.map((k) => R[g.ui].why[k]).join(', ')}
                </button>
              )) : <span className="tag tag--good">{T.ok}</span>}
            </div>
          </div>
        ))}
      </div>}
    </Panel>
  );
}
