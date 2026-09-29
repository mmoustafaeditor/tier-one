// What every in-career screen can read (the state, the copy, helpers) and do (dispatch a command, go somewhere).
// Screens never compute the next state: they call `run(command)`, and App dispatches, saves and re-renders.
import { createContext, useContext } from 'react';
import type { Lang, Strings, UiLang } from '../i18n';
import type { XStrings } from '../lang-v2';
import type { Career, Club, League, Player } from '../model/types';
import type { Command, Result } from '../sim/commands';
import { money as money0, type World } from '../sim/world';
import { cupOfDay, type LiveMatch } from './util';

export type Route =
  | { s: 'today' } | { s: 'squad'; lens?: string } | { s: 'player'; id: string } | { s: 'match'; tab?: number } | { s: 'pre' } | { s: 'live' } | { s: 'ft' }
  | { s: 'digest' } | { s: 'transfers'; tab?: number } | { s: 'club'; tab?: number } | { s: 'career' } | { s: 'pass' } | { s: 'settings' }
  | { s: 'news' } | { s: 'train' } | { s: 'world' } | { s: 'quick' };

export interface Game {
  w: World; c: Career; t: Strings; x: XStrings; lang: Lang; ui: UiLang; rtl: boolean;
  club: Club; league: League; busy: boolean;
  run: (cmd: Command, opt?: { toast?: string | false; quiet?: boolean }) => Promise<Result>;
  go: (r: Route) => void;
  player: (id: string) => void;
  toast: (s: string) => void;
  sheet: (s: SheetReq | null) => void;
  play: (mode: 'live' | 'quick' | 'sim') => void;
  cont: () => void;
}
export type SheetReq = { k: 'bid'; id: string } | { k: 'renew'; id: string } | { k: 'offers' } | { k: 'staffLog' } | { k: 'desk' } | { k: 'report' } | { k: 'rename'; kind: 'club' | 'player'; id: string };

export const GameCtx = createContext<Game | null>(null);
export const useGame = () => useContext(GameCtx)!;

export const money = (v: number) => money0(v);
export const clubOf = (w: World, id: string) => w.clubs.find((c) => c.id === id);
export const nm = (p: Pick<Player, 'name'>, lang: Lang) => p.name[lang] || p.name.en;
export const cn = (c: Pick<Club, 'name'> | undefined, lang: Lang) => (c ? c.name[lang] || c.name.en : '');
// Short display name: the data's short name (real players), else the surname part of "T. Ashbury".
export const sn = (p: Pick<Player, 'name' | 'short'>, lang: Lang) => {
  if (lang === 'en' && p.short) return p.short;
  const n = p.name[lang] || p.name.en;
  const m = /^\S+\.\s(.+)$/.exec(n);
  if (m) return m[1];
  return lang === 'en' && p.short ? p.short : n.split(' ').length > 2 ? n.split(' ').slice(-1)[0] : n;
};

export function matchLabel(g: Pick<Game, 'c' | 't' | 'x' | 'lang' | 'league'>, m: Pick<LiveMatch, 'cup' | 'group' | 'round'>): string {
  if (!m.cup) return `${g.league.name[g.lang]} · ${g.x.common.matchday(m.round + 1)}`;
  const cup = g.c.cups[m.cup];
  if (!cup) return m.cup;
  return `${cup.name[g.lang]} · ${cupOfDay(g.t, cup, m.round, !!m.group)}`;
}
