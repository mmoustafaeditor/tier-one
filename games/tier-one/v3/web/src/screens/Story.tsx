// The Story app (CONCEPT4 §16, §10): "The Comeback", told as one DM thread. The people in the story talk; the chapter's
// goal is pinned at the top; the chapter's boss has a stats card; the next window is one big button at the bottom, with
// the two Career extras beside it. No films and no narration boxes: every beat is a message, and the motion is the
// phone's own (typing dots, a message sliding in, a card lifting, a stamp landing, numbers rolling).
//
// The model is lib/storyMode.ts (chapters, bosses, nextCareerWindow, extras, the settle). The window itself is the play
// lane's: this screen opens { n: 'play', mode: 'career' }, which builds its Driver4 from nextCareerWindow(save).
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useT, num } from '../lib/i18n';
import { useSave, getSave } from '../lib/save';
import { castFor, type Boss4 } from '../lib/engine';
import {
  nextCareerWindow, goalOf, story4Of, finishPrologue, ensureStory4, catchUpStory, buyExtra, sendEpilogue, restartStory,
  chapterDef, bossView, bossPerson, beatKey, BOSS, type Msg, type Person, type CareerWindow4, type Tip4, type BossView, type Goal4,
} from '../lib/storyMode';
import { Banter } from '../lib/banter';
import { outWord4 } from '../lib/story';
import { catchphraseOf } from '../lib/catchphrase';
import { bylineOf } from '../lib/byline';
import { update } from '../lib/save';
import { sfx } from '../lib/sfx';
import { prefersReducedMotion } from '../lib/motion';
import { toast } from '../lib/meta';
import { Icon } from '../ui/game';
import { Pop, Typing, Ratio, Stamp, Ticker, Sheet, SheetHead } from '../ui/juice';
import type { Chrome } from '../App';

// ---------------------------------------------------------------- the people (typographic avatars, no faces)
const FACE: Record<string, { i: string; c: string; ink?: string }> = {
  mags: { i: 'MD', c: '#E8B04A', ink: '#1C1305' }, rosa: { i: 'RL', c: '#3FA7A0' }, hana: { i: 'HO', c: '#6E8EF0' }, tony: { i: 'TT', c: '#F08A4B', ink: '#1E0E02' },
  priya: { i: 'P', c: '#9DBF4F', ink: '#141B04' }, vince: { i: 'VM', c: '#1A1A1A', ink: '#F3F1EC' }, carl: { i: 'CS', c: '#B51B2C' }, unknown: { i: '?', c: '#4A4C52' },
  you: { i: '', c: '#D9486F' }, bants: { i: 'B', c: '#FF4D2E' }, kev: { i: 'K', c: '#1DB46A' }, pete: { i: 'P', c: '#3B82F6' },
  sal: { i: 'S', c: '#8A6A4F' }, dougie: { i: 'D', c: '#5E7D8C' }, ines: { i: 'I', c: '#3E9C7A' }, sys: { i: '', c: 'transparent' },
};
// 3.x inbox senders, read as the people they are.
const LEGACY: Record<string, Person> = { editor: 'mags', desk: 'mags', tabloid: 'bants', itk: 'kev', insider: 'pete', agent: 'rosa', spotter: 'tony', kitman: 'dougie', barber: 'sal', physio: 'ines' };
const personOf = (from: string): string => LEGACY[from] || from;
function Face({ who, size = 36 }: { who: string; size?: number }) {
  const f = FACE[who] || FACE.unknown;
  const ini = who === 'you' ? (getSave().nick || '·').replace(/^@/, '').slice(0, 1).toUpperCase() : f.i;
  return <span className={'st-face st-face--' + who} style={{ ['--fc' as string]: f.c, ['--fi' as string]: f.ink || '#fff', width: size, height: size, fontSize: Math.round(size * (ini.length > 1 ? 0.36 : 0.46)) } as CSSProperties} aria-hidden="true">{ini}</span>;
}
const fmtK = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1000 ? (n / 1000).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n));
const pct = (x: number) => Math.round(x * 100) + '%';

export function StoryScreen(chrome: Chrome) {
  const s = useSave();
  const [replay, setReplay] = useState(false);
  // A window that ended elsewhere reaches the story; a 3.x career gets its Story 4 state.
  useEffect(() => { catchUpStory(); ensureStory4(); }, []);
  if (!s.career || !s.story?.prologue) return <Prologue onDone={finishPrologue} />;
  if (replay) return <Prologue replay onDone={() => setReplay(false)} />;
  return <Thread chrome={chrome} onPrologue={() => setReplay(true)} />;
}

// ---------------------------------------------------------------- the prologue: the fall, played on the phone
function Prologue({ replay, onDone }: { replay?: boolean; onDone: () => void }) {
  const t = useT();
  const reduced = prefersReducedMotion();
  const cast = useMemo(() => castFor('the-fall', { n: 1, pool: 'stars' })[0], []);
  const v = { p: cast.player.s, to: cast.to.s, from: cast.from.s };
  // 0 Mags typing · 1 Mags · 2 Vince typing · 3 Vince + the draft · 4 dropped · 5 replies · 6 the count · 7 Mags · 8 the box · 9 unknown · 10 done
  const [step, setStep] = useState(reduced ? 3 : 0);
  const [followers, setFollowers] = useState(38400);
  useEffect(() => {
    const at: Record<number, number> = { 0: 900, 1: 700, 2: 1300, 4: 900, 5: 1500, 6: 1600, 7: 1300, 8: 1500, 9: 900 };
    if (step === 3 || step >= 10) return;
    const ms = reduced ? 0 : at[step] ?? 900;
    const id = window.setTimeout(() => {
      const n = step + 1;
      if (n === 1 || n === 3 || n === 7 || n === 9) sfx('dm.in');
      if (n === 6) setFollowers(200);
      if (n === 8) sfx('lamp.off');
      setStep(n);
    }, ms);
    return () => clearTimeout(id);
  }, [step, reduced]);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end', behavior: reduced ? 'auto' : 'smooth' }); }, [step, reduced]);
  const drop = () => { sfx('drop'); setStep(4); };
  return <div className="g-screen st st--pro" role="region" aria-label={t('st4.pro.k')}>
    <header className="st-head st-head--pro">
      <Face who="mags" size={40} />
      <span className="st-head__who"><b>{t('st4.who.mags')}</b><small>{t('st4.pro.time')}</small></span>
      <Pop className="st-iconbtn st-skip" onTap={onDone} label={t('st4.pro.skip')}>{t('st4.pro.skip')}</Pop>
    </header>
    <div className="st-feed">
      {step === 0 && <Typing name={t('st4.who.mags')} />}
      {step >= 1 && <Bubble who="mags" text={t('st4.pro.mags')} />}
      {step === 2 && <Typing name={t('st4.who.vince')} />}
      {step >= 3 && <Bubble who="vince" text={t('st4.pro.vince', v)} />}
      {step === 3 && <div className="st-draft">
        <div className="st-post st-post--draft">
          <span className="st-post__by"><Face who="you" size={28} /><b>{s0().nick || t('st4.who.you')}</b><em>{t('st4.pro.dropHint')}</em></span>
          <p dir="auto">{t('st4.pro.draft', v)}</p>
        </div>
        <Pop className="st-go st-go--drop" sound={null} onTap={drop}>{t('st4.pro.drop')}</Pop>
      </div>}
      {step >= 4 && <div className={'st-post st-post--live' + (step >= 5 ? ' is-ratioed' : '')}>
        <span className="st-post__by"><Face who="you" size={28} /><b>{s0().nick || t('st4.who.you')}</b><em>{t('st4.pro.posted')}</em></span>
        <p dir="auto">{t('st4.pro.draft', v)}</p>
        {step >= 5 && <div className="st-post__ratio"><Ratio n={4812} label={t('st4.pro.ratio')} /></div>}
        {step >= 5 && <ul className="st-replies">
          <li style={dl(0)}><b>@{cast.from.s.replace(/\s+/g, '')}Fans</b> {t('st4.pro.r1', v)}</li>
          <li style={dl(1)}><b>@BackPageBants</b> {t('st4.pro.r2')}</li>
          <li style={dl(2)}><b>@PressBoxPete</b> {t('st4.pro.r3')}</li>
        </ul>}
      </div>}
      {step >= 5 && <div className="st-fall"><Ticker n={followers} label={t('st4.pro.lost')} tone="bad" /></div>}
      {step >= 7 && <Bubble who="mags" text={t('st4.pro.mags2', v)} />}
      {step >= 8 && <p className="st-sys">{t('st4.pro.box')}</p>}
      {step >= 9 && <Bubble who="unknown" text={t('st4.pro.unknown')} name={t('st4.who.unknown')} />}
      {step >= 10 && <div className="st-dock st-dock--inline">
        {!replay && <p className="st-dock__sub">{t('st4.pro.startSub')}</p>}
        <Pop className="st-go" sound="open" onTap={onDone}>{replay ? t('common.close') : t('st4.pro.start')}</Pop>
      </div>}
      <div ref={end} />
    </div>
  </div>;
}
const s0 = () => getSave();
const dl = (k: number): CSSProperties => ({ animationDelay: k * 420 + 'ms' });

// ---------------------------------------------------------------- one chat bubble
function Bubble({ who, text, name, children, cls = '', style }: { who: string; text?: string; name?: string; children?: ReactNode; cls?: string; style?: CSSProperties }) {
  const mine = who === 'you';
  return <div className={'st-msg' + (mine ? ' st-msg--me' : '') + ' ' + cls} style={style}>
    {!mine && <Face who={who} size={32} />}
    <div className="st-msg__b">
      {name && <span className="st-msg__n">{name}</span>}
      {text != null && <p dir="auto">{text}</p>}
      {children}
    </div>
  </div>;
}

// ---------------------------------------------------------------- the thread
function Thread({ chrome, onPrologue }: { chrome: Chrome; onPrologue: () => void }) {
  const t = useT();
  const s = useSave();
  const c4 = story4Of(s);
  const goal = goalOf(s);
  const w = useMemo(() => nextCareerWindow(s), [s]);
  const inbox = (s.story?.inbox || []) as Msg[];
  // New messages arrive one by one (typing, then the bubble); everything already read is just there.
  const [fresh0] = useState(() => inbox.filter((m) => !m.read).length);
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? inbox.length : inbox.length - fresh0));
  const [typing, setTyping] = useState(false);
  useEffect(() => { if (fresh0) update((x) => { x.story?.inbox?.forEach((m) => { m.read = true; }); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (shown >= inbox.length) { setTyping(false); return; }
    setTyping(true);
    const next = inbox[shown], card = next.from === 'sys';
    const id = window.setTimeout(() => { setTyping(false); setShown((n) => n + 1); sfx(card ? 'reveal' : 'dm.in'); }, card ? 500 : 900);
    return () => clearTimeout(id);
  }, [shown, inbox.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end', behavior: shown > 0 && !prefersReducedMotion() ? 'smooth' : 'auto' }); }, [shown, w.extras.dm, w.extras.tips.length]);
  const [bossOpen, setBossOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  if (!c4 || !goal) return null;
  const ch = goal.ch, def = chapterDef(ch);
  const guide = goal.epilogue ? (['mags'] as Person[]) : def.guide;
  const nextWho = shown < inbox.length ? personOf(inbox[shown].from) : '';
  const settled = shown >= inbox.length;
  return <div className="g-screen st">
    <div className="st-top">
    <header className="st-head">
      <span className="st-head__faces">{guide.map((g) => <Face key={g} who={g} size={40} />)}</span>
      <span className="st-head__who"><b>{guide.map((g) => t('st4.who.' + g)).join(' · ')}</b><small>{goal.epilogue ? t('st4.epilogue') : t('st4.chapter', { n: ch }) + ' · ' + t('st4.ch.' + ch + '.name')}</small></span>
      <Pop className="st-iconbtn" onTap={() => setMenu(true)} label={t('st4.menu.title')}><Icon n="menu" size={20} /></Pop>
    </header>
    <Pinned goal={goal} boss={w.boss} onBoss={() => setBossOpen(true)} />
    </div>
    <div className="st-feed" role="log" aria-label={t('st4.thread')}>
      {inbox.slice(0, shown).map((m, k) => <Item key={m.at + ':' + k} m={m} fresh={k >= inbox.length - fresh0} onBoss={() => setBossOpen(true)} />)}
      {typing && nextWho !== 'sys' && <div className="st-msg"><Face who={nextWho} size={32} /><Typing name={t('st4.who.' + nextWho)} /></div>}
      {settled && goal.epilogue && <Epilogue />}
      {settled && <Preview w={w} />}
      <div ref={end} />
    </div>
    {settled && <Dock w={w} goal={goal} go={() => { sfx('open'); chrome.go({ n: 'play', mode: 'career', key: Date.now() }); }} />}
    <Sheet open={bossOpen} onClose={() => setBossOpen(false)} label={t('st4.boss.open')}>
      <SheetHead title={t('rival.' + BOSS[w.boss.id].handle)} aside={t('st4.card.bossK')} onClose={() => setBossOpen(false)} />
      <BossCard b={w.boss} full />
    </Sheet>
    <Sheet open={menu} onClose={() => setMenu(false)} label={t('st4.menu.title')}>
      <SheetHead title={t('st4.title')} aside={t('st4.menu.title')} onClose={() => setMenu(false)} />
      <Menu onPrologue={() => { setMenu(false); onPrologue(); }} done={goal.epilogue} close={() => setMenu(false)} />
    </Sheet>
  </div>;
}

// ---------------------------------------------------------------- the pinned goal ("Chapter 2 · 6 of 12 windows · Rep 47 → 55")
function Pinned({ goal, boss, onBoss }: { goal: Goal4; boss: BossView; onBoss: () => void }) {
  const t = useT();
  const h = t('rival.' + BOSS[boss.id].handle);
  const line = goal.epilogue ? t('st4.goal.epi') : goal.finale ? t('st4.goal.finale') : goal.t1 ? t('st4.goal.t1', goal.t1)
    : t('st4.goal.line', { n: goal.ch, w: Math.min(goal.windows.have, goal.windows.need), need: goal.windows.need, from: goal.rep.have, bar: goal.rep.need });
  const parts = goal.epilogue || goal.t1 ? null : [
    { k: 'w', p: goal.windows.have / goal.windows.need, ok: goal.windows.have >= goal.windows.need },
    { k: 'r', p: Math.max(0, (goal.rep.have - goal.rep.from) / Math.max(1, goal.rep.need - goal.rep.from)), ok: goal.rep.have >= goal.rep.need },
    { k: 'b', p: goal.boss.have / goal.boss.need, ok: goal.boss.have >= goal.boss.need },
  ];
  return <div className="st-pin" role="status">
    <Icon n="target" size={16} />
    <div className="st-pin__b">
      <p>{line}</p>
      {!goal.epilogue && !goal.t1 && <Pop as="button" className="st-pin__boss" onTap={onBoss} label={t('st4.boss.open')}>
        <Face who={bossPerson(boss.id)} size={20} />
        {t(goal.boss.have >= goal.boss.need ? 'st4.goal.bossDone' : 'st4.goal.boss', { h, need: goal.boss.need, w: goal.boss.have })}
        <Icon n="arrow" size={14} className="st-flip" />
      </Pop>}
      {parts && <span className="st-pin__bars" aria-hidden="true">{parts.map((x) => <i key={x.k} className={x.ok ? 'is-ok' : ''}><b style={{ transform: `scaleX(${Math.min(1, x.p)})` }} /></i>)}</span>}
      {goal.t1 && !goal.finale && <span className="st-pin__pips" aria-hidden="true">{Array.from({ length: goal.t1.need }, (_, j) => <i key={j} className={j < goal.t1!.have ? 'on' : ''} />)}</span>}
    </div>
  </div>;
}

// ---------------------------------------------------------------- one thread item
function Item({ m, fresh, onBoss }: { m: Msg; fresh: boolean; onBoss: () => void }) {
  const t = useT();
  const v = m.v || {};
  const cls = fresh ? 'is-new' : '';
  if (m.key === 'st4.card.chapter') return <ChapterCard n={Number(v.n)} cls={cls} />;
  if (m.key === 'st4.card.boss') { const b = bossView(getSave(), BOSS[v.boss as Boss4].ch); return <div className={'st-cardwrap ' + cls}><BossCard b={b} onOpen={onBoss} /></div>; }
  if (m.key === 'st4.card.unlock') return <UnlockCard n={Number(v.n)} cls={cls} />;
  if (m.key === 'st4.card.result') return <ResultCard v={v} cls={cls} />;
  const who = personOf(m.from);
  let text: string;
  if (m.key === 'st4.banter') {
    const line = new Banter(t.lang, String(v.seed)).pick(String(v.pool), String(v.salt)) || '';
    text = line.replace(/\{p\}/g, String(v.p || ''));
  } else {
    const vars: Record<string, string | number> = { ...v };
    if (v.src) vars.src = t('st4.src.' + v.src);
    if (v.b && BOSS[v.b as Boss4]) vars.b = t('rival.' + BOSS[v.b as Boss4].handle);
    text = t(beatKey(m), vars);
  }
  if (!text) return null;
  const rival = who === 'bants' || who === 'kev' || who === 'pete' || who === 'carl' || who === 'vince';
  return <Bubble who={who} text={text} name={rival ? t('st4.who.' + who) : undefined} cls={cls + (rival ? ' st-msg--rival' : '')} />;
}

function ChapterCard({ n, cls }: { n: number; cls: string }) {
  const t = useT();
  return <section className={'st-chapter ' + cls} aria-label={t('st4.chapter', { n })}>
    <span className="st-chapter__n" aria-hidden="true">{n}</span>
    <div className="st-chapter__b">
      <small>{t('st4.chapter', { n })}</small>
      <h2>{t('st4.ch.' + n + '.name')}</h2>
      <p className="st-chapter__place">{t('st4.ch.' + n + '.place')}</p>
      <p className="st-chapter__mech">{t('st4.ch.' + n + '.mech')}</p>
    </div>
  </section>;
}
function UnlockCard({ n, cls }: { n: number; cls: string }) {
  const t = useT();
  return <section className={'st-unlock ' + cls}>
    <Stamp text={t('st4.card.unlocked', { n })} tone="gold" size="lg" slam={cls === 'is-new'} sound={cls === 'is-new'} />
    <p><small>{t('st4.card.unlockedK')}</small>{t('st4.ch.' + n + '.unlock')}</p>
  </section>;
}
const ROW: Record<string, string> = { '★': 'scoop', '■': 'right', '□': 'wrong', '·': 'none' };
function ResultCard({ v, cls }: { v: Record<string, string | number>; cls: string }) {
  const t = useT();
  const res = String(v.res) as 'w' | 'l' | 'd';
  const b = BOSS[v.b as Boss4];
  return <section className={'st-result st-result--' + res + ' ' + cls}>
    <div className="st-result__top">
      <b>{t('st4.card.result', { n: v.n })}</b>
      <span className={'st-tier st-tier--' + String(v.tier)}>{t('tier4.' + v.tier)}</span>
      <span className="st-result__pts">{num(Number(v.total), true)}</span>
    </div>
    {v.row && <span className="st-row" aria-hidden="true">{String(v.row).split('').map((c, k) => <i key={k} className={'is-' + (ROW[c] || 'none')} />)}</span>}
    <div className="st-result__h2h">
      <span className="st-result__side"><small>{t('st4.card.you')}</small><b>{v.you}</b></span>
      <span className="st-result__dash">–</span>
      <span className="st-result__side"><b>{v.boss}</b><small>{b ? t('rival.' + b.handle) : ''}</small></span>
    </div>
    <p className="st-result__verdict">{t('st4.card.' + res)}</p>
  </section>;
}

// ---------------------------------------------------------------- the boss: a stats card
function BossCard({ b, full, onOpen }: { b: BossView; full?: boolean; onOpen?: () => void }) {
  const t = useT();
  const def = BOSS[b.id];
  const days = b.days[0] === 0 ? t('st4.boss.before') : b.days[0] === b.days[1] ? t('st4.boss.day', { a: b.days[0] }) : t('st4.boss.dayRange', { a: b.days[0], b: b.days[1] });
  const body = <>
    <div className="st-boss__top">
      <Face who={bossPerson(b.id)} size={full ? 56 : 44} />
      <span className="st-boss__h"><b dir="ltr">{t('rival.' + def.handle)}</b><small>{t('st4.role.' + bossPerson(b.id))}</small></span>
      <span className="st-boss__acc"><b>{pct(b.acc)}</b><small>{t('st4.boss.acc')}</small></span>
    </div>
    <p className="st-boss__tell"><small>{t('st4.boss.tell')}</small>{t('st4.boss.' + b.id + '.tell')}</p>
    <dl className="st-boss__stats">
      <div><dt>{t('st4.boss.days')}</dt><dd>{days}</dd></div>
      <div><dt>{t('st4.boss.followers')}</dt><dd>{fmtK(b.followers)}</dd></div>
      <div><dt>{t('st4.boss.record')}</dt><dd>{b.vs.w}–{b.vs.l}{b.vs.d ? '–' + b.vs.d : ''}</dd></div>
    </dl>
    {full && b.need > 0 && <div className="st-boss__need">
      <span>{t('st4.boss.chapter')}: {t('st4.boss.need', { n: b.need })}</span>
      <span className="st-pin__pips" aria-label={b.chapter.w + '/' + b.need}>{Array.from({ length: b.need }, (_, j) => <i key={j} className={j < b.chapter.w ? 'on' : ''} />)}</span>
      <small>{t('st4.boss.wld', { ...b.chapter })}</small>
    </div>}
    <p className="st-boss__beat"><small>{t('st4.boss.beat')}</small>{t('st4.boss.' + b.id + '.beat')}</p>
    {full && <p className="st-boss__note">{t('st4.boss.score')}</p>}
  </>;
  return <div className={'st-boss' + (full ? ' st-boss--full' : '')}>
    {body}
    {!full && onOpen && <Pop className="st-boss__more" onTap={onOpen}>{t('st4.boss.open')}<Icon n="arrow" size={14} className="st-flip" /></Pop>}
  </div>;
}

// ---------------------------------------------------------------- the next window, before you open it
function Preview({ w }: { w: CareerWindow4 }) {
  const t = useT();
  const names = (i: number) => w.cast[i] ? w.cast[i].player.s : '';
  const tipText = (x: Tip4) => {
    const v = { p: names(x.i), to: w.cast[x.i]?.to.s || '', o: x.o != null ? outWord4(t.lang, x.o) : '' };
    if (x.kind === 'whistle') return t(x.from === 'priya' ? 'st4.tip.priya' : 'st4.tip.whistle', v);
    if (x.kind === 'pitch') return t('st4.tip.pitch', v);
    return t(x.stays ? 'st4.tip.stays' : 'st4.tip.goes', v);
  };
  return <section className="st-next" aria-label={t('st4.next.before')}>
    <header><small>{t('st4.next.before')}</small><b>{t('st4.next.k', { n: w.n, s: w.R.STORIES })}</b></header>
    <ul className="st-next__list">
      {w.cast.map((c) => <li key={c.i}>
        <span className="st-next__p">{c.player.s}</span>
        <span className="st-next__c" dir="auto">{c.from.s} → {c.to.s}</span>
        {w.tagged.includes(c.i) && <span className="st-chip st-chip--vince" title={t('st4.next.clientD')}>{t('st4.next.client')}</span>}
      </li>)}
    </ul>
    {w.tagged.length > 0 && <p className="st-next__note">{t('st4.next.clientD')}</p>}
    <p className="st-next__note">{t('st4.next.contacts', { list: chapterDef(w.ch).contacts.map((k) => t('st4.src.' + k)).join(', ') })}</p>
    {w.tips.map((x, k) => <Bubble key={x.kind + x.i + k} who={x.from} name={x.from === 'unknown' ? t('st4.who.unknown') : undefined} text={tipText(x)} cls={'is-new st-msg--tip st-msg--' + x.kind} style={dl(k)} />)}
  </section>;
}

// ---------------------------------------------------------------- the dock: extras, then one big button
function Dock({ w, goal, go }: { w: CareerWindow4; goal: Goal4; go: () => void }) {
  const t = useT();
  const s = useSave();
  const [pick, setPick] = useState(false);
  const ex = w.extras;
  const buy = (kind: 'dm' | 'tip', i = -1) => {
    const price = kind === 'dm' ? ex.priceDm : ex.priceTip;
    if (price > (s.credits || 0)) { sfx('os.locked'); toast('warn', t('st4.extra.broke', { n: s.credits || 0 })); return; }
    if (buyExtra(kind, i)) sfx(price ? 'coin' : 'ui.pop'); else sfx('os.locked');
  };
  const label = w.resume ? t('st4.next.resume', { n: w.n }) : w.live ? t('st4.next.live') : t('st4.next.open', { n: w.n });
  const can = !ex.locked && ex.left > 0;
  const price = (n: number) => (n ? t('st4.extra.coins', { n }) : t('st4.extra.free'));
  return <div className="st-dock">
    {!ex.locked && <div className="st-extras" role="group" aria-label={t('st4.extra.max')}>
      <Pop className="st-extra" disabled={!can || ex.dm >= 2} onTap={() => buy('dm')} sound={null} label={t('st4.extra.dm') + ', ' + price(ex.priceDm)}>
        <Icon n="phone" size={16} /><span><b>{t('st4.extra.dm')}{ex.dm ? ' ×' + ex.dm : ''}</b><small>{t('st4.extra.dmD')}</small></span><em>{price(ex.priceDm)}</em>
      </Pop>
      <Pop className="st-extra" disabled={!can} onTap={() => setPick(true)} label={t('st4.extra.tip') + ', ' + price(ex.priceTip)}>
        <Icon n="eye" size={16} /><span><b>{t('st4.extra.tip')}{ex.tips.length ? ' ×' + ex.tips.length : ''}</b><small>{t('st4.extra.tipD')}</small></span><em>{price(ex.priceTip)}</em>
      </Pop>
    </div>}
    {!ex.locked && <p className="st-dock__sub">{ex.left ? t('st4.extra.left', { n: ex.left }) : t('st4.extra.max')}{ex.free + ex.marketTips > 0 ? ' · ' + [ex.free ? t('st4.extra.haveFree', { n: ex.free }) : '', ex.marketTips ? t('st4.extra.haveTips', { n: ex.marketTips }) : ''].filter(Boolean).join(' · ') : ''}</p>}
    <Pop className={'st-go' + (w.live ? ' st-go--live' : '')} sound={null} onTap={go}>{w.live && <span className="st-go__dot" aria-hidden="true" />}{label}</Pop>
    {goal.epilogue && <p className="st-dock__sub">{t('st4.epi.after')}</p>}
    <Sheet open={pick} onClose={() => setPick(false)} label={t('st4.extra.pick')}>
      <SheetHead title={t('st4.extra.pick')} aside={price(ex.priceTip)} onClose={() => setPick(false)} />
      <p className="st-sheetnote">{t('st4.extra.pickD')}</p>
      <div className="st-pick">
        {w.cast.map((c) => <Pop key={c.i} className="st-pick__i" disabled={ex.tips.includes(c.i)} onTap={() => { setPick(false); buy('tip', c.i); }}>
          <b>{c.player.s}</b><small dir="auto">{c.from.s} → {c.to.s}</small>{ex.tips.includes(c.i) && <Icon n="check" size={16} />}
        </Pop>)}
      </div>
    </Sheet>
  </div>;
}

// ---------------------------------------------------------------- the epilogue: pinned, and one text to send
function Epilogue() {
  const t = useT();
  const s = useSave();
  const sent = !!story4Of(s)?.seen?.epiSent;
  const cp = catchphraseOf(s);
  const [just, setJust] = useState(false);
  return <section className="st-epi" aria-label={t('st4.epilogue')}>
    <div className="st-post st-post--pinned">
      <span className="st-post__pin"><Icon n="star" size={14} />{t('st4.epi.pinned')}</span>
      <span className="st-post__by"><Face who="you" size={28} /><b>{s.nick || t('st4.who.you')}</b><em>{fmtK(bylineOf(s).followers)}</em></span>
      <Stamp text={cp.text} tone={cp.tone === 'cool' || cp.tone === 'dry' || cp.tone === 'gold' ? cp.tone : 'loud'} size="lg" slam={false} sound={false} />
    </div>
    <div className="st-text">
      <small>{t('st4.epi.to')}</small>
      {sent ? <Bubble who="you" text={t('st4.epi.msg')} cls={just ? 'is-new' : ''}><span className="st-msg__r">{t('st4.epi.sent')}</span></Bubble>
        : <div className="st-text__draft"><p dir="auto">{t('st4.epi.msg')}</p><Pop className="st-send" sound="post" onTap={() => { setJust(true); sendEpilogue(); }} label={t('st4.epi.send')}><Icon n="arrow" size={18} className="st-flip" /></Pop></div>}
    </div>
  </section>;
}

// ---------------------------------------------------------------- the menu: the fall again, start over (after the end)
function Menu({ onPrologue, done, close }: { onPrologue: () => void; done: boolean; close: () => void }) {
  const t = useT();
  const [sure, setSure] = useState(false);
  return <div className="st-menu">
    <Pop className="st-menu__i" onTap={onPrologue}><Icon n="play" size={18} />{t('st4.menu.prologue')}</Pop>
    {done && (sure
      ? <div className="st-menu__sure"><p>{t('st4.menu.sure')}</p>
        <Pop className="st-menu__i st-menu__i--bad" onTap={() => { restartStory(); close(); }}>{t('st4.menu.yes')}</Pop>
        <Pop className="st-menu__i" onTap={() => setSure(false)}>{t('st4.menu.no')}</Pop></div>
      : <Pop className="st-menu__i" onTap={() => setSure(true)}><Icon n="uturn" size={18} />{t('st4.menu.restart')}</Pop>)}
  </div>;
}
