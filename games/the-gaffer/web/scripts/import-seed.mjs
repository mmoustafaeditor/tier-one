// Turns the Semba football data snapshot (data/seed, see data/SCHEMA.md) into src/data/real.ts, the compact table the
// game builds its 2026/27 world from. FACTS ONLY: names, clubs, positions, birth years, nationalities, shirt numbers,
// captaincy, kit colours. No ratings, values or wages come from the data: those are Semba's own model (src/sim/seed.ts)
// plus the designers' tiers in scripts/tiers.mjs.
//   node scripts/import-seed.mjs        (run from games/the-gaffer/web; rerun after every data refresh)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TIERS } from './tiers.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SEED = resolve(HERE, '../../../../data/seed');
const read = (f) => JSON.parse(readFileSync(resolve(SEED, f), 'utf8'));
const meta = read('meta.json');
const clubs = read('clubs.json');
const players = read('players.json');
const fictional = read('fictional.json');

// Arabic club names (how Arabic football media write them). Facts, like the names themselves.
const AR = {
  'eng-arsenal': 'آرسنال', 'eng-aston-villa': 'أستون فيلا', 'eng-bournemouth': 'بورنموث', 'eng-brentford': 'برينتفورد', 'eng-brighton': 'برايتون',
  'eng-chelsea': 'تشيلسي', 'eng-coventry': 'كوفنتري سيتي', 'eng-crystal-palace': 'كريستال بالاس', 'eng-everton': 'إيفرتون', 'eng-fulham': 'فولهام',
  'eng-hull': 'هال سيتي', 'eng-ipswich': 'إبسويتش تاون', 'eng-leeds': 'ليدز يونايتد', 'eng-liverpool': 'ليفربول', 'eng-man-city': 'مانشستر سيتي',
  'eng-man-utd': 'مانشستر يونايتد', 'eng-newcastle': 'نيوكاسل يونايتد', 'eng-nottm-forest': 'نوتنجهام فورست', 'eng-sunderland': 'سندرلاند', 'eng-tottenham': 'توتنهام',
  'esp-real-madrid': 'ريال مدريد', 'esp-barcelona': 'برشلونة', 'esp-atletico': 'أتلتيكو مدريد', 'esp-athletic': 'أتلتيك بلباو', 'esp-villarreal': 'فياريال',
  'esp-real-sociedad': 'ريال سوسيداد', 'esp-betis': 'ريال بيتيس', 'esp-sevilla': 'إشبيلية', 'esp-valencia': 'فالنسيا', 'esp-celta': 'سيلتا فيجو',
  'esp-osasuna': 'أوساسونا', 'esp-rayo': 'رايو فايكانو', 'esp-getafe': 'خيتافي', 'esp-espanyol': 'إسبانيول', 'esp-alaves': 'ديبورتيفو ألافيس',
  'esp-levante': 'ليفانتي', 'esp-elche': 'إلتشي', 'esp-deportivo': 'ديبورتيفو لاكورونيا', 'esp-malaga': 'مالاجا', 'esp-racing': 'راسينج سانتاندير',
  'ita-inter': 'إنتر ميلان', 'ita-napoli': 'نابولي', 'ita-juventus': 'يوفنتوس', 'ita-milan': 'ميلان', 'ita-atalanta': 'أتالانتا', 'ita-roma': 'روما',
  'ita-lazio': 'لاتسيو', 'ita-fiorentina': 'فيورنتينا', 'ita-bologna': 'بولونيا', 'ita-como': 'كومو', 'ita-torino': 'تورينو', 'ita-udinese': 'أودينيزي',
  'ita-genoa': 'جنوى', 'ita-cagliari': 'كالياري', 'ita-parma': 'بارما', 'ita-lecce': 'ليتشي', 'ita-sassuolo': 'ساسولو', 'ita-venezia': 'فينيسيا',
  'ita-frosinone': 'فروزينوني', 'ita-monza': 'مونزا',
  'ger-bayern': 'بايرن ميونخ', 'ger-leverkusen': 'باير ليفركوزن', 'ger-dortmund': 'بوروسيا دورتموند', 'ger-leipzig': 'لايبزيج', 'ger-frankfurt': 'آينتراخت فرانكفورت',
  'ger-stuttgart': 'شتوتجارت', 'ger-freiburg': 'فرايبورج', 'ger-hoffenheim': 'هوفنهايم', 'ger-gladbach': 'بوروسيا مونشنجلادباخ', 'ger-mainz': 'ماينتس',
  'ger-bremen': 'فيردر بريمن', 'ger-union': 'يونيون برلين', 'ger-augsburg': 'أوجسبورج', 'ger-koln': 'كولن', 'ger-hamburg': 'هامبورج', 'ger-schalke': 'شالكه',
  'ger-elversberg': 'إلفرسبرج', 'ger-paderborn': 'بادربورن',
  'fra-psg': 'باريس سان جيرمان', 'fra-marseille': 'مارسيليا', 'fra-monaco': 'موناكو', 'fra-lille': 'ليل', 'fra-lyon': 'ليون', 'fra-nice': 'نيس', 'fra-lens': 'لانس',
  'fra-rennes': 'رين', 'fra-strasbourg': 'ستراسبورج', 'fra-toulouse': 'تولوز', 'fra-brest': 'بريست', 'fra-auxerre': 'أوكسير', 'fra-angers': 'أنجيه',
  'fra-le-havre': 'لوهافر', 'fra-lorient': 'لوريان', 'fra-paris-fc': 'باريس إف سي', 'fra-troyes': 'تروا', 'fra-le-mans': 'لومان',
  'egy-al-ahly': 'النادي الأهلي', 'egy-zamalek': 'الزمالك', 'egy-pyramids': 'بيراميدز', 'egy-al-masry': 'المصري', 'egy-ceramica': 'سيراميكا كليوباترا', 'egy-zed': 'زد',
  'ksa-al-hilal': 'الهلال', 'ksa-al-nassr': 'النصر', 'ksa-al-ittihad': 'الاتحاد', 'ksa-al-ahli': 'الأهلي', 'ksa-al-qadsiah': 'القادسية', 'ksa-al-shabab': 'الشباب',
};
// Clubs promoted into the covered leagues have no row in The Gaffer's old club list: the designers set where they start.
const REP_NEW = {
  'eng-coventry': 70, 'eng-hull': 67, 'eng-ipswich': 69, 'esp-deportivo': 69, 'esp-malaga': 68, 'esp-racing': 67, 'ita-venezia': 69, 'ita-frosinone': 67,
  'ita-monza': 68, 'ger-schalke': 73, 'ger-elversberg': 66, 'ger-paderborn': 67, 'fra-troyes': 67, 'fra-le-mans': 66,
};
// Clubs that went down in 2025/26 play the second tier under their real names (squads stay generated: the snapshot
// covers the top flights only). Keyed by The Gaffer's old club id.
const RELEGATED = {
  eng_elh: ['West Ham United', 'وست هام يونايتد', 'WHU'], eng_wol: ['Wolverhampton Wanderers', 'وولفرهامبتون', 'WOL'], eng_bur: ['Burnley', 'بيرنلي', 'BUR'],
  esp_gir: ['Girona', 'جيرونا', 'GIR'], esp_mal: ['Mallorca', 'مايوركا', 'MLL'], esp_ovi: ['Real Oviedo', 'ريال أوفييدو', 'OVI'],
  ita_ver: ['Hellas Verona', 'هيلاس فيرونا', 'VER'], ita_pis: ['Pisa', 'بيزا', 'PIS'], ita_cre: ['Cremonese', 'كريمونيزي', 'CRE'],
  ger_wob: ['VfL Wolfsburg', 'فولفسبورج', 'WOB'], ger_stp: ['FC St. Pauli', 'سانت باولي', 'STP'], ger_hdh: ['1. FC Heidenheim', 'هايدنهايم', 'HDH'],
  fra_nan: ['Nantes', 'نانت', 'NAN'], fra_met: ['Metz', 'ميتز', 'MET'],
};

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${').replace(/\|/g, '/');
const missing = clubs.filter((c) => !AR[c.id]).map((c) => c.id);
if (missing.length) throw new Error(`No Arabic name for ${missing.join(', ')}`);

const clubIndex = new Map(clubs.map((c, i) => [c.id, i]));
const clubRows = clubs.map((c) => {
  const f = fictional[c.id] ?? { name: c.name, shortName: c.shortName, code: c.code };
  return [c.id, c.leagueId, c.name, c.shortName, c.code, c.colors.primary, c.colors.secondary, c.gameIds?.gaffer ?? '', AR[c.id], REP_NEW[c.id] ?? 0, f.name, f.shortName, f.code];
});

// Players who play for the club this season: loaned-out players (at a club we don't track) are left out.
const kept = players.filter((p) => !p.loan || p.loan.direction === 'in');
const tierByKey = new Map();
const unmatched = [];
for (const [name, rating, pos, club] of TIERS) {
  const hits = kept.filter((p) => p.name === name && (!club || p.clubId === club));
  if (hits.length !== 1) { unmatched.push(`${name}${hits.length > 1 ? ' (ambiguous)' : ''}`); continue; }
  tierByKey.set(hits[0].id, [rating, pos]);
}
if (unmatched.length) console.warn(`Tiers not matched (${unmatched.length}): ${unmatched.join('; ')}`);

const born = (p) => {
  if (p.birthDate) return p.birthDate.slice(0, 4);
  const m = /born-(\d{4})/.exec(p.id);
  return m ? m[1] : '';
};
const rows = kept.map((p) => {
  const t = tierByKey.get(p.id);
  const flags = (p.captain ? 'c' : '') + (p.loan ? 'l' : '');
  return [p.id, esc(p.name), esc(p.shortName ?? ''), p.nationality, born(p), p.position, clubIndex.get(p.clubId), p.shirtNumber || 0, flags, t ? t[0] : '', t ? t[1] : ''].join('|');
});

const out = `// GENERATED by scripts/import-seed.mjs from data/seed (snapshot ${meta.asOf}, schema ${meta.schema}). Do not edit by hand.
// Facts only (names, clubs, positions, birth years, nationalities, shirt numbers, kit colours). Ratings are Semba's own.
export const REAL_AS_OF = '${meta.asOf}';
export const REAL_SEASON = '${meta.season}';
// [id, league, name, short name, code, colour 1, colour 2, old Gaffer id, Arabic name, starting reputation if new,
//  fictional name, fictional short name, fictional code]
export type RealClubRow = [string, string, string, string, string, string, string, string, string, number, string, string, string];
export const REAL_CLUBS: RealClubRow[] = ${JSON.stringify(clubRows)};
// Relegated in 2025/26: old Gaffer club id → [real name, Arabic name, code].
export const REAL_RELEGATED: Record<string, [string, string, string]> = ${JSON.stringify(RELEGATED)};
// One player per line: id|name|short name|nationality|birth year|GK/DF/MF/FW|club index|shirt|flags (c captain, l on loan)|tier rating|tier position
export const REAL_PLAYERS = \`${rows.join('\n')}\`;
`;
writeFileSync(resolve(HERE, '../src/data/real.ts'), out);
console.log(`real.ts: ${clubRows.length} clubs, ${rows.length} players, ${tierByKey.size} tiers, ${(out.length / 1024).toFixed(0)} KB`);
