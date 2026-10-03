// The Match tab: the tactics board for the next match (chalk on slate), and the fixtures, table and cups.
import { delegated } from '../sim/delegation';
import { useEffect, useMemo, useState } from 'react';
import type { Player } from '../model/types';
import { playerOf, squadOf } from '../sim/world';
import {
  DEFAULT_TACTICS, FORMATIONS, FORMATION_IDS, PHILOSOPHIES, PRESETS, applyPreset, available, fmt, fullTactics, slotValue, xiFor,
  type FormationId, type Philosophy, type Tactics, type UserTactics,
} from '../sim/tactics';
import { modelOf, predict } from '../sim/match';
import { reslot } from '../sim/engine/story';
import { N, hooksOf, type Model, type Node } from '../sim/engine/model';
import { autoRoles, carryRoles, phaseMap, planOf, restDefence, rolesArrays, warnings, type TeamHooks, type Warn } from '../sim/engine/phases';
import { POOR_FIT, ROLES, roleFit, rolesFor } from '../sim/engine/roles';
import { TX } from '../lang-tac-all';
import { nextUserMatch, leaders, zones } from '../sim/season';
import { groupTable } from '../sim/cups';
import { dateOf, shortDate } from '../sim/calendar';
import { Crest, I, Meter, Portrait } from './kit';
import { Panel, PanelHead, Seg, Steps } from './shell';
import { useGame, clubOf, cn, sn, matchLabel } from './game';
import { leagueRows, upcoming, pctOf } from './util';

export function MatchScreen({ tab, onTab }: { tab: number; onTab: (n: number) => void }) {
  const g = useGame();
  const T = g.x.table;
  return (
    <div className="sc-match sc-tactics">
      <div className="match-tabs on-ground">
        <Seg label={g.x.nav.match} value={tab} onChange={onTab} options={T.tabs.map((l, i) => ({ v: i, label: l }))} onGround />
      </div>
      {tab === 0 && <TacticsBoard />}
      {tab === 1 && <Fixtures />}
      {tab === 2 && <LeagueTable />}
      {tab === 3 && <Cups />}
    </div>
  );
}

// ---------- the board ----------
type Ins = 'pressing' | 'line' | 'width' | 'tempo' | 'passing';
const INS: [Ins, string][] = [['pressing', 'press'], ['line', 'line'], ['width', 'width'], ['tempo', 'tempo'], ['passing', 'passing']];
// Tactics v3 instructions (copy in lang-tac*.ts): build-up, both transitions, the trap and corners.
type Ins3 = 'build' | 'cpress' | 'trap' | 'routine' | 'marking' | 'setMark';
const CHANGE_KEYS = ['formation', 'oop', 'philosophy', 'mentality', 'pressing', 'line', 'width', 'tempo', 'passing', 'build', 'cpress', 'counter', 'trap', 'routine', 'marking', 'setMark', 'mark', 'roles', 'oopRoles'] as const;
type Phase = 'ip' | 'oop';

function TacticsBoard() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const X = TX[g.ui];
  const saved = c.tactics ?? DEFAULT_TACTICS;
  const [draft, setDraft] = useState<UserTactics>(saved);
  const [sel, setSel] = useState<number | null>(null);
  const [benchSel, setBenchSel] = useState<string | null>(null);
  const [ghosts, setGhosts] = useState(true);
  const [focus, setFocus] = useState<string | null>(null);
  const [ph, setPh] = useState<Phase>('ip');
  useEffect(() => { setDraft(c.tactics ?? DEFAULT_TACTICS); }, [c.tactics]);
  const get = (id: string) => playerOf(w, id)!;
  const f = fullTactics(draft);
  const plan = planOf(f);
  const slots = FORMATIONS[draft.formation].slots;
  const base = useMemo(() => xiFor(w, { ...c, tactics: draft }).xi, [w, c, draft]);
  const xi = draft.xi && draft.xi.length === slots.length ? draft.xi.map((id, i) => (id && playerOf(w, id)?.clubId === c.clubId ? id : base[i]?.id ?? '')) : base.map((p) => p.id);
  const inXI = new Set(xi);
  const bench = squadOf(w, c.clubId).filter((p) => !inXI.has(p.id) && available(p)).sort((a, b) => b.rating - a.rating).slice(0, 9);
  const m = useMemo(() => nextUserMatch(w, { ...c, tactics: { ...draft, xi } }), [w, c, draft, xi.join()]);
  const m0 = useMemo(() => nextUserMatch(w, c), [w, c]);
  const odds = (mm: typeof m) => { if (!mm) return 0; const p = predict(mm, get); return mm.sides[0].clubId === c.clubId ? p[0] : p[2]; };
  const win = pctOf(odds(m)), win0 = pctOf(odds(m0)); // F08: never 0 or 100
  const me = m ? (m.sides[0].clubId === c.clubId ? 0 : 1) : 0;
  const opp = m ? m.sides[1 - me] : null;
  const oppClub = opp ? clubOf(w, opp.clubId) : undefined;
  const report = m ? c.scouted?.[m.key] : undefined;
  // The engine's own model of this plan against this opponent: positions, zone numbers, rest defence, hooks.
  const model = useMemo(() => (m ? modelOf(m, get) : null), [m]);
  const acts = model ? model.actors[me] : [];
  const actAt = (k: number) => acts.find((a) => a.slot === k);
  const fs = fullTactics(saved);
  const changes = CHANGE_KEYS.filter((k) => JSON.stringify((f as Record<string, unknown>)[k] ?? null) !== JSON.stringify((fs as Record<string, unknown>)[k] ?? null)).length
    + (JSON.stringify(draft.xi) !== JSON.stringify(saved.xi) ? 1 : 0);
  const setXI = (ids: string[]) => setDraft({ ...draft, xi: ids });
  const tap = (i: number) => {
    if (benchSel) { const ids = [...xi]; ids[i] = benchSel; setXI(ids); setBenchSel(null); setSel(null); setFocus(benchSel); return; }
    if (sel === null) { setSel(i); setFocus(xi[i]); return; }
    if (sel === i) { setSel(null); return; }
    const ids = [...xi]; [ids[sel], ids[i]] = [ids[i], ids[sel]]; setXI(ids); setSel(null);
    g.toast(x.tac.swapped(sn(get(ids[i]), lang), sn(get(ids[sel]), lang)));
  };
  const setShape = (fm: FormationId) => setDraft({ ...draft, formation: fm, xi: draft.xi ? reslot(xi, fm, get) : null, ...(draft.roles || draft.oopRoles ? carryRoles(f, fm) : {}) });
  const setOop = (fm: FormationId | undefined) => setDraft({ ...draft, oop: fm, ...(draft.oopRoles ? { oopRoles: carryRoles(f, f.formation, fm ?? f.formation).oopRoles } : {}) });
  const setStyle = (ph2: Philosophy) => setDraft(applyPreset(draft, ph2));
  const setRole = (phase: Phase, k: number, r: string) => { const arr = rolesArrays(f); const next = phase === 'ip' ? arr.roles : arr.oopRoles; next[k] = r; setDraft({ ...draft, ...arr }); };
  const xiPlayers = xi.map((id) => (id ? playerOf(w, id) ?? null : null));
  const suggestRoles = () => { setDraft({ ...draft, ...autoRoles(xiPlayers, f) }); g.toast(X.suggested); };
  // F01: only an XI the manager actually picked is saved as his; otherwise the assistant keeps picking at kick-off.
  const lock = async () => { const r = await g.run({ type: 'tactics.set', tactics: { ...draft, xi: draft.xi ? xi : null } }, { toast: x.tac.locked }); if (r.ok) setSel(null); };
  const fam = Math.round(c.mastery?.[f.philosophy] ?? (f.philosophy === 'balanced' ? 100 : 30));
  const focusP = focus ? playerOf(w, focus) : xi[0] ? get(xi[0]) : null;
  const focusSlot = focusP ? xi.indexOf(focusP.id) : -1;
  const oppSlots = opp ? FORMATIONS[fullTactics(opp.tactics).oop].slots : [];
  const u = upcoming(w, c, 1)[0];
  const T = x.tac;
  // Rest defence and box presence as the engine counts them (warnings and the preview read the same numbers).
  const rest = acts.length ? restDefence(acts) : undefined;
  const boxN = model ? model.att[me].nodes[N.CRS].duel?.na : undefined;
  const warns = warnings(f, xiPlayers, rest, boxN);
  const hooks = model ? hooksOf(model, me as 0 | 1, draft) : null;
  const trapOn = f.pressing >= 1;
  const markList = opp ? opp.onPitch.filter(Boolean).map((id) => playerOf(w, id)!).filter((p) => p && p.position !== 'GK') : [];
  const insRow = (k: Ins3 | 'counter', v: number, was: number, disabled = false) => {
    const [gain, risk] = X.trade[k][v] ?? ['', ''];
    return (
      <div key={k} className={`ins${disabled ? ' off' : ''}`}>
        <div className="between"><b>{X.ins[k][0]}</b>{v !== was && <span className="tag tag--club">{T.changed}</span>}</div>
        <Steps label={X.ins[k][0]} value={v} options={X.ins[k][1]} was={was} onChange={(nv) => setDraft({ ...draft, [k]: k === 'counter' ? nv === 1 : nv } as UserTactics)} />
        {disabled ? <p className="small muted">{X.trapOff}</p> : <div className="trade"><div className="gain"><b><I n="up" size="sm" />{T.gain}</b><span>{gain}</span></div><div className="risk"><b><I n="alert" size="sm" />{T.risk}</b><span>{risk}</span></div></div>}
      </div>
    );
  };
  const fitIx = (v: number) => (v >= 5 ? 0 : v >= 0 ? 1 : v > POOR_FIT ? 2 : 3);
  const pname = (k: number) => (xi[k] ? sn(get(xi[k]), lang) : '—');
  const warnText = (wn: Warn): string => {
    const W = X.warn;
    if (wn.k === 'fit') return W.fit(pname(wn.slot), X.roles[wn.role][0]);
    if (wn.k === 'rest') return W.rest(wn.n.toFixed(1));
    if (wn.k === 'pressAlone') return W.pressAlone(pname(wn.slot), X.roles[wn.role][0]);
    if (wn.k === 'trapOff') return W.trapOff;
    if (wn.k === 'slowLine') return W.slowLine(pname(wn.slot));
    if (wn.k === 'noBox') return W.noBox;
    return W.outlets(wn.n);
  };
  return (
    <>
      <header className="topbar on-ground">
        <div className="club"><div className="grow"><b>{oppClub ? T.title(cn(oppClub, lang)) : T.titleFree}</b><small>{u ? `${matchLabel(g, { cup: u.cup, round: u.round, group: u.group })} · ${shortDate(u.date, g.ui)}` : ''}</small></div></div>
      </header>
      <div className="t-head on-ground">
        <h1 className="h1"><span className="ltr">{draft.formation}{f.oop !== f.formation ? ` / ${f.oop}` : ''}</span> <span>· {T.styles[f.philosophy]}</span></h1>
        {m && (
          <div className="pred" aria-label={T.forecast}>
            <span className="l">{T.forecast}</span>
            <div className="bar" aria-hidden="true" style={{ gridTemplateColumns: `${Math.max(1, win)}fr ${Math.max(1, 100 - win)}fr` }}><i /><i /></div>
            <span className="v">{win}% {win !== win0 && <small className={win > win0 ? 'up' : 'down'}>{win > win0 ? '+' : ''}{win - win0}</small>}</span>
          </div>
        )}
      </div>

      <div className="grid">
        <section className="c-mid board-wrap on-ground">
          <div className="phase-seg"><Seg label={X.phaseLong[ph]} value={ph} onChange={setPh} onGround options={(['ip', 'oop'] as const).map((p) => ({ v: p, label: X.phase[p] }))} /></div>
          <div className={`board${sel !== null ? ' dragging' : ''} ph-${ph}`} aria-label={T.board} role="group">
            <svg className="chalk" viewBox="0 0 68 100" preserveAspectRatio="none" aria-hidden="true">
              <g fill="none" stroke="rgba(236,250,244,.55)" strokeWidth="1.4" filter="url(#chalk)">
                <rect x="3" y="3" width="62" height="94" rx=".5" /><line x1="3" y1="50" x2="65" y2="50" /><circle cx="34" cy="50" r="9.15" />
                <rect x="13.85" y="3" width="40.3" height="16.5" /><rect x="24.85" y="3" width="18.3" height="5.5" />
                <rect x="13.85" y="80.5" width="40.3" height="16.5" /><rect x="24.85" y="91.5" width="18.3" height="5.5" />
                <path d="M26.7 19.5a9.15 9.15 0 0 0 14.6 0M26.7 80.5a9.15 9.15 0 0 1 14.6 0" />
              </g>
              {/* The engine's lanes and thirds (x 33 / 67, y 30-72 midfield band), drawn faintly. */}
              <g fill="none" stroke="rgba(236,250,244,.16)" strokeWidth=".6" strokeDasharray="1.5 2">
                <line x1="22.4" y1="3" x2="22.4" y2="97" /><line x1="45.6" y1="3" x2="45.6" y2="97" />
                <line x1="3" y1="33.8" x2="65" y2="33.8" /><line x1="3" y1="72.4" x2="65" y2="72.4" />
              </g>
            </svg>
            {ghosts && opp && opp.onPitch.map((id, i) => { const sl = oppSlots[phaseMap(opp.tactics.formation, fullTactics(opp.tactics).oop)[i]] ?? oppSlots[i]; const oa = model?.actors[1 - me].find((a) => a.slot === i); if (!id || !sl) return null; const p = playerOf(w, id);
              // Their players where the engine puts them: their shape without the ball when we have it, and with it when we don't.
              const ox = oa ? (ph === 'ip' ? 100 - oa.ox : 100 - oa.x) : 100 - sl.x, oy = oa ? (ph === 'ip' ? 100 - oa.oy : 100 - oa.y) : 100 - sl.y * 0.46;
              return (
                <div key={`o${id}`} className="tok opp" style={{ left: `${ox}%`, top: `${Math.min(94, Math.max(6, 100 - oy * 0.92))}%` }}><span className="disc">{p?.shirtNumber ?? ''}</span></div>
              ); })}
            {slots.map((sl, i) => {
              const id = xi[i];
              const p = id ? playerOf(w, id) : undefined;
              const fitV = p ? Math.round(slotValue(p, sl.pos)) : 0;
              const a = actAt(i);
              const px = a ? (ph === 'ip' ? a.x : a.ox) : sl.x, py = a ? (ph === 'ip' ? a.y : a.oy) : sl.y;
              const role = plan[ph][i];
              const bad = p && role && ROLES[role].fx.w && roleFit(p, role, (ph === 'ip' ? plan.slots : plan.oslots)[i].pos) <= POOR_FIT;
              return (
                <button key={i} className={`tok${sel === i ? ' lift' : ''}${focus === id ? ' focus' : ''}`} style={{ left: `${px}%`, top: `${Math.min(92, 100 - py * 0.92)}%` }}
                  onClick={() => tap(i)} aria-pressed={sel === i} aria-label={`${x.common.posLong[sl.pos]}: ${p ? p.name[lang] : '—'} · ${role ? X.roles[role][0] : ''}`}>
                  <span className="disc">{p?.shirtNumber ?? '?'}{p && <span className={`fit${fitV < p.rating - 4 ? ' warn' : ''}`}>{fitV}</span>}</span>
                  <span className="nm">{p ? sn(p, lang) : '—'}</span>
                  <span className={`rl${bad ? ' bad' : ''}`}>{role ? X.roles[role][1] : x.common.pos[sl.pos]}</span>
                </button>
              );
            })}
          </div>
          <div className="board-tools">
            <label className="toggle"><input type="checkbox" checked={ghosts} onChange={(e) => setGhosts(e.target.checked)} /><span className="sw" aria-hidden="true" /><span>{oppClub ? T.theirPress(cn(oppClub, lang)) : ''}</span></label>
            <span className="hint"><I n="drag" size="sm" />{T.hint}</span>
          </div>
          {model && <EnginePreview model={model} me={me as 0 | 1} ph={ph} rest={rest ?? 0} hooks={hooks} />}
          <div className="section-h"><span className="eyebrow">{T.bench}</span></div>
          <div className="bench">
            {bench.map((p) => (
              <button key={p.id} className={`b${benchSel === p.id ? ' on' : ''}`} aria-pressed={benchSel === p.id} onClick={() => { setBenchSel(benchSel === p.id ? null : p.id); setFocus(p.id); }}>
                <span className="disc">{p.shirtNumber}</span><span>{sn(p, lang)}</span>
              </button>
            ))}
          </div>
          {/* F06: why a man plays out of position: his value there against the best natural player not in the XI. */}
          {(() => {
            const notes = xi.map((id, i) => ({ p: id ? playerOf(w, id) : undefined, pos: slots[i]?.pos })).filter((o) => o.p && o.pos && o.p.position !== o.pos).slice(0, 3).map(({ p, pos }) => {
              const alt = squadOf(w, c.clubId).filter((q) => q.position === pos && !inXI.has(q.id) && available(q)).sort((a, b) => slotValue(b, pos!) - slotValue(a, pos!))[0];
              return <li key={p!.id}>{alt ? T.outPos(sn(p!, lang), x.common.posLong[pos!], Math.round(slotValue(p!, pos!)), sn(alt, lang), Math.round(slotValue(alt, pos!))) : T.outPosNone(sn(p!, lang), x.common.posLong[pos!], Math.round(slotValue(p!, pos!)))}</li>;
            });
            return notes.length ? <ul className="xi-notes small on-ground">{notes}</ul> : null;
          })()}
          {/* F01: whose XI this is, said where the XI is picked. */}
          <div className="xi-owner small on-ground">
            <span>{saved.xi ? T.xiMine : delegated(c, 'lineup') ? T.xiStaff : T.xiAuto}</span>
            {saved.xi && <button className="btn btn--ghost on-ground btn--sm" onClick={() => void g.run({ type: 'tactics.set', tactics: { ...saved, xi: null } })}>{T.xiHand}</button>}
          </div>
          <div className="save">
            <button className="btn btn--ghost on-ground btn--sm" disabled={!changes} onClick={() => setDraft(saved)}>{T.undo}</button>
            <button className="btn btn--ghost on-ground btn--sm" onClick={() => setDraft({ ...draft, xi: null })}>{T.reset}</button>
            <button className="btn btn--accent" disabled={!changes} onClick={() => void lock()}><I n="check" />{T.lock}</button>
          </div>
        </section>

        <section className="c-left stack">
          <Panel i={1} label={T.how}>
            <PanelHead title={T.how} right={<span className="eyebrow">{T.changes(changes)}</span>} />
            <div className="ins">
              <div className="between"><b>{T.style}</b>{f.philosophy !== (saved.philosophy ?? 'balanced') && <span className="tag tag--club">{T.changed}</span>}</div>
              <div className="chips wrap">{PHILOSOPHIES.map((p) => <button key={p} className="chip" aria-pressed={f.philosophy === p} onClick={() => setStyle(p)}>{T.styles[p]}</button>)}</div>
              <div className="fam"><span className="small muted">{T.familiar} · {T.familiarSub(fam)}</span><Meter v={fam} tone={fam < 50 ? 'warn' : undefined} /></div>
            </div>
            <div className="ins">
              <div className="between"><b>{X.shapeIp}</b>{draft.formation !== saved.formation && <span className="tag tag--club">{T.changed}</span>}</div>
              <div className="chips wrap">{FORMATION_IDS.map((fm) => <button key={fm} className="chip ltr" aria-pressed={draft.formation === fm} onClick={() => setShape(fm)}>{fmt(fm)}</button>)}</div>
            </div>
            <div className="ins">
              <div className="between"><b>{X.shapeOop}</b>{f.oop !== fs.oop && <span className="tag tag--club">{T.changed}</span>}</div>
              <div className="chips wrap">
                <button className="chip" aria-pressed={f.oop === f.formation} onClick={() => setOop(undefined)}>{X.same}</button>
                {FORMATION_IDS.filter((fm) => fm !== f.formation).map((fm) => <button key={fm} className="chip ltr" aria-pressed={f.oop === fm} onClick={() => { setOop(fm); setPh('oop'); }}>{fmt(fm)}</button>)}
              </div>
            </div>
            <div className="ins">
              <div className="between"><b>{T.ins.mentality[0]}</b>{f.mentality !== fs.mentality && <span className="tag tag--club">{T.changed}</span>}</div>
              <Steps label={T.ins.mentality[0]} value={f.mentality + 2} options={T.ins.mentality[1]} was={fs.mentality + 2} onChange={(v) => setDraft({ ...draft, mentality: v - 2 })} />
            </div>
            {INS.map(([k, key]) => {
              const v = f[k] as number;
              const was = (fs as unknown as Record<string, number>)[k];
              const [gain, risk] = T.trade[key][v];
              return (
                <div key={k} className="ins">
                  <div className="between"><b>{T.ins[key][0]}</b>{v !== was && <span className="tag tag--club">{T.changed}</span>}</div>
                  <Steps label={T.ins[key][0]} value={v} options={T.ins[key][1]} was={was} onChange={(nv) => setDraft({ ...draft, [k]: nv } as UserTactics)} />
                  <div className="trade"><div className="gain"><b><I n="up" size="sm" />{T.gain}</b><span>{gain}</span></div><div className="risk"><b><I n="alert" size="sm" />{T.risk}</b><span>{risk}</span></div></div>
                </div>
              );
            })}
            {insRow('build', f.build, fs.build)}
            {insRow('counter', f.counter ? 1 : 0, fs.counter ? 1 : 0)}
            {insRow('cpress', f.cpress, fs.cpress)}
            {insRow('trap', trapOn ? f.trap : 0, fs.trap, !trapOn)}
            {insRow('routine', f.routine, fs.routine)}
            {insRow('marking', f.marking, fs.marking)}
            {insRow('setMark', f.setMark, fs.setMark)}
            {markList.length > 0 && (
              <div className="ins">
                <div className="between"><b>{X.mark}</b>{(f.mark ?? null) !== (fs.mark ?? null) && <span className="tag tag--club">{T.changed}</span>}</div>
                <select className="sel" value={f.mark ?? ''} aria-label={X.mark} onChange={(e) => setDraft({ ...draft, mark: e.target.value || null })}>
                  <option value="">{X.markNone}</option>
                  {markList.map((p) => <option key={p.id} value={p.id}>{sn(p, lang)} · {x.common.pos[p.position]} · {p.rating}</option>)}
                </select>
                <p className="small muted">{X.markHint}</p>
              </div>
            )}
          </Panel>
        </section>

        <section className="c-right stack">
          <Panel i={2} label={X.warn.title} className="warns">
            <PanelHead title={X.warn.title} right={<button className="btn btn--ghost btn--sm" onClick={suggestRoles}>{X.suggest}</button>} />
            {warns.length ? warns.map((wn, i) => <p key={i} className="warn-row"><I n="alert" size="sm" /><span>{warnText(wn)}</span></p>) : <p className="small muted">{X.warn.none}</p>}
          </Panel>
          {focusP && (
            <Panel i={3} label={focusP.name[lang]}>
              <div className="role-h">
                <Portrait p={focusP} club={g.club} size={52} />
                <div className="grow"><span className="eyebrow">{T.role(focusSlot >= 0 ? x.common.posLong[slots[focusSlot].pos] : x.common.posLong[focusP.position])}{focusSlot >= 0 && plan.oslots[focusSlot].pos !== slots[focusSlot].pos ? ` / ${x.common.posLong[plan.oslots[focusSlot].pos]}` : ''}</span><h2 className="h2">{focusP.name[lang]}</h2></div>
              </div>
              {focusSlot >= 0 && (['ip', 'oop'] as const).map((phase) => {
                const pos = (phase === 'ip' ? plan.slots : plan.oslots)[focusSlot].pos;
                const cur = plan[phase][focusSlot];
                return (
                  <div key={phase} className="roles rolepick">
                    <span className="eyebrow">{X.roleFor(X.phaseLong[phase])}</span>
                    {rolesFor(pos, phase).map((r) => {
                      const fitV = ROLES[r].fx.w ? roleFit(focusP, r, pos) : null;
                      return (
                        <button key={r} className={`role${cur === r ? ' on' : ''}`} aria-pressed={cur === r} onClick={() => { setRole(phase, focusSlot, r); setPh(phase); }}>
                          <b>{X.roles[r][0]}</b>
                          {fitV !== null ? <span className={`fitl f${fitIx(fitV)}`}>{X.fit[fitIx(fitV)]}</span> : <span />}
                          <p>{X.roles[r][2]}</p>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              <div className="roles">
                <span className="eyebrow">{T.fitFor}</span>
                {topFits(focusP).map((r) => (
                  <div key={r.pos} className={`role${focusSlot >= 0 && slots[focusSlot].pos === r.pos ? ' on' : ''}`}>
                    <b>{x.common.posLong[r.pos]}</b><span className="fitv num" style={r.v < focusP.rating - 6 ? { color: 'var(--warn)' } : undefined}>{r.v}</span>
                    <p>{T.outOfPos(r.v)}</p>
                  </div>
                ))}
              </div>
              <button className="link-btn" onClick={() => g.player(focusP.id)}>{x.dec.open} <I n="chev" size="sm" /></button>
            </Panel>
          )}
          {opp && oppClub && (
            <Panel i={4} label={T.oppHow(cn(oppClub, lang))}>
              <div className="opp-top">
                <Crest club={oppClub} size={44} />
                <div className="grow"><span className="eyebrow ltr-auto">{T.opp(opp.tactics.formation, T.styles[opp.tactics.philosophy ?? 'balanced'])}</span><h2 className="h2">{T.oppHow(cn(oppClub, lang))}</h2></div>
              </div>
              {w.managers?.[oppClub.id] && <p className="small muted">{T.oppManager(w.managers[oppClub.id].name[lang])} · {T.styles[w.managers[oppClub.id].style]}</p>}
              {report ? (
                <>
                  {report.threats.slice(0, 2).map((th) => { const p = playerOf(w, th.id); if (!p) return null; return (
                    <div key={th.id} className="threat"><Portrait p={p} club={oppClub} size={44} /><div><b>{sn(p, lang)} · {T.danger}</b><p>{x.player.attrs[th.attr]}</p></div></div>
                  ); })}
                  {report.weak.slice(0, 1).map((wk) => { const p = playerOf(w, wk.id); if (!p) return null; return (
                    <div key={wk.id} className="threat"><Portrait p={p} club={oppClub} size={44} /><div><b>{sn(p, lang)}</b><p>{x.pre.weakWhy[wk.why]}</p></div></div>
                  ); })}
                  <div className="counter">
                    <span className="small muted">{x.pre.counter}: <b>{T.styles[report.plan.philosophy]}</b></span>
                    <button className="btn btn--ghost btn--sm" disabled={f.philosophy === report.plan.philosophy} onClick={() => setDraft({ ...applyPreset(draft, report.plan.philosophy), pressing: report.plan.pressing, trap: report.plan.trap })}>{f.philosophy === report.plan.philosophy ? x.pre.using : x.pre.apply}</button>
                  </div>
                </>
              ) : (
                <div className="noreport"><p className="small muted">{T.noReport}</p><button className="btn btn--ghost btn--sm" onClick={() => void g.run({ type: 'report.make' }, { toast: x.note.done })}><I n="eye" size="sm" />{x.fixture.getReport}</button></div>
              )}
            </Panel>
          )}
          <PlanB draft={draft} />
        </section>
      </div>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="chalk" x="-5%" y="-5%" width="110%" height="110%" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="2.4" numOctaves="2" seed="3" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale=".45" result="d" /><feTurbulence type="fractalNoise" baseFrequency="6" numOctaves="1" seed="9" result="g" /><feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.7" result="m" /><feComposite in="d" in2="m" operator="in" /></filter>
      </svg>
    </>
  );
}

// The engine's own numbers for this plan: players in each zone (ours v theirs), the same weights its contests use
// (numerical superiority), from model.ts. With the ball: our attack's zones. Without it: their attack's zones, seen
// from our side (their left lane is our right).
function EnginePreview({ model, me, ph, rest, hooks }: { model: Model; me: 0 | 1; ph: Phase; rest: number; hooks: TeamHooks | null }) {
  const g = useGame();
  const X = TX[g.ui];
  const Z = X.preview.zones;
  const ours = model.att[me].nodes, theirs = model.att[1 - me].nodes;
  const cell = (n: Node | undefined, oop: boolean) => { const d = n?.duel; if (!d) return null; const a = oop ? d.nd : d.na, b = oop ? d.na : d.nd; return { a, b }; };
  const rows: [string, ({ a: number; b: number } | null)[]][] = ph === 'ip'
    ? [[Z.box, [null, cell(ours[N.CRS], false), null]], [Z.final, [cell(ours[N.F0], false), cell(ours[N.F1], false), cell(ours[N.F2], false)]], [Z.mid, [cell(ours[N.P0], false), cell(ours[N.P1], false), cell(ours[N.P2], false)]], [Z.build, [null, cell(ours[N.B], false), null]]]
    : [[Z.press, [null, cell(theirs[N.B], true), null]], [Z.screen, [cell(theirs[N.P2], true), cell(theirs[N.P1], true), cell(theirs[N.P0], true)]], [Z.defend, [cell(theirs[N.F2], true), cell(theirs[N.F1], true), cell(theirs[N.F0], true)]], [Z.box, [null, cell(theirs[N.CRS], true), null]]];
  const lanes = g.x.tac.lanes as unknown as string[];
  return (
    <div className="zprev" aria-label={X.preview.title}>
      <div className="between"><span className="eyebrow">{X.preview.title} · {X.phaseLong[ph]}</span></div>
      <p className="small dimg">{X.preview.sub}</p>
      <div className="zgrid" role="table">
        <div className="zr zh" role="row"><span role="columnheader" />{lanes.map((l) => <span key={l} role="columnheader">{l}</span>)}</div>
        {rows.map(([label, cs]) => (
          <div key={label} className="zr" role="row">
            <b role="rowheader">{label}</b>
            {cs.map((cc, i) => <span key={i} role="cell" className={cc ? (cc.a - cc.b > 0.4 ? 'up' : cc.b - cc.a > 0.4 ? 'down' : 'even') : 'na'}>{cc ? <><i className="num">{cc.a.toFixed(1)}</i><small> v {cc.b.toFixed(1)}</small></> : ''}</span>)}
          </div>
        ))}
      </div>
      <div className="zfacts small">
        {ph === 'ip' ? <><span>{X.preview.rest(rest.toFixed(1))}</span><span>{X.preview.box((ours[N.CRS].duel?.na ?? 0).toFixed(1))}</span></>
          : <><span>{X.preview.press((hooks?.pressIntensity.oop ?? 0).toFixed(1))}</span><span>{X.preview.line(hooks?.lineHeight.oop ?? 0)}</span></>}
      </div>
    </div>
  );
}

function topFits(p: Player) {
  const all = (['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'] as const).map((pos) => ({ pos, v: Math.round(slotValue({ ...p, fitness: 100, morale: 60 }, pos)) }));
  return all.sort((a, b) => b.v - a.v).slice(0, 3);
}

function PlanB({ draft }: { draft: Tactics }) {
  const g = useGame();
  const T = g.x.tac;
  const b = g.c.planB;
  return (
    <Panel i={4} label={T.planB}>
      <PanelHead title={T.planB} right={b ? <span className="eyebrow ltr">{b.formation}</span> : undefined} />
      {b ? <p className="small">{fmt(b.formation)} · {T.styles[b.philosophy ?? 'balanced']} · {T.ins.press[1][b.pressing]}</p> : <p className="small muted">{T.planBNone}</p>}
      <div className="p-more">
        <button className="btn btn--ghost btn--sm" onClick={() => void g.run({ type: 'planB.set', tactics: draft }, { toast: g.x.saved })}>{T.planBSet}</button>
        {b && <button className="btn btn--ghost btn--sm" onClick={() => void g.run({ type: 'planB.set', tactics: null }, { toast: g.x.saved })}>{T.planBClear}</button>}
      </div>
    </Panel>
  );
}

// ---------- fixtures, table, cups ----------
function Fixtures() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const lid = g.league.id;
  const rows: { round: number; home: string; away: string; hg: number; ag: number; cup?: string; group?: boolean; date: Date }[] = [];
  (c.fixtures[lid] ?? []).forEach((r, i) => { const f = r.find((y) => y[0] === c.clubId || y[1] === c.clubId); if (f) rows.push({ round: i, home: f[0], away: f[1], hg: f[2], ag: f[3], date: dateOf(c.season, i) }); });
  for (const cup of Object.values(c.cups)) {
    cup.ties.forEach((ties, k) => ties.forEach((t) => { if ((t[0] === c.clubId || t[1] === c.clubId) && t[1]) rows.push({ round: cup.days[k], home: t[0], away: t[1], hg: t[2], ag: t[3], cup: cup.id, date: dateOf(c.season, cup.days[k], true) }); }));
    cup.groups?.games.forEach((day, k) => day.forEach((t) => { if (t[0] === c.clubId || t[1] === c.clubId) rows.push({ round: cup.groups!.days[k], home: t[0], away: t[1], hg: t[2], ag: t[3], cup: cup.id, group: true, date: dateOf(c.season, cup.groups!.days[k], true) }); }));
  }
  rows.sort((a, b) => a.date.getTime() - b.date.getTime());
  const nextI = rows.findIndex((r) => r.hg < 0);
  return (
    <Panel i={1} className="fixtures" label={x.table.tabs[1]}>
      <div className="rows">
        {rows.map((r, i) => {
          const home = r.home === c.clubId;
          const o = clubOf(w, home ? r.away : r.home);
          const played = r.hg >= 0;
          const [gf, ga] = home ? [r.hg, r.ag] : [r.ag, r.hg];
          const res = !played ? null : gf > ga ? 0 : gf === ga ? 1 : 2;
          return (
            <div key={i} className={`row fx-row${i === nextI ? ' next' : ''}`}>
              <span className="fx-date"><b>{shortDate(r.date, g.ui)}</b><small>{r.cup ? c.cups[r.cup]?.name[lang] : x.common.matchday(r.round + 1)}</small></span>
              <Crest club={o} size={28} />
              <span className="grow"><span className="name">{cn(o, lang)}</span><span className="sub">{home ? x.today.home : x.today.away}</span></span>
              {played ? <span className={`res r${res}`}><b className="ltr">{gf}–{ga}</b><em>{x.wdl[res!]}</em></span> : i === nextI ? <span className="tag tag--good">{x.table.upcoming}</span> : null}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function LeagueTable() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const rows = leagueRows(w, c);
  const z = zones(w, g.league.id);
  const top = leaders(w, c, g.league.id, 1, 8);
  const T = x.table;
  return (
    <div className="table-grid">
      <Panel i={1} label={g.league.name[lang]}>
        <PanelHead title={g.league.name[lang]} right={<span className="eyebrow">{x.today.after(rows[0]?.p ?? 0)}</span>} />
        <div className="tblwrap">
          <table className="ltable">
            <thead><tr><th>{T.pos}</th><th className="cl">{T.club}</th><th>{T.p}</th><th>{T.w}</th><th>{T.d}</th><th>{T.l}</th><th>{T.gd}</th><th>{T.pts}</th></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const cl = clubOf(w, r.clubId);
                const zone = i < (z.top || 0) ? 'z-top' : z.up && i < z.up ? 'z-up' : z.down && i >= rows.length - z.down ? 'z-down' : '';
                return (
                  <tr key={r.clubId} className={`${r.clubId === c.clubId ? 'me' : ''} ${zone}`}>
                    <td className="pos">{i + 1}</td>
                    <td className="cl"><span className="cl-in"><Crest club={cl} size={20} /><span className="cl-n">{cn(cl, lang)}</span></span></td>
                    <td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td className="ltr">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td><td className="pts">{r.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="depth-key">{z.top ? <span><i className="k-top" />{T.zones.top}</span> : null}{z.up ? <span><i className="k-up" />{T.zones.up}</span> : null}{z.down ? <span><i className="k-down" />{T.zones.down}</span> : null}</div>
      </Panel>
      <Panel i={2} label={T.scorers}>
        <PanelHead title={T.scorers} />
        <div className="rows">
          {top.map(({ player, value }, i) => (
            <button key={player.id} className="row linkrow" onClick={() => g.player(player.id)}>
              <span className="pos-n">{i + 1}</span><Portrait p={player} club={clubOf(w, player.clubId)} size={34} />
              <span className="grow"><span className="name">{player.name[lang]}</span><span className="sub">{cn(clubOf(w, player.clubId), lang)}</span></span>
              <b className="num">{value}</b>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Cups() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const mine = Object.values(c.cups).filter((cup) => cup.ties.some((r) => r.some((t) => t[0] === c.clubId || t[1] === c.clubId)) || cup.groups?.clubs.some((gr) => gr.includes(c.clubId)));
  if (!mine.length) return <Panel i={1}><p className="muted">{x.table.noCups}</p></Panel>;
  return (
    <div className="stack">
      {mine.map((cup, ci) => {
        const g0 = cup.groups?.clubs.findIndex((gr) => gr.includes(c.clubId)) ?? -1;
        const lastK = cup.ties.reduce((k, r, i) => (r.some((t) => t[2] >= 0 || t[1] === '') ? i : k), -1);
        const showK = Math.min(cup.ties.length - 1, Math.max(0, lastK + (cup.ties[lastK]?.every((t) => t[6]) ? 1 : 0)));
        return (
          <Panel key={cup.id} i={ci + 1} label={cup.name[lang]}>
            <PanelHead title={cup.name[lang]} right={<span className="eyebrow">{cup.days.length ? g.t.roundName(showK, cup.days.length) : ''}</span>} />
            {g0 >= 0 && cup.groups && (
              <>
                <span className="eyebrow">{x.table.group(String.fromCharCode(65 + g0))}</span>
                <table className="tbl small-tbl"><tbody>
                  {groupTable(cup.groups, g0).map((r, i) => { const cl = clubOf(w, r.clubId); return (
                    <tr key={r.clubId} className={r.clubId === c.clubId ? 'me' : ''}><td className="pos">{i + 1}</td><td><span className="cl"><Crest club={cl} size={20} /><span className="cl-n">{cn(cl, lang)}</span></span></td><td className="gd">{r.p}</td><td className="pts">{r.pts}</td></tr>
                  ); })}
                </tbody></table>
              </>
            )}
            <div className="rows ties">
              {(cup.ties[showK] ?? []).filter((t) => t[1]).slice(0, 12).map((t, i) => {
                const a = clubOf(w, t[0]), b = clubOf(w, t[1]);
                const me = t[0] === c.clubId || t[1] === c.clubId;
                return (
                  <div key={i} className={`row tie${me ? ' me' : ''}`}>
                    <Crest club={a} size={20} /><span className="grow name">{cn(a, lang)}</span>
                    <b className="ltr num">{t[2] >= 0 ? `${t[2]}–${t[3]}${t[4] >= 0 ? ` (${t[4]}–${t[5]})` : ''}` : 'v'}</b>
                    <span className="grow name end">{cn(b, lang)}</span><Crest club={b} size={20} />
                  </div>
                );
              })}
              {!(cup.ties[showK] ?? []).length && <p className="small muted">{x.table.tbd}</p>}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
void PRESETS;
