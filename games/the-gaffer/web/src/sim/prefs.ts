// Device settings (not part of the career save): language, match speed, which live tab opens first, coach photo.
import type { UiLang } from '../i18n';

export interface Prefs { lang: UiLang; speed: 0 | 1 | 2; openOn: 0 | 1; camera: 0 | 1 | 2 }
const KEY = 'gaffer.prefs.v1';
const PHOTO = 'gaffer.photo.v1';
const DEFAULT: Prefs = { lang: 'en', speed: 0, openOn: 0, camera: 0 };

export function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return {
      lang: ['en', 'ar', 'es', 'fr'].includes(p.lang) ? p.lang : DEFAULT.lang,
      speed: [0, 1, 2].includes(p.speed) ? p.speed : DEFAULT.speed,
      openOn: p.openOn === 1 ? 1 : 0,
      camera: [0, 1, 2].includes(p.camera) ? p.camera : DEFAULT.camera,
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
