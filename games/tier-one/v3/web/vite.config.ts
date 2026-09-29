import { defineConfig, type Plugin } from 'vite';
import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import pkg from './package.json' with { type: 'json' };

// Tier One v3 ships as ONE index.html (fonts, art and rules engine inlined), like The Gaffer, so it runs offline and the
// Android WebView can bundle it as-is. The rules engine is shared with the server: ../../../../api/tier-one/v3/_lib.
//   npm run build      → dist/index.html (esbuild minify; for play-testing with `npm run serve`)
//   npm run build:min  → dist/index.html + version.json, then copied to /tier-one-v3/ at the repo root (sembagames.app/tier-one-v3)
const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = Number(process.env.T1_BUILD) || Math.floor(Date.now() / 60000);

const collapseHtml = (): Plugin => ({ name: 't1-collapse-html', enforce: 'post', transformIndexHtml: (html) => html.replace(/>\s+</g, '><').trim() });
const publish = (): Plugin => ({
  name: 't1-publish',
  apply: 'build',
  closeBundle() {
    const out = resolve(HERE, 'dist');
    const html = readFileSync(resolve(out, 'index.html'));
    const info = { game: 'tier-one-v3', version: pkg.version, build: BUILD, bytes: html.length, sha256: createHash('sha256').update(html).digest('hex') };
    writeFileSync(resolve(out, 'version.json'), `${JSON.stringify(info, null, 2)}\n`);
    const site = resolve(HERE, '../../../../tier-one-v3');
    mkdirSync(site, { recursive: true });
    copyFileSync(resolve(out, 'index.html'), resolve(site, 'index.html'));
    copyFileSync(resolve(out, 'version.json'), resolve(site, 'version.json'));
  },
});

export default defineConfig(({ mode }) => {
  const min = mode === 'min';
  return {
    base: './',
    plugins: [react(), viteSingleFile(), ...(min ? [collapseHtml(), publish()] : [])],
    define: { __APP_VERSION__: JSON.stringify(pkg.version), __BUILD__: String(BUILD) },
    server: { fs: { allow: ['..', '../../../../api/tier-one/v3/_lib'] } },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      assetsInlineLimit: 100_000_000,
      cssCodeSplit: false,
      ...(min ? { minify: 'terser' as const, terserOptions: { compress: { passes: 2, drop_console: true, drop_debugger: true }, mangle: { toplevel: true }, format: { comments: false } } } : {}),
    },
  };
});
