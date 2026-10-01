// Story mode, "The Comeback" (games/tier-one/v3/STORY.html): the Career told as a comeback and a mystery.
// A cover, the prologue film and its title card for new players, then the chapter screen, whose heart is the goal, the
// case file (evidence pinned by each chapter's reveal) and the inbox; and a card (with its film) for each new chapter.
// Career rules and rank gates are unchanged (lib/career.ts); chapters are the ranks (lib/storyMode.ts).
// One career (GOTY.md §7.2): credibility is the byline's reputation, followers are the byline's, the sources' trust is
// the Contacts Book level, all read from lib/byline.ts. The hub owns only the story: chapter, goal, favours, clubs.
import { useEffect, useState, type CSSProperties } from 'react';
import { useT, num } from '../lib/i18n';
import { useSave, update } from '../lib/save';
import { RANKS, newCareer, totalFavours, VINCE_RANK, careerTrust, TRUST_EARLY, TRUST_AGAIN } from '../lib/career';
import { bylineOf, bookOf, bookProgress, repTier } from '../lib/byline';
import { chapterFor, chapterNew, chapterScene, CHAPTERS, EPILOGUE, EVIDENCE, evidenceOpen, revealAt, beatKey, beatFrom, type Chapter, type Beat } from '../lib/storyMode';
import { clubById, RULES } from '../lib/engine';
import { randomSeed } from '../lib/driver';
import { slotList, switchSlot, newSlot, deleteSlot, slotCode, restoreCode } from '../lib/slots';
import { spend, toast } from '../lib/meta';
import { playScene, afterScenes, seen } from '../lib/scenes';
import { sfx } from '../lib/sfx';
import { Icon, GBtn, TopBar, SrcIcon, Rel, confetti } from '../ui/game';
import { Crest, Sheet } from '../ui/bits';
import { Tip, usePaged, Pager } from '../ui/fit';
import type { Chrome } from '../App';
import { earnHook } from '../lib/earnhook';

const SRC = ['kitman', 'barber', 'agent', 'spotter', 'physio'] as const;
const SRC_SENDERS = ['kitman', 'barber', 'agent', 'spotter', 'physio'];
const FROM_ICON: Record<string, string> = { editor: 'news', hana: 'news', desk: 'news', tabloid: 'bolt', itk: 'eye', insider: 'star', unknown: 'phone' };
const TIER_STAMP: Record<string, string> = { T1: 'gold', T2: 'done', T3: 'done', T4: 'off', SPIKED: '' };
const fmtK = (n: number) => (n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n));
// "Ch. 2 · The Evening Post" → "The Evening Post" (the number is shown on its own).
const bare = (name: string) => { const k = name.indexOf(' · '); return k >= 0 ? name.slice(k + 3) : name; };
const vi = (i: number) => ({ ['--i' as string]: i });

/** A sender's face: sources get their own icon, the newsroom and the rivals a coloured tile. */
function Face({ from, sm }: { from: string; sm?: boolean }) {
  if (SRC_SENDERS.includes(from)) return <span className={'sm-av sm-av--src' + (sm ? ' sm-av--sm' : '')}><SrcIcon k={from} size={sm ? 34 : 44} /></span>;
  return <span className={'sm-av sm-av--' + from + (sm ? ' sm-av--sm' : '')}><Icon n={FROM_ICON[from] || 'news'} /></span>;
}

let doorPassed = false;
export function StoryScreen(chrome: Chrome) {
  const s = useSave();
  const c = s.career;
  // The prologue's title card, after its film: 'start' begins the story, 'replay' just closes.
  const [pro, setPro] = useState<null | 'start' | 'replay'>(null);
  // Start chapter 1: a new career, or the one onboarding opened (3.4: the prologue is the game's opening).
  const create = () => {
    const first = !c || (!s.story?.prologue && c.windows === 0);
    update((x) => {
      x.story = x.story || {}; x.story.prologue = true;
      if (!x.career) { x.career = newCareer(); x.story.chapterSeen = 0; }
    });
    if (first) playScene(chapterScene(0));
  };
  const film = (mode: 'start' | 'replay') => { sfx('open'); playScene('story-prologue'); afterScenes(() => setPro(mode)); };
  const start = () => { if (!s.story?.prologue) film('start'); else { sfx('open'); create(); } };
  // A career without the prologue seen (opened by onboarding, or from before Story mode): its title card, once, after
  // whatever film is playing (onboarding's prologue).
  const needCard = !!c && !s.story?.prologue;
  useEffect(() => { if (needCard) afterScenes(() => setPro((p) => p || (c!.windows > 0 ? 'replay' : 'start'))); }, [needCard]); // eslint-disable-line react-hooks/exhaustive-deps
  const ch = c ? chapterFor(c, bylineOf(s).rep) : null;
  // 3.6: opening Career shows the door (Continue · New career) first; Continue goes straight to the chapter from then on,
  // until Back takes you home. A window in progress skips the door.
  const [door, setDoor] = useState(() => !doorPassed && !c?.live);
  const intro = !!(c && ch && !door && !pro && !needCard && (s.story?.chapterSeen ?? -1) < ch.i);
  const wipe = () => {
    update((x) => { x.career = newCareer((x.slot || 0) + 1, (x.career?.restarts || 0) + 1); x.story = { ...(x.story || {}), prologue: true, chapterSeen: -1, beats: {}, inbox: [] }; });
    doorPassed = true; setDoor(false);
  };

  return <>
    {c && ch && door ? <CareerDoor chrome={chrome} ch={ch} onContinue={() => { doorPassed = true; setDoor(false); }} onNew={wipe} />
      : c && ch ? <ChapterScreen chrome={chrome} ch={ch} onPrologue={() => film('replay')} onBack={() => { doorPassed = false; chrome.go({ n: 'front' }); }} />
      : <Cover chrome={chrome} onStart={start} onPrologue={s.story?.prologue ? () => film('replay') : undefined} />}
    {pro && <PrologueCard replay={pro === 'replay'} onAgain={() => { setPro(null); film(pro); }} onDone={() => { if (pro === 'start') create(); else if (!s.story?.prologue) update((x) => { x.story = { ...(x.story || {}), prologue: true }; }); setPro(null); }} />}
    {intro && ch && <ChapterIntro ch={ch} onGo={() => update((x) => { x.story = x.story || {}; x.story.chapterSeen = ch.i; earnHook(x); })} />}
  </>;
}

// ---------------------------------------------------------------- cover (no career yet)
function Cover({ chrome, onStart, onPrologue }: { chrome: Chrome; onStart: () => void; onPrologue?: () => void }) {
  const t = useT();
  return <div className="g-screen sm fit">
    <TopBar back={{ label: t('g.tabs.home'), onClick: () => chrome.go({ n: 'front' }) }} title={t('hub.mode.career')} onHelp={() => chrome.go({ n: 'howto' })} />
    <div className="fit__body">
      <Tip id="career" />
      <section className="sm-book g-card" style={vi(0)}>
        <span className="sm-book__spine" aria-hidden="true" />
        <div className="sm-book__in">
          <span className="g-chip g-chip--gold"><Icon n="story" />{t('g.story.k')}</span>
          <h1 className="sm-book__title">{t('g.story.cover.title')}</h1>
          <p className="sm-book__hook">{t('g.story.cover.hook')}</p>
          <div className="sm-book__lost"><b className="g-num">−38,200</b><span className="g-mono">{t('g.story.cover.lost')}</span></div>
          <TextBubble />
          <GBtn kind="gold" size="lg" pulse shine sound={null} onClick={onStart} style={{ marginTop: 14 }}><Icon n="story" size={24} />{t('g.story.cover.start')}</GBtn>
          {onPrologue && <button className="sm-link" onClick={onPrologue}><Icon n="play" size={16} />{t('g.story.cover.replay')}</button>}
        </div>
      </section>
    </div>
  </div>;
}

/** The text from the unknown number. The whole story in two words. */
function TextBubble({ dark }: { dark?: boolean }) {
  const t = useT();
  return <div className={'sm-sms' + (dark ? ' is-dark' : '')}>
    <span className="sm-sms__from g-mono"><Icon n="phone" size={12} />{t('g.story.cover.textFrom')} · 00:41</span>
    <span className="sm-sms__b">{t('g.story.cover.text')}</span>
  </div>;
}

// ---------------------------------------------------------------- the chapter trail (5 chapters + the epilogue)
function Trail({ at, done, style, bare: inDrawer }: { at: number; done?: boolean; style?: CSSProperties; bare?: boolean }) {
  const t = useT();
  return <section className={'sm-trail' + (inDrawer ? ' is-bare' : ' g-card g-card--desk')} style={style} aria-label={t('g.story.trail')}>
    {!inDrawer && <div className="g-sec" style={{ margin: '0 0 12px' }}><h2>{t('g.story.trail')}</h2><span className="g-mono">{at >= EPILOGUE ? t('g.story.epilogue') : at >= 0 ? t('g.story.chapterOf', { n: at + 1 }) : ''}</span></div>}
    <ol>
      {CHAPTERS.map((id, k) => {
        const st = done || k < at ? 'done' : k === at ? 'now' : 'locked';
        return <li key={id} className={'is-' + st + (k === EPILOGUE ? ' is-epi' : '')}>
          <span className="sm-trail__dot">{st === 'done' ? <Icon n="check" /> : st === 'locked' ? <Icon n={k === EPILOGUE ? 'star' : 'lock'} /> : k === EPILOGUE ? <Icon n="star" /> : <b>{k + 1}</b>}</span>
          <span className="sm-trail__n">{bare(t('g.story.ch.' + id + '.name'))}</span>
          {k < EPILOGUE && <span className="sm-trail__r g-mono">{t('career.ranks.' + k)}</span>}
        </li>;
      })}
    </ol>
  </section>;
}

// ---------------------------------------------------------------- the prologue's title card (after the film)
function PrologueCard({ replay, onDone, onAgain }: { replay: boolean; onDone: () => void; onAgain: () => void }) {
  const t = useT();
  const reduced = useSave().reduced;
  const lines = t.list('g.story.pro.lines') as string[];
  useEffect(() => {
    const b = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const ids = reduced ? [] : lines.map((_, k) => window.setTimeout(() => sfx(k === 1 ? 'stamp.wrong' : 'typewriter'), 350 + k * 520));
    return () => { document.body.style.overflow = b; ids.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className={'sm-pro' + (reduced ? ' is-static' : '')} role="dialog" aria-modal="true" aria-label={t('g.story.pro.k')}>
    <div className="sm-pro__top">
      <span className="g-mono sm-pro__k">{t('g.story.pro.k')}</span>
      <button className="sm-pro__skip" onClick={() => { sfx('ui.tap'); onDone(); }}>{replay ? t('common.close') : t('g.story.pro.skip')}<Icon n={replay ? 'x' : t.rtl ? 'back' : 'arrow'} size={16} /></button>
    </div>
    <div className="sm-pro__stage">
      <div className="sm-pro__panel sm-procard">
        <h1 className="sm-procard__t">{t('g.story.pro.title')}</h1>
        <ol className="sm-procard__lines">
          {lines.map((l, k) => <li key={k} style={{ animationDelay: 300 + k * 520 + 'ms' }} className={k === 1 ? 'is-hwg' : ''}>{l}</li>)}
        </ol>
        <div className="sm-procard__sms" style={{ animationDelay: 300 + lines.length * 520 + 'ms' }}><TextBubble dark /></div>
        {!replay && <div className="sm-chcard g-card" style={{ animationDelay: 600 + lines.length * 520 + 'ms' }}>
          <span className="sm-chcard__num g-num">1</span>
          <span className="g-mono sm-chcard__k">{t('g.story.chapterOf', { n: 1 })} · {t('career.ranks.0')}</span>
          <h2 className="g-h1">{bare(t('g.story.ch.blog.name'))}</h2>
          <p className="sm-premise">{t('g.story.ch.blog.premise')}</p>
          <GBtn kind="gold" size="lg" shine pulse sound="open" onClick={onDone} style={{ marginTop: 18 }}><Icon n="story" size={22} />{t('g.story.pro.begin')}</GBtn>
        </div>}
        <button className="sm-link sm-link--dark" onClick={() => { sfx('ui.tap'); onAgain(); }}><Icon n="play" size={16} />{t('g.story.pro.again')}</button>
      </div>
    </div>
  </div>;
}

// ---------------------------------------------------------------- chapter intro card (once per chapter, after its film)
function ChapterIntro({ ch, onGo }: { ch: Chapter; onGo: () => void }) {
  const t = useT();
  const fresh = chapterNew(ch.i);
  const finale = ch.i >= EPILOGUE;
  const by = t('g.story.ch.' + ch.id + '.introBy');
  useEffect(() => {
    const id = chapterScene(ch.i);
    if (!seen(id)) playScene(id);
    afterScenes(() => { sfx(finale ? 'fanfare' : 'unlock'); if (finale) confetti(['#F7B928', '#FFD35C', '#FF5A36', '#F4EFE4']); });
    const b = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = b; };
  }, [finale, ch.i]);
  return <div className="g-overlay sm-introwrap" role="dialog" aria-modal="true" aria-label={t('g.story.ch.' + ch.id + '.name')}>
    <div className="sm-intro g-card">
      <div className="sm-intro__band"><span className="g-mono">{finale ? t('g.story.epilogue') : t('g.story.intro.k')}</span><span className="g-mono">{finale ? t('g.story.caseFile.solved') : t('g.story.chapterOf', { n: ch.n })}</span></div>
      <div className="sm-intro__body">
        <span className="sm-intro__num g-num">{finale ? <Icon n="star" size={72} /> : ch.n}</span>
        <h2 className="g-h1">{bare(t('g.story.ch.' + ch.id + '.name'))}</h2>
        {!finale && <span className="g-chip g-chip--gold sm-intro__rank">{t('g.story.intro.rank', { rank: t('career.ranks.' + ch.i) })}</span>}
        <p className="sm-premise">{t('g.story.ch.' + ch.id + '.premise')}</p>
        <blockquote className="sm-intro__q"><Face from={by} sm /><span>{t('g.story.ch.' + ch.id + '.intro')}<em>{t('g.story.from.' + by)}</em></span></blockquote>
        {finale && <p className="sm-intro__solved"><span className="g-stamp g-stamp--gold is-slam">{t('g.story.caseFile.solved')}</span>{t('g.story.caseFile.solvedLine')}</p>}
        {!finale && <>
          <h3 className="g-mono sm-intro__h">{t('g.story.intro.new')}</h3>
          <div className="sm-intro__new">
            {fresh.src.map((k) => <span key={k} className="sm-new"><SrcIcon k={k} size={30} /><span><em className="g-mono">{t('g.story.intro.srcNew')} · {t('src.' + k)}</em>{t('g.story.who.' + k)}</span></span>)}
            {fresh.rivals.map((k) => <span key={k} className="sm-new"><Face from={k} sm /><span><em className="g-mono">{t('g.story.intro.rivalsNew')}</em>{t('rival.' + k)}</span></span>)}
            {ch.i === VINCE_RANK && <span className="sm-new sm-new--vince"><span className="sm-av sm-av--vince sm-av--sm"><Icon n="eye" /></span><span><em className="g-mono">{t('g.story.vince.chip')}</em>{t('g.story.vince.introD')}</span></span>}
            {!fresh.src.length && !fresh.rivals.length && ch.i !== VINCE_RANK && <p className="sm-note">{ch.i <= RANKS.length - 1 ? t('career.unl.' + ch.i) : t('g.story.intro.nothing')}</p>}
          </div>
          {(fresh.src.length > 0 || fresh.rivals.length > 0 || ch.i === VINCE_RANK) && <p className="sm-intro__unl">{t('career.unl.' + Math.min(ch.i, RANKS.length - 1))}</p>}
        </>}
        <GBtn kind="gold" size="lg" shine sound="open" onClick={onGo} style={{ marginTop: 16 }}>{finale ? t('g.story.intro.finaleGo') : t('g.story.intro.go')}<Icon n={t.rtl ? 'back' : 'arrow'} size={22} /></GBtn>
      </div>
    </div>
  </div>;
}

// ---------------------------------------------------------------- the case file: who burned you?
const EV_FACE: Record<string, string> = { rosa: 'agent', kev: 'itk', tony: 'spotter', priya: 'itk' };
function CaseFile({ ch, style, unfolded }: { ch: Chapter; style?: CSSProperties; unfolded?: boolean }) {
  const t = useT();
  const s = useSave();
  const c = s.career!;
  const beats = s.story?.beats || {};
  const open = evidenceOpen(ch.i, beats);
  const n = open.filter(Boolean).length;
  const solved = ch.i >= EPILOGUE;
  const known = t.list('g.story.caseFile.known') as string[];
  const at = revealAt(c.rank, beats);
  // Folded on phones (the hub stays one screen); a fresh lead opens it.
  const fresh = s.story?.inbox?.some((m) => !m.read && /^reveal\d$/.test(m.key));
  const [unfold, setUnfold] = useState(() => !!unfolded || wide() || !!fresh);
  return <section className={'sm-case g-card' + (solved ? ' is-solved' : '') + (unfold ? ' is-open' : '') + (fresh ? ' is-fresh' : '')} style={style} aria-labelledby="sm-case-h">
    <button className="sm-case__h" aria-expanded={unfold} onClick={() => { sfx('ui.tap'); setUnfold(!unfold); }}>
      <span className="sm-case__ht"><h2 id="sm-case-h">{t('g.story.caseFile.title')}</h2><span className="g-mono">{t('g.story.caseFile.aside')}</span></span>
      <span className="sm-case__count g-num" aria-label={n + '/4'}>{n}<small>/4</small></span>
      <Icon n="down" size={18} className="sm-drawer__ch" />
    </button>
    {unfold && <>
    <p className="sm-case__known">{solved ? t('g.story.caseFile.solvedLine') : known[Math.min(n, known.length - 1)]}</p>
    <div className="sm-case__board">
      {EVIDENCE.map((id, k) => {
        const on = open[k], next = !on && k === ch.i;
        return <article key={id} className={'sm-ev' + (on ? ' is-on' : ' is-locked') + (next ? ' is-next' : '')} style={{ ['--r' as string]: [-2.2, 1.8, -1.2, 2.4][k] + 'deg' }}>
          <span className="sm-ev__pin" aria-hidden="true" />
          {on ? <>
            <span className="sm-ev__h"><Face from={EV_FACE[id]} sm /><b>{t('g.story.caseFile.ev.' + id + '.t')}</b></span>
            <p>{t('g.story.caseFile.ev.' + id + '.b')}</p>
          </> : <>
            <span className="sm-ev__h"><span className="sm-ev__q" aria-hidden="true">?</span><b>{t('g.story.caseFile.locked', { n: k + 1 })}</b></span>
            <p>{next ? t('g.story.goal.lead') + ' · ' + (c.windows + 1 >= at ? t('g.story.goal.leadNext') : t('g.story.goal.leadIn', { n: at })) : t('g.story.caseFile.lockedHint', { n: k + 1 })}</p>
          </>}
        </article>;
      })}
    </div>
    {solved && <span className="g-stamp g-stamp--gold is-slam sm-case__stamp">{t('g.story.caseFile.solved')}</span>}
    </>}
  </section>;
}

// ---------------------------------------------------------------- the Career door (3.6): Continue · New career
function CareerDoor({ chrome, ch, onContinue, onNew }: { chrome: Chrome; ch: Chapter; onContinue: () => void; onNew: () => void }) {
  const t = useT();
  const s = useSave();
  const c = s.career!;
  const [sure, setSure] = useState(false);
  const paper = c.paper || t('g.story.paperDefault', { n: s.nick || t('common.you') });
  return <div className="g-screen sm fit">
    <TopBar back={{ label: t('g.tabs.home'), onClick: () => chrome.go({ n: 'front' }) }} title={t('hub.mode.career')} onHelp={() => chrome.go({ n: 'howto' })} />
    <div className="fit__body cr-door">
      <Tip id="career" />
      <section className="g-card cr-card">
        <div className="cr-card__k g-mono"><span>{ch.i >= EPILOGUE ? t('g.story.epilogue') : t('g.story.chapterOf', { n: ch.n })}</span><span>{paper}</span></div>
        <h1 className="g-h1">{bare(t('g.story.ch.' + ch.id + '.name'))}</h1>
        <ul className="cr-lines">
          <li><Icon n="news" size={16} /><span>{t('hub.career.windows', { n: c.windows })}</span></li>
          <li><Icon n="target" size={16} /><span>{needLine(t, ch)}</span></li>
        </ul>
        <GoalBar ch={ch} />
        <GBtn kind="gold" size="lg" shine pulse sound="open" onClick={onContinue} style={{ marginTop: 6 }}><Icon n="story" size={24} />{t('hub.career.continue')}</GBtn>
      </section>
      <GBtn kind="ghost" onClick={() => setSure(true)}><Icon n="uturn" size={20} />{t('hub.career.newCareer')}</GBtn>
    </div>
    <Sheet open={sure} onClose={() => setSure(false)} label={t('hub.career.newCareer')}>
      <div className="rm-sure">
        <h2 className="g-h2" style={{ color: 'var(--card-ink)' }}>{t('hub.career.newSure')}</h2>
        <div className="rm-sure__b">
          <GBtn onClick={() => { setSure(false); sfx('ui.pop'); onNew(); }}>{t('hub.career.newYes')}</GBtn>
          <GBtn kind="paper" onClick={() => setSure(false)}>{t('hub.career.cancel')}</GBtn>
        </div>
      </div>
    </Sheet>
  </div>;
}
type TT = ReturnType<typeof useT>;
function needLine(t: TT, ch: Chapter) {
  const g = ch.goal;
  if (!g) return t('hub.career.needDone');
  if (g.t1 != null) return t('hub.career.needT1', { n: Math.max(0, g.t1 - (g.haveT1 || 0)) });
  return t('hub.career.need', { w: Math.max(0, g.windows - g.haveW), c: Math.max(0, g.rep - g.haveRep) });
}
function GoalBar({ ch }: { ch: Chapter }) {
  const t = useT();
  const g = ch.goal;
  const p = Math.round(100 * Math.min(1, ch.progress));
  return <div className="cr-goal">
    <span className="cr-goal__l g-mono"><span>{t('hub.career.goal')}</span><span>{g ? (g.t1 != null ? (g.haveT1 || 0) + '/' + g.t1 : g.haveW + '/' + g.windows + ' · ' + g.haveRep + '/' + g.rep) : '✓'}</span></span>
    <span className="g-bar" style={{ ['--bar' as string]: p >= 100 ? 'var(--c-done)' : 'linear-gradient(90deg,#FFD35C,#F7B928)' }}><i style={{ width: p + '%' }} /></span>
  </div>;
}

// ---------------------------------------------------------------- the chapter screen (career exists): one short card,
// the goal bar and Play next window; three messages at a time; everything else one tap away in a sheet.
type More = null | 'case' | 'record' | 'sources' | 'desk';
function ChapterScreen({ chrome, ch, onPrologue, onBack }: { chrome: Chrome; ch: Chapter; onPrologue: () => void; onBack: () => void }) {
  const t = useT();
  const s = useSave();
  const c = s.career!;
  const rk = RANKS[c.rank];
  const [unread] = useState(() => (s.story?.inbox || []).filter((m) => !m.read).length);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.paper);
  const [sure, setSure] = useState(false);
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
  const inbox = [...(s.story?.inbox || [])].reverse();
  const msgs: { key: string; from: string; text: string; fresh: boolean; lead: boolean }[] = inbox.length
    ? inbox.slice(0, 30).map((m, j) => ({ key: m.at + ':' + j, from: beatFrom(m), text: t(beatKey(m as Beat), m.v), fresh: j < unread, lead: /^reveal\d$/.test(m.key) }))
    : [{ key: 'brief', from: t('g.story.ch.' + ch.id + '.briefBy'), text: t('g.story.ch.' + ch.id + '.brief'), fresh: false, lead: false }];
  const mp = usePaged(msgs, 3);
  const rightPct = c.calls ? Math.round((100 * c.right) / c.calls) : 0;
  const b = bylineOf(s); // one career: credibility is the byline's reputation, followers are the byline's
  const clubs = Object.entries(c.relations).filter(([, r]) => r.v !== 0).sort((a, b) => b[1].v - a[1].v);
  const g = ch.goal;
  const epi = ch.i >= EPILOGUE;
  const against = rk.rivals.map((k) => t('rival.' + k)).join(', ');
  const beats = s.story?.beats || {};
  const leadAt = ch.i < 4 && !beats['reveal' + (ch.i + 1)] ? revealAt(c.rank, beats) : 0;

  return <div className="g-screen sm sm--hub fit">
    <TopBar back={{ label: t('g.tabs.home'), onClick: onBack }} title={t('hub.mode.career')} onHelp={() => chrome.go({ n: 'howto' })} />
    <div className="fit__body">
      <Tip id="career" />
      {/* ---------- one short chapter card: where you are, who's against you, what you need; the goal; Play */}
      <section className="g-card cr-card">
        <div className="cr-card__k g-mono">
          <span>{epi ? t('g.story.epilogue') : t('g.story.chapterOf', { n: ch.n })} · {t('career.ranks.' + c.rank)}</span>
          <span>{paper}<button className="g-icbtn" style={{ width: 28, height: 28, marginInlineStart: 6, verticalAlign: 'middle' }} aria-label={t('g.story.rename')} onClick={() => { setName(c.paper); setEditing(!editing); }}><Icon n="pen" size={14} /></button></span>
        </div>
        {editing && <form className="sm-rename" onSubmit={(e) => { e.preventDefault(); saveName(); }}>
          <input value={name} maxLength={28} autoFocus placeholder={t('g.story.paperPh')} onChange={(e) => setName(e.target.value)} aria-label={t('g.story.paperPh')} />
          <GBtn kind="gold" size="sm" onClick={saveName} sound="ui.pop">{t('g.story.save')}{cost ? <> · <span className="g-coin" />{cost}</> : ''}</GBtn>
        </form>}
        <h1 className="g-h1" style={{ fontSize: 28 }}>{bare(t('g.story.ch.' + ch.id + '.name'))}</h1>
        <ul className="cr-lines">
          <li><Icon n="news" size={16} /><span>{t('hub.career.where', { paper, n: ch.n })}</span></li>
          <li><Icon n="bolt" size={16} /><span>{t('hub.career.against', { r: against })}</span></li>
          <li><Icon n="target" size={16} /><span>{needLine(t, ch)}</span></li>
        </ul>
        <GoalBar ch={ch} />
        {leadAt > 0 && <span className="g-mono" style={{ fontSize: 11, color: 'var(--card-ink-3)' }}><Icon n="eye" size={13} /> {c.windows + 1 >= leadAt ? t('g.story.goal.leadNext') : t('g.story.goal.leadIn', { n: leadAt })}</span>}
        <GBtn kind="gold" size="lg" pulse={!c.live} shine sound="open" onClick={play}>
          <Icon n="phone" size={24} />{c.live ? t('g.story.resume') : t('g.story.play', { n: c.windows + 1 })}
        </GBtn>
      </section>

      {/* ---------- messages: short, three at a time */}
      <div className="g-sec" style={{ margin: 0 }}><h2>{t('hub.career.messages')}</h2>{unread > 0 && <span className="g-chip g-chip--red">{t('g.story.inbox.unread')} · {unread}</span>}</div>
      <div className="cr-msgs">{mp.rows.map((m) => <div key={m.key} className={'cr-msg' + (m.fresh ? ' is-new' : '')}>
        <Face from={m.from} sm />
        <span><b>{t('g.story.from.' + m.from)}{m.lead ? ' · ' + t('g.story.caseFile.title') : ''}</b><span dir="auto">{m.text}</span></span>
      </div>)}</div>
      <Pager p={mp} />

      {/* ---------- the rest, one tap away */}
      <nav className="cr-more" aria-label={t('hub.career.more')}>
        <button onClick={() => { sfx('ui.tap'); setMore('case'); }}><Icon n="eye" size={18} />{t('hub.career.case')}</button>
        <button onClick={() => { sfx('ui.tap'); setMore('record'); }}><Icon n="trophy" size={18} />{t('hub.career.record')}</button>
        <button onClick={() => { sfx('ui.tap'); setMore('sources'); }}><Icon n="phone" size={18} />{t('hub.career.sources')}</button>
        <button onClick={() => { sfx('ui.tap'); setMore('desk'); }}><Icon n="briefcase" size={18} />{t('hub.career.desk')}</button>
      </nav>
    </div>

    <Sheet open={more === 'case'} onClose={() => setMore(null)} label={t('hub.career.case')}>
      <div className="cr-sheet"><CaseFile ch={ch} unfolded /></div>
    </Sheet>
    <Sheet open={more === 'record'} onClose={() => setMore(null)} label={t('hub.career.record')}>
      <div className="cr-sheet g-card g-card--desk sm-drawer__b">
        <Trail at={ch.i} done={ch.done} bare />
        <button className="sm-byline" onClick={() => { sfx('ui.tap'); chrome.go({ n: 'me' }); }}>
          <span className="g-stamp sm-byline__stamp">{t('cn.tier.' + repTier(b.rep))}</span>
          <span className="sm-byline__n"><b className="g-num">{Math.round(b.rep)}</b><small className="g-mono">{t('g.story.stats.cred')}</small></span>
          <span className="sm-byline__n"><b className="g-num">{fmtK(b.followers)}</b><small className="g-mono">{t('g.story.stats.followers')}</small></span>
          <span className="sm-byline__same g-mono">{t('g.story.stats.same')}</span>
          <Icon n={t.rtl ? 'back' : 'arrow'} size={16} />
        </button>
        <div className="sm-stats">
          <Stat icon="news" v={String(c.windows)} k={t('career.windows')} sub={epi ? t('g.story.epilogue') : t('g.story.chapterOf', { n: ch.n })} />
          <Stat icon="check" v={rightPct + '%'} k={t('g.story.stats.right')} sub={t('g.story.stats.of', { n: c.calls })} />
          <Stat icon="bolt" v={String(c.exclusives)} k={t('g.story.stats.excl')} sub={t('g.story.stats.uturns', { n: c.uturns })} />
          <Stat icon="star" v={String(c.t1)} k={t('g.story.goal.t1')} sub={g && g.t1 != null ? (g.haveT1 || 0) + '/' + g.t1 + ' · ' + t('career.ranks.' + (RANKS.length - 1)) : ''} />
        </div>
        <h3 className="sm-sub">{t('g.story.favours.title')}<span className="g-mono">{t('g.story.favours.aside', { n: totalFavours(c) })}</span></h3>
        <div className="sm-favs">
          {(['burner', 'tipoff', 'stakeout'] as const).map((k) => <div key={k} className={'sm-fav' + (c.favours[k] ? ' is-on' : '')}>
            <span className="sm-fav__ic"><Icon n={k === 'burner' ? 'phone' : k === 'tipoff' ? 'eye' : 'plane'} /><b className="g-badge">{c.favours[k]}</b></span>
            <b>{t('career.' + k)}</b><span>{t('career.' + k + 'D')}</span>
          </div>)}
        </div>
        <h3 className="sm-sub">{t('g.story.clubs.title')}<span className="g-mono">{t('career.clubsAside')}</span></h3>
        {clubs.length ? clubs.slice(0, 6).map(([id, r]) => { const cl = clubById(id); return <div key={id} className="sm-row">
          <Crest club={cl} size={28} />
          <span className="sm-row__b"><b>{cl ? cl.n : id}</b><span>{r.v >= 3 ? t('career.leak') : r.v <= -3 ? t('career.frozen') : t('career.neutral')}</span></span>
          <span className={'g-chip ' + (r.v >= 3 ? 'g-chip--done' : r.v > 0 ? 'g-chip--hijack' : 'g-chip--off')}>{num(r.v, true)}</span>
        </div>; }) : <p className="sm-empty">{t('career.clubsEmpty')}</p>}
        {c.history.length > 0 && <>
          <h3 className="sm-sub">{t('g.story.hist.title')}<span className="g-mono">{t('career.windows')} {c.windows}</span></h3>
          {c.history.slice(0, 5).map((h) => <div key={h.n + ':' + h.at} className="sm-row sm-hist">
            <span className="sm-hist__n g-num">{t('g.story.hist.w', { n: h.n })}</span>
            <span className={'g-stamp sm-hist__st g-stamp--' + (TIER_STAMP[h.tier] || '')}>{t('tier.' + h.tier)}</span>
            <span className="sm-hist__p g-num">{num(h.total, true)}</span>
            <span className="sm-hist__c g-mono">{t('g.story.hist.cred', { n: Math.round(h.repAfter) })}</span>
          </div>)}
        </>}
      </div>
    </Sheet>
    <Sheet open={more === 'sources'} onClose={() => setMore(null)} label={t('hub.career.sources')}>
      <div className="cr-sheet g-card g-card--desk sm-drawer__b">
        <div className="sm-srcs">
          {SRC.map((k) => {
            // The Contacts Book (lib/byline.ts): one level per source, every mode. The story shows what it does here.
            const open = rk.src.includes(k), lv = careerTrust(s, k), p = bookProgress(bookOf(s, k));
            const need = RANKS.findIndex((r) => r.src.includes(k));
            const steps = lv - 1;
            return <div key={k} className={'sm-src' + (open ? '' : ' is-locked')}>
              <div className="sm-src__top"><SrcIcon k={k} size={40} />{open ? <span className="sm-src__lv"><Rel n={Math.ceil((lv * 3) / 5)} /><b className="g-num">{t('career.level', { n: lv })}</b></span> : <Icon n="lock" size={18} className="sm-src__lock" />}</div>
              <b className="sm-src__n">{open ? t('g.story.who.' + k) : '?'}<span className="sm-src__role g-mono">{t('src.' + k)}</span></b>
              <span className="sm-src__d">{open ? (k === 'barber' ? t('career.barberFx', { p: Math.round(100 * Math.min(0.95, (RULES.SOURCES.barber.rel || 0.45) + 0.05 * steps)) }) : t('career.trustFx.' + steps)) : t('g.story.src.locked', { n: need + 1 })}</span>
              {open && <><span className="g-bar g-bar--sm" style={{ ['--bar' as string]: p.max ? 'linear-gradient(90deg,#FFD35C,#F7B928)' : 'var(--gold)' }}><i style={{ width: p.pct + '%' }} /></span>
                <span className="sm-src__next g-mono">{p.max ? t('career.trustMax') : t('career.trustNext', { n: p.need - p.into, l: lv + 1 })}{lv < TRUST_EARLY && (k === 'spotter' || k === 'physio') ? ' · ' + t('career.trustEarly', { l: TRUST_EARLY }) : lv < TRUST_AGAIN && c.rank >= 3 ? ' · ' + t('career.trustAgain', { l: TRUST_AGAIN }) : ''}</span></>}
            </div>;
          })}
        </div>
        <button className="sm-link sm-link--desk" onClick={() => { sfx('ui.tap'); chrome.go({ n: 'contacts' }); }}>{t('g.story.src.book')}<Icon n={t.rtl ? 'back' : 'arrow'} size={14} /></button>
      </div>
    </Sheet>
    <Sheet open={more === 'desk'} onClose={() => setMore(null)} label={t('hub.career.desk')}>
      <div className="cr-sheet g-card g-card--desk sm-drawer__b">
        <button className="sm-replay" onClick={() => { setMore(null); onPrologue(); }}>
          <span className="sm-replay__ic"><Icon n="play" size={20} /></span>
          <span className="sm-row__b"><b>{t('g.story.cover.replay')}</b><span>{t('g.story.pro.k')} · {t('g.story.pro.title')}</span></span>
          <Icon n={t.rtl ? 'back' : 'arrow'} size={18} />
        </button>
        <Slots bare />
        {c.rank >= RANKS.length - 1 && <div className="sm-acts" style={{ marginTop: 12 }}>
          {sure
            ? <div className="sm-sure"><p>{t('g.story.restart.sure')}</p>
              <div className="sm-sure__b"><GBtn size="sm" onClick={() => { update((x) => { x.career = newCareer((x.slot || 0) + 1, (x.career?.restarts || 0) + 1); x.story = { ...(x.story || {}), chapterSeen: -1, beats: {} }; }); setSure(false); }}>{t('g.story.restart.yes')}</GBtn>
                <GBtn kind="ghost" size="sm" onClick={() => setSure(false)}>{t('g.story.restart.no')}</GBtn></div></div>
            : <GBtn kind="ghost" size="sm" onClick={() => setSure(true)}><Icon n="briefcase" size={18} />{t('g.story.restart.go')}</GBtn>}
          {!sure && <p className="sm-note">{t('career.rivalD')}</p>}
        </div>}
      </div>
    </Sheet>
  </div>;
}

/** Wide screens (900px+) open the case file by default. */
const wide = () => typeof matchMedia !== 'undefined' && matchMedia('(min-width: 900px)').matches;

function Stat({ icon, v, k, sub }: { icon: string; v: string; k: string; sub?: string }) {
  return <div className="sm-stat"><Icon n={icon} /><b className="g-num">{v}</b><span className="g-mono">{k}</span>{sub ? <em>{sub}</em> : null}</div>;
}

// ---------------------------------------------------------------- career save slots (solo, never ranked)
const RENAME_COST = 250;
function Slots({ style, bare: inDrawer }: { style?: CSSProperties; bare?: boolean }) {
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
  return <section className={inDrawer ? 'sm-slots is-bare' : 'sm-slots sm-box g-card g-card--desk'} style={style}>
    <div className="g-sec" style={{ margin: inDrawer ? '14px 0 6px' : '0 0 6px' }}><h2>{t('m.slots.title')}</h2><span className="g-mono">{t('m.slots.aside')}</span></div>
    {list.map((v, k) => <div key={k} className="sm-slot">
      <span className="sm-row__b"><b>{t('m.slots.n', { n: k + 1 })}{k === cur ? ' · ' + t('m.slots.active') : ''}</b>
        <span>{v ? (v.career.paper || t('g.story.paperDefault', { n: s.nick || t('common.you') })) + ' · ' + t('career.ranks.' + v.career.rank) + ' · ' + t('career.windows') + ' ' + v.career.windows : t('m.slots.empty')}</span>
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
