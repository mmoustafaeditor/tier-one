// `npm run test:onecareer`: bundles test/onecareer.entry.ts with vite (SSR build, so import.meta.glob and the JSON
// world resolve like they do in the app) and runs it in node with the smallest browser shim the save layer needs.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(WEB, 'dist-test');
await build({
  configFile: false, root: WEB, logLevel: 'error',
  define: { __APP_VERSION__: '"test"', __BUILD__: '0' },
  build: { ssr: 'test/onecareer.entry.ts', outDir: OUT, emptyOutDir: true, minify: false, sourcemap: false, rollupOptions: { output: { entryFileNames: 'entry.mjs', format: 'es' } } },
  ssr: { noExternal: true, external: ['react', 'react-dom'] },
});

// The browser shim: an in-memory localStorage, a window that can schedule and listen, no document.
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
const { run } = await import(path.join(OUT, 'entry.mjs'));
process.exit(await run());
