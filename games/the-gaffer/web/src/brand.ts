// The Gaffer brand mark: the slanted banner with "THE GAFFER" and the app-icon "G".
// ONE switch for every surface: this web app (title wordmark, favicon, theme colour) and the Android app (launcher
// icons, adaptive icon, splash and window colours; android/app/build.gradle reads BRAND from this file).
//   'A' = green banner, white type (default)   ·   'B' = white banner, green type
// After changing it: `node ../scripts/brand-assets.mjs` (from web/) regenerates the Android icons and the store
// icon, then rebuild the web game and the APK. Replaced the violet banner/icon of v0.12 (#A07BFF / #A78BFA).
export type BrandOption = 'A' | 'B';
export const BRAND = 'A' as BrandOption;

// Letterforms: Barlow Condensed ExtraBold Italic (design/assets/fonts, the face the original wordmark and launcher G were
// set in), outlined so no surface depends on a font. Font size 100: cap height 70, baseline y = 0.
const THE = 'M51.5 -68.8 50.1 -57Q50 -56.5 49.7 -56.2Q49.3 -55.8 48.8 -55.8H36.7Q36.2 -55.8 36.2 -55.3L29.5 -1.2Q29.5 -0.7 29.1 -0.4Q28.7 0 28.2 0H14.5Q13.4 0 13.4 -1.2L20.1 -55.3Q20.1 -55.8 19.7 -55.8H8.1Q7.6 -55.8 7.3 -56.2Q7 -56.5 7.1 -57L8.5 -68.8Q8.6 -69.3 9 -69.7Q9.4 -70 9.9 -70H50.5Q51 -70 51.3 -69.7Q51.6 -69.3 51.5 -68.8ZM83.3 -70H97Q98.1 -70 98.1 -68.8L89.8 -1.2Q89.7 -0.7 89.3 -0.4Q88.9 0 88.4 0H74.7Q74.2 0 73.9 -0.4Q73.6 -0.7 73.7 -1.2L76.9 -27.4Q76.9 -27.9 76.5 -27.9H69.5Q69.1 -27.9 68.9 -27.4L65.7 -1.2Q65.6 -0.7 65.2 -0.4Q64.9 0 64.4 0H50.6Q50.1 0 49.8 -0.4Q49.5 -0.7 49.6 -1.2L57.9 -68.8Q58 -69.3 58.4 -69.7Q58.7 -70 59.2 -70H73Q73.5 -70 73.8 -69.7Q74.1 -69.3 74 -68.8L70.8 -42.7Q70.8 -42.2 71.2 -42.2H78.2Q78.6 -42.2 78.8 -42.7L82 -68.8Q82 -69.3 82.4 -69.7Q82.8 -70 83.3 -70ZM140.3 -55.8H120.8Q120.4 -55.8 120.2 -55.3L118.7 -42.7Q118.7 -42.2 119.1 -42.2H129.8Q130.3 -42.2 130.6 -41.9Q130.9 -41.5 130.8 -41L129.3 -29.1Q129.3 -28.6 128.9 -28.2Q128.5 -27.9 128 -27.9H117.4Q117 -27.9 116.8 -27.4L115.3 -14.7Q115.1 -14.2 115.7 -14.2H135.2Q135.7 -14.2 136 -13.9Q136.3 -13.5 136.2 -13L134.8 -1.2Q134.7 -0.7 134.3 -0.4Q133.9 0 133.4 0H98.5Q98 0 97.7 -0.4Q97.4 -0.7 97.5 -1.2L105.8 -68.8Q105.9 -69.3 106.2 -69.7Q106.6 -70 107.1 -70H142Q143.1 -70 143.1 -68.8L141.6 -57Q141.5 -56.5 141.2 -56.2Q140.8 -55.8 140.3 -55.8Z';
const GAFFER = 'M2.8 -15.8Q2.8 -16.7 3 -18.9L7 -51.2Q8 -60.2 14.2 -65.5Q20.4 -70.8 29.6 -70.8Q38 -70.8 42.9 -66.3Q47.8 -61.8 47.8 -54.1Q47.8 -53.2 47.6 -51L47.1 -47.3Q47 -46.8 46.7 -46.5Q46.3 -46.1 45.8 -46.1H32Q31.5 -46.1 31.2 -46.5Q30.9 -46.8 31 -47.3L31.5 -51.2L31.6 -52.2Q31.6 -54.2 30.6 -55.4Q29.6 -56.6 27.9 -56.6Q26 -56.6 24.7 -55.1Q23.4 -53.6 23.1 -51.2L19.1 -18.8L19 -17.7Q19 -15.7 20 -14.6Q21 -13.4 22.6 -13.4Q24.5 -13.4 25.9 -14.9Q27.2 -16.4 27.5 -18.8L28.3 -25.2Q28.5 -25.7 27.9 -25.7H25.4Q24.9 -25.7 24.6 -26.1Q24.3 -26.4 24.4 -26.9L25.7 -37.5Q25.7 -38 26.1 -38.4Q26.5 -38.7 27 -38.7H44.9Q45.4 -38.7 45.7 -38.4Q46 -38 45.9 -37.5L43.6 -18.9Q42.6 -9.9 36.4 -4.5Q30.1 0.8 20.9 0.8Q12.5 0.8 7.7 -3.6Q2.8 -8.1 2.8 -15.8ZM76.6 -1.1 76.4 -9.8Q76.5 -10 76.3 -10.2Q76.1 -10.3 75.9 -10.3H65.4Q64.8 -10.3 64.8 -9.8L62.6 -1.1Q62.3 0 61.2 0H47.4Q46.2 0 46.6 -1.3L68.9 -68.9Q69.2 -70 70.3 -70H86.1Q87.3 -70 87.3 -68.9L92.9 -1.3V-1Q92.9 0 91.8 0H77.7Q76.6 0 76.6 -1.1ZM68.9 -23.1H75.4Q75.9 -23.1 75.9 -23.6L75.2 -46.4Q75.2 -46.8 75 -46.8Q74.8 -46.8 74.6 -46.4L68.6 -23.6Q68.6 -23.1 68.9 -23.1ZM141.6 -55.8H122.1Q121.7 -55.8 121.5 -55.3L120 -42.7Q120 -42.2 120.4 -42.2H131.1Q131.6 -42.2 131.9 -41.9Q132.2 -41.5 132.1 -41L130.6 -29.1Q130.6 -28.6 130.2 -28.2Q129.8 -27.9 129.3 -27.9H118.7Q118.3 -27.9 118.1 -27.4L114.9 -1.2Q114.8 -0.7 114.5 -0.4Q114.1 0 113.6 0H99.8Q99.3 0 99 -0.4Q98.7 -0.7 98.8 -1.2L107.1 -68.8Q107.2 -69.3 107.6 -69.7Q107.9 -70 108.4 -70H143.3Q144.4 -70 144.4 -68.8L142.9 -57Q142.8 -56.5 142.5 -56.2Q142.1 -55.8 141.6 -55.8ZM184 -55.8H164.5Q164.1 -55.8 163.9 -55.3L162.4 -42.7Q162.4 -42.2 162.8 -42.2H173.5Q174 -42.2 174.3 -41.9Q174.6 -41.5 174.5 -41L173 -29.1Q173 -28.6 172.6 -28.2Q172.2 -27.9 171.7 -27.9H161.1Q160.7 -27.9 160.5 -27.4L157.3 -1.2Q157.2 -0.7 156.9 -0.4Q156.5 0 156 0H142.2Q141.7 0 141.4 -0.4Q141.1 -0.7 141.2 -1.2L149.5 -68.8Q149.6 -69.3 150 -69.7Q150.3 -70 150.8 -70H185.7Q186.8 -70 186.8 -68.8L185.3 -57Q185.2 -56.5 184.9 -56.2Q184.5 -55.8 184 -55.8ZM226.4 -55.8H206.9Q206.5 -55.8 206.3 -55.3L204.8 -42.7Q204.8 -42.2 205.2 -42.2H215.9Q216.4 -42.2 216.7 -41.9Q217 -41.5 216.9 -41L215.4 -29.1Q215.4 -28.6 215 -28.2Q214.6 -27.9 214.1 -27.9H203.5Q203.1 -27.9 202.9 -27.4L201.4 -14.7Q201.2 -14.2 201.8 -14.2H221.3Q221.8 -14.2 222.1 -13.9Q222.4 -13.5 222.3 -13L220.9 -1.2Q220.8 -0.7 220.4 -0.4Q220 0 219.5 0H184.6Q184.1 0 183.8 -0.4Q183.5 -0.7 183.6 -1.2L191.9 -68.8Q192 -69.3 192.4 -69.7Q192.7 -70 193.2 -70H228.1Q229.2 -70 229.2 -68.8L227.7 -57Q227.6 -56.5 227.3 -56.2Q226.9 -55.8 226.4 -55.8ZM252.5 -1 249.2 -27.5Q249.1 -27.9 248.7 -27.9H247.3Q246.9 -27.9 246.7 -27.4L243.5 -1.2Q243.4 -0.7 243.1 -0.4Q242.7 0 242.2 0H228.4Q227.9 0 227.6 -0.4Q227.3 -0.7 227.4 -1.2L235.7 -68.8Q235.8 -69.3 236.2 -69.7Q236.5 -70 237 -70H257.9Q265.6 -70 270.1 -65.1Q274.5 -60.2 274.5 -52Q274.5 -49.6 274.3 -48.3Q273.6 -42.7 271.1 -38.2Q268.5 -33.8 264.6 -31.1Q264.4 -31 264.3 -30.9Q264.2 -30.7 264.3 -30.5L269 -1.4V-1.2Q269 0 267.9 0H253.7Q252.6 0 252.5 -1ZM250.1 -55.3 248.4 -41.1Q248.4 -40.6 248.8 -40.6H251.5Q254.5 -40.6 256.4 -43Q258.3 -45.5 258.3 -49.8Q258.3 -52.7 257 -54.2Q255.7 -55.8 253.4 -55.8H250.7Q250.3 -55.8 250.1 -55.3Z';
export const G_PATH = 'M2.8 -15.8Q2.8 -16.7 3 -18.9L7 -51.2Q8 -60.2 14.2 -65.5Q20.4 -70.8 29.6 -70.8Q38 -70.8 42.9 -66.3Q47.8 -61.8 47.8 -54.1Q47.8 -53.2 47.6 -51L47.1 -47.3Q47 -46.8 46.7 -46.5Q46.3 -46.1 45.8 -46.1H32Q31.5 -46.1 31.2 -46.5Q30.9 -46.8 31 -47.3L31.5 -51.2L31.6 -52.2Q31.6 -54.2 30.6 -55.4Q29.6 -56.6 27.9 -56.6Q26 -56.6 24.7 -55.1Q23.4 -53.6 23.1 -51.2L19.1 -18.8L19 -17.7Q19 -15.7 20 -14.6Q21 -13.4 22.6 -13.4Q24.5 -13.4 25.9 -14.9Q27.2 -16.4 27.5 -18.8L28.3 -25.2Q28.5 -25.7 27.9 -25.7H25.4Q24.9 -25.7 24.6 -26.1Q24.3 -26.4 24.4 -26.9L25.7 -37.5Q25.7 -38 26.1 -38.4Q26.5 -38.7 27 -38.7H44.9Q45.4 -38.7 45.7 -38.4Q46 -38 45.9 -37.5L43.6 -18.9Q42.6 -9.9 36.4 -4.5Q30.1 0.8 20.9 0.8Q12.5 0.8 7.7 -3.6Q2.8 -8.1 2.8 -15.8Z';
const B_THE = [7.08, -70, 143.1, 0];
const B_GAFFER = [2.8, -70.8, 274.5, 0.8];
const B_G = [2.8, -70.8, 47.8, 0.8];

// Colours come from The Gaffer v2 tokens (styles/look/tokens.css): teal-850 ground, mint-700, mint-400, teal-500.
export const GROUND = '#062421';
export const GROUND_DEEP = '#021311';
export const GLOW = '#7DEBCB';
export interface Palette { banner: string; text: string; theOnDark: string; theOnLight: string; keylineOnLight: string | null }
export const PALETTES: Record<BrandOption, Palette> = {
  // white on #0F8A70 = 4.3:1; banner vs #062421 ground = 3.8:1, vs white = 4.3:1: the banner holds on dark and light
  A: { banner: '#0F8A70', text: '#FFFFFF', theOnDark: '#7DEBCB', theOnLight: '#0F6E60', keylineOnLight: null },
  // #0F6E60 on white = 6.1:1; a white banner vanishes on light grounds, so it gets a green keyline there
  B: { banner: '#FFFFFF', text: '#0F6E60', theOnDark: '#F4FBF8', theOnLight: '#0F6E60', keylineOnLight: '#0F6E60' },
};
export const palette = PALETTES[BRAND];

const SLANT = Math.tan((12 * Math.PI) / 180); // banner lean; the letters lean 7deg (the font's italic angle)
const f = (n: number) => String(Math.round(n * 10) / 10);
const banner = (x: number, top: number, bottom: number, w: number) => {
  const s = (bottom - top) * SLANT;
  return `${f(x + s)},${f(top)} ${f(x + s + w)},${f(top)} ${f(x + w)},${f(bottom)} ${f(x)},${f(bottom)}`;
};
const gGlyph = (scale: number, cx: number, baseline: number) =>
  `<path transform="translate(${f(cx - ((B_G[2] - B_G[0]) * scale) / 2 - B_G[0] * scale)} ${f(baseline)}) scale(${scale})" d="${G_PATH}"/>`;

/** The wordmark: "THE" then GAFFER on the banner. ground = what it sits on. */
export function wordmarkSvg(ground: 'dark' | 'light' = 'dark', opt: BrandOption = BRAND): string {
  const p = PALETTES[opt];
  const bx = B_THE[2] + 20, top = -88, bottom = 16, padx = 20;
  const bw = B_GAFFER[2] - B_GAFFER[0] + 2 * padx;
  const gx = bx + (bottom + 35) * SLANT + padx - B_GAFFER[0] - 35 * Math.tan((7 * Math.PI) / 180) + 4;
  const x1 = bx + bw + (bottom - top) * SLANT + 4;
  const key = ground === 'light' ? p.keylineOnLight : null;
  const stroke = key ? ` stroke="${key}" stroke-width="4" stroke-linejoin="round"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(B_THE[0] - 3)} ${top - 4} ${f(x1 - B_THE[0] + 3)} ${bottom - top + 8}" role="img" aria-label="The Gaffer">`
    + `<path fill="${ground === 'dark' ? p.theOnDark : p.theOnLight}" d="${THE}"/>`
    + `<polygon points="${banner(bx, top, bottom, bw)}" fill="${p.banner}"${stroke}/>`
    + `<path fill="${p.text}" transform="translate(${f(gx)} 0)" d="${GAFFER}"/></svg>`;
}

/** Full app icon (512 px, rounded tile): store icon and legacy launcher PNGs. */
export function iconSvg(opt: BrandOption = BRAND, rounded = true): string {
  const p = PALETTES[opt], rx = rounded ? 112 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>`
    + `<radialGradient id="glow" cx="50%" cy="0%" r="90%"><stop offset="0" stop-color="${GLOW}" stop-opacity=".32"/><stop offset="1" stop-color="${GLOW}" stop-opacity="0"/></radialGradient>`
    + `<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GROUND}"/><stop offset="1" stop-color="${GROUND_DEEP}"/></linearGradient></defs>`
    + `<rect width="512" height="512" rx="${rx}" fill="url(#ground)"/><rect width="512" height="512" rx="${rx}" fill="url(#glow)"/>`
    + `<polygon points="${banner(80, 96, 416, 282)}" fill="${p.banner}"/><g fill="${p.text}">${gGlyph(3.3, 262, 372)}</g></svg>`;
}

/** Favicon (64 units): no tile, the banner is the shape, so it reads at 16 px on light and dark tabs. */
export function faviconSvg(opt: BrandOption = BRAND): string {
  const p = PALETTES[opt];
  const stroke = p.keylineOnLight ? ` stroke="${p.keylineOnLight}" stroke-width="3" stroke-linejoin="round"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><polygon points="${banner(3, 4, 60, 44)}" fill="${p.banner}"${stroke}/>`
    + `<g fill="${p.text}">${gGlyph(0.6, 31.5, 53)}</g></svg>`;
}

/** Geometry of the adaptive-icon foreground (108 x 108 dp canvas, inside the 66 dp safe zone). */
export const ADAPTIVE = { banner: banner(37, 36, 72, 30), g: { scale: 0.376, cx: 53.6, baseline: 66.7 } };
export function adaptiveForegroundSvg(opt: BrandOption = BRAND): string {
  const p = PALETTES[opt], g = ADAPTIVE.g;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><polygon points="${ADAPTIVE.banner}" fill="${p.banner}"/>`
    + `<g fill="${p.text}">${gGlyph(g.scale, g.cx, g.baseline)}</g></svg>`;
}
export const gTransform = (scale: number, cx: number, baseline: number) =>
  ({ x: cx - ((B_G[2] - B_G[0]) * scale) / 2 - B_G[0] * scale, y: baseline, scale });

export const svgDataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;
