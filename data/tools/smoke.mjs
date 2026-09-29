#!/usr/bin/env node
// Calls the /api/data/* handlers in-process with fake req/res and prints a short summary of each response.
//   node data/tools/smoke.mjs            (add --full to print whole bodies)
import snapshot from '../../api/data/snapshot.js';
import rumours from '../../api/data/rumours.js';
import transfers from '../../api/data/transfers.js';
import health from '../../api/data/health.js';

export function call(handler, url, headers = {}) {
  return new Promise((resolve) => {
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { resolve({ status: this.statusCode, headers: this.headers, body: b ? JSON.parse(b) : null }); } };
    handler({ method: 'GET', url, headers }, res);
  });
}

const full = process.argv.includes('--full');
const show = (label, r, pick) => console.log(`\n## ${label} -> ${r.status} (${r.headers['cache-control']})\n` + JSON.stringify(full ? r.body : pick(r.body), null, 1).slice(0, 2500));
if (process.argv[1] && process.argv[1].endsWith('smoke.mjs')) {
  show('GET /api/data/health', await call(health, '/api/data/health'), (b) => b);
  show('GET /api/data/snapshot', await call(snapshot, '/api/data/snapshot'), (b) => ({ asOf: b.asOf, leagues: b.leagues.map((l) => l.id), clubs: b.clubs.length, sample: b.clubs[0] }));
  show('GET /api/data/snapshot?club=eng-arsenal', await call(snapshot, '/api/data/snapshot?club=eng-arsenal'), (b) => ({ club: b.clubs[0], players: b.players.length, first5: b.players.slice(0, 5).map((p) => `${p.shirtNumber ?? '-'} ${p.name} ${p.position} ${p.nationality} ${p.birthDate || ''} [${p.confidence}]`) }));
  show('GET /api/data/snapshot?league=egy1', await call(snapshot, '/api/data/snapshot?league=egy1'), (b) => ({ clubs: b.clubs.map((c) => `${c.id} ${c.squadSize} ${c.confidence}`), players: b.players.length }));
  show('GET /api/data/rumours?limit=5', await call(rumours, '/api/data/rumours?limit=5'), (b) => ({ count: b.count, top: b.rumours.map((r) => `${r.heat} ${r.playerName} (${r.currentClubName}) -> ${r.linked.map((l) => l.name).join('/')} [${r.credibility}] ${r.fact}`) }));
  show('GET /api/data/transfers?since=2026-08-25&league=eng1&limit=6', await call(transfers, '/api/data/transfers?since=2026-08-25&league=eng1&limit=6'), (b) => ({ count: b.count, latest: b.transfers.map((t) => `${t.date} ${t.playerName}: ${t.fromName} -> ${t.toName} ${t.feeText || t.type}`) }));
  show('GET /api/data/snapshot?league=xxx', await call(snapshot, '/api/data/snapshot?league=xxx'), (b) => b);
  show('GET /api/data/transfers?since=bad', await call(transfers, '/api/data/transfers?since=bad'), (b) => b);
}
