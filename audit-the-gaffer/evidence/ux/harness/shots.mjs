import { boot, newCareer, tap } from './navlib.mjs';
const [, , dev='p', lang='en', tag='before'] = process.argv;
const vp = dev === 'd' ? { width: 1280, height: 860 } : { width: 390, height: 844 };
const { ctx, p } = await boot(vp, 'en', 'sh');
await newCareer(p);
if (lang !== 'en') {
  await p.evaluate((l) => { const m = JSON.parse(localStorage.getItem('gaffer.prefs.v1') ?? '{}'); m.lang=l; localStorage.setItem('gaffer.prefs.v1', JSON.stringify(m)); }, lang); await p.reload(); await p.waitForFunction(() => window.__bootDone === true, null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => b.offsetParent && /كمّل|Continuar|Continuer/.test(b.innerText)); const q = b.getBoundingClientRect(); return [q.x+q.width/2, q.y+q.height/2]; }); await p.mouse.click(r[0], r[1]); await p.waitForTimeout(1500);
}
const dir = `/home/user/tier-one/audit-the-gaffer/evidence/ux/${tag}/`;
await p.screenshot({ path: '/tmp/claude-0/-home-user-tier-one/809e18cd-8b4f-5180-b124-abac3d0ff038/scratchpad/dbg.png' });
const navs = await p.evaluate(() => [...document.querySelectorAll('nav.nav a')].map(a => a.getAttribute('href')));
for (const h of navs) {
  const r = await p.evaluate((h) => { const a = document.querySelector(`nav.nav a[href="${h}"]`); const q = a.getBoundingClientRect(); return q.width ? [q.x+q.width/2, q.y+q.height/2] : null; }, h);
  if (!r) continue;
  await p.mouse.click(r[0], r[1]); await p.waitForTimeout(900); await p.evaluate(() => scrollTo(0,0));
  await p.screenshot({ path: `${dir}screen-${dev}-${lang}-${h.slice(1)}.png`, fullPage: true });
}
const r0 = await p.evaluate(() => { const a = document.querySelector('nav.nav a[href="#squad"]'); const q = a.getBoundingClientRect(); return [q.x+q.width/2, q.y+q.height/2]; }); await p.mouse.click(r0[0], r0[1]); await p.waitForTimeout(800);
const n = await p.evaluate(() => document.querySelectorAll('.area-tabs button').length);
if (n) {
  for (let i = 1; i < 5; i++) {
    const b = await p.evaluate((i) => { scrollTo(0,0); const q = document.querySelectorAll('.area-tabs button')[i].getBoundingClientRect(); return [q.x+q.width/2, q.y+q.height/2]; }, i);
    await p.mouse.click(b[0], b[1]); await p.waitForTimeout(800);
    await p.screenshot({ path: `${dir}area-${dev}-${lang}-${i}.png` });
  }
}
const rt = await p.evaluate(() => { const a = document.querySelector('nav.nav a[href="#today"]'); const q = a.getBoundingClientRect(); return [q.x+q.width/2, q.y+q.height/2]; }); await p.mouse.click(rt[0], rt[1]); await p.waitForTimeout(800);
const inbox = await p.evaluate(() => document.querySelector('.inbox-line')?.innerText);
console.log('areas', n, 'inbox-line', inbox, 'dir', await p.evaluate(() => document.documentElement.dir));
await ctx.close();
