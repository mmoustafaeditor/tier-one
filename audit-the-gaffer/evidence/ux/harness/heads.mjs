import { boot, newCareer, tap, home } from './navlib.mjs';
const { ctx, p } = await boot({ width: 1280, height: 860 }, 'en', 'hd');
await newCareer(p);
const H = async (n) => console.log('##', n, '::', (await p.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, main .eyebrow')].map(h => h.innerText.trim().replace(/\s+/g,' ')).filter(Boolean).slice(0, 40).join(' | '))));
const go = async (path, n) => { await home(p); for (const s of path) await tap(p, s); await H(n); };
await H('Today');
for (const [n, path] of [['Squad', ['nav:Squad']], ['Player', ['nav:Squad', 'EMAM ASHOUR']], ['Room', ['nav:Squad', 'Dressing room']], ['Training', ['nav:Squad', 'Training week']], ['Medical', ['nav:Squad', 'Medical']], ['Academy', ['nav:Squad', 'Academy']],
  ['Match/Tactics', ['nav:Match']], ['Fixtures', ['nav:Match', 'Fixtures']], ['Table', ['nav:Match', 'Table']], ['Cups', ['nav:Match', 'Cups']],
  ...['Needs', 'Scouts', 'Targets', 'Search', 'Talks', 'Deals', 'Loans'].map(t => ['Transfers/' + t, ['nav:Transfers', t]]),
  ...['Money', 'Board', 'Facilities', 'Staff', 'Commercial'].map(t => ['Club/' + t, ['nav:Club', t]]),
  ['Career', ['nav:Career']], ['Pass', ['nav:Club Pass']], ['Settings', ['nav:Club', 'Settings and saves']], ['News', ['nav:Club', 'Board', 'News']]]) {
  try { await go(path, n); } catch (e) { console.log('##', n, 'ERR', e.message); }
}
await home(p); await tap(p, 'Continue'); await H('PreMatch');
await ctx.close();
