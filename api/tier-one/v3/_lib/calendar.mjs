// Tier One v3 — the transfer calendar (LAUNCH_BRIEF §19): transfer windows, deadline days, league-specific closes,
// event flags and Market availability, in one server-managed config. Pure and browser-safe: the client bundles this
// file as its build-time fallback, then replaces it with whatever `wire.calendar` returns (the defaults below merged
// with the ops override stored in KV under t1v3:cal). A date change is an ops action, never a client patch.
//
//   window   { id: '2027-01', key: 'winter'|'summer', opens, closes (ISO, UTC), deadline: 'YYYY-MM-DD' (the 24 h
//              Deadline Day Live board runs on this UTC date), leagues?: { ksa1: { closes } } (a league whose
//              window shuts on another day: rumours about that league's clubs settle on that date) }
//   flags    { ddLive: Deadline Day Live runs on deadline days, market: the Market takes new calls }
//   market   { open: false pauses new calls (settlement keeps running), note: a short ops reason shown to players }
//   settleGraceH   hours after a window shuts before a "no move" call settles NO (paperwork lands late)
//
// Rumour ids end in their window id ('…-202701', '…-2026summer'); wire.mjs › windowOfId maps them back.

export const CALENDAR_DEFAULT = Object.freeze({
  v: 1,
  asOf: '2026-10-02',
  settleGraceH: 72,
  windows: [
    { id: '2027-01', key: 'winter', opens: '2027-01-01T00:00:00Z', closes: '2027-02-02T23:00:00Z', deadline: '2027-02-02', leagues: {} },
    { id: '2027-summer', key: 'summer', opens: '2027-06-15T23:00:00Z', closes: '2027-09-01T18:00:00Z', deadline: '2027-09-01', leagues: {} },
  ],
  // Windows already shut: still needed so old calls settle on the right date.
  closed: [{ id: '2026-summer', key: 'summer', opens: '2026-06-16T00:00:00Z', closes: '2026-09-01T18:00:00Z', deadline: '2026-09-01', leagues: {} }],
  flags: { ddLive: true, market: true },
  market: { open: true, note: '' },
});

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const WIN_ID = /^\d{4}-(01|summer)$/;
const okDate = (s) => typeof s === 'string' && Number.isFinite(Date.parse(s));

/** Shape-check an ops override. Returns { ok: true, value } (cleaned) or { ok: false, error }. */
export function validateCalendar(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'object' };
  const out = {};
  for (const list of ['windows', 'closed']) {
    if (input[list] == null) continue;
    if (!Array.isArray(input[list]) || input[list].length > 12) return { ok: false, error: list };
    const seen = new Set();
    out[list] = [];
    for (const w of input[list]) {
      if (!w || typeof w !== 'object') return { ok: false, error: list + '.item' };
      const id = String(w.id || '');
      if (!WIN_ID.test(id) || seen.has(id)) return { ok: false, error: list + '.id' };
      seen.add(id);
      if (!okDate(w.opens) || !okDate(w.closes) || Date.parse(w.opens) >= Date.parse(w.closes)) return { ok: false, error: id + '.dates' };
      if (!ISO_DAY.test(String(w.deadline || ''))) return { ok: false, error: id + '.deadline' };
      const leagues = {};
      for (const [lg, v] of Object.entries(w.leagues || {})) {
        if (!/^[a-z0-9]{2,8}$/.test(lg) || !v || !okDate(v.closes)) return { ok: false, error: id + '.leagues.' + lg };
        leagues[lg] = { closes: v.closes, deadline: ISO_DAY.test(String(v.deadline || '')) ? v.deadline : String(v.closes).slice(0, 10) };
      }
      out[list].push({ id, key: id.endsWith('-01') ? 'winter' : 'summer', opens: w.opens, closes: w.closes, deadline: w.deadline, leagues });
    }
  }
  if (input.settleGraceH != null) { const h = Number(input.settleGraceH); if (!(h >= 0 && h <= 24 * 14)) return { ok: false, error: 'settleGraceH' }; out.settleGraceH = h; }
  if (input.flags != null) { if (typeof input.flags !== 'object') return { ok: false, error: 'flags' }; out.flags = {}; for (const k of ['ddLive', 'market']) if (k in input.flags) out.flags[k] = !!input.flags[k]; }
  if (input.market != null) { if (typeof input.market !== 'object') return { ok: false, error: 'market' }; out.market = { open: input.market.open == null ? true : !!input.market.open, note: String(input.market.note || '').replace(/[\u0000-\u001f<>]/g, '').slice(0, 120) }; }
  if (input.asOf != null) { if (!ISO_DAY.test(String(input.asOf))) return { ok: false, error: 'asOf' }; out.asOf = input.asOf; }
  return { ok: true, value: out };
}

/** The live calendar: defaults with the ops override on top (an override's `windows` replaces the list whole). */
export function mergeCalendar(base = CALENDAR_DEFAULT, override = null) {
  const o = override && typeof override === 'object' ? override : {};
  return {
    v: base.v, asOf: o.asOf || base.asOf, settleGraceH: o.settleGraceH ?? base.settleGraceH,
    windows: (o.windows || base.windows).map((w) => ({ ...w, leagues: w.leagues || {} })),
    closed: (o.closed || base.closed || []).map((w) => ({ ...w, leagues: w.leagues || {} })),
    flags: { ...base.flags, ...(o.flags || {}) },
    market: { ...base.market, ...(o.market || {}) },
    source: override && Object.keys(o).length ? 'override' : 'default',
  };
}

const all = (cal) => [...(cal.closed || []), ...cal.windows].sort((a, b) => a.opens.localeCompare(b.opens));
export const windowById = (cal, id) => all(cal).find((w) => w.id === id) || null;

/** When a rumour's window shuts for its league (ISO string), or null for a window the calendar doesn't know. */
export function closesOf(cal, windowId, leagueId) {
  const w = windowById(cal, windowId); if (!w) return null;
  const lg = leagueId && w.leagues && w.leagues[leagueId];
  return (lg && lg.closes) || w.closes;
}

/** The window the Market is framed for now: the one open, else the next to open, else the last known. */
export function currentWindow(cal, now = Date.now()) {
  const ws = cal.windows.slice().sort((a, b) => a.opens.localeCompare(b.opens));
  return ws.find((w) => now < Date.parse(w.closes)) || ws[ws.length - 1] || null;
}

/** Deadline days as { 'YYYY-MM-DD': windowId } (the shape live.dd.* always used), league deadlines included.
 *  Only the live windows: a closed window's deadline is history, not a board anyone can open. */
export function deadlineDays(cal) {
  const out = {};
  for (const w of cal.windows.slice().sort((a, b) => a.opens.localeCompare(b.opens))) {
    out[w.deadline] = w.id;
    for (const lg of Object.values(w.leagues || {})) if (lg.deadline && !out[lg.deadline]) out[lg.deadline] = w.id;
  }
  return out;
}
export const nextDeadline = (cal, day) => Object.keys(deadlineDays(cal)).filter((d) => d > day).sort()[0] || null;
export const lastDeadline = (cal, day) => Object.keys(deadlineDays(cal)).filter((d) => d <= day).sort().pop() || null;

/** Can players file new calls right now? { open, why: ''|'paused'|'flag', note } — settlement never depends on this. */
export function marketOpen(cal) {
  if (!cal.flags.market) return { open: false, why: 'flag', note: cal.market.note || '' };
  if (!cal.market.open) return { open: false, why: 'paused', note: cal.market.note || '' };
  return { open: true, why: '', note: '' };
}

/** What the client receives (no secrets live here anyway; this just fixes the shape). */
export function publicCalendar(cal, now = Date.now()) {
  return { v: cal.v, asOf: cal.asOf, source: cal.source || 'default', now, settleGraceH: cal.settleGraceH, windows: cal.windows, closed: cal.closed || [], flags: cal.flags, market: marketOpen(cal), current: currentWindow(cal, now), deadlineDays: deadlineDays(cal) };
}
