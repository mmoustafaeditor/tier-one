// The officials on screen (gf-ref): the referee's line in the header, the incident → decision → VAR → ruling banner,
// timeline icons for cards, penalties and VAR, the commentary feed, and the officials' panel of the match report.
// Nothing here decides anything: it reads the incidents and the event log the engine wrote (sim/engine/referee.ts).
import type { LiveMatch } from '../sim/match';
import type { Incident } from '../sim/engine/referee';
import { strictBand } from '../sim/engine/referee';
import type { Aftermath } from '../sim/aftermath';
import type { KeyMoment } from '../sim/record';
import { commentary } from './commentary';
import { RF, type RefStrings } from '../lang-ref-all';
import { useGame } from './game';
import { I } from './kit';
import '../styles/officials.css';

export const refOf = (g: ReturnType<typeof useGame>) => RF[g.ui];

// ---------- the referee ----------
export function RefLine({ m }: { m: LiveMatch }) {
  const g = useGame();
  const R = refOf(g);
  if (!m.ref) return null;
  const band = strictBand(m.ref.strict);
  return (
    <span className="refline" title={R.refLine(m.ref.n[g.lang], R.strict[band], m.ref.var)}>
      <I n="whistle" size="sm" /><b>{m.ref.n[g.lang]}</b><span className={`strict s${band}`}>{R.strict[band]}</span>{m.ref.var && <span className="varchip">{R.varOn}</span>}
    </span>
  );
}

// ---------- the banner: incident → the referee's call → VAR → final ruling ----------
export interface Phase { t: string; sub?: string; cls: string }
export interface Banner { ph: Phase[]; i: number; adj?: [number, number]; side: 0 | 1 }

export function bannerOf(inc: Incident[], R: RefStrings, name: (id: string) => string, ref: string): Banner | null {
  const S = R.seq;
  const why = (w?: string) => (w ? S.why[w] ?? w : '');
  const pick = inc.find((x) => x.rev) ?? inc.find((x) => x.fin.card === 'R' || x.fin.card === 'YR') ?? inc.find((x) => x.fin.d === 'pen');
  if (!pick) return null;
  const x = pick;
  const check: Phase = x.rev?.t === 'ofr' ? { t: S.ofr, sub: ref, cls: 'var ofr' } : { t: S.check, cls: 'var' };
  const cardPhase = (c: string | undefined, to?: string): Phase => (c === 'R' ? { t: S.red, sub: name(to ?? x.by), cls: 'red' } : c === 'YR' ? { t: S.y2, sub: name(to ?? x.by), cls: 'red' } : { t: S.yellow, sub: name(to ?? x.by), cls: 'yel' });
  if (x.k === 'goal' && x.rev) {
    const first: Phase = x.call.d === 'goal' ? { t: S.goal, sub: name(x.by), cls: 'goal' } : { t: S.nogoal, sub: why(x.call.why), cls: 'no' };
    const last: Phase = x.fin.d === 'goal' ? (x.rev.res === 'over' ? { t: S.given, sub: name(x.by), cls: 'goal' } : { t: S.goal, sub: S.stands, cls: 'goal' })
      : { t: S.nogoal, sub: `${why(x.fin.why)}${x.rev.res === 'stands' ? ` · ${S.stands}` : ''}`, cls: 'no' };
    const adj: [number, number] = [0, 0];
    if (x.call.d === 'goal' && x.fin.d !== 'goal') adj[x.side] = 1;
    if (x.call.d !== 'goal' && x.fin.d === 'goal') adj[x.side] = -1;
    return { ph: [first, check, last], i: 0, adj, side: x.side };
  }
  if (x.rev) {
    const w = x.rev.why;
    const att = (1 - x.side) as 0 | 1;
    if (w === 'pen') return { ph: [{ t: S.pen, sub: name(x.vs ?? ''), cls: 'pen' }, check, { t: S.pen, sub: S.stands, cls: 'pen' }], i: 0, side: att };
    if (w === 'foul' || w === 'hand') return { ph: [{ t: S.playOn, cls: '' }, check, { t: S.penGiven, sub: why(w), cls: 'pen' }], i: 0, side: att };
    if (w === 'outside') return { ph: [{ t: S.pen, cls: 'pen' }, check, { t: S.fk, sub: S.over, cls: '' }], i: 0, side: att };
    if (w === 'dive') return { ph: [{ t: S.pen, cls: 'pen' }, check, { t: S.noPen, sub: why('dive'), cls: 'no' }], i: 0, side: att };
    if (w === 'redDown') return { ph: [cardPhase('R', x.call.to), check, { t: S.down, sub: name(x.by), cls: 'yel' }], i: 0, side: x.side };
    if (w === 'redUp' || w === 'violent') return { ph: [x.call.card ? cardPhase(x.call.card, x.call.to) : { t: S.playOn, cls: '' }, check, { t: S.up, sub: name(x.by), cls: 'red' }], i: 0, side: x.side };
    if (w === '2y') return { ph: [cardPhase('YR', x.call.to), check, { t: S.rescind, sub: name(x.call.to ?? x.by), cls: 'yel' }], i: 0, side: x.side };
    if (w === 'id') return { ph: [cardPhase(x.call.card, x.call.to), check, { t: S.id, sub: name(x.fin.to ?? x.by), cls: 'yel' }], i: 0, side: x.side };
  }
  if (x.fin.card === 'R' || x.fin.card === 'YR') return { ph: [cardPhase(x.fin.card, x.fin.to)], i: 0, side: x.side };
  return { ph: [{ t: S.pen, sub: name(x.vs ?? ''), cls: 'pen' }], i: 0, side: (1 - x.side) as 0 | 1 };
}

export function VarBanner({ b, mine }: { b: Banner; mine: boolean }) {
  const p = b.ph[b.i];
  return (
    <div className={`refbanner ${p.cls}${mine ? ' mine' : ''}`} role="status" aria-live="assertive">
      {b.ph.length > 1 && <span className="steps">{b.ph.map((_, k) => <i key={k} className={k <= b.i ? 'on' : ''} />)}</span>}
      <b>{p.t}</b>
      {p.sub && <span>{p.sub}</span>}
    </div>
  );
}

// ---------- timeline icons ----------
export function MomentIcon({ kind }: { kind: KeyMoment['kind'] }) {
  if (kind === 'yellow') return <span className="cardi y" aria-hidden="true" />;
  if (kind === 'y2') return <span className="cardi y2" aria-hidden="true"><i /><i /></span>;
  if (kind === 'red') return <span className="cardi r" aria-hidden="true" />;
  if (kind === 'var') return <span className="vari" aria-hidden="true">VAR</span>;
  if (kind === 'penGiven') return <span className="peni" aria-hidden="true"><i /></span>;
  if (kind === 'nogoal') return <I n="x" size="sm" />;
  return null;
}
export function momentText(k: KeyMoment, R: RefStrings, pn: string, ref: string): [string, string] | null {
  const E = R.ev;
  if (k.kind === 'yellow') return [E.yellow(pn), E.yellowSub];
  if (k.kind === 'y2') return [E.y2(pn), E.y2Sub];
  if (k.kind === 'penGiven') return [E.pen(pn), k.note === 'hand' ? E.penHand : E.penSub];
  if (k.kind === 'var') { const [what, , res, why] = (k.note ?? '').split(':'); return [E.var(R.seq.why[what === 'goal' ? why : what] ?? what), `${res === 'over' ? R.seq.over : R.seq.stands}`]; }
  if (k.kind === 'nogoal') return [E.nogoal(pn), R.seq.why[k.note ?? ''] ?? ''];
  if (k.kind === 'red' && k.note) return null;
  void ref;
  return null;
}

// ---------- the commentary feed ----------
export function CommentaryFeed({ m, name, club, n = 14, hideNow }: { m: LiveMatch; name: (id: string) => string; club: (i: 0 | 1) => string; n?: number; hideNow?: boolean }) {
  const g = useGame();
  const lines = commentary(m, g.t, name, club, refOf(g), m.ref ? m.ref.n[g.lang] : '')
    .filter((l) => !hideNow || !l.ev || !(l.min === m.minute && (l.plus ?? 0) === (m.plus ?? 0))).slice(0, n);
  return (
    <div className="cm-feed">
      {lines.map((l, i) => (
        <div key={i} className={`cm-line${l.cls}`}><span className="min ltr">{l.min}{l.plus ? `+${l.plus}` : ''}′</span><p>{l.text}</p></div>
      ))}
    </div>
  );
}

// ---------- the report ----------
export function OfficialsPanel({ a, me, home, away }: { a: Aftermath; me: 0 | 1; home: string; away: string }) {
  const g = useGame();
  const R = refOf(g);
  const r = a.ref;
  if (!r) return null;
  const band = strictBand(r.strict);
  const name = (i: 0 | 1) => (i === 0 ? home : away);
  return (
    <div className="officials">
      <div className="between"><span className="refline"><I n="whistle" size="sm" /><b>{r.n[g.lang]}</b><span className={`strict s${band}`}>{R.strict[band]}</span></span>{r.var ? <span className="varchip">{R.varOn}</span> : <span className="small muted">{R.report.noVar}</span>}</div>
      <div className="ofstats">
        <div><span>{R.report.fouls}</span><b className="ltr">{r.fouls[0]}–{r.fouls[1]}</b></div>
        <div><span>{R.report.cards}</span><b className="ltr">{a.cards.filter((c) => c.k === 'Y').length} <span className="cardi y" /> {a.cards.filter((c) => c.k !== 'Y').length} <span className="cardi r" /></b></div>
        <div><span>{R.report.pens}</span><b>{a.pensGiven}</b></div>
        {r.var && <div><span>{R.report.checks}</span><b>{r.checks}</b></div>}
        {r.var && <div><span>{R.report.reviews}</span><b>{r.reviews}</b></div>}
        {r.var && <div><span>{R.report.changed}</span><b>{r.changed}</b></div>}
        {a.added && <div><span>{R.report.added}</span><b className="ltr">{R.report.addedFmt(a.added[0] ?? 0, a.added[1] ?? 0)}</b></div>}
      </div>
      <div className="ofcards">
        {a.cards.length === 0 && <p className="small muted">{R.report.noCards}</p>}
        {a.cards.map((c, i) => (
          <span key={i} className={`ofcard${c.side === me ? ' ours' : ''}`}>
            <span className={`cardi ${c.k === 'Y' ? 'y' : c.k === 'YR' ? 'y2' : 'r'}`}>{c.k === 'YR' && <><i /><i /></>}</span>
            <span className="ltr">{c.min}{c.plus ? `+${c.plus}` : ''}′</span> {c.pn[g.lang]} <small className="muted">{name(c.side)}</small>
          </span>
        ))}
        {a.vars.filter((v) => !v.note.endsWith(':stands:goal') && !v.note.startsWith('pen:')).map((v, i) => (
          <span key={`v${i}`} className="ofcard"><span className="vari">VAR</span><span className="ltr">{v.min}{v.plus ? `+${v.plus}` : ''}′</span> {R.varLine(v.note, r.n[g.lang], v.pn[g.lang])}</span>
        ))}
      </div>
    </div>
  );
}
