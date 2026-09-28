// Training (load, individual focus, weekly report, development points), the hospital and the academy.
import { useState } from 'react';
import type { Lang, Strings } from '../i18n';
import type { Career } from '../model/types';
import { money, playerOf, squadOf, type World } from '../sim/world';
import {
  ACADEMY_MAX, DEV_COST, atCeiling, canUseDev, promote, releaseProspect, scoutCost, scoutProspects, sellRights, treat, treatmentCost, useDev,
  type DevUse, type Treatment,
} from '../sim/training';
import { roundFee } from '../sim/season';
import { AppBar, Empty } from './parts';

type Done = (w: World, c: Career, msg?: string) => void;

export function TrainingScreen({ world, career, lang, t, onBack, onChange }: {
  world: World; career: Career; lang: Lang; t: Strings; onBack: () => void; onChange: Done;
}) {
  const squad = squadOf(world, career.clubId).sort((a, b) => b.rating - a.rating);
  const ops = career.ops;
  const [who, setWho] = useState(squad[0]?.id ?? '');
  const [msg, setMsg] = useState('');
  const target = squad.find((p) => p.id === who) ?? null;
  const setOps = (o: Partial<typeof ops>) => onChange(world, { ...career, ops: { ...ops, ...o } });

  return (
    <>
      <AppBar back={onBack} backLabel={t.back} title={t.trainingT} sub={`⚡ ${ops.devPoints}`} />
      <div className="sechead"><span className="over">{t.loadT}</span></div>
      <div className="seg">
        {t.loads.map((l, i) => <button key={l} className={ops.training.load === i ? 'on' : ''} onClick={() => setOps({ training: { ...ops.training, load: i as 0 | 1 | 2 } })}>{l}</button>)}
      </div>
      <p className="muted">{t.loadHints[ops.training.load]}</p>

      <div className="sechead"><span className="over">{t.reportT}</span></div>
      <div className="card">
        {ops.report.improved.length ? <p style={{ marginTop: 0 }}><b className="g-ok">{t.improvedN(ops.report.improved.length)}</b>: {ops.report.improved.map((id) => playerOf(world, id)?.name[lang]).filter(Boolean).join('، ')}</p>
          : <p className="muted" style={{ marginTop: 0 }}>{t.reportNone}</p>}
        {ops.report.hurt.map((id) => <p key={id} className="g-bad" style={{ margin: 0 }}>{t.hurtIn(playerOf(world, id)?.name[lang] ?? '')}</p>)}
      </div>

      <div className="sechead"><span className="over">{t.devT} · ⚡ {ops.devPoints}</span></div>
      <div className="card g-form">
        <small className="muted">{t.devHint}</small>
        <select className="g-input g-select" value={who} onChange={(e) => setWho(e.target.value)} aria-label={t.choosePlayer}>
          {squad.map((p) => <option key={p.id} value={p.id}>{p.name[lang]} · {p.rating}/{p.potential}</option>)}
        </select>
        {(Object.keys(DEV_COST) as DevUse[]).map((u) => {
          const check = canUseDev(career, u === 'morale' ? null : target, u);
          return (
            <div key={u} className="g-devrow">
              <span>{t.devUses[u]} · ⚡{DEV_COST[u]}</span>
              <button className="btn sm" onClick={() => {
                if (!check.ok) { setMsg(t.devWhy[check.reason]); return; }
                const r = useDev(world, career, target, u);
                setMsg('');
                onChange(r.world, r.career, t.devUses[u]);
              }}>{t.use}</button>
            </div>
          );
        })}
        {msg && <p className="g-bad" role="status" style={{ margin: 0 }}>{msg}</p>}
      </div>

      <div className="sechead"><span className="over">{t.focusT}</span></div>
      <div className="list">
        {squad.map((p) => (
          <div key={p.id} className="cell g-row">
            <span className="cmain">
              <b>{p.name[lang]} <small className="muted">{p.rating}/{p.potential}</small></b>
              {atCeiling(p) ? <span className="muted">{t.ceiling}</span> : <span className="g-progress"><i style={{ width: `${Math.round(p.prog ?? 0)}%` }} /></span>}
            </span>
            <select className="g-input g-select" style={{ maxWidth: 130 }} value={ops.training.focus[p.id] ?? -1}
              onChange={(e) => setOps({ training: { ...ops.training, focus: { ...ops.training.focus, [p.id]: Number(e.target.value) } } })}>
              <option value={-1}>{t.focusNone}</option>
              {t.attrs.map((a, i) => <option key={a} value={i}>{a}</option>)}
            </select>
          </div>
        ))}
      </div>
    </>
  );
}

export function HospitalScreen({ world, career, lang, t, onBack, onChange }: {
  world: World; career: Career; lang: Lang; t: Strings; onBack: () => void; onChange: Done;
}) {
  const hurt = squadOf(world, career.clubId).filter((p) => p.injured > 0);
  const [msg, setMsg] = useState('');
  const club = world.clubs.find((x) => x.id === career.clubId)!;
  return (
    <>
      <AppBar back={onBack} backLabel={t.back} title={t.hospitalT} sub={`${t.budget} ${money(club.budget)}`} />
      {msg && <p className="g-bad" role="status">{msg}</p>}
      {!hurt.length ? <Empty text={t.noInjuries} /> : hurt.map((p) => (
        <div key={p.id} className="card g-offer" style={{ marginTop: 'var(--s3)' }}>
          <div className="g-offer-head"><span className="cmain"><b>{p.name[lang]}</b><small className="muted">{p.position} · {t.statusInj(p.injured)}</small></span></div>
          <div style={{ display: 'grid', gap: 'var(--s2)' }}>
            {(['rehab', 'specialist', 'instant'] as Treatment[]).map((k) => {
              const cost = treatmentCost(world, career, k);
              return (
                <button key={k} className="btn sm" disabled={club.budget < cost} onClick={() => {
                  const r = treat(world, career, p, k);
                  if (r.ok) onChange(r.world, r.career, t.treated); else setMsg(t.notEnough);
                }}>{t.treatments[k]} · {money(cost)}</button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

export function AcademyScreen({ world, career, lang, t, onBack, onChange }: {
  world: World; career: Career; lang: Lang; t: Strings; onBack: () => void; onChange: Done;
}) {
  const ops = career.ops;
  const club = world.clubs.find((x) => x.id === career.clubId)!;
  const cost = scoutCost(world, career);
  const full = ops.academy.length >= ACADEMY_MAX;
  return (
    <>
      <AppBar back={onBack} backLabel={t.back} title={t.academyT} sub={`${ops.academy.length}/${ACADEMY_MAX} · ${t.facilityNames.academy} ${ops.facilities.academy}`} />
      <button className="btn primary" style={{ width: '100%', marginTop: 'var(--s4)' }} disabled={full || club.budget < cost}
        onClick={() => { const r = scoutProspects(world, career); if (r.ok) onChange(r.world, r.career, t.scoutFound(r.found)); }}>{t.scoutExam(money(cost))}</button>
      {full && <p className="muted">{t.academyFull}</p>}
      {!ops.academy.length ? <Empty text={t.noProspects} /> : (
        <div style={{ display: 'grid', gap: 'var(--s3)', marginTop: 'var(--s4)' }}>
          {ops.academy.map((k) => (
            <div key={k.id} className="card g-offer">
              <div className="g-offer-head">
                <span className="cmain"><b>{k.name[lang]}</b><small className="muted">{k.position} · {career.season - k.birthYear} · {k.nationality}</small></span>
                <span className="g-rating num">{k.rating}</span><span className="g-rating num" style={{ color: 'var(--ok)' }}>{k.potential}</span>
              </div>
              <div className="g-offer-btns">
                <button className="btn primary sm" onClick={() => { const r = promote(world, career, k.id); if (r.ok) onChange(r.world, r.career, t.promoted); }}>{t.promoteT}</button>
                <button className="btn sm" onClick={() => { const r = sellRights(world, career, k.id); onChange(r.world, r.career, money(r.fee)); }}>{t.sellRightsT(money(roundFee(k.marketValue * 0.7)))}</button>
                <button className="btn ghost sm" onClick={() => onChange(world, releaseProspect(career, k.id))}>{t.releaseT}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
