import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const ctx = await chromium.launchPersistentContext('/tmp/claude-0/-home-user-tier-one/809e18cd-8b4f-5180-b124-abac3d0ff038/scratchpad/profiles/ahly', { channel: 'chromium', viewport: { width: 390, height: 844 } });
const p = ctx.pages()[0] ?? await ctx.newPage();
await p.goto('http://localhost:8766/the-gaffer/'); await p.waitForFunction(() => window.__bootDone === true, null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(1200);
const click = async (t) => { const r = await p.evaluate((t) => { const b = [...document.querySelectorAll('button')].find((b) => b.innerText.trim().startsWith(t)); b.scrollIntoView({block:'center'}); const q = b.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; }, t); await p.mouse.click(r[0], r[1]); await p.waitForTimeout(2000); };
await click('Continue'); if (!(await p.evaluate(() => document.body.innerText.includes('Changes')))) await click('Continue');
for (const w of [320, 360, 375, 390, 412, 430, 480, 540, 600, 768]) {
  await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(400);
  const r = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Changes'); if (!b) return null; const q = b.getBoundingClientRect(); const i = [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Instant').getBoundingClientRect(); return { changes: [Math.round(q.left), Math.round(q.right)], instantRight: Math.round(i.right), docW: document.documentElement.scrollWidth }; });
  console.log(w, JSON.stringify(r), r && r.changes[1] <= w ? 'reachable' : 'OFF-SCREEN');
  if (w === 360) await p.screenshot({ path: '/home/user/tier-one/audit-the-gaffer/evidence/screens/C-C05-live-360.png' });
}
await ctx.close(); process.exit(0);
