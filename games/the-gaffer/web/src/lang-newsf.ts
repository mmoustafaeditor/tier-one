// Strings for the news filters (ui2/News.tsx). EN is the reference; AR is Egyptian Arabic.
import type { UiLang } from './i18n';
import type { NewsCat } from './model/types';

interface NewsFStrings { all: string; mine: string; cat: Record<NewsCat, string>; none: string }
const en: NewsFStrings = { all: 'All', mine: 'Our club', cat: { results: 'Results', transfers: 'Transfers', managers: 'Managers', youth: 'Youth', records: 'Records', crisis: 'Crisis', room: 'Dressing rooms' }, none: 'Nothing in this section yet.' };
const ar: NewsFStrings = { all: 'الكل', mine: 'نادينا', cat: { results: 'النتايج', transfers: 'الانتقالات', managers: 'المدربين', youth: 'الناشئين', records: 'الأرقام', crisis: 'الأزمات', room: 'غرف اللبس' }, none: 'لسه مفيش حاجة في القسم ده.' };
const es: NewsFStrings = { all: 'Todo', mine: 'Nuestro club', cat: { results: 'Resultados', transfers: 'Fichajes', managers: 'Entrenadores', youth: 'Cantera', records: 'Récords', crisis: 'Crisis', room: 'Vestuarios' }, none: 'Nada en esta sección todavía.' };
const fr: NewsFStrings = { all: 'Tout', mine: 'Notre club', cat: { results: 'Résultats', transfers: 'Transferts', managers: 'Entraîneurs', youth: 'Formation', records: 'Records', crisis: 'Crises', room: 'Vestiaires' }, none: 'Rien dans cette rubrique pour l’instant.' };
export const NF: Record<UiLang, NewsFStrings> = { en, ar, es, fr };
