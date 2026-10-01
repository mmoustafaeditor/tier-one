// Transfer Market (UI41 §Transfer Wire): real rumours, real outcomes, your calls. Three screens, none scrolls:
//   list    tabs Rumours · My calls; Stars / Heat sort, League / Team pick (a compact paged picker), a search box, 5 a page
//   rumour  the story, the market %, Watch (free) and Call it
//   call    HE MOVES / HE STAYS, how sure (In talks ×1 · Advanced ×2 · Confirmed ×3), the deal in one line, Post
// Scoring stays on the server (wire.mjs wirePoints; lib/wireData.ts marketDeal states it before posting). Calls open at
// Level 2; watching is free from Level 1. Right calls pay XP, coins and a Tip (lib/wireData.ts settleMarket).
import { useEffect, useMemo, useState } from 'react';
import { useT, num, type T } from '../lib/i18n';
import { useSave } from '../lib/save';
import { v3 } from '../lib/api';
import {
  useWire, refreshWire, windowParts, isWatched, toggleWatch, watchList, marketNow, marketDeal, starOf, leagueOf, clubsOf, normName, markCallsSeen,
  MARKET_COINS, type Rumour, type WireCall,
} from '../lib/wireData';
import { clubById, WR } from '../lib/engine';
import { onWireFiled, toast } from '../lib/meta';
import { levelInfo, callLevel } from '../ui/phone';
import { sfx } from '../lib/sfx';
import { Crest } from '../ui/bits';
import { confetti } from '../ui/game';
import { Screen, Pager, Chips } from '../ui/screen';
import { Hint } from '../ui/hint';
import type { Chrome } from '../App';
import '../styles/football.css';

type Tab = 'rumours' | 'calls';
type Sort = 'heat' | 'stars';
type CallTab = 'open' | 'done' | 'watch';
type View = { k: 'list' } | { k: 'rumour'; id: string } | { k: 'call'; id: string };
const LEAGUES = ['eng1', 'esp1', 'ita1', 'ger1', 'fra1', 'egy1', 'ksa1'];
const pct = (x: number) => Math.round(x * 100);
const r1 = (x: number) => Math.round(x * 10) / 10;
/** '2027-01' → 'Winter window 2027'. */
export const winLabel = (t: T, w: string) => { const p = windowParts(w); return p ? t('md4.mk.win.' + p.k, { y: p.y }) : w; };
const stageKey = (s: string) => (['interest', 'talks', 'bid', 'agreed'].includes(s) ? s : 'interest');
const side = (t: T, yes: boolean) => t(yes ? 'w41.row.moves' : 'w41.row.stays');
const stake = (t: T, s: number) => t('w41.stake.' + Math.max(1, Math.min(3, s)));

function useCallGate() {
  const s = useSave(); const w = useWire();
  const need = callLevel('market');
  return { need, mayCall: levelInfo(s).n >= need, left: Math.max(0, WR.WIRE.DAILY_CALLS - w.callsToday) };
}
const callOf = (w: ReturnType<typeof useWire>, rid: string) => w.board[rid]?.mine || (w.mine?.calls || []).find((c) => c.rid === rid) || null;

export function WireScreen({ rid, ...chrome }: Chrome & { rid?: string }) {
  const [view, setView] = useState<View>(rid ? { k: 'rumour', id: rid } : { k: 'list' });
  const [tab, setTab] = useState<Tab>('rumours');
  useEffect(() => { void refreshWire(); }, []);
  const w = useWire();
  const r = view.k !== 'list' ? (w.rumours || []).find((x) => x.id === view.id) : undefined;
  if (view.k === 'call' && r) return <CallScreen r={r} onBack={() => setView({ k: 'rumour', id: r.id })} onDone={() => setView({ k: 'rumour', id: r.id })} />;
  if (view.k !== 'list' && r) return <RumourScreen r={r} onBack={() => setView({ k: 'list' })} onCall={() => setView({ k: 'call', id: r.id })} />;
  return <ListScreen tab={tab} setTab={setTab} chrome={chrome} onOpen={(id) => { sfx('ui.tap'); setView({ k: 'rumour', id }); }} />;
}

// ---------------------------------------------------------------- the list
function ListScreen({ tab, setTab, chrome, onOpen }: { tab: Tab; setTab: (t: Tab) => void; chrome: Chrome; onOpen: (id: string) => void }) {
  const t = useT(); const w = useWire();
  const { need, mayCall, left } = useCallGate();
  const [sort, setSort] = useState<Sort>('heat');
  const [league, setLeague] = useState('');
  const [team, setTeam] = useState('');
  const [q, setQ] = useState('');
  const [picker, setPicker] = useState<'' | 'league' | 'team'>('');
  const [callTab, setCallTab] = useState<CallTab>('open');
  const all = w.rumours || [];
  const list = useMemo(() => {
    const nq = normName(q);
    const out = all.filter((r) => (!league || (leagueOf(r) || 'other') === league)
      && (!team || clubsOf(r).some((c) => c.id === team))
      && (!nq || [r.playerName, ...clubsOf(r).map((c) => c.name)].some((x) => normName(x).includes(nq))));
    return out.sort((a, b) => (sort === 'stars' ? starOf(b) - starOf(a) : 0) || (b.heat || 0) - (a.heat || 0));
  }, [all, league, team, q, sort]);
  const sub = mayCall ? t('w41.sub.calls', { n: left, m: WR.WIRE.DAILY_CALLS }) : t('w41.sub.locked', { n: need });
  const footer = <button type="button" className="wm-btn wm-btn--ghost" onClick={() => chrome.go({ n: 'boards', period: 'wire' })}>{t('w41.leaderboard')}</button>;

  return <Screen title={t('w41.title')} sub={sub} onBack={chrome.home} footer={footer} tone="market">
    <Chips value={tab} onChange={(k) => { sfx('ui.tap'); setTab(k); setPicker(''); }} options={[{ k: 'rumours', label: t('w41.tab.rumours') }, { k: 'calls', label: t('w41.tab.calls') }]} />
    {tab === 'rumours' ? <>
      <div className="chips wm-filters" role="group" aria-label={t('w41.title')}>
        <button type="button" className={sort === 'stars' ? 'on' : ''} aria-pressed={sort === 'stars'} onClick={() => setSort('stars')}>{t('w41.f.stars')}</button>
        <button type="button" className={sort === 'heat' ? 'on' : ''} aria-pressed={sort === 'heat'} onClick={() => setSort('heat')}>{t('w41.f.heat')}</button>
        <button type="button" className={league ? 'on' : ''} aria-expanded={picker === 'league'} onClick={() => setPicker(picker === 'league' ? '' : 'league')}>{league ? t('w41.lg.' + league) : t('w41.f.league')}</button>
        <button type="button" className={team ? 'on' : ''} aria-expanded={picker === 'team'} onClick={() => setPicker(picker === 'team' ? '' : 'team')}>{(team && teamOptions(all, '').find((o) => o.k === team)?.label) || t('w41.f.team')}</button>
      </div>
      <input className="wm-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('w41.f.search')} aria-label={t('w41.f.search')} />
      {picker === 'league' ? <Picker title={t('w41.f.pickLeague')} all={t('w41.f.allLeagues')} value={league}
        options={LEAGUES.concat('other').filter((l) => all.some((r) => (leagueOf(r) || 'other') === l)).map((l) => ({ k: l, label: t('w41.lg.' + l) }))}
        onPick={(k) => { setLeague(k); setPicker(''); }} />
        : picker === 'team' ? <Picker title={t('w41.f.pickTeam')} all={t('w41.f.allTeams')} value={team} options={teamOptions(all, league)} onPick={(k) => { setTeam(k); setPicker(''); }} />
          : !w.rumours ? <p className="wm-empty">{w.loading ? t('w41.loading') : t('w41.offline')}</p>
            : <Pager items={list} per={5} empty={<p>{t('w41.f.none')}</p>} render={(r) => <RumourRow key={r.id} r={r} onOpen={() => onOpen(r.id)} />} />}
      <Hint id="wire">{t('w41.hint')}</Hint>
    </> : <MyCalls tab={callTab} setTab={setCallTab} onOpen={onOpen} />}
  </Screen>;
}

function teamOptions(all: Rumour[], league: string) {
  const m = new Map<string, string>();
  for (const r of all) if (!league || (leagueOf(r) || 'other') === league) for (const c of clubsOf(r)) if (c.id && c.name && !m.has(c.id)) m.set(c.id, c.name);
  return [...m].map(([k, label]) => ({ k, label })).sort((a, b) => a.label.localeCompare(b.label));
}

function Picker({ title, all, value, options, onPick }: { title: string; all: string; value: string; options: { k: string; label: string }[]; onPick: (k: string) => void }) {
  return <div className="wm-pick" role="dialog" aria-label={title}>
    <p className="wm-pick__t">{title}</p>
    <Pager items={[{ k: '', label: all }, ...options]} per={5} render={(o) => <button key={o.k || '_'} type="button" className={'wm-pick__o' + (o.k === value ? ' on' : '')} aria-pressed={o.k === value} onClick={() => { sfx('ui.tap'); onPick(o.k); }} dir="auto">{o.label}</button>} />
  </div>;
}

function RumourRow({ r, onOpen }: { r: Rumour; onOpen: () => void }) {
  const t = useT(); const s = useSave(); const w = useWire();
  const mine = callOf(w, r.id);
  const m = pct(marketNow(r, w)), star = starOf(r);
  return <button type="button" className="wm-row" onClick={onOpen}>
    <span className="wm-row__who">
      <b dir="auto">{r.playerName}</b>
      <small><span dir="auto">{r.currentClubName}</span> {t.rtl ? '←' : '→'} <span dir="auto">{r.linked[0]?.name || t('w41.row.someone')}</span>{r.linked.length > 1 ? ' +' + (r.linked.length - 1) : ''}</small>
    </span>
    <span className="wm-row__stat"><b>{m}%</b><small>{t('w41.row.mkt')}</small></span>
    <span className="wm-row__stat"><b>{star > 0 ? '★'.repeat(star) : '·'}</b><small>{t('w41.row.heat')} {r.heat || 0}</small></span>
    <span className="wm-row__you">{mine ? <span className={'wm-side ' + (mine.yes ? 'is-moves' : 'is-stays')}>{side(t, mine.yes)}<small>×{mine.s}</small></span>
      : isWatched(s, r.id) ? <span className="wm-eye">{t('w41.row.watching')}</span> : null}</span>
  </button>;
}

// ---------------------------------------------------------------- my calls: open · resolved · watching
function MyCalls({ tab, setTab, onOpen }: { tab: CallTab; setTab: (k: CallTab) => void; onOpen: (rid: string) => void }) {
  const t = useT(); const s = useSave(); const w = useWire();
  const calls = w.mine?.calls || [];
  useEffect(() => { markCallsSeen(calls); }, [calls]);
  const open = calls.filter((c) => !c.done), done = calls.filter((c) => c.done).sort((a, b) => (b.at || 0) - (a.at || 0));
  const watching = watchList(s);
  return <>
    <Chips value={tab} onChange={setTab} options={[{ k: 'open', label: t('w41.my.open') + ' ' + open.length }, { k: 'done', label: t('w41.my.done') + ' ' + done.length }, { k: 'watch', label: t('w41.my.watch') + ' ' + watching.length }]} />
    {tab === 'watch' ? <Pager items={watching} per={5} empty={<p>{t('w41.my.noneWatch')}</p>} render={(x) => { const r = (w.rumours || []).find((q) => q.id === x.rid); return r ? <RumourRow key={x.rid} r={r} onOpen={() => onOpen(r.id)} /> : <div key={x.rid} className="wm-row is-gone"><span className="wm-row__who"><b dir="auto">{x.name}</b><small>{t('w41.my.gone')}</small></span></div>; }} />
      : <Pager items={tab === 'open' ? open : done} per={5} empty={<p>{tab === 'open' ? t('w41.my.noneOpen') : t('w41.my.noneDone')}</p>} render={(c) => <CallRow key={c.rid} c={c} onOpen={() => onOpen(c.rid)} />} />}
  </>;
}

function CallRow({ c, onOpen }: { c: WireCall; onOpen: () => void }) {
  const t = useT();
  const now = c.mNow ?? c.m, v = c.done ? c.pts || 0 : c.paper || 0;
  const res = c.done ? (c.outcome === 'void' ? t('w41.r.void') : c.right ? t('w41.r.right') : t('w41.r.wrong')) : t('w41.my.move', { a: pct(c.m), b: pct(now) });
  return <button type="button" className={'wm-row' + (c.done ? (c.outcome === 'void' ? ' is-void' : c.right ? ' is-right' : ' is-wrong') : '')} onClick={onOpen}>
    <span className="wm-row__who"><b dir="auto">{c.player || '—'}</b><small><span className={'wm-side ' + (c.yes ? 'is-moves' : 'is-stays')}>{side(t, c.yes)}</span> {stake(t, c.s)}</small></span>
    <span className="wm-row__stat wm-row__stat--wide"><b className={v < 0 ? 'neg' : v > 0 ? 'pos' : ''}>{c.outcome === 'void' ? '0' : num(r1(v), true)}</b><small>{res}</small></span>
  </button>;
}

// ---------------------------------------------------------------- one rumour
function RumourScreen({ r, onBack, onCall }: { r: Rumour; onBack: () => void; onCall: () => void }) {
  const t = useT(); const s = useSave(); const w = useWire();
  const { need, mayCall } = useCallGate();
  const mine = callOf(w, r.id);
  const m = pct(marketNow(r, w)), star = starOf(r);
  const b = w.board[r.id], open = !b || b.state === 'open';
  const correctable = !!mine && !mine.corrected && !mine.done && Date.now() - mine.at < WR.WIRE.CORRECT_MIN * 60e3;
  const watched = isWatched(s, r.id);
  const watch = () => { const on = toggleWatch(r); if (on) toast('info', t('w41.r.watchOn', { p: r.playerName })); };
  const main = mine && !correctable ? null
    : !open ? <button type="button" className="wm-btn" disabled>{t('w41.r.frozen')}</button>
      : !mayCall ? <button type="button" className="wm-btn" disabled>{t('w41.r.locked', { n: need })}</button>
        : <button type="button" className="wm-btn wm-btn--main" onClick={() => { sfx('sheet.open'); onCall(); }}>{correctable ? t('w41.c.change') : t('w41.r.callIt')}</button>;
  return <Screen title={<span dir="auto">{r.playerName}</span>} sub={<><span dir="auto">{r.currentClubName}</span> · {winLabel(t, r.window)}</>} onBack={onBack} tone="market"
    footer={<><button type="button" className={'wm-btn wm-btn--ghost' + (watched ? ' is-on' : '')} aria-pressed={watched} onClick={watch}>{watched ? t('w41.r.watching') : t('w41.r.watch')}</button>{main}</>}>
    <section className="wm-mkt" aria-label={t('w41.r.saysL')}>
      <small>{t('w41.r.saysL')}</small>
      <b>{t('w41.r.says', { n: m })}</b>
      <span className="wm-bar" aria-hidden="true"><i style={{ width: m + '%' }} /></span>
      <span className="wm-mkt__meta">{t('w41.r.heat', { n: r.heat || 0 })}{star > 0 ? ' · ' + t('w41.r.stars', { n: star }) : ''}</span>
    </section>
    <section className="wm-story">
      <h2>{t('w41.r.story')}</h2>
      {r.fact && t.lang === 'en' ? <p className="wm-story__fact">{r.fact}</p> : null}
      <ul aria-label={t('w41.r.links')}>{r.linked.slice(0, 3).map((l, k) => <li key={k}><Crest club={l.clubId ? clubById(l.clubId) : undefined} size={22} /><span dir="auto">{l.name}</span><em className={'wm-stage is-' + stageKey(l.stage)}>{t('md4.mk.stage.' + stageKey(l.stage))}</em></li>)}</ul>
    </section>
    {mine && <MyCall c={mine} />}
  </Screen>;
}

function MyCall({ c }: { c: WireCall }) {
  const t = useT();
  const now = c.mNow ?? c.m, v = c.done ? c.pts || 0 : c.paper || 0;
  return <section className={'wm-mine' + (c.done ? (c.right ? ' is-right' : c.outcome === 'void' ? '' : ' is-wrong') : '')}>
    <span className="wm-mine__k">{c.done ? (c.outcome === 'void' ? t('w41.r.void') : c.right ? t('w41.r.right') : t('w41.r.wrong')) : t('w41.r.mine')}</span>
    <p>{t('w41.r.mineAt', { s: side(t, c.yes), b: stake(t, c.s), a: pct(c.m), n: pct(now) })}</p>
    <b className={v < 0 ? 'neg' : 'pos'}>{c.done ? t('w41.r.settled', { p: num(r1(v), true) }) : t('w41.r.ifNow', { p: num(r1(v), true) })}</b>
  </section>;
}

// ---------------------------------------------------------------- call it
function CallScreen({ r, onBack, onDone }: { r: Rumour; onBack: () => void; onDone: () => void }) {
  const t = useT(); const s = useSave(); const w = useWire();
  const { left } = useCallGate();
  const mine = callOf(w, r.id);
  const correctable = !!mine && !mine.corrected && !mine.done && Date.now() - mine.at < WR.WIRE.CORRECT_MIN * 60e3;
  const m = marketNow(r, w);
  const [yes, setYes] = useState<boolean | null>(null);
  const [st, setSt] = useState(1);
  const [busy, setBusy] = useState(false);
  const deal = yes == null ? null : marketDeal(yes, st, m);
  const post = async () => {
    if (yes == null || busy) return;
    setBusy(true);
    const res = await v3<{ call: WireCall }>(correctable ? 'wire.correct' : 'wire.file', { dev: s.dev, nick: s.nick, rid: r.id, yes, s: st, club: null, fee: null });
    setBusy(false);
    if (!res.ok) { toast('warn', t.or('md4.mk.err.' + res.error, 'err.generic')); return; }
    sfx(st === 3 ? 'drop' : 'publish.advanced');
    if (st === 3) confetti(['#1FA7D9', '#F2B632', '#F3F1EC'], 36);
    if (!correctable) { onWireFiled(); if (!isWatched(s, r.id)) toggleWatch(r); }
    await refreshWire(true);
    onDone();
  };
  const blocked = !correctable && left <= 0;
  return <Screen title={t('w41.c.title')} sub={<span dir="auto">{r.playerName}</span>} onBack={onBack} tone="market"
    footer={<button type="button" className="wm-btn wm-btn--main" onClick={post} disabled={yes == null || busy || !w.online || blocked}>
      {busy ? t('w41.c.posting') : yes == null ? t('w41.c.pick') : correctable ? t('w41.c.change') : t('w41.c.post')}
    </button>}>
    <p className="wm-lbl">{t('w41.c.side')}</p>
    <div className="wm-yn" role="group" aria-label={t('w41.c.side')}>
      {[true, false].map((y) => <button key={String(y)} type="button" className={(y ? 'is-moves' : 'is-stays') + (yes === y ? ' on' : '')} aria-pressed={yes === y} onClick={() => { sfx('ui.tap'); setYes(y); }}>
        <b>{t(y ? 'w41.c.moves' : 'w41.c.stays')}</b><small>{t('w41.row.mkt')} {y ? pct(m) : 100 - pct(m)}%</small>
      </button>)}
    </div>
    <p className="wm-lbl">{t('w41.c.how')}</p>
    <div className="wm-stakes" role="group" aria-label={t('w41.c.how')}>
      {[1, 2, 3].map((k) => { const x = yes == null ? null : marketDeal(yes, k, m); return <button key={k} type="button" className={(st === k ? 'on' : '') + (k === 3 ? ' is-all' : '')} aria-pressed={st === k} onClick={() => { sfx('ui.tap'); setSt(k); }}>
        <b>{stake(t, k)}</b><small>{t('w41.stake.d' + k)}</small>{x && <span><em className="pos">+{x.win}</em> <em className="neg">−{x.lose}</em></span>}
      </button>; })}
    </div>
    <p className="wm-deal" aria-live="polite">{deal ? t('w41.c.deal', { w: deal.win, a: t(yes ? 'w41.c.movesL' : 'w41.c.staysL'), l: deal.lose, b: t(yes ? 'w41.c.staysL' : 'w41.c.movesL') }) : ' '}</p>
    <p className="wm-fine">{blocked ? t('w41.c.none', { n: WR.WIRE.DAILY_CALLS }) : t('w41.c.pays', { c: MARKET_COINS[Math.max(0, Math.min(3, starOf(r)))] }) + ' ' + t('w41.c.left', { n: left, m: WR.WIRE.CORRECT_MIN })}</p>
  </Screen>;
}

