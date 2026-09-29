// Today's decision queue (V2_DESIGN §2.3): "What needs me today?" A PROJECTION of the state, never stored. An item
// exists only when a real decision exists: a bid for one of your players, a tired starter before kick-off, a key
// contract running down, a staff proposal waiting for a yes, a job offer, the analyst's tape, a change of weekly focus.
// Each item carries the staff member's call (their bias included) as the pre-picked choice, the commands each choice
// runs, a deadline, and where "Open" goes. The count shown is always the length of this list (GF-06).
import type { Career, Dept, LocalizedName, Pending, Player, PrepFocus, StaffRole } from '../model/types';
import type { Command } from './commands';
import { available, formOf, slotValue, xiFor, FORMATIONS, DEFAULT_TACTICS } from './tactics';
import { playerOf, squadOf, strengthOf, type World } from './world';
import { renewDemand, wageBillOf } from './transfers';
import { balanceOf } from './balance';
import { nextUserMatch } from './season';
import { levelOf, biasOf, DEPT_ROLE, staffOf } from './delegation';
import { loanOf } from './loans';
import { isDeadlineDay, windowOf } from './windows';
import { GROUP_OF } from './groups';
import { roundFee } from './season';
import { roomDecisions } from './room-decisions';
import { pledgeOf } from './room';

export type DecKind = 'welcome' | 'offer' | 'condition' | 'contract' | 'staff' | 'job' | 'tape' | 'focus' | 'deadline'
  | 'talk' | 'request' | 'promise' | 'armband' | 'clause'; // v2.4 dressing room (sim/room-decisions.ts)
export type FxTone = 'good' | 'warn' | 'bad' | 'plain';
export interface Fx { tone: FxTone; icon: string; key: string; n?: number; s?: string }
export interface Choice { id: string; key: string; pn?: LocalizedName; n?: number; s?: string; cmds: Command[]; pick?: boolean; fx: Fx[]; open?: Open }
export type Open = { to: 'player'; id: string } | { to: 'transfers' } | { to: 'tactics' } | { to: 'office' } | { to: 'career' } | { to: 'squad' } | { to: 'staff' };
export interface Ref { key: string; pn?: LocalizedName; n?: number; s?: string; club?: string; p?: string }
export interface Decision {
  id: string; kind: DecKind; dept: Dept | null; role: StaffRole | null; icon: string;
  title: Ref; advice: Ref | null;
  due: { key: 'kickoff' | 'days' | 'week' | 'season' | 'window'; n?: number };
  choices: Choice[]; score: number; ev?: string; pending?: string; open?: Open;
}

const P = (p: Player) => p.name;
const days = (n: number) => ({ key: 'days' as const, n: Math.max(1, n) });

export function decisions(w: World, c: Career): Decision[] {
  if (c.sacked) return [];
  const out: Decision[] = [];
  const done = c.done ?? {};
  const add = (d: Decision) => { if (done[d.id] === undefined) out.push(d); };
  const squad = squadOf(w, c.clubId);
  const next = nextUserMatch(w, c);

  // 0. The first morning: how hands-on you want to be. One tap sets every department (the staff room fine-tunes it).
  if (c.round === 0 && c.coach.record[0] === 0) {
    add({
      id: 'welcome', kind: 'welcome', dept: null, role: 'assistant', icon: 'chat',
      title: { key: 'welcome' }, advice: { key: 'welcome' }, due: { key: 'week' },
      choices: [
        { id: 'usual', key: 'runUsual', cmds: [], pick: true, fx: [{ tone: 'plain', icon: 'handshake', key: 'signingsAsk' }] },
        { id: 'hands', key: 'handsOn', cmds: (['matchprep', 'opposition', 'fitness'] as Dept[]).map((d) => ({ type: 'delegation.set', dept: d, level: 'me' }) as Command), fx: [{ tone: 'warn', icon: 'doc', key: 'moreCalls' }] },
        { id: 'staff', key: 'leaveIt', cmds: [{ type: 'delegation.all', level: 'staff' }], fx: [{ tone: 'good', icon: 'check', key: 'fewestCalls' }, { tone: 'warn', icon: 'market', key: 'staffSign' }] },
      ],
      score: 65, open: { to: 'staff' },
    });
  }

  // 1. Bids for your players (unless the director answers them on his own).
  if (levelOf(c, 'contracts') !== 'staff') {
    const b = biasOf(staffOf(c, 'director'));
    const core = new Set([...squad].sort((a, z) => z.rating - a.rating).slice(0, 11).map((p) => p.id));
    for (const o of c.offers) {
      const p = playerOf(w, o.playerId);
      if (!p) continue;
      const want = p.marketValue * (core.has(p.id) ? 1.4 : p.listed ? 0.85 : 1.1) * (b === 'money' ? 0.87 : b === 'loyal' ? 1.2 : 1);
      const counter = roundFee(o.fee * 1.15);
      const call = o.fee >= want ? 'accept' : o.fee >= want * 0.8 ? 'counter' : 'reject';
      add({
        id: `offer:${o.id}`, kind: 'offer', dept: 'contracts', role: 'director', icon: 'market', ev: undefined,
        title: { key: 'offer', pn: P(p), n: o.fee, club: o.clubId, p: p.id },
        advice: { key: `offer_${call}${b === 'money' || b === 'loyal' ? `_${b}` : ''}`, pn: P(p), n: p.marketValue },
        due: days(o.round + 3 - c.round),
        choices: [
          { id: 'accept', key: 'accept', n: o.fee, cmds: [{ type: 'offer.accept', offerId: o.id }], pick: call === 'accept' && pledgeOf(c, p.id)?.type !== 'keep', fx: [{ tone: 'good', icon: 'pound', key: 'cash', n: o.fee }, { tone: core.has(p.id) ? 'bad' : 'plain', icon: 'squad', key: core.has(p.id) ? 'loseStarter' : 'loseSquad' }, ...(pledgeOf(c, p.id)?.type === 'keep' ? [{ tone: 'bad' as const, icon: 'alert', key: 'dr.fx.keepWord' }] : [])] },
          { id: 'counter', key: 'counter', n: counter, cmds: [{ type: 'offer.counter', offerId: o.id, fee: counter }], pick: call === 'counter', fx: [{ tone: 'warn', icon: 'alert', key: 'mayWalk' }] },
          { id: 'reject', key: 'reject', cmds: [{ type: 'offer.reject', offerId: o.id }], pick: call === 'reject', fx: [{ tone: 'plain', icon: 'heart', key: 'stays' }] },
        ],
        score: 70 + Math.min(20, o.fee / Math.max(1, p.marketValue) * 10) + (core.has(p.id) ? 10 : 0), open: { to: 'player', id: p.id },
      });
    }
  }

  // 2. A tired starter before kick-off: rest him (and who comes in) or play him below his level.
  if (next && levelOf(c, 'matchprep') !== 'staff') {
    const { xi } = xiFor(w, c);
    const slots = FORMATIONS[(c.tactics ?? DEFAULT_TACTICS).formation].slots;
    const b = biasOf(staffOf(c, 'fitness'));
    const bar = b === 'cautious' ? 78 : b === 'bold' ? 62 : 70;
    const tired = xi.map((p, i) => ({ p, i })).filter(({ p }) => p.fitness < 75 && !(c.rested ?? []).includes(p.id)).sort((a, z) => a.p.fitness - z.p.fitness)[0];
    if (tired) {
      const pos = slots[tired.i]?.pos ?? tired.p.position;
      const inXI = new Set(xi.map((p) => p.id));
      const backup = squad.filter((p) => !inXI.has(p.id) && available(p) && !loanOf(c, p.id)).sort((a, z) => slotValue(z, pos) - slotValue(a, pos))[0];
      if (backup) {
        const mine = Math.round((formOf(tired.p) / Math.max(1, tired.p.rating)) * 100);
        const his = Math.round(slotValue(tired.p, pos)), sub = Math.round(slotValue(backup, pos));
        const rest = tired.p.fitness < bar || sub >= his;
        add({
          id: `rest:${tired.p.id}:${c.season}:${c.round}`, kind: 'condition', dept: 'fitness', role: 'fitness', icon: 'medic',
          title: { key: 'tired', pn: P(tired.p), n: tired.p.fitness, p: tired.p.id },
          advice: { key: rest ? `rest${b === 'bold' || b === 'cautious' ? `_${b}` : ''}` : 'play', pn: P(tired.p), n: mine, s: backup.short ?? backup.name.en },
          due: { key: 'kickoff' },
          choices: [
            { id: 'rest', key: 'restHim', pn: P(backup), cmds: [{ type: 'rest.set', playerId: tired.p.id, rest: true }], pick: rest, fx: [{ tone: 'good', icon: 'bolt', key: 'freshNext', n: Math.min(100, tired.p.fitness + 24) }, { tone: sub >= his ? 'good' : 'warn', icon: 'tactics', key: 'slotLevel', n: sub - his }] },
            { id: 'play', key: 'playHim', cmds: [], pick: !rest, fx: [{ tone: 'warn', icon: 'bolt', key: 'playsAt', n: mine }, { tone: 'warn', icon: 'alert', key: 'legs' }] },
          ],
          score: 80 + (75 - tired.p.fitness), open: { to: 'tactics' },
        });
      }
    }
  }

  // 3. A key player's contract running down (when you run contracts yourself).
  if (levelOf(c, 'contracts') === 'me' && c.round >= 3) {
    const b = biasOf(staffOf(c, 'director'));
    const key = [...squad].filter((p) => !loanOf(c, p.id)).sort((a, z) => z.rating - a.rating).slice(0, 14);
    const club = w.clubs.find((x) => x.id === c.clubId)!;
    for (const p of key.filter((x) => x.contractUntil <= c.season + 1).slice(0, 2)) {
      const age = c.season - p.birthYear;
      const d = renewDemand(p, c.season, balanceOf(c).wages);
      const years = Math.min(d.maxYears, age <= 26 ? 4 : 2);
      const fits = wageBillOf(w, c.clubId) - p.wage + d.wage <= club.wageCap;
      const renew = fits && (b === 'loyal' || (b === 'money' ? age < 30 : age < 33));
      add({
        id: `renew:${p.id}:${c.season}`, kind: 'contract', dept: 'contracts', role: 'director', icon: 'doc',
        title: { key: 'expiring', pn: P(p), n: p.contractUntil, p: p.id },
        advice: { key: !fits ? 'renew_cap' : renew ? 'renew_yes' : 'renew_no', pn: P(p), n: age, s: String(years) },
        due: { key: 'season' },
        choices: [
          { id: 'renew', key: 'renewYears', n: years, cmds: [{ type: 'contract.renew', playerId: p.id, wage: d.wage, years }], pick: renew, fx: [{ tone: 'plain', icon: 'pound', key: 'wagesYear', n: (d.wage - p.wage) * 12 }, { tone: 'good', icon: 'heart', key: 'moraleUp' }] },
          { id: 'wait', key: 'wait', cmds: [], pick: !renew, fx: [{ tone: 'warn', icon: 'alert', key: 'rivalsCall' }] },
        ],
        score: 45 + p.rating / 4, open: { to: 'player', id: p.id },
      });
    }
  }

  // 4. Staff proposals waiting for a yes ('ask').
  for (const pd of c.pending ?? []) {
    if (pd.until < c.round) continue;
    add(pendingCard(w, c, pd));
  }

  // 5. Job offers: your call alone.
  for (const j of c.jobs) {
    add({
      id: `job:${j}:${c.season}:${c.round}`, kind: 'job', dept: null, role: null, icon: 'club',
      title: { key: 'job', club: j, n: strengthOf(w, j) }, advice: null, due: { key: 'week' },
      choices: [
        { id: 'talk', key: 'takeJob', cmds: [{ type: 'job.accept', clubId: j }], fx: [{ tone: 'warn', icon: 'club', key: 'newClub' }] },
        { id: 'stay', key: 'stay', cmds: [{ type: 'job.decline', clubId: j }], fx: [{ tone: 'plain', icon: 'heart', key: 'loyalty' }] },
      ],
      score: 60, open: { to: 'career' },
    });
  }

  // 6. The analyst has the next opponent on tape (you run the opposition work yourself).
  if (next && levelOf(c, 'opposition') === 'me' && !c.scouted?.[next.key]) {
    const opp = next.sides.find((s) => s.clubId !== c.clubId)!.clubId;
    add({
      id: `tape:${next.key}`, kind: 'tape', dept: 'opposition', role: 'scout', icon: 'eye',
      title: { key: 'tape', club: opp }, advice: { key: 'tape', club: opp }, due: { key: 'kickoff' },
      choices: [
        { id: 'watch', key: 'watchTape', cmds: [{ type: 'report.make' }], pick: true, fx: [{ tone: 'good', icon: 'eye', key: 'knowThem' }] },
        { id: 'skip', key: 'skipTape', cmds: [], fx: [{ tone: 'plain', icon: 'clock', key: 'noPrep' }] },
      ],
      score: 30,
    });
  }

  // 7. The week's focus, when the fitness coach would change it and you run training yourself.
  if (next && levelOf(c, 'fitness') === 'me') {
    const call = focusCall(w, c);
    if (call !== (c.prep ?? null)) {
      add({
        id: `focus:${c.season}:${c.round}`, kind: 'focus', dept: 'fitness', role: 'fitness', icon: 'bolt',
        title: { key: 'focus', s: c.prep ?? '' }, advice: { key: `focus_${call}` }, due: { key: 'kickoff' },
        choices: (['recovery', 'tactical', 'opposition', 'development'] as PrepFocus[]).map((f) => ({
          id: f, key: `focus_${f}`, cmds: [{ type: 'prep.set', focus: f } as Command], pick: f === call, fx: [{ tone: 'plain', icon: FOCUS_ICON[f], key: `focusFx_${f}` }],
        })),
        score: 20,
      });
    }
  }

  // 8. Deadline day with a hole in the squad (you run recruitment yourself).
  if (windowOf(c) && isDeadlineDay(c) && levelOf(c, 'recruitment') === 'me') {
    const NEED: Record<number, number> = { 0: 2, 1: 7, 2: 6, 3: 4 };
    const g = [0, 1, 2, 3].find((k) => squad.filter((p) => GROUP_OF[p.position] === k).length < NEED[k]);
    if (g !== undefined) {
      add({
        id: `deadline:${c.season}:${c.round}`, kind: 'deadline', dept: 'recruitment', role: 'director', icon: 'market',
        title: { key: 'deadline', n: g }, advice: { key: 'deadline', n: g }, due: { key: 'window' },
        choices: [
          { id: 'look', key: 'findCover', cmds: [], pick: true, fx: [{ tone: 'plain', icon: 'search', key: 'toMarket' }], open: { to: 'transfers' } },
          { id: 'stand', key: 'standPat', cmds: [], fx: [{ tone: 'warn', icon: 'alert', key: 'thin' }] },
        ],
        score: 75,
      });
    }
  }

  // 9. The dressing room: a word, a request, a clause, a promise due, the armband.
  for (const d of roomDecisions(w, c)) add(d);

  return out.sort((a, z) => z.score - a.score);
}

export const FOCUS_ICON: Record<PrepFocus, string> = { recovery: 'heart', tactical: 'tactics', opposition: 'eye', development: 'grow' };

// What the fitness coach would pick this week (the same rule his department uses when it runs itself).
export function focusCall(w: World, c: Career): PrepFocus {
  const squad = squadOf(w, c.clubId);
  const fit = squad.reduce((s, p) => s + p.fitness, 0) / Math.max(1, squad.length);
  const b = biasOf(staffOf(c, 'fitness'));
  const tired = b === 'cautious' ? 85 : b === 'bold' ? 74 : 80;
  const m = nextUserMatch(w, c);
  const opp = m?.sides.find((s) => s.clubId !== c.clubId)?.clubId;
  const test = !!opp && strengthOf(w, opp) >= strengthOf(w, c.clubId) - 2;
  return fit < tired ? 'recovery' : test && m && c.scouted?.[m.key] ? 'opposition' : b === 'youth' ? 'development' : 'tactical';
}

function pendingCard(w: World, c: Career, pd: Pending): Decision {
  const role: StaffRole = DEPT_ROLE[pd.dept];
  const cmd = pd.cmd as unknown as Command;
  const pid = (cmd as { playerId?: string }).playerId;
  const fx: Fx[] = [];
  if (cmd.type === 'transfer.bid') fx.push({ tone: 'plain', icon: 'pound', key: 'fee', n: cmd.bid.fee }, { tone: 'plain', icon: 'pound', key: 'wagesYear', n: cmd.bid.wage * 12 });
  if (cmd.type === 'contract.renew') fx.push({ tone: 'plain', icon: 'pound', key: 'wagesYear', n: cmd.wage * 12 }, { tone: 'good', icon: 'heart', key: 'moraleUp' });
  if (cmd.type === 'player.list') fx.push({ tone: 'warn', icon: 'market', key: 'listed' });
  if (cmd.type === 'loan.out') fx.push({ tone: 'good', icon: 'grow', key: 'minutes' });
  if (cmd.type === 'sponsor.sign') fx.push({ tone: 'good', icon: 'pound', key: 'monthly', n: pd.n ?? 0 });
  if (cmd.type === 'medical.treat') fx.push({ tone: 'good', icon: 'medic', key: 'backSooner' });
  if (cmd.type === 'squad.talk') fx.push({ tone: 'good', icon: 'heart', key: 'moraleUp' });
  if (cmd.type === 'tactics.preset' || cmd.type === 'tactics.patch') fx.push({ tone: 'plain', icon: 'tactics', key: 'plan' });
  return {
    id: pd.id, kind: 'staff', dept: pd.dept, role, icon: DEPT_ICON[pd.dept], pending: pd.id, ev: pd.ev,
    title: { key: `ask_${pd.key}`, pn: pd.pn, n: pd.n, s: pd.s, club: (cmd as { to?: string }).to ?? pd.s, p: pid },
    advice: { key: `why_${pd.key}`, pn: pd.pn, n: pd.n, s: pd.s, club: pd.s },
    due: days(pd.until - c.round + 1),
    choices: [
      { id: 'yes', key: 'approve', cmds: [{ type: 'pending.approve', id: pd.id }], pick: true, fx },
      { id: 'no', key: 'notNow', cmds: [{ type: 'pending.decline', id: pd.id }], fx: [{ tone: 'plain', icon: 'x', key: 'nothingChanges' }] },
    ],
    score: 50 + (pd.until - c.round <= 0 ? 15 : 0),
    open: pid && playerOf(w, pid) ? { to: 'player', id: pid } : undefined,
  };
}

export const DEPT_ICON: Record<Dept, string> = {
  matchprep: 'tactics', opposition: 'eye', fitness: 'bolt', development: 'grow', recruitment: 'market', contracts: 'doc', commercial: 'pound',
};

// "Staff made n calls since the last match."
export function staffCallsSinceMatch(c: Career): number {
  const ev = c.events ?? [];
  let i = ev.length - 1;
  while (i >= 0 && ev[i].type !== 'match') i--;
  // Include the week before the last match too (their calls land right after it).
  let j = i - 1;
  while (j >= 0 && ev[j].type !== 'match') j--;
  return ev.slice(Math.max(0, j + 1)).filter((e) => e.type === 'cmd' && e.data?.by && e.data.by !== 'me').length;
}
