// Install as an app (desktop or phone browser), like Tier One. Only on the website (sembagames.app/the-gaffer): never
// inside the Android app (a file:// page with its own updater) and never on a local dev server. The service worker
// (pwa/sw.js) fetches the page from the network first, so an installed app always runs the build the site serves.
export function setupPwa() {
  if (!/^https?:$/.test(location.protocol) || !location.pathname.startsWith('/the-gaffer') || !('serviceWorker' in navigator)) return;
  const link = (rel: string, href: string) => { const l = document.createElement('link'); l.rel = rel; l.href = href; document.head.appendChild(l); };
  link('manifest', '/the-gaffer/manifest.webmanifest');
  link('apple-touch-icon', '/the-gaffer/icons/icon-192.png');
  window.addEventListener('load', () => { navigator.serviceWorker.register('/the-gaffer/sw.js', { scope: '/the-gaffer/' }).catch(() => { /* not installable here: the game works the same */ }); });
}
