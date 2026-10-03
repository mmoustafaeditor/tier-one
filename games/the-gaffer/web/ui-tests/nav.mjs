// Navigation regression test (UI/UX pass, audit-the-gaffer/THE_GAFFER_INFORMATION_ARCHITECTURE.md).
// Runs the built game (dist/, `npm run build` first) in Chromium and checks that every destination stays within its
// tap budget from Today, that nothing important is pushed below the fold on a phone, that the off-bar screens are one
// click away on desktop, and that the four languages label every navigation item (Arabic right-to-left).
//   npm run build && node ui-tests/nav.mjs            (Playwright: local or global install)
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let pw;
try { pw = await import('playwright'); } catch { pw = await import(`${execSync('npm root -g').toString().trim()}/playwright/index.mjs`); }
const html = readFileSync(fileURLToPath(new URL('../dist/index.html', import.meta.url)));
const server = createServer((_, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html); }).listen(0);
const URL0 = `http://localhost:${server.address().port}/`;

let fails = 0;
const ok = (c, msg) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };
const browser = await pw.chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

async function open(vp, lang = 'en') {
  const ctx = await browser.newContext({ viewport: vp });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL0);
  await p.waitForFunction(() => window.__bootDone === true, null, { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(800);
  // A fresh Al Ahly career, made in English, then the language switched (prefs are device settings).
  await tap(p, 'Start a 2026/27 career'); await tap(p, '🇪🇬'); await tap(p, 'AHL Al Ahly'); await p.waitForTimeout(1000);
  await tap(p, 'css:button.btn--accent.big'); await p.waitForTimeout(1500);
  await tap(p, 'The usual split'); await tap(p, 'Our target is right');
  if (lang !== 'en') {
    await p.evaluate((l) => { const m = JSON.parse(localStorage.getItem('gaffer.prefs.v1') ?? '{}'); m.lang = l; localStorage.setItem('gaffer.prefs.v1', JSON.stringify(m)); }, lang);
    await p.reload(); await p.waitForFunction(() => window.__bootDone === true, null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(800);
    await tap(p, 'css:button.btn--primary.btn--sm'); await p.waitForTimeout(800); // continue the slot on the title screen
  }
  return { ctx, p, errs };
}

async function find(p, t) {
  return p.evaluate((t) => {
    let els;
    if (t.startsWith('css:')) els = [...document.querySelectorAll(t.slice(4))];
    else {
      const nav = t.startsWith('nav:');
      const label = nav ? t.slice(4) : t;
      els = [...document.querySelectorAll(nav ? 'nav.nav a' : 'button, a, [role=button]')].filter((b) => b.innerText.trim().replace(/\s+/g, ' ').startsWith(label));
    }
    const b = els.find((b) => { const q = b.getBoundingClientRect(); return q.width > 0 && q.height > 0; });
    if (!b) return null;
    const q = b.getBoundingClientRect();
    return { x: q.x + q.width / 2, y: q.y + q.height / 2, top: q.top + scrollY, h: innerHeight, w: innerWidth, right: q.right, left: q.left, inView: q.top >= 0 && q.bottom <= innerHeight };
  }, t);
}
// Taps like a person: the page is scrolled to the target only if it's below the fold, and that distance is recorded.
async function tap(p, t, log) {
  const f = await find(p, t);
  if (!f) throw new Error(`not found: ${t}`);
  const below = t.startsWith('nav:') ? 0 : Math.max(0, Math.round(f.top - (f.h - 100)));
  if (log) { log.taps++; log.scroll += below; log.offscreen ||= f.right > f.w + 1 || f.left < -1; }
  if (below || !f.inView) await p.evaluate((y) => scrollTo(0, y), f.top - f.h / 2);
  const g = await find(p, t);
  await p.mouse.click(g.x, g.y); await p.waitForTimeout(500);
}
const toToday = async (p) => { await tap(p, 'nav:Today'); await p.evaluate(() => scrollTo(0, 0)); };
const sees = (p, re) => p.evaluate(([s, f]) => new RegExp(s, f).test(document.body.innerText), [re.source, re.flags]);

// [id, path from Today, what the screen shows, tap budget, scroll allowed in px (default 0)]
const PHONE = [
  ['tactics', ['nav:Match'], /Without the ball/, 1],
  ['table', ['nav:Match', 'Table'], /Pts/, 2],
  ['player', ['nav:Squad', 'css:.sq-r'], /Ability/, 2, 600], // the first row of the roster: some scrolling is normal
  // Transfers' four stages (Needs / Targets / Talks / Deals, cinematic UI); Search sits in Targets.
  ['search', ['nav:Transfers', 'Targets', 'Search'], /PLAYERS/i, 3],
  ['money', ['nav:Club'], /runway/i, 1],
  ['facilities', ['nav:Club', 'Facilities'], /Build/, 2],
  ['room', ['nav:Squad', 'Dressing room'], /Cohesion/, 2],
  ['training', ['nav:Squad', 'Training'], /Intensity/, 2],
  ['medical', ['nav:Squad', 'Medical'], /Treatment room/, 2],
  ['academy', ['nav:Squad', 'Academy'], /The academy/, 2],
  ['between areas', ['nav:Squad', 'Academy', 'Medical', 'Training', 'Dressing room', 'Players'], /Depth/, 6],
  ['inbox', ['css:.mast-inbox'], /Inbox/, 1],
  ['career', ['nav:Club', 'Career'], /Club legends/, 2],
  ['pass', ['nav:Club', 'Club Pass'], /Looks/, 2],
  ['settings', ['nav:Club', 'Settings and saves'], /Language/, 2],
  ['Continue (the match, or the desk first when calls are open)', ['Continue'], /Walk out|Take the staff calls/, 1],
];
const DESKTOP = [
  ['career', ['nav:Career'], /Club legends/, 1],
  ['pass', ['nav:Club Pass'], /Looks/, 1],
  ['settings', ['nav:Settings'], /Language/, 1],
  ['inbox', ['nav:Inbox & news'], /Inbox/, 1],
  ['room', ['nav:Squad', 'Dressing room'], /Cohesion/, 2],
];

async function run(name, vp, tasks) {
  const { ctx, p, errs } = await open(vp);
  // Android Back from any screen lands on Today.
  await tap(p, 'nav:Squad'); await tap(p, 'Medical');
  const back = await p.evaluate(() => window.__gafferBack?.());
  await p.waitForTimeout(300);
  ok(back === 'back' && (await p.evaluate(() => document.querySelector('nav.nav a[aria-current="page"]')?.getAttribute('href'))) === '#today', `${name}: Android Back from Medical returns to Today`);
  for (const [id, path, re, budget, room = 0] of tasks) {
    const log = { taps: 0, scroll: 0, offscreen: false };
    let shown = false, err = '';
    try { await toToday(p); for (const s of path) await tap(p, s, log); shown = await sees(p, re); } catch (e) { err = e.message; }
    ok(shown && log.taps <= budget && log.scroll <= room && !log.offscreen,
      `${name}: ${id} in ${log.taps} tap(s) (budget ${budget}), ${room ? `scroll ${log.scroll}px (≤ ${room})` : 'no scrolling'}${err ? ` — ${err}` : log.scroll > room ? ` — had to scroll ${log.scroll}px` : log.offscreen ? ' — a target was off-screen sideways' : ''}`);
  }
  ok(!errs.length, `${name}: no console errors${errs.length ? `: ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}

await run('phone', { width: 390, height: 844 }, PHONE);
await run('small phone', { width: 360, height: 740 }, PHONE.filter(([id]) => ['room', 'academy', 'between areas', 'inbox', 'settings'].includes(id)));
// Cinematic UI: the utilities are icons in the masthead from 1300 px (below that they sit in its menu, one tap more).
await run('desktop', { width: 1440, height: 900 }, DESKTOP);

// Every language labels every navigation item; the Squad areas fit on a phone; Arabic runs right to left.
for (const lang of ['ar', 'es', 'fr']) {
  const { ctx, p, errs } = await open({ width: 390, height: 844 }, lang);
  const nav = await p.evaluate(() => [...document.querySelectorAll('nav.nav a')].filter((a) => a.getBoundingClientRect().width > 0).map((a) => a.innerText.trim()));
  ok(nav.length === 5 && nav.every(Boolean), `${lang}: 5 labelled tabs (${nav.join(' · ')})`);
  ok(await p.evaluate(() => !!document.querySelector('.inbox-line')?.innerText.trim()), `${lang}: the inbox line on Today`);
  await tap(p, 'css:nav.nav a[href="#squad"]');
  // Cinematic UI: the squad landing has its own tabs and four doors to the other areas (dressing room, training, medical, academy).
  const areas = await p.evaluate(() => [...document.querySelectorAll('.pg-tabs button, .sq-tiles button')].filter((b) => b.getBoundingClientRect().width > 0).map((b) => { const q = b.getBoundingClientRect(); return { t: b.innerText.trim(), in: q.left >= 0 && q.right <= innerWidth }; }));
  ok(areas.length === 7 && areas.every((a) => a.t && a.in), `${lang}: Squad tabs and areas labelled and all on screen (${areas.map((a) => a.t.replace(/\s+/g, ' ')).join(' · ')})`);
  if (lang === 'ar') ok((await p.evaluate(() => document.documentElement.dir)) === 'rtl', 'ar: right to left');
  ok(!errs.length, `${lang}: no console errors`);
  await ctx.close();
}

await browser.close(); server.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
