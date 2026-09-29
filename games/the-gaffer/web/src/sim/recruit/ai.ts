// The AI market around the user (V2_DESIGN §3.4 "AI market", §4 "Unhappy star joins a rival"). AI clubs derive their
// needs with the same function as the user (needs.ts) and:
//  - bid for the user's UNLISTED players when a need matches and the player is unhappy or has ≤ 1 year left
//    (listed players already draw offers from season.ts `makeOffers`);
//  - pay a release clause when one is within reach (the future loss the clause was);
//  - chase the user's targets while a bid is on the table (the hijack roll: 8 % × the number of interested clubs).
import { FREE_AGENT, type Career, type Offer, type Player } from '../../model/types';
import { playerOf, squadOf, squadStrength, type World } from '../world';
import { rngFor } from '../rng';
import { acceptOffer } from '../transfers';
import { isDeadlineDay, windowOf } from '../windows';
import { loanOf } from '../loans';
import { addNews } from '../news';
import { addMsg } from '../coach';
import { roundFee } from '../season';
import { aiNeeds, posMatches } from './needs';
import { rcOf, step, withRC } from './state';
import { settleSellOn } from './deals';

// ---------- the dressing-room adapter ----------
// V2.4 (dressing room) owns morale, trust and transfer requests and will expose something like
// `unhappyPlayers(world, clubId)`. Until it lands this reads the fields defensively; the integrator points THIS ONE
// function at the real thing and every AI bid, Today card and news line follows.
type Moody = Player & { trust?: number; request?: boolean; transferRequest?: boolean };
export function unhappyPlayers(w: World, _c: Career, clubId: string): Player[] {
  return squadOf(w, clubId).filter((p) => isUnhappy(p));
}
export function isUnhappy(p: Player): boolean {
  const m = p as Moody;
  if (m.request === true || m.transferRequest === true) return true;
  if (typeof m.trust === 'number') return m.trust < 25 && p.morale < 40;
  return p.morale < 35;
}
export const hasRequest = (p: Player) => (p as Moody).request === true || (p as Moody).transferRequest === true;

// ---------- who would buy ----------
const STRENGTH = new WeakMap<Player[], Map<string, number>>();
function strength(w: World, clubId: string): number {
  let m = STRENGTH.get(w.players);
  if (!m) { m = new Map(); STRENGTH.set(w.players, m); }
  let v = m.get(clubId);
  if (v === undefined) { v = squadStrength(squadOf(w, clubId)); m.set(clubId, v); }
  return v;
}

// AI clubs that need a player like this and could pay `fee` (strongest fit first).
export function suitors(w: World, c: Career, p: Player, fee: number, exclude: string[] = []): string[] {
  const country = new Map(w.leagues.map((l) => [l.id, l.country]));
  const mine = country.get(w.clubs.find((x) => x.id === c.clubId)?.leagueId ?? '');
  const out: { id: string; s: number }[] = [];
  for (const cl of w.clubs) {
    if (cl.id === c.clubId || cl.id === p.clubId || exclude.includes(cl.id) || cl.budget < fee) continue;
    const s = strength(w, cl.id);
    if (s < p.rating - 8 || s > p.rating + 4) continue;
    if (!aiNeeds(w, cl.id, c.season).some((pos) => posMatches(p, pos))) continue;
    out.push({ id: cl.id, s: -Math.abs(s - p.rating + 2) + (country.get(cl.leagueId) === mine ? 3 : 0) });
  }
  return out.sort((a, b) => b.s - a.s).map((x) => x.id);
}

// ---------- AI bids for the user's players ----------
export function aiBids(w: World, c: Career): Career {
  if (!windowOf(c)) return c;
  const r = rngFor(c.seed, 'aibid', c.season, c.round);
  const dd = isDeadlineDay(c) ? 2 : 1;
  let career = c;
  let rc = rcOf(c);
  const offers: Offer[] = [...c.offers];
  for (const p of squadOf(w, c.clubId)) {
    if (p.listed || loanOf(c, p.id) || offers.some((o) => o.playerId === p.id)) continue;
    const unhappy = isUnhappy(p);
    const left = p.contractUntil - c.season;
    const why = hasRequest(p) ? 'request' : unhappy ? 'unhappy' : left <= 1 ? 'expiring' : null;
    if (!why) continue;
    const chance = (why === 'request' ? 0.45 : why === 'unhappy' ? 0.3 : 0.12) * dd;
    if (r() >= chance) continue;
    const fee = roundFee(p.marketValue * (why === 'expiring' ? 0.6 + r() * 0.25 : 0.85 + r() * 0.2));
    const buyer = suitors(w, c, p, fee)[0];
    if (!buyer) continue;
    const o: Offer = { id: `rco${c.season}_${c.round}_${p.id}`, playerId: p.id, clubId: buyer, fee, round: c.round };
    offers.push(o);
    rc = { ...rc, aiWhy: { ...rc.aiWhy, [o.id]: why } };
    rc = step(rc, c, { pid: p.id, pn: p.name, kind: 'sale', club: buyer }, `bid_${why}`, { n: fee, club: buyer });
    career = addNews(career, 'transfers', 'rc.aiBid', { player: p.id, pn: p.name, club: buyer, club2: c.clubId, n: fee, s: why });
    career = addMsg(career, 'offer', 'offerIn', { player: p.id, pn: p.name, club: buyer });
  }
  // Old reasons for offers that are gone are dropped.
  const live = new Set(offers.map((o) => o.id));
  rc = { ...rc, aiWhy: Object.fromEntries(Object.entries(rc.aiWhy).filter(([id]) => live.has(id))) };
  return withRC({ ...career, offers }, rc);
}

// ---------- release clauses ----------
export function releaseClauses(w: World, c: Career): { world: World; career: Career } {
  if (!windowOf(c)) return { world: w, career: c };
  const rc = rcOf(c);
  const r = rngFor(c.seed, 'release', c.season, c.round);
  const us = w.clubs.find((x) => x.id === c.clubId)?.reputation ?? 50;
  let world = w, career = c;
  for (const [id, cl] of Object.entries(rc.clauses)) {
    if (!cl.release) continue;
    const p = playerOf(world, id);
    if (!p || p.clubId !== c.clubId || loanOf(career, id)) continue;
    if (r() >= 0.2 * (isDeadlineDay(c) ? 2 : 1)) continue;
    const buyer = suitors(world, career, p, cl.release).find((b) => (world.clubs.find((x) => x.id === b)?.reputation ?? 0) >= us - 5);
    if (!buyer) continue;
    const res = acceptOffer(world, career, { id: `rcr${c.season}_${c.round}_${id}`, playerId: id, clubId: buyer, fee: cl.release, round: c.round });
    if (!res.ok) continue;
    ({ world, career } = settleSellOn(res.world, res.career, id, cl.release));
    let rc2 = rcOf(career);
    rc2 = step(rc2, career, { pid: id, pn: p.name, kind: 'sale', club: buyer }, 'release', { n: cl.release, club: buyer }, true);
    career = withRC(career, rc2);
    career = addNews(career, 'transfers', 'rc.release', { player: id, pn: p.name, club: buyer, club2: c.clubId, n: cl.release });
    career = addMsg(career, 'offer', 'rc.release', { player: id, pn: p.name, club: buyer, n: cl.release });
  }
  return { world, career };
}

// ---------- the hijack roll ----------
// How many clubs want this player (need + money + level), capped at 5: 8 % each, every matchday our bid waits.
export function interestCount(w: World, c: Career, p: Player, fee: number): number {
  if (p.clubId === FREE_AGENT) return 0;
  return Math.min(5, suitors(w, c, p, fee).length);
}
