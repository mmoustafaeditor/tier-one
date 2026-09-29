// Story mode (HYBRID.md §7): the Career told as a comeback. A cover and a once-only prologue for new players, then the
// chapter screen (goal, trail, the editor's inbox, sources, clubs, favours, history) and a card for each new chapter.
// Replaces the old Career Desk on the Story tab; career rules and rank gates are unchanged (lib/career.ts).
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useT, num, fmtDate } from '../lib/i18n';
import { useSave, update } from '../lib/save';
import { RANKS, TRUST_LV, trustLevel, newCareer, totalFavours } from '../lib/career';
import { chapterFor, chapterNew, CHAPTERS, beatKey, type Chapter, type Beat } from '../lib/storyMode';
import { clubById, RULES, type WClub } from '../lib/engine';
import { randomSeed } from '../lib/driver';
import { useLeague } from '../lib/leagueData';
import { sfx, voice } from '../lib/sfx';
import { Icon, Kit, GBtn, TopBar, SrcIcon, Rel, confetti, shake, useTyped } from '../ui/game';
import { Crest } from '../ui/bits';
import type { Chrome } from '../App';

const SRC = ['kitman', 'barber', 'agent', 'spotter', 'physio'] as const;
const FROM_ICON: Record<string, string> = { editor: 'news', tabloid: 'bolt', itk: 'eye', insider: 'star' };
const TIER_STAMP: Record<string, string> = { T1: 'gold', T2: 'done', T3: 'done', T4: 'off', SPIKED: '' };
const fmtK = (n: number) => (n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n));
// "Ch. 2 · The Comeback" → "The Comeback" (the number is shown on its own).
const bare = (name: string) => { const k = name.indexOf(' · '); return k >= 0 ? name.slice(k + 3) : name; };
const vi = (i: number) => ({ ['--i' as string]: i });

export function StoryScreen(chrome: Chrome) {
  const s = useSave();
  const c = s.career;
  const [pro, setPro] = useState<null | 'start' | 'replay'>(null);
  const create = () => update((x) => {
    x.story = x.story || {}; x.story.prologue = true;
    if (!x.career) { x.career = newCareer(); x.story.chapterSeen = 0; }
  });
  const start = () => { if (!s.story?.prologue) setPro('start'); else { sfx('open'); create(); } };
  const done = () => { if (pro === 'start') create(); else update((x) => { x.story = x.story || {}; x.story.prologue = true; }); setPro(null); };
  const ch = c ? chapterFor(c) : null;
  const intro = !!(c && ch && !pro && (s.story?.chapterSeen ?? -1) < ch.i);

  return <>
    {c && ch ? <ChapterScreen chrome={chrome} ch={ch} onReplay={() => setPro('replay')} /> : <Cover chrome={chrome} onStart={start} onReplay={s.story?.prologue ? () => setPro('replay') : undefined} />}
    {pro && <Prologue onDone={done} />}
    {intro && ch && <ChapterIntro ch={ch} onGo={() => update((x) => { x.story = x.story || {}; x.story.chapterSeen = ch.i; })} />}
  </>;
}

// ---------------------------------------------------------------- cover (no career yet)
function Cover({ chrome, onStart, onReplay }: { chrome: Chrome; onStart: () => void; onReplay?: () => void }) {
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
          <GBtn kind="gold" size="lg" pulse shine sound={null} onClick={onStart} style={{ marginTop: 18 }}><Icon n="story" size={24} />{t('g.story.cover.start')}</GBtn>
          <p className="sm-book__meta g-mono">{t('g.story.cover.meta')}</p>
        </div>
      </section>
      <Trail at={-1} style={vi(1)} />
      {onReplay && <GBtn kind="ghost" size="sm" onClick={onReplay} style={vi(2)}><Icon n="uturn" size={18} />{t('g.story.cover.replay')}</GBtn>}
      <p className="sm-note" style={vi(3)}>{t('career.slotNote')}</p>
    </div>
  </div>;
}

// ---------------------------------------------------------------- the chapter trail
function Trail({ at, done, style }: { at: number; done?: boolean; style?: CSSProperties }) {
  const t = useT();
  return <section className="sm-trail g-card g-card--desk" style={style} aria-label={t('g.story.trail')}>
    <div className="g-sec" style={{ margin: '0 0 12px' }}><h2>{t('g.story.trail')}</h2><span className="g-mono">{at >= 0 ? t('g.story.chapterOf', { n: at + 1 }) : ''}</span></div>
    <ol>
      {CHAPTERS.map((id, k) => {
        const st = done || k < at ? 'done' : k === at ? 'now' : 'locked';
        return <li key={id} className={'is-' + st}>
          <span className="sm-trail__dot">{st === 'done' ? <Icon n="check" /> : st === 'locked' ? <Icon n="lock" /> : <b>{k + 1}</b>}</span>
          <span className="sm-trail__n">{bare(t('g.story.ch.' + id + '.name'))}</span>
        </li>;
      })}
    </ol>
  </section>;
}

// ---------------------------------------------------------------- prologue (full screen, once, skippable)
const FAKE: WClub[] = [['#C8102E', '#FFFFFF'], ['#1B458F', '#FFFFFF'], ['#FDB913', '#231F20'], ['#034694', '#DBA111'], ['#6CABDD', '#1C2C5B'], ['#EF0107', '#063672'], ['#241F20', '#FFFFFF']]
  .map(([c1, c2], k) => ({ id: 'pro' + k * 7, n: '', s: '', k: '', l: '', c1, c2 }));
const RIGHT_CLIP = 5;
const PANEL_MS = [4400, 4400, 4800, 0, 0];

function Prologue({ onDone }: { onDone: () => void }) {
  const t = useT();
  const reduced = useSave().reduced;
  const [k, setK] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const next = () => setK((x) => Math.min(4, x + 1));
  useEffect(() => { const b = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = b; }; }, []);
  // Sound and motion per panel. Timers are cleared when the panel changes (skip, tap).
  useEffect(() => {
    const ids: number[] = []; const at = (ms: number, f: () => void) => ids.push(window.setTimeout(f, ms));
    if (k === 0) { [0, 1000, 2000, 3000].forEach((ms) => at(ms, () => sfx('dd.tick'))); at(900, () => sfx('typewriter')); }
    if (k === 1) { sfx('phone.ring'); [500, 1050, 1600, 2150, 2700].forEach((ms, j) => at(ms, () => { sfx(j === 2 ? 'bad' : 'ui.pop'); if (j === 2) shake(stage.current); })); }
    if (k === 2) {
      for (let j = 0; j < 7; j++) at(350 + j * 380, () => { if (j === RIGHT_CLIP) sfx('stamp.done'); else { sfx('stamp.wrong'); if (j % 2 === 0) shake(stage.current); } });
      at(350 + 7 * 380 + 200, () => sfx('sad'));
    }
    if (k === 3) { at(250, () => voice('editor', 2.4)); at(500, () => sfx('typewriter')); }
    if (k === 4) sfx('open');
    if (!reduced) {
      const ms = k === 3 ? Math.round((t('g.story.pro.note').length / 30) * 1000) + 2600 : PANEL_MS[k];
      if (ms) at(ms, next);
    }
    return () => ids.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);

  return <div className={'sm-pro' + (reduced ? ' is-static' : '')} role="dialog" aria-modal="true" aria-label={t('g.story.k')}>
    <div className="sm-pro__top">
      <span className="sm-pro__dots" aria-hidden="true">{[0, 1, 2, 3, 4].map((j) => <i key={j} className={j < k ? 'done' : j === k ? 'on' : ''} />)}</span>
      <button className="sm-pro__skip" onClick={() => { sfx('ui.tap'); onDone(); }}>{t('g.story.pro.skip')}<Icon n={t.rtl ? 'back' : 'arrow'} size={16} /></button>
    </div>
    <div ref={stage} className="sm-pro__stage" onClick={() => { if (k < 4) { sfx('ui.tap'); next(); } }}>
      <div key={k} className={'sm-pro__panel sm-p' + k}>
        {k === 0 && <PanelClock />}
        {k === 1 && <PanelPhone />}
        {k === 2 && <PanelClips />}
        {k === 3 && <PanelNote />}
        {k === 4 && <PanelChapter onBegin={onDone} />}
      </div>
    </div>
    {k < 4 && <div className="sm-pro__foot"><button className="sm-pro__next" onClick={() => { sfx('ui.tap'); next(); }}>{t('g.story.pro.next')}<Icon n={t.rtl ? 'back' : 'arrow'} size={18} /></button></div>}
  </div>;
}

function PanelClock() {
  const t = useT();
  const hwg = useTyped(t('g.story.pro.hwg'), 9);
  return <>
    <div className="sm-clock" aria-hidden="true"><i className="h" /><i className="m" /><b /></div>
    <span className="sm-pro__cap g-mono">{t('g.story.pro.clock')}</span>
    <article className="sm-paper g-card">
      <header><span className="sm-paper__mast">{t('g.story.pro.paper')}</span><span className="g-chip g-chip--red">{t('g.story.pro.excl')}</span></header>
      <h2 className="sm-paper__hwg">{hwg}<span className="caret" /></h2>
      <p>{t('g.story.pro.dek')}</p>
      <div className="sm-paper__cols g-halftone" aria-hidden="true"><i /><i /><i /><i /></div>
    </article>
  </>;
}

function PanelPhone() {
  const t = useT();
  const ns = t.list('g.story.pro.n') as string[];
  return <div className="sm-phone">
    <div className="sm-phone__notch" />
    <div className="sm-phone__time g-num">00:01</div>
    <div className="sm-phone__list">
      {ns.map((n, j) => <div key={j} className={'sm-notif' + (j === 2 ? ' is-bad' : '')} style={{ animationDelay: 500 + j * 550 + 'ms' }}>
        <span className="sm-notif__ic"><Icon n={j === 3 ? 'bolt' : j === 2 ? 'friends' : j === 4 ? 'news' : 'phone'} /></span>
        <span className="sm-notif__t">{n}</span><span className="sm-notif__w g-mono">{t('g.story.pro.now')}</span>
      </div>)}
    </div>
  </div>;
}

function PanelClips() {
  const t = useT();
  const clips = t.list('g.story.pro.clips') as string[];
  return <>
    <div className="sm-clips">
      {clips.map((h, j) => <div key={j} className="sm-clips__c" style={{ ['--r' as string]: [-4, 3, -2, 5, -5, 2, -3][j] + 'deg' }}>
        <span className="sm-clips__h"><Kit club={FAKE[j]} player={{ id: '', n: '', s: '', c: '', pos: '', no: [9, 7, 10, 11, 8, 4, 17][j], nat: '', age: 0, star: 0 }} size={30} /><b>{h}</b></span>
        <span className="ln" /><span className="ln" /><span className="ln short" />
        <span className={'g-stamp sm-clips__st' + (j === RIGHT_CLIP ? ' g-stamp--done' : '')} style={{ animationDelay: 350 + j * 380 + 'ms', ['--rot' as string]: (j % 2 ? 9 : -11) + 'deg' }}>{j === RIGHT_CLIP ? t('g.story.pro.right') : t('g.story.pro.wrong')}</span>
      </div>)}
    </div>
    <div className="sm-tally" style={{ animationDelay: 350 + 7 * 380 + 'ms' }}><b className="g-num">6/7</b><span><strong>{t('g.story.pro.tally')}</strong><em>{t('g.story.pro.tallySub')}</em></span></div>
  </>;
}

function PanelNote() {
  const t = useT();
  const note = useTyped(t('g.story.pro.note'), 30);
  const full = note.length >= t('g.story.pro.note').length;
  return <div className="sm-memo">
    <span className="sm-memo__tape" aria-hidden="true" />
    <span className="g-mono sm-memo__k">{t('g.story.pro.memo')}</span>
    <p className="sm-memo__t">{note}{!full && <span className="caret" />}</p>
    <p className={'sm-memo__sign' + (full ? ' is-on' : '')}>{t('g.story.pro.sign')}</p>
    {full && <span className="g-stamp is-slam sm-memo__st">{t('g.story.pro.wrong')}</span>}
  </div>;
}

function PanelChapter({ onBegin }: { onBegin: () => void }) {
  const t = useT();
  return <div className="sm-chcard g-card">
    <span className="sm-chcard__num g-num">1</span>
    <span className="g-mono sm-chcard__k">{t('g.story.chapterOf', { n: 1 })}</span>
    <h2 className="g-h1">{bare(t('g.story.ch.blog.name'))}</h2>
    <p className="sm-premise">{t('g.story.ch.blog.premise')}</p>
    <GBtn kind="gold" size="lg" shine pulse sound="open" onClick={onBegin} style={{ marginTop: 18 }}><Icon n="story" size={22} />{t('g.story.pro.begin')}</GBtn>
  </div>;
}

// ---------------------------------------------------------------- chapter intro card (once per chapter)
function ChapterIntro({ ch, onGo }: { ch: Chapter; onGo: () => void }) {
  const t = useT();
  const fresh = chapterNew(ch.i);
  const finale = ch.id === 'front';
  useEffect(() => {
    sfx(finale ? 'fanfare' : 'unlock');
    if (finale) confetti(['#F7B928', '#FFD35C', '#FF5A36', '#F4EFE4']);
    const b = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = b; };
  }, [finale]);
  return <div className="g-overlay sm-introwrap" role="dialog" aria-modal="true" aria-label={t('g.story.ch.' + ch.id + '.name')}>
    <div className="sm-intro g-card">
      <div className="sm-intro__band"><span className="g-mono">{t('g.story.intro.k')}</span><span className="g-mono">{t('g.story.chapterOf', { n: ch.n })}</span></div>
      <div className="sm-intro__body">
        <span className="sm-intro__num g-num">{ch.n}</span>
        <h2 className="g-h1">{bare(t('g.story.ch.' + ch.id + '.name'))}</h2>
        <p className="sm-premise">{t('g.story.ch.' + ch.id + '.premise')}</p>
        <blockquote className="sm-intro__q"><Icon n="news" size={18} /><span>{t('g.story.ch.' + ch.id + '.intro')}<em>{t('g.story.pro.sign')}</em></span></blockquote>
        {!finale && <>
          <h3 className="g-mono sm-intro__h">{t('g.story.intro.new')}</h3>
          <div className="sm-intro__new">
            {fresh.src.map((k) => <span key={k} className="sm-new"><SrcIcon k={k} size={30} /><span><em className="g-mono">{t('g.story.intro.srcNew')}</em>{t('src.' + k)}</span></span>)}
            {fresh.rivals.map((k) => <span key={k} className="sm-new"><span className={'sm-av sm-av--' + k}><Icon n={FROM_ICON[k]} /></span><span><em className="g-mono">{t('g.story.intro.rivalsNew')}</em>{t('rival.' + k)}</span></span>)}
            {!fresh.src.length && !fresh.rivals.length && <p className="sm-note">{ch.i <= RANKS.length - 1 ? t('career.unl.' + ch.i) : t('g.story.intro.nothing')}</p>}
          </div>
          {(fresh.src.length > 0 || fresh.rivals.length > 0) && <p className="sm-intro__unl">{t('career.unl.' + Math.min(ch.i, RANKS.length - 1))}</p>}
        </>}
        <GBtn kind="gold" size="lg" shine sound="open" onClick={onGo} style={{ marginTop: 16 }}>{finale ? t('g.story.intro.finaleGo') : t('g.story.intro.go')}<Icon n={t.rtl ? 'back' : 'arrow'} size={22} /></GBtn>
      </div>
    </div>
  </div>;
}

// ---------------------------------------------------------------- the chapter screen (career exists)
function ChapterScreen({ chrome, ch, onReplay }: { chrome: Chrome; ch: Chapter; onReplay: () => void }) {
  const t = useT();
  const s = useSave();
  const c = s.career!;
  const rk = RANKS[c.rank];
  const [unread] = useState(() => (s.story?.inbox || []).filter((m) => !m.read).length);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.paper);
  const [sure, setSure] = useState(false);
  useEffect(() => { if (unread) update((x) => { x.story?.inbox?.forEach((m) => { m.read = true; }); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveName = () => { const v = name.trim().slice(0, 28); update((x) => { if (x.career) x.career.paper = v; }); setEditing(false); };
  const play = () => {
    update((x) => { if (x.career && !x.career.live) x.career.live = { seed: 'car-' + randomSeed(), mode: 'career', log: [], started: Date.now() }; });
    chrome.go({ n: 'play', mode: 'career', key: Date.now() });
  };
  const paper = c.paper || t('g.story.paperDefault', { n: s.nick || t('common.you') });
  const inbox = [...(s.story?.inbox || [])].reverse();
  const latest = inbox[0];
  const brief: { from: string; text: string; fresh: boolean } = latest && unread
    ? { from: latest.from, text: t(beatKey(latest as Beat), latest.v), fresh: true }
    : { from: 'editor', text: t('g.story.ch.' + ch.id + '.brief'), fresh: false };
  const rightPct = c.calls ? Math.round((100 * c.right) / c.calls) : 0;
  const clubs = Object.entries(c.relations).filter(([, r]) => r.v !== 0).sort((a, b) => b[1].v - a[1].v);
  const g = ch.goal;

  return <div className="g-screen g-screen--wide sm">
    <TopBar onHelp={() => chrome.go({ n: 'howto' })} onMenu={chrome.openSettings} />
    <div className="sm-cols">
      <div className="stagger sm-stack">
        {/* ---------- chapter header */}
        <section className="sm-head g-card" style={vi(0)}>
          <div className="sm-head__band">
            <span className="g-mono">{t('g.story.chapterOf', { n: ch.n })}</span>
            <span className="sm-head__paper">{paper}</span>
          </div>
          <div className="sm-head__body">
            <div className="sm-head__row">
              <span className="sm-head__num g-num" aria-hidden="true">{ch.n}</span>
              <div className="sm-head__t">
                <h1 className="g-h1">{bare(t('g.story.ch.' + ch.id + '.name'))}</h1>
                <p className="sm-premise">{t('g.story.ch.' + ch.id + '.premise')}</p>
              </div>
            </div>
            <div className="sm-goal">
              <span className="g-mono sm-goal__k"><Icon n="target" size={14} />{t('g.story.goal.k')}</span>
              {g && g.t1 == null && <>
                <b className="sm-goal__t">{t('g.story.goal.promo', { rank: t('career.ranks.' + (c.rank + 1)) })}</b>
                <Meter label={t('g.story.goal.windows')} have={g.haveW} need={g.windows} />
                <Meter label={t('g.story.goal.cred')} have={g.haveRep} need={g.rep} />
              </>}
              {g && g.t1 != null && <>
                <b className="sm-goal__t">{t('g.story.goal.finale')}</b>
                <Meter label={t('g.story.goal.t1')} have={g.haveT1 || 0} need={g.t1} pips />
              </>}
              {!g && <><b className="sm-goal__t">{t('g.story.goal.done')}</b><span className="g-sub">{t('g.story.goal.doneSub')}</span></>}
            </div>
            <GBtn kind="gold" size="lg" pulse={!c.live} shine sound="open" onClick={play} style={{ marginTop: 16 }}>
              <Icon n="phone" size={24} />{c.live ? t('g.story.resume') : t('g.story.play', { n: c.windows + 1 })}
            </GBtn>
            <p className="sm-head__line g-mono">{t('career.boardLine', { s: rk.sagas, c: rk.contacts, d: rk.dd })}</p>
          </div>
        </section>

        {/* ---------- the editor, before the window */}
        <div className={'sm-brief' + (brief.fresh ? ' is-new' : '')} style={vi(1)}>
          <span className={'sm-av sm-av--' + brief.from}><Icon n={FROM_ICON[brief.from] || 'news'} /></span>
          <div className="g-coach g-coach--editor">
            <b>{t('g.story.from.' + brief.from)}{brief.fresh && <span className="g-chip g-chip--red sm-brief__new">{t('g.story.inbox.unread')}</span>}</b>
            <p>{brief.text}</p>
          </div>
        </div>

        <Trail at={ch.i} done={ch.done} style={vi(2)} />

        {/* ---------- inbox */}
        <section className="sm-box g-card g-card--desk" style={vi(3)}>
          <div className="g-sec" style={{ margin: '0 0 6px' }}><h2>{t('g.story.inbox.title')}</h2><span className="g-mono">{t('g.story.inbox.aside')}</span></div>
          {inbox.length ? inbox.slice(0, 8).map((m, j) => <div key={m.at + ':' + j} className={'sm-msg' + (j < unread ? ' is-new' : '')}>
            <span className={'sm-av sm-av--sm sm-av--' + m.from}><Icon n={FROM_ICON[m.from] || 'news'} /></span>
            <span className="sm-msg__b"><b>{t('g.story.from.' + m.from)}</b><span>{t(beatKey(m as Beat), m.v)}</span></span>
            <span className="sm-msg__d g-mono">{fmtDate(m.at, t.lang, { day: 'numeric', month: 'short' })}</span>
          </div>) : <p className="sm-empty">{t('g.story.inbox.empty')}</p>}
        </section>
      </div>

      <div className="stagger sm-stack">
        {/* ---------- stats */}
        <div className="sm-stats" style={vi(4)}>
          <Stat icon="target" v={String(Math.round(c.rep))} k={t('g.story.stats.cred')} sub={t('g.story.goal.k') + ' ' + (g?.rep || 100)} />
          <Stat icon="check" v={rightPct + '%'} k={t('g.story.stats.right')} sub={t('g.story.stats.of', { n: c.calls })} />
          <Stat icon="bolt" v={String(c.exclusives)} k={t('g.story.stats.excl')} sub={t('g.story.stats.uturns', { n: c.uturns })} />
          <Stat icon="friends" v={fmtK(c.followers)} k={t('g.story.stats.followers')} sub={c.t1 ? c.t1 + ' × ' + t('tier.T1') : ''} />
        </div>

        {/* ---------- sources */}
        <section className="sm-box g-card g-card--desk" style={vi(5)}>
          <div className="g-sec" style={{ margin: '0 0 10px' }}><h2>{t('g.story.src.title')}</h2><span className="g-mono">{t('g.story.src.aside')}</span></div>
          <div className="sm-srcs">
            {SRC.map((k) => {
              const open = rk.src.includes(k), tr = (c.contacts[k] || { trust: 0 }).trust, lv = trustLevel(tr);
              const need = RANKS.findIndex((r) => r.src.includes(k));
              const toNext = lv >= 5 ? 1 : (tr - (TRUST_LV[lv - 1] || 0)) / (TRUST_LV[lv] - (TRUST_LV[lv - 1] || 0));
              return <div key={k} className={'sm-src' + (open ? '' : ' is-locked')}>
                <div className="sm-src__top"><SrcIcon k={k} size={40} />{open ? <span className="sm-src__lv"><Rel n={Math.ceil((lv * 3) / 5)} /><b className="g-num">{t('career.level', { n: lv })}</b></span> : <Icon n="lock" size={18} className="sm-src__lock" />}</div>
                <b className="sm-src__n">{t('src.' + k)}</b>
                <span className="sm-src__d">{open ? (k === 'barber' ? t('career.barberFx', { p: Math.round(100 * Math.min(0.95, (RULES.SOURCES.barber.rel || 0.45) + 0.05 * lv)) }) : t('career.trustFx.' + lv)) : t('g.story.src.locked', { n: need + 1 })}</span>
                {open && <><span className="g-bar g-bar--sm" style={{ ['--bar' as string]: 'var(--gold)' }}><i style={{ width: Math.round(Math.max(0, Math.min(1, toNext)) * 100) + '%' }} /></span>
                  <span className="sm-src__next g-mono">{lv >= 5 ? t('career.trustMax') : t('career.trustNext', { n: TRUST_LV[lv] - tr, l: lv + 1 })}</span></>}
              </div>;
            })}
          </div>
        </section>

        {/* ---------- favours */}
        <section className="sm-box g-card g-card--desk" style={vi(6)}>
          <div className="g-sec" style={{ margin: '0 0 10px' }}><h2>{t('g.story.favours.title')}</h2><span className="g-mono">{t('g.story.favours.aside', { n: totalFavours(c) })}</span></div>
          <div className="sm-favs">
            {(['burner', 'tipoff', 'stakeout'] as const).map((k) => <div key={k} className={'sm-fav' + (c.favours[k] ? ' is-on' : '')}>
              <span className="sm-fav__ic"><Icon n={k === 'burner' ? 'phone' : k === 'tipoff' ? 'eye' : 'plane'} /><b className="g-badge">{c.favours[k]}</b></span>
              <b>{t('career.' + k)}</b><span>{t('career.' + k + 'D')}</span>
            </div>)}
          </div>
        </section>

        {/* ---------- clubs */}
        <section className="sm-box g-card g-card--desk" style={vi(7)}>
          <div className="g-sec" style={{ margin: '0 0 6px' }}><h2>{t('g.story.clubs.title')}</h2><span className="g-mono">{t('career.clubsAside')}</span></div>
          {clubs.length ? clubs.slice(0, 8).map(([id, r]) => { const cl = clubById(id); return <div key={id} className="sm-row">
            <Crest club={cl} size={28} />
            <span className="sm-row__b"><b>{cl ? cl.n : id}</b><span>{r.v >= 3 ? t('career.leak') : r.v <= -3 ? t('career.frozen') : t('career.neutral')}</span></span>
            <span className={'g-chip ' + (r.v >= 3 ? 'g-chip--done' : r.v > 0 ? 'g-chip--hijack' : 'g-chip--off')}>{num(r.v, true)}</span>
          </div>; }) : <p className="sm-empty">{t('career.clubsEmpty')}</p>}
        </section>

        {/* ---------- history */}
        {c.history.length > 0 && <section className="sm-box g-card g-card--desk" style={vi(8)}>
          <div className="g-sec" style={{ margin: '0 0 6px' }}><h2>{t('g.story.hist.title')}</h2><span className="g-mono">{t('career.windows')} {c.windows}</span></div>
          {c.history.slice(0, 6).map((h) => <div key={h.n + ':' + h.at} className="sm-row sm-hist">
            <span className="sm-hist__n g-num">{t('g.story.hist.w', { n: h.n })}</span>
            <span className={'g-stamp sm-hist__st g-stamp--' + (TIER_STAMP[h.tier] || '')}>{t('tier.' + h.tier)}</span>
            <span className="sm-hist__p g-num">{num(h.total, true)}</span>
            <span className="sm-hist__c g-mono">{t('g.story.hist.cred', { n: Math.round(h.repAfter) })}</span>
          </div>)}
        </section>}

        <League style={vi(9)} />

        {/* ---------- the paper: rename, replay, restart */}
        <section className="sm-box g-card g-card--desk sm-acts" style={vi(10)}>
          {editing ? <form className="sm-rename" onSubmit={(e) => { e.preventDefault(); saveName(); }}>
            <input value={name} maxLength={28} autoFocus placeholder={t('g.story.paperPh')} onChange={(e) => setName(e.target.value)} aria-label={t('g.story.paperPh')} />
            <GBtn kind="gold" size="sm" onClick={saveName} sound="ui.pop">{t('g.story.save')}</GBtn>
          </form> : <GBtn kind="dark" size="sm" onClick={() => { setName(c.paper); setEditing(true); }}><Icon n="news" size={18} /><span>{t('g.story.rename')} · {paper}</span></GBtn>}
          <GBtn kind="dark" size="sm" onClick={onReplay}><Icon n="uturn" size={18} />{t('g.story.cover.replay')}</GBtn>
          {c.rank >= RANKS.length - 1 && (sure
            ? <div className="sm-sure"><p>{t('g.story.restart.sure')}</p>
              <div className="sm-sure__b"><GBtn size="sm" onClick={() => { update((x) => { x.career = newCareer(1, (x.career?.restarts || 0) + 1); x.story = { ...(x.story || {}), chapterSeen: -1 }; }); setSure(false); }}>{t('g.story.restart.yes')}</GBtn>
                <GBtn kind="ghost" size="sm" onClick={() => setSure(false)}>{t('g.story.restart.no')}</GBtn></div></div>
            : <GBtn kind="ghost" size="sm" onClick={() => setSure(true)}><Icon n="briefcase" size={18} />{t('g.story.restart.go')}</GBtn>)}
          {c.rank >= RANKS.length - 1 && !sure && <p className="sm-note">{t('career.rivalD')}</p>}
        </section>
      </div>
    </div>
  </div>;
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

function League({ style }: { style?: CSSProperties }) {
  const t = useT();
  const lg = useLeague();
  if (!lg || !lg.rows.length) return null;
  return <section className="sm-box g-card g-card--desk" style={style}>
    <div className="g-sec" style={{ margin: '0 0 6px' }}><h2>{t('league.title')}</h2><span className="g-mono">{t('league.divs.' + lg.div)}</span></div>
    {lg.rows.slice(0, 8).map((r, k) => <div key={k} className={'sm-row sm-lg' + (r.me ? ' is-me' : '') + (lg.up && k < lg.up ? ' is-up' : '')}>
      <span className="sm-lg__r g-num">{k + 1}</span><span className="sm-row__b"><b>{r.me ? t('common.you') : r.nick}</b></span><span className="sm-lg__p g-num">{Math.round(r.pts)}</span>
    </div>)}
    <p className="sm-note" style={{ marginTop: 8 }}>{t('league.note')}</p>
  </section>;
}

