// Full-time card: what the result changed, in one short sheet.
import type { Lang, Strings } from '../i18n';
import type { World } from '../sim/world';
import type { Aftermath } from '../sim/aftermath';
import { Kit } from '../components/Kit';
import { Sheet } from './parts';

const delta = (a: number, b: number) => { const d = Math.round(b - a); return d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : '±0'; };

export function FullTime({ a, world, lang, t, onClose }: { a: Aftermath; world: World; lang: Lang; t: Strings; onClose: () => void }) {
  const opp = world.clubs.find((c) => c.id === a.opp);
  return (
    <Sheet label={t.ftTitle[a.res]} onClose={onClose}>
      <div className={`g-ft g-ft-${a.res}`}>
        <span className="over">{t.ftSub}</span>
        <h2 className="d2" style={{ margin: 'var(--s2) 0' }}>{t.ftTitle[a.res]} <span className="num ltr">{a.mine}–{a.theirs}</span>{a.pens ? <small className="num ltr"> ({a.pens[0]}–{a.pens[1]})</small> : null}</h2>
        {opp && <span className="chip"><Kit colors={opp.colors} size="xs" /> {t.vs} {opp.name[lang]} · {a.home ? t.home : t.away}</span>}
      </div>
      <div className="list" style={{ margin: 'var(--s4) 0' }}>
        {a.motm && (
          <div className="cell g-row"><span className="cmain"><span>{t.motm}</span><b>⭐ {a.motm.pn[lang]}</b></span><span className="g-rating num">{a.motm.rating.toFixed(1)}</span></div>
        )}
        {a.pos && a.pos[1] > 0 && (
          <div className="cell g-row"><span className="cmain"><span>{t.ftPos}</span><b className="num">{a.pos[0] ? `${t.ordinal(a.pos[0])} → ` : ''}{t.ordinal(a.pos[1])}</b></span>
            {a.pos[0] > 0 && a.pos[0] !== a.pos[1] && <span className={`tag ${a.pos[1] < a.pos[0] ? 'g-up' : 'g-down'}`}>{a.pos[1] < a.pos[0] ? '▲' : '▼'} {Math.abs(a.pos[0] - a.pos[1])}</span>}</div>
        )}
        <div className="cell g-row"><span className="cmain"><span>{t.ftBoard}</span><b className="num">{Math.round(a.board[1])}</b></span><span className={`num ${a.board[1] >= a.board[0] ? 'g-ok' : 'g-bad'}`}>{delta(a.board[0], a.board[1])}</span></div>
        <div className="cell g-row"><span className="cmain"><span>{t.ftFans}</span><b className="num">{Math.round(a.fans[1])}</b></span><span className={`num ${a.fans[1] >= a.fans[0] ? 'g-ok' : 'g-bad'}`}>{delta(a.fans[0], a.fans[1])}</span></div>
        {a.dev > 0 && <div className="cell g-row"><span className="cmain"><span>{t.ftDev}</span></span><b className="num g-ok">+{a.dev}</b></div>}
        {a.out.map((o, i) => <div key={i} className="cell g-row"><span className="cmain"><b className="g-bad">{o.ban ? t.ftBan(o.pn[lang]) : t.ftOut(o.pn[lang], o.n)}</b></span></div>)}
        {a.records.map((r) => <div key={r} className="cell g-row"><span className="cmain"><span>{t.ftRecord}</span><b>{t.recordNames[r]}</b></span></div>)}
        {a.milestones.map((m) => <div key={m} className="cell g-row"><span className="cmain"><span>{t.ftMilestone}</span><b>🏅 {t.msNames[m] ?? m}</b></span></div>)}
      </div>
      <button className="btn primary" style={{ width: '100%' }} onClick={onClose}>{t.ftContinue}</button>
    </Sheet>
  );
}
