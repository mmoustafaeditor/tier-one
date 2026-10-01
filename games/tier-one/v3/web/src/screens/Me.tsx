// Me: the journalist's profile hub (GOTY.md §1). The byline and its ladder up top, then one door to each part of your
// name (Feed, Rivals, Contacts, Pass, replays), your record, the trophy shelf and the films. The sub-screens each do
// one job and don't repeat what's here. One career (§7.2): the byline card is the only place followers and reputation
// are stated; the record below is what you've played, and the Story tile is the chapter, never a second number set.
import { useT, num } from '../lib/i18n';
import { useSave } from '../lib/save';
import { ACH, ACH_IDS } from '../lib/meta';
import { ACH_IC, unpaid } from '../lib/awards';
import { levelOf } from '../lib/progress';
import { unreadOf, rivalOf, RIVALS, BOOK_SRC, bookOf } from '../lib/byline';
import { chapterOf } from '../lib/storyMode';
import { sfx } from '../lib/sfx';
import { Icon, TopBar, GBtn } from '../ui/game';
import type { Chrome } from '../App';
import { startTutorial } from './Onboarding';
import { BylineCard, tn } from '../ui/connect';
import { StyleCard } from '../ui/live';



export function MeScreen(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const got = ACH_IDS.filter((id) => s.ach[id]);
  const dailies = Object.values(s.daily);
  const best = dailies.reduce((m, d) => Math.max(m, d.total), 0);
  const t1s = dailies.filter((d) => d.tier === 'T1').length;
  const un = unreadOf(s).length;
  const rec = RIVALS.reduce((a, id) => { const r = rivalOf(s, id); return { w: a.w + r.w, l: a.l + r.l, d: a.d + r.d }; }, { w: 0, l: 0, d: 0 });
  const top = BOOK_SRC.map((src) => ({ src, e: bookOf(s, src) })).sort((a, b) => b.e.xp - a.e.xp)[0];
  const lv = levelOf(s.pp); // the season Pass level: the one level number (lib/progress.ts)
  const ch = chapterOf(s);
  const due = unpaid(s).length;
  const tiles: { k: string; ic: string; t: string; sub: string; go: () => void; badge?: number; tone?: string }[] = [
    { k: 'boards', ic: 'trophy', t: t('aw.title'), sub: due ? t('aw.hubDue', { n: due }) : t('aw.hubSub'), badge: due, go: () => chrome.go({ n: 'boards' }) },
    { k: 'feed', ic: 'news', t: t('cn.me.feed'), sub: tn(t, 'cn.me.feedSub', un), badge: un, go: () => chrome.go({ n: 'feed' }) },
    { k: 'rivals', ic: 'reply', t: t('cn.me.rivals'), sub: rec.w + rec.l + rec.d ? t('cn.me.rivalsSub', { w: rec.w, l: rec.l }) : t('cn.me.rivalsNone'), go: () => chrome.go({ n: 'rivals' }), tone: rec.w > rec.l ? 'up' : rec.l > rec.w ? 'down' : '' },
    { k: 'contacts', ic: 'phone', t: t('cn.me.contacts'), sub: t('cn.me.contactsSub', { s: t('src.' + top.src), n: top.e.lv }), go: () => chrome.go({ n: 'contacts' }) },
    { k: 'pass', ic: 'crown', t: t('g.me.pass'), sub: t('cn.me.passSub', { n: lv.n }), go: () => chrome.go({ n: 'pass' }) },
    { k: 'desk', ic: 'pen', t: t('eco.title'), sub: t('eco.sub'), go: () => chrome.go({ n: 'customize' }) },
  ];
  return <div className="g-screen me">
    <TopBar title={t('g.tabs.me')} onMenu={chrome.openSettings} />
    <div className="stagger me__grid">
      <BylineCard s={s} style={{ ['--i' as string]: 0 }} />
      <StyleCard style={{ ['--i' as string]: 0.5 }} />

      <nav className="cn-hub" aria-label={t('cn.me.hub')} style={{ ['--i' as string]: 1 }}>
        {tiles.map((x) => <button key={x.k} className={'cn-hub__t cn-hub__t--' + x.k + (x.tone ? ' is-' + x.tone : '')} onClick={() => { sfx('ui.tap'); x.go(); }}>
          <span className="cn-hub__ic" aria-hidden="true"><Icon n={x.ic} size={20} /></span>
          <span className="cn-hub__txt"><b>{x.t}</b><small>{x.sub}</small></span>
          {x.badge ? <span className="g-badge" aria-hidden="true">{x.badge > 9 ? '9+' : x.badge}</span> : <Icon n={t.rtl ? 'back' : 'arrow'} size={16} className="cn-hub__go" />}
        </button>)}
      </nav>

      <div className="g-sec me__h" style={{ ['--i' as string]: 2 }}><h2>{t('cn.me.record')}</h2></div>
      <section className="me__stats" style={{ ['--i' as string]: 2 }}>
        {[
          { k: 'g.me.streak', v: s.streak.n, sub: t('g.me.best', { n: s.streak.best }), ic: 'flame' },
          { k: 'g.me.dailies', v: dailies.length, sub: t('g.me.t1s', { n: t1s }), ic: 'news' },
          { k: 'g.me.bestScore', v: best, sub: t('g.me.points'), ic: 'star' },
          { k: 'cn.me.storyW', v: s.career ? s.career.windows : 0, sub: ch ? t('g.story.ch.' + ch.id + '.name') : t('g.me.noStory'), ic: 'story' },
        ].map((x) => <div key={x.k} className="g-card g-card--desk me__stat"><Icon n={x.ic} /><b className="g-num">{num(x.v)}</b><span className="g-mono">{t(x.k)}</span><span className="me__sub">{x.sub}</span></div>)}
      </section>

      <div className="g-sec me__h" style={{ ['--i' as string]: 3 }}><h2>{t('ach.title')}</h2><span className="g-mono">{t('ach.aside', { n: got.length, m: ACH_IDS.length })}</span></div>
      <section className="shelf" style={{ ['--i' as string]: 3 }}>
        {ACH_IDS.map((id) => { const on = !!s.ach[id]; const L = t.list('ach.list.' + id) as string[]; return <div key={id} className={'trophy' + (on ? ' is-on' : '')} title={L ? L[1] : id}>
          <span className="trophy__ic"><Icon n={on ? ACH_IC[id] || 'trophy' : 'lock'} /></span>
          <span className="trophy__n">{L ? L[0] : id}</span>
          <span className="trophy__r"><span className="g-coin" />{ACH[id]}</span>
        </div>; })}
      </section>

      <div className="g-sec me__h" style={{ ['--i' as string]: 5 }}><h2>{t('cn.me.more')}</h2></div>
      <div className="me__links" style={{ ['--i' as string]: 5 }}>
        <GBtn kind="dark" size="sm" onClick={() => chrome.go({ n: 'howto' })}><Icon n="help" size={20} />{t('nav.howto')}</GBtn>
        <GBtn kind="dark" size="sm" onClick={() => startTutorial(chrome.go)}><Icon n="target" size={20} />{t('g.me.training')}</GBtn>
        <GBtn kind="dark" size="sm" onClick={chrome.openSettings}><Icon n="gear" size={20} />{t('common.settings')}</GBtn>
      </div>
    </div>
  </div>;
}
