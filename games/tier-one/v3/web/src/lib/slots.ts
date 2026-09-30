// Career save slots (Save v2): three independent careers. The active one lives in save.career/save.story as before;
// the others wait in save.slots. A slot travels between devices as a transfer code (api/online.js save.put/save.get).
import { getSave, update, type Save, type CareerSlot } from './save';
import { online } from './api';
import { newCareer } from './career';

export const SLOTS = 3;
// The live copy of each slot (the active one read from career/story).
export function slotList(s: Save): (CareerSlot | null)[] {
  const out = Array.from({ length: SLOTS }, (_, k) => (s.slots && s.slots[k]) || null);
  const a = s.slot || 0;
  out[a] = s.career ? { career: s.career, story: s.story } : null;
  return out;
}
function stash(x: Save) { x.slots = slotList(x); }
function load(x: Save, k: number, v: CareerSlot | null) {
  stash(x);
  x.slots![k] = v; x.slot = k;
  x.career = v ? v.career : null;
  x.story = v ? v.story || { prologue: true } : { prologue: x.story?.prologue };
}
export const switchSlot = (k: number) => update((x) => { load(x, k, slotList(x)[k]); });
export const newSlot = (k: number) => update((x) => { load(x, k, { career: newCareer(k + 1), story: { prologue: true, chapterSeen: 0 } }); });
export const deleteSlot = (k: number) => update((x) => {
  stash(x); x.slots![k] = null;
  if ((x.slot || 0) === k) { x.career = null; x.story = { prologue: x.story?.prologue }; }
});

// 'T1.<base64 utf-8 json>.<checksum>' (the format save.put accepts).
const sum = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h.toString(36); };
const b64 = (s: string) => { let o = ''; for (const c of new TextEncoder().encode(s)) o += String.fromCharCode(c); return btoa(o); };
const unb64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));

export async function slotCode(k: number): Promise<{ code?: string; error?: string }> {
  const v = slotList(getSave())[k];
  if (!v) return { error: 'empty' };
  const body = b64(JSON.stringify({ t1v3slot: 1, ...v }));
  const r = await online<{ code: string }>('save.put', { data: 'T1.' + body + '.' + sum(body) });
  return r.ok ? { code: r.code } : { error: r.error };
}
export async function restoreCode(k: number, code: string): Promise<{ ok?: boolean; error?: string }> {
  const r = await online<{ data: string }>('save.get', { code });
  if (!r.ok) return { error: r.error };
  try {
    const [, body, h] = r.data.split('.');
    if (sum(body) !== h) return { error: 'bad' };
    const v = JSON.parse(unb64(body));
    if (!v || v.t1v3slot !== 1 || !v.career || typeof v.career.rank !== 'number') return { error: 'bad' };
    update((x) => { load(x, k, { career: v.career, story: v.story }); });
    return { ok: true };
  } catch { return { error: 'bad' }; }
}
