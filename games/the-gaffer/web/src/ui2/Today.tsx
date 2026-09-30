// Today: "What needs me before the next match?" The next match, up to five decisions with the staff's call, who's
// fit, the club's pulse and the table. Continue is always in the same place.
import { useMemo, useState } from 'react';
import type { Choice, Decision } from '../sim/decisions';
import { decisions, staffCallsSinceMatch } from '../sim/decisions';
import { predict } from '../sim/match';
import { advice } from '../sim/scouting';
import { objectiveOf, playerOf, squadOf } from '../sim/world';
import { nextUserMatch, seasonOver } from '../sim/season';
import { available } from '../sim/tactics';
import { dayName, dayNum, shortDate, dateOf } from '../sim/calendar';
import { DEPTS } from '../sim/delegation';
import { levelOf } from '../sim/staff';
import { Crest, Form, I, Portrait, Spark, initialsOf } from './kit';
import { Panel, PanelHead } from './shell';
import { useGame, clubOf, cn, sn, matchLabel } from './game';
import { formOf, leagueRows, upcoming, avgMorale } from './util';
import { DecisionCard, Receipt, choiceText, titleText } from './Decisions';
import { newsText } from './text';
import { D } from '../lang-dressing-all';
import { cohesionOf } from '../sim/room';

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
  const nowDate = dateOf(c.season, c.round, false);
  const today = new Date(nowDate.getTime() - 2 * 86400000);
  const daysTo = nm0 ? Math.round((nm0.date.getTime() - today.getTime()) / 86400000) : 0;
  const dayWord = nm0 ? dayName(nm0.date, g.ui) : '';
  const head = c.sacked ? x.today.sacked : over ? x.today.seasonDone : nm0?.cup ? x.today.headCup(list.length) : x.today.head(list.length, dayWord);
  const resolve = async (d: Decision, ch: Choice) => {
    const ok = await onResolve(d, ch);
    if (ok) setReceipts((r) => [{ id: d.id, label: `${titleText(g, d)} · ${choiceText(g, ch)}` }, ...r].slice(0, 3));
  };
  const handedOver = DEPTS.filter((d) => levelOf(c, d) === 'staff').map((d) => x.office.depts[d]);
  const staffN = staffCallsSinceMatch(c);

  return (
    <div className="sc-today">
      <div className="layout">
        <section className="hero a-hero on-ground">
          <span className="eyebrow">{nm0 && opp ? x.today.eyebrow(matchLabel(g, { cup: nm0.cup, round: nm0.round, group: nm0.group }), cn(opp, lang), x.today.inDays(daysTo)) : g.league.name[lang]}</span>
          <h1 className="h-hero">{head[0]}<em>{head[1]}</em>{head[2]}</h1>
        </section>

        <div className="week a-week on-ground" aria-label={x.today.week}>
          {next.slice(0, 7).map((u, i) => {
            const o = clubOf(w, u.home === c.clubId ? u.away : u.home);
            return (
              <div key={`${u.round}${u.cup ?? ''}`} className={`d${i === 0 ? ' mx' : ''}`} title={`${cn(o, lang)} · ${shortDate(u.date, g.ui)}`}>
                <span>{dayName(u.date, g.ui)}</span><b>{dayNum(u.date, g.ui)}</b>
                <Crest club={o} size={18} />
              </div>
            );
          })}
        </div>

        <div className="col col-a">
          <section className="a-dec stack" aria-label={x.nav.today}>
            {receipts.map((r, k) => <Receipt key={r.id} label={x.dec.done(r.label)} undo={x.dec.undo} onUndo={k === 0 && canUndo === r.id ? () => { onUndo(); setReceipts((rs) => rs.slice(1)); } : undefined} />)}
            {shown.map((d, k) => <DecisionCard key={d.id} d={d} i={k + 1} onResolve={resolve} />)}
            {list.length > 5 && <button className="btn btn--ghost on-ground" onClick={() => setAll(!all)}>{all ? x.today.fewer : x.today.more(list.length - 5)}</button>}
          </section>
        </div>

        <div className="col col-b">
          {nm0 && opp && !c.sacked && <FixtureCard />}
          <FitPanel />
          <Panel flat i={6} className="a-note">
            <div className="between">
              <div className="hstack"><I n="doc" /><div><b className="note-b">{list.length ? x.today.staffDid(staffN) : x.today.nothing}</b><div className="meta note-sub">{x.today.nothingSub(handedOver.join(', '))}</div></div></div>
              <button className="link" onClick={() => g.sheet({ k: 'staffLog' })}>{x.today.review}</button>
            </div>
          </Panel>
        </div>

        <div className="col col-c">
          <PulsePanel pos={pos} />
          <TablePanel oppId={oppId} />
          <HeadlinesPanel />
        </div>
      </div>
    </div>
  );
}

function FixtureCard() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const u = upcoming(w, c, 1)[0];
  // The same kick-off the engine will use (this week's rests and focus included).
  const m = useMemo(() => nextUserMatch(w, c), [w, c]);
  if (!u) return null;
  const home = clubOf(w, u.home)!, away = clubOf(w, u.away)!;
  const rows = leagueRows(w, c);
  let odds: [number, number, number] = [0.4, 0.3, 0.3];
  if (m) {
    const p = predict(m, (id) => playerOf(w, id)!);
    odds = m.sides[0].clubId === c.clubId ? p : [p[2], p[1], p[0]];
  }
  const report = m ? c.scouted?.[m.key] : undefined;
  const tips = m ? advice(w, c, report, odds[2]) : [];
  const tip = tips[0];
  const A = x.fixture.advice;
  const line = !tip ? A.fine : tip.k === 'scoutFirst' ? A.scoutFirst : tip.k === 'mismatch' ? A.mismatch(x.tac.styles[tip.use]) : tip.k === 'edge' ? A.edge
    : tip.k === 'lowMastery' ? A.lowMastery(tip.n) : tip.k === 'tired' ? A.tired(tip.n) : tip.k === 'outOfPos' ? A.outOfPos(tip.n) : tip.k === 'underdog' ? A.underdog : A.trap;
  const asst = c.ops.staff.assistant;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const mine = home.id === c.clubId;
  return (
    <Panel className="fixture a-match" i={0} label={x.fixture.comp('', '')}>
      <div className="top">
        <div className="between">
          <span className="eyebrow">{matchLabel(g, { cup: u.cup, round: u.round, group: u.group })}</span>
          <span className="tag"><I n="stadium" size="sm" />{mine ? x.today.ourGround : x.today.theirGround}</span>
        </div>
        <div className="vs">
          <div className="team"><Crest club={home} size={64} /><b>{cn(home, lang)}</b><Form list={formOf(rows, home.id)} letters={x.wdl} /></div>
          <div className="ko"><span className="num">{dayName(u.date, g.ui)}</span><small>{shortDate(u.date, g.ui)}</small></div>
          <div className="team"><Crest club={away} size={64} /><b>{cn(away, lang)}</b><Form list={formOf(rows, away.id)} letters={x.wdl} /></div>
        </div>
        <div className="odds" style={{ ['--w' as string]: `${Math.max(1, Math.round(odds[0] * 100))}fr`, ['--d' as string]: `${Math.max(1, Math.round(odds[1] * 100))}fr`, ['--l' as string]: `${Math.max(1, Math.round(odds[2] * 100))}fr` }} aria-hidden="true"><i /><i /><i /></div>
        <div className="odds-l"><span>{x.fixture.win} <b>{pct(odds[0])}</b></span><span>{x.fixture.draw} <b>{pct(odds[1])}</b></span><span>{x.fixture.loss} <b>{pct(odds[2])}</b></span></div>
      </div>
      <div className="read">
        <div className="advice">
          <span className="staff" aria-hidden="true">{asst ? initialsOf(asst.name.en) : 'AS'}</span>
          <div><div className="who">{asst ? asst.name[lang] : x.fixture.assistant}, <span>{x.office.roles.assistant.toLowerCase()}</span></div><q>{line}</q></div>
        </div>
      </div>
      <div className="acts">
        <button className="btn btn--primary" onClick={() => g.go({ s: 'match', tab: 0 })}><I n="tactics" />{x.fixture.pick}</button>
        <button className="btn btn--ghost" onClick={() => (report ? g.sheet({ k: 'report' }) : g.run({ type: 'report.make' }, { toast: false }).then((r) => { if (r.ok) g.sheet({ k: 'report' }); }))}><I n="eye" />{report ? x.fixture.report : x.fixture.getReport}</button>
      </div>
    </Panel>
  );
}


function FitPanel() {
  const g = useGame();
  const { w, c, x } = g;
  const squad = squadOf(w, c.clubId);
  const cupBan = (p: (typeof squad)[number]) => Object.values(p.sus ?? {}).some((n) => n > 0); // gf-ref
  const out = squad.filter((p) => !available(p) || cupBan(p) || p.fitness < 78 || (c.rested ?? []).includes(p.id))
    .sort((a, b) => (b.injured + b.banned) - (a.injured + a.banned) || a.fitness - b.fitness).slice(0, 3);
  const u = upcoming(w, c, 1)[0];
  const day = u ? dayName(u.date, g.ui) : '';
  const fit = squad.filter(available).length;
  return (
    <Panel i={3} className="a-avail" label={x.today.fit(day)}>
      <PanelHead title={x.today.fit(day)} right={<span className="eyebrow">{x.today.fitOf(fit, squad.length)}</span>} />
      {out.length === 0 ? <p className="muted small">{x.today.allFit}</p> : (
        <div className="avail">
          {out.map((p) => (
            <button key={p.id} className="av" onClick={() => g.player(p.id)}>
              <Portrait p={p} club={g.club} />
              <div>
                <b>{sn(p, g.lang)}</b>
                {p.injured ? <span className="tag tag--bad"><I n="medic" size="sm" />{x.today.injured(p.injured)}</span>
                  : p.banned || cupBan(p) ? <span className="tag tag--bad"><I n="x" size="sm" />{x.today.banned}</span>
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
  const lastM = c.matches?.[0];
  const res = lastM ? (() => { const me = lastM.home === c.clubId ? 0 : 1; const d = lastM.goals[me] - lastM.goals[1 - me]; const o = clubOf(w, me === 0 ? lastM.away : lastM.home); return `${x.today.lastResult}: ${lastM.goals[me]}–${lastM.goals[1 - me]} v ${cn(o, g.lang)}${d > 0 ? '' : ''}`; })() : '';
  const obj = g.t.objective[objectiveOf(w, g.club)];
  const rows: [string, string, string, string, number, number[]][] = [
    ['board', x.today.board, x.today.mood(board), x.today.boardWhy(obj.toLowerCase(), x.place(pos)), board, last(1, board)],
    ['fans', x.today.fans, x.today.fansMood(fans), res, fans, last(2, fans)],
    ['room', x.today.room, x.today.roomMood(room), `${D[g.ui].today.roomWhy(Math.round(cohesionOf(w, c.clubId)))} · ${x.today.roomWhy(low && low.morale < 50 ? sn(low, g.lang) : null)}`, room, last(3, room)],
  ];
  return (
    <Panel i={4} className="a-pulse" label={x.today.pulse}>
      <PanelHead title={x.today.pulse} right={<button className="link" onClick={() => g.go({ s: 'club' })}>{x.today.office}<I n="chev" size="sm" /></button>} />
      <div className="pulse">
        {rows.map(([k, label, mood, why, v, data]) => (
          <div key={k} className={`p${v < 45 ? ' soft' : ''}${k === 'room' ? ' p-link' : ''}`} {...(k === 'room' ? { role: 'button', tabIndex: 0, onClick: () => g.go({ s: 'room' }), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter') g.go({ s: 'room' }); } } : {})}>
            <span className="ic"><I n={k} /></span>
            <div><b>{label} · <em>{mood}</em></b><div className="why">{why}</div></div>
            <span className="spark"><Spark data={data} tone={data.length > 1 && data[data.length - 1] < data[0] ? 'down' : 'up'} rtl={g.rtl} /></span>
            <span className="v">{v}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function TablePanel({ oppId }: { oppId: string | null }) {
  const g = useGame();
  const { w, c, x } = g;
  const rows = leagueRows(w, c);
  const i = rows.findIndex((r) => r.clubId === c.clubId);
  const from = Math.max(0, Math.min(rows.length - 5, i - 2));
  const played = rows[i]?.p ?? 0;
  return (
    <Panel i={5} className="a-table" label={x.today.table}>
      <PanelHead title={x.today.table} right={<button className="link" onClick={() => g.go({ s: 'match', tab: 2 })}>{x.today.after(played)}<I n="chev" size="sm" /></button>} />
      <table className="tbl">
        <tbody>
          {rows.slice(from, from + 5).map((r, k) => {
            const cl = clubOf(w, r.clubId);
            return (
              <tr key={r.clubId} className={r.clubId === c.clubId ? 'me' : r.clubId === oppId ? 'opp' : undefined}>
                <td className="pos">{from + k + 1}</td>
                <td><span className="cl"><Crest club={cl} size={22} /><span className="cl-n">{cn(cl, g.lang)}</span>{r.clubId === oppId && <span className="nextchip">{x.today.next}</span>}</span></td>
                <td className="gd">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td>
                <td className="pts">{r.pts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

function HeadlinesPanel() {
  const g = useGame();
  const { w, c, x } = g;
  const items = (c.news ?? []).slice(0, 3);
  if (!items.length) return null;
  return (
    <Panel i={6} className="a-news" label={x.today.headlines}>
      <PanelHead title={x.today.headlines} right={<button className="link" onClick={() => g.go({ s: 'news' })}>{x.today.allNews}<I n="chev" size="sm" /></button>} />
      <div className="rows">
        {items.map((n) => { const [h, b] = newsText(g.t, g.lang, w, c, n); return <div key={n.id} className="row news-row"><div className="grow"><div className="name wrap">{h}</div><div className="sub wrap">{b}</div></div></div>; })}
      </div>
    </Panel>
  );
}
