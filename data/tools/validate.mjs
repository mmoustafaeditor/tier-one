#!/usr/bin/env node
// Checks a snapshot and diffs it against the previous one, flagging suspicious changes before publishing.
//
//   node data/tools/validate.mjs                    # data/seed vs the last committed data/seed (git HEAD)
//   node data/tools/validate.mjs --old <dir> --new <dir>
//   node data/tools/validate.mjs --json             # machine-readable report
//
// Exit code 1 when there are errors (publish blocked), 0 with warnings only. See data/REFRESH.md for what to do.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { problems } from '../../api/data/_lib/normalize.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const args = process.argv.slice(2);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const NEW = path.resolve(opt('--new') || path.join(REPO, 'data/seed'));
const OLD = opt('--old');
const FILES = ['meta', 'clubs', 'players', 'transfers', 'rumours'];

function load(dir) { const o = {}; for (const f of FILES) o[f] = JSON.parse(fs.readFileSync(path.join(dir, f + '.json'), 'utf8')); return o; }
function loadGit(rev) {
  const o = {};
  try { for (const f of FILES) o[f] = JSON.parse(execFileSync('git', ['-C', REPO, 'show', `${rev}:data/seed/${f}.json`], { encoding: 'utf8', maxBuffer: 64e6, stdio: ['ignore', 'pipe', 'ignore'] })); } catch { return null; }
  return o;
}

export function validate(cur, prev, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const errors = [], warnings = [], info = [];
  // ---- the snapshot on its own ----
  for (const [kind, list] of [['club', cur.clubs], ['player', cur.players], ['transfer', cur.transfers], ['rumour', cur.rumours]]) {
    const ids = new Set();
    for (const x of list) { if (ids.has(x.id)) errors.push(`duplicate ${kind} id ${x.id}`); ids.add(x.id); }
    const ps = list.flatMap((x) => problems(kind, x));
    if (ps.length) (kind === 'player' ? warnings : errors).push(...ps.slice(0, 20).map((p) => p + (ps.length > 20 ? ` (+${ps.length - 20} more)` : '')));
  }
  const clubIds = new Set(cur.clubs.map((c) => c.id));
  for (const p of cur.players) if (!clubIds.has(p.clubId)) errors.push(`player ${p.id} points at unknown club ${p.clubId}`);
  const size = new Map();
  for (const p of cur.players) if (!(p.loan && p.loan.direction === 'out')) size.set(p.clubId, (size.get(p.clubId) || 0) + 1);
  for (const c of cur.clubs) {
    const n = size.get(c.id) || 0;
    if (n < 16) errors.push(`${c.id}: only ${n} first-team players`);
    else if (n > 45) warnings.push(`${c.id}: ${n} first-team players (academy rows mixed in?)`);
    if (c.confidence === 'low') warnings.push(`${c.id}: club confidence low — recheck its squad by hand`);
  }
  for (const r of cur.rumours) {
    if (r.status !== 'open') continue;
    const age = (Date.parse(today) - Date.parse(r.lastSeen || '1970-01-01')) / 864e5;
    if (age > 45) warnings.push(`rumour ${r.id} not re-confirmed for ${Math.round(age)} days — refresh or mark dead`);
    const pl = cur.players.find((p) => p.id === r.playerId);
    if (pl && r.linked.some((l) => l.clubId === pl.clubId)) warnings.push(`rumour ${r.id}: ${r.playerName} is now at ${pl.clubId} — mark confirmed`);
    if (!pl && r.currentClubId) warnings.push(`rumour ${r.id}: ${r.playerName} not found in the ${r.currentClubId} squad`);
  }
  const mAge = (Date.parse(today) - Date.parse(cur.meta.asOf)) / 864e5;
  if (mAge > 10) warnings.push(`snapshot asOf ${cur.meta.asOf} is ${Math.round(mAge)} days old`);

  // ---- against the previous snapshot ----
  if (prev) {
    if (cur.meta.asOf < prev.meta.asOf) errors.push(`asOf went backwards (${prev.meta.asOf} -> ${cur.meta.asOf})`);
    const drop = (a, b, what, lim) => { if (b.length < a.length * (1 - lim)) errors.push(`${what} fell from ${a.length} to ${b.length} (> ${lim * 100}%)`); };
    drop(prev.players, cur.players, 'players', 0.1); drop(prev.clubs, cur.clubs, 'clubs', 0); drop(prev.transfers, cur.transfers, 'transfers', 0.2);
    const oldP = new Map(prev.players.map((p) => [p.id, p]));
    const newP = new Map(cur.players.map((p) => [p.id, p]));
    const moveOk = (id, to) => cur.transfers.some((t) => t.playerId === id && (t.toClubId === to || !to));
    let moved = 0, unexplained = [];
    for (const [id, p] of newP) {
      const o = oldP.get(id);
      if (o && o.clubId !== p.clubId) { moved++; if (!moveOk(id, p.clubId) && !(p.loan && p.loan.fromClubId === o.clubId)) unexplained.push(`${p.name} ${o.clubId} -> ${p.clubId}`); }
      if (o && o.birthDate && p.birthDate && o.birthDate !== p.birthDate) warnings.push(`${p.name}: birth date changed ${o.birthDate} -> ${p.birthDate}`);
      if (o && o.nationality && p.nationality && o.nationality !== p.nationality) info.push(`${p.name}: nationality ${o.nationality} -> ${p.nationality}`);
    }
    if (unexplained.length) warnings.push(`${unexplained.length} club changes with no transfer on record: ` + unexplained.slice(0, 25).join('; '));
    for (const c of cur.clubs) {
      const before = prev.players.filter((p) => p.clubId === c.id).map((p) => p.id), after = cur.players.filter((p) => p.clubId === c.id).map((p) => p.id);
      const gone = before.filter((id) => !after.includes(id)), added = after.filter((id) => !before.includes(id));
      if (before.length && (gone.length > Math.max(8, before.length * 0.3) || added.length > Math.max(8, before.length * 0.3))) warnings.push(`${c.id}: big squad churn (−${gone.length} +${added.length}) — check the source page wasn't vandalised or restructured`);
      const pc = prev.clubs.find((x) => x.id === c.id);
      if (pc && (pc.colors.primary !== c.colors.primary)) info.push(`${c.id}: primary colour ${pc.colors.primary} -> ${c.colors.primary}`);
    }
    for (const c of prev.clubs) if (!clubIds.has(c.id)) errors.push(`club ${c.id} disappeared (ids must stay stable)`);
    info.push(`players: ${prev.players.length} -> ${cur.players.length}, moved ${moved}; transfers ${prev.transfers.length} -> ${cur.transfers.length}; rumours ${prev.rumours.length} -> ${cur.rumours.length}`);
  } else info.push('no previous snapshot to diff against');
  return { errors, warnings, info };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cur = load(NEW);
  const prev = OLD ? load(path.resolve(OLD)) : loadGit(opt('--git') || 'HEAD');
  const rep = validate(cur, prev);
  if (args.includes('--json')) console.log(JSON.stringify(rep, null, 1));
  else {
    for (const [k, list] of Object.entries(rep)) { console.log(`\n${k.toUpperCase()} (${list.length})`); for (const x of list) console.log('  - ' + x); }
    console.log(`\n${rep.errors.length ? 'BLOCKED: fix errors before publishing' : 'OK to publish'} (${rep.warnings.length} warnings)`);
  }
  process.exit(rep.errors.length ? 1 : 0);
}
