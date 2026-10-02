// Tier One v3 — who the sagas are about. Pure: takes the Semba data snapshot (data/seed via api/data/_lib/store.js,
// which already applies SEMBA_DATA_NAMES=fictional) and a seed, returns the cast of a window.
// A saga's player is always at the club he is at today in the snapshot; clubs are names + colours only (no crests).
import { RNG } from './rng.mjs';

// Clubs that buy: linked and hijack clubs come from here, so a saga reads like a real window.
export const BUYERS = [
  'eng-arsenal', 'eng-chelsea', 'eng-liverpool', 'eng-man-city', 'eng-man-utd', 'eng-newcastle', 'eng-tottenham', 'eng-aston-villa',
  'esp-real-madrid', 'esp-barcelona', 'esp-atletico', 'ita-inter', 'ita-milan', 'ita-juventus', 'ita-napoli', 'ita-roma',
  'ger-bayern', 'ger-dortmund', 'ger-leverkusen', 'ger-leipzig', 'fra-psg', 'fra-marseille', 'fra-monaco',
  'ksa-al-hilal', 'ksa-al-nassr', 'ksa-al-ittihad', 'ksa-al-ahli',
];
const KEY_SHIRTS = new Set([7, 8, 9, 10, 11]);
const TOP5 = new Set(['eng1', 'esp1', 'ita1', 'ger1', 'fra1']);

// The window that just closed (GOTY §5): its big-money signings are the names people know right now, so they make the
// saga-able cut at their new club even without a 7–11 shirt yet.
export const LAST_WINDOW = '2026-summer';
const MARQUEE_EUR = 35e6;
const eurOf = (t) => (t && t.fee && t.fee.value ? (t.fee.currency === 'GBP' ? t.fee.value * 1.17 : t.fee.value) : 0);

const ageOn = (birth, asOf) => {
  if (!birth) return 0;
  const b = Date.parse(birth + 'T00:00:00Z'), n = Date.parse((asOf || '2026-09-29') + 'T00:00:00Z');
  return Math.floor((n - b) / (365.25 * 864e5));
};

// Compact, public world: clubs + the players a saga can be about. Small enough to bundle into the app.
export function compactWorld(snap, perClub = 9) {
  const buyers = new Set(BUYERS);
  const clubs = snap.clubs.map((c) => ({ id: c.id, n: c.name, s: c.shortName, k: c.code, l: c.leagueId, c1: c.colors.primary, c2: c.colors.secondary }));
  const clubIds = new Set(clubs.map((c) => c.id));
  const byClub = new Map();
  const marquee = new Set((snap.transfers || []).filter((t) => t.window === LAST_WINDOW && t.toClubId && eurOf(t) >= MARQUEE_EUR && eurOf(t) < 3e8)
    .map((t) => t.playerId + '>' + t.toClubId));
  // Players live on the Wire stay in the world too, so Career/Practice can put them on a board (ON THE WIRE chips).
  const onWire = new Set((snap.rumours || []).filter((r) => r.status === 'open').map((r) => r.playerId));
  for (const p of snap.players) {
    if (!clubIds.has(p.clubId) || p.position === 'GK' || (p.loan && p.loan.direction === 'out')) continue;
    const age = ageOn(p.birthDate, snap.meta && snap.meta.asOf);
    if (age && (age < 18 || age > 33)) continue;
    let w = (p.position === 'FW' ? 3 : p.position === 'MF' ? 2.5 : 1) + (KEY_SHIRTS.has(p.shirtNumber) ? 3 : 0) + (p.captain ? 2 : 0)
      + (p.refs && p.refs.wikidata ? 1 : 0) + (p.shirtNumber > 0 && p.shirtNumber < 30 ? 1 : 0) - (p.confidence === 'high' ? 0 : 2)
      + (marquee.has(p.id + '>' + p.clubId) ? 3 : 0) + (onWire.has(p.id) ? 3 : 0);
    if (!byClub.has(p.clubId)) byClub.set(p.clubId, []);
    byClub.get(p.clubId).push({ w, p, age });
  }
  const players = [];
  for (const c of clubs) {
    const list = (byClub.get(c.id) || []).sort((a, b) => b.w - a.w || a.p.id.localeCompare(b.p.id)).slice(0, perClub + (buyers.has(c.id) ? 2 : 0));
    for (const { p, age } of list) {
      const star = buyers.has(c.id) ? (KEY_SHIRTS.has(p.shirtNumber) || p.captain ? 3 : 2) : KEY_SHIRTS.has(p.shirtNumber) ? 2 : 1;
      players.push({ id: p.id, n: p.name, s: p.shortName || p.name, c: c.id, pos: p.position, no: p.shirtNumber || 0, nat: p.nationality || '', age, star });
    }
  }
  return { asOf: (snap.meta && snap.meta.asOf) || '', mode: snap.mode || 'real', clubs, players, buyers: BUYERS.filter((id) => clubIds.has(id)) };
}

// ---------- player status from the snapshot (LAUNCH_BRIEF Addendum B, the part that needs no provider).
// 'club' (on a covered club's roster) · 'loan' (on the roster on loan from elsewhere) · 'free' (positive evidence
// only: a recorded release / "unattached" with no later move, and no roster line) · 'unknown' (not in the snapshot).
// A blank club never means free agent; a player we don't know is 'unknown', never 'free'.
const FREE_WORDS = /^(unattached|free agent|released|without (a )?club|sin equipo|svincolato|senza contratto|libre)$/i;
export function playerStatus(snap, playerId) {
  const p = snap.players.find((x) => x.id === playerId);
  if (p) return { status: p.loan && p.loan.direction === 'in' ? 'loan' : 'club', clubId: p.clubId, from: p.loan && p.loan.direction === 'in' ? p.loan.fromClubId || null : null, fromName: p.loan && p.loan.direction === 'in' ? p.loan.fromName || null : null };
  const fa = freeAgentsOf(snap).find((x) => x.id === playerId);
  return fa ? { status: 'free', clubId: null, since: fa.since, lastClubId: fa.lastClubId, lastClub: fa.lastClub } : { status: 'unknown', clubId: null };
}
let faCache = null;
/** Free agents the snapshot can vouch for (sorted by release date, newest first). Empty when the data has none. */
export function freeAgentsOf(snap) {
  if (faCache && faCache.snap === snap) return faCache.list;
  const onRoster = new Set(snap.players.map((p) => p.id));
  const byPlayer = new Map();
  for (const t of snap.transfers || []) { if (!t.playerId) continue; if (!byPlayer.has(t.playerId)) byPlayer.set(t.playerId, []); byPlayer.get(t.playerId).push(t); }
  const list = [];
  for (const [pid, ts] of byPlayer) {
    if (onRoster.has(pid)) continue;
    const last = ts.filter((t) => t.date).sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!last || last.toClubId || !FREE_WORDS.test(String(last.toName || '').trim())) continue;
    list.push({ id: pid, n: last.playerName || pid, since: last.date, lastClubId: last.fromClubId || null, lastClub: last.fromName || null });
  }
  list.sort((a, b) => b.since.localeCompare(a.since));
  faCache = { snap, list };
  return list;
}

// The cast of one window. opts.n sagas; opts.pool = 'top' (Daily: top-5 leagues + Saudi/Egypt giants) or 'small'
// (Career's early ranks: players at clubs that don't buy). Deterministic in (seed, world).
export function buildCast(seed, world, opts = {}) {
  const n = opts.n || 5, rng = new RNG('v3c:' + seed);
  const club = new Map(world.clubs.map((c) => [c.id, c]));
  const buyers = world.buyers.filter((id) => club.has(id));
  const buyerSet = new Set(buyers);
  let pool = world.players.filter((p) => {
    const c = club.get(p.c); if (!c) return false;
    if (opts.pool === 'small') return !buyerSet.has(p.c) && TOP5.has(c.l);
    if (opts.pool === 'stars') return p.star >= 2;
    return TOP5.has(c.l) || buyerSet.has(p.c);
  });
  if (pool.length < n * 3) pool = world.players.slice();
  const used = new Set(), sagas = [];
  let guard = 0;
  while (sagas.length < n && guard++ < 500) {
    // weight toward known names without making every board all superstars
    const cand = pool[rng.int(pool.length)];
    if (used.has(cand.c) || (opts.maxStar && cand.star > opts.maxStar)) continue;
    if (opts.pool !== 'small' && cand.star === 1 && rng.chance(0.5)) continue;
    const others = buyers.filter((id) => id !== cand.c && !sagas.some((s) => s.to === id));
    if (others.length < 2) continue;
    const to = others[rng.int(others.length)];
    const rest = others.filter((id) => id !== to);
    const alt = rest[rng.int(rest.length)];
    used.add(cand.c);
    sagas.push({ i: sagas.length, player: cand, from: cand.c, to, alt });
  }
  return { sagas, clubs: [...new Set(sagas.flatMap((s) => [s.from, s.to, s.alt]))].map((id) => club.get(id)) };
}
