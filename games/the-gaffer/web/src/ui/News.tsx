// The newspaper: stories from what happened, by category, never repeated (E2E #59).
import { useState } from 'react';
import type { Lang, Strings } from '../i18n';
import type { Career, NewsCat, NewsItem } from '../model/types';
import { money, playerOf, type World } from '../sim/world';
import { AppBar, Empty } from './parts';
import { shareText } from './share';

export function newsText(t: Strings, lang: Lang, w: World, c: Career, n: NewsItem): [string, string] {
  const club = (id?: string) => (id ? w.clubs.find((x) => x.id === id)?.name[lang] ?? '' : '');
  const player = n.player ? (playerOf(w, n.player)?.name ?? n.pn)?.[lang] ?? '' : '';
  const s = n.key === 'cupFinal' ? c.cups[n.s ?? '']?.name[lang] ?? '' : ['aiTransfer', 'userSign', 'userSell'].includes(n.key) ? money(Number(n.s)) : n.s ?? '';
  const f = t.news[n.key];
  if (!f) return [n.key, ''];
  const args: Record<string, string[]> = {
    thrash: [club(n.club), club(n.club2), s], newLeader: [club(n.club)], goals: [player, club(n.club), String(n.n)], crisis: [club(n.club)],
    debut: [player, club(n.club)], promoted: [player, club(n.club)], cupFinal: [club(n.club), club(n.club2), s],
    rumour: [player, club(n.club), club(n.club2), String(n.n)], aiTransfer: [player, club(n.club), club(n.club2), s],
    userSign: [player, club(n.club), club(n.club2), s], userSell: [player, club(n.club), club(n.club2), s],
    appointed: [club(n.club), s], sacked: [club(n.club), s],
  };
  const [a, b] = f(...(args[n.key] ?? []));
  return [a, b];
}

const CATS: ('all' | NewsCat)[] = ['all', 'results', 'transfers', 'managers', 'youth', 'records', 'crisis'];

export function News({ world, career, lang, t, onBack, onToast }: { world: World; career: Career; lang: Lang; t: Strings; onBack: () => void; onToast: (s: string) => void }) {
  const [cat, setCat] = useState<'all' | NewsCat>('all');
  const list = (career.news ?? []).filter((n) => cat === 'all' || n.cat === cat);
  return (
    <>
      <AppBar back={onBack} backLabel={t.back} title={t.newsT} sub={t.season(career.season)} />
      <div className="g-chips">
        {CATS.filter((k) => k === 'all' || (career.news ?? []).some((n) => n.cat === k)).map((k) => (
          <button key={k} className={`chip g-toggle${cat === k ? ' on' : ''}`} onClick={() => setCat(k)}>{t.newsCats[k]}</button>
        ))}
      </div>
      {!list.length ? <Empty text={t.noNews} /> : (
        <div style={{ display: 'grid', gap: 'var(--s3)', marginTop: 'var(--s3)' }}>
          {list.map((n) => {
            const [head, body] = newsText(t, lang, world, career, n);
            return (
              <article key={n.id} className="card g-news">
                <small className="over">{t.newsCats[n.cat]} · {t.matchday(n.round + 1)}</small>
                <b>{head}</b>
                <span className="muted">{body}</span>
                <button className="btn ghost sm g-newsshare" onClick={async () => {
                  const r = await shareText(`${head}\n${body}\n— The Gaffer`);
                  if (r === 'copied') onToast(t.copied);
                }}>{t.shareT}</button>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
