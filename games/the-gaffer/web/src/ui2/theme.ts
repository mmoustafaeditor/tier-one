// Club themes for the cinematic UI (reference pack v2, design/club-themes.json → src/data/clubThemes.ts).
// A career's club sets the UI accent (primary, onPrimary, link), the shirt colour (kit) and the scenes: a stadium of its
// scale and region, a locker room of its standard. Neutral canvas, text, semantic colours and the game logo never change.
// The crest, shirt, banner and flag are drawn here from the profile (a port of the pack's tools/build_teams.py), so the
// 1,968 club SVGs cost nothing to ship. Original geometric art: no official badges, sponsors or exact kits.
import type { Club } from '../model/types';
import { CLUB_THEMES } from '../data/clubThemes';
import { hash32 } from '../sim/rng';
import stCompactEurope from '../assets/art/stadium-compact-europe.webp';
import stCompactAfrica from '../assets/art/stadium-compact-africa.webp';
import stRegionalEurope from '../assets/art/stadium-regional-europe.webp';
import stRegionalAfrica from '../assets/art/stadium-regional-africa.webp';
import stRegionalGulf from '../assets/art/stadium-regional-gulf.webp';
import stMonumentalEurope from '../assets/art/stadium-monumental-europe.webp';
import stMonumentalAfrica from '../assets/art/stadium-monumental-africa.webp';
import stMonumentalGulf from '../assets/art/stadium-monumental-gulf.webp';
import lkCommunity from '../assets/art/locker-community.webp';
import lkStandard from '../assets/art/locker-standard.webp';
import lkPremium from '../assets/art/locker-premium.webp';

export type Scale = 'compact' | 'regional' | 'monumental';
export type Region = 'europe' | 'africa' | 'gulf';
export type Locker = 'community' | 'standard' | 'premium';
export interface ClubTheme {
  id: string; code: string;
  primary: string; secondary: string; kit: string; onPrimary: string; link: string;
  motif: number; shape: number; scale: Scale; region: Region; locker: Locker;
  fallback: boolean;
}
type ClubLike = Pick<Club, 'id' | 'colors' | 'name' | 'code' | 'shortName'>;

const SCALE: Record<string, Scale> = { c: 'compact', r: 'regional', m: 'monumental' };
const REGION: Record<string, Region> = { e: 'europe', a: 'africa', g: 'gulf' };
const LOCKER: Record<string, Locker> = { c: 'community', s: 'standard', p: 'premium' };

// ---------- contrast (WCAG) ----------
const chan = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return 0.2126 * chan((n >> 16) & 255) + 0.7152 * chan((n >> 8) & 255) + 0.0722 * chan(n & 255);
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
const mix = (hex: string, t: number, to = 255) => '#' + hex.replace('#', '').match(/../g)!.map((v) => Math.round(parseInt(v, 16) + (to - parseInt(v, 16)) * t).toString(16).padStart(2, '0')).join('');
// The lightest step of the colour that reads as text on the raised surface (pack: linkcolor).
function linkOf(primary: string): string {
  for (const t of [0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75]) { const c = mix(primary, t); if (contrast(c, '#192125') >= 4.5) return c; }
  return '#f1f3f4';
}

// ---------- the theme of a club ----------
const cache = new Map<string, ClubTheme>();
export function themeOf(club: ClubLike | undefined | null): ClubTheme {
  if (!club) return FALLBACK;
  const key = `${club.id}|${club.code ?? ''}|${club.colors.join(',')}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const code = (club.code || club.shortName || club.name.en).replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'FC';
  const raw = CLUB_THEMES[club.id];
  let t: ClubTheme;
  if (raw) {
    const hx = (i: number) => `#${raw.slice(i * 6, i * 6 + 6)}`;
    const tail = raw.slice(30);
    t = { id: club.id, code, primary: hx(0), secondary: hx(1), kit: hx(2), onPrimary: hx(3), link: hx(4),
      motif: parseInt(tail[0], 36), shape: Number(tail[1]), scale: SCALE[tail[2]], region: REGION[tail[3]], locker: LOCKER[tail[4]], fallback: false };
  } else {
    // A club the pack doesn't know (never expected; a renamed or future club): its own colours, stable art.
    const h = hash32(`theme:${club.id}`);
    const primary = club.colors[0] ?? '#be233a', secondary = club.colors[1] ?? '#f1f2f4';
    t = { id: club.id, code, primary, secondary, kit: primary, onPrimary: contrast(primary, '#101318') > contrast(primary, '#ffffff') ? '#101318' : '#ffffff',
      link: linkOf(primary), motif: h % 12, shape: (h >> 4) % 5, scale: 'regional', region: 'europe', locker: 'standard', fallback: true };
  }
  cache.set(key, t);
  return t;
}
const FALLBACK: ClubTheme = { id: 'none', code: 'FC', primary: '#be233a', secondary: '#f1f2f4', kit: '#be233a', onPrimary: '#ffffff', link: '#e0707f', motif: 0, shape: 0, scale: 'regional', region: 'europe', locker: 'standard', fallback: true };

// The CSS variables a career's club sets on <html> (App). Everything else in the palette is neutral.
export function themeVars(t: ClubTheme): Record<string, string> {
  return {
    '--club-primary': t.primary, '--club-on-primary': t.onPrimary, '--club-link': t.link, '--club-secondary': t.secondary, '--club-kit': t.kit,
    '--club-deep': mix(t.primary, 0.62, 0), '--club-wash': `${t.primary}2e`, '--club-line': `${t.primary}8c`,
  };
}

// ---------- artwork ----------
const SHAPES = ['M10 8H90L88 72Q80 98 50 111Q20 98 12 72Z', 'M50 6L91 24V77L50 110 9 77V24Z', 'M50 5A49 49 0 1 1 49.99 103A49 49 0 1 1 50 5Z', 'M12 8H88V76L73 99 50 112 27 99 12 76Z', 'M50 5L92 23 87 83 50 112 13 83 8 23Z'];
const MOTIFS = ['M31 65L50 42 69 65M33 51L50 31 67 51', 'M26 42L42 51 50 36 58 51 74 42M30 62L50 52 70 62', 'M28 49H72M37 39H63M34 62L50 71 66 62', 'M31 39L69 69M69 39L31 69M50 30V78', 'M27 54Q50 29 73 54Q50 80 27 54Z', 'M27 40L50 60 73 40M27 59L50 79 73 59', 'M30 66V43L50 30 70 43V66M41 65V49H59V65', 'M32 35H68V49L50 68 32 49ZM38 78H62', 'M25 50L38 39 50 50 62 39 75 50M25 67L38 56 50 67 62 56 75 67', 'M50 30L65 47 50 65 35 47ZM35 74H65', 'M30 37Q50 55 70 37M30 68Q50 50 70 68M50 30V78', 'M30 65L41 38 50 62 59 38 70 65'];
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const gid = (t: ClubTheme, k: string) => `${k}-${t.id.replace(/[^A-Za-z0-9_-]/g, '')}`;
const at = (svg: string, x: number, y: number, w: number, h: number) => svg.replace('<svg ', `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);

export function crestSvg(t: ClubTheme): string {
  const c = gid(t, 'cc'), m = gid(t, 'cm'), shape = SHAPES[t.shape] ?? SHAPES[0], motif = MOTIFS[t.motif] ?? MOTIFS[0];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><defs><linearGradient id="${c}" x2="1" y2="1"><stop stop-color="${t.kit}"/><stop offset="1" stop-color="${t.primary}"/></linearGradient><linearGradient id="${m}" x2=".7" y2="1"><stop stop-color="${t.secondary}"/><stop offset=".5" stop-color="#e0ddd2"/><stop offset="1" stop-color="${t.secondary}"/></linearGradient></defs><path d="${shape}" fill="#101719" stroke="url(#${m})" stroke-width="2.4"/><path d="${shape}" fill="url(#${c})" opacity=".88" transform="translate(6 7) scale(.88)"/><path d="${motif}" fill="none" stroke="${t.secondary}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><text x="50" y="95" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="13" letter-spacing="1.5" font-weight="700" fill="${t.secondary}">${esc(t.code)}</text></svg>`;
}

// The generic fabric shirt; `num` prints a squad number on it (targets, the pitch), otherwise plain (roster rows).
export function shirtSvg(t: ClubTheme, num?: number | string, gk = false): string {
  const f = gid(t, gk ? 'sfk' : 'sf'), s = gid(t, 'ss');
  const kit = gk ? '#d9b23a' : t.kit, trim = gk ? '#1b1f22' : t.secondary;
  const ink = contrast(kit, '#ffffff') >= contrast(kit, '#111111') ? '#ffffff' : '#111111';
  const n = num !== undefined && num !== '' ? `<text x="50" y="${String(num).length > 1 ? 84 : 85}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-weight="800" font-size="${String(num).length > 1 ? 34 : 38}" fill="${ink}" letter-spacing="-1">${esc(String(num))}</text>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 116"><defs><linearGradient id="${f}" x2="1" y2=".4"><stop stop-color="${kit}"/><stop offset=".48" stop-color="${kit}"/><stop offset="1" stop-color="#131719" stop-opacity=".92"/></linearGradient><linearGradient id="${s}"><stop stop-color="#fff" stop-opacity=".25"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><path d="M28 9L11 18 2 41 21 49 27 37V108H73V37L79 49 98 41 89 18 72 9 61 14H39Z" fill="url(#${f})" stroke="#d8ddda" stroke-opacity=".6"/><path d="M39 13Q50 28 61 13" fill="none" stroke="${trim}" stroke-width="4"/><path d="M28 37L31 101M71 37L68 101" stroke="#fff" stroke-opacity=".16"/><path d="M7 38L21 43M79 43L93 38" stroke="${trim}" stroke-width="3"/><path d="M28 9L11 18 2 41 21 49 27 37V108H73V37L79 49 98 41 89 18 72 9 61 14H39Z" fill="url(#${s})"/>${n}</svg>`;
}

export function bannerSvg(t: ClubTheme, name: string): string {
  const b = gid(t, 'bb'), l = gid(t, 'bl');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="${b}"><stop stop-color="#101719"/><stop offset="1" stop-color="${t.primary}"/></linearGradient><pattern id="${l}" width="46" height="46" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><path d="M0 0V46" stroke="${t.secondary}" stroke-opacity=".08" stroke-width="10"/></pattern></defs><rect width="1200" height="300" fill="url(#${b})"/><rect width="1200" height="300" fill="url(#${l})"/><path d="M0 289H1200" stroke="${t.secondary}" stroke-width="4"/>${at(crestSvg(t), 900, 28, 185, 230)}<text x="70" y="175" fill="#f3f2ed" font-family="Playfair Display,Georgia,serif" font-weight="700" font-size="56">${esc(name)}</text><text x="74" y="222" fill="${t.secondary}" font-family="Inter,Arial,sans-serif" font-size="19" letter-spacing="8">${esc(t.code)}</text></svg>`;
}

export function flagSvg(t: ClubTheme): string {
  const c = gid(t, 'fc');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 430" preserveAspectRatio="none"><defs><linearGradient id="${c}"><stop stop-color="#080f11"/><stop offset=".4" stop-color="${t.primary}"/><stop offset="1" stop-color="#101719"/></linearGradient></defs><path d="M12 0H228V394L120 430 12 394Z" fill="url(#${c})"/><path d="M24 12H216V384L120 416 24 384Z" fill="none" stroke="${t.secondary}" stroke-width="2"/>${at(crestSvg(t), 50, 102, 140, 168)}<text x="120" y="332" text-anchor="middle" fill="${t.secondary}" font-family="Inter,Arial,sans-serif" font-weight="700" font-size="30" letter-spacing="3">${esc(t.code)}</text></svg>`;
}

// ---------- scenes ----------
const STADIUM: Record<string, string> = {
  'compact-europe': stCompactEurope, 'compact-africa': stCompactAfrica, 'compact-gulf': stRegionalGulf,
  'regional-europe': stRegionalEurope, 'regional-africa': stRegionalAfrica, 'regional-gulf': stRegionalGulf,
  'monumental-europe': stMonumentalEurope, 'monumental-africa': stMonumentalAfrica, 'monumental-gulf': stMonumentalGulf,
};
const LOCKER_ART: Record<Locker, string> = { community: lkCommunity, standard: lkStandard, premium: lkPremium };
// The ground's backplate: an architecture archetype for the club's scale and region (not a replica, no capacity claim).
export const stadiumArt = (t: ClubTheme) => STADIUM[`${t.scale}-${t.region}`] ?? stRegionalEurope;
export const lockerArt = (t: ClubTheme) => LOCKER_ART[t.locker] ?? lkStandard;
export const svgUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
