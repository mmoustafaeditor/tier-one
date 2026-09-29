// In-memory stand-in for the Upstash REST pipeline, covering the commands api/tier-one/v3 uses. Dev and tests only.
export function fakeRedis() {
  const kv = new Map(), exp = new Map();
  const live = (k) => { const t = exp.get(k); if (t && t < Date.now()) { kv.delete(k); exp.delete(k); } return kv.get(k); };
  const z = (k) => { let v = live(k); if (!v) { v = new Map(); kv.set(k, v); } return v; };
  const h = (k) => { let v = live(k); if (!v) { v = new Map(); kv.set(k, v); } return v; };
  const s = (k) => { let v = live(k); if (!v) { v = new Set(); kv.set(k, v); } return v; };
  const sorted = (k) => [...(live(k) || new Map()).entries()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
  const rng = (v, lo) => { if (String(v).startsWith('(')) return [Number(String(v).slice(1)), true]; if (v === '+inf') return [Infinity, false]; if (v === '-inf') return [-Infinity, false]; return [Number(v), false]; };
  function run([cmd, ...a]) {
    switch (String(cmd).toUpperCase()) {
      case 'GET': { const v = live(a[0]); return v == null ? null : v; }
      case 'SET': { const [k, v, ...o] = a; const up = o.map((x) => String(x).toUpperCase()); if (up.includes('NX') && live(k) != null) return null; kv.set(k, String(v)); const i = up.indexOf('EX'); if (i >= 0) exp.set(k, Date.now() + Number(o[i + 1]) * 1000); else exp.delete(k); return 'OK'; }
      case 'MGET': return a.map((k) => { const v = live(k); return v == null ? null : v; });
      case 'INCR': { const v = Number(live(a[0]) || 0) + 1; kv.set(a[0], String(v)); return v; }
      case 'EXPIRE': if (kv.has(a[0])) exp.set(a[0], Date.now() + Number(a[1]) * 1000); return 1;
      case 'ZADD': { const nx = String(a[1]).toUpperCase() === 'NX'; const [sc, m] = nx ? [a[2], a[3]] : [a[1], a[2]]; const zz = z(a[0]); if (nx && zz.has(m)) return 0; zz.set(m, Number(sc)); return 1; }
      case 'ZINCRBY': { const zz = z(a[0]); const v = (zz.get(a[2]) || 0) + Number(a[1]); zz.set(a[2], v); return String(v); }
      case 'ZSCORE': { const v = (live(a[0]) || new Map()).get(a[1]); return v == null ? null : String(v); }
      case 'ZCARD': return (live(a[0]) || new Map()).size;
      case 'ZCOUNT': { const [lo, lx] = rng(a[1]), [hi, hx] = rng(a[2]); return sorted(a[0]).filter(([, v]) => (lx ? v > lo : v >= lo) && (hx ? v < hi : v <= hi)).length; }
      case 'ZRANGE': case 'ZREVRANGE': { let l = sorted(a[0]); if (String(cmd).toUpperCase() === 'ZREVRANGE') l = l.reverse(); const st = Number(a[1]), en = Number(a[2]) < 0 ? l.length + Number(a[2]) : Number(a[2]); l = l.slice(st, en + 1); return a.map(String).map((x) => x.toUpperCase()).includes('WITHSCORES') ? l.flatMap(([m, v]) => [m, String(v)]) : l.map(([m]) => m); }
      case 'HSET': { const hh = h(a[0]); for (let i = 1; i < a.length; i += 2) hh.set(a[i], String(a[i + 1])); return 1; }
      case 'HINCRBY': { const hh = h(a[0]); const v = Number(hh.get(a[1]) || 0) + Number(a[2]); hh.set(a[1], String(v)); return v; }
      case 'HGETALL': return [...(live(a[0]) || new Map()).entries()].flat();
      case 'SADD': { const ss = s(a[0]); a.slice(1).forEach((x) => ss.add(x)); return 1; }
      case 'SMEMBERS': return [...(live(a[0]) || new Set())];
      case 'SCARD': return (live(a[0]) || new Set()).size;
      default: throw new Error('fake redis: ' + cmd);
    }
  }
  return { pipeline: (cmds) => cmds.map((c) => { try { return { result: run(c) }; } catch (e) { return { error: String(e.message) }; } }), kv };
}
