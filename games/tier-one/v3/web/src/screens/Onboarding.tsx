// First run (LAUNCH_BRIEF §31, 3.8): welcome → your name → one short scene ("You were fired last season after getting
// the biggest call wrong": the editor and you, portrait slots, skippable) → the training board, where the game is
// taught in play (ring the Kit Man, a second source, read the evidence, call it, publish, see the consequence) → Home
// with today's Daily highlighted. No rules page; the shop, pass and achievements stay out of sight until later (§45).
import { useState } from 'react';
import { useT, LANGS } from '../lib/i18n';
import { update, useSave } from '../lib/save';
import { sfx } from '../lib/sfx';
import { Icon, GBtn } from '../ui/game';
import { Portrait } from '../ui/portrait';
import type { Go } from '../App';
import { newCareer } from '../lib/career';

export const TUT_SEED = 'TRAIN1';
export function startTutorial(go: Go) {
  update((x) => { x.practice.live = { seed: TUT_SEED, mode: 'practice', log: [], started: Date.now(), coach: false, label: 'tutorial' }; x.tut = { ...(x.tut || {}), done: false, seen: {} }; });
  go({ n: 'play', mode: 'practice', key: Date.now() });
}

export function Onboarding({ go }: { go: Go }) {
  const t = useT();
  const s = useSave();
  const [step, setStep] = useState(0);
  const [nick, setNick] = useState(s.nick);
  const name = () => nick.trim().slice(0, 16);
  // The career starts at chapter 1 either way (its own prologue plays from Career Mode, not here: the first five
  // minutes belong to the training board). "I've played before" lands on Home.
  const commit = (tutDone: boolean) => update((x) => {
    x.onboarded = true; x.nick = name(); if (tutDone) x.tut = { ...(x.tut || {}), done: true };
    if (!x.career) { x.career = newCareer(); x.story = { ...(x.story || {}), chapterSeen: 0 }; }
  });
  const train = () => { commit(false); startTutorial(go); };
  const skipAll = () => { commit(true); go({ n: 'front' }); };
  return <div className="onb2" role="dialog" aria-modal="true" aria-label={t('g.onb.k')}>
    <div className="onb2__glow" aria-hidden="true" />
    <div className="onb2__in">
      <div className="onb2__logo"><span>Tier One</span><b>{t('g.onb.tag')}</b></div>
      {step === 0 && <div className="onb2__card g-card" key="0">
        <div className="g-mono onb2__k">{t('g.onb.k')}</div>
        <h1 className="g-h1">{t('g.onb.h')}</h1>
        <div className="onb2__steps">
          {[['phone', 'g.onb.s1'], ['news', 'g.onb.s2'], ['bolt', 'g.onb.s3']].map(([ic, k], i) => <div key={k} className="onb2__step" style={{ animationDelay: 200 + i * 150 + 'ms' }}><span><Icon n={ic} /></span><p>{t(k)}</p></div>)}
        </div>
        <div className="onb2__langs">{LANGS.map(([k, n]) => <button key={k} lang={k} aria-pressed={s.lang === k} onClick={() => { sfx('ui.tap'); update((x) => { x.lang = k; }); }}>{n}</button>)}</div>
        <GBtn size="lg" shine onClick={() => setStep(1)} style={{ marginTop: 16 }}>{t('g.onb.next')}<Icon n={t.rtl ? 'back' : 'arrow'} /></GBtn>
      </div>}
      {step === 1 && <div className="onb2__card g-card" key="1">
        <div className="g-mono onb2__k">{t('g.onb.pressCard')}</div>
        <h1 className="g-h1">{t('g.onb.nickH')}</h1>
        <input className="onb2__input" value={nick} maxLength={16} onChange={(e) => setNick(e.target.value)} aria-label={t('onb.nick')} placeholder={t('g.onb.nickPh')} autoFocus />
        <GBtn shine pulse onClick={() => { sfx('page.turn'); setStep(2); }} style={{ marginTop: 16 }}><Icon n="phone" />{t('g.onb.next')}</GBtn>
        <button className="onb2__skip" onClick={skipAll}>{t('g.onb.skip')}</button>
      </div>}
      {step === 2 && <div className="onb2__card onb2__scene g-card" key="2">
        <div className="g-mono onb2__k">{t('c38.onb.firedK')}</div>
        <h1 className="g-h1">{t('c38.onb.firedH')}</h1>
        <p className="onb2__body">{t('c38.onb.firedBody')}</p>
        <div className="onb2__cast">
          <figure className="onb2__who onb2__who--ed">
            <Portrait kind="staff" id="editor" size={72} mood="stern" name={t('c38.onb.editor')} />
            <figcaption><b>{t('c38.onb.editor')}</b><q dir="auto">{t('c38.onb.editorLine')}</q></figcaption>
          </figure>
          <figure className="onb2__who onb2__who--you">
            <Portrait kind="staff" id="you" size={72} mood="hesitant" name={name() || t('c38.onb.you')} />
            <figcaption><b dir="auto">{name() || t('c38.onb.you')}</b><q dir="auto">{t('c38.onb.youLine')}</q></figcaption>
          </figure>
        </div>
        <GBtn size="lg" shine pulse sound="open" onClick={train} style={{ marginTop: 16 }}><Icon n="phone" />{t('c38.onb.start')}<small>{t('c38.onb.trainingSub')}</small></GBtn>
        <button className="onb2__skip" onClick={skipAll}>{t('c38.onb.skip')}</button>
      </div>}
    </div>
  </div>;
}
