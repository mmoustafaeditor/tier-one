// Hand-made star players with NEAR-REAL names (studio decision): recognisable, never the real name.
// The old game had real stars (rp_* in its data); here each star belongs to exactly one club (E2E #31).
// Row: [clubId, English name, Arabic name, nationality, position, age in 2026, rating, potential, shirt number]
import type { Position } from '../model/types';

export type StarRow = [string, string, string, string, Position, number, number, number, number];

// Nicknames (the old game had one for most players), by English name.
export const NICKS: Record<string, [string, string]> = {
  'M. Salaah': ['The Egyptian King', 'الملك المصري'], 'E. Haalund': ['The Terminator', 'المدمّر'], 'K. Mbapeh': ['The Rocket', 'الصاروخ'],
  'V. van Dyke': ['The Wall', 'الحيطة'], 'L. Yamaal': ['The Wonderkid', 'الجوهرة'], 'Zeezo': ['The Prince', 'البرنس'],
  'E. Ashour': ['The Engine', 'الموتور'], 'M. El Shenawy': ['The Octopus', 'الأخطبوط'], 'C. Ronaldu': ['The Legend', 'الأسطورة'],
  'J. Musialla': ['The Magician', 'الساحر'], 'B. Sakka': ['Golden Boy', 'الفتى الذهبي'], 'H. Kaine': ['The Goal Machine', 'ماكينة الأجوان'],
  'Y. Bunou': ['The Cat', 'القطة'], 'M. Odegard': ['The Maestro', 'المايسترو'], 'S. Al Dosari': ['The Tornado', 'التورنيدو'],
};

export const STARS: StarRow[] = [
  // England
  ['eng_lvr', 'M. Salaah', 'م. صلاح', 'EGY', 'RW', 34, 88, 88, 11],
  ['eng_lvr', 'V. van Dyke', 'ف. فان دايك', 'NED', 'CB', 35, 86, 86, 4],
  ['eng_lvr', 'A. Mac Alistair', 'أ. ماك أليستر', 'ARG', 'CM', 27, 85, 86, 10],
  ['eng_mcb', 'E. Haalund', 'إ. هالوند', 'NOR', 'ST', 26, 91, 93, 9],
  ['eng_mcb', 'Rodree', 'رودري', 'ESP', 'CDM', 30, 89, 89, 16],
  ['eng_mcb', 'P. Fodden', 'ف. فودن', 'ENG', 'CAM', 26, 86, 88, 47],
  ['eng_lgu', 'B. Sakka', 'ب. ساكا', 'ENG', 'RW', 25, 88, 90, 7],
  ['eng_lgu', 'M. Odegard', 'م. أوديجارد', 'NOR', 'CAM', 27, 87, 88, 8],
  ['eng_lgu', 'W. Salibah', 'و. صليبا', 'FRA', 'CB', 25, 87, 89, 2],
  ['eng_lgu', 'D. Rize', 'د. رايز', 'ENG', 'CM', 27, 87, 88, 41],
  ['eng_lbl', 'C. Palmar', 'ك. بالمار', 'ENG', 'CAM', 24, 87, 90, 20],
  ['eng_lbl', 'M. Caisedo', 'م. كايسيدو', 'ECU', 'CDM', 24, 85, 88, 25],
  ['eng_mcr', 'B. Fernandez', 'ب. فيرنانديز', 'POR', 'CAM', 31, 85, 85, 8],
  ['eng_nls', 'Son H.', 'سون', 'KOR', 'LW', 34, 83, 83, 7],
  ['eng_avl', 'O. Watkinz', 'أ. واتكينز', 'ENG', 'ST', 30, 84, 84, 11],
  // Spain
  ['esp_mdw', 'K. Mbapeh', 'ك. مبابيه', 'FRA', 'ST', 27, 91, 92, 9],
  ['esp_mdw', 'V. Junyor', 'ف. جونيور', 'BRA', 'LW', 26, 89, 91, 7],
  ['esp_mdw', 'J. Bellinghum', 'ج. بيلينجهام', 'ENG', 'CAM', 23, 89, 93, 5],
  ['esp_mdw', 'F. Valverdi', 'ف. فالفيردي', 'URU', 'CM', 28, 88, 88, 8],
  ['esp_mdw', 'T. Curtois', 'ت. كورتوا', 'BEL', 'GK', 34, 88, 88, 1],
  ['esp_bcn', 'L. Yamaal', 'ل. يامال', 'ESP', 'RW', 19, 88, 95, 19],
  ['esp_bcn', 'Pedry', 'بيدري', 'ESP', 'CM', 23, 88, 91, 8],
  ['esp_bcn', 'R. Lewandowsky', 'ر. ليفاندوفسكي', 'POL', 'ST', 38, 84, 84, 9],
  ['esp_bcn', 'Rafinya', 'رافينيا', 'BRA', 'LW', 29, 87, 87, 11],
  ['esp_mdr', 'A. Griezmen', 'أ. جريزمان', 'FRA', 'CAM', 35, 84, 84, 7],
  ['esp_mdr', 'J. Oblack', 'ي. أوبلاك', 'SVN', 'GK', 33, 86, 86, 13],
  // Italy
  ['ita_mnz', 'L. Martinas', 'ل. مارتيناس', 'ARG', 'ST', 29, 88, 88, 10],
  ['ita_mnz', 'N. Barela', 'ن. باريلا', 'ITA', 'CM', 29, 86, 86, 23],
  ['ita_nap', 'K. Kvaradona', 'خ. كفارادونا', 'GEO', 'LW', 25, 86, 89, 77],
  ['ita_tzb', 'D. Vlahovik', 'د. فلاهوفيتش', 'SRB', 'ST', 26, 83, 85, 9],
  ['ita_mrn', 'R. Leaoo', 'ر. لياو', 'POR', 'LW', 27, 86, 87, 10],
  ['ita_ber', 'A. Lookmann', 'أ. لوكمان', 'NGA', 'LW', 28, 85, 85, 11],
  // Germany
  ['ger_mun', 'H. Kaine', 'ه. كين', 'ENG', 'ST', 33, 90, 90, 9],
  ['ger_mun', 'J. Musialla', 'ج. موسيالا', 'GER', 'CAM', 23, 89, 93, 42],
  ['ger_mun', 'J. Kimmik', 'ي. كيميك', 'GER', 'RB', 31, 86, 86, 6],
  ['ger_mun', 'M. Noyer', 'م. نوير', 'GER', 'GK', 40, 83, 83, 1],
  ['ger_lev', 'F. Wirts', 'ف. فيرتس', 'GER', 'CAM', 23, 89, 93, 10],
  ['ger_lev', 'G. Xakha', 'ج. تشاكا', 'SUI', 'CM', 33, 85, 85, 34],
  ['ger_dor', 'S. Guirasi', 'س. جيراسي', 'GUI', 'ST', 30, 85, 85, 9],
  // France
  ['fra_par', 'O. Dembelé', 'ع. ديمبيليه', 'FRA', 'RW', 29, 89, 89, 10],
  ['fra_par', 'A. Hakimee', 'أ. حكيمي', 'MAR', 'RB', 27, 88, 88, 2],
  ['fra_par', 'Vitinya', 'فيتينيا', 'POR', 'CM', 26, 88, 89, 17],
  ['fra_par', 'Markinhos', 'ماركينيوس', 'BRA', 'CB', 32, 86, 86, 5],
  ['fra_mar', 'M. Greenwud', 'م. جرينوود', 'ENG', 'RW', 25, 84, 86, 10],
  // Egypt
  ['eg1_ahly', 'E. Ashour', 'إ. عاشور', 'EGY', 'CM', 28, 78, 79, 22],
  ['eg1_ahly', 'M. El Shenawy', 'م. الشناوي', 'EGY', 'GK', 38, 77, 77, 1],
  ['eg1_ahly', 'W. Abu Ali', 'و. أبو علي', 'PLE', 'ST', 27, 77, 79, 9],
  ['eg1_ahly', 'M. Attiya', 'م. عطية', 'EGY', 'CDM', 28, 76, 77, 19],
  ['eg1_zamalek', 'Zeezo', 'زيزو', 'EGY', 'CAM', 30, 78, 78, 10],
  ['eg1_zamalek', 'N. Mansy', 'ن. منسي', 'EGY', 'ST', 30, 74, 74, 9],
  ['eg1_pyramids', 'M. Mayeli', 'ف. مايلي', 'COD', 'ST', 32, 77, 77, 9],
  ['eg1_pyramids', 'M. El Karti', 'م. الكرتي', 'MAR', 'CM', 31, 76, 76, 8],
  // Saudi Arabia
  ['ksa_nassr', 'C. Ronaldu', 'ك. رونالدو', 'POR', 'ST', 41, 84, 84, 7],
  ['ksa_nassr', 'S. Maneh', 'س. ماني', 'SEN', 'LW', 34, 83, 83, 10],
  ['ksa_hilal', 'S. Al Dosari', 'س. الدوسري', 'KSA', 'LW', 34, 80, 80, 29],
  ['ksa_hilal', 'A. Mitrovik', 'أ. ميتروفيتش', 'SRB', 'ST', 31, 83, 83, 9],
  ['ksa_hilal', 'Y. Bunou', 'ي. بونو', 'MAR', 'GK', 35, 85, 85, 37],
  ['ksa_ittihad', 'K. Benzima', 'ك. بنزيما', 'FRA', 'ST', 38, 84, 84, 9],
  ['ksa_ittihad', 'N. Kanteh', 'ن. كانتي', 'FRA', 'CDM', 35, 83, 83, 7],
];
