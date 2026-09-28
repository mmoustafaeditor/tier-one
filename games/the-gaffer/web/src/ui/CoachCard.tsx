// Coach card: photo (optional), name, club, level, licence, reputation, record, trophies and world rank, as a PNG.
import { useEffect, useRef, useState } from 'react';
import type { Lang, Strings } from '../i18n';
import type { Career } from '../model/types';
import { countryOf, type World } from '../sim/world';
import { levelOf } from '../sim/coach';
import { myWorldRank } from '../sim/rankings';
import { loadPhoto, savePhoto } from '../sim/prefs';
import { COLORS, avatar, painter, photoFromFile, shareImage, slug } from './share';
import { Sheet } from './parts';

const H = 1350;

async function drawCard(w: World, c: Career, lang: Lang, t: Strings, photo: string, rtl: boolean) {
  const p = await painter(H, rtl);
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  const lg = w.leagues.find((l) => l.id === club.leagueId)!;
  const k = c.coach;
  const nations = [c.manager?.nationality, c.manager?.nationality2].map((n) => countryOf(w, n)).filter((x) => !!x);
  const start = rtl ? 1000 : 80, end = rtl ? 80 : 1000;
  // Header.
  p.text('The Gaffer', start, 110, { size: 44, weight: 800, color: COLORS.ACCENT });
  p.text(t.coachCardT, end, 110, { size: 34, weight: 700, color: COLORS.MUTED, align: 'end' });
  // Photo and name.
  const initials = c.managerName.split(/\s+/).map((s) => s[0] ?? '').join('').slice(0, 2).toUpperCase();
  await avatar(p, photo, initials, 540, 360, 170);
  p.text(c.managerName, 540, 630, { size: 96, weight: 800, align: 'center', max: 940 });
  const who = [...nations.map((n) => `${n.flag} ${n.name[lang]}`), c.manager?.age ? t.ageT(c.manager.age) : ''].filter(Boolean).join(' · ');
  p.text(who, 540, 690, { size: 38, weight: 500, font: 'body', color: COLORS.MUTED, align: 'center' });
  // Club.
  p.panel(80, 740, 920, 150);
  p.kit(rtl ? 870 : 110, 765, 100, club.colors);
  p.text(club.name[lang], rtl ? 840 : 240, 810, { size: 56, weight: 800, max: 600 });
  p.text(`${lg.name[lang]} · ${t.season(c.season)}`, rtl ? 840 : 240, 862, { size: 32, weight: 500, font: 'body', color: COLORS.MUTED, max: 600 });
  // Stats grid: 3 x 2.
  const rank = myWorldRank(w, c);
  const cells: [string, string][] = [
    [t.level, String(levelOf(k.xp))], [t.licence, k.licence], [t.reputation, String(Math.round(k.reputation))],
    [t.record, `${k.record[1]}-${k.record[2]}-${k.record[3]}`], [t.trophiesT, String(k.trophies.length)], [t.worldRankT, rank ? `#${rank}` : '—'],
  ];
  cells.forEach(([label, value], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const cx = 85 + (rtl ? 2 - col : col) * 310;
    const cy = 910 + row * 180;
    p.panel(cx, cy, 290, 160, 24);
    p.text(value, cx + 145, cy + 92, { size: 64, weight: 800, align: 'center', max: 260 });
    p.text(label, cx + 145, cy + 136, { size: 26, weight: 600, font: 'body', color: COLORS.MUTED, align: 'center', max: 260 });
  });
  // Footer.
  p.text('Semba Games', 540, H - 36, { size: 30, weight: 700, color: COLORS.MUTED, align: 'center' });
  return p.c;
}

export function CoachCard({ world, career, lang, t, onClose, toast }: {
  world: World; career: Career; lang: Lang; t: Strings; onClose: () => void; toast: (s: string) => void;
}) {
  const [photo, setPhoto] = useState(loadPhoto);
  const [url, setUrl] = useState('');
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const rtl = document.documentElement.dir === 'rtl';
  useEffect(() => {
    let live = true;
    drawCard(world, career, lang, t, photo, rtl).then((c) => { if (live) { canvas.current = c; setUrl(c.toDataURL('image/png')); } });
    return () => { live = false; };
  }, [world, career, lang, t, photo, rtl]);
  const name = `the-gaffer-coach-${slug(career.managerName)}-${career.season}.png`;
  const out = async (share: boolean) => {
    if (!canvas.current) return;
    const r = await shareImage(canvas.current, name, t.coachCardT, share);
    if (r === 'downloaded') toast(t.savedAs(name));
  };
  return (
    <Sheet label={t.coachCardT} onClose={onClose}>
      <h2 className="d3" style={{ margin: 'var(--s4) 0 var(--s3)' }}>{t.coachCardT}</h2>
      <div className="g-cardprev">{url ? <img src={url} alt={t.coachCardT} /> : <div className="g-cardwait" />}</div>
      <div className="g-cardbtns">
        <label className="btn ghost sm">
          {photo ? t.changePhoto : t.addPhoto}
          <input type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const d = await photoFromFile(f);
              if (!savePhoto(d)) toast(t.photoTooBig);
              setPhoto(d);
            } catch { toast(t.photoBad); }
            e.target.value = '';
          }} />
        </label>
        {photo && <button className="btn ghost sm" onClick={() => { savePhoto(''); setPhoto(''); }}>{t.removePhoto}</button>}
      </div>
      <div style={{ display: 'grid', gap: 'var(--s3)', marginTop: 'var(--s3)' }}>
        <button className="btn primary" disabled={!url} onClick={() => out(true)}>{t.shareT}</button>
        <button className="btn ghost" disabled={!url} onClick={() => out(false)}>{t.downloadPng}</button>
        <button className="btn ghost" onClick={onClose}>{t.close}</button>
      </div>
    </Sheet>
  );
}
