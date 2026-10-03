// The Gaffer v2 kit: the icon set, original crests, kit-back portraits and the small charts every screen shares.
// Identity, never likeness: crests are drawn from the club's colours (a shape and a pattern chosen by the club's id,
// plus a monogram plate); a player is his shirt on a peg — surname, number, club colours — never a face.
import { memo, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Club, Player } from '../model/types';
import { hash32 } from '../sim/rng';
import { crestSvg as clubCrest, shirtSvg, themeOf } from './theme';

// ---------- icons (24px grid, 1.75 stroke) ----------
export const ICON: Record<string, string> = {
  today: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  squad: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5.4 6-5.4s5.4 2 6 5.4"/><path d="M15.5 4.9a3.2 3.2 0 0 1 0 6.2M17.5 14.9c1.9.7 3.1 2.4 3.5 5.1"/>',
  tactics: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M6.5 8.5l2 2m0-2-2 2"/><circle cx="16.5" cy="15.5" r="1.8"/><path d="M8 15c2.5 0 4-1 5.2-3.8M11.8 11.3l1.4-.1.3 1.4"/>',
  market: '<path d="M4 8h13M13.5 4.5 17 8l-3.5 3.5M20 16H7M10.5 12.5 7 16l3.5 3.5"/>',
  club: '<path d="M12 3 5 5.5v6.2c0 4.3 3 7.6 7 9.3 4-1.7 7-5 7-9.3V5.5z"/><path d="M9 11.5l2.2 2.2L15.5 9.5"/>',
  history: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5c0 3 1.2 4.3 3.2 4.6M16 6h3c0 3-1.2 4.3-3.2 4.6M12 13v3.5M8.5 20h7M9.5 20l.7-3.5h3.6l.7 3.5"/>',
  store: '<path d="M5 8h14l-1 12H6zM9 8V6.5a3 3 0 0 1 6 0V8"/>',
  ball: '<circle cx="12" cy="12" r="8.5"/><path d="m12 8 3 2.2-1.1 3.6h-3.8L9 10.2zM12 8V3.6M15 10.2l4-1.5M13.9 13.8l2.6 3.4M10.1 13.8l-2.6 3.4M9 10.2l-4-1.5"/>',
  chev: '<path d="m9.5 6 6 6-6 6"/>', back: '<path d="m14.5 6-6 6 6 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>',
  alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.2"/>',
  heart: '<path d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10z"/>',
  bolt: '<path d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12z"/>',
  doc: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z"/><path d="M13.5 3.5V8H18M9.5 12.5h5M9.5 16h5"/>',
  medic: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>',
  star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
  trend: '<path d="M3.5 17 9 11.5l3.5 3.5 8-8M15 7h5.5v5.5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  swap: '<path d="M7 4v16M7 4 4 7M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>', pause: '<path d="M8 5.5v13M16 5.5v13"/>',
  ff: '<path d="M4 6v12l7.5-6zM12.5 6v12L20 12z"/>',
  whistle: '<path d="M3.5 11a4.5 4.5 0 1 0 9 0V8.5h8V6H9.5A6 6 0 0 0 3.5 11z"/><circle cx="8" cy="11" r="1.3"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  board: '<rect x="3.5" y="5" width="17" height="11" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
  fans: '<path d="M4 20v-3.5a3 3 0 0 1 3-3h1M20 20v-3.5a3 3 0 0 0-3-3h-1M8.5 20v-2.5a3.5 3.5 0 0 1 7 0V20"/><circle cx="12" cy="9.5" r="2.8"/><circle cx="6.5" cy="9.8" r="2"/><circle cx="17.5" cy="9.8" r="2"/>',
  room: '<path d="M4 20V9l8-5 8 5v11"/><path d="M8.5 20v-6h7v6M4 20h16"/>',
  pound: '<path d="M16.5 6.5A3.8 3.8 0 0 0 9 7.8V19M6.5 12.5h7M6.5 19h11"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  arrowr: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  grow: '<path d="M12 20v-8M12 12c0-4 3-6.5 7-6.5 0 4-3 6.5-7 6.5zM12 14.5c0-3-2.3-5-5.5-5 0 3 2.3 5 5.5 5z"/>',
  handshake: '<path d="M3 11.5 7 7.5l3.5 1 2.5-1.5 4 1L21 11.5M7 7.5v6.5l4.5 4 1.8-1.4 1.6 1.2 1.6-1.6 1.5.4.9-2.1-4-4.3-2.4 1.4-2.3-2"/>',
  stadium: '<ellipse cx="12" cy="9" rx="8.5" ry="3.5"/><path d="M3.5 9v6c0 1.9 3.8 3.5 8.5 3.5s8.5-1.6 8.5-3.5V9"/>',
  grad: '<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4.3c1.4 1.4 3.3 2.2 5.5 2.2s4.1-.8 5.5-2.2v-4.3"/>',
  chat: '<path d="M4 5.5h16v10.5H10l-4.5 3.5V16H4z"/>',
  flag: '<path d="M5.5 21V4M5.5 4.5h12l-2.5 4 2.5 4h-12"/>',
  drag: '<circle cx="9" cy="6.5" r="1"/><circle cx="15" cy="6.5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="17.5" r="1"/><circle cx="15" cy="17.5" r="1"/>',
  ticket: '<path d="M3.5 7.5h17V10a2 2 0 0 0 0 4v2.5h-17V14a2 2 0 0 0 0-4z"/><path d="M14.5 7.5v9" stroke-dasharray="1.5 2"/>',
  shirt: '<path d="M8.5 3.5 4 6l1.5 4.5 2.5-1V20.5h8V9.5l2.5 1L20 6l-4.5-2.5a3.5 3.5 0 0 1-7 0z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2 1.2M17.8 15.3l2 1.2M4.2 16.5l2-1.2M17.8 8.7l2-1.2"/><circle cx="12" cy="12" r="6.6"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.7 5.4 3.7 8.5s-1.2 5.9-3.7 8.5c-2.5-2.6-3.7-5.4-3.7-8.5s1.2-5.9 3.7-8.5z"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',
  red: '<rect x="7" y="4" width="10" height="15" rx="1.5" fill="currentColor" stroke="none"/>',
  yellow: '<rect x="7" y="4" width="10" height="15" rx="1.5" fill="currentColor" stroke="none"/>',
  save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  inbox: '<path d="M3.5 13.5 6 5h12l2.5 8.5V19H3.5z"/><path d="M3.5 13.5h5l1.5 2.5h4l1.5-2.5h5"/>',
  news: '<rect x="3.5" y="5" width="13" height="14" rx="1.5"/><path d="M16.5 8h4v9.5A1.5 1.5 0 0 1 19 19H5M7 9h6M7 12.5h6M7 16h4"/>',
  undo: '<path d="M9 7 4.5 11.5 9 16"/><path d="M5 11.5h9.5a5 5 0 0 1 0 10H12"/>',
  sparkle: '<path d="M12 3.5 13.8 10.2 20.5 12l-6.7 1.8L12 20.5l-1.8-6.7L3.5 12l6.7-1.8z"/>',
};
const FLIP = new Set(['chev', 'back', 'arrowr', 'undo']);

export function I({ n, size = 'md', flip, className = '' }: { n: string; size?: 'sm' | 'md' | 'lg'; flip?: boolean; className?: string }) {
  return (
    <svg className={`i${size === 'sm' ? ' i--sm' : size === 'lg' ? ' i--lg' : ''}${flip ?? FLIP.has(n) ? ' i--flip' : ''} ${className}`} viewBox="0 0 24 24" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICON[n] ?? ICON.info }} />
  );
}

// ---------- colours ----------
export function lum(hex: string): number {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}
const near = (a: string, b: string) => Math.abs(lum(a) - lum(b)) < 0.12 && a.toLowerCase().slice(1, 3) === b.toLowerCase().slice(1, 3);

// ---------- identity ----------
type Shape = 'shield' | 'heater' | 'round';
type Pattern = 'plain' | 'half' | 'stripes' | 'band' | 'chev' | 'hoops';
export interface Identity { a: string; b: string; ini: string; shape: Shape; pat: Pattern; name: string }

// A club's identity, chosen once by its id: the pattern follows the kit's own two colours.
export function identityOf(club: Pick<Club, 'id' | 'colors' | 'name' | 'code' | 'shortName'>): Identity {
  const h = hash32(club.id);
  const [a0, b0] = club.colors;
  const b = near(a0, b0) ? (lum(a0) > 0.5 ? '#10201E' : '#FFFFFF') : b0;
  const shapes: Shape[] = ['shield', 'heater', 'round'];
  const pats: Pattern[] = ['plain', 'half', 'stripes', 'band', 'chev', 'plain', 'hoops', 'stripes'];
  return { a: a0, b, ini: initials(club), shape: shapes[h % 3], pat: pats[(h >>> 3) % pats.length], name: club.name.en };
}
function initials(club: Pick<Club, 'code' | 'name' | 'shortName'>): string {
  const skip = new Set(['FC', 'AFC', 'CF', 'SC', 'AC', 'AS', 'SS', 'US', 'CD', 'RC', 'UD', 'SD', 'CA', 'VFL', 'VFB', 'TSG', 'SV', 'OGC', 'RCD', 'DE', 'LA', 'EL', 'OF', 'THE', 'AL', '1.']);
  const words = club.name.en.replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter((w) => w && !skip.has(w.toUpperCase()));
  if (words.length >= 2) return (words[0][0] + words[1][0] + (words[2]?.[0] ?? '')).toUpperCase().slice(0, 3);
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (club.code ?? club.shortName).slice(0, 2).toUpperCase();
}

const SHAPES: Record<Shape, string> = {
  shield: 'M50 4 L92 14 V52 C92 80 72 98 50 108 C28 98 8 80 8 52 V14 Z',
  heater: 'M10 8 H90 V46 C90 78 70 96 50 108 C30 96 10 78 10 46 Z',
  round: 'M50 4 a52 52 0 1 0 .1 0Z',
};
let uid = 0;
export function crestSvg(id: Identity, label: string): string {
  const { a, b, ini, shape, pat } = id;
  const cid = `cr${++uid}`;
  const d = SHAPES[shape];
  const vb = shape === 'round' ? '-4 0 108 112' : '0 0 100 112';
  let fill = `<rect width="110" height="112" fill="${a}"/>`;
  if (pat === 'half') fill = `<rect x="0" y="0" width="50" height="112" fill="${a}"/><rect x="50" y="0" width="60" height="112" fill="${b}"/>`;
  else if (pat === 'stripes') fill += [0, 1, 2, 3, 4].map((i) => `<rect x="${6 + i * 20}" width="10" height="112" fill="${b}"/>`).join('');
  else if (pat === 'band') fill += `<path d="M-10 70 L110 20 V40 L-10 90Z" fill="${b}"/>`;
  else if (pat === 'chev') fill += `<path d="M0 44 L50 70 L100 44 V58 L50 84 L0 58Z" fill="${b}"/>`;
  else if (pat === 'hoops') fill += [0, 1, 2].map((i) => `<rect y="${14 + i * 32}" width="110" height="14" fill="${b}"/>`).join('');
  const plateCol = pat === 'plain' ? a : lum(a) < lum(b) ? a : b;
  const txt = lum(plateCol) > 0.6 ? '#0B1A18' : '#FFFFFF';
  const fs = ini.length >= 3 ? 22 : ini.length === 2 ? 28 : 36;
  const plate = pat === 'plain' ? '' : `<rect x="20" y="38" width="60" height="34" rx="6" fill="${plateCol}"/>`;
  const esc = label.replace(/[<>&"]/g, '');
  return `<svg viewBox="${vb}" role="img" aria-label="${esc}"><defs><clipPath id="${cid}"><path d="${d}"/></clipPath></defs>
    <g clip-path="url(#${cid})">${fill}${plate}<path d="M0 0H110V30C70 40 30 22 0 36Z" fill="#fff" opacity=".12"/></g>
    <path d="${d}" fill="none" stroke="${lum(a) > 0.8 ? '#0B1A18' : 'rgba(255,255,255,.55)'}" stroke-width="3"/>
    <text x="50" y="${55 + fs * 0.35}" text-anchor="middle" font-family="Archivo, Arial" font-stretch="118%" font-weight="900" font-size="${fs}" fill="${txt}" letter-spacing="-1">${ini}</text></svg>`;
}

export const Crest = memo(function Crest({ club, size = 40, className = '' }: { club: Pick<Club, 'id' | 'colors' | 'name' | 'code' | 'shortName'> | undefined; size?: number; className?: string }) {
  // Cinematic pack v2: the club's original geometric crest (ui2/theme.ts), the same for every club in every screen.
  const html = useMemo(() => (club ? clubCrest(themeOf(club)).replace('<svg ', `<svg role="img" aria-label="${club.name.en.replace(/[<>&"]/g, '')}" `) : ''), [club?.id, club?.colors[0], club?.colors[1], club?.name.en, club?.code]);
  return <span className={`crest ${className}`} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: html }} />;
});

// Kit-back portrait: the shirt on the dressing-room peg under the floodlight. Surname and number in Latin script
// (that's what's printed on the shirt), in every language.
export function portraitSvg(surname: string, num: number | string, id: Identity, bare = false): string {
  const { a, b, pat } = id;
  const h = hash32(surname);
  const u = `k${++uid}`;
  const sur = surname.toUpperCase().slice(0, 14);
  const n = String(num || '');
  const body = 'M38 21C44 25.5 52 27 60 27s16-1.5 22-6l22 9.5 12 32-16 8-6-14V146H26V56.5l-6 14-16-8 12-32z';
  const sleeveL = 'M16 30.5 33 23.4 26 56.5l-6 14-16-8z', sleeveR = 'M104 30.5 87 23.4 94 56.5l6 14 16-8z';
  let fill = `<path d="${body}" fill="${a}"/>`;
  if (pat === 'stripes') fill += `<g clip-path="url(#${u}c)">${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${14 + i * 18}" y="0" width="9" height="150" fill="${b}"/>`).join('')}</g>`;
  if (pat === 'hoops') fill += `<g clip-path="url(#${u}c)">${[0, 1, 2, 3].map((i) => `<rect x="0" y="${34 + i * 30}" width="120" height="12" fill="${b}"/>`).join('')}</g>`;
  if (pat === 'band') fill += `<g clip-path="url(#${u}c)"><rect x="0" y="122" width="120" height="8" fill="${b}"/></g>`;
  if (pat === 'chev') fill += `<g clip-path="url(#${u}c)"><path d="M26 118 60 132 94 118v7L60 139 26 125z" fill="${b}"/></g>`;
  if (pat === 'half') fill += `<path d="${sleeveL}" fill="${b}"/><path d="${sleeveR}" fill="${b}"/>`;
  const busy = pat === 'stripes' || pat === 'hoops';
  const bodyLight = busy ? (lum(a) + lum(b)) / 2 > 0.5 : lum(a) > 0.62;
  const ink = busy ? (lum(a) < 0.4 ? a : b) : bodyLight ? (lum(b) < 0.5 ? b : '#10201E') : lum(b) > 0.5 ? b : '#FFFFFF';
  const plate = busy ? `<rect x="30" y="40" width="60" height="84" rx="4" fill="${lum(a) < 0.4 ? b : a}"/>` : '';
  const fs = Math.min(13, (busy ? 54 : 60) / Math.max(1, sur.length * 0.8));
  const trim = pat === 'half' ? a : b;
  return `<svg viewBox="0 0 120 150" role="img" aria-label="${surname.replace(/[<>&"]/g, '')} ${n}" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="${u}g" x1="0" y1="0" x2=".2" y2="1"><stop offset="0" stop-color="#11433C"/><stop offset="1" stop-color="#031A17"/></linearGradient>
      <radialGradient id="${u}r" cx=".5" cy="-.05" r=".85"><stop offset="0" stop-color="#E9FFF8" stop-opacity=".34"/><stop offset=".55" stop-color="#E9FFF8" stop-opacity="0"/></radialGradient>
      <linearGradient id="${u}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>
      <linearGradient id="${u}v" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
      <clipPath id="${u}c"><path d="${body}"/></clipPath>
    </defs>
    ${bare ? '' : `<rect x="-120" y="-40" width="360" height="230" fill="url(#${u}g)"/><g fill="#CFFFF0">${Array.from({ length: 9 }, (_, i) => `<rect x="${-40 + ((h >> (i * 2)) % 10) * 20}" y="${((h >> (i + 5)) % 4) * 20}" width="20" height="20" opacity="${(0.025 + ((h >> i) % 4) * 0.018).toFixed(3)}"/>`).join('')}</g>`}
    <path d="M60 4.5c0-3 4.2-3 4.2 0 0 2.2-4.2 2.6-4.2 5.3V12M34 24l26-12 26 12" fill="none" stroke="#9FC9BE" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>
    <g>${fill}</g>${plate}
    <text x="60" y="54" text-anchor="middle" font-family="Archivo, Arial" font-stretch="112%" font-weight="800" font-size="${fs.toFixed(1)}" fill="${ink}" letter-spacing=".5">${sur.replace(/[<>&"]/g, '')}</text>
    ${n ? `<text x="60" y="${n.length > 1 ? 112 : 113}" text-anchor="middle" font-family="Archivo, Arial" font-stretch="${n.length > 1 ? 100 : 110}%" font-weight="800" font-size="${n.length > 1 ? 52 : 58}" fill="${ink}" letter-spacing="-2">${n}</text>` : ''}
    <path d="M44 22.3c5 3.6 27 3.6 32 0" fill="none" stroke="${trim}" stroke-width="3" stroke-linecap="round"/>
    <path d="M5 62.2 20 70M115 62.2 100 70" stroke="${trim}" stroke-width="3"/>
    <path d="${body}" fill="url(#${u}s)"/><path d="${body}" fill="url(#${u}v)"/>
    <path d="M40 80c4 18 3 40 1 64M82 70c-3 22-2 50 0 74" stroke="#000" stroke-opacity=".10" stroke-width="3" fill="none"/>
    ${bare ? '' : `<rect x="-120" y="-40" width="360" height="230" fill="url(#${u}r)"/>`}
  </svg>`;
}

// The shirt's surname: the data's short name when there is one, else the last word of the name.
export const surnameOf = (p: Pick<Player, 'name' | 'short'>) => {
  const s = p.short && p.short.length <= 16 ? p.short : p.name.en.split(' ').slice(-1)[0];
  return s.replace(/^\p{L}\.\s*/u, '');
};

export const Portrait = memo(function Portrait({ p, club, size, round, bare, className = '', style }: {
  p: Pick<Player, 'name' | 'short' | 'shirtNumber'>; club: Pick<Club, 'id' | 'colors' | 'name' | 'code' | 'shortName'> | undefined; size?: number; round?: boolean; bare?: boolean; className?: string; style?: CSSProperties;
}) {
  // Cinematic pack v2: the generic fabric shirt in the club's kit colour with the squad number (ui2/theme.ts).
  const html = useMemo(() => (club ? shirtSvg(themeOf(club), p.shirtNumber || undefined).replace('<svg ', `<svg role="img" aria-label="${surnameOf(p).replace(/[<>&"]/g, '')} ${p.shirtNumber || ''}" `) : ''), [p.name.en, p.short, p.shirtNumber, club?.id, club?.colors[0]]);
  return <span className={`portrait${round ? ' portrait--round' : ''} ${className}`} style={{ ...(size ? { width: size } : {}), ...(bare ? { background: 'none' } : {}), ...style }} dangerouslySetInnerHTML={{ __html: html }} />;
});

// ---------- data atoms ----------
export function Form({ list, letters }: { list: ('W' | 'D' | 'L')[]; letters: [string, string, string] }) {
  return (
    <span className="form" aria-label={list.join(' ')}>
      {list.map((r, i) => <b key={i} className={r.toLowerCase()}>{letters['WDL'.indexOf(r)]}</b>)}
    </span>
  );
}

export function Meter({ v, tone, mark, className = '' }: { v: number; tone?: 'warn' | 'bad'; mark?: number; className?: string }) {
  return (
    <div className={`meter${tone ? ` meter--${tone}` : ''} ${className}`} role="presentation">
      <i style={{ ['--v' as string]: `${Math.max(0, Math.min(100, v))}%` }} />
      {mark !== undefined && <span className="mark" style={{ ['--at' as string]: `${Math.max(0, Math.min(100, mark))}%` }} />}
    </div>
  );
}

export function Ring({ v, tone, size = 26 }: { v: number; tone?: 'warn'; size?: number }) {
  return <span className={`ring${tone ? ` ${tone}` : ''}`} style={{ ['--p' as string]: Math.round(v), width: size, height: size }} aria-label={`${Math.round(v)}%`} />;
}

export function Spark({ data, tone = 'up', w = 64, h = 26, rtl = false }: { data: number[]; tone?: 'up' | 'down'; w?: number; h?: number; rtl?: boolean }) {
  if (data.length < 2) return null;
  const mn = Math.min(...data) - 3, mx = Math.max(...data) + 3;
  const step = (w - 4) / (data.length - 1);
  const pts = data.map((v, i) => [rtl ? w - 2 - i * step : 2 + i * step, h - 2 - ((v - mn) / (mx - mn)) * (h - 4)]);
  const col = tone === 'down' ? 'var(--warn-mark)' : 'var(--dv-us)';
  const last = pts[pts.length - 1];
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={`M${pts.map((p) => p.map((x) => x.toFixed(1)).join(',')).join('L')}`} fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={col} />
    </svg>
  );
}

// Step / line chart with a hover crosshair. `them` series are always dashed (colour is never the only cue).
export interface Series { data: (number | null)[]; them?: boolean; label?: string }
export function LineChart({ series, x, h = 160, yMax, yMin = 0, step, markers = [], fmt = (v: number) => String(v), band, rtl = false, tipX }: {
  series: Series[]; x: string[]; h?: number; yMax?: number; yMin?: number; step?: boolean; markers?: { i: number; label: string }[];
  fmt?: (v: number) => string; band?: { lo: (number | null)[]; hi: (number | null)[] }; rtl?: boolean; tipX?: (i: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 600, P = { l: 30, r: 12, t: 12, b: 22 };
  const n = x.length;
  const all = series.flatMap((s) => s.data.filter((v): v is number => v != null)).concat(band ? band.hi.filter((v): v is number => v != null) : []);
  const y1 = yMax ?? Math.max(1, ...all) * 1.1;
  const X = (i: number) => { const t = P.l + (i / Math.max(1, n - 1)) * (W - P.l - P.r); return rtl ? W - t + (P.l - P.r) : t; };
  const Y = (v: number) => P.t + (1 - (v - yMin) / (y1 - yMin)) * (h - P.t - P.b);
  const ticks = [yMin, (yMin + y1) / 2, y1];
  const path = (d: (number | null)[]) => {
    let s = '', last: number | null = null, started = false;
    d.forEach((v, i) => { if (v == null) return; if (step && last != null) s += `L${X(i).toFixed(1)},${Y(last).toFixed(1)}`; s += `${started ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`; started = true; last = v; });
    return s;
  };
  const onMove = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    let px = ((e.clientX - r.left) / r.width) * W;
    if (rtl) px = W - px + (P.l - P.r);
    setHover(Math.max(0, Math.min(n - 1, Math.round(((px - P.l) / (W - P.l - P.r)) * (n - 1)))));
  };
  return (
    <div className="chart" ref={ref} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" style={{ height: h, width: '100%' }} aria-hidden="true">
        {ticks.map((t, i) => <line key={i} x1={P.l} x2={W - P.r} y1={Y(t)} y2={Y(t)} stroke="var(--dv-grid)" vectorEffect="non-scaling-stroke" />)}
        {band && <polygon points={[...band.hi.map((v, i) => (v == null ? null : `${X(i)},${Y(v)}`)).filter(Boolean), ...band.lo.map((v, i) => (v == null ? null : `${X(i)},${Y(v)}`)).filter(Boolean).reverse()].join(' ')} fill="var(--dv-us)" opacity=".16" />}
        {markers.map((m, i) => <line key={i} x1={X(m.i)} x2={X(m.i)} y1={P.t} y2={h - P.b} stroke="var(--dv-axis)" strokeDasharray="2 3" opacity=".7" vectorEffect="non-scaling-stroke" />)}
        {series.map((s, i) => <path key={i} d={path(s.data)} fill="none" stroke={s.them ? 'var(--dv-them)' : 'var(--dv-us)'} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.them ? '5 4' : undefined} vectorEffect="non-scaling-stroke" />)}
        {hover !== null && <line x1={X(hover)} x2={X(hover)} y1={P.t} y2={h - P.b} stroke="var(--ink-3)" opacity=".5" vectorEffect="non-scaling-stroke" />}
      </svg>
      <div className="chart-y" aria-hidden="true">{ticks.map((t, i) => <span key={i} style={{ top: Y(t) - 7 }}>{fmt(Math.round(t * 10) / 10)}</span>)}</div>
      <div className="chart-x" aria-hidden="true">{x.map((l, i) => (l ? <span key={i} style={{ insetInlineStart: `${((i / Math.max(1, n - 1)) * (W - P.l - P.r) + P.l) / W * 100}%` }}>{l}</span> : null))}</div>
      {(() => {
        // Labels of markers close together (two goals minutes apart) would print over each other: the later one keeps
        // its line but not its label, and the shown label counts them ("GOAL ×2").
        const at = (k: number) => ((k / Math.max(1, n - 1)) * (W - P.l - P.r) + P.l) / W * 100;
        const shown: { pct: number; label: string; n: number }[] = [];
        for (const m of [...markers].sort((a, b) => a.i - b.i)) {
          const last = shown[shown.length - 1];
          if (last && at(m.i) - last.pct < 12) last.n++; else shown.push({ pct: at(m.i), label: m.label, n: 1 });
        }
        return shown.map((m, i) => <span key={i} className="chart-mark" style={{ insetInlineStart: `${m.pct}%` }}>{m.label}{m.n > 1 ? ` ×${m.n}` : ''}</span>);
      })()}
      {hover !== null && (
        <div className="tip" style={{ opacity: 1, insetInlineStart: `min(calc(100% - 140px), max(0px, calc(${((hover / Math.max(1, n - 1)) * (W - P.l - P.r) + P.l) / W * 100}% - 60px)))` }}>
          <b>{tipX ? tipX(hover) : x[hover]}</b>
          {series.map((s, i) => (s.data[hover] == null ? null : <span key={i}><i style={{ background: s.them ? 'var(--dv-them)' : 'var(--dv-us)' }} />{s.label} {fmt(s.data[hover]!)}</span>))}
        </div>
      )}
    </div>
  );
}

// Momentum: bars above (us) / below (them) a centre line.
export function Momentum({ data, h = 70, rtl = false, label }: { data: number[]; h?: number; rtl?: boolean; label?: string }) {
  const n = Math.max(30, data.length);
  const W = 600, bw = W / n;
  return (
    <svg className="momentum" viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h }} role="img" aria-label={label}>
      <line x1="0" x2={W} y1={h / 2} y2={h / 2} stroke="var(--line-2)" vectorEffect="non-scaling-stroke" />
      {data.map((v, i) => {
        const x = rtl ? W - (i + 1) * bw : i * bw;
        const hg = Math.min(1, Math.abs(v)) * (h / 2 - 4);
        return <rect key={i} x={x + 1} y={v >= 0 ? h / 2 - hg : h / 2} width={Math.max(1, bw - 2)} height={Math.max(1, hg)} rx="2" fill={v >= 0 ? 'var(--dv-us)' : 'var(--dv-them)'} opacity={0.55 + Math.min(1, Math.abs(v)) * 0.45} />;
      })}
    </svg>
  );
}

// A tiny pitch with one zone lit (evidence on the Why card).
export function MiniPitch({ zone, them }: { zone: number | null; them?: boolean }) {
  const col = zone === null ? -1 : Math.floor(zone / 5), row = zone === null ? -1 : zone % 5;
  return (
    <span className="minip" aria-hidden="true">
      <svg viewBox="0 0 105 68">
        <g fill="none" stroke="var(--pitch-line)" strokeWidth="1"><rect x="1" y="1" width="103" height="66" /><line x1="52.5" y1="1" x2="52.5" y2="67" /><circle cx="52.5" cy="34" r="9" /><rect x="1" y="14" width="16" height="40" /><rect x="88" y="14" width="16" height="40" /></g>
        {zone !== null && <rect x={col * 17.5 + 1} y={row * 13.2 + 1} width="17" height="13" fill={them ? 'var(--dv-them)' : 'var(--dv-us)'} opacity=".85" />}
      </svg>
    </span>
  );
}

export function Staff({ ini, tone }: { ini: string; tone?: string }) {
  return <span className="staff" style={tone ? { background: tone } : undefined} aria-hidden="true">{ini}</span>;
}
export const initialsOf = (name: string) => name.replace(/[^\p{L}\s.]/gu, '').split(/[\s.]+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export function Kpi({ v, l, d, className = '' }: { v: ReactNode; l: ReactNode; d?: ReactNode; className?: string }) {
  return <div className={`kpi ${className}`}><span className="v">{v}</span><span className="l">{l}</span>{d && <span className="d">{d}</span>}</div>;
}

export const useUid = () => useId().replace(/:/g, '');
