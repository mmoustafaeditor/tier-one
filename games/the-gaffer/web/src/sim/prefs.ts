// Device settings (not part of the career save): language, match speed, which live tab opens first, coach photo.
import type { UiLang } from '../i18n';

// look: club look (0 Semba teal, free; 1-3 come with the Supporter pack or cost Semba Credits, meta/looks.ts). supporter: the pack was bought on this device.
// stop: when "sim to the next decision" stops (0 any decision, 1 important ones, 2 important ones and big matches).
// credits: Semba Credits earned on this device (concept on the web: local only, nothing is sold).
// pace (gf-ref): watched-match speed, 0 slow, 1 normal (the default), 2 fast. `speed` (the old 1×/2×/4×) is no longer read.
export interface Prefs { lang: UiLang; speed: 0 | 1 | 2; pace?: 0 | 1 | 2; openOn: 0 | 1; camera: 0 | 1 | 2; look: 0 | 1 | 2 | 3; supporter: boolean; paid?: string[]; stop?: 0 | 1 | 2; credits?: number; adsToday?: [string, number] }
const KEY = 'gaffer.prefs.v1';
// Looks bought with credits (meta/looks.ts keeps the list; read here without importing meta into sim).
const owned = (): number[] => { try { const v = JSON.parse(localStorage.getItem('gaffer.looks.v1') ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const PHOTO = 'gaffer.photo.v1';
const DEFAULT: Prefs = { lang: 'en', speed: 0, openOn: 0, camera: 0, look: 0, supporter: false };

export function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return {
      lang: ['en', 'ar', 'es', 'fr'].includes(p.lang) ? p.lang : DEFAULT.lang,
      speed: [0, 1, 2].includes(p.speed) ? p.speed : DEFAULT.speed,
      pace: [0, 1, 2].includes(p.pace) ? p.pace : 1,
      openOn: p.openOn === 1 ? 1 : 0,
      camera: [0, 1, 2].includes(p.camera) ? p.camera : DEFAULT.camera,
      supporter: p.supporter === true,
      look: [1, 2, 3].includes(p.look) && (p.supporter === true || owned().includes(p.look)) ? p.look : 0,
      paid: Array.isArray(p.paid) ? p.paid.filter((x: unknown) => typeof x === 'string').slice(-20) : [],
      stop: [0, 1, 2].includes(p.stop) ? p.stop : 1,
      credits: Number.isFinite(p.credits) ? Math.max(0, Math.floor(p.credits)) : 0,
      adsToday: Array.isArray(p.adsToday) && typeof p.adsToday[0] === 'string' ? [p.adsToday[0], Number(p.adsToday[1]) || 0] : undefined,
    };
  } catch {
    return DEFAULT;
  }
}

export function savePrefs(p: Prefs) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode: settings last this session only */ }
}

export function loadPhoto(): string {
  try { return localStorage.getItem(PHOTO) ?? ''; } catch { return ''; }
}

export function savePhoto(dataUrl: string): boolean {
  try {
    if (dataUrl) localStorage.setItem(PHOTO, dataUrl); else localStorage.removeItem(PHOTO);
    return true;
  } catch {
    return false;
  }
}
