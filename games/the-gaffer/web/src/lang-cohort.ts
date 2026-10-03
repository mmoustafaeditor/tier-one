// Strings for the academy's age groups (ui2/Pathway.tsx AcademyScreen). EN is the reference; AR is Egyptian Arabic.
import type { UiLang } from './i18n';

interface CohortStrings { u18: string; u21: string; head: (n: number, avg: string, ready: number) => string }
const en: CohortStrings = { u18: 'Under 18', u21: 'Under 21', head: (n, a, r) => `${n} ${n === 1 ? 'player' : 'players'} · average ${a}${r ? ` · ${r} ready` : ''}` };
const ar: CohortStrings = { u18: 'تحت 18', u21: 'تحت 21', head: (n, a, r) => `${n} ${n === 1 ? 'لاعب' : 'لاعيبة'} · المتوسط ${a}${r ? ` · ${r} جاهزين` : ''}` };
const es: CohortStrings = { u18: 'Sub-18', u21: 'Sub-21', head: (n, a, r) => `${n} ${n === 1 ? 'jugador' : 'jugadores'} · media ${a}${r ? ` · ${r} listos` : ''}` };
const fr: CohortStrings = { u18: 'Moins de 18 ans', u21: 'Moins de 21 ans', head: (n, a, r) => `${n} joueur${n > 1 ? 's' : ''} · moyenne ${a}${r ? ` · ${r} prêt${r > 1 ? 's' : ''}` : ''}` };
export const CO: Record<UiLang, CohortStrings> = { en, ar, es, fr };
