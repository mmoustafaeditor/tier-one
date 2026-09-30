// Bakes the game's synth cues (web/src/lib/synth.ts, every sound is synthesised, no files) to WAVs in public/sfx,
// so rendered films sound like the game. Runs the synth in headless Chromium with an OfflineAudioContext.
//   PLAYWRIGHT=/path/to/playwright CHROME=/path/to/chrome node scripts/bake-sfx.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');

const KINDS = ['clock', 'tap', 'whoosh', 'stamp', 'flip', 'typewriter', 'open', 'shred', 'fanfare', 'ringonce', 'buzz', 'pop', 'kitman', 'clippers', 'airport', 'monitor', 'send', 'boom', 'sparkle', 'dayhit'];
const VOICES = [104, 118, 128, 142, 190, 205];
const src = readFileSync(new URL('../../web/src/lib/synth.ts', import.meta.url), 'utf8').replace('// @ts-nocheck', '').replace('export default SYN;', 'return SYN;');
mkdirSync(new URL('../public/sfx/', import.meta.url), { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage();
const jobs = [...KINDS.map((k) => ({ file: k, k })), ...VOICES.map((b) => ({ file: 'voice-' + b, k: 'voice', a: { base: b, dur: 1.6 } }))];
for (const j of jobs) {
  const b64 = await page.evaluate(async ({ src, k, a }) => {
    let ctx;
    window.AudioContext = function () { ctx = new OfflineAudioContext(2, 44100 * 4, 44100); return ctx; };
    const SYN = new Function(src)();
    SYN.play(k, a);
    const buf = await ctx.startRendering();
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    let end = L.length; while (end > 4410 && Math.abs(L[end - 1]) < 1e-4 && Math.abs(R[end - 1]) < 1e-4) end--;
    end = Math.min(L.length, end + 2205);
    const dv = new DataView(new ArrayBuffer(44 + end * 4));
    const s = (o, t) => [...t].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
    s(0, 'RIFF'); dv.setUint32(4, 36 + end * 4, true); s(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
    dv.setUint32(24, 44100, true); dv.setUint32(28, 44100 * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); s(36, 'data'); dv.setUint32(40, end * 4, true);
    for (let i = 0; i < end; i++) { dv.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); dv.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
    let bin = ''; const u = new Uint8Array(dv.buffer); for (let i = 0; i < u.length; i += 8192) bin += String.fromCharCode(...u.subarray(i, i + 8192));
    return btoa(bin);
  }, { src, k: j.k, a: j.a });
  writeFileSync(new URL(`../public/sfx/${j.file}.wav`, import.meta.url), Buffer.from(b64, 'base64'));
  console.log('baked', j.file);
}
await browser.close();
