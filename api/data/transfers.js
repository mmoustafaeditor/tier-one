// GET /api/data/transfers?since=2026-07-01    confirmed moves on/after a date, newest first
//   &club=eng-arsenal  in or out of that club     &league=eng1  touching that league's clubs
//   &type=loan|transfer|free|undisclosed          &limit=100 (max 500)
import { loadSnapshot } from './_lib/store.js';
import { send, guard, fail, envelope } from './_lib/http.js';

export default function handler(req, res) {
  const q = guard(req, res); if (!q) return;
  let snap;
  try { snap = loadSnapshot(); } catch { return fail(req, res, 503, 'snapshot_unavailable'); }
  const since = q.get('since') || '';
  if (since && !/^\d{4}-\d{2}-\d{2}$/.test(since)) return fail(req, res, 400, 'bad_since');
  const club = (q.get('club') || '').toLowerCase(), league = (q.get('league') || '').toLowerCase(), type = q.get('type') || '';
  const limit = Math.min(500, Math.max(1, Number(q.get('limit')) || 100));
  const inLeague = league ? new Set(snap.clubs.filter((c) => c.leagueId === league).map((c) => c.id)) : null;
  const list = snap.transfers
    .filter((t) => (!since || (t.date || '') >= since) && (!club || t.fromClubId === club || t.toClubId === club)
      && (!inLeague || inLeague.has(t.fromClubId) || inLeague.has(t.toClubId)) && (!type || t.type === type))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return send(req, res, 200, envelope(snap, { count: list.length, transfers: list.slice(0, limit) }));
}
