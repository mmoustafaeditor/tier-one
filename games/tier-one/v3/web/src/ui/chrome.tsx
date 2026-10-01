import type { ReactNode } from 'react';
import { useT } from '../lib/i18n';
import { useSave } from '../lib/save';
import type { Chrome, Route } from '../App';
import { BackArr } from './bits';

const NAV: [Route['n'], string][] = [['front', 'nav.front'], ['daily', 'nav.daily'], ['wire', 'nav.wire'], ['desk', 'nav.desk'], ['pass', 'nav.pass']];

export function EditionBtn({ edition }: { edition: () => void }) {
  const t = useT(); const s = useSave();
  const cur = s.edition || (matchMedia('(prefers-color-scheme: dark)').matches ? 'late' : 'morning');
  // The button names the edition you'd switch to, like the mockups ("Late edition" while reading the morning paper).
  return <button className="edition" onClick={edition} aria-label={t('common.edition')}>{cur === 'late' ? t('brand.morning') : t('brand.late')}</button>;
}
export function SettingsBtn({ open }: { open: () => void }) {
  const t = useT();
  return <button className="gear" onClick={open} aria-label={t('common.settings')}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" /></svg></button>;
}
export function DeskNav({ go, cur }: { go: Chrome['go']; cur: Route['n'] }) {
  const t = useT();
  return <nav className="nav" aria-label="Sections">{NAV.map(([n, k]) => <a key={n} href={'?tab=' + n} aria-current={cur === n ? 'page' : undefined} onClick={(e) => { e.preventDefault(); go({ n } as Route); }}>{t(k)}</a>)}</nav>;
}
export function Bar({ chrome, back, title, end, cur }: { chrome: Chrome; back?: { label: string; to?: Route; onClick?: () => void }; title?: ReactNode; end?: ReactNode; cur: Route['n'] }) {
  return <>
    <header className="bar">
      {back && <button className="bar__back" onClick={() => (back.onClick ? back.onClick() : chrome.go(back.to || { n: 'front' }))}><BackArr /> {back.label}</button>}
      {title && <span className="bar__title">{title}</span>}
      <span className="bar__end">{end}<EditionBtn edition={chrome.edition} /><SettingsBtn open={chrome.openSettings} /></span>
    </header>
    <DeskNav go={chrome.go} cur={cur} />
  </>;
}
