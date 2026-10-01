// Cloud save sync (api/tier-one/v4 save.push / save.pull). The merge rules here mirror api/_lib/merge.mjs exactly
// (docs/api/README.md › Sync rules) and are unit-tested in __tests__/sync.test.ts.
//
// Flow: bootPlatform() calls pullOnBoot() once an account exists; watch() then pushes after local changes (debounced,
// plus a keepalive push on pagehide). A push carries the counter deltas since the last synced version (`diff`) so the
// server can merge a race additively; a merged blob coming back replaces the local save (device-only fields kept).
import { v4 } from './api';
import { getSave, update, migrate, type Save } from './save';

export const SYNC_KEY = 'tierone_v4_sync';
export const DEBOUNCE_MS = 4000, WATCH_MS = 2500;
// Fields that never leave the device: the device id (v3 identity) and device preferences.
export const LOCAL_FIELDS: (keyof Save)[] = ['dev', 'sound', 'reduced'];

// ---------------------------------------------------------------- rules (same as the server)
type Doc = Record<string, unknown>;
export interface CollectionRule { id?: string | ((e: unknown) => unknown); cap?: number; sort?: string; flags?: string[] }
export const RULES = {
  counters: ['credits', 'xp', 'pp', 'season.xp', 'byline.followers', 'stats.*', 'book.*.xp', 'book.*.asks', 'book.*.hits', 'rivals.*.w', 'rivals.*.l', 'rivals.*.d'],
  max: ['byline.hot', 'byline.best', 'byline.rank', 'streak.best', 'book.*.lv', 'practice.played'],
  first: ['ach.*', 'milestones.*', 'scenes.*', 'rivals.*.scalp', 'rivals.*.trophy', 'stats.pay:*'],
  collections: {
    feed: { id: 'id', cap: 60, sort: 'at', flags: ['read'] },
    owned: { cap: 500 },
    wireSeen: { cap: 400 },
    ledger: { id: (e: unknown) => { const x = e as { at: number; why: string }; return x.at + '|' + x.why; }, cap: 30, sort: 'at' },
    seasonLog: { id: 'id', cap: 40 },
    rooms: { id: 'code', cap: 50 },
    'byline.keys': { cap: 40 },
  } as Record<string, CollectionRule>,
  maps: ['daily'],
  clampMin: { credits: 0, 'byline.followers': 0, pp: 0, xp: 0, 'season.xp': 0 } as Record<string, number>,
};
const isObj = (v: unknown): v is Doc => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
export const get = (o: unknown, parts: string[]): unknown => parts.reduce<unknown>((v, k) => (v == null ? undefined : (v as Doc)[k]), o);
export function set(o: Doc, parts: string[], v: unknown) { let c = o; for (let i = 0; i < parts.length - 1; i++) { if (!isObj(c[parts[i]])) c[parts[i]] = {}; c = c[parts[i]] as Doc; } c[parts[parts.length - 1]] = v; }
export function expand(pattern: string, docs: unknown[]): string[][] {
  let paths: string[][] = [[]];
  for (const p of pattern.split('.')) {
    const next: string[][] = [];
    for (const path of paths) {
      if (p === '*' || p.endsWith('*')) {
        const pre = p === '*' ? '' : p.slice(0, -1), keys = new Set<string>();
        for (const d of docs) { const v = get(d, path); if (isObj(v)) Object.keys(v).forEach((k) => { if (k.startsWith(pre)) keys.add(k); }); }
        for (const k of keys) next.push([...path, k]);
      } else next.push([...path, p]);
    }
    paths = next;
  }
  return paths;
}
const matches = (path: string, pattern: string) => { const a = path.split('.'), b = pattern.split('.'); return a.length === b.length && b.every((p, i) => p === '*' || (p.endsWith('*') ? a[i].startsWith(p.slice(0, -1)) : p === a[i])); };
const counterPaths = (docs: unknown[]) => { const out = new Set<string>(); for (const pat of RULES.counters) for (const p of expand(pat, docs)) { const s = p.join('.'); if (!RULES.first.some((f) => matches(s, f))) out.add(s); } return [...out]; };

export interface Deltas { counters: Record<string, number> }
/** Counter values of a document, flat by path: the small snapshot kept as the sync base. */
export function snapshot(doc: unknown): Record<string, number> { const out: Record<string, number> = {}; for (const s of counterPaths([doc])) out[s] = num(get(doc, s.split('.'))); return out; }
/** Counter deltas between the last synced document (or its snapshot) and the current one. */
export function diff(base: unknown, cur: unknown): Deltas {
  const b = base || {}, c = cur || {}, counters: Record<string, number> = {};
  const baseIsSnap = isObj(b) && Object.keys(b).every((k) => typeof (b as Doc)[k] === 'number' && (k.includes('.') || RULES.counters.includes(k)));
  const baseVal = (s: string) => (baseIsSnap ? num((b as Doc)[s]) : num(get(b, s.split('.'))));
  const paths = new Set([...counterPaths([c]), ...(baseIsSnap ? Object.keys(b as Doc) : counterPaths([b]))]);
  for (const s of paths) { const d = num(get(c, s.split('.'))) - baseVal(s); if (d) counters[s] = d; }
  return { counters };
}
export function merge<T extends Doc>(server: T | null, client: T | null, deltas: Deltas | null, { serverAt = 0, clientAt = 0 } = {}): T {
  const S = (server || {}) as Doc, C = (client || {}) as Doc;
  const clientNewer = clientAt >= serverAt;
  const newer = clientNewer ? C : S, older = clientNewer ? S : C;
  const R = structuredClone(newer) as Doc;
  const d = deltas && isObj(deltas.counters) ? deltas.counters : null;
  for (const s of counterPaths([S, C])) {
    const p = s.split('.'), sv = get(S, p), cv = get(C, p);
    if (sv === undefined && cv === undefined) continue;
    set(R, p, d ? num(sv) + num(d[s]) : Math.max(num(sv), num(cv)));
  }
  for (const pat of RULES.max) for (const p of expand(pat, [S, C])) { const a = get(S, p), b = get(C, p); if (a === undefined && b === undefined) continue; set(R, p, Math.max(num(a), num(b))); }
  for (const pat of RULES.first) for (const p of expand(pat, [S, C])) { const a = get(S, p), b = get(C, p); if (a === undefined && b === undefined) continue; const vals = [a, b].filter((x): x is number => typeof x === 'number' && x > 0); set(R, p, vals.length ? Math.min(...vals) : (a ?? b)); }
  for (const [path, rule] of Object.entries(RULES.collections)) { const p = path.split('.'), a = get(newer, p), b = get(older, p); if (!Array.isArray(a) && !Array.isArray(b)) continue; set(R, p, unionList(Array.isArray(a) ? a : [], Array.isArray(b) ? b : [], rule)); }
  for (const path of RULES.maps) { const p = path.split('.'), a = get(newer, p), b = get(older, p); if (!isObj(a) && !isObj(b)) continue; set(R, p, { ...(isObj(b) ? b : {}), ...(isObj(a) ? a : {}) }); }
  for (const [path, lo] of Object.entries(RULES.clampMin)) { const p = path.split('.'), v = get(R, p); if (typeof v === 'number' && v < lo) set(R, p, lo); }
  return R as T;
}
function unionList(primary: unknown[], secondary: unknown[], rule: CollectionRule): unknown[] {
  const idOf = typeof rule.id === 'function' ? rule.id : rule.id ? (e: unknown) => (isObj(e) ? e[rule.id as string] : e) : (e: unknown) => e;
  const seen = new Map<string, number>(), out: unknown[] = [];
  for (const e of primary) { const k = String(idOf(e)); if (seen.has(k)) continue; seen.set(k, out.length); out.push(e); }
  for (const e of secondary) {
    const k = String(idOf(e));
    if (seen.has(k)) { if (rule.flags && isObj(e)) { const i = seen.get(k)!, cur = out[i]; for (const f of rule.flags) if (e[f] && isObj(cur) && !cur[f]) out[i] = { ...cur, [f]: true }; } continue; }
    seen.set(k, out.length); out.push(e);
  }
  if (rule.sort) { const s = rule.sort; out.sort((x, y) => num(isObj(y) ? y[s] : 0) - num(isObj(x) ? x[s] : 0)); }
  return rule.cap ? out.slice(0, rule.cap) : out;
}
/** A remote document becomes the local save: migrated, with device-only fields kept from the current save. */
export function applyRemote(remote: Doc, local: Save): Save {
  const next = migrate(structuredClone(remote));
  for (const f of LOCAL_FIELDS) (next as unknown as Doc)[f] = (local as unknown as Doc)[f];
  return next;
}

// ---------------------------------------------------------------- blobs (gzip + base64, like the server)
export async function pack(doc: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(doc));
  const gz = await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
  return b64(new Uint8Array(gz));
}
export async function unpack<T = Doc>(blob: string): Promise<T> {
  const bytes = Uint8Array.from(atob(blob), (c) => c.charCodeAt(0));
  const raw = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  return JSON.parse(raw) as T;
}
function b64(u: Uint8Array): string { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); }
export const canSync = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

// ---------------------------------------------------------------- orchestration
export interface SyncState { base: number; baseSnap: Record<string, number>; updatedAt: number; pushedAt: number; dirty: boolean; lastError?: string }
let st: SyncState = readState();
let enabled = false, timer = 0, ticker = 0, lastRef: Save | null = null, inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();
function readState(): SyncState { try { const raw = localStorage.getItem(SYNC_KEY); if (raw) return { dirty: false, ...JSON.parse(raw) }; } catch { /* */ } return { base: 0, baseSnap: {}, updatedAt: 0, pushedAt: 0, dirty: false }; }
function writeState() { try { localStorage.setItem(SYNC_KEY, JSON.stringify(st)); } catch { /* */ } listeners.forEach((f) => f()); }
export const syncState = () => st;
export function onSync(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
const setBase = (version: number, doc: unknown) => { st = { ...st, base: version, baseSnap: snapshot(doc), pushedAt: Date.now(), dirty: false, lastError: undefined }; writeState(); };

/** First sync of a session: pull, merge with the local save, push the result as the new base. */
export async function pullOnBoot(): Promise<'pushed' | 'merged' | 'same' | 'skipped' | 'error'> {
  if (!canSync()) return 'skipped';
  const r = await v4<{ version: number; updatedAt: number; blob: string | null }>('save.pull');
  if (!r.ok) { st = { ...st, lastError: r.code }; writeState(); return 'error'; }
  const local = getSave();
  if (!r.blob || !r.version) { const out = await push(0); return out ? 'pushed' : 'error'; }
  if (r.version === st.base) { if (st.dirty || st.updatedAt > st.pushedAt) { return (await push(st.base)) ? 'pushed' : 'error'; } return 'same'; }
  // The server moved on (another device pushed): merge it into the local save, then fast-forward from its version.
  let remote: Doc; try { remote = await unpack(r.blob); } catch { st = { ...st, lastError: 'blob' }; writeState(); return 'error'; }
  const merged = merge(remote, local as unknown as Doc, st.base ? diff(st.baseSnap, local) : null, { serverAt: r.updatedAt, clientAt: st.updatedAt || 0 });
  update(() => applyRemote(merged, local));
  return (await push(r.version)) ? 'merged' : 'error';
}
async function push(base: number, keepalive = false): Promise<boolean> {
  const local = getSave();
  let blob: string; try { blob = await pack(local); } catch { return false; }
  const deltas = base ? diff(st.baseSnap, local) : { counters: {} };
  const r = await v4<{ version: number; updatedAt: number; merged: boolean; blob?: string }>('save.push', { blob, base, updatedAt: st.updatedAt || Date.now(), deltas }, { idem: 'push:' + base + ':' + (st.updatedAt || 0), keepalive, timeoutMs: 15000 });
  if (!r.ok) { st = { ...st, lastError: r.code, dirty: true }; writeState(); return false; }
  if (r.merged && r.blob) { try { const doc = await unpack(r.blob); update((s) => applyRemote(doc, s)); } catch { /* keep local */ } }
  setBase(r.version, getSave());
  return true;
}
/** Pushes the current save soon (debounced). Safe to call often; no-op until watch() enabled sync. */
export function pushSoon(delay = DEBOUNCE_MS) {
  if (!enabled) return;
  st = { ...st, updatedAt: Date.now(), dirty: true };
  clearTimeout(timer);
  timer = window.setTimeout(() => { flush(); }, delay);
}
export function flush(keepalive = false): Promise<void> {
  if (!enabled || inflight) return inflight || Promise.resolve();
  inflight = push(st.base, keepalive).then(() => { inflight = null; if (st.dirty && st.updatedAt > st.pushedAt) pushSoon(); }).catch(() => { inflight = null; });
  return inflight;
}
/** Starts watching the local save (lib/save.ts has no public subscribe, so this polls the state reference). */
export function watch() {
  if (enabled || typeof window === 'undefined') return;
  enabled = true; lastRef = getSave();
  ticker = window.setInterval(() => { const cur = getSave(); if (cur !== lastRef) { lastRef = cur; pushSoon(); } }, WATCH_MS);
  window.addEventListener('pagehide', () => { if (st.dirty) { clearTimeout(timer); flush(true); } });
}
export function unwatch() { enabled = false; clearInterval(ticker); clearTimeout(timer); }
/** After a magic-link merge moved this device to another account: forget the base and pull that account's save. */
export function resetBase() { st = { base: 0, baseSnap: {}, updatedAt: Date.now(), pushedAt: 0, dirty: true }; writeState(); }
