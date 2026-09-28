// The newspaper and transfer rumours.
// News: built from what really happened each matchday, one item per event, never repeated (E2E #59).
// Rumours: other clubs chase good players; unless the user hijacks the deal, it may go through at the deadline,
// so clubs now also trade players among themselves.
import type { Career, NewsCat, NewsItem, Player, Rumour } from '../model/types';
import { FREE_AGENT } from '../model/types';
import { makeRng, int } from './rng';
import { freeShirt, playerOf, squadOf, wageOf, type World } from './world';
import { roundFee, table } from './season';
import { askingPrices } from './transfers';

const MAX_NEWS = 40;

export function addNews(c: Career, cat: NewsCat, key: string, ref: Omit<NewsItem, 'id' | 'season' | 'round' | 'cat' | 'key'> = {}): Career {
  const id = `${c.season}.${key}.${ref.club ?? ''}.${ref.club2 ?? ''}.${ref.player ?? ''}.${ref.n ?? ''}`;
  if ((c.news ?? []).some((x) => x.id === id)) return c; // never the same story twice
  const item: NewsItem = { id, season: c.season, round: c.round, cat, key, ...ref };
  return { ...c, news: [item, ...(c.news ?? [])].slice(0, MAX_NEWS) };
}

// After a league matchday: the round's biggest win, a new leader, goal landmarks, crises and youth debuts in the user's league.
export function newsRound(before: Career, w: World, c: Career): Career {
  const lid = w.clubs.find((x) => x.id === c.clubId)!.leagueId;
  const round = c.fixtures[lid]?.[before.round];
  if (!round) return c;
  let out = c;
  const big = [...round].filter((f) => f[2] >= 0).sort((a, b) => Math.abs(b[2] - b[3]) - Math.abs(a[2] - a[3]))[0];
  if (big && Math.abs(big[2] - big[3]) >= 3) {
    const [win, lose] = big[2] > big[3] ? [big[0], big[1]] : [big[1], big[0]];
    out = addNews(out, 'results', 'thrash', { club: win, club2: lose, s: `${Math.max(big[2], big[3])}-${Math.min(big[2], big[3])}`, n: before.round });
  }
  const tNow = table(w, c, lid), tBefore = table(w, before, lid);
  if (tNow[0].p > 3 && tNow[0].clubId !== tBefore[0].clubId) out = addNews(out, 'results', 'newLeader', { club: tNow[0].clubId, n: before.round });
  // Goal landmarks: 10, 20, 30 league goals.
  for (const [id, st] of Object.entries(c.stats)) {
    const was = before.stats[id]?.[1] ?? 0;
    for (const mark of [10, 20, 30]) if (was < mark && st[1] >= mark) {
      const p = playerOf(w, id);
      if (p && w.clubs.find((x) => x.id === p.clubId)?.leagueId === lid) out = addNews(out, 'records', 'goals', { player: id, pn: p.name, club: p.clubId, n: mark });
    }
  }
  // Crisis: five league defeats in a row.
  for (const row of tNow) if (row.form.slice(-5).length === 5 && row.form.slice(-5).every((x) => x === 'L')) out = addNews(out, 'crisis', 'crisis', { club: row.clubId }); // once a season per club
  // Youth: an under-21 of the user's club plays his first league game.
  for (const p of squadOf(w, c.clubId)) {
    if (c.season - p.birthYear <= 21 && (c.stats[p.id]?.[0] ?? 0) === 1 && (before.stats[p.id]?.[0] ?? 0) === 0) out = addNews(out, 'youth', 'debut', { player: p.id, pn: p.name, club: p.clubId });
  }
  return out;
}

// ---------- rumours ----------

// Every 4 matchdays: new rumours about good players; rumours at their deadline are settled.
export function rumoursRound(w: World, c: Career): { world: World; career: Career } {
  let world = w, career: Career = { ...c, rumours: c.rumours ?? [] };
  const r = makeRng((c.seed ^ (c.season * 131)) + c.round * 977);
  // Settle.
  for (const ru of career.rumours!.filter((x) => x.until <= c.round)) {
    career = { ...career, rumours: career.rumours!.filter((x) => x.id !== ru.id) };
    const p = playerOf(world, ru.playerId);
    const buyer = world.clubs.find((x) => x.id === ru.to)!;
    if (!p || p.clubId !== ru.from || p.clubId === c.clubId || r() * 100 > ru.chance) continue;
    if (buyer.budget < ru.fee || squadOf(world, ru.from).length <= 18 || squadOf(world, ru.to).length >= 30) continue;
    world = aiMove(world, p, ru.to, ru.fee, c.season);
    career = addNews(career, 'transfers', 'aiTransfer', { player: p.id, pn: p.name, club: ru.from, club2: ru.to, s: String(ru.fee) });
  }
  // New ones.
  if (c.round % 4 === 1) {
    const prices = askingPrices(world);
    const pool = world.players.filter((p) => p.clubId !== FREE_AGENT && p.clubId !== c.clubId && p.rating >= 72);
    for (let i = 0; i < 3 && pool.length; i++) {
      const p = pool[Math.floor(r() * pool.length)];
      const from = world.clubs.find((x) => x.id === p.clubId)!;
      const buyers = world.clubs.filter((x) => x.id !== from.id && x.id !== c.clubId && x.reputation >= from.reputation - 5 && x.reputation <= from.reputation + 20
        && x.budget >= (prices.get(p.id) ?? 0));
      if (!buyers.length || career.rumours!.some((x) => x.playerId === p.id)) continue;
      const to = buyers[Math.floor(r() * buyers.length)];
      const fee = roundFee((prices.get(p.id) ?? p.marketValue) * (0.9 + r() * 0.3));
      const ru: Rumour = { id: `ru${c.season}_${c.round}_${p.id}`, playerId: p.id, pn: p.name, from: from.id, to: to.id, fee, chance: int(r, 30, 80), until: c.round + 4 };
      career = { ...career, rumours: [...career.rumours!, ru] };
      career = addNews(career, 'transfers', 'rumour', { player: p.id, pn: p.name, club: to.id, club2: from.id, n: ru.chance });
    }
  }
  return { world, career };
}

// A transfer between two AI clubs.
function aiMove(w: World, p: Player, to: string, fee: number, season: number): World {
  const lid = w.clubs.find((x) => x.id === to)!.leagueId;
  const shirt = freeShirt(w, to, p.position);
  return {
    ...w,
    clubs: w.clubs.map((x) => (x.id === to ? { ...x, budget: x.budget - fee } : x.id === p.clubId ? { ...x, budget: x.budget + fee } : x)),
    players: w.players.map((x) => (x.id === p.id ? { ...x, clubId: to, shirtNumber: shirt, wage: Math.max(x.wage, wageOf(x.marketValue, lid)), contractUntil: season + 4 } : x)),
  };
}

// The user signed the player first: the rumour is over.
export const hijacked = (c: Career, playerId: string): Career => ({ ...c, rumours: (c.rumours ?? []).filter((x) => x.playerId !== playerId) });
