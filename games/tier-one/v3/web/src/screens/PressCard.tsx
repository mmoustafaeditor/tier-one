// Press Card (UI41.md §Press Card): your stats card for every mode, plus leaderboards and your sponsor. Replaces Me,
// Lens and Boards. Eight tabs in two rows; every tab fits one screen (long lists page with <Pager>). Numbers are read
// from the save and the server's boards; nothing here changes a score.
import { useEffect, useState, type ReactNode } from 'react';
import { useT, num } from '../lib/i18n';
import { useSave, type Save } from '../lib/save';
import { sfx } from '../lib/sfx';
import { v3 } from '../lib/api';
import { toast, onShared, ACH_IDS } from '../lib/meta';
import { rankHeld, REP, nextRank, hotMult } from '../lib/economy';
import { bylineOf } from '../lib/byline';
import { medals, unpaid, claimPrize, checkPrizes } from '../lib/awards';
import { bossRecords, noteToday } from '../lib/lens';
import { goalOf, chapterName } from '../lib/storyMode';
import { marketProfile, useWire } from '../lib/wireData';
import { ddLiveDates } from '../lib/flags';
import { syncSponsors, active as activeDeals, offersFor, accept, decline, dealState, slotsFor, type Offer, type Active } from '../lib/deals';
import { catchphraseOf, catchphraseColor } from '../lib/catchphrase';
import { renderCpCard, postToX, X_TAGS } from '../lib/share';
import { equipped } from '../lib/wallet';
import { Screen, Pager, Chips } from '../ui/screen';
import { ordinal } from '../ui/social';
import { RivalMark } from '../ui/connect';
import { BrandMark } from '../ui/customize';
import { levelInfo, isUnlocked, unlockLevel } from '../ui/phone';
import type { Chrome, CardTab } from '../App';

const TABS: CardTab[] = ['overall', 'daily', 'career', 'deadline', 'wire', 'rooms', 'boards', 'sponsor'];
const fmt = (n: number) => Math.round(n).toLocaleString('en');

export function PressCardScreen({ tab: want, ...chrome }: Chrome & { tab?: CardTab }) {
  const t = useT();
  const s = useSave();
  const [tab, setTab] = useState<CardTab>(want || 'overall');
  useEffect(() => { noteToday(); syncSponsors(); void checkPrizes(); }, []);
  const share = () => {
    const cp = catchphraseOf(s), dc = equipped('dropcard', s).preview, b = bylineOf(s);
    const style = dc.k === 'dropcard' ? { paper: dc.bg, ink: dc.ink, accent: dc.accent } : undefined;
    onShared();
    void postToX(cp.text + ' · @' + (s.nick || 'TierOne'), () => renderCpCard({ phrase: cp.text, kicker: t('cn.tier.' + rankHeld(b.rep, b.rank || 0)), line: t('s41.lv', { n: levelInfo(s).n }), foot: t('s41.pc.followers') + ' ' + fmt(b.followers), by: '@' + (s.nick || 'TierOne'), color: catchphraseColor(s), rtl: t.rtl, style }), X_TAGS);
  };
  const open = (r: Parameters<Chrome['go']>[0]) => () => chrome.go(r);
  const foot: Partial<Record<CardTab, ReactNode>> = {
    overall: <button type="button" className="s41-btn s41-btn--main" onClick={share}>{t('s41.pc.share')}</button>,
    daily: <button type="button" className="s41-btn s41-btn--main" onClick={open({ n: 'daily' })}>{s.daily[new Date().toISOString().slice(0, 10)] ? t('s41.pc.seeToday') : t('s41.pc.playDaily')}</button>,
    career: <button type="button" className="s41-btn s41-btn--main" onClick={open({ n: 'story' })}>{t('s41.pc.openCareer')}</button>,
    deadline: isUnlocked('deadline', s) ? <button type="button" className="s41-btn s41-btn--main" onClick={open({ n: 'ddlive' })}>{t('s41.pc.openDD')}</button> : undefined,
    wire: <button type="button" className="s41-btn s41-btn--main" onClick={open({ n: 'wire' })}>{t('s41.pc.openWire')}</button>,
    rooms: isUnlocked('rooms', s) ? <button type="button" className="s41-btn s41-btn--main" onClick={open({ n: 'rooms' })}>{t('s41.pc.openRooms')}</button> : undefined,
  };
  return <Screen title={t('s41.app.card')} onBack={chrome.back} footer={foot[tab]}>
    <div className="pc-tabs" role="tablist" aria-label={t('s41.app.card')}>
      {TABS.map((k) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { sfx('ui.tap'); setTab(k); }}>
        {t('s41.pc.tab.' + k)}{k === 'sponsor' && offersFor(s).length > 0 && <i className="pc-dot" aria-hidden="true" />}{k === 'boards' && unpaid(s).length > 0 && <i className="pc-dot" aria-hidden="true" />}
      </button>)}
    </div>
    <div className="pc-body" key={tab}>
      {tab === 'overall' && <Overall s={s} />}
      {tab === 'daily' && <DailyTab s={s} />}
      {tab === 'career' && <CareerTab s={s} />}
      {tab === 'deadline' && <DeadlineTab s={s} />}
      {tab === 'wire' && <WireTab />}
      {tab === 'rooms' && <RoomsTab s={s} />}
      {tab === 'boards' && <Boards s={s} />}
      {tab === 'sponsor' && <Sponsor s={s} />}
    </div>
  </Screen>;
}

/** A 2-column grid of labelled numbers: the number big, the label under it. */
function Stats({ rows }: { rows: [string, ReactNode][] }) {
  return <dl className="pc-stats">{rows.map(([k, v]) => <div key={k}><dd className="g-num">{v}</dd><dt>{k}</dt></div>)}</dl>;
}
function Locked({ app }: { app: 'deadline' | 'rooms' }) {
  const t = useT();
  return <p className="pc-empty">{t('s41.pc.locked', { app: t('s41.app.' + app), n: unlockLevel(app) })}</p>;
}

// ---------------------------------------------------------------- Overall: who you are
function Overall({ s }: { s: Save }) {
  const t = useT();
  const b = bylineOf(s), lv = levelInfo(s), rank = rankHeld(b.rep, b.rank || 0), nx = nextRank(b.rep);
  const got = ACH_IDS.filter((id) => s.ach[id]).length;
  return <>
    <section className="pc-id">
      <span className="pc-id__av" aria-hidden="true">{(s.nick || '?').slice(0, 1).toUpperCase()}</span>
      <div className="pc-id__b">
        <b dir="auto">@{s.nick || t('s41.lock.noName')}</b>
        <span className="pc-rank">{t('cn.tier.' + rank)}</span>
        <small dir="auto">“{catchphraseOf(s).text}”</small>
      </div>
    </section>
    <div className="pc-lv">
      <span><b>{t('s41.lv', { n: lv.n })}</b><small className="g-num">{t('s41.pc.xp', { a: fmt(lv.into), b: fmt(lv.need) })}</small></span>
      <i className="hm-bar hm-bar--lg"><i style={{ width: lv.pct + '%' }} /></i>
    </div>
    <Stats rows={[
      [t('s41.pc.rep'), <>{b.rep}<small>/{REP.max}</small></>],
      [t('s41.pc.followers'), fmt(b.followers)],
      [t('s41.pc.streak'), s.streak?.n || 0],
      [t('s41.pc.hot'), b.hot > 0 ? '+' + Math.round((hotMult(b.hot + 1) - 1) * 100) + '%' : '0'],
    ]} />
    <p className="pc-line">{nx ? t('s41.pc.nextRank', { r: t('cn.tier.' + nx.id), n: nx.at }) : t('s41.pc.topRank')}</p>
    <section className="pc-files" aria-label={t('s41.pc.files', { n: got, m: ACH_IDS.length })}>
      <span className="pc-files__h">{t('s41.pc.files', { n: got, m: ACH_IDS.length })}</span>
      <span className="pc-files__row">{ACH_IDS.map((id) => <i key={id} className={s.ach[id] ? 'is-got' : ''} title={s.ach[id] ? t('e4.sf.' + id + '.n') : t('s41.pc.sealed')} />)}</span>
    </section>
  </>;
}

// ---------------------------------------------------------------- Daily Challenge
function DailyTab({ s }: { s: Save }) {
  const t = useT();
  const days = Object.entries(s.daily).sort(([a], [b]) => (a < b ? 1 : -1));
  const best = days.reduce((m, [, d]) => Math.max(m, d.total), 0);
  return <>
    <Stats rows={[
      [t('s41.pc.played'), days.length],
      [t('s41.pc.best'), num(best)],
      [t('s41.pc.t1'), days.filter(([, d]) => d.tier === 'T1').length],
      [t('s41.pc.scoops'), days.reduce((n, [, d]) => n + (d.ex || 0), 0)],
      [t('s41.pc.streak'), s.streak?.n || 0],
      [t('s41.pc.bestStreak'), s.streak?.best || 0],
    ]} />
    <section className="pc-week" aria-label={t('s41.pc.last7')}>
      <span className="pc-files__h">{t('s41.pc.last7')}</span>
      <span className="pc-week__row">{Array.from({ length: 7 }, (_, k) => { const d = days[k]?.[1]; return <span key={k} className={'pc-day' + (d ? ' is-' + d.tier.toLowerCase() : '')}><b>{d ? t('tier.' + d.tier) : '–'}</b><small className="g-num">{d ? num(d.total) : ''}</small></span>; })}</span>
    </section>
  </>;
}

// ---------------------------------------------------------------- Career
function CareerTab({ s }: { s: Save }) {
  const t = useT();
  const g = goalOf(s);
  const bosses = bossRecords(s);
  if (!g) return <p className="pc-empty">{t('s41.pc.noCareer')}</p>;
  return <>
    <h2 className="pc-h">{t(chapterName(g.def.id))}</h2>
    <Bar label={t('s41.pc.windows')} have={g.windows.have} need={g.windows.need} />
    <Bar label={t('s41.pc.rep')} have={g.rep.have} need={g.rep.need} />
    {g.t1 ? <Bar label={t('s41.pc.t1')} have={g.t1.have} need={g.t1.need} /> : <Bar label={t('s41.pc.bossWins')} have={g.boss.have} need={g.boss.need} />}
    <ul className="pc-bosses">{bosses.map((x) => <li key={x.id} className={x.met ? (x.w > x.l ? 'is-won' : x.w < x.l ? 'is-lost' : '') : 'is-unmet'}>
      <RivalMark id={x.id} size={28} /><span dir="auto">{t('rival.' + x.id)}</span><b className="g-num">{x.met ? x.w + '–' + x.l : '–'}</b>
    </li>)}</ul>
  </>;
}
function Bar({ label, have, need }: { label: string; have: number; need: number }) {
  return <div className="pc-goal"><span><span>{label}</span><b className="g-num">{Math.min(have, need)} / {need}</b></span><i className="hm-bar"><i style={{ width: Math.min(100, Math.round((100 * have) / Math.max(1, need))) + '%' }} /></i></div>;
}

// ---------------------------------------------------------------- Deadline Day
function DeadlineTab({ s }: { s: Save }) {
  const t = useT();
  if (!isUnlocked('deadline', s)) return <Locked app="deadline" />;
  const today = new Date().toISOString().slice(0, 10);
  const next = ddLiveDates().filter((d) => d.day >= today).sort((a, b) => (a.day < b.day ? -1 : 1))[0];
  return <>
    <Stats rows={[
      [t('s41.pc.played'), s.stats.m_deadline || 0],
      [t('s41.pc.ranked'), s.stats.ddlive || 0],
    ]} />
    <p className="pc-line">{next ? t('s41.pc.ddNext', { d: next.day }) : t('s41.pc.ddNone')}</p>
  </>;
}

// ---------------------------------------------------------------- Transfer Wire
function WireTab() {
  const t = useT();
  const s = useSave();
  const w = useWire();
  const p = marketProfile(s);
  const calls = w.mine?.calls || [];
  const open = calls.filter((c) => !c.done).length;
  const hit = p?.hit == null ? null : p.hit <= 1 ? Math.round(p.hit * 100) : Math.round(p.hit);
  return <>
    <Stats rows={[
      [t('s41.pc.cred'), fmt(p?.cred ?? w.mine?.cred ?? 0)],
      [t('s41.pc.hit'), hit == null ? '–' : hit + '%'],
      [t('s41.pc.open'), open],
      [t('s41.pc.resolved'), p?.resolved ?? w.mine?.resolved ?? 0],
    ]} />
    <p className="pc-line">{t('s41.pc.wireHow')}</p>
  </>;
}

// ---------------------------------------------------------------- Rooms
function RoomsTab({ s }: { s: Save }) {
  const t = useT();
  if (!isUnlocked('rooms', s)) return <Locked app="rooms" />;
  const m = medals(s);
  return <Stats rows={[
    [t('s41.pc.roomsIn'), s.rooms.length],
    [t('s41.pc.rounds'), s.stats.m_room || 0],
    [t('s41.pc.gold'), m.gold], [t('s41.pc.silver'), m.silver], [t('s41.pc.bronze'), m.bronze],
  ]} />;
}

// ---------------------------------------------------------------- Leaderboards
type Period = 'daily' | 'weekly' | 'wire';
type Board = { rows: { nick: string; score: number; tier?: string; me: boolean }[]; me?: { rank: number; score: number }; players: number };
function Boards({ s }: { s: Save }) {
  const t = useT();
  const [p, setP] = useState<Period>('daily');
  const [boards, setBoards] = useState<Partial<Record<Period, Board | 'off'>>>({});
  useEffect(() => {
    if (boards[p]) return;
    v3<Board>('lb.top', { period: p, dev: s.dev }).then((r) => setBoards((b) => ({ ...b, [p]: r.ok ? r : 'off' })));
  }, [p]); // eslint-disable-line react-hooks/exhaustive-deps
  const b = boards[p];
  const due = unpaid(s);
  const collect = (key: string) => { const n = claimPrize(key); if (n) { sfx('sparkle'); toast('ach', t('md4.bd.collected', { n })); } };
  return <>
    <Chips value={p} onChange={(k) => { sfx('ui.tap'); setP(k); }} options={[{ k: 'daily', label: t('s41.pc.today') }, { k: 'weekly', label: t('s41.pc.week') }, { k: 'wire', label: t('s41.app.wire') }]} />
    {due[0] && <div className="pc-prize"><span>{t('s41.pc.prize', { r: ordinal(t, due[0].rank) })}</span><button type="button" className="s41-btn s41-btn--sm" onClick={() => collect(due[0].key)}>{t('s41.pc.collect', { n: due[0].coins })}</button></div>}
    <p className="pc-you">{b && b !== 'off' && b.me ? <><b>{ordinal(t, b.me.rank)}</b><span>{t('md4.bd.of', { n: num(b.players) })}</span></> : <span>{b === undefined ? t('md4.loading') : b === 'off' ? t('md4.bd.off') : t('s41.pc.notOn')}</span>}</p>
    {b && b !== 'off' && <Pager items={b.rows} per={5} empty={t('s41.pc.notOn')} render={(x, k) => <div key={k} className={'pc-row' + (x.me ? ' is-me' : '')}>
      <b className="pc-row__r">{ordinal(t, k + 1)}</b><span className="pc-row__n" dir="auto">{x.me ? t('common.you') : '@' + x.nick}</span><b className="pc-row__s g-num">{num(Math.round(x.score))}</b>
    </div>} />}
  </>;
}

// ---------------------------------------------------------------- Sponsor
const brandName = (t: ReturnType<typeof useT>, b: string) => t('e4.sp.brand.' + b + '.n');
function Sponsor({ s }: { s: Save }) {
  const t = useT();
  const deals = activeDeals(s), offers = offersFor(s), full = deals.length >= slotsFor(s);
  const take = (o: Offer) => { if (accept(o.id)) { sfx('deal'); toast('ach', t('l4.sp.taken', { b: brandName(t, o.brand) })); } else sfx('bad'); };
  const pass = (o: Offer) => { if (decline(o.id)) sfx('ui.pop'); };
  return <>
    {deals.length ? deals.slice(0, 1).map((a) => <Deal key={a.id} a={a} />) : <p className="pc-empty">{t('l4.sp.none')}</p>}
    {offers.length > 0 && <Pager items={offers} per={2} render={(o) => <div key={o.id} className="pc-offer">
      <BrandMark brand={o.brand} size={26} />
      <span className="pc-offer__b"><b>{brandName(t, o.brand)}</b><small>{t('s41.pc.pays', { a: o.rate[0], b: o.rate[1], c: o.rate[2] })}</small></span>
      <button type="button" className="s41-btn s41-btn--sm" disabled={full} onClick={() => take(o)}>{t('s41.pc.take')}</button>
      <button type="button" className="s41-btn s41-btn--sm s41-btn--quiet" onClick={() => pass(o)} aria-label={t('l4.sp.later')}>✕</button>
    </div>} />}
  </>;
}
function Deal({ a }: { a: Active }) {
  const t = useT();
  const st = dealState(a);
  return <section className="pc-deal">
    <span className="pc-deal__h"><BrandMark brand={a.brand} size={30} /><b>{brandName(t, a.brand)}</b></span>
    <Stats rows={[
      [t('s41.pc.paid'), fmt(st.paid)],
      [t('s41.pc.strikes'), a.p.strikes + ' / ' + a.strikes],
    ]} />
    <p className="pc-line">{st.clean ? t('l4.sp.bonus', { n: a.bonus }) : t('l4.sp.bonusLost')}</p>
  </section>;
}
