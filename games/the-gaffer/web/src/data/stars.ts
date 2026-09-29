// Hand-made star players with FICTIONAL names (studio decision, Sep 2026: no real or near-real footballers).
// Each star belongs to exactly one club (E2E #31); the name fits his nationality.
// Row: [clubId, English name, Arabic name, nationality, position, age in 2026, rating, potential, shirt number]
import type { Position } from '../model/types';

export type StarRow = [string, string, string, string, Position, number, number, number, number];

// Nicknames, by English name. Generic ones only, never a real player's nickname.
export const NICKS: Record<string, [string, string]> = {
  'S. Halvorsrud': ['The Hammer', 'المطرقة'], 'S. Lavallière': ['The Rocket', 'الصاروخ'], 'D. van Leeuwarden': ['The Wall', 'الحيطة'],
  'A. Montoliu': ['The Wonderkid', 'الجوهرة'], 'Semsem': ['The Artist', 'الفنان'], 'E. Abdel Mottaleb': ['The Engine', 'الموتور'],
  'M. El Ashmawy': ['Safe Hands', 'الإيد الأمينة'], 'C. Valdemar': ['The Veteran', 'المخضرم'], 'J. Lindenau': ['The Magician', 'الساحر'],
  'J. Ashcombe': ['Golden Boy', 'الفتى الذهبي'], 'H. Brackenridge': ['The Goal Machine', 'ماكينة الأجوان'], 'Y. Lamghari': ['The Cat', 'القطة'],
  'E. Kvalheim': ['The Maestro', 'المايسترو'], 'S. Al Haqbani': ['The Tornado', 'التورنيدو'],
};

export const STARS: StarRow[] = [
  // England
  ['eng_lvr', 'O. Abdel Wareth', 'ع. عبد الوارث', 'EGY', 'RW', 34, 88, 88, 11],
  ['eng_lvr', 'D. van Leeuwarden', 'د. فان ليواردن', 'NED', 'CB', 35, 86, 86, 4],
  ['eng_lvr', 'T. Echarri', 'ت. إتشاري', 'ARG', 'CM', 27, 85, 86, 10],
  ['eng_mcb', 'S. Halvorsrud', 'س. هالفورسرود', 'NOR', 'ST', 26, 91, 93, 9],
  ['eng_mcb', 'I. Oteiza', 'إ. أوتيزا', 'ESP', 'CDM', 30, 89, 89, 16],
  ['eng_mcb', 'L. Pendlebury', 'ل. بندلبري', 'ENG', 'CAM', 26, 86, 88, 47],
  ['eng_lgu', 'J. Ashcombe', 'ج. آشكوم', 'ENG', 'RW', 25, 88, 90, 7],
  ['eng_lgu', 'E. Kvalheim', 'إ. كفالهايم', 'NOR', 'CAM', 27, 87, 88, 8],
  ['eng_lgu', 'M. Dorvillier', 'م. دورفيلييه', 'FRA', 'CB', 25, 87, 89, 2],
  ['eng_lgu', 'T. Hollingworth', 'ت. هولينغوورث', 'ENG', 'CM', 27, 87, 88, 41],
  ['eng_lbl', 'C. Marlowe', 'ك. مارلو', 'ENG', 'CAM', 24, 87, 90, 20],
  ['eng_lbl', 'J. Cotacachi', 'خ. كوتاكاتشي', 'ECU', 'CDM', 24, 85, 88, 25],
  ['eng_mcr', 'D. Carrapatoso', 'د. كاراباتوزو', 'POR', 'CAM', 31, 85, 85, 8],
  ['eng_nls', 'Namgung J.', 'نامغونغ', 'KOR', 'LW', 34, 83, 83, 7],
  ['eng_avl', 'R. Blackthorne', 'ر. بلاكثورن', 'ENG', 'ST', 30, 84, 84, 11],
  // Spain
  ['esp_mdw', 'S. Lavallière', 'س. لافاليير', 'FRA', 'ST', 27, 91, 92, 9],
  ['esp_mdw', 'C. Belém', 'ك. بيليم', 'BRA', 'LW', 26, 89, 91, 7],
  ['esp_mdw', 'A. Whitmore', 'أ. ويتمور', 'ENG', 'CAM', 23, 89, 93, 5],
  ['esp_mdw', 'M. Albisu', 'م. ألبيسو', 'URU', 'CM', 28, 88, 88, 8],
  ['esp_mdw', 'P. Wynendaele', 'ب. واينندال', 'BEL', 'GK', 34, 88, 88, 1],
  ['esp_bcn', 'A. Montoliu', 'أ. مونتوليو', 'ESP', 'RW', 19, 88, 95, 19],
  ['esp_bcn', 'G. Alcover', 'غ. ألكوفير', 'ESP', 'CM', 23, 88, 91, 8],
  ['esp_bcn', 'M. Wierzbicki', 'م. فيرجبيتسكي', 'POL', 'ST', 38, 84, 84, 9],
  ['esp_bcn', 'Lelinho', 'ليلينيو', 'BRA', 'LW', 29, 87, 87, 11],
  ['esp_mdr', 'B. Courtenay', 'ب. كورتناي', 'FRA', 'CAM', 35, 84, 84, 7],
  ['esp_mdr', 'L. Brezovnik', 'ل. بريزوفنيك', 'SVN', 'GK', 33, 86, 86, 13],
  // Italy
  ['ita_mnz', 'F. Iturbide', 'ف. إيتوربيدي', 'ARG', 'ST', 29, 88, 88, 10],
  ['ita_mnz', 'D. Castelfranco', 'د. كاستلفرانكو', 'ITA', 'CM', 29, 86, 86, 23],
  ['ita_nap', 'G. Tsiklauri', 'غ. تسيكلاوري', 'GEO', 'LW', 25, 86, 89, 77],
  ['ita_tzb', 'N. Radosavljev', 'ن. رادوسافليف', 'SRB', 'ST', 26, 83, 85, 9],
  ['ita_mrn', 'T. Alcobaça', 'ت. ألكوباسا', 'POR', 'LW', 27, 86, 87, 10],
  ['ita_ber', 'C. Nwabuisi', 'ت. نوابويسي', 'NGA', 'LW', 28, 85, 85, 11],
  // Germany
  ['ger_mun', 'H. Brackenridge', 'ه. براكنريدج', 'ENG', 'ST', 33, 90, 90, 9],
  ['ger_mun', 'J. Lindenau', 'ي. ليندناو', 'GER', 'CAM', 23, 89, 93, 42],
  ['ger_mun', 'J. Achterberg', 'ي. أختربيرغ', 'GER', 'RB', 31, 86, 86, 6],
  ['ger_mun', 'M. Steinmetz', 'م. شتاينميتس', 'GER', 'GK', 40, 83, 83, 1],
  ['ger_lev', 'F. Rheinberger', 'ف. راينبيرغر', 'GER', 'CAM', 23, 89, 93, 10],
  ['ger_lev', 'G. Tschanz', 'ج. تشانتس', 'SUI', 'CM', 33, 85, 85, 34],
  ['ger_dor', 'S. Kaloga', 'س. كالوغا', 'GUI', 'ST', 30, 85, 85, 9],
  // France
  ['fra_par', 'O. Vallandry', 'أ. فالاندري', 'FRA', 'RW', 29, 89, 89, 10],
  ['fra_par', 'A. Belmokhtar', 'أ. بلمختار', 'MAR', 'RB', 27, 88, 88, 2],
  ['fra_par', 'V. Salvaterra', 'ف. سالفاتيرا', 'POR', 'CM', 26, 88, 89, 17],
  ['fra_par', 'R. Araripe', 'ر. أراريبي', 'BRA', 'CB', 32, 86, 86, 5],
  ['fra_mar', 'M. Farthingale', 'م. فارذينغيل', 'ENG', 'RW', 25, 84, 86, 10],
  // Egypt
  ['eg1_ahly', 'E. Abdel Mottaleb', 'إ. عبد المطلب', 'EGY', 'CM', 28, 78, 79, 22],
  ['eg1_ahly', 'M. El Ashmawy', 'م. العشماوي', 'EGY', 'GK', 38, 77, 77, 1],
  ['eg1_ahly', 'W. Abu Rumman', 'و. أبو رمان', 'PLE', 'ST', 27, 77, 79, 9],
  ['eg1_ahly', 'M. El Adawy', 'م. العدوي', 'EGY', 'CDM', 28, 76, 77, 19],
  ['eg1_zamalek', 'Semsem', 'سمسم', 'EGY', 'CAM', 30, 78, 78, 10],
  ['eg1_zamalek', 'N. Barghash', 'ن. برغش', 'EGY', 'ST', 30, 74, 74, 9],
  ['eg1_pyramids', 'M. Kalonji', 'م. كالونجي', 'COD', 'ST', 32, 77, 77, 9],
  ['eg1_pyramids', 'M. Oudghiri', 'م. الودغيري', 'MAR', 'CM', 31, 76, 76, 8],
  // Saudi Arabia
  ['ksa_nassr', 'C. Valdemar', 'ك. فالديمار', 'POR', 'ST', 41, 84, 84, 7],
  ['ksa_nassr', 'S. Gueladio', 'س. غيلاديو', 'SEN', 'LW', 34, 83, 83, 10],
  ['ksa_hilal', 'S. Al Haqbani', 'س. الحقباني', 'KSA', 'LW', 34, 80, 80, 29],
  ['ksa_hilal', 'A. Vukadinović', 'أ. فوكادينوفيتش', 'SRB', 'ST', 31, 83, 83, 9],
  ['ksa_hilal', 'Y. Lamghari', 'ي. لمغاري', 'MAR', 'GK', 35, 85, 85, 37],
  ['ksa_ittihad', 'K. Bellevaux', 'ك. بيلفو', 'FRA', 'ST', 38, 84, 84, 9],
  ['ksa_ittihad', 'N. Kandjoura', 'ن. كاندجورا', 'FRA', 'CDM', 35, 83, 83, 7],
];

// Coaches of the famous clubs (everyone else gets a generated name). Fictional, like the stars.
export const COACH_NAMES: Record<string, [string, string]> = {
  eng_mcb: ['J. Ezkurdia', 'خ. إسكورديا'], eng_lgu: ['M. Aizpurua', 'م. أيزبورو'], eng_lvr: ['A. Brinkhorst', 'أ. برينكهورست'], eng_lbl: ['E. Carrozzini', 'إ. كاروتسيني'],
  esp_mdw: ['C. Pieranunzi', 'ك. بييرانونتسي'], esp_bcn: ['H. Wunderlich', 'ه. فوندرليش'], esp_mdr: ['D. Barrenengoa', 'د. بارينينغوا'], ger_mun: ['V. Van Hoorebeke', 'ف. فان هوريبيكه'],
  fra_par: ['L. Garbayo', 'ل. غاربايو'], ita_mnz: ['S. Guidobaldi', 'س. غويدوبالدي'], eg1_ahly: ['M. Brunnschweiler', 'م. برونشفايلر'], eg1_zamalek: ['J. Figueiral', 'ج. فيغيرال'],
  ksa_hilal: ['J. Arrochela', 'ج. أروشيلا'],
};
