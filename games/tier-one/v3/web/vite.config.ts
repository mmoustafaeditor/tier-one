import { defineConfig, type Plugin } from 'vite';
import { mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { build as esbuild } from 'esbuild';
import pkg from './package.json' with { type: 'json' };

// Tier One v3 has two builds (GOTY.md §8.2):
//   npm run build      → dist/index.html, one file (esbuild minify) for play-testing with `npm run serve`
//   npm run build:min  → dist/index.html + version.json, one file with fonts, art and the rules engine inlined, copied
//                        to /tier-one/apk/ at the repo root: what the Android app bundles (games/tier-one/app/build.gradle),
//                        so it runs from a file URL with no other files.
//   npm run build:web  → dist-web/: a code-split bundle (index.html + assets/<name>-<hash>.* + sw.js + manifest +
//                        icons + version.json) copied to /tier-one/ at the repo root: what sembagames.app/tier-one
//                        serves. Routes, films and the scene host load lazily; React, the boot intro, the world data
//                        and the dictionaries sit in their own long-cached chunks; fonts are files picked by
//                        unicode-range. The service worker (src/sw.ts) precaches the shell and gets the file list here.
// The deploy layout (/tier-one, vercel.json headers): index.html, version.json, sw.js, manifest.webmanifest → no-cache;
// assets/** → immutable; films/** (the rendered clips, filled by the film lane) → long cache; apk/index.html → the APK.
// The rules engine is shared with the server: ../../../../api/tier-one/v3/_lib.
const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = resolve(HERE, '../../../../tier-one');
const BUILD = Number(process.env.T1_BUILD) || Math.floor(Date.now() / 60000);
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
const versionInfo = (extra: Record<string, unknown>) => `${JSON.stringify({ game: 'tier-one-v3', version: pkg.version, build: BUILD, ...extra }, null, 2)}\n`;

const collapseHtml = (): Plugin => ({ name: 't1-collapse-html', enforce: 'post', transformIndexHtml: (html) => html.replace(/>\s+</g, '><').trim() });

// ---------- single file (the APK)
const publishApk = (): Plugin => ({
  name: 't1-publish-apk',
  apply: 'build',
  closeBundle() {
    const out = resolve(HERE, 'dist');
    const html = readFileSync(resolve(out, 'index.html'));
    writeFileSync(resolve(out, 'version.json'), versionInfo({ kind: 'apk', bytes: html.length, sha256: sha(html) }));
    const site = resolve(SITE, 'apk');
    mkdirSync(site, { recursive: true });
    copyFileSync(resolve(out, 'index.html'), resolve(site, 'index.html'));
    copyFileSync(resolve(out, 'version.json'), resolve(site, 'version.json'));
  },
});

// ---------- code-split web build
const walk = (dir: string, base = dir): string[] => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p, base) : [relative(base, p).split('\\').join('/')]; });
/** PWA bits in index.html: manifest, icons, the two fonts the first paint uses (the rest arrive by unicode-range). */
const webHtml = (): Plugin => ({
  name: 't1-web-html',
  enforce: 'post',
  transformIndexHtml(html, ctx) {
    const fonts = Object.keys(ctx.bundle || {}).filter((f) => /(Newsreader-normal-200-800-latin|SchibstedGrotesk-normal-400-900-latin)-[\w-]{8}\.woff2$/.test(f));
    const head = [
      '<link rel="manifest" href="./manifest.webmanifest">',
      '<link rel="apple-touch-icon" href="./icons/icon-180.png">',
      '<meta name="apple-mobile-web-app-capable" content="yes">',
      '<meta name="mobile-web-app-capable" content="yes">',
      '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
      ...fonts.map((f) => `<link rel="preload" href="./${f}" as="font" type="font/woff2" crossorigin>`),
    ].join('');
    return html.replace('</head>', head + '</head>').replace(/>\s+</g, '><').trim();
  },
});
/** Bundles src/sw.ts with the precache list (everything the shell needs on a cold open), then copies dist-web to /tier-one. */
const publishWeb = (): Plugin => ({
  name: 't1-publish-web',
  apply: 'build',
  async closeBundle() {
    const out = resolve(HERE, 'dist-web');
    const files = walk(out).filter((f) => f !== 'sw.js' && f !== 'version.json');
    // The shell: the page, every script and stylesheet, the manifest and icons, and the Latin fonts. Arabic and
    // Latin-extended fonts, art and world data chunks are cached the first time they're used.
    const shell = files.filter((f) => /\.(js|css|webmanifest)$/.test(f) || f === 'index.html' || /^icons\//.test(f) || /-latin-[\w-]{8}\.woff2$/.test(f));
    const rev = (f: string) => sha(readFileSync(resolve(out, f))).slice(0, 8);
    const precache = shell.map((f) => ({ url: f, rev: /\/[\w.-]+-[\w-]{8}\.\w+$/.test(f) ? null : rev(f) }));
    await esbuild({
      entryPoints: [resolve(HERE, 'src/sw.ts')], outfile: resolve(out, 'sw.js'), bundle: true, minify: true, format: 'iife', target: 'es2020', legalComments: 'none',
      define: { __PRECACHE__: JSON.stringify(precache), __SW_BUILD__: JSON.stringify(`${pkg.version}.${BUILD}`), __APP_VERSION__: JSON.stringify(pkg.version), __BUILD__: String(BUILD) },
    });
    const bytes = files.reduce((n, f) => n + statSync(resolve(out, f)).size, 0);
    const html = readFileSync(resolve(out, 'index.html'));
    writeFileSync(resolve(out, 'version.json'), versionInfo({ kind: 'web', bytes, sha256: sha(html), files: files.length }));
    // /tier-one: replace index.html, assets/, icons/, sw.js, manifest and version.json; leave films/ and apk/ alone.
    mkdirSync(SITE, { recursive: true });
    for (const d of ['assets', 'icons']) rmSync(resolve(SITE, d), { recursive: true, force: true });
    for (const f of walk(out)) { mkdirSync(dirname(resolve(SITE, f)), { recursive: true }); copyFileSync(resolve(out, f), resolve(SITE, f)); }
    for (const d of ['films']) { mkdirSync(resolve(SITE, d), { recursive: true }); if (!existsSync(resolve(SITE, d, '.gitkeep'))) writeFileSync(resolve(SITE, d, '.gitkeep'), ''); }
  },
});

export default defineConfig(({ mode }) => {
  const min = mode === 'min';
  const web = mode === 'web';
  const terser = { minify: 'terser' as const, terserOptions: { compress: { passes: 2, drop_console: true, drop_debugger: true }, mangle: { toplevel: true }, format: { comments: false } } };
  return {
    base: './',
    publicDir: web ? 'public' : false,
    plugins: [react(), ...(web ? [webHtml(), publishWeb()] : [viteSingleFile(), ...(min ? [collapseHtml(), publishApk()] : [])])],
    define: { __APP_VERSION__: JSON.stringify(pkg.version), __BUILD__: String(BUILD), __VAPID_PUBLIC__: JSON.stringify(process.env.T1_VAPID_PUBLIC || '') },
    server: { fs: { allow: ['..', '../../../../api/tier-one/v3/_lib'] } },
    build: web
      ? {
          outDir: 'dist-web',
          emptyOutDir: true,
          assetsInlineLimit: 4096,
          cssCodeSplit: true,
          modulePreload: { polyfill: false },
          sourcemap: false,
          ...terser,
          rollupOptions: {
            output: {
              // Long-lived chunks that change on their own schedule; everything else is split by route (React.lazy in App.tsx).
              manualChunks(id) {
                if (id.includes('/node_modules/react') || id.includes('/node_modules/scheduler')) return 'vendor';
                if (id.includes('/the-gaffer/web/src/boot/')) return 'boot';
                if (id.endsWith('/data/world.json')) return 'world';
                if (id.includes('/src/i18n/')) return 'i18n';
                return undefined;
              },
            },
          },
        }
      : {
          outDir: 'dist',
          emptyOutDir: true,
          assetsInlineLimit: 100_000_000,
          cssCodeSplit: false,
          ...(min ? terser : {}),
        },
  };
});
