// Rework M4 (handoff §O "Tactical Causes", backlog P2): the analysts' findings across a run of matches. The career keeps
// the top three findings of each of the user's last six matches (sim/record.ts keepRecord); what comes back is a
// pattern, and each one that hurts links to the screen that acts on it (the same links full time uses). Read-only.
import { TX } from '../lang-tac-all';
import { TR } from '../lang-trends';
import type { MatchRecordLite } from '../model/types';
import { ACT_OF, ACT_ROUTE } from './FullTime';
import { Panel, PanelHead } from './shell';
import { useGame } from './game';

export function Trends() {
  const g = useGame();
  const { c, x } = g;
  const T = TR[g.ui];
  const ms = (c.matches ?? []).filter((m) => m.home === c.clubId || m.away === c.clubId);
  if (!ms.length) return null;
  const side = (m: MatchRecordLite) => (m.home === c.clubId ? 0 : 1);
  let w = 0, d = 0, l = 0, xf = 0, xa = 0;
  for (const m of ms) {
    const s = side(m), gf = m.goals[s], ga = m.goals[1 - s];
    if (gf > ga) w++; else if (gf === ga) d++; else l++;
    xf += m.xg[s]; xa += m.xg[1 - s];
  }
  const count = new Map<string, { k: string; good: boolean; n: number }>();
  for (const m of ms) for (const p of m.why) {
    const id = `${p.k}:${p.good ? 1 : 0}`;
    const e = count.get(id) ?? { k: p.k, good: p.good, n: 0 };
    if (!m.why.slice(0, m.why.indexOf(p)).some((q) => q.k === p.k && q.good === p.good)) e.n++; // once a match
    count.set(id, e);
  }
  const pats = [...count.values()].filter((p) => p.n >= 2).sort((a, b) => b.n - a.n || Number(a.good) - Number(b.good)).slice(0, 4);
  const label = (k: string, good: boolean) => (k === 'role' ? TX[g.ui].why.head[good ? 0 : 1] : k === 'cohesion' ? T.cohesion[good ? 0 : 1] : (x.ht.cause[k] ?? ['', ''])[good ? 0 : 1]);
  return (
    <Panel i={0} className="trends" label={T.title}>
      <PanelHead title={T.title} right={<span className="eyebrow">{T.last(ms.length)}</span>} />
      <p className="trend-sum"><b className="ltr">{T.record(w, d, l)}</b><span className="dim">{T.xg((xf / ms.length).toFixed(1), (xa / ms.length).toFixed(1))}</span></p>
      {pats.length ? (
        <ul className="trend-list">
          {pats.map((p) => {
            const act = p.good ? undefined : ACT_OF[p.k];
            return (
              <li key={`${p.k}${p.good}`} className={p.good ? 'good' : 'bad'}>
                <span className="grow"><b>{label(p.k, p.good) || p.k}</b><span className="small dim">{T.of(p.n, ms.length)}</span></span>
                {act && <button className="btn btn--ghost btn--sm" onClick={() => g.go(ACT_ROUTE[act])}>{x.ft.act[act]}</button>}
              </li>
            );
          })}
        </ul>
      ) : <p className="small dim">{T.none}</p>}
    </Panel>
  );
}
