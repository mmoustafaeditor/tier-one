// The scoop card as a 1080×1350 PNG, drawn on a canvas with the bundled fonts. Always morning newsprint (it's a
// physical object), whatever edition the app is in. No network.
import { portraitSVG } from './kit';
import type { WClub, Result } from './engine';
import { t as tr, type T } from './i18n';
import { getSave } from './save';
import { bylineOf, repTier } from './byline';

// hwg (3.3): when set, the card leads with a gold "HERE WE GO!" band (e.g. t('calls.hwg.card', { p })) above the kicker.
// style (3.4, lib/wallet.ts shareStyle(save)): the equipped share-card style (paper/ink/accent), the post frame and the
// player's paper name as the masthead. Absent = the classic card, exactly as before.
export interface CardStyle { paper?: string; ink?: string; accent?: string; frame?: { c: string; c2: string; pat: string } | null; masthead?: string }
export interface Card { hed: string; sub: string; kick: string; no: string; date: string; by: string; url: string; stats: [string, string][]; stamp: string; stampKind: string; club: WClub; no2: number; who: string; rtl: boolean; hwg?: string; style?: CardStyle; flair?: string }
const GO = '#17613F', FAKE = '#5B3E96', DEAD = '#8B857A', GOLD = '#F7B928', GOLD_D = '#7A5200';
const mix = (hex: string, to: string, k: number) => { const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16); const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k); return '#' + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join(''); };
// flair (3.4, one career): the byline's rep tier ("Stringer") printed after the byline; defaults to bylineFlair().
export const bylineFlair = (s = getSave(), t: (k: string) => string = tr) => t('cn.tier.' + repTier(bylineOf(s).rep));

// HERE WE GO (GOTY.md §2): a Done call at Confirmed. Feel only; the engine scores it like any other Confirmed Done.
export const hereWeGo = (c?: { o: number; s: number } | null) => !!c && c.o === 0 && c.s === 2;
// The saga a share card should lead with: the first right HERE WE GO call in a result, or -1. Results sets
// `hwg: t('calls.hwg.card', { p: cast[i].player.s })` on the Card when this is >= 0.
export function hereWeGoOf(r: Pick<Result, 'per'>): number {
  const p = r.per.find((x) => x.right && hereWeGo(x.call));
  return p ? p.i : -1;
}

export function shareText(t: T, v: { what: string; tier: string; pts: string; row: string; url: string }) {
  return t('share.text', v);
}

function img(svg: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
}
function fit(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, max: number, start: number, min = 40) {
  let px = start; ctx.font = font(px);
  while (px > min && ctx.measureText(text).width > max) { px -= 4; ctx.font = font(px); }
  return px;
}
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/), lines: string[] = []; let cur = '';
  for (const w of words) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > max && cur) { lines.push(cur); cur = w; } else cur = n; }
  if (cur) lines.push(cur);
  return lines;
}

export async function renderCard(c: Card): Promise<Blob | null> {
  try { await document.fonts.ready; } catch { /* */ }
  const W = 1080, H = 1350, P = 64;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'); if (!ctx) return null;
  const ar = c.rtl;
  const disp = ar ? '"Noto Naskh Arabic", serif' : '"Newsreader", Georgia, serif';
  const cond = ar ? '"IBM Plex Sans Arabic", sans-serif' : '"Archivo", "Arial Narrow", sans-serif';
  const mono = ar ? '"IBM Plex Sans Arabic", sans-serif' : '"IBM Plex Mono", monospace';
  const text = ar ? '"IBM Plex Sans Arabic", sans-serif' : '"Schibsted Grotesk", Arial, sans-serif';
  ctx.direction = ar ? 'rtl' : 'ltr';
  const S = ar ? W - P : P, E = ar ? P : W - P; // start / end x
  const alignS: CanvasTextAlign = ar ? 'right' : 'left', alignE: CanvasTextAlign = ar ? 'left' : 'right';
  const st = c.style || {};
  const PAPER = st.paper || '#F2EEE5', INK = st.ink || '#15130F', ACC = st.accent || '#D2381B';
  const INK2 = mix(INK, PAPER, 0.25), ACC_T = mix(ACC, INK, 0.15);
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  // grain
  for (let k = 0; k < 9000; k++) { ctx.fillStyle = `rgba(80,70,55,${Math.random() * 0.05})`; ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
  // the post frame, if one is equipped (drawn inside the edge so nothing is clipped)
  if (st.frame) { const f = st.frame, m = 22; ctx.lineWidth = f.pat === 'double' ? 6 : 8; ctx.strokeStyle = f.c; ctx.setLineDash(f.pat === 'dash' ? [26, 16] : []); ctx.strokeRect(m, m, W - 2 * m, H - 2 * m); ctx.setLineDash([]); ctx.lineWidth = 3; ctx.strokeStyle = f.c2; ctx.strokeRect(m + 10, m + 10, W - 2 * m - 20, H - 2 * m - 20); }
  ctx.fillStyle = INK; ctx.textBaseline = 'alphabetic';
  // masthead
  ctx.font = `700 104px "Newsreader", Georgia, serif`; ctx.textAlign = alignS; ctx.direction = 'ltr';
  ctx.textAlign = ar ? 'right' : 'left'; ctx.fillText(st.masthead || 'Tier One', S, P + 84, W * 0.6);
  ctx.direction = ar ? 'rtl' : 'ltr';
  ctx.font = `500 26px ${mono}`; ctx.fillStyle = INK2; ctx.textAlign = alignE;
  ctx.fillText(c.no.toUpperCase(), E, P + 44); ctx.fillText(c.date.toUpperCase(), E, P + 80);
  ctx.fillStyle = INK; ctx.fillRect(P, P + 104, W - 2 * P, 10); ctx.fillRect(P, P + 122, W - 2 * P, 3);
  // kicker (or the gold HERE WE GO band, which leads the card)
  if (c.hwg) {
    ctx.fillStyle = GOLD; ctx.fillRect(P, P + 150, W - 2 * P, 62);
    ctx.fillStyle = GOLD_D; ctx.font = `900 40px ${cond}`; ctx.textAlign = alignS;
    ctx.fillText(c.hwg.toUpperCase(), ar ? S - 18 : S + 18, P + 196, W - 2 * P - 36);
  } else { ctx.fillStyle = ACC_T; ctx.font = `800 31px ${text}`; ctx.textAlign = alignS; ctx.fillText(c.kick.toUpperCase(), S, P + 196); }
  // headline (wood type)
  ctx.fillStyle = INK;
  const hed = c.hed.toUpperCase();
  ctx.font = `900 200px ${cond}`;
  (ctx as unknown as { fontStretch: string }).fontStretch = 'extra-condensed';
  const lines = wrap(ctx, hed, W - 2 * P).slice(0, 3);
  const px = Math.min(...lines.map((l) => fit(ctx, l, (n) => `900 ${n}px ${cond}`, W - 2 * P, 210, 70)));
  ctx.font = `900 ${px}px ${cond}`;
  let y = P + 196 + px * 0.95;
  for (const l of lines) { ctx.fillText(l, S, y); y += px * 0.84; }
  y -= px * 0.84;
  // sub
  ctx.font = `italic 400 70px ${disp}`; y += 86; ctx.fillText(c.sub, S, y, W - 2 * P);
  // body: portrait + stats
  const top = y + 44, bottom = H - P - 96, colW = (W - 2 * P - 44) / 2;
  const pImg = await img(portraitSVG(c.club, c.no2 || '', '', c.who));
  const px0 = ar ? W - P - colW : P;
  if (pImg) { ctx.save(); ctx.beginPath(); ctx.rect(px0, top, colW, bottom - top); ctx.clip(); const sc = Math.max(colW / 300, (bottom - top) / 360); ctx.drawImage(pImg, px0 + (colW - 300 * sc) / 2, top + (bottom - top - 360 * sc) / 2, 300 * sc, 360 * sc); ctx.restore(); }
  const sx0 = ar ? P : P + colW + 44, sx = ar ? sx0 + colW : sx0;
  ctx.fillStyle = INK; ctx.fillRect(sx0, top, colW, 3);
  const rowH = (bottom - top) / c.stats.length;
  c.stats.forEach(([b, l], k) => {
    const ry = top + rowH * k;
    ctx.fillStyle = k === 0 && !b.startsWith('−') ? GO : INK; ctx.font = `900 118px ${cond}`; ctx.textAlign = alignS; ctx.fillText(b, sx, ry + rowH * 0.62);
    ctx.fillStyle = INK2; ctx.font = `500 25px ${mono}`; ctx.fillText(l.toUpperCase(), sx, ry + rowH * 0.62 + 40);
    if (k < c.stats.length - 1) { ctx.fillStyle = 'rgba(21,19,15,.18)'; ctx.fillRect(sx0, ry + rowH - 1, colW, 2); }
  });
  // foot: the byline and its flair (the rep tier), then the URL
  ctx.fillStyle = INK; ctx.fillRect(P, H - P - 64, W - 2 * P, 3);
  ctx.font = `italic 400 40px ${disp}`; ctx.textAlign = alignS; ctx.fillText(c.by, S, H - P - 14);
  const flair = c.flair ?? bylineFlair();
  if (flair) {
    const byW = ctx.measureText(c.by).width + 22;
    ctx.font = `700 24px ${cond}`; ctx.fillStyle = ACC_T;
    ctx.fillText(flair.toUpperCase(), ar ? S - byW : S + byW, H - P - 18, Math.max(60, W - 2 * P - byW - 300));
  }
  ctx.font = `500 26px ${mono}`; ctx.textAlign = alignE; ctx.direction = 'ltr'; ctx.fillText(c.url.toUpperCase(), E, H - P - 16);
  // stamp
  ctx.save(); ctx.direction = ar ? 'rtl' : 'ltr';
  const col = c.stampKind === 'exclusive' ? ACC : c.stampKind === 'dead' ? DEAD : c.stampKind === 'fake' ? FAKE : GO;
  ctx.translate(ar ? W - P - 60 : P + 60, top + (bottom - top) * 0.62); ctx.rotate(-12 * Math.PI / 180);
  ctx.font = `900 66px ${cond}`; const tw = ctx.measureText(c.stamp.toUpperCase()).width;
  ctx.strokeStyle = col; ctx.lineWidth = 11; ctx.strokeRect(ar ? -tw - 34 : -14, -64, tw + 48, 88);
  ctx.lineWidth = 3; ctx.strokeRect(ar ? -tw - 46 : -26, -76, tw + 72, 112);
  ctx.fillStyle = col; ctx.textAlign = ar ? 'right' : 'left'; ctx.fillText(c.stamp.toUpperCase(), ar ? -24 : 10, 0);
  ctx.restore();
  return new Promise((res) => cv.toBlob((b) => res(b), 'image/png'));
}

// ---------------------------------------------------------------- Share to X (banter lane, additive)
// "Post it": where the device can share files (most phones), the Web Share API gets the card image and the post text;
// everywhere else an X intent opens with a banter line, the game URL and two hashtags. Decided synchronously so the
// intent window opens inside the tap (pop-up blockers allow that, not after an await).
export const GAME_URL = 'https://sembagames.app/tier-one';
export const X_TAGS = 'TierOne,TransferTwitter';
export const xIntentUrl = (text: string, url = GAME_URL, tags = X_TAGS) =>
  'https://x.com/intent/tweet?' + new URLSearchParams({ text, url, hashtags: tags }).toString();
/** The text the Web Share API sends (it has no url/hashtags fields that every target honours). */
export const xShareText = (text: string, url = GAME_URL, tags = X_TAGS) => text + '\n' + url + '\n' + tags.split(',').map((x) => '#' + x.trim()).join(' ');
const canShareFiles = () => {
  try {
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    return typeof File !== 'undefined' && !!nav.share && !!nav.canShare && nav.canShare({ files: [new File([new Uint8Array(1)], 'x.png', { type: 'image/png' })] });
  } catch { return false; }
};
/** Post `text` (and the image, when the device can share one). Resolves 'shared', 'intent' or 'cancelled'. */
export async function postToX(text: string, image?: () => Promise<Blob | null>, tags = X_TAGS): Promise<'shared' | 'intent' | 'cancelled'> {
  if (!image || !canShareFiles()) {
    const w = window.open(xIntentUrl(text, GAME_URL, tags), '_blank', 'noopener,noreferrer');
    if (!w) location.href = xIntentUrl(text, GAME_URL, tags);
    return 'intent';
  }
  try {
    const blob = await image();
    if (!blob) { window.open(xIntentUrl(text, GAME_URL, tags), '_blank', 'noopener,noreferrer'); return 'intent'; }
    await navigator.share({ files: [new File([blob], 'tier-one.png', { type: 'image/png' })], text: xShareText(text, GAME_URL, tags) });
    return 'shared';
  } catch { return 'cancelled'; }
}

/** The catchphrase card: 1080×1080, your line in wood type over the move it called. Same paper as the scoop card. */
export interface CpCard { phrase: string; kicker: string; line: string; foot: string; by: string; color: string; rtl: boolean; style?: CardStyle }
export async function renderCpCard(c: CpCard): Promise<Blob | null> {
  try { await document.fonts.ready; } catch { /* */ }
  const W = 1080, H = 1080, P = 72;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'); if (!ctx) return null;
  const ar = c.rtl, st = c.style || {};
  const PAPER = st.paper || '#F2EEE5', INK = st.ink || '#15130F', ACC = c.color || st.accent || '#F7B928';
  const cond = ar ? '"IBM Plex Sans Arabic", sans-serif' : '"Archivo", "Arial Narrow", sans-serif';
  const disp = ar ? '"Noto Naskh Arabic", serif' : '"Newsreader", Georgia, serif';
  const mono = ar ? '"IBM Plex Sans Arabic", sans-serif' : '"IBM Plex Mono", monospace';
  const S = ar ? W - P : P, al: CanvasTextAlign = ar ? 'right' : 'left';
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  for (let k = 0; k < 7000; k++) { ctx.fillStyle = `rgba(80,70,55,${Math.random() * 0.05})`; ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
  ctx.direction = 'ltr'; ctx.textAlign = al; ctx.fillStyle = INK; ctx.font = `700 84px "Newsreader", Georgia, serif`;
  ctx.fillText(st.masthead || 'Tier One', S, P + 70, W * 0.6);
  ctx.fillRect(P, P + 96, W - 2 * P, 9); ctx.fillRect(P, P + 113, W - 2 * P, 3);
  ctx.direction = ar ? 'rtl' : 'ltr';
  ctx.fillStyle = ACC; ctx.fillRect(P, P + 150, W - 2 * P, 64);
  ctx.fillStyle = INK; ctx.font = `900 40px ${cond}`; ctx.fillText(c.kicker.toUpperCase(), ar ? S - 20 : S + 20, P + 197, W - 2 * P - 40);
  // the line itself, as big as it fits on up to three lines
  const text = c.phrase.toUpperCase();
  let px = 230, lines: string[] = [];
  for (; px >= 80; px -= 10) { ctx.font = `900 ${px}px ${cond}`; lines = wrap(ctx, text, W - 2 * P); if (lines.length <= 3 && lines.every((l) => ctx.measureText(l).width <= W - 2 * P)) break; }
  let y = P + 250 + px * 0.9;
  for (const l of lines.slice(0, 3)) { ctx.fillText(l, S, y); y += px * 0.86; }
  ctx.font = `italic 400 64px ${disp}`; ctx.fillText(c.line, S, Math.min(H - P - 150, y + 40), W - 2 * P);
  ctx.fillRect(P, H - P - 64, W - 2 * P, 3);
  ctx.font = `italic 400 38px ${disp}`; ctx.fillText(c.by, S, H - P - 14, W * 0.5);
  ctx.font = `500 24px ${mono}`; ctx.textAlign = ar ? 'left' : 'right'; ctx.fillText(c.foot.toUpperCase(), ar ? P : W - P, H - P - 16, W * 0.45);
  return new Promise((res) => cv.toBlob((b) => res(b), 'image/png'));
}
