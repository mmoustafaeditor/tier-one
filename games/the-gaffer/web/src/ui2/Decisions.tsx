// One decision card: the situation, the staff member's call in their own voice, the choices with what each costs,
// the staff pick marked (never forced), one tap to resolve. Swiping the card right takes the staff pick.
import { useRef, useState } from 'react';
import type { Decision, Choice, Fx, Ref } from '../sim/decisions';
import type { StaffRole } from '../model/types';
import { fmt, type FormationId } from '../sim/tactics';
import { biasOf } from '../sim/delegation';
import { I, initialsOf } from './kit';
import { useGame, clubOf, cn, money, type Game } from './game';
import { isRoom, roomAdvice, roomChoice, roomFx, roomTag, roomTitle } from './roomText';
import { Y } from '../lang-youth-all';
import { R } from '../lang-recruit-all';
import { rcAdvice, rcChoice, rcFx, rcTitle } from './recruitText';

const TONE: Record<string, string> = { offer: 'tag--club', condition: 'tag--bad', contract: 'tag--club', staff: '', job: 'tag--good', tape: '', focus: '', deadline: 'tag--warn',
  talk: '', request: 'tag--bad', promise: 'tag--warn', armband: 'tag--club', clause: 'tag--bad',
  bidAnswer: 'tag--club', agent: 'tag--club', rival: 'tag--warn', loanClause: 'tag--warn', recall: '',
  risk: 'tag--bad', rush: 'tag--bad', intake: 'tag--good', ready: 'tag--good', loanee: '', benched: 'tag--warn', full: 'tag--warn', ageout: '' };
const KIND_ICON: Record<string, string> = { offer: 'market', condition: 'medic', contract: 'doc', staff: 'chat', job: 'club', tape: 'eye', focus: 'bolt', deadline: 'clock',
  talk: 'chat', request: 'alert', promise: 'handshake', armband: 'star', clause: 'pound',
  bidAnswer: 'handshake', agent: 'chat', rival: 'alert', loanClause: 'doc', recall: 'grow' };
const ROLE_TONE: Record<StaffRole, string> = { assistant: '#0E4F47', director: '#0B3B5C', fitness: '#5A3A8A', doctor: '#7A2E3A', psychologist: '#3F5A1E', scout: '#8A5A12' };

const pnOf = (g: Game, r: { pn?: { en: string; ar: string } }) => (r.pn ? r.pn[g.lang] || r.pn.en : '');
const clubName = (g: Game, id?: string) => cn(id ? clubOf(g.w, id) : undefined, g.lang);
const call = (f: ((...a: any[]) => string) | undefined, ...a: unknown[]) => (f ? f(...a) : '');

// v2.6 training & pathway cards (sim/youthDecisions.ts) and their staff proposals: copy in lang-youth*.ts.
const posName = (g: Game, s?: string) => (s ? (g.x.common.posLong as Record<string, string>)[s] ?? s : '');
function youthTitle(g: Game, r: Ref): string {
  const T = Y[g.ui].titles, pn = pnOf(g, r);
  if (r.key === 'y_intake') return call(T[r.key], r.n ?? 0);
  if (r.key === 'y_full') return call(T[r.key], r.n ?? 0, r.s);
  if (r.key === 'y_loanee') return call(T[r.key], pn, r.n ?? 0, clubName(g, r.club));
  if (r.key === 'y_benched') return call(T[r.key], pn, clubName(g, r.club));
  if (r.key === 'ask_y_loan') return call(T[r.key], pn, clubName(g, r.club ?? r.s));
  return call(T[r.key], pn, r.n ?? 0);
}
function youthAdvice(g: Game, r: Ref): string {
  const A = Y[g.ui].advice, pn = pnOf(g, r);
  if (r.key.startsWith('y_intake')) return call(A[r.key], pn, posName(g, r.s), r.n ?? 1);
  return call(A[r.key], pn, r.n ?? 0, r.s ?? '');
}

export function titleText(g: Game, d: Decision): string {
  const r = d.title, T = g.x.dec.titles;
  if (isRoom(r.key)) return roomTitle(g, r);
  if (r.key.startsWith('rc.') || r.key.startsWith('ask_rc')) return rcTitle(g, r); // v2.5 recruitment
  const pn = pnOf(g, r);
  if (r.key.includes('y_')) return youthTitle(g, r);
  switch (r.key) {
    case 'offer': return call(T.offer, clubName(g, r.club), money(r.n ?? 0), pn);
    case 'tired': return call(T.tired, pn, r.n);
    case 'expiring': return call(T.expiring, pn, r.n);
    case 'job': return call(T.job, clubName(g, r.club));
    case 'tape': return call(T.tape, clubName(g, r.club));
    case 'focus': return call(T.focus);
    case 'deadline': return call(T.deadline, g.x.dec.groups[r.n ?? 1]);
    case 'ask_signed': return call(T.ask_signed, pn, money(r.n ?? 0));
    case 'ask_renewed': return call(T.ask_renewed, pn, r.n ?? 1);
    case 'ask_capRaise': return call(T.ask_capRaise, pn, money(r.n ?? 0), Number(r.s ?? 1));
    case 'ask_out': return call(T.ask_out, pn, clubName(g, r.club ?? r.s));
    case 'ask_load': return call(T.ask_load, g.x.train.loads[r.n ?? 1].toLowerCase());
    case 'ask_focus': return call(T.ask_focus, (g.x.train.focusNames as Record<string, string>)[r.s ?? ''] ?? r.s);
    case 'ask_plan': return call(T.ask_plan, (g.x.tac.styles as Record<string, string>)[r.s ?? ''] ?? r.s);
    case 'ask_formation': return call(T.ask_formation, fmt((r.s ?? '4-3-3') as FormationId));
    case 'ask_price': return call(T.ask_price, r.s);
    default: return call(T[r.key], pn);
  }
}

function adviceText(g: Game, r: Ref): string {
  const A = g.x.dec.advice;
  if (isRoom(r.key)) return roomAdvice(g, r);
  if (r.key.startsWith('rc.') || r.key.startsWith('why_rc')) return rcAdvice(g, r);
  const pn = pnOf(g, r);
  if (r.key.includes('y_')) return youthAdvice(g, r);
  if (r.key.startsWith('offer_')) return call(A[r.key], pn, money(r.n ?? 0));
  if (r.key.startsWith('rest')) return call(A[r.key], pn, r.n, r.s);
  if (r.key === 'play') return call(A.play, pn, r.n);
  if (r.key === 'renew_yes' || r.key === 'renew_no') return call(A[r.key], pn, r.n, r.s);
  if (r.key === 'tape') return call(A.tape, clubName(g, r.club));
  if (r.key === 'deadline') return call(A.deadline, g.x.dec.groups[r.n ?? 1]);
  if (r.key === 'why_signed') return call(A.why_signed, pn, money(r.n ?? 0));
  if (r.key === 'why_plan') return call(A.why_plan, (g.x.tac.styles as Record<string, string>)[r.s ?? ''] ?? r.s);
  if (r.key === 'why_formation') return call(A.why_formation, fmt((r.s ?? '4-3-3') as FormationId));
  return call(A[r.key], pn);
}

export function choiceText(g: Game, ch: Choice): string {
  const C = g.x.dec.choices;
  if (ch.key.startsWith('rc.')) return rcChoice(g, ch);
  if (isRoom(ch.key)) return roomChoice(g, ch);
  if (ch.key.startsWith('y_')) {
    const Q = Y[g.ui].choices;
    if (ch.key === 'y_ch_spec') return call(Q[ch.key], money(ch.n ?? 0));
    if (ch.key === 'y_ch_loan') return call(Q[ch.key], clubName(g, ch.s));
    if (ch.key === 'y_ch_release') return call(Q[ch.key], pnOf(g, ch));
    return call(Q[ch.key], ch.n ?? 0);
  }
  if (ch.key === 'accept' || ch.key === 'counter') return call(C[ch.key], money(ch.n ?? 0));
  if (ch.key === 'restHim') return call(C.restHim, pnOf(g, ch));
  if (ch.key === 'renewYears') return call(C.renewYears, ch.n);
  return call(C[ch.key]);
}

function fxText(g: Game, f: Fx): string {
  const F = g.x.dec.fx;
  if (f.key.startsWith('rc.')) return rcFx(g, f);
  if (isRoom(f.key)) return roomFx(g, f);
  if (f.key.startsWith('y_')) return call(Y[g.ui].fx[f.key], f.n ?? 0, f.s ?? '');
  if (['cash', 'fee', 'monthly'].includes(f.key)) return call(F[f.key], money(f.n ?? 0));
  if (f.key === 'wagesYear') return call(F.wagesYear, `${(f.n ?? 0) >= 0 ? '+' : '−'}${money(Math.abs(f.n ?? 0))}`);
  return call(F[f.key], f.n);
}

export function DecisionCard({ d, i, onResolve }: { d: Decision; i: number; onResolve: (d: Decision, ch: Choice) => void }) {
  const g = useGame();
  const role = d.role;
  const staff = role ? g.c.ops.staff[role] : undefined;
  const bias = biasOf(staff);
  const card = useRef<HTMLElement>(null);
  const [dx, setDx] = useState(0);
  const x0 = useRef<number | null>(null);
  const pick = d.choices.find((c) => c.pick);
  const dir = g.rtl ? -1 : 1;
  const down = (e: React.PointerEvent) => { if (e.pointerType === 'mouse' || !pick) return; x0.current = e.clientX; };
  const move = (e: React.PointerEvent) => { if (x0.current == null) return; const v = (e.clientX - x0.current) * dir; setDx(v > 8 ? v : 0); };
  const up = () => { if (x0.current == null) return; x0.current = null; if (dx > 96 && pick) onResolve(d, pick); setDx(0); };
  const many = d.choices.length > 2 && d.choices.every((c) => c.fx.length <= 1);
  const due = g.x.dec.due[d.due.key];
  return (
    <article ref={card} className={`panel decision${dx ? ' swiping' : ''}`} style={{ ['--i' as string]: i, transform: dx ? `translateX(${dir * dx * 0.6}px) rotate(${dir * dx * 0.02}deg)` : undefined }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label={titleText(g, d)}>
      <div className="head">
        <div className="grow">
          <span className={`tag ${TONE[d.kind] ?? ''}`}><I n={KIND_ICON[d.kind] ?? d.icon} size="sm" />{(g.x.dec.tag as Record<string, string>)[d.kind] ?? (R[g.ui].tag as Record<string, string>)[d.kind] ?? (Y[g.ui].tag as Record<string, string>)[d.kind] ?? roomTag(g, d.kind)}</span>
          <h3>{titleText(g, d)}</h3>
        </div>
        <span className="due"><I n="clock" size="sm" />{typeof due === 'function' ? due(d.due.n ?? 1) : due}</span>
      </div>
      {d.advice && staff ? (
        <div className="advice">
          <span className="staff" style={{ background: ROLE_TONE[staff.role] }} aria-hidden="true">{initialsOf(staff.name.en)}</span>
          <div>
            <div className="who">{staff.name[g.lang]}, <span>{g.x.office.roles[staff.role]}{bias ? ` · ${g.x.office.bias[bias].toLowerCase()}` : ''}</span></div>
            <q>{adviceText(g, d.advice)}</q>
          </div>
        </div>
      ) : !d.advice ? <p className="dim small">{g.x.dec.yourCall}</p> : null}
      <div className={many ? 'tone' : 'choices'}>
        {d.choices.map((ch) => (
          <button key={ch.id} className={`choice${ch.pick ? ' pick' : ''}`} onClick={() => onResolve(d, ch)}>
            <div className="grow">
              <b>{choiceText(g, ch)}</b>
              {ch.fx.length > 0 && (many
                ? <span>{fxText(g, ch.fx[0])}</span>
                : <div className="fx">{ch.fx.map((f, k) => <span key={k} className={`tag${f.tone === 'plain' ? '' : ` tag--${f.tone}`}`}><I n={f.icon} size="sm" />{fxText(g, f)}</span>)}</div>)}
            </div>
            {ch.pick && !many && <span className="pickmark"><I n="check" size="sm" />{g.x.dec.staffPick}</span>}
          </button>
        ))}
      </div>
      {d.open && <button className="link-btn" onClick={() => {
        const o = d.open!;
        if (o.to === 'player') g.player(o.id); else if (o.to === 'talks') g.go({ s: 'transfers', tab: 2, neg: o.id }); else g.go(o.to === 'tactics' ? { s: 'match', tab: 0 } : o.to === 'office' ? { s: 'club' } : o.to === 'staff' ? { s: 'club', tab: 3 } : { s: o.to });
      }}>{g.x.dec.open} <I n="chev" size="sm" /></button>}
    </article>
  );
}

export function Receipt({ label, onUndo, undo }: { label: string; onUndo?: () => void; undo: string }) {
  return (
    <article className="panel decision resolved" role="status">
      <div className="done">
        <span className="ok"><I n="check" size="sm" /></span>
        <span>{label}</span>
        {onUndo && <button className="undo" onClick={onUndo}>{undo}</button>}
      </div>
    </article>
  );
}
