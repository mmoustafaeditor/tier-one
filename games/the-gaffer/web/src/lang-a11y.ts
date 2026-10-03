// Strings for the accessibility settings (ui2/A11y.tsx), reachable from the title screen and Settings. EN is the
// reference; AR is Egyptian Arabic.
import type { UiLang } from './i18n';

interface A11yStrings {
  title: string;
  open: string;
  text: string;
  textOpts: [string, string, string];
  calm: string;
  calmSub: string;
  contrast: string;
  contrastSub: string;
  done: string;
}

const en: A11yStrings = {
  title: 'Accessibility',
  open: 'Accessibility',
  text: 'Text size',
  textOpts: ['Standard', 'Larger', 'Largest'],
  calm: 'Reduce motion',
  calmSub: 'Stops animations and flashes. On automatically if your device asks for reduced motion.',
  contrast: 'Stronger contrast',
  contrastSub: 'Darker secondary text on light panels, brighter on dark ones.',
  done: 'Done',
};
const ar: A11yStrings = {
  title: 'سهولة الاستخدام',
  open: 'سهولة الاستخدام',
  text: 'حجم الكلام',
  textOpts: ['عادي', 'أكبر', 'أكبر كمان'],
  calm: 'قلّل الحركة',
  calmSub: 'بيوقّف الأنيميشن والفلاشات. بيشتغل لوحده لو جهازك طالب تقليل الحركة.',
  contrast: 'تباين أقوى',
  contrastSub: 'الكلام الفرعي أغمق على الخلفيات الفاتحة وأفتح على الغامقة.',
  done: 'تمام',
};
const es: A11yStrings = {
  title: 'Accesibilidad',
  open: 'Accesibilidad',
  text: 'Tamaño del texto',
  textOpts: ['Normal', 'Grande', 'Muy grande'],
  calm: 'Reducir movimiento',
  calmSub: 'Detiene animaciones y destellos. Se activa solo si tu dispositivo pide movimiento reducido.',
  contrast: 'Más contraste',
  contrastSub: 'Texto secundario más oscuro en paneles claros y más claro en los oscuros.',
  done: 'Listo',
};
const fr: A11yStrings = {
  title: 'Accessibilité',
  open: 'Accessibilité',
  text: 'Taille du texte',
  textOpts: ['Normale', 'Grande', 'Très grande'],
  calm: 'Réduire les animations',
  calmSub: 'Coupe les animations et les flashs. Activé d’office si ton appareil demande moins d’animations.',
  contrast: 'Contraste renforcé',
  contrastSub: 'Texte secondaire plus foncé sur les panneaux clairs, plus clair sur les sombres.',
  done: 'Terminé',
};

export const AX: Record<UiLang, A11yStrings> = { en, ar, es, fr };
