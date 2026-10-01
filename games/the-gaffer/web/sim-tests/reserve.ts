// A fee agreed with a selling club is held back while the agent's terms are talked (audit GF-013): it shows as spent in
// the spending room, blocks a second deal that would need the same money, and doesn't block its own completion.
// node sim-tests/build.mjs reserve
import { generateRealWorld } from '../src/sim/seed';
import { newCareer } from '../src/sim/season';
import { rcOf, withRC, type Negotiation } from '../src/sim/recruit/state';
import { reserved, spendingRoom } from '../src/sim/recruit/money';
import { dispatch } from '../src/sim/commands';
import { squadOf } from '../src/sim/world';

let fails = 0;
const ok = (c: boolean, msg: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) fails++; };

const w = generateRealWorld(7);
let c = newCareer(w, 7, 'egy-al-ahly', 'Test', { age: 40, nationality: 'EGY' }, 2026);
const budget = w.clubs.find((x) => x.id === 'egy-al-ahly')!.budget;
const target = squadOf(w, 'egy-zamalek').sort((a, b) => b.rating - a.rating)[3];
const fee = Math.round(budget * 0.7);
const neg: Negotiation = {
  id: 'n-test', playerId: target.id, pn: target.name, from: 'egy-zamalek', stage: 'terms', opened: 0, bids: [], clubPatience: 3,
  answerAt: null, counter: null, rival: null, fee: { upfront: fee, inst: [], sellOn: 0 }, rounds: [], patience: 5, due: null,
};
const room0 = spendingRoom(w, c);
c = withRC(c, { ...rcOf(c), negs: [...rcOf(c).negs, neg] });
ok(reserved(c) === fee && spendingRoom(w, c) === room0 - fee, `an agreed fee (${fee}) is held back: room ${room0} -> ${spendingRoom(w, c)}`);
ok(spendingRoom(w, c, 'n-test') === room0, 'the deal itself still sees the whole room when it completes');
// A second bid that needs the same money is refused up front, not after its own fee is agreed.
const other = squadOf(w, 'egy-pyramids').sort((a, b) => b.rating - a.rating)[2];
const r = dispatch(w, c, { type: 'rc.bid', playerId: other.id, offer: { upfront: Math.round(budget * 0.5), inst: [], sellOn: 0 } } as never);
ok(!r.ok && r.reason === 'budget', `a second bid for 50% of the budget is refused: ${r.ok ? 'accepted' : r.reason}`);
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
