// Settings and saves: language, real or fictional names, how far "Sim to the next decision" runs, match speed and
// sound, difficulty, export / import / delete, and the small print. Career settings go through commands like
// everything else; device settings are prefs.
import { RF } from '../lang-ref-all';
import { useRef, useState } from 'react';
import type { Career, NamesMode } from '../model/types';
import type { Prefs } from '../sim/prefs';
import type { World } from '../sim/world';
import { balanceOf } from '../sim/balance';
import { parseSave, saveText } from '../sim/save';
import { BUILD, VERSION } from '../update';
import { download, slug } from './share';
import { I } from './kit';
import { Panel, PanelHead, Seg, Sheet, Switch } from './shell';
import { LangSwitch } from './Title';
import { useGame, cn } from './game';
import { soundOn, setSound } from './sfx';
import { RATES, rateOf } from '../sim/highlights';

export function SettingsScreen({ prefs, onPrefs, onTitle, slot, onDelete, onImported }: {
  prefs: Prefs; onPrefs: (p: Prefs) => void; onTitle: () => void; slot: number;
  onDelete: () => void | Promise<void>; onImported: (w: World, c: Career) => void | Promise<void>;
}) {
  const g = useGame();
  const { w, c, x, t } = g;
  const S = x.set;
  const [sound, setSoundState] = useState(soundOn());
  const [ask, setAsk] = useState(false);
  const [page, setPage] = useState<'how' | 'privacy' | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const b = balanceOf(c);
  const real = c.data === 'real2026';

  const doExport = async () => {
    const text = await saveText(w, c);
    await download(new Blob([text], { type: 'application/octet-stream' }), `${slug(cn(g.club, 'en'))}-${c.season}.gaffer`);
  };
  const doImport = async (f: File) => {
    const p = await parseSave(await f.text());
    if (!p.ok || !p.save.career) { g.toast(S.importBad); return; }
    await onImported(p.save.world as World, p.save.career);
  };

  return (
    <div className="sc-settings">
      <div className="h-head on-ground">
        <span className="eyebrow">{x.office.settings} · {c.managerName}</span>
        <h1 className="h-hero">{S.title}</h1>
      </div>
      <div className="grid2">
        <Panel i={0} label={S.lang}>
          <PanelHead title={S.lang} />
          <LangSwitch ui={prefs.lang} onLang={(l) => onPrefs({ ...prefs, lang: l })} />
          <div className="setrow">
            <span className="grow"><b>{S.names}</b><small>{real ? S.namesHelp : S.namesLocked}</small></span>
          </div>
          {real && (
            <Seg<NamesMode> label={S.names} value={c.names ?? 'real'} onChange={(mode) => void g.run({ type: 'names.set', mode })}
              options={[{ v: 'real', label: S.namesReal }, { v: 'fictional', label: S.namesFictional }]} />
          )}
        </Panel>

        <Panel i={1} label={S.match}>
          <PanelHead title={S.match} />
          <div className="setrow"><span className="grow"><b>{S.sim}</b></span></div>
          <Seg label={S.sim} value={prefs.stop ?? 1} onChange={(stop) => onPrefs({ ...prefs, stop })}
            options={[{ v: 0, label: S.stopAll }, { v: 1, label: S.stopImportant }, { v: 2, label: S.stopBig }]} />
          <div className="setrow"><span className="grow"><b>{RF[g.ui].hlTitle}</b></span></div>
          <select className="sel" value={prefs.hl ?? 2} aria-label={RF[g.ui].hlTitle} onChange={(e) => onPrefs({ ...prefs, hl: +e.target.value as 0 | 1 | 2 | 3 | 4 })}>
            {RF[g.ui].hl.map((l, i) => <option key={l} value={i}>{l}</option>)}
          </select>
          <div className="setrow"><span className="grow"><b>{RF[g.ui].hlSpeed}</b></span></div>
          {/* The default match speed (the bar on the match screen goes finer): the nearest of slow, normal, fast. */}
          <Seg label={S.speed} value={([0, 1, 2] as const).reduce((b, i) => (Math.abs(RATES[i] - rateOf(prefs)) < Math.abs(RATES[b] - rateOf(prefs)) ? i : b), 1 as 0 | 1 | 2)} onChange={(pace) => onPrefs({ ...prefs, pace, rate: RATES[pace] })}
            options={RF[g.ui].speeds.map((l, i) => ({ v: i as 0 | 1 | 2, label: <span className="ltr">{l}</span> }))} />
          <div className="setrow">
            <span className="grow"><b>{S.sound}</b></span>
            <Switch on={sound} label={S.sound} onChange={(v) => { setSound(v); setSoundState(v); }} />
          </div>
          <div className="setrow">
            <span className="grow"><b>{S.balance}</b></span>
          </div>
          <Seg label={S.balance} value={b.difficulty} onChange={(difficulty) => void g.run({ type: 'balance.set', balance: { ...b, difficulty } })}
            options={([-1, 0, 1] as const).map((v) => ({ v, label: t.difficultyLv[v + 1] }))} />
          <p className="small muted">{S.motion}</p>
        </Panel>

        <Panel i={2} label={S.saves}>
          <PanelHead title={S.saves} right={<span className="tag">{`#${slot}`}</span>} />
          <div className="rows">
            <button className="row row--btn" onClick={() => void doExport()}>
              <I n="save" /><span className="grow"><span className="name">{S.export}</span><span className="sub">{S.exportSub}</span></span><I n="chev" size="sm" flip={g.rtl} />
            </button>
            <button className="row row--btn" onClick={() => file.current?.click()}>
              <I n="doc" /><span className="grow"><span className="name">{S.import}</span><span className="sub">{S.importSub}</span></span><I n="chev" size="sm" flip={g.rtl} />
            </button>
            <input ref={file} type="file" accept=".gaffer,.json,.txt,application/octet-stream" hidden
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void doImport(f); }} />
            <button className="row row--btn" onClick={onTitle}>
              <I n="back" flip={g.rtl} /><span className="grow"><span className="name">{S.menu}</span></span><I n="chev" size="sm" flip={g.rtl} />
            </button>
            <button className="row row--btn danger" onClick={() => setAsk(true)}>
              <I n="x" /><span className="grow"><span className="name">{S.reset}</span></span>
            </button>
          </div>
        </Panel>

        <Panel i={3} label={S.about}>
          <PanelHead title={S.about} />
          <div className="rows">
            <button className="row row--btn" onClick={() => setPage('how')}><I n="info" /><span className="grow"><span className="name">{S.howTo}</span></span><I n="chev" size="sm" flip={g.rtl} /></button>
            <button className="row row--btn" onClick={() => setPage('privacy')}><I n="lock" /><span className="grow"><span className="name">{S.privacy}</span></span><I n="chev" size="sm" flip={g.rtl} /></button>
          </div>
          <p className="small muted ltr-num">{S.version(VERSION, BUILD)}<br />{t.madeBy}</p>
          {real && <p className="small muted">{x.title.foot}</p>}
        </Panel>
      </div>

      {ask && (
        <Sheet label={S.resetAsk} onClose={() => setAsk(false)}>
          <h2 className="h2">{S.resetAsk}</h2>
          <p className="muted">{S.resetBody}</p>
          <div className="sheet-actions">
            <button className="btn btn--ghost" onClick={() => setAsk(false)}>{S.keep}</button>
            <button className="btn btn--danger" onClick={() => { setAsk(false); void onDelete(); }}>{S.del}</button>
          </div>
        </Sheet>
      )}
      {page && (
        <Sheet label={page === 'how' ? S.howTo : S.privacy} onClose={() => setPage(null)} wide>
          <h2 className="h2">{page === 'how' ? S.howTo : S.privacy}</h2>
          <ol className="textpage">
            {(page === 'how' ? t.howToBody : t.privacyBody).map(([h, p], i) => <li key={i}><b>{h}</b><p>{p}</p></li>)}
          </ol>
        </Sheet>
      )}
    </div>
  );
}
