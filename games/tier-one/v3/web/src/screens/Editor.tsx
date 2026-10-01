// The editor's desk as a screen (GOTY.md §7.1): the whole assignment queue, the live board when it's on, your slot
// on the table and your playstyle. Home shows the top of it (NextUp, DDLiveBanner, StreakStake); this is the full desk.
// Route: { n: 'editor' }. Reached from the morning papers and the desk queue.
import { useT } from '../lib/i18n';
import { useSave } from '../lib/save';
import { Icon, TopBar } from '../ui/game';
import { NextUp, DDLiveBanner, StreakStake, StyleCard, editorName } from '../ui/live';
import { welcomeBack, wireCredits, shareFlair } from '../lib/desk';
import type { Chrome } from '../App';

export function EditorDeskScreen(chrome: Chrome) {
  const t = useT(); const s = useSave();
  const w = welcomeBack(s), credits = wireCredits(s), flair = shareFlair(s);
  return <div className="g-screen g-screen--wide lv-editor">
    <TopBar back={{ label: t('g.tabs.home'), onClick: () => chrome.go({ n: 'front' }) }} title={t('live.desk.title')} onMenu={chrome.openSettings} />
    <div className="g-stack lv-editor__cols">
      <div className="g-stack">
        <header className="lv-editor__h"><span className="g-mono">{t('live.desk.editorK')}</span><h1>{editorName(t)}</h1>
          {w && <p className="lv-editor__welcome">{t('live.paper.welcomeSub', { d: w.days })} {t('live.paper.welcomeNext')}</p>}</header>
        <DDLiveBanner go={chrome.go} />
        <NextUp go={chrome.go} max={6} full />
        <StreakStake go={chrome.go} />
      </div>
      <div className="g-stack">
        <StyleCard />
        {(credits > 0 || flair) && <div className="lv-editor__perks g-card g-card--desk">
          {credits > 0 && <p><Icon n="wire" size={16} />{t('live.feed.credit', { n: credits })}</p>}
          {flair && <p><Icon n="crown" size={16} />{t('live.feed.flair', { m: t('career.ranks.' + flair.rank) })}</p>}
        </div>}
      </div>
    </div>
  </div>;
}
