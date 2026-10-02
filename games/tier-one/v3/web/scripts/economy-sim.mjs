// Monthly currency inflow model (LAUNCH_BRIEF §37): `node scripts/economy-sim.mjs`.
// Four archetypes, one 30-day month, every coin and XP source the client pays (lib/meta.ts, lib/progress.ts,
// lib/season.ts, lib/awards.ts, lib/byline.ts, screens/Wire.tsx), under the 3.7 numbers and the 3.8 numbers.
// The output is what docs/spec/E-economy.md quotes. Pure arithmetic: no randomness, expected values only.

const DAYS = 30;

// ---------- reward tables
const OLD = {
  daily: { base: 5, T1: 5, T2: 0, T3: 0 }, streak7: 20,
  missionDaily: { always: 10, other: 9 }, missionWeekly: 42, // averages of the 3.7 pools
  market: [15, 25, 40, 70], // by stars 0..3
  drip: 20 / 400, // coins per XP (hidden, up to 4000 XP)
  seasonFree: 235 / 121, // per day, Rumour Mill
  prizeDaily: [60, 40, 25, 10], prizeWeekly: [200, 120, 80, 30],
  xp: { daily: 20, T1: 15, T2: 10, T3: 5, practice: 10, career: 10, room: 15, wireFiled: 5, wireRight: 10, ach: 25, mDaily: 20, mWeekly: 40 },
};
const NEW = {
  daily: { base: 8, T1: 12, T2: 4, T3: 0 }, streak7: 25,
  missionDaily: { always: 5, other: 6.5 }, missionWeekly: 25, // daily 5 (Daily) · 5 / 8 (others); weekly 25
  market: [10, 15, 25, 40], // recommended to the market lane (screens/Wire.tsx STAR_COINS is 15/25/40/70 today)
  drip: 0,
  seasonFree: 300 / 121,
  prizeDaily: [60, 40, 25, 10], prizeWeekly: null,
  xp: { daily: 20, T1: 15, T2: 10, T3: 5, practice: 10, career: 10, room: 15, wireFiled: 5, wireRight: 10, ach: 25, mDaily: 20, mWeekly: 40 },
};

// ---------- archetypes: what a month of play looks like (brief §37)
const ARCH = {
  Casual:   { dailies: 13, tiers: { T1: .05, T2: .25, T3: .45 }, streakRuns: 0, mDaily: .4, mWeekly: 0, career: 1, practice: 2, rooms: 0, marketCalls: 0, marketHit: 0, top10: 0, ach: 1, contactLv: 0.5 },
  Engaged:  { dailies: 30, tiers: { T1: .10, T2: .35, T3: .40 }, streakRuns: 4, mDaily: 2.0, mWeekly: 2.5, career: 8, practice: 4, rooms: 0, marketCalls: 0, marketHit: 0, top10: 0.3, ach: 2, contactLv: 1 },
  Core:     { dailies: 30, tiers: { T1: .15, T2: .40, T3: .35 }, streakRuns: 4, mDaily: 2.5, mWeekly: 4, career: 12, practice: 4, rooms: 12, marketCalls: 30, marketHit: .5, top10: 0.8, ach: 2.5, contactLv: 1.5 },
  Hardcore: { dailies: 30, tiers: { T1: .25, T2: .45, T3: .25 }, streakRuns: 4, mDaily: 3.0, mWeekly: 5, career: 20, practice: 8, rooms: 20, marketCalls: 60, marketHit: .55, top10: 2, ach: 3, contactLv: 2 },
};
const AVG_STAR = 1.6; // mean star index of a called player
const ACH_COINS = 25, CONTACT_LV_COINS = 30;

function month(R, A) {
  const c = {};
  const t = A.tiers;
  c.daily = A.dailies * (R.daily.base + t.T1 * R.daily.T1 + t.T2 * R.daily.T2 + t.T3 * R.daily.T3);
  c.streak = A.streakRuns * R.streak7;
  c.missions = A.mDaily * DAYS * (A.mDaily >= 1 ? (R.missionDaily.always + (A.mDaily - 1) * R.missionDaily.other) / A.mDaily : R.missionDaily.always) + A.mWeekly * 4 * R.missionWeekly;
  c.market = A.marketCalls * A.marketHit * (R.market[1] * (1 - (AVG_STAR - 1)) + R.market[2] * (AVG_STAR - 1));
  c.prizes = A.top10 * ((R.prizeDaily[3] * 7 + R.prizeDaily[2] + R.prizeDaily[1] + R.prizeDaily[0]) / 10) + (R.prizeWeekly ? A.top10 * 0.25 * R.prizeWeekly[3] : 0);
  c.season = R.seasonFree * DAYS;
  c.oneOff = A.ach * ACH_COINS + A.contactLv * CONTACT_LV_COINS;
  const xp = A.dailies * (R.xp.daily + t.T1 * R.xp.T1 + t.T2 * R.xp.T2 + t.T3 * R.xp.T3) + Math.min(A.practice, 3 * DAYS) * R.xp.practice + A.career * R.xp.career + A.rooms * R.xp.room
    + A.marketCalls * R.xp.wireFiled + A.marketCalls * A.marketHit * R.xp.wireRight + A.ach * R.xp.ach + A.mDaily * DAYS * R.xp.mDaily + A.mWeekly * 4 * R.xp.mWeekly;
  c.drip = R.drip * xp;
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  return { ...Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.round(v)])), total: Math.round(total), xp: Math.round(xp) };
}

const fmt = (n) => String(n).padStart(6);
for (const [name, R] of [['3.7 (old)', OLD], ['3.8 (new)', NEW]]) {
  console.log(`\n${name}  coins per month`);
  console.log('  arch      daily streak missns market prizes season oneOff  drip | TOTAL |   XP  lv/season(230/lv, 121d)');
  for (const [a, A] of Object.entries(ARCH)) {
    const m = month(R, A);
    const lv = Math.min(40, Math.floor((m.xp * 121 / 30) / 230) + 1);
    console.log(`  ${a.padEnd(9)}${fmt(m.daily)}${fmt(m.streak)}${fmt(m.missions)}${fmt(m.market)}${fmt(m.prizes)}${fmt(m.season)}${fmt(m.oneOff)}${fmt(m.drip)} |${fmt(m.total)} |${fmt(m.xp)}  ${lv}`);
  }
}

// ---------- affordability under the 3.8 price ladder (coins)
const LADDER = { common: 180, rare: 350, rareTop: 450 };
console.log('\n3.8 affordability (coins): months of play per item');
for (const [a, A] of Object.entries(ARCH)) {
  const m = month(NEW, A).total;
  console.log(`  ${a.padEnd(9)} ${m} coins/mo → common every ${(LADDER.common / m * 30).toFixed(0)} days, rare every ${(LADDER.rare / m * 30).toFixed(0)} days, top rare every ${(LADDER.rareTop / m * 30).toFixed(0)} days`);
}
console.log('\nCoin-priced catalogue: 24 items, ~5,900 coins in all; 1–2 new coin items a month (drops) + vault returns are the inflation guard.');
