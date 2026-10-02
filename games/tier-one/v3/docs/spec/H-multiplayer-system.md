# H · Multiplayer system (Rooms) — 3.8

Brief §16–17, §46, §48. Owner line: *"My friends and I are all trying to embarrass each other with transfer calls"*, not private-tournament infrastructure. Code: `api/tier-one/v3/index.js` (`room.*`), `web/src/lib/social.ts`, `screens/Rooms.tsx`, `ui/social.tsx`, `styles/social.css`, `i18n/parts/rooms38.ts`.

## 1. Decisions (KEEP / REWORK / MERGE / REMOVE / NEW)

| Thing | Call | Why |
|---|---|---|
| One shared board per round, **Daily rules exactly**, scored on the server | KEEP | The whole point: same board, same sources, different nerve. Nothing in a room changes a board or a score (§22, §48). |
| Weekly / daily cadence | KEEP | Weekly is the group-chat rhythm (one argument a week); daily is the sprint for a mad week. |
| Rounds 5 / 10 / 20 | REWORK → **3 / 7 / 14, default 7** | 7 is a week of daily boards or a 7-week season; 3 is a taster; 14 a long season. 20 weekly rounds was five months — nobody finishes it. |
| Cap 24 | REWORK → **hard cap 16, recommended 2–12** | The table, the recap card and the taunt picker stay readable at 16; a group chat is 4–10 people. 2 is the minimum that makes a table. |
| 21-day idle expiry | KEEP | Three weekly rounds nobody opened means the group moved on. The clock restarts on any visit (`room.get`), so a finished room stays readable while anyone still looks at it. |
| Standings / feed / taunts / spectate / leave | KEEP, tightened | See §3–§6. |
| Press Room recap card | NEW | The viral object of multiplayer (§16, §38): posted to the feed once per settled round; shareable as text + 1080×1350 PNG. |
| Rank movement, rivalry stats, head-to-head sheet | NEW | Tap any table row. |
| Host kick, host rematch ("run it back") | NEW | Leaked links need a door; a finished season needs a one-tap sequel. |
| Challenges ("Beat my board") and Newsrooms (clans) | REMOVE (already unreachable since 3.6) | Duplicate social loops; their CSS, strings-of-use and feed types are gone. Old links land on the lobby with "This link has expired". |
| Gold "DONE DEAL" feed cards | REMOVE → gold is for **Exclusives** only (§8) | The feed names who broke a story first; the `hwg` field is still sent for 3.7 clients. |
| Taunt line with a catchphrase in it | REWORK | Taunts are about calls and records; catchphrases stay the player's own. |

## 2. Room math (§17)

| Rule | Value | Why |
|---|---|---|
| Min players | 2 (a table needs two; a round with one filer is "played", not "won") | A round win needs ≥ 2 filers. |
| Recommended | 2–12, shown on create | Readability + group-chat scale. |
| Hard cap | 16 (`MAX_ROOM`) | Recap card lists up to 16; table pages 5 a page. |
| Code | 5 chars from the unambiguous alphabet, ≈ 33 M codes, 8 create retries on collision; join accepts 4–8 (old codes) | Short enough to read out across a pub; invite link `?room=CODE` fills it in. |
| Rounds | 3 / 7 / 14, default 7 | Above. |
| Cadence · open duration | weekly: Monday 00:00 UTC → Sunday 24:00 (168 h); daily: a round a day, each open 48 h | Weekly rounds follow the real calendar so "Sunday night" means something; a 48 h daily round survives one missed evening and every time zone. |
| Late join | Any time until the last round closes; earlier settled rounds are **missed** (0) | No catch-up boards: a round's board is frozen when it opens (Addendum B) and its recap is already in the feed. |
| Missed round | 0 points, `x` in form, no further penalty, counted in "played N/M" | The points you didn't score are the penalty; negative penalties would punish holidays. |
| Round settled | When its clock runs out **or** every seat has filed | Small rooms get their recap the same evening. |
| Round win | Top score among filers (≥ 2); ties share (`d`) | |
| Table tie-breakers | total points → round wins → exclusives → longest seated | Wins reward showing up every round; exclusives reward nerve; seniority is a stable last resort. |
| Round tie-breakers (recap order) | score → exclusives → earliest filed | Early journalism (§7). |
| Inactivity / expiry | 21 days without any `room.get`; every key EXPIREs with the room | |
| Host transfer | Leaving host → longest-seated remaining player; last seat out closes the room | Predictable; no vote UI. |
| Abandonment | Same as expiry; a room with no filer in 3 weekly rounds is dead by construction | |
| Archive | A finished room stays readable (table, recaps, film) for 21 days after the last visit, then goes; the client drops it with a note | |
| Taunt cooldown | **30 s** per reporter per room (`TAUNT_GAP`), 8 preset lines, aimed at the room or one seat | Banter flows, spam doesn't; fixes the 45 s / "a minute" mismatch (§35). |
| Spectating | Everyone's calls (the film) and the recap only once the round is **settled**; before that nobody — filed or not — sees another seat's calls | Spoiler-free for whoever still has time to play. |
| Reward eligibility | Rounds pay followers at 80 % of the Daily rate, 15 season XP, missions "play a room"; **no coins/credits/cosmetics change a room score** | §22, §48. Rooms never touch the Daily leaderboard. |
| One seat per reporter | `room.join` refuses a device whose public id already holds a seat in that room (`seated`) | You can't scout your own board from a second seat. |
| Anti-cheat | Board, answers and scoring live on the server (`settle()`); the client sends calls, never scores; sessions are keyed by `{room, round, seat}`; results come from the stored session, never from the player doc the client could describe | §48. |

## 3. Screens (one viewport each, Back top-left)

* **Lobby**: hero, `New room` (gold) · `Join`, "Your rooms" (4 a page, ‹ › arrows), Leaderboard. Join sheet = name + 5-letter code; invite links open it pre-filled; no account needed. Create sheet = name, room name, cadence, rounds, size note.
* **Room**: head (code · Copy · Invite → system share sheet or WhatsApp), state line ("Round 3 is open · 41 h left · 6/16 seats"), tabs **Table · Rounds · Feed**, bottom bar (Leaderboard · Run it back / Join the new season · Leave).
  * Table: 5 rows a page, crown on top, form dots (w/l/d/x), ★ exclusives; tap a row → head-to-head sheet (points, wins, exclusives, played; you–them record, run, best rounds; host: *Show them the door*).
  * Rounds: 4 a page; `Play` on the open one (pulsing), `Press Box` once settled, `Front page` for your own result while others play.
  * Feed: 4 a page; Taunt sheet; recap cards are tappable.
* **Press Box sheet**: the card + Share (image where the device takes files, else text) · WhatsApp · Copy text · Watch (the round on film).
* **The round on film**: day-by-day strip, reduced-motion shows all seven days at once.

## 4. The recap (server `recapOf`, client `recapView`)

`THE PRESS BOX · <room> · ROUND n` → table with ▲/▼ rank movement (table before vs after the round) → **BIGGEST SCOOP** (best correct call; exclusives first, then points) → **DISASTER OF THE ROUND** (worst wrong call by points) → first exclusive (earliest day, then earliest filed) → who missed. Text is spoiler-safe for a Daily board (a room board is its own seed). The server posts it to the feed exactly once per round (`room:v3:<code>:recap:<k>` NX marker) when the round settles.

## 5. Server API (unchanged shapes + additions)

`room.create {nick,name,rounds,cadence,dev,flair,tier}` → `{room,pid,sec}` · `room.join {code,nick,…}` (errors `not found | full | over | seated | nick`) · `room.get {code,pid,sec,…}` → `{room}` with `max, over, tauntGap, next, feed[]` (error `seat` when kicked) · `room.leave` · `room.kick {who}` (host) · `room.rematch` (host, season over) → new `{room,pid,sec}`; old room gets `next` · `room.post {k,to?}` (error `slow` + `gap`) · `room.round {round}` → `{cast, players[], days, recap}` or `not yet` + `waiting`. Feed event types: `open join filed taunt leave kick recap rematch`.

## 6. Client exports others rely on

`lib/social.ts`: `loadRoom`, `forgetRoom`, `standings`, `friendRivals`, `friendDuel`, `identity`, `myPub`, `roomUrl`, `recapView`, `recapText`, `renderRecapCard`, `shareRecap`, `whatsappUrl`, `ROOM_SIZE`, `ROOM_ROUNDS`, `ROOM_ROUNDS_DEFAULT`, types `Room`, `RoomRef`, `RecapView`, `SocialSave`. `ui/social.tsx`: `Handle`, `withHandle`, `Flair`, `Byline`, `RecapCard`, `LivePresence`, `FriendRivalCard`, `SocialWatch` (mount point, no-op).

## 7. Open / for other lanes

* Push: "room round opened" / "round nearly closing" (§33) — notification lane.
* Analytics: `multiplayer room created`, `invite sent`, `invite joined` (§54) — fire from `create` / `shareInvite` / `join` once the analytics helper exists.
* Rival portraits on the recap card (Addendum A) once `<Portrait>` lands; friends stay initials (real people, never character art).
