// 4.1 Career (games/tier-one/v3/UI41.md §Career). Three screens, none scrolls, all inside ui/screen.tsx <Screen>:
//   1. Career menu: Continue (chapter, window, goal) or New career (confirm sheet, wipes story progress).
//   2. Prologue: the fall in three short steps (one fake "done deal" cost you your job).
//   3. Chapter: one chapter card (where you are · who's against you · what you need), the boss card, the goal bar,
//      story messages (3 a page, newest first) and Play next window in the footer.
// The model is lib/storyMode.ts. The window plays on the Daily Challenge screen (screens/Window.tsx) through App's
// { n: 'play', mode: 'career' } route, which builds the driver from nextCareerWindow + makeDriver.
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useT, num } from '../lib/i18n';
import { useSave, getSave, update } from '../lib/save';
import { castFor, type Boss4 } from '../lib/engine';
import {
  nextCareerWindow, goalOf, story4Of, finishPrologue, ensureStory4, catchUpStory, buyExtra, sendEpilogue, restartStory, chapterOf,
  bossPerson, beatKey, BOSS, type Msg, type CareerWindow4, type Tip4, type Goal4, type BossView,
} from '../lib/storyMode';
import { Banter } from '../lib/banter';
import { outWord4 } from '../lib/story';
import { sfx } from '../lib/sfx';
import { toast } from '../lib/meta';
import { Screen, Pager } from '../ui/screen';
import { Hint } from '../ui/hint';
import { Sheet, SheetHead } from '../ui/juice';
import type { Chrome } from '../App';

// ---------------------------------------------------------------- the people (typographic avatars, no faces)
const FACE: Record<string, { i: string; c: string; ink?: string }> = {
  mags: { i: 'MD', c: '#E8B04A', ink: '#1C1305' }, rosa: { i: 'RL', c: '#3FA7A0', ink: '#06201E' }, hana: { i: 'HO', c: '#6E8EF0', ink: '#0A1230' }, tony: { i: 'TT', c: '#F08A4B', ink: '#1E0E02' },
  priya: { i: 'P', c: '#9DBF4F', ink: '#141B04' }, vince: { i: 'VM', c: '#1A1A1A', ink: '#F3F1EC' }, carl: { i: 'CS', c: '#B51B2C' }, unknown: { i: '?', c: '#4A4C52' },
  you: { i: '', c: '#D9486F' }, bants: { i: 'B', c: '#FF4D2E', ink: '#200500' }, kev: { i: 'K', c: '#1DB46A', ink: '#03200F' }, pete: { i: 'P', c: '#3B82F6' },
  sal: { i: 'S', c: '#8A6A4F' }, dougie: { i: 'D', c: '#5E7D8C' }, ines: { i: 'I', c: '#3E9C7A' },
};
// 3.x inbox senders, read as the people they are.
const LEGACY: Record<string, string> = { editor: 'mags', desk: 'mags', tabloid: 'bants', itk: 'kev', insider: 'pete', agent: 'rosa', spotter: 'tony', kitman: 'dougie', barber: 'sal', physio: 'ines' };
const personOf = (from: string): string => LEGACY[from] || from;
function Face({ who, size = 32 }: { who: string; size?: number }) {
  const f = FACE[who] || FACE.unknown;
  const ini = who === 'you' ? (getSave().nick || '·').replace(/^@/, '').slice(0, 1).toUpperCase() : f.i;
  return <span className="cr-face" style={{ ['--fc' as string]: f.c, ['--fi' as string]: f.ink || '#fff', width: size, height: size, fontSize: Math.round(size * (ini.length > 1 ? 0.36 : 0.46)) } as CSSProperties} aria-hidden="true">{ini}</span>;
}
const pct = (x: number) => Math.round(x * 100) + '%';

type View = 'menu' | 'pro' | 'chapter';

export function StoryScreen(chrome: Chrome) {
  const s = useSave();
  const has = !!s.career && !!s.story?.prologue;
  const [view, setView] = useState<View>('menu');
  // A window that ended elsewhere reaches the story; a 3.x career gets its Story 4 state.
  useEffect(() => { catchUpStory(); ensureStory4(); }, []);
  if (view === 'pro') return <Prologue onBack={() => setView('menu')} onDone={() => { finishPrologue(); setView('chapter'); }} />;
  if (view === 'chapter' && has) return <ChapterScreen chrome={chrome} onBack={() => setView('menu')} />;
  return <CareerMenu has={has} onBack={chrome.home} onContinue={() => setView('chapter')} onNew={() => setView('pro')} />;
}

// ---------------------------------------------------------------- 1. Career: Continue / New career
function CareerMenu({ has, onBack, onContinue, onNew }: { has: boolean; onBack: () => void; onContinue: () => void; onNew: () => void }) {
  const t = useT();
  const s = useSave();
  const [sure, setSure] = useState(false);
  const goal = has ? goalOf(s) : null;
  const ch = has ? chapterOf(s) : null;
  const c4 = story4Of(s);
  const name = goal ? (goal.epilogue ? t('c41.epi.name') : t('st4.ch.' + goal.ch + '.name')) : '';
  const fresh = () => { if (has) setSure(true); else { sfx('open'); onNew(); } };
  return <Screen title={t('c41.title')} onBack={onBack} tone="career"
    footer={has ? <button className="cr-go" onClick={() => { sfx('open'); onContinue(); }}>{t('c41.cont')}</button>
      : <button className="cr-go" onClick={fresh}>{t('c41.start')}</button>}>
    <div className="cr cr-menu">
      {has && goal ? <button className="cr-save" onClick={() => { sfx('open'); onContinue(); }}>
        <span className="cr-save__n" aria-hidden="true">{goal.epilogue ? '★' : goal.ch}</span>
        <span className="cr-save__b">
          <small>{t('c41.contK')}</small>
          <b>{goal.epilogue ? name : t('st4.chapter', { n: goal.ch }) + ' · ' + name}</b>
          <em>{t('c41.next', { n: (c4?.windows || 0) + 1 })}</em>
          <span className="cr-bar" aria-hidden="true"><i style={{ transform: `scaleX(${Math.min(1, ch?.progress || 0)})` }} /></span>
          <span className="cr-save__goal">{needLine(t, goal)}</span>
        </span>
      </button> : <p className="cr-none">{t('c41.none')}</p>}
      {has && <button className="cr-ghost" onClick={fresh}>{t('c41.fresh')}</button>}
    </div>
    <Sheet open={sure} onClose={() => setSure(false)} label={t('c41.sure.title')}>
      <SheetHead title={t('c41.sure.title')} onClose={() => setSure(false)} />
      <p className="cr-sheetnote">{t('c41.sure.body')}</p>
      <div className="cr-sheetrow">
        <button className="cr-ghost" onClick={() => setSure(false)}>{t('c41.sure.no')}</button>
        <button className="cr-go cr-go--bad" onClick={() => { sfx('ui.tap'); restartStory(); setSure(false); onNew(); }}>{t('c41.sure.yes')}</button>
      </div>
    </Sheet>
  </Screen>;
}

// "What you need", one line for the chapter (numbers from the goal).
function needLine(t: ReturnType<typeof useT>, g: Goal4): string {
  if (g.epilogue) return t('c41.epi.need');
  if (g.finale) return t('c41.finale');
  if (g.t1) return t('c41.need5', { n: g.t1.need });
  return t('c41.need', { nw: g.windows.need, nr: g.rep.need, nb: g.boss.need, h: t('rival.' + BOSS[g.def.boss].handle) });
}

// ---------------------------------------------------------------- 2. the prologue: three steps
function Prologue({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const t = useT();
  const cast = useMemo(() => castFor('the-fall', { n: 1, pool: 'stars' })[0], []);
  const v = { p: cast.player.s, to: cast.to.s, from: cast.from.s };
  const [step, setStep] = useState(0);
  const steps = ['a', 'b', 'c'] as const;
  const k = steps[step];
  const who = step === 0 ? 'vince' : step === 1 ? 'you' : 'rosa';
  const last = step === steps.length - 1;
  return <Screen title={t('c41.pro.k')} sub={t('c41.pro.time')} onBack={onBack} tone="career"
    right={<button className="cr-skip" onClick={onDone}>{t('c41.pro.skip')}</button>}
    footer={<button className="cr-go" onClick={() => { if (last) { sfx('open'); onDone(); } else { sfx(step === 0 ? 'drop' : 'lamp.off'); setStep(step + 1); } }}>{last ? t('c41.pro.start') : t('c41.pro.next')}</button>}>
    <div className={'cr cr-pro cr-pro--' + k} key={k}>
      <span className="cr-pro__dots" aria-label={step + 1 + ' / 3'}>{steps.map((x, j) => <i key={x} className={j <= step ? 'on' : ''} />)}</span>
      <b className="cr-pro__big" dir="ltr">{t('c41.pro.' + k + 'K')}</b>
      <div className="cr-pro__msg"><Face who={who} size={40} /><p dir="auto">{t('c41.pro.' + k, v)}</p></div>
    </div>
  </Screen>;
}

// ---------------------------------------------------------------- 3. the chapter
interface Line { id: string; who: string; text: string; fresh?: boolean; tone?: string }

function ChapterScreen({ chrome, onBack }: { chrome: Chrome; onBack: () => void }) {
  const t = useT();
  const s = useSave();
  const goal = goalOf(s);
  const w = useMemo(() => nextCareerWindow(s), [s]);
  const inbox = (s.story?.inbox || []) as Msg[];
  const [unread] = useState(() => inbox.filter((m) => !m.read).length);
  useEffect(() => { if (unread) update((x) => { x.story?.inbox?.forEach((m) => { m.read = true; }); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [extras, setExtras] = useState(false);
  const lines = useMemo(() => {
    const out: Line[] = w.tips.map((x, k) => ({ id: 'tip' + k, who: x.from, text: tipText(t, w, x), fresh: true, tone: x.kind }));
    const fromInbox: Line[] = [];
    inbox.forEach((m, k) => { const l = lineOf(t, m, k, k >= inbox.length - unread); if (l) fromInbox.push(l); });
    return out.concat(fromInbox.reverse());
  }, [inbox, w, t.lang, unread]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!goal) return null;
  const epi = goal.epilogue;
  const n = goal.ch;
  const go = () => { sfx('open'); chrome.go({ n: 'play', mode: 'career', key: Date.now() }); };
  const label = w.resume ? t('c41.resume', { n: w.n }) : w.live ? t('c41.live') : t('c41.play', { n: w.n });
  return <Screen tone="career" onBack={onBack}
    title={epi ? t('c41.epi.name') : t('st4.ch.' + n + '.name')}
    sub={epi ? t('st4.epilogue') : t('c41.sub', { n, w: w.n })}
    right={!w.extras.locked ? <button className="cr-skip" onClick={() => setExtras(true)}>{t('c41.extras')}</button> : null}
    footer={<button className={'cr-go' + (w.live ? ' cr-go--live' : '')} onClick={go}>{w.live && <span className="cr-go__dot" aria-hidden="true" />}{label}</button>}>
    <Hint id="career">{t('c41.hint')}</Hint>
    <div className="cr cr-ch">
      <section className="cr-card" aria-label={t('st4.chapter', { n })}>
        <span className="cr-card__n" aria-hidden="true">{epi ? '★' : n}</span>
        <dl>
          <div><dt>{t('c41.lbl.where')}</dt><dd>{epi ? t('c41.epi.where') : t('c41.ch.' + n + '.where')}</dd></div>
          <div><dt>{t('c41.lbl.against')}</dt><dd>{epi ? t('c41.epi.against') : t('c41.ch.' + n + '.against')}</dd></div>
          <div><dt>{t('c41.lbl.need')}</dt><dd>{needLine(t, goal)}</dd></div>
        </dl>
        {epi && <EpiSend />}
      </section>
      {!epi && <BossRow b={w.boss} />}
      {!epi && <GoalRow g={goal} />}
      <section className="cr-msgs" aria-label={t('c41.msgs')}>
        <Pager items={lines} per={3} empty={<span>{t('c41.noMsgs')}</span>} render={(l) => <div key={l.id} className={'cr-msg' + (l.fresh ? ' is-new' : '') + (l.tone ? ' cr-msg--' + l.tone : '')}>
          {l.who === 'sys' ? <span className="cr-msg__sys" aria-hidden="true">■</span> : <Face who={l.who} size={28} />}
          <p dir="auto">{l.who !== 'sys' && <b>{t('st4.who.' + l.who)}</b>}{l.text}</p>
        </div>} />
      </section>
    </div>
    <ExtrasSheet open={extras} onClose={() => setExtras(false)} w={w} />
  </Screen>;
}

function tipText(t: ReturnType<typeof useT>, w: CareerWindow4, x: Tip4): string {
  const c = w.cast[x.i];
  const v = { p: c ? c.player.s : '', to: c ? c.to.s : '', o: x.o != null ? outWord4(t.lang, x.o) : '' };
  if (x.kind === 'whistle') return t(x.from === 'priya' ? 'st4.tip.priya' : 'st4.tip.whistle', v);
  if (x.kind === 'pitch') return t('st4.tip.pitch', v);
  return t(x.stays ? 'st4.tip.stays' : 'st4.tip.goes', v);
}

// One thread message as one short line. Chapter and boss cards are on the screen already, so they're skipped.
function lineOf(t: ReturnType<typeof useT>, m: Msg, k: number, fresh: boolean): Line | null {
  const v = m.v || {};
  const id = m.at + ':' + k;
  if (m.key === 'st4.card.chapter' || m.key === 'st4.card.boss') return null;
  if (m.key === 'st4.card.result') {
    const b = BOSS[v.b as Boss4];
    return { id, who: 'sys', fresh, tone: 'res-' + v.res, text: t('c41.res', { n: v.n, you: v.you, boss: v.boss, h: b ? t('rival.' + b.handle) : '', v: t('st4.card.' + v.res) }) };
  }
  if (m.key === 'st4.card.unlock') return { id, who: 'sys', fresh, tone: 'unlock', text: t('c41.unlock', { n: v.n, what: t('st4.ch.' + v.n + '.unlock') }) };
  let text: string;
  if (m.key === 'st4.banter') text = (new Banter(t.lang, String(v.seed)).pick(String(v.pool), String(v.salt)) || '').replace(/\{p\}/g, String(v.p || ''));
  else {
    const vars: Record<string, string | number> = { ...v };
    if (v.src) vars.src = t('st4.src.' + v.src);
    if (v.b && BOSS[v.b as Boss4]) vars.b = t('rival.' + BOSS[v.b as Boss4].handle);
    text = t(beatKey(m), vars);
  }
  if (!text) return null;
  return { id, who: personOf(m.from), text, fresh };
}

function BossRow({ b }: { b: BossView }) {
  const t = useT();
  const need = b.need;
  return <section className="cr-boss" aria-label={t('c41.boss.k')}>
    <Face who={bossPerson(b.id)} size={40} />
    <span className="cr-boss__h"><small>{t('c41.boss.k')}</small><b dir="ltr">{t('rival.' + BOSS[b.id].handle)}</b></span>
    <span className="cr-boss__st"><b>{pct(b.acc)}</b><small>{t('c41.boss.acc')}</small></span>
    <span className="cr-boss__st"><b dir="ltr">{b.vs.w}–{b.vs.l}{b.vs.d ? '–' + b.vs.d : ''}</b><small>{t('c41.boss.rec')}</small></span>
    {need > 0 && <span className="cr-pips" aria-label={b.chapter.w + ' / ' + need}>{Array.from({ length: need }, (_, j) => <i key={j} className={j < b.chapter.w ? 'on' : ''} />)}</span>}
  </section>;
}

function GoalRow({ g }: { g: Goal4 }) {
  const t = useT();
  const parts = g.t1
    ? [{ k: 't1', have: g.t1.have, need: g.t1.need, p: g.t1.have / g.t1.need }]
    : [
      { k: 'w', have: Math.min(g.windows.have, g.windows.need), need: g.windows.need, p: g.windows.have / Math.max(1, g.windows.need) },
      { k: 'rep', have: g.rep.have, need: g.rep.need, p: (g.rep.have - g.rep.from) / Math.max(1, g.rep.need - g.rep.from) },
      { k: 'boss', have: Math.min(g.boss.have, g.boss.need), need: g.boss.need, p: g.boss.have / Math.max(1, g.boss.need) },
    ];
  return <section className="cr-goal" style={{ ['--cols' as string]: parts.length } as CSSProperties}>
    {parts.map((x) => <div key={x.k} className={'cr-goal__i' + (x.have >= x.need ? ' is-ok' : '')}>
      <span><small>{t('c41.goal.' + x.k)}</small><b dir="ltr">{num(x.have)}/{num(x.need)}</b></span>
      <span className="cr-bar" aria-hidden="true"><i style={{ transform: `scaleX(${Math.max(0, Math.min(1, x.p))})` }} /></span>
    </div>)}
  </section>;
}

function EpiSend() {
  const t = useT();
  const s = useSave();
  const sent = !!story4Of(s)?.seen?.epiSent;
  return sent ? <p className="cr-epi is-sent">{t('c41.epi.sent')}</p>
    : <button className="cr-ghost cr-epi" onClick={() => { sfx('post'); sendEpilogue(); }}>{t('c41.epi.send')}</button>;
}

// ---------------------------------------------------------------- extras (bought before the window opens)
function ExtrasSheet({ open, onClose, w }: { open: boolean; onClose: () => void; w: CareerWindow4 }) {
  const t = useT();
  const s = useSave();
  const [pick, setPick] = useState(false);
  const ex = w.extras;
  const price = (n: number) => (n ? t('st4.extra.coins', { n }) : t('st4.extra.free'));
  const can = !ex.locked && ex.left > 0;
  const buy = (kind: 'dm' | 'tip', i = -1) => {
    const p = kind === 'dm' ? ex.priceDm : ex.priceTip;
    if (p > (s.credits || 0)) { sfx('os.locked'); toast('warn', t('st4.extra.broke', { n: s.credits || 0 })); return; }
    if (buyExtra(kind, i)) sfx(p ? 'coin' : 'ui.pop'); else sfx('os.locked');
  };
  const close = () => { setPick(false); onClose(); };
  return <Sheet open={open} onClose={close} label={t('c41.extras')}>
    <SheetHead title={pick ? t('st4.extra.pick') : t('c41.extras')} aside={pick ? price(ex.priceTip) : t('c41.extrasK')} onClose={close} />
    {!pick ? <div className="cr-extras">
      <button className="cr-extra" disabled={!can || ex.dm >= 2} onClick={() => buy('dm')}>
        <span><b>{t('st4.extra.dm')}{ex.dm ? ' ×' + ex.dm : ''}</b><small>{t('st4.extra.dmD')}</small></span><em>{price(ex.priceDm)}</em>
      </button>
      <button className="cr-extra" disabled={!can} onClick={() => setPick(true)}>
        <span><b>{t('st4.extra.tip')}{ex.tips.length ? ' ×' + ex.tips.length : ''}</b><small>{t('st4.extra.tipD')}</small></span><em>{price(ex.priceTip)}</em>
      </button>
      <p className="cr-sheetnote">{ex.left ? t('st4.extra.left', { n: ex.left }) : t('st4.extra.max')}{ex.free + ex.marketTips > 0 ? ' · ' + [ex.free ? t('st4.extra.haveFree', { n: ex.free }) : '', ex.marketTips ? t('st4.extra.haveTips', { n: ex.marketTips }) : ''].filter(Boolean).join(' · ') : ''}</p>
    </div> : <div className="cr-extras">
      {w.cast.map((c) => <button key={c.i} className="cr-extra" disabled={ex.tips.includes(c.i)} onClick={() => { setPick(false); buy('tip', c.i); }}>
        <span><b>{c.player.s}</b><small dir="auto">{c.from.s} → {c.to.s}</small></span>{ex.tips.includes(c.i) && <em>✓</em>}
      </button>)}
    </div>}
  </Sheet>;
}
