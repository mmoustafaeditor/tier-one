// Cloud-save merge rules (docs/api/README.md › Sync rules). The client mirrors these in lib/sync.ts; both are tested.
//
// A save is one JSON document (lib/save.ts `Save`). When two devices diverge, the merge is:
//   1. Last-writer-wins for everything not listed below: the document with the later `updatedAt` is the base.
//   2. Counters are additive: result = server value + the client's delta since the version it last synced
//      (deltas come from `diff(base, current)` on the client). Without deltas: max(server, client).
//   3. High-water marks take the max; first-time stamps (achievements, seen films) keep the earliest non-zero value.
//   4. Collections are unioned by id (feed, owned cosmetics, seen wire items, purchase ledger, season recaps, rooms);
//      the newer document's order comes first, then anything only the older one had; capped.
//   5. Keyed records (Daily results by number) are unioned; the newer document wins a key both have.
// Patterns: '*' matches one key. Order of checks: first-time stamps, counters, max, so 'stats.pay:*' beats 'stats.*'.
export const RULES = {
  counters: ['credits', 'pp', 'byline.followers', 'stats.*', 'book.*.xp', 'book.*.asks', 'book.*.hits', 'rivals.*.w', 'rivals.*.l', 'rivals.*.d'],
  max: ['byline.hot', 'byline.best', 'streak.best', 'book.*.lv', 'practice.played'],
  first: ['ach.*', 'milestones.*', 'scenes.*', 'rivals.*.scalp', 'rivals.*.trophy', 'stats.pay:*'],
  collections: {
    feed: { id: 'id', cap: 60, sort: 'at', flags: ['read'] },
    owned: { cap: 500 },
    wireSeen: { cap: 400 },
    ledger: { id: (e) => e.at + '|' + e.why, cap: 30, sort: 'at' },
    seasonLog: { id: 'id', cap: 40 },
    rooms: { id: 'code', cap: 50 },
    'byline.keys': { cap: 40 },
  },
  maps: ['daily'],
  clampMin: { credits: 0, 'byline.followers': 0, pp: 0 },
};

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
export const get = (o, parts) => parts.reduce((v, k) => (v == null ? undefined : v[k]), o);
export function set(o, parts, v) { let c = o; for (let i = 0; i < parts.length - 1; i++) { if (!isObj(c[parts[i]])) c[parts[i]] = {}; c = c[parts[i]]; } c[parts[parts.length - 1]] = v; }
// Expands one pattern over the union of keys in all docs: 'book.*.xp' -> ['book.agent.xp', ...]
export function expand(pattern, docs) {
  const parts = pattern.split('.');
  let paths = [[]];
  for (const p of parts) {
    const next = [];
    for (const path of paths) {
      if (p === '*') { const keys = new Set(); for (const d of docs) { const v = get(d, path); if (isObj(v)) Object.keys(v).forEach((k) => keys.add(k)); } for (const k of keys) next.push([...path, k]); }
      else if (p.endsWith('*')) { const pre = p.slice(0, -1), keys = new Set(); for (const d of docs) { const v = get(d, path); if (isObj(v)) Object.keys(v).forEach((k) => { if (k.startsWith(pre)) keys.add(k); }); } for (const k of keys) next.push([...path, k]); }
      else next.push([...path, p]);
    }
    paths = next;
  }
  return paths;
}
const matches = (path, pattern) => { const a = path.split('.'), b = pattern.split('.'); return a.length === b.length && b.every((p, i) => p === '*' || (p.endsWith('*') ? a[i].startsWith(p.slice(0, -1)) : p === a[i])); };
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const counterPaths = (docs) => { const out = new Set(); for (const pat of RULES.counters) for (const p of expand(pat, docs)) { const s = p.join('.'); if (!RULES.first.some((f) => matches(s, f))) out.add(s); } return [...out]; };

// The client's part: counter deltas between the last synced document and the current one.
export function diff(base, cur) {
  const b = base || {}, c = cur || {}, counters = {};
  for (const s of counterPaths([b, c])) { const d = num(get(c, s.split('.'))) - num(get(b, s.split('.'))); if (d) counters[s] = d; }
  return { counters };
}

export function merge(server, client, deltas, { serverAt = 0, clientAt = 0 } = {}) {
  const S = server || {}, C = client || {};
  const clientNewer = clientAt >= serverAt;
  const newer = clientNewer ? C : S, older = clientNewer ? S : C;
  const R = structuredClone(newer);
  const d = deltas && isObj(deltas.counters) ? deltas.counters : null;
  for (const s of counterPaths([S, C])) {
    const p = s.split('.'), sv = get(S, p), cv = get(C, p);
    let v;
    if (d) v = num(sv) + num(d[s]);
    else v = Math.max(num(sv), num(cv));
    if (sv === undefined && cv === undefined) continue;
    set(R, p, v);
  }
  for (const pat of RULES.max) for (const p of expand(pat, [S, C])) { const a = get(S, p), b = get(C, p); if (a === undefined && b === undefined) continue; set(R, p, Math.max(num(a), num(b))); }
  for (const pat of RULES.first) for (const p of expand(pat, [S, C])) { const a = get(S, p), b = get(C, p); if (a === undefined && b === undefined) continue; const vals = [a, b].filter((x) => typeof x === 'number' && x > 0); set(R, p, vals.length ? Math.min(...vals) : (a ?? b)); }
  for (const [path, rule] of Object.entries(RULES.collections)) {
    const p = path.split('.'), a = get(newer, p), b = get(older, p);
    if (!Array.isArray(a) && !Array.isArray(b)) continue;
    set(R, p, unionList(Array.isArray(a) ? a : [], Array.isArray(b) ? b : [], rule));
  }
  for (const path of RULES.maps) { const p = path.split('.'), a = get(newer, p), b = get(older, p); if (!isObj(a) && !isObj(b)) continue; set(R, p, { ...(isObj(b) ? b : {}), ...(isObj(a) ? a : {}) }); }
  for (const [path, lo] of Object.entries(RULES.clampMin)) { const p = path.split('.'), v = get(R, p); if (typeof v === 'number' && v < lo) set(R, p, lo); }
  return R;
}
function unionList(primary, secondary, rule) {
  const idOf = typeof rule.id === 'function' ? rule.id : rule.id ? (e) => (e && e[rule.id]) : (e) => e;
  const seen = new Map(), out = [];
  for (const e of primary) { const k = String(idOf(e)); if (seen.has(k)) continue; seen.set(k, out.length); out.push(e); }
  for (const e of secondary) {
    const k = String(idOf(e));
    if (seen.has(k)) { if (rule.flags && isObj(e)) { const cur = out[seen.get(k)]; for (const f of rule.flags) if (e[f] && isObj(cur) && !cur[f]) out[seen.get(k)] = { ...cur, [f]: true }; } continue; }
    seen.set(k, out.length); out.push(e);
  }
  if (rule.sort) out.sort((x, y) => num(y && y[rule.sort]) - num(x && x[rule.sort]));
  return rule.cap ? out.slice(0, rule.cap) : out;
}
