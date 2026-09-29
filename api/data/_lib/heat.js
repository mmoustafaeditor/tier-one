// Rumour "heat" 0-100: how hot a rumour is right now. Used to sort /api/data/rumours.
//   credibility of the best outlet (tier 1 strongest) + number of independent outlets + deal stage + recency.
// Recency halves every HALF_LIFE days since lastSeen; open rumours not seen for DEAD_AFTER days read as dead.
export const HALF_LIFE = 14;
export const DEAD_AFTER = 60;
const TIER = { 1: 40, 2: 30, 3: 18, 4: 8 };
const STAGE = { interest: 0, talks: 12, bid: 20, agreed: 30 };
const DAY = 86400e3;

export function heat(r, now = Date.now()) {
  if (r.status !== 'open') return 0;
  const best = r.outlets.length ? Math.min(...r.outlets.map((o) => o.tier || 4)) : 4;
  const n = new Set(r.outlets.map((o) => (o.name || '').toLowerCase())).size;
  const stage = Math.max(0, ...r.linked.map((l) => STAGE[l.stage] || 0));
  const base = TIER[best] + Math.min(20, (n - 1) * 7) + stage + (r.window === '2027-01' ? 10 : 0);
  const age = r.lastSeen ? Math.max(0, (now - Date.parse(r.lastSeen + 'T00:00:00Z')) / DAY) : DEAD_AFTER;
  return Math.round(Math.min(100, base) * Math.pow(0.5, age / HALF_LIFE));
}

/** Status as of `now`: an open rumour nobody has reported for DEAD_AFTER days is shown as dead. */
export function liveStatus(r, now = Date.now()) {
  if (r.status !== 'open' || !r.lastSeen) return r.status;
  return (now - Date.parse(r.lastSeen + 'T00:00:00Z')) / DAY > DEAD_AFTER ? 'dead' : 'open';
}
