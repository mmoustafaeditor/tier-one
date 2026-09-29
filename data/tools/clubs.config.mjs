// Which leagues and clubs the Semba data snapshot covers, and where each club's facts are researched.
//
// Row: [clubId, shortName, code, wikiTitle, gameId?, extra?]
//   clubId    stable Semba id: '<league country>-<slug>'. NEVER change an id once published; add `aliases` instead.
//   shortName display name used in UI lists ("Man City").
//   code      3-letter code for tables/scoreboards.
//   wikiTitle English Wikipedia article whose "Players" section lists the current squad (redirects are followed).
//   gameId    matching club id in The Gaffer (games/the-gaffer/web/src/data/clubs.ts), for fictional-name fallback.
//   extra     optional overrides: { name, colors:[primary,secondary], squadTitle, confidence, note }
//
// Membership is for the 2026/27 season (checked against the 2026–27 league articles on 29 Sep 2026).

export const SEASON = '2026/27';

export const LEAGUES = [
  { id: 'eng1', name: 'Premier League', country: 'ENG', tier: 1, wiki: '2026–27 Premier League', transfersWiki: 'List of English football transfers summer 2026' },
  { id: 'esp1', name: 'La Liga', country: 'ESP', tier: 1, wiki: '2026–27 La Liga', transfersWiki: 'List of Spanish football transfers summer 2026' },
  { id: 'ita1', name: 'Serie A', country: 'ITA', tier: 1, wiki: '2026–27 Serie A', transfersWiki: 'List of Italian football transfers summer 2026' },
  { id: 'ger1', name: 'Bundesliga', country: 'GER', tier: 1, wiki: '2026–27 Bundesliga', transfersWiki: 'List of German football transfers summer 2026' },
  { id: 'fra1', name: 'Ligue 1', country: 'FRA', tier: 1, wiki: '2026–27 Ligue 1', transfersWiki: 'List of French football transfers summer 2026' },
  { id: 'egy1', name: 'Egyptian Premier League', country: 'EGY', tier: 1, wiki: '2026–27 Egyptian Premier League', partial: true },
  { id: 'ksa1', name: 'Saudi Pro League', country: 'KSA', tier: 1, wiki: '2026–27 Saudi Pro League', partial: true },
];

export const CLUBS = {
  eng1: [
    ['eng-arsenal', 'Arsenal', 'ARS', 'Arsenal F.C.', 'eng_lgu'],
    ['eng-aston-villa', 'Aston Villa', 'AVL', 'Aston Villa F.C.', 'eng_avl'],
    ['eng-bournemouth', 'Bournemouth', 'BOU', 'AFC Bournemouth', 'eng_bou'],
    ['eng-brentford', 'Brentford', 'BRE', 'Brentford F.C.', 'eng_bre'],
    ['eng-brighton', 'Brighton', 'BHA', 'Brighton & Hove Albion F.C.', 'eng_bri'],
    ['eng-chelsea', 'Chelsea', 'CHE', 'Chelsea F.C.', 'eng_lbl'],
    ['eng-coventry', 'Coventry', 'COV', 'Coventry City F.C.'],
    ['eng-crystal-palace', 'Crystal Palace', 'CRY', 'Crystal Palace F.C.', 'eng_cpe'],
    ['eng-everton', 'Everton', 'EVE', 'Everton F.C.', 'eng_mtf'],
    ['eng-fulham', 'Fulham', 'FUL', 'Fulham F.C.', 'eng_wlc'],
    ['eng-hull', 'Hull City', 'HUL', 'Hull City A.F.C.'],
    ['eng-ipswich', 'Ipswich', 'IPS', 'Ipswich Town F.C.'],
    ['eng-leeds', 'Leeds', 'LEE', 'Leeds United F.C.', 'eng_lds'],
    ['eng-liverpool', 'Liverpool', 'LIV', 'Liverpool F.C.', 'eng_lvr'],
    ['eng-man-city', 'Man City', 'MCI', 'Manchester City F.C.', 'eng_mcb'],
    ['eng-man-utd', 'Man Utd', 'MUN', 'Manchester United F.C.', 'eng_mcr'],
    ['eng-newcastle', 'Newcastle', 'NEW', 'Newcastle United F.C.', 'eng_ncm'],
    ['eng-nottm-forest', "Nott'm Forest", 'NFO', 'Nottingham Forest F.C.', 'eng_nfo'],
    ['eng-sunderland', 'Sunderland', 'SUN', 'Sunderland A.F.C.', 'eng_sun'],
    ['eng-tottenham', 'Spurs', 'TOT', 'Tottenham Hotspur F.C.', 'eng_nls'],
  ],
  esp1: [
    ['esp-real-madrid', 'Real Madrid', 'RMA', 'Real Madrid CF', 'esp_mdw', { colors: ['#FFFFFF', '#FEBE10'] }],
    ['esp-barcelona', 'Barcelona', 'BAR', 'FC Barcelona', 'esp_bcn'],
    ['esp-atletico', 'Atlético', 'ATM', 'Atlético Madrid', 'esp_mdr'],
    ['esp-athletic', 'Athletic', 'ATH', 'Athletic Bilbao', 'esp_bil'],
    ['esp-villarreal', 'Villarreal', 'VIL', 'Villarreal CF', 'esp_vil'],
    ['esp-real-sociedad', 'Real Sociedad', 'RSO', 'Real Sociedad', 'esp_soc'],
    ['esp-betis', 'Betis', 'BET', 'Real Betis', 'esp_bet'],
    ['esp-sevilla', 'Sevilla', 'SEV', 'Sevilla FC', 'esp_sev'],
    ['esp-valencia', 'Valencia', 'VAL', 'Valencia CF', 'esp_val'],
    ['esp-celta', 'Celta', 'CEL', 'RC Celta de Vigo', 'esp_cel'],
    ['esp-osasuna', 'Osasuna', 'OSA', 'CA Osasuna', 'esp_osa'],
    ['esp-rayo', 'Rayo', 'RAY', 'Rayo Vallecano', 'esp_ray'],
    ['esp-getafe', 'Getafe', 'GET', 'Getafe CF', 'esp_get'],
    ['esp-espanyol', 'Espanyol', 'ESP', 'RCD Espanyol', 'esp_esp'],
    ['esp-alaves', 'Alavés', 'ALA', 'Deportivo Alavés', 'esp_ala'],
    ['esp-levante', 'Levante', 'LEV', 'Levante UD', 'esp_lev'],
    ['esp-elche', 'Elche', 'ELC', 'Elche CF', 'esp_elc'],
    ['esp-deportivo', 'Deportivo', 'DEP', 'Deportivo de La Coruña'],
    ['esp-malaga', 'Málaga', 'MAL', 'Málaga CF'],
    ['esp-racing', 'Racing', 'RAC', 'Racing de Santander'],
  ],
  ita1: [
    ['ita-inter', 'Inter', 'INT', 'Inter Milan', 'ita_mnz'],
    ['ita-napoli', 'Napoli', 'NAP', 'SSC Napoli', 'ita_nap'],
    ['ita-juventus', 'Juventus', 'JUV', 'Juventus FC', 'ita_tzb'],
    ['ita-milan', 'Milan', 'MIL', 'AC Milan', 'ita_mrn'],
    ['ita-atalanta', 'Atalanta', 'ATA', 'Atalanta BC', 'ita_ber'],
    ['ita-roma', 'Roma', 'ROM', 'AS Roma', 'ita_rgr'],
    ['ita-lazio', 'Lazio', 'LAZ', 'SS Lazio', 'ita_rbc'],
    ['ita-fiorentina', 'Fiorentina', 'FIO', 'ACF Fiorentina', 'ita_flo'],
    ['ita-bologna', 'Bologna', 'BOL', 'Bologna FC 1909', 'ita_bol'],
    ['ita-como', 'Como', 'COM', 'Como 1907', 'ita_com'],
    ['ita-torino', 'Torino', 'TOR', 'Torino FC', 'ita_tbu'],
    ['ita-udinese', 'Udinese', 'UDI', 'Udinese Calcio', 'ita_udi'],
    ['ita-genoa', 'Genoa', 'GEN', 'Genoa CFC', 'ita_gen'],
    ['ita-cagliari', 'Cagliari', 'CAG', 'Cagliari Calcio', 'ita_cag'],
    ['ita-parma', 'Parma', 'PAR', 'Parma Calcio 1913', 'ita_par'],
    ['ita-lecce', 'Lecce', 'LEC', 'US Lecce', 'ita_lec'],
    ['ita-sassuolo', 'Sassuolo', 'SAS', 'US Sassuolo Calcio', 'ita_sas'],
    ['ita-venezia', 'Venezia', 'VEN', 'Venezia FC'],
    ['ita-frosinone', 'Frosinone', 'FRO', 'Frosinone Calcio'],
    ['ita-monza', 'Monza', 'MON', 'AC Monza'],
  ],
  ger1: [
    ['ger-bayern', 'Bayern', 'FCB', 'FC Bayern Munich', 'ger_mun'],
    ['ger-leverkusen', 'Leverkusen', 'B04', 'Bayer 04 Leverkusen', 'ger_lev'],
    ['ger-dortmund', 'Dortmund', 'BVB', 'Borussia Dortmund', 'ger_dor'],
    ['ger-leipzig', 'Leipzig', 'RBL', 'RB Leipzig', 'ger_lei'],
    ['ger-frankfurt', 'Frankfurt', 'SGE', 'Eintracht Frankfurt', 'ger_fra'],
    ['ger-stuttgart', 'Stuttgart', 'VFB', 'VfB Stuttgart', 'ger_stu'],
    ['ger-freiburg', 'Freiburg', 'SCF', 'SC Freiburg', 'ger_fre'],
    ['ger-hoffenheim', 'Hoffenheim', 'TSG', 'TSG 1899 Hoffenheim', 'ger_hof'],
    ['ger-gladbach', 'Gladbach', 'BMG', 'Borussia Mönchengladbach', 'ger_mgb'],
    ['ger-mainz', 'Mainz', 'M05', '1. FSV Mainz 05', 'ger_mai'],
    ['ger-bremen', 'Werder Bremen', 'SVW', 'SV Werder Bremen', 'ger_brm'],
    ['ger-union', 'Union Berlin', 'FCU', '1. FC Union Berlin', 'ger_uni'],
    ['ger-augsburg', 'Augsburg', 'FCA', 'FC Augsburg', 'ger_aug'],
    ['ger-koln', 'Köln', 'KOE', '1. FC Köln', 'ger_koe'],
    ['ger-hamburg', 'Hamburg', 'HSV', 'Hamburger SV', 'ger_ham'],
    ['ger-schalke', 'Schalke', 'S04', 'FC Schalke 04'],
    ['ger-elversberg', 'Elversberg', 'SVE', 'SV Elversberg'],
    ['ger-paderborn', 'Paderborn', 'SCP', 'SC Paderborn 07'],
  ],
  fra1: [
    ['fra-psg', 'PSG', 'PSG', 'Paris Saint-Germain FC', 'fra_par'],
    ['fra-marseille', 'Marseille', 'OM', 'Olympique de Marseille', 'fra_mar'],
    ['fra-monaco', 'Monaco', 'ASM', 'AS Monaco FC', 'fra_mon'],
    ['fra-lille', 'Lille', 'LIL', 'Lille OSC', 'fra_lil'],
    ['fra-lyon', 'Lyon', 'OL', 'Olympique Lyonnais', 'fra_lyo'],
    ['fra-nice', 'Nice', 'NIC', 'OGC Nice', 'fra_nic'],
    ['fra-lens', 'Lens', 'RCL', 'RC Lens', 'fra_len'],
    ['fra-rennes', 'Rennes', 'REN', 'Stade Rennais FC', 'fra_ren'],
    ['fra-strasbourg', 'Strasbourg', 'RCS', 'RC Strasbourg Alsace', 'fra_str'],
    ['fra-toulouse', 'Toulouse', 'TFC', 'Toulouse FC', 'fra_tou'],
    ['fra-brest', 'Brest', 'SB29', 'Stade Brestois 29', 'fra_bre'],
    ['fra-auxerre', 'Auxerre', 'AJA', 'AJ Auxerre', 'fra_aux'],
    ['fra-angers', 'Angers', 'SCO', 'Angers SCO', 'fra_ang'],
    ['fra-le-havre', 'Le Havre', 'HAC', 'Le Havre AC', 'fra_lhv'],
    ['fra-lorient', 'Lorient', 'FCL', 'FC Lorient', 'fra_lor'],
    ['fra-paris-fc', 'Paris FC', 'PFC', 'Paris FC', 'fra_pfc'],
    ['fra-troyes', 'Troyes', 'ESTAC', 'ES Troyes AC'],
    ['fra-le-mans', 'Le Mans', 'LMFC', 'Le Mans FC'],
  ],
  egy1: [
    ['egy-al-ahly', 'Al Ahly', 'AHL', 'Al Ahly SC', 'eg1_ahly'],
    ['egy-zamalek', 'Zamalek', 'ZAM', 'Zamalek SC', 'eg1_zamalek'],
    ['egy-pyramids', 'Pyramids', 'PYR', 'Pyramids FC', 'eg1_pyramids'],
    ['egy-al-masry', 'Al Masry', 'MAS', 'Al Masry SC', 'eg1_masry'],
    ['egy-ceramica', 'Ceramica Cleopatra', 'CER', 'Ceramica Cleopatra FC', 'eg1_ceramica'],
    ['egy-zed', 'ZED', 'ZED', 'ZED FC', 'eg1_zed'],
  ],
  ksa1: [
    ['ksa-al-hilal', 'Al Hilal', 'HIL', 'Al Hilal SFC', 'ksa_hilal'],
    ['ksa-al-nassr', 'Al Nassr', 'NAS', 'Al-Nassr FC', 'ksa_nassr'],
    ['ksa-al-ittihad', 'Al Ittihad', 'ITT', 'Al-Ittihad Club (Jeddah)', 'ksa_ittihad'],
    ['ksa-al-ahli', 'Al Ahli', 'AHL', 'Al-Ahli Saudi FC', 'ksa_ahli'],
    ['ksa-al-qadsiah', 'Al Qadsiah', 'QAD', 'Al-Qadsiah FC', 'ksa_qadsiah'],
    ['ksa-al-shabab', 'Al Shabab', 'SHB', 'Al-Shabab FC (Riyadh)', 'ksa_shabab'],
  ],
};

/** Flat list of { id, league, shortName, code, wiki, gameId, ...extra }. */
export function clubList() {
  const out = [];
  for (const [league, rows] of Object.entries(CLUBS)) {
    for (const [id, shortName, code, wiki, gameId, extra] of rows) out.push({ id, league, shortName, code, wiki, gameId: gameId || null, ...(extra || {}) });
  }
  return out;
}
