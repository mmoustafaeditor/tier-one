// three.js arrives at runtime as an ES module from the CDN (≈170 KB gzipped), never through the bundle: the game ships as
// one index.html (vite-plugin-singlefile inlines dynamic imports), and the desk is desktop-only, so the phone build and
// the Android app never pay for it. The URL can be overridden (tests serve a local copy): window.__T1_THREE_URL.
// The pinned version keeps the desk deterministic; bump it deliberately.
export const THREE_VERSION = '0.170.0';
export const THREE_URL = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/three.module.min.js`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ThreeNS = any;
let pending: Promise<ThreeNS> | null = null;
export function loadThree(): Promise<ThreeNS> {
  if (pending) return pending;
  const url = (typeof window !== 'undefined' && (window as { __T1_THREE_URL?: string }).__T1_THREE_URL) || THREE_URL;
  pending = import(/* @vite-ignore */ url).then((m) => m).catch((e) => { pending = null; throw e; });
  return pending;
}
