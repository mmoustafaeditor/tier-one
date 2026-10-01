// 4.1 Results (UI41 §Daily Challenge "End of window"): one screen, no scroll. Five rows (six on Deadline Day): the
// player, your call, what happened, the points. Then the total, the tier stamp, where you finished, and XP / coins /
// followers from the Gain lib/meta.ts returned (onDriverDone); nothing here computes a reward. Footer: Share + Home.
// Deadline Day opens on the "window shut" moment.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { CastSaga } from '../lib/engine';
import type { Driver4, Outcome4 } from '../lib/driver';
import { useT, num } from '../lib/i18n';
import { useSave } from '../lib/save';
import { sfx, buzz } from '../lib/sfx';
import { prefersReducedMotion } from '../lib/motion';
import { onShared } from '../lib/meta';
import { levelOfSave, type Gain } from '../lib/economy';
import { outWord4, backWord4 } from '../lib/story';
import { bossNow, bossResult } from '../lib/rivals';
import { shareWindow4 } from '../lib/share';
import { catchphraseOf } from '../lib/catchphrase';
import { Kit, confetti } from '../ui/game';
import { Pop, Count } from '../ui/juice';
import { Screen } from '../ui/screen';
import { windowLabel, inkOn, OUT_KEYS } from './Saga';
import type { Chrome, Route } from '../App';
import '../styles/daily41.css';

/** Where a finished window's "next" goes, by mode. */
export const nextRoute = (d: Pick<Driver4, 'mode'>): Route => (d.mode === 'career' ? { n: 'story' } : d.mode === 'room' ? { n: 'rooms' } : d.mode === 'practice' || d.mode === 'challenge' ? { n: 'practice' } : d.mode === 'deadline' ? { n: 'ddlive' } : { n: 'front' });

export function ResultsScreen({ driver, out, gain, chrome }: { driver: Driver4; out: Outcome4; gain: Gain | null; chrome: Chrome }) {
  const t = useT();
  const s = useSave();
  const reduce = prefersReducedMotion();
  const cast = (out.cast && out.cast.length ? out.cast : driver.cast) as CastSaga[];
  const n = out.per.length;
  const dd = driver.mode === 'deadline' || !!driver.R.CLOCK_S;
  const [shut, setShut] = useState(dd && !reduce);
  const [shown, setShown] = useState(reduce ? n : 0);
  const [msg, setMsg] = useState('');
  const fired = useRef(false);
  useEffect(() => { if (!shut) return; sfx('dd.whistle'); buzz([30, 60, 30]); const id = setTimeout(() => setShut(false), 1700); return () => clearTimeout(id); }, [shut]);
  useEffect(() => {
    if (shut || shown >= n) return;
    const id = setTimeout(() => setShown((k) => k + 1), shown === 0 ? 250 : 320);
    return () => clearTimeout(id);
  }, [shut, shown, n]);
  useEffect(() => {
    if (shown === 0 || shown > n) return;
    const p = out.per[shown - 1];
    sfx(!p.call ? 'ui.pop' : p.scoop ? 'scoop' : p.right ? 'good' : 'bad');
    if (shown === n && !fired.current) { fired.current = true; setTimeout(() => { sfx('day.stamp'); if (out.tier === 'T1' && !reduce) confetti(); }, 300); }
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = shown >= n;
  const handle = '@' + (s.nick || t('d41.you'));
  const phrase = catchphraseOf(s).text;
  const tierName = t('tier4.' + out.tier);
  const ranked = driver.mode === 'daily' || driver.mode === 'room';
  const players = out.players || 0, rank = out.rank || 0;
  const beat = players > 1 && rank ? Math.round((100 * (players - rank)) / (players - 1)) : null;
  const boss = driver.mode === 'career' ? bossResult(out) : null;
  const bossCard = driver.mode === 'career' ? bossNow() : null;
  const place = ranked && beat != null ? t('pl4.res.beat', { p: beat, n: players.toLocaleString('en') })
    : ranked && rank > 0 ? (driver.mode === 'room' ? t('pl4.res.group', { r: rank, n: players }) : t('pl4.res.rank', { r: rank, n: players.toLocaleString('en') }))
      : boss && bossCard ? (boss.won ? t('pl4.boss.won', { who: bossCard.handle }) : t('pl4.boss.lost', { who: bossCard.handle }))
        : t('d41.res.off');
  const lv = levelOfSave(s);
  const note = gain ? (gain.unlocked.length ? t('pl4.res.unlocked', { app: t('os.app.' + gain.unlocked[0]) }) : gain.rankUp ? t('pl4.res.rankUp', { r: t('cn.tier.' + gain.rank) }) : gain.levelUp ? t('d41.res.levelUp', { n: lv.n }) : '') : '';
  const share = async () => {
    const r = await shareWindow4({ label: windowLabel(t, driver), tier: tierName, tierId: out.tier, pts: t('pl4.res.pts', { n: num(out.total) }), row: out.row, handle, phrase: out.per.some((p) => p.right && p.call && p.call.s === 2) ? phrase : undefined, rtl: t.rtl });
    if (r !== 'failed') { onShared(); sfx('ui.pop'); setMsg(r === 'copied' ? t('pl4.res.copied') : ''); }
  };
  const nextKey = driver.mode === 'challenge' || driver.mode === 'tutorial' ? (driver.mode === 'tutorial' ? 'daily' : 'practice') : driver.mode;

  return <>
    <Screen title={t('d41.res.title')} sub={windowLabel(t, driver)} onBack={() => chrome.go(nextRoute(driver))}
      footer={<><Pop className="d41-btn d41-btn--quiet" onTap={share}>{msg || t('d41.res.share')}</Pop>{driver.mode === 'daily' && <Pop className="d41-btn d41-btn--quiet" onTap={() => chrome.go({ n: 'boards', tab: 'daily' })}>{t('w41.leaderboard')}</Pop>}<Pop className="d41-btn" onTap={() => chrome.go(nextRoute(driver))}>{t('d41.res.next.' + nextKey)}</Pop></>}>
      <section className={'d41-score is-' + out.tier.toLowerCase() + (done ? ' is-done' : '')}>
        <span className="d41-score__tier">{done ? <span className="d41-tierstamp">{tierName}</span> : null}</span>
        <span className="d41-score__n"><b className="g-num"><Count n={done ? out.total : 0} sign /></b><small>{t('d41.res.pts')}</small></span>
        <p className="d41-score__place" dir="auto">{place}</p>
      </section>
      <ol className="d41-res" style={{ ['--n' as string]: n } as CSSProperties}>
        {out.per.map((p, k) => {
          const c = cast[p.i]; if (!c) return null;
          const endClub = p.truth === 0 ? c.to : p.truth === 1 ? c.alt || c.to : c.from;
          const happened = ((t.list('d41.res.happ') as string[])[p.truth] || '').replace('{to}', c.to.s).replace('{alt}', (c.alt || c.to).s).replace('{from}', c.from.s);
          const state = !p.call ? 'none' : p.scoop ? 'scoop' : p.right ? 'right' : 'wrong';
          return <li key={p.i} className={'d41-rrow is-' + state + (k < shown ? ' is-in' : '')} style={{ ['--c1' as string]: endClub.c1, ['--ci' as string]: inkOn(endClub.c1) } as CSSProperties}>
            <Kit club={endClub} player={c.player} size={32} />
            <span className="d41-rrow__b">
              <b dir="auto">{c.player.s || c.player.n}</b>
              <small dir="auto">{p.call ? <><em className={'d41-o d41-o--' + OUT_KEYS[p.call.o]}>{outWord4(t.lang, p.call.o)}</em> {backWord4(t.lang, p.call.s)}</> : t('d41.res.noCall')} <i aria-hidden="true">·</i> <span>{happened}</span></small>
            </span>
            <span className="d41-rrow__p g-num">{state === 'scoop' && <i className="d41-scoop">{t('pl4.res.scoop')}</i>}{p.call ? num(p.pts, true) : '–'}</span>
          </li>;
        })}
      </ol>
      <div className={'d41-gain' + (done ? ' is-in' : '')}>
        <span><b className="g-num">{gain ? '+' + num(gain.xp) : '–'}</b><small>{t('d41.res.xp')}</small></span>
        <span><b className="g-num">{gain ? '+' + num(gain.coins) : '–'}</b><small>{t('d41.res.coins')}</small></span>
        <span><b className="g-num">{gain ? num(gain.followersDelta, true) : '–'}</b><small>{t('d41.res.followers')}</small></span>
      </div>
      {note && done && <p className="d41-note">{note}</p>}
    </Screen>
    {shut && <div className="d41-shut" role="dialog" aria-modal="true" onClick={() => setShut(false)}>
      <span className="d41-shut__clock g-num">0.0</span>
      <b className="d41-shut__w">{t('d41.dd.shutBig')}</b>
      <small>{t('d41.dd.shutSub', { n: out.called })}</small>
    </div>}
  </>;
}
