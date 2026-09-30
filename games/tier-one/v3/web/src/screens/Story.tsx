// Story mode, "The Comeback" (games/tier-one/v3/STORY.html): the Career told as a comeback and a mystery.
// A cover, the prologue film and its title card for new players, then the chapter screen, whose heart is the goal, the
// case file (evidence pinned by each chapter's reveal) and the inbox; and a card (with its film) for each new chapter.
// Career rules and rank gates are unchanged (lib/career.ts); chapters are the ranks (lib/storyMode.ts).
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useT, num, fmtDate } from '../lib/i18n';
import { useSave, update } from '../lib/save';
import { RANKS, TRUST_LV, trustLevel, newCareer, totalFavours, VINCE_RANK } from '../lib/career';
import { chapterFor, chapterNew, chapterScene, CHAPTERS, EPILOGUE, EVIDENCE, evidenceOpen, revealAt, beatKey, beatFrom, type Chapter, type Beat } from '../lib/storyMode';
import { clubById, RULES } from '../lib/engine';
import { randomSeed } from '../lib/driver';
import { slotList, switchSlot, newSlot, deleteSlot, slotCode, restoreCode } from '../lib/slots';
import { spend, toast } from '../lib/meta';
import { playScene, afterScenes, seen } from '../lib/scenes';
import { sfx } from '../lib/sfx';
import { Icon, GBtn, TopBar, SrcIcon, Rel, confetti } from '../ui/game';
import { Crest } from '../ui/bits';
import type { Chrome } from '../App';

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
  const ch = c ? chapterFor(c) : null;
  const intro = !!(c && ch && !pro && !needCard && (s.story?.chapterSeen ?? -1) < ch.i);

  return <>
    {c && ch ? <ChapterScreen chrome={chrome} ch={ch} onPrologue={() => film('replay')} /> : <Cover chrome={chrome} onStart={start} onPrologue={s.story?.prologue ? () => film('replay') : undefined} />}
    {pro && <PrologueCard replay={pro === 'replay'} onAgain={() => { setPro(null); film(pro); }} onDone={() => { if (pro === 'start') create(); else if (!s.story?.prologue) update((x) => { x.story = { ...(x.story || {}), prologue: true }; }); setPro(null); }} />}
    {intro && ch && <ChapterIntro ch={ch} onGo={() => update((x) => { x.story = x.story || {}; x.story.chapterSeen = ch.i; })} />}
  </>;
}

// ---------------------------------------------------------------- cover (no career yet)
function Cover({ chrome, onStart, onPrologue }: { chrome: Chrome; onStart: () => void; onPrologue?: () => void }) {
  const t = useT();
  return <div className="g-screen sm">
    <TopBar onHelp={() => chrome.go({ n: 'howto' })} onMenu={chrome.openSettings} />
    <div className="stagger sm-stack">
      <section className="sm-book g-card" style={vi(0)}>
        <span className="sm-book__spine" aria-hidden="true" />
        <div className="sm-book__in">
          <span className="g-chip g-chip--gold"><Icon n="story" />{t('g.story.k')}</span>
          <h1 className="sm-book__title">{t('g.story.cover.title')}</h1>
          <div className="sm-clip g-halftone" aria-hidden="true">
            <span className="g-mono">{t('g.story.cover.clip')}</span>
            <b>{t('g.story.pro.hwg')}</b>
            <i /><i /><i className="short" />
            <span className="g-stamp is-slam sm-clip__stamp">{t('g.story.pro.wrong')}</span>
          </div>
          <p className="sm-book__hook">{t('g.story.cover.hook')}</p>
          <div className="sm-book__lost"><b className="g-num">−38,200</b><span className="g-mono">{t('g.story.cover.lost')}</span></div>
          <TextBubble />
          <p className="sm-book__hook2">{t('g.story.cover.hook2')}</p>
          <GBtn kind="gold" size="lg" pulse shine sound={null} onClick={onStart} style={{ marginTop: 18 }}><Icon n="story" size={24} />{t('g.story.cover.start')}</GBtn>
          {onPrologue && <button className="sm-link" onClick={onPrologue}><Icon n="play" size={16} />{t('g.story.cover.replay')}</button>}
          <p className="sm-book__meta g-mono">{t('g.story.cover.meta')}</p>
        </div>
      </section>
      <Trail at={-1} style={vi(1)} />
      <Slots style={vi(2)} />
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
function CaseFile({ ch, style }: { ch: Chapter; style?: CSSProperties }) {
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
  const [unfold, setUnfold] = useState(() => wide() || !!fresh);
  return <section className={'sm-case g-card' + (solved ? ' is-solved' : '') + (unfold ? ' is-open' : '')} style={style} aria-labelledby="sm-case-h">
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

// ---------------------------------------------------------------- the chapter screen (career exists)
function ChapterScreen({ chrome, ch, onPrologue }: { chrome: Chrome; ch: Chapter; onPrologue: () => void }) {
  const t = useT();
  const s = useSave();
  const c = s.career!;
  const rk = RANKS[c.rank];
  const [unread] = useState(() => (s.story?.inbox || []).filter((m) => !m.read).length);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.paper);
  const [sure, setSure] = useState(false);
  const [all, setAll] = useState(false);
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
  const latest = inbox[0];
  const brief: { from: string; text: string; fresh: boolean } = latest && unread
    ? { from: beatFrom(latest), text: t(beatKey(latest as Beat), latest.v), fresh: true }
    : { from: t('g.story.ch.' + ch.id + '.briefBy'), text: t('g.story.ch.' + ch.id + '.brief'), fresh: false };
  const rightPct = c.calls ? Math.round((100 * c.right) / c.calls) : 0;
  const clubs = Object.entries(c.relations).filter(([, r]) => r.v !== 0).sort((a, b) => b[1].v - a[1].v);
  const g = ch.goal;
  const beats = s.story?.beats || {};
  const leadAt = ch.i < 4 && !beats['reveal' + (ch.i + 1)] ? revealAt(c.rank, beats) : 0;
  const shown = all ? inbox.slice(0, 30) : inbox.slice(0, 6);
  const epi = ch.i >= EPILOGUE;

  return <div className="g-screen g-screen--wide sm sm--hub">
    <TopBar onHelp={() => chrome.go({ n: 'howto' })} onMenu={chrome.openSettings} />
    <div className="sm-cols">
      <div className="stagger sm-stack">
        {/* ---------- the hub: chapter, goal, the latest word, Play. Fits one phone screen. */}
        <section className="sm-head g-card" style={vi(0)}>
          <div className="sm-head__band">
            <span className="g-mono">{epi ? t('g.story.epilogue') : t('g.story.chapterOf', { n: ch.n })} · {t('career.ranks.' + c.rank)}</span>
            <span className="sm-head__paper">{paper}<button className="g-icbtn" style={{ width: 28, height: 28, marginInlineStart: 6, verticalAlign: 'middle' }} aria-label={t('g.story.rename')} onClick={() => { setName(c.paper); setEditing(!editing); }}><Icon n="pen" size={14} /></button></span>
          </div>
          {editing && <form className="sm-rename" style={{ padding: '10px 14px 0' }} onSubmit={(e) => { e.preventDefault(); saveName(); }}>
            <input value={name} maxLength={28} autoFocus placeholder={t('g.story.paperPh')} onChange={(e) => setName(e.target.value)} aria-label={t('g.story.paperPh')} />
            <GBtn kind="gold" size="sm" onClick={saveName} sound="ui.pop">{t('g.story.save')}{cost ? <> · <span className="g-coin" />{cost}</> : ''}</GBtn>
            <p className="sm-note" style={{ width: '100%' }}>{cost ? t('m.rename.cost', { n: cost, have: s.credits }) : t('m.rename.free', { n: RENAME_COST })}</p>
          </form>}
          <div className="sm-head__body">
            <div className="sm-head__row">
              <span className="sm-head__num g-num" aria-hidden="true">{epi ? <Icon n="star" size={36} /> : ch.n}</span>
              <div className="sm-head__t">
                <h1 className="g-h1">{bare(t('g.story.ch.' + ch.id + '.name'))}</h1>
                <p className="sm-premise">{t('g.story.ch.' + ch.id + '.premise')}</p>
              </div>
            </div>
            <div className="sm-goal">
              <span className="g-mono sm-goal__k"><Icon n="target" size={14} />{t('g.story.goal.k')}</span>
              {g && g.t1 == null && <>
                <b className="sm-goal__t">{t('g.story.goal.promo', { rank: t('career.ranks.' + (c.rank + 1)) })}</b>
                <div className="sm-goal__m">
                  <Meter label={t('g.story.goal.windows')} have={g.haveW} need={g.windows} />
                  <Meter label={t('g.story.goal.cred')} have={g.haveRep} need={g.rep} />
                </div>
              </>}
              {g && g.t1 != null && <>
                <b className="sm-goal__t">{t('g.story.goal.finale')}</b>
                <Meter label={t('g.story.goal.t1')} have={g.haveT1 || 0} need={g.t1} pips />
              </>}
              {!g && <><b className="sm-goal__t">{t('g.story.goal.done')}</b><span className="g-sub">{t('g.story.goal.doneSub')}</span></>}
              {leadAt > 0 && <span className="sm-goal__lead"><Icon n="eye" size={15} /><b>{t('g.story.goal.lead')}</b>{c.windows + 1 >= leadAt ? t('g.story.goal.leadNext') : t('g.story.goal.leadIn', { n: leadAt })}</span>}
              {c.rank >= VINCE_RANK && <span className="sm-goal__lead sm-goal__lead--vince"><Icon n="eye" size={15} /><b>{t('g.story.vince.chip')}</b>{t('g.story.vince.introD')}</span>}
            </div>
            {/* the latest word, or the chapter's brief */}
            <div className={'sm-note2' + (brief.fresh ? ' is-new' : '')}>
              <Face from={brief.from} sm />
              <p><b>{t('g.story.from.' + brief.from)}{brief.fresh && <span className="g-chip g-chip--red sm-brief__new">{t('g.story.inbox.unread')}</span>}</b>{brief.text}</p>
            </div>
            <GBtn kind="gold" size="lg" pulse={!c.live} shine sound="open" onClick={play} style={{ marginTop: 14 }}>
              <Icon n="phone" size={24} />{c.live ? t('g.story.resume') : t('g.story.play', { n: c.windows + 1 })}
            </GBtn>
            <p className="sm-head__line g-mono">{t('career.boardLine', { s: rk.sagas, c: rk.contacts, d: rk.dd })}</p>
          </div>
        </section>

        <CaseFile ch={ch} style={vi(1)} />

        {/* ---------- inbox */}
        <Drawer title={t('g.story.inbox.title')} aside={unread ? t('g.story.inbox.unread') + ' · ' + unread : t('g.story.inbox.aside')} hot={unread > 0} style={vi(2)} className="sm-inbox">
          {inbox.length ? shown.map((m, j) => { const f = beatFrom(m); return <div key={m.at + ':' + j} className={'sm-msg' + (j < unread ? ' is-new' : '') + (/^reveal\d$/.test(m.key) ? ' is-lead' : '')}>
            <Face from={f} sm />
            <span className="sm-msg__b"><b>{t('g.story.from.' + f)}{/^reveal\d$/.test(m.key) && <span className="g-chip g-chip--red sm-msg__tag"><Icon n="eye" />{t('g.story.caseFile.title')}</span>}</b><span>{t(beatKey(m as Beat), m.v)}</span></span>
            <span className="sm-msg__d g-mono">{fmtDate(m.at, t.lang, { day: 'numeric', month: 'short' })}</span>
          </div>; }) : <p className="sm-empty">{t('g.story.inbox.empty')}</p>}
          {inbox.length > 6 && !all && <button className="sm-link sm-link--desk" onClick={() => setAll(true)}>{t('common.more')}<Icon n="down" size={14} /></button>}
        </Drawer>
      </div>

      <div className="stagger sm-stack">
        <Drawer title={t('g.story.trail')} aside={epi ? t('g.story.epilogue') : t('g.story.chapterOf', { n: ch.n })} style={vi(3)}>
          <Trail at={ch.i} done={ch.done} bare />
        </Drawer>

        {/* ---------- the record: stats, favours, clubs, recent windows */}
        <Drawer title={t('g.story.stats.title')} aside={t('g.story.stats.cred') + ' ' + Math.round(c.rep) + ' · ' + fmtK(c.followers)} style={vi(4)}>
          <div className="sm-stats">
            <Stat icon="target" v={String(Math.round(c.rep))} k={t('g.story.stats.cred')} sub={t('g.story.goal.k') + ' ' + (g?.rep || 100)} />
            <Stat icon="check" v={rightPct + '%'} k={t('g.story.stats.right')} sub={t('g.story.stats.of', { n: c.calls })} />
            <Stat icon="bolt" v={String(c.exclusives)} k={t('g.story.stats.excl')} sub={t('g.story.stats.uturns', { n: c.uturns })} />
            <Stat icon="friends" v={fmtK(c.followers)} k={t('g.story.stats.followers')} sub={c.t1 ? c.t1 + ' × ' + t('tier.T1') : ''} />
          </div>
          <h3 className="sm-sub">{t('g.story.favours.title')}<span className="g-mono">{t('g.story.favours.aside', { n: totalFavours(c) })}</span></h3>
          <div className="sm-favs">
            {(['burner', 'tipoff', 'stakeout'] as const).map((k) => <div key={k} className={'sm-fav' + (c.favours[k] ? ' is-on' : '')}>
              <span className="sm-fav__ic"><Icon n={k === 'burner' ? 'phone' : k === 'tipoff' ? 'eye' : 'plane'} /><b className="g-badge">{c.favours[k]}</b></span>
              <b>{t('career.' + k)}</b><span>{t('career.' + k + 'D')}</span>
            </div>)}
          </div>
          <h3 className="sm-sub">{t('g.story.clubs.title')}<span className="g-mono">{t('career.clubsAside')}</span></h3>
          {clubs.length ? clubs.slice(0, 8).map(([id, r]) => { const cl = clubById(id); return <div key={id} className="sm-row">
            <Crest club={cl} size={28} />
            <span className="sm-row__b"><b>{cl ? cl.n : id}</b><span>{r.v >= 3 ? t('career.leak') : r.v <= -3 ? t('career.frozen') : t('career.neutral')}</span></span>
            <span className={'g-chip ' + (r.v >= 3 ? 'g-chip--done' : r.v > 0 ? 'g-chip--hijack' : 'g-chip--off')}>{num(r.v, true)}</span>
          </div>; }) : <p className="sm-empty">{t('career.clubsEmpty')}</p>}
          {c.history.length > 0 && <>
            <h3 className="sm-sub">{t('g.story.hist.title')}<span className="g-mono">{t('career.windows')} {c.windows}</span></h3>
            {c.history.slice(0, 6).map((h) => <div key={h.n + ':' + h.at} className="sm-row sm-hist">
              <span className="sm-hist__n g-num">{t('g.story.hist.w', { n: h.n })}</span>
              <span className={'g-stamp sm-hist__st g-stamp--' + (TIER_STAMP[h.tier] || '')}>{t('tier.' + h.tier)}</span>
              <span className="sm-hist__p g-num">{num(h.total, true)}</span>
              <span className="sm-hist__c g-mono">{t('g.story.hist.cred', { n: Math.round(h.repAfter) })}</span>
            </div>)}
          </>}
        </Drawer>

        {/* ---------- sources, by name */}
        <Drawer title={t('g.story.src.title')} aside={rk.src.map((k) => t('g.story.who.' + k).split(' ')[0]).join(', ')} style={vi(5)}>
          <div className="sm-srcs">
            {SRC.map((k) => {
              const open = rk.src.includes(k), tr = (c.contacts[k] || { trust: 0 }).trust, lv = trustLevel(tr);
              const need = RANKS.findIndex((r) => r.src.includes(k));
              const toNext = lv >= 5 ? 1 : (tr - (TRUST_LV[lv - 1] || 0)) / (TRUST_LV[lv] - (TRUST_LV[lv - 1] || 0));
              return <div key={k} className={'sm-src' + (open ? '' : ' is-locked')}>
                <div className="sm-src__top"><SrcIcon k={k} size={40} />{open ? <span className="sm-src__lv"><Rel n={Math.ceil((lv * 3) / 5)} /><b className="g-num">{t('career.level', { n: lv })}</b></span> : <Icon n="lock" size={18} className="sm-src__lock" />}</div>
                <b className="sm-src__n">{open ? t('g.story.who.' + k) : '?'}<span className="sm-src__role g-mono">{t('src.' + k)}</span></b>
                <span className="sm-src__d">{open ? (k === 'barber' ? t('career.barberFx', { p: Math.round(100 * Math.min(0.95, (RULES.SOURCES.barber.rel || 0.45) + 0.05 * lv)) }) : t('career.trustFx.' + lv)) : t('g.story.src.locked', { n: need + 1 })}</span>
                {open && <><span className="g-bar g-bar--sm" style={{ ['--bar' as string]: 'var(--gold)' }}><i style={{ width: Math.round(Math.max(0, Math.min(1, toNext)) * 100) + '%' }} /></span>
                  <span className="sm-src__next g-mono">{lv >= 5 ? t('career.trustMax') : t('career.trustNext', { n: TRUST_LV[lv] - tr, l: lv + 1 })}</span></>}
              </div>;
            })}
          </div>
        </Drawer>

        {/* ---------- the desk drawer: the prologue, save slots, starting over */}
        <Drawer title={t('g.story.desk.title')} aside={t('m.slots.title')} style={vi(6)}>
          <button className="sm-replay" onClick={onPrologue}>
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
        </Drawer>
      </div>
    </div>
  </div>;
}

/** A section that folds away on phones (open by default from 900px wide, where there's room for everything). */
const wide = () => typeof matchMedia !== 'undefined' && matchMedia('(min-width: 900px)').matches;
function Drawer({ title, aside, hot, style, className, children }: { title: string; aside?: string; hot?: boolean; style?: CSSProperties; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(wide);
  return <section className={'sm-box sm-drawer g-card g-card--desk' + (open ? ' is-open' : '') + (className ? ' ' + className : '')} style={style}>
    <button className="sm-drawer__h" aria-expanded={open} onClick={() => { sfx('ui.tap'); setOpen(!open); }}>
      <h2>{title}</h2>
      {aside && <span className={'g-mono sm-drawer__a' + (hot ? ' is-hot' : '')}>{aside}</span>}
      <Icon n="down" size={18} className="sm-drawer__ch" />
    </button>
    {open && <div className="sm-drawer__b">{children}</div>}
  </section>;
}

function Meter({ label, have, need, pips }: { label: string; have: number; need: number; pips?: boolean }) {
  const ok = have >= need, p = need ? Math.min(1, have / need) : 1;
  return <div className={'sm-meter' + (ok ? ' is-ok' : '')}>
    <span className="sm-meter__l">{ok && <Icon n="check" size={14} />}{label}</span>
    <span className="sm-meter__v g-num">{have}<small>/{need}</small></span>
    {pips ? <span className="sm-pips">{Array.from({ length: need }, (_, j) => <i key={j} className={j < have ? 'on' : ''}><Icon n="star" /></i>)}</span>
      : <span className="g-bar" style={{ ['--bar' as string]: ok ? 'var(--c-done)' : 'linear-gradient(90deg,#FFD35C,#F7B928)' }}><i style={{ width: Math.round(p * 100) + '%' }} /></span>}
  </div>;
}

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
