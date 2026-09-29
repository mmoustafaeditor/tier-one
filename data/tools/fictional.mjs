#!/usr/bin/env node
// Writes data/seed/fictional.json: fictional club names for SEMBA_DATA_NAMES=fictional, taken read-only from
// The Gaffer's own club list (games/the-gaffer/web/src/data/clubs.ts) so both games fall back to the same names.
// Clubs without a Gaffer twin get a generic "<City> Athletic" style name below.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clubList } from './clubs.config.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const src = fs.readFileSync(path.join(REPO, 'games/the-gaffer/web/src/data/clubs.ts'), 'utf8');
const gaffer = new Map();
for (const m of src.matchAll(/\['([a-z0-9_]+)',\s*'([^']+)',\s*'[^']*',\s*'([A-Z0-9]+)'/g)) gaffer.set(m[1], { name: m[2], code: m[3] });

const EXTRA = {
  'eng-coventry': 'Coventry Sky Blues', 'eng-hull': 'Hull Tigers', 'eng-ipswich': 'Ipswich Tractor Boys',
  'esp-deportivo': 'A Coruña Blue-and-Whites', 'esp-malaga': 'Málaga Anchovies', 'esp-racing': 'Santander Racers',
  'ita-venezia': 'Venice Lagoon', 'ita-frosinone': 'Frosinone Canaries', 'ita-monza': 'Monza Brianzoli',
  'ger-schalke': 'Gelsenkirchen Royal Blues', 'ger-elversberg': 'Elversberg Villagers', 'ger-paderborn': 'Paderborn Blues',
  'fra-troyes': 'Troyes Blue Steel', 'fra-le-mans': 'Le Mans Racers',
};

const out = {};
for (const c of clubList()) {
  const g = c.gameId && gaffer.get(c.gameId);
  if (g) out[c.id] = { name: g.name, shortName: g.name, code: g.code };
  else out[c.id] = { name: EXTRA[c.id] || `${c.shortName} Athletic`, shortName: (EXTRA[c.id] || c.shortName).split(' ')[0], code: c.code };
}
fs.writeFileSync(path.join(REPO, 'data/seed/fictional.json'), JSON.stringify(out, null, 1) + '\n');
console.log('fictional names:', Object.keys(out).length, 'clubs,', [...Object.values(out)].filter((x, i) => clubList()[i].gameId).length, 'from The Gaffer');
