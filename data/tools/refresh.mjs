#!/usr/bin/env node
// Rebuilds data/seed/*.json (clubs, players, confirmed transfers) from public fact sources, then merges the
// hand-researched files in data/curated/ (rumours, extra transfers, corrections). See data/REFRESH.md.
//
//   node data/tools/refresh.mjs                 # everything (≈ 130 Wikipedia pages, ~6 min at 2 s/page)
//   node data/tools/refresh.mjs --only eng1     # one league (other leagues are kept from the current seed)
//   node data/tools/refresh.mjs --curated-only  # just re-merge data/curated/* into the current seed (no network)
//   node data/tools/refresh.mjs --no-wikidata   # skip birth-date lookups
//   node data/tools/refresh.mjs --out /tmp/x    # write somewhere else (then run validate.mjs --new /tmp/x)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEAGUES, CLUBS, SEASON, clubList } from './clubs.config.mjs';
import { parseSquad, parseInfobox, parseTransferTables, parseInOutLists, firstLink } from './wikitext.mjs';
import { wikiRaw, wikiUrl } from './wiki-fetch.mjs';
import { lookupPlayers } from './wikidata.mjs';
import { normalizeLeague, normalizeClub, normalizePlayer, normalizeTransfer, normalizeRumour, problems } from '../../api/data/_lib/normalize.js';
import { playerId, slug } from '../../api/data/_lib/ids.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const OUT = path.resolve(opt('--out') || path.join(ROOT, 'seed'));
const ONLY = opt('--only') ? opt('--only').split(',') : null;
const log = (...a) => console.error('[refresh]', ...a);
const today = new Date().toISOString().slice(0, 10);

const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
/** One record per line: readable, diffable. */
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body = Array.isArray(value) ? '[\n' + value.map((v) => JSON.stringify(v)).join(',\n') + '\n]\n' : JSON.stringify(value, null, 1) + '\n';
  fs.writeFileSync(file, body);
}

const prev = {
  meta: readJson(path.join(OUT, 'meta.json'), {}),
  clubs: readJson(path.join(OUT, 'clubs.json'), []),
  players: readJson(path.join(OUT, 'players.json'), []),
  transfers: readJson(path.join(OUT, 'transfers.json'), []),
  sources: readJson(path.join(OUT, 'sources.json'), { clubs: {}, transferLists: {} }),
};

const clubs = clubList();
const clubById = new Map(clubs.map((c) => [c.id, c]));
const titleToClub = new Map();
// Loose key so 'RC Celta de Vigo', 'Celta Vigo' and 'Celta' meet: drop legal-form tokens and years.
const LEGAL = new Set(['fc', 'cf', 'sc', 'ac', 'afc', 'as', 'ss', 'ssc', 'us', 'calcio', 'club', 'de', 'la', 'rc', 'cd', 'ud', 'rcd', 'ca', 'sv', 'vfb', 'vfl', 'tsg', 'fsv', 'bc', 'ogc', 'osc', 'sfc', 'a', 'f', 'c', 'e', 'v']);
const looseKey = (t) => slug(t).split('-').filter((w) => w && !LEGAL.has(w) && !/^\d+$/.test(w)).join('-');
const addTitle = (t, id) => { if (t) { titleToClub.set(t, id); titleToClub.set(slug(t), id); const k = looseKey(t); if (k && !titleToClub.has('~' + k)) titleToClub.set('~' + k, id); } };
for (const c of clubs) { addTitle(c.wiki, c.id); addTitle(c.shortName, c.id); }
const clubFor = (link) => link && (titleToClub.get(link.title) || titleToClub.get(slug(link.title || '')) || titleToClub.get(slug(link.text || '')) || titleToClub.get('~' + looseKey(link.title || '')) || titleToClub.get('~' + looseKey(link.text || ''))) || null;

async function scrapeClubs() {
  const out = new Map();
  for (const c of clubs) {
    if (ONLY && !ONLY.includes(c.league)) continue;
    let page = await wikiRaw(c.wiki);
    if (!page.text) { log('MISSING article', c.wiki); continue; }
    addTitle(page.title, c.id);
    let rows = parseSquad(page.text);
    const info = parseInfobox(page.text);
    addTitle(info.clubname, c.id);
    const urls = [page.url];
    // Some articles keep the squad on a season page instead.
    if (rows.filter((r) => r.section === 'first').length < 15) {
      const alt = c.squadTitle || `${SEASON.replace('/', '–')} ${page.title} season`;
      const sp = await wikiRaw(alt);
      const altRows = sp.text ? parseSquad(sp.text) : [];
      if (altRows.filter((r) => r.section === 'first').length > rows.filter((r) => r.section === 'first').length) { rows = altRows; urls.push(sp.url); }
    }
    const updated2627 = /2627|2026–27|2026-27/.test(page.text);
    out.set(c.id, { club: c, rows, info, urls, fetchedAt: page.fetchedAt, updated2627, title: page.title });
    log(c.id.padEnd(22), 'first', String(rows.filter((r) => r.section === 'first').length).padStart(2), 'loanOut', rows.filter((r) => r.section === 'loanOut').length);
  }
  return out;
}

async function scrapeTransfers() {
  const all = []; const lists = {};
  for (const l of LEAGUES) {
    if (!l.transfersWiki || (ONLY && !ONLY.includes(l.id))) continue;
    const page = await wikiRaw(l.transfersWiki);
    if (!page.text) { log('no transfer list', l.transfersWiki); continue; }
    const rows = [...parseTransferTables(page.text), ...parseInOutLists(page.text)];
    lists[l.id] = { title: page.title, url: page.url, fetchedAt: page.fetchedAt, rows: rows.length };
    for (const r of rows) all.push({ ...r, listUrl: page.url, leagueId: l.id });
    log('transfers', l.id, rows.length);
  }
  return { all, lists };
}

function buildTransfers(raw) {
  const seen = new Map();
  for (const r of raw) {
    if (r.fee.type === 'end-of-loan') continue;
    const fromClubId = clubFor(r.from), toClubId = clubFor(r.to);
    if (!fromClubId && !toClubId) continue;
    const t = normalizeTransfer({
      playerRef: r.player.ref, playerName: r.player.name,
      fromClubId, fromName: r.from.text || null, toClubId, toName: r.to.text || null,
      date: r.date, type: r.fee.type, fee: r.fee.amount, feeText: r.fee.text, window: '2026-summer',
      sources: [...r.urls, r.listUrl], confidence: r.urls.length ? 'high' : 'medium',
    });
    const key = t.playerId + '>' + (t.toClubId || slug(t.toName || ''));
    const old = seen.get(key);
    if (!old) { seen.set(key, t); continue; }
    const best = !old.fee && t.fee ? t : old, other = best === t ? old : t;
    seen.set(key, { ...best, date: best.date || other.date, id: best.date ? best.id : other.id, sources: [...new Set([...best.sources, ...other.sources])].slice(0, 3) });
  }
  return [...seen.values()].sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.id.localeCompare(b.id));
}

function buildPlayers(scraped, transfers) {
  // latest summer move per player (to judge squad listings)
  const lastMove = new Map();
  for (const t of transfers) { const o = lastMove.get(t.playerId); if (!o || (t.date || '') >= (o.date || '')) lastMove.set(t.playerId, t); }
  const players = new Map(); const clubStats = new Map();
  const put = (p) => {
    const old = players.get(p.id);
    if (!old) { players.set(p.id, p); return; }
    // Same player listed twice: a first-team listing beats a loaned-out listing; two first-team listings = conflict.
    if (old.loan && old.loan.direction === 'out' && !(p.loan && p.loan.direction === 'out')) { p.loan = { direction: 'in', fromClubId: old.clubId, fromName: clubById.get(old.clubId)?.shortName, until: p.loan?.until || old.loan.until }; players.set(p.id, p); return; }
    if (p.loan && p.loan.direction === 'out') { if (old.loan?.direction === 'in' && !old.loan.fromClubId) old.loan.fromClubId = p.clubId; return; }
    const mv = lastMove.get(p.id);
    const keep = mv && mv.toClubId === p.clubId ? p : old;
    keep.confidence = 'low'; keep._conflict = `listed by ${old.clubId} and ${p.clubId}`;
    players.set(p.id, keep);
  };
  for (const [clubId, s] of scraped) {
    let first = 0, departedListed = 0;
    for (const r of s.rows) {
      const id = playerId({ ref: r.ref, name: r.name, clubId });
      const mv = lastMove.get(id);
      let loan = null;
      if (r.section === 'loanOut') { const to = r.loanTo || firstLink(r.other || ''); loan = { direction: 'out', toClubId: clubFor(to), toName: to?.text || null, until: null }; }
      else if (r.loanFrom) loan = { direction: 'in', fromClubId: clubFor(r.loanFrom), fromName: r.loanFrom.text, until: null };
      let confidence = r.ref ? 'high' : 'medium';
      if (r.section === 'first') {
        first++;
        if (mv && mv.fromClubId === clubId && mv.toClubId !== clubId && mv.type !== 'loan') { departedListed++; confidence = 'low'; }
      }
      put({ id, name: r.name, ref: r.ref, nat: r.nat, pos: r.pos, no: r.no, clubId, captain: r.captain, loan, confidence });
    }
    // arrivals the transfer lists know about, and whether the squad list has them
    const arrivals = transfers.filter((t) => t.toClubId === clubId && t.date >= '2026-05-01');
    const ids = new Set(s.rows.map((r) => playerId({ ref: r.ref, name: r.name, clubId })));
    const covered = arrivals.filter((t) => ids.has(t.playerId)).length;
    clubStats.set(clubId, { first, departedListed, arrivals: arrivals.length, arrivalsListed: covered });
  }
  return { players, clubStats };
}

function clubConfidence(st, s) {
  if (!st || st.first < 16) return 'low';
  const cov = st.arrivals >= 3 ? st.arrivalsListed / st.arrivals : 1;
  if (cov < 0.35 || st.departedListed >= 4) return 'low';
  if (st.first >= 18 && st.first <= 42 && s.updated2627 && cov >= 0.6 && st.departedListed <= 2) return 'high';
  return 'medium';
}

async function main() {
  const curated = {
    rumours: readJson(path.join(ROOT, 'curated', 'rumours.json'), []),
    transfers: readJson(path.join(ROOT, 'curated', 'transfers.json'), []),
    overrides: readJson(path.join(ROOT, 'curated', 'overrides.json'), { players: {}, clubs: {}, exclude: [] }),
  };
  let clubsOut, playersOut, transfersOut, sources;
  if (flag('--curated-only')) {
    clubsOut = prev.clubs; playersOut = prev.players; transfersOut = prev.transfers.filter((t) => !t._curated); sources = prev.sources;
  } else {
    const scraped = await scrapeClubs();
    const { all, lists } = await scrapeTransfers();
    let transfers = buildTransfers(all);
    if (ONLY) transfers = [...prev.transfers.filter((t) => !t._curated && !ONLY.some((l) => [t.fromClubId, t.toClubId].some((c) => clubById.get(c)?.league === l))), ...transfers];
    const { players, clubStats } = buildPlayers(scraped, transfers);
    // wikidata birth dates / ids
    if (!flag('--no-wikidata')) {
      const titles = [...players.values()].map((p) => p.ref).filter(Boolean);
      log('wikidata lookups', titles.length);
      const wd = await lookupPlayers(titles, { log });
      for (const p of players.values()) { const w = p.ref && wd.get(p.ref); if (w) { p.birthDate = w.birthDate; p.qid = w.qid; } }
    }
    sources = { ...prev.sources, clubs: { ...(prev.sources.clubs || {}) }, transferLists: { ...(prev.sources.transferLists || {}), ...lists } };
    const newClubs = [];
    for (const c of clubs) {
      const s = scraped.get(c.id);
      if (!s) { const old = prev.clubs.find((x) => x.id === c.id); if (old) newClubs.push(old); continue; }
      const st = clubStats.get(c.id);
      newClubs.push(normalizeClub({
        id: c.id, name: c.name || s.info.clubname || c.shortName, shortName: c.shortName, code: c.code,
        country: LEAGUES.find((l) => l.id === c.league).country, leagueId: c.league,
        colors: c.colors || s.info.colors, gameId: c.gameId, squadSize: st.first,
        confidence: c.confidence || clubConfidence(st, s), asOf: s.fetchedAt.slice(0, 10),
      }));
      sources.clubs[c.id] = { urls: s.urls, fetchedAt: s.fetchedAt, checks: st, kitUpdatedFor2627: s.updated2627 };
    }
    clubsOut = newClubs;
    const clubConf = new Map(clubsOut.map((c) => [c.id, c.confidence]));
    const fresh = [...players.values()].map((p) => {
      const cc = clubConf.get(p.clubId);
      if (cc === 'low' && p.confidence !== 'low') p.confidence = 'low';
      else if (cc === 'medium' && p.confidence === 'high') p.confidence = 'medium';
      return normalizePlayer(p);
    });
    const freshIds = new Set(fresh.map((p) => p.id));
    const keep = ONLY ? prev.players.filter((p) => !freshIds.has(p.id) && !ONLY.includes(clubById.get(p.clubId)?.league)) : [];
    playersOut = [...keep, ...fresh];
    transfersOut = transfers;
  }

  // ---- curated merge ----
  const ov = curated.overrides;
  const excluded = new Set(ov.exclude || []);
  playersOut = playersOut.filter((p) => !excluded.has(p.id)).map((p) => (ov.players && ov.players[p.id] ? normalizePlayer({ ...p, ...ov.players[p.id], id: p.id, ref: p.refs?.wiki, qid: p.refs?.wikidata }) : p));
  for (const add of ov.addPlayers || []) { const p = normalizePlayer(add); if (!playersOut.some((x) => x.id === p.id)) playersOut.push(p); }
  clubsOut = clubsOut.map((c) => (ov.clubs && ov.clubs[c.id] ? normalizeClub({ ...c, ...ov.clubs[c.id], gameId: c.gameIds?.gaffer, colors: ov.clubs[c.id].colors || [c.colors.primary, c.colors.secondary] }) : c));
  const curatedT = curated.transfers.map((t) => ({ ...normalizeTransfer(t), _curated: true }));
  const tIds = new Set(curatedT.map((t) => t.playerId + '>' + t.toClubId));
  transfersOut = [...transfersOut.filter((t) => !tIds.has(t.playerId + '>' + t.toClubId)), ...curatedT].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  // Rumours name players; resolve them to snapshot ids (same name, preferring the stated current club).
  const byName = new Map();
  for (const p of playersOut) { const k = slug(p.name); if (!byName.has(k)) byName.set(k, []); byName.get(k).push(p); }
  const rumoursOut = curated.rumours.map((r) => {
    const cands = byName.get(slug(r.playerName)) || [];
    const hit = cands.find((p) => p.clubId === r.currentClubId) || (cands.length === 1 ? cands[0] : null);
    const club = r.currentClubId && clubsOut.find((c) => c.id === r.currentClubId);
    const linked = (r.linked || []).map((l) => ({ ...l, name: l.name || clubsOut.find((c) => c.id === l.clubId)?.shortName }));
    return normalizeRumour({ ...r, linked, playerId: r.playerId || hit?.id, currentClubName: r.currentClubName || club?.shortName, firstSeen: r.firstSeen });
  });
  const unresolved = rumoursOut.filter((r, i) => !curated.rumours[i].playerId && !(byName.get(slug(r.playerName)) || []).length && curated.rumours[i].currentClubId);
  if (unresolved.length) log('rumour players not found in their club squad:', unresolved.map((r) => r.playerName).join(', '));

  // squad sizes after overrides
  const counts = new Map();
  for (const p of playersOut) if (!(p.loan && p.loan.direction === 'out')) counts.set(p.clubId, (counts.get(p.clubId) || 0) + 1);
  clubsOut = clubsOut.map((c) => ({ ...c, squadSize: counts.get(c.id) || 0 }));
  playersOut.sort((a, b) => (a.clubId || '').localeCompare(b.clubId || '') || (a.shirtNumber ?? 999) - (b.shirtNumber ?? 999) || a.name.localeCompare(b.name));

  const issues = [
    ...clubsOut.flatMap((c) => problems('club', c)), ...playersOut.flatMap((p) => problems('player', p)),
    ...transfersOut.flatMap((t) => problems('transfer', t)), ...rumoursOut.flatMap((r) => problems('rumour', r)),
  ];
  const leagues = LEAGUES.map((l) => normalizeLeague({ ...l, season: SEASON }));
  const pct = (xs) => (xs.length ? Math.round((100 * xs.filter((x) => x.confidence === 'high').length) / xs.length) : 0);
  const meta = {
    schema: 1, season: SEASON, asOf: flag('--curated-only') ? prev.meta.asOf || today : today, curatedAsOf: today,
    generator: 'data/tools/refresh.mjs', namesMode: 'real',
    counts: { leagues: leagues.length, clubs: clubsOut.length, players: playersOut.length, transfers: transfersOut.length, rumours: rumoursOut.length, openRumours: rumoursOut.filter((r) => r.status === 'open').length },
    confidenceHighPct: { clubs: pct(clubsOut), players: pct(playersOut), transfers: pct(transfersOut), rumours: pct(rumoursOut) },
    issues: issues.length,
  };
  writeJson(path.join(OUT, 'leagues.json'), leagues);
  writeJson(path.join(OUT, 'clubs.json'), clubsOut);
  writeJson(path.join(OUT, 'players.json'), playersOut);
  writeJson(path.join(OUT, 'transfers.json'), transfersOut);
  writeJson(path.join(OUT, 'rumours.json'), rumoursOut);
  writeJson(path.join(OUT, 'sources.json'), { ...sources, rumours: 'per rumour, in rumours.json › outlets[].url', licence: 'Facts only. Squad/transfer facts cross-read from English Wikipedia (CC BY-SA) article revisions fetched on the dates shown; birth dates from Wikidata (CC0).' });
  writeJson(path.join(OUT, 'meta.json'), meta);
  if (issues.length) log(issues.length, 'issues, first:', issues.slice(0, 15));
  log('done', JSON.stringify(meta.counts), JSON.stringify(meta.confidenceHighPct));
}

main().catch((e) => { console.error(e); process.exit(1); });
