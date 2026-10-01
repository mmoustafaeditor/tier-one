import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const EV = '/home/user/tier-one/audit-the-gaffer/evidence';
const [profile, vp, url, stepsJson, prefix = ''] = process.argv.slice(2);
const steps = JSON.parse(stepsJson);
const size = vp === 'd' ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const ctx = await chromium.launchPersistentContext('/tmp/claude-0/-home-user-tier-one/809e18cd-8b4f-5180-b124-abac3d0ff038/scratchpad/profiles/' + profile, { channel: 'chromium', viewport: size, deviceScaleFactor: 1, hasTouch: vp !== 'd' && !process.env.NOTOUCH });
const p = ctx.pages()[0] ?? await ctx.newPage();
const errs = []; const reqs = [];
p.on('pageerror', e => errs.push('PAGE ' + e.message));
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text().slice(0, 200)); });
p.on('requestfailed', r => reqs.push('FAILED ' + r.url().slice(0, 120) + ' ' + (r.failure()?.errorText ?? '')));
p.on('response', r => { if (r.status() >= 400) reqs.push(r.status() + ' ' + r.url().slice(0, 120)); });
let n = 0;
const dump = async (tag, full) => {
  await p.waitForTimeout(600);
  const f = EV + '/screens/' + prefix + tag + '.png';
  await p.screenshot({ path: f, fullPage: !!full });
  const t = await p.innerText('body').catch(() => '');
  console.log('\n##### ' + tag + '\n' + t.replace(/\s*\n+\s*/g, ' | ').slice(0, +process.env.LEN || 1500));
  if (!process.env.NOBTN) console.log('BTN', JSON.stringify(await p.$$eval('button, [role=button], a[href^="#"]', bs => bs.map(b => (b.getAttribute('aria-label') || b.innerText).trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 60))));
};
try {
  await p.goto(url, { waitUntil: 'load' }); await p.waitForFunction(() => window.__bootDone === true, null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(1500);
  await p.waitForTimeout(3500);
  for (const st of steps) {
    const [k, a, b] = st.split('|'); if (process.env.TRACE) console.log('STEP', Date.now() % 100000, k, JSON.stringify(a));
    if (k === 'W') { await p.waitForTimeout(+a); continue; }
    if (/^W\d+$/.test(k)) { await p.waitForTimeout(+k.slice(1)); continue; }
    if (!['D','R','E','K','F','SEL','XY','TAP','CL','SC','N','T','S','BX','B'].includes(k)) throw new Error('bad step ' + st);
    if (k === 'D') { await dump(a, b === 'full'); continue; }
    if (k === 'R') { await p.reload(); await p.waitForTimeout(3500); continue; }
    if (k === 'E') { console.log('EVAL', String(JSON.stringify(await p.evaluate(a))).slice(0, 3000)); continue; }
    if (k === 'K') { await p.keyboard.press(a); await p.waitForTimeout(300); continue; }
    if (k === 'F') { await p.locator(a).first().fill(b); continue; }
    if (k === 'SEL') { await p.locator(a).first().selectOption(b); continue; }
    if (k === 'XY') { await p.mouse.click(+a, +b); await p.waitForTimeout(400); continue; }
    if (k === 'TAP') { await p.touchscreen.tap(+a, +b); await p.waitForTimeout(400); continue; }
    if (k === 'CL') { const r = await p.evaluate((t) => { const b = [...document.querySelectorAll('button')].find((b) => t.startsWith('~') ? b.innerText.includes(t.slice(1)) : b.innerText.trim().startsWith(t)); if (!b) return null; b.scrollIntoView({ block: 'center' }); const q = b.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; }, a); if (!r) throw new Error('CL not found ' + a); await p.waitForTimeout(200); await p.mouse.click(r[0], r[1]); await p.waitForTimeout(500); continue; }
    if (k === 'SC') { await p.mouse.wheel(0, +a); await p.waitForTimeout(400); continue; }
    let l;
    if (k === 'N') l = p.locator('nav a[href="#' + a + '"]').first();
    else if (k === 'T') l = p.getByText(a, { exact: b === 'x' }).first();
    else if (k === 'S') l = p.locator(a).nth(+(b ?? 0));
    else if (k === 'BX') l = p.getByRole('button', { name: a, exact: true }).first();
    else l = p.getByRole('button', { name: a }).first();
    await l.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
    if (process.env.REAL) await l.click({ timeout: 5000 }); else { await l.waitFor({ state: 'visible', timeout: 5000 }); await l.dispatchEvent('click'); }
    await p.waitForTimeout(+(process.env.STEPW || 450));
  }
} catch (e) { console.log('STEPFAIL', e.message.split('\n').slice(0, 12).join(' / ')); await dump('zz-fail-' + Date.now()); }
console.log('ERR', JSON.stringify(errs.slice(0, 15)));
console.log('REQ', JSON.stringify(reqs.slice(0, 15)));
await ctx.close();
process.exit(0);
