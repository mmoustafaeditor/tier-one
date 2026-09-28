// Name editor: any player or club can be renamed in English and Arabic (studio decision: near-real names + an in-game editor).
import { useState } from 'react';
import type { Strings } from '../i18n';
import type { LocalizedName } from '../model/types';
import type { World } from '../sim/world';
import { Sheet } from './parts';

export type NameTarget = { kind: 'player' | 'club'; id: string; name: LocalizedName; nick?: LocalizedName };

export function renameIn(w: World, target: NameTarget, name: LocalizedName, nick?: LocalizedName): World {
  const clean = { en: name.en.trim().slice(0, 40) || target.name.en, ar: name.ar.trim().slice(0, 40) || target.name.ar };
  const n = nick && (nick.en.trim() || nick.ar.trim()) ? { en: nick.en.trim().slice(0, 30), ar: nick.ar.trim().slice(0, 30) } : undefined;
  return target.kind === 'player'
    ? { ...w, players: w.players.map((p) => (p.id === target.id ? { ...p, name: clean, nick: n } : p)) }
    : { ...w, clubs: w.clubs.map((c) => (c.id === target.id ? { ...c, name: clean } : c)) };
}

export function EditName({ target, t, onClose, onSave }: { target: NameTarget; t: Strings; onClose: () => void; onSave: (n: LocalizedName, nick?: LocalizedName) => void }) {
  const [en, setEn] = useState(target.name.en);
  const [ar, setAr] = useState(target.name.ar);
  const [nen, setNen] = useState(target.nick?.en ?? '');
  const [nar, setNar] = useState(target.nick?.ar ?? '');
  return (
    <Sheet label={t.editName} onClose={onClose}>
      <h2 className="d3" style={{ margin: 'var(--s4) 0 var(--s3)' }}>{t.editName}</h2>
      <div className="g-form">
        <label><span className="over">{t.nameEn}</span><input className="g-input" dir="ltr" value={en} maxLength={40} onChange={(e) => setEn(e.target.value)} /></label>
        <label><span className="over">{t.nameAr}</span><input className="g-input" dir="rtl" value={ar} maxLength={40} onChange={(e) => setAr(e.target.value)} /></label>
        {target.kind === 'player' && (
          <div className="g-filters">
            <label><span className="over">{t.nicknameT} (EN)</span><input className="g-input" dir="ltr" value={nen} maxLength={30} onChange={(e) => setNen(e.target.value)} /></label>
            <label><span className="over">{t.nicknameT} (ع)</span><input className="g-input" dir="rtl" value={nar} maxLength={30} onChange={(e) => setNar(e.target.value)} /></label>
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gap: 'var(--s3)', marginTop: 'var(--s4)' }}>
        <button className="btn primary" disabled={!en.trim() && !ar.trim()} onClick={() => onSave({ en, ar }, { en: nen, ar: nar })}>{t.save}</button>
        <button className="btn ghost" onClick={onClose}>{t.cancel}</button>
      </div>
    </Sheet>
  );
}
