// Commands (V2_DESIGN §7.2). Every change the manager — or a member of staff acting for him — makes to the game goes
// through `dispatch`. It is pure: it validates inside the simulation, never in the UI, and returns either the next
// world and career plus the events it appended, or a typed refusal. Screens never compute the next state themselves;
// they build a Command and hand it to the App, which dispatches it and saves.
import type { Balance, Career, Dept, DeptLevel, Facility, LocalizedName, NamesMode, PrepFocus, SponsorDeal } from '../model/types';
import { withNames } from './seed';
import type { UserTactics, Tactics, Philosophy } from './tactics';
import type { LiveMatch } from './match';
import { applyPreset, DEFAULT_TACTICS, fullTactics } from './tactics';
import { emit, stamp } from './events';
import { buy, acceptOffer, rejectOffer, counterOffer, dealRoll, tryRenew, setListed, type Bid } from './transfers';
import { loanIn, loanOut } from './loans';
import { hireStaff, signSponsor, haggleSponsor, extendSponsor, endSponsor, upgradeFacility, moveWageCap, payBonus } from './economy';
import { treat } from './training';
import { congested, loanKid, promoteKid, recallLoan, releaseKid, rushBack, setPlan, wordFor, type Treat, type YouthNo } from './youth';
import type { Position } from '../model/types';
import { takeCourse, moveTo } from './coach';
import { toggleShortlist } from './estimate';
import { makeReport } from './scouting';
import { playerOf, type World } from './world';
import { DEPTS } from './delegation';
import { nextUserMatch } from './season';
import { cmdAnswer, cmdCaptain, cmdClause, cmdTalk, joinRoom, onRenewed, renewFactor, type PledgeReq, type RoomResult, type Tone } from './room';
import type { SquadRole } from '../model/types';

export type Command =
  | { type: 'tactics.set'; tactics: UserTactics }
  | { type: 'tactics.preset'; philosophy: Philosophy; pressing?: 0 | 1 | 2; trap?: 0 | 1 | 2 | 3 }
  | { type: 'tactics.patch'; patch: Partial<Tactics> }
  | { type: 'planB.set'; tactics: Tactics | null }
  | { type: 'prep.set'; focus: PrepFocus }
  | { type: 'rest.set'; playerId: string; rest: boolean }
  | { type: 'talk.set'; talk: 0 | 1 | 2 | 3 }
  | { type: 'player.list'; playerId: string; listed: boolean }
  | { type: 'shortlist.toggle'; playerId: string }
  | { type: 'transfer.bid'; playerId: string; bid: Bid }
  | { type: 'loan.in'; playerId: string }
  | { type: 'loan.out'; playerId: string; to: string }
  | { type: 'offer.accept'; offerId: string }
  | { type: 'offer.reject'; offerId: string }
  | { type: 'offer.counter'; offerId: string; fee: number }
  | { type: 'contract.renew'; playerId: string; wage: number; years: number; role?: SquadRole; release?: boolean }
  // v2.4 dressing room (sim/room.ts)
  | { type: 'room.talk'; playerId: string; tone: Tone; pledge?: PledgeReq }
  | { type: 'room.captain'; playerId: string }
  | { type: 'room.answer'; playerId: string; answer: 'list' | 'refuse' }
  | { type: 'room.clause'; playerId: string; answer: 'go' | 'stay' }
  | { type: 'staff.hire'; staffId: string }
  | { type: 'sponsor.sign'; dealId: string }
  | { type: 'sponsor.haggle'; dealId: string }
  | { type: 'sponsor.extend'; dealId: string }
  | { type: 'sponsor.end'; dealId: string }
  | { type: 'ticket.set'; price: number }
  | { type: 'facility.upgrade'; facility: Facility }
  | { type: 'wagecap.move'; perMonth: number }
  | { type: 'squad.bonus'; ids: string[]; each: number; fromWallet: boolean }
  | { type: 'squad.talk' }
  | { type: 'training.set'; load?: 0 | 1 | 2; focus?: { playerId: string; attr: number | null }; pos?: { playerId: string; pos: Position | null } }
  | { type: 'medical.treat'; playerId: string; treatment: Treat | 'instant' }
  | { type: 'academy.promote'; id: string }
  | { type: 'academy.release'; id: string }
  | { type: 'academy.loan'; id: string; to: string }
  | { type: 'academy.sell'; id: string }   // retired in v2.6 (Intake Day replaced rights-selling): refused
  | { type: 'academy.scout' }              // retired in v2.6: refused
  | { type: 'pathway.recall'; playerId: string }
  | { type: 'pathway.word'; playerId: string }
  | { type: 'report.make' }
  | { type: 'coach.course'; id: string }
  | { type: 'job.accept'; clubId: string }
  | { type: 'job.decline'; clubId: string }
  | { type: 'delegation.set'; dept: Dept; level: DeptLevel }
  | { type: 'delegation.all'; level: DeptLevel }
  | { type: 'pending.approve'; id: string }
  | { type: 'pending.decline'; id: string }
  | { type: 'decision.done'; id: string }
  | { type: 'balance.set'; balance: Balance }
  | { type: 'names.set'; mode: NamesMode }
  | { type: 'name.set'; kind: 'club' | 'player'; id: string; name: LocalizedName; nick?: LocalizedName }
  | { type: 'inbox.read'; ids: string[] }
  | { type: 'inbox.clear' }
  | { type: 'world.edit'; world: World; version: number; swaps: [string, string][] }
  | { type: 'match.save'; live: LiveMatch };

export type CommandType = Command['type'];
export type Refusal = { ok: false; reason: string; counter?: number };
export type Done = { ok: true; world: World; career: Career; events: string[]; note?: { key: string; n?: number; s?: string } };
export type Result = Done | Refusal;

const no = (reason: string, counter?: number): Refusal => ({ ok: false, reason, counter });
const room = (r: RoomResult) => ('no' in r ? no(r.no) : r);
const BID_ROLE: Record<string, SquadRole> = { star: 'star', regular: 'starter', rotation: 'rotation', prospect: 'prospect' };
const clubOf = (w: World, c: Career) => w.clubs.find((x) => x.id === c.clubId);
const sponsorById = (c: Career, id: string): SponsorDeal | undefined => c.ops.sponsors.find((d) => d.id === id) ?? c.ops.sponsorOffers.find((d) => d.id === id);

const youth = (r: { world: World; career: Career } | YouthNo, note?: Done['note']) => (typeof r === 'string' ? no(r) : { ...r, note });

// The rules for each command. Returns the next state (no events yet) or a refusal.
function run(w: World, c: Career, cmd: Command): { world: World; career: Career; note?: Done['note'] } | Refusal {
  switch (cmd.type) {
    case 'tactics.set': {
      const t = cmd.tactics;
      const squad = new Set(w.players.filter((p) => p.clubId === c.clubId).map((p) => p.id));
      if (t.xi && t.xi.some((id) => id && !squad.has(id))) return no('xi');
      if (t.xi && new Set(t.xi.filter(Boolean)).size !== t.xi.filter(Boolean).length) return no('xi');
      return { world: w, career: { ...c, tactics: t } };
    }
    case 'tactics.preset': {
      const t = c.tactics ?? DEFAULT_TACTICS;
      const next = applyPreset(t, cmd.philosophy);
      return { world: w, career: { ...c, tactics: { ...next, ...(cmd.pressing !== undefined ? { pressing: cmd.pressing } : {}), ...(cmd.trap !== undefined ? { trap: cmd.trap } : {}) } } };
    }
    case 'tactics.patch': {
      const t = c.tactics ?? DEFAULT_TACTICS;
      const next = { ...t, ...cmd.patch } as UserTactics;
      if (cmd.patch.formation && cmd.patch.formation !== t.formation) next.xi = null; // a new shape: the best fit fills each slot
      return { world: w, career: { ...c, tactics: next } };
    }
    case 'planB.set': {
      if (!cmd.tactics) { const { planB: _b, ...rest } = c; void _b; return { world: w, career: rest }; }
      const f = fullTactics(cmd.tactics);
      const { mark: _m, ...plan } = f; void _m;
      return { world: w, career: { ...c, planB: plan } };
    }
    case 'prep.set':
      if (!['recovery', 'tactical', 'opposition', 'development'].includes(cmd.focus)) return no('focus');
      return { world: w, career: { ...c, prep: cmd.focus } };
    case 'rest.set': {
      const p = playerOf(w, cmd.playerId);
      if (!p || p.clubId !== c.clubId) return no('gone');
      const rested = new Set(c.rested ?? []);
      if (cmd.rest) rested.add(p.id); else rested.delete(p.id);
      const xi = c.tactics?.xi;
      const tactics = cmd.rest && xi?.includes(p.id) ? { ...c.tactics!, xi: xi.map((id) => (id === p.id ? '' : id)) } : c.tactics;
      return { world: w, career: { ...c, rested: [...rested], tactics } };
    }
    case 'talk.set':
      if (![0, 1, 2, 3].includes(cmd.talk)) return no('talk');
      return { world: w, career: { ...c, talk: cmd.talk } };
    case 'player.list': {
      const p = playerOf(w, cmd.playerId);
      if (!p || p.clubId !== c.clubId) return no('gone');
      return { world: setListed(w, p.id, cmd.listed), career: c };
    }
    case 'shortlist.toggle': {
      const p = playerOf(w, cmd.playerId);
      if (!p || p.clubId === c.clubId) return no('gone');
      return { world: w, career: toggleShortlist(c, p.id) };
    }
    case 'transfer.bid': {
      const p = playerOf(w, cmd.playerId);
      if (!p) return no('gone');
      const r = buy(w, c, p, cmd.bid);
      if (!r.ok) return no(r.reason, r.counter);
      const j = joinRoom(r.world, r.career, p.id, 'signed', BID_ROLE[cmd.bid.role]);
      return { world: j.world, career: j.career, note: { key: 'signed', s: p.id } };
    }
    case 'loan.in': {
      const p = playerOf(w, cmd.playerId);
      if (!p) return no('gone');
      const r = loanIn(w, c, p);
      if (!r.ok) return no(r.reason);
      const j = joinRoom(r.world, r.career, p.id, 'loan');
      return { world: j.world, career: j.career, note: { key: 'loanedIn', s: p.id } };
    }
    case 'loan.out': {
      const p = playerOf(w, cmd.playerId);
      if (!p) return no('gone');
      const r = loanOut(w, c, p, cmd.to);
      return r.ok ? { world: r.world, career: r.career, note: { key: 'loanedOut', s: p.id } } : no(r.reason);
    }
    case 'offer.accept': {
      const o = c.offers.find((x) => x.id === cmd.offerId);
      if (!o) return no('gone');
      const r = acceptOffer(w, c, o);
      return r.ok ? { world: r.world, career: r.career, note: { key: 'sold', s: o.playerId, n: o.fee } } : no(r.reason);
    }
    case 'offer.reject': {
      const o = c.offers.find((x) => x.id === cmd.offerId);
      if (!o) return no('gone');
      return { world: w, career: rejectOffer(c, o) };
    }
    case 'offer.counter': {
      const o = c.offers.find((x) => x.id === cmd.offerId);
      const p = o && playerOf(w, o.playerId);
      if (!o || !p) return no('gone');
      if (!(cmd.fee > o.fee)) return no('fee');
      const r = counterOffer(c, o, p, cmd.fee, dealRoll(c, o.id));
      return { world: w, career: r.career, note: { key: r.accepted ? 'counterOk' : 'counterNo', s: p.id, n: cmd.fee } };
    }
    case 'contract.renew': {
      const p = playerOf(w, cmd.playerId);
      if (!p) return no('gone');
      if (!(cmd.years >= 1 && cmd.years <= 5) || !(cmd.wage > 0)) return no('terms');
      if (cmd.role && !['star', 'starter', 'rotation', 'prospect'].includes(cmd.role)) return no('terms');
      if (cmd.role === 'prospect' && c.season - p.birthYear > 21) return no('role');
      const r = tryRenew(w, c, p, cmd.wage, cmd.years, renewFactor(p, cmd.role, cmd.release));
      if (!r.ok) return no(r.reason, r.counter);
      const j = onRenewed(r.world, c, p.id, cmd.role, cmd.release);
      return { world: j.world, career: j.career, note: { key: 'renewed', s: p.id } };
    }
    case 'staff.hire': {
      const s = c.ops.staffPool.find((x) => x.id === cmd.staffId);
      if (!s) return no('gone');
      return { world: w, career: hireStaff(c, s) };
    }
    case 'sponsor.sign': {
      const d = c.ops.sponsorOffers.find((x) => x.id === cmd.dealId);
      if (!d) return no('gone');
      if (c.ops.sponsors.some((x) => x.slot === d.slot)) return no('slot');
      return { world: w, career: signSponsor(c, d) };
    }
    case 'sponsor.haggle': {
      const d = c.ops.sponsorOffers.find((x) => x.id === cmd.dealId);
      if (!d) return no('gone');
      const r = haggleSponsor(c, d, dealRoll(c, d.id));
      return { world: w, career: r.career, note: { key: r.ok ? 'haggleOk' : 'haggleNo' } };
    }
    case 'sponsor.extend': {
      const d = c.ops.sponsors.find((x) => x.id === cmd.dealId);
      return d ? { world: w, career: extendSponsor(c, d) } : no('gone');
    }
    case 'sponsor.end': {
      const d = sponsorById(c, cmd.dealId);
      if (!d || !c.ops.sponsors.includes(d)) return no('gone');
      return endSponsor(w, c, d);
    }
    case 'ticket.set':
      if (!(cmd.price > 0 && cmd.price < 10_000)) return no('price');
      return { world: w, career: { ...c, ops: { ...c.ops, ticket: Math.round(cmd.price * 10) / 10 } } };
    case 'facility.upgrade': {
      const r = upgradeFacility(w, c, cmd.facility);
      return r.ok ? { world: r.world, career: r.career } : no('budget');
    }
    case 'wagecap.move': {
      if (!cmd.perMonth) return no('amount');
      const r = moveWageCap(w, c, cmd.perMonth);
      return r.ok ? { world: r.world, career: r.career } : no(cmd.perMonth > 0 ? 'budget' : 'bill');
    }
    case 'squad.bonus': {
      if (!(cmd.each > 0) || !cmd.ids.length) return no('amount');
      const r = payBonus(w, c, cmd.ids, cmd.each, cmd.fromWallet);
      return r.ok ? { world: r.world, career: r.career } : no('budget');
    }
    case 'squad.talk': {
      // The psychologist's team talk: a small lift for a flat room, once in a while (replaces the old ⚡ talk).
      const last = (c.events ?? []).filter((e) => e.name === 'squad.talk').pop();
      if (last && last.t[0] === c.season && c.round - last.t[1] < 4) return no('wait');
      const players = w.players.map((p) => (p.clubId === c.clubId ? { ...p, morale: Math.min(100, p.morale + 4) } : p));
      return { world: { ...w, players }, career: c };
    }
    case 'training.set': {
      // v2.6 (sim/youth.ts): Heavy is refused in a congested week; at most five individual plans.
      let career = c;
      if (cmd.load !== undefined) {
        if (![0, 1, 2].includes(cmd.load)) return no('load');
        if (cmd.load === 2 && congested(c)) return no('congested');
        career = { ...career, ops: { ...career.ops, training: { ...career.ops.training, load: cmd.load } } };
      }
      for (const plan of [cmd.focus && { id: cmd.focus.playerId, attr: cmd.focus.attr }, cmd.pos && { id: cmd.pos.playerId, pos: cmd.pos.pos }]) {
        if (!plan) continue;
        const p = playerOf(w, plan.id);
        if (!p || p.clubId !== c.clubId) return no('gone');
        if ('pos' in plan && plan.pos && (plan.pos === p.position || plan.pos === 'GK' || p.position === 'GK')) return no('pos');
        const r = setPlan(career, p.id, 'pos' in plan ? { pos: plan.pos } : { attr: plan.attr });
        if (typeof r === 'string') return no(r);
        career = r;
      }
      return { world: w, career };
    }
    case 'medical.treat': {
      const p = playerOf(w, cmd.playerId);
      if (!p || p.clubId !== c.clubId) return no('gone');
      if (cmd.treatment === 'instant') return no('retired');
      if (cmd.treatment === 'rush') {
        const r = rushBack(c, p);
        if (typeof r === 'string') return no(r);
        return { world: { ...w, players: w.players.map((x) => (x.id === p.id ? r.player : x)) }, career: c, note: { key: 'rushed', s: p.id } };
      }
      const r = treat(w, c, p, cmd.treatment);
      return r.ok ? { world: r.world, career: r.career } : no('budget');
    }
    case 'academy.promote': {
      const r = promoteKid(w, c, cmd.id);
      if (typeof r === 'string') return no(r);
      // A graduate joins the dressing room on the pathway promise (trust 65, a Prospect's role).
      const j = joinRoom(r.world, r.career, cmd.id, 'grad');
      return { ...j, note: { key: 'promoted', s: cmd.id } };
    }
    case 'academy.release': return youth(releaseKid(w, c, cmd.id));
    case 'academy.loan': return youth(loanKid(w, c, cmd.id, cmd.to), { key: 'loanedOut', s: cmd.id });
    case 'academy.sell':
    case 'academy.scout':
      return no('retired');
    case 'pathway.recall': return youth(recallLoan(w, c, cmd.playerId));
    case 'pathway.word': return youth(wordFor(w, c, cmd.playerId));
    case 'report.make': {
      // The analyst's report on the next opponent: his job, paid by his wages (no extra fee since v2.2).
      const m = nextUserMatch(w, c);
      if (!m) return no('noMatch');
      if (c.scouted?.[m.key]) return no('done');
      const r = makeReport(w, c, m, true);
      return r ? { world: r.world, career: r.career } : no('noMatch');
    }
    case 'coach.course': {
      const r = takeCourse(c, cmd.id);
      return r.ok ? { world: w, career: r.career } : no('wallet');
    }
    case 'job.accept': {
      if (!c.jobs.includes(cmd.clubId)) return no('gone');
      return moveTo(w, c, cmd.clubId);
    }
    case 'job.decline':
      if (!c.jobs.includes(cmd.clubId)) return no('gone');
      return { world: w, career: { ...c, jobs: c.jobs.filter((x) => x !== cmd.clubId) } };
    case 'delegation.set':
      if (!DEPTS.includes(cmd.dept) || !['me', 'ask', 'staff'].includes(cmd.level)) return no('dept');
      return { world: w, career: { ...c, dept: { ...(c.dept ?? {}), [cmd.dept]: cmd.level }, pending: cmd.level === 'ask' ? c.pending : (c.pending ?? []).filter((p) => p.dept !== cmd.dept) } };
    case 'delegation.all':
      return { world: w, career: { ...c, dept: Object.fromEntries(DEPTS.map((d) => [d, cmd.level])), pending: cmd.level === 'ask' ? c.pending : [] } };
    case 'pending.approve': {
      const p = (c.pending ?? []).find((x) => x.id === cmd.id);
      if (!p) return no('gone');
      const rest = { ...c, pending: (c.pending ?? []).filter((x) => x.id !== cmd.id), done: { ...(c.done ?? {}), [cmd.id]: c.round } };
      return run(w, rest, p.cmd as unknown as Command);
    }
    case 'pending.decline': {
      if (!(c.pending ?? []).some((x) => x.id === cmd.id)) return no('gone');
      return { world: w, career: { ...c, pending: (c.pending ?? []).filter((x) => x.id !== cmd.id), done: { ...(c.done ?? {}), [cmd.id]: c.round } } };
    }
    case 'decision.done':
      return { world: w, career: { ...c, done: { ...(c.done ?? {}), [cmd.id]: c.round } } };
    case 'balance.set':
      return { world: w, career: { ...c, balance: cmd.balance } };
    case 'names.set': {
      // The fallback switch (V2_DESIGN §3.11): same ids, ratings, numbers and colours; only the names change.
      if (c.data !== 'real2026' || w.data !== 'real2026') return no('names');
      if (cmd.mode !== 'real' && cmd.mode !== 'fictional') return no('names');
      return { world: withNames(w, cmd.mode), career: { ...c, names: cmd.mode } };
    }
    case 'name.set': {
      const clean = { en: cmd.name.en.trim().slice(0, 40), ar: cmd.name.ar.trim().slice(0, 40) };
      if (!clean.en && !clean.ar) return no('empty');
      if (cmd.kind === 'club') {
        if (!w.clubs.some((x) => x.id === cmd.id)) return no('gone');
        return { world: { ...w, clubs: w.clubs.map((x) => (x.id === cmd.id ? { ...x, name: { en: clean.en || x.name.en, ar: clean.ar || x.name.ar } } : x)) }, career: c };
      }
      if (!playerOf(w, cmd.id)) return no('gone');
      const nick = cmd.nick && (cmd.nick.en.trim() || cmd.nick.ar.trim()) ? { en: cmd.nick.en.trim().slice(0, 30), ar: cmd.nick.ar.trim().slice(0, 30) } : undefined;
      return { world: { ...w, players: w.players.map((p) => (p.id === cmd.id ? { ...p, name: { en: clean.en || p.name.en, ar: clean.ar || p.name.ar }, nick } : p)) }, career: c };
    }
    case 'inbox.read': {
      const ids = new Set(cmd.ids);
      return { world: w, career: { ...c, inbox: c.inbox.map((m) => (ids.has(m.id) ? { ...m, read: true } : m)) } };
    }
    case 'inbox.clear':
      return { world: w, career: { ...c, inbox: [] } };
    case 'world.edit':
      if (!cmd.world.clubs.some((x) => x.id === c.clubId)) return no('club');
      return { world: cmd.world, career: { ...c, worldVersion: cmd.version, pendingSwaps: cmd.swaps.length ? cmd.swaps : undefined } };
    case 'room.talk': return room(cmdTalk(w, c, cmd.playerId, cmd.tone, cmd.pledge));
    case 'room.captain': return room(cmdCaptain(w, c, cmd.playerId));
    case 'room.answer': return room(cmdAnswer(w, c, cmd.playerId, cmd.answer));
    case 'room.clause': return room(cmdClause(w, c, cmd.playerId, cmd.answer));
    case 'match.save': {
      // The live match belongs to this career's next fixture and only its own clubs play in it.
      const m = cmd.live;
      if (!m.sides.some((s) => s.clubId === c.clubId)) return no('match');
      if (c.live && c.live.key !== m.key) return no('match');
      return { world: w, career: { ...c, live: m } };
    }
  }
}

const DEPT_OF: Partial<Record<CommandType, Dept>> = {
  'tactics.set': 'matchprep', 'tactics.preset': 'matchprep', 'tactics.patch': 'matchprep', 'planB.set': 'matchprep', 'rest.set': 'matchprep', 'talk.set': 'matchprep', 'report.make': 'opposition',
  'prep.set': 'fitness', 'training.set': 'fitness', 'medical.treat': 'fitness', 'squad.talk': 'development', 'academy.promote': 'development',
  'academy.release': 'development', 'academy.sell': 'development', 'academy.scout': 'development', 'academy.loan': 'development',
  'pathway.recall': 'development', 'pathway.word': 'development', 'transfer.bid': 'recruitment',
  'loan.in': 'recruitment', 'loan.out': 'recruitment', 'shortlist.toggle': 'recruitment', 'offer.accept': 'contracts', 'offer.reject': 'contracts',
  'offer.counter': 'contracts', 'contract.renew': 'contracts', 'player.list': 'contracts', 'sponsor.sign': 'commercial', 'sponsor.haggle': 'commercial',
  'sponsor.extend': 'commercial', 'sponsor.end': 'commercial', 'ticket.set': 'commercial',
  'room.talk': 'development', 'room.captain': 'matchprep', 'room.answer': 'contracts', 'room.clause': 'contracts',
};
export const deptOfCommand = (t: CommandType) => DEPT_OF[t];

// Commands that change nothing another screen cares about don't need their own line in the log.
const QUIET = new Set<CommandType>(['match.save', 'inbox.read', 'talk.set']);

// `by`: who issued it — the manager ('me') or a member of staff (their role), for the log and the Why.
export function dispatch(w: World, c: Career, cmd: Command, by = 'me', cause?: string): Result {
  const r = run(w, c, cmd);
  if (!r) return no('unknown'); // a command this build doesn't know (an old staff proposal): nothing happens
  if ('ok' in r && r.ok === false) return r;
  const next = r as { world: World; career: Career; note?: Done['note'] };
  if (QUIET.has(cmd.type)) return { ok: true, world: next.world, career: next.career, events: [], note: next.note };
  const data: Record<string, string | number | boolean | null> = { by };
  const refs: { p?: string[]; c?: string[] } = {};
  const pid = (cmd as { playerId?: string }).playerId ?? (cmd.type.startsWith('academy.') ? (cmd as { id?: string }).id : undefined);
  if (pid) refs.p = [pid];
  const club = (cmd as { clubId?: string }).clubId;
  if (club) refs.c = [club];
  const e = emit(next.career, 'cmd', cmd.type, { refs, data, cause });
  const career = stamp(c, e.career, e.id);
  return { ok: true, world: next.world, career, events: [e.id], note: next.note };
}

export const clubBudget = (w: World, c: Career) => clubOf(w, c)?.budget ?? 0;
