// V2.4: what the dressing room puts on Today (V2_DESIGN §2.3). A projection of the state, like the rest of the queue:
// a player waiting for a word, a promise about to break, a transfer request, a release clause met, the armband.
// Each card carries the staff member's call, the commands each choice runs and what each choice does to him.
import type { Career, Player, Pledge, SquadRole, StaffRole } from '../model/types';
import type { Command } from './commands';
import type { Choice, Decision, Fx } from './decisions';
import { playerOf, squadOf, type World } from './world';
import { DEFAULT_TACTICS, FORMATIONS, slotValue, xiFor } from './tactics';
import { renewDemand } from './transfers';
import { balanceOf } from './balance';
import { biasOf, levelOf, staffOf } from './delegation';
import { windowLeft } from './windows';
import {
  archetypeOf, canTalk, pledgeKey, hierarchy, homegrown, now, pledgeCheck, pledgeState, renewFactor, roomOf, talkCall, talkPreview, trustOf, type PledgeReq, type Tone,
} from './room';

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const talkFx = (w: World, c: Career, p: Player, tone: Tone): Fx[] => {
  const v = talkPreview(w, c, p, tone);
  const out: Fx[] = [];
  if (v.dm) out.push({ tone: v.dm > 0 ? 'good' : 'bad', icon: 'heart', key: 'dr.fx.morale', s: sign(v.dm) });
  if (v.dt) out.push({ tone: v.dt > 0 ? 'good' : 'bad', icon: 'handshake', key: 'dr.fx.trust', s: sign(v.dt) });
  if (!out.length) out.push({ tone: 'plain', icon: 'chat', key: 'dr.fx.shrug' });
  return out;
};
const talkChoices = (w: World, c: Career, p: Player, call: { tone: Tone; pledge: PledgeReq | null }): Choice[] => {
  const out: Choice[] = [
    { id: 'reassure', key: 'dr.ch.reassure', cmds: [{ type: 'room.talk', playerId: p.id, tone: 'reassure' }], pick: call.tone === 'reassure', fx: talkFx(w, c, p, 'reassure') },
    { id: 'challenge', key: 'dr.ch.challenge', cmds: [{ type: 'room.talk', playerId: p.id, tone: 'challenge' }], pick: call.tone === 'challenge', fx: talkFx(w, c, p, 'challenge') },
  ];
  if (call.pledge) {
    out.push({
      id: 'promise', key: `dr.ch.promise.${pledgeKey(call.pledge)}`, cmds: [{ type: 'room.talk', playerId: p.id, tone: 'promise', pledge: call.pledge }], pick: call.tone === 'promise',
      fx: [...talkFx(w, c, p, 'promise'), { tone: 'warn', icon: 'doc', key: `dr.fx.bind.${pledgeKey(call.pledge)}` }],
    });
  }
  return out;
};
const talker = (c: Career): StaffRole => (staffOf(c, 'psychologist') ? 'psychologist' : 'assistant');

// Puts him in the XI for the next match in the slot where he costs the least.
function startHim(w: World, c: Career, p: Player): { cmd: Command; cost: number } | null {
  const { xi } = xiFor(w, c);
  if (xi.some((q) => q.id === p.id) || p.injured || p.banned) return null;
  const tac = c.tactics ?? DEFAULT_TACTICS;
  const slots = FORMATIONS[tac.formation].slots;
  let best = -1, cost = Infinity;
  xi.forEach((q, i) => {
    if (!slots[i] || (slots[i].pos === 'GK') !== (p.position === 'GK')) return;
    const d = slotValue(q, slots[i].pos) - slotValue(p, slots[i].pos);
    if (d < cost) { cost = d; best = i; }
  });
  if (best < 0) return null;
  const ids = xi.map((q) => q.id);
  ids[best] = p.id;
  return { cmd: { type: 'tactics.set', tactics: { ...tac, xi: ids } }, cost: Math.round(cost) };
}

export function roomDecisions(w: World, c: Career): Decision[] {
  const room = roomOf(c);
  if (room.club !== c.clubId) return [];
  const out: Decision[] = [];
  const t = now(c);

  // 1. A player waiting for a word.
  for (const a of room.asks) {
    const p = playerOf(w, a.playerId);
    if (!p || p.clubId !== c.clubId || !canTalk(w, c, p).ok) continue;
    if (levelOf(c, 'development') === 'staff' && staffOf(c, 'psychologist')) continue; // he takes it
    const call = talkCall(w, c, p, a.why);
    out.push({
      id: `ask:${p.id}:${a.made}`, kind: 'talk', dept: 'development', role: talker(c), icon: 'chat', ev: a.ev,
      title: { key: `dr.ask.${a.why}`, pn: p.name, p: p.id },
      advice: { key: `dr.adv.${call.tone}${call.pledge ? `.${call.pledge.type}` : ''}`, pn: p.name, s: archetypeOf(p) },
      due: { key: 'days', n: Math.max(1, a.until - t + 1) },
      choices: talkChoices(w, c, p, call), score: a.why === 'broken' ? 74 : 64, open: { to: 'player', id: p.id },
    });
  }

  // 2. Transfer requests waiting for an answer.
  for (const p of squadOf(w, c.clubId)) {
    if (p.req === undefined || p.reqNo || p.listed) continue;
    const rank = [...squadOf(w, c.clubId)].sort((a, b) => b.rating - a.rating).findIndex((q) => q.id === p.id);
    const b = biasOf(staffOf(c, 'director'));
    const talk = canTalk(w, c, p);
    const q: PledgeReq = { type: 'role', role: (rank < 3 ? 'star' : rank < 11 ? 'starter' : 'rotation') as SquadRole };
    const canPromise = talk.ok && !pledgeCheck(w, c, p, q) && trustOf(p) >= 20;
    const call = b === 'money' ? 'list' : rank < 5 ? (canPromise && b !== 'cautious' ? 'promise' : 'refuse') : b === 'loyal' && canPromise ? 'promise' : 'list';
    const choices: Choice[] = [
      { id: 'list', key: 'dr.ch.list', cmds: [{ type: 'room.answer', playerId: p.id, answer: 'list' }], pick: call === 'list', fx: [{ tone: 'good', icon: 'heart', key: 'dr.fx.morale', s: '+6' }, { tone: 'warn', icon: 'market', key: 'dr.fx.bids' }] },
      { id: 'refuse', key: 'dr.ch.refuse', cmds: [{ type: 'room.answer', playerId: p.id, answer: 'refuse' }], pick: call === 'refuse', fx: [{ tone: 'bad', icon: 'handshake', key: 'dr.fx.trust', s: '-15' }, { tone: 'warn', icon: 'alert', key: 'dr.fx.stillWants' }] },
    ];
    if (canPromise) choices.push({ id: 'promise', key: `dr.ch.promise.${pledgeKey(q)}`, cmds: [{ type: 'room.talk', playerId: p.id, tone: 'promise', pledge: q }], pick: call === 'promise', fx: [{ tone: 'good', icon: 'check', key: 'dr.fx.withdraw' }, { tone: 'warn', icon: 'doc', key: `dr.fx.bind.${pledgeKey(q)}` }] });
    out.push({
      id: `req:${p.id}:${p.req}`, kind: 'request', dept: 'contracts', role: 'director', icon: 'alert',
      title: { key: 'dr.request', pn: p.name, p: p.id, n: p.marketValue },
      advice: { key: `dr.adv.req.${call}`, pn: p.name, n: rank + 1 },
      due: { key: 'week' }, choices, score: 80 + (rank < 5 ? 8 : 0), open: { to: 'player', id: p.id },
    });
  }

  // 3. A release clause met: binding, unless he wants to stay.
  for (const cl of room.clauses) {
    const p = playerOf(w, cl.playerId);
    if (!p || p.clubId !== c.clubId) continue;
    const stays = trustOf(p) >= 60 && p.req === undefined && p.morale >= 50;
    out.push({
      id: `clause:${p.id}:${cl.until}`, kind: 'clause', dept: 'contracts', role: 'director', icon: 'pound', ev: cl.ev,
      title: { key: 'dr.clause', pn: p.name, n: cl.fee, club: cl.clubId, p: p.id },
      advice: { key: stays ? 'dr.adv.clause.stay' : 'dr.adv.clause.go', pn: p.name, n: trustOf(p) },
      due: { key: 'days', n: Math.max(1, cl.until - t + 1) },
      choices: [
        { id: 'stay', key: 'dr.ch.stay', cmds: [{ type: 'room.clause', playerId: p.id, answer: 'stay' }], pick: stays, fx: [{ tone: stays ? 'good' : 'bad', icon: 'handshake', key: stays ? 'dr.fx.likelyStays' : 'dr.fx.likelyGoes', s: String(trustOf(p)) }] },
        { id: 'go', key: 'dr.ch.go', cmds: [{ type: 'room.clause', playerId: p.id, answer: 'go' }], pick: !stays, fx: [{ tone: 'good', icon: 'pound', key: 'cash', n: cl.fee }, { tone: 'bad', icon: 'squad', key: 'loseStarter' }] },
      ],
      score: 88, open: { to: 'player', id: p.id },
    });
  }

  // 4. A promise about to break.
  for (const pl of room.pledges) {
    if (pl.status !== 'open') continue;
    const p = playerOf(w, pl.playerId);
    if (!p || p.clubId !== c.clubId) continue;
    const d = promiseDue(w, c, p, pl);
    if (d) out.push(d);
  }

  // 5. The armband: nobody wears it, or the man who does has lost the room.
  const H = hierarchy(w, c);
  const squad = squadOf(w, c.clubId);
  const cap = squad.find((p) => p.captain);
  if (room.arm !== c.season && squad.length >= 11 && (!cap || H.get(cap.id)?.tier === 'fringe')) {
    const cands = squad.filter((p) => H.get(p.id)?.tier === 'leader' && p.id !== cap?.id)
      .sort((a, b) => (H.get(b.id)!.score + (homegrown(c, b) ? 5 : 0)) - (H.get(a.id)!.score + (homegrown(c, a) ? 5 : 0))).slice(0, 2);
    if (cands.length) {
      out.push({
        id: `arm:${c.season}:${cap?.id ?? 'none'}`, kind: 'armband', dept: 'matchprep', role: 'assistant', icon: 'star',
        title: { key: cap ? 'dr.arm.lost' : 'dr.arm.none', pn: cap?.name, p: cands[0].id },
        advice: { key: homegrown(c, cands[0]) ? 'dr.adv.arm.home' : 'dr.adv.arm', pn: cands[0].name, n: c.season - cands[0].birthYear },
        due: { key: 'week' },
        choices: [
          ...cands.map((p, i): Choice => ({ id: `give${i}`, key: 'dr.ch.armband', pn: p.name, cmds: [{ type: 'room.captain', playerId: p.id }], pick: i === 0, fx: [{ tone: 'good', icon: 'room', key: 'dr.fx.coh', s: '+2' }, { tone: 'good', icon: 'handshake', key: 'dr.fx.trust', s: '+6' }] })),
          { id: 'later', key: 'dr.ch.later', cmds: [], fx: [{ tone: 'plain', icon: 'clock', key: 'dr.fx.noChange' }] },
        ],
        score: 58, open: { to: 'squad' },
      });
    }
  }
  return out;
}

function promiseDue(w: World, c: Career, p: Player, pl: Pledge): Decision | null {
  const t = now(c);
  if (pl.type === 'role') {
    const s = pledgeState(pl);
    // Three matchdays before it can no longer be kept: the starts he still needs are within 2 of the matchdays left.
    if (pl.role === 'prospect' || !s.slipping || s.lost || s.margin > 2) return null;
    const start = startHim(w, c, p);
    const b = biasOf(staffOf(c, 'assistant'));
    const pick = !!start && start.cost <= (b === 'cautious' ? 2 : b === 'bold' ? 6 : 4);
    const choices: Choice[] = [];
    if (start) choices.push({ id: 'start', key: 'dr.ch.start', pn: p.name, cmds: [start.cmd], pick, fx: [{ tone: start.cost > 3 ? 'warn' : 'plain', icon: 'tactics', key: 'slotLevel', n: -start.cost }, { tone: 'good', icon: 'check', key: 'dr.fx.onTrack' }] });
    choices.push({ id: 'letgo', key: 'dr.ch.letgo', cmds: [], pick: !pick, fx: [{ tone: 'bad', icon: 'handshake', key: 'dr.fx.trust', s: '-20' }] });
    return {
      id: `pdue:${pl.id}:${pl.n}`, kind: 'promise', dept: 'matchprep', role: 'assistant', icon: 'doc', ev: pl.ev,
      title: { key: `dr.due.role.${pl.role}`, pn: p.name, n: pl.st, s: String(pl.el), p: p.id },
      advice: { key: pick ? 'dr.adv.due.start' : start ? 'dr.adv.due.cost' : 'dr.adv.due.none', pn: p.name, n: start?.cost ?? 0, s: String(s.left) },
      due: { key: 'days', n: Math.max(1, s.left) }, choices, score: 72, open: { to: 'player', id: p.id },
    };
  }
  if (pl.type === 'contract') {
    if (pl.due - t > 2 || p.contractUntil > (pl.cu0 ?? 0)) return null;
    const d = renewDemand(p, c.season, balanceOf(c).wages);
    const years = Math.min(d.maxYears, c.season - p.birthYear <= 26 ? 4 : 2);
    const wage = Math.round(d.wage * renewFactor(p, undefined, undefined));
    return {
      id: `pdue:${pl.id}`, kind: 'promise', dept: 'contracts', role: 'director', icon: 'doc', ev: pl.ev,
      title: { key: 'dr.due.contract', pn: p.name, p: p.id }, advice: { key: 'dr.adv.due.contract', pn: p.name, n: wage },
      due: { key: 'days', n: Math.max(1, pl.due - t) },
      choices: [
        { id: 'renew', key: 'renewYears', n: years, cmds: [{ type: 'contract.renew', playerId: p.id, wage, years }], pick: true, fx: [{ tone: 'plain', icon: 'pound', key: 'wagesYear', n: (wage - p.wage) * 12 }, { tone: 'good', icon: 'check', key: 'dr.fx.kept' }] },
        { id: 'letgo', key: 'dr.ch.letgo', cmds: [], fx: [{ tone: 'bad', icon: 'handshake', key: 'dr.fx.trust', s: '-20' }] },
      ],
      score: 70, open: { to: 'player', id: p.id },
    };
  }
  if (pl.type === 'sign') {
    const left = windowLeft(c);
    if (!left || left > 2) return null;
    return {
      id: `pdue:${pl.id}:${left}`, kind: 'promise', dept: 'recruitment', role: 'director', icon: 'market', ev: pl.ev,
      title: { key: 'dr.due.sign', pn: p.name, n: pl.group ?? 1, p: p.id }, advice: { key: 'dr.adv.due.sign', pn: p.name, n: pl.group ?? 1 },
      due: { key: 'window' },
      choices: [
        { id: 'market', key: 'findCover', cmds: [], pick: true, fx: [{ tone: 'plain', icon: 'search', key: 'toMarket' }], open: { to: 'transfers' } },
        { id: 'letgo', key: 'dr.ch.letgo', cmds: [], fx: [{ tone: 'bad', icon: 'handshake', key: 'dr.fx.trust', s: '-20' }] },
      ],
      score: 70,
    };
  }
  return null;
}
