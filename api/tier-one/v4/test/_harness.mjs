// Test harness: one in-memory store shared by v4 (through the Kv adapter) and v3 (through its own fetch to the
// Upstash REST URL, which we route to the same store), so passthrough tests see one world.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { memoryStore } from '../../../_lib/kv-memory.mjs';
import { createKv } from '../../../_lib/kv.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
process.chdir(ROOT); // v3 loads data/seed from cwd
process.env.KV_REST_API_URL = 'http://fake'; process.env.KV_REST_API_TOKEN = 'test-token';
process.env.VERCEL_ENV = 'test'; process.env.OPS_TOKEN = 'ops-secret'; process.env.PUBLIC_URL = 'https://example.test';
delete process.env.STRIPE_SECRET_KEY; delete process.env.RESEND_API_KEY; delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT;

export const mem = memoryStore();
export const kv = createKv({ pipeline: mem.pipeline });
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith('http://fake/')) return { ok: true, json: async () => mem.pipeline(JSON.parse(init.body)) };
  return realFetch(url, init);
};
const mod = await import('../index.js');
export const { createApi } = mod;
export const api = createApi({ kv, env: process.env });

let ipN = 1;
export async function call(body, opts = {}) {
  let status = 0, out = null; const headers = {};
  const res = { setHeader(k, v) { headers[k.toLowerCase()] = v; }, status(c) { status = c; return res; }, json(o) { out = o; return res; }, end() { return res; } };
  await (opts.api || api).handler({ method: opts.method || 'POST', body: opts.rawBody != null ? opts.rawBody : JSON.stringify(body), headers: { 'x-forwarded-for': opts.ip || '10.0.0.' + ipN, ...(opts.headers || {}) } }, res);
  return { status, headers, ...(out || {}) };
}
export const uid = () => 'dev' + Math.random().toString(36).slice(2, 10).padEnd(8, 'x') + 'Q';
export async function newAccount(extra = {}) {
  const dev = uid();
  const r = await call({ action: 'account.hello', dev, client: { ver: '3.4.0', platform: 'web' }, ...extra });
  if (!r.ok) throw new Error('hello failed ' + JSON.stringify(r));
  return { dev, token: r.token, id: r.account.id, auth: { dev, token: r.token } };
}
