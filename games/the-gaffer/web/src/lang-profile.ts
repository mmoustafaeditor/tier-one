// Strings for "Your style, from what you've done" on Career (ui2/Profile.tsx). EN is the reference; AR is Egyptian Arabic.
import type { UiLang } from './i18n';

interface ProfileStrings {
  title: string; sub: string;
  play: (style: string, shape: string) => string;
  market: { buyer: string; seller: string; balanced: string; none: string };
  marketLine: (spent: string, raised: string, n: number, age: string) => string;
  word: { keeps: string; breaks: string; mixed: string; none: string };
  wordLine: (kept: number, broken: number) => string;
  youth: { builder: string; some: string; none: string }; youthLine: (n: number) => string;
  control: { hands: string; balanced: string; delegator: string }; controlLine: (me: number, of: number) => string;
}
const en: ProfileStrings = {
  title: 'Your style, from what you’ve done', sub: 'Read from your career, not a quiz',
  play: (s, f) => `Plays “${s}” in a ${f}`,
  market: { buyer: 'A buyer', seller: 'A seller', balanced: 'Buys and sells in balance', none: 'Hasn’t been to the market yet' },
  marketLine: (sp, r, n, a) => `${n} ${n === 1 ? 'signing' : 'signings'} for ${sp}, ${r} raised${a ? ` · signings average ${a} years old` : ''}`,
  word: { keeps: 'Keeps his word', breaks: 'Breaks his word', mixed: 'Keeps some promises, breaks others', none: 'Hasn’t made promises yet' },
  wordLine: (k, b) => `${k} kept, ${b} broken`,
  youth: { builder: 'Builds with the academy', some: 'Gives the academy a chance', none: 'No academy players in the squad' }, youthLine: (n) => `${n} homegrown ${n === 1 ? 'player' : 'players'} in the squad`,
  control: { hands: 'Hands-on', balanced: 'Shares the work', delegator: 'Delegates' }, controlLine: (m, o) => `Runs ${m} of ${o} departments himself`,
};
const ar: ProfileStrings = {
  title: 'أسلوبك، من اللي عملته', sub: 'متاخد من مشوارك، مش من استبيان',
  play: (s, f) => `بيلعب «${s}» بـ${f}`,
  market: { buyer: 'بيشتري', seller: 'بيبيع', balanced: 'بيشتري ويبيع بتوازن', none: 'لسه ما نزلش السوق' },
  marketLine: (sp, r, n, a) => `${n} صفقة بـ${sp}، وجاب ${r} من البيع${a ? ` · متوسط سن الصفقات ${a} سنة` : ''}`,
  word: { keeps: 'بيوفي بكلمته', breaks: 'بيخلف كلمته', mixed: 'بيوفي بشوية وعود وبيخلف شوية', none: 'لسه ما وعدش حد' },
  wordLine: (k, b) => `${k} اتوفى، ${b} اتخلف`,
  youth: { builder: 'بيبني بالناشئين', some: 'بيدي فرصة للناشئين', none: 'مفيش ناشئين من النادي في الفريق' }, youthLine: (n) => `${n} من ناشئي النادي في الفريق`,
  control: { hands: 'ماسك كل حاجة بنفسه', balanced: 'بيقسم الشغل', delegator: 'بيسيب للجهاز' }, controlLine: (m, o) => `ماسك ${m} من ${o} أقسام بنفسه`,
};
const es: ProfileStrings = {
  title: 'Tu estilo, por lo que has hecho', sub: 'Sale de tu carrera, no de un test',
  play: (s, f) => `Juega «${s}» con un ${f}`,
  market: { buyer: 'Comprador', seller: 'Vendedor', balanced: 'Compra y vende en equilibrio', none: 'Aún no ha ido al mercado' },
  marketLine: (sp, r, n, a) => `${n} ${n === 1 ? 'fichaje' : 'fichajes'} por ${sp}, ${r} ingresados${a ? ` · edad media de los fichajes ${a}` : ''}`,
  word: { keeps: 'Cumple su palabra', breaks: 'Rompe su palabra', mixed: 'Cumple unas promesas y rompe otras', none: 'Aún no ha prometido nada' },
  wordLine: (k, b) => `${k} cumplidas, ${b} rotas`,
  youth: { builder: 'Construye con la cantera', some: 'Da oportunidades a la cantera', none: 'Ningún canterano en la plantilla' }, youthLine: (n) => `${n} ${n === 1 ? 'canterano' : 'canteranos'} en la plantilla`,
  control: { hands: 'Lo controla todo', balanced: 'Reparte el trabajo', delegator: 'Delega' }, controlLine: (m, o) => `Lleva ${m} de ${o} áreas él mismo`,
};
const fr: ProfileStrings = {
  title: 'Votre style, d’après vos actes', sub: 'Tiré de votre carrière, pas d’un questionnaire',
  play: (s, f) => `Joue « ${s} » en ${f}`,
  market: { buyer: 'Acheteur', seller: 'Vendeur', balanced: 'Achète et vend à l’équilibre', none: 'Pas encore passé par le marché' },
  marketLine: (sp, r, n, a) => `${n} recrue${n > 1 ? 's' : ''} pour ${sp}, ${r} encaissés${a ? ` · âge moyen des recrues ${a} ans` : ''}`,
  word: { keeps: 'Tient parole', breaks: 'Ne tient pas parole', mixed: 'Tient certaines promesses, pas d’autres', none: 'Aucune promesse pour l’instant' },
  wordLine: (k, b) => `${k} tenues, ${b} rompues`,
  youth: { builder: 'Construit avec le centre de formation', some: 'Donne sa chance aux jeunes', none: 'Aucun joueur formé au club dans l’effectif' }, youthLine: (n) => `${n} joueur${n > 1 ? 's' : ''} formé${n > 1 ? 's' : ''} au club dans l’effectif`,
  control: { hands: 'Contrôle tout', balanced: 'Partage le travail', delegator: 'Délègue' }, controlLine: (m, o) => `Gère lui-même ${m} services sur ${o}`,
};
export const PF: Record<UiLang, ProfileStrings> = { en, ar, es, fr };
