// Fictional-name fallback (SEMBA_DATA_NAMES=fictional). Clubs use The Gaffer's near-real names (data/seed/fictional.json);
// players get a deterministic invented name from their id, so the same player always gets the same name.
import { hash32 } from './ids.js';

const FIRST = ['Adam', 'Ali', 'Amir', 'Andre', 'Bruno', 'Carlos', 'Dani', 'David', 'Diego', 'Elias', 'Emil', 'Enzo', 'Felix', 'Hugo', 'Ibra', 'Ivan', 'Jonas', 'Jorge', 'Karim', 'Kofi', 'Leo', 'Luca', 'Luis', 'Malik', 'Marco', 'Mateo', 'Nico', 'Noah', 'Omar', 'Oscar', 'Pablo', 'Rafa', 'Sami', 'Theo', 'Tomas', 'Yusuf', 'Zayd', 'Kenji', 'Mads', 'Rui'];
const LAST = ['Almeida', 'Barros', 'Becker', 'Bennett', 'Carvalho', 'Costa', 'Dahl', 'Diallo', 'Duarte', 'Ekdal', 'Farouk', 'Ferreira', 'Galli', 'Hadad', 'Hart', 'Ivers', 'Jansen', 'Keane', 'Kovac', 'Lanza', 'Lind', 'Marsh', 'Mendes', 'Moreau', 'Nadir', 'Novak', 'Okafor', 'Olsen', 'Pardo', 'Quinn', 'Ramos', 'Rossi', 'Salem', 'Sauer', 'Toure', 'Varga', 'Vidal', 'Weber', 'Yilmaz', 'Zanetti'];

export function fictionalPlayerName(p) {
  const h = hash32(p.id || p.name || '');
  const first = FIRST[h % FIRST.length], last = LAST[(h >>> 8) % LAST.length];
  return { name: `${first} ${last}`, shortName: last };
}

export function fictionalClubName(c, table) {
  const f = table[c.id];
  if (f) return { name: f.name, shortName: f.shortName || f.name, code: f.code || c.code };
  return { name: `${c.shortName} Athletic`, shortName: c.shortName };
}
