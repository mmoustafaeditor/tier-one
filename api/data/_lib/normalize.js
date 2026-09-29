// Normalizer: turns loose records (seed research, curated files, or a provider adapter) into the Semba schema
// documented in data/SCHEMA.md. Pure functions, no I/O, so both the API and the refresh tools use them.
import { slug, playerId, transferId, rumourId } from './ids.js';

export const POSITIONS = ['GK', 'DF', 'MF', 'FW'];
export const CONFIDENCE = ['high', 'medium', 'low'];
export const RUMOUR_STATUS = ['open', 'confirmed', 'dead'];
export const TRANSFER_TYPES = ['transfer', 'loan', 'free', 'undisclosed', 'loan-to-buy'];

const str = (v, max = 120) => (v == null ? null : String(v).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) || null);
const isoDate = (v) => { const s = str(v, 30); if (!s) return null; const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (!m) return null; const d = new Date(m[0] + 'T00:00:00Z'); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === m[0] ? m[0] : null; };
const colour = (v) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(v || '').trim()); return m ? '#' + m[1].toUpperCase() : null; };
const conf = (v) => (CONFIDENCE.includes(v) ? v : 'medium');
const intOr = (v, lo, hi) => { const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : null; };
const nat = (v) => { const s = str(v, 3); return s && /^[A-Z]{3}$/.test(s.toUpperCase()) ? s.toUpperCase() : null; };

/** Short display name: the name itself when short enough, else the last token (keeps particles like "van Dijk", "De Bruyne"). */
export function shortName(name) {
  const n = str(name, 80) || '';
  if (n.length <= 14 || !n.includes(' ')) return n;
  const parts = n.split(' ');
  const low = /^(van|von|de|der|den|da|di|dos|do|del|della|le|la|al|el|ter|ten|mac|mc|bin|ben|abu|ould)$/i;
  let i = parts.length - 1;
  while (i > 0 && low.test(parts[i - 1])) i--;
  return parts.slice(i).join(' ');
}

/** Best-contrast partner colour for a single-colour kit. */
export function contrastOf(hex) {
  const h = colour(hex); if (!h) return '#FFFFFF';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#111111' : '#FFFFFF';
}

export function normalizeLeague(l) {
  return { id: str(l.id, 12), name: str(l.name, 60), country: nat(l.country), tier: intOr(l.tier, 1, 9) || 1, season: str(l.season, 9), partial: !!l.partial };
}

export function normalizeClub(c) {
  const primary = colour(c.colors && c.colors[0]) || '#777777';
  const secondary = colour(c.colors && c.colors[1]) || contrastOf(primary);
  return {
    id: str(c.id, 40),
    name: str(c.name, 80),
    shortName: str(c.shortName, 30) || str(c.name, 30),
    code: str(c.code, 5),
    country: nat(c.country),
    leagueId: str(c.leagueId || c.league, 12),
    colors: { primary, secondary },
    gameIds: c.gameId ? { gaffer: str(c.gameId, 30) } : {},
    squadSize: intOr(c.squadSize, 0, 99),
    confidence: conf(c.confidence),
    asOf: isoDate(c.asOf),
  };
}

export function normalizePlayer(p) {
  const name = str(p.name, 80);
  const id = p.id || playerId({ ref: p.ref, name, birthDate: p.birthDate, clubId: p.clubId });
  const loan = p.loan && (p.loan.direction === 'out' || p.loan.fromClubId || p.loan.fromName)
    ? {
      direction: p.loan.direction === 'out' ? 'out' : 'in',
      fromClubId: str(p.loan.fromClubId, 40), fromName: str(p.loan.fromName, 60),
      toClubId: str(p.loan.toClubId, 40), toName: str(p.loan.toName, 60),
      until: isoDate(p.loan.until),
    }
    : null;
  return {
    id,
    name,
    shortName: str(p.shortName, 30) || shortName(name),
    nationality: nat(p.nationality || p.nat),
    birthDate: isoDate(p.birthDate),
    position: POSITIONS.includes(p.position || p.pos) ? (p.position || p.pos) : null,
    clubId: str(p.clubId, 40),
    shirtNumber: intOr(p.shirtNumber ?? p.no, 0, 99),
    contractEnd: isoDate(p.contractEnd) || (intOr(p.contractEnd, 2000, 2100) ? `${p.contractEnd}-06-30` : null),
    captain: p.captain ? true : undefined,
    loan,
    refs: Object.fromEntries(Object.entries({ wiki: str(p.ref, 120), wikidata: str(p.qid || (p.refs && p.refs.wikidata), 20) }).filter(([, v]) => v)),
    confidence: conf(p.confidence),
  };
}

function money(m) {
  if (!m) return null;
  const value = Number(m.value); const currency = ['GBP', 'EUR', 'USD', 'SAR', 'EGP'].includes(m.currency) ? m.currency : null;
  return Number.isFinite(value) && value >= 0 && currency ? { value: Math.round(value), currency } : null;
}

export function normalizeTransfer(t) {
  const playerIdV = t.playerId || playerId({ ref: t.playerRef, name: t.playerName, clubId: t.fromClubId });
  const date = isoDate(t.date);
  const out = {
    id: null,
    playerId: playerIdV,
    playerName: str(t.playerName, 80),
    fromClubId: str(t.fromClubId, 40), fromName: str(t.fromName, 60),
    toClubId: str(t.toClubId, 40), toName: str(t.toName, 60),
    date,
    type: TRANSFER_TYPES.includes(t.type) ? t.type : 'transfer',
    fee: money(t.fee),
    feeText: str(t.feeText, 60),
    window: str(t.window, 12),
    sources: (t.sources || []).map((u) => str(u, 300)).filter((u) => u && /^https:\/\//.test(u)).slice(0, 3),
    confidence: conf(t.confidence),
  };
  out.id = t.id || transferId(out);
  return out;
}

export function normalizeRumour(r) {
  const pId = r.playerId || playerId({ ref: r.playerRef, name: r.playerName, clubId: r.currentClubId });
  const outlets = (r.outlets || []).map((o) => ({
    name: str(o.name, 60), tier: intOr(o.tier, 1, 4) || 3,
    url: o.url && /^https:\/\//.test(o.url) ? str(o.url, 300) : null, date: isoDate(o.date),
  })).filter((o) => o.name).slice(0, 8);
  const fee = r.fee ? { min: Number(r.fee.min) || null, max: Number(r.fee.max) || Number(r.fee.min) || null, currency: ['GBP', 'EUR', 'USD'].includes(r.fee.currency) ? r.fee.currency : 'EUR' } : null;
  const dates = outlets.map((o) => o.date).filter(Boolean).sort();
  const out = {
    id: null,
    playerId: pId,
    playerName: str(r.playerName, 80),
    currentClubId: str(r.currentClubId, 40), currentClubName: str(r.currentClubName, 60),
    linked: (r.linked || []).map((l) => ({ clubId: str(l.clubId, 40), name: str(l.name, 60), stage: ['interest', 'talks', 'bid', 'agreed'].includes(l.stage) ? l.stage : 'interest' })).filter((l) => l.clubId || l.name).slice(0, 6),
    fee: fee && fee.min ? fee : null,
    window: str(r.window, 12) || '2027-01',
    fact: str(r.fact, 160),
    outlets,
    credibility: bucket(outlets),
    firstSeen: isoDate(r.firstSeen) || dates[0] || null,
    lastSeen: isoDate(r.lastSeen) || dates[dates.length - 1] || null,
    status: RUMOUR_STATUS.includes(r.status) ? r.status : 'open',
    confidence: conf(r.confidence),
  };
  out.id = r.id || rumourId(out);
  return out;
}

/** Credibility bucket from the best outlet tier and how many independent outlets carry it. */
export function bucket(outlets) {
  if (!outlets.length) return 'weak';
  const best = Math.min(...outlets.map((o) => o.tier));
  const n = new Set(outlets.map((o) => o.name.toLowerCase())).size;
  if (best === 1 || (best === 2 && n >= 3)) return 'strong';
  if (best === 2 || n >= 3) return 'solid';
  return best === 3 ? 'speculative' : 'weak';
}

/** Returns a list of problems (empty when the record is valid). Used by tests and the validator. */
export function problems(kind, x) {
  const p = [];
  const need = (k) => { if (x[k] == null || x[k] === '') p.push(`${kind} ${x.id || '?'}: missing ${k}`); };
  if (kind === 'club') { ['id', 'name', 'leagueId', 'country'].forEach(need); }
  if (kind === 'player') { ['id', 'name', 'clubId'].forEach(need); if (x.position == null) p.push(`player ${x.id}: no position`); }
  if (kind === 'transfer') { ['id', 'playerId'].forEach(need); if (!x.fromClubId && !x.toClubId) p.push(`transfer ${x.id}: touches no tracked club`); }
  if (kind === 'rumour') { ['id', 'playerId', 'fact', 'lastSeen'].forEach(need); if (!x.linked.length) p.push(`rumour ${x.id}: no linked clubs`); if (!x.outlets.length) p.push(`rumour ${x.id}: no outlet`); }
  return p;
}

export { slug };
