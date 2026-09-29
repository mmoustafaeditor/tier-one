// Personal terms: a live talk with the player's agent (V2_DESIGN §3.4). Every player has an agent with a style
// (Fair / Hardball / Greedy: how much he gives and how many rounds he sits through) and ONE priority the player cares
// about most (Money, Role, Ambition or Security), hidden until the scouts know him to 70.
//  - demand package D: wage (his ask × interest × style), years, role, signing-on fee (3 months), release clause
//    (Ambitious players joining a smaller club want one at 2 × value)
//  - utility U: 0.4 on the priority's term, money at least 0.25, the rest even; D scores exactly 1, beating a term up to 1.25
//  - he accepts at U ≥ 1 − flex (Fair 0.08, Hardball 0.03, Greedy 0.05). Replies: Close (≥ 0.92), Not there (≥ 0.75),
//    Insulted (below: −2 patience); an offer worse than your last one costs a further −1. Patience 5/4/4 rounds.
//  - his counter is always one he would sign, so accepting it (or his full demand) is one tap and always works.
import { FREE_AGENT, type Career, type LocalizedName, type Player } from '../../model/types';
import { playerName } from '../../data/names';
import { rngFor } from '../rng';
import { squadOf, type World } from '../world';
import { wageDemand } from '../transfers';
import { balanceOf } from '../balance';
import { roundFee } from '../season';
import { rcOf, type RoleTerm, type Terms, type AgentReply } from './state';
import { isUnhappy } from './ai';

export type Priority = 'money' | 'role' | 'ambition' | 'security';
export type AgentStyle = 'fair' | 'hardball' | 'greedy';
export interface Agent { name: LocalizedName; style: AgentStyle; priority: Priority }

export const PRIORITIES: Priority[] = ['money', 'role', 'ambition', 'security'];
export const FLEX: Record<AgentStyle, number> = { fair: 0.08, hardball: 0.03, greedy: 0.05 };
export const PATIENCE: Record<AgentStyle, number> = { fair: 5, hardball: 4, greedy: 4 };
const STYLE_WAGE: Record<AgentStyle, number> = { fair: 1, hardball: 1.1, greedy: 1.05 };
const FEE_PCT: Record<AgentStyle, number> = { fair: 0.05, hardball: 0.08, greedy: 0.1 };
const FEE_MONTHS: Record<AgentStyle, number> = { fair: 2, hardball: 3, greedy: 4 };
export const ROLE_RANK: Record<RoleTerm, number> = { prospect: 0, rotation: 1, regular: 2, star: 3 };
const ROLE_APPS: Record<RoleTerm, number> = { prospect: 0.25, rotation: 0.45, regular: 0.75, star: 0.9 };

// What a player cares about most, by age: the young want to play, the old want security.
export function priorPriority(age: number): Record<Priority, number> {
  if (age <= 22) return { role: 0.45, ambition: 0.25, money: 0.2, security: 0.1 };
  if (age >= 30) return { security: 0.45, money: 0.3, role: 0.2, ambition: 0.05 };
  return { money: 0.35, ambition: 0.25, role: 0.25, security: 0.15 };
}

export function agentOf(c: Pick<Career, 'seed' | 'season'>, p: Player): Agent {
  const r = rngFor(c.seed, 'agent', p.id);
  const s = r();
  const style: AgentStyle = s < 0.5 ? 'fair' : s < 0.75 ? 'hardball' : 'greedy';
  const prior = priorPriority(c.season - p.birthYear);
  let x = r(), priority: Priority = 'money';
  for (const k of PRIORITIES) { x -= prior[k]; if (x < 0) { priority = k; break; } }
  return { name: playerName(p.nationality, r), style, priority };
}

// ---------- interest: how he sees the move ----------
export const INTEREST_MULT = [0.9, 0.95, 1, 1.1, 1.2] as const; // dream, keen, open, cool, step down
export function interestOf(w: World, c: Career, p: Player): 0 | 1 | 2 | 3 | 4 {
  const us = w.clubs.find((x) => x.id === c.clubId)?.reputation ?? 50;
  const them = p.clubId === FREE_AGENT ? 40 : w.clubs.find((x) => x.id === p.clubId)?.reputation ?? 50;
  // An unsettled player (the dressing room's read, via the adapter) listens to anyone.
  const d = us - them + (rcOf(c).interest[p.id] ?? 0) + (p.clubId !== c.clubId && isUnhappy(p) ? 6 : 0);
  return d >= 10 ? 0 : d >= 3 ? 1 : d > -3 ? 2 : d > -10 ? 3 : 4;
}

// ---------- the demand package ----------
export const maxYears = (age: number) => (age >= 33 ? 1 : age >= 30 ? 2 : 5);
export const idealYears = (age: number) => Math.min(maxYears(age), age <= 26 ? 4 : age <= 29 ? 3 : 2);

export function desiredRole(w: World, c: Career, p: Player): RoleTerm {
  const ours = squadOf(w, c.clubId).filter((x) => x.id !== p.id).map((x) => x.rating).sort((a, b) => b - a);
  const age = c.season - p.birthYear;
  if (p.rating >= (ours[2] ?? 0)) return 'star';
  if (p.rating >= (ours[10] ?? 0)) return 'regular';
  return age <= 21 ? 'prospect' : 'rotation';
}

export interface Demand extends Terms { releaseWanted: boolean }
export function demandOf(w: World, c: Career, p: Player, a: Agent = agentOf(c, p)): Demand {
  const age = c.season - p.birthYear;
  const base = wageDemand(w, p, c.clubId, 'star', balanceOf(c).wages);
  const wage = roundFee(base * INTEREST_MULT[interestOf(w, c, p)] * STYLE_WAGE[a.style]);
  const us = w.clubs.find((x) => x.id === c.clubId)?.reputation ?? 50;
  const them = p.clubId === FREE_AGENT ? 40 : w.clubs.find((x) => x.id === p.clubId)?.reputation ?? 50;
  const releaseWanted = a.priority === 'ambition' && us < them + 5;
  return {
    wage, years: idealYears(age), role: desiredRole(w, c, p), signOn: roundFee(wage * 3), release: releaseWanted ? roundFee(p.marketValue * 2) : null, bonus: 0, releaseWanted,
  };
}

// ---------- utility ----------
const moneyValue = (t: Terms) => t.wage + t.signOn / (12 * Math.max(1, t.years)) + t.bonus * 4 * ROLE_APPS[t.role];

export interface Scores { money: number; role: number; security: number; ambition: number }
export function scores(t: Terms, d: Demand, pr: Priority): Scores {
  // Money below 80 % of his ask hurts twice as fast: nobody signs for half his wage whatever else you promise.
  const m0 = Math.max(0, Math.min(1.25, moneyValue(t) / Math.max(1, moneyValue(d))));
  const money = m0 < 0.8 ? Math.max(0, m0 - (0.8 - m0)) : m0;
  const gap = ROLE_RANK[t.role] - ROLE_RANK[d.role];
  const role = gap >= 0 ? Math.min(1.25, 1 + 0.1 * gap) : Math.max(0, 1 + 0.25 * gap);
  const security = pr === 'security'
    ? (t.years >= d.years ? Math.min(1.25, 1 + 0.08 * (t.years - d.years)) : Math.max(0, 1 - 0.15 * (d.years - t.years)))
    : Math.max(0, 1 - 0.1 * Math.abs(t.years - d.years));
  const ambition = d.release !== null
    ? (t.release === null ? 0.55 : Math.max(0.5, Math.min(1.25, d.release / Math.max(1, t.release))))
    : (t.release !== null ? 1.05 : 1);
  return { money, role, security, ambition };
}
// Playtest tune of §3.4's "0.5 on the primary, the rest even": 0.4 on the primary, and money never below 0.25 (every
// player cares about his wage), the rest split evenly.
export const weights = (pr: Priority): Scores => {
  if (pr === 'money') return { money: 0.4, role: 0.2, security: 0.2, ambition: 0.2 };
  const o = (1 - 0.4 - 0.25) / 2;
  return { money: 0.25, role: pr === 'role' ? 0.4 : o, security: pr === 'security' ? 0.4 : o, ambition: pr === 'ambition' ? 0.4 : o };
};
export function utility(t: Terms, d: Demand, pr: Priority): number {
  const s = scores(t, d, pr), wt = weights(pr);
  return s.money * wt.money + s.role * wt.role + s.security * wt.security + s.ambition * wt.ambition;
}

export const accepts = (u: number, style: AgentStyle) => u >= 1 - FLEX[style] - 1e-9;
export function replyTo(u: number, style: AgentStyle, prevU: number | null): { reply: AgentReply; cost: number } {
  if (accepts(u, style)) return { reply: 'accept', cost: 0 };
  const worse = prevU !== null && u < prevU - 1e-6 ? 1 : 0;
  if (u >= 0.92) return { reply: 'close', cost: 1 + worse };
  if (u >= 0.75) return { reply: 'notThere', cost: 1 + worse };
  return { reply: 'insulted', cost: 2 + worse };
}

// His counter: your terms where he can live with them, his where he can't, and the wage that makes it a deal.
export function counterTo(t: Terms, d: Demand, a: Agent): Terms {
  const target = 1 - FLEX[a.style] / 2;
  let cur: Terms = { ...t };
  const wt = weights(a.priority);
  for (let i = 0; i < 4; i++) {
    const s = scores(cur, d, a.priority);
    const others = s.role * wt.role + s.security * wt.security + s.ambition * wt.ambition;
    const m = (target - others) / wt.money;
    if (m <= 1.25) {
      const need = Math.max(m, 0) * moneyValue(d) - cur.signOn / (12 * Math.max(1, cur.years)) - cur.bonus * 4 * ROLE_APPS[cur.role];
      const step = Math.max(100, roundFee(d.wage * 0.01));
      const wage = Math.max(cur.wage, Math.ceil(need / step) * step);
      return { ...cur, wage };
    }
    // Put back the term he cares about that is furthest from his demand.
    const gaps: [keyof Scores, number][] = [['role', (1 - s.role) * wt.role], ['security', (1 - s.security) * wt.security], ['ambition', (1 - s.ambition) * wt.ambition]];
    gaps.sort((x, y) => y[1] - x[1]);
    const k = gaps[0][0];
    if (k === 'role') cur = { ...cur, role: d.role };
    else if (k === 'security') cur = { ...cur, years: d.years };
    else cur = { ...cur, release: d.release };
  }
  return { ...d };
}

export function agentFee(a: Pick<Agent, 'style'>, fee: number, wage: number): number {
  return fee > 0 ? roundFee(fee * FEE_PCT[a.style]) : roundFee(wage * FEE_MONTHS[a.style]);
}

// The chance he signs these terms as far as WE can tell: exact once his priority is known (knowledge ≥ 70), otherwise
// weighed over the priorities a player of his age tends to have. It is the percentage the negotiation room shows.
export function signChance(t: Terms, d: Demand, a: Agent, known: boolean, age: number): number {
  if (known) return accepts(utility(t, d, a.priority), a.style) ? 1 : 0;
  const prior = priorPriority(age);
  let p = 0;
  for (const pr of PRIORITIES) if (accepts(utility(t, d, pr), a.style)) p += prior[pr];
  return p;
}

// The lowest wage (all other terms as they are) with at least an even chance: the green zone on the wage slider.
export function greenFrom(t: Terms, d: Demand, a: Agent, known: boolean, age: number): number | null {
  let lo = Math.round(d.wage * 0.4), hi = Math.round(d.wage * 1.8);
  if (signChance({ ...t, wage: hi }, d, a, known, age) < 0.5) return null;
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (signChance({ ...t, wage: mid }, d, a, known, age) >= 0.5) hi = mid; else lo = mid; }
  return Math.round(hi);
}
