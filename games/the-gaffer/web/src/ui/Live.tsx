// Live match: clock, momentum, the pitch driven by the engine's ball path, commentary from the event log, live stats,
// the assistant's "Why" at half-time and full time, and in-match management (subs, shape, every instruction) that takes
// effect on the very next minute. The parent saves the match state at kick-off, at half-time and after every change.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Lang, Strings } from '../i18n';
import type { Career, Player } from '../model/types';
import type { World } from '../sim/world';
import { playerOf } from '../sim/world';
import { FORMATIONS, FORMATION_IDS, fmt, fullTactics, type Tactics } from '../sim/tactics';
import { SUBS_MAX, expected, isUserSide, reshape, setTactics, setTalk, simulate, stepMinute, userSub, type LiveMatch, type MatchEvent, type Talk } from '../sim/match';
import { applyTip, explain, THEME_OF, winChance, type Tip } from '../sim/engine/story';
import type { ShotType } from '../sim/engine/model';
import { formationNeeds, hasLicence } from '../sim/coach';
import { Kit } from '../components/Kit';
import { Pitch2D, awayKit, type Camera } from './Pitch2D';
import { Radar } from './Radar';
import { Momentum } from './Momentum';
import { WhyCard, tipWhat, tipWhy } from './WhyCard';
import { commentary, type Line } from './commentary';
import { setSound, sfx, soundOn } from './sfx';
import { matchRatings } from '../sim/ratings';
import { Ic, Sheet } from './parts';
import { shareReport } from './MatchCard';
import { ICONS } from './icons';

const CAM_NAMES = ['2D', '2.5D', '3D'];
const clone = (m: LiveMatch): LiveMatch => JSON.parse(JSON.stringify(m));
// Real time per match minute: 1X lets you watch the pitch (about 36 s a match), 4X is the old quick pace.
const SPEEDS = [400, 200, 100];
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const isShot = (e: MatchEvent) => e.kind === 'goal' || e.kind === 'miss' || e.kind === 'save' || e.kind === 'block';
const shotSide = (e: MatchEvent) => (e.kind === 'save' ? 1 - e.side : e.side);

export function Live({ m, world, career, lang, t, locked, onUpdate, onSave, onContinue, speed0 = 0, openOn = 0, label = '', onToast, camera0 = 0, onCamera }: {
  m: LiveMatch; world: World; career: Career; lang: Lang; t: Strings;
  locked: boolean;                       // quick result: already final, nothing to change
  onUpdate: (m: LiveMatch) => void;      // every tick
  onSave: (m: LiveMatch) => void;        // kick-off, half-time, changes
  onContinue: () => void;
  speed0?: 0 | 1 | 2;                    // settings: default speed
  label?: string;                        // competition, for the shared report
  camera0?: Camera;                      // settings: pitch camera
  onCamera?: (c: Camera) => void;
  onToast?: (s: string) => void;
  openOn?: 0 | 1;                        // settings: pitch or commentary first
}) {
  const [paused, setPaused] = useState(false);
  // Tabs: 0 pitch, 1 commentary, 2 stats, 3 line-ups. A quick result opens on the commentary.
  const [tab, setTab] = useState<number>(locked ? 1 : openOn);
  const [speed, setSpeed] = useState<number>(speed0);
  const [camera, setCamera] = useState<Camera>(camera0);
  const [changes, setChanges] = useState(false);
  const [talk, setTalkOpen] = useState(false);
  const [outId, setOutId] = useState('');
  const [inId, setInId] = useState('');
  const [sound, setSoundState] = useState(soundOn());
  const [flash, setFlash] = useState<{ side: 0 | 1; id: string; key: number } | null>(null);
  const get = (id: string) => playerOf(world, id)!;
  const me = isUserSide(m, career) as 0 | 1;
  const done = m.minute >= 90;
  const club = (i: 0 | 1) => world.clubs.find((c) => c.id === m.sides[i].clubId)!;
  const [h, a] = [club(0), club(1)];
  const kits: [string, string] = [h.colors[0], awayKit(h.colors[0], a.colors)];
  const name = (id: string) => (id ? playerOf(world, id)?.name[lang] ?? '' : '');

  // Clock: one match minute per tick; stops at half-time for the team talk and the assistant's read.
  useEffect(() => {
    if (locked || paused || done || changes || talk) return;
    const id = setTimeout(() => {
      const n = clone(m);
      stepMinute(n, get);
      onUpdate(n);
      if (n.minute === 45) { setTalkOpen(true); onSave(n); sfx('whistle'); }
      else if (n.minute === 90) { onSave(n); sfx('whistle'); }
      else if (n.minute % 5 === 0) onSave(n); // so a restart loses at most four minutes (GF-26)
    }, SPEEDS[speed]);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, paused, done, changes, talk, locked, speed]);

  // Goal moments: the flash, the score slam, the roar.
  const goals = m.goals[0] + m.goals[1];
  const lastGoals = useRef(goals);
  useEffect(() => {
    if (goals > lastGoals.current && !locked) {
      const g = [...m.events].reverse().find((e) => e.kind === 'goal');
      if (g) {
        setFlash({ side: g.side, id: g.playerId, key: Date.now() });
        sfx('goal');
        try { navigator.vibrate?.(g.side === me ? [60, 40, 140] : 40); } catch { /* not supported */ }
      }
    }
    lastGoals.current = goals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals]);
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), reduced() ? 1200 : 2300);
    return () => clearTimeout(id);
  }, [flash]);

  const change = (f: (n: LiveMatch) => void) => { const n = clone(m); f(n); onUpdate(n); onSave(n); };

  const lines = useMemo(() => commentary(m, t, name, (i) => club(i).name[lang]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.events.length, m.minute, lang]);
  const tacKey = JSON.stringify(m.sides[me]?.tactics) + (m.sides[me]?.onPitch.join() ?? '');
  // The assistant's read: at half-time (the talk sheet), in the changes sheet, and at full time.
  const why = useMemo(() => ((talk || changes || done) && me >= 0 ? explain(m, me, get) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [talk, changes, done, m.events.length, m.minute, tacKey]);
  const winNow = useMemo(() => (changes ? Math.round(winChance(m, me, expected(m, get)) * 100) : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [changes, m.minute, m.events.length, tacKey]);

  const s = m.sides[me];
  const slots = FORMATIONS[s.tactics.formation].slots;
  const rt = m.minute >= 10 ? matchRatings(m, get) : null;
  const rate = (id: string) => (rt?.rating[id] !== undefined ? rt.rating[id].toFixed(1) : '–');
  const ft = fullTactics(s.tactics);
  const ins = t.eng.ins;
  const apply = (tip: Tip) => { change((n) => applyTip(n, me, tip, get)); onToast?.(t.eng.applied); };
  const setT = (patch: Partial<Tactics>) => change((n) => setTactics(n, me, patch));

  // Stats beyond the classic seven, all counted from the same events and the engine's clock.
  const more = [0, 1].map((i) => [
    m.events.filter((e) => isShot(e) && shotSide(e) === i && (e.xg ?? 0) >= 0.3).length,
    m.events.filter((e) => e.kind === 'offside' && e.side === i).length,
    (m.tl?.ent ?? []).slice(i * 3, i * 3 + 3).reduce((x, v) => x + v, 0),
    m.tl?.hi[i] ?? 0,
  ]);
  const themeXg = [0, 1].map((i) => {
    const o: Record<string, number> = {};
    for (const e of m.events) if (isShot(e) && shotSide(e) === i) { const th = THEME_OF[(e.how ?? 'box') as ShotType] ?? 'centre'; o[th] = (o[th] ?? 0) + (e.xg ?? 0); }
    return o;
  });
  const thirds = (() => {
    const z = m.tl?.zone ?? [];
    const col = (c: number) => [0, 1].reduce((x, sd) => x + [0, 1, 2, 3, 4].reduce((y, r) => y + (z[sd * 30 + c * 5 + r] ?? 0), 0), 0);
    const v = [col(0) + col(1), col(2) + col(3), col(4) + col(5)];
    const tot = v[0] + v[1] + v[2] || 1;
    return v.map((x) => Math.round((100 * x) / tot));
  })();

  const seg = (key: string, label: string, opts: string[], hints: string[], val: number, set: (v: number) => void) => (
    <div key={key} className="g-ins">
      <div className="sechead"><span className="over">{label}</span></div>
      <div className="seg g-seg-wrap">
        {opts.map((o, i) => <button key={o} className={val === i ? 'on' : ''} aria-pressed={val === i} onClick={() => set(i)}>{o}</button>)}
      </div>
      <p className="g-ins-hint">{hints[val]}</p>
    </div>
  );
  const feed = (list: Line[]) => list.map((l, i) => (
    <div key={i} className={`cell g-ev${l.cls}`}>
      <span className="g-ev-min num">{l.min}′</span>
      <span className="cmain"><span>{l.text}</span></span>
    </div>
  ));
  const statRow = (lbl: string, x: number, y: number, fmtV: (v: number) => string = String) => (
    <div key={lbl} className="g-statrow">
      <b className="num">{fmtV(x)}</b>
      <span><small>{lbl}</small><span className="g-split" dir="ltr"><i style={{ width: `${x + y ? (x / (x + y)) * 100 : 50}%` }} /></span></span>
      <b className="num">{fmtV(y)}</b>
    </div>
  );

  return (
    <>
      <section className={`g-bug${flash ? ' slam' : ''}`} key={flash ? `bug${flash.key}` : 'bug'}>
        <span className="g-bug-team"><Kit colors={h.colors} size="sm" /><b>{h.shortName}</b></span>
        <span className="g-bug-score num">{m.goals[0]}–{m.goals[1]}</span>
        <span className="g-bug-team"><b>{a.shortName}</b><Kit colors={a.colors} size="sm" /></span>
        <span className={`g-bug-min num${done ? ' ft' : ''}`}>{done ? t.fullTime : m.minute === 45 ? t.halfTime : `${m.minute}′`}{done && m.pens ? ` · ${t.pens(m.pens[0], m.pens[1])}` : ''}</span>
        <span className="g-bug-xg num">xG {(m.xg?.[0] ?? 0).toFixed(1)} · {(m.xg?.[1] ?? 0).toFixed(1)}</span>
      </section>
      <Momentum m={m} colors={kits} label={t.eng.momentum} />
      <div className="seg" style={{ marginBottom: 'var(--s3)' }}>
        {[t.pitchT, t.feed, t.statsT, t.lineups].map((l, i) => <button key={l} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>{l}</button>)}
      </div>
      <div className="g-chips g-livechips">
        {!done && !locked && (
          <button className="chip g-toggle g-speed" onClick={() => setSpeed((speed + 1) % SPEEDS.length)} aria-label={t.speed}>{['1X', '2X', '4X'][speed]} ▸</button>
        )}
        {tab === 0 && (
          <button className="chip g-toggle g-cam" aria-label={t.cameraT} onClick={() => { const c = ((camera + 1) % 3) as Camera; setCamera(c); onCamera?.(c); }}><Ic svg={ICONS.camera} /> {CAM_NAMES[camera]}</button>
        )}
        <button className="chip g-toggle" aria-pressed={sound} aria-label={sound ? t.eng.soundOn : t.eng.soundOff} title={sound ? t.eng.soundOn : t.eng.soundOff}
          onClick={() => { setSound(!sound); setSoundState(!sound); }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" />{sound ? <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" /> : <path d="M17 9l5 6M22 9l-5 6" />}</svg>
        </button>
      </div>
      {done && rt?.motm && (
        <div className="banner g-motm"><span className="bic"><Ic svg={ICONS.star} /></span><div><b>{t.motm}: {name(rt.motm)}</b><p className="num">{t.ratingT} {rate(rt.motm)}{m.xg ? ` · xG ${m.xg[0].toFixed(1)}–${m.xg[1].toFixed(1)}` : ''}</p></div></div>
      )}
      {done && why && tab !== 3 && <WhyCard why={why} t={t} name={name} title={t.eng.whyFT} tipsTitle={t.eng.tipsFT} />}
      {tab === 0 && (
        <div className="g-livecols">
          <div className="g-pitchwrap">
            <Pitch2D m={m} world={world} goalWord={t.goalWord} camera={camera} msPerMinute={SPEEDS[speed]} running={!paused && !done && !changes && !talk && !locked} />
            {flash && (
              <div className={`g-goalflash${flash.side === me ? ' mine' : ''}`} key={flash.key} style={{ ['--gf' as string]: kits[flash.side] }} role="status" aria-live="assertive">
                <b>{t.eng.goalFlash}</b><span>{name(flash.id)}</span><small className="num">{m.goals[0]}–{m.goals[1]}</small>
              </div>
            )}
          </div>
          <div className="list g-livefeed">{feed(lines.slice(0, 8))}</div>
        </div>
      )}

      {tab === 1 && <div className="list">{feed(lines)}</div>}
      {tab === 2 && <Radar world={world} m={m} t={t} lang={lang} />}
      {tab === 2 && (
        <div className="list">
          {m.xg && statRow(t.xgT, m.xg[0], m.xg[1], (v) => v.toFixed(2))}
          {t.statNames.map((lbl, k) => statRow(lbl, m.stats[0][k], m.stats[1][k], k === 0 ? (v) => `${v}%` : String))}
          {t.eng.statsMore.map((lbl, k) => statRow(lbl, more[0][k], more[1][k]))}
        </div>
      )}
      {tab === 2 && m.tl && (
        <>
          <div className="sechead"><span className="over">{t.eng.territory}</span></div>
          <div className="g-terr" dir="ltr">
            {thirds.map((v, i) => <span key={i} style={{ flexGrow: Math.max(8, v) }}><b className="num">{v}%</b></span>)}
          </div>
          <div className="g-terr-key" dir="ltr"><span><Kit colors={h.colors} size="xs" /> →</span><span>← <Kit colors={a.colors} size="xs" /></span></div>
          <div className="sechead"><span className="over">{t.eng.xgFrom}</span></div>
          <div className="list">
            {Object.keys(t.eng.themes).filter((th) => (themeXg[0][th] ?? 0) + (themeXg[1][th] ?? 0) > 0.005)
              .map((th) => statRow(t.eng.themes[th], themeXg[0][th] ?? 0, themeXg[1][th] ?? 0, (v) => v.toFixed(2)))}
          </div>
        </>
      )}
      {tab === 3 && (
        <div className="g-lineups">
          {([0, 1] as const).map((i) => (
            <div key={i} className="list">
              <div className="cell g-row"><Kit colors={club(i).colors} size="xs" /><span className="cmain"><b>{club(i).name[lang]}</b><span>{fmt(m.sides[i].tactics.formation)}</span></span></div>
              {m.sides[i].onPitch.map((id, k) => id && (
                <div key={id} className="cell g-row g-lu">
                  <span className="tag">{FORMATIONS[m.sides[i].tactics.formation].slots[k].pos}</span>
                  <span className="cmain"><b>{rt?.motm === id && done ? <><Ic svg={ICONS.star} /> </> : ''}{name(id)}</b><small className="muted num">{Math.round(m.fit[id] ?? 0)}%</small></span>
                  <span className={`g-rating num${rt && Number(rate(id)) >= 7.5 ? ' g-hot' : ''}`} title={t.ratingT}>{rate(id)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 110 }} />
      <div className="dock" style={{ position: 'fixed' }}>
        {done ? (
          <div className="g-livebtns g-two">
            <button className="btn" onClick={async () => {
              const r = await shareReport(world, m, label, lang, t, career.season);
              if (r.result === 'downloaded') onToast?.(t.savedAs(r.file));
            }}>{t.shareReport}</button>
            <button className="btn primary" onClick={onContinue}>{t.done}</button>
          </div>
        ) : (
          <div className="g-livebtns">
            <button className="btn" onClick={() => setPaused(!paused)}>{paused ? t.resume : t.pause}</button>
            <button className="btn" onClick={() => setChanges(true)}>{t.changes}</button>
            <button className="btn ghost" onClick={() => { const n = clone(m); n.sides[me].autoSubs = true; simulate(n, get); onUpdate(n); onSave(n); }}>{t.skip}</button>
          </div>
        )}
      </div>

      {talk && (
        <Sheet label={t.halfTimeTalk} onClose={() => setTalkOpen(false)}>
          {why && <div style={{ marginTop: 'var(--s4)' }}><WhyCard why={why} t={t} name={name} title={t.eng.whyHT} tipsTitle={t.eng.tipsHT} onApply={apply} /></div>}
          <h2 className="d3" style={{ margin: 'var(--s4) 0 var(--s3)' }}>{t.halfTimeTalk}</h2>
          <div style={{ display: 'grid', gap: 'var(--s2)' }}>
            {t.talks.map((lbl, i) => (
              <button key={lbl} className={`btn${i === 1 ? ' primary' : ''}`} onClick={() => { change((n) => setTalk(n, me, i as Talk)); setTalkOpen(false); }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{lbl}{t.talkHints[i] && <span className="sub">{t.talkHints[i]}</span>}</span>
              </button>
            ))}
          </div>
          <button className="btn ghost" style={{ width: '100%', marginTop: 'var(--s3)' }} onClick={() => { setTalkOpen(false); setChanges(true); }}>{t.changes}</button>
        </Sheet>
      )}

      {changes && (
        <Sheet label={t.changes} onClose={() => setChanges(false)}>
          <div className="g-chghead">
            <h2 className="d3" style={{ margin: 0 }}>{t.changes}</h2>
            <span className="chip num g-winnow">{t.win} {winNow}%</span>
          </div>
          {why?.tips[0] && (
            <div className="card g-why g-why-mini">
              <span className="over">{t.eng.assistantPick}</span>
              <TipRow tip={why.tips[0]} t={t} name={name} onApply={apply} />
            </div>
          )}
          {/* Subs first (the four-tap job), both columns with rating and fitness, a sticky confirm line at the bottom (GF-07). */}
          <div className="sechead"><span className="over">{t.subsLeft(SUBS_MAX - s.subs)}</span></div>
          <div className="g-subcols">
            <div>
              <small className="over">{t.subOut}</small>
              <div className="list">
                {s.onPitch.map((id, k) => id && (
                  <button key={id} className={`cell g-lu${outId === id ? ' g-sel' : ''}`} aria-pressed={outId === id} onClick={() => setOutId(outId === id ? '' : id)}>
                    <span className="tag">{slots[k].pos}</span>
                    <span className="cmain"><b>{name(id)}</b><small className="num">{t.fitness} {Math.round(m.fit[id] ?? 0)}</small></span>
                    <span className="g-rating num">{get(id).rating}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <small className="over">{t.subIn}</small>
              <div className="list">
                {s.bench.map((id) => {
                  const p: Player = get(id);
                  return (
                    <button key={id} className={`cell g-lu${inId === id ? ' g-sel' : ''}`} aria-pressed={inId === id} onClick={() => setInId(inId === id ? '' : id)}>
                      <span className="tag">{p.position}</span>
                      <span className="cmain"><b>{p.name[lang]}</b><small className="num">{t.fitness} {Math.round(m.fit[id] ?? p.fitness)}</small></span>
                      <span className="g-rating num">{p.rating}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="sechead"><span className="over">{ins.formation}</span></div>
          <div className="g-leagues">
            {FORMATION_IDS.map((f) => {
              const lockedF = !hasLicence(career.coach?.licence ?? 'ELITE', formationNeeds(f));
              return <button key={f} disabled={lockedF} className={`chip g-toggle${ft.formation === f ? ' on' : ''}`} onClick={() => change((n) => reshape(n, me, f, get))}>{fmt(f)}</button>;
            })}
          </div>
          {seg('mentality', ins.mentality.t, ins.mentality.o, ins.mentality.h, ft.mentality + 2, (v) => setT({ mentality: v - 2 }))}
          {seg('pressing', ins.pressing.t, ins.pressing.o, ins.pressing.h, ft.pressing, (v) => setT({ pressing: v as 0 | 1 | 2 }))}
          {seg('line', ins.line.t, ins.line.o, ins.line.h, ft.line, (v) => setT({ line: v as 0 | 1 | 2 }))}
          {seg('width', ins.width.t, ins.width.o, ins.width.h, ft.width, (v) => setT({ width: v as 0 | 1 | 2 }))}
          {seg('tempo', ins.tempo.t, ins.tempo.o, ins.tempo.h, ft.tempo, (v) => setT({ tempo: v as 0 | 1 | 2 }))}
          {seg('passing', ins.passing.t, ins.passing.o, ins.passing.h, ft.passing, (v) => setT({ passing: v as 0 | 1 | 2 }))}
          <div className="list g-toggles">
            {(['counter', 'waste'] as const).map((k) => (
              <button key={k} className={`cell g-row g-switch${ft[k] ? ' on' : ''}`} role="switch" aria-checked={ft[k]} onClick={() => setT({ [k]: !ft[k] })}>
                <span className="cmain"><b>{ins[k].t}</b><span>{ins[k].h}</span></span>
                <span className="g-knob" aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className="g-subfoot">
            <b className={outId && inId ? '' : 'muted'}>{outId && inId ? t.confirmSub(name(outId), name(inId)) : t.pickSubHint}</b>
            <div className="g-twobtn">
              <button className="btn primary" disabled={!outId || !inId || s.subs >= SUBS_MAX}
                onClick={() => { change((n) => userSub(n, me, outId, inId)); setOutId(''); setInId(''); }}>{t.makeSub}</button>
              <button className="btn ghost" onClick={() => setChanges(false)}>{t.resume}</button>
            </div>
          </div>
        </Sheet>
      )}
    </>
  );
}

function TipRow({ tip, t, name, onApply }: { tip: Tip; t: Strings; name: (id: string) => string; onApply: (tip: Tip) => void }) {
  return (
    <div className="g-tip">
      <div className="g-tip-main">
        <b>{tipWhat(tip.patch, t, name)}</b>
        <span>{tipWhy(tip, t, name)}</span>
        <small className="num">{t.eng.winChance.replace('{w0}', String(Math.round(tip.win[0] * 100))).replace('{w1}', String(Math.round(tip.win[1] * 100)))}</small>
      </div>
      <button className="btn primary sm" onClick={() => onApply(tip)}>{t.eng.apply}</button>
    </div>
  );
}
