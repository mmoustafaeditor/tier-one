// Local server for play-testing: serves the built game at / and /tier-one-v3, the v3 API with an in-memory Redis,
// and /api/data/* from the real snapshot. `npm run serve` (after `npm run build`). PORT defaults to 5178.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fakeRedis } from './fake-redis.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../../..');
const PORT = Number(process.env.PORT) || 5178;
const R = fakeRedis();
process.env.KV_REST_API_URL = `http://127.0.0.1:${PORT}/__redis`;
process.env.KV_REST_API_TOKEN = 'dev';
process.chdir(ROOT);
const v3 = (await import(path.join(ROOT, 'api/tier-one/v3/index.js'))).default;
const data = {};
for (const n of ['rumours', 'snapshot', 'transfers', 'health']) data[n] = (await import(path.join(ROOT, 'api/data', n + '.js'))).default;

function shim(res) {
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return res; };
  return res;
}
const page = () => fs.readFileSync(process.env.PAGE || path.join(HERE, '../dist/index.html'));
http.createServer(async (req, res) => {
  shim(res);
  const u = new URL(req.url, 'http://x');
  let body = '';
  for await (const c of req) body += c;
  if (u.pathname === '/__redis/pipeline') return res.json(R.pipeline(JSON.parse(body)));
  if (u.pathname === '/api/tier-one/v3') { req.body = body; return v3(req, res); }
  const m = u.pathname.match(/^\/api\/data\/(\w+)$/);
  if (m && data[m[1]]) return data[m[1]](req, res);
  if (u.pathname === '/' || u.pathname.startsWith('/tier-one-v3')) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(page()); }
  res.statusCode = 404; res.end('not found');
}).listen(PORT, () => console.log('tier one v3 dev server on http://127.0.0.1:' + PORT));
