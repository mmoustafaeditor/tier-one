// v4 `catchphrase.set { text }` (GOTY.md §12): your own catchphrase, from Chief rank. The client gates the rank and runs
// a first blocklist (web/src/lib/catchphrase.ts); this is the check that counts: 24 characters after cleaning, the nick
// moderation list (api/_lib/moderation.mjs) plus a brand and real-person list, so no line borrows someone's catchphrase
// or a sponsor's name. Stored per account at t1v4:cp:<account> and returned cleaned.
//   -> { ok: true, text } | { ok: false, code: 'CATCHPHRASE_BLOCKED' | 'CATCHPHRASE_EMPTY' | 'CATCHPHRASE_LONG' }
import { ApiError } from '../../_lib/router.mjs';
import { nickAllowed, normalizeNick } from '../../_lib/moderation.mjs';

export const CATCHPHRASE_MAX = 24;
const CP_TTL = 400 * 86400;
// Another person's line, brands, broadcasters and our own name. Matched on the normalized form (see moderation.mjs).
export const BRAND_BLOCK = [
  'herewego', 'aquivamos', 'romano', 'fabrizio', 'ornstein', 'schira', 'plettenberg', 'moretto', 'dimarzio', 'pedulla',
  'nike', 'adidas', 'puma', 'newbalance', 'umbro', 'skysports', 'espn', 'bbc', 'dazn', 'talksport', 'goalcom', 'beinsports',
  'premierleague', 'laliga', 'uefa', 'fifa', 'tierone', 'semba', 'official', 'admin',
];
export const cleanLine = (x) => String(x || '').replace(/[<>{}\u0000-\u001f\u200b-\u200f\u2028-\u202e]/g, '').replace(/\s+/g, ' ').trim();
export function checkLine(raw) {
  const text = cleanLine(raw);
  if (!text) return { ok: false, code: 'CATCHPHRASE_EMPTY' };
  if ([...text].length > CATCHPHRASE_MAX) return { ok: false, code: 'CATCHPHRASE_LONG' };
  const n = normalizeNick(text);
  if (!nickAllowed(text) || BRAND_BLOCK.some((w) => n.includes(w))) return { ok: false, code: 'CATCHPHRASE_BLOCKED' };
  return { ok: true, text };
}
export function createCatchphrase({ kv }) {
  return {
    set: async (b, ctx) => {
      const r = checkLine(b && b.text);
      if (!r.ok) throw new ApiError(r.code, r.code.toLowerCase().replace(/_/g, ' '), 400);
      await kv.setJ('t1v4:cp:' + ctx.account.id, { text: r.text, at: Date.now() }, CP_TTL);
      return { text: r.text };
    },
  };
}
