// Recruitment's items on Today (V2_DESIGN §2.3): only real decisions, each with the director's call pre-picked, what
// every choice costs, a deadline and where "Open" lands (the negotiation room for that exact deal).
//  - "Bid answered": their counter, their refusal, or the fee agreed and the agent waiting
//  - "Agent wants an answer by Friday": personal terms running out of time
//  - "Rival bid for your target": another club is in while our bid waits
//  - a loan's minutes clause about to break, and a recall when a borrower broke ours
// Bids for OUR players (need-driven AI bids included) stay the existing offer cards (decisions.ts), titled as rival bids.
import type { Career } from '../../model/types';
import type { Choice, Decision, Fx } from '../decisions';
import { playerOf, type World } from '../world';
import { levelOf } from '../delegation';
import { windowOf } from '../windows';
import { loanOf } from '../loans';
import { roundFee } from '../season';
import { rcOf, tickOf, type Negotiation } from './state';
import { dealCost, demandFor, lastCounter } from './deals';
import { directorCall, CLAUSE_FROM, CLAUSE_NEED } from './tick';
import { spendingRoom } from './money';
import { nominal } from './club';

const daysTo = (c: Career, t: number) => ({ key: 'days' as const, n: Math.max(1, t - tickOf(c) + 1) });

export function recruitDecisions(w: World, c: Career): Decision[] {
  if (c.sacked) return [];
  const lvl = levelOf(c, 'recruitment');
  if (lvl === 'staff' && c.ops?.staff.director) return loanCards(w, c);
  const rc = rcOf(c);
  const out: Decision[] = [];
  const now = tickOf(c);
  for (const n of rc.negs) {
    if (n.stage !== 'club' && n.stage !== 'terms') continue;
    const p = playerOf(w, n.playerId);
    if (!p) continue;
    const call = directorCall(w, c, n);
    const base = { dept: 'recruitment' as const, role: 'director' as const, icon: 'handshake', open: { to: 'talks' as const, id: n.id } };
    const room = spendingRoom(w, c, n.id); // F03: this deal's own reserved fee is not counted twice
    if (n.stage === 'club' && n.rival && n.answerAt !== null) {
      const top = roundFee(n.rival.fee * 1.05);
      out.push({
        ...base, id: `rc:rival:${n.id}:${n.seen ?? 0}`, kind: 'rival' as Decision['kind'],
        title: { key: 'rc.rival', pn: p.name, n: n.rival.fee, club: n.rival.club, p: p.id, s: String(n.answerAt) },
        advice: { key: call === 'pay' ? 'rc.adv.top' : 'rc.adv.letGo', pn: p.name, n: top },
        due: daysTo(c, n.answerAt),
        choices: [
          { id: 'top', key: 'rc.top', n: top, cmds: [{ type: 'rc.topRival', negId: n.id }], pick: call === 'pay', fx: [fee(top), roomFx(room - top)] },
          { id: 'go', key: 'rc.letGo', cmds: [{ type: 'rc.withdraw', negId: n.id }], pick: call !== 'pay', fx: [{ tone: 'warn', icon: 'alert', key: 'rc.fx.rivalGets', s: n.rival.club }] },
        ],
        score: 82,
      });
      continue;
    }
    if (n.stage === 'club' && n.answerAt === null) {
      const last = n.bids[n.bids.length - 1];
      if (!last || last.by !== 'them') continue;
      if (n.counter !== null) {
        out.push({
          ...base, id: `rc:ans:${n.id}:${n.seen ?? 0}`, kind: 'bidAnswer' as Decision['kind'],
          title: { key: 'rc.counter', pn: p.name, n: n.counter, club: n.from, p: p.id },
          advice: { key: call === 'pay' ? 'rc.adv.pay' : 'rc.adv.walk', pn: p.name, n: n.counter },
          due: windowDue(c),
          choices: [
            { id: 'pay', key: 'rc.pay', n: n.counter, cmds: [{ type: 'rc.payCounter', negId: n.id }], pick: call === 'pay', fx: [fee(n.counter), roomFx(room - n.counter)] },
            { id: 'talk', key: 'rc.improve', cmds: [], fx: [{ tone: 'plain', icon: 'handshake', key: 'rc.fx.patience', n: n.clubPatience }], open: { to: 'talks', id: n.id } },
            { id: 'walk', key: 'rc.walk', cmds: [{ type: 'rc.withdraw', negId: n.id }], pick: call === 'walk', fx: [{ tone: 'plain', icon: 'x', key: 'rc.fx.noDeal' }] },
          ],
          score: 72,
        });
      } else {
        out.push({
          ...base, id: `rc:ans:${n.id}:${n.seen ?? 0}`, kind: 'bidAnswer' as Decision['kind'],
          title: { key: last.answer === 'insult' ? 'rc.insulted' : 'rc.rejected', pn: p.name, club: n.from, p: p.id, n: nominal([...n.bids].reverse().find((b) => b.by === 'us')!.offer!) },
          advice: { key: 'rc.adv.rejected', pn: p.name, n: n.clubPatience },
          due: windowDue(c),
          choices: [
            { id: 'talk', key: 'rc.improve', cmds: [], pick: true, fx: [{ tone: n.clubPatience <= 1 ? 'warn' : 'plain', icon: 'handshake', key: 'rc.fx.patience', n: n.clubPatience }], open: { to: 'talks', id: n.id } },
            { id: 'walk', key: 'rc.walk', cmds: [{ type: 'rc.withdraw', negId: n.id }], fx: [{ tone: 'plain', icon: 'x', key: 'rc.fx.noDeal' }] },
          ],
          score: 60,
        });
      }
      continue;
    }
    if (n.stage === 'terms' && n.due !== null) {
      const d = demandFor(w, c, n);
      if (!d) continue;
      const cost = dealCost(w, c, n, d);
      const counter = lastCounter(n);
      const fresh = !n.rounds.length;
      const urgent = n.due - now <= 1;
      // A fresh agreement always asks; a talk already under way comes back when the agent's deadline is close.
      if (!fresh && !urgent) continue;
      const choices: Choice[] = [
        { id: 'meet', key: 'rc.meet', cmds: [{ type: 'rc.meet', negId: n.id, which: 'demand' }], pick: call === 'meet', fx: [wageFx(d.wage), { tone: 'plain', icon: 'pound', key: 'rc.fx.fees', n: cost.agent + cost.signOn }, roomFx(cost.roomAfter)] },
      ];
      if (counter) {
        const cc = dealCost(w, c, n, counter);
        choices.push({ id: 'counter', key: 'rc.takeCounter', cmds: [{ type: 'rc.meet', negId: n.id, which: 'counter' }], pick: call === 'counter', fx: [wageFx(counter.wage), roomFx(cc.roomAfter)] });
      }
      choices.push({ id: 'talk', key: 'rc.talk', cmds: [], pick: call === 'wait', fx: [{ tone: 'plain', icon: 'chat', key: 'rc.fx.rounds', n: n.patience }], open: { to: 'talks', id: n.id } });
      choices.push({ id: 'walk', key: 'rc.walk', cmds: [{ type: 'rc.withdraw', negId: n.id }], pick: call === 'walk', fx: [{ tone: 'plain', icon: 'x', key: 'rc.fx.noDeal' }] });
      if (!choices.some((x) => x.pick)) choices[choices.length - 2].pick = true;
      out.push({
        ...base, id: `rc:terms:${n.id}:${n.seen ?? 0}:${urgent ? 'u' : 'f'}`, kind: 'agent' as Decision['kind'],
        title: { key: fresh && n.from !== 'free' ? 'rc.agreed' : 'rc.agentDue', pn: p.name, club: n.from, p: p.id, n: n.fee ? nominal(n.fee) : 0, s: String(n.due) },
        advice: { key: `rc.adv.${call === 'wait' ? 'talk' : call}`, pn: p.name, n: d.wage },
        due: daysTo(c, n.due),
        choices,
        score: urgent ? 84 : 74,
      });
    }
  }
  return [...out, ...loanCards(w, c)];
}

const fee = (n: number): Fx => ({ tone: 'plain', icon: 'pound', key: 'fee', n });
const wageFx = (n: number): Fx => ({ tone: 'plain', icon: 'pound', key: 'wagesYear', n: n * 12 });
const roomFx = (n: number): Fx => ({ tone: n < 0 ? 'bad' : 'plain', icon: 'market', key: 'rc.fx.room', n });
const windowDue = (c: Career) => (windowOf(c) ? { key: 'window' as const } : { key: 'week' as const });

function loanCards(w: World, c: Career): Decision[] {
  const rc = rcOf(c);
  const out: Decision[] = [];
  for (const [id, t] of Object.entries(rc.loans)) {
    const p = playerOf(w, id);
    const l = loanOf(c, id);
    if (!p || !l || t.minutes === 'none') continue;
    if (t.to === c.clubId && !t.broken) {
      const days = c.round - t.days0;
      let next = Math.max(CLAUSE_FROM, Math.ceil((days + 1) / 4) * 4);
      if (next <= days) next += 4;
      const left = next - days;
      const need = Math.ceil(CLAUSE_NEED[t.minutes] * next);
      const have = (c.stats[id]?.[0] ?? 0) - t.apps0;
      if (left <= 2 && have < need && have + left >= need) {
        out.push({
          id: `rc:clause:${id}:${c.season}:${next}`, kind: 'loanClause' as Decision['kind'], dept: 'matchprep', role: 'assistant', icon: 'doc',
          title: { key: 'rc.clauseRisk', pn: p.name, club: t.from, p: id, n: need - have },
          advice: { key: 'rc.adv.clause', pn: p.name, club: t.from },
          due: { key: 'kickoff' },
          choices: [
            { id: 'play', key: 'rc.playHim', cmds: [], pick: true, fx: [{ tone: 'good', icon: 'handshake', key: 'rc.fx.parentHappy' }], open: { to: 'tactics' } },
            { id: 'risk', key: 'rc.riskIt', cmds: [], fx: [{ tone: 'bad', icon: 'alert', key: 'rc.fx.parentAngry', s: t.from }] },
          ],
          score: 58, open: { to: 'player', id },
        });
      }
    }
    if (t.from === c.clubId && t.broken && windowOf(c)) {
      out.push({
        id: `rc:recall:${id}:${c.season}:${c.round}`, kind: 'recall' as Decision['kind'], dept: 'development', role: 'director', icon: 'grow',
        title: { key: 'rc.recallQ', pn: p.name, club: t.to, p: id },
        advice: { key: 'rc.adv.recall', pn: p.name, club: t.to },
        due: { key: 'window' },
        choices: [
          { id: 'recall', key: 'rc.recall', cmds: [{ type: 'rc.recall', playerId: id }], pick: true, fx: [{ tone: 'plain', icon: 'squad', key: 'rc.fx.back' }] },
          { id: 'leave', key: 'rc.leave', cmds: [], fx: [{ tone: 'warn', icon: 'clock', key: 'rc.fx.benchWarm' }] },
        ],
        score: 52, open: { to: 'player', id },
      });
    }
  }
  return out;
}

export const negDecision = (n: Negotiation) => `rc:${n.id}`;
