// Today: "What needs me before the next match?" The next match, up to five decisions with the staff's call, who's
// fit, the club's pulse and the table. Continue is always in the same place.
import { lastMatchHere } from '../sim/record';
import { useMemo, useState } from 'react';
import type { Choice, Decision } from '../sim/decisions';
import { decisions, staffCallsSinceMatch } from '../sim/decisions';
import { predict } from '../sim/match';
import { advice } from '../sim/scouting';
import { playerOf, squadOf } from '../sim/world';
import { userObjective } from '../sim/vision';
import { isDerby } from '../sim/rivalry';
import { CL } from '../lang-club-all';
import { nextUserMatch, seasonOver } from '../sim/season';
import { availabilityFor } from '../sim/tactics';
import { dayName, shortDate } from '../sim/calendar';
import { DEPTS } from '../sim/delegation';
import { levelOf } from '../sim/staff';
import { Crest, I, Portrait, Spark, initialsOf } from './kit';
import { Panel, PanelHead } from './shell';
import { useGame, clubOf, cn, sn, matchLabel } from './game';
import { leagueRows, upcoming, avgMorale, pct3, pctText } from './util';
import { DecisionCard, Receipt, choiceText, titleText } from './Decisions';
import { D } from '../lang-dressing-all';
import { cohesionOf } from '../sim/room';
import { FirstWeekGuide } from './Guide';
import { StadiumScene } from './Scene';
import { CN } from '../lang-cine';

export function Today({ onResolve, onUndo, canUndo }: { onResolve: (d: Decision, ch: Choice) => Promise<boolean>; onUndo: () => void; canUndo: string | null }) {
  const g = useGame();
  const { w, c, x, lang } = g;
  const [all, setAll] = useState(false);
  const [receipts, setReceipts] = useState<{ id: string; label: string }[]>([]);
  const list = useMemo(() => decisions(w, c), [w, c]);
  const shown = all ? list : list.slice(0, 5);
  const next = useMemo(() => upcoming(w, c, 7), [w, c]);
  const nm0 = next[0];
  const rows = useMemo(() => leagueRows(w, c), [w, c]);
  const pos = rows.findIndex((r) => r.clubId === c.clubId) + 1;
  const over = seasonOver(c);
  const oppId = nm0 ? (nm0.home === c.clubId ? nm0.away : nm0.home) : null;
  const opp = oppId ? clubOf(w, oppId) : undefined;
  const dayWord = nm0 ? dayName(nm0.date, g.ui) : '';
  // No match left for us (our league finished while others play on) reads as season over, never as an empty day (GF-007).
  const head = c.sacked ? x.today.sacked : over || !nm0 ? x.today.seasonDone : nm0?.cup ? x.today.headCup(list.length) : x.today.head(list.length, dayWord);
  const resolve = async (d: Decision, ch: Choice) => {
    const ok = await onResolve(d, ch);
    if (ok) setReceipts((r) => [{ id: d.id, label: `${titleText(g, d)} · ${choiceText(g, ch)}` }, ...r].slice(0, 3));
  };
  const handedOver = DEPTS.filter((d) => levelOf(c, d) === 'staff').map((d) => x.office.depts[d]);
  const staffN = staffCallsSinceMatch(c);

  const unread = c.inbox.filter((m) => !m.read).length;
  const C = CN[g.ui];
  const home = nm0 ? clubOf(w, nm0.home) : undefined, away = nm0 ? clubOf(w, nm0.away) : undefined;
  const live = !!(nm0 && opp && !c.sacked && !over);
  // The hero's one action is Continue, named for what it does next (the same order App.cont takes).
  const go = c.live ? x.next.live : c.sacked ? x.next.sacked : list.length ? `${x.cont} · ${x.next.dec(list.length)}` : live ? C.prepare(dayWord) : x.cont;
  return (
    <div className="sc-today cine-desk">
      <section className="desk-top" aria-label={C.nextMatch}>
        <StadiumScene host={home ?? g.club} guest={away && home && away.id !== home.id ? away : undefined} className="desk-scene" />
        <div className="desk-match">
          {live && home && away ? (
            <>
              <span className="eyebrow desk-eyebrow">{C.nextMatch}</span>
              <h1 className="h-hero desk-vs"><span>{cn(home, lang)}</span><em>{C.vs}</em><span>{cn(away, lang)}</span></h1>
              <p className="desk-when">{longDay(nm0!.date, g.ui)}</p>
              <p className="desk-comp">{matchLabel(g, { cup: nm0!.cup, round: nm0!.round, group: nm0!.group })}{isDerby(home.id, away.id) ? ` · ${CL[g.ui].derby}` : ''}</p>
              <FixtureMeta />
            </>
          ) : (
            <>
              <span className="eyebrow desk-eyebrow">{g.league.name[lang]}</span>
              <h1 className="h-hero">{head[0]}<em>{head[1]}</em>{head[2]}</h1>
            </>
          )}
          <button className={`btn btn--primary desk-go${g.busy ? ' loading' : ''}`} disabled={g.busy} onClick={g.cont}>{go}<I n="arrowr" size="sm" flip={g.rtl} /></button>
        </div>
      </section>

      <div className="desk-grid">
        <div className="desk-main">
          {live && <FixtureActions />}
          <FirstWeekGuide />
          <section className="desk-list" aria-label={C.desk}>
            <div className="desk-h"><h2 className="h2">{C.desk}</h2>{live && list.length > 0 && <span className="desk-need">{head[0]}{head[1]}{head[2]}</span>}</div>
            {receipts.map((r, k) => <Receipt key={r.id} label={x.dec.done(r.label)} undo={x.dec.undo} onUndo={k === 0 && canUndo === r.id ? () => { onUndo(); setReceipts((rs) => rs.slice(1)); } : undefined} />)}
            {shown.map((d, k) => <DecisionCard key={d.id} d={d} i={k + 1} onResolve={resolve} />)}
            {list.length > 5 && <button className="btn btn--ghost" onClick={() => setAll(!all)}>{all ? x.today.fewer : x.today.more(list.length - 5)}</button>}
            {/* UI/UX pass (UX-02): the inbox, one tap from Today, with its unread count. */}
            <button className={`desk-row inbox-line${unread ? ' new' : ''}`} onClick={() => g.go({ s: 'news' })}>
              <I n="inbox" /><span className="grow">{C.newMsgs(unread)}</span><span className="desk-go-l">{C.inbox}<I n="arrowr" size="sm" flip={g.rtl} /></span>
            </button>
            <button className="desk-row" onClick={() => g.sheet({ k: 'staffLog' })}>
              <I n="squad" /><span className="grow">{list.length ? x.today.staffDid(staffN) : x.today.nothing}<small>{x.today.nothingSub(handedOver.join(', '))}</small></span><span className="desk-go-l">{x.today.review}<I n="arrowr" size="sm" flip={g.rtl} /></span>
            </button>
          </section>
          {live && <FitPanel />}
        </div>
        <div className="desk-side">
          <PulsePanel pos={pos} />
          <ComingUp next={next.slice(0, 3)} />
          <div className="desk-league">
            <I n="history" /><b>{g.league.name[lang]}</b><span className="grow">· {C.leagueLine(x.place(pos), rows[pos - 1]?.p ?? 0)}</span>
            <button className="link" onClick={() => g.go({ s: 'match', tab: 2 })}>{C.table}<I n="arrowr" size="sm" flip={g.rtl} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

const longDay = (d: Date, ui: string) => d.toLocaleDateString(ui === 'ar' ? 'ar-EG' : ui, { weekday: 'long', day: 'numeric', month: 'long' });

// Under the match: the odds the engine gives and who is available (F08/F10 rules), in one line.
function FixtureMeta() {
  const g = useGame();
  const { w, c, x } = g;
  const C = CN[g.ui];
  const m = useMemo(() => nextUserMatch(w, c), [w, c]);
  const u = upcoming(w, c, 1)[0];
  if (!u) return null;
  const squad = squadOf(w, c.clubId);
  const av = availabilityFor(squad, u.cup, c.rested ?? []);
  let win = '';
  if (m) { const p = predict(m, (id) => playerOf(w, id)!); win = pctText(pct3(m.sides[0].clubId === c.clubId ? p : [p[2], p[1], p[0]])[0]); }
  return <p className="desk-meta">{C.available(av.available.length, squad.length)}{win ? ` · ${C.winChance(win)}` : ''} · {u.home === c.clubId ? x.today.ourGround : x.today.theirGround}</p>;
}

// Pick the XI and the opponent report, with the assistant's one-line read (FixtureCard's actions, unchanged).
function FixtureActions() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const m = useMemo(() => nextUserMatch(w, c), [w, c]);
  const report = m ? c.scouted?.[m.key] : undefined;
  let odds: [number, number, number] = [0.4, 0.3, 0.3];
  if (m) { const p = predict(m, (id) => playerOf(w, id)!); odds = m.sides[0].clubId === c.clubId ? p : [p[2], p[1], p[0]]; }
  const tip = m ? advice(w, c, report, odds[2])[0] : undefined;
  const A = x.fixture.advice;
  const line = !tip ? A.fine : tip.k === 'scoutFirst' ? A.scoutFirst : tip.k === 'mismatch' ? A.mismatch(x.tac.styles[tip.use]) : tip.k === 'edge' ? A.edge
    : tip.k === 'lowMastery' ? A.lowMastery(tip.n) : tip.k === 'tired' ? A.tired(tip.n) : tip.k === 'outOfPos' ? A.outOfPos(tip.n) : tip.k === 'underdog' ? A.underdog : A.trap;
  const asst = c.ops.staff.assistant;
  return (
    <div className="desk-acts">
      <div className="desk-two">
        <button className="btn btn--ghost desk-big" onClick={() => g.go({ s: 'match', tab: 0 })}><I n="tactics" />{x.fixture.pick}<I n="arrowr" size="sm" flip={g.rtl} /></button>
        <button className="btn btn--ghost desk-big" onClick={() => (report ? g.sheet({ k: 'report' }) : g.run({ type: 'report.make' }, { toast: false }).then((r) => { if (r.ok) g.sheet({ k: 'report' }); }))}><I n="eye" />{report ? x.fixture.report : x.fixture.getReport}<I n="arrowr" size="sm" flip={g.rtl} /></button>
      </div>
      <div className="desk-asst">
        <span className="staff" aria-hidden="true">{asst ? initialsOf(asst.name.en) : 'AS'}</span>
        <div><div className="who">{asst ? asst.name[lang] : x.fixture.assistant}, <span>{x.office.roles.assistant.toLowerCase()}</span></div><q>{line}</q></div>
      </div>
    </div>
  );
}

// The next three matches as cards (date, home/away, opponent crest), with the full fixture list one tap away.
function ComingUp({ next }: { next: ReturnType<typeof upcoming> }) {
  const g = useGame();
  const { w, c } = g;
  const C = CN[g.ui];
  if (!next.length) return null;
  return (
    <section className="desk-coming" aria-label={C.coming}>
      <div className="desk-h"><h2 className="h2">{C.coming}</h2><button className="link" onClick={() => g.go({ s: 'match', tab: 1 })}>{C.fixtures}<I n="arrowr" size="sm" flip={g.rtl} /></button></div>
      <div className="coming">
        {next.map((u, i) => {
          const o = clubOf(w, u.home === c.clubId ? u.away : u.home);
          const atHome = u.home === c.clubId;
          return (
            <div key={`${u.round}${u.cup ?? ''}`} className={`cu${i === 0 ? ' next' : ''}`}>
              <div className="cu-t"><span className="cu-d">{shortDate(u.date, g.ui)}</span><I n={atHome ? 'today' : 'arrowr'} size="sm" /><span className="sr">{atHome ? C.home : C.away}</span></div>
              <b>{C.vs} {cn(o, g.lang)}</b>
              <Crest club={o} size={36} />
            </div>
          );
        })}
      </div>
    </section>
  );
}


function FitPanel() {
  const g = useGame();
  const { w, c, x } = g;
  const squad = squadOf(w, c.clubId);
  const u = upcoming(w, c, 1)[0];
  if (!u) return null; // nothing left to be fit for this season (GF-007)
  // F10: available for THIS match (its competition's bans, rests), the same rule the XI is picked with.
  const av = availabilityFor(squad, u.cup, c.rested ?? []);
  const out = av.out.slice(0, 3);
  const day = dayName(u.date, g.ui);
  const fit = av.available.length;
  const tired = av.out.filter((o) => o.why === 'tired').length;
  return (
    <Panel i={3} className="a-avail" label={x.today.fit(day)}>
      <PanelHead title={x.today.fit(day)} right={<span className="eyebrow">{x.today.fitOf(fit, squad.length)}{tired ? ` · ${x.today.tiredN(tired)}` : ''}</span>} />
      {out.length === 0 ? <p className="muted small">{x.today.allFit}</p> : (
        <div className="avail">
          {out.map(({ p, why }) => (
            <button key={p.id} className="av" onClick={() => g.player(p.id)}>
              <Portrait p={p} club={g.club} />
              <div>
                <b>{sn(p, g.lang)}</b>
                {why === 'injured' ? <span className="tag tag--bad"><I n="medic" size="sm" />{x.today.injured(p.injured)}</span>
                  : why === 'banned' ? <span className="tag tag--bad"><I n="x" size="sm" />{x.today.banned}</span>
                  : why === 'rested' ? <span className="tag"><I n="bolt" size="sm" />{x.today.restedTag}</span>
                  : <span className="tag tag--warn"><I n="bolt" size="sm" />{x.today.tired(p.fitness)}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}

function PulsePanel({ pos }: { pos: number }) {
  const g = useGame();
  const { w, c, x } = g;
  const pulse = c.pulse ?? [];
  const board = Math.round(c.board.confidence), fans = Math.round(c.board.fans), room = avgMorale(w, c);
  const last = (k: 1 | 2 | 3, now: number) => [...pulse.map((p) => p[k]), now].slice(-6);
  const squad = squadOf(w, c.clubId);
  const low = [...squad].sort((a, b) => a.morale - b.morale)[0];
  const lastM = lastMatchHere(c);
  const res = lastM ? (() => { const me = lastM.home === c.clubId ? 0 : 1; const d = lastM.goals[me] - lastM.goals[1 - me]; const o = clubOf(w, me === 0 ? lastM.away : lastM.home); return `${x.today.lastResult}: ${lastM.goals[me]}–${lastM.goals[1 - me]} v ${cn(o, g.lang)}${d > 0 ? '' : ''}`; })() : '';
  const obj = g.t.objective[userObjective(w, c)]; // V2.7: after the board meeting
  const rows: [string, string, string, string, number, number[]][] = [
    ['board', x.today.board, x.today.mood(board), x.today.boardWhy(obj.toLowerCase(), x.place(pos)), board, last(1, board)],
    ['fans', x.today.fans, x.today.fansMood(fans), res, fans, last(2, fans)],
    ['room', x.today.room, x.today.roomMood(room), `${D[g.ui].today.roomWhy(Math.round(cohesionOf(w, c.clubId)))} · ${x.today.roomWhy(low && low.morale < 50 ? sn(low, g.lang) : null)}`, room, last(3, room)],
  ];
  const C = CN[g.ui];
  return (
    <section className="desk-around" aria-label={C.around}>
      <div className="desk-h"><h2 className="h2">{C.around}</h2><button className="link" onClick={() => g.go({ s: 'club' })}>{x.today.office}<I n="arrowr" size="sm" flip={g.rtl} /></button></div>
      <div className="pulse3">
        {rows.map(([k, label, mood, why, v, data]) => (
          <div key={k} className={`p3${v < 45 ? ' soft' : ''}${k === 'room' ? ' p-link' : ''}`} title={why} {...(k === 'room' ? { role: 'button', tabIndex: 0, onClick: () => g.go({ s: 'room' }), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter') g.go({ s: 'room' }); } } : {})}>
            <span className="ic"><I n={k === 'room' ? 'shirt' : k} size="lg" /></span>
            <div>
              <span className="l">{label}</span>
              <b className="v">{v}</b>
              <span className="m">{mood}</span>
              <span className="why">{why}</span>
            </div>
            <span className="spark"><Spark data={data} tone={data.length > 1 && data[data.length - 1] < data[0] ? 'down' : 'up'} rtl={g.rtl} /></span>
          </div>
        ))}
      </div>
    </section>
  );
}
