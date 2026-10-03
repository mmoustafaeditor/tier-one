// The front door: your careers (two free slots), a new 2026/27 career, an old pre-rebuild career kept safe, and the
// quick match. Before a career exists there is no tab bar (GF-18).
import { useState } from 'react';
import type { Strings, UiLang } from '../i18n';
import type { XStrings } from '../lang-v2';
import type { SaveMeta } from '../model/types';
import { Crest, I } from './kit';
import { wordmarkSvg } from '../brand';
import { Panel, Sheet } from './shell';
import type { Prefs } from '../sim/prefs';
import { A11yControls } from './A11y';
import { AX } from '../lang-a11y';

// The brand mark (brand.ts): a constant SVG string, the same one the favicon and Android icons are drawn from.
const WORDMARK = wordmarkSvg('dark');

export interface SlotView { slot: number; meta: SaveMeta | null; legacy?: boolean; bad?: boolean; savedAt?: string }

// "2 hours ago", in the UI language; nothing when the time is unknown or unreadable.
function ago(iso: string | undefined, ui: UiLang): string {
  const ms = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(ms)) return '';
  const s = Math.round((ms - Date.now()) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [['second', 60], ['minute', 60], ['hour', 24], ['day', 7], ['week', 4.35], ['month', 12], ['year', Infinity]];
  let v = s;
  for (const [unit, n] of steps) {
    if (Math.abs(v) < n || unit === 'year') {
      try { return new Intl.RelativeTimeFormat(ui, { numeric: 'auto' }).format(unit === 'second' ? 0 : Math.round(v), unit === 'second' ? 'minute' : unit); } catch { return ''; }
    }
    v /= n;
  }
  return '';
}
const LANGS: [UiLang, string][] = [['en', 'EN'], ['ar', 'عربي'], ['es', 'ES'], ['fr', 'FR']];

export function LangSwitch({ ui, onLang }: { ui: UiLang; onLang: (l: UiLang) => void }) {
  return (
    <div className="chips langs" role="group" aria-label="Language">
      {LANGS.map(([l, label]) => <button key={l} className="chip" aria-pressed={ui === l} onClick={() => onLang(l)} lang={l}>{label}</button>)}
    </div>
  );
}

export function Title({ t, x, slots, bad, busy, ui, onLang, onOpen, onNew, onQuick, prefs, onPrefs }: {
  t: Strings; x: XStrings; slots: SlotView[] | null; bad: boolean; busy: boolean; ui: UiLang; onLang: (l: UiLang) => void;
  prefs: Prefs; onPrefs: (p: Prefs) => void;
  onOpen: (slot: number) => void; onNew: (replace: number | null) => void; onQuick: () => void;
}) {
  const [replace, setReplace] = useState<SlotView | null>(null);
  const [choose, setChoose] = useState(false);
  const [a11y, setA11y] = useState(false);
  const used = (slots ?? []).filter((s) => s.meta);
  const free = (slots ?? []).some((s) => !s.meta && !s.bad);
  const old = used.find((s) => s.meta!.data === 'generated');
  const T = x.title;
  const startNew = () => (free ? onNew(null) : setChoose(true));
  void t;
  return (
    <div className="shell solo title-shell">
      <main className="main"><div className="page sc-title">
        <header className="title-top on-ground">
          <span className="stripe" aria-hidden="true" />
          <LangSwitch ui={ui} onLang={onLang} />
          <button className="chip a11y-open" onClick={() => setA11y(true)} aria-haspopup="dialog"><I n="eye" size="sm" />{AX[ui].open}</button>
        </header>
        <section className="title-hero on-ground">
          <h1 className="wordmark" aria-label="The Gaffer" dangerouslySetInnerHTML={{ __html: WORDMARK }} />
          <p className="tag-line">{T.tag}</p>
        </section>
        {bad && <div className="banner-warn on-ground" role="alert"><I n="alert" /><span>{T.badSave}</span></div>}
        <div className="title-grid">
          <Panel className="title-new" i={1}>
            <span className="eyebrow">{T.season}</span>
            <h2 className="h1">{T.newCareer}</h2>
            <p className="muted">{T.lead}</p>
            <button className="btn btn--primary btn--block big" onClick={startNew} disabled={!slots}>{T.newCareer}<I n="arrowr" size="sm" /></button>
            <p className="meta dim">{T.newSub}</p>
          </Panel>

          {old && (
            <Panel className="title-old" i={2}>
              <span className="eyebrow"><I n="history" size="sm" />{T.oldWorld}</span>
              <h2 className="h2">{T.oldTitle}</h2>
              <div className="slot-row">
                <Crest club={{ id: old.meta!.club, colors: old.meta!.colors, name: { en: old.meta!.clubName, ar: old.meta!.clubName }, shortName: old.meta!.clubName }} size={44} />
                <div className="grow"><b>{old.meta!.clubName}</b><span className="sub">{x.seasonLabel(old.meta!.season)} · {T.matchday(old.meta!.round + 1)} · {old.meta!.manager}</span></div>
              </div>
              <p className="muted small">{T.oldBody}</p>
              <div className="two">
                <button className="btn btn--primary" disabled={busy} onClick={() => onOpen(old.slot)}>{T.contOld}</button>
                <button className="btn btn--ghost" onClick={startNew}>{T.startNew}</button>
              </div>
            </Panel>
          )}

          <Panel className="title-slots" i={3}>
            <div className="panel-h"><h2 className="h2">{T.slots}</h2></div>
            <div className="rows">
              {(slots ?? []).map((s) => (
                <div key={s.slot} className="row slot-line">
                  {s.meta ? (
                    <>
                      <Crest club={{ id: s.meta.club, colors: s.meta.colors, name: { en: s.meta.clubName, ar: s.meta.clubName }, shortName: s.meta.clubName }} size={40} />
                      <div className="grow">
                        <div className="name">{s.meta.clubName}</div>
                        <div className="sub">{s.meta.manager} · {x.seasonLabel(s.meta.season)} · {T.matchday(s.meta.round + 1)}{s.meta.round > 0 && s.meta.pos && s.meta.of ? ` · ${T.card(s.meta.pos, s.meta.of)}` : ''}{s.meta.data === 'generated' ? ` · ${T.oldWorld}` : ''}</div>
                        {s.meta.next && <div className="sub">{T.next(ui === 'ar' ? s.meta.next.ar || s.meta.next.en : s.meta.next.en, s.meta.next.home)}</div>}
                        <div className="sub dim">{T.slot(s.slot)}{ago(s.savedAt, ui) ? ` · ${T.played(ago(s.savedAt, ui))}` : ''}</div>
                      </div>
                      <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => onOpen(s.slot)}>{T.cont}</button>
                    </>
                  ) : (
                    s.bad ? (
                      <>
                        <span className="slot-empty" aria-hidden="true"><I n="alert" /></span>
                        <div className="grow"><div className="name dim">—</div><div className="sub">{T.slot(s.slot)}</div></div>
                      </>
                    ) : (
                      <button className="slot-new" onClick={() => onNew(null)}>
                        <span className="slot-empty" aria-hidden="true"><I n="plus" /></span>
                        <span className="grow"><span className="name">{T.newCareer}</span><span className="sub">{T.slot(s.slot)} · {T.newHere}</span></span>
                        <I n="arrowr" size="sm" />
                      </button>
                    )
                  )}
                </div>
              ))}
              {!slots && <p className="muted small">{T.loading}</p>}
            </div>
          </Panel>

          <Panel flat i={4} className="title-quick">
            <div className="between">
              <div className="hstack"><I n="ball" /><div><b>{T.quick}</b><div className="meta dimg">{T.quickSub}</div></div></div>
              <button className="btn btn--ghost on-ground btn--sm" onClick={onQuick}>{T.quick}</button>
            </div>
          </Panel>
        </div>
        <p className="title-foot on-ground">{T.foot}</p>
      </div></main>

      {choose && (
        <Sheet label={T.full} onClose={() => setChoose(false)}>
          <h2 className="h2">{T.full}</h2>
          <div className="rows">
            {used.map((s) => (
              <div key={s.slot} className="row">
                <Crest club={{ id: s.meta!.club, colors: s.meta!.colors, name: { en: s.meta!.clubName, ar: s.meta!.clubName }, shortName: s.meta!.clubName }} size={36} />
                <div className="grow"><div className="name">{s.meta!.clubName}</div><div className="sub">{T.slot(s.slot)} · {x.seasonLabel(s.meta!.season)}</div></div>
                <button className="btn btn--ghost btn--sm" onClick={() => { setChoose(false); setReplace(s); }}>{T.replace}</button>
              </div>
            ))}
          </div>
        </Sheet>
      )}
      {a11y && (
        <Sheet label={AX[ui].title} onClose={() => setA11y(false)}>
          <h2 className="h2">{AX[ui].title}</h2>
          <A11yControls ui={ui} prefs={prefs} onPrefs={onPrefs} />
          <button className="btn btn--primary btn--block" onClick={() => setA11y(false)}>{AX[ui].done}</button>
        </Sheet>
      )}
      {replace && (
        <Sheet label={T.replaceAsk(replace.meta!.clubName)} onClose={() => setReplace(null)}>
          <h2 className="h2">{T.replaceAsk(replace.meta!.clubName)}</h2>
          <p className="muted">{T.replaceBody}</p>
          <div className="stack-2 sheet-acts">
            <button className="btn btn--primary" onClick={() => { const n = replace.slot; setReplace(null); onNew(n); }}>{T.replace}</button>
            <button className="btn btn--ghost" onClick={() => setReplace(null)}>{T.cancel}</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
