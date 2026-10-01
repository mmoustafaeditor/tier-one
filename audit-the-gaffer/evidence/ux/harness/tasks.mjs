// Phase B/E task runner: every task starts on Today (top), follows the path by visible labels, and records taps,
// scroll distance needed to reach each target, the landing heading, and a screenshot.
import { boot, newCareer, tap, home, has } from './navlib.mjs';
import { writeFileSync } from 'node:fs';
const [, , which = 'before', dev = 'p', lang = 'en'] = process.argv;
const vp = dev === 'd' ? { width: 1280, height: 860 } : { width: 390, height: 844 };
const P = (await import(`./paths-${which}.mjs`)).default(dev);
const EV = `/home/user/tier-one/audit-the-gaffer/evidence/ux/${which}/`;
const { mkdirSync } = await import('node:fs'); mkdirSync(EV, { recursive: true });
const { ctx, p, errs } = await boot(vp, lang, which + dev);
await newCareer(p);
const out = [];
for (const [id, label, path, check] of P) {
  const log = { id, label, taps: 0, scroll: 0, steps: [], ok: false };
  try {
    await home(p);
    for (const s of path) await tap(p, s, log);
    log.ok = check ? await has(p, check) : true;
    log.landed = await p.evaluate(() => (document.querySelector('main h1, main h2')?.innerText ?? '').replace(/\s+/g, ' ').slice(0, 60));
    await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: `${EV}${dev}-${id}.png` });
  } catch (e) { log.err = e.message; }
  out.push(log);
  console.log(`${log.ok ? 'ok ' : 'XX '} ${id.padEnd(10)} taps ${log.taps}  scroll ${String(log.scroll).padStart(5)}px  ${log.steps.join(' › ')} ${log.err ?? ''}`);
}
writeFileSync(`${EV}${dev}-${lang}.json`, JSON.stringify({ errs, out }, null, 1));
console.log('errors', JSON.stringify(errs)); await ctx.close();
