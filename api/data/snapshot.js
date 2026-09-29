// GET /api/data/snapshot                      -> leagues + clubs (no players)
// GET /api/data/snapshot?league=eng1          -> that league's clubs and current squads
// GET /api/data/snapshot?club=eng-arsenal     -> one club and its squad
//   &loans=1 also lists players the club has loaned out (flagged loan.direction = 'out')
import { loadSnapshot } from './_lib/store.js';
import { send, guard, fail, envelope } from './_lib/http.js';

export default function handler(req, res) {
  const q = guard(req, res); if (!q) return;
  let snap;
  try { snap = loadSnapshot(); } catch { return fail(req, res, 503, 'snapshot_unavailable'); }
  const league = (q.get('league') || '').toLowerCase(), clubId = (q.get('club') || '').toLowerCase(), loans = q.get('loans') === '1';
  if (league && !snap.leagues.some((l) => l.id === league)) return fail(req, res, 404, 'unknown_league');
  if (clubId && !snap.clubs.some((c) => c.id === clubId)) return fail(req, res, 404, 'unknown_club');
  if (!league && !clubId) return send(req, res, 200, envelope(snap, { leagues: snap.leagues, clubs: snap.clubs }));
  const clubs = snap.clubs.filter((c) => (clubId ? c.id === clubId : c.leagueId === league));
  const ids = new Set(clubs.map((c) => c.id));
  const players = snap.players.filter((p) => ids.has(p.clubId) && (loans || !(p.loan && p.loan.direction === 'out')));
  return send(req, res, 200, envelope(snap, { leagues: snap.leagues.filter((l) => clubs.some((c) => c.leagueId === l.id)), clubs, players }));
}
