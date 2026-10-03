// Strings for the dressing-room timeline (ui2/RoomLog.tsx): what happened between the manager and the players, from the
// season's event log. EN is the reference; AR is Egyptian Arabic.
import type { UiLang } from './i18n';

type N = (n: string) => string;
interface LogStrings {
  title: string; titleOne: string; sub: string; none: string;
  talk: Record<'reassure' | 'challenge' | 'promise', N>;
  answer: Record<'list' | 'refuse' | 'promise', N>;
  captain: N; kept: N; broken: N; ask: (n: string, why: string) => string; request: N; settled: N;
  leader: N; core: N; exitReq: N; exitLeader: N; ret: N; stayed: N;
}
const en: LogStrings = {
  title: 'What happened in the dressing room', titleOne: 'Between you and him', sub: 'This season, newest first', none: 'Nothing yet this season.',
  talk: { reassure: (n) => `You reassured ${n}`, challenge: (n) => `You challenged ${n}`, promise: (n) => `You gave ${n} your word` },
  answer: { list: (n) => `You put ${n} on the list, as he asked`, refuse: (n) => `You refused to let ${n} go`, promise: (n) => `You talked ${n} round with a promise` },
  captain: (n) => `${n} got the armband`, kept: (n) => `You kept your word to ${n}`, broken: (n) => `You broke your word to ${n}`,
  ask: (n, why) => `${n} asked for a word. ${why}`, request: (n) => `${n} asked to leave`, settled: (n) => `${n} settled down`,
  leader: (n) => `${n} became one of the leaders`, core: (n) => `${n} joined the core of the squad`,
  exitReq: (n) => `${n} left unhappy`, exitLeader: (n) => `A leader left: ${n}`, ret: (n) => `${n} came back to face us`, stayed: (n) => `${n} turned the move down and stayed`,
};
const ar: LogStrings = {
  title: 'اللي حصل في غرفة اللبس', titleOne: 'بينك وبينه', sub: 'الموسم ده، الأحدث الأول', none: 'لسه مفيش حاجة الموسم ده.',
  talk: { reassure: (n) => `طمّنت ${n}`, challenge: (n) => `حمّست ${n} وتحدّيته`, promise: (n) => `إديت ${n} كلمة` },
  answer: { list: (n) => `حطيت ${n} في قايمة البيع زي ما طلب`, refuse: (n) => `رفضت تسيب ${n} يمشي`, promise: (n) => `هدّيت ${n} بوعد` },
  captain: (n) => `${n} لبس شارة الكابتن`, kept: (n) => `وفّيت بكلمتك لـ${n}`, broken: (n) => `خلفت كلمتك لـ${n}`,
  ask: (n, why) => `${n} طلب يكلمك. ${why}`, request: (n) => `${n} طلب يمشي`, settled: (n) => `${n} هدي واستقر`,
  leader: (n) => `${n} بقى من قادة الفريق`, core: (n) => `${n} بقى من أساس الفريق`,
  exitReq: (n) => `${n} مشي زعلان`, exitLeader: (n) => `واحد من القادة مشي: ${n}`, ret: (n) => `${n} رجع يلعب قصادنا`, stayed: (n) => `${n} رفض الانتقال وفضل`,
};
const es: LogStrings = {
  title: 'Lo que pasó en el vestuario', titleOne: 'Entre tú y él', sub: 'Esta temporada, lo más reciente primero', none: 'Nada todavía esta temporada.',
  talk: { reassure: (n) => `Tranquilizaste a ${n}`, challenge: (n) => `Retaste a ${n}`, promise: (n) => `Le diste tu palabra a ${n}` },
  answer: { list: (n) => `Pusiste a ${n} en la lista, como pidió`, refuse: (n) => `No dejaste salir a ${n}`, promise: (n) => `Convenciste a ${n} con una promesa` },
  captain: (n) => `${n} recibió el brazalete`, kept: (n) => `Cumpliste tu palabra con ${n}`, broken: (n) => `Rompiste tu palabra con ${n}`,
  ask: (n, why) => `${n} pidió hablar contigo. ${why}`, request: (n) => `${n} pidió salir`, settled: (n) => `${n} se calmó`,
  leader: (n) => `${n} pasó a ser uno de los líderes`, core: (n) => `${n} entró en el núcleo del equipo`,
  exitReq: (n) => `${n} se fue descontento`, exitLeader: (n) => `Se fue un líder: ${n}`, ret: (n) => `${n} volvió para jugar contra nosotros`, stayed: (n) => `${n} rechazó el traspaso y se quedó`,
};
const fr: LogStrings = {
  title: 'Ce qui s’est passé au vestiaire', titleOne: 'Entre vous deux', sub: 'Cette saison, du plus récent au plus ancien', none: 'Rien encore cette saison.',
  talk: { reassure: (n) => `Vous avez rassuré ${n}`, challenge: (n) => `Vous avez secoué ${n}`, promise: (n) => `Vous avez donné votre parole à ${n}` },
  answer: { list: (n) => `Vous avez placé ${n} sur la liste, à sa demande`, refuse: (n) => `Vous avez refusé de laisser partir ${n}`, promise: (n) => `Vous avez retenu ${n} avec une promesse` },
  captain: (n) => `${n} a reçu le brassard`, kept: (n) => `Vous avez tenu parole envers ${n}`, broken: (n) => `Vous avez manqué à votre parole envers ${n}`,
  ask: (n, why) => `${n} a demandé à vous parler. ${why}`, request: (n) => `${n} a demandé à partir`, settled: (n) => `${n} s’est calmé`,
  leader: (n) => `${n} est devenu l’un des leaders`, core: (n) => `${n} a rejoint le noyau du groupe`,
  exitReq: (n) => `${n} est parti mécontent`, exitLeader: (n) => `Un leader est parti : ${n}`, ret: (n) => `${n} est revenu jouer contre nous`, stayed: (n) => `${n} a refusé le transfert et est resté`,
};
export const RL: Record<UiLang, LogStrings> = { en, ar, es, fr };
