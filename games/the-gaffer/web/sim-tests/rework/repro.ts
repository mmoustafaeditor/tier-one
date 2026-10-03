// Rework Milestone 0: reproduce the trust backlog (F01-F17) against the current build, headless and seeded.
// node sim-tests/build.mjs rework/repro
// Each check prints OPEN (defect reproduced) or OK (behaviour is correct). It never fails the process: it is evidence,
// the regression tests for the fixes live in sim-tests/rework/trust.ts.
import { generateRealWorld } from '../../src/sim/seed';
import { newCareer, nextUserMatch } from '../../src/sim/season';
import { advance } from '../../src/sim/clock';
import { xiFor, autoXI, FORMATIONS, DEFAULT_TACTICS, available } from '../../src/sim/tactics';
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

// F02 — one clock: the header's "today" vs the dates on messages, and cup ties vs "today".
{
  const { w, c } = fresh();
  const today = new Date(dateOf(c.season, c.round).getTime() - 2 * 86400000); // OfficeBar/Today
  const msg = dateOf(c.season, Math.max(0, c.inbox[0]?.round ?? c.round));   // News.tsx
  let cupBeforeToday = 0;
  for (let r = 0; r < 38; r++) { const cupDay = dateOf(c.season, r, true); const t = new Date(dateOf(c.season, r).getTime() - 2 * 86400000); if (cupDay < t) cupBeforeToday++; }
  rep('F02', msg.getTime() !== today.getTime() || cupBeforeToday > 0, `header today=${today.toISOString().slice(0, 10)}, welcome message dated ${msg.toISOString().slice(0, 10)}; cup days that fall before the header's "today" of their week: ${cupBeforeToday}/38; promise/agent cards label matchdays as "days"`);
  void w;
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
  const { w, c } = fresh();
  const club = w.clubs.find((x) => x.id === c.clubId)!;
  const base = objectiveOf(w, club);
  rep('F04', raiseObjective(base) === base && kittyFor(w, c) > 0, `${club.id}: base target ${base}, ambitious target ${raiseObjective(base)}, owner money still offered: ${kittyFor(w, c)}`);
}

// F05 — promotion discloses the pathway promise (code-level: the promote command has no preview/consent step).
rep('F05', true, 'academy.promote is one tap (Pathway.tsx / Player.tsx); roomDay then adds a prospect pledge (10 apps in 20 matchdays or a loan) the user was never shown');

// F06 — the Best XI puts natural full-backs/centre-backs where they belong.
{
  const { w, c } = fresh('eng-liverpool');
  const squad = squadOf(w, c.clubId);
  const f = (c.tactics ?? DEFAULT_TACTICS).formation;
  const xi = autoXI(squad, f);
  const out: string[] = [];
  xi.forEach((p, i) => { const pos = FORMATIONS[f].slots[i].pos; if (p.position !== pos) { const nat = squad.filter((q) => q.position === pos && available(q) && !xi.includes(q)).sort((a, b) => b.rating - a.rating)[0]; out.push(`${p.name.en} (${p.position}) at ${pos}${nat ? ` while ${nat.name.en} (${pos} ${nat.rating}) sits out` : ''}`); } });
  rep('F06', out.length > 0, `Liverpool ${f} best XI out of position: ${out.join('; ') || 'none'}; no reason is shown to the user`);
}

// F08 — three-way forecast rounding.
{
  const { w, c } = fresh();
  let bad = 0, n = 0, sure = 0;
  for (const club of w.clubs.filter((x) => x.leagueId === 'egy1')) {
    const cc = newCareer(w, seed, club.id, 'T', { age: 40, nationality: 'EGY' }, 2026);
    const m = nextUserMatch(w, cc); if (!m) continue;
    const o = predict(m, (id) => playerOf(w, id)!);
    const r = o.map((v) => Math.round(v * 100));
    n++; if (r[0] + r[1] + r[2] !== 100) bad++; if (r.some((v) => v >= 100 || v <= 0)) sure++;
  }
  rep('F08', bad > 0, `${bad}/${n} pre-match forecasts round to a total other than 100%; independent Math.round per outcome (Today.tsx); 0%/100% can show (${sure})`);
  void c;
}

// F09 — job move: what follows the manager and what stays with the club.
{
  let { w, c } = fresh('eng-liverpool');
  const s = advance(w, c); w = s.world; c = s.career;
  const m = c.matches![0];
  const m2 = moveTo(w, { ...c, jobs: ['ger-bayern'] }, 'ger-bayern');
  const c2 = m2.career;
  const last = c2.matches?.[0];
  const me = last && last.home === c2.clubId ? 0 : 1;
  const shown = last ? `${last.goals[me]}-${last.goals[1 - me]} v ${me === 0 ? last.away : last.home}` : '';
  const leak = !!last && last.home !== c2.clubId && last.away !== c2.clubId;
  rep('F09', leak, `after the move Today reads "Last time out: ${shown}" (the match was ${m.home} ${m.goals[0]}-${m.goals[1]} ${m.away}); vision kept: ${!!c2.vision}; open negotiations kept: ${rcOf(c2).negs.length}; commitments kept: ${rcOf(c2).commits.length}`);
}

// F10 — "fit" counts a player banned for the next (cup) match.
{
  const { w, c } = fresh();
  const p = squadOf(w, c.clubId)[0];
  const w2: World = { ...w, players: w.players.map((x) => (x.id === p.id ? { ...x, sus: { 'egy-cup': 1 } } : x)) };
  const fit = squadOf(w2, c.clubId).filter(available).length;
  rep('F10', fit === squadOf(w2, c.clubId).length, `Today's "x of y fit" uses available() (injury + league ban only): a cup-banned player still counts (${fit}/${squadOf(w2, c.clubId).length}); tired players count as fit too`);
}

// F11 — quick match full time.
rep('F11', true, 'QuickMatch.tsx: onFinish={() => setGame(null)} returns to the team picker; no full-time report, no Rematch');

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
  rep('F17', !ok, `round trip ${back.ok}; tampered rejected ${!tampered.ok}(${tampered.ok ? '' : tampered.reason}); future version rejected ${!future.ok}; junk rejected ${!junk.ok}. Slot writes overwrite in place with no previous-version copy (slots.ts)`);
}

console.log('\n| ID | status | evidence |\n|---|---|---|');
for (const [id, s, why] of rows) console.log(`| ${id} | ${s} | ${why.replace(/\|/g, '/')} |`);
