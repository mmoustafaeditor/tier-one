// Every sheet in the office: an offer for a player, a new deal, bids for yours, what the staff did, the desk before
// Continue, the analyst's report, renaming, and the end-of-season summary. Sheets only collect terms; the command
// decides (and refuses with a reason and, where there is one, the number that would work).
import { useState } from 'react';
import type { LocalizedName, Player } from '../model/types';
import type { SeasonSummary } from '../sim/season';
import { balanceOf } from '../sim/balance';
import { decisions } from '../sim/decisions';
import { askingPrice, renewDemand, wageBillOf, wageDemand, type Role } from '../sim/transfers';
import { playerOf } from '../sim/world';
import { FREE_AGENT } from '../model/types';
import { roundFee } from '../sim/season';
import { Crest, I, Portrait } from './kit';
import { Chips, Sheet, Stepper, Steps } from './shell';
import { useGame, clubOf, cn, money, nm, sn } from './game';
import { titleText } from './Decisions';
import { logText } from './text';
import { Bids } from './Transfers';
import { nextMatch, ageOf } from './util';

export function Sheets({ req, onClose, summary, onSummaryDone, onTakeCalls, onLeave }: {
  req: import('./game').SheetReq | null; onClose: () => void; summary: SeasonSummary | null; onSummaryDone: () => void;
  onTakeCalls: () => void | Promise<void>; onLeave: () => void | Promise<void>;
}) {
  const g = useGame();
  if (summary) return <SummarySheet s={summary} onDone={onSummaryDone} />;
  if (!req) return null;
  switch (req.k) {
    case 'bid': { const p = playerOf(g.w, req.id); return p ? <BidSheet p={p} onClose={onClose} key={p.id} /> : null; }
    case 'renew': { const p = playerOf(g.w, req.id); return p ? <RenewSheet p={p} onClose={onClose} key={p.id} /> : null; }
    case 'offers': return <Sheet label={g.x.bid.offersTitle} onClose={onClose} wide><Bids /></Sheet>;
    case 'staffLog': return <StaffLogSheet onClose={onClose} />;
    case 'desk': return <DeskSheet onClose={onClose} onTake={onTakeCalls} onLeave={onLeave} />;
    case 'report': return <ReportSheet onClose={onClose} />;
    case 'rename': return <RenameSheet kind={req.kind} id={req.id} onClose={onClose} />;
  }
}

const reasonText = (no: Record<string, string>, reason: string) => no[reason] ?? reason;

function BidSheet({ p, onClose }: { p: Player; onClose: () => void }) {
  const g = useGame();
  const { w, c, x, lang } = g;
  const B = x.bid;
  const bal = balanceOf(c);
  const free = p.clubId === FREE_AGENT;
  const [role, setRole] = useState<Role>(ageOf(p, c.season) <= 21 && p.rating < g.club.reputation ? 'prospect' : 'regular');
  const ask = free ? 0 : askingPrice(w, p, bal.prices);
  const [fee, setFee] = useState(ask);
  const [wage, setWage] = useState(() => wageDemand(w, p, c.clubId, role, bal.wages));
  const [years, setYears] = useState(3);
  const [no, setNo] = useState<{ reason: string; counter?: number } | null>(null);
  const seller = clubOf(w, p.clubId);
  const budgetLeft = g.club.budget - fee;
  const wageLeft = g.club.wageCap - wageBillOf(w, c.clubId) - wage;
  const step = (v: number) => Math.max(1e4, roundFee(v * 0.05));
  const send = async () => {
    const r = await g.run({ type: 'transfer.bid', playerId: p.id, bid: { fee, wage, years, role } }, { toast: false });
    if (r.ok) { g.toast(x.note.signed(nm(p, lang))); onClose(); } else setNo({ reason: r.reason, counter: r.counter });
  };
  return (
    <Sheet label={B.title(nm(p, lang))} onClose={onClose}>
      <div className="sheet-head">
        <Portrait p={p} club={seller} size={56} />
        <div className="grow"><h2 className="h2">{B.title(sn(p, lang))}</h2><span className="small muted">{seller ? <><Crest club={seller} size={14} /> {cn(seller, lang)}</> : x.player.free} · {x.common.pos[p.position]} · {ageOf(p, c.season)}</span></div>
      </div>
      <div className="terms-form">
        <Chips<Role> label={B.role} value={role} onChange={(r) => { setRole(r); setWage(wageDemand(w, p, c.clubId, r, bal.wages)); }}
          options={(['star', 'regular', 'rotation', 'prospect'] as Role[]).map((r) => ({ v: r, label: B.roles[r] }))} />
        {!free && (
          <div className="field-row"><span className="grow"><b>{B.fee}</b><small className="muted">{B.ask(money(ask))}</small></span>
            <Stepper label={B.fee} value={fee} step={step(ask || 1e6)} min={0} onChange={setFee} format={money} /></div>
        )}
        <div className="field-row"><span className="grow"><b>{B.wage}</b><small className="muted">{B.demand(money(wageDemand(w, p, c.clubId, role, bal.wages)))}</small></span>
          <Stepper label={B.wage} value={wage} step={step(wage)} min={0} onChange={setWage} format={money} /></div>
        <div className="field-row"><span className="grow"><b>{B.years}</b></span>
          <Steps label={B.years} value={years - 1} options={['1', '2', '3', '4', '5']} onChange={(v) => setYears(v + 1)} /></div>
        <div className="afford">
          <span className="eyebrow">{B.afford}</span>
          <div className="between"><span>{B.budgetLeft}</span><b className={budgetLeft < 0 ? 'bad' : ''}>{money(budgetLeft)}</b></div>
          <div className="between"><span>{B.wageLeft}</span><b className={wageLeft < 0 ? 'bad' : ''}>{money(wageLeft)}</b></div>
        </div>
        {no && (
          <div className="refusal" role="alert">
            <I n="alert" size="sm" /><span className="grow">{reasonText(B.no, no.reason)}</span>
            {no.counter ? <button className="btn btn--ghost btn--sm" onClick={() => { if (no.reason === 'wage') setWage(no.counter!); else setFee(no.counter!); setNo(null); }}>{B.counter(money(no.counter))}</button> : null}
          </div>
        )}
      </div>
      <div className="sheet-actions">
        <button className="btn btn--ghost" onClick={onClose}>{x.common.cancel}</button>
        <button className="btn btn--accent" onClick={() => void send()}><I n="handshake" size="sm" />{B.send}</button>
      </div>
    </Sheet>
  );
}

function RenewSheet({ p, onClose }: { p: Player; onClose: () => void }) {
  const g = useGame();
  const { c, x, lang } = g;
  const B = x.bid;
  const d = renewDemand(p, c.season, balanceOf(c).wages);
  const [wage, setWage] = useState(d.wage);
  const [years, setYears] = useState(Math.min(3, d.maxYears));
  const [no, setNo] = useState<{ reason: string; counter?: number } | null>(null);
  const send = async () => {
    const r = await g.run({ type: 'contract.renew', playerId: p.id, wage, years }, { toast: false });
    if (r.ok) { g.toast(x.note.renewed(nm(p, lang))); onClose(); } else setNo({ reason: r.reason, counter: r.counter });
  };
  return (
    <Sheet label={B.renewTitle(nm(p, lang))} onClose={onClose}>
      <div className="sheet-head">
        <Portrait p={p} club={g.club} size={56} />
        <div className="grow"><h2 className="h2">{B.renewTitle(sn(p, lang))}</h2><span className="small muted">{x.player.contract} · {p.contractUntil} · <span className="ltr">{money(p.wage)}</span>{x.common.perMonth}</span></div>
      </div>
      <div className="terms-form">
        <div className="field-row"><span className="grow"><b>{B.wage}</b><small className="muted">{B.demand(money(d.wage))}</small></span>
          <Stepper label={B.wage} value={wage} step={Math.max(1e3, roundFee(d.wage * 0.05))} min={0} onChange={setWage} format={money} /></div>
        <div className="field-row"><span className="grow"><b>{B.years}</b></span>
          <Steps label={B.years} value={years - 1} options={Array.from({ length: Math.max(1, d.maxYears) }, (_, i) => String(i + 1))} onChange={(v) => setYears(v + 1)} /></div>
        {no && (
          <div className="refusal" role="alert">
            <I n="alert" size="sm" /><span className="grow">{reasonText(B.no, no.reason)}</span>
            {no.counter ? <button className="btn btn--ghost btn--sm" onClick={() => { setWage(no.counter!); setNo(null); }}>{B.counter(money(no.counter))}</button> : null}
          </div>
        )}
      </div>
      <div className="sheet-actions">
        <button className="btn btn--ghost" onClick={onClose}>{x.common.cancel}</button>
        <button className="btn btn--accent" onClick={() => void send()}><I n="doc" size="sm" />{B.renewSend}</button>
      </div>
    </Sheet>
  );
}

function StaffLogSheet({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const { w, c, x, lang } = g;
  const log = (c.staffLog ?? []).slice(0, 30);
  return (
    <Sheet label={x.office.log} onClose={onClose} wide>
      <h2 className="h2">{x.office.log}</h2>
      <div className="rows">
        {log.map((l, i) => (
          <div key={i} className="row">
            <I n="check" size="sm" />
            <span className="grow small">{logText(g.t, x, lang, w, l)}{l.b ? <span className="tag">{x.office.bias[l.b]}</span> : null}</span>
            <span className="small muted">{x.common.matchday(l.round + 1)}</span>
          </div>
        ))}
        {!log.length && <p className="muted">{x.office.logEmpty}</p>}
      </div>
      <div className="sheet-actions"><button className="btn btn--ghost" onClick={() => { onClose(); g.go({ s: 'club', tab: 3 }); }}>{x.office.staff}</button></div>
    </Sheet>
  );
}

function DeskSheet({ onClose, onTake, onLeave }: { onClose: () => void; onTake: () => void | Promise<void>; onLeave: () => void | Promise<void> }) {
  const g = useGame();
  const ds = decisions(g.w, g.c);
  const D = g.x.desk;
  return (
    <Sheet label={D.title(ds.length)} onClose={onClose}>
      <h2 className="h2">{D.title(ds.length)}</h2>
      <p className="muted">{D.body}</p>
      <ul className="desk-list">
        {ds.map((d) => <li key={d.id}><I n={d.icon} size="sm" />{titleText(g, d)}</li>)}
      </ul>
      <div className="sheet-actions stack">
        <button className="btn btn--accent" onClick={() => void onTake()}><I n="check" size="sm" />{D.take}</button>
        <button className="btn btn--ghost" onClick={() => void onLeave()}>{D.leave}</button>
        <button className="btn btn--ghost" onClick={() => { onClose(); g.go({ s: 'today' }); }}>{D.stay}</button>
      </div>
    </Sheet>
  );
}

function ReportSheet({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const { w, c, x, lang } = g;
  const m = nextMatch(w, c);
  const report = m ? c.scouted?.[m.key] : undefined;
  const opp = report ? clubOf(w, report.opponent) : undefined;
  const using = report && c.tactics?.philosophy === report.plan.philosophy;
  return (
    <Sheet label={x.pre.report} onClose={onClose} wide>
      <div className="sheet-head">
        {opp && <Crest club={opp} size={48} />}
        <div className="grow"><h2 className="h2">{x.pre.report}</h2>{report && <span className="small muted">{cn(opp, lang)} · {report.formation} · {x.tac.styles[report.philosophy]} · {x.pre.accuracy(report.accuracy)}</span>}</div>
      </div>
      {!report ? <p className="muted">{x.tac.noReport}</p> : (
        <>
          <h3 className="h3">{x.pre.threats}</h3>
          <div className="threats">
            {report.threats.map((th) => { const p = playerOf(w, th.id); return p ? <div key={th.id} className="threat"><Portrait p={p} club={opp} size={44} /><div><b>{sn(p, lang)}</b><p className="small">{x.player.attrs[th.attr]} <b className="num">{p.attrs[th.attr]}</b></p></div></div> : null; })}
          </div>
          <h3 className="h3">{x.pre.weak}</h3>
          <div className="threats">
            {report.weak.map((wk) => { const p = playerOf(w, wk.id); return p ? <div key={wk.id} className="threat"><Portrait p={p} club={opp} size={44} /><div><b>{sn(p, lang)}</b><p className="small">{x.pre.weakWhy[wk.why]}</p></div></div> : null; })}
          </div>
          <div className="advice">
            <span className="staff" aria-hidden="true">AN</span>
            <div><div className="who">{x.pre.counter}</div><q>{x.tac.styles[report.plan.philosophy]} · {x.tac.ins.press[1][report.plan.pressing]}</q></div>
          </div>
        </>
      )}
      <div className="sheet-actions">
        <button className="btn btn--ghost" onClick={onClose}>{x.common.done}</button>
        {report && <button className="btn btn--accent" disabled={using} onClick={() => void g.run({ type: 'tactics.preset', philosophy: report.plan.philosophy, pressing: report.plan.pressing, trap: report.plan.trap }, { toast: x.note.tactics })}>{using ? x.pre.using : x.pre.apply}</button>}
      </div>
    </Sheet>
  );
}

function RenameSheet({ kind, id, onClose }: { kind: 'club' | 'player'; id: string; onClose: () => void }) {
  const g = useGame();
  const { w, x } = g;
  const cur: LocalizedName | undefined = kind === 'club' ? clubOf(w, id)?.name : playerOf(w, id)?.name;
  const [en, setEn] = useState(cur?.en ?? '');
  const [ar, setAr] = useState(cur?.ar ?? '');
  if (!cur) return null;
  const ok = en.trim().length >= 2 && en.trim().length <= 30 && ar.trim().length <= 30;
  return (
    <Sheet label={x.player.rename} onClose={onClose}>
      <h2 className="h2">{x.player.rename}</h2>
      <label className="fieldl"><span className="small muted">English / Latin</span><input className="field" dir="ltr" value={en} maxLength={30} onChange={(e) => setEn(e.target.value)} /></label>
      <label className="fieldl"><span className="small muted">العربية</span><input className="field" dir="rtl" lang="ar" value={ar} maxLength={30} onChange={(e) => setAr(e.target.value)} /></label>
      <div className="sheet-actions">
        <button className="btn btn--ghost" onClick={onClose}>{x.common.cancel}</button>
        <button className="btn btn--accent" disabled={!ok} onClick={() => void g.run({ type: 'name.set', kind, id, name: { en: en.trim(), ar: ar.trim() || en.trim() } }, { toast: x.note.done }).then((r) => { if (r.ok) onClose(); })}>{x.common.save}</button>
      </div>
    </Sheet>
  );
}

function SummarySheet({ s, onDone }: { s: SeasonSummary; onDone: () => void }) {
  const g = useGame();
  const { w, c, x, t, lang } = g;
  const S = x.season;
  const r = s.record;
  const label = x.seasonLabel(r.season);
  const club = clubOf(w, r.clubId);
  const up = s.promoted.includes(r.clubId), down = s.relegated.includes(r.clubId);
  return (
    <Sheet label={S.title(label)} onClose={onDone} wide>
      <div className="sheet-head">
        <Crest club={club} size={56} />
        <div className="grow"><span className="eyebrow">{cn(club, lang)}</span><h2 className="h2">{S.title(label)}</h2></div>
      </div>
      <p className="lead">{S.finish(x.place(r.position), t.objective[r.objective].toLowerCase())} <b>{r.met ? S.met : S.missed}</b></p>
      <div className="chips wrap">
        <span className={`tag ${up ? 'tag--good' : down ? 'tag--bad' : ''}`}>{up ? S.up : down ? S.down : S.stay}</span>
        {s.cups.map((cu) => <span key={cu.id} className={`tag${cu.won ? ' tag--good' : ''}`}><I n="star" size="sm" />{cu.name[lang]}</span>)}
      </div>
      {s.topScorer && <p className="small">{x.table.scorers}: <b>{nm(s.topScorer.player, lang)}</b> · {s.topScorer.value}</p>}
      {s.left.length > 0 && <p className="small"><b>{S.left}:</b> {s.left.map((p) => sn(p, lang)).join(', ')}</p>}
      {s.academy.length > 0 && <p className="small"><b>{S.kids}:</b> {s.academy.map((p) => sn(p, lang)).join(', ')}</p>}
      <p className="small muted">{S.retired(s.retired)}</p>
      <div className="sheet-actions"><button className="btn btn--accent" onClick={onDone}>{S.next(x.seasonLabel(c.season))}<I n="arrowr" size="sm" flip={g.rtl} /></button></div>
    </Sheet>
  );
}
