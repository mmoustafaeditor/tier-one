// Brings saves from older builds up to date. Runs only AFTER the checksum has been verified,
// so it can never turn an edited save into a valid one.
import { FREE_AGENT, type Career, type Player } from '../model/types';
import { makeRng } from './rng';
import { seasonFixtures } from './season';
import { makeCups } from './cups';
import { newCoach } from './coach';
import { ensureDirector, newOps } from './economy';
import { makeAttrs, makeFreeAgents, seedElo, type World } from './world';

const hash = (s: string) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);

export function upgradeWorld(w: World, season: number): World {
  let players: Player[] = w.players;
  if (players.some((p) => !Array.isArray(p.attrs) || typeof p.fitness !== 'number')) {
    // v0.3 and older: add attributes and match condition.
    players = players.map((p) => (Array.isArray(p.attrs) && typeof p.fitness === 'number' ? p : {
      ...p, attrs: makeAttrs(makeRng(hash(p.id)), p.rating, p.position), fitness: 100, morale: 65, injured: 0, banned: 0,
    }));
  }
  if (!players.some((p) => p.clubId === FREE_AGENT)) players = [...players, ...makeFreeAgents(makeRng(season), season, 160)];
  const clubs = w.clubs.some((c) => typeof c.wageCap !== 'number')
    ? w.clubs.map((c) => (typeof c.wageCap === 'number' ? c : {
        ...c, wageCap: Math.round(players.filter((p) => p.clubId === c.id).reduce((s, p) => s + p.wage, 0) * 1.15),
      }))
    : w.clubs;
  if (clubs.some((c) => c.elo === undefined)) { const cs = clubs.map((c) => ({ ...c })); seedElo(cs, players); return { ...w, players, clubs: cs }; }
  return players === w.players && clubs === w.clubs ? w : { ...w, players, clubs };
}

type OldCareer = Career & { goals?: Record<string, number> };

export function upgradeCareer(w: World, c: OldCareer): Career {
  let next: OldCareer = c;
  // v0.2: no fixtures yet.
  if (!next.fixtures || !next.history) next = { ...next, round: 0, fixtures: seasonFixtures(w, next.seed, next.season), history: [] };
  // v0.3: goals only; v0.4 keeps [apps, goals, assists, yellows, reds].
  if (!next.stats) {
    const stats: Career['stats'] = {};
    for (const [id, g] of Object.entries(next.goals ?? {})) stats[id] = [0, g, 0, 0, 0];
    next = { ...next, stats };
  }
  if (!next.offers) next = { ...next, offers: [] };
  if (!next.deals) next = { ...next, deals: [] };
  // v0.5: no cups or coach yet. Cups start from the current matchday on.
  if (!next.cups) next = { ...next, cups: makeCups(w, next, null, next.round + 1), cupDay: next.round - 1 };
  if (!next.coach) next = { ...next, coach: newCoach(w.clubs.find((x) => x.id === next.clubId)!) };
  if (!next.board) next = { ...next, board: { confidence: 60, fans: 55 } };
  if (!next.inbox) next = { ...next, inbox: [] };
  if (!next.jobs) next = { ...next, jobs: [] };
  // v0.6: no club operations yet.
  if (!next.ops) next = { ...next, ops: newOps(w, w.clubs.find((x) => x.id === next.clubId)!, next.season) };
  if (!next.mastery) next = { ...next, mastery: { balanced: 100 } };
  // v0.12: the sporting director (staff delegation).
  next = ensureDirector(w, next) as OldCareer;
  const { goals: _drop, ...clean } = next;
  void _drop;
  return clean;
}
