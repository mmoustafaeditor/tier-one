// The club office: the money (with a runway you can read), the board and what they want, the facilities, the staff
// room (who does what, and how much you let them), and the commercial side.
import { useState } from 'react';
import type { Dept, DeptLevel, Facility, StaffRole } from '../model/types';
import { monthly, upgradeCost, FACILITIES, attendance, capacityOf, refPrice } from '../sim/economy';
import { objectivesOf, youthApps, cupAimMet } from '../sim/coach';
import { objectiveMet, roundsIn, leagueOf } from '../sim/season';
import { wageBill } from '../sim/world';
import { DEPTS, DEPT_ROLE, biasOf, levelOf } from '../sim/delegation';
import { dateOf, monthName } from '../sim/calendar';
import { I, Kpi, LineChart, Meter, initialsOf } from './kit';
import { Panel, PanelHead, Seg, Stepper } from './shell';
import { useGame, money } from './game';
import { leagueRows } from './util';
import { logText } from './text';

const FAC_ICON: Record<Facility, string> = { stadium: 'stadium', medical: 'medic', training: 'grow', academy: 'grad', scouting: 'eye' };
const ROLE_TONE: Record<StaffRole, string> = { assistant: '#0E4F47', director: '#0B3B5C', fitness: '#5A3A8A', doctor: '#7A2E3A', psychologist: '#3F5A1E', scout: '#8A5A12' };

export function OfficeScreen({ tab, onTab }: { tab: number; onTab: (n: number) => void }) {
  const g = useGame();
  const x = g.x;
  return (
    <div className="sc-office">
      <div className="o-head on-ground">
        <h1 className="h-hero">{x.office.hero}</h1>
        <div className="o-tabs"><Seg label={x.office.title} value={tab} onChange={onTab} options={x.office.tabs.map((l, i) => ({ v: i, label: l }))} onGround /></div>
        <div className="o-doors">
          <button className="btn btn--ghost on-ground btn--sm phone-only" onClick={() => g.go({ s: 'career' })}><I n="history" size="sm" />{x.nav.career}</button>
          <button className="btn btn--ghost on-ground btn--sm phone-only" onClick={() => g.go({ s: 'pass' })}><I n="store" size="sm" />{x.nav.pass}</button>
          <button className="btn btn--ghost on-ground btn--sm" onClick={() => g.go({ s: 'settings' })}><I n="gear" size="sm" />{x.office.settings}</button>
        </div>
      </div>
      {tab === 0 && <Money />}
      {tab === 1 && <Board />}
      {tab === 2 && <Facilities />}
      {tab === 3 && <StaffRoom />}
      {tab === 4 && <Commercial />}
    </div>
  );
}

function Money() {
  const g = useGame();
  const { w, c, x } = g;
  const O = x.office;
  const club = g.club;
  const mo = monthly(w, c);
  const bill = wageBill(w, c.clubId);
  // The runway: cash month by month to the end of the season on the current monthly picture.
  const last = roundsIn(c);
  const months: Date[] = [];
  for (let r = c.round; r <= last; r += 4) months.push(dateOf(c.season, r));
  const cash = months.map((_, i) => Math.round((club.budget + mo.net * i) / 1e5) / 10);
  const low = Math.min(...cash);
  const lowI = cash.indexOf(low);
  const ok = low >= 0;
  const [cap, setCap] = useState(Math.max(10_000, Math.round(club.wageCap * 0.05 / 1e4) * 1e4));
  const lines: [string, number][] = [['gate', mo.tickets], ['tv', mo.tv], ['sponsors', mo.sponsors], ['wages', mo.wages], ['staff', mo.staff], ['upkeep', mo.upkeep]];
  const maxLine = Math.max(...lines.map(([, v]) => Math.abs(v)), 1);
  const ledger = Object.entries(c.ops.ledger).filter(([, v]) => v).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  return (
    <div className="grid">
      <Panel className="g-fin" i={1} label={O.runway('')}>
        <span className="eyebrow">{O.runway(months.length ? monthName(months[months.length - 1], g.ui) : '')}</span>
        <h2 className="h1">{O.runwayHead(ok, months[lowI] ? monthName(months[lowI], g.ui) : '')}</h2>
        <div className="runway-k">
          <Kpi v={<span className="ltr">{money(club.budget)}</span>} l={O.cash} />
          <Kpi v={`${Math.round((bill / Math.max(1, club.wageCap)) * 100)}%`} l={O.wageUse} />
          <Kpi v={<span className="ltr">{money(Math.max(0, club.budget))}</span>} l={O.transfer} />
        </div>
        {months.length > 1 && (
          <LineChart h={170} rtl={g.rtl} x={months.map((d) => monthName(d, g.ui))} fmt={(v) => `${v}M`} yMin={Math.min(0, Math.floor(low))}
            series={[{ data: cash, label: O.projected }]} tipX={(i) => monthName(months[i], g.ui)} />
        )}
        <div className="legend"><span><i />{O.projected}</span></div>
        <div className="split">
          {lines.map(([k, v]) => (
            <div key={k} className="row2"><span>{O.lines[k]}</span><span className={`bar${v < 0 ? ' out' : ''}`} style={{ ['--w' as string]: `${(Math.abs(v) / maxLine) * 100}%` }} /><b className="ltr">{money(Math.abs(v))}</b></div>
          ))}
        </div>
      </Panel>
      <Panel i={2} label={O.capT}>
        <PanelHead title={O.capT} right={<span className="eyebrow ltr">{money(club.wageCap)}</span>} />
        <Meter v={(bill / Math.max(1, club.wageCap)) * 100} tone={bill > club.wageCap * 0.95 ? 'warn' : undefined} />
        <p className="small muted cap-line"><span className="ltr">{money(bill)}</span> / <span className="ltr">{money(club.wageCap)}</span></p>
        <Stepper label={O.capMove} value={cap} step={Math.max(10_000, Math.round(club.wageCap * 0.01 / 1e4) * 1e4)} min={10_000} format={(v) => `${money(v)}${x.common.perMonth}`} onChange={setCap} />
        <div className="two">
          <button className="btn btn--ghost btn--sm" onClick={() => void g.run({ type: 'wagecap.move', perMonth: cap }, { toast: x.saved })}><I n="up" size="sm" />{O.capUp(money(cap * 12))}</button>
          <button className="btn btn--ghost btn--sm" onClick={() => void g.run({ type: 'wagecap.move', perMonth: -cap }, { toast: x.saved })}><I n="down" size="sm" />{O.capDown(money(cap * 6))}</button>
        </div>
      </Panel>
      <Panel i={3} label={O.ledger}>
        <PanelHead title={O.ledger} />
        <div className="rows">
          {ledger.map(([k, v]) => <div key={k} className="row ledger"><span className="grow">{g.t.ledgerKeys[k] ?? k}</span><b className={`ltr ${v < 0 ? 'down' : 'up'}`}>{v < 0 ? '−' : '+'}{money(Math.abs(v))}</b></div>)}
          {!ledger.length && <p className="muted small">{x.office.logEmpty}</p>}
        </div>
      </Panel>
    </div>
  );
}

function Board() {
  const g = useGame();
  const { w, c, x } = g;
  const O = x.office;
  const aims = objectivesOf(w, c);
  const rows = leagueRows(w, c);
  const pos = rows.findIndex((r) => r.clubId === c.clubId) + 1;
  const met = objectiveMet(aims.league, pos, rows.length);
  // Distance to the line: how many places inside or outside the objective.
  let line = pos;
  if (met) { while (line < rows.length && objectiveMet(aims.league, line + 1, rows.length)) line++; } else { while (line > 1 && !objectiveMet(aims.league, line, rows.length)) line--; }
  const cup = cupAimMet(w, c, aims.cup);
  const youth = youthApps(w, c);
  const fin = g.club.budget >= 0;
  const conf = Math.round(c.board.confidence);
  const played = rows[pos - 1]?.p ?? 0;
  const tot = (c.fixtures[leagueOf(w, c.clubId)] ?? []).length;
  const items: [string, string, string, 'good' | 'warn' | 'bad', number][] = [
    [O.obj.league, g.t.objective[aims.league], `${x.place(pos)} · ${x.today.after(played)}`, met ? 'good' : pos - line <= 2 ? 'warn' : 'bad', Math.round((played / Math.max(1, tot)) * 100)],
    [O.obj.cup, g.t.cupAim[aims.cup], '', cup === true ? 'good' : cup === false ? 'bad' : 'warn', cup === true ? 100 : 40],
    [O.obj.youth, O.youthLine(youth, aims.youth), '', youth >= aims.youth ? 'good' : 'warn', Math.min(100, (youth / Math.max(1, aims.youth)) * 100)],
    [O.obj.finance, O.financeLine(fin), '', fin ? 'good' : 'bad', fin ? 100 : 30],
  ];
  return (
    <div className="grid">
      <Panel i={1} label={O.board}>
        <PanelHead title={O.board} right={<span className="eyebrow">{x.seasonLabel(c.season)}</span>} />
        {items.map(([t0, t1, sub, tone, v], i) => (
          <div key={i} className="obj">
            <div className="between"><b>{t0} · {t1}</b><span className={`tag tag--${tone}`}><I n={tone === 'good' ? 'check' : tone === 'warn' ? 'clock' : 'alert'} size="sm" />{tone === 'good' ? O.onTrack : tone === 'warn' ? O.close : O.behind}</span></div>
            <Meter v={v} tone={tone === 'good' ? undefined : tone} />
            {sub && <p>{sub}</p>}
          </div>
        ))}
        <div className="trust"><span className="big">{conf}</span><div><b>{O.trust} · {x.today.mood(conf)}</b><p className="small muted">{O.trustWhy(conf)}</p></div></div>
      </Panel>
      <Panel i={2} label={x.today.pulse}>
        <PanelHead title={x.today.fans} right={<span className="eyebrow">{Math.round(c.board.fans)}</span>} />
        <Meter v={c.board.fans} />
        <p className="small muted">{x.today.fansMood(c.board.fans)}</p>
        <div className="p-more"><button className="btn btn--ghost btn--sm" onClick={() => g.go({ s: 'news' })}><I n="news" size="sm" />{x.news.title}</button></div>
      </Panel>
    </div>
  );
}

function Facilities() {
  const g = useGame();
  const { c, x } = g;
  const O = x.office;
  return (
    <div className="grid">
      <Panel i={1} label={O.facilities}>
        <PanelHead title={O.facilities} />
        {FACILITIES.map((f) => {
          const lvl = c.ops.facilities[f];
          const cost = lvl < 5 ? upgradeCost(g.club, lvl) : 0;
          return (
            <div key={f} className="fac">
              <span className="ic"><I n={FAC_ICON[f]} /></span>
              <div><b>{O.fac[f]} · {O.level(lvl)}</b><span className="s">{O.facFx[f]}{f === 'stadium' ? ` · ${capacityOf(c.ops).toLocaleString()}` : ''}</span></div>
              <div className="fac-r">
                <span className="lv" aria-label={O.level(lvl)}>{[1, 2, 3, 4, 5].map((k) => <i key={k} className={k <= lvl ? 'on' : ''} />)}</span>
                {lvl < 5 ? <button className="btn btn--ghost btn--sm" disabled={g.club.budget < cost} onClick={() => void g.run({ type: 'facility.upgrade', facility: f }, { toast: x.saved })}>{O.upgrade(money(cost))}</button> : <span className="small muted">{O.maxed}</span>}
              </div>
            </div>
          );
        })}
      </Panel>
    </div>
  );
}

function StaffRoom() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const O = x.office;
  const [hire, setHire] = useState<StaffRole | null>(null);
  const levels: DeptLevel[] = ['me', 'ask', 'staff'];
  return (
    <div className="grid staffroom">
      <Panel i={1} label={O.staff}>
        <PanelHead title={O.staff} />
        <p className="small muted">{O.staffSub}</p>
        <div className="all-row"><span className="small">{O.all}</span><Seg label={O.all} value={DEPTS.every((d) => levelOf(c, d) === 'staff') ? 'staff' : DEPTS.every((d) => levelOf(c, d) === 'me') ? 'me' : DEPTS.every((d) => levelOf(c, d) === 'ask') ? 'ask' : ('' as DeptLevel)}
          onChange={(v) => void g.run({ type: 'delegation.all', level: v }, { toast: x.saved })} options={levels.map((l) => ({ v: l, label: O.levels[l] }))} /></div>
        {DEPTS.map((d: Dept) => {
          const role = DEPT_ROLE[d];
          const s = c.ops.staff[role];
          const b = biasOf(s);
          const lvl = levelOf(c, d);
          return (
            <div key={d} className="dept">
              <div className="dept-h">
                <span className="staff" style={{ background: ROLE_TONE[role] }} aria-hidden="true">{s ? initialsOf(s.name.en) : '?'}</span>
                <div className="grow"><b>{O.depts[d]}</b><span className="sub">{O.deptSub[d]}</span></div>
              </div>
              <Seg label={O.depts[d]} value={lvl} onChange={(v) => void g.run({ type: 'delegation.set', dept: d, level: v }, { toast: `${O.depts[d]}: ${O.levels[v]}` })} options={levels.map((l) => ({ v: l, label: O.levels[l] }))} />
              <p className="small muted">{O.levelHelp[lvl]} {s && <>· {s.name[lang]}, {O.roles[role].toLowerCase()} · {O.quality(s.quality)}{b ? ` · ${O.bias[b]}` : ''}</>}</p>
              {b && s && <p className="small bias-why">{O.biasWhy[b]}</p>}
            </div>
          );
        })}
      </Panel>
      <Panel i={2} label={O.log}>
        <PanelHead title={O.log} />
        <div className="rows">
          {(c.staffLog ?? []).slice(0, 14).map((l, i) => <div key={i} className="row"><span className="rnd">{x.common.matchday(l.round + 1)}</span><span className="grow small">{logText(g.t, x, lang, w, l)}{l.b ? <em className="bias"> · {O.bias[l.b]}</em> : null}</span></div>)}
          {!(c.staffLog ?? []).length && <p className="muted small">{O.logEmpty}</p>}
        </div>
      </Panel>
      <Panel i={3} label={O.candidates}>
        <PanelHead title={O.candidates} />
        <div className="chips wrap">{(['assistant', 'director', 'fitness', 'doctor', 'psychologist', 'scout'] as StaffRole[]).map((r) => <button key={r} className="chip" aria-pressed={hire === r} onClick={() => setHire(hire === r ? null : r)}>{O.roles[r]}</button>)}</div>
        {hire && (
          <div className="rows">
            {c.ops.staff[hire] && <div className="row cur"><span className="staff" style={{ background: ROLE_TONE[hire] }} aria-hidden="true">{initialsOf(c.ops.staff[hire]!.name.en)}</span><span className="grow"><span className="name">{c.ops.staff[hire]!.name[lang]}</span><span className="sub">{O.quality(c.ops.staff[hire]!.quality)} · {O.wage(money(c.ops.staff[hire]!.wage))}</span></span></div>}
            {c.ops.staffPool.filter((s) => s.role === hire).map((s) => {
              const b = biasOf(s);
              return (
                <div key={s.id} className="row">
                  <span className="staff" style={{ background: ROLE_TONE[hire] }} aria-hidden="true">{initialsOf(s.name.en)}</span>
                  <span className="grow"><span className="name">{s.name[lang]}</span><span className="sub">{O.quality(s.quality)} · {O.wage(money(s.wage))}{b ? ` · ${O.bias[b]}` : ''}</span></span>
                  <button className="btn btn--ghost btn--sm" onClick={() => void g.run({ type: 'staff.hire', staffId: s.id }, { toast: `${O.hire}: ${s.name[lang]}` })}>{O.hire}</button>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Commercial() {
  const g = useGame();
  const { w, c, x, lang } = g;
  const O = x.office;
  const [price, setPrice] = useState(c.ops.ticket);
  const ref = refPrice(w, g.club);
  const step = ref < 10 ? 0.5 : ref < 30 ? 1 : 2;
  const att = attendance(w, c, price);
  const cap = capacityOf(c.ops);
  return (
    <div className="grid">
      <Panel i={1} label={O.sponsors}>
        <PanelHead title={O.sponsors} />
        <div className="rows">
          {c.ops.sponsors.map((d) => (
            <div key={d.id} className="row">
              <I n="pound" />
              <span className="grow"><span className="name">{d.brand[lang]}</span><span className="sub">{O.slots[d.slot]} · <span className="ltr">{money(d.monthly)}</span>{x.common.perMonth} · {O.months(d.months)}</span></span>
              <button className="btn btn--ghost btn--sm" onClick={() => void g.run({ type: 'sponsor.extend', dealId: d.id }, { toast: x.saved })}>{O.extend}</button>
            </div>
          ))}
        </div>
        {c.ops.sponsorOffers.length > 0 && <div className="section-h"><span className="eyebrow">{O.offers}</span></div>}
        <div className="rows">
          {c.ops.sponsorOffers.map((d) => (
            <div key={d.id} className="row">
              <I n="handshake" />
              <span className="grow"><span className="name">{d.brand[lang]}</span><span className="sub">{O.slots[d.slot]} · <span className="ltr">{money(d.monthly)}</span>{x.common.perMonth} · {O.months(d.months)}</span></span>
              <span className="bid-acts">
                <button className="btn btn--primary btn--sm" disabled={c.ops.sponsors.some((s) => s.slot === d.slot)} onClick={() => void g.run({ type: 'sponsor.sign', dealId: d.id }, { toast: x.saved })}>{O.sign}</button>
                <button className="btn btn--ghost btn--sm" onClick={() => void g.run({ type: 'sponsor.haggle', dealId: d.id })}>{O.haggle}</button>
              </span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel i={2} label={O.tickets}>
        <PanelHead title={O.tickets} />
        <Stepper label={O.price} value={price} step={step} min={step} format={(v) => (v < 10 ? `€${v.toFixed(1)}` : money(Math.round(v)))} onChange={(v) => setPrice(Math.round(v * 10) / 10)} />
        <p className="small muted">{O.attendance(att.toLocaleString(), cap.toLocaleString())}</p>
        <Meter v={(att / Math.max(1, cap)) * 100} />
        <button className="btn btn--primary btn--sm" disabled={price === c.ops.ticket} onClick={() => void g.run({ type: 'ticket.set', price }, { toast: x.saved })}>{O.setPrice}</button>
      </Panel>
    </div>
  );
}
