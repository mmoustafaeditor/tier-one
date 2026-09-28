// Core data model for The Gaffer.
// Defensive data rules from earlier QA are baked in here:
//  - every Player ALWAYS has marketValue, wage, contract and shirtNumber (#40: missing marketValue soft-locked careers)
//  - a player belongs to exactly one club (duplicates like Konaté at two clubs)
//  - the save carries the WHOLE world, not only the active league, and its checksum is verified (#41)

import type { Philosophy, UserTactics } from '../sim/tactics';
import type { LiveMatch } from '../sim/match';
import type { ScoutReport } from '../sim/scouting';

export type CountryCode = 'ENG' | 'ESP' | 'ITA' | 'GER' | 'FRA' | 'EGY' | 'KSA' | 'MAR' | 'TUN' | 'ALG' | 'UAE' | 'QAT';

export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST';

export interface LocalizedName {
  en: string;
  ar: string;
}

export interface League {
  id: string;            // e.g. "eng1"
  country: CountryCode;
  tier: number;          // 1 = top flight
  name: LocalizedName;   // near-real names, never trademarked ones
  clubs: number;         // how many clubs play in it
  main: boolean;         // one of the big five = main leagues
}

export interface Club {
  id: string;
  leagueId: string;
  name: LocalizedName;   // near-real ("Liverpool Reds"), editable by the player
  shortName: string;
  colors: [string, string];
  reputation: number;    // 0-100
  budget: number;        // club cash
  wageCap: number;       // most the club will pay in wages per month
  elo?: number;          // ranking points, moved by every result (starts from reputation)
}

export interface Player {
  id: string;
  clubId: string;        // exactly one club, or FREE_AGENT
  name: LocalizedName;   // near-real ("M. Salaah"), editable by the player
  nationality: string;   // country code, e.g. "EGY", "BRA"
  birthYear: number;     // age is derived from the season, so the world ages every year
  position: Position;
  rating: number;        // current ability 1-99
  potential: number;     // ceiling 1-99, >= rating
  marketValue: number;   // required
  wage: number;          // required, per month
  contractUntil: number; // season year, required
  shirtNumber: number;   // required (0 for free agents)
  attrs: number[];       // [pace, shooting, passing, dribbling, defending, physical, goalkeeping], 1-99
  fitness: number;       // 0-100, drops in matches, recovers between them
  morale: number;        // 0-100, moves with results
  injured: number;       // matchdays out, 0 = fit
  banned: number;        // matchdays suspended
  listed?: boolean;      // on the user's transfer list
  prog?: number;         // training progress towards the next +1 (0-100)
  savings?: number;      // bonuses paid to the player
  nick?: LocalizedName;  // nickname, editable
}

export const FREE_AGENT = 'free';

export interface SaveFile {
  format: 'SEMBA_GAFFER_SAVE';
  version: 1;
  savedAt: string;
  checksum: string;      // verified on import; a mismatch is REJECTED, never "migrated"
  world: { leagues: League[]; clubs: Club[]; players: Player[] };
  career: Career | null;
}

export interface Career {
  managerName: string;
  clubId: string;
  season: number;        // year the season starts in, e.g. 2026 = 2026/27
  seed: number;          // world seed, kept for bug reports
  round: number;         // next matchday to play (0-based); every league plays the same matchday together
  fixtures: Record<string, Fixture[][]>; // leagueId -> rounds -> matches
  stats: Record<string, PlayerStats>;    // playerId -> this season's league stats
  history: SeasonRecord[];
  offers: Offer[];                       // offers for the user's players
  deals: Deal[];                         // the user's transfers, newest first
  tactics?: UserTactics;                 // missing = default 4-3-3, best XI picked for you
  live?: LiveMatch | null;               // the user's match while it's being played (resumed if the app closes)
  manager?: { age: number; nationality: string; nationality2?: string };
  cups: Record<string, Cup>;             // this season's national and continental cups
  cupDay: number;                        // last matchday whose cup ties were played (-1 = none yet)
  coach: Coach;
  board: { confidence: number; fans: number }; // 0-100
  inbox: Msg[];                          // newest first, trimmed to the last 60 (E2E #37)
  jobs: string[];                        // clubs offering the user a job right now
  sacked?: boolean;
  ops: ClubOps;                          // the user's club: money, facilities, staff, sponsors, training, academy
  mastery: Partial<Record<Philosophy, number>>; // how well the squad knows each philosophy, 0-100
  scouted?: Record<string, ScoutReport>;          // opponent reports, by match key
  news?: NewsItem[];                              // the newspaper, newest first
  rumours?: Rumour[];                             // transfer rumours between other clubs
  balance?: Balance;                              // realism settings (missing = all normal)
  worldVersion?: number;                          // goes up every time the world editor saves
  pendingSwaps?: [string, string][];              // clubs swapping leagues at the end of this season (world editor)
}

// Realism / balance settings, chosen in Settings and saved with the career. 1 = normal.
export interface Balance {
  income: number;     // tickets, TV and sponsors ×
  wages: number;      // what players ask for ×
  prices: number;     // transfer asking prices ×
  injuries: number;   // injury chance in your matches ×
  difficulty: -1 | 0 | 1; // opponents in your matches: weaker, normal, stronger
  patience: -1 | 0 | 1;   // the board: patient, normal, strict
}

export type NewsCat = 'results' | 'transfers' | 'managers' | 'youth' | 'records' | 'crisis';
export interface NewsItem { id: string; season: number; round: number; cat: NewsCat; key: string; club?: string; club2?: string; player?: string; pn?: LocalizedName; n?: number; s?: string }
export interface Rumour { id: string; playerId: string; pn: LocalizedName; from: string; to: string; fee: number; chance: number; until: number }

export type Facility = 'stadium' | 'medical' | 'training' | 'academy' | 'scouting';
export type StaffRole = 'assistant' | 'fitness' | 'doctor' | 'psychologist' | 'scout';
export type SponsorSlot = 'shirt' | 'kit' | 'stadium' | 'sleeve' | 'commercial';

export interface Staff { id: string; role: StaffRole; name: LocalizedName; quality: number; wage: number }
export interface SponsorDeal { id: string; slot: SponsorSlot; brand: LocalizedName; monthly: number; months: number; bonusLeague: number; bonusCup: number }

export interface ClubOps {
  clubId: string;
  ticket: number;                        // ticket price
  baseCapacity: number;
  facilities: Record<Facility, number>;  // levels 1-5
  staff: Partial<Record<StaffRole, Staff>>;
  staffPool: Staff[];                    // candidates to hire
  sponsors: SponsorDeal[];
  sponsorOffers: SponsorDeal[];
  training: { load: 0 | 1 | 2; focus: Record<string, number> }; // load: recovery, balanced, hard; focus: attribute index per player
  academy: Player[];                     // prospects, not yet in the squad
  devPoints: number;
  ledger: Record<string, number>;        // this season: income > 0, spending < 0
  lastLedger?: Record<string, number>;
  report: { improved: string[]; hurt: string[] }; // last training week
  lastGate?: { attendance: number; revenue: number };
}

// Knockout tie: [home, away, homeGoals, awayGoals, homePens, awayPens, winner]. away '' = bye. Goals -1 until played.
export type Tie = [string, string, number, number, number, number, string];

export interface Cup {
  id: string;
  kind: 'national' | 'continental';
  name: LocalizedName;
  days: number[];        // matchday of each round
  ties: Tie[][];         // rounds, drawn one at a time
  prize: number;         // winner's prize money
  groups?: CupGroups;    // continental cups: a group stage before the knockouts
}

// Groups of four, everyone plays everyone home and away; the top two of each group go through.
export interface CupGroups {
  clubs: string[][];     // [group][4 clubs]
  days: number[];        // the 6 group matchdays
  games: Tie[][];        // [group matchday][games of every group]; t[6] = winner id, '=' for a draw
}

export type Licence = 'D' | 'C' | 'B' | 'A' | 'PRO' | 'ELITE';

export interface Trophy { season: number; kind: 'league' | 'cup' | 'continental' | 'promotion'; id: string; clubId: string }

export interface Coach {
  xp: number;
  reputation: number;    // 0-100, grows slowly (E2E report §7)
  licence: Licence;
  licenceAt: number;     // career matchday count when the last licence was earned (one at a time, E2E #44)
  courses: string[];
  milestones: string[];
  wallet: number;        // the coach's own money (salary)
  record: [number, number, number, number, number]; // matches, wins, draws, losses, 0 (reserved)
  goals: [number, number];                          // for, against
  streak: number;        // wins in a row
  unbeaten: number;      // games without a loss
  trophies: Trophy[];
  clubs: string[];       // every club managed
  days: number;          // matchdays managed in total
}

export type MsgKind = 'board' | 'fans' | 'club' | 'scout' | 'contract' | 'offer' | 'cup' | 'coach' | 'job';
// Messages store a key and references, and are written out in the reader's language when shown.
// `pn` keeps the player's name, because a player can retire before the message is read.
export interface Msg { id: string; season: number; round: number; kind: MsgKind; key: string; club?: string; player?: string; pn?: LocalizedName; n?: number; s?: string; read?: boolean }

// [appearances, goals, assists, yellow cards, red cards]
export type PlayerStats = [number, number, number, number, number];

export interface Offer { id: string; playerId: string; clubId: string; fee: number; round: number }

export interface Deal { season: number; playerId: string; name: LocalizedName; from: string; to: string; fee: number; kind: 'in' | 'out' | 'free' | 'released' }

// [homeClubId, awayClubId, homeGoals, awayGoals]; goals are -1 until played.
export type Fixture = [string, string, number, number];

export interface SeasonRecord {
  season: number;
  clubId: string;
  leagueId: string;
  position: number;
  objective: Objective;
  met: boolean;
  champion: string;      // club id
}

export type Objective = 'title' | 'europe' | 'topHalf' | 'survive' | 'promotion' | 'playoffs' | 'midTable';
