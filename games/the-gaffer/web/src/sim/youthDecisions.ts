// V2.6 decisions on Today (a projection, never stored), in the staff's own voice:
//  risk     "Physio: he can play but risk is high"          (fitness dept; the doctor)
//  rush     "He could be back for Saturday if we push it"   (fitness dept; the doctor)
//  intake   "Intake Day is here"                            (always: it's the club's day)
//  ready    "The kid is ready for the first team"           (development dept; the Head of Youth)
//  loanee   "Loanee played 90 minutes three weeks running"  (always: a report with a choice)
//  benched  "Our loanee isn't playing"                      (window open: bring him home?)
//  full     "The academy is over capacity"                  (development dept)
//  ageout   "He's 20 and still in the academy"              (development dept)
// Every choice runs real commands (sim/commands.ts); "Open" lands on the screen that owns it.
import type { Career, Player } from '../model/types';
import type { Choice, Decision, Fx } from './decisions';
import type { Command } from './commands';
import { levelOf, biasOf, staffOf } from './delegation';
import { playerOf, squadOf, type World } from './world';
import { available, slotValue, xiFor, FORMATIONS, DEFAULT_TACTICS } from './tactics';
import { nextUserMatch } from './season';
import { windowOf } from './windows';
import { treatmentCost } from './training';
import {
  academyOf, academyLoanSpots, canRush, capOf, loaneesOf, matchRisk, readyBar, riskBand, rushGain, rushRisk, standout, startRating, tierOf,
} from './youth';

const days = (n: number) => ({ key: 'days' as const, n: Math.max(1, n) });

export function youthDecisions(w: World, c: Career): Decision[] {
  const out: Decision[] = [];
  const next = nextUserMatch(w, c);
  const squad = squadOf(w, c.clubId);
  const fitness = levelOf(c, 'fitness');
  const devLevel = levelOf(c, 'development');
  const doc = biasOf(staffOf(c, 'doctor'));
  const hoy = biasOf(staffOf(c, 'scout'));
  const age = (p: Player) => c.season - p.birthYear;

  // ---- risk: a loaded (or fragile) starter before kick-off ----
  if (next && fitness !== 'staff') {
    const { xi } = xiFor(w, c);
    const slots = FORMATIONS[(c.tactics ?? DEFAULT_TACTICS).formation].slots;
    const tiredCard = levelOf(c, 'matchprep') !== 'staff';
    const cand = xi.map((p, i) => ({ p, i })).filter(({ p }) => riskBand(p) === 2 && !(c.rested ?? []).includes(p.id) && !(tiredCard && p.fitness < 75))
      .sort((a, z) => matchRisk(z.p) - matchRisk(a.p))[0];
    if (cand) {
      const pos = slots[cand.i]?.pos ?? cand.p.position;
      const inXI = new Set(xi.map((p) => p.id));
      const backup = squad.filter((p) => !inXI.has(p.id) && available(p)).sort((a, z) => slotValue(z, pos) - slotValue(a, pos))[0];
      const risk = matchRisk(cand.p);
      const fragile = !!cand.p.rr && cand.p.rr[1] > 0;
      const rest = doc === 'cautious' || fragile || (doc !== 'bold' && risk >= 3);
      const diff = backup ? Math.round(slotValue(backup, pos) - slotValue(cand.p, pos)) : -99;
      out.push({
        id: `risk:${cand.p.id}:${c.season}:${c.round}`, kind: 'risk' as Decision['kind'], dept: 'fitness', role: 'doctor', icon: 'medic',
        title: { key: fragile ? 'y_fragile' : 'y_risk', pn: cand.p.name, n: fragile ? cand.p.rr![1] : cand.p.load ?? 0, p: cand.p.id },
        advice: { key: fragile ? 'y_risk_rr' : rest ? `y_risk_rest${doc === 'cautious' ? '_c' : ''}` : `y_risk_play${doc === 'bold' ? '_b' : ''}`, pn: cand.p.name, n: risk, s: backup ? backup.short ?? backup.name.en : '' },
        due: { key: 'kickoff' },
        choices: [
          { id: 'rest', key: 'restHim', pn: backup?.name, cmds: [{ type: 'rest.set', playerId: cand.p.id, rest: true }], pick: rest,
            fx: [{ tone: 'good', icon: 'medic', key: 'y_fx_safe' }, ...(backup ? [{ tone: diff >= 0 ? 'good' : 'warn', icon: 'tactics', key: 'slotLevel', n: diff } as Fx] : [])] },
          { id: 'play', key: 'playHim', cmds: [], pick: !rest,
            fx: [{ tone: risk >= 5 ? 'bad' : 'warn', icon: 'alert', key: 'y_fx_risk', n: risk }, ...(fragile ? [{ tone: 'bad', icon: 'medic', key: 'y_fx_fragile', n: cand.p.rr![1] } as Fx] : [])] },
        ],
        score: 78 + risk, open: { to: 'medical' } as Decision['open'],
      });
    }
  }

  // ---- rush: an injured key man who could be pushed back ----
  if (next && fitness !== 'staff') {
    const key = new Set([...squad].sort((a, z) => z.rating - a.rating).slice(0, 14).map((p) => p.id));
    const p = squad.filter((x) => key.has(x.id) && canRush(x)).sort((a, z) => z.rating - a.rating)[0];
    if (p) {
      const risk = rushRisk(c);
      const gain = rushGain(p);
      const yes = doc === 'bold' || (doc !== 'cautious' && risk <= 15);
      const cost = treatmentCost(w, c, 'specialist');
      const club = w.clubs.find((x) => x.id === c.clubId)!;
      const choices: Choice[] = [
        { id: 'rush', key: 'y_ch_rush', n: gain, cmds: [{ type: 'medical.treat', playerId: p.id, treatment: 'rush' }], pick: yes,
          fx: [{ tone: 'good', icon: 'clock', key: 'y_fx_sooner', n: gain }, { tone: 'bad', icon: 'medic', key: 'y_fx_relapse', n: risk }] },
        { id: 'heal', key: 'y_ch_heal', cmds: [], pick: !yes, fx: [{ tone: 'plain', icon: 'heart', key: 'y_fx_heal', n: p.injured }] },
      ];
      if (club.budget >= cost * 4 && p.injured >= 2) choices.push({ id: 'spec', key: 'y_ch_spec', n: cost, cmds: [{ type: 'medical.treat', playerId: p.id, treatment: 'specialist' }], fx: [{ tone: 'plain', icon: 'pound', key: 'fee', n: cost }, { tone: 'good', icon: 'clock', key: 'y_fx_sooner', n: Math.min(2, p.injured) }] });
      out.push({
        id: `rush:${p.id}:${c.season}:${p.inj0 ?? 0}:${c.round - (p.inj0 ?? 0) + p.injured}`, kind: 'rush' as Decision['kind'], dept: 'fitness', role: 'doctor', icon: 'medic',
        title: { key: 'y_rush', pn: p.name, n: p.injured, p: p.id },
        advice: { key: yes ? 'y_rush_yes' : 'y_rush_no', pn: p.name, n: risk },
        due: { key: 'kickoff' }, choices, score: 74, open: { to: 'medical' } as Decision['open'],
      });
    }
  }

  // ---- intake: the day itself ----
  const it = c.intake;
  if (it && it.season === c.season && it.arrived && it.club === c.clubId && c.round - it.day <= 6) {
    const kids = it.kids.map((k) => academyOf(w, c.clubId).find((x) => x.id === k.id)).filter((k): k is Player => !!k);
    if (kids.length) {
      const s = standout(kids);
      const all = academyOf(w, c.clubId);
      const cap = capOf(w, c, c.clubId);
      const over = Math.max(0, all.length - cap);
      const weakest = [...kids].sort((a, z) => a.potential - z.potential).slice(0, Math.max(1, Math.min(over, kids.length - 1)));
      out.push({
        id: `intake:${c.season}`, kind: 'intake' as Decision['kind'], dept: 'development', role: 'scout', icon: 'grad',
        title: { key: 'y_intake', n: kids.length },
        advice: { key: over ? 'y_intake_full' : 'y_intake', pn: s.name, s: s.position, n: tierOf(s.potential) },
        due: days(it.day + 6 - c.round),
        choices: [
          { id: 'all', key: 'y_ch_keepAll', cmds: [], pick: !over || hoy === 'youth' || hoy === 'loyal',
            fx: [{ tone: over ? 'warn' : 'good', icon: 'grad', key: over ? 'y_fx_spread' : 'y_fx_room', n: all.length, s: String(cap) }] },
          { id: 'trim', key: 'y_ch_trim', n: weakest.length, cmds: weakest.map((k) => ({ type: 'academy.release', id: k.id }) as Command), pick: !!over && hoy !== 'youth' && hoy !== 'loyal',
            fx: [{ tone: 'plain', icon: 'swap', key: 'y_fx_letGo', n: weakest.length }] },
        ],
        score: 88, open: { to: 'academy' } as Decision['open'],
      });
    }
  }

  const ac = academyOf(w, c.clubId);
  const bar = readyBar(w, c);

  // ---- ready: an academy player good enough for the first team ----
  if (devLevel !== 'staff') {
    const kid = ac.filter((k) => age(k) >= 17 && k.rating >= bar - 1).sort((a, z) => z.rating - a.rating)[0];
    if (kid) {
      const spot = windowOf(c) ? academyLoanSpots(w, c, kid, 1)[0] : undefined;
      const choices: Choice[] = [
        { id: 'up', key: 'y_ch_promote', cmds: [{ type: 'academy.promote', id: kid.id }], pick: hoy !== 'veteran',
          fx: [{ tone: 'good', icon: 'squad', key: 'y_fx_squad' }, { tone: 'plain', icon: 'pound', key: 'y_fx_proWage' }] },
      ];
      if (spot) choices.push({ id: 'loan', key: 'y_ch_loan', s: spot.clubId, cmds: [{ type: 'academy.loan', id: kid.id, to: spot.clubId }], pick: hoy === 'veteran',
        fx: [{ tone: 'good', icon: 'grow', key: spot.role === 0 ? 'y_fx_starter' : 'y_fx_rotation' }] });
      choices.push({ id: 'wait', key: 'wait', cmds: [], pick: !spot && hoy === 'veteran', fx: [{ tone: 'plain', icon: 'grad', key: 'y_fx_academyPace' }] });
      out.push({
        id: `ready:${kid.id}:${c.season}`, kind: 'ready' as Decision['kind'], dept: 'development', role: 'scout', icon: 'grad',
        title: { key: 'y_ready', pn: kid.name, n: kid.rating, p: kid.id },
        advice: { key: hoy === 'veteran' ? 'y_ready_v' : 'y_ready', pn: kid.name, n: bar },
        due: { key: 'week' }, choices, score: 64, open: { to: 'academy' } as Decision['open'],
      });
    }
  }

  // ---- loanee reports: three full games running, or not playing at all ----
  for (const { l, p } of loaneesOf(w, c)) {
    const run = p.run ?? 0;
    if (run >= 3) {
      const grown = p.rating - startRating(p, c.season);
      const choices: Choice[] = [
        { id: 'leave', key: 'y_ch_leave', cmds: [], pick: true, fx: [{ tone: 'good', icon: 'grow', key: 'y_fx_growing', n: grown }] },
        { id: 'word', key: 'y_ch_word', cmds: [{ type: 'pathway.word', playerId: p.id }], fx: [{ tone: 'good', icon: 'heart', key: 'y_fx_morale' }] },
      ];
      if (windowOf(c)) choices.push({ id: 'home', key: 'y_ch_recall', cmds: [{ type: 'pathway.recall', playerId: p.id }], fx: [{ tone: 'warn', icon: 'swap', key: 'y_fx_home' }] });
      out.push({
        id: `loanee:${p.id}:${c.season}:${Math.floor(run / 3)}`, kind: 'loanee' as Decision['kind'], dept: 'development', role: 'scout', icon: 'swap',
        title: { key: 'y_loanee', pn: p.name, n: run, club: l.to, p: p.id },
        advice: { key: grown > 0 ? 'y_loanee_up' : 'y_loanee', pn: p.name, n: grown, s: String(p.ms ?? 0) },
        due: { key: 'week' }, choices, score: 56, open: { to: 'academy' } as Decision['open'],
      });
    } else if (windowOf(c) && l.at !== undefined && c.round - l.at >= 5 && (p.m5 ?? 0) < 60) {
      out.push({
        id: `benched:${p.id}:${c.season}:${windowOf(c)}`, kind: 'benched' as Decision['kind'], dept: 'development', role: 'scout', icon: 'swap',
        title: { key: 'y_benched', pn: p.name, club: l.to, p: p.id },
        advice: { key: 'y_benched', pn: p.name, n: p.ms ?? 0 },
        due: { key: 'window' },
        choices: [
          { id: 'home', key: 'y_ch_recall', cmds: [{ type: 'pathway.recall', playerId: p.id }], pick: true, fx: [{ tone: 'good', icon: 'swap', key: 'y_fx_reloan' }] },
          { id: 'leave', key: 'y_ch_leave', cmds: [], fx: [{ tone: 'warn', icon: 'clock', key: 'y_fx_stall' }] },
        ],
        score: 60, open: { to: 'academy' } as Decision['open'],
      });
    }
  }

  // ---- the academy itself: over capacity, or a kid who has run out of time ----
  if (devLevel !== 'staff') {
    const cap = capOf(w, c, c.clubId);
    if (ac.length > cap && !out.some((d) => d.kind === ('intake' as Decision['kind']))) {
      const weakest = [...ac].sort((a, z) => (a.potential - age(a)) - (z.potential - age(z)))[0];
      out.push({
        id: `full:${c.season}:${ac.length}`, kind: 'full' as Decision['kind'], dept: 'development', role: 'scout', icon: 'grad',
        title: { key: 'y_full', n: ac.length, s: String(cap) },
        advice: { key: 'y_full', pn: weakest.name, n: weakest.potential },
        due: { key: 'week' },
        choices: [
          { id: 'go', key: 'y_ch_release', pn: weakest.name, cmds: [{ type: 'academy.release', id: weakest.id }], pick: hoy !== 'loyal', fx: [{ tone: 'good', icon: 'grad', key: 'y_fx_focus' }] },
          { id: 'keep', key: 'y_ch_keepAll', cmds: [], pick: hoy === 'loyal', fx: [{ tone: 'warn', icon: 'alert', key: 'y_fx_spread', n: ac.length, s: String(cap) }] },
        ],
        score: 40, open: { to: 'academy' } as Decision['open'],
      });
    }
    const old = ac.filter((k) => age(k) >= 20 && k.rating < bar - 1).sort((a, z) => z.rating - a.rating)[0];
    if (old) {
      const spot = windowOf(c) ? academyLoanSpots(w, c, old, 1)[0] : undefined;
      const choices: Choice[] = [
        { id: 'up', key: 'y_ch_promote', cmds: [{ type: 'academy.promote', id: old.id }], pick: old.potential >= bar + 2 && hoy !== 'money', fx: [{ tone: 'plain', icon: 'squad', key: 'y_fx_squad' }] },
        { id: 'go', key: 'y_ch_release', pn: old.name, cmds: [{ type: 'academy.release', id: old.id }], pick: old.potential < bar + 2 || hoy === 'money', fx: [{ tone: 'plain', icon: 'swap', key: 'y_fx_free' }] },
      ];
      if (spot) choices.splice(1, 0, { id: 'loan', key: 'y_ch_loan', s: spot.clubId, cmds: [{ type: 'academy.loan', id: old.id, to: spot.clubId }], fx: [{ tone: 'good', icon: 'grow', key: spot.role === 0 ? 'y_fx_starter' : 'y_fx_rotation' }] });
      out.push({
        id: `ageout:${old.id}:${c.season}`, kind: 'ageout' as Decision['kind'], dept: 'development', role: 'scout', icon: 'grad',
        title: { key: 'y_ageout', pn: old.name, n: age(old), p: old.id },
        advice: { key: old.potential >= bar + 2 ? 'y_ageout_keep' : 'y_ageout_go', pn: old.name, n: old.potential },
        due: { key: 'season' }, choices, score: 35, open: { to: 'academy' } as Decision['open'],
      });
    }
  }
  return out;
}

export const YOUTH_KINDS = ['risk', 'rush', 'intake', 'ready', 'loanee', 'benched', 'full', 'ageout'] as const;
void playerOf;
