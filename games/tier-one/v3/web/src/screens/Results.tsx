// Results, now a thread (CONCEPT4.md §7): when a window ends, Blurt shows your posts resolving one by one. Each story's
// ending lands as a news card, your post gets its reaction (the Scoop stamp, your catchphrase on a right Drop, the
// ratio on a wrong one) and the points in one line, with the replies under it (lib/banter.ts thread4). Then the grade,
// where you finished (ranked boards: "You beat 71% of today's players", par, your group; Story: the boss head-to-head),
// the follower and Rep rolls, XP and the level bar, coins with the sponsor's per-call lines, the share card (★ ■ □ ·)
// and the next thing to do. The numbers are the Gain lib/meta.ts returned for this window (onDriverDone); nothing here
// computes a reward.
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { CastSaga, ResultStory4 } from '../lib/engine';
import type { Driver4, Outcome4 } from '../lib/driver';
import { useT, num } from '../lib/i18n';
import { useSave } from '../lib/save';
import { sfx, buzz } from '../lib/sfx';
import { prefersReducedMotion } from '../lib/motion';
import { onShared } from '../lib/meta';
import { levelOfSave, type Gain, type SponsorLine } from '../lib/economy';
import { outWord4, backWord4 } from '../lib/story';
import { Banter, compact, ratioLine4 } from '../lib/banter';
import { bossNow, bossResult, bossLine } from '../lib/rivals';
import { shareWindow4 } from '../lib/share';
import { catchphraseOf } from '../lib/catchphrase';
import { Icon, Kit, confetti } from '../ui/game';
import { Pop, Count, Ticker, Stamp, Ratio } from '../ui/juice';
import { ContactAvatar, CONTACT_TINT } from './DMs';
import { windowLabel, inkOn } from './Blurt';
import type { Chrome, Route } from '../App';
import '../styles/blurt.css';
import '../styles/results.css';

const OUT_KEYS = ['signs', 'elsewhere', 'stays'] as const;
const STEP_MS = 1500;

/** The sponsor's line in words: "Volt: nice one. +16". Vars that are i18n keys (the brand) are read first. */
export function sponsorText(t: ReturnType<typeof useT>, l: SponsorLine): string {
  const v = Object.fromEntries(Object.entries(l.v).map(([k, x]) => [k, typeof x === 'string' && x.startsWith('e4.') ? t(x) : x]));
  return t(l.key, v);
}
/** Where a finished window's "next" goes, by mode. */
export const nextRoute = (d: Pick<Driver4, 'mode'>): Route => (d.mode === 'career' ? { n: 'story' } : d.mode === 'room' ? { n: 'rooms' } : d.mode === 'practice' || d.mode === 'challenge' ? { n: 'practice' } : d.mode === 'deadline' ? { n: 'ddlive' } : { n: 'front' });

export function ResultsThread({ driver, out, gain, chrome }: { driver: Driver4; out: Outcome4; gain: Gain | null; chrome: Chrome }) {
  const t = useT();
  const s = useSave();
  const cast = (out.cast && out.cast.length ? out.cast : driver.cast) as CastSaga[];
  const n = out.per.length;
  const reduce = prefersReducedMotion();
  const [shown, setShown] = useState(reduce ? n + 1 : 0);
  const [auto, setAuto] = useState(!reduce);
  const phrase = catchphraseOf(s).text;
  const handle = '@' + (s.nick || t('pl4.tl.you'));
  const threads = useMemo(() => { const b = new Banter(t.lang, driver.seed + '|' + out.total, phrase, s.nick); return out.per.map((p) => (cast[p.i] ? b.thread4(p as ResultStory4, cast[p.i], driver.R) : null)); }, [t.lang]); // eslint-disable-line react-hooks/exhaustive-deps
  // One post every 1.5 s, or on a tap; the summary after the last.
  useEffect(() => {
    if (!auto || shown > n) return;
    const id = setTimeout(() => setShown((k) => k + 1), shown === 0 ? 500 : STEP_MS);
    return () => clearTimeout(id);
  }, [auto, shown, n]);
  useEffect(() => {
    if (shown === 0 || shown > n) return;
    const p = out.per[shown - 1];
    if (!p.call) sfx('ui.pop');
    else if (p.scoop) { sfx('scoop'); buzz([20, 40, 30]); }
    else if (p.right) sfx(p.call.s === 2 ? 'drop' : 'good');
    else if (p.call.s !== 2) sfx('bad'); // a wrong Drop: <Ratio> plays its own sound
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (shown === n + 1 && out.tier === 'T1' && !reduce) confetti(); }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = () => { setAuto(false); setShown((k) => Math.min(n + 1, k + 1)); };

  return <div className="g-screen bl rt">
    <header className="bl-bar">
      <button type="button" className="g-top__back bl-bar__back" onClick={() => { sfx('ui.tap'); chrome.go(nextRoute(driver)); }} aria-label={t('os.bar.backAria')}><Icon n={t.rtl ? 'arrow' : 'back'} size={20} /></button>
      <span className="bl-bar__word">{t('pl4.app.blurt')}</span>
      <span className="bl-pill"><b dir="auto">{windowLabel(t, driver)}</b><span>{t('pl4.res.k')}</span></span>
    </header>
    <p className="rt-seal">{t('pl4.res.seal')}</p>
    <ol className="rt-thread" onClick={shown <= n ? next : undefined}>
      {out.per.map((p, k) => (k < shown && cast[p.i] ? <ResultPost key={p.i} p={p as ResultStory4} c={cast[p.i]} th={threads[k]} handle={handle} phrase={phrase} seed={driver.seed} /> : null))}
    </ol>
    {shown <= n && <div className="rt-more"><Pop className="bl-btn bl-btn--quiet" onTap={next}>{t('pl4.res.tap')}</Pop><Pop className="rt-all" onTap={() => { setAuto(false); setShown(n + 1); }}>{t('pl4.res.all')}</Pop></div>}
    {shown > n && <Summary driver={driver} out={out} gain={gain} chrome={chrome} handle={handle} phrase={phrase} />}
  </div>;
}

function ResultPost({ p, c, th, handle, phrase, seed }: { p: ResultStory4; c: CastSaga; th: ReturnType<Banter['thread4']> | null; handle: string; phrase: string; seed: string }) {
  const t = useT();
  const call = p.call;
  const endClub = p.truth === 0 ? c.to : p.truth === 1 ? c.alt || c.to : c.from;
  const ending = ((t.list('pl4.res.end') as string[])[p.truth] || '').replace('{p}', c.player.s || c.player.n).replace('{to}', c.to.s).replace('{alt}', (c.alt || c.to).s).replace('{from}', c.from.s);
  const bits: string[] = [];
  if (call) {
    bits.push(backWord4(t.lang, call.s));
    if (p.right && p.parts.early > 0) bits.push(t('pl4.res.early', { n: p.parts.early }));
    if (p.scoop) bits.push(t('pl4.res.scoop'));
    else if (p.why === 'beaten' && p.firstRight) bits.push(t('pl4.res.beaten', { who: t('rival4.' + p.firstRight.id) }));
  }
  const ratio = !!call && !p.right && call.s === 2;
  const rl = ratio ? ratioLine4(t.lang, c, seed + '|' + p.i) : null;
  return <li className={'rt-post is-' + (!call ? 'none' : p.scoop ? 'scoop' : p.right ? 'right' : 'wrong')}>
    <div className="rt-news" style={{ ['--c1' as string]: endClub.c1, ['--ci' as string]: inkOn(endClub.c1) } as CSSProperties}>
      <Kit club={endClub} player={c.player} size={40} />
      <p dir="auto">{ending}</p>
      <span className={'rt-news__o bl-o--' + OUT_KEYS[p.truth]}>{outWord4(t.lang, p.truth)}</span>
    </div>
    {call ? <div className="rt-mine">
      <span className="bl-me-av" aria-hidden="true">{handle.slice(1, 3).toUpperCase()}</span>
      <div className="rt-mine__b">
        <p className="rt-mine__h"><b dir="auto">{handle}</b><span className={'bl-post__tag bl-o--' + OUT_KEYS[call.o]}><b>{outWord4(t.lang, call.o)}</b></span></p>
        {th?.text && <p className="rt-mine__t" dir="auto">{th.text}</p>}
        <div className="rt-react">
          {p.right && call.s === 2 && phrase && <Stamp text={phrase} tone="gold" size="lg" />}
          {p.scoop && <Stamp text={t('pl4.res.scoop')} tone="scoop" size="sm" sound={call.s !== 2} />}
          {ratio && <Ratio n={th ? th.reps : 120} label={t('pl4.res.ratio')} />}
        </div>
        <p className={'rt-pts ' + (p.pts >= 0 ? 'is-up' : 'is-down')}><b className="g-num">{num(p.pts, true)}</b><span>{bits.join(' · ')}</span></p>
        {rl && rl.text && <p className="rt-reply rt-reply--ratio" dir="auto"><b>{rl.handle}</b> {rl.text}</p>}
        {th && th.replies.slice(0, 2).map((r, k) => <p key={k} className={'rt-reply rt-reply--' + r.who} dir="auto">
          {r.who === 'source' ? <ContactAvatar src={r.id} size={18} /> : r.who === 'rival' ? <span className="rt-reply__av" style={{ ['--av' as string]: CONTACT_TINT[r.id] } as CSSProperties} /> : null}
          <b dir={r.who === 'rival' ? 'ltr' : 'auto'}>{r.who === 'fan' ? r.handle : r.name}</b> {r.text}{r.likes > 0 && <small className="g-num"> · {compact(r.likes, t.lang)}</small>}
        </p>)}
      </div>
    </div> : <p className="rt-none">{t('pl4.res.none')}</p>}
  </li>;
}

function Summary({ driver, out, gain, chrome, handle, phrase }: { driver: Driver4; out: Outcome4; gain: Gain | null; chrome: Chrome; handle: string; phrase: string }) {
  const t = useT();
  const s = useSave();
  const [rolled, setRolled] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  useEffect(() => { sfx('reveal'); const id = setTimeout(() => setRolled(true), prefersReducedMotion() ? 0 : 700); return () => clearTimeout(id); }, []);
  const lv = levelOfSave(s);
  const g = gain;
  const boss = driver.mode === 'career' ? bossResult(out) : null;
  const bossCard = driver.mode === 'career' ? bossNow() : null;
  const ranked = driver.mode === 'daily' || driver.mode === 'room';
  const players = out.players || 0, rank = out.rank || 0;
  const beat = players > 1 && rank ? Math.round((100 * (players - rank)) / (players - 1)) : null;
  const tierName = t('tier4.' + out.tier);
  const share = async () => {
    const r = await shareWindow4({ label: windowLabel(t, driver), tier: tierName, tierId: out.tier, pts: t('pl4.res.pts', { n: num(out.total) }), row: out.row, handle, phrase: out.per.some((p) => p.right && p.call && p.call.s === 2) ? phrase : undefined, rtl: t.rtl });
    if (r !== 'failed') { onShared(); sfx('ui.pop'); setShareMsg(r === 'copied' ? t('pl4.res.copied') : ''); }
  };
  const nextKey = driver.mode === 'challenge' ? 'practice' : driver.mode;
  const marketOpen = !!g && g.unlocked.includes('market');
  const bl = boss && bossCard ? boss.line || bossLine(t.lang, bossCard.id, boss.won, driver.seed) : '';
  const lvFrom = g ? (g.levelUp ? 0 : Math.max(0, lv.pct - (100 * g.xp) / Math.max(1, lv.need))) : lv.pct;
  return <section className="rt-sum" aria-live="polite">
    <div className={'rt-grade is-' + out.tier.toLowerCase()}>
      <span className="rt-grade__k">{t('pl4.res.grade')}</span>
      <b className="rt-grade__t">{tierName}</b>
      <span className="rt-grade__p"><Count n={rolled ? out.total : 0} sign /> <small>{t('pl4.res.pts', { n: '' }).trim()}</small></span>
      <span className="rt-grid" aria-label={out.row}>{[...out.row].map((ch, k) => <i key={k} className={'is-' + (ch === '★' ? 'scoop' : ch === '■' ? 'right' : ch === '□' ? 'wrong' : 'none')}>{ch === '·' ? '' : ch}</i>)}</span>
    </div>

    <div className="rt-place">
      {ranked && beat != null && <p className="rt-place__big">{t('pl4.res.beat', { p: beat, n: players.toLocaleString('en') })}</p>}
      {ranked && rank > 0 && <p>{driver.mode === 'room' ? t('pl4.res.group', { r: rank, n: players }) : t('pl4.res.rank', { r: rank, n: players.toLocaleString('en') })}{out.par != null ? ' · ' + t('pl4.res.par', { n: out.par }) : ''}</p>}
      {boss && bossCard && <div className={'rt-boss ' + (boss.won ? 'is-won' : 'is-lost')}>
        <ContactAvatar src={bossCard.id} size={34} />
        <span><b>{boss.won ? t('pl4.boss.won', { who: bossCard.handle }) : t('pl4.boss.lost', { who: bossCard.handle })}</b>
          <small className="g-num">{t('pl4.boss.vs', { a: boss.you, b: boss.them, who: bossCard.handle })}</small>
          {bl && <em dir="auto">“{bl}”</em>}</span>
      </div>}
      {!ranked && driver.mode !== 'career' && <p className="rt-place__off">{t('pl4.res.off')}</p>}
    </div>

    {g && <div className="rt-rolls">
      <div className="rt-roll"><Ticker n={rolled ? g.followers : g.followers - g.followersDelta} label={t('pl4.res.followers')} tone={g.followersDelta >= 0 ? 'good' : 'bad'} compact /></div>
      <div className="rt-roll"><span className="rt-roll__rep"><Count n={rolled ? g.rep : g.rep - g.repDelta} /><small>/100 · {t('e4.words.rep')}</small></span>{g.repDelta !== 0 && <small className={g.repDelta > 0 ? 'is-up' : 'is-down'}>{num(g.repDelta, true)}</small>}</div>
      <div className="rt-roll rt-roll--lv">
        <span className="rt-roll__lv"><b>{t(g.levelUp ? 'pl4.res.levelUp' : 'pl4.res.level', { n: lv.n })}</b><small>{t('pl4.res.xp', { n: g.xp })}</small></span>
        <span className="rt-lvbar" aria-hidden="true"><i style={{ transform: `scaleX(${((rolled ? lv.pct : lvFrom) / 100).toFixed(3)})` }} /></span>
      </div>
      <div className="rt-roll"><Ticker n={rolled ? s.credits : s.credits - g.coins} label={t('pl4.res.coins')} tone="gold" /></div>
      {g.rankUp && <p className="rt-note is-gold">{t('pl4.res.rankUp', { r: t('cn.tier.' + g.rank) })}</p>}
      {g.review && <p className="rt-note">{t('pl4.res.review')}</p>}
      {g.unlocked.map((u) => <p key={u} className="rt-note is-gold">{t('pl4.res.unlocked', { app: t('os.app.' + u) })}</p>)}
      {(g.files || []).length > 0 && <p className="rt-note is-gold">{t('pl4.res.files')} · {(g.files || []).map((f) => t('e4.sf.' + f + '.n')).join(', ')}</p>}
    </div>}

    {g?.sponsor && g.sponsor.lines.length > 0 && <div className="rt-sponsor">
      {g.sponsor.lines.map((l, k) => <p key={k} className={'rt-sponsor__l is-' + l.kind}><span className="rt-sponsor__b" aria-hidden="true">{t('e4.sp.brand.' + g.sponsor!.brand + '.n').slice(0, 1)}</span><span dir="auto">{sponsorText(t, l)}</span></p>)}
    </div>}

    <div className="rt-acts">
      <Pop className="bl-btn" onTap={() => chrome.go(nextRoute(driver))}>{t('pl4.res.next.' + nextKey)}</Pop>
      {marketOpen && <Pop className="bl-btn bl-btn--quiet" onTap={() => chrome.openApp('market')}>{t('pl4.res.next.market')}</Pop>}
      <Pop className="bl-btn bl-btn--quiet rt-share" onTap={share}><Icon n="share" size={18} />{shareMsg || t('pl4.res.share')}</Pop>
    </div>
  </section>;
}
