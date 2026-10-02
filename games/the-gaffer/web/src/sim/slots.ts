// Save slots (V2_DESIGN §7.5): IndexedDB database `semba-gaffer`, store `slots`, one record per slot
// { slot, meta, text } where text is the packed save (see save.ts). Two slots are free; slots are never locked.
// The old single save (localStorage `gaffer.save.v1`) is copied once into slot 1 and left in place, read-only.
// The Android shell backs up localStorage `gaffer.*` keys, so the last written slot is mirrored in
// `gaffer.backup.v2` too: a reinstalled app gets its career back. Where IndexedDB is missing (some WebViews, private
// modes) the slots live in localStorage `gaffer.slot.<n>` instead. Nothing here throws.
import type { SaveMeta } from '../model/types';

export const FREE_SLOTS = 2;
const DB = 'semba-gaffer';
const STORE = 'slots';
const LEGACY = 'gaffer.save.v1';
const BACKUP = 'gaffer.backup.v2';
const MIGRATED = 'gaffer.migrated.v2';
const ACTIVE = 'gaffer.active';

export interface SlotRecord { slot: number; meta: SaveMeta | null; text: string; savedAt: string }

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* blocked */ } },
};

let dbp: Promise<IDBDatabase | null> | null = null;
function db(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') { resolve(null); return; }
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'slot' }); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbp;
}

function tx<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return db().then((d) => new Promise<T | null>((resolve) => {
    if (!d) { resolve(null); return; }
    try {
      const r = f(d.transaction(STORE, mode).objectStore(STORE));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(null);
    } catch { resolve(null); }
  }));
}

export async function readSlot(slot: number): Promise<SlotRecord | null> {
  const d = await db();
  if (!d) { const raw = ls.get(`gaffer.slot.${slot}`); return raw ? JSON.parse(raw) as SlotRecord : null; }
  return (await tx<SlotRecord | undefined>('readonly', (s) => s.get(slot) as IDBRequest<SlotRecord | undefined>)) ?? null;
}

export async function writeSlot(slot: number, text: string, meta: SaveMeta | null): Promise<boolean> {
  const rec: SlotRecord = { slot, meta, text, savedAt: new Date().toISOString() };
  const d = await db();
  let ok: boolean;
  if (!d) ok = ls.set(`gaffer.slot.${slot}`, JSON.stringify(rec));
  else ok = (await tx('readwrite', (s) => s.put(rec))) !== null;
  if (ok) { ls.set(BACKUP, JSON.stringify(rec)); ls.set(ACTIVE, String(slot)); }
  return ok;
}

// The match being watched, saved on its own between the career's full saves (kick-off and the final whistle): a
// small record written in a few milliseconds, so saving during play never stalls the pitch. On load it replaces the
// career's copy of the same match when it is further on. `gaffer.live.<slot>`, localStorage (backed up by the shell).
export interface LiveRecord<M> { key: string; minute: number; savedAt: string; live: M }
export function writeLive<M extends { key: string; minute: number }>(slot: number, live: M): boolean {
  return ls.set(`gaffer.live.${slot}`, JSON.stringify({ key: live.key, minute: live.minute, savedAt: new Date().toISOString(), live }));
}
export function readLive<M>(slot: number): LiveRecord<M> | null {
  try { const r = JSON.parse(ls.get(`gaffer.live.${slot}`) ?? 'null') as LiveRecord<M> | null; return r && typeof r.key === 'string' && r.live ? r : null; } catch { return null; }
}
export const clearLive = (slot: number) => ls.del(`gaffer.live.${slot}`);

export async function clearSlot(slot: number): Promise<void> {
  clearLive(slot);
  const d = await db();
  if (!d) ls.del(`gaffer.slot.${slot}`);
  else await tx('readwrite', (s) => s.delete(slot));
  try { const b = JSON.parse(ls.get(BACKUP) ?? 'null') as SlotRecord | null; if (b?.slot === slot) ls.del(BACKUP); } catch { /* ignore */ }
}

export async function listSlots(): Promise<SlotRecord[]> {
  const out: SlotRecord[] = [];
  for (let n = 1; n <= FREE_SLOTS; n++) { const r = await readSlot(n); if (r) out.push(r); }
  return out;
}

export const activeSlot = () => Math.min(FREE_SLOTS, Math.max(1, Number(ls.get(ACTIVE)) || 1));
export const setActiveSlot = (n: number) => { ls.set(ACTIVE, String(n)); };
export async function freeSlot(): Promise<number | null> {
  for (let n = 1; n <= FREE_SLOTS; n++) if (!(await readSlot(n))) return n;
  return null;
}

// Once per device: the pre-v2 save becomes slot 1 (the original stays where it was), and a backup the Android app
// restored into localStorage goes back into its slot when the database is empty.
export async function migrate(): Promise<void> {
  try {
    const legacy = ls.get(LEGACY);
    if (legacy && !ls.get(MIGRATED)) {
      const target = (await readSlot(1)) ? await freeSlot() : 1;
      if (target) {
        const d = await db();
        const rec: SlotRecord = { slot: target, meta: null, text: legacy, savedAt: new Date().toISOString() };
        if (d) await tx('readwrite', (s) => s.put(rec)); else ls.set(`gaffer.slot.${target}`, JSON.stringify(rec));
        ls.set(MIGRATED, String(target));
      }
    }
    const backup = ls.get(BACKUP);
    if (backup && !(await listSlots()).length) {
      const rec = JSON.parse(backup) as SlotRecord;
      const d = await db();
      if (d) await tx('readwrite', (s) => s.put(rec)); else ls.set(`gaffer.slot.${rec.slot}`, backup);
    }
  } catch { /* a broken backup is ignored */ }
}
