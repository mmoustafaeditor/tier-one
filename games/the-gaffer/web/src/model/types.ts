// Core data model for The Gaffer.
// Defensive data rules from earlier QA are baked in here:
//  - every Player ALWAYS has marketValue, wage, contract and shirtNumber (#40: missing marketValue soft-locked careers)
//  - a player belongs to exactly one club (duplicates like Konaté at two clubs)
//  - the save carries the WHOLE world, not only the active league, and its checksum is verified (#41)

import type { Philosophy, Tactics, UserTactics } from '../sim/tactics';
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
  real?: string;         // v2.1: the data snapshot's club id (e.g. "eng-arsenal") when the club comes from the 2026/27 data
  code?: string;         // three-letter code for crests and score bugs
  city?: string;
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
  short?: string;        // v2.1: the name on the back of the shirt / in tight lists ("Saka")
  captain?: boolean;     // v2.1: club captain in the data snapshot
  // V2.6 training & pathway (sim/youth.ts). All optional: missing = 0 / none, so older players need no migration.
  load?: number;         // accumulated training + match load 0-100: +0.3 per minute played, eases between matchdays
  m5?: number;           // recent minutes (rolling, about the last five matchdays); drives development
  ms?: number;           // minutes this season, all competitions (reset at season end)
  run?: number;          // matchdays in a row with 80+ minutes
  inj0?: number;         // length of the current injury when it happened (return window, rush-back rule)
  rr?: [number, number, number]; // after a rush-back: re-injury chance in % per match, matches it still applies to, length of a relapse
  alt?: Position;        // a second position learned in training (plays there without the out-of-position cost)
  rh?: number[];         // rating history, each entry season*10000 + round*100 + rating (real samples only)
  hg?: string;           // the club whose academy produced him (homegrown)
  lmd?: number;          // minutes on the current matchday (cleared by the day's development tick)
}

export const FREE_AGENT = 'free';

export interface SaveFile {
  format: 'SEMBA_GAFFER_SAVE';
  version: number;       // SAVE_VERSION in sim/upgrade.ts (4 since v2.0); older files go through UPGRADES one step at a time
  savedAt: string;
  checksum: string;      // verified on import; a mismatch is REJECTED, never "migrated"
  world: { leagues: League[]; clubs: Club[]; players: Player[] };
  career: Career | null;
  meta?: SaveMeta;       // v4: outside the checksum's body, describes the slot (never read by the simulation)
}

// Which world a career was created with. Old careers (before v2.1) are 'generated' and stay fictional forever.
export type WorldKind = 'real2026' | 'generated';
export type NamesMode = 'real' | 'fictional';
export interface SaveMeta { slot: number; build: number; data: WorldKind; names: NamesMode; club: string; clubName: string; colors: [string, string]; season: number; round: number; manager: string }

// ---------- v2 foundation (save v4) ----------

// One domain event: every command and every clock step appends one, with its cause. Inbox, news, the decision queue,
// the staff log and the Why card point back at these ids. Ids are `s<season>.r<round>.n<seq>`, from career.tickSeq.
export type EvType =
  | 'cmd' | 'match' | 'result' | 'transfer' | 'contract' | 'injury' | 'board' | 'staff' | 'decision' | 'window' | 'season' | 'job' | 'world';
export interface DomainEvent {
  id: string;
  t: [number, number];                 // season, round
  type: EvType;
  name: string;                        // command name or clock step, e.g. 'contract.renew', 'matchday'
  refs?: { p?: string[]; c?: string[] };
  cause?: string;                      // the event (or command) that led to this one
  data?: Record<string, string | number | boolean | null>;
}

// Delegation: seven departments, three levels. 'me': nothing happens without you (a decision appears when one is due).
// 'ask': staff prepare the command and it waits on Today with their reason; ignored, it lapses to the safe default.
// 'staff': staff do it and log it.
export type Dept = 'matchprep' | 'opposition' | 'fitness' | 'development' | 'recruitment' | 'contracts' | 'commercial';
export type DeptLevel = 'me' | 'ask' | 'staff';
export type Bias = 'cautious' | 'bold' | 'youth' | 'veteran' | 'money' | 'loyal';

// A command a member of staff prepared and parked for the manager (the 'ask' level). It carries the reason in the
// staff member's voice and lapses at `until` (a matchday index) with no change.
export interface Pending { id: string; dept: Dept; cmd: Record<string, unknown> & { type: string }; key: string; pn?: LocalizedName; n?: number; s?: string; until: number; ev?: string }

// The week's single training focus (V2.2): it costs the week, and it shows up somewhere real.
export type PrepFocus = 'recovery' | 'tactical' | 'opposition' | 'development';

// The engine's record of one of the user's matches, kept after full time (the last few, for Today, Career and the Why card).
export interface MatchRecordLite {
  key: string; season: number; round: number; cup?: string; home: string; away: string; goals: [number, number]; pens?: [number, number];
  xg: [number, number]; scorers: { side: 0 | 1; pn: LocalizedName; min: number }[];
  motm?: { pn: LocalizedName; rating: number; side: 0 | 1 };
  why: { k: string; good: boolean; text?: string }[];
}

export interface Digest { from: [number, number]; to: [number, number]; results: { key: string; home: string; away: string; goals: [number, number]; cup?: string }[]; staff: number; stopped: string }

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
  // v0.12
  shortlist?: string[];                           // players the user is watching
  watch?: Record<string, number>;                 // when each shortlisted player was added (season * 100 + matchday)
  loans?: Loan[];                                 // loans in and out of the user's club this season
  delegate?: Partial<Record<Duty, boolean>>;      // duties the staff handle (true) instead of the user
  staffLog?: StaffLog[];                          // what the staff did, newest first (last 40)
  ratings?: Record<string, [number, number, number]>; // this season: rating sum, games rated, man of the match awards
  records?: Records;                              // club and manager records across the career
  grads?: string[];                               // academy graduates promoted by the user (their story is tracked)
  seenMilestones?: number;                        // milestones already shown in a pop-up
  // v2 (save v4)
  events?: DomainEvent[];                         // this season's domain events, oldest first (bounded)
  tickSeq?: number;                               // next event number
  dept?: Partial<Record<Dept, DeptLevel>>;        // delegation per department
  pending?: Pending[];                            // staff proposals waiting on the manager ('ask')
  done?: Record<string, number>;                  // decision ids already answered → the matchday they were answered on
  planB?: Tactics;                                // the second plan (shape + instructions), one tap away in a match
  prep?: PrepFocus;                               // this week's training focus
  rested?: string[];                              // left out of the next match by the manager (cleared after it)
  talk?: 0 | 1 | 2 | 3;                           // the last word before the next match (cleared after it)
  matches?: MatchRecordLite[];                    // the last user matches, newest first
  pulse?: [number, number, number, number][];     // [round, board, fans, dressing room] after each matchday (last 12)
  data?: WorldKind;                               // the world this career was created with
  names?: NamesMode;                              // real names or the fictional fallback
  lastDigest?: Digest | null;                     // "since you were away", after a multi-week sim
  // V2.6 training & pathway (sim/youth.ts)
  intake?: Intake;                                // this season's Intake Day for the user's club (prepared at the preview)
  trainRep?: TrainReport;                         // last matchday's training report (growth, knocks, load)
}

// Intake Day (V2.6): a yearly event at ~70 % of the season. Ten matchdays before, the Head of Youth previews the group
// (the kids already exist here, hidden); on the day they join the club's academy as world players.
export interface Intake { season: number; club: string; day: number; kids: Player[]; arrived?: boolean }
// What one training week did: who grew (+1), who is closing in, who got a knock, whose load is high, what was dropped.
export interface TrainReport { round: number; up: string[]; near: string[]; knocks: string[]; high: string[]; heavyDropped?: boolean; academyUp: string[] }

// Loans last until the end of the season. `share`: part of the wage the borrowing club pays (0-1).
export interface Loan { playerId: string; pn: LocalizedName; from: string; to: string; fee: number; share: number; season: number; ya?: boolean /* V2.6: from the academy, returns to it */; at?: number /* V2.6: matchday it started */ }

export type Duty = 'lineup' | 'tactics' | 'scouting' | 'training' | 'medical' | 'morale' | 'academy' | 'contracts' | 'selling' | 'signing' | 'loans' | 'sponsors' | 'tickets';
export interface StaffLog { season: number; round: number; duty: Duty; key: string; pn?: LocalizedName; n?: number; s?: string; ev?: string; b?: Bias }

export interface RecordEntry { v: number; season: number; s?: string; pn?: LocalizedName; club?: string }
export interface Records {
  bigWin?: RecordEntry;       // goal difference, s = score "5-0", club = opponent
  mostPoints?: RecordEntry;   // league points in a season
  mostGoals?: RecordEntry;    // league goals scored in a season
  unbeaten?: RecordEntry;     // longest unbeaten run
  scorer?: RecordEntry;       // most league goals by one player in a season
  bestFinish?: RecordEntry;   // best league position (lower is better), s = league id
  bestBuy?: RecordEntry;      // biggest fee paid
  bestSale?: RecordEntry;     // biggest fee received
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
export interface NewsItem { id: string; season: number; round: number; cat: NewsCat; key: string; club?: string; club2?: string; player?: string; pn?: LocalizedName; n?: number; s?: string; ev?: string }
export interface Rumour { id: string; playerId: string; pn: LocalizedName; from: string; to: string; fee: number; chance: number; until: number }

export type Facility = 'stadium' | 'medical' | 'training' | 'academy' | 'scouting';
export type StaffRole = 'assistant' | 'fitness' | 'doctor' | 'psychologist' | 'scout' | 'director';
export type SponsorSlot = 'shirt' | 'kit' | 'stadium' | 'sleeve' | 'commercial';

export interface Staff { id: string; role: StaffRole; name: LocalizedName; quality: number; wage: number; bias?: Bias }
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
  training: { load: 0 | 1 | 2; focus: Record<string, number>; pos?: Record<string, Position>; posProg?: Record<string, number> }; // load: light, normal, heavy; individual plans (≤ 5 players): an attribute or a new position
  academy: Player[];                     // v2.6: always empty; the academy is a world squad (World.academy, sim/youth.ts)
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
export interface Msg { id: string; season: number; round: number; kind: MsgKind; key: string; club?: string; player?: string; pn?: LocalizedName; n?: number; s?: string; read?: boolean; ev?: string }

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
