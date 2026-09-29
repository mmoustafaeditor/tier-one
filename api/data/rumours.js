// GET /api/data/rumours                 -> open rumours, hottest first
//   ?club=eng-chelsea  rumours about that club's players or linking players to it
//   ?window=2027-01    only that window ('2027-01' | '2027-summer')
//   ?status=all        include confirmed/dead ones      ?limit=20 (max 100)
import { loadSnapshot } from './_lib/store.js';
import { send, guard, fail, envelope } from './_lib/http.js';
import { heat, liveStatus } from './_lib/heat.js';

export default function handler(req, res) {
  const q = guard(req, res); if (!q) return;
  let snap;
  try { snap = loadSnapshot(); } catch { return fail(req, res, 503, 'snapshot_unavailable'); }
  const now = Date.now();
  const club = (q.get('club') || '').toLowerCase(), win = q.get('window') || '', all = q.get('status') === 'all';
  const limit = Math.min(100, Math.max(1, Number(q.get('limit')) || 50));
  const list = snap.rumours
    .map((r) => ({ ...r, status: liveStatus(r, now), heat: heat(r, now) }))
    .filter((r) => (all || r.status === 'open') && (!win || r.window === win) && (!club || r.currentClubId === club || r.linked.some((l) => l.clubId === club)))
    .sort((a, b) => b.heat - a.heat || (b.lastSeen || '').localeCompare(a.lastSeen || ''));
  return send(req, res, 200, envelope(snap, { count: list.length, rumours: list.slice(0, limit) }));
}
