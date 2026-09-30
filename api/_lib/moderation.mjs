// Byline nick moderation: a small blocklist matched on a normalized form (lower case, leet digits mapped back,
// separators removed). Substring match on the normalized nick, with a short allowlist for innocent words that contain
// a blocked one. Keep the list plain: it protects room tables and share cards, not free chat.
const BLOCKED = [
  'fuck', 'fuk', 'shit', 'cunt', 'bitch', 'bastard', 'wanker', 'twat', 'dick', 'cock', 'pussy', 'whore', 'slut', 'nigg', 'fag', 'retard', 'spastic',
  'rape', 'nazi', 'hitler', 'kys', 'paki', 'chink', 'tranny', 'kike', 'coon', 'porn', 'sex', 'anal', 'penis', 'vagina', 'cum',
  'admin', 'moderator', 'semba', 'official', 'tierone', 'tier one',
];
const ALLOW = ['scunthorpe', 'cumberland', 'cockburn', 'dickens', 'dickson', 'sexton', 'essex', 'sussex', 'middlesex', 'analyst', 'analysis', 'assassin', 'cassandra', 'shitake'];
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'l' };
export function normalizeNick(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[0134578@$!|]/g, (c) => LEET[c] || c).replace(/[^a-z]/g, '');
}
export function nickAllowed(nick) {
  const n = normalizeNick(nick);
  if (!n) return true;
  let base = n;
  for (const a of ALLOW) base = base.split(a).join('');
  return !BLOCKED.some((w) => base.includes(w.replace(/\s/g, '')));
}
export { BLOCKED as _BLOCKED };
