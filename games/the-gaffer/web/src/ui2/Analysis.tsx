// Post-match analysis (like FM's Analysis screen): chances (a shot map and where they came from), territory (where the
// ball was, possession, entries into the final third, build-up, high turnovers, counters) and each of our players'
// involvement. Everything comes from what the engine recorded (sim/analysis.ts); nothing is invented for the picture.
import { useState } from 'react';
import type { Aftermath } from '../sim/aftermath';
import { SOURCES, sourcesOf, type Analysis as Ana } from '../sim/analysis';
import { AN } from '../lang-ana';
import { Panel, PanelHead } from './shell';
import { useGame, clubOf, cn } from './game';

const L = 105, W = 68;
// A fixed scatter inside a zone, so the same shot always sits in the same place.
const jit = (i: number, k: number) => { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };
// Absolute zone → the drawing, with us attacking left to right.
function cellOf(z: number, me: 0 | 1) {
  const col = Math.floor(z / 5), row = z % 5;
  return me === 0 ? { col, row } : { col: 5 - col, row: 4 - row };
}

function PitchLines() {
  return (
    <g className="an-lines" fill="none">
      <rect x="0.5" y="0.5" width={L - 1} height={W - 1} />
      <path d={`M${L / 2} 0.5V${W - 0.5}`} />
      <circle cx={L / 2} cy={W / 2} r="9.15" />
      <rect x="0.5" y={W / 2 - 20.15} width="16.5" height="40.3" />
      <rect x={L - 17} y={W / 2 - 20.15} width="16.5" height="40.3" />
      <rect x="0.5" y={W / 2 - 9.15} width="5.5" height="18.3" />
      <rect x={L - 6} y={W / 2 - 9.15} width="5.5" height="18.3" />
    </g>
  );
}

function Heat({ vals, me, them }: { vals: number[]; me: 0 | 1; them?: boolean }) {
  const max = Math.max(0.0001, ...vals);
  return (
    <g>
      {vals.map((v, z) => {
        if (!v) return null;
        const { col, row } = cellOf(z, me);
        return <rect key={z} x={(col * L) / 6} y={(row * W) / 5} width={L / 6} height={W / 5} className={them ? 'an-heat them' : 'an-heat'} style={{ opacity: 0.12 + 0.75 * (v / max) }} />;
      })}
    </g>
  );
}

export function Analysis({ a }: { a: Aftermath }) {
  const g = useGame();
  const { w, c, lang } = g;
  const T = AN[g.ui];
  const [tab, setTab] = useState(0);
  const [side, setSide] = useState<0 | 1 | 2>(2); // 0 us, 1 them, 2 both
  // The player shown first: the most involved of ours (the top rating is often the keeper, with little on the map).
  const busiest = [...a.ratings].sort((p, q) => involvement(a.ana?.players[q.id]) - involvement(a.ana?.players[p.id]))[0];
  const [pid, setPid] = useState<string>(busiest?.id ?? a.ratings[0]?.id ?? '');
  const ana = a.ana as Ana;
  const me = ana.me, them = (1 - me) as 0 | 1;
  const us = clubOf(w, c.clubId)!, opp = clubOf(w, a.opp)!;
  const sideOf = (s: 0 | 1) => (s === me ? 0 : 1); // 0 us, 1 them
  const shown = ana.shots.filter((s) => side === 2 || sideOf(s.side) === side);
  const tot = (s: 0 | 1) => {
    const xs = ana.shots.filter((x) => x.side === s);
    return { n: xs.length, on: xs.filter((x) => x.res === 'g' || x.res === 'v').length, big: xs.filter((x) => x.xg >= 0.25).length, xg: xs.reduce((t, x) => t + x.xg, 0) };
  };
  const pct = (x: number, y: number) => Math.round((100 * x) / Math.max(1, x + y));

  return (
    <Panel className="g-ana" i={5} label={T.title}>
      <PanelHead title={T.title} />
      <div className="chips">{T.tabs.map((l, i) => <button key={l} className="chip" aria-pressed={tab === i} onClick={() => setTab(i)}>{l}</button>)}</div>

      {tab === 0 && (
        <>
          <div className="chips an-side">
            {[T.us, T.them, `${T.us} + ${T.them}`].map((l, i) => <button key={l} className="chip" aria-pressed={side === i} onClick={() => setSide(i as 0 | 1 | 2)}>{l}</button>)}
          </div>
          <svg className="an-pitch" viewBox={`-1 -1 ${L + 2} ${W + 2}`} role="img" aria-label={T.mapNote}>
            <PitchLines />
            {shown.map((s) => {
              const { col, row } = cellOf(s.z, me);
              const x = ((col + 0.15 + 0.7 * jit(s.i, 1)) * L) / 6, y = ((row + 0.15 + 0.7 * jit(s.i, 2)) * W) / 5;
              const mine = s.side === me;
              return <circle key={s.i} cx={x} cy={y} r={1 + 6 * Math.sqrt(s.xg)} className={`an-shot${mine ? '' : ' them'}${s.res === 'g' ? ' goal' : ''}`}><title>{`${s.min}′ · ${T.how[s.how] ?? s.how} · ${T.res[s.res]} · ${T.xg} ${s.xg.toFixed(2)}`}</title></circle>;
            })}
          </svg>
          <p className="small muted">{T.mapNote}</p>
          <div className="an-tot">
            {([me, them] as const).map((s) => { const t = tot(s); return (
              <div key={s} className={s === me ? 'us' : 'them'}>
                <b>{cn(s === me ? us : opp, lang)}</b>
                <span>{T.shots(t.n)} · {T.onTarget(t.on)} · {T.big(t.big)}</span>
                <span className="ltr">{T.xg} {t.xg.toFixed(2)}</span>
              </div>
            ); })}
          </div>
          <h3 className="h3">{T.sources}</h3>
          {([me, them] as const).map((s) => {
            const rows = sourcesOf(ana, s);
            const max = Math.max(0.01, ...rows.map((r) => r.xg));
            return (
              <div key={s} className="an-src">
                <b>{cn(s === me ? us : opp, lang)}</b>
                {!rows.length && <p className="small muted">{T.none}</p>}
                {rows.map((r) => (
                  <div key={r.how} className="an-bar">
                    <span>{T.how[r.how] ?? r.how} <small className="muted">· {SOURCES[r.how] === 'set' ? T.set : T.open_}</small></span>
                    <i className={s === me ? '' : 'them'} style={{ width: `${Math.max(4, (100 * r.xg) / max)}%` }} />
                    <span className="ltr">{r.n} · {r.xg.toFixed(2)}{r.goals ? ` · ${r.goals}⚽` : ''}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </>
      )}

      {tab === 1 && (
        <>
          <h3 className="h3">{T.where}</h3>
          <svg className="an-pitch" viewBox={`-1 -1 ${L + 2} ${W + 2}`} role="img" aria-label={T.whereNote}>
            <Thirds cols={Array.from({ length: 6 }, (_, col) => [0, 1, 2, 3, 4].reduce((t, row) => t + (ana.zone[col * 5 + row] ?? 0) + (ana.zone[30 + col * 5 + row] ?? 0), 0))} me={me} />
            <PitchLines />
          </svg>
          <p className="small muted">{T.whereNote}</p>
          <div className="an-stats">
            {/* Which number is whose: ours on the leading side of every row, theirs on the far side. */}
            <div className="between small"><b>{cn(us, lang)}</b><b>{cn(opp, lang)}</b></div>
            <Stat l={T.poss} a={pct(ana.poss[me], ana.poss[them])} b={pct(ana.poss[them], ana.poss[me])} unit="%" />
            {[0, 1, 2].map((ln) => <Stat key={ln} l={`${T.entries} · ${T.lanes[ln]}`} a={ana.ent[me * 3 + ln]} b={ana.ent[them * 3 + ln]} />)}
            <Stat l={T.build} a={ana.bu[me * 2]} b={ana.bu[them * 2]} sub={[T.of(ana.bu[me * 2], ana.bu[me * 2 + 1]), T.of(ana.bu[them * 2], ana.bu[them * 2 + 1])]} />
            <Stat l={T.prog} a={ana.mid[me * 2]} b={ana.mid[them * 2]} sub={[T.of(ana.mid[me * 2], ana.mid[me * 2 + 1]), T.of(ana.mid[them * 2], ana.mid[them * 2 + 1])]} />
            <Stat l={T.high} a={ana.hi[me]} b={ana.hi[them]} />
            <Stat l={T.counters} a={ana.ctr[me]} b={ana.ctr[them]} />
          </div>
        </>
      )}

      {tab === 2 && (
        <>
          <label className="an-pick">{T.pick}
            <select className="sel" value={pid} onChange={(e) => setPid(e.target.value)}>
              {a.ratings.map((r) => <option key={r.id} value={r.id}>{r.num} · {r.pn[lang]} · {r.rating.toFixed(1)}</option>)}
            </select>
          </label>
          {(() => {
            const p = ana.players[pid];
            const r = a.ratings.find((x) => x.id === pid);
            return (
              <>
                <svg className="an-pitch" viewBox={`-1 -1 ${L + 2} ${W + 2}`} role="img" aria-label={T.heat}>
                  {p && <Heat vals={p.z} me={me} />}
                  <PitchLines />
                </svg>
                <p className="small muted">{T.heat}</p>
                <div className="an-kv">
                  <span>{T.duels}<b>{p ? T.of(p.won, p.won + p.lost) : '–'}</b></span>
                  <span>{T.shots(p?.shots ?? 0)}<b className="ltr">{T.xg} {(p?.xg ?? 0).toFixed(2)}</b></span>
                  <span>{T.goals}<b>{p?.goals ?? 0}</b></span>
                  <span>{T.assists}<b>{p?.assists ?? 0}</b></span>
                  <span>{T.fouls}<b>{p?.fouls ?? 0}</b></span>
                  {!!p?.saves && <span>{T.saves}<b>{p.saves}</b></span>}
                  <span>{T.rating}<b>{r ? r.rating.toFixed(1) : '–'}</b></span>
                </div>
              </>
            );
          })()}
          <p className="small muted">{T.noPass}</p>
        </>
      )}
    </Panel>
  );
}

const involvement = (p?: { won: number; lost: number; shots: number; fouls: number; saves: number }) => (p ? p.won + p.lost + 2 * p.shots + p.fouls + p.saves : 0);

// Where the ball was: the engine keeps its time by the length of the pitch (six bands), not across it.
function Thirds({ cols, me }: { cols: number[]; me: 0 | 1 }) {
  const max = Math.max(0.0001, ...cols);
  return <g>{cols.map((v, col) => { const x = me === 0 ? col : 5 - col; return v ? <rect key={col} x={(x * L) / 6} y="0" width={L / 6} height={W} className="an-heat" style={{ opacity: 0.1 + 0.7 * (v / max) }} /> : null; })}</g>;
}

function Stat({ l, a, b, unit = '', sub }: { l: string; a: number; b: number; unit?: string; sub?: [string, string] }) {
  const t = Math.max(1, a + b);
  return (
    <div className="an-stat">
      <div className="between"><b className="ltr">{a}{unit}</b><span>{l}</span><b className="ltr">{b}{unit}</b></div>
      <div className="an-split"><i style={{ width: `${(100 * a) / t}%` }} /><i className="them" style={{ width: `${(100 * b) / t}%` }} /></div>
      {sub && <div className="between small muted"><span>{sub[0]}</span><span>{sub[1]}</span></div>}
    </div>
  );
}
