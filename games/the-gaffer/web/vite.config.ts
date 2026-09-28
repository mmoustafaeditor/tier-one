import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import pkg from './package.json' with { type: 'json' };

// The Gaffer ships as ONE index.html (like Tier One) so the Android WebView project can bundle it as-is.
// The shared Semba design system lives at the repo root in design/, three levels up.
//
// Two builds, the source (src/) is never touched by either:
//   npm run build      → dist/index.html        (esbuild minify; what the Android app bundles)
//   npm run build:min  → ../build/index.html + version.json, copied to /the-gaffer/ (release build: Terser with top-level
//                        mangling, no console/debugger, no comments, collapsed HTML; committed; the Android app bundles it too)

// Collapses the whitespace between tags in the page shell (the inlined script and styles are already minified).
const collapseHtml = (): Plugin => ({
  name: 'gaffer-collapse-html',
  enforce: 'post',
  transformIndexHtml: (html) => html.replace(/>\s+</g, '><').trim(),
});

// Every build gets a number: minutes since 1970. Newer builds always have a bigger number, whether they were made
// on a laptop, in a Claude session or in CI. The game and the Android app compare it to /the-gaffer/version.json.
const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = Number(process.env.GAFFER_BUILD) || Math.floor(Date.now() / 60000);
// The oldest Android app ("shell") that can run this web build. Bump it only when the page needs something new
// from MainActivity; older apps are then asked to install the new APK instead of taking the web update.
const MIN_SHELL = 2;

// Release build only: write build/version.json and publish both files to /the-gaffer/, the folder sembagames.app serves.
const publish = (): Plugin => ({
  name: 'gaffer-publish',
  apply: 'build',
  closeBundle() {
    const out = resolve(HERE, '../build');
    const html = readFileSync(resolve(out, 'index.html'));
    const info = { game: 'the-gaffer', version: pkg.version, build: BUILD, minShell: MIN_SHELL, bytes: html.length, sha256: createHash('sha256').update(html).digest('hex') };
    writeFileSync(resolve(out, 'version.json'), `${JSON.stringify(info, null, 2)}\n`);
    const site = resolve(HERE, '../../../the-gaffer');
    mkdirSync(site, { recursive: true });
    copyFileSync(resolve(out, 'index.html'), resolve(site, 'index.html'));
    copyFileSync(resolve(out, 'version.json'), resolve(site, 'version.json'));
  },
});

export default defineConfig(({ mode }) => {
  const min = mode === 'min';
  return {
    plugins: [react(), viteSingleFile(), ...(min ? [collapseHtml(), publish()] : [])],
    define: { __APP_VERSION__: JSON.stringify(pkg.version), __BUILD__: String(BUILD), __MIN_SHELL__: String(MIN_SHELL) },
    server: { fs: { allow: ['..', '../../../design'] } },
    build: {
      outDir: min ? '../build' : 'dist',
      emptyOutDir: true,
      assetsInlineLimit: 100_000_000, // inline the offline fonts and icons
      cssCodeSplit: false,
      ...(min ? {
        minify: 'terser' as const,
        terserOptions: {
          compress: { passes: 2, drop_console: true, drop_debugger: true },
          mangle: { toplevel: true },
          format: { comments: false },
        },
      } : {}),
    },
  };
});
