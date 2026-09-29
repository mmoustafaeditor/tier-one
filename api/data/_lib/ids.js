// Stable id helpers shared by the API and the refresh tools (no dependencies).

/** 'Ben White (footballer)' -> 'ben-white-footballer'; accents folded, anything else collapsed to '-'. */
export function slug(s) {
  return String(s == null ? '' : s)
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[øØ]/g, 'o').replace(/[æÆ]/g, 'ae').replace(/ß/g, 'ss').replace(/[łŁ]/g, 'l').replace(/[đĐ]/g, 'd').replace(/ı/g, 'i')
    .toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Player id. Prefers the player's reference key (Wikipedia article title), which is unique and survives transfers,
 * so a player keeps his id when he changes club. Unlinked players fall back to name + birth date or name + first club.
 */
export function playerId({ ref, name, birthDate, clubId }) {
  if (ref) return 'p-' + slug(ref);
  if (birthDate) return 'p-' + slug(name) + '-' + String(birthDate).replace(/-/g, '');
  return 'p-' + slug(name) + '--' + slug(clubId || 'x');
}

export const transferId = (t) => 't-' + String(t.date || 'undated').replace(/-/g, '') + '-' + String(t.playerId || '').replace(/^p-/, '') + '-' + slug(t.toClubId || t.toName || 'x');
export const rumourId = (r) => 'r-' + String(r.playerId || '').replace(/^p-/, '') + '-' + String(r.window || '').replace(/[^0-9a-z]/gi, '').toLowerCase();

/** Small deterministic 32-bit hash (FNV-1a) for fictional-name generation and ETags. */
export function hash32(s) {
  let h = 0x811c9dc5;
  const str = String(s);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
