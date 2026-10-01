// Live (CONCEPT4 §2, RULES4 §2): Deadline Day as a 90-second stream. This is the lobby: the clock, the one button
// (go live), who's on, your last stream and the DD Live board. The stream itself is the play lane's in-window screen
// (route { n: 'play', mode: 'deadline' }); lib/live.ts starts it and, on a real deadline day, sends the ranked log up.
import { useEffect, useState } from 'react';
import { useT, num, fmtDate } from '../lib/i18n';
import { useSave } from '../lib/save';
import { lastWindow } from '../lib/driver';
import { sfx } from '../lib/sfx';
import { Icon, TopBar } from '../ui/game';
import { useNow } from '../ui/bits';
import { Pop, Count, Stamp } from '../ui/juice';
import { GridRow, ordinal, Handle } from '../ui/social';
import { Avatar } from '../ui/screenbits';
import {
  ddLiveActive, ddResultsDue, ddNext, ddCountdown, hms, presence, fetchDDBoard, fetchDDResults, startStream, liveStream, myDDRun, markDD, syncDDLive, isRankedSeed, STREAM,
  type DDBoard, type DDResults,
} from '../lib/live';
import type { Chrome } from '../App';
import '../styles/live.css';

const DAY = 864e5;

export function DDLiveScreen(chrome: Chrome) {
  const t = useT(); const s = useSave();
  const now = useNow(1000);
  const dd = ddLiveActive(now), res = ddResultsDue(now), next = ddNext(now);
  const day = dd?.day || res?.day;
  const [board, setBoard] = useState<DDBoard | null>(null);
  const [results, setResults] = useState<DDResults | null>(null);
  const [here, setHere] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const run = dd ? myDDRun(s, dd.day) : null;
  const stream = liveStream(s);
  const last = lastWindow('deadline', s);

  useEffect(() => { void syncDDLive(); presence().then((r) => { if (r.ok) setHere(r.now); }); }, []);
  useEffect(() => {
    if (!day) return;
    let on = true;
    if (dd) fetchDDBoard(day).then((r) => { if (on && r.ok) setBoard(r); });
    fetchDDResults(day).then((r) => { if (on && r.ok) { setResults(r); if (!dd) markDD(day, 'resultsSeen'); } });
    return () => { on = false; };
  }, [day, !!dd, run?.sent]); // eslint-disable-line react-hooks/exhaustive-deps

  const play = () => chrome.go({ n: 'play', mode: 'deadline', key: Date.now() });
  const go = async (ranked: boolean) => {
    if (busy) return;
    setBusy(true); setErr('');
    const r = await startStream(ranked, ranked ? t('md4.live.rankedLabel') : t('md4.live.practiceLabel'));
    setBusy(false);
    if (!r.ok) { setErr(t.or('md4.live.err.' + r.err, 'err.generic')); sfx('os.locked'); return; }
    sfx('os.open'); play();
  };

  // The one action: resume a running stream, else today's ranked stream, else a practice stream.
  const resumable = stream && !stream.over;
  const rankedOpen = !!dd && !(run && (run.sent || Date.now() > run.at + STREAM.seconds * 1000 + 45e3));
  const primary = resumable
    ? { label: t('md4.live.resume'), sub: t('md4.live.resumeSub', { s: Math.max(0, Math.ceil(((stream!.end || Date.now()) - now) / 1000)) }), on: play, ranked: stream!.ranked }
    : rankedOpen ? { label: t('md4.live.goRanked'), sub: t('md4.live.goRankedSub', { s: STREAM.seconds }), on: () => go(true), ranked: true }
      : { label: t('md4.live.goPractice'), sub: t('md4.live.goPracticeSub', { s: STREAM.seconds }), on: () => go(false), ranked: false };

  // The clock: on a deadline day, time left on the ranked board; otherwise days (then hours) to the next one.
  const clock = dd ? { big: hms(ddCountdown(dd, now).ms), cap: t('md4.live.clock.closes') }
    : next ? (next.opensAt - now < 7 * DAY ? { big: hms(next.opensAt - now), cap: t('md4.live.clock.next', { d: fmtDate(next.opensAt + 12 * 36e5, t.lang, { weekday: 'short', day: 'numeric', month: 'short' }) }) }
      : { big: t('md4.live.clock.days', { n: Math.ceil((next.opensAt - now) / DAY) }), cap: t('md4.live.clock.next', { d: fmtDate(next.opensAt + 12 * 36e5, t.lang, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }) })
      : null;
  const players = board?.players ?? results?.players ?? 0;

  return <div className="g-screen lv4">
    <TopBar back={{ label: t('md4.home'), onClick: chrome.home }} title={t('os.app.live')} />
    <section className={'lv4-hero' + (dd ? ' is-on' : '')} aria-labelledby="lv4-h">
      <p className="lv4-hero__k">{dd ? <span className="lv4-rec"><i aria-hidden="true" />{t('md4.live.onAir')}</span> : <span>{t('md4.live.offAir')}</span>}</p>
      <h1 id="lv4-h" className="lv4-hero__t">{dd ? t('md4.live.hedLive') : t('md4.live.hed')}</h1>
      {clock && <div className="lv4-clock"><b className="lv4-clock__n" role="timer" aria-live="off">{clock.big}</b><span className="lv4-clock__c">{clock.cap}</span></div>}
      <ul className="lv4-facts" aria-label={t('md4.live.factsL')}>
        <li><b>{STREAM.stories}</b><span>{t('md4.live.facts.stories')}</span></li>
        <li><b>{STREAM.dms}</b><span>{t('md4.live.facts.dms')}</span></li>
        <li><b>{STREAM.seconds}</b><span>{t('md4.live.facts.seconds')}</span></li>
        <li><b>{STREAM.contacts}</b><span>{t('md4.live.facts.contacts')}</span></li>
      </ul>
      <Pop className={'lv4-go' + (primary.ranked ? ' is-ranked' : '')} onTap={primary.on} sound={null} disabled={busy}>
        <span className="lv4-go__dot" aria-hidden="true" />
        <span className="lv4-go__t"><b>{busy ? t('md4.live.starting') : primary.label}</b><small>{primary.sub}</small></span>
        <Icon n="play" size={22} />
      </Pop>
      {dd && !rankedOpen && !resumable && <button className="lv4-link" onClick={() => { void go(false); }}>{t('md4.live.alsoPractice')}</button>}
      {err && <p className="lv4-err" role="alert">{err}</p>}
      <p className="lv4-hero__fine">{dd ? t('md4.live.fairRanked') : t('md4.live.fairPractice')}</p>
    </section>

    <section className="lv4-who" aria-label={t('md4.live.whoL')}>
      <span className="lv4-who__dot" aria-hidden="true" />
      <span>{dd ? (players > 0 ? t('md4.live.whoRanked', { n: num(players) }) : t('md4.live.whoRankedNone')) : here && here > 1 ? t('md4.live.whoToday', { n: num(here) }) : t('md4.live.whoQuiet')}</span>
    </section>

    {dd && run?.sent && <RunCard score={run.score} tier={run.tier} row={run.row} rank={run.rank} players={run.players} err={run.err} />}

    {last && <section className="lv4-last" aria-labelledby="lv4-last-h">
      <header><h2 id="lv4-last-h">{t('md4.live.last')}</h2><span>{isRankedSeed(s, last.seed) ? t('md4.live.ranked') : t('md4.live.practice')} · {fmtDate(last.at, t.lang, { day: 'numeric', month: 'short' })}</span></header>
      <div className="lv4-last__b">
        <b className={'lv4-last__n' + (last.total < 0 ? ' is-neg' : '')}>{num(last.total, true)}</b>
        <span className="lv4-last__tier">{t('tier4.' + last.tier)}</span>
        <GridRow row={last.row} size="lg" />
      </div>
      <p className="lv4-last__k">{t('md4.grid.key')}</p>
    </section>}

    {results && (dd || res) && <Board r={results} live={!!dd} />}
    {!day && !last && <p className="lv4-empty">{t('md4.live.firstTime', { s: STREAM.seconds })}</p>}
  </div>;
}

function RunCard({ score = 0, tier = '', row = '', rank, players, err }: { score?: number; tier?: string; row?: string; rank?: number; players?: number; err?: string }) {
  const t = useT();
  return <section className="lv4-run" aria-live="polite">
    <Stamp text={t('md4.live.inBoard')} tone="cool" size="sm" sound={false} />
    <div className="lv4-run__b">
      <b className="lv4-run__n"><Count n={score} sign /></b>
      <span>{tier ? t('tier4.' + tier) : ''}</span>
      {row && <GridRow row={row} />}
    </div>
    {rank ? <p className="lv4-run__rank"><b>{ordinal(t, rank)}</b> {t('md4.live.ofN', { n: num(players || rank) })}</p> : err ? <p className="lv4-run__rank">{t.or('md4.live.err.' + err, 'err.generic')}</p> : null}
  </section>;
}

function Board({ r, live }: { r: DDResults; live: boolean }) {
  const t = useT(); const s = useSave();
  return <section className="lv4-board" aria-labelledby="lv4-board-h">
    <header><h2 id="lv4-board-h">{t('md4.live.board')}</h2><span>{live ? t('md4.live.boardLive') : t('md4.live.boardFinal', { d: fmtDate(r.opensAt + 12 * 36e5, t.lang, { day: 'numeric', month: 'short' }) })}</span></header>
    {r.me && <p className="lv4-board__me">{t('md4.live.youPlace', { r: ordinal(t, r.me.rank), n: num(r.players) })}</p>}
    {r.rows.length ? <ol className="lv4-rows">
      {r.rows.map((x, k) => <li key={k} className={x.me ? 'is-me' : ''}>
        <span className="lv4-rows__r">{ordinal(t, k + 1)}</span>
        <Avatar name={x.me ? s.nick || x.nick : x.nick} size={28} me={x.me} />
        <span className="lv4-rows__n">{x.me ? t('common.you') : <Handle>{x.nick}</Handle>}</span>
        <GridRow row={x.row} size="sm" />
        <b className="lv4-rows__s">{num(x.score, true)}</b>
      </li>)}
    </ol> : <p className="lv4-empty">{t('md4.live.boardEmpty')}</p>}
  </section>;
}
