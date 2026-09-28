// Live match: clock, commentary, stats and line-ups, with pause, subs, tactic changes and a half-time team talk.
// The parent saves the match state at kick-off, at half-time and after every change, so it resumes after a restart.
import { useEffect, useState } from 'react';
import type { Lang, Strings } from '../i18n';
import type { Career, Player } from '../model/types';
import type { World } from '../sim/world';
import { playerOf } from '../sim/world';
import { FORMATIONS, fmt } from '../sim/tactics';
import { SUBS_MAX, isUserSide, simulate, stepMinute, userSub, type LiveMatch, type Talk } from '../sim/match';
import { Kit } from '../components/Kit';
import { Pitch2D, type Camera } from './Pitch2D';
import { Radar } from './Radar';

const CAM_NAMES = ['2D', '2.5D', '3D'];
import { Sheet } from './parts';
import { shareReport } from './MatchCard';

const clone = (m: LiveMatch): LiveMatch => JSON.parse(JSON.stringify(m));
// Real time per match minute: 1X lets you watch the pitch (about 36 s a match), 4X is the old quick pace.
const SPEEDS = [400, 200, 100];

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
  const [speed, setSpeed] = useState<number>(speed0); // index into SPEEDS
  const [camera, setCamera] = useState<Camera>(camera0);
  const [changes, setChanges] = useState(false);
  const [talk, setTalk] = useState(false);
  const [outId, setOutId] = useState('');
  const [inId, setInId] = useState('');
  const get = (id: string) => playerOf(world, id)!;
  const me = isUserSide(m, career) as 0 | 1;
  const done = m.minute >= 90;
  const club = (i: 0 | 1) => world.clubs.find((c) => c.id === m.sides[i].clubId)!;
  const [h, a] = [club(0), club(1)];

  // Clock: one match minute every 150 ms; stops at half-time for the team talk.
  useEffect(() => {
    if (locked || paused || done || changes || talk) return;
    const id = setTimeout(() => {
      const n = clone(m);
      stepMinute(n, get);
      onUpdate(n);
      if (n.minute === 45) { setTalk(true); onSave(n); }
      else if (n.minute % 15 === 0) onSave(n); // so a restart loses at most a few minutes
    }, SPEEDS[speed]);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, paused, done, changes, talk, locked, speed]);

  const change = (f: (n: LiveMatch) => void) => { const n = clone(m); f(n); onUpdate(n); onSave(n); };
  const name = (id: string) => (id ? get(id).name[lang] : '');

  const lines: { min: number; at: number; text: string; cls: string }[] = [{ min: 0, at: 0, text: t.ev.kickoff, cls: '' }];
  for (const e of m.events) {
    const club = e.side === 0 ? h : a;
    const how = e.how ? ` ${t.ev.how[e.how]}` : '';
    const text = {
      goal: `${t.ev.goal(name(e.playerId), club.name[lang])}${how}${e.assistId ? ` ${t.ev.assist(name(e.assistId))}` : ''}`,
      miss: t.ev.miss(name(e.playerId)), save: t.ev.save(name(e.playerId)), yellow: t.ev.yellow(name(e.playerId)),
      red: t.ev.red(name(e.playerId)), injury: t.ev.injury(name(e.playerId)), sub: t.ev.sub(name(e.playerId), name(e.inId ?? '')),
    }[e.kind];
    lines.push({ min: e.min, at: e.min, text, cls: e.kind === 'goal' ? ' goal' : e.kind === 'red' || e.kind === 'injury' ? ' bad' : e.kind === 'sub' ? ' sub' : '' });
  }
  if (m.minute >= 45) lines.push({ min: 45, at: 45.5, text: t.ev.half, cls: '' });
  if (done) lines.push({ min: 90, at: 90.5, text: t.ev.full, cls: '' });
  if (done && m.kicks) {
    lines.push({ min: 90, at: 90.6, text: `${t.shootout}: ${t.pens(m.pens![0], m.pens![1])}`, cls: ' goal' });
    m.kicks.forEach(([side, id, ok], i) => lines.push({ min: 90, at: 90.7 + i * 0.001, text: `${side === 0 ? h.shortName : a.shortName} · ${t.kick(name(id), ok)}`, cls: ok ? '' : ' bad' }));
  }
  lines.sort((x, y) => y.at - x.at);

  const s = m.sides[me];
  const slots = FORMATIONS[s.tactics.formation].slots;

  return (
    <>
      <section className="g-bug">
        <span className="g-bug-team"><Kit colors={h.colors} size="sm" /><b>{h.shortName}</b></span>
        <span className="g-bug-score num">{m.goals[0]}–{m.goals[1]}</span>
        <span className="g-bug-team"><b>{a.shortName}</b><Kit colors={a.colors} size="sm" /></span>
        <span className={`g-bug-min num${done ? ' ft' : ''}`}>{done ? t.fullTime : m.minute === 45 ? t.halfTime : `${m.minute}′`}{done && m.pens ? ` · ${t.pens(m.pens[0], m.pens[1])}` : ''}</span>
      </section>
      <div className="bar" style={{ margin: 'var(--s3) 0' }}><i style={{ width: `${(m.minute / 90) * 100}%` }} /></div>
      <div className="seg" style={{ marginBottom: 'var(--s3)' }}>
        {[t.pitchT, t.feed, t.statsT, t.lineups].map((l, i) => <button key={l} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>{l}</button>)}
      </div>
      <div className="g-chips g-livechips">
        {!done && !locked && (
          <button className="chip g-toggle g-speed" onClick={() => setSpeed((speed + 1) % SPEEDS.length)} aria-label={t.speed}>{['1X', '2X', '4X'][speed]} ▸</button>
        )}
        {tab === 0 && (
          <button className="chip g-toggle g-cam" aria-label={t.cameraT} onClick={() => { const c = ((camera + 1) % 3) as Camera; setCamera(c); onCamera?.(c); }}>🎥 {CAM_NAMES[camera]}</button>
        )}
      </div>
      {tab === 0 && (
        <>
          <Pitch2D m={m} world={world} goalWord={t.goalWord} camera={camera} msPerMinute={SPEEDS[speed]} running={!paused && !done && !changes && !talk && !locked} />
          <div className="list g-livefeed">
            {lines.slice(0, 6).map((l, i) => (
              <div key={i} className={`cell g-ev${l.cls}`}>
                <span className="g-ev-min num">{l.min}′</span>
                <span className="cmain"><span>{l.text}</span></span>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 1 && (
        <div className="list">
          {lines.map((l, i) => (
            <div key={i} className={`cell g-ev${l.cls}`}>
              <span className="g-ev-min num">{l.min}′</span>
              <span className="cmain"><span>{l.text}</span></span>
            </div>
          ))}
        </div>
      )}
      {tab === 2 && <Radar world={world} m={m} t={t} />}
      {tab === 2 && (
        <div className="list">
          {t.statNames.map((label, k) => {
            const [x, y] = [m.stats[0][k], m.stats[1][k]];
            const share = x + y ? (x / (x + y)) * 100 : 50;
            return (
              <div key={label} className="g-statrow">
                <b className="num">{k === 0 ? `${x}%` : x}</b>
                <span><small>{label}</small><span className="g-split" dir="ltr"><i style={{ width: `${share}%` }} /></span></span>
                <b className="num">{k === 0 ? `${y}%` : y}</b>
              </div>
            );
          })}
        </div>
      )}
      {tab === 3 && (
        <div className="g-lineups">
          {([0, 1] as const).map((i) => (
            <div key={i} className="list">
              <div className="cell g-row"><Kit colors={club(i).colors} size="xs" /><span className="cmain"><b>{club(i).name[lang]}</b><span>{fmt(m.sides[i].tactics.formation)}</span></span></div>
              {m.sides[i].onPitch.map((id, k) => id && (
                <div key={id} className="cell g-row g-lu">
                  <span className="tag">{FORMATIONS[m.sides[i].tactics.formation].slots[k].pos}</span>
                  <span className="cmain"><b>{name(id)}</b></span>
                  <span className="num muted">{Math.round(m.fit[id] ?? 0)}</span>
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
            <button className="btn ghost" onClick={() => { const n = clone(m); n.sides[me].autoSubs = true; simulate(n, get); onUpdate(n); }}>{t.skip}</button>
          </div>
        )}
      </div>

      {talk && (
        <Sheet label={t.halfTimeTalk} onClose={() => setTalk(false)}>
          <h2 className="d3" style={{ margin: 'var(--s4) 0 var(--s3)' }}>{t.halfTimeTalk}</h2>
          <div style={{ display: 'grid', gap: 'var(--s2)' }}>
            {t.talks.map((label, i) => (
              <button key={label} className={`btn${i === 1 ? ' primary' : ''}`} onClick={() => { change((n) => { n.sides[me].talk = i as Talk; }); setTalk(false); }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{label}{t.talkHints[i] && <span className="sub">{t.talkHints[i]}</span>}</span>
              </button>
            ))}
          </div>
          <button className="btn ghost" style={{ width: '100%', marginTop: 'var(--s3)' }} onClick={() => { setTalk(false); setChanges(true); }}>{t.changes}</button>
        </Sheet>
      )}

      {changes && (
        <Sheet label={t.changes} onClose={() => setChanges(false)}>
          <h2 className="d3" style={{ margin: 'var(--s4) 0 var(--s3)' }}>{t.changes}</h2>
          {([[t.mentality, t.mentalities, s.tactics.mentality + 2, (n: LiveMatch, v: number) => { n.sides[me].tactics.mentality = v - 2; }],
            [t.pressing, t.pressings, s.tactics.pressing, (n: LiveMatch, v: number) => { n.sides[me].tactics.pressing = v as 0 | 1 | 2; }]] as const).map(([label, opts, val, set]) => (
            <div key={label}>
              <div className="sechead"><span className="over">{label}</span></div>
              <div className="seg g-seg-wrap">
                {opts.map((o, i) => <button key={o} className={val === i ? 'on' : ''} onClick={() => change((n) => set(n, i))}>{o}</button>)}
              </div>
            </div>
          ))}
          <div className="sechead"><span className="over">{t.subsLeft(SUBS_MAX - s.subs)}</span></div>
          <div className="g-subcols">
            <div>
              <small className="over">{t.subOut}</small>
              <div className="list">
                {s.onPitch.map((id, k) => id && (
                  <button key={id} className={`cell g-lu${outId === id ? ' g-mine' : ''}`} onClick={() => setOutId(id)}>
                    <span className="tag">{slots[k].pos}</span><span className="cmain"><b>{name(id)}</b></span><span className="num muted">{Math.round(m.fit[id] ?? 0)}</span>
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
                    <button key={id} className={`cell g-lu${inId === id ? ' g-mine' : ''}`} onClick={() => setInId(id)}>
                      <span className="tag">{p.position}</span><span className="cmain"><b>{p.name[lang]}</b></span><span className="g-rating num">{p.rating}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 'var(--s2)', marginTop: 'var(--s4)' }}>
            <button className="btn primary" disabled={!outId || !inId || s.subs >= SUBS_MAX}
              onClick={() => { change((n) => userSub(n, me, outId, inId)); setOutId(''); setInId(''); }}>{t.makeSub}</button>
            <button className="btn ghost" onClick={() => setChanges(false)}>{t.resume}</button>
          </div>
        </Sheet>
      )}
    </>
  );
}
