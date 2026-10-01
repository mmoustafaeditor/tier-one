// V2.8 derbies (V2_DESIGN §3.8): the famous local and historic rivalries between clubs in the data (public facts, no
// club marks). A derby is a bigger day: the board's and the fans' reaction to the result counts 1.5 times.
export const DERBY_WEIGHT = 1.5;

const PAIRS: [string, string][] = [
  // England
  ['eng-arsenal', 'eng-tottenham'], ['eng-liverpool', 'eng-everton'], ['eng-man-city', 'eng-man-utd'], ['eng-liverpool', 'eng-man-utd'],
  ['eng-chelsea', 'eng-tottenham'], ['eng-chelsea', 'eng-arsenal'], ['eng-newcastle', 'eng-sunderland'], ['eng-aston-villa', 'eng-birmingham'],
  ['eng-leeds', 'eng-man-utd'], ['eng-crystal-palace', 'eng-brighton'], ['eng-chelsea', 'eng-fulham'],
  // Spain
  ['esp-real-madrid', 'esp-barcelona'], ['esp-real-madrid', 'esp-atletico'], ['esp-barcelona', 'esp-espanyol'], ['esp-betis', 'esp-sevilla'],
  ['esp-athletic', 'esp-real-sociedad'], ['esp-valencia', 'esp-levante'], ['esp-real-madrid', 'esp-getafe'],
  // Italy
  ['ita-inter', 'ita-milan'], ['ita-roma', 'ita-lazio'], ['ita-juventus', 'ita-torino'], ['ita-juventus', 'ita-inter'], ['ita-napoli', 'ita-roma'],
  // Germany
  ['ger-bayern', 'ger-dortmund'], ['ger-dortmund', 'ger-schalke'], ['ger-hamburg', 'ger-bremen'], ['ger-koln', 'ger-gladbach'], ['ger-union', 'ger-hertha'],
  // France
  ['fra-psg', 'fra-marseille'], ['fra-lens', 'fra-lille'], ['fra-nice', 'fra-monaco'], ['fra-lyon', 'fra-marseille'], ['fra-psg', 'fra-paris-fc'],
  // Egypt and Saudi Arabia
  ['egy-al-ahly', 'egy-zamalek'], ['egy-al-ahly', 'egy-pyramids'], ['egy-zamalek', 'egy-pyramids'], ['egy-al-masry', 'eg1_ismaily'],
  ['ksa-al-hilal', 'ksa-al-nassr'], ['ksa-al-ittihad', 'ksa-al-ahli'], ['ksa-al-hilal', 'ksa-al-ittihad'], ['ksa-al-nassr', 'ksa-al-ittihad'], ['ksa-al-hilal', 'ksa-al-shabab'],
];
const SET = new Set(PAIRS.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]));

export const isDerby = (a: string, b: string) => SET.has(`${a}|${b}`);
