// Staff room: who works for you, and which duties you hand them. Everything but playing the match can be delegated.
import type { Lang, Strings } from '../i18n';
import type { Career, Duty } from '../model/types';
import { money, type World } from '../sim/world';
import { STAFF_ROLES } from '../sim/economy';
import { DUTIES, DUTY_GROUPS, DUTY_ROLE, delegated, hasStaffFor, setAll, setDelegate } from '../sim/staff';
import { AppBar, Icon } from './parts';
import { ICONS } from './icons';
import { logText } from './staffText';

export function StaffRoom({ world, career, lang, t, onBack, onChange, onHire }: {
  world: World; career: Career; lang: Lang; t: Strings; onBack: () => void; onChange: (c: Career, msg?: string) => void; onHire: () => void;
}) {
  const ops = career.ops;
  const n = DUTIES.filter((d) => delegated(career, d)).length;
  const toggle = (d: Duty, on: boolean) => onChange(setDelegate(career, d, on));
  return (
    <>
      <AppBar back={onBack} backLabel={t.back} title={t.staffRoomT} sub={t.staffRoomSub(n, DUTIES.length)} wrapSub />
      <p className="muted g-intro">{t.staffIntro}</p>

      <div className="sechead"><span className="over">{t.staffYours}</span></div>
      <div className="g-staffgrid">
        {STAFF_ROLES.map((role) => {
          const s = ops.staff[role];
          return (
            <div key={role} className="card g-staff">
              <span className="over">{t.staffNames[role]}</span>
              {s ? (
                <>
                  <b className="ltr-auto">{s.name[lang]}</b>
                  <div className="g-barrow"><span>{t.qualityT}</span><div className="bar"><i style={{ width: `${s.quality}%` }} /></div><b className="num">{s.quality}</b></div>
                  <small className="muted">{money(s.wage)}{t.perMonth}</small>
                </>
              ) : <button className="btn sm" onClick={onHire}>{t.hireStaffT}</button>}
            </div>
          );
        })}
      </div>
      <button className="btn ghost" style={{ width: '100%', marginTop: 'var(--s3)' }} onClick={onHire}>{t.hireStaffT}</button>

      <div className="sechead"><span className="over">{t.dutiesT}</span></div>
      <div className="g-twobtn">
        <button className="btn" onClick={() => onChange(setAll(career, true))}>{t.delegateAll}</button>
        <button className="btn" onClick={() => onChange(setAll(career, false))}>{t.takeAll}</button>
      </div>
      {DUTY_GROUPS.map(([group, duties]) => (
        <section key={group}>
          <div className="sechead"><span className="over">{t.dutyGroups[group]}</span></div>
          <div className="list">
            {group === 'matchday' && (
              <div className="cell g-row g-duty">
                <span className="g-duty-ico"><Icon svg={ICONS.whistle} /></span>
                <span className="cmain"><b>{t.matchDuty[0]}</b><span>{t.matchDuty[1]}</span></span>
                <span className="tag">{t.meT}</span>
              </div>
            )}
            {duties.map((d) => {
              const can = hasStaffFor(career, d);
              const on = delegated(career, d);
              return (
                <div key={d} className="cell g-row g-duty">
                  <span className="cmain">
                    <b>{t.duties[d][0]}</b>
                    <span>{can ? `${t.duties[d][1]} · ${t.staffNames[DUTY_ROLE[d]]}` : t.needStaff(t.staffNames[DUTY_ROLE[d]])}</span>
                  </span>
                  <div className="seg g-duty-seg" role="group" aria-label={t.duties[d][0]}>
                    <button className={!on ? 'on' : ''} aria-pressed={!on} onClick={() => toggle(d, false)}>{t.meT}</button>
                    <button className={on ? 'on' : ''} aria-pressed={on} disabled={!can} onClick={() => toggle(d, true)}>{t.staffT}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="sechead"><span className="over">{t.staffLogT}</span></div>
      {(career.staffLog ?? []).length === 0 ? (
        <div className="card"><p className="muted" style={{ margin: 0 }}>{t.staffLogEmpty}</p></div>
      ) : (
        <div className="list">
          {(career.staffLog ?? []).slice(0, 20).map((l, i) => (
            <div key={i} className="cell g-row">
              <span className="cmain"><span>{logText(t, lang, world, l)}</span><small className="muted">{t.season(l.season)} · {t.matchday(l.round + 1)} · {t.staffNames[DUTY_ROLE[l.duty]]}</small></span>
            </div>
          ))}
        </div>
      )}
      <div style={{ height: 24 }} />
    </>
  );
}
