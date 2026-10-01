import type { NVStrings } from './lang-nav';
export const NV_AR: NVStrings = {
  squadAreas: 'أقسام الفريق',
  players: 'اللاعيبة', room: 'غرفة اللبس', training: 'التمرين', medical: 'العيادة', academy: 'الأكاديمية',
  news: 'البريد والأخبار', settings: 'الإعدادات',
  inboxLine: (n: number) => (n === 0 ? 'البريد والأخبار' : n === 1 ? 'رسالة جديدة في البريد' : n === 2 ? 'رسالتين جداد في البريد' : n <= 10 ? `${n} رسايل جديدة في البريد` : `${n} رسالة جديدة في البريد`),
};
