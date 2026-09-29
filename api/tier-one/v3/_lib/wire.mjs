// Tier One v3 — The Wire: calls on real rumours (DESIGN.md §4). Pure scoring and settlement; storage lives in index.js.
// Rumours and confirmed moves come from the Semba data snapshot (data/seed, served by /api/data/*).
// Settlement is automatic from the snapshot; wire-overrides.json corrects it by hand (DESIGN §16.1: override queue).

export const WIRE = {
  DAILY_CALLS: 5,            // new calls a day
  OPEN_CALLS: 40,            // open calls at once
  CORRECT_MIN: 15,           // one correction within 15 minutes
  LATE_HOURS: 6,             // late-wire rule window before the first report of the status change
  LATE_C: 0.90,
  GRACE_H: 72,               // window close + 72 h paperwork grace before a NO pays
  HEAT_MOVE: 0.15,           // Heat points: the market moves 15 points toward you after lock (+1 × s, once)
  // Transfer windows close (UTC) — the date a "no move" rumour resolves NO (+ grace).
  CLOSES: { '2026-summer': '2026-09-02', '2027-01': '2027-02-03', '2027-summer': '2027-09-01' },
  FEE_BANDS: ['u20', '20-50', '50-80', '80+', 'free'],
  GBP_EUR: 1.17,
};

const CRED = { strong: 0.5, solid: 0.38, speculative: 0.25, weak: 0.15 };
const STAGE = { interest: 0, talks: 0.08, bid: 0.14, agreed: 0.3 };
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// The data half of the Market (DESIGN §4.2: p_market). The snapshot has no calibrated p_market yet, so it is read off
// the rumour's credibility bucket and deal stage. The crowd half joins only once Correspondents have 20+ resolved calls.
export function marketOf(r) {
  if (r.status === 'confirmed') return 0.95;
  const st = Math.max(0, ...(r.linked || []).map((l) => STAGE[l.stage] || 0));
  return clamp((CRED[r.credibility] ?? 0.25) + st, 0.05, 0.95);
}

export function feeBand(t) {
  if (!t) return null;
  if (t.type === 'loan' || t.type === 'free' || t.type === 'loan-to-buy') return 'free';
  if (!t.fee || !t.fee.value) return null;
  const eur = t.fee.currency === 'GBP' ? t.fee.value * WIRE.GBP_EUR : t.fee.value;
  const m = eur / 1e6;
  return m <= 20 ? 'u20' : m <= 50 ? '20-50' : m <= 80 ? '50-80' : '80+';
}

// How a rumour stands now: { state: 'open'|'frozen'|'moved'|'stayed'|'void', club, fee, at }
export function rumourState(r, snap, overrides, now = Date.now()) {
  const o = overrides && overrides[r.id];
  if (o && o.outcome) return { state: o.outcome === 'moved' ? 'moved' : o.outcome === 'void' ? 'void' : 'stayed', club: o.clubId || null, fee: o.fee || null, at: Date.parse(o.at || '') || now, manual: true };
  const since = r.firstSeen || '0000';
  const t = (snap.transfers || []).filter((x) => x.playerId === r.playerId && x.date && x.date >= since && x.fromClubId === r.currentClubId)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (t) {
    const linked = (r.linked || []).some((l) => l.clubId && l.clubId === t.toClubId);
    return { state: 'moved', club: linked ? t.toClubId : 'other', fee: feeBand(t), at: Date.parse(t.date + 'T00:00:00Z') };
  }
  const close = WIRE.CLOSES[r.window];
  if (close && now > Date.parse(close + 'T00:00:00Z') + WIRE.GRACE_H * 3600e3) return { state: 'stayed', club: null, fee: null, at: Date.parse(close + 'T00:00:00Z') };
  if (r.status !== 'open' || (r.linked || []).some((l) => l.stage === 'agreed')) return { state: 'frozen' };
  return { state: 'open' };
}

// Points for a settled call (DESIGN §4.2). call = { yes, s, c, club, cClub, fee, at }
export function wirePoints(call, st) {
  if (st.state === 'void') return { pts: 0, right: null, parts: {} };
  const happened = st.state === 'moved';
  const right = call.yes === happened, s = call.s;
  let c = call.c;
  // Late-wire rule: filed in the 6 hours before the status change was first reported.
  if (st.at && call.at >= st.at - WIRE.LATE_HOURS * 3600e3) c = Math.max(c, WIRE.LATE_C);
  if (!right) return { pts: -round1(s * 10 * c), right: false, parts: { lose: -round1(s * 10 * c), late: c !== call.c } };
  const days = Math.max(0, (st.at - call.at) / 864e5), L = 1 + 0.25 * Math.min(1, days / 28);
  const main = s * (10 * (1 - c) + 2) * L;
  let where = 0, fee = 0;
  if (happened && call.yes && call.club && call.club === st.club) where = s * 8 * (1 - (call.cClub ?? 0.5));
  if (happened && call.yes && call.fee && call.fee === st.fee) fee = 2 * s;
  return { pts: round1(main + where + fee), right: true, parts: { main: round1(main), where: round1(where), fee, lead: round1(L * 100) / 100, late: c !== call.c } };
}
const round1 = (x) => Math.round(x * 10) / 10;

// Hit rate, shrunk: (hits + 5) / (n + 10), stake-weighted.
export const hitRate = (hits, n) => (hits + 5) / (n + 10);
