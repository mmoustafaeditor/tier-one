// Missions (UI41.md §Missions): today's three (lib/progress.ts) and this week's three (lib/missions41.ts), each with its
// progress and Claim, plus the season track's ready rewards (lib/season.ts) in one tab. The home tile's red count is
// how many are ready to claim. One screen per tab, no scroll; the footer claims everything ready on the tab.
import { useEffect, useState } from 'react';
import { useT, resetAt, fmtDate } from '../lib/i18n';
import { useSave, update } from '../lib/save';
import { sfx } from '../lib/sfx';
import { toast } from '../lib/meta';
import { ensureMissions, missionsView, claimMission } from '../lib/progress';
import { ensureWeekly, weeklyView, claimWeekly, weekEnds } from '../lib/missions41';
import { trackView, claimReward, ensureSeason } from '../lib/season';
import { Screen, Chips } from '../ui/screen';
import type { Chrome } from '../App';

type Tab = 'today' | 'week' | 'season';
interface Row { id: string; label: string; have: number; n: number; coins: number; done: boolean; claimed: boolean }

export function MissionsScreen(chrome: Chrome) {
  const t = useT();
  const s = useSave();
  const [tab, setTab] = useState<Tab>('today');
  useEffect(() => { ensureSeason(); update((x) => { ensureMissions(x); ensureWeekly(x); }); }, []);
  const today: Row[] = (missionsView(s) || []).map((m) => ({ id: m.id, label: t('g.missions.' + m.id, { n: m.n }), have: m.have, n: m.n, coins: m.coins, done: m.done, claimed: m.claimed }));
  const week: Row[] = weeklyView(s).map((m) => ({ id: m.id, label: t('s41.ms.w.' + m.id, { n: m.n }), have: m.have, n: m.n, coins: m.coins, done: m.done, claimed: m.claimed }));
  const tv = trackView(s);
  const ready = (rows: Row[]) => rows.filter((r) => r.done && !r.claimed);
  const counts: Record<Tab, number> = { today: ready(today).length, week: ready(week).length, season: tv.ready };
  const paid = (n: number) => { if (n > 0) { sfx('coin'); toast('ach', t('s41.ms.paid', { n })); } };
  const claim = (id: string) => paid(tab === 'week' ? claimWeekly(id) : claimMission(id));
  const claimSeason = () => {
    let coins = 0;
    for (const r of tv.rows) {
      if (!r.reached) continue;
      if (r.free && !r.freeClaimed) coins += claimReward('free', r.lv)?.coins || 0;
      if (tv.gold && r.gold && !r.goldClaimed) coins += claimReward('gold', r.lv)?.coins || 0;
    }
    sfx(coins ? 'coin' : 'unlock'); toast('ach', coins ? t('s41.ms.paid', { n: coins }) : t('s41.ms.looks'));
  };
  const claimAll = () => {
    if (tab === 'season') return claimSeason();
    let n = 0; for (const r of ready(tab === 'week' ? week : today)) n += tab === 'week' ? claimWeekly(r.id) : claimMission(r.id);
    paid(n);
  };
  const rows = tab === 'week' ? week : today;
  const footer = counts[tab] > 0
    ? <button type="button" className="s41-btn s41-btn--main" onClick={claimAll}>{t('s41.ms.claimAll', { n: counts[tab] })}</button>
    : <button type="button" className="s41-btn s41-btn--main s41-btn--quiet" onClick={() => chrome.go({ n: 'daily' })}>{t('s41.pc.playDaily')}</button>;
  return <Screen title={t('s41.app.missions')} sub={tab === 'today' ? t('s41.ms.resets', { t: resetAt() }) : tab === 'week' ? t('s41.ms.resetsW', { d: fmtDate(weekEnds(), t.lang, { weekday: 'long' }) }) : t(tv.def.nameKey)} onBack={chrome.back} footer={footer}>
    <Chips value={tab} onChange={(k) => { sfx('ui.tap'); setTab(k); }} options={(['today', 'week', 'season'] as Tab[]).map((k) => ({ k, label: <>{t('s41.ms.tab.' + k)}{counts[k] > 0 && <i className="pc-dot" aria-hidden="true" />}</> }))} />
    {tab === 'season' ? <section className="ms-season">
      <b className="ms-season__n">{t('l4.se.tierOf', { n: tv.lv.n, m: tv.rows.length })}</b>
      <i className="hm-bar hm-bar--lg"><i style={{ width: (tv.lv.max ? 100 : tv.lv.pct) + '%' }} /></i>
      <p className="pc-line">{tv.lv.max ? t('l4.se.max') : t('l4.se.xp', { a: tv.lv.into, b: tv.lv.need, n: tv.lv.n + 1 })}</p>
      <p className="pc-line">{tv.ready > 0 ? t('s41.ms.seasonReady', { n: tv.ready }) : t('l4.se.how')}</p>
      {!tv.gold && <p className="pc-line">{t('s41.ms.goldLane')}</p>}
    </section>
      : <ul className="ms-list">{rows.length ? rows.map((r) => <li key={r.id} className={'ms-row' + (r.claimed ? ' is-claimed' : r.done ? ' is-done' : '')}>
        <span className="ms-row__b">
          <b dir="auto">{r.label}</b>
          <span className="ms-row__p"><i className="hm-bar"><i style={{ width: Math.round((100 * r.have) / r.n) + '%' }} /></i><small className="g-num">{r.have}/{r.n} · {t('s41.ms.coins', { n: r.coins })}</small></span>
        </span>
        {r.claimed ? <span className="ms-row__ok">{t('g.home.claimed')}</span>
          : <button type="button" className="s41-btn s41-btn--sm" disabled={!r.done} onClick={() => claim(r.id)}>{t('s41.ms.claim')}</button>}
      </li>) : <li className="pc-empty">{t('md4.loading')}</li>}</ul>}
  </Screen>;
}
