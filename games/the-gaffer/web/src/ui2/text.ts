// Messages, news, staff-log lines and staff names in the reader's language.
import type { Lang, Strings } from '../i18n';
import type { XStrings } from '../lang-v2';
import type { Career, Msg, NewsItem, PrepFocus, StaffLog } from '../model/types';
import { money, playerOf, type World } from '../sim/world';
import { fmt, type FormationId } from '../sim/tactics';
import { rcLog, rcMsg, rcNews, uiOf } from './recruitText';

export function newsText(t: Strings, lang: Lang, w: World, c: Career, n: NewsItem): [string, string] {
  if (n.key.startsWith('rc.')) return rcNews(uiOf(t), lang, w, n); // v2.5 recruitment
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

export function msgText(t: Strings, lang: Lang, w: World, c: Career, m: Msg): [string, string] {
  if (m.key.startsWith('rc.')) return rcMsg(uiOf(t), lang, w, m); // v2.5 recruitment
  const club = m.club ? w.clubs.find((x) => x.id === m.club)?.name[lang] ?? '' : '';
  const player = m.player ? (playerOf(w, m.player)?.name ?? m.pn)?.[lang] ?? '' : '';
  let s = m.s ?? '';
  if (m.key === 'milestone') s = t.msNames[s] ?? s;
  if (m.key === 'course') s = t.courseNames[s] ?? s;
  if (m.kind === 'cup') s = c.cups[s]?.name[lang] ?? s;
  const f = t.msg[m.key];
  const [a, b] = f ? f({ club, player, n: m.n ?? 0, s }) : [m.key, ''];
  return [a, b];
}

export function logText(t: Strings, x: XStrings, lang: Lang, w: World, l: StaffLog): string {
  const club = l.s ? w.clubs.find((c) => c.id === l.s)?.name[lang] ?? '' : '';
  if (l.key.startsWith('rc')) return rcLog(uiOf(t), lang, l); // v2.5 recruitment
  const k = `${l.duty}:${l.key}`;
  if (k === 'training:focus') return x.log[k](x.train.focusNames[l.s as PrepFocus] ?? l.s ?? '');
  if (k === 'tactics:plan') return x.log[k](x.tac.styles[l.s as keyof typeof x.tac.styles] ?? l.s ?? '');
  if (k === 'tactics:formation') return x.log[k](fmt((l.s ?? '4-3-3') as FormationId));
  if (k === 'tactics:mentality') return x.log[k]();
  if (k === 'scouting:report') return x.log[k](club);
  if (k === 'morale:talk') return x.log[k](l.n ?? 0);
  const f = t.staffLog[k];
  if (!f) return '';
  return f({ pn: l.pn?.[lang] ?? '', n: l.n ?? 0, s: l.s ?? '', club, money });
}
