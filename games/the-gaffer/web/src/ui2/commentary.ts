// Commentary from the match's event log. Each chance is a build-up clause (how it was made, who made it) and a finish
// (goal, save, miss, block); goals add the story of the score. Templates are drawn without repeats within a match
// (a pool is only reused once it has run out), so the same match always reads the same, and two matches read differently.
import type { Strings } from '../i18n';
import type { LiveMatch, MatchEvent } from '../sim/match';
import { fmt, type FormationId } from '../sim/tactics';
import { R_EN, type RefStrings } from '../lang-ref';
import { PERIOD_END, playOver } from '../sim/engine/clock';

export interface Line { min: number; plus?: number; at: number; text: string; cls: string; ev?: MatchEvent }

const fill = (s: string, v: Record<string, string | number | undefined>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0; return h; };

// What a tactical change note ("pressing:2|chase") says in words.
export function describeChange(t: Strings, note: string | undefined, name: (id: string) => string): { what: string; why: string } {
  if (!note) return { what: '', why: '' };
  const [kv, why = ''] = note.split('|');
  const [k, v] = kv.split(':');
  const ins = t.eng.ins as unknown as Record<string, { t: string; o?: string[] }>;
  let what = '';
  if (k === 'formation') what = t.eng.ins.formation + ' ' + fmt(v as FormationId);
  else if (k === 'talk') what = t.talks[+v] ?? '';
  else if (k === 'mentality') what = `${ins.mentality.t}: ${ins.mentality.o![+v + 2]}`;
  else if (k === 'counter' || k === 'waste') what = `${ins[k].t}: ${v === 'true' ? t.eng.ins.on : t.eng.ins.off}`;
  else if (k === 'mark') what = `${ins.mark.t}: ${v && v !== 'null' ? name(v) : t.eng.ins.mark.none}`;
  else if (ins[k]?.o) what = `${ins[k].t}: ${ins[k].o![+v]}`;
  const reason = t.eng.reason[why.split(':')[0]] ?? '';
  return { what, why: reason };
}

// gf-ref: `rs` the officials' copy: the referee's decisions (cards, advantage, penalties, VAR) are read out too.
export function commentary(m: LiveMatch, t: Strings, name: (id: string) => string, club: (i: 0 | 1) => string, rs: RefStrings = R_EN, refName = ''): Line[] {
  const C = t.eng.c;
  const RC = rs.c;
  const ref = refName || (m.ref ? m.ref.n.en : '');
  const used = new Map<string, Set<number>>();
  const seed = hash(m.key);
  let n = 0;
  // Draw a template from a pool without repeats (templates needing a name we don't have are skipped).
  const draw = (pool: string[], cat: string, v: Record<string, string | number | undefined>): string => {
    const ok = pool.map((s, i) => [s, i] as const).filter(([s]) => (s.match(/\{(\w+)\}/g) ?? []).every((p) => v[p.slice(1, -1)] !== undefined && v[p.slice(1, -1)] !== ''));
    const list = ok.length ? ok : pool.map((s, i) => [s, i] as const);
    let u = used.get(cat);
    if (!u || u.size >= list.length) { u = new Set(); used.set(cat, u); }
    const start = (seed + n++ * 7919) % list.length;
    for (let j = 0; j < list.length; j++) {
      const [s, i] = list[(start + j) % list.length];
      if (!u.has(i)) { u.add(i); return fill(s, v); }
    }
    return fill(list[0][0], v);
  };
  const lines: Line[] = [{ min: 0, at: 0, text: ref ? fill(RC.kickoff[hash(m.key) % RC.kickoff.length], { r: ref }) : t.ev.kickoff, cls: '' }];
  const score: [number, number] = [0, 0];
  const goalsBy = new Map<string, number>();
  const ev = m.events;
  for (let k = 0; k < ev.length; k++) {
    const e = ev[k];
    const c = club(e.side);
    const at0 = e.min + (e.plus ? e.plus / 100 : 0);
    const push = (text: string, cls = '') => { lines.push({ min: e.min, ...(e.plus ? { plus: e.plus } : {}), at: at0 + k * 1e-4, text, cls, ev: e }); };
    if (e.kind === 'goal' || e.kind === 'save' || e.kind === 'miss' || e.kind === 'block') {
      const side = (e.kind === 'save' ? 1 - e.side : e.side) as 0 | 1;
      const shooter = e.kind === 'save' ? e.by ?? '' : e.playerId;
      const how = (e.how ?? 'box') as keyof typeof C;
      const pool = (C[how] as string[] | undefined) ?? C.box;
      // The defender beaten in the build-up: the duel just before, same side, same minute.
      let d: string | undefined;
      for (let j = k - 1; j >= 0 && ev[j].min >= e.min - 1; j--) if (ev[j].kind === 'duel' && ev[j].side === side && ev[j].ok) { d = ev[j].vs; break; }
      const kp = e.kind === 'save' ? e.playerId : e.kind === 'goal' ? e.vs : undefined;
      const v = {
        s: name(shooter), a: e.assistId ? name(e.assistId) : undefined, d: d ? name(d) : undefined, k: kp ? name(kp) : undefined,
        b: e.vs && e.kind === 'block' ? name(e.vs) : undefined, c: club(side),
      };
      const setup = cap(draw(pool, 'set:' + how, v));
      const fin = draw(C[e.kind] as string[], 'fin:' + e.kind, v);
      const xg = e.xg !== undefined && e.how !== 'pen' ? ` (xG ${e.xg.toFixed(2)})` : '';
      if (e.kind !== 'goal') { push(`${setup}${t.eng.comma}${fin}${xg}`, e.xg && e.xg >= 0.3 ? ' big' : ''); continue; }
      score[side]++;
      const tally = (goalsBy.get(shooter) ?? 0) + 1;
      goalsBy.set(shooter, tally);
      push(`${setup}${t.eng.comma}${fin}${xg}`, ' goal');
      const A = C.after;
      const o = 1 - side;
      const after = tally === 3 ? draw(A.hat, 'hat', v) : e.min >= 85 && score[side] >= score[o] ? draw(A.late, 'late', v)
        : score[side] === score[o] ? draw(A.equal, 'equal', v) : score[side] === score[o] + 1 && score[o] === 0 && score[side] === 1 ? draw(A.lead, 'lead', v)
        : score[side] < score[o] ? draw(A.back, 'back', v) : score[side] === score[o] + 1 ? draw(A.lead, 'lead', v) : tally === 2 ? draw(A.brace, 'brace', v) : draw(A.more, 'more', v);
      lines.push({ min: e.min, ...(e.plus ? { plus: e.plus } : {}), at: at0 + k * 1e-4 + 5e-5, text: after, cls: ' goal after', ev: e });
    } else if (e.kind === 'yellow' && ref) {
      // A second yellow reads as the sending-off (the red event just after).
      if (ev[k + 1]?.kind === 'red' && ev[k + 1].how === '2y' && ev[k + 1].playerId === e.playerId) continue;
      const pool = e.how === 'waste' ? RC.yellowWaste : e.how === 'dissent' ? RC.yellowDissent : e.how === 'spa' ? RC.yellowSpa : e.how === 'hand' ? RC.yellowHand
        : e.how === 'dogso' ? RC.yellowDogso : e.how === 'dive' ? RC.yellowDive : RC.yellow;
      push(draw(pool, 'y:' + (e.how ?? ''), { s: name(e.playerId), r: ref }), ' card');
    } else if (e.kind === 'red' && ref) {
      const pool = e.how === '2y' ? RC.y2 : e.how === 'dogso' ? RC.redDogso : e.how === 'violent' ? RC.redViolent : e.how === 'hand' ? RC.redHand : RC.red;
      push(draw(pool, 'r:' + (e.how ?? ''), { s: name(e.playerId), r: ref }), ' bad');
    } else if (e.kind === 'yellow') push(draw(e.how === 'waste' ? C.yellowWaste : C.yellow, 'yellow', { s: name(e.playerId) }), ' card');
    else if (e.kind === 'red') push(draw(C.red, 'red', { s: name(e.playerId) }), ' bad');
    else if (e.kind === 'pen') push(draw(e.note === 'hand' ? RC.penHand : RC.pen, 'pen', { r: ref, v: name(e.playerId), s: e.vs ? name(e.vs) : undefined }), ' big');
    else if (e.kind === 'var') push(rs.varLine(e.note ?? '', ref, name(e.playerId)), ' var');
    else if (e.kind === 'nogoal') push(draw(RC.nogoal, 'nogoal', { s: name(e.playerId) }), ' big');
    else if (e.kind === 'foul' && e.note === 'adv' && ref) push(draw(RC.adv, 'adv', { r: ref }));
    else if (e.kind === 'injury') push(draw(C.injury, 'injury', { s: name(e.playerId) }), ' bad');
    else if (e.kind === 'sub') push(draw(C.sub, 'sub', { s: name(e.playerId), a: name(e.inId ?? ''), c }), ' sub');
    else if (e.kind === 'offside') push(draw(C.offside, 'offside', { s: name(e.playerId) }));
    else if (e.kind === 'tactic') {
      if (e.note?.startsWith('talk:')) { push(fill(t.eng.talkLine, { c, what: t.talks[+e.note.slice(5)] ?? '' }), ' tac'); continue; }
      // Several instructions changed at once read as one line.
      if (k > 0 && ev[k - 1].kind === 'tactic' && ev[k - 1].min === e.min && ev[k - 1].side === e.side && !ev[k - 1].note?.startsWith('talk')) {
        const prev = lines[lines.length - 1];
        const { what } = describeChange(t, e.note, name);
        if (prev && prev.ev?.kind === 'tactic') { prev.text = prev.text.replace(/(\.|。)?$/, '') + ` · ${what}.`; continue; }
      }
      const { what, why } = describeChange(t, e.note, name);
      push(fill(t.eng.changeLine, { c, what, why: why ? ` (${why})` : '' }), ' tac');
    }
  }
  // The run of play, when nothing else is being said: who's on top in the last few minutes.
  const mom = m.tl?.mom ?? [];
  for (let min = 12; min < Math.min(90, m.minute); min += 11) {
    if (lines.some((l) => Math.abs(l.min - min) <= 3)) continue;
    const win = mom.slice(Math.max(0, min - 8), min).reduce((a, v) => a + v, 0);
    const pool = Math.abs(win) >= 25 ? C.flow.camp : C.flow.calm;
    const text = fill(pool[(seed + min) % pool.length], { c: club(win > 0 ? 0 : 1) });
    lines.push({ min, at: min - 0.5, text, cls: ' flow' });
  }
  // gf-ref: the board, half-time and full time after the added time, extra time and penalties.
  (m.added ?? []).forEach((n, p) => { if (n !== undefined && n !== null) lines.push({ min: PERIOD_END[p], at: PERIOD_END[p] + 0.001, text: RC.added(n), cls: ' whistle' }); });
  const over = (p: number) => m.minute > PERIOD_END[p] || (m.minute === PERIOD_END[p] && m.added?.[p] !== undefined && (m.plus ?? 0) >= (m.added[p] ?? 0));
  if (over(0)) lines.push({ min: 45, at: 45.5, text: t.ev.half, cls: ' whistle' });
  if (m.minute > 90) lines.push({ min: 90, at: 90.5, text: RC.et, cls: ' whistle' });
  if (m.minute > 105 || over(2)) lines.push({ min: 105, at: 105.5, text: RC.etHalf, cls: ' whistle' });
  if (m.pens) lines.push({ min: m.minute, at: m.minute + 0.6, text: RC.shootout, cls: ' whistle' });
  if (playOver(m)) lines.push({ min: m.minute, at: m.minute + 0.7, text: t.ev.full, cls: ' whistle' });
  return lines.sort((x, y) => y.at - x.at);
}
