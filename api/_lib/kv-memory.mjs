// In-memory stand-in for the Upstash REST pipeline: tests, the local smoke run and `node --test`. Covers every
// command api/tier-one/v3 and v4 use. Values are stored as strings like Redis; TTLs expire lazily.
//   const mem = memoryStore(); const kv = createKv({ pipeline: mem.pipeline });
//   mem.tick(ms) moves its clock (TTL tests); mem.dump() lists live keys.
export function memoryStore() {
  const kv = new Map(), exp = new Map();
  let skew = 0;
  const now = () => Date.now() + skew;
  const live = (k) => { const t = exp.get(k); if (t && t < now()) { kv.delete(k); exp.delete(k); } return kv.get(k); };
  const coll = (k, mk) => { let v = live(k); if (!v) { v = mk(); kv.set(k, v); } return v; };
  const z = (k) => coll(k, () => new Map()), h = (k) => coll(k, () => new Map()), s = (k) => coll(k, () => new Set()), l = (k) => coll(k, () => []);
  const sorted = (k) => [...(live(k) || new Map()).entries()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
  const rng = (v) => { const t = String(v); if (t.startsWith('(')) return [Number(t.slice(1)), true]; if (t === '+inf') return [Infinity, false]; if (t === '-inf') return [-Infinity, false]; return [Number(t), false]; };
  const up = (x) => String(x).toUpperCase();
  const num = (k, d) => { const v = Number(live(k) || 0) + d; if (!Number.isFinite(v)) throw new Error('ERR value is not an integer'); kv.set(k, String(v)); return v; };
  function run([cmd, ...a]) {
    switch (up(cmd)) {
      case 'PING': return 'PONG';
      case 'GET': { const v = live(a[0]); return v == null || typeof v !== 'string' ? null : v; }
      case 'SET': {
        const [k, v, ...o] = a, o2 = o.map(up);
        if (o2.includes('NX') && live(k) != null) return null;
        if (o2.includes('XX') && live(k) == null) return null;
        kv.set(k, String(v));
        const ex = o2.indexOf('EX'), px = o2.indexOf('PX');
        if (ex >= 0) exp.set(k, now() + Number(o[ex + 1]) * 1000); else if (px >= 0) exp.set(k, now() + Number(o[px + 1])); else if (!o2.includes('KEEPTTL')) exp.delete(k);
        return 'OK';
      }
      case 'SETEX': kv.set(a[0], String(a[2])); exp.set(a[0], now() + Number(a[1]) * 1000); return 'OK';
      case 'MGET': return a.map((k) => { const v = live(k); return v == null || typeof v !== 'string' ? null : v; });
      case 'DEL': { let n = 0; for (const k of a) if (live(k) != null) { kv.delete(k); exp.delete(k); n++; } return n; }
      case 'EXISTS': return a.filter((k) => live(k) != null).length;
      case 'INCR': return num(a[0], 1);
      case 'INCRBY': return num(a[0], Number(a[1]));
      case 'DECRBY': return num(a[0], -Number(a[1]));
      case 'EXPIRE': if (live(a[0]) != null) { exp.set(a[0], now() + Number(a[1]) * 1000); return 1; } return 0;
      case 'TTL': { if (live(a[0]) == null) return -2; const t = exp.get(a[0]); return t ? Math.max(0, Math.round((t - now()) / 1000)) : -1; }
      case 'HSET': { const hh = h(a[0]); let n = 0; for (let i = 1; i < a.length; i += 2) { if (!hh.has(a[i])) n++; hh.set(a[i], String(a[i + 1])); } return n; }
      case 'HSETNX': { const hh = h(a[0]); if (hh.has(a[1])) return 0; hh.set(a[1], String(a[2])); return 1; }
      case 'HGET': { const v = (live(a[0]) || new Map()).get(a[1]); return v == null ? null : v; }
      case 'HDEL': { const hh = live(a[0]); if (!hh) return 0; let n = 0; for (const f of a.slice(1)) if (hh.delete(f)) n++; return n; }
      case 'HINCRBY': { const hh = h(a[0]); const v = Number(hh.get(a[1]) || 0) + Number(a[2]); hh.set(a[1], String(v)); return v; }
      case 'HGETALL': return [...(live(a[0]) || new Map()).entries()].flat();
      case 'HKEYS': return [...(live(a[0]) || new Map()).keys()];
      case 'HLEN': return (live(a[0]) || new Map()).size;
      case 'SADD': { const ss = s(a[0]); let n = 0; for (const x of a.slice(1)) { if (!ss.has(String(x))) n++; ss.add(String(x)); } return n; }
      case 'SREM': { const ss = live(a[0]); if (!ss) return 0; let n = 0; for (const x of a.slice(1)) if (ss.delete(String(x))) n++; return n; }
      case 'SMEMBERS': return [...(live(a[0]) || new Set())];
      case 'SISMEMBER': return (live(a[0]) || new Set()).has(String(a[1])) ? 1 : 0;
      case 'SCARD': return (live(a[0]) || new Set()).size;
      case 'PFADD': { const ss = s(a[0]); let n = 0; for (const x of a.slice(1)) { if (!ss.has(String(x))) n = 1; ss.add(String(x)); } return n; }
      case 'PFCOUNT': return a.reduce((n, k) => n + (live(k) || new Set()).size, 0);
      case 'LPUSH': { const ll = l(a[0]); for (const x of a.slice(1)) ll.unshift(String(x)); return ll.length; }
      case 'RPUSH': { const ll = l(a[0]); for (const x of a.slice(1)) ll.push(String(x)); return ll.length; }
      case 'LRANGE': { const ll = live(a[0]) || []; const st = Number(a[1]), en = Number(a[2]) < 0 ? ll.length + Number(a[2]) : Number(a[2]); return ll.slice(st, en + 1); }
      case 'LTRIM': { const ll = live(a[0]); if (ll) { const st = Number(a[1]), en = Number(a[2]) < 0 ? ll.length + Number(a[2]) : Number(a[2]); ll.splice(0, ll.length, ...ll.slice(st, en + 1)); } return 'OK'; }
      case 'LLEN': return (live(a[0]) || []).length;
      case 'ZADD': { const o = a.slice(1).map(up); const nx = o[0] === 'NX', xx = o[0] === 'XX'; const at = nx || xx ? 2 : 1; const zz = z(a[0]); let n = 0; for (let i = at; i < a.length; i += 2) { const m = a[i + 1]; if (nx && zz.has(m)) continue; if (xx && !zz.has(m)) continue; if (!zz.has(m)) n++; zz.set(m, Number(a[i])); } return n; }
      case 'ZINCRBY': { const zz = z(a[0]); const v = (zz.get(a[2]) || 0) + Number(a[1]); zz.set(a[2], v); return String(v); }
      case 'ZSCORE': { const v = (live(a[0]) || new Map()).get(a[1]); return v == null ? null : String(v); }
      case 'ZREM': { const zz = live(a[0]); if (!zz) return 0; let n = 0; for (const m of a.slice(1)) if (zz.delete(m)) n++; return n; }
      case 'ZCARD': return (live(a[0]) || new Map()).size;
      case 'ZCOUNT': { const [lo, lx] = rng(a[1]), [hi, hx] = rng(a[2]); return sorted(a[0]).filter(([, v]) => (lx ? v > lo : v >= lo) && (hx ? v < hi : v <= hi)).length; }
      case 'ZRANGE': case 'ZREVRANGE': { let ls = sorted(a[0]); if (up(cmd) === 'ZREVRANGE') ls = ls.reverse(); const st = Number(a[1]), en = Number(a[2]) < 0 ? ls.length + Number(a[2]) : Number(a[2]); ls = ls.slice(st, en + 1); return a.map(up).includes('WITHSCORES') ? ls.flatMap(([m, v]) => [m, String(v)]) : ls.map(([m]) => m); }
      default: throw new Error('memory store: unsupported ' + cmd);
    }
  }
  return {
    pipeline: async (cmds) => cmds.map((c) => { try { return { result: run(c) }; } catch (e) { return { error: String(e.message) }; } }),
    tick(ms) { skew += ms; },
    dump() { return [...kv.keys()].filter((k) => live(k) != null); },
    raw: kv,
  };
}
