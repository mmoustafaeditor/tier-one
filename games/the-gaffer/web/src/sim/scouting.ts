// Opponent scouting reports and the assistant's advice.
// E2E #30: every line is written from data in the reader's language (no raw keys); the report's counter plan uses the same
// philosophy matrix the engine uses, so following it really helps (the old game's plan had no visible effect).
import type { Career } from '../model/types';
import { makeRng } from './rng';
import { playerOf, type World } from './world';
import { roundFee } from './season';
import { spend, staffQ } from './economy';
import { FORMATIONS, FORMATION_IDS, PHILOSOPHIES, PRESETS, fitPenalty, xiFor, type FormationId, type Philosophy } from './tactics';
import { expected } from './match';
import { pointsLeft, withTactics } from './engine/story';
import type { LiveMatch } from './match';

export interface ScoutReport {
  key: string;             // the match it's for
  opponent: string;
  formation: FormationId;  // what the scout expects (can be wrong with a weak scout)
  philosophy: Philosophy;
  threats: { id: string; attr: number }[]; // their best attackers and the attribute that makes them dangerous
  weak: { id: string; why: 'slow' | 'tired' | 'weak' }[];
  plan: { philosophy: Philosophy; pressing: 0 | 1 | 2; trap: 0 | 1 | 2 | 3 };
  accuracy: number;        // %
  gains?: Partial<Record<Philosophy, number>>; // engine v2: expected points with each philosophy against them
}

export const scoutReportCost = (w: World, c: Career) => roundFee(w.clubs.find((x) => x.id === c.clubId)!.wageCap * 0.1);

// `free`: the analyst's own report (v2.2: preparation costs the week's focus, not club money).
export function makeReport(w: World, c: Career, m: LiveMatch, free = false): { world: World; career: Career; report: ScoutReport } | null {
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  const cost = free ? 0 : scoutReportCost(w, c);
  if (club.budget < cost) return null;
  const them = m.sides.find((s) => s.clubId !== c.clubId)!;
  const accuracy = Math.round(60 + staffQ(c.ops, 'scout') * 0.4);
  const r = makeRng(m.key.length * 7919 + c.round);
  const get = (id: string) => playerOf(w, id)!;
  const xi = them.onPitch.filter(Boolean).map(get);
  const formation = r() * 100 < accuracy ? them.tactics.formation : FORMATION_IDS[Math.floor(r() * FORMATION_IDS.length)];
  const attackers = xi.filter((p) => ['ST', 'LW', 'RW', 'CAM'].includes(p.position)).sort((a, b) => b.rating - a.rating).slice(0, 3);
  const threats = attackers.map((p) => ({ id: p.id, attr: [0, 1, 2, 3].sort((a, b) => p.attrs[b] - p.attrs[a])[0] }));
  const defenders = xi.filter((p) => ['CB', 'LB', 'RB', 'CDM'].includes(p.position));
  const weak: ScoutReport['weak'] = [];
  const slow = defenders.filter((p) => p.attrs[0] < 60).sort((a, b) => a.attrs[0] - b.attrs[0])[0];
  if (slow) weak.push({ id: slow.id, why: 'slow' });
  const tired = xi.filter((p) => p.fitness < 82).sort((a, b) => a.fitness - b.fitness)[0];
  if (tired) weak.push({ id: tired.id, why: 'tired' });
  const worst = [...defenders].sort((a, b) => a.rating - b.rating)[0];
  if (worst && !weak.some((x) => x.id === worst.id)) weak.push({ id: worst.id, why: 'weak' });
  const ph = them.tactics.philosophy ?? 'balanced';
  // The counter plan is the engine's own answer: every philosophy tried against their set-up with our players
  // (and our mastery of it), the best expected points wins.
  const k = m.sides[0].clubId === c.clubId ? 0 : 1;
  const gains: Partial<Record<Philosophy, number>> = {};
  for (const p of PHILOSOPHIES) {
    const m2 = withTactics(m, k, { ...PRESETS[p], philosophy: p }, get);
    m2.sides = [...m2.sides] as typeof m2.sides;
    m2.sides[k] = { ...m2.sides[k], mastery: p === 'balanced' ? 100 : c.mastery?.[p] ?? 30 };
    gains[p] = Math.round(pointsLeft({ ...m2, minute: 0 }, k, expected(m2, get)) * 100) / 100;
  }
  const answer = (Object.keys(gains) as Philosophy[]).sort((a, b) => gains[b]! - gains[a]!)[0] ?? 'balanced';
  const plan = { philosophy: answer, pressing: PRESETS[answer].pressing as 0 | 1 | 2, trap: PRESETS[answer].trap as 0 | 1 | 2 | 3 };
  const report: ScoutReport = { key: m.key, opponent: them.clubId, formation, philosophy: ph, threats, weak, plan, accuracy, gains };
  const s = cost ? spend(w, c, 'scouting', -cost) : { world: w, career: c };
  return { world: s.world, career: { ...s.career, scouted: { ...(s.career.scouted ?? {}), [m.key]: report } }, report };
}

export type Tip =
  | { k: 'scoutFirst' } | { k: 'mismatch'; theirs: Philosophy; use: Philosophy } | { k: 'edge'; theirs: Philosophy }
  | { k: 'lowMastery'; n: number } | { k: 'tired'; n: number } | { k: 'outOfPos'; n: number } | { k: 'underdog' } | { k: 'trap'; trap: number };

// Up to four short pieces of advice for the next match.
export function advice(w: World, c: Career, report: ScoutReport | undefined, lossChance: number): Tip[] {
  const tips: Tip[] = [];
  const tac = c.tactics;
  const mine = tac?.philosophy ?? 'balanced';
  if (!report) tips.push({ k: 'scoutFirst' });
  else {
    const g = report.gains;
    if (g && g[mine] !== undefined && g[report.plan.philosophy] !== undefined) {
      if (report.plan.philosophy === mine) tips.push({ k: 'edge', theirs: report.philosophy });
      else if (g[report.plan.philosophy]! - g[mine]! >= 0.08) tips.push({ k: 'mismatch', theirs: report.philosophy, use: report.plan.philosophy });
    }
    if (report.plan.trap && tac?.trap !== report.plan.trap) tips.push({ k: 'trap', trap: report.plan.trap });
  }
  const mast = c.mastery?.[mine] ?? 30;
  if (mine !== 'balanced' && mast < 50) tips.push({ k: 'lowMastery', n: Math.round(mast) });
  const { xi } = xiFor(w, c);
  const tired = xi.filter((p) => p.fitness < 80).length;
  if (tired >= 3) tips.push({ k: 'tired', n: tired });
  const slots = FORMATIONS[tac?.formation ?? '4-3-3'].slots;
  // A neighbouring position (a CB at CDM) is fine; only real mismatches count.
  const off = xi.filter((p, i) => slots[i] && fitPenalty(p.position, slots[i].pos) > 4).length;
  if (off) tips.push({ k: 'outOfPos', n: off });
  if (lossChance > 0.5 && (tac?.mentality ?? 0) >= 0) tips.push({ k: 'underdog' });
  return tips.slice(0, 4);
}
