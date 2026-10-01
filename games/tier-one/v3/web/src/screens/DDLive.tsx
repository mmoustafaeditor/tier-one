// 4.1 Deadline Day lobby (UI41 §Deadline Day): one screen. The clock (on a real deadline day: time left on the ranked
// board; otherwise the countdown to the next one), what a run is, your last run, and one main button: Play ranked on a
// real deadline day, else Practice now. The run itself plays on Window.tsx (route { n: 'play', mode: 'deadline' });
// lib/live.ts starts it and, on a real deadline day, sends the ranked log up.
import { useEffect, useState } from 'react';
import { useT, num, fmtDate } from '../lib/i18n';
import { useSave } from '../lib/save';
import { lastWindow } from '../lib/driver';
import { sfx } from '../lib/sfx';
import { useNow } from '../ui/bits';
import { Pop } from '../ui/juice';
import { GridRow, ordinal } from '../ui/social';
import { Screen } from '../ui/screen';
import { ddLiveActive, ddNext, ddCountdown, hms, fetchDDResults, startStream, liveStream, myDDRun, syncDDLive, isRankedSeed, STREAM, type DDResults } from '../lib/live';
import type { Chrome } from '../App';
import '../styles/daily41.css';

const DAY = 864e5;

export function DDLiveScreen(chrome: Chrome) {
  const t = useT(); const s = useSave();
  const now = useNow(1000);
  const dd = ddLiveActive(now), next = ddNext(now);
  const [results, setResults] = useState<DDResults | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const run = dd ? myDDRun(s, dd.day) : null;
  const stream = liveStream(s);
  const last = lastWindow('deadline', s);

  useEffect(() => { void syncDDLive(); }, []);
  useEffect(() => { if (!dd) return; let on = true; fetchDDResults(dd.day).then((r) => { if (on && r.ok) setResults(r); }); return () => { on = false; }; }, [dd?.day, run?.sent]); // eslint-disable-line react-hooks/exhaustive-deps

  const play = () => chrome.go({ n: 'play', mode: 'deadline', key: Date.now() });
  const go = async (ranked: boolean) => {
    if (busy) return;
    setBusy(true); setErr('');
    const r = await startStream(ranked, ranked ? t('d41.ddl.ranked') : t('d41.ddl.practice'));
    setBusy(false);
    if (!r.ok) { setErr(t.or('md4.live.err.' + r.err, 'err.generic')); sfx('os.locked'); return; }
    sfx('os.open'); play();
  };
  const resumable = !!stream && !stream.over;
  const rankedOpen = !!dd && !(run && (run.sent || Date.now() > run.at + STREAM.seconds * 1000 + 45e3));
  const main = resumable ? { label: t('d41.ddl.resume'), on: play }
    : rankedOpen ? { label: t('d41.ddl.goRanked'), on: () => go(true) }
      : { label: t('d41.ddl.goPractice'), on: () => go(false) };

  const clock = dd ? { big: hms(ddCountdown(dd, now).ms), cap: t('d41.ddl.closes') }
    : next ? { big: next.opensAt - now < 7 * DAY ? hms(next.opensAt - now) : t('d41.ddl.days', { n: Math.ceil((next.opensAt - now) / DAY) }), cap: t('d41.ddl.next', { d: fmtDate(next.opensAt + 12 * 36e5, t.lang, { weekday: 'short', day: 'numeric', month: 'short' }) }) }
      : { big: '—', cap: t('d41.ddl.none') };
  const me = results?.me;
  return <div className="d41 is-live"><Screen title={t('d41.win.deadline')} sub={dd ? t('d41.ddl.onAir') : t('d41.ddl.offAir')} onBack={chrome.home}
    footer={<>{rankedOpen && !resumable && <Pop className="d41-btn d41-btn--quiet" onTap={() => { void go(false); }} disabled={busy}>{t('d41.ddl.practiceShort')}</Pop>}
      <Pop className="d41-btn d41-btn--big is-last" onTap={main.on} disabled={busy} sound={null}>{busy ? t('d41.ddl.starting') : main.label}</Pop></>}>
    <section className={'d41-dd d41-dd--lobby' + (dd ? ' is-on' : '')}>
      <span className="d41-dd__k"><i aria-hidden="true" />{dd ? t('d41.ddl.onAir') : t('d41.ddl.offAir')}</span>
      <b className="d41-dd__n g-num">{clock.big}</b>
      <small className="d41-dd__cap">{clock.cap}</small>
    </section>
    <ul className="d41-facts">
      <li><b className="g-num">{STREAM.stories}</b><small>{t('d41.ddl.players')}</small></li>
      <li><b className="g-num">{STREAM.dms}</b><small>{t('d41.ddl.calls')}</small></li>
      <li><b className="g-num">{STREAM.seconds}</b><small>{t('d41.ddl.seconds')}</small></li>
      <li><b className="g-num">{STREAM.contacts}</b><small>{t('d41.ddl.sources')}</small></li>
    </ul>
    <p className="d41-lede"><span>{dd ? t('d41.ddl.fairRanked') : t('d41.ddl.fair')}</span></p>
    {(run?.sent || last) && <div className="d41-card d41-lastrun">
      <span><small>{run?.sent ? t('d41.ddl.yourRun') : t('d41.ddl.last', { d: fmtDate(last!.at, t.lang, { day: 'numeric', month: 'short' }) }) + (last && isRankedSeed(s, last.seed) ? ' · ' + t('d41.ddl.ranked') : '')}</small>
        <b className="g-num">{num((run?.sent ? run.score : last?.total) || 0, true)} <em>{t('tier4.' + ((run?.sent ? run.tier : last?.tier) || 'T4'))}</em></b></span>
      <GridRow row={(run?.sent ? run.row : last?.row) || ''} size="sm" />
      {me && <small className="d41-lastrun__rank">{t('d41.ddl.place', { r: ordinal(t, me.rank), n: num(results!.players) })}</small>}
    </div>}
    {err && <p className="d41-err" role="alert">{err}</p>}
  </Screen></div>;
}
