// Tactics screen in three tabs (GF-08): Shape (prediction, formation, pitch, mentality), Style (pressing, passing,
// roles, trap, philosophy) and Set pieces. The prediction for the next match moves with every change (E2E #15, #46);
// what you see here is exactly what plays (E2E #1).
import { useMemo, useState } from 'react';
import type { Lang, Strings } from '../i18n';
import type { Career, Player } from '../model/types';
import { playerOf, squadOf, type World } from '../sim/world';
import { DEFAULT_TACTICS, FORMATIONS, FORMATION_IDS, PHILOSOPHIES, available, fmt, fitPenalty, setPieces, slotValue, xiFor, type UserTactics } from '../sim/tactics';
import { predict } from '../sim/match';
import { formationNeeds, hasLicence } from '../sim/coach';
import { userMatch } from '../sim/season';
import { AppBar, Ic, Sheet } from './parts';
import { ICONS } from './icons';

type Seg = readonly [string, readonly string[], number, (v: number) => void];

export function Tactics({ world, career, lang, t, onBack, onSave }: {
  world: World; career: Career; lang: Lang; t: Strings; onBack: () => void; onSave: (tac: UserTactics) => void;
}) {
  const [tac, setTac] = useState<UserTactics>(career.tactics ?? DEFAULT_TACTICS);
  const [tab, setTab] = useState(0);
  const [slot, setSlot] = useState<number | null>(null);
  // Formations locked by licence say why instead of ignoring the tap (E2E #16).
  const [lockMsg, setLockMsg] = useState('');
  const draft: Career = { ...career, tactics: tac };
  const { xi, replaced } = xiFor(world, draft);
  const slots = FORMATIONS[tac.formation].slots;
  const dirty = JSON.stringify(tac) !== JSON.stringify(career.tactics ?? DEFAULT_TACTICS);
  const squad = squadOf(world, career.clubId);
  const pieces = setPieces(xi, tac, career.season);

  const pred = useMemo(() => {
    const m = userMatch(world, draft);
    if (!m) return null;
    const p = predict(m, (id) => playerOf(world, id)!);
    return m.sides[0].clubId === career.clubId ? p : ([p[2], p[1], p[0]] as [number, number, number]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, JSON.stringify(tac)]);

  const setXI = (ids: string[]) => setTac({ ...tac, xi: ids });
  const put = (p: Player) => {
    if (slot === null) return;
    const ids = xi.map((x) => x.id);
    const from = ids.indexOf(p.id);
    if (from >= 0) ids[from] = ids[slot]; // swap two starters
    ids[slot] = p.id;
    setXI(ids);
    setSlot(null);
  };
  const short = (p: Player) => p.name[lang].split(' ').slice(-1)[0];

  const segs = (list: Seg[]) => list.map(([label, opts, val, set]) => (
    <div key={label}>
      <div className="sechead"><span className="over">{label}</span></div>
      <div className="seg g-seg-wrap">
        {opts.map((o, i) => <button key={o} className={val === i ? 'on' : ''} onClick={() => set(i)}>{o}</button>)}
      </div>
    </div>
  ));

  return (
    <>
      <AppBar back={onBack} backLabel={t.back} title={t.tactics} sub={fmt(tac.formation)} />

      {pred && (
        <section className="card g-pred" style={{ marginTop: 'var(--s4)' }}>
          <div className="over">{t.prediction}</div>
          <div className="g-predbar" dir="ltr">
            <i className="w" style={{ width: `${pred[0] * 100}%` }} /><i className="d" style={{ width: `${pred[1] * 100}%` }} /><i className="l" style={{ width: `${pred[2] * 100}%` }} />
          </div>
          <div className="g-predlbl">
            <span>{t.win} <b className="num">{Math.round(pred[0] * 100)}%</b></span>
            <span>{t.draw} <b className="num">{Math.round(pred[1] * 100)}%</b></span>
            <span>{t.loss} <b className="num">{Math.round(pred[2] * 100)}%</b></span>
          </div>
        </section>
      )}

      <div className="seg" style={{ margin: 'var(--s4) 0 var(--s2)' }} role="tablist">
        {t.tacticsTabs.map((l, i) => <button key={l} role="tab" aria-selected={tab === i} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>{l}</button>)}
      </div>

      {tab === 0 && (
        <>
          <div className="sechead"><span className="over">{t.formation}</span></div>
          <div className="g-leagues">
            {FORMATION_IDS.map((f) => {
              const locked = !hasLicence(career.coach?.licence ?? 'ELITE', formationNeeds(f));
              return (
                <button key={f} className={`chip g-toggle${tac.formation === f ? ' on' : ''}${locked ? ' g-locked' : ''}`}
                  onClick={() => (locked ? setLockMsg(t.lockedBy(formationNeeds(f))) : (setLockMsg(''), setTac({ ...tac, formation: f, xi: null })))}>
                  {locked ? <Ic svg={ICONS.lock} /> : null}{fmt(f)}
                </button>
              );
            })}
          </div>
          {lockMsg && <p className="g-bad" role="status">{lockMsg}</p>}

          {replaced.length > 0 && <p className="g-bad">{t.replacedN(replaced.map((p) => p.name[lang]).join('، '))}</p>}

          <div className="g-pitch" dir="ltr">
            {slots.map((sl, i) => {
              const p = xi[i];
              if (!p) return null;
              const off = fitPenalty(p.position, sl.pos) > 0;
              return (
                <button key={i} className={`g-spot${slot === i ? ' on' : ''}${off ? ' off' : ''}`} style={{ left: `${sl.x}%`, bottom: `${sl.y}%` }} onClick={() => setSlot(i)}>
                  <span className="g-spot-n num">{p.shirtNumber}</span>
                  <span className="g-spot-name">{short(p)}</span>
                  <span className="g-spot-pos">{sl.pos}{p.id === pieces.captain.id ? ' ©' : ''}</span>
                </button>
              );
            })}
          </div>
          <button className="btn g-pitchbtn" onClick={() => setTac({ ...tac, xi: null })}>{t.bestXI}</button>

          {segs([[t.mentality, t.mentalities, tac.mentality + 2, (v: number) => setTac({ ...tac, mentality: v - 2 })]])}
        </>
      )}

      {tab === 1 && (
        <>
          {segs([
            [t.pressing, t.pressings, tac.pressing, (v: number) => setTac({ ...tac, pressing: v as 0 | 1 | 2 })],
            [t.passing, t.passings, tac.passing, (v: number) => setTac({ ...tac, passing: v as 0 | 1 | 2 })],
            [`${t.rolesT} · ${t.fullbackT}`, t.fullbacks, tac.fullback ?? 0, (v: number) => setTac({ ...tac, fullback: v as 0 | 1 | 2 })],
            [`${t.rolesT} · ${t.strikerT}`, t.strikers, tac.striker ?? 0, (v: number) => setTac({ ...tac, striker: v as 0 | 1 | 2 | 3 })],
            [t.trapT, t.traps, tac.trap ?? 0, (v: number) => setTac({ ...tac, trap: v as 0 | 1 | 2 | 3 })],
          ])}

          <div className="sechead"><span className="over">{t.philosophyT}</span></div>
          <div className="list">
            {PHILOSOPHIES.map((ph) => {
              const m = Math.round(ph === 'balanced' ? 100 : career.mastery?.[ph] ?? 30);
              return (
                <button key={ph} className={`cell g-phil${(tac.philosophy ?? 'balanced') === ph ? ' g-mine' : ''}`} onClick={() => setTac({ ...tac, philosophy: ph })}>
                  <span className="cmain">
                    <b>{t.philosophies[ph]}</b>
                    <span>{t.philosophyHints[ph]}</span>
                    <span className="g-progress"><i style={{ width: `${m}%` }} /></span>
                  </span>
                  <small className="num muted">{t.mastery} {m}%</small>
                </button>
              );
            })}
          </div>
        </>
      )}

      {tab === 2 && (
        <>
          <div className="sechead"><span className="over">{t.setPiecesT}</span></div>
          <div className="list">
            {([['captain', t.captain], ['penalties', t.penaltiesT], ['freeKicks', t.freeKicksT], ['corners', t.cornersT]] as const).map(([k, label]) => (
              <label key={k} className="cell g-row">
                <span className="cmain"><b>{label}</b></span>
                <select className="g-input g-select" value={pieces[k].id} onChange={(e) => setTac({ ...tac, [k]: e.target.value })}>
                  {xi.map((p) => <option key={p.id} value={p.id}>{p.name[lang]}</option>)}
                </select>
              </label>
            ))}
          </div>
        </>
      )}

      <div style={{ height: 96 }} />
      <div className="dock" style={{ position: 'fixed' }}>
        {dirty && <div className="hint">{t.unsaved}</div>}
        <button className="btn primary" disabled={!dirty} onClick={() => onSave(tac)}>{t.saveTactics}</button>
      </div>

      {slot !== null && (
        <Sheet label={t.pickFor(slots[slot].pos)} onClose={() => setSlot(null)}>
          <h2 className="d3" style={{ margin: 'var(--s4) 0 var(--s3)' }}>{t.pickFor(slots[slot].pos)}</h2>
          <div className="list">
            {[...squad].sort((a, b) => slotValue(b, slots[slot].pos) - slotValue(a, slots[slot].pos)).map((p) => {
              const inXI = xi.some((x) => x.id === p.id);
              const pen = fitPenalty(p.position, slots[slot].pos);
              return (
                <button key={p.id} className={`cell${inXI ? ' g-mine' : ''}`} disabled={!available(p)} onClick={() => put(p)}>
                  <span className="g-shirt num">{p.shirtNumber}</span>
                  <span className="cmain">
                    <b>{p.name[lang]} {!available(p) && <span className="tag g-down">{p.injured ? `✚ ${p.injured}` : `▮ ${p.banned}`}</span>}</b>
                    <span>{p.position}{pen ? ` · ${t.outOfPos} −${pen}` : ''} · {t.fitness} {p.fitness}</span>
                  </span>
                  <span className="g-rating num">{Math.round(slotValue(p, slots[slot].pos))}</span>
                </button>
              );
            })}
          </div>
        </Sheet>
      )}
    </>
  );
}
