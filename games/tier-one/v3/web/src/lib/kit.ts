// The look kit (from games/tier-one/v3/look/kit.js): original crests and portraits drawn from club colours, initials and
// a shirt number. No real badge, photo or likeness appears anywhere. Returns SVG strings.
import type { WClub } from './engine';

const hash = (s: string) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
const SHAPES: Record<string, string> = {
  heater: 'M4 4h32v14c0 10-7 16-16 19C11 34 4 28 4 18z',
  shield: 'M3 5l17-3 17 3v13c0 11-8 17-17 20C11 35 3 29 3 18z',
  point: 'M4 3h32v19L20 38 4 22z',
  round: 'M20 2a18 18 0 1 1 0 36a18 18 0 1 1 0-36z',
};
const SHAPE_KEYS = Object.keys(SHAPES);
const PATTERNS = ['solid', 'stripes', 'half', 'band', 'sash', 'chief', 'ring', 'hoops'];
let uid = 0;

function lum(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return 0.5;
  const n = parseInt(m[1], 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const near = (a: string, b: string) => Math.abs(lum(a) - lum(b)) < 0.08;
const INK = '#15130F', PAPER = '#F4F1EA';

export function crestSVG(club: WClub | undefined, label = ''): string {
  if (!club) return '';
  const h = hash(club.id), id = 'cr' + ++uid;
  let p1 = club.c1 || '#777', p2 = club.c2 || PAPER;
  if (near(p1, p2)) p2 = lum(p1) > 0.4 ? INK : PAPER;
  const shape = SHAPES[SHAPE_KEYS[h % 4]], pat = PATTERNS[(h >>> 4) % PATTERNS.length];
  const tx = lum(p1) > 0.45 ? INK : PAPER;
  let fill = `<rect width="40" height="40" fill="${p1}"/>`;
  switch (pat) {
    case 'stripes': fill += [8, 20, 32].map((x) => `<rect x="${x - 3}" width="6" height="40" fill="${p2}"/>`).join(''); break;
    case 'half': fill += `<rect x="20" width="20" height="40" fill="${p2}"/>`; break;
    case 'band': fill += `<rect y="24" width="40" height="16" fill="${p2}"/>`; break;
    case 'sash': fill += `<path d="M-4 30L30 -4h8L4 30z" fill="${p2}" opacity=".95"/>`; break;
    case 'chief': fill += `<rect width="40" height="11" fill="${p2}"/>`; break;
    case 'hoops': fill += `<rect y="12" width="40" height="5" fill="${p2}"/><rect y="24" width="40" height="5" fill="${p2}"/>`; break;
    case 'ring': fill += `<path d="${shape}" fill="none" stroke="${p2}" stroke-width="5" transform="translate(20 20) scale(.78) translate(-20 -20)"/>`; break;
  }
  const plated = pat === 'stripes' || pat === 'hoops' || pat === 'half' || pat === 'sash';
  const plate = plated ? `<rect x="6" y="14.5" width="28" height="11" fill="${INK}"/>` : '';
  const letters = (club.k || club.s.slice(0, 3)).slice(0, 4).toUpperCase();
  const fs = letters.length > 3 ? 8.6 : 10.5;
  return `<svg viewBox="0 0 40 40" role="img" aria-label="${esc(label || club.n)}"><defs><clipPath id="${id}"><path d="${shape}"/></clipPath></defs>`
    + `<g clip-path="url(#${id})">${fill}${plate}</g><path d="${shape}" fill="none" stroke="rgba(0,0,0,.55)" stroke-width="1"/>`
    + `<text x="20" y="${pat === 'chief' ? 26.5 : 23.6}" text-anchor="middle" font-family="Archivo, sans-serif" font-stretch="62%" font-weight="800" font-size="${fs}" fill="${plated ? PAPER : tx}">${esc(letters)}</text></svg>`;
}

// Head-and-shoulders silhouette: a reporter's file photo, not a person. Three builds and three haircuts so a board of
// five doesn't repeat; halftone-lit in the club colour with the shirt number drawn behind.
const SIL = [
  'M150 70c-31 0-50 24-50 58 0 26 9 46 22 57l-2 24c-30 7-66 18-86 38-19 19-26 58-30 113h292c-4-55-11-94-30-113-20-20-56-31-86-38l-2-24c13-11 22-31 22-57 0-34-19-58-50-58z',
  'M150 74c-28 0-46 22-46 55 0 25 8 44 20 55l-2 26c-34 6-72 16-92 36-18 18-26 58-30 114h300c-4-56-12-96-30-114-20-20-58-30-92-36l-2-26c12-11 20-30 20-55 0-33-18-55-46-55z',
  'M150 66c-33 0-53 25-53 61 0 27 10 48 24 59l-2 23c-26 8-60 19-80 39-19 19-26 58-30 112h282c-4-54-11-93-30-112-20-20-54-31-80-39l-2-23c14-11 24-32 24-59 0-36-20-61-53-61z',
];
const HAIR = [
  'M101 118c-2-34 18-56 50-56 30 0 50 18 50 50-6-10-16-18-30-21-10 8-28 10-44 6-10-2-20 6-26 21z',
  'M103 112c0-30 20-50 47-50s47 20 47 50c-4-4-9-7-14-8-6-10-18-15-33-15s-27 5-33 15c-5 1-10 4-14 8z',
  'M99 124c-6-40 16-68 51-68 36 0 56 26 52 66-4-14-10-24-18-30-2 8-8 12-16 12-10-6-26-8-40-6-14 2-24 12-29 26z',
];
export function portraitSVG(club: WClub | undefined, no: number | string, variant: 'wide' | 'left' | '' = '', who = ''): string {
  const W = variant === 'wide' ? 600 : 300, id = 'pt' + ++uid, h = hash(who || String(no));
  const bg = (club && club.c1) || '#777';
  let alt = (club && club.c2) || PAPER;
  if (near(bg, alt)) alt = lum(bg) > 0.4 ? INK : PAPER;
  const lightBg = lum(bg) > 0.5;
  const numC = lightBg ? INK : alt;
  let dotC = lightBg ? alt : alt;
  if (lightBg && lum(dotC) > 0.5) dotC = INK;
  const sil = SIL[h % 3], hair = HAIR[(h >>> 3) % 3];
  const dx = variant === 'left' ? 34 : variant === 'wide' ? 60 : -34;
  return `<svg viewBox="0 0 ${W} 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>`
    + `<pattern id="${id}d" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.5" cy="3.5" r="2.1" fill="${dotC}"/></pattern>`
    + `<pattern id="${id}b" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="2.5" cy="2.5" r=".9" fill="rgba(0,0,0,.22)"/></pattern>`
    + `<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2=".5"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".25"/><stop offset=".8" stop-color="#fff" stop-opacity="0"/></linearGradient>`
    + `<mask id="${id}m"><rect width="300" height="360" fill="url(#${id}g)"/></mask><clipPath id="${id}c"><path d="${sil}"/></clipPath></defs>`
    + `<rect width="${W}" height="360" fill="${bg}"/><rect width="${W}" height="360" fill="url(#${id}b)"/>`
    + (no ? `<text x="${variant === 'left' ? 18 : W - 8}" y="${variant === 'wide' ? 320 : 250}" text-anchor="${variant === 'left' ? 'start' : 'end'}" font-family="Archivo, sans-serif" font-stretch="62%" font-weight="900" font-size="${variant === 'wide' ? 380 : 300}" letter-spacing="-8" fill="none" stroke="${numC}" stroke-width="3" opacity=".9">${esc(String(no))}</text>` : '')
    + `<g transform="translate(${dx} 0)"><path d="${sil}" fill="${INK}"/><g clip-path="url(#${id}c)"><rect width="300" height="360" fill="url(#${id}d)" mask="url(#${id}m)"/></g>`
    + `<path d="${hair}" fill="${INK}"/><path d="M122 209l28 34 28-34" fill="none" stroke="${bg}" stroke-width="7" stroke-linejoin="miter" opacity=".9"/></g></svg>`;
}

export function tallySVG(n: number): string {
  let out = '';
  const g = (k: number, strike: boolean) => {
    let s = `<svg viewBox="0 0 ${strike ? 26 : k * 5 + 2} 16" style="height:16px;width:auto">`;
    for (let i = 0; i < k; i++) s += `<path d="M${2 + i * 5} 1.5l${i % 2 ? 0.6 : -0.5} 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
    if (strike) s += '<path d="M.5 12L24 3.5" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>';
    return s + '</svg>';
  };
  for (let i = 0; i < Math.floor(n / 5); i++) out += g(4, true);
  if (n % 5) out += g(n % 5, false);
  return out;
}

export function esc(s: string) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)); }
export { hash };
