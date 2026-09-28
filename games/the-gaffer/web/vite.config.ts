import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import pkg from './package.json' with { type: 'json' };

// The Gaffer ships as ONE index.html (like Tier One) so the Android WebView project can bundle it as-is.
// The shared Semba design system lives at the repo root in design/, three levels up.
//
// Two builds, the source (src/) is never touched by either:
//   npm run build      → dist/index.html        (esbuild minify; what the Android app bundles)
//   npm run build:min  → ../build/index.html    (release build: Terser with top-level mangling, no console/debugger,
//                                                no comments, collapsed HTML; committed, like the earlier coaching prototype's web/)

// Collapses the whitespace between tags in the page shell (the inlined script and styles are already minified).
const collapseHtml = (): Plugin => ({
  name: 'gaffer-collapse-html',
  enforce: 'post',
  transformIndexHtml: (html) => html.replace(/>\s+</g, '><').trim(),
});

export default defineConfig(({ mode }) => {
  const min = mode === 'min';
  return {
    plugins: [react(), viteSingleFile(), ...(min ? [collapseHtml()] : [])],
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
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
