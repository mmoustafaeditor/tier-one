// Renders public/icons/*.png from public/icons/icon.svg (the favicon, Morning Paper colours) with Playwright's Chromium.
// One-off: the PNGs are committed. `npm run icons` (needs playwright-core + a Chromium; PW_CHROMIUM overrides the path).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, '../public/icons');
const svg = fs.readFileSync(path.join(DIR, 'icon.svg'), 'utf8');
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const p = await b.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
// [file, size, inset]: maskable icons keep the glyph inside the safe zone (inset 20%); the badge is a flat mark.
for (const [file, size, inset] of [['icon-180.png', 180, 0], ['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['maskable-512.png', 512, 0.2], ['badge-96.png', 96, 0.1]]) {
  await p.setViewportSize({ width: size, height: size });
  const pad = Math.round(size * inset);
  await p.setContent(`<body style="margin:0;background:#F2EEE5"><div style="width:${size}px;height:${size}px;display:grid;place-items:center;background:#F2EEE5"><img src="data:image/svg+xml;utf8,${encodeURIComponent(svg)}" style="width:${size - 2 * pad}px;height:${size - 2 * pad}px"></div>`);
  await p.screenshot({ path: path.join(DIR, file), clip: { x: 0, y: 0, width: size, height: size } });
  console.log(file, size);
}
await b.close();
