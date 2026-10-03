// One-off: map the cinematic pack's 328 club profiles (design/club-themes.json) to the game's club ids.
import { readFileSync, writeFileSync } from 'node:fs';
import { generateRealWorld } from '../src/sim/seed';
const pack = JSON.parse(readFileSync(process.argv[2], 'utf8')).clubs as any[];
const w = generateRealWorld(7);
const CC: Record<string, string> = { England: 'ENG', Spain: 'ESP', Italy: 'ITA', Germany: 'GER', France: 'FRA', Egypt: 'EGY', 'Saudi Arabia': 'KSA', Morocco: 'MAR', Tunisia: 'TUN', Algeria: 'ALG', 'United Arab Emirates': 'UAE', UAE: 'UAE', Qatar: 'QAT' };
const lg = new Map(w.leagues.map((l) => [l.id, l]));
const S: Record<string, string> = { compact: 'c', regional: 'r', monumental: 'm' }, R: Record<string, string> = { europe: 'e', africa: 'a', gulf: 'g' }, K: Record<string, string> = { community: 'c', standard: 's', premium: 'p' };
const out: Record<string, string> = {}; const miss: string[] = [];
for (const p of pack) {
  const cc = CC[p.country];
  const c = w.clubs.find((x) => x.name.en === p.name && lg.get(x.leagueId)?.country === cc) ?? w.clubs.find((x) => x.name.en === p.name);
  if (!c) { miss.push(`${p.id} ${p.name} ${p.country}`); continue; }
  if (out[c.id]) miss.push(`dup ${c.id}`);
  out[c.id] = [p.primary, p.secondary, p.kitPrimary, p.onPrimary, p.link].map((h: string) => h.slice(1)).join('') + `${p.pattern.toString(36)}${p.shape}${S[p.stadium.scale]}${R[p.stadium.region]}${K[p.lockerRoom]}`;
}
const unmapped = w.clubs.filter((c) => !out[c.id]).map((c) => c.id);
console.log('mapped', Object.keys(out).length, 'missing', miss.length, miss.slice(0, 10), 'game clubs without profile', unmapped.length, unmapped.slice(0, 10));
writeFileSync(process.argv[3], `// Club themes from the cinematic UI pack (design/club-themes.json, 328 clubs), keyed by the game's club id.
// Each entry: five 6-digit hex colours (primary = UI accent, secondary, kitPrimary = shirt, onPrimary = text on a
// primary button, link = accent text on dark), then crest motif (base 36), crest shape (0-4), stadium scale
// (c compact / r regional / m monumental), region (e Europe / a Africa / g Gulf), locker room (c / s / p).
// Club-inspired original palettes, not an official registry; scale and region are art archetypes, not capacities.
// Regenerate: node sim-tests/build.mjs themes-map <pack>/design/club-themes.json src/data/clubThemes.ts
export const CLUB_THEMES: Record<string, string> = ${JSON.stringify(out, null, 0).replace(/","/g, '",\n  "').replace('{"', '{\n  "').replace('"}', '",\n}')};
`);
