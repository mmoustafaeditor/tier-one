import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const EV = '/home/user/tier-one/audit-the-gaffer/evidence';
const [profile, url, budgetS = '105', prefix = 'L-'] = process.argv.slice(2);
const ctx = await chromium.launchPersistentContext('/tmp/claude-0/-home-user-tier-one/809e18cd-8b4f-5180-b124-abac3d0ff038/scratchpad/profiles/' + profile, { channel: 'chromium', viewport: { width: 390, height: 844 } });
const p = ctx.pages()[0] ?? await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.goto(url); await p.waitForFunction(() => window.__bootDone === true, null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(1200);
const t0 = Date.now();
const PRI = ['Back to Today', 'Take the staff calls and go', 'Sim to the next decision', 'Finish the season', 'Start the new season', 'Next season', 'On to', 'Continue'];
let last = '', n = 0, shots = 0;
while (Date.now() - t0 < +budgetS * 1000) {
  const info = await p.evaluate((PRI) => {
    const bs = [...document.querySelectorAll('button')].filter((b) => !b.disabled && b.offsetParent !== null);
    const texts = bs.map((b) => b.innerText.trim().replace(/\s+/g, ' '));
    for (const want of PRI) { const i = texts.findIndex((t) => t.startsWith(want)); if (i >= 0) { const b = bs[i]; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { want, x: r.x + r.width / 2, y: r.y + r.height / 2, head: document.body.innerText.slice(0, 160).replace(/\s+/g, ' ') }; } }
    return { want: null, head: document.body.innerText.slice(0, 300).replace(/\s+/g, ' '), texts: texts.slice(0, 20) };
  }, PRI);
  if (!info.want) { console.log('STUCK', JSON.stringify(info)); break; }
  const key = info.want + '|' + info.head.slice(0, 60);
  if (/season|Season|review|Review|champion|Champion/.test(info.head) && !/MATCHDAY/.test(info.head.slice(0,40)) && shots < 6) { await p.screenshot({ path: EV + '/screens/' + prefix + 'season-' + (shots++) + '.png', fullPage: true }); console.log('SHOT', info.head); }
  console.log(++n, info.want, '::', info.head.slice(0, 110));
  await p.waitForTimeout(150);
  await p.mouse.click(info.x, info.y);
  await p.waitForTimeout(info.want.startsWith('Sim') || info.want.startsWith('Finish') ? 5000 : 1300);
}
console.log('ERR', JSON.stringify(errs.slice(0, 10)));
await ctx.close(); process.exit(0);
