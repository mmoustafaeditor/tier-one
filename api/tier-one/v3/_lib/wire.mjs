// Tier One v3 — the Transfer Market: calls on real rumours (LAUNCH_BRIEF §18, spec I). Pure scoring and settlement;
// storage lives in index.js. Rumours and confirmed moves come from the data snapshot (data/seed, served by
// /api/data/*); window dates come from calendar.mjs (never typed here). Settlement is automatic from the snapshot;
// wire-overrides.mjs corrects it by hand.
//
// 3.8 scoring (sim: docs/spec/I-transfer-market-system.md): a right call pays what the Market got wrong, a wrong call
// costs what the Market got right. Zero expected value at the Market price, so the season board ranks judgment, not
// volume of favourites (the old "+2 a call" paid favourite-spamming +4 a call, more than a skilled reporter's +2.7).
import { CALENDAR_DEFAULT, closesOf } from './calendar.mjs';

export const WIRE = {
  DAILY_CALLS: 5,            // new calls a day: the ritual, and the selection decision ("which five?")
  OPEN_CALLS: 60,            // open calls at once. One call per rumour already caps exposure at the pool; this only bounds storage
  CORRECT_MIN: 15,           // one correction within 15 minutes (a typo, not a rethink)
  LATE_HOURS: 6,             // late-call rule: filed within 6 h before the news was first reported → priced as if the Market knew
  LATE_C: 0.90,
  LEAD_X: 0.25,              // lead bonus: ×1.25 for a right call filed LEAD_DAYS before it settled (linear from ×1.0)
  LEAD_DAYS: 28,
  MIN_RIGHT: 1,              // a right call never pays less than 1 × confidence (a Confirmed hit is at least +3)
  DEST_RIGHT: 6,             // destination: right club +6 × confidence × (1 − share of the room on that club)
  DEST_WRONG: 2,             //              named a club, he moved elsewhere: −2 × confidence
  FEE_RIGHT: 2,              // fee band: right +2 × confidence, wrong −1 × confidence
  FEE_WRONG: 1,
  ROOM_X: 0.35,              // "against the room": your side held under 35% of the room (10+ reporters) when you filed
  ROOM_MIN: 10,
  CROWD_MIN: 5,              // the room's club split counts once 5 YES calls named a club
  FEE_BANDS: ['u20', '20-50', '50-80', '80+', 'free'],
  GBP_EUR: 1.17,
};

const CRED = { strong: 0.5, solid: 0.38, speculative: 0.25, weak: 0.15 };
const STAGE = { interest: 0, talks: 0.08, bid: 0.14, agreed: 0.3 };
const OUTLET_STEP = 0.03, OUTLET_MAX = 3; // each extra independent outlet +3 pts, up to +9
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const round1 = (x) => Math.round(x * 10) / 10;

// The Market price: the desk's own estimate of "he moves", from the rumour's credibility bucket, its deal stage and how
// many independent outlets carry it. Not a crowd number (the room is shown separately) and locked per call when filed.
export function marketOf(r) {
  if (r.status === 'confirmed') return 0.95;
  const st = Math.max(0, ...(r.linked || []).map((l) => STAGE[l.stage] || 0));
  const outlets = new Set((r.outlets || []).map((o) => (o.name || '').toLowerCase()).filter(Boolean)).size;
  return clamp((CRED[r.credibility] ?? 0.25) + st + OUTLET_STEP * Math.min(OUTLET_MAX, Math.max(0, outlets - 1)), 0.05, 0.95);
}

/** What one call stands to win or lose, before the lead and extras: the numbers the file sheet prints. */
export function stakeOf(yes, s, m) {
  const c = yes ? m : 1 - m;
  return { c, win: round1(Math.max(WIRE.MIN_RIGHT * s, s * 10 * (1 - c))), lose: round1(s * 10 * c) };
}

export function feeBand(t) {
  if (!t) return null;
  if (t.type === 'loan' || t.type === 'free' || t.type === 'loan-to-buy') return 'free';
  if (!t.fee || !t.fee.value) return null;
  const eur = t.fee.currency === 'GBP' ? t.fee.value * WIRE.GBP_EUR : t.fee.value;
  const m = eur / 1e6;
  return m <= 20 ? 'u20' : m <= 50 ? '20-50' : m <= 80 ? '50-80' : '80+';
}

// A call can outlive its rumour (a snapshot refresh drops it). Rumour ids end in their window ('…-202701', '…-2026summer').
export function windowOfId(rid) {
  const m = /-(\d{4})(01|summer)$/.exec(String(rid || ''));
  return m ? m[1] + (m[2] === '01' ? '-01' : '-summer') : null;
}
export const ghostRumour = (rid) => ({ id: rid, playerId: null, currentClubId: null, linked: [], window: windowOfId(rid), status: 'gone' });

const leagueOf = (snap, clubId) => { const c = clubId && (snap.clubs || []).find((x) => x.id === clubId); return c ? c.leagueId : null; };
const settleAt = (cal, r, snap) => { const iso = closesOf(cal, r.window, leagueOf(snap, r.currentClubId)); return iso ? Date.parse(iso) : null; };

// How a rumour stands now: { state: 'open'|'frozen'|'moved'|'stayed'|'void', club, fee, at }
export function rumourState(r, snap, overrides, now = Date.now(), cal = CALENDAR_DEFAULT) {
  const o = overrides && overrides[r.id];
  if (o && o.outcome) return { state: o.outcome === 'moved' ? 'moved' : o.outcome === 'void' ? 'void' : 'stayed', club: o.clubId || null, fee: o.fee || null, at: Date.parse(o.at || '') || now, manual: true };
  const closeAt = settleAt(cal, r, snap), graceMs = (cal.settleGraceH ?? 72) * 3600e3;
  // Gone from the snapshot with no hand correction: nobody can say what happened, so the stake comes back (void)
  // once its window has closed; until then it's frozen.
  if (r.status === 'gone') return closeAt != null && now > closeAt + graceMs ? { state: 'void', club: null, fee: null, at: closeAt } : { state: 'frozen' };
  const since = r.firstSeen || '0000';
  const t = (snap.transfers || []).filter((x) => x.playerId === r.playerId && x.date && x.date >= since && x.fromClubId === r.currentClubId)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (t) {
    const linked = (r.linked || []).some((l) => l.clubId && l.clubId === t.toClubId);
    return { state: 'moved', club: linked ? t.toClubId : 'other', fee: feeBand(t), at: Date.parse(t.date + 'T00:00:00Z') };
  }
  // Marked dead by the refresh (talks called off, a new contract signed): it settles NO on the day it died.
  if (r.status === 'dead') return { state: 'stayed', club: null, fee: null, at: Date.parse((r.lastSeen || '') + 'T00:00:00Z') || now };
  if (closeAt != null && now > closeAt + graceMs) return { state: 'stayed', club: null, fee: null, at: closeAt };
  if (r.status !== 'open' || (r.linked || []).some((l) => l.stage === 'agreed')) return { state: 'frozen' };
  return { state: 'open' };
}

// Points for a settled call. call = { yes, s, c, club, cClub, fee, at, cRoom }; st from rumourState.
//   right:  max(MIN_RIGHT × s, s × 10 × (1 − c)) × lead  + destination + fee band
//   wrong:  − s × 10 × c                                 − destination/fee penalties if you named them and he moved
//   room:   'beat' when you were right against the room, 'lost' when the room was right and you weren't (10+ reporters)
export function wirePoints(call, st) {
  if (st.state === 'void') return { pts: 0, right: null, parts: {}, room: null };
  const happened = st.state === 'moved';
  const right = call.yes === happened, s = call.s;
  let c = call.c;
  // Late-call rule: filed in the hours before the status change was first reported counts as if the Market knew.
  if (st.at && call.at >= st.at - WIRE.LATE_HOURS * 3600e3) c = Math.max(c, WIRE.LATE_C);
  const against = call.cRoom != null && call.cRoom < WIRE.ROOM_X;
  const room = against ? (right ? 'beat' : 'lost') : null;
  let where = 0, fee = 0;
  if (happened && call.yes && call.club) where = call.club === st.club ? s * WIRE.DEST_RIGHT * (1 - (call.cClub ?? 0.5)) : -s * WIRE.DEST_WRONG;
  if (happened && call.yes && call.fee && st.fee) fee = call.fee === st.fee ? WIRE.FEE_RIGHT * s : -WIRE.FEE_WRONG * s;
  if (!right) { const lose = -round1(s * 10 * c); return { pts: round1(lose + where + fee), right: false, parts: { lose, where: round1(where), fee, late: c !== call.c }, room }; }
  const days = Math.max(0, (st.at - call.at) / 864e5), L = 1 + WIRE.LEAD_X * Math.min(1, days / WIRE.LEAD_DAYS);
  const base = Math.max(WIRE.MIN_RIGHT * s, s * 10 * (1 - c)), main = base * L;
  return { pts: round1(main + where + fee), right: true, parts: { main: round1(main), where: round1(where), fee, lead: round1(L * 100) / 100, late: c !== call.c }, room };
}

// Hit rate, shrunk: (hits + 5) / (n + 10), stake-weighted.
export const hitRate = (hits, n) => (hits + 5) / (n + 10);
