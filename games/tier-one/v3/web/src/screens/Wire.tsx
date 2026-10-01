// Market (CONCEPT4 §9): real rumours, real outcomes, your calls. The Wire renamed and promoted to its own app.
// Watch any rumour for free from day one (the tray tells you when it moves); call HE MOVES / HE STAYS from Level 2,
// backed as a Hint, a Post or a Drop, scored on the server by the market rule (wire.mjs wirePoints: back it when the
// market is cheap and you're right, you win big; follow a 90% market and you win little). Right calls pay XP, coins by
// the player's star and a Tip (lib/wireData.ts settleMarket). Nothing here touches a Daily or a ranked board.
import { useEffect, useMemo, useState } from 'react';
import { useT, num, fmtDate, type T } from '../lib/i18n';
import { useSave } from '../lib/save';
import { v3 } from '../lib/api';
import { useWire, refreshWire, stageOf, windowParts, isWatched, toggleWatch, watchList, marketNow, marketDeal, MARKET_COINS, type Rumour, type WireCall } from '../lib/wireData';
import { clubById, WORLD, WR } from '../lib/engine';
import { onWireFiled, toast } from '../lib/meta';
import { levelInfo, callLevel } from '../ui/phone';
import { useTips, TIPS } from '../lib/tips';
import { sfx } from '../lib/sfx';
import { Crest } from '../ui/bits';
import { Icon, Kit, TopBar, confetti } from '../ui/game';
import { Pop, Sheet, Stamp, Count } from '../ui/juice';
import type { Chrome } from '../App';
import '../styles/football.css';

type Tab = 'rumours' | 'watch' | 'calls';
const BACK = ['x1', 'x2', 'allin'] as const; // the words: Hint · Post · Drop (i18n back4.*)
const pct = (x: number) => Math.round(x * 100);
const r1 = (x: number) => Math.round(x * 10) / 10;
/** '2027-01' → 'Winter window 2027'. Kept for other screens that label a rumour's window. */
export const winLabel = (t: T, w: string) => { const p = windowParts(w); return p ? t('md4.mk.win.' + p.k, { y: p.y }) : w; };
const stageKey = (s: string) => (['interest', 'talks', 'bid', 'agreed'].includes(s) ? s : 'interest');
const playerOf = (r: Rumour) => WORLD.players.find((x) => x.id === r.playerId);

export function WireScreen({ rid, ...chrome }: Chrome & { rid?: string }) {
  const t = useT(); const s = useSave(); const w = useWire();
  const [tab, setTab] = useState<Tab>(() => (rid && (w.mine?.calls || []).some((c) => c.rid === rid) ? 'calls' : 'rumours'));
  const [sel, setSel] = useState<string | undefined>(rid);
  const [pre, setPre] = useState<boolean | undefined>();
  useEffect(() => { void refreshWire(); }, []);
  const rs = useMemo(() => [...(w.rumours || [])].sort((a, b) => (b.heat || 0) - (a.heat || 0)), [w.rumours]);
  const cur = sel ? rs.find((r) => r.id === sel) : undefined;
  const watching = watchList(s);
  const calls = w.mine?.calls || [];
  const lv = levelInfo(s), need = callLevel('market'), mayCall = lv.n >= need;
  const left = Math.max(0, WR.WIRE.DAILY_CALLS - w.callsToday);
  const tips = useTips();
  const open = (id: string, yes?: boolean) => { sfx('sheet.open'); setPre(yes); setSel(id); };

  return <div className="g-screen mk">
    <TopBar back={{ label: t('md4.home'), onClick: chrome.home }} title={t('os.app.market')} />
    <section className="mk-hero" aria-labelledby="mk-h">
      <h1 id="mk-h" className="mk-hero__t">{t('md4.mk.tagline')}</h1>
      <dl className="mk-stats">
        <div><dt>{t('md4.mk.cred')}</dt><dd><Count n={w.mine ? Math.round(w.mine.cred) : 0} /></dd></div>
        <div><dt>{t('md4.mk.hit')}</dt><dd>{w.mine && w.mine.resolved > 0 ? pct(w.mine.hitRate) + '%' : '–'}</dd></div>
        <div><dt>{t('md4.mk.left')}</dt><dd>{left}<small>/{WR.WIRE.DAILY_CALLS}</small></dd></div>
        <div><dt>{t('md4.mk.tips')}</dt><dd>{tips}<small>/{TIPS.max}</small></dd></div>
      </dl>
      {!mayCall && <Reach need={need} />}
    </section>

    <div className="mk-tabs" role="tablist" aria-label={t('os.app.market')}>
      {(['rumours', 'watch', 'calls'] as const).map((k) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => { sfx('ui.tap'); setTab(k); }}>
        {t('md4.mk.tab.' + k)}<span className="mk-tabs__n">{k === 'rumours' ? rs.length : k === 'watch' ? watching.length : calls.length}</span>
      </button>)}
    </div>

    {tab === 'rumours' && <>
      {!w.rumours && <p className="mk-empty">{w.loading ? t('md4.mk.loading') : t('md4.mk.offline')}</p>}
      {w.rumours && !w.online && <p className="mk-empty">{t('md4.mk.offline')}</p>}
      <div className="mk-list">{rs.map((r) => <RumourCard key={r.id} r={r} mayCall={mayCall} onOpen={(yes) => open(r.id, yes)} />)}</div>
      {w.asOf && <p className="mk-fine">{t('md4.mk.asOf', { d: w.asOf })}</p>}
    </>}

    {tab === 'watch' && (watching.length ? <div className="mk-list">{watching.map((x) => { const r = rs.find((q) => q.id === x.rid); return r ? <RumourCard key={x.rid} r={r} mayCall={mayCall} onOpen={(yes) => open(r.id, yes)} /> : <div key={x.rid} className="mk-gone"><b>{x.name}</b><span>{t('md4.mk.gone')}</span></div>; })}</div>
      : <div className="mk-blank"><Icon n="eye" size={26} /><b>{t('md4.mk.watchNone')}</b><p>{t('md4.mk.watchNoneB')}</p><Pop className="mk-btn" onTap={() => setTab('rumours')}>{t('md4.mk.browse')}</Pop></div>)}

    {tab === 'calls' && <Calls calls={calls} onOpen={(id) => open(id)} onBrowse={() => setTab('rumours')} mayCall={mayCall} />}

    {cur && <CallSheet key={cur.id} r={cur} pre={pre} onClose={() => setSel(undefined)} />}
  </div>;
}

function Reach({ need }: { need: number }) {
  const t = useT(); const s = useSave(); const lv = levelInfo(s);
  const p = Math.max(0, Math.min(100, Math.round((100 * (lv.n - 1 + lv.pct / 100)) / Math.max(1, need - 1))));
  return <div className="mk-reach" role="status">
    <b>{t('e4.level.reach', { n: need })}</b>
    <span className="mk-reach__bar" aria-hidden="true"><i style={{ width: p + '%' }} /></span>
    <small>{t('ma4.callsAt', { n: need })} · {t('ma4.watchFree')}</small>
  </div>;
}

// ---------------------------------------------------------------- one rumour
function RumourCard({ r, mayCall, onOpen }: { r: Rumour; mayCall: boolean; onOpen: (yes?: boolean) => void }) {
  const t = useT(); const s = useSave(); const w = useWire();
  const b = w.board[r.id];
  const mine = b?.mine || (w.mine?.calls || []).find((c) => c.rid === r.id) || null;
  const m = marketNow(r, w);
  const from = clubById(r.currentClubId), to = r.linked[0]?.clubId ? clubById(r.linked[0].clubId) : undefined;
  const st = stageKey(stageOf(r));
  const watched = isWatched(s, r.id);
  const live = !b || b.state === 'open';
  return <article className={'mk-card' + (mine ? ' is-called' : '')}>
    <button type="button" className="mk-card__main" onClick={() => onOpen()}>
      <Kit club={from} player={playerOf(r)} size={50} />
      <span className="mk-card__who">
        <b className="mk-card__name" dir="auto">{r.playerName}</b>
        <span className="mk-card__route"><Crest club={from} size={18} /><span dir="auto">{r.currentClubName}</span><Icon n={t.rtl ? 'back' : 'arrow'} size={14} /><Crest club={to} size={18} /><span dir="auto">{r.linked[0]?.name || t('md4.mk.someone')}</span>{r.linked.length > 1 && <small>+{r.linked.length - 1}</small>}</span>
        <span className="mk-card__tags"><span className={'mk-stage mk-stage--' + st}>{t('md4.mk.stage.' + st)}</span><span className="mk-card__win">{winLabel(t, r.window)}</span></span>
      </span>
    </button>
    <p className="mk-card__mkt">{t('md4.mk.says', { n: pct(m) })}</p>
    <span className="mk-bar" aria-hidden="true"><i style={{ width: pct(m) + '%' }} /></span>
    <div className="mk-card__acts">
      <Pop className={'mk-watch' + (watched ? ' is-on' : '')} onTap={() => { const on = toggleWatch(r); if (on) toast('info', t('md4.mk.watchOn', { p: r.playerName })); }} sound={watched ? 'ui.tap' : 'ui.pop'} aria-pressed={watched}>
        <Icon n="eye" size={18} />{watched ? t('md4.mk.watching') : t('md4.mk.watch')}
      </Pop>
      {mine ? <button type="button" className="mk-mine" onClick={() => onOpen()}>
        <span className={'mk-side ' + (mine.yes ? 'is-moves' : 'is-stays')}>{mine.yes ? t('md4.mk.moves') : t('md4.mk.stays')}</span>
        <span>{t('back4.' + BACK[mine.s - 1])}</span>
        {mine.done && mine.outcome !== 'void' && <b className={mine.right ? 'pos' : 'neg'}>{num(r1(mine.pts || 0), true)}</b>}
      </button>
        : live && mayCall ? <Pop className="mk-btn mk-btn--call" onTap={() => onOpen()} sound="sheet.open">{t('md4.mk.callIt')}</Pop>
          : !live ? <span className="mk-frozen"><Icon n="lock" size={14} />{t('md4.mk.frozen')}</span> : null}
    </div>
  </article>;
}

// ---------------------------------------------------------------- your calls: open ones with heat, resolved as a thread
function Calls({ calls, onOpen, onBrowse, mayCall }: { calls: WireCall[]; onOpen: (rid: string) => void; onBrowse: () => void; mayCall: boolean }) {
  const t = useT();
  const openC = calls.filter((c) => !c.done), done = calls.filter((c) => c.done).sort((a, b) => (b.at || 0) - (a.at || 0));
  if (!calls.length) return <div className="mk-blank"><Icon n="target" size={26} /><b>{t('md4.mk.callsNone')}</b><p>{mayCall ? t('md4.mk.callsNoneB') : t('md4.mk.callsLocked', { n: callLevel('market') })}</p><Pop className="mk-btn" onTap={onBrowse}>{t('md4.mk.browse')}</Pop></div>;
  return <>
    {openC.length > 0 && <section className="mk-sec" aria-labelledby="mk-open-h">
      <h2 id="mk-open-h">{t('md4.mk.open', { n: openC.length })}</h2>
      <div className="mk-open">{openC.map((c) => { const now = c.mNow ?? c.m, d = pct(now) - pct(c.m), good = c.yes ? d >= 0 : d <= 0; return <button key={c.rid} type="button" className="mk-oc" onClick={() => onOpen(c.rid)}>
        <span className={'mk-side ' + (c.yes ? 'is-moves' : 'is-stays')}>{c.yes ? t('md4.mk.moves') : t('md4.mk.stays')}</span>
        <b className="mk-oc__p" dir="auto">{c.player || '—'}</b>
        <span className="mk-oc__m">{t('md4.mk.moved', { a: pct(c.m), b: pct(now) })}</span>
        <span className={'mk-oc__heat ' + (good ? 'is-good' : 'is-bad')}>{d === 0 ? t('md4.mk.flat') : (d > 0 ? '+' : '−') + Math.abs(d) + ' ' + t('md4.mk.pts')}</span>
        {c.heat ? <span className="mk-oc__hot">{t('md4.mk.heat', { n: c.heat })}</span> : null}
      </button>; })}</div>
    </section>}
    {done.length > 0 && <section className="mk-sec" aria-labelledby="mk-done-h">
      <h2 id="mk-done-h">{t('md4.mk.resolved')}</h2>
      <ol className="mk-thread">{done.map((c) => <li key={c.rid} className={c.outcome === 'void' ? 'is-void' : c.right ? 'is-right' : 'is-wrong'}>
        <button type="button" onClick={() => onOpen(c.rid)}>
          <span className="mk-thread__news" dir="auto"><b>{c.player || '—'}</b> {c.outcome === 'moved' ? t('md4.mk.out.moved') : c.outcome === 'stayed' ? t('md4.mk.out.stayed') : t('md4.mk.out.void')}</span>
          <span className="mk-thread__you">{t('md4.mk.youSaid', { s: c.yes ? t('md4.mk.moves') : t('md4.mk.stays'), b: t('back4.' + BACK[c.s - 1]) })}</span>
          <span className="mk-thread__res">{c.outcome === 'void' ? t('md4.mk.void') : c.right ? t('md4.mk.right') : t('md4.mk.wrong')}<b>{c.outcome === 'void' ? '0' : num(r1(c.pts || 0), true)}</b></span>
        </button>
      </li>)}</ol>
    </section>}
  </>;
}

// ---------------------------------------------------------------- the call sheet: one sentence says the deal
function CallSheet({ r, pre, onClose }: { r: Rumour; pre?: boolean; onClose: () => void }) {
  const t = useT(); const s = useSave(); const w = useWire();
  const b = w.board[r.id];
  const mine = b?.mine || (w.mine?.calls || []).find((c) => c.rid === r.id) || null;
  const m = marketNow(r, w);
  const [yes, setYes] = useState<boolean | null>(pre ?? null);
  const [st, setSt] = useState(1);
  const [busy, setBusy] = useState(false);
  const [posted, setPosted] = useState(0);
  const from = clubById(r.currentClubId);
  const open = !b || b.state === 'open';
  const correctable = !!mine && !mine.corrected && !mine.done && Date.now() - mine.at < WR.WIRE.CORRECT_MIN * 60e3;
  const lv = levelInfo(s), need = callLevel('market'), mayCall = lv.n >= need;
  const watched = isWatched(s, r.id);
  const left = Math.max(0, WR.WIRE.DAILY_CALLS - w.callsToday);
  const star = playerOf(r)?.star || 0;
  const deal = yes == null ? null : marketDeal(yes, st, m);
  const side = (y: boolean) => (y ? t('md4.mk.movesL') : t('md4.mk.staysL'));
  const post = async () => {
    if (yes == null || busy) return;
    setBusy(true);
    const res = await v3<{ call: WireCall }>(correctable ? 'wire.correct' : 'wire.file', { dev: s.dev, nick: s.nick, rid: r.id, yes, s: st, club: null, fee: null });
    setBusy(false);
    if (!res.ok) { toast('warn', t.or('md4.mk.err.' + res.error, 'err.generic')); return; }
    sfx(st === 3 ? 'drop' : 'publish.advanced');
    if (st === 3) confetti(['#1FA7D9', '#F2B632', '#F3F1EC'], 36);
    if (!correctable) { onWireFiled(); if (!watched) toggleWatch(r); }
    setPosted(Date.now());
    await refreshWire(true);
  };
  return <Sheet open onClose={onClose} label={r.playerName}>
    <div className="mk-sheet">
      <header className="mk-sheet__h">
        <Kit club={from} player={playerOf(r)} size={64} />
        <div><h2 dir="auto">{r.playerName}</h2><p dir="auto">{r.currentClubName} · {winLabel(t, r.window)}</p></div>
        <button type="button" className="mk-sheet__x" onClick={onClose} aria-label={t('md4.close')}><Icon n="x" size={20} /></button>
      </header>
      <p className="mk-sheet__mkt">{t('md4.mk.says', { n: pct(m) })}</p>
      <span className="mk-bar mk-bar--lg" aria-hidden="true"><i style={{ width: pct(m) + '%' }} /></span>
      <ul className="mk-sheet__links">{r.linked.map((l, k) => <li key={k}><Crest club={l.clubId ? clubById(l.clubId) : undefined} size={22} /><span dir="auto">{l.name}</span><span className={'mk-stage mk-stage--' + stageKey(l.stage)}>{t('md4.mk.stage.' + stageKey(l.stage))}</span></li>)}</ul>
      {r.fact && t.lang === 'en' && <p className="mk-sheet__fact">{r.fact}</p>}

      {mine && !correctable ? <MyCall c={mine} slam={posted} />
        : !open ? <p className="mk-note"><Icon n="lock" size={16} />{t('md4.mk.frozenB')}</p>
          : !mayCall ? <><Reach need={need} /><Pop className={'mk-watch mk-watch--lg' + (watched ? ' is-on' : '')} onTap={() => toggleWatch(r)} aria-pressed={watched}><Icon n="eye" size={18} />{watched ? t('md4.mk.watching') : t('md4.mk.watchThis')}</Pop></>
            : <>
              {correctable && mine && <MyCall c={mine} slam={posted} />}
              <div className="mk-pick" role="group" aria-label={t('md4.mk.which')}>
                <Pop className={'mk-yn is-moves' + (yes === true ? ' is-on' : '')} onTap={() => setYes(true)} aria-pressed={yes === true}><b>{t('md4.mk.moves')}</b><small>{t('md4.mk.ynSub', { n: pct(m) })}</small></Pop>
                <Pop className={'mk-yn is-stays' + (yes === false ? ' is-on' : '')} onTap={() => setYes(false)} aria-pressed={yes === false}><b>{t('md4.mk.stays')}</b><small>{t('md4.mk.ynSub', { n: 100 - pct(m) })}</small></Pop>
              </div>
              {yes != null && <div className="mk-back" role="group" aria-label={t('md4.mk.howLoud')}>
                {[1, 2, 3].map((k) => { const x = marketDeal(yes, k, m); return <Pop key={k} className={'mk-bk' + (st === k ? ' is-on' : '') + (k === 3 ? ' is-drop' : '')} onTap={() => setSt(k)} aria-pressed={st === k}>
                  <b>{t('back4.' + BACK[k - 1])}</b><small>{t('back4.' + BACK[k - 1] + 'D')}</small><span><em className="pos">+{x.win}</em> <em className="neg">−{x.lose}</em></span>
                </Pop>; })}
              </div>}
              {deal && <p className="mk-deal" aria-live="polite">{t('md4.mk.deal', { w: deal.win, a: side(yes!), l: deal.lose, b: side(!yes) })}</p>}
              {deal && <p className="mk-pays">{t('md4.mk.pays', { c: MARKET_COINS[Math.max(0, Math.min(3, star))] })}</p>}
              <Pop className="mk-post" onTap={post} sound={null} disabled={yes == null || busy || !w.online || (!correctable && left <= 0)}>
                {busy ? t('md4.mk.posting') : correctable ? t('md4.mk.change') : yes == null ? t('md4.mk.pickSide') : t('md4.mk.post', { b: t('back4.' + BACK[st - 1]) })}
              </Pop>
              <p className="mk-fine">{!correctable && left <= 0 ? t('md4.mk.noneLeft', { n: WR.WIRE.DAILY_CALLS }) : t('md4.mk.final', { m: WR.WIRE.CORRECT_MIN, n: left })}</p>
            </>}
      <details className="mk-how"><summary>{t('md4.mk.howT')}</summary><p>{t('md4.mk.howB')}</p></details>
    </div>
  </Sheet>;
}

function MyCall({ c, slam }: { c: WireCall; slam: number }) {
  const t = useT();
  const now = c.mNow ?? c.m;
  const v = c.done ? c.pts || 0 : c.paper || 0;
  return <div className="mk-my">
    {c.done ? <Stamp key={slam || 'd'} text={c.outcome === 'void' ? t('md4.mk.void') : c.right ? t('md4.mk.right') : t('md4.mk.wrong')} tone={c.right ? 'gold' : 'dry'} size="sm" slam={!!slam} sound={!!slam} />
      : <span className={'mk-side mk-side--lg ' + (c.yes ? 'is-moves' : 'is-stays')}>{c.yes ? t('md4.mk.moves') : t('md4.mk.stays')}</span>}
    <p>{t('md4.mk.yourCall', { b: t('back4.' + BACK[c.s - 1]), a: pct(c.m), n: pct(now) })}</p>
    <p className="mk-my__v"><b className={v < 0 ? 'neg' : 'pos'}>{num(r1(v), true)}</b> <span>{c.done ? t('md4.mk.settled') : t('md4.mk.ifNow')}</span></p>
    {c.at ? <p className="mk-fine">{t('md4.mk.postedAt', { d: fmtDate(c.at, t.lang, { day: 'numeric', month: 'short' }) })}</p> : null}
  </div>;
}
