// The Match tab: the tactics board for the next match (chalk on slate), and the fixtures, table and cups.
import { useEffect, useMemo, useState } from 'react';
import type { Player } from '../model/types';
import { playerOf, squadOf } from '../sim/world';
import {
  DEFAULT_TACTICS, FORMATIONS, FORMATION_IDS, PHILOSOPHIES, PRESETS, applyPreset, available, fmt, fullTactics, slotValue, xiFor,
  type FormationId, type Philosophy, type Tactics, type UserTactics,
} from '../sim/tactics';
import { predict } from '../sim/match';
import { reslot } from '../sim/engine/story';
import { nextUserMatch, leaders, zones } from '../sim/season';
import { groupTable } from '../sim/cups';
import { dateOf, shortDate } from '../sim/calendar';
import { Crest, I, Meter, Portrait } from './kit';
import { Panel, PanelHead, Seg, Steps } from './shell';
import { useGame, clubOf, cn, sn, matchLabel } from './game';
import { leagueRows, upcoming } from './util';

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

function TacticsBoard() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const saved = c.tactics ?? DEFAULT_TACTICS;
  const [draft, setDraft] = useState<UserTactics>(saved);
  const [sel, setSel] = useState<number | null>(null);
  const [benchSel, setBenchSel] = useState<string | null>(null);
  const [ghosts, setGhosts] = useState(true);
  const [focus, setFocus] = useState<string | null>(null);
  useEffect(() => { setDraft(c.tactics ?? DEFAULT_TACTICS); }, [c.tactics]);
  const get = (id: string) => playerOf(w, id)!;
  const f = fullTactics(draft);
  const slots = FORMATIONS[draft.formation].slots;
  const base = useMemo(() => xiFor(w, { ...c, tactics: draft }).xi, [w, c, draft]);
  const xi = draft.xi && draft.xi.length === slots.length ? draft.xi.map((id, i) => (id && playerOf(w, id)?.clubId === c.clubId ? id : base[i]?.id ?? '')) : base.map((p) => p.id);
  const inXI = new Set(xi);
  const bench = squadOf(w, c.clubId).filter((p) => !inXI.has(p.id) && available(p)).sort((a, b) => b.rating - a.rating).slice(0, 9);
  const m = useMemo(() => nextUserMatch(w, { ...c, tactics: { ...draft, xi } }), [w, c, draft, xi.join()]);
  const m0 = useMemo(() => nextUserMatch(w, c), [w, c]);
  const odds = (mm: typeof m) => { if (!mm) return 0; const p = predict(mm, get); return mm.sides[0].clubId === c.clubId ? p[0] : p[2]; };
  const win = Math.round(odds(m) * 100), win0 = Math.round(odds(m0) * 100);
  const me = m ? (m.sides[0].clubId === c.clubId ? 0 : 1) : 0;
  const opp = m ? m.sides[1 - me] : null;
  const oppClub = opp ? clubOf(w, opp.clubId) : undefined;
  const report = m ? c.scouted?.[m.key] : undefined;
  const changes = (['formation', 'philosophy', 'mentality', ...INS.map((i) => i[0])] as const).filter((k) => (fullTactics(draft) as Record<string, unknown>)[k] !== (fullTactics(saved) as Record<string, unknown>)[k]).length
    + (JSON.stringify(draft.xi) !== JSON.stringify(saved.xi) ? 1 : 0);
  const setXI = (ids: string[]) => setDraft({ ...draft, xi: ids });
  const tap = (i: number) => {
    if (benchSel) { const ids = [...xi]; ids[i] = benchSel; setXI(ids); setBenchSel(null); setSel(null); setFocus(benchSel); return; }
    if (sel === null) { setSel(i); setFocus(xi[i]); return; }
    if (sel === i) { setSel(null); return; }
    const ids = [...xi]; [ids[sel], ids[i]] = [ids[i], ids[sel]]; setXI(ids); setSel(null);
    g.toast(x.tac.swapped(sn(get(ids[i]), lang), sn(get(ids[sel]), lang)));
  };
  const setShape = (fm: FormationId) => setDraft({ ...draft, formation: fm, xi: reslot(xi, fm, get) });
  const setStyle = (ph: Philosophy) => setDraft(applyPreset(draft, ph));
  const lock = async () => { const r = await g.run({ type: 'tactics.set', tactics: { ...draft, xi } }, { toast: x.tac.locked }); if (r.ok) setSel(null); };
  const fam = Math.round(c.mastery?.[f.philosophy] ?? (f.philosophy === 'balanced' ? 100 : 30));
  const focusP = focus ? playerOf(w, focus) : xi[0] ? get(xi[0]) : null;
  const focusSlot = focusP ? xi.indexOf(focusP.id) : -1;
  // The plan, in chalk: arrows and rings drawn from the instructions themselves.
  const chalk = chalkFor(f);
  const oppSlots = opp ? FORMATIONS[opp.tactics.formation].slots : [];
  const u = upcoming(w, c, 1)[0];
  const T = x.tac;
  const [press, line] = [f.pressing, f.line];
  void press; void line;
  return (
    <>
      <header className="topbar on-ground">
        <div className="club"><div className="grow"><b>{oppClub ? T.title(cn(oppClub, lang)) : T.titleFree}</b><small>{u ? `${matchLabel(g, { cup: u.cup, round: u.round, group: u.group })} · ${shortDate(u.date, g.ui)}` : ''}</small></div></div>
      </header>
      <div className="t-head on-ground">
        <h1 className="h1"><span className="ltr">{draft.formation}</span> <span>· {T.styles[f.philosophy]}</span></h1>
        {m && (
          <div className="pred" aria-label={T.forecast}>
            <span className="l">{T.forecast}</span>
            <div className="bar" aria-hidden="true" style={{ gridTemplateColumns: `${Math.max(1, win)}fr ${Math.max(1, 100 - win - Math.round(odds(m) * 0))}fr` }}><i /><i /></div>
            <span className="v">{win}% {win !== win0 && <small className={win > win0 ? 'up' : 'down'}>{win > win0 ? '+' : ''}{win - win0}</small>}</span>
          </div>
        )}
      </div>

      <div className="grid">
        <section className="c-mid board-wrap on-ground">
          <div className={`board${sel !== null ? ' dragging' : ''}`} aria-label={T.board} role="group">
            <svg className="chalk" viewBox="0 0 68 100" preserveAspectRatio="none" aria-hidden="true">
              <g fill="none" stroke="rgba(236,250,244,.55)" strokeWidth="1.4" filter="url(#chalk)">
                <rect x="3" y="3" width="62" height="94" rx=".5" /><line x1="3" y1="50" x2="65" y2="50" /><circle cx="34" cy="50" r="9.15" />
                <rect x="13.85" y="3" width="40.3" height="16.5" /><rect x="24.85" y="3" width="18.3" height="5.5" />
                <rect x="13.85" y="80.5" width="40.3" height="16.5" /><rect x="24.85" y="91.5" width="18.3" height="5.5" />
                <path d="M26.7 19.5a9.15 9.15 0 0 0 14.6 0M26.7 80.5a9.15 9.15 0 0 1 14.6 0" />
              </g>
              <g fill="none" stroke="rgba(236,250,244,.85)" strokeWidth="1.8" strokeLinecap="round" filter="url(#chalk)">
                {chalk.paths.map((d, i) => <path key={i} d={d.d} strokeDasharray={d.dash ? '3 3.4' : undefined} markerEnd={d.arrow ? 'url(#ah)' : undefined} opacity={d.o ?? 1} />)}
              </g>
            </svg>
            {chalk.notes.map((n, i) => <span key={i} className="note" style={{ left: `${n.x}%`, top: `${n.y}%` }}>{T.ins[n.k][0]}<br />{T.ins[n.k][1][n.v]}</span>)}
            {ghosts && opp && opp.onPitch.map((id, i) => { const sl = oppSlots[i]; if (!id || !sl) return null; const p = playerOf(w, id); return (
              <div key={`o${id}`} className="tok opp" style={{ left: `${100 - sl.x}%`, top: `${Math.max(6, sl.y * 0.46 + 2)}%` }}><span className="disc">{p?.shirtNumber ?? ''}</span></div>
            ); })}
            {slots.map((sl, i) => {
              const id = xi[i];
              const p = id ? playerOf(w, id) : undefined;
              const fitV = p ? Math.round(slotValue(p, sl.pos)) : 0;
              return (
                <button key={i} className={`tok${sel === i ? ' lift' : ''}${focus === id ? ' focus' : ''}`} style={{ left: `${sl.x}%`, top: `${Math.min(92, 100 - sl.y * 0.92)}%` }}
                  onClick={() => tap(i)} aria-pressed={sel === i} aria-label={`${x.common.posLong[sl.pos]}: ${p ? p.name[lang] : '—'}`}>
                  <span className="disc">{p?.shirtNumber ?? '?'}{p && <span className={`fit${fitV < p.rating - 4 ? ' warn' : ''}`}>{fitV}</span>}</span>
                  <span className="nm">{p ? sn(p, lang) : '—'}</span>
                  <span className="rl">{x.common.pos[sl.pos]}</span>
                </button>
              );
            })}
          </div>
          <div className="board-tools">
            <label className="toggle"><input type="checkbox" checked={ghosts} onChange={(e) => setGhosts(e.target.checked)} /><span className="sw" aria-hidden="true" /><span>{oppClub ? T.theirPress(cn(oppClub, lang)) : ''}</span></label>
            <span className="hint"><I n="drag" size="sm" />{T.hint}</span>
          </div>
          <div className="section-h"><span className="eyebrow">{T.bench}</span></div>
          <div className="bench">
            {bench.map((p) => (
              <button key={p.id} className={`b${benchSel === p.id ? ' on' : ''}`} aria-pressed={benchSel === p.id} onClick={() => { setBenchSel(benchSel === p.id ? null : p.id); setFocus(p.id); }}>
                <span className="disc">{p.shirtNumber}</span><span>{sn(p, lang)}</span>
              </button>
            ))}
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
              <div className="chips wrap">{PHILOSOPHIES.map((ph) => <button key={ph} className="chip" aria-pressed={f.philosophy === ph} onClick={() => setStyle(ph)}>{T.styles[ph]}</button>)}</div>
              <div className="fam"><span className="small muted">{T.familiar} · {T.familiarSub(fam)}</span><Meter v={fam} tone={fam < 50 ? 'warn' : undefined} /></div>
            </div>
            <div className="ins">
              <div className="between"><b>{T.shape}</b>{draft.formation !== saved.formation && <span className="tag tag--club">{T.changed}</span>}</div>
              <div className="chips wrap">{FORMATION_IDS.map((fm) => <button key={fm} className="chip ltr" aria-pressed={draft.formation === fm} onClick={() => setShape(fm)}>{fmt(fm)}</button>)}</div>
            </div>
            <div className="ins">
              <div className="between"><b>{T.ins.mentality[0]}</b>{f.mentality !== fullTactics(saved).mentality && <span className="tag tag--club">{T.changed}</span>}</div>
              <Steps label={T.ins.mentality[0]} value={f.mentality + 2} options={T.ins.mentality[1]} was={fullTactics(saved).mentality + 2} onChange={(v) => setDraft({ ...draft, mentality: v - 2 })} />
            </div>
            {INS.map(([k, key]) => {
              const v = f[k] as number;
              const was = (fullTactics(saved) as unknown as Record<string, number>)[k];
              const [gain, risk] = T.trade[key][v];
              return (
                <div key={k} className="ins">
                  <div className="between"><b>{T.ins[key][0]}</b>{v !== was && <span className="tag tag--club">{T.changed}</span>}</div>
                  <Steps label={T.ins[key][0]} value={v} options={T.ins[key][1]} was={was} onChange={(nv) => setDraft({ ...draft, [k]: nv } as UserTactics)} />
                  <div className="trade"><div className="gain"><b><I n="up" size="sm" />{T.gain}</b><span>{gain}</span></div><div className="risk"><b><I n="alert" size="sm" />{T.risk}</b><span>{risk}</span></div></div>
                </div>
              );
            })}
          </Panel>
        </section>

        <section className="c-right stack">
          {focusP && (
            <Panel i={2} label={focusP.name[lang]}>
              <div className="role-h">
                <Portrait p={focusP} club={g.club} size={52} />
                <div className="grow"><span className="eyebrow">{T.role(focusSlot >= 0 ? x.common.posLong[slots[focusSlot].pos] : x.common.posLong[focusP.position])}</span><h2 className="h2">{focusP.name[lang]}</h2></div>
              </div>
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
            <Panel i={3} label={T.oppHow(cn(oppClub, lang))}>
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
        <marker id="ah" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M1 1 8 5 1 9" fill="none" stroke="rgba(236,250,244,.8)" strokeWidth="1.6" strokeLinecap="round" /></marker>
      </svg>
    </>
  );
}

function topFits(p: Player) {
  const all = (['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'] as const).map((pos) => ({ pos, v: Math.round(slotValue({ ...p, fitness: 100, morale: 60 }, pos)) }));
  return all.sort((a, b) => b.v - a.v).slice(0, 3);
}

// Chalk marks from the plan: where we press, where we attack, how high the line is.
function chalkFor(f: ReturnType<typeof fullTactics>) {
  const paths: { d: string; dash?: boolean; arrow?: boolean; o?: number }[] = [];
  const notes: { x: number; y: number; k: string; v: number }[] = [];
  if (f.pressing === 2) { paths.push({ d: 'M22 14 C 26 8, 42 8, 46 14 C 44 20, 24 20, 22 14', dash: true }); notes.push({ x: 60, y: 9, k: 'press', v: 2 }); }
  if (f.pressing === 0) { paths.push({ d: 'M10 58 L58 58', dash: true, o: 0.7 }); notes.push({ x: 6, y: 60, k: 'press', v: 0 }); }
  if (f.width === 2) { paths.push({ d: 'M8 62 C 6 48, 6 36, 9 22', dash: true, arrow: true }, { d: 'M60 62 C 62 48, 62 36, 59 22', dash: true, arrow: true }); notes.push({ x: 3, y: 30, k: 'width', v: 2 }); }
  else if (f.width === 0) { paths.push({ d: 'M30 60 C 30 45, 33 34, 34 22', arrow: true }, { d: 'M38 60 C 38 45, 35 34, 34 22', arrow: true, o: 0.7 }); notes.push({ x: 40, y: 34, k: 'width', v: 0 }); }
  if (f.line === 2) { paths.push({ d: 'M8 46 L60 46', dash: true, o: 0.75 }); notes.push({ x: 64, y: 43, k: 'line', v: 2 }); }
  if (f.line === 0) { paths.push({ d: 'M8 76 L60 76', dash: true, o: 0.75 }); notes.push({ x: 64, y: 73, k: 'line', v: 0 }); }
  if (f.counter) paths.push({ d: 'M22 58 C 28 44, 40 34, 48 20', arrow: true, o: 0.8 });
  if (f.passing === 2 && f.width !== 0) paths.push({ d: 'M34 78 C 34 60, 36 40, 40 24', arrow: true, o: 0.6 });
  return { paths, notes: notes.slice(0, 2) };
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
