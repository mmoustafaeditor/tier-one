// Me: your press card, numbers that matter, the trophy shelf, the Pass, settings.
import { useT, num } from '../lib/i18n';
import { useSave } from '../lib/save';
import { ACH, ACH_IDS } from '../lib/meta';
import { Icon, TopBar, GBtn } from '../ui/game';
import type { Chrome } from '../App';
import { startTutorial } from './Onboarding';
import { PressPass } from './Home';
import { useLeague } from '../lib/leagueData';

const TROPHY_IC: Record<string, string> = { first: 'news', t1: 'crown', t1x3: 'crown', excl: 'bolt', excl3: 'bolt', clean: 'check', uturn: 'uturn', twist: 'uturn', dd: 'clock', silent: 'eye', fake: 'eye', hijack: 'arrow', agent: 'briefcase', echo: 'friends', physio: 'pulse', streak7: 'flame', streak30: 'flame', practice5: 'target', coach: 'target', career1: 'story', rank2: 'story', rank3: 'story', rank5: 'crown', trust5: 'phone', leak: 'fax', wire1: 'wire', wireRight: 'wire', room: 'friends', share: 'share', rich: 'gift' };

export function MeScreen(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const lg = useLeague();
  const got = ACH_IDS.filter((id) => s.ach[id]);
  const dailies = Object.values(s.daily);
  const best = dailies.reduce((m, d) => Math.max(m, d.total), 0);
  const t1s = dailies.filter((d) => d.tier === 'T1').length;
  return <div className="g-screen me">
    <TopBar title={t('g.tabs.me')} onMenu={chrome.openSettings} />
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PressPass chrome={chrome} s={s} lg={lg} onTop={() => chrome.go({ n: 'pass' })} />

      <section className="me__stats" style={{ ['--i' as string]: 1 }}>
        {[
          { k: 'g.me.streak', v: s.streak.n, sub: t('g.me.best', { n: s.streak.best }), ic: 'flame' },
          { k: 'g.me.dailies', v: dailies.length, sub: t('g.me.t1s', { n: t1s }), ic: 'news' },
          { k: 'g.me.bestScore', v: best, sub: t('g.me.points'), ic: 'star' },
          { k: 'g.me.followers', v: s.career ? s.career.followers : 0, sub: s.career ? t('g.me.rep', { n: Math.round(s.career.rep) }) : t('g.me.noStory'), ic: 'friends' },
        ].map((x) => <div key={x.k} className="g-card g-card--desk me__stat"><Icon n={x.ic} /><b className="g-num">{num(x.v)}</b><span className="g-mono">{t(x.k)}</span><span className="me__sub">{x.sub}</span></div>)}
      </section>

      <div className="g-sec" style={{ ['--i' as string]: 2 }}><h2>{t('ach.title')}</h2><span className="g-mono">{t('ach.aside', { n: got.length, m: ACH_IDS.length })}</span></div>
      <section className="shelf" style={{ ['--i' as string]: 2 }}>
        {ACH_IDS.map((id) => { const on = !!s.ach[id]; const L = t.list('ach.list.' + id) as string[]; return <div key={id} className={'trophy' + (on ? ' is-on' : '')} title={L ? L[1] : id}>
          <span className="trophy__ic"><Icon n={on ? TROPHY_IC[id] || 'trophy' : 'lock'} /></span>
          <span className="trophy__n">{L ? L[0] : id}</span>
          <span className="trophy__r"><span className="g-coin" />{ACH[id]}</span>
        </div>; })}
      </section>

      <div className="me__links" style={{ ['--i' as string]: 3 }}>
        <GBtn kind="gold" onClick={() => chrome.go({ n: 'pass' })}><Icon n="crown" size={22} />{t('g.me.pass')}</GBtn>
        <GBtn kind="dark" onClick={() => chrome.go({ n: 'howto' })}><Icon n="help" size={22} />{t('nav.howto')}</GBtn>
        <GBtn kind="dark" onClick={() => startTutorial(chrome.go)}><Icon n="target" size={22} />{t('g.me.training')}</GBtn>
        <GBtn kind="dark" onClick={chrome.openSettings}><Icon n="gear" size={22} />{t('common.settings')}</GBtn>
      </div>
    </div>
  </div>;
}
