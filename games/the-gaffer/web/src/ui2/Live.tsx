// Matchday under the floodlights: the scoreboard, key moments, where the ball has lived, the numbers, shouts from
// the touchline, and the changes sheet. At half-time the analysts' Why takes over the screen; at full time the
// record goes to the aftermath. Every minute is the engine's (sim/match.ts); nothing here decides anything.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Player } from '../model/types';
import { playerOf } from '../sim/world';
import { FORMATIONS, FORMATION_IDS, fmt, fullTactics, type Tactics } from '../sim/tactics';
import { SUBS_MAX, expected, isUserSide, reshape, reshapeOop, setTactics, setTalk, simulate, stepMinute, userSub, type LiveMatch, type Talk } from '../sim/match';
import { planOf, rolesArrays } from '../sim/engine/phases';
import { ROLES, roleFit, rolesFor, POOR_FIT } from '../sim/engine/roles';
import { TX } from '../lang-tac-all';
import { applyTip, explain, suggest, winChance, type Point, type Tip } from '../sim/engine/story';
import { momentsOf, type KeyMoment } from '../sim/record';
import { Crest, I, LineChart, MiniPitch, Momentum, Portrait, Spark } from './kit';
import { Panel, PanelHead, Sheet, Steps } from './shell';
import { useGame, clubOf, cn, sn, matchLabel } from './game';
import { Pitch2D } from './Pitch2D';
import { pointText, tipWhat, tipWhy } from './why';
import { sfx, soundOn, setSound } from './sfx';

const clone = (m: LiveMatch): LiveMatch => JSON.parse(JSON.stringify(m));
const SPEEDS = [400, 200, 90];
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function LiveScreen({ m, locked, speed0, onUpdate, onSave, onFinish }: {
  m: LiveMatch; locked: boolean; speed0: 0 | 1 | 2; onUpdate: (m: LiveMatch) => void; onSave: (m: LiveMatch) => void; onFinish: (m: LiveMatch) => void;
}) {
  const g = useGame();
  const { w, c, x, lang } = g;
  const get = (id: string) => playerOf(w, id)!;
  const me = Math.max(0, isUserSide(m, c)) as 0 | 1;
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<number>(speed0);
  const [key, setKey] = useState(false);
  const [view, setView] = useState(0);
  const [changes, setChanges] = useState(false);
  const [htSeen, setHtSeen] = useState(m.minute > 45);
  const [flash, setFlash] = useState<{ side: 0 | 1; id: string; n: number } | null>(null);
  const [sound, setSoundState] = useState(soundOn());
  const done = m.minute >= 90;
  const ht = m.minute === 45 && !htSeen;
  const home = clubOf(w, m.sides[0].clubId)!, away = clubOf(w, m.sides[1].clubId)!;
  const name = (id: string) => (id ? sn(get(id) ?? { name: { en: '', ar: '' } }, lang) : '');

  // The clock: one match minute per tick. Stops at half-time for the analysts and at full time.
  useEffect(() => {
    if (locked || paused || done || changes || ht) return;
    const id = setTimeout(() => {
      const n = clone(m);
      stepMinute(n, get);
      onUpdate(n);
      if (n.minute === 45 || n.minute === 90) { onSave(n); if (!reduced()) sfx('whistle'); }
      else if (n.minute % 5 === 0) onSave(n);
    }, key ? 45 : SPEEDS[speed]);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, paused, done, changes, ht, locked, speed, key]);

  // Goals: the flash and the roar.
  const goals = m.goals[0] + m.goals[1];
  const last = useRef(goals);
  useEffect(() => {
    if (goals > last.current && !locked) {
      const ev = [...m.events].reverse().find((e) => e.kind === 'goal');
      if (ev) {
        setFlash({ side: ev.side, id: ev.playerId, n: Date.now() });
        sfx('goal');
        if (key) setKey(false);
        try { navigator.vibrate?.(ev.side === me ? [60, 40, 140] : 40); } catch { /* not supported */ }
      }
    }
    last.current = goals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals]);
  useEffect(() => { if (!flash) return; const id = setTimeout(() => setFlash(null), reduced() ? 1200 : 2200); return () => clearTimeout(id); }, [flash]);

  const change = (f: (n: LiveMatch) => void) => { const n = clone(m); f(n); onUpdate(n); onSave(n); };
  const moments = useMemo(() => momentsOf(m).reverse(), [m.events.length]);
  const tacKey = JSON.stringify(m.sides[me].tactics) + m.sides[me].onPitch.join();
  const tip = useMemo<Tip | null>(() => (m.minute >= 15 && !done ? suggest(m, me, get, 1)[0] ?? null : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.floor(m.minute / 10), tacKey]);
  const scorers = (s: 0 | 1) => m.events.filter((e) => e.kind === 'goal' && e.side === s).map((e) => `${name(e.playerId)} ${e.min}′`).join(', ');
  const xgLine = (s: 0 | 1) => {
    const pts = new Array(Math.max(2, m.minute + 1)).fill(0);
    for (const e of m.events) { const sh = (e.kind === 'save' ? 1 - e.side : e.side); if ((e.kind === 'goal' || e.kind === 'miss' || e.kind === 'save' || e.kind === 'block') && sh === s && e.xg) pts[Math.min(pts.length - 1, e.min)] += e.xg; }
    for (let i = 1; i < pts.length; i++) pts[i] += pts[i - 1];
    return pts.map((v) => Math.round(v * 100) / 100);
  };
  const mom = useMemo(() => {
    const raw = m.tl?.mom ?? [];
    const out: number[] = [];
    for (let i = 0; i < raw.length; i += 3) { const seg = raw.slice(i, i + 3); const v = seg.reduce((a, b) => a + b, 0) / Math.max(1, seg.length) / 60; out.push(Math.max(-1, Math.min(1, me === 0 ? v : -v))); }
    return out;
  }, [m.minute, me]);

  if (ht) return <HalfTime m={m} me={me} onSecondHalf={(n) => { onUpdate(n); onSave(n); setHtSeen(true); }} />;

  const s = m.sides[me];
  const stats = x.live.stats.map((l, k) => [l, m.stats[me][k], m.stats[1 - me][k]] as const);
  const us = me === 0 ? home : away, them = me === 0 ? away : home;
  const shout = (k: string, v: number) => change((n) => setTactics(n, me, { [k]: v } as Partial<Tactics>, 'shout'));
  const ft = fullTactics(s.tactics);
  return (
    <div className="sc-live">
      <header className="topbar on-ground">
        <div className="club">
          <button className="icon-btn" aria-label={x.back} onClick={() => g.go({ s: 'today' })}><I n="back" /></button>
          <div className="grow"><b>{matchLabel(g, m)}</b><small>{done ? x.live.ft : m.minute >= 45 && m.minute < 46 ? x.live.ht : x.live.min(m.minute)}</small></div>
        </div>
        <button className="icon-btn" aria-pressed={sound} aria-label={x.live.sound} onClick={() => { setSound(!sound); setSoundState(!sound); }}><I n={sound ? 'sound' : 'mute'} /></button>
      </header>
      <div className="grid">
        <Panel className={`g-score board-top${flash ? ' goalflash' : ''}`} i={0} label={`${cn(home, lang)} ${m.goals[0]} ${cn(away, lang)} ${m.goals[1]}`}>
          <span className="floodglow" aria-hidden="true" />
          <span className="lights l" aria-hidden="true"><i /><i /><i /><i /></span><span className="lights r" aria-hidden="true"><i /><i /><i /><i /></span>
          <div className="scoreboard">
            <div className="side"><Crest club={home} size={48} /><b>{cn(home, lang)}</b></div>
            <div className="mid"><span className="score ltr" aria-live="polite">{m.goals[0]}–{m.goals[1]}</span>{m.pens && <span className="pens ltr">({m.pens[0]}–{m.pens[1]})</span>}<span className={`clock${done ? ' stop' : ''}`}>{done ? x.live.ft : x.live.min(m.minute)}</span></div>
            <div className="side"><Crest club={away} size={48} /><b>{cn(away, lang)}</b></div>
          </div>
          <div className="scorers"><span>{scorers(0)}</span><span /><span>{scorers(1)}</span></div>
          {flash && <div className={`goalbanner${flash.side === me ? ' mine' : ''}`} role="status"><b>{x.live.goal}</b><span>{name(flash.id)}</span></div>}
        </Panel>

        <Panel className="g-feed" i={1} label={x.live.moments}>
          <PanelHead title={x.live.moments} />
          <div className="feed">
            {moments.length === 0 && <p className="small muted">{x.live.noMoments}</p>}
            {moments.slice(0, 8).map((k) => <MomentRow key={k.ev} k={k} m={m} me={me} name={name} />)}
          </div>
        </Panel>

        <Panel className="g-pitch pitch-card" i={2} label={x.live.where}>
          <span className="eyebrow">{x.live.where} · {x.live.whereSub}</span>
          <div className="chips view-chips">{x.live.views.map((v, i) => <button key={v} className="chip" aria-pressed={view === i} onClick={() => setView(i)}>{v}</button>)}</div>
          {view === 0 ? <div className="pitchwrap"><Pitch2D m={m} world={w} msPerMinute={key ? 45 : SPEEDS[speed]} running={!paused && !done && !changes} goalWord={x.live.goal} /></div>
            : <ZonePitch m={m} me={me} mode={view} />}
          <div className="mom-h"><b>{x.live.momentum}</b><span>{x.live.momentumKey(cn(us, lang), cn(them, lang))}</span></div>
          <Momentum data={mom} rtl={g.rtl} label={x.live.momentum} />
        </Panel>

        <Panel className="g-xg" i={3} label={x.live.xg}>
          <div className="between"><span className="eyebrow">{x.live.xg}</span><div className="legend"><span><i />{cn(us, lang)}</span><span><i className="them" />{cn(them, lang)}</span></div></div>
          <h2 className="h2 ltr-auto">{(m.xg?.[me] ?? 0).toFixed(2)} v {(m.xg?.[1 - me] ?? 0).toFixed(2)}</h2>
          <LineChart h={150} step rtl={g.rtl} x={xgLine(me).map((_, i) => (i % 15 === 0 ? `${i}′` : ''))} fmt={(v) => v.toFixed(1)}
            series={[{ data: xgLine(me), label: cn(us, lang) }, { data: xgLine((1 - me) as 0 | 1), them: true, label: cn(them, lang) }]}
            markers={m.events.filter((e) => e.kind === 'goal').map((e) => ({ i: e.min, label: x.live.goal }))} tipX={(i) => `${i}′`} />
        </Panel>

        <div className="g-side stack">
          <Panel i={4} label={x.live.numbers}>
            <PanelHead title={x.live.numbers} />
            <div className="stats">
              {stats.map(([l, a, b], k) => (
                <div key={l} className="st">
                  <b>{a}{k === 0 ? '%' : ''}</b>
                  <div className="mid"><span>{l}</span><div className="bars" style={{ ['--u' as string]: `${Math.max(1, a)}fr`, ['--t' as string]: `${Math.max(1, b)}fr` }}><i /><i /></div></div>
                  <b>{b}{k === 0 ? '%' : ''}</b>
                </div>
              ))}
            </div>
          </Panel>
          {!done && (
            <Panel i={5} label={x.live.touchline}>
              <PanelHead title={x.live.touchline} right={<span className="eyebrow">{x.live.takes}</span>} />
              <div className="shouts">
                {x.live.shouts.map(([l, k, v]) => {
                  const on = (ft as unknown as Record<string, number>)[k] === v;
                  return <button key={l} aria-pressed={on} onClick={() => shout(k, v)}>{l}</button>;
                })}
              </div>
              {tip && (
                <div className="advice live-tip">
                  <span className="staff" aria-hidden="true">AS</span>
                  <div>
                    <div className="who">{x.live.assistant}</div>
                    <q>{tipWhy(tip, g.t, name)}</q>
                    <button className="btn btn--accent btn--sm" onClick={() => { change((n) => applyTip(n, me, tip, get)); g.toast(x.ht.applied); }}>{tipWhat(tip.patch, g.t, name, tip.note)}</button>
                  </div>
                </div>
              )}
              {c.planB && <button className="btn btn--ghost btn--sm planb" onClick={() => change((n) => { const b = c.planB!; if (b.formation !== n.sides[me].tactics.formation) reshape(n, me, b.formation, get, 'planB'); setTactics(n, me, { ...b }, 'planB'); })}>{x.live.planB}</button>}
            </Panel>
          )}
        </div>
      </div>

      <div className="mbar" role="toolbar" aria-label={x.live.changes}>
        {!done ? (
          <>
            <button className="icon-btn" aria-label={paused ? x.live.play : x.live.pause} onClick={() => setPaused(!paused)}><I n={paused ? 'play' : 'pause'} /></button>
            <div className="seg" role="group" aria-label={x.live.speed}>
              {['1×', '2×', '4×'].map((l, i) => <button key={l} aria-pressed={!key && speed === i} onClick={() => { setKey(false); setSpeed(i); }}>{l}</button>)}
              <button aria-pressed={key} onClick={() => setKey(!key)}>{x.live.key}</button>
            </div>
            <span className="grow" />
            <button className="btn btn--ghost btn--sm skipbtn" onClick={() => { const n = clone(m); n.sides[me].autoSubs = true; simulate(n, get); onUpdate(n); onSave(n); }}>{x.live.skip}</button>
            <button className="btn btn--accent" onClick={() => setChanges(true)}><I n="swap" />{x.live.changes}</button>
          </>
        ) : (
          <>
            <span className="grow" />
            <button className="btn btn--accent" disabled={g.busy} onClick={() => onFinish(m)}>{x.live.ft}<I n="arrowr" size="sm" /></button>
          </>
        )}
      </div>
      {changes && <Changes m={m} me={me} onChange={change} onClose={() => setChanges(false)} />}
    </div>
  );
}

function MomentRow({ k, m, me, name }: { k: KeyMoment; m: LiveMatch; me: 0 | 1; name: (id: string) => string }) {
  const g = useGame();
  const L = g.x.live.ev;
  const e = m.events[k.ev];
  const pn = name(k.playerId);
  const [title, sub, icon, cls] = k.kind === 'goal' ? [L.goal(pn), L.goalSub((k.xg ?? 0).toFixed(2)), 'ball', 'goal']
    : k.kind === 'pen' ? [L.pen(pn), L.chanceSub((k.xg ?? 0).toFixed(2)), 'flag', 'chance']
    : k.kind === 'save' ? [L.save(pn), L.chanceSub((k.xg ?? 0).toFixed(2)), 'alert', 'chance']
    : k.kind === 'chance' ? [L.chance(pn), L.chanceSub((k.xg ?? 0).toFixed(2)), 'alert', 'chance']
    : k.kind === 'red' ? [L.red(pn), L.redSub, 'red', 'red'] : [L.injury(pn), L.injurySub, 'medic', 'inj'];
  void e;
  return (
    <div className={`ev-row ${cls}${k.side === me ? ' ours' : ' theirs'}`}>
      <span className="min">{k.min}′</span>
      <span className="ico"><I n={icon} size="sm" /></span>
      <div><b>{title}</b><p>{sub}</p></div>
    </div>
  );
}

// Where the ball has lived, and where the shots came from: the engine's own 6×5 zones.
function ZonePitch({ m, me, mode }: { m: LiveMatch; me: 0 | 1; mode: number }) {
  const g = useGame();
  const zone = m.tl?.zone ?? [];
  const flip = me === 1;
  const cell = (z: number) => { const col = Math.floor(z / 5), row = z % 5; return flip ? (5 - col) * 5 + (4 - row) : z; };
  const vals = new Array(30).fill(0);
  if (mode === 1) for (let z = 0; z < 30; z++) vals[cell(z)] = (zone[z] ?? 0) + (zone[30 + z] ?? 0);
  else for (const e of m.events) {
    const sh = (e.kind === 'save' ? 1 - e.side : e.side);
    if ((e.kind === 'goal' || e.kind === 'miss' || e.kind === 'save' || e.kind === 'block') && e.z !== undefined && sh === (mode === 2 ? me : 1 - me)) vals[cell(e.z)] += e.xg ?? 0.05;
  }
  const max = Math.max(0.0001, ...vals);
  return (
    <div className="zpitch" aria-label={g.x.live.views[mode]}>
      <div className="zones" style={{ gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'repeat(5, 1fr)', gridAutoFlow: 'column' }}>
        {vals.map((v, i) => { const r = v / max; const lvl = r > 0.75 ? 4 : r > 0.5 ? 3 : r > 0.28 ? 2 : r > 0.1 ? 1 : 0; return <i key={i} style={{ background: mode === 3 && lvl ? `color-mix(in srgb, var(--dv-them) ${lvl * 22}%, transparent)` : `var(--heat-${lvl})` }} />; })}
      </div>
      <svg className="lines" viewBox="0 0 105 68" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="var(--pitch-line)" strokeWidth=".6"><rect x="1" y="1" width="103" height="66" /><line x1="52.5" y1="1" x2="52.5" y2="67" /><circle cx="52.5" cy="34" r="9" /><rect x="1" y="14" width="16" height="40" /><rect x="88" y="14" width="16" height="40" /></g></svg>
      <span className="dir" dir="ltr">{g.x.live.attack(cn(g.club, g.lang))}</span>
    </div>
  );
}

// ---------- the changes sheet ----------
function Changes({ m, me, onChange, onClose }: { m: LiveMatch; me: 0 | 1; onChange: (f: (n: LiveMatch) => void) => void; onClose: () => void }) {
  const g = useGame();
  const { w, x, lang } = g;
  const get = (id: string) => playerOf(w, id)!;
  const [outId, setOut] = useState('');
  const [inId, setIn] = useState('');
  const s = m.sides[me];
  const slots = FORMATIONS[s.tactics.formation].slots;
  const ft = fullTactics(s.tactics);
  const plan = planOf(ft);
  const X = TX[g.ui];
  const T = x.tac;
  const win = Math.round(winChance(m, me, expected(m, get)) * 100);
  const setT = (patch: Partial<Tactics>) => onChange((n) => setTactics(n, me, patch));
  const row = (p: Player, pos: string, on: boolean, sel: boolean, pick: () => void) => (
    <button key={p.id} className={`subrow${sel ? ' on' : ''}`} aria-pressed={sel} onClick={pick}>
      <span className="tag">{pos}</span><span className="grow"><b>{sn(p, lang)}</b><small>{Math.round(m.fit[p.id] ?? p.fitness)}%</small></span><span className="num">{p.rating}</span>
      {on && <I n="check" size="sm" />}
    </button>
  );
  return (
    <Sheet label={x.live.changes} onClose={onClose} wide>
      <div className="between"><h2 className="h2">{x.live.changes}</h2><span className="tag tag--good">{g.x.pre.winChance} {win}%</span></div>
      <div className="section-h"><span className="eyebrow">{x.live.subsLeft(SUBS_MAX - s.subs)}</span></div>
      <div className="subcols">
        <div><span className="eyebrow">{x.live.off}</span>{s.onPitch.map((id, k) => (id ? row(get(id), x.common.pos[slots[k]?.pos ?? 'CM'], false, outId === id, () => setOut(outId === id ? '' : id)) : null))}</div>
        <div><span className="eyebrow">{x.live.on}</span>{s.bench.map((id) => row(get(id), x.common.pos[get(id).position], false, inId === id, () => setIn(inId === id ? '' : id)))}</div>
      </div>
      <div className="subfoot">
        <span className={outId && inId ? '' : 'muted'}>{outId && inId ? x.live.confirm(sn(get(outId), lang), sn(get(inId), lang)) : x.live.pickTwo}</span>
        <button className="btn btn--primary" disabled={!outId || !inId || s.subs >= SUBS_MAX} onClick={() => { onChange((n) => userSub(n, me, outId, inId)); setOut(''); setIn(''); }}>{x.live.makeSub}</button>
      </div>
      <div className="section-h"><span className="eyebrow">{T.shape}</span></div>
      <div className="chips wrap">{FORMATION_IDS.map((f) => <button key={f} className="chip ltr" aria-pressed={ft.formation === f} onClick={() => onChange((n) => reshape(n, me, f, get))}>{fmt(f)}</button>)}</div>
      <div className="ins"><b>{T.ins.mentality[0]}</b><Steps label={T.ins.mentality[0]} value={ft.mentality + 2} options={T.ins.mentality[1]} onChange={(v) => setT({ mentality: v - 2 })} /></div>
      {(['pressing', 'line', 'width', 'tempo', 'passing'] as const).map((k) => {
        const key = k === 'pressing' ? 'press' : k;
        return <div key={k} className="ins"><b>{T.ins[key][0]}</b><Steps label={T.ins[key][0]} value={ft[k]} options={T.ins[key][1]} onChange={(v) => setT({ [k]: v } as Partial<Tactics>)} /></div>;
      })}
      {/* Tactics v3: the shape without the ball, build-up, both transitions, and each player's roles (from the next minute). */}
      <div className="section-h"><span className="eyebrow">{X.shapeOop}</span></div>
      <div className="chips wrap">
        <button className="chip" aria-pressed={ft.oop === ft.formation} onClick={() => onChange((n) => reshapeOop(n, me, n.sides[me].tactics.formation))}>{X.same}</button>
        {FORMATION_IDS.filter((f) => f !== ft.formation).map((f) => <button key={f} className="chip ltr" aria-pressed={ft.oop === f} onClick={() => onChange((n) => reshapeOop(n, me, f))}>{fmt(f)}</button>)}
      </div>
      <div className="ins"><b>{X.ins.build[0]}</b><Steps label={X.ins.build[0]} value={ft.build} options={X.ins.build[1]} onChange={(v) => setT({ build: v as 0 | 1 | 2 })} /></div>
      <div className="ins"><b>{X.ins.counter[0]}</b><Steps label={X.ins.counter[0]} value={ft.counter ? 1 : 0} options={X.ins.counter[1]} onChange={(v) => setT({ counter: v === 1 })} /></div>
      <div className="ins"><b>{X.ins.cpress[0]}</b><Steps label={X.ins.cpress[0]} value={ft.cpress} options={X.ins.cpress[1]} onChange={(v) => setT({ cpress: v as 0 | 1 | 2 })} /></div>
      <div className="section-h"><span className="eyebrow">{X.live.roles}</span><small className="muted">{X.live.rolesSub}</small></div>
      <div className="liveroles">
        {s.onPitch.map((id, k) => {
          if (!id) return null;
          const p = get(id);
          return (
            <div key={id} className="lr">
              <span className="tag">{x.common.pos[plan.slots[k]?.pos ?? 'CM']}</span><b className="grow">{sn(p, lang)}</b>
              {(['ip', 'oop'] as const).map((ph) => {
                const pos = (ph === 'ip' ? plan.slots : plan.oslots)[k]?.pos;
                if (!pos) return null;
                return (
                  <select key={ph} className="sel" aria-label={`${sn(p, lang)} · ${X.phaseLong[ph]}`} value={plan[ph][k]} onChange={(e) => onChange((n) => { const arr = rolesArrays(fullTactics(n.sides[me].tactics)); (ph === 'ip' ? arr.roles : arr.oopRoles)[k] = e.target.value; setTactics(n, me, ph === 'ip' ? { roles: arr.roles } : { oopRoles: arr.oopRoles }); })}>
                    {rolesFor(pos, ph).map((r) => <option key={r} value={r}>{X.roles[r][0]}{ROLES[r].fx.w && roleFit(p, r, pos) <= POOR_FIT ? ' ⚠' : ''}</option>)}
                  </select>
                );
              })}
            </div>
          );
        })}
      </div>
      <button className="btn btn--ghost btn--block" onClick={onClose}>{g.x.close}</button>
    </Sheet>
  );
}

// ---------- half-time ----------
function HalfTime({ m, me, onSecondHalf }: { m: LiveMatch; me: 0 | 1; onSecondHalf: (m: LiveMatch) => void }) {
  const g = useGame();
  const { w, x, lang } = g;
  const get = (id: string) => playerOf(w, id)!;
  const why = useMemo(() => explain(m, me, get), [m.minute]);
  const [picked, setPicked] = useState<number[]>(why.tips.length ? [0] : []);
  const [talk, setTalkOpen] = useState(false);
  const home = clubOf(w, m.sides[0].clubId)!, away = clubOf(w, m.sides[1].clubId)!;
  const name = (id: string) => (id ? sn(get(id), lang) : '');
  // The one sub the numbers point at: our most tired outfielder for the best-rested fit on the bench.
  const s = m.sides[me];
  const slots = FORMATIONS[s.tactics.formation].slots;
  const tired = s.onPitch.map((id, k) => ({ id, k })).filter((o) => o.id && slots[o.k]?.pos !== 'GK').sort((a, b) => (m.fit[a.id] ?? 100) - (m.fit[b.id] ?? 100))[0];
  const subIn = tired && s.subs < SUBS_MAX ? s.bench.map(get).filter((p) => p.position !== 'GK').sort((a, b) => b.rating - a.rating - (a.position === slots[tired.k].pos ? 0 : 0))
    .find((p) => p.position === slots[tired.k].pos) ?? s.bench.map(get).filter((p) => p.position !== 'GK')[0] : undefined;
  const [doSub, setDoSub] = useState(false);
  const plan = (sel: number[], sub: boolean) => {
    const n = clone(m);
    for (const i of sel) applyTip(n, me, why.tips[i], get);
    if (sub && tired && subIn) userSub(n, me, tired.id, subIn.id);
    return n;
  };
  const w0 = Math.round(winChance(m, me, expected(m, get)) * 100);
  const w1 = Math.round(winChance(plan(picked, doSub), me, expected(plan(picked, doSub), get)) * 100);
  const pts = why.points.slice(0, 3);
  const head = x.ht.heads[why.verdict] ?? '';
  return (
    <div className="sc-ht">
      <header className="ht-top on-ground">
        <div className="mini"><Crest club={home} size={30} /><span className="sc ltr">{m.goals[0]}–{m.goals[1]}</span><Crest club={away} size={30} /></div>
        <div><b>{x.live.ht}</b><small className="dimg">{m.events.filter((e) => e.kind === 'goal').map((e) => `${name(e.playerId)} ${e.min}′`).join(' · ')}</small></div>
      </header>
      <div className="grid">
        <Panel className="why" i={1} label={x.ht.eyebrow}>
          <div className="why-h"><span className="eyebrow">{x.ht.eyebrow}</span><h1 className="h1">{head}</h1><p className="muted small">xG <span className="ltr">{why.xg[0].toFixed(1)}–{why.xg[1].toFixed(1)}</span></p></div>
          {pts.map((p, i) => (
            <div key={i} className="cause">
              <span className="n">{i + 1}</span>
              <div><h3>{p.k === 'role' ? TX[g.ui].why.head[p.good ? 0 : 1] : (x.ht.cause[p.k] ?? ['', ''])[p.good ? 0 : 1] || pointText(p, g.t, name)}</h3><p>{pointText(p, g.t, name)}</p></div>
              <div className="ev"><Evidence p={p} m={m} me={me} /></div>
            </div>
          ))}
          {!pts.length && <div className="cause"><span className="n">–</span><div><p>{x.ht.noTips}</p></div></div>}
        </Panel>
        <div className="stack">
          <Panel i={2} label={x.ht.change}>
            <PanelHead title={x.ht.change} right={<span className="eyebrow">{x.ht.tapApply}</span>} />
            {why.tips.length === 0 ? <p className="muted small">{x.ht.noTips}</p> : (
              <div className="fix">
                {why.tips.map((tp, i) => (
                  <button key={i} aria-pressed={picked.includes(i)} onClick={() => setPicked(picked.includes(i) ? picked.filter((k) => k !== i) : [...picked, i])}>
                    <b>{tipWhat(tp.patch, g.t, name, tp.note)}</b><span className="d">{tipWhy(tp, g.t, name)}</span>
                    <span className="fx">+{Math.round((tp.win[1] - tp.win[0]) * 100)}%<small>{x.pre.winChance}</small></span>
                  </button>
                ))}
              </div>
            )}
            <div className="sum"><span>{x.ht.winLine(picked.length + (doSub ? 1 : 0))}</span><b className="ltr">{x.ht.win(w0, w1)}</b></div>
          </Panel>
          {tired && subIn && (
            <Panel i={3} label={x.ht.yourChange}>
              <PanelHead title={x.ht.yourChange} right={<span className="eyebrow">{x.live.subsLeft(SUBS_MAX - s.subs)}</span>} />
              <button className={`sub subbtn${doSub ? ' on' : ''}`} aria-pressed={doSub} onClick={() => setDoSub(!doSub)}>
                <span className="p"><Portrait p={get(tired.id)} club={g.club} size={40} /><span><b>{name(tired.id)}</b><span>{x.live.off} · {Math.round(m.fit[tired.id] ?? 0)}%</span></span></span>
                <span className="arrow"><I n="swap" /></span>
                <span className="p in"><Portrait p={subIn} club={g.club} size={40} /><span><b>{name(subIn.id)}</b><span>{x.live.on}</span></span></span>
              </button>
              <p className="small muted">{x.ht.subWhy(name(tired.id), Math.round(m.fit[tired.id] ?? 0))}</p>
            </Panel>
          )}
        </div>
      </div>
      <div className="mbar" role="toolbar">
        <button className="btn btn--ghost on-ground" onClick={() => setTalkOpen(true)}><I n="chat" />{x.ht.teamTalk}</button>
        <span className="grow" />
        <button className="btn btn--accent" onClick={() => onSecondHalf(plan(picked, doSub))}><I n="whistle" />{x.ht.second}</button>
      </div>
      {talk && (
        <Sheet label={x.ht.teamTalk} onClose={() => setTalkOpen(false)}>
          <h2 className="h2">{x.ht.teamTalk}</h2>
          <div className="talk">
            {x.pre.talks.map(([a, b], i) => (
              <button key={i} className="choice" onClick={() => { const n = clone(m); setTalk(n, me, ([1, 3, 2] as Talk[])[i]); setTalkOpen(false); onSecondHalf(n); }}>
                <div className="grow"><b>{a}</b><span>{b}</span></div>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

function Evidence({ p, m, me }: { p: Point; m: LiveMatch; me: 0 | 1 }) {
  const g = useGame();
  const E = g.x.ht.evid;
  if (p.k === 'duel') return <div className="evid"><span className="duels">{Array.from({ length: Math.min(8, p.of ?? 0) }, (_, i) => <i key={i} className={(i < (p.n ?? 0)) === p.good ? 'w' : ''} />)}</span><span><b>{E.of(p.n ?? 0, p.of ?? 0)}</b></span></div>;
  if (p.k === 'tired') { const f = m.tl?.fit[me] ?? []; return <div className="evid"><Spark data={f.length > 1 ? f : [90, 80]} tone="down" w={140} h={30} rtl={g.rtl} /><span><b>{E.pct(p.n ?? 0)}</b> {E.fit}</span></div>; }
  if (p.k === 'midfield') return <div className="evid"><span><b>{E.pct(p.me ? p.x ?? 0 : p.y ?? 0)}</b> {E.through}</span></div>;
  if (p.k === 'source' || p.k === 'setpiece') {
    const zoneOf: Record<string, number> = { centre: 22, wide: 25, behind: 27, counter: 22, press: 27, setpiece: 27, long: 17, pen: 27 };
    return <div className="evid"><MiniPitch zone={zoneOf[p.theme ?? 'centre'] ?? 22} them={!p.me} /><span><b>{(p.x ?? 0).toFixed(1)}</b> {E.xg} · {E.shots(p.n ?? 0)}</span></div>;
  }
  if (p.k === 'pressed' || p.k === 'pressing') return <div className="evid"><span><b>{p.n}</b> {E.won}</span></div>;
  if (p.k === 'role') return <div className="evid"><span><b>{p.n}</b>{p.x ? <> · <b>{(p.x ?? 0).toFixed(1)}</b> {E.xg}</> : null}</span></div>;
  if (p.k === 'keeper') return <div className="evid"><span><b>{p.n}</b> {E.saves}</span></div>;
  if (p.k === 'finish') return <div className="evid"><span><b>{p.n}</b> / <b>{(p.x ?? 0).toFixed(1)}</b> {E.xg}</span></div>;
  if (p.min !== undefined) return <div className="evid"><span><b>{E.min(p.min)}</b></span></div>;
  return null;
}
