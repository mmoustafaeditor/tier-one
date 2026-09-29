// The coach's career: profile, record, trophies, licence and exam, courses, milestones and job offers.
import { useState } from 'react';
import type { Lang, Strings, UiLang } from '../i18n';
import type { Career } from '../model/types';
import { countryOf, money, type World } from '../sim/world';
import {
  COURSES, LICENCE_CAP, LICENCE_NEEDS, MILESTONES, canTakeExam, examQuestions, levelOf, nextLicence, takeCourse, takeExam, xpForLevel,
} from '../sim/coach';
import { Kit } from '../components/Kit';
import { AppBar, Icon, Sheet, Stat } from './parts';
import { CoachCard } from './CoachCard';
import { ICONS } from './icons';

export function CoachScreen({ world, career, lang, t, onBack, onChange, onJob, onToast, ui }: {
  world: World; career: Career; lang: Lang; t: Strings; onBack: () => void; onChange: (c: Career, msg?: string) => void; onJob: (clubId: string) => void;
  onToast: (s: string) => void; ui: UiLang;
}) {
  const qi = (['en', 'ar', 'es', 'fr'] as const).indexOf(ui);
  const [card, setCard] = useState(false);
  const [exam, setExam] = useState<number[] | null>(null);
  const [job, setJob] = useState<string | null>(null);
  const k = career.coach;
  const lvl = levelOf(k.xp);
  const into = (k.xp - xpForLevel(lvl)) / Math.max(1, xpForLevel(lvl + 1) - xpForLevel(lvl));
  const next = nextLicence(k.licence);
  const check = canTakeExam(career);
  const flag = [career.manager?.nationality, career.manager?.nationality2].map((n) => countryOf(world, n)?.flag ?? '').join('');
  const clubName = (id: string) => world.clubs.find((x) => x.id === id)?.name[lang] ?? id;
  const qs = examQuestions(career);

  return (
    <>
      <AppBar back={onBack} backLabel={t.back} title={t.career} sub={career.managerName} />

      {career.jobs.length > 0 && (
        <>
          <div className="sechead"><span className="over">{career.sacked ? t.sackedTitle : t.jobsT}</span></div>
          {career.sacked && <p className="g-bad" style={{ marginTop: 0 }}>{t.sackedBody}</p>}
          <div className="list">
            {career.jobs.map((id) => {
              const c = world.clubs.find((x) => x.id === id)!;
              const lg = world.leagues.find((l) => l.id === c.leagueId)!;
              return (
                <button key={id} className="cell" onClick={() => setJob(id)}>
                  <Kit colors={c.colors} size="md" />
                  <span className="cmain"><b>{c.name[lang]}</b><span>{lg.name[lang]} · {t.reputation} {c.reputation}</span></span>
                  <span className="tag dd">{t.acceptJobShort}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <section className="card g-hero" style={{ marginTop: 'var(--s4)' }}>
        <div className="over">{flag} {career.managerName} · {career.manager?.age ?? ''}</div>
        <h2 className="d2" style={{ margin: 'var(--s2) 0' }}>{t.level} {lvl}</h2>
        <div className="bar"><i style={{ width: `${Math.round(into * 100)}%` }} /></div>
        <div className="g-stats g-stats-4" style={{ marginTop: 'var(--s3)' }}>
          <Stat label={t.licence} value={k.licence} />
          <Stat label={t.reputation} value={String(Math.round(k.reputation))} />
          <Stat label={t.wallet} value={money(k.wallet)} />
          <Stat label={t.record} value={`${k.record[1]}-${k.record[2]}-${k.record[3]}`} />
        </div>
        <button className="btn sm" style={{ width: '100%', marginTop: 'var(--s3)' }} onClick={() => setCard(true)}>{t.coachCardT}</button>
      </section>

      <div className="sechead"><span className="over">{t.trophies}</span></div>
      {k.trophies.length ? (
        <div className="list">
          {[...k.trophies].reverse().map((tr, i) => (
            <div key={i} className="cell g-row">
              <span className="g-shirt"><Icon svg={ICONS.trophy} /></span>
              <span className="cmain"><b>{tr.kind === 'league' || tr.kind === 'promotion' ? world.leagues.find((l) => l.id === tr.id)?.name[lang] : career.cups[tr.id]?.name[lang] ?? tr.id}</b>
                <span>{t.trophyKind[tr.kind]} · {clubName(tr.clubId)} · {t.season(tr.season)}</span></span>
            </div>
          ))}
        </div>
      ) : <p className="muted">{t.noTrophies}</p>}

      <div className="sechead"><span className="over">{t.licence}</span></div>
      <div className="card">
        <b className="d5">{k.licence}</b> <small className="muted">· {t.licenceCap(LICENCE_CAP[k.licence])}</small>
        {next && (
          <>
            <p style={{ margin: 'var(--s2) 0' }}>{t.nextLicence(next)} · {t.licenceCap(LICENCE_CAP[next])}</p>
            <small className="muted">
              {t.examNeeds.level(LICENCE_NEEDS[next].level)} · {t.examNeeds.matches(LICENCE_NEEDS[next].matches)} · {t.examNeeds.fee(money(LICENCE_NEEDS[next].fee))}
            </small>
            {!check.ok && <p className="g-bad" style={{ marginBottom: 0 }}>{
              check.reason === 'fee' ? t.examNeeds.fee(money(check.n ?? 0)) : check.reason === 'level' ? t.examNeeds.level(check.n ?? 0)
                : check.reason === 'matches' ? t.examNeeds.matches(check.n ?? 0) : check.reason === 'wait' ? t.examNeeds.wait(check.n ?? 0)
                  : t.examNeeds[check.reason]()}</p>}
            <button className="btn primary" style={{ width: '100%', marginTop: 'var(--s3)' }} disabled={!check.ok} onClick={() => setExam([-1, -1, -1])}>{t.takeExam}</button>
          </>
        )}
      </div>

      <div className="sechead"><span className="over">{t.coursesT}</span></div>
      <div className="list">
        {COURSES.map((co) => {
          const done = k.courses.includes(co.id);
          return (
            <div key={co.id} className="cell g-row">
              <span className="cmain"><b>{t.courseNames[co.id]}</b><span>{t.courseEffects[co.id]}</span></span>
              {done ? <span className="tag g-up">{t.doneTag}</span> : (
                <button className="btn sm" disabled={k.wallet < co.cost} onClick={() => { const r = takeCourse(career, co.id); if (r.ok) onChange(r.career, t.courseNames[co.id]); }}>
                  {t.takeCourse(money(co.cost))}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="sechead"><span className="over">{t.milestonesT} · {k.milestones.length}/{MILESTONES.length}</span></div>
      {(['short', 'mid', 'long'] as const).map((cat) => (
        <div key={cat} style={{ marginBottom: 'var(--s3)' }}>
          <small className="over">{t.msCats[cat]}</small>
          <div className="list">
            {MILESTONES.filter((m) => m.cat === cat).map((m) => {
              const done = k.milestones.includes(m.id);
              return (
                <div key={m.id} className={`cell g-row${done ? '' : ' g-off'}`}>
                  <span className="g-shirt">{done ? '✓' : '·'}</span>
                  <span className="cmain"><b>{t.msNames[m.id]}</b><span>+{m.xp} XP{m.cash ? ` · ${money(m.cash)}` : ''}</span></span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {exam && next && (
        <Sheet label={t.examTitle(next)} onClose={() => setExam(null)}>
          <h2 className="d3" style={{ margin: 'var(--s4) 0 var(--s3)' }}>{t.examTitle(next)}</h2>
          {qs.map((q, i) => (
            <div key={i} style={{ marginBottom: 'var(--s4)' }}>
              <p style={{ margin: '0 0 var(--s2)' }}><b>{i + 1}. {q.q[qi]}</b></p>
              <div className="seg g-seg-wrap">
                {q.a.map((a, j) => <button key={j} className={exam[i] === j ? 'on' : ''} onClick={() => setExam(exam.map((x, n) => (n === i ? j : x)))}>{a[qi]}</button>)}
              </div>
            </div>
          ))}
          <button className="btn primary" style={{ width: '100%' }} disabled={exam.includes(-1)}
            onClick={() => { const r = takeExam(career, exam); setExam(null); onChange(r.career, r.passed ? t.examPassed : t.examFailed); }}>{t.submit}</button>
        </Sheet>
      )}

      {job && (
        <Sheet label={t.takeJobQ(clubName(job))} onClose={() => setJob(null)}>
          <h2 className="d3" style={{ margin: 'var(--s4) 0 var(--s2)' }}>{t.takeJobQ(clubName(job))}</h2>
          <p className="muted">{t.takeJobBody}</p>
          <div style={{ display: 'grid', gap: 'var(--s3)', marginTop: 'var(--s4)' }}>
            <button className="btn primary" onClick={() => { onJob(job); setJob(null); }}>{t.takeJob}</button>
            <button className="btn ghost" onClick={() => setJob(null)}>{t.cancel}</button>
          </div>
        </Sheet>
      )}
      {card && <CoachCard world={world} career={career} lang={lang} t={t} onClose={() => setCard(false)} toast={onToast} />}
    </>
  );
}
