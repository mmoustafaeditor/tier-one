// Missions (LAUNCH_BRIEF §47; docs/spec/E-economy.md §5): today's three and this week's, grouped by game mode, coins and
// Season XP on claim. Every mission rewards playing well (finish the Daily, a correct Advanced+ call, an Exclusive,
// beat a rival, play a room, share a result, a Market call); none asks for a chore. One screen, paged; Back top-left.
import { useEffect } from 'react';
import { useT, resetAt } from '../lib/i18n';
import { update, useSave } from '../lib/save';
import { ensureMissions, allMissions, claimMission, MODE_ORDER, MISSION_XP, type MissionMode } from '../lib/progress';
import { sfx } from '../lib/sfx';
import { Icon, GBtn, TopBar, confetti } from '../ui/game';
import { usePaged, Pager } from '../ui/fit';
import type { Chrome } from '../App';

function claimAll(ids: string[]) {
  let paid = 0;
  for (const id of ids) paid += claimMission(id) || 0;
  if (paid) { sfx('coin'); confetti(['#F7B928', '#FFD35C', '#fff'], 60); }
}
const MI: Record<string, string> = { daily: 'phone', right3: 'check', adv: 'bolt', excl: 'star', rival: 'reply', early: 'clock', practice: 'target', story: 'story', wire: 'wire', twist: 'uturn', room: 'friends', share: 'share', 'w.daily': 'news', 'w.story': 'story', 'w.room': 'friends', 'w.wire': 'wire', 'w.excl': 'star', 'w.right': 'check' };
const MODE_KEY: Record<MissionMode, string> = { daily: 'hub.mode.daily', career: 'hub.mode.career', multi: 'hub.mode.multi', market: 'hub.mode.market', any: 'hub.missions.any' };

export function MissionsScreen(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  useEffect(() => { update((x) => { ensureMissions(x); }); }, []);
  const ms = allMissions(s).sort((a, b) => Number(a.weekly) - Number(b.weekly) || MODE_ORDER.indexOf(a.mode) - MODE_ORDER.indexOf(b.mode));
  const ready = ms.filter((m) => m.done && !m.claimed);
  const pg = usePaged(ms, 5);
  return <div className="g-screen msn fit">
    <TopBar back={{ label: t('g.tabs.home'), onClick: () => chrome.go({ n: 'front' }) }} title={t('hub.missions.title')} />
    <div className="fit__body">
      <div className="g-sec" style={{ margin: 0 }}><h2>{t('hub.missions.title')}</h2><span className="g-mono">{t('hub.missions.reset', { t: resetAt() })} · {t('hub.missions.weekReset')}</span></div>
      <p className="msn-why">{t('eco38.missions.why', { d: MISSION_XP.daily, w: MISSION_XP.weekly })}</p>
      {ms.length ? <div className="missions missions--sheet g-card">
        {pg.rows.map((m, k) => <div key={m.id} className="msn-item">
          {(k === 0 || pg.rows[k - 1].weekly !== m.weekly) && <h3 className="msn-group">{t(m.weekly ? 'hub.missions.weekly' : 'hub.missions.daily')}</h3>}
          <div className={'mission' + (m.done ? ' is-done' : '') + (m.claimed ? ' is-claimed' : '')}>
            <span className="mission__ic"><Icon n={m.claimed ? 'check' : MI[m.id] || 'target'} /></span>
            <span className="mission__t"><b dir="auto">{t(m.label, { n: m.n })}</b>
              <span className="msn-meta"><span className="msn-tag">{t(MODE_KEY[m.mode])}</span>
                <span className="g-bar g-bar--sm" style={{ ['--bar' as string]: m.done ? 'var(--c-done)' : 'var(--gold)' }}><i style={{ width: (100 * m.have) / m.n + '%' }} /></span></span></span>
            {m.done && !m.claimed ? <button className="claim" onClick={() => claimAll([m.id])}><span className="g-coin" />{t('hub.missions.claim', { n: m.coins })}</button>
              : <span className="mission__r g-mono">{m.claimed ? t('g.home.claimed') : <>{m.have + '/' + m.n}<span className="mission__c"><span className="g-coin" />+{m.coins}</span></>}</span>}
          </div>
        </div>)}
      </div> : <p className="g-empty">{t('hub.missions.none')}</p>}
      <Pager p={pg} />
      {ready.length > 1 && <GBtn kind="gold" onClick={() => claimAll(ready.map((m) => m.id))}><Icon n="gift" size={20} />{t('hub.missions.claimAll')}</GBtn>}
    </div>
  </div>;
}
