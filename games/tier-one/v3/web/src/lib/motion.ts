// Reduce motion, one answer for the whole app: the in-app setting (save.reduced) OR the OS preference.
// Scenes, confetti, shakes, counters, tilt and page transitions all ask this; CSS mirrors it via html.reduce + the media query.
import { getSave } from './save';

export function prefersReducedMotion(): boolean {
  try { if (getSave().reduced) return true; } catch { /* save not ready */ }
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
