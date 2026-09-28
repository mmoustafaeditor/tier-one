// Save and load. The save holds the WHOLE world plus the career, with a SHA-256 checksum.
// Lesson from the old game (E2E #41): a save whose checksum does not match is REJECTED, never loaded or "migrated".
// A client-side checksum only catches corruption and casual edits; online features must re-check on the server.
import type { Career, SaveFile } from '../model/types';
import { checkWorld, type World } from './world';
import { upgradeCareer, upgradeWorld } from './upgrade';

const KEY = 'gaffer.save.v1';

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
  return { format: 'SEMBA_GAFFER_SAVE', version: 1, savedAt: new Date().toISOString(), checksum: await sha256(body(world, career)), world, career };
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

export type LoadResult = { ok: true; save: SaveFile } | { ok: false; reason: 'none' | 'format' | 'checksum' | 'world' };

export async function parseSave(text: string): Promise<LoadResult> {
  let s: SaveFile;
  try {
    s = JSON.parse(await unpack(text.trim()));
  } catch {
    return { ok: false, reason: 'format' };
  }
  if (!s || s.format !== 'SEMBA_GAFFER_SAVE' || s.version !== 1 || !s.world || typeof s.checksum !== 'string') return { ok: false, reason: 'format' };
  if ((await sha256(body(s.world, s.career))) !== s.checksum) return { ok: false, reason: 'checksum' };
  // Checksum is good: now it's safe to bring an older save up to date.
  const world = upgradeWorld(s.world, s.career?.season ?? 2026);
  const career = s.career ? upgradeCareer(world, s.career) : null;
  s = { ...s, format: 'SEMBA_GAFFER_SAVE', world, career };
  if (checkWorld(s.world).length) return { ok: false, reason: 'world' };
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

// Returns false when the browser refused the write (storage full or blocked): the game says so instead of failing silently.
export async function store(world: World, career: Career | null): Promise<boolean> {
  const text = await saveText(world, career);
  try {
    localStorage.setItem(KEY, text);
    return true;
  } catch {
    return false;
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
