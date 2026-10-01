// First run (HYBRID.md §9): language, byline, then a guided first saga on a training board. No rules page.
import { useState } from 'react';
import { useT, LANGS } from '../lib/i18n';
import { update, useSave } from '../lib/save';
import { sfx } from '../lib/sfx';
import { Icon, GBtn } from '../ui/game';
import type { Go } from '../App';
import { playColdOpen } from '../lib/scenes';
import { newCareer } from '../lib/career';

export const TUT_SEED = 'TRAIN1';
export function startTutorial(go: Go) {
  update((x) => { x.practice.live = { seed: TUT_SEED, mode: 'practice', log: [], started: Date.now(), coach: true, label: 'tutorial' }; x.tut = { ...(x.tut || {}), done: false, seen: {} }; });
  go({ n: 'play', mode: 'practice', key: Date.now() });
}

export function Onboarding({ go }: { go: Go }) {
  const t = useT();
  const s = useSave();
  const [step, setStep] = useState(0);
  const [nick, setNick] = useState(s.nick);
  const finish = (tut: boolean) => {
    // 3.4 one opening: the story is the game's opening. The career starts at chapter 1 (The Blog) and the prologue film
    // ("The fall") plays; the Story tab then shows the prologue's title card once (save.story.prologue is still unset).
    update((x) => {
      x.onboarded = true; x.nick = nick.trim().slice(0, 16); if (!tut) x.tut = { ...(x.tut || {}), done: true };
      if (!x.career) { x.career = newCareer(); x.story = { ...(x.story || {}), chapterSeen: 0 }; }
    });
    if (tut) startTutorial(go); else go({ n: 'story' });
    playColdOpen();
  };
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
        <GBtn shine pulse onClick={() => finish(true)} style={{ marginTop: 16 }}><Icon n="phone" />{t('g.onb.first')}</GBtn>
        <button className="onb2__skip" onClick={() => finish(false)}>{t('g.onb.skip')}</button>
      </div>}
    </div>
  </div>;
}
