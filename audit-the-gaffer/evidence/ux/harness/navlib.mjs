import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
export async function boot(vp, lang = 'en', tag = 'x') {
  const ctx = await chromium.launchPersistentContext('/tmp/claude-0/-home-user-tier-one/809e18cd-8b4f-5180-b124-abac3d0ff038/scratchpad/profiles/nav-' + tag + Date.now(), { channel: 'chromium', viewport: vp });
  const p = ctx.pages()[0]; const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('requestfailed', r => errs.push('REQFAIL ' + r.url()));
  await p.goto('http://localhost:8765/index.html');
  if (lang !== 'en') { await p.evaluate((l) => localStorage.setItem('gaffer.prefs.v1', JSON.stringify({ lang: l })), lang); await p.reload(); }
  await p.waitForFunction(() => window.__bootDone === true, null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(1200);
  return { ctx, p, errs };
}
// Visible, clickable element whose text starts with t (nav first when t starts with "nav:").
export async function find(p, t) {
  return p.evaluate((t) => {
    let scope = 'button, a, [role=button], [role=tab]';
    if (t.startsWith('nav:')) { scope = 'nav.nav a'; t = t.slice(4); }
    if (t.startsWith('css:')) { const e = document.querySelector(t.slice(4)); if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2, top: q.top + scrollY, h: innerHeight, vis: q.width > 0 }; }
    const els = [...document.querySelectorAll(scope)].filter((b) => { const q = b.getBoundingClientRect(); return q.width > 0 && q.height > 0 && getComputedStyle(b).visibility !== 'hidden'; });
    const b = els.find((b) => b.innerText.trim().replace(/\s+/g, ' ').startsWith(t)) ?? els.find((b) => (b.getAttribute('aria-label') ?? '').startsWith(t));
    if (!b) return null;
    const q = b.getBoundingClientRect();
    return { x: q.x + q.width / 2, y: q.y + q.height / 2, top: q.top + scrollY, h: innerHeight, vis: true };
  }, t);
}
export async function tap(p, t, log) {
  const f = await find(p, t);
  if (!f) throw new Error('not found: ' + t);
  const scroll = t.startsWith('nav:') ? 0 : Math.max(0, Math.round(f.top - (f.h - 100)));
  if (log) { log.taps++; log.scroll += scroll; log.steps.push(t + (scroll ? ` (↓${scroll}px)` : '')); }
  await p.evaluate((t) => 0, t);
  const g = await p.evaluate(({ top, h }) => { window.scrollTo(0, Math.max(0, top - h / 2)); return 0; }, f);
  const f2 = await find(p, t);
  await p.mouse.click(f2.x, f2.y); await p.waitForTimeout(700);
}
export async function newCareer(p) {
  await tap(p, 'Start a 2026/27 career'); await tap(p, '🇪🇬'); await tap(p, 'A Al Ahly');
  const s0 = await p.evaluate(() => { const b = document.querySelector('button.btn--accent.big'); b.scrollIntoView({block:'center'}); const q = b.getBoundingClientRect(); return [q.x + q.width/2, q.y + q.height/2]; }); await p.mouse.click(s0[0], s0[1]); await p.waitForTimeout(2000);
  await tap(p, 'The usual split'); await tap(p, 'Our target is right');
}
export const home = async (p) => { await tap(p, 'nav:Today'); await p.evaluate(() => scrollTo(0, 0)); };
export const has = (p, re) => p.evaluate(([s, fl]) => new RegExp(s, fl).test(document.body.innerText), [re.source, re.flags]);
