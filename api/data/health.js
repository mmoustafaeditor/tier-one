// GET /api/data/health -> is the snapshot loaded, how old is it, what does it hold. Never cached.
import { loadSnapshot } from './_lib/store.js';
import { send, guard } from './_lib/http.js';

const STALE_DAYS = 10;

export default function handler(req, res) {
  const q = guard(req, res); if (!q) return;
  try {
    const snap = loadSnapshot();
    const ageDays = Math.floor((Date.now() - Date.parse(snap.meta.asOf + 'T00:00:00Z')) / 86400e3);
    return send(req, res, 200, {
      ok: true, service: 'semba-data', asOf: snap.meta.asOf, curatedAsOf: snap.meta.curatedAsOf, season: snap.meta.season,
      names: snap.mode, ageDays, stale: ageDays > STALE_DAYS, counts: snap.meta.counts, confidenceHighPct: snap.meta.confidenceHighPct,
      time: new Date().toISOString(),
    }, { cache: 'no-store' });
  } catch {
    return send(req, res, 503, { ok: false, error: 'snapshot_unavailable' });
  }
}
