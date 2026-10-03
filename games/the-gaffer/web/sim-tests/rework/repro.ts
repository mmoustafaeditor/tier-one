// Rework Milestone 0: reproduce the trust backlog (F01-F17) against the current build, headless and seeded.
// node sim-tests/build.mjs rework/repro
// Each check prints OPEN (defect reproduced) or OK (behaviour is correct). It never fails the process: it is evidence,
// the regression tests for the fixes live in sim-tests/rework/trust.ts.
import { generateRealWorld } from '../../src/sim/seed';
import { newCareer, nextUserMatch } from '../../src/sim/season';
import { advance } from '../../src/sim/clock';
import { xiFor, bestXI as autoXI, FORMATIONS, DEFAULT_TACTICS, available } from '../../src/sim/tactics';
import { squadOf, playerOf, objectiveOf } from '../../src/sim/world';
import { dispatch } from '../../src/sim/commands';
import { levelOf } from '../../src/sim/delegation';
import { dateOf } from '../../src/sim/calendar';
import { raiseObjective, kittyFor } from '../../src/sim/vision';
import { rcOf } from '../../src/sim/recruit/state';
import { recruitDecisions } from '../../src/sim/recruit/decide';
import { dealCost } from '../../src/sim/recruit/deals';
import { spendingRoom } from '../../src/sim/recruit/money';
import { predict } from '../../src/sim/match';
import { moveTo } from '../../src/sim/coach';
import { saveText, parseSave } from '../../src/sim/save';
import type { Career } from '../../src/model/types';
import type { World } from '../../src/sim/world';

const rows: [string, 'OPEN' | 'OK', string][] = [];
const rep = (id: string, open: boolean, why: string) => { rows.push([id, open ? 'OPEN' : 'OK', why]); console.log(`${open ? 'OPEN' : 'OK  '} ${id} ${why}`); };
const seed = 7;
const W0 = generateRealWorld(seed);
const fresh = (club = 'egy-al-ahly') => ({ w: W0, c: newCareer(W0, seed, club, 'Test', { age: 40, nationality: 'EGY' }, 2026) });

// F01 — an explicit XI choice survives delegated match prep (quick result).
{
  let { w, c } = fresh();
  const { xi } = xiFor(w, c);
  const gk = FORMATIONS[(c.tactics ?? DEFAULT_TACTICS).formation].slots.findIndex((s) => s.pos === 'GK');
  const backup = squadOf(w, c.clubId).find((p) => p.position === 'GK' && !xi.some((q) => q.id === p.id))!;
  const ids = xi.map((p) => p.id); ids[gk] = backup.id;
  const r = dispatch(w, c, { type: 'tactics.set', tactics: { ...(c.tactics ?? DEFAULT_TACTICS), xi: ids } } as never);
  w = r.world; c = r.career;
  const shown = xiFor(w, c).xi.some((p) => p.id === backup.id);
  const s = advance(w, c);
  const played = !!s.mine?.played.includes(backup.id);
  rep('F01', shown && !played, `matchprep=${levelOf(c, 'matchprep')}; pre-match XI shows the chosen keeper: ${shown}; he played the quick result: ${played}`);
}

// F02 — one clock: the header's "today" (todayOf) vs the date a message from this step shows (stampDate), and cup ties.
{
  const { todayOf, stampDate, userTie } = await import('../../src/sim/cups');
  let { w, c } = fresh();
  const same = stampDate(c, c.season, c.round).getTime() === todayOf(c).getTime();
  let after = 0;
  for (let i = 0; i < 40 && c.round < 30; i++) { const next = userTie(c) ? dateOf(c.season, c.round, true) : dateOf(c.season, c.round); if (todayOf(c) >= next) after++; const s2 = advance(w, c); w = s2.world; c = s2.career; }
  rep('F02', !same || after > 0, `a message from this step is dated today: ${same}; steps where "today" is on/after the next match: ${after}`);
}

// F03 — the Today "meet demands" card and the Talks room preview agree.
{
  let { w, c } = fresh();
  c = { ...c, dept: { ...(c.dept ?? {}), recruitment: 'ask' } as Career['dept'] };
  const target = w.players.find((p) => p.clubId !== c.clubId && p.rating >= 70 && p.clubId !== 'free')!;
  const rc = rcOf(c);
  const fee = { upfront: Math.round(target.marketValue * 0.6), inst: [Math.round(target.marketValue * 0.4)], sellOn: 0 };
  const neg = { id: 'neg-t', playerId: target.id, pn: target.name, from: target.clubId, stage: 'terms', opened: c.season * 100, bids: [], clubPatience: 3, answerAt: null, counter: null, rival: null, fee, rounds: [], patience: 3, due: c.season * 100 + c.round + 2 } as never;
  c = { ...c, rc: { ...rc, negs: [...rc.negs, neg] } } as Career;
  const card = recruitDecisions(w, c).find((d) => d.id.startsWith('rc:terms:neg-t'));
  const meet = card?.choices.find((x) => x.id === 'meet');
  const shownRoom = meet?.fx?.find((f) => f.key === 'rc.fx.room')?.n;
  const talkTerms = (card && rcOf(c).negs[0]) ? null : null; void talkTerms;
  // Talks: spendingRoom(w, c, neg.id) - cost.total with the same demand the card used (fees = agent + signOn from the card).
  const feesFx = meet?.fx?.find((f) => f.key === 'rc.fx.fees')?.n ?? 0;
  const nominal = fee.upfront + fee.inst[0];
  const talks = spendingRoom(w, c, 'neg-t') - (nominal + feesFx);
  rep('F03', shownRoom !== undefined && Math.abs(shownRoom - talks) > 1, `Today card "room after" ${shownRoom}, Talks "room after" ${talks}, difference ${shownRoom !== undefined ? talks - shownRoom : '?'} (agreed fee ${nominal})`);
  void dealCost; void playerOf;
}

// F04 — "aim higher" with a target that is already the top of the ladder.
{
  const { decisions } = await import('../../src/sim/decisions');
  const { w, c } = fresh();
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  const base = objectiveOf(w, club);
  const card = decisions(w, c).find((d) => d.kind === 'vision');
  const offered = !!card?.choices.some((x) => x.id === 'ambitious');
  rep('F04', raiseObjective(base) === base && offered, `${club.id}: base target ${base}; "aim higher" offered: ${offered}`);
  void kittyFor;
}

// F05 — promotion discloses the pathway promise (code-level: the promote command has no preview/consent step).
{
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(`${process.cwd()}/src/ui2/Pathway.tsx`, 'utf8') + readFileSync(`${process.cwd()}/src/ui2/Player.tsx`, 'utf8');
  const direct = (src.match(/type: 'academy\.promote'/g) ?? []).length !== 1; // only the sheet's own button promotes
  rep('F05', direct || !src.includes('PromoteSheet'), `promote goes through the promotion sheet (squad, contract, promise): ${!direct && src.includes('PromoteSheet')}`);
}

// F06 — the Best XI puts natural full-backs/centre-backs where they belong.
{
  const { w, c } = fresh('eng-liverpool');
  const squad = squadOf(w, c.clubId);
  const f = (c.tactics ?? DEFAULT_TACTICS).formation;
  const xi = autoXI(squad, f);
  const out: string[] = [];
  // A compromise is fine when it's the better option (Wirtz at RW over Chiesa); the defect is a man out of position ahead
  // of a natural player who'd be at least as good there (Van Dijk at RB over Frimpong).
  const { slotValue } = await import('../../src/sim/tactics');
  xi.forEach((p, i) => { const pos = FORMATIONS[f].slots[i].pos; if (p.position !== pos) { const nat = squad.filter((q) => q.position === pos && available(q) && !xi.includes(q)).sort((a, b) => slotValue(b, pos) - slotValue(a, pos))[0]; if (nat && slotValue(nat, pos) >= slotValue(p, pos)) out.push(`${p.name.en} (${p.position}) at ${pos} while ${nat.name.en} (${pos} ${nat.rating}) sits out`); } });
  rep('F06', out.length > 0, `Liverpool ${f}: the manager's best XI out of position ahead of a better natural player: ${out.join('; ') || 'none'} (reasons are shown in Tactics)`);
}

// F08 — three-way forecast rounding as shown (pct3).
{
  const { pct3 } = await import('../../src/ui2/util');
  const { w } = fresh();
  let bad = 0, n = 0;
  for (const club of w.clubs.filter((x) => x.leagueId === 'egy1')) {
    const cc = newCareer(w, seed, club.id, 'T', { age: 40, nationality: 'EGY' }, 2026);
    const m = nextUserMatch(w, cc); if (!m) continue;
    const r = pct3(predict(m, (id) => playerOf(w, id)!));
    n++; if (r[0] + r[1] + r[2] !== 100) bad++;
  }
  rep('F08', bad > 0, `${bad}/${n} pre-match forecasts shown with a total other than 100%`);
}

// F09 — job move: what follows the manager and what stays with the club.
{
  let { w, c } = fresh('eng-liverpool');
  const s = advance(w, c); w = s.world; c = s.career;
  const m = c.matches![0];
  const m2 = moveTo(w, { ...c, jobs: ['ger-bayern'] }, 'ger-bayern');
  const c2 = m2.career;
  const { lastMatchHere } = await import('../../src/sim/record');
  const last = lastMatchHere(c2);
  const me = last && last.home === c2.clubId ? 0 : 1;
  const shown = last ? `${last.goals[me]}-${last.goals[1 - me]} v ${me === 0 ? last.away : last.home}` : '';
  const leak = !!last && last.home !== c2.clubId && last.away !== c2.clubId;
  void m;
  rep('F09', leak, `after the move "Last time out" ${last ? `reads ${shown}` : 'is empty (no match at Bayern yet)'}; vision applies: ${!!(await import('../../src/sim/vision')).visionOf(c2)}`);
}

// F10 — "available" for a cup match counts the cup ban (availabilityFor, what Today shows).
{
  const { availabilityFor } = await import('../../src/sim/tactics');
  const { w, c } = fresh();
  const sq = squadOf(w, c.clubId).map((x, i) => (i === 0 ? { ...x, sus: { 'egy-cup': 1 } } : x));
  const a = availabilityFor(sq, 'egy-cup');
  rep('F10', a.available.includes(sq[0]), `a cup-banned player counts as available for the cup match: ${a.available.includes(sq[0])}; tired players are flagged separately`);
}

{
  const { readFileSync } = await import('node:fs');
  const q = readFileSync(`${process.cwd()}/src/ui2/QuickMatch.tsx`, 'utf8');
  rep('F11', !q.includes('<FullTime'), `quick match ends on a read-only full time with Rematch: ${q.includes('<FullTime') && q.includes('rematch')}`);
}

// F17 — export/import round trip, tampering, version from the future.
{
  const { w, c } = fresh();
  const text = await saveText(w, c);
  const back = await parseSave(text);
  const plain = JSON.parse(await (await import('../../src/sim/save')).unpack(text));
  const tampered = await parseSave(JSON.stringify({ ...plain, career: { ...plain.career, managerName: 'X' } }));
  const future = await parseSave(JSON.stringify({ ...plain, version: 999 }));
  const junk = await parseSave('not a save');
  const ok = back.ok && back.save.career?.clubId === c.clubId && !tampered.ok && !future.ok && !junk.ok;
  rep('F17', !ok, `round trip ${back.ok}; tampered rejected ${!tampered.ok}(${tampered.ok ? '' : tampered.reason}); future version rejected ${!future.ok}; junk rejected ${!junk.ok}. each write keeps the slot's previous save (slots.ts PREV)`);
}

console.log('\n| ID | status | evidence |\n|---|---|---|');
for (const [id, s, why] of rows) console.log(`| ${id} | ${s} | ${why.replace(/\|/g, '/')} |`);
