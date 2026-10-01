// V2.9 when there's a press conference, and its questions as Today cards (one card per question, the assistant's
// pick is Measured, which costs nothing; unanswered questions lapse the same way). At most one presser a matchweek:
//   after a controversy in our last match (a red card for us, a defeat by 3+, a lost derby), questions 'blame'/'ref';
//   otherwise before the matchweek's first match if it's a big one (a derby, a top-three clash from matchday 5, a cup
//   final), 'predict', 'star', 'rival'.
import type { Career, Player } from '../model/types';
import type { Choice, Decision, Fx } from './decisions';
import { pressFx, type PressQ, type PressTone } from './press';
import { isDerby } from './rivalry';
import { nextUserMatch, table } from './season';
import { squadOf, type World } from './world';

const avg = (c: Career, id: string) => { const r = c.ratings?.[id]; return r && r[1] >= 3 ? r[0] / r[1] : null; };

export interface PresserPlan { id: string; kind: 'big' | 'after'; opp: string; qs: { q: PressQ; named?: Player }[] }

export function presserOf(w: World, c: Career): PresserPlan | null {
  const squad = squadOf(w, c.clubId);
  const last = c.matches?.[0];
  // One presser a matchweek: once a match of this matchweek is played (a cup tie before the league game), that's it.
  if (last && last.season === c.season && last.round === c.round) return null;
  if (last && last.season === c.season && last.round === c.round - 1) {
    const k = last.home === c.clubId ? 0 : 1;
    const opp = k === 0 ? last.away : last.home;
    const d = last.goals[k] - last.goals[1 - k];
    const red = last.cards?.find((x) => x.side === k && x.k !== 'Y');
    const lost = d <= -3 || (d < 0 && isDerby(c.clubId, opp));
    if (red || lost) {
      const qs: PresserPlan['qs'] = [];
      if (lost) {
        // The player the press will ask about: the one sent off, else the worst-rated regular this season.
        const sentOff = red ? squad.find((p) => p.name.en === red.pn.en) : undefined;
        const worst = [...squad].filter((p) => avg(c, p.id) !== null).sort((a, b) => avg(c, a.id)! - avg(c, b.id)!)[0];
        qs.push({ q: 'blame', named: sentOff ?? worst });
      }
      if (red) qs.push({ q: 'ref' });
      return { id: `press:${last.key}`, kind: 'after', opp, qs };
    }
  }
  const m = nextUserMatch(w, c);
  if (!m) return null;
  const k = m.sides[0].clubId === c.clubId ? 0 : 1;
  const opp = m.sides[1 - k].clubId;
  const derby = isDerby(c.clubId, opp);
  const cup = m.cup ? c.cups[m.cup] : undefined;
  const final = !!cup && !m.group && cup.days.indexOf(c.round) === cup.days.length - 1;
  let clash = false;
  if (!m.cup && c.round >= 5) {
    const lid = w.clubs.find((x) => x.id === c.clubId)!.leagueId;
    const top = table(w, c, lid).slice(0, 3).map((r) => r.clubId);
    clash = top.includes(c.clubId) && top.includes(opp);
  }
  if (!derby && !final && !clash) return null;
  const star = [...squad].filter((p) => !p.injured && avg(c, p.id) !== null).sort((a, b) => avg(c, b.id)! - avg(c, a.id)!)[0]
    ?? [...squad].sort((a, b) => b.rating - a.rating)[0];
  const qs: PresserPlan['qs'] = [{ q: 'predict' }, { q: 'star', named: star }];
  if (derby) qs.push({ q: 'rival' });
  return { id: `press:${m.key}`, kind: 'big', opp, qs };
}

const TONES: Record<PressQ, PressTone[]> = { predict: ['measured', 'confident', 'deflect'], star: ['measured', 'confident', 'deflect'], rival: ['measured', 'confident', 'deflect'], blame: ['measured', 'confident', 'deflect', 'name'], ref: ['measured', 'confident', 'deflect'] };

function fxOf(q: PressQ, tone: PressTone, named?: Player): Fx[] {
  const f = pressFx(q, tone, named);
  const out: Fx[] = [];
  const sign = (n: number) => (n > 0 ? 'good' : 'bad') as Fx['tone'];
  if (f.squad) out.push({ tone: sign(f.squad), icon: 'chat', key: 'pr.squad', n: f.squad });
  if (f.morale) out.push({ tone: sign(f.morale), icon: 'chat', key: 'pr.morale', n: f.morale });
  if (f.trust) out.push({ tone: sign(f.trust), icon: 'handshake', key: 'pr.trust', n: f.trust });
  if (f.board) out.push({ tone: sign(f.board), icon: 'club', key: 'pr.board', n: f.board });
  if (f.fans) out.push({ tone: sign(f.fans), icon: 'star', key: 'pr.fans', n: f.fans });
  if (f.claim) out.push({ tone: 'warn', icon: 'alert', key: 'pr.claim' });
  if (!out.length) out.push({ tone: 'plain', icon: 'check', key: 'pr.safe' });
  return out;
}

export function pressDecisions(w: World, c: Career): Decision[] {
  const plan = presserOf(w, c);
  if (!plan) return [];
  return plan.qs.map(({ q, named }, i): Decision => ({
    id: `${plan.id}:${q}`, kind: 'presser', dept: null, role: 'assistant', icon: 'chat',
    title: { key: `pr.q.${q}`, club: plan.opp, pn: named?.name, n: i + 1, s: plan.kind },
    advice: { key: 'pr.adv', s: q },
    due: plan.kind === 'big' ? { key: 'kickoff' } : { key: 'days', n: 1 },
    choices: TONES[q].filter((t) => t !== 'name' || named).map((tone): Choice => ({
      id: tone, key: `pr.${q}.${tone}`, pn: named?.name, pick: tone === 'measured',
      cmds: [{ type: 'press.answer', q, tone, pid: named?.id, opp: plan.opp }], fx: fxOf(q, tone, named),
    })),
    score: 61 - i,
  }));
}
