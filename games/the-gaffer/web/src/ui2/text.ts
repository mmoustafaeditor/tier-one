// Messages, news, staff-log lines and staff names in the reader's language.
import { anyPlayer } from '../sim/youth';
import type { Lang, Strings } from '../i18n';
import type { XStrings } from '../lang-v2';
import type { Career, Msg, NewsItem, PrepFocus, StaffLog } from '../model/types';
import { money, type World } from '../sim/world';
import { fmt, type FormationId } from '../sim/tactics';
import { isRoom, roomLog, roomMsg, roomNews } from './roomText';
import { UI, type UiLang } from '../i18n';
import { Y } from '../lang-youth-all';
import { X } from '../lang-v2-all';

export function newsText(t: Strings, lang: Lang, w: World, c: Career, n: NewsItem): [string, string] {
  if (isRoom(n.key)) return roomNews(t, lang, w, n);
  const club = (id?: string) => (id ? w.clubs.find((x) => x.id === id)?.name[lang] ?? '' : '');
  const player = n.player ? (anyPlayer(w, n.player)?.name ?? n.pn)?.[lang] ?? '' : '';
  const s = n.key === 'cupFinal' ? c.cups[n.s ?? '']?.name[lang] ?? '' : ['aiTransfer', 'userSign', 'userSell'].includes(n.key) ? money(Number(n.s)) : n.s ?? '';
  if (n.key.startsWith('y_')) return youthNews(uiOf(t), lang, n, club, player);
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
  if (isRoom(m.key)) return roomMsg(t, lang, w, m);
  const club = m.club ? w.clubs.find((x) => x.id === m.club)?.name[lang] ?? '' : '';
  const player = m.player ? (anyPlayer(w, m.player)?.name ?? m.pn)?.[lang] ?? '' : '';
  let s = m.s ?? '';
  if (m.key === 'milestone') s = t.msNames[s] ?? s;
  if (m.key === 'course') s = t.courseNames[s] ?? s;
  if (m.kind === 'cup') s = c.cups[s]?.name[lang] ?? s;
  if (m.key.startsWith('y_')) return youthMsg(uiOf(t), lang, m, club, player);
  const f = t.msg[m.key];
  const [a, b] = f ? f({ club, player, n: m.n ?? 0, s }) : [m.key, ''];
  return [a, b];
}

export function logText(t: Strings, x: XStrings, lang: Lang, w: World, l: StaffLog): string {
  const club = l.s ? w.clubs.find((c) => c.id === l.s)?.name[lang] ?? '' : '';
  if (isRoom(l.key)) return roomLog(t, l.key, l.pn?.[lang] ?? '');
  const k = `${l.duty}:${l.key}`;
  if (k === 'training:focus') return x.log[k](x.train.focusNames[l.s as PrepFocus] ?? l.s ?? '');
  if (k === 'tactics:plan') return x.log[k](x.tac.styles[l.s as keyof typeof x.tac.styles] ?? l.s ?? '');
  if (k === 'tactics:formation') return x.log[k](fmt((l.s ?? '4-3-3') as FormationId));
  if (k === 'tactics:mentality') return x.log[k]();
  if (k === 'scouting:report') return x.log[k](club);
  if (k === 'morale:talk') return x.log[k](l.n ?? 0);
  if (Y_OF(x).log[k]) return Y_OF(x).log[k](l.pn?.[lang] ?? '', k === 'academy:y_loan' ? club : l.n ?? 0);
  const f = t.staffLog[k];
  if (!f) return '';
  return f({ pn: l.pn?.[lang] ?? '', n: l.n ?? 0, s: l.s ?? '', club, money });
}

// ---------- v2.6 training & pathway (copy in lang-youth*.ts) ----------
// News and inbox lines are keyed 'y_…'. Positions and the intake tier are stored as codes and written out here.
const Y_OF = (x: XStrings) => Y[(Object.entries(X).find(([, v]) => v === x)?.[0] ?? 'en') as UiLang];
const uiOf = (t: Strings) => (Object.entries(UI).find(([, v]) => v === t)?.[0] ?? 'en') as UiLang;
const yPos = (ui: UiLang, s?: string) => (s ? (X[ui].common.posLong as Record<string, string>)[s] ?? s : '');
function youthNews(ui: UiLang, lang: Lang, n: NewsItem, club: (id?: string) => string, player: string): [string, string] {
  const Yx = Y[ui], f = Yx.news[n.key];
  if (!f) return [n.key, ''];
  const pn = player || n.pn?.[lang] || '';
  const tier = Yx.tiers[n.n ?? 1] ?? '';
  switch (n.key) {
    case 'y_preview': return f(club(n.club), yPos(ui, n.s), tier);
    case 'y_intake': return f(club(n.club), n.n ?? 0, pn, yPos(ui, n.s));
    case 'y_rivalGem': return f(club(n.club), pn, yPos(ui, n.s), tier);
    case 'y_breakthrough': return f(pn, club(n.club), String(n.n ?? ''));
    default: return f(pn, club(n.club));
  }
}
function youthMsg(ui: UiLang, lang: Lang, m: Msg, club: string, player: string): [string, string] {
  const Yx = Y[ui], f = Yx.msg[m.key];
  if (!f) return [m.key, ''];
  const pn = player || m.pn?.[lang] || '';
  switch (m.key) {
    case 'y_preview': return f(pn, yPos(ui, m.s), Yx.tiers[m.n ?? 1] ?? '');
    case 'y_learned': return f(pn, yPos(ui, m.s));
    case 'y_reinjured': return f(pn, m.n ?? 0);
    case 'y_loanReport': return f(pn, m.n ?? 0, m.s ?? '0', club);
    case 'y_devGone': return f(m.n ?? 0);
    default: return f(pn);
  }
}
