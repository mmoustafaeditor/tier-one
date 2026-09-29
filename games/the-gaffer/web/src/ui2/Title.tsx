// The front door: your careers (two free slots), a new 2026/27 career, an old pre-rebuild career kept safe, and the
// quick match. Before a career exists there is no tab bar (GF-18).
import { useState } from 'react';
import type { Strings, UiLang } from '../i18n';
import type { XStrings } from '../lang-v2';
import type { SaveMeta } from '../model/types';
import { Crest, I } from './kit';
import { Panel, Sheet } from './shell';

export interface SlotView { slot: number; meta: SaveMeta | null; legacy?: boolean; bad?: boolean }
const LANGS: [UiLang, string][] = [['en', 'EN'], ['ar', 'عربي'], ['es', 'ES'], ['fr', 'FR']];

export function LangSwitch({ ui, onLang }: { ui: UiLang; onLang: (l: UiLang) => void }) {
  return (
    <div className="chips langs" role="group" aria-label="Language">
      {LANGS.map(([l, label]) => <button key={l} className="chip" aria-pressed={ui === l} onClick={() => onLang(l)} lang={l}>{label}</button>)}
    </div>
  );
}

export function Title({ t, x, slots, bad, busy, ui, onLang, onOpen, onNew, onQuick }: {
  t: Strings; x: XStrings; slots: SlotView[] | null; bad: boolean; busy: boolean; ui: UiLang; onLang: (l: UiLang) => void;
  onOpen: (slot: number) => void; onNew: (replace: number | null) => void; onQuick: () => void;
}) {
  const [replace, setReplace] = useState<SlotView | null>(null);
  const [choose, setChoose] = useState(false);
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
        </header>
        <section className="title-hero on-ground">
          <h1 className="wordmark" aria-label="The Gaffer"><span>THE</span> <b>GAFFER</b></h1>
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
                      <div className="grow"><div className="name">{s.meta.clubName}</div><div className="sub">{T.slot(s.slot)} · {x.seasonLabel(s.meta.season)} · {T.matchday(s.meta.round + 1)}{s.meta.data === 'generated' ? ` · ${T.oldWorld}` : ''}</div></div>
                      <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => onOpen(s.slot)}>{T.cont}</button>
                    </>
                  ) : (
                    <>
                      <span className="slot-empty" aria-hidden="true"><I n="plus" /></span>
                      <div className="grow"><div className="name dim">{s.bad ? '—' : T.empty}</div><div className="sub">{T.slot(s.slot)}</div></div>
                      {!s.bad && <button className="btn btn--ghost btn--sm" onClick={() => onNew(null)}>{T.newCareer}</button>}
                    </>
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
