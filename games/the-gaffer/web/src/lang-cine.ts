// Strings for the cinematic UI rebuild (reference pack v2): the desk, the squad and transfer landings, the live match.
// EN is the reference; AR is Egyptian Arabic.
import type { UiLang } from './i18n';

const P = (n: number, one: string, many: string) => (n === 1 ? one : many);

interface CineStrings {
  nextMatch: string;
  vs: string;
  desk: string;
  around: string;
  coming: string;
  fixtures: string;
  table: string;
  available: (a: number, b: number) => string;
  firstWeek: string;
  guide: string;
  closeGuide: string;
  inbox: string;
  newMsgs: (n: number) => string;
  prepare: (day: string) => string;
  winChance: (p: string) => string;
  leagueLine: (pos: string, played: number) => string;
  home: string;
  away: string;
  assistant: string;
  // squad
  avgAge: string;
  perMonth: string;
  wageBill: string;
  unhappy: string;
  players: (n: number) => string;
  planner: string;
  viewAll: (n: number) => string;
  showFewer: string;
  dealsEnding: (n: number) => string;
  review: string;
  listed: string;
  onLoan: string;
  colPlayer: string;
  colPos: string;
  colFit: string;
  colMood: string;
  colYears: string;
  depth: string;
  contracts: string;
  // transfers
  windowOpen: (n: number) => string;
  windowShut: string;
  transferRoom: string;
  wageRoom: string;
  committed: string;
  // live
  pitch: string;
  stats: string;
  commentary: string;
  keyMoments: string;
  matchStats: string;
  latest: string;
  makeChanges: string;
  nextDecision: string;
  speed: string;
  possession: string;
  shots: string;
  onTarget: string;
  xg: string;
  matchPlan: string;
  stages: [string, string, string, string];
  toMatch: string;
}

const en: CineStrings = {
  nextMatch: 'Next match', vs: 'vs', desk: 'Manager’s desk', around: 'Around the club', coming: 'Coming up', fixtures: 'Fixtures', table: 'Table',
  available: (a, b) => `${a}/${b} players available`,
  firstWeek: 'First week', guide: 'Guide', closeGuide: 'Fold the guide',
  inbox: 'Inbox', newMsgs: (n) => (n ? `${n} new ${P(n, 'message', 'messages')}` : 'No new messages'),
  prepare: (day) => `Prepare for ${day}`, winChance: (p) => `Win ${p}`,
  leagueLine: (pos, n) => (n ? `${pos} after ${n}` : 'Season yet to start'),
  home: 'Home', away: 'Away', assistant: 'Assistant',
  avgAge: 'avg age', perMonth: '/month', wageBill: 'wage bill', unhappy: 'unhappy', players: (n) => `${n} ${P(n, 'player', 'players')}`,
  planner: 'Squad planner', viewAll: (n) => `View all ${n} players`, showFewer: 'Show fewer',
  dealsEnding: (n) => `${n} ${P(n, 'deal ends', 'deals end')} this season`, review: 'Review', listed: 'Transfer listed', onLoan: 'Out on loan',
  colPlayer: 'Player', colPos: 'Position · rating', colFit: 'Fit', colMood: 'Mood', colYears: 'Years', depth: 'Depth', contracts: 'Contracts',
  windowOpen: (n) => `Window open · ${n} ${P(n, 'matchday', 'matchdays')} left`, windowShut: 'Window shut',
  transferRoom: 'Transfer room', wageRoom: 'Wage room / month', committed: 'Committed',
  pitch: 'Pitch', stats: 'Stats', commentary: 'Commentary', keyMoments: 'Key moments', matchStats: 'Match stats', latest: 'Latest event',
  makeChanges: 'Make changes', nextDecision: 'Next decision', speed: 'Match speed',
  possession: 'Possession', shots: 'Shots', onTarget: 'On target', xg: 'xG',
  matchPlan: 'Your match plan', toMatch: 'Continue to match',
  stages: ['Needs', 'Targets', 'Talks', 'Deals'],
};
const ar: CineStrings = {
  nextMatch: 'الماتش الجاي', vs: 'ضد', desk: 'مكتب المدير', around: 'حوالين النادي', coming: 'اللي جاي', fixtures: 'المواعيد', table: 'الجدول',
  available: (a, b) => `${a}/${b} لاعيبة جاهزين`,
  firstWeek: 'أول أسبوع', guide: 'الدليل', closeGuide: 'اقفل الدليل',
  inbox: 'البريد', newMsgs: (n) => (n ? `${n} ${n === 1 ? 'رسالة جديدة' : 'رسايل جديدة'}` : 'مفيش رسايل جديدة'),
  prepare: (day) => `جهّز لماتش ${day}`, winChance: (p) => `فوز ${p}`,
  leagueLine: (pos, n) => (n ? `${pos} بعد ${n} ماتش` : 'الموسم لسه مابداش'),
  home: 'على أرضنا', away: 'برة', assistant: 'المساعد',
  avgAge: 'متوسط السن', perMonth: '/شهر', wageBill: 'المرتبات', unhappy: 'زعلانين', players: (n) => `${n} ${n === 1 ? 'لاعب' : 'لاعيبة'}`,
  planner: 'تخطيط الفريق', viewAll: (n) => `اعرض الـ ${n} لاعب كلهم`, showFewer: 'اعرض أقل',
  dealsEnding: (n) => `${n} ${n === 1 ? 'عقد بيخلص' : 'عقود بتخلص'} الموسم ده`, review: 'راجع', listed: 'معروضين للبيع', onLoan: 'معارين',
  colPlayer: 'اللاعب', colPos: 'المركز · التقييم', colFit: 'اللياقة', colMood: 'المزاج', colYears: 'سنين', depth: 'العمق', contracts: 'العقود',
  windowOpen: (n) => `الميركاتو مفتوح · فاضل ${n} ${n === 1 ? 'جولة' : 'جولات'}`, windowShut: 'الميركاتو مقفول',
  transferRoom: 'فلوس الصفقات', wageRoom: 'مساحة المرتبات / شهر', committed: 'متدفعة',
  pitch: 'الملعب', stats: 'الأرقام', commentary: 'التعليق', keyMoments: 'أهم اللحظات', matchStats: 'أرقام الماتش', latest: 'آخر حاجة حصلت',
  makeChanges: 'اعمل تغييرات', nextDecision: 'القرار الجاي', speed: 'سرعة الماتش',
  possession: 'الاستحواذ', shots: 'التسديدات', onTarget: 'على المرمى', xg: 'xG',
  matchPlan: 'خطة الماتش', toMatch: 'كمّل للماتش',
  stages: ['الاحتياجات', 'الأهداف', 'المفاوضات', 'الصفقات'],
};
const es: CineStrings = {
  nextMatch: 'Próximo partido', vs: 'vs', desk: 'Despacho del míster', around: 'En el club', coming: 'Lo que viene', fixtures: 'Calendario', table: 'Clasificación',
  available: (a, b) => `${a}/${b} jugadores disponibles`,
  firstWeek: 'Primera semana', guide: 'Guía', closeGuide: 'Plegar la guía',
  inbox: 'Bandeja', newMsgs: (n) => (n ? `${n} ${P(n, 'mensaje nuevo', 'mensajes nuevos')}` : 'Sin mensajes nuevos'),
  prepare: (day) => `Preparar el ${day}`, winChance: (p) => `Victoria ${p}`,
  leagueLine: (pos, n) => (n ? `${pos} tras ${n}` : 'La temporada aún no empieza'),
  home: 'En casa', away: 'Fuera', assistant: 'Ayudante',
  avgAge: 'edad media', perMonth: '/mes', wageBill: 'masa salarial', unhappy: 'descontentos', players: (n) => `${n} ${P(n, 'jugador', 'jugadores')}`,
  planner: 'Planificación', viewAll: (n) => `Ver los ${n} jugadores`, showFewer: 'Ver menos',
  dealsEnding: (n) => `${n} ${P(n, 'contrato acaba', 'contratos acaban')} esta temporada`, review: 'Revisar', listed: 'Transferibles', onLoan: 'Cedidos',
  colPlayer: 'Jugador', colPos: 'Posición · nivel', colFit: 'Forma', colMood: 'Ánimo', colYears: 'Años', depth: 'Fondo', contracts: 'Contratos',
  windowOpen: (n) => `Mercado abierto · ${n} ${P(n, 'jornada', 'jornadas')}`, windowShut: 'Mercado cerrado',
  transferRoom: 'Margen de fichajes', wageRoom: 'Margen salarial / mes', committed: 'Comprometido',
  pitch: 'Campo', stats: 'Datos', commentary: 'Narración', keyMoments: 'Momentos clave', matchStats: 'Datos del partido', latest: 'Última jugada',
  makeChanges: 'Hacer cambios', nextDecision: 'Próxima decisión', speed: 'Velocidad',
  possession: 'Posesión', shots: 'Tiros', onTarget: 'A puerta', xg: 'xG',
  matchPlan: 'Tu plan de partido', toMatch: 'Ir al partido',
  stages: ['Necesidades', 'Objetivos', 'Negociación', 'Fichajes'],
};
const fr: CineStrings = {
  nextMatch: 'Prochain match', vs: 'vs', desk: 'Bureau du coach', around: 'Autour du club', coming: 'À venir', fixtures: 'Calendrier', table: 'Classement',
  available: (a, b) => `${a}/${b} joueurs disponibles`,
  firstWeek: 'Première semaine', guide: 'Guide', closeGuide: 'Replier le guide',
  inbox: 'Messagerie', newMsgs: (n) => (n ? `${n} ${P(n, 'nouveau message', 'nouveaux messages')}` : 'Aucun nouveau message'),
  prepare: (day) => `Préparer ${day}`, winChance: (p) => `Victoire ${p}`,
  leagueLine: (pos, n) => (n ? `${pos} après ${n}` : 'La saison n’a pas commencé'),
  home: 'Domicile', away: 'Extérieur', assistant: 'Adjoint',
  avgAge: 'âge moyen', perMonth: '/mois', wageBill: 'masse salariale', unhappy: 'mécontents', players: (n) => `${n} ${P(n, 'joueur', 'joueurs')}`,
  planner: 'Planification', viewAll: (n) => `Voir les ${n} joueurs`, showFewer: 'Voir moins',
  dealsEnding: (n) => `${n} ${P(n, 'contrat s’achève', 'contrats s’achèvent')} cette saison`, review: 'Voir', listed: 'Sur la liste', onLoan: 'Prêtés',
  colPlayer: 'Joueur', colPos: 'Poste · niveau', colFit: 'Forme', colMood: 'Moral', colYears: 'Ans', depth: 'Profondeur', contracts: 'Contrats',
  windowOpen: (n) => `Mercato ouvert · ${n} ${P(n, 'journée', 'journées')}`, windowShut: 'Mercato fermé',
  transferRoom: 'Marge transferts', wageRoom: 'Marge salariale / mois', committed: 'Engagé',
  pitch: 'Terrain', stats: 'Stats', commentary: 'Commentaire', keyMoments: 'Moments clés', matchStats: 'Stats du match', latest: 'Dernière action',
  makeChanges: 'Faire des changements', nextDecision: 'Prochaine décision', speed: 'Vitesse',
  possession: 'Possession', shots: 'Tirs', onTarget: 'Cadrés', xg: 'xG',
  matchPlan: 'Ton plan de match', toMatch: 'Aller au match',
  stages: ['Besoins', 'Cibles', 'Négociations', 'Accords'],
};

export const CN: Record<UiLang, CineStrings> = { en, ar, es, fr };
