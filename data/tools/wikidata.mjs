// Birth dates (P569) and Wikidata ids for players, looked up by English Wikipedia article title.
// Wikidata is CC0. Batched SPARQL POSTs through curl (proxy-friendly). Results are cached in
// data/tools/.cache/wikidata.json, so a weekly refresh only asks about new names.
// The query service sometimes rate-limits hard (1 request/minute); WIKIDATA_GAP_MS controls the spacing.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(HERE, '.cache', 'wikidata.json');
const UA = 'SembaGamesDataRefresh/1.0 (https://sembagames.app; low-volume weekly fact check)';
const GAP = Number(process.env.WIKIDATA_GAP_MS || 65000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lit = (t) => '"' + t.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"@en';

/** titles[] -> Map(title -> { qid, birthDate }) (titles Wikidata doesn't know are absent). */
export async function lookupPlayers(titles, { batch = 400, log = () => {} } = {}) {
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch { /* first run */ }
  const uniq = [...new Set(titles.filter(Boolean))];
  const todo = uniq.filter((t) => !(t in cache));
  log(`wikidata: ${uniq.length - todo.length} cached, ${todo.length} to look up`);
  for (let i = 0; i < todo.length; i += batch) {
    const chunk = todo.slice(i, i + batch);
    const q = `SELECT ?t ?i (MIN(?d) AS ?dob) WHERE { VALUES ?t { ${chunk.map(lit).join(' ')} } ?a schema:about ?i; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?t. OPTIONAL { ?i wdt:P569 ?d } } GROUP BY ?t ?i`;
    let done = false;
    for (let attempt = 0; attempt < 4 && !done; attempt++) {
      if (i || attempt) await sleep(GAP);
      try {
        const body = execFileSync('curl', ['-sS', '--max-time', '90', '-A', UA, '-H', 'Accept: application/sparql-results+json', '--data-urlencode', 'query=' + q, 'https://query.wikidata.org/sparql'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
        const json = JSON.parse(body);
        for (const t of chunk) cache[t] = null;
        for (const b of json.results.bindings) cache[b.t.value] = { qid: b.i.value.split('/').pop(), birthDate: b.dob ? b.dob.value.slice(0, 10) : null };
        done = true;
        log(`wikidata batch ${i / batch + 1}/${Math.ceil(todo.length / batch)} ok`);
      } catch (e) {
        log(`wikidata batch ${i / batch + 1} failed (${String(e.message).slice(0, 60)}), retrying`);
      }
    }
    fs.mkdirSync(path.dirname(CACHE), { recursive: true });
    fs.writeFileSync(CACHE, JSON.stringify(cache));
  }
  return new Map(uniq.filter((t) => cache[t]).map((t) => [t, cache[t]]));
}
