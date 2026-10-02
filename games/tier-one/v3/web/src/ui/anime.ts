// 3.9: original anime-style player portraits, drawn in SVG (no image files, works offline and in the APK). One stable
// face per player id: cel-shaded skin, ink outline, large eyes with highlights, one of eight layered hair styles, the
// club's shirt. A stylised character, not a likeness: the owner's real-player art drops in through art/manifest.json
// by the same id and wins over this. Transparent background so it sits on paper or the desk.
import { hash } from '../lib/kit';

const INK = '#2A1E19';
// skin by nationality group (a plausible palette, varied per id inside the group)
const SK = { light: ['#F6D7BF', '#F0C8A8', '#EBC09C'], olive: ['#E2B48C', '#D9A67C', '#CF9A70'], tan: ['#C68A5C', '#B97C50', '#A86E46'], deep: ['#8A5534', '#76462A', '#633A22'] };
const DEEP = new Set(['NGA', 'GHA', 'CIV', 'SEN', 'CMR', 'MLI', 'GIN', 'COD', 'BFA', 'GAB', 'ANG', 'GAM', 'TOG', 'BEN', 'SLE', 'ZAM', 'ZIM', 'KEN', 'JAM', 'HAI', 'CPV', 'GNB', 'EQG', 'CGO', 'MOZ', 'RSA', 'SUD', 'TAN', 'UGA']);
const TAN = new Set(['EGY', 'KSA', 'MAR', 'ALG', 'TUN', 'BRA', 'COL', 'URU', 'ECU', 'VEN', 'PAR', 'PER', 'MEX', 'IRN', 'IRQ', 'JOR', 'SYR', 'LBY', 'QAT', 'UAE', 'KUW', 'OMA', 'BHR', 'YEM', 'PLE', 'LBN', 'TUR', 'IND', 'PAK', 'BAN']);
const OLIVE = new Set(['ESP', 'ITA', 'POR', 'GRE', 'ARG', 'CHI', 'FRA', 'CRO', 'SRB', 'ALB', 'KOS', 'BIH', 'MNE', 'MKD', 'BUL', 'ROU', 'ISR', 'CYP', 'GEO', 'ARM', 'AZE', 'USA', 'CAN', 'JPN', 'KOR', 'CHN']);
const HAIR = ['#1A1412', '#2B1E17', '#3D2A1E', '#5A3A24', '#7A5030', '#A9773F', '#C9A15B', '#E0C07A'];
const IRIS = ['#3B2416', '#4E3220', '#2F4A6B', '#3F6B4E', '#6B4A2A', '#5A6470'];
const dk = (hex: string, k: number) => { const n = parseInt(hex.slice(1), 16); const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join(''); };

export type AnimeMood = 'neutral' | 'confident' | 'hesitant' | 'mischief' | 'stern' | 'shock' | 'joy';
export function animePlayerSVG(id: string, o: { c1?: string; c2?: string; nat?: string; mood?: AnimeMood; label?: string } = {}): string {
  const h = hash('anime:' + id), r = (k: number, n: number) => (h >>> k) % n;
  const nat = (o.nat || '').toUpperCase();
  const grp = DEEP.has(nat) ? SK.deep : TAN.has(nat) ? SK.tan : OLIVE.has(nat) ? SK.olive : nat ? SK.light : [SK.light, SK.olive, SK.tan, SK.deep][r(1, 4)];
  const skin = grp[r(3, grp.length)], skinS = dk(skin, .86), skinL = dk(skin, 1.06);
  const darkHair = grp === SK.deep || grp === SK.tan;
  const hair = darkHair ? HAIR[r(5, 3)] : HAIR[r(5, HAIR.length)], hairS = dk(hair, .7), hairL = dk(hair, 1.45);
  const iris = darkHair ? IRIS[r(8, 2)] : IRIS[r(8, IRIS.length)];
  const style = darkHair && r(11, 3) === 0 ? 6 + r(13, 2) : r(11, 6); // 6 curls, 7 buzz
  const beard = r(14, 4) === 0 ? 2 : r(16, 3) === 0 ? 1 : 0; // 1 stubble, 2 short beard
  const c1 = o.c1 || '#3A4A55', c2 = o.c2 || '#EFE7D7', c1s = dk(c1, .78);
  const mood = o.mood || 'neutral';
  const uid = 'an' + (h % 1000000);
  const SW = 'stroke="' + INK + '" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"';
  // shoulders + shirt (collar in the second colour), neck with the cel shadow
  const shirt = `<path d="M8 100c2-15 14-23 28-25l14 6 14-6c14 2 26 10 28 25z" fill="${c1}" ${SW}/>`
    + `<path d="M8 100c2-15 14-23 28-25l3 2c-10 4-18 11-20 23z" fill="${c1s}" opacity=".9"/>`
    + `<path d="M36 75l14 9 14-9" fill="none" stroke="${c2}" stroke-width="3.2"/><path d="M36 75l14 9 14-9" fill="none" ${SW} stroke-width=".9"/>`;
  const neck = `<path d="M42 62v12c0 4 4 8 8 8s8-4 8-8V62z" fill="${skin}" ${SW}/><path d="M42 66c3 4 13 4 16 0v4c-4 4-12 4-16 0z" fill="${skinS}"/>`;
  // face: anime jaw (soft V), ears, cheek shadow on one side
  const face = `<path d="M30 40c0-14 9-22 20-22s20 8 20 22c0 10-3 17-8 22-4 4-8 6-12 6s-8-2-12-6c-5-5-8-12-8-22z" fill="${skin}" ${SW}/>`
    + `<path d="M29 44c-3-1-5 1-4 5 1 4 3 6 6 6z" fill="${skin}" ${SW}/><path d="M71 44c3-1 5 1 4 5-1 4-3 6-6 6z" fill="${skin}" ${SW}/>`
    + `<path d="M62 30c6 8 7 20 2 30-3 4-7 7-12 8 6-6 10-14 10-24 0-6-1-10 0-14z" fill="${skinS}" opacity=".55"/>`
    + `<path d="M36 52q3 2 6 0M58 52q3 2 6 0" stroke="${dk(skin, .9)}" stroke-width="1.2" fill="none" opacity=".0"/>`;
  const stub = beard ? `<path d="M33 52c2 8 8 15 17 15s15-7 17-15c-2 9-8 13-17 13s-15-4-17-13z" fill="${hair}" opacity="${beard === 2 ? .85 : .28}"/>` + (beard === 2 ? `<path d="M44 59q6 3 12 0" fill="none" stroke="${hair}" stroke-width="2.2"/>` : '') : '';
  // eyes: big almond, iris with two highlights, a heavy upper lash line; mood bends them
  const eyeY = 45, lx = 41, rx = 59;
  const lid = mood === 'joy' ? 2 : mood === 'stern' || mood === 'hesitant' ? 1 : 0;
  const eye = (x: number, flip: number) => {
    if (lid === 2) return `<path d="M${x - 5} ${eyeY + 1}q5-5 10 0" fill="none" stroke="${INK}" stroke-width="2"/>`;
    const top = lid ? eyeY - 1.5 : eyeY - 3.5, sh = mood === 'shock';
    return `<path d="M${x - 5.5} ${eyeY}q5.5-${lid ? 4 : 7} 11 0q-5.5 5-11 0z" fill="#FFFFFF" stroke="none"/>`
      + `<ellipse cx="${x + flip * .4}" cy="${eyeY + .3}" rx="${sh ? 2.4 : 3.3}" ry="${sh ? 2.6 : lid ? 3 : 3.9}" fill="${iris}"/>`
      + `<ellipse cx="${x + flip * .4}" cy="${eyeY + .8}" rx="${sh ? 1.1 : 1.6}" ry="${sh ? 1.2 : 2}" fill="${INK}"/>`
      + `<circle cx="${x + 1.3}" cy="${eyeY - 1.2}" r="1.1" fill="#fff"/><circle cx="${x - 1.2}" cy="${eyeY + 1.8}" r=".55" fill="#fff" opacity=".8"/>`
      + `<path d="M${x - 6} ${eyeY + .6}q6-${lid ? 5.5 : 8.5} 12-.6" fill="none" stroke="${INK}" stroke-width="2.1"/>`
      + `<path d="M${x - 4} ${top}l-2-.6" stroke="${INK}" stroke-width="1"/>`;
  };
  const browY = mood === 'shock' ? 36 : 38.5;
  const brow = (x: number, s: number) => mood === 'stern' ? `M${x - 5} ${browY - s * 1.5 + 1}l10 ${s * 3}` : mood === 'hesitant' ? `M${x - 5} ${browY + s}q5-${2 + s} 10 ${-s}` : `M${x - 5} ${browY + .5}q5-2.4 10 0`;
  const brows = `<path d="${brow(lx, -1)} ${brow(rx, 1)}" fill="none" stroke="${hairS}" stroke-width="2" stroke-linecap="round"/>`;
  const nose = `<path d="M50.5 49l1.4 6.3-2.2.6" fill="none" stroke="${dk(skin, .7)}" stroke-width="1.1" stroke-linecap="round"/>`;
  const mouthD = { neutral: 'M46 60.5q4 1.3 8 0', confident: 'M45 59.5q5 3.6 10-.4', hesitant: 'M46 61q4-1.4 8 .2', mischief: 'M45 59.6q6 3 10-2', stern: 'M45.5 61h9', shock: 'M48 59.5a2 2.6 0 1 0 4 0a2 2.6 0 1 0-4 0', joy: 'M44.5 58.5q5.5 6.5 11 0z' }[mood];
  const mouth = `<path d="${mouthD}" fill="${mood === 'joy' || mood === 'shock' ? '#7A2E24' : 'none'}" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>`;
  const blush = mood === 'joy' || mood === 'confident' ? `<ellipse cx="37" cy="53" rx="3.2" ry="1.4" fill="#E9897A" opacity=".35"/><ellipse cx="63" cy="53" rx="3.2" ry="1.4" fill="#E9897A" opacity=".35"/>` : '';
  // hair: back mass, front fringe, shine streak; eight styles
  const H = [
    // 0 swept fringe
    { back: 'M27 42c-3-18 8-29 23-29s27 10 23 30c-2-8-5-12-8-14z', front: 'M28 38c2-14 12-21 24-21 9 0 17 5 20 14-6-4-12-5-17-4l-6 9-2-7-8 9-1-7c-4 2-7 5-10 7z' },
    // 1 spiky
    { back: 'M26 44c-4-20 8-31 24-31s28 11 24 31z', front: 'M26 40l3-9-6-2 8-4-3-8 9 4 3-9 6 7 6-8 3 9 9-4-3 8 8 3-6 3 3 10c-5-6-11-9-16-8l-4 7-3-7-6 6-1-6c-6 1-10 4-14 8z' },
    // 2 short crop side part
    { back: 'M28 40c-1-16 9-24 22-24s23 8 22 24c-3-6-6-9-9-10z', front: 'M28 37c2-12 11-19 22-19 10 0 19 6 22 17-9-5-20-7-30-5l-2 4-3-3c-4 1-7 3-9 6z' },
    // 3 long / tied back with loose strands
    { back: 'M25 46c-5-22 7-34 25-34s30 12 25 34l-2 14c-2-14-5-22-8-26z', front: 'M27 40c1-15 11-23 23-23s22 7 24 21c-6-5-13-7-19-6 2 3 2 7 1 11-3-5-7-8-13-9-6 2-11 5-16 6z' },
    // 4 middle part curtains
    { back: 'M26 46c-4-22 8-32 24-32s28 10 24 32c-2-10-5-16-9-19z', front: 'M27 44c0-16 10-26 23-26s23 10 23 26c-4-9-10-14-19-15l-4 6-4-6c-9 1-15 6-19 15z' },
    // 5 textured quiff
    { back: 'M28 40c-2-17 8-25 22-25s24 8 22 25c-3-6-7-9-10-10z', front: 'M29 36c1-9 6-15 13-17-1 4 0 6 2 7 2-6 7-10 14-10 9 0 15 7 15 16-5-4-11-5-17-3l-3 5-2-4c-7 0-13 2-22 6z' },
    // 6 tight curls
    { back: 'M27 42c-3-18 8-28 23-28s26 10 23 28z', front: 'CURLS' },
    // 7 buzz
    { back: 'M30 36c1-12 9-18 20-18s19 6 20 18c-6-4-13-5-20-5s-14 1-20 5z', front: '' },
  ][style];
  let front = '';
  if (H.front === 'CURLS') { for (let k = 0; k < 11; k++) { const a = Math.PI * (1.05 + k * .09), cx = 50 + Math.cos(a) * 20, cy = 36 + Math.sin(a) * 15; front += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(4.4 + (k % 3) * .6).toFixed(1)}" fill="${hair}" ${SW}/>`; } front += `<path d="M34 28q16-10 32 0" fill="none" stroke="${hairL}" stroke-width="1.4" opacity=".6"/>`; }
  else if (H.front) front = `<path d="${H.front}" fill="${hair}" ${SW}/><path d="M38 24q10-6 22-2" fill="none" stroke="${hairL}" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>`;
  const back = `<path d="${H.back}" fill="${hairS}" ${SW}/>`;
  const buzz = style === 7 ? `<path d="${H.back}" fill="${hair}" opacity=".85"/>` : '';
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${(o.label || '').replace(/[&<>"]/g, '')}"><g id="${uid}" transform="translate(50 100) scale(1.12) translate(-50 -100)">`
    + back + shirt + neck + face + stub + buzz + front + brows + eye(lx, -1) + eye(rx, 1) + nose + blush + mouth
    + `<path d="M33 30c-3 6-4 12-3 18" fill="none" stroke="${skinL}" stroke-width="1.4" opacity=".6"/>`
    + `</g></svg>`;
}
