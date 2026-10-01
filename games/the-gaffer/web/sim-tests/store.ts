// V2.10 Semba Credits and looks: meta only. node sim-tests/build.mjs store
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const mem: Record<string, string> = {};
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = String(v); }, removeItem: (k: string) => { delete mem[k]; } };
const { credits, addCredits, seasonCredits, SEASON_CREDITS, SEASON_CREDITS_CAP } = await import('../src/meta/wallet');
const { buyLook, ownedLooks, canUseLook, LOOK_PRICE } = await import('../src/meta/looks');
const { loadPrefs } = await import('../src/sim/prefs');

let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };

// The simulation never imports meta (nothing bought can change a result).
const files: string[] = [];
const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(f)) files.push(p); } };
walk(new URL('../../src/sim', import.meta.url).pathname); // the test runs from sim-tests/.out
const bad = files.filter((f) => /from ['"][./]*meta\//.test(readFileSync(f, 'utf8')));
ok(files.length > 20 && !bad.length, `sim/** never imports meta/** (${files.length} files${bad.length ? `: ${bad.join(', ')}` : ''})`);

// Season credits: once per season, first 10 seasons of a career.
ok(seasonCredits('7:Test', 2026) === SEASON_CREDITS && credits() === SEASON_CREDITS, 'a finished season pays 50 cr');
ok(seasonCredits('7:Test', 2026) === 0 && credits() === SEASON_CREDITS, 'the same season never pays twice');
for (let s = 2027; s < 2040; s++) seasonCredits('7:Test', s);
ok(credits() === SEASON_CREDITS * SEASON_CREDITS_CAP, `capped at ${SEASON_CREDITS_CAP} seasons a career (${credits()} cr)`);
ok(seasonCredits('9:Other', 2026) === SEASON_CREDITS, 'another career earns its own');

// Looks: bought with credits, kept, and the only way (besides the pack) to use them.
mem['semba.credits.v1'] = String(LOOK_PRICE - 1);
ok(!buyLook(2) && credits() === LOOK_PRICE - 1 && !canUseLook(2, false), 'short of credits: nothing bought, nothing taken');
addCredits(1);
ok(buyLook(2) && credits() === 0 && ownedLooks().includes(2) && canUseLook(2, false), `a look costs ${LOOK_PRICE} cr and stays unlocked`);
ok(!buyLook(2), 'never paid twice');
mem['gaffer.prefs.v1'] = JSON.stringify({ look: 2 });
ok(loadPrefs().look === 2, 'an owned look survives a reload');
mem['gaffer.prefs.v1'] = JSON.stringify({ look: 3 });
ok(loadPrefs().look === 0, 'a look not owned falls back to the free one');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
