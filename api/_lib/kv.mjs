// Storage adapter for the platform API: Upstash Redis over REST, the same store and env names api/online.js and
// api/tier-one/v3 use (KV_REST_API_URL + KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
// Every caller talks to a `Kv` object, so tests and local runs swap in the in-memory store (kv-memory.mjs) without
// touching the network: createKv({ pipeline }) takes any function that answers an Upstash pipeline.
//
//   const kv = envKv();                       // from the env; kv.online is false without a store
//   await kv.one('SET', 'k', 'v', 'EX', 60);  // one command
//   await kv.pipeline([['INCR', 'a'], ['EXPIRE', 'a', 60]]);
//   await kv.getJ('doc'); await kv.setJ('doc', { a: 1 }, 3600);

export function createKv({ url, token, pipeline, name } = {}) {
  const online = !!pipeline || !!(url && token);
  async function run(cmds) {
    if (!online) throw new Error('offline');
    if (pipeline) return normalize(await pipeline(cmds));
    const r = await fetch(url + '/pipeline', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds) });
    if (!r.ok) throw new Error('store ' + r.status);
    return normalize(await r.json());
  }
  const one = async (...cmd) => (await run([cmd]))[0];
  return {
    name: name || (pipeline ? 'memory' : 'upstash'), online,
    pipeline: run, one,
    async get(k) { return one('GET', k); },
    async set(k, v, ttl) { return ttl ? one('SET', k, String(v), 'EX', ttl) : one('SET', k, String(v)); },
    async setNX(k, v, ttl) { return !!(ttl ? await one('SET', k, String(v), 'EX', ttl, 'NX') : await one('SET', k, String(v), 'NX')); },
    async del(...ks) { return ks.length ? one('DEL', ...ks) : 0; },
    async getJ(k) { const v = await one('GET', k); if (v == null) return null; try { return JSON.parse(v); } catch { return null; } },
    async setJ(k, v, ttl) { return ttl ? one('SET', k, JSON.stringify(v), 'EX', ttl) : one('SET', k, JSON.stringify(v)); },
    async mgetJ(ks) { if (!ks.length) return []; const vs = await one('MGET', ...ks); return vs.map((v) => { if (v == null) return null; try { return JSON.parse(v); } catch { return null; } }); },
    async incr(k, by = 1, ttl) { const cmds = [['INCRBY', k, by]]; if (ttl) cmds.push(['EXPIRE', k, ttl]); return Number((await run(cmds))[0]); },
    async hgetall(k) { return hashObj(await one('HGETALL', k)); },
  };
}

// Upstash answers [{ result }, { error }]; a thrown error in any command fails the whole pipeline here, like v3.
function normalize(out) {
  return out.map((x) => { if (x && x.error) throw new Error(x.error); return x ? x.result : null; });
}
export const hashObj = (h) => { if (!h) return {}; if (!Array.isArray(h)) return h; const o = {}; for (let i = 0; i < h.length; i += 2) o[h[i]] = h[i + 1]; return o; };

let cached = null;
export function envKv() {
  if (cached) return cached;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  cached = createKv({ url, token });
  return cached;
}
export function resetEnvKv() { cached = null; }
