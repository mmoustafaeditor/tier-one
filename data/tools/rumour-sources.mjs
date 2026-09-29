#!/usr/bin/env node
// Pluggable rumour sources -> *candidate* rumour facts for a human (or a Claude session) to review.
//
// A source is { id, outlet, tier, fetchItems(): Promise<Array<{ url, title, date }>> }.
// Headlines are read only in memory to spot "player + club" pairs; they are NEVER written out. Each candidate keeps
// facts only: player id/name, the clubs mentioned, outlet, tier, link and date. The one-line `fact` in
// data/curated/rumours.json is written by us, in our own words, when a candidate is accepted.
//
//   node data/tools/rumour-sources.mjs            # writes data/tools/.cache/rumour-candidates.json (gitignored)
//
// Add a source by appending to SOURCES. Only use feeds the publisher offers for syndication (RSS/Atom) and whose
// terms allow automated reading; never scrape article pages.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { slug } from '../../api/data/_lib/ids.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SEED = path.resolve(HERE, '..', 'seed');

/** Generic RSS/Atom source. */
export function rssSource({ id, outlet, tier, url }) {
  return {
    id, outlet, tier,
    async fetchItems() {
      const xml = execFileSync('curl', ['-sS', '-L', '--max-time', '30', '-A', 'SembaGamesDataRefresh/1.0 (https://sembagames.app)', url], { encoding: 'utf8', maxBuffer: 16e6 });
      return parseFeed(xml);
    },
  };
}

export function parseFeed(xml) {
  const items = [];
  for (const m of xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/g)) {
    const x = m[0];
    const pick = (re) => { const r = re.exec(x); return r ? r[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : null; };
    const link = pick(/<link>([^<]+)<\/link>/) || pick(/<link[^>]*href="([^"]+)"/);
    const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/);
    const date = pick(/<pubDate>([^<]+)<\/pubDate>/) || pick(/<updated>([^<]+)<\/updated>/) || pick(/<published>([^<]+)<\/published>/);
    const d = date ? new Date(date) : null;
    if (link && title) items.push({ url: link, title, date: d && Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : null });
  }
  return items;
}

/** Match headlines against snapshot players (full name) and clubs (short name). Returns facts only. */
export function extractCandidates(items, source, players, clubs) {
  const norm = (s) => ' ' + slug(s).replace(/-/g, ' ') + ' ';
  const pl = players.filter((p) => p.name && p.name.includes(' ')).map((p) => ({ p, key: norm(p.name) }));
  const cl = clubs.map((c) => ({ c, key: norm(c.shortName) }));
  const out = [];
  for (const it of items) {
    const h = norm(it.title);
    const who = pl.filter(({ key }) => h.includes(key));
    if (who.length !== 1) continue; // ambiguous or none
    const p = who[0].p;
    const clubsNamed = cl.filter(({ c, key }) => c.id !== p.clubId && h.includes(key)).map(({ c }) => c.id);
    if (!clubsNamed.length) continue;
    out.push({ playerId: p.id, playerName: p.name, currentClubId: p.clubId, linkedClubIds: clubsNamed, outlet: source.outlet, tier: source.tier, url: it.url, date: it.date, sourceId: source.id });
  }
  return out;
}

// Feeds to watch. Empty by default: add only feeds whose terms allow it (see data/SCHEMA.md › Legal).
export const SOURCES = [
  // rssSource({ id: 'example', outlet: 'Example Sport', tier: 2, url: 'https://example.com/football/transfers/rss.xml' }),
];

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const players = JSON.parse(fs.readFileSync(path.join(SEED, 'players.json'), 'utf8'));
  const clubs = JSON.parse(fs.readFileSync(path.join(SEED, 'clubs.json'), 'utf8'));
  const all = [];
  for (const s of SOURCES) {
    try { all.push(...extractCandidates(await s.fetchItems(), s, players, clubs)); } catch (e) { console.error(s.id, 'failed:', e.message); }
  }
  const file = path.join(HERE, '.cache', 'rumour-candidates.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(all, null, 1));
  console.log(`${all.length} candidates from ${SOURCES.length} sources -> ${path.relative(process.cwd(), file)}`);
}
