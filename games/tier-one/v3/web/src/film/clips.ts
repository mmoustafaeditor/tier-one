// Film clips served next to the page (never inlined in the bundle): `films/<stem>-p.mp4` (portrait 720×1280) and
// `films/<stem>-l.mp4` (landscape 1280×720), H.264, each with a `.jpg` poster of its LAST frame on the same stem.
// Stems: `moment-<id>` (moments/manifest.ts), `story-<id>` (Career films). The Android app loads the page from a file
// URL, so there the clips come from the live site (same rule as lib/api.ts BASE).
const FILM_BASE = typeof location !== 'undefined' && (location.protocol === 'file:' || location.hostname === 'appassets.androidplatform.net') ? 'https://www.sembagames.app/tier-one/' : '';
export type Aspect = 'p' | 'l';
export const filmUrl = (stem: string, aspect: Aspect, ext: 'mp4' | 'jpg' = 'mp4') => `${FILM_BASE}films/${stem}-${aspect}.${ext}`;
