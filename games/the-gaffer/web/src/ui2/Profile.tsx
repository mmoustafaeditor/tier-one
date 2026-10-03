// Rework §R: "manager philosophy profile evolves from actual decisions, not a static quiz". Five lines read from the
// career itself — the plan in use, the transfers made (c.deals), promises kept and broken (dressing room), academy
// players in the squad, and how much is delegated — each with its evidence. Read-only.
import { PF } from '../lang-profile';
import { DEFAULT_TACTICS, fullTactics } from '../sim/tactics';
import { squadOf, playerOf } from '../sim/world';
import { homegrown, roomOf } from '../sim/room';
import { DEPTS, levelOf } from '../sim/delegation';
import { Panel, PanelHead } from './shell';
import { useGame, money } from './game';

export function StyleProfile() {
  const g = useGame();
  const { w, c, x } = g;
  const T = PF[g.ui];
  const tac = c.tactics ?? DEFAULT_TACTICS;
  const ins = c.deals.filter((d) => d.kind === 'in'), outs = c.deals.filter((d) => d.kind === 'out');
  const spent = ins.reduce((s, d) => s + d.fee, 0), raised = outs.reduce((s, d) => s + d.fee, 0);
  const ages = ins.map((d) => { const p = playerOf(w, d.playerId); return p ? d.season - p.birthYear : null; }).filter((a): a is number => a !== null);
  const market = !c.deals.length ? T.market.none : spent > raised * 1.5 ? T.market.buyer : raised > spent * 1.5 ? T.market.seller : T.market.balanced;
  const closed = roomOf(c).pledges.filter((p) => p.status !== 'open');
  const kept = closed.filter((p) => p.status === 'kept').length, broken = closed.length - kept;
  const word = !closed.length ? T.word.none : kept >= 2 && kept >= broken * 3 ? T.word.keeps : broken > kept ? T.word.breaks : T.word.mixed;
  const hg = squadOf(w, c.clubId).filter((p) => homegrown(c, p)).length;
  const youth = hg >= 4 ? T.youth.builder : hg >= 1 ? T.youth.some : T.youth.none;
  const me = DEPTS.filter((d) => levelOf(c, d) === 'me').length;
  const control = me >= 5 ? T.control.hands : me <= 2 ? T.control.delegator : T.control.balanced;
  const rows: [string, string][] = [
    [T.play(x.tac.styles[fullTactics(tac).philosophy] ?? fullTactics(tac).philosophy, tac.formation), ''],
    [market, c.deals.length ? T.marketLine(money(spent), money(raised), ins.length, ages.length ? (ages.reduce((s, a) => s + a, 0) / ages.length).toFixed(1) : '') : ''],
    [word, closed.length ? T.wordLine(kept, broken) : ''],
    [youth, T.youthLine(hg)],
    [control, T.controlLine(me, DEPTS.length)],
  ];
  return (
    <Panel i={4} className="style-profile" label={T.title}>
      <PanelHead title={T.title} right={<span className="eyebrow">{T.sub}</span>} />
      <ul className="sp-list">{rows.map(([a, b], i) => <li key={i}><b>{a}</b>{b && <span className="small muted">{b}</span>}</li>)}</ul>
    </Panel>
  );
}
