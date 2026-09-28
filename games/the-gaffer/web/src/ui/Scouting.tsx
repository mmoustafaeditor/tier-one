// Pre-match: the assistant's advice and the opponent scouting report (with a one-tap counter plan).
import type { Lang, Strings } from '../i18n';
import type { Career } from '../model/types';
import { money, playerOf, type World } from '../sim/world';
import { advice, makeReport, scoutReportCost, type Tip } from '../sim/scouting';
import { DEFAULT_TACTICS, fmt } from '../sim/tactics';
import type { LiveMatch } from '../sim/match';

export function ScoutPanel({ world, career, m, lossChance, lang, t, onChange }: {
  world: World; career: Career; m: LiveMatch; lossChance: number; lang: Lang; t: Strings;
  onChange: (w: World, c: Career, msg?: string) => void;
}) {
  const report = career.scouted?.[m.key];
  const tips = advice(world, career, report, lossChance);
  const club = world.clubs.find((x) => x.id === career.clubId)!;
  const cost = scoutReportCost(world, career);
  const name = (id: string) => playerOf(world, id)?.name[lang] ?? '';
  const tipText = (x: Tip) => {
    switch (x.k) {
      case 'scoutFirst': return t.tips.scoutFirst();
      case 'mismatch': return t.tips.mismatch(t.philosophies[x.theirs], t.philosophies[x.use]);
      case 'edge': return t.tips.edge(t.philosophies[x.theirs]);
      case 'lowMastery': return t.tips.lowMastery(x.n);
      case 'tired': return t.tips.tired(x.n);
      case 'outOfPos': return t.tips.outOfPos(x.n);
      case 'underdog': return t.tips.underdog();
      case 'trap': return t.tips.trap(t.traps[x.trap]);
    }
  };
  return (
    <>
      {tips.length > 0 && (
        <>
          <div className="sechead"><span className="over">{t.adviceT}</span></div>
          <div className="card">
            <ul className="g-aims" style={{ margin: 0 }}>
              {tips.map((x, i) => <li key={i} className={x.k === 'mismatch' || x.k === 'tired' || x.k === 'outOfPos' ? 'g-bad' : x.k === 'edge' ? 'g-ok' : ''}>{tipText(x)}</li>)}
            </ul>
          </div>
        </>
      )}
      <div className="sechead"><span className="over">{t.scoutT}</span></div>
      {!report ? (
        <button className="btn" style={{ width: '100%' }} disabled={club.budget < cost} onClick={() => {
          const r = makeReport(world, career, m);
          if (r) onChange(r.world, r.career, t.scoutT);
        }}>{t.scoutBtn(money(cost))}</button>
      ) : (
        <div className="card g-report">
          <small className="muted">{t.accuracyT(report.accuracy)}</small>
          <div className="g-report-row"><span>{t.predictedShape}</span><b>{fmt(report.formation)} · {t.philosophies[report.philosophy]}</b></div>
          <div className="g-report-row"><span>{t.keyThreats}</span><b>{report.threats.map((x) => `${name(x.id)} (${t.attrs[x.attr]})`).join('، ')}</b></div>
          <div className="g-report-row"><span>{t.weakSpots}</span><b>{report.weak.map((x) => `${name(x.id)} (${t.weakWhy[x.why]})`).join('، ') || '—'}</b></div>
          <div className="g-report-row"><span>{t.counterPlan}</span><b>{t.philosophies[report.plan.philosophy]} · {t.pressing} {t.pressings[report.plan.pressing]} · {t.trapT} {t.traps[report.plan.trap]}</b></div>
          <button className="btn primary sm" onClick={() => {
            const tac = career.tactics ?? DEFAULT_TACTICS;
            onChange(world, { ...career, tactics: { ...tac, philosophy: report.plan.philosophy, pressing: report.plan.pressing, trap: report.plan.trap } }, t.planApplied);
          }}>{t.applyPlan}</button>
        </div>
      )}
    </>
  );
}
