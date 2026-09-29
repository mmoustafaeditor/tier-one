// Save and load. The save holds the WHOLE world plus the career, with a SHA-256 checksum.
// Lesson from the old game (E2E #41): a save whose checksum does not match is REJECTED, never loaded or "migrated".
// A client-side checksum only catches corruption and casual edits; online features must re-check on the server.
import type { Career, SaveFile } from '../model/types';
import { checkWorld, type World } from './world';
import { SAVE_VERSION, upgradeCareer, upgradeSave, upgradeWorld } from './upgrade';

const KEY = 'gaffer.save.v1';

// ---------- career invariants (G1, audit S2) ----------
// Everything the career points at must exist: its club, the players in the live match, on loan, shortlisted, watched,
// in the XI and in offers. A save that fails is refused with the reason, both when written and when read.
export function checkCareer(w: World, c: Career): string[] {
  const issues: string[] = [];
  const clubs = new Set(w.clubs.map((x) => x.id));
  const players = new Map(w.players.map((p) => [p.id, p]));
  if (!clubs.has(c.clubId)) issues.push(`career club ${c.clubId} is not in the world`);
  const player = (what: string, id: string) => { if (!players.has(id)) issues.push(`${what}: player ${id} not found`); };
  const club = (what: string, id: string) => { if (!clubs.has(id)) issues.push(`${what}: club ${id} not found`); };
  for (const id of c.shortlist ?? []) player('shortlist', id);
  for (const id of Object.keys(c.watch ?? {})) player('watch', id);
  for (const id of c.tactics?.xi ?? []) {
    if (!id) continue; // an empty slot: the best fit plays there
    player('xi', id);
    const p = players.get(id);
    if (p && p.clubId !== c.clubId) issues.push(`xi: ${id} is not at ${c.clubId}`);
  }
  for (const o of c.offers ?? []) { player('offers', o.playerId); club('offers', o.clubId); }
  for (const l of c.loans ?? []) { player('loans', l.playerId); club('loans', l.from); club('loans', l.to); }
  if (c.live) {
    for (const s of c.live.sides) {
      club('live', s.clubId);
      for (const id of [...s.onPitch, ...s.bench]) if (id) player('live', id);
    }
    for (const id of c.live.played ?? []) player('live', id);
  }
  return issues;
}

// Drops references that stopped meaning anything (a shortlisted player who retired, a sold starter still named in the
// XI, an offer for a player who left). Returns the same object when there is nothing to tidy. Run before every save,
// so `checkCareer` only ever refuses states that are really broken.
export function tidyCareer(w: World, c: Career): Career {
  const players = new Map(w.players.map((p) => [p.id, p]));
  const clubs = new Set(w.clubs.map((x) => x.id));
  let out = c;
  const shortlist = c.shortlist ?? [];
  const keep = shortlist.filter((id) => players.has(id));
  if (keep.length !== shortlist.length) out = { ...out, shortlist: keep };
  const stale = Object.keys(c.watch ?? {}).filter((id) => !players.has(id));
  if (stale.length) { const watch = { ...c.watch }; for (const id of stale) delete watch[id]; out = { ...out, watch }; }
  const xi = c.tactics?.xi;
  if (xi) {
    const fixed = xi.map((id) => (id && players.get(id)?.clubId === c.clubId ? id : ''));
    if (fixed.some((id, i) => id !== xi[i])) out = { ...out, tactics: { ...c.tactics!, xi: fixed } };
  }
  const offers = c.offers ?? [];
  const live = offers.filter((o) => players.get(o.playerId)?.clubId === c.clubId && clubs.has(o.clubId));
  if (live.length !== offers.length) out = { ...out, offers: live };
  return out;
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  // crypto.subtle only exists in secure contexts; some WebView setups are not, so fall back to plain JS.
  const buf = globalThis.crypto?.subtle ? new Uint8Array(await crypto.subtle.digest('SHA-256', data)) : sha256js(data);
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Plain SHA-256 (FIPS 180-4), same output as crypto.subtle.
function sha256js(msg: Uint8Array): Uint8Array {
  const K = new Uint32Array(64);
  const H = new Uint32Array(8);
  const frac = (x: number) => ((x - Math.floor(x)) * 2 ** 32) >>> 0;
  for (let n = 2, i = 0; i < 64; n++) {
    let prime = true;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) { prime = false; break; }
    if (!prime) continue;
    if (i < 8) H[i] = frac(Math.sqrt(n));
    K[i++] = frac(Math.cbrt(n));
  }
  const len = msg.length;
  const padded = new Uint8Array(((len + 9 + 63) >> 6) << 6);
  padded.set(msg);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(len / 2 ** 29));
  view.setUint32(padded.length - 4, (len << 3) >>> 0);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  H.forEach((x, i) => ov.setUint32(i * 4, x));
  return out;
}

export const _sha256js = (s: string) => [...sha256js(new TextEncoder().encode(s))].map((b) => b.toString(16).padStart(2, '0')).join('');

const body = (world: World, career: Career | null) => JSON.stringify({ world, career });

export async function makeSave(world: World, career: Career | null): Promise<SaveFile> {
  const issues = checkWorld(world);
  if (issues.length) throw new Error(`World check failed: ${issues.slice(0, 3).join('; ')}`);
  if (career) {
    const bad = checkCareer(world, career);
    if (bad.length) throw new Error(`Career check failed: ${bad.slice(0, 3).join('; ')}`);
  }
  return { format: 'SEMBA_GAFFER_SAVE', version: SAVE_VERSION, savedAt: new Date().toISOString(), checksum: await sha256(body(world, career)), world, career };
}

// ---------- packing ----------
// A save is ~3M characters of JSON: fine for Chrome and Android (≈5M), too big for Safari (≈2.5M). Gzip + base64 makes it
// about 6 times smaller. Packed text starts with GZ1:, plain JSON (older saves, browsers without CompressionStream) still loads.
const PACKED = 'GZ1:';
const canPack = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

async function streamBytes(input: Uint8Array, t: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([input as BlobPart]).stream().pipeThrough(t));
  return new Uint8Array(await out.arrayBuffer());
}

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function pack(text: string): Promise<string> {
  if (!canPack()) return text;
  const gz = await streamBytes(new TextEncoder().encode(text), new CompressionStream('gzip'));
  return PACKED + toB64(gz);
}

export async function unpack(text: string): Promise<string> {
  if (!text.startsWith(PACKED)) return text;
  if (!canPack()) throw new Error('packed save needs DecompressionStream');
  const bin = atob(text.slice(PACKED.length).replace(/\s+/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(await streamBytes(bytes, new DecompressionStream('gzip')));
}

export const saveText = async (world: World, career: Career | null) => pack(JSON.stringify(await makeSave(world, career)));

export type LoadReason = 'none' | 'format' | 'checksum' | 'world' | 'career';
export type LoadResult = { ok: true; save: SaveFile } | { ok: false; reason: LoadReason; detail?: string };

export async function parseSave(text: string): Promise<LoadResult> {
  let s: SaveFile;
  try {
    s = JSON.parse(await unpack(text.trim()));
  } catch {
    return { ok: false, reason: 'format' };
  }
  // Versions 1 (every build before G1) and 2 load; anything newer than this build is not ours to guess at.
  if (!s || s.format !== 'SEMBA_GAFFER_SAVE' || !Number.isInteger(s.version) || s.version < 1 || s.version > SAVE_VERSION || !s.world || typeof s.checksum !== 'string') {
    return { ok: false, reason: 'format' };
  }
  if ((await sha256(body(s.world, s.career))) !== s.checksum) return { ok: false, reason: 'checksum' };
  // Checksum is good: now it's safe to bring an older save up to date.
  const world = upgradeWorld(s.world, s.career?.season ?? 2026);
  const career = s.career ? upgradeCareer(world, s.career) : null;
  s = upgradeSave({ ...s, format: 'SEMBA_GAFFER_SAVE', world, career });
  if (s.career) s = { ...s, career: tidyCareer(s.world, s.career) };
  if (checkWorld(s.world).length) return { ok: false, reason: 'world' };
  if (s.career) {
    const bad = checkCareer(s.world, s.career);
    if (bad.length) return { ok: false, reason: 'career', detail: bad.slice(0, 3).join('; ') };
  }
  return { ok: true, save: s };
}

// Storage can be missing or throw (private mode, blocked site data); the game still runs, it just can't continue later.
export function readStored(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export type StoreResult = { ok: true } | { ok: false; reason: 'storage' | string };

// Never throws. `storage`: the browser refused the write (full or blocked); any other reason is a failed world or
// career check, worded for the toast. The game says so instead of failing silently (audit S1).
export async function store(world: World, career: Career | null): Promise<StoreResult> {
  let text: string;
  try {
    text = await saveText(world, career);
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
  try {
    localStorage.setItem(KEY, text);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'storage' };
  }
}

export async function loadStored(): Promise<LoadResult> {
  const text = readStored();
  return text ? parseSave(text) : { ok: false, reason: 'none' };
}

export function clearStored() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
