// Strings for the squad planner panel (ui2/Planner.tsx). EN is the reference; AR is Egyptian Arabic.
import type { UiLang } from './i18n';

interface PlannerStrings {
  title: string;
  sub: string;
  lines: [string, string, string, string];
  players: (n: number, out: number) => string;
  roles: (first: number, rot: number, pros: number) => string;
  deals: (now: number, next: number) => string;
  dealsNone: string;
  age: (avg: string, old: number) => string;
  ok: string;
  more: string;
  less: string;
}

const en: PlannerStrings = {
  title: 'Squad planner',
  sub: 'Each line: roles, deals running out, age, and what the scouts say we need',
  lines: ['Goalkeepers', 'Defence', 'Midfield', 'Attack'],
  players: (n, out) => `${n} ${n === 1 ? 'player' : 'players'}${out ? ` · ${out} out` : ''}`,
  roles: (f, r, p) => `First choice ${f} · Rotation ${r} · Prospects ${p}`,
  deals: (now, next) => [now ? `${now} ${now === 1 ? 'deal ends' : 'deals end'} this season` : '', next ? (now ? `${next} next season` : `${next} ${next === 1 ? 'deal ends' : 'deals end'} next season`) : ''].filter(Boolean).join(' · '),
  dealsNone: 'No deals ending soon',
  age: (avg, old) => `Average age ${avg}${old ? ` · ${old} aged 31+` : ''}`,
  ok: 'Covered',
  more: 'Open the plan',
  less: 'Fold it',
};
const ar: PlannerStrings = {
  title: 'تخطيط الفريق',
  sub: 'كل خط: الأدوار، العقود اللي خلصانة، الأعمار، والكشافين شايفين ناقصنا إيه',
  lines: ['حراس المرمى', 'الدفاع', 'الوسط', 'الهجوم'],
  players: (n, out) => `${n} ${n === 1 ? 'لاعب' : 'لاعيبة'}${out ? ` · ${out} غايب` : ''}`,
  roles: (f, r, p) => `أساسي ${f} · تدوير ${r} · مواهب ${p}`,
  deals: (now, next) => [now ? `${now} عقد بيخلص الموسم ده` : '', next ? (now ? `${next} الموسم الجاي` : `${next} عقد بيخلص الموسم الجاي`) : ''].filter(Boolean).join(' · '),
  dealsNone: 'مفيش عقود هتخلص قريب',
  age: (avg, old) => `متوسط السن ${avg}${old ? ` · ${old} عندهم 31 أو أكتر` : ''}`,
  ok: 'متغطي',
  more: 'افتح الخطة',
  less: 'اقفلها',
};
const es: PlannerStrings = {
  title: 'Planificación de plantilla',
  sub: 'Cada línea: roles, contratos que terminan, edad y lo que piden los ojeadores',
  lines: ['Porteros', 'Defensa', 'Medio campo', 'Ataque'],
  players: (n, out) => `${n} ${n === 1 ? 'jugador' : 'jugadores'}${out ? ` · ${out} de baja` : ''}`,
  roles: (f, r, p) => `Titulares ${f} · Rotación ${r} · Promesas ${p}`,
  deals: (now, next) => [now ? `${now} ${now === 1 ? 'contrato acaba' : 'contratos acaban'} esta temporada` : '', next ? (now ? `${next} la próxima` : `${next} ${next === 1 ? 'contrato acaba' : 'contratos acaban'} la próxima temporada`) : ''].filter(Boolean).join(' · '),
  dealsNone: 'Ningún contrato acaba pronto',
  age: (avg, old) => `Edad media ${avg}${old ? ` · ${old} con 31+` : ''}`,
  ok: 'Cubierto',
  more: 'Abrir el plan',
  less: 'Plegar',
};
const fr: PlannerStrings = {
  title: 'Planification de l’effectif',
  sub: 'Chaque ligne : rôles, contrats qui s’achèvent, âge et ce que les recruteurs réclament',
  lines: ['Gardiens', 'Défense', 'Milieu', 'Attaque'],
  players: (n, out) => `${n} ${n === 1 ? 'joueur' : 'joueurs'}${out ? ` · ${out} indisponible${out > 1 ? 's' : ''}` : ''}`,
  roles: (f, r, p) => `Titulaires ${f} · Rotation ${r} · Espoirs ${p}`,
  deals: (now, next) => [now ? `${now} ${now === 1 ? 'contrat s’achève' : 'contrats s’achèvent'} cette saison` : '', next ? (now ? `${next} la suivante` : `${next} ${next === 1 ? 'contrat s’achève' : 'contrats s’achèvent'} la saison suivante`) : ''].filter(Boolean).join(' · '),
  dealsNone: 'Aucun contrat ne s’achève bientôt',
  age: (avg, old) => `Âge moyen ${avg}${old ? ` · ${old} de 31 ans et plus` : ''}`,
  ok: 'Couvert',
  more: 'Ouvrir le plan',
  less: 'Replier',
};

export const PL: Record<UiLang, PlannerStrings> = { en, ar, es, fr };
