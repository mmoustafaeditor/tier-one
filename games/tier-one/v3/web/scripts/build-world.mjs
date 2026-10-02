// Writes src/data/world.json: the compact public world (clubs + saga-able players from the current real squads) that
// Practice and Career use offline. Built from the Semba data snapshot (data/seed) through the data service's own
// loader, so SEMBA_DATA_NAMES=fictional here gives a fictional-names build. The Daily's board always comes from the server.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../../..');
process.chdir(ROOT);
const { loadSnapshot } = await import(path.join(ROOT, 'api/data/_lib/store.js'));
const { compactWorld } = await import(path.join(ROOT, 'api/tier-one/v3/_lib/world.mjs'));
const w = compactWorld(loadSnapshot(), 5, 0);
fs.mkdirSync(path.join(HERE, '../src/data'), { recursive: true });
fs.writeFileSync(path.join(HERE, '../src/data/world.json'), JSON.stringify(w));
console.log('world.json', w.clubs.length, 'clubs', w.players.length, 'players', w.mode, w.asOf);
