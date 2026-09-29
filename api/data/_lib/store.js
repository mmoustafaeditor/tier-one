// Loads the published snapshot (data/seed/*.json, bundled with the functions via vercel.json › includeFiles)
// and applies the names mode. Cached per warm function instance.
import fs from 'node:fs';
import path from 'node:path';
import { fictionalClubName, fictionalPlayerName } from './names.js';

const FILES = ['meta', 'leagues', 'clubs', 'players', 'transfers', 'rumours'];
let cache = null;

function seedDir() {
  const candidates = [process.env.SEMBA_DATA_DIR, path.join(process.cwd(), 'data', 'seed')].filter(Boolean);
  for (const d of candidates) if (fs.existsSync(path.join(d, 'meta.json'))) return d;
  throw new Error('snapshot not found');
}

/** 'real' (default) or 'fictional'. One switch for the whole service: SEMBA_DATA_NAMES=fictional. */
export const namesMode = () => (String(process.env.SEMBA_DATA_NAMES || 'real').toLowerCase() === 'fictional' ? 'fictional' : 'real');

function applyNames(snap) {
  if (namesMode() !== 'fictional') return snap;
  const fict = snap.fictional || {};
  const clubs = snap.clubs.map((c) => ({ ...c, ...fictionalClubName(c, fict) }));
  const clubName = new Map(clubs.map((c) => [c.id, c.shortName]));
  const pname = new Map();
  const players = snap.players.map((p) => { const n = fictionalPlayerName(p); pname.set(p.id, n); return { ...p, ...n, refs: {} }; });
  const club = (id, fallback) => (id && clubName.get(id)) || (fallback ? 'Overseas club' : null);
  const transfers = snap.transfers.map((t) => ({ ...t, playerName: pname.get(t.playerId)?.name || fictionalPlayerName({ id: t.playerId }).name, fromName: club(t.fromClubId, t.fromName), toName: club(t.toClubId, t.toName), sources: [] }));
  const rumours = snap.rumours.map((r) => ({
    ...r, playerName: pname.get(r.playerId)?.name || fictionalPlayerName({ id: r.playerId }).name,
    currentClubName: club(r.currentClubId, r.currentClubName), linked: r.linked.map((l) => ({ ...l, name: club(l.clubId, l.name) })),
    fact: null, outlets: r.outlets.map((o) => ({ tier: o.tier })),
  }));
  return { ...snap, clubs, players, transfers, rumours };
}

export function loadSnapshot() {
  const mode = namesMode();
  if (cache && cache.mode === mode) return cache.snap;
  const dir = seedDir();
  const raw = {};
  for (const f of FILES) raw[f] = JSON.parse(fs.readFileSync(path.join(dir, f + '.json'), 'utf8'));
  try { raw.fictional = JSON.parse(fs.readFileSync(path.join(dir, 'fictional.json'), 'utf8')); } catch { raw.fictional = {}; }
  // internal fields never leave the service
  raw.transfers = raw.transfers.map(({ _curated, ...t }) => t);
  raw.players = raw.players.map(({ _conflict, ...p }) => p);
  const snap = applyNames(raw);
  snap.mode = mode;
  cache = { mode, snap };
  return snap;
}

export function _resetCache() { cache = null; }
