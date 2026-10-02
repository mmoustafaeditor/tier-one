// Career Mode (3.8, LAUNCH_BRIEF §11–§15, Addendum A): the comeback as an emergent climb through football media.
// Screens, one viewport each (390×664 and up), a Back button on every one:
//   Cover        no career yet: the opening in three lines (fired, 38,200 followers gone) and Start.
//   OpeningCard  after the opening film: the first stage's card and "Open the blog".
//   CareerDoor   Continue / New career (and Prestige once the career is established).
//   StageScreen  where you are (stage, publication), reputation and followers, the next goal, the clubs that matter,
//                the latest word from the Career log, Play next window. Log · Contacts · Clubs · More open as sheets.
//   StageIntro   once per stage, after its film: the publication's offer and what's new.
// Numbers are the byline's (lib/byline.ts); stage rules and gates are lib/career.ts; the log is lib/storyMode.ts.
import { useEffect, useState } from 'react';
import { useT, num } from '../lib/i18n';
import { useSave, update } from '../lib/save';
import { STAGES, TOP, TOP_WINDOWS, newCareer, totalFavours, careerTrust, TRUST_EARLY, TRUST_AGAIN, relationsOf, prestigeOf, isEstablished, LEAK_FROM, LEAK_TRUST, LEAK_REP, RELATIONS_FROM } from '../lib/career';
import { bylineOf, bookOf, bookProgress, repTier, trustWord } from '../lib/byline';
import { chapterFor, chapterNew, chapterScene, chapterName, EPILOGUE, beatKey, beatFrom, beatKnown, gateTier, FOLLOWERS_LOST, type Chapter, type Beat } from '../lib/storyMode';
import { clubById } from '../lib/engine';
import { randomSeed } from '../lib/driver';
import { slotList, switchSlot, newSlot, deleteSlot, slotCode, restoreCode } from '../lib/slots';
import { spend, toast } from '../lib/meta';
import { playScene, afterScenes, seen } from '../lib/scenes';
import { sfx } from '../lib/sfx';
import { Icon, GBtn, TopBar, SrcIcon, confetti } from '../ui/game';
import { Crest, Sheet } from '../ui/bits';
import { Tip, usePaged, Pager } from '../ui/fit';
import { Portrait, type Mood } from '../ui/portrait';
import type { Chrome } from '../App';
import { earnHook } from '../lib/earnhook';

const SRC = ['kitman', 'barber', 'agent', 'spotter', 'physio'] as const;
const SRC_SENDERS: string[] = [...SRC];
const RIVAL_SENDERS = ['tabloid', 'itk', 'insider'];
const TIER_STAMP: Record<string, string> = { T1: 'gold', T2: 'done', T3: 'done', T4: 'off', SPIKED: '' };
const fmtK = (n: number) => (n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n));
const RENAME_COST = 250;

/** A sender's face (Addendum A): sources, rivals and newsroom staff through the one Portrait slot; a club's press
 *  office shows its crest; a player who reposted you shows his portrait. Names are always live text beside it. */
function Face({ from, size = 34, mood, v }: { from: string; size?: number; mood?: Mood; v?: Record<string, string | number> }) {
  if (SRC_SENDERS.includes(from)) return <Portrait kind="source" id={from} size={size} mood={mood} />;
  if (RIVAL_SENDERS.includes(from)) return <Portrait kind="rival" id={from} size={size} mood={mood} />;
  if (from === 'press') { const cl = v && typeof v.cid === 'string' ? clubById(v.cid) : null; return cl ? <Crest club={cl} size={size} /> : <Portrait kind="staff" id="press" size={size} />; }
  if (from === 'player' && v && typeof v.pid === 'string') return <Portrait kind="player" id={v.pid} size={size} mood="joy" />;
  return <Portrait kind="staff" id={from} size={size} mood={mood} />;
}

let doorPassed = false;
export function StoryScreen(chrome: Chrome) {
  const s = useSave();
  const c = s.career;
  const [opening, setOpening] = useState<null | 'start' | 'replay'>(null);
  const create = () => {
    const first = !c || (!s.story?.prologue && c.windows === 0);
    update((x) => {
      x.story = x.story || {}; x.story.prologue = true;
      if (!x.career) { x.career = newCareer(); x.story.chapterSeen = 0; }
    });
    if (first) playScene(chapterScene(0));
  };
  const film = (mode: 'start' | 'replay') => { sfx('open'); playScene('story-prologue'); afterScenes(() => setOpening(mode)); };
  const start = () => { if (!s.story?.prologue) film('start'); else { sfx('open'); create(); } };
  const needCard = !!c && !s.story?.prologue;
  useEffect(() => { if (needCard) afterScenes(() => setOpening((p) => p || (c!.windows > 0 ? 'replay' : 'start'))); }, [needCard]); // eslint-disable-line react-hooks/exhaustive-deps
  const ch = c ? chapterFor(c, bylineOf(s).rep) : null;
  const [door, setDoor] = useState(() => !doorPassed && !c?.live);
  const intro = !!(c && ch && !door && !opening && !needCard && ch.i < EPILOGUE && (s.story?.chapterSeen ?? -1) < ch.i);
  const wipe = (prestige = false) => {
    update((x) => { x.career = newCareer((x.slot || 0) + 1, prestige ? (x.career?.restarts || 0) + 1 : 0); x.story = { ...(x.story || {}), prologue: true, chapterSeen: -1, beats: {}, inbox: [] }; });
    doorPassed = true; setDoor(false);
  };
  return <>
    {c && ch && door ? <CareerDoor chrome={chrome} ch={ch} onContinue={() => { doorPassed = true; setDoor(false); }} onNew={() => wipe(false)} onPrestige={() => wipe(true)} />
      : c && ch ? <StageScreen chrome={chrome} ch={ch} onOpening={() => film('replay')} onBack={() => { doorPassed = false; chrome.go({ n: 'front' }); }} onPrestige={() => wipe(true)} />
      : <Cover chrome={chrome} onStart={start} onReplay={s.story?.prologue ? () => film('replay') : undefined} />}
    {opening && <OpeningCard replay={opening === 'replay'} onAgain={() => { setOpening(null); film(opening); }} onDone={() => { if (opening === 'start') create(); else if (!s.story?.prologue) update((x) => { x.story = { ...(x.story || {}), prologue: true }; }); setOpening(null); }} />}
    {intro && ch && <StageIntro ch={ch} onGo={() => update((x) => { x.story = x.story || {}; x.story.chapterSeen = ch.i; earnHook(x); })} />}
  </>;
}

// ---------------------------------------------------------------- cover (no career yet): the opening, short
function Cover({ chrome, onStart, onReplay }: { chrome: Chrome; onStart: () => void; onReplay?: () => void }) {
  const t = useT();
  const lines = t.list('cr38.open.lines') as string[];
  return <div className="g-screen sm fit">
    <TopBar back={{ label: t('g.tabs.home'), onClick: () => chrome.go({ n: 'front' }) }} title={t('hub.mode.career')} onHelp={() => chrome.go({ n: 'howto' })} />
    <div className="fit__body">
      <Tip id="career" />
      <section className="sm-book g-card">
        <span className="sm-book__spine" aria-hidden="true" />
        <div className="sm-book__in">
          <div className="sm-book__faces"><Portrait kind="staff" id="you" size={56} mood="hesitant" /><Portrait kind="staff" id="editor" size={56} mood="stern" /></div>
          <h1 className="sm-book__title">{t('cr38.open.title')}</h1>
          <ol className="sm-book__lines">{lines.map((l, k) => <li key={k}>{l}</li>)}</ol>
          <div className="sm-book__lost"><b className="g-num">−{num(FOLLOWERS_LOST)}</b><span className="g-mono">{t('cr38.open.lost')}</span></div>
          <p className="sm-book__hook2">{t('cr38.open.hook')}</p>
          <GBtn kind="gold" size="lg" pulse shine sound={null} onClick={onStart} style={{ marginTop: 14 }}><Icon n="story" size={24} />{t('cr38.open.start')}</GBtn>
          {onReplay && <button className="sm-link" onClick={onReplay}><Icon n="play" size={16} />{t('cr38.open.replay')}</button>}
        </div>
      </section>
    </div>
  </div>;
}

// ---------------------------------------------------------------- the opening's title card (after the film)
function OpeningCard({ replay, onDone, onAgain }: { replay: boolean; onDone: () => void; onAgain: () => void }) {
  const t = useT();
  const reduced = useSave().reduced;
  const lines = t.list('cr38.open.lines') as string[];
  useEffect(() => {
    const b = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const ids = reduced ? [] : lines.map((_, k) => window.setTimeout(() => sfx(k === 1 ? 'stamp.wrong' : 'typewriter'), 350 + k * 520));
    return () => { document.body.style.overflow = b; ids.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className={'sm-pro' + (reduced ? ' is-static' : '')} role="dialog" aria-modal="true" aria-label={t('cr38.open.k')}>
    <div className="sm-pro__top">
      <span className="g-mono sm-pro__k">{t('cr38.open.k')}</span>
      <button className="sm-pro__skip" onClick={() => { sfx('ui.tap'); onDone(); }}>{replay ? t('common.close') : t('cr38.open.skip')}<Icon n={replay ? 'x' : t.rtl ? 'back' : 'arrow'} size={16} /></button>
    </div>
    <div className="sm-pro__stage">
      <div className="sm-pro__panel sm-procard">
        <h1 className="sm-procard__t">{t('cr38.open.title')}</h1>
        <ol className="sm-procard__lines">
          {lines.map((l, k) => <li key={k} style={{ animationDelay: 300 + k * 520 + 'ms' }} className={k === 1 ? 'is-hwg' : ''}>{l}</li>)}
        </ol>
        {!replay && <div className="sm-chcard g-card" style={{ animationDelay: 400 + lines.length * 520 + 'ms' }}>
          <span className="sm-chcard__num g-num">1</span>
          <span className="g-mono sm-chcard__k">{t('cr38.stageOf', { n: 1 })} · {t('career.ranks.0')}</span>
          <h2 className="g-h1">{t(chapterName('blog'))}</h2>
          <p className="sm-premise">{t('cr38.stage.blog.premise')}</p>
          <GBtn kind="gold" size="lg" shine pulse sound="open" onClick={onDone} style={{ marginTop: 18 }}><Icon n="story" size={22} />{t('cr38.open.begin')}</GBtn>
        </div>}
        <button className="sm-link sm-link--dark" onClick={() => { sfx('ui.tap'); onAgain(); }}><Icon n="play" size={16} />{t('cr38.open.again')}</button>
      </div>
    </div>
  </div>;
}

// ---------------------------------------------------------------- stage intro (once per stage, after its film): the offer
function StageIntro({ ch, onGo }: { ch: Chapter; onGo: () => void }) {
  const t = useT();
  const fresh = chapterNew(ch.i);
  const by = t('cr38.stage.' + ch.id + '.introBy');
  useEffect(() => {
    const id = chapterScene(ch.i);
    if (id && !seen(id)) playScene(id);
    afterScenes(() => { sfx(ch.i === TOP ? 'fanfare' : 'unlock'); if (ch.i === TOP) confetti(['#F7B928', '#FFD35C', '#FF5A36', '#F4EFE4']); });
    const b = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = b; };
  }, [ch.i]);
  return <div className="g-overlay sm-introwrap" role="dialog" aria-modal="true" aria-label={t(chapterName(ch.id))}>
    <div className="sm-intro g-card">
      <div className="sm-intro__band"><span className="g-mono">{t('cr38.intro.k')}</span><span className="g-mono">{t('cr38.stageOf', { n: ch.n })}</span></div>
      <div className="sm-intro__body">
        <span className="sm-intro__num g-num">{ch.n}</span>
        <h2 className="g-h1">{t(chapterName(ch.id))}</h2>
        <p className="sm-premise">{t('cr38.stage.' + ch.id + '.premise')}</p>
        <blockquote className="sm-intro__q"><Face from={by} size={40} mood={ch.i === TOP ? 'joy' : 'confident'} /><span>{t('cr38.stage.' + ch.id + '.intro')}<em>{t('g.story.from.' + by)}</em></span></blockquote>
        {(fresh.src.length > 0 || fresh.rivals.length > 0) && <>
          <h3 className="g-mono sm-intro__h">{t('cr38.intro.new')}</h3>
          <div className="sm-intro__new">
            {fresh.src.map((k) => <span key={k} className="sm-new"><Portrait kind="source" id={k} size={30} /><span><em className="g-mono">{t('cr38.intro.srcNew')} · {t('src.' + k)}</em>{t('g.story.who.' + k)}</span></span>)}
            {fresh.rivals.map((k) => <span key={k} className="sm-new"><Portrait kind="rival" id={k} size={30} mood="mischief" /><span><em className="g-mono">{t('cr38.intro.rivalsNew')}</em>{t('rival.' + k)}</span></span>)}
          </div>
        </>}
        <p className="sm-intro__unl">{t('cr38.stage.' + ch.id + '.gives')}</p>
        <GBtn kind="gold" size="lg" shine sound="open" onClick={onGo} style={{ marginTop: 16 }}>{t('cr38.intro.go')}<Icon n={t.rtl ? 'back' : 'arrow'} size={22} /></GBtn>
      </div>
    </div>
  </div>;
}

// ---------------------------------------------------------------- the door: Continue · New career (· Prestige)
function CareerDoor({ chrome, ch, onContinue, onNew, onPrestige }: { chrome: Chrome; ch: Chapter; onContinue: () => void; onNew: () => void; onPrestige: () => void }) {
  const t = useT();
  const s = useSave();
  const c = s.career!;
  const [sure, setSure] = useState<null | 'new' | 'prestige'>(null);
  const paper = c.paper || t('g.story.paperDefault', { n: s.nick || t('common.you') });
  const p = prestigeOf(c);
  return <div className="g-screen sm fit">
    <TopBar back={{ label: t('g.tabs.home'), onClick: () => chrome.go({ n: 'front' }) }} title={t('hub.mode.career')} onHelp={() => chrome.go({ n: 'howto' })} />
    <div className="fit__body cr-door">
      <Tip id="career" />
      <section className="g-card cr-card">
        <div className="cr-card__k g-mono"><span>{ch.done ? t('cr38.established.k') : t('cr38.stageOf', { n: ch.n })}{p > 0 && <> · <Icon n="star" size={11} /> {t('cr38.prestige.n', { n: p })}</>}</span><span>{paper}</span></div>
        <h1 className="g-h1">{t(chapterName(ch.id))}</h1>
        <ul className="cr-lines">
          <li><Icon n="news" size={16} /><span>{t('hub.career.windows', { n: c.windows })}</span></li>
          <li><Icon n="target" size={16} /><span>{needLine(t, ch)}</span></li>
        </ul>
        <GoalBar ch={ch} />
        <GBtn kind="gold" size="lg" shine pulse sound="open" onClick={onContinue} style={{ marginTop: 6 }}><Icon n="story" size={24} />{t('hub.career.continue')}</GBtn>
      </section>
      <div className="cr-door__row">
        <GBtn kind="ghost" onClick={() => setSure('new')}><Icon n="uturn" size={20} />{t('hub.career.newCareer')}</GBtn>
        {isEstablished(c) && <GBtn kind="dark" onClick={() => setSure('prestige')}><Icon n="star" size={20} />{t('cr38.prestige.go')}</GBtn>}
      </div>
    </div>
    <Sheet open={!!sure} onClose={() => setSure(null)} label={sure === 'prestige' ? t('cr38.prestige.go') : t('hub.career.newCareer')}>
      <div className="rm-sure">
        <h2 className="g-h2" style={{ color: 'var(--card-ink)' }}>{sure === 'prestige' ? t('cr38.prestige.sure', { n: p + 1 }) : t('hub.career.newSure')}</h2>
        {sure === 'prestige' && <p className="sm-note" style={{ color: 'var(--card-ink-2)', textAlign: 'start', marginBottom: 10 }}>{t('cr38.prestige.what')}</p>}
        <div className="rm-sure__b">
          <GBtn onClick={() => { const k = sure; setSure(null); sfx('ui.pop'); if (k === 'prestige') onPrestige(); else onNew(); }}>{sure === 'prestige' ? t('cr38.prestige.yes') : t('hub.career.newYes')}</GBtn>
          <GBtn kind="paper" onClick={() => setSure(null)}>{t('hub.career.cancel')}</GBtn>
        </div>
      </div>
    </Sheet>
  </div>;
}
type TT = ReturnType<typeof useT>;
function needLine(t: TT, ch: Chapter) {
  const g = ch.goal;
  if (!g) return t('cr38.established.line');
  if (g.top != null) return t('cr38.goal.top', { n: Math.max(0, g.top - (g.haveTop || 0)) });
  const w = Math.max(0, g.windows - g.haveW), r = Math.max(0, g.rep - g.haveRep);
  const next = t(chapterName(STAGES[ch.i + 1].id));
  if (w && r) return t('cr38.goal.both', { w, r, next });
  if (w) return t('cr38.goal.windows', { w, next });
  if (r) return t('cr38.goal.rep', { r, next, tier: t('cn.tier.' + gateTier(g.rep)) });
  return t('cr38.goal.ready', { next });
}
function GoalBar({ ch }: { ch: Chapter }) {
  const t = useT();
  const g = ch.goal;
  const p = Math.round(100 * Math.min(1, ch.progress));
  return <div className="cr-goal">
    <span className="cr-goal__l g-mono"><span>{t('cr38.goal.k')}</span><span>{g ? (g.top != null ? (g.haveTop || 0) + '/' + g.top : t('cr38.goal.meter', { w: g.haveW, gw: g.windows, r: g.haveRep, gr: g.rep })) : '✓'}</span></span>
    <span className="g-bar" style={{ ['--bar' as string]: p >= 100 ? 'var(--c-done)' : 'linear-gradient(90deg,#FFD35C,#F7B928)' }}><i style={{ width: p + '%' }} /></span>
  </div>;
}

// ---------------------------------------------------------------- the stage screen: one viewport
type More = null | 'log' | 'contacts' | 'clubs' | 'more';
function StageScreen({ chrome, ch, onOpening, onBack, onPrestige }: { chrome: Chrome; ch: Chapter; onOpening: () => void; onBack: () => void; onPrestige: () => void }) {
  const t = useT();
  const s = useSave();
  const c = s.career!;
  const rk = STAGES[c.rank];
  const b = bylineOf(s);
  const [unread] = useState(() => (s.story?.inbox || []).filter((m) => !m.read && beatKnown(m)).length);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.paper);
  const [more, setMore] = useState<More>(null);
  useEffect(() => { if (unread) update((x) => { x.story?.inbox?.forEach((m) => { m.read = true; }); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cost = (c.renames || 0) > 0 ? RENAME_COST : 0;
  const saveName = () => {
    const v = name.trim().slice(0, 28);
    if (v === c.paper) { setEditing(false); return; }
    if (cost && !spend(cost, 'rename')) { toast('warn', t('m.rename.broke', { n: cost })); return; }
    update((x) => { if (x.career) { x.career.paper = v; x.career.renames = (x.career.renames || 0) + 1; } }); setEditing(false);
  };
  const play = () => {
    update((x) => { if (x.career && !x.career.live) x.career.live = { seed: 'car-' + randomSeed(), mode: 'career', log: [], started: Date.now() }; });
    chrome.go({ n: 'play', mode: 'career', key: Date.now() });
  };
  const paper = c.paper || t('g.story.paperDefault', { n: s.nick || t('common.you') });
  const log = [...(s.story?.inbox || [])].reverse().filter(beatKnown);
  const line = (m: { from: string; key: string; v?: Record<string, string | number> }) => t(beatKey(m as Beat), { ...(m.v || {}), ...(m.v?.m && typeof m.v.m === 'string' && m.key === 'style' ? { m: t(m.v.m) } : {}) });
  const latest = log[0] || null;
  const relations = relationsOf(c);
  const p = prestigeOf(c);
  const tier = repTier(b.rep);
  const leakOn = c.rank >= LEAK_FROM && careerTrust(s, 'agent') >= LEAK_TRUST && b.rep >= LEAK_REP;

  return <div className="g-screen sm sm--hub fit">
    <TopBar back={{ label: t('g.tabs.home'), onClick: onBack }} title={t('hub.mode.career')} onHelp={() => chrome.go({ n: 'howto' })} />
    <div className="fit__body">
      <Tip id="career" />
      <section className="g-card cr-card">
        <div className="cr-card__k g-mono">
          <span>{ch.done ? t('cr38.established.k') : t('cr38.stageOf', { n: ch.n })}{p > 0 && <> · <Icon n="star" size={11} /> {t('cr38.prestige.n', { n: p })}</>}</span>
          <span>{paper}<button className="g-icbtn" style={{ width: 28, height: 28, marginInlineStart: 6, verticalAlign: 'middle' }} aria-label={t('g.story.rename')} onClick={() => { setName(c.paper); setEditing(!editing); }}><Icon n="pen" size={14} /></button></span>
        </div>
        {editing && <form className="sm-rename" onSubmit={(e) => { e.preventDefault(); saveName(); }}>
          <input value={name} maxLength={28} autoFocus placeholder={t('g.story.paperPh')} onChange={(e) => setName(e.target.value)} aria-label={t('g.story.paperPh')} />
          <GBtn kind="gold" size="sm" onClick={saveName} sound="ui.pop">{t('g.story.save')}{cost ? <> · <span className="g-coin" />{cost}</> : ''}</GBtn>
        </form>}
        <h1 className="g-h1" style={{ fontSize: 28 }}>{t(chapterName(ch.id))}</h1>
        {/* §20: the two numbers that matter, as words first */}
        <button className="cr-name" onClick={() => { sfx('ui.tap'); chrome.go({ n: 'me' }); }} aria-label={t('cn.me.byline')}>
          <span className="cr-name__n"><em className="g-mono">{t('cn.me.rep')}</em><b className="g-num">{Math.round(b.rep)}</b><small>{t('cn.tier.' + tier)}</small></span>
          <span className="cr-name__n"><em className="g-mono">{t('cn.me.followers')}</em><b className="g-num">{fmtK(b.followers)}</b><small>{b.followers >= FOLLOWERS_LOST ? t('cr38.followers.back') : t('cr38.followers.toBack', { n: fmtK(FOLLOWERS_LOST - b.followers) })}</small></span>
        </button>
        <ul className="cr-lines">
          <li><Icon n="target" size={16} /><span>{needLine(t, ch)}</span></li>
          {leakOn && <li><Icon n="phone" size={16} /><span>{t('cr38.leak.on')}</span></li>}
        </ul>
        <GoalBar ch={ch} />
        {/* §14: the clubs that matter, as words */}
        {relations.length > 0 && c.rank >= RELATIONS_FROM - 1 && <div className="cr-clubs" aria-label={t('cr38.club.title')}>
          {relations.slice(0, 3).map((r) => { const cl = clubById(r.id); return <span key={r.id} className={'cr-club is-' + r.word}><Crest club={cl} size={18} /><b>{cl ? cl.s || cl.n : r.id}</b><span className="g-mono">{num(r.v, true)} · {t('cr38.club.' + r.word)}</span></span>; })}
        </div>}
        <GBtn kind="gold" size="lg" pulse={!c.live} shine sound="open" onClick={play}>
          <Icon n="phone" size={24} />{c.live ? t('g.story.resume') : t('g.story.play', { n: c.windows + 1 })}
        </GBtn>
      </section>

      {/* the latest word from the log */}
      {latest ? <button className={'cr-msg cr-msg--latest' + (unread ? ' is-new' : '')} onClick={() => { sfx('ui.tap'); setMore('log'); }}>
        <Face from={beatFrom(latest)} v={latest.v} />
        <span><b>{sender(t, beatFrom(latest), latest.v)}{unread > 1 ? <span className="g-chip g-chip--red cr-msg__n">+{unread - 1}</span> : null}</b><span dir="auto">{line(latest)}</span></span>
      </button> : <div className="cr-msg"><Face from={t('cr38.stage.' + ch.id + '.briefBy')} /><span><b>{t('g.story.from.' + t('cr38.stage.' + ch.id + '.briefBy'))}</b><span dir="auto">{t('cr38.stage.' + ch.id + '.brief')}</span></span></div>}

      <nav className="cr-more" aria-label={t('hub.career.more')}>
        <button onClick={() => { sfx('ui.tap'); setMore('log'); }}><Icon n="news" size={18} />{t('cr38.nav.log')}</button>
        <button onClick={() => { sfx('ui.tap'); setMore('contacts'); }}><Icon n="phone" size={18} />{t('cr38.nav.contacts')}</button>
        <button onClick={() => { sfx('ui.tap'); setMore('clubs'); }}><Icon n="shirt" size={18} />{t('cr38.nav.clubs')}</button>
        <button onClick={() => { sfx('ui.tap'); setMore('more'); }}><Icon n="briefcase" size={18} />{t('cr38.nav.more')}</button>
      </nav>
    </div>

    <Sheet open={more === 'log'} onClose={() => setMore(null)} label={t('cr38.nav.log')}>
      <div className="cr-sheet g-card g-card--desk sm-drawer__b"><LogSheet log={log} line={line} /></div>
    </Sheet>
    <Sheet open={more === 'contacts'} onClose={() => setMore(null)} label={t('cr38.nav.contacts')}>
      <div className="cr-sheet g-card g-card--desk sm-drawer__b">
        <p className="sm-note" style={{ textAlign: 'start', marginBottom: 10 }}>{t('cr38.contacts.lead')}</p>
        <div className="sm-srcs">
          {SRC.map((k) => {
            const open = rk.src.includes(k), lv = careerTrust(s, k), pr = bookProgress(bookOf(s, k));
            const need = STAGES.findIndex((r) => r.src.includes(k));
            const w = trustWord(lv);
            return <div key={k} className={'sm-src' + (open ? '' : ' is-locked') + (lv >= 5 ? ' is-gold' : '')}>
              <div className="sm-src__top">{open ? <Portrait kind="source" id={k} size={40} mood={lv >= 3 ? 'confident' : 'neutral'} /> : <SrcIcon k={k} size={40} />}{open ? <span className="sm-src__lv"><b>{t('cr38.trust.' + w)}</b></span> : <Icon n="lock" size={18} className="sm-src__lock" />}</div>
              <b className="sm-src__n">{open ? t('g.story.who.' + k) : '?'}<span className="sm-src__role g-mono">{t('src.' + k)}</span></b>
              <span className="sm-src__d">{open ? t('cr38.trust.fx.' + k + '.' + (lv >= 5 ? 'direct' : lv >= 3 ? 'trusted' : lv >= 2 ? 'familiar' : 'cold')) : t('cr38.contacts.locked', { n: t(chapterName(STAGES[need].id)) })}</span>
              {open && <><span className="g-bar g-bar--sm" style={{ ['--bar' as string]: pr.max ? 'linear-gradient(90deg,#FFD35C,#F7B928)' : 'var(--gold)' }}><i style={{ width: pr.pct + '%' }} /></span>
                <span className="sm-src__next g-mono">{pr.max ? t('cr38.trust.max') : t('cr38.trust.toward', { w: t('cr38.trust.' + trustWord(lv + 1)) })}{lv < TRUST_EARLY && (k === 'spotter' || k === 'physio') ? ' · ' + t('cr38.trust.earlyAt', { w: t('cr38.trust.trusted') }) : lv < TRUST_AGAIN && c.rank >= 3 ? ' · ' + t('cr38.trust.againAt', { w: t('cr38.trust.direct') }) : ''}</span></>}
            </div>;
          })}
        </div>
        <button className="sm-link sm-link--desk" onClick={() => { sfx('ui.tap'); chrome.go({ n: 'contacts' }); }}>{t('cr38.contacts.book')}<Icon n={t.rtl ? 'back' : 'arrow'} size={14} /></button>
      </div>
    </Sheet>
    <Sheet open={more === 'clubs'} onClose={() => setMore(null)} label={t('cr38.nav.clubs')}>
      <div className="cr-sheet g-card g-card--desk sm-drawer__b"><ClubsSheet relations={relations} rank={c.rank} /></div>
    </Sheet>
    <Sheet open={more === 'more'} onClose={() => setMore(null)} label={t('cr38.nav.more')}>
      <div className="cr-sheet g-card g-card--desk sm-drawer__b">
        <RecordRow ch={ch} />
        <button className="sm-replay" onClick={() => { setMore(null); onOpening(); }}>
          <span className="sm-replay__ic"><Icon n="play" size={20} /></span>
          <span className="sm-row__b"><b>{t('cr38.open.replay')}</b><span>{t('cr38.open.k')} · {t('cr38.open.title')}</span></span>
          <Icon n={t.rtl ? 'back' : 'arrow'} size={18} />
        </button>
        <Slots />
        {isEstablished(c) && <div className="sm-acts" style={{ marginTop: 12 }}>
          <GBtn kind="dark" size="sm" onClick={() => { setMore(null); onPrestige(); }}><Icon n="star" size={18} />{t('cr38.prestige.go')}</GBtn>
          <p className="sm-note">{t('cr38.prestige.what')}</p>
        </div>}
      </div>
    </Sheet>
  </div>;
}
function sender(t: TT, from: string, v?: Record<string, string | number>) {
  if (from === 'press') return t('g.story.from.press', { c: v?.c ?? '' });
  if (from === 'player') return String(v?.p ?? t('g.story.from.player'));
  return t('g.story.from.' + from);
}

function LogSheet({ log, line }: { log: { at: number; from: string; key: string; v?: Record<string, string | number> }[]; line: (m: { from: string; key: string; v?: Record<string, string | number> }) => string }) {
  const t = useT();
  const mp = usePaged(log, 4);
  if (!log.length) return <p className="sm-empty">{t('cr38.log.empty')}</p>;
  return <>
    <div className="cr-msgs">{mp.rows.map((m, j) => <div key={m.at + ':' + j} className="cr-msg">
      <Face from={beatFrom(m)} v={m.v} />
      <span><b>{sender(t, beatFrom(m), m.v)}</b><span dir="auto">{line(m)}</span></span>
    </div>)}</div>
    <Pager p={mp} />
  </>;
}

function ClubsSheet({ relations, rank }: { relations: ReturnType<typeof relationsOf>; rank: number }) {
  const t = useT();
  const mp = usePaged(relations, 5);
  return <>
    <p className="sm-note" style={{ textAlign: 'start', marginBottom: 10 }}>{rank >= RELATIONS_FROM ? t('cr38.club.lead') : t('cr38.club.leadEarly', { n: t(chapterName(STAGES[RELATIONS_FROM].id)) })}</p>
    {relations.length ? <>
      {mp.rows.map((r) => { const cl = clubById(r.id); return <div key={r.id} className={'sm-row cr-clubrow is-' + r.word}>
        <Crest club={cl} size={32} />
        <span className="sm-row__b"><b>{cl ? cl.n : r.id} <span className="cr-clubrow__w">{t('cr38.club.' + r.word)}</span></b><span>{t('cr38.club.line.' + r.word)}</span></span>
        <span className="g-chip">{num(r.v, true)}</span>
      </div>; })}
      <Pager p={mp} />
    </> : <p className="sm-empty">{t('cr38.club.empty')}</p>}
  </>;
}

function RecordRow({ ch }: { ch: Chapter }) {
  const t = useT();
  const s = useSave();
  const c = s.career!;
  const rightPct = c.calls ? Math.round((100 * c.right) / c.calls) : 0;
  return <>
    <div className="sm-stats">
      <Stat icon="news" v={String(c.windows)} k={t('career.windows')} sub={ch.done ? t('cr38.established.k') : t('cr38.stageOf', { n: ch.n })} />
      <Stat icon="check" v={rightPct + '%'} k={t('g.story.stats.right')} sub={t('g.story.stats.of', { n: c.calls })} />
      <Stat icon="bolt" v={String(c.exclusives)} k={t('g.story.stats.excl')} sub={t('g.story.stats.uturns', { n: c.uturns })} />
      <Stat icon="star" v={String(c.t1)} k={t('g.story.goal.t1')} sub={t('cr38.favours', { n: totalFavours(c) })} />
    </div>
    {c.history.length > 0 && <>
      <h3 className="sm-sub">{t('g.story.hist.title')}</h3>
      {c.history.slice(0, 3).map((h) => <div key={h.n + ':' + h.at} className="sm-row sm-hist">
        <span className="sm-hist__n g-num">{t('g.story.hist.w', { n: h.n })}</span>
        <span className={'g-stamp sm-hist__st g-stamp--' + (TIER_STAMP[h.tier] || '')}>{t('tier.' + h.tier)}</span>
        <span className="sm-hist__p g-num">{num(h.total, true)}</span>
        <span className="sm-hist__c g-mono">{t('g.story.hist.cred', { n: Math.round(h.repAfter) })}</span>
      </div>)}
    </>}
  </>;
}
function Stat({ icon, v, k, sub }: { icon: string; v: string; k: string; sub?: string }) {
  return <div className="sm-stat"><Icon n={icon} /><b className="g-num">{v}</b><span className="g-mono">{k}</span>{sub ? <em>{sub}</em> : null}</div>;
}

// ---------------------------------------------------------------- career save slots (solo, never ranked)
function Slots() {
  const t = useT();
  const s = useSave();
  const list = slotList(s), cur = s.slot || 0;
  const [codes, setCodes] = useState<Record<number, string>>({});
  const [sure, setSure] = useState(-1);
  const [busy, setBusy] = useState(false);
  const err = (e?: string) => toast('warn', e === 'offline' || e === 'net' ? t('err.net') : t('m.slots.bad'));
  const getCode = async (k: number) => { setBusy(true); const r = await slotCode(k); setBusy(false); if (r.code) setCodes({ ...codes, [k]: r.code }); else err(r.error); };
  const restore = async (k: number) => {
    const code = window.prompt(t('m.slots.enter'));
    if (!code) return;
    setBusy(true); const r = await restoreCode(k, code); setBusy(false);
    if (r.ok) { sfx('ui.pop'); toast('info', t('m.slots.restored', { n: k + 1 })); } else err(r.error);
  };
  return <section className="sm-slots is-bare">
    <div className="g-sec" style={{ margin: '14px 0 6px' }}><h2>{t('m.slots.title')}</h2><span className="g-mono">{t('m.slots.aside')}</span></div>
    {list.map((v, k) => <div key={k} className="sm-slot">
      <span className="sm-row__b"><b>{t('m.slots.n', { n: k + 1 })}{k === cur ? ' · ' + t('m.slots.active') : ''}</b>
        <span>{v ? (v.career.paper || t('g.story.paperDefault', { n: s.nick || t('common.you') })) + ' · ' + t(chapterName(STAGES[Math.min(TOP, v.career.rank)].id)) + ' · ' + t('career.windows') + ' ' + v.career.windows : t('m.slots.empty')}</span>
        {codes[k] && <span className="g-mono">{t('m.slots.code', { c: codes[k] })}</span>}</span>
      <span className="sm-slot__b">
      {v && k !== cur && <GBtn kind="gold" size="sm" onClick={() => switchSlot(k)}>{t('m.slots.play')}</GBtn>}
      {!v && <GBtn kind="gold" size="sm" onClick={() => newSlot(k)}>{t('m.slots.new')}</GBtn>}
      {!v && <GBtn kind="dark" size="sm" disabled={busy} onClick={() => restore(k)}>{t('m.slots.restore')}</GBtn>}
      {v && <GBtn kind="dark" size="sm" disabled={busy} onClick={() => getCode(k)}>{t('m.slots.getCode')}</GBtn>}
      {v && (sure === k ? <GBtn size="sm" onClick={() => { deleteSlot(k); setSure(-1); }}>{t('m.slots.sure')}</GBtn>
        : <GBtn kind="ghost" size="sm" onClick={() => setSure(k)}>{t('m.slots.del')}</GBtn>)}
      </span>
    </div>)}
    <p className="sm-note" style={{ marginTop: 8 }}>{t('m.slots.note')}</p>
  </section>;
}
export { TOP_WINDOWS };
