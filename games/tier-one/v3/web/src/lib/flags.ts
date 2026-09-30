// Feature flags, A/B buckets and remote config on the client: `flag(name, default)` reads the last config.get
// answer (kept in memory and in localStorage `tierone_v4_config`, so a cold start offline sees yesterday's flags).
// Buckets are computed on the server per account id; `bucketFor` mirrors it (same FNV-1a) for anything that must
// decide before the first config arrives.
import { v4 } from './api';

export const CONFIG_KEY = 'tierone_v4_config';
export type FlagValue = boolean | number | string;
export interface CatalogItem { id: string; kind: 'credits' | 'gold' | 'cosmetic' | 'coins' | 'name'; name: string; desc?: string; price: { credits?: number; eur?: number; usd?: number }; grants: { credits?: number; coins?: number; ent?: string }; season?: string; featured?: boolean; from?: string; until?: string; giftable?: boolean }
export interface WeeklyEvent { id: string; week: string; title: string; rules?: Record<string, unknown>; reward?: string; live: boolean }
export interface DdLiveEvent { id: string; day: string; title: string; closesLocal?: string; window?: string; live: boolean }
export interface RemoteConfig {
  catalog: { items: CatalogItem[]; earn: Record<string, number>; gift: { max: number; perDay: number } };
  featured: string[];
  events: { weekly: WeeklyEvent[]; ddlive: DdLiveEvent[] };
  flags: Record<string, FlagValue>;
  ab: Record<string, string>;
  minClientVersion: string; latest: string; message: string;
  telemetry: { sample: number; maxBatch?: number };
  season: string; week: string; now: number;
  update?: 'required' | 'available' | 'none' | 'unknown';
  fetchedAt?: number;
}

let config: RemoteConfig | null = null;
const subs = new Set<() => void>();
function read(): RemoteConfig | null { try { const raw = localStorage.getItem(CONFIG_KEY); return raw ? (JSON.parse(raw) as RemoteConfig) : null; } catch { return null; } }
export function getConfig(): RemoteConfig | null { if (!config) config = read(); return config; }
export function setConfig(c: RemoteConfig) {
  config = { ...c, fetchedAt: Date.now() };
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); } catch { /* storage full or blocked */ }
  subs.forEach((f) => f());
}
export function onConfig(fn: () => void) { subs.add(fn); return () => { subs.delete(fn); }; }

export function flag<T extends FlagValue>(name: string, def: T): T {
  const c = getConfig();
  const v = c && c.flags ? c.flags[name] : undefined;
  return v === undefined || typeof v !== typeof def ? def : (v as T);
}
export const bucket = (experiment: string, def = 'control'): string => (getConfig()?.ab ?? {})[experiment] ?? def;
export const ddLiveDates = (): DdLiveEvent[] => getConfig()?.events.ddlive ?? [];
export const catalog = (): CatalogItem[] => getConfig()?.catalog.items ?? [];

// Same hash as api/_lib/util.mjs fnv1a and config.mjs bucketFor, so an offline guess matches the server's answer.
export function fnv1a(s: string): number { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
export function bucketFor(exp: { id: string; buckets: string[]; weights?: number[]; salt?: string }, subject: string): string {
  const w = exp.weights && exp.weights.length ? exp.weights : exp.buckets.map(() => 1);
  const total = w.reduce((a, b) => a + b, 0) || 1;
  const x = (fnv1a(exp.id + '|' + (exp.salt || '') + '|' + subject) % 10000) / 10000 * total;
  let acc = 0;
  for (let i = 0; i < w.length; i++) { acc += w[i]; if (x < acc) return exp.buckets[i]; }
  return exp.buckets[w.length - 1];
}

// Fetches config.get (auth fields are added by lib/account.ts when a token exists) and caches it.
export async function loadConfig(clientVer: string): Promise<RemoteConfig | null> {
  const r = await v4<RemoteConfig>('config.get', { client: { ver: clientVer } });
  if (!r.ok) return getConfig();
  const { ok: _ok, rid: _rid, v: _v, ...cfg } = r as unknown as RemoteConfig & { ok: true; rid?: string; v?: number };
  setConfig(cfg);
  return cfg;
}
