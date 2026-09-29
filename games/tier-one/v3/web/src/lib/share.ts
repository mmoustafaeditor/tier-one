// The scoop card as a 1080×1350 PNG, drawn on a canvas with the bundled fonts. Always morning newsprint (it's a
// physical object), whatever edition the app is in. No network.
import { portraitSVG } from './kit';
import type { WClub } from './engine';
import type { T } from './i18n';

export interface Card { hed: string; sub: string; kick: string; no: string; date: string; by: string; url: string; stats: [string, string][]; stamp: string; stampKind: string; club: WClub; no2: number; who: string; rtl: boolean }
const PAPER = '#F2EEE5', INK = '#15130F', INK2 = '#47423A', ACC = '#D2381B', ACC_T = '#B42E14', GO = '#17613F', FAKE = '#5B3E96', DEAD = '#8B857A';

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
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  // grain
  for (let k = 0; k < 9000; k++) { ctx.fillStyle = `rgba(80,70,55,${Math.random() * 0.05})`; ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
  ctx.fillStyle = INK; ctx.textBaseline = 'alphabetic';
  // masthead
  ctx.font = `700 104px "Newsreader", Georgia, serif`; ctx.textAlign = alignS; ctx.direction = 'ltr';
  ctx.textAlign = ar ? 'right' : 'left'; ctx.fillText('Tier One', S, P + 84);
  ctx.direction = ar ? 'rtl' : 'ltr';
  ctx.font = `500 26px ${mono}`; ctx.fillStyle = INK2; ctx.textAlign = alignE;
  ctx.fillText(c.no.toUpperCase(), E, P + 44); ctx.fillText(c.date.toUpperCase(), E, P + 80);
  ctx.fillStyle = INK; ctx.fillRect(P, P + 104, W - 2 * P, 10); ctx.fillRect(P, P + 122, W - 2 * P, 3);
  // kicker
  ctx.fillStyle = ACC_T; ctx.font = `800 31px ${text}`; ctx.textAlign = alignS; ctx.fillText(c.kick.toUpperCase(), S, P + 196);
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
  // foot
  ctx.fillStyle = INK; ctx.fillRect(P, H - P - 64, W - 2 * P, 3);
  ctx.font = `italic 400 40px ${disp}`; ctx.textAlign = alignS; ctx.fillText(c.by, S, H - P - 14);
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
