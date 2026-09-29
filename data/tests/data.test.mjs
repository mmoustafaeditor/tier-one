// Quick checks for the data service: node --test data/tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSquad, parseInfobox, parseTransferTables, parseInOutLists, parseFee } from '../tools/wikitext.mjs';
import { normalizePlayer, normalizeRumour, normalizeClub, shortName, problems } from '../../api/data/_lib/normalize.js';
import { playerId, slug } from '../../api/data/_lib/ids.js';
import { heat, liveStatus } from '../../api/data/_lib/heat.js';
import { validate } from '../tools/validate.mjs';

const SQUAD = `==Players==
===First-team squad===
{{Fs start}}
{{Fs player|no=1|nat=ESP|pos=GK|name=[[David Raya]]}}
{{Fs player|no=4|nat=ENG|pos=DF|name=[[Ben White (footballer)|Ben White]]}}
{{Fs player|no=8|nat=NOR|pos=MF|name=[[Martin Ødegaard]]|other=[[Captain (association football)|captain]]}}
{{Fs player|no=22|nat=ENG|pos=FW|name=[[Ethan Nwaneri]]|other=on loan to [[Borussia Dortmund]] until 30 June 2027}}
{{Fs end}}
===Academy===
{{Fs player|no=70|nat=ENG|pos=FW|name=Kid Prospect}}
{{Infobox football club|clubname=Arsenal|body1=F00000|shorts1=FFFFFF}}`;

test('squad parser: first team, loans, captain, academy skipped', () => {
  const rows = parseSquad(SQUAD);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[1], { ...rows[1], name: 'Ben White', ref: 'Ben White (footballer)', pos: 'DF', no: 4, nat: 'ENG' });
  assert.equal(rows[2].captain, true);
  assert.equal(rows[3].section, 'loanOut');
  assert.equal(rows[3].loanTo.title, 'Borussia Dortmund');
  assert.deepEqual(parseInfobox(SQUAD).colors, ['#F00000', '#FFFFFF']);
});

test('transfer table + in/out list parsers', () => {
  const table = `{| class="wikitable"\n!Date\n!Player\n!Moving from\n!Moving to\n!Fee\n|-\n| rowspan="2" |21 August 2026\n|{{sortname|Ezri|Konsa}}\n|[[Aston Villa F.C.|Aston Villa]]\n|[[Arsenal F.C.|Arsenal]]\n|£51m<ref>{{cite web|url=https://www.arsenal.com/x}}</ref>\n|-\n|{{sortname|Some|One|dab=footballer}}\n|[[Arsenal F.C.|Arsenal]]\n|[[Porto]]\n|Loan\n|}`;
  const t = parseTransferTables(table);
  assert.equal(t.length, 2);
  assert.equal(t[0].date, '2026-08-21');
  assert.deepEqual(t[0].fee.amount, { value: 51000000, currency: 'GBP' });
  assert.equal(t[1].date, '2026-08-21');
  assert.equal(t[1].player.ref, 'Some One (footballer)');
  assert.equal(t[1].fee.type, 'loan');
  const io = parseInOutLists(`===[[FC Bayern Munich|Bayern Munich]]===\n'''In:'''\n{{fs player|no=11|nat=GER|pos=DF|name=[[Nathaniel Brown]]|other=from [[Eintracht Frankfurt]]}}<ref>{{cite web|url=https://fcbayern.com/a|date=3 July 2026}}</ref>\n'''Out:'''\n{{fs player|no=|nat=ESP|pos=FW|name=[[Bryan Zaragoza]]|other=on loan to [[RCD Espanyol|Espanyol]]}}\n{{fs player|no=|nat=SEN|pos=FW|name=[[N J]]|other=loan return to [[Chelsea F.C.|Chelsea]]}}`);
  assert.equal(io.length, 2);
  assert.equal(io[0].to.title, 'FC Bayern Munich');
  assert.equal(io[0].date, '2026-07-03');
  assert.equal(io[1].fee.type, 'loan');
  assert.equal(io[1].to.title, 'RCD Espanyol');
  assert.equal(parseFee('€40.0m').amount.currency, 'EUR');
});

test('normalizer: stable ids, clean fields, validation', () => {
  assert.equal(playerId({ ref: 'Ben White (footballer)' }), 'p-ben-white-footballer');
  assert.equal(slug('Martin Ødegaard'), 'martin-odegaard');
  const p = normalizePlayer({ name: 'Virgil van Dijk', ref: 'Virgil van Dijk', nat: 'ned', pos: 'DF', no: '4', clubId: 'eng-liverpool', contractEnd: 2027, extra: 'x' });
  assert.equal(p.shortName, 'van Dijk');
  assert.equal(p.nationality, 'NED');
  assert.equal(p.shirtNumber, 4);
  assert.equal(normalizePlayer({ name: 'X', no: 'n/a' }).shirtNumber, null);
  assert.equal(p.contractEnd, '2027-06-30');
  assert.equal('extra' in p, false);
  assert.equal(shortName('Kevin De Bruyne'), 'De Bruyne');
  const c = normalizeClub({ id: 'x', name: 'X', leagueId: 'eng1', country: 'ENG', colors: ['#ffffff'] });
  assert.equal(c.colors.secondary, '#111111');
  const r = normalizeRumour({ playerName: 'A B', currentClubId: 'eng-x', linked: [{ clubId: 'eng-y', stage: 'bid' }], fact: 'Y bid for A B.', outlets: [{ name: 'BBC Sport', tier: 1, url: 'https://bbc.co.uk/x', date: '2026-09-20' }, { name: 'Bad', url: 'javascript:x' }] });
  assert.equal(r.credibility, 'strong');
  assert.equal(r.lastSeen, '2026-09-20');
  assert.equal(r.outlets[1].url, null);
  assert.deepEqual(problems('rumour', r), []);
});

test('rumour heat decays and dies', () => {
  const r = normalizeRumour({ playerName: 'A B', linked: [{ clubId: 'y', stage: 'talks' }], fact: 'f', window: '2027-01', outlets: [{ name: 'Sky Sports', tier: 1, date: '2026-09-29' }] });
  const now = Date.parse('2026-09-29T12:00:00Z');
  const h0 = heat(r, now), h14 = heat(r, now + 14 * 864e5);
  assert.ok(h0 > 50 && Math.abs(h14 - h0 / 2) <= 1);
  assert.equal(liveStatus(r, now + 61 * 864e5), 'dead');
});

test('validator flags unexplained moves and vanished clubs', () => {
  const base = { meta: { asOf: '2026-09-29' }, clubs: [{ id: 'a', name: 'A', leagueId: 'l', country: 'ENG', colors: { primary: '#000000' } }, { id: 'b', name: 'B', leagueId: 'l', country: 'ENG', colors: { primary: '#000000' } }], transfers: [], rumours: [] };
  const mk = (club) => Array.from({ length: 18 }, (_, i) => ({ id: 'p' + i, name: 'P ' + i, clubId: i === 0 ? club : 'a', position: 'MF' })).concat(Array.from({ length: 18 }, (_, i) => ({ id: 'q' + i, name: 'Q ' + i, clubId: 'b', position: 'MF' })));
  const prev = { ...base, players: mk('a') };
  const cur = { ...base, meta: { asOf: '2026-10-06' }, players: mk('b') };
  const rep = validate(cur, prev, { today: '2026-10-06' });
  assert.equal(rep.errors.length, 0, rep.errors.join());
  assert.ok(rep.warnings.some((w) => /no transfer on record/.test(w)));
  const rep2 = validate({ ...cur, clubs: cur.clubs.slice(0, 1), players: cur.players.filter((p) => p.clubId === 'a') }, prev, { today: '2026-10-06' });
  assert.ok(rep2.errors.some((e) => /disappeared/.test(e)));
});
