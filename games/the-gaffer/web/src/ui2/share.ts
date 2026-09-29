// Share images drawn on a canvas: the coach card and the post-match report. Downloaded as PNG or shared with the
// system share sheet when the device supports sharing files. E2E #36: the old card's layout broke and its file had
// no proper name; here the layout is fixed-size and the file name says what it is.

export const CARD_W = 1080;

const BG = '#070B16', PANEL = '#111831', LINE = 'rgba(255,255,255,.12)', TEXT = '#F4F6FB', MUTED = '#9AA3BD', ACCENT = '#A78BFA';
const DISPLAY = '"Barlow Condensed", "Cairo", system-ui, sans-serif';
const BODY = '"Barlow", "Tajawal", system-ui, sans-serif';

export const slug = (s: string) => s.normalize('NFKD').replace(/[^\w؀-ۿ]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'coach';

export interface Painter {
  c: HTMLCanvasElement;
  x: CanvasRenderingContext2D;
  rtl: boolean;
  text: (s: string, px: number, py: number, o?: { size?: number; weight?: number; color?: string; align?: CanvasTextAlign; font?: 'display' | 'body'; max?: number }) => void;
  panel: (px: number, py: number, w: number, h: number, r?: number, fill?: string) => void;
  kit: (px: number, py: number, size: number, colors: [string, string]) => void;
}

export async function painter(h: number, rtl: boolean): Promise<Painter> {
  try { await document.fonts?.ready; } catch { /* draw with what we have */ }
  const c = document.createElement('canvas');
  c.width = CARD_W;
  c.height = h;
  const x = c.getContext('2d')!;
  x.direction = rtl ? 'rtl' : 'ltr';
  // Background: deep navy with a purple glow at the top.
  x.fillStyle = BG;
  x.fillRect(0, 0, CARD_W, h);
  const g = x.createRadialGradient(CARD_W / 2, -200, 50, CARD_W / 2, -200, 1100);
  g.addColorStop(0, 'rgba(167,139,250,.35)');
  g.addColorStop(1, 'rgba(167,139,250,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, CARD_W, h);
  const round = (px: number, py: number, w: number, hh: number, r: number) => {
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + hh, r);
    x.arcTo(px + w, py + hh, px, py + hh, r);
    x.arcTo(px, py + hh, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  };
  return {
    c, x, rtl,
    text: (s, px, py, o = {}) => {
      x.font = `${o.weight ?? 700} ${o.size ?? 40}px ${o.font === 'body' ? BODY : DISPLAY}`;
      x.fillStyle = o.color ?? TEXT;
      x.textAlign = o.align ?? 'start';
      x.textBaseline = 'alphabetic';
      x.fillText(s, px, py, o.max);
    },
    panel: (px, py, w, hh, r = 28, fill = PANEL) => {
      round(px, py, w, hh, r);
      x.fillStyle = fill;
      x.fill();
      x.strokeStyle = LINE;
      x.lineWidth = 2;
      x.stroke();
    },
    kit: (px, py, s, colors) => {
      // A simple shirt: body in the first colour, sleeves in the second.
      x.save();
      x.translate(px, py);
      x.scale(s / 100, s / 100);
      x.fillStyle = colors[1];
      x.beginPath(); x.moveTo(20, 10); x.lineTo(0, 30); x.lineTo(12, 48); x.lineTo(26, 38); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(80, 10); x.lineTo(100, 30); x.lineTo(88, 48); x.lineTo(74, 38); x.closePath(); x.fill();
      x.fillStyle = colors[0];
      x.beginPath(); x.moveTo(26, 8); x.lineTo(40, 4); x.quadraticCurveTo(50, 14, 60, 4); x.lineTo(74, 8); x.lineTo(76, 96); x.lineTo(24, 96); x.closePath(); x.fill();
      x.restore();
    },
  };
}

export const COLORS = { BG, PANEL, LINE, TEXT, MUTED, ACCENT };

// Draws a square photo (data URL) in a circle; falls back to initials.
export async function avatar(p: Painter, photo: string, initials: string, cx: number, cy: number, r: number) {
  const { x } = p;
  x.save();
  x.beginPath();
  x.arc(cx, cy, r, 0, Math.PI * 2);
  x.closePath();
  x.fillStyle = '#1B2447';
  x.fill();
  x.clip();
  let drawn = false;
  if (photo) {
    try {
      const img = await loadImage(photo);
      const s = Math.min(img.width, img.height);
      x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, cx - r, cy - r, r * 2, r * 2);
      drawn = true;
    } catch { /* broken photo: initials instead */ }
  }
  x.restore();
  if (!drawn) p.text(initials, cx, cy + r * 0.28, { size: r * 0.8, weight: 800, color: ACCENT, align: 'center' });
  x.beginPath();
  x.arc(cx, cy, r, 0, Math.PI * 2);
  x.strokeStyle = ACCENT;
  x.lineWidth = 6;
  x.stroke();
}

export const loadImage = (src: string) => new Promise<HTMLImageElement>((ok, fail) => {
  const img = new Image();
  img.onload = () => ok(img);
  img.onerror = fail;
  img.src = src;
});

// A picked photo, cut to a square and shrunk to 360 px so it fits in local storage.
export async function photoFromFile(f: File): Promise<string> {
  const url = URL.createObjectURL(f);
  try {
    const img = await loadImage(url);
    const s = Math.min(img.width, img.height);
    const c = document.createElement('canvas');
    c.width = c.height = 360;
    c.getContext('2d')!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 360, 360);
    return c.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const blobOf = (c: HTMLCanvasElement) => new Promise<Blob>((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error('no image'))), 'image/png'));

// In the Android app the page can't download blobs; the app's bridge shares the file instead (save to Files, send…).
interface AndroidBridge { shareFile(name: string, base64: string, mime: string, title: string): boolean; shareText(text: string): boolean }
const android = (): AndroidBridge | undefined => (window as unknown as { GafferAndroid?: AndroidBridge }).GafferAndroid;

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function download(blob: Blob, name: string) {
  const a0 = android();
  if (a0) { a0.shareFile(name, await toBase64(blob), blob.type || 'application/octet-stream', name); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// Share sheet with the image when the device can; otherwise the PNG is downloaded. Returns what happened.
export async function shareImage(c: HTMLCanvasElement, name: string, title: string, share: boolean): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await blobOf(c);
  const a0 = android();
  if (a0) return a0.shareFile(name, await toBase64(blob), 'image/png', title) ? 'shared' : 'cancelled';
  if (share) {
    const file = new File([blob], name, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title });
        return 'shared';
      } catch (e) {
        if ((e as Error).name === 'AbortError') return 'cancelled';
      }
    }
  }
  await download(blob, name);
  return 'downloaded';
}

// Text-only share (newspaper stories): share sheet, else the clipboard.
export async function shareText(text: string): Promise<'shared' | 'copied' | 'failed'> {
  const a0 = android();
  if (a0) return a0.shareText(text) ? 'shared' : 'failed';
  if (navigator.share) {
    try { await navigator.share({ text }); return 'shared'; } catch (e) { if ((e as Error).name === 'AbortError') return 'shared'; }
  }
  try { await navigator.clipboard.writeText(text); return 'copied'; } catch { return 'failed'; }
}
