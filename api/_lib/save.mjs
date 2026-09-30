// Cloud save: one versioned, gzip+base64 blob per account. Keys: t1v4:save:<acc> (current) and :prev (one back).
//   save.push { blob, base, updatedAt, deltas? } -> { version, updatedAt, merged, blob? }
//   save.pull {}                                  -> { version, updatedAt, deviceId, blob } (version 0 when empty)
// A push whose `base` equals the stored version fast-forwards. Otherwise the server merges (merge.mjs) and hands the
// merged blob back; the client replaces its local state with it and continues from the new version.
import { gzipSync, gunzipSync } from 'node:zlib';
import { ApiError, bad } from './router.mjs';
import { merge } from './merge.mjs';
import { int, sha256 } from './util.mjs';

const P = 't1v4:save:';
export const LIMITS = { blob: 320_000, raw: 2_500_000 };
const SAVE_TTL = 730 * 86400;

export const pack = (doc) => gzipSync(Buffer.from(JSON.stringify(doc)), { level: 6 }).toString('base64');
export function unpack(blob) {
  if (typeof blob !== 'string' || !blob) throw bad('blob');
  if (blob.length > LIMITS.blob) throw new ApiError('PAYLOAD_TOO_LARGE', 'blob', 413, { max: LIMITS.blob });
  if (!/^[A-Za-z0-9+/=]+$/.test(blob)) throw bad('blob');
  let raw;
  try { raw = gunzipSync(Buffer.from(blob, 'base64'), { maxOutputLength: LIMITS.raw }); } catch { throw bad('blob'); }
  let doc; try { doc = JSON.parse(raw.toString('utf8')); } catch { throw bad('blob json'); }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc) || typeof doc.v !== 'number') throw bad('save shape');
  return doc;
}

export function createSaveStore({ kv }) {
  const key = (acc) => P + acc;
  async function push(body, ctx) {
    const acc = ctx.account.id, dev = ctx.account.dev;
    const doc = unpack(body.blob);
    const base = int(body.base, 0, 1e9), updatedAt = int(body.updatedAt, 0, 4102444800000) || Date.now();
    const cur = await kv.getJ(key(acc));
    let out, merged = false;
    if (!cur || base === cur.version) out = doc;
    else { out = merge(unpack(cur.blob), doc, body.deltas && typeof body.deltas === 'object' ? body.deltas : null, { serverAt: cur.updatedAt, clientAt: updatedAt }); merged = true; }
    const blob = merged ? pack(out) : body.blob;
    const next = { version: (cur ? cur.version : 0) + 1, updatedAt: merged ? Date.now() : updatedAt, deviceId: dev, hash: sha256(blob).slice(0, 16), size: blob.length, blob, at: Date.now() };
    const cmds = [['SET', key(acc), JSON.stringify(next), 'EX', SAVE_TTL]];
    if (cur) cmds.push(['SET', key(acc) + ':prev', JSON.stringify(cur), 'EX', SAVE_TTL]);
    await kv.pipeline(cmds);
    return { version: next.version, updatedAt: next.updatedAt, hash: next.hash, merged, ...(merged ? { blob } : {}) };
  }
  async function pull(body, ctx) {
    const cur = await kv.getJ(key(ctx.account.id));
    if (!cur) return { version: 0, updatedAt: 0, deviceId: null, blob: null };
    return { version: cur.version, updatedAt: cur.updatedAt, deviceId: cur.deviceId, hash: cur.hash, blob: cur.blob };
  }
  return { push, pull };
}
