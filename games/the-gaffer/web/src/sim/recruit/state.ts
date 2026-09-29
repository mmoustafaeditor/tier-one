// V2.5 Recruitment: the career slice every recruitment system reads and writes (V2_DESIGN §3.4, §7.1).
// It lives in `career.rc` (optional, so a save from before v7 and a save from another lane both load: every reader goes
// through `rcOf`, which fills the defaults). Nothing here is decorative: each field is consumed by the clock
// (sim/recruit/tick.ts), the commands (sim/recruit/deals.ts), Today (sim/recruit/decide.ts) or the save checks.
import type { Career, LocalizedName, Position } from '../../model/types';

// A point in time that survives the season change: season * 100 + matchday.
export type Tick = number;
export const tickOf = (c: Pick<Career, 'season' | 'round'>): Tick => c.season * 100 + c.round;

// ---------- scouting ----------
export type ScopeKind = 'league' | 'country' | 'world';
export interface Assignment { id: string; scope: ScopeKind; key: string; pos: Position | null; since: Tick }

// ---------- the club stage ----------
// What we offer the selling club. `inst`: instalments paid at the start of the next seasons (≤ 2, so ≤ 3 seasons in all).
export interface ClubOffer { upfront: number; inst: number[]; sellOn: number } // sellOn: 0, 0.1, 0.15, 0.2
export interface ClubRound { by: 'us' | 'them'; t: Tick; offer?: ClubOffer; fee?: number; answer?: 'accept' | 'counter' | 'reject' | 'insult' | 'rival' }

// ---------- personal terms ----------
export type RoleTerm = 'star' | 'regular' | 'rotation' | 'prospect';
export interface Terms { wage: number; years: number; role: RoleTerm; signOn: number; release: number | null; bonus: number }
export type AgentReply = 'accept' | 'close' | 'notThere' | 'insulted' | 'walk';
export interface TermsRound { by: 'us' | 'them'; t: Tick; terms: Terms; reply?: AgentReply; u?: number }

export type NegStage = 'club' | 'terms' | 'done' | 'collapsed';
export type NegEnd = 'signed' | 'walked' | 'frozen' | 'hijacked' | 'window' | 'withdrawn' | 'gone' | 'rejected';
export interface Negotiation {
  id: string;
  playerId: string;
  pn: LocalizedName;
  from: string;              // the selling club (or 'free')
  stage: NegStage;
  opened: Tick;
  // club stage
  bids: ClubRound[];
  clubPatience: number;      // 3 bids, insults cost 2
  answerAt: Tick | null;     // when the club answers the bid on the table (null: nothing waiting)
  counter: number | null;    // their price after a counter (nominal)
  rival: { club: string; fee: number } | null; // another club's bid, while ours is on the table
  fee: ClubOffer | null;     // the agreed fee (terms stage and after)
  // terms stage
  rounds: TermsRound[];
  patience: number;          // the agent's rounds left
  due: Tick | null;          // "the agent wants an answer by …"
  end?: NegEnd;
  endT?: Tick;
  seen?: number;             // bumps when the other side answers: Today shows each answer once
}

// Money we owe later: instalments of transfer fees (paid on the first matchday of the season they fall due).
export interface Commitment { id: string; playerId: string; pn: LocalizedName; to: string; amount: number; season: number }

// Clauses written into a contract we signed: they act later (sell-on when we sell, release clause when a club pays it,
// the appearance bonus every time he plays, the promised role for the dressing room).
export interface Clauses { role?: RoleTerm; release?: number | null; bonus?: number; sellOn?: { pct: number; club: string }; signed?: Tick; fee?: number; sched?: number[] }

// Loan terms: who pays the wage and how much he must play. Keyed by player, for the loans of this season.
export type MinutesClause = 'starter' | 'rotation' | 'none';
export interface LoanTerms { share: number; minutes: MinutesClause; from: string; to: string; since: Tick; apps0: number; days0: number; broken?: boolean; warned?: boolean; recall?: boolean }

// A story thread over the events of one chase or one sale (V2_DESIGN §4): what the news and Deals tab project.
export interface Thread { id: string; pid: string; pn: LocalizedName; kind: 'chase' | 'sale' | 'loan'; club: string; steps: { k: string; t: Tick; n?: number; club?: string }[]; open: boolean }

export interface RecruitState {
  v: 1;
  k: Record<string, [number, Tick]>;        // knowledge 0-100 and when he was last observed (sparse: only above the base)
  assign: Assignment[];
  pinned: Position[];                       // needs the manager added himself
  negs: Negotiation[];
  frozen: Record<string, Tick>;             // no talks with this player until…
  interest: Record<string, number>;         // his interest in us, moved by walk-aways (−10)
  commits: Commitment[];
  clauses: Record<string, Clauses>;
  loans: Record<string, LoanTerms>;
  parentTrust: Record<string, number>;      // clubs that lent us players: 60 to start, −25 for a broken minutes clause
  threads: Thread[];
  aiWhy: Record<string, string>;            // offer id → why that club bid ('unhappy', 'expiring', 'listed', 'need')
  seq: number;                              // id counter
}

export const emptyRC = (): RecruitState => ({
  v: 1, k: {}, assign: [], pinned: [], negs: [], frozen: {}, interest: {}, commits: [], clauses: {}, loans: {}, parentTrust: {}, threads: [], aiWhy: {}, seq: 0,
});

type WithRC = Career & { rc?: RecruitState };
// Read the slice with every field present (older saves, and saves written before a field existed).
export function rcOf(c: Career): RecruitState {
  const rc = (c as WithRC).rc;
  if (!rc) return emptyRC();
  return { ...emptyRC(), ...rc };
}
export const withRC = (c: Career, rc: RecruitState): Career => ({ ...c, rc } as WithRC);

export const nextId = (rc: RecruitState, c: Career, tag: string): [string, RecruitState] => [`${tag}${c.season}.${rc.seq}`, { ...rc, seq: rc.seq + 1 }];

export const openNeg = (rc: RecruitState, playerId: string) => rc.negs.find((n) => n.playerId === playerId && (n.stage === 'club' || n.stage === 'terms'));
export const negById = (rc: RecruitState, id: string) => rc.negs.find((n) => n.id === id);
export const putNeg = (rc: RecruitState, n: Negotiation): RecruitState => ({ ...rc, negs: rc.negs.some((x) => x.id === n.id) ? rc.negs.map((x) => (x.id === n.id ? n : x)) : [...rc.negs, n] });

// Threads: one per chase; each step is a line in the story.
export function step(rc: RecruitState, c: Career, t: Pick<Thread, 'pid' | 'pn' | 'kind' | 'club'>, k: string, extra: { n?: number; club?: string } = {}, close = false): RecruitState {
  const id = `${t.kind}:${t.pid}:${c.season}`;
  const now = tickOf(c);
  const old = rc.threads.find((x) => x.id === id);
  const th: Thread = old ? { ...old, steps: [...old.steps, { k, t: now, ...extra }].slice(-12), open: !close, club: t.club } : { id, ...t, steps: [{ k, t: now, ...extra }], open: !close };
  return { ...rc, threads: [th, ...rc.threads.filter((x) => x.id !== id)].slice(0, 24) };
}
