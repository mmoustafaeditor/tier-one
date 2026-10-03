// Strings for "The fitness coach's week" on Training (sim/staff.ts weekPlan). EN is the reference; AR is Egyptian Arabic.
import type { UiLang } from './i18n';

interface WeekStrings {
  title: string; sub: string; plan: (load: string, focus: string) => string;
  fit: (fit: number, bar: number) => string;
  load: [string, string, string];
  focus: { recovery: string; opposition: (opp: string) => string; development: string; tactical: string };
  use: string; onIt: string;
}
const en: WeekStrings = {
  title: 'The fitness coach’s week', sub: 'His proposal: take it or set your own',
  plan: (l, f) => `${l} intensity, ${f.toLowerCase()} focus`,
  fit: (f, b) => `The squad is at ${f}% fitness; below ${b}% he calls them tired.`,
  load: ['Tired legs: he would go light.', 'A normal week.', 'A fresh squad early on: he would push them.'],
  focus: { recovery: 'Legs first.', opposition: (o) => `${o} are a real test and we have their report.`, development: 'He leans to the young ones: development.', tactical: 'Work on our own plan.' },
  use: 'Use his week', onIt: 'You’re on his plan',
};
const ar: WeekStrings = {
  title: 'أسبوع مدرب اللياقة', sub: 'اقتراحه: خده أو ظبّط أسبوعك بنفسك',
  plan: (l, f) => `شدة ${l}، والتركيز على ${f}`,
  fit: (f, b) => `لياقة الفريق ${f}%؛ تحت ${b}% بيعتبرهم تعبانين.`,
  load: ['الرجلين تعبانة: هيخففها.', 'أسبوع عادي.', 'الفريق فريش وإحنا في الأول: هيضغط عليهم.'],
  focus: { recovery: 'الرجلين الأول.', opposition: (o) => `${o} اختبار حقيقي ومعانا تقريرهم.`, development: 'بيميل للصغيرين: تطوير.', tactical: 'نشتغل على خطتنا.' },
  use: 'خد أسبوعه', onIt: 'إنت ماشي على خطته',
};
const es: WeekStrings = {
  title: 'La semana del preparador físico', sub: 'Su propuesta: acéptala o haz la tuya',
  plan: (l, f) => `Intensidad ${l.toLowerCase()}, enfoque en ${f.toLowerCase()}`,
  fit: (f, b) => `La plantilla está al ${f}% de forma; por debajo del ${b}% la ve cansada.`,
  load: ['Piernas cansadas: iría suave.', 'Una semana normal.', 'Plantilla fresca al principio: apretaría.'],
  focus: { recovery: 'Primero las piernas.', opposition: (o) => `${o} es una prueba de verdad y tenemos su informe.`, development: 'Tira por los jóvenes: desarrollo.', tactical: 'Trabajar nuestro plan.' },
  use: 'Usar su semana', onIt: 'Sigues su plan',
};
const fr: WeekStrings = {
  title: 'La semaine du préparateur physique', sub: 'Sa proposition : à prendre ou à refaire',
  plan: (l, f) => `Intensité ${l.toLowerCase()}, priorité ${f.toLowerCase()}`,
  fit: (f, b) => `L’effectif est à ${f} % de forme ; sous ${b} %, il le juge fatigué.`,
  load: ['Jambes lourdes : il allégerait.', 'Une semaine normale.', 'Effectif frais en début de saison : il pousserait.'],
  focus: { recovery: 'Les jambes d’abord.', opposition: (o) => `${o} est un vrai test et on a leur rapport.`, development: 'Il penche pour les jeunes : progression.', tactical: 'Travailler notre plan.' },
  use: 'Prendre sa semaine', onIt: 'Tu suis son plan',
};
export const WP: Record<UiLang, WeekStrings> = { en, ar, es, fr };
