// Recruitment's lines in the reader's language: Today cards, news, inbox, the staff log, refusals and toasts.
// The shared text helpers (Decisions.tsx, text.ts, App.tsx) hand any key starting with `rc.` (or `ask_rc…`) here.
import { UI, type Lang, type Strings, type UiLang } from '../i18n';
import { R } from '../lang-recruit-all';
import { X } from '../lang-v2-all';
import type { Career, LocalizedName, Msg, NewsItem, StaffLog } from '../model/types';
import type { Choice, Fx, Ref } from '../sim/decisions';
import { dateOf, dayName } from '../sim/calendar';
import { money, playerOf, type World } from '../sim/world';

export const uiOf = (t: Strings): UiLang => (Object.keys(UI) as UiLang[]).find((k) => UI[k] === t) ?? 'en';
const nameOf = (pn: LocalizedName | undefined, lang: Lang) => (pn ? pn[lang] || pn.en : '');
const clubName = (w: World, id: string | undefined, lang: Lang) => (id ? w.clubs.find((x) => x.id === id)?.name[lang] ?? '' : '');

// "By Friday": the day before the matchday a deadline falls on.
export function byDay(ui: UiLang, tick: number): string {
  const season = Math.floor(tick / 100), round = tick % 100;
  const d = new Date(dateOf(season, round).getTime() - 86400000);
  return dayName(d, ui);
}

interface G { w: World; c: Career; ui: UiLang; lang: Lang }

export function rcTitle(g: G, r: Ref): string {
  const D = R[g.ui].dec;
  const pn = nameOf(r.pn, g.lang), club = clubName(g.w, r.club, g.lang), v = money(r.n ?? 0);
  switch (r.key) {
    case 'rc.rival': return D.rival(pn, club, v, byDay(g.ui, Number(r.s)));
    case 'rc.counter': return D.counter(pn, club, v);
    case 'rc.rejected': return D.rejected(pn, club, v);
    case 'rc.insulted': return D.insulted(pn, club);
    case 'rc.agreed': return D.agreed(pn, byDay(g.ui, Number(r.s)));
    case 'rc.agentDue': return D.agentDue(pn, byDay(g.ui, Number(r.s)));
    case 'rc.clauseRisk': return D.clauseRisk(pn, club, r.n ?? 1);
    case 'rc.recallQ': return D.recallQ(pn, club);
    case 'rc.rivalBid': return D.rivalBid(pn, club, v, r.s ? R[g.ui].aiWhy[r.s] ?? '' : '');
    case 'ask_rcbid': return D.askBid(pn, v);
    default: return r.key;
  }
}

export function rcAdvice(g: G, r: Ref): string {
  const A = R[g.ui].adv;
  const v = money(r.n ?? 0);
  switch (r.key) {
    case 'rc.adv.top': return A.top(v);
    case 'rc.adv.letGo': return A.letGo;
    case 'rc.adv.pay': return A.pay(v);
    case 'rc.adv.walk': return A.walk(v);
    case 'rc.adv.rejected': return A.rejected(r.n ?? 0);
    case 'rc.adv.meet': return A.meet(v);
    case 'rc.adv.counter': return A.counter;
    case 'rc.adv.talk': return A.talk;
    case 'rc.adv.clause': return A.clause(clubName(g.w, r.club, g.lang));
    case 'rc.adv.recall': return A.recall;
    case 'why_rcbid': return A.bid(v);
    default: return '';
  }
}

export function rcChoice(g: G, ch: Choice): string {
  const C = R[g.ui].choice;
  const v = money(ch.n ?? 0);
  switch (ch.key) {
    case 'rc.top': return C.top(v);
    case 'rc.pay': return C.pay(v);
    case 'rc.letGo': return C.letGo;
    case 'rc.improve': return C.improve;
    case 'rc.walk': return C.walk;
    case 'rc.meet': return C.meet;
    case 'rc.takeCounter': return C.takeCounter;
    case 'rc.talk': return C.talk;
    case 'rc.playHim': return C.playHim;
    case 'rc.riskIt': return C.riskIt;
    case 'rc.recall': return C.recall;
    case 'rc.leave': return C.leave;
    default: return ch.key;
  }
}

export function rcFx(g: G, f: Fx): string {
  const F = R[g.ui].fx;
  switch (f.key) {
    case 'rc.fx.room': return F.room(money(f.n ?? 0));
    case 'rc.fx.fees': return F.fees(money(f.n ?? 0));
    case 'rc.fx.patience': return F.patience(f.n ?? 0);
    case 'rc.fx.rounds': return F.rounds(f.n ?? 0);
    case 'rc.fx.noDeal': return F.noDeal;
    case 'rc.fx.rivalGets': return F.rivalGets;
    case 'rc.fx.parentHappy': return F.parentHappy;
    case 'rc.fx.parentAngry': return F.parentAngry;
    case 'rc.fx.back': return F.back;
    case 'rc.fx.benchWarm': return F.benchWarm;
    default: return f.key;
  }
}

export function rcNews(ui: UiLang, lang: Lang, w: World, n: NewsItem): [string, string] {
  const N = R[ui].news;
  const pn = n.player ? (playerOf(w, n.player)?.name ?? n.pn)?.[lang] ?? '' : nameOf(n.pn, lang);
  const club = clubName(w, n.club, lang), club2 = clubName(w, n.club2, lang) || R[ui].free, v = n.n ? money(n.n) : '';
  switch (n.key) {
    case 'rc.bid': return N.bid(pn, club, club2, v);
    case 'rc.agreed': return N.agreed(pn, club, club2, v);
    case 'rc.done': return N.done(pn, club, club2, v);
    case 'rc.walk': return N.walk(pn, club);
    case 'rc.hijack': return N.hijack(pn, club, club2, v);
    case 'rc.aiBid': return N.aiBid(pn, club, v, N.aiWhy[n.s ?? 'need'] ?? '');
    case 'rc.release': return N.release(pn, club, club2, v);
    case 'rc.loanIn': return N.loanIn(pn, club, club2);
    default: return [n.key, ''];
  }
}

export function rcMsg(ui: UiLang, lang: Lang, w: World, m: Msg): [string, string] {
  const M = R[ui].msg;
  const pn = m.player ? (playerOf(w, m.player)?.name ?? m.pn)?.[lang] ?? '' : nameOf(m.pn, lang);
  const club = clubName(w, m.club, lang), v = money(m.n ?? 0);
  switch (m.key) {
    case 'rc.answer': return M.answer(pn, club, m.s ?? '', v);
    case 'rc.hijack': return M.hijack(pn, club, v);
    case 'rc.rival': return M.rival(pn, club, v);
    case 'rc.release': return M.release(pn, club, v);
    case 'rc.instalments': return M.instalments(v, Number(m.s ?? 1));
    case 'rc.picks': return M.picks(pn, m.n ?? 0, X[ui].common.posLong[m.s ?? 'ST'] ?? m.s ?? '');
    case 'rc.loanReport': { const [goals, days] = (m.s ?? '0|1').split('|').map(Number); return M.loanReport(pn, club, m.n ?? 0, goals || 0, days || 1); }
    case 'rc.loanBrokenIn': return M.brokenIn(pn, club);
    case 'rc.loanBrokenOut': return M.brokenOut(pn, club);
    case 'rc.takenBack': return M.takenBack(pn, club);
    case 'rc.sellOn': return M.sellOn(pn, club, v);
    default: return [m.key, ''];
  }
}

export function rcLog(ui: UiLang, lang: Lang, l: StaffLog): string {
  const f = R[ui].log[l.key];
  return f ? f(nameOf(l.pn, lang), money(l.n ?? 0)) : '';
}

export const rcReason = (ui: UiLang, reason: string): string | undefined => R[ui].no[reason];
export const rcLedger = (ui: UiLang, key: string): string | undefined => R[ui].ledger[key];

export function rcNote(ui: UiLang, key: string, pn: string): string {
  const N = R[ui].note;
  switch (key) {
    case 'rc.bidSent': return N.bidSent(pn);
    case 'rc.talks': return N.talks(pn);
    case 'rc.agreed': return N.agreed(pn);
    case 'rc.assigned': return N.assigned;
    case 'rc.recalled': return N.recalled(pn);
    case 'rc.reply.close': return N.close;
    case 'rc.reply.notThere': return N.notThere;
    case 'rc.reply.insulted': return N.insulted;
    case 'rc.reply.walk': return N.walk;
    default: return '';
  }
}
