// Polite Wikipedia raw-wikitext fetcher for the refresh tool.
// - one request at a time, >= 2 s apart, exponential back-off on 429/5xx
// - caches responses in data/tools/.cache (gitignored) so a re-run within CACHE_HOURS does not refetch
// - uses curl so the machine's HTTPS proxy settings are honoured (Node's fetch ignores HTTPS_PROXY)
// Wikipedia text is CC BY-SA; we keep only facts (names, numbers, dates, fees, colours) and the article URL as a source.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { redirectTarget } from './wikitext.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(HERE, '.cache');
const UA = 'SembaGamesDataRefresh/1.0 (https://sembagames.app; low-volume weekly fact check)';
const GAP_MS = Number(process.env.WIKI_GAP_MS || 2000);
const CACHE_HOURS = Number(process.env.WIKI_CACHE_HOURS || 12);
let last = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const wikiUrl = (title) => 'https://en.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/ /g, '_')).replace(/%2F/g, '/');

function curl(url) {
  const out = execFileSync('curl', ['-sS', '-L', '--max-time', '40', '-A', UA, '-w', '\n%{http_code}', url], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const i = out.lastIndexOf('\n');
  return { status: Number(out.slice(i + 1)), body: out.slice(0, i) };
}

async function rawOnce(title) {
  fs.mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, encodeURIComponent(title) + '.txt');
  if (fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < CACHE_HOURS * 3600e3) return { text: fs.readFileSync(file, 'utf8'), fetchedAt: fs.statSync(file).mtime.toISOString() };
  const url = 'https://en.wikipedia.org/w/index.php?title=' + encodeURIComponent(title.replace(/ /g, '_')) + '&action=raw';
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = last + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const { status, body } = curl(url);
    if (status === 200) { fs.writeFileSync(file, body); return { text: body, fetchedAt: new Date().toISOString() }; }
    if (status === 404) return { text: null, fetchedAt: new Date().toISOString() };
    if (status === 429 || status >= 500) { await sleep(Math.min(120e3, 8000 * 2 ** attempt)); continue; }
    throw new Error(`wiki ${status} for ${title}`);
  }
  throw new Error('wiki: gave up on ' + title);
}

/** Raw wikitext of an article, following up to 2 redirects. -> { title (resolved), text|null, url, fetchedAt } */
export async function wikiRaw(title) {
  let t = title;
  for (let hop = 0; hop < 3; hop++) {
    const r = await rawOnce(t);
    const to = r.text && redirectTarget(r.text);
    if (!to) return { title: t, text: r.text, url: wikiUrl(t), fetchedAt: r.fetchedAt };
    t = to;
  }
  throw new Error('wiki: redirect loop at ' + title);
}
