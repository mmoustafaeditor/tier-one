// Strings for the "About the job" panel on the new-career club page (ui2/NewCareer.tsx). EN is the reference; AR is
// Egyptian Arabic. Every line is a fact computed from the world, never a promise.
import type { UiLang } from './i18n';

interface JobStrings {
  title: string;
  strength: (rank: number, of: number) => string;
  budget: (rank: number, of: number) => string;
  age: (avg: string, lg: string) => string;
  derby: (clubs: string) => string;
  deals: (n: number) => string;
}
const th = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]}`;

const en: JobStrings = {
  title: 'About the job',
  strength: (r, of) => (r === 1 ? `The strongest squad of ${of} in the league.` : `The ${th(r)} strongest squad of ${of} in the league.`),
  budget: (r, of) => (r === 1 ? `The biggest transfer budget of ${of}.` : `The ${th(r)} biggest transfer budget of ${of}.`),
  age: (a, lg) => `Average age ${a} (league ${lg}).`,
  derby: (cl) => `Derby: ${cl}. Those results count extra with the board and the fans.`,
  deals: (n) => (n ? `${n} of the first eleven ${n === 1 ? 'is' : 'are'} out of contract next summer.` : 'Nobody in the first eleven is out of contract next summer.'),
};
const ar: JobStrings = {
  title: 'عن الشغلانة',
  strength: (r, of) => (r === 1 ? `أقوى فريق من ${of} في الدوري.` : `الفريق رقم ${r} في القوة من ${of} في الدوري.`),
  budget: (r, of) => (r === 1 ? `أكبر ميزانية انتقالات من ${of}.` : `ميزانية الانتقالات رقم ${r} من ${of}.`),
  age: (a, lg) => `متوسط السن ${a} (الدوري ${lg}).`,
  derby: (cl) => `الديربي: ${cl}. نتايجه بتتحسب أكتر عند الإدارة والجمهور.`,
  deals: (n) => (n ? `${n} من التشكيلة الأساسية عقودهم بتخلص الصيف الجاي.` : 'مفيش حد من التشكيلة الأساسية عقده بيخلص الصيف الجاي.'),
};
const es: JobStrings = {
  title: 'Sobre el puesto',
  strength: (r, of) => (r === 1 ? `La plantilla más fuerte de ${of} en la liga.` : `La ${r}.ª plantilla más fuerte de ${of} en la liga.`),
  budget: (r, of) => (r === 1 ? `El mayor presupuesto de fichajes de ${of}.` : `El ${r}.º mayor presupuesto de fichajes de ${of}.`),
  age: (a, lg) => `Edad media ${a} (liga ${lg}).`,
  derby: (cl) => `Derbi: ${cl}. Esos resultados pesan más para la directiva y la afición.`,
  deals: (n) => (n ? `${n} del once ${n === 1 ? 'acaba' : 'acaban'} contrato el próximo verano.` : 'Nadie del once acaba contrato el próximo verano.'),
};
const fr: JobStrings = {
  title: 'Le poste',
  strength: (r, of) => (r === 1 ? `L’effectif le plus fort sur ${of} dans le championnat.` : `${r}e effectif le plus fort sur ${of} dans le championnat.`),
  budget: (r, of) => (r === 1 ? `Le plus gros budget transferts sur ${of}.` : `${r}e budget transferts sur ${of}.`),
  age: (a, lg) => `Âge moyen ${a} (championnat ${lg}).`,
  derby: (cl) => `Derby : ${cl}. Ces résultats comptent double pour la direction et les supporters.`,
  deals: (n) => (n ? `${n} titulaire${n > 1 ? 's' : ''} en fin de contrat l’été prochain.` : 'Aucun titulaire en fin de contrat l’été prochain.'),
};

export const JB: Record<UiLang, JobStrings> = { en, ar, es, fr };
