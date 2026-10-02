# Tier One: Feature Inventory (as built, version 3.7.0)

This describes the game exactly as the code works today (2 October 2026). Names in quotes are the words players see on screen (English edition). Where the code and the on-screen words disagree, it is noted in section 12, "Known gaps and leftovers".

---

## 1. What the game is

Tier One is a football transfer journalist game. You play a reporter during a 7-day transfer window. Each window has a few "sagas": a real player linked with a real club. Exactly one of four things is true about each saga: "Done" (he signs for that club), "Hijack" (he leaves, but for another club), "Off" (real talks that collapsed) or "Fake" (there were never talks). You spend a few "contact points" each day ringing sources (the kit man, the barber, the agent, the airport spotter, the physio). Some sources lie, and the gossip sources all repeat the same planted wrong story. You then publish your call at one of three volumes ("In talks", "Advanced", "Confirmed"). Louder pays more and costs more. Being early pays more. Beating three rival accounts to a correct "Confirmed" call earns an "Exclusive". Day 7 is "Deadline Day": a real 60-second clock. You get a score and a newspaper "tier" (Tier 1 down to "Spiked"). Around this core sit four modes: a shared Daily Challenge, a story-driven Career Mode, Multiplayer rooms with friends, and a Transfer Market where you call real-world rumours that settle on what really happens.

---

## 2. Where everything is (quick map)

### The bottom tab bar (always visible except while you are playing a window)
- "Home": the main hub (see below).
- "Career Mode": the story mode.
- "Transfer Market": real rumours.
- "Multiplayer": rooms with friends.
- "My Press Card": your profile and everything about your name.
- On a wide desktop screen the tab bar becomes a left rail with a "T1" logo.

### The top bar (on every screen)
- Left: the "Tier One" logo on Home, or a back button with the name of where it goes (for example "‹ Home") on other screens. Some screens also show a title in the middle.
- Right side, in order:
  - The bell (notifications). Opens a small "Notifications" panel.
  - The coins button (gold coin and your coin balance). Opens the Shop, filtered to "Showing what coins buy".
  - The credits button (a "C" badge and your credit balance). Opens the Shop, filtered to "Showing what credits buy".
  - A "?" button on some screens (Career Mode, Transfer Market, Multiplayer). Opens "How to play".
  - A menu button (three lines) on some screens (Home, My Press Card, Shop, Practice, How to play, the Pass page). Opens "Settings".

### Home opens
- My Press Card mini card: the header opens "My Press Card"; each of the four stat boxes opens its mode.
- "Missions" box: opens the Missions page.
- Four mode tiles: "Daily Challenge", "Career Mode", "Multiplayer", "Transfer Market".
- "Shop" tile: opens the Shop.

### Daily Challenge hub (Home › Daily Challenge) opens
- Today's Daily (the board).
- "Deadline Day Live".
- "Practice".
- "Leaderboard" (Leaderboards, Daily tab).

### Career Mode (bottom tab, or Home › Career Mode) opens
- The cover (first time) or the "Continue" / "New career" door.
- The chapter screen: "Play window N", "Messages", and four buttons: "Case file", "Your record", "Sources", "Saves".

### Transfer Market (bottom tab, or Home › Transfer Market) opens
- Two tabs: "Market" and "My calls".
- A trophy icon: Leaderboards, Transfer Market tab.
- Tapping a rumour opens its file sheet where you make your call.

### Multiplayer (bottom tab, or Home › Multiplayer) opens
- "New room", "Join", "Your press boxes" (your rooms), "Leaderboard" (Leaderboards, Rooms tab).
- Inside a room: tabs "Rounds", "Table", "Feed", plus "Leaderboard" and "Leave room".

### My Press Card (bottom tab, or Home › mini card header) opens
- The byline card at the top, a row of four stats, then tiles (6 per page, arrows to page): "Leaderboards", "Badges", "Your style", "Feed", "Rivals", "Contacts", "Pass & store", "Replays", "How to play", "Replay the training".

### Shop (Home › Shop tile, or top bar › coins / credits button)
- Two top tabs: "Game customization" and "Game modes".
- Inside Game customization: three sections "Looks", "New & limited", "Friends & receipts".

### Settings (top bar › menu button on screens that have it)
- Language, Edition, Sound, Reduce motion, Film, Show tips again, Name, How to play, version number.

---

## 3. How the game is organised

### Languages
- English, Arabic (full right-to-left layout) and Spanish ("Español"). Chosen automatically from the device, changeable during first launch and in Settings › Language.

### Devices
- Web: plays in any browser at sembagames.app/tier-one. Can be added to the home screen as an app ("Keep Tier One on your home screen" prompt, "Add it" / "Not now"). Works offline for the parts that do not need the server.
- Tablet and desktop: wider layouts. On desktop the board and the player file sit side by side, and the tab bar becomes a left rail. Desktop keyboard: keys 1 to 5 open saga cards on the board, Esc goes back, "?" opens How to play, Enter fires the main button. Collectible cards lean toward the mouse pointer.
- Android app: a downloadable APK that runs the same web game inside the app. The phone's Back button goes to Home. It checks for updates itself and offers a download.

### Fairness rule (repeated on many screens)
- "Same board for everyone. Nothing you buy changes your Daily score." Nothing for sale affects the Daily Challenge, Multiplayer or the Transfer Market. Shop items are looks only, plus a few Career Mode extras.

---

## 4. Home

Home is one screen with no scrolling. Behind it plays an animated "desk" background (and a desk lamp glow if you have bought one).

### First-time tip
- A one-line tip with a close (✕) button: "Pick a mode. The Daily Challenge is new every day." Each tip shows once and never again (unless you choose Settings › "Show tips again"). Other screens have their own tips (see each mode).

### The mini "My Press Card"
- Header button: your initials badge, the label "My Press Card", your name (or "New reporter"), and "Lv N" (your season level, 1 to 40). Tapping it opens My Press Card.
- Four stat boxes, one per mode. Each opens that mode:
  - "Daily Challenge": your day streak with a flame, label "Daily streak", and "Best: Tier X · N" (your best Daily) or "No Daily yet". Opens the Daily Challenge hub.
  - "Career Mode": your followers (for example "12.4k"), label "Followers", and your Career rank name (Blogger, Stringer, Correspondent, Chief, Tier One) or "Not started".
  - "Transfer Market": calls right out of calls settled (for example "3/5"), label "Calls right", and "Hit rate N%" or "No results yet".
  - "Multiplayer": how many rooms you are in, label "Rooms", and "N wins".

### The "Missions" box
- Shows your top three missions (ready-to-claim ones first, then the closest to done, claimed ones last). Each has a progress bar and its coin payout ("+10"), or a tick when claimed.
- A red number badge appears when missions are ready to claim.
- Tapping the box opens the Missions page.

### The four mode tiles
- "Daily Challenge": subtitle "Today's five · closes in HH:MM:SS" (a live countdown to midnight UTC), or "Back to day N" if you left mid-window, or "Filed · N pts" once played. The tile glows when today's Daily is not played yet. Opens the Daily Challenge hub.
- "Career Mode": "Start your comeback" (no career yet), "Chapter C · window N", or "Window in progress".
- "Multiplayer": "Play friends in a room", "1 room" or "N rooms".
- "Transfer Market": "N calls live" (your open calls) or "Call real transfers before they happen".

### The "Shop" tile
- "Shop · Looks, and extras for Career Mode". Opens the Shop.

### The notification bell (top bar)
- Shows a red count of unread notes ("9+" above nine). The bell pops when a new note arrives.
- It is not a full feed. It holds at most five short notes, newest first:
  - "A new Daily Challenge is out." (until you play today's Daily). Opens the Daily hub.
  - A Transfer Market call of yours settled: "Your market call on [player] landed: +N followers", "...missed: −N followers", or "...missed, but a Tier 1 credit covered it: no followers lost." Opens that rumour.
  - A rumour you have an open call on moved up a stage: "[player]: now in talks with [club]" (stages: linked, in talks, bid, fee agreed). Opens that rumour.
  - "New in the Shop: [item]" (at most one, only in the week a new look arrives). Opens the Shop.
- Opening the panel marks them read. Empty state: "Nothing new. Important news about your calls lands here."

### The morning papers (automatic, on Home)
- The first time you open Home each day (once you have played anything before), a short film "The paper's out" plays, then a sheet "The morning papers" opens:
  - A headline about the most important thing (for example "Daily No. 31: Tier 2", "Your call on [player] settled", "@ITK_Kev has something to say", "[rival] took your slot on the table", or "A new day on the desk").
  - "Overnight": up to three feed items since your last visit, and "They said": one rival taunt.
  - Your yesterday's Daily rank and your streak line.
  - "Today's assignments": three suggested next things, each with a go arrow.
  - "Welcome back" box if you were away 3 or more days ("N days away. The desk kept your seat.").
  - Button "To the desk" closes it.

---

## 5. Daily Challenge

### 5.1 The hub (Home › Daily Challenge)
- Title "Daily Challenge", back to Home.
- Main card:
  - "The Daily · No. N" (Daily No. 1 was 1 September 2026; the number goes up by one each day) and a live clock counting down to the reset at midnight UTC (shown in your local time elsewhere as "New five at HH:MM").
  - "Today's five": five kit shirts with player names (outcomes stay secret).
  - A Monday-to-Sunday strip with ticks on the days you played.
  - Once played: your tier stamp, points and rank ("Filed · 135 pts · #12").
  - Big button: "Play today's Daily" (pulses), "Back to day N", or "See your result".
- "Deadline Day Live" banner appears here only on a real deadline day (see 5.11).
- Two cards:
  - "Deadline Day Live" (subtitle "Sixty seconds, everyone at once"). Opens Deadline Day Live.
  - "Practice" (subtitle "Any board, no pressure, no rank", or "Back to day N" if a practice board is in progress).
- "Leaderboard" button: Leaderboards, Daily tab.

### 5.2 The rules in one place
- 5 sagas, 7 days. Day 7 is Deadline Day.
- One attempt per day. The board is held and scored on the server, so nobody can peek at the answers. It needs an internet connection ("The Daily is held on our server so nobody can peek at the answers. It needs a connection." with "Practise offline instead").
- Same board, same answers for everyone: the same question to the same source on the same saga always gives the same answer.
- Starting chances of each truth: Done 35%, Hijack 20%, Off 25%, Fake 20%.
- Every saga has one planted wrong story ("the spin"). Gossip sources repeat it when they are wrong, so they are wrong together. "Count the street once."
- Contact points: 4 a day on days 1 to 6, 3 on Deadline Day. Unused points are lost ("Unused points don't roll over. Nor does sleep.").
- Each source answers once per saga (again after a twist).

### 5.3 The board (Home › Daily Challenge › Play today's Daily)
- Before day 1, "Today's brief" sheet opens once a day: a line from the editor (Mags Doyle), today's five, "Your style" with a tip, "The stake" (your streak and which rival takes your slot if you miss), how many reporters are on the board now, and a Deadline Day Live link on deadline days. Button "Open the phones".
- Top bar: back to Home, title "Daily No. N".
- "N reporters on this board now" (live count, no names). After you finish: "First to break it: [name] on [player]" or "You broke it first".
- On deadline days only: a scrolling "DD LIVE" ticker showing what everyone is calling on Deadline Day Live.
- Day strip 1 to 7 (ticks for past days, a clock on day 7). "The Daily · [date]", "Day N".
- Phone icons showing points left: "N calls left today" or "No calls left".
- Tip (first time): "Tap a player to ring sources. Sleep moves you to the next day."
- Five saga cards. Each shows the kit shirt, the player's name, the current club crest → the linked club crest and name, and chips:
  - "Twist" if the saga has twisted.
  - "Not rung yet", or "Leans [outcome]" (with "✓✓" when two different evidence circles agree), or "Split".
  - A lightning chip "N rival" when rivals have posted on it.
  - Once you filed: a stamp with your outcome (or your catchphrase in gold for a Confirmed Done call).
- "Sleep on it · day N" (or "Sleep on it · Deadline Day" on day 6). If you still have points, it asks "End day N? You still have C contact points." with "End the day" / "Cancel".
- Footer: "Same board for everyone. Nothing you buy changes your Daily score."

### 5.4 The player file and the sources (tap a saga card)
- Player card: kit shirt, "Saga N of 5", a "Superstar" chip for 3-star players, name, position, age, nationality, and current club → linked club "?".
- Banners when relevant: "STOP PRESS" twist banner, "Vince's play" banner (Career only), tip-off result chip (Career only).
- Tip (first time): "Ring two sources, then post your call before the rivals do."
- Three tabs: "Sources", "News (N)", "Your call".

"Sources" tab:
- "What we know": four rows (Done, Hijack, Off, Fake), each with a bar for its evidence tally and small icons of who backs it. A "✓2" chip when two different circles back it. "Nobody's talked yet. Ring someone." when empty. Warning "The street is echoing itself. Count the gossip once." when two or more gossip voices agree. In Practice with Coach on: the exact odds, for example "Done 62% · Hijack 9% · Off 21% · Fake 8%".
- "Ring a source" with phone icons for points left.
- Source tiles. Each shows its cost in points, its icon and name, then either what it said (a coloured chip) or its reliability bars, or a lock with "Opens day N".

The sources (Daily rules):

| Source (tile name) | Cost | Opens | What it can say | How reliable | Reliability label |
|---|---|---|---|---|---|
| Kit man ("The kit man") | 1 point | Day 1 | "Leaving" or "Staying" | Right 80% of the time. Knows if, never where. | Fair source (2 bars) |
| Barber ("The barber") | 1 point | Day 1 | Done / Hijack / Off / Fake | Right 45%; otherwise repeats the planted story. Gossip. | Gossip (1 bar) |
| Agent ("The agent") | 2 points | Day 1 | Done / Hijack / Off / Fake | Says Done 85% when true, but also says "Done" a lot when it isn't (35% to 60% of the time). Her Off or Fake is very telling. | Fair source (2 bars) |
| Airport ("The airport spotter") | 2 points | Day 3 | "Jet to [club]", "Jet elsewhere", "No jets" | 85% right on a move; cannot tell Off from Fake. | Fair source (2 bars) |
| Physio ("The physio") | 3 points | Day 5 | "Medical at [club]", "Medical elsewhere", "No medical" | 92% right; cannot tell Off from Fake. | Rarely wrong (3 bars) |
| Press office ("The press office") | 2 points | Day 1 | Done / Hijack / Off / Fake | 85% right. Career Mode only, only on sagas involving a club that likes you. | Fair source (2 bars) |

What each answer adds to the "What we know" tally:
- Kit man: Leaving adds +1 Done and +1 Hijack. Staying adds +1 Off and +1 Fake.
- Barber: +1 to what he says.
- Agent: Done +1. Hijack, Off or Fake +3.
- Airport: jet to the linked club +3 Done. Elsewhere +3 Hijack. No jets +1 Off, +1 Fake.
- Physio: linked +5 Done. Elsewhere +5 Hijack. No medical +2 Off, +2 Fake.
- Press office: +3 to what it says.
- Rival posts: @BackPageBants +1, @ITK_Kev +2, @PressBoxPete +3 to what they posted.

Evidence "circles" (for the two-source rule): Club (kit man, physio), Agent, Travel (airport), Street (barber, @BackPageBants, @ITK_Kev), Insider (@PressBoxPete), Press office. Reads from the same circle count once.

Ringing a source:
- The phone lifts, then a short wordless film of the source's place plays (2 to 3.5 seconds): the kit room, the barber shop, the agent's office, the airport, the treatment room, the press office. The last second shows what they know (a calendar flips, another club's colours arrive, the paper goes in the bin...). Then the quote lands in "News".
- "On the line", "about [player] → [club]", "Clipped to your file" or "Nothing you can use".
- In the Daily, the first time you ever ring each source, a "Meet [name]" introduction film plays after your results.

"News (N)" tab:
- "Your clippings (N)": every quote word for word, with who said it, the day, a "New" tag on the latest, the outcome it points to, and what it added ("Adds +3 Hijack" or "Adds nothing new").
- Rival posts appear here too.
- "The race": the three rivals, each showing "Posts days a–b" or what they posted and on which day, plus your win–loss–draw record against them.

The "Ready to go public?" prompt:
- Under Sources and News: "Ready to go public on [player]?" with "Decide later" (back to the board) and "Make a call".

### 5.5 The decision ("Your call" tab)
- Heading "Make the call" (or "Your call" / "Change your call?").
- You need at least one read of your own on that saga first: "Ring someone first. No sources, no story."
- Step 1 "What happens?": four buttons:
  - "Done": "Signs for [club]".
  - "Hijack": "Leaves, not for [club]".
  - "Off": "Real talks, collapsed".
  - "Fake": "There were never talks".
- Step 2 "How loud?": "In talks", "Advanced", "Confirmed". Each button shows exactly what it would win and lose today (for example "+64 / −60"). Guidance: Confirmed when you'd bet 3-to-2, Advanced when more likely than not, In talks when you just have a lean.
- Stake line: "Right +N", "Wrong −N", and the exclusive status: "Exclusive open: +20", "Beaten by @[rival]", "No exclusive on a repost", "Only Confirmed can be exclusive", or "Two circles needed for an exclusive".
- The publish button: "Hold to publish". It fills over about half a second while held (a tap, Enter or Space also works). Label "Publish · [Strength] [Outcome]". For a Confirmed Done call the button turns gold and shows your catchphrase in capitals.
- "How's this scored?" expander: each source's rule, the current tally per outcome with circle lines, and the points table.
- After you publish: a short "post" film. Your post types itself, the city lights up, replies, reposts and likes tick up, and fan reactions pop in. A Confirmed Done call slams your catchphrase with gold, lights and confetti. Then the saga card gets its stamp.

U-turns ("Delete & repost"):
- Once per saga. Button "Delete & repost" on a filed call, then "Delete & repost · [outcome]".
- The old call is withdrawn and costs a penalty: In talks −3, Advanced −8, Confirmed −30. The new call scores from today and can never be an exclusive.
- A special film shows the old post struck through, mocking replies ("screenshotted before you deleted it", "Sat nav energy"), then the new post.
- Not possible on Deadline Day once your three posts are used.

### 5.6 Scoring (exact numbers)

| Strength | Right: base | Early bonus per day left | Exclusive | Wrong | U-turn penalty |
|---|---|---|---|---|---|
| In talks | +10 | +1 | none | −5 | −3 |
| Advanced | +20 | +2 | none | −15 | −8 |
| Confirmed | +40 | +4 | +20 | −60 | −30 |

- "Days left" = 7 minus the day you filed. So a right call on day 1 pays In talks +16, Advanced +32, Confirmed +64 (+84 with the exclusive). On Deadline Day there is no early bonus.
- Exclusive: a right Confirmed call earns +20 if (a) two different evidence circles pointed to it when you posted, and (b) no rival had already posted the correct outcome before your day. Never on a U-turn.
- Uncalled sagas score 0.
- Score range on one board: −450 to +420.

Tiers (result):
- "Tier 1": 180+ points AND at least one exclusive. "Front page, above the fold. You broke one."
- "Tier 2": 120+. "Solid on the back page. One scoop off the front."
- "Tier 3": 70+. "Page nine, but it's in."
- "Tier 4": 0+. "In the paper. Just."
- "Spiked": below zero. "Spiked. The editor wants a word."

### 5.7 Twists
- Exactly one real saga (never a Fake one) twists per window, at dawn on day 4 or day 5 (50/50). It is announced.
- Overnight screen: the screen glitches and "STOP PRESS" slams down: "TWIST · the [player] saga has turned". "The story changed at dawn. What the sources said before was true then. It doesn't count now, and your call on it was withdrawn at no cost."
- After a twist: old reads on that saga stop counting (shown under "Before the twist"), your call on it is cancelled for free (including any U-turn penalty), sources can be asked again, and only rival posts made after the twist count.
- If a board has no real saga at all, day 5 announces "No twist this window."

### 5.8 Rivals
Three fictional accounts post overnight; you see their posts the next morning.
- "@BackPageBants" (tabloid): "loud, early, often wrong". Posts on days 1–2, on 60% of sagas, right 35% of the time (repeats the planted story when wrong).
- "@ITK_Kev" ("In the know, allegedly"): posts on days 2–4, on 70% of sagas, right 55% (repeats the planted story when wrong).
- "@PressBoxPete" (press box regular, "rarely wrong"): posts on days 5–6, on 85% of sagas, right 75%.
- Their posts add to the tally and can steal your exclusive.
- Overnight screen ("Overnight", "Day N · the morning papers"): dusk to dawn, "N stories broke overnight", then a "BREAKING" card for each rival post with their avatar, their outcome, their post text and a taunt aimed at you ("Got there first. Again.", "Copying our homework now?", "Delete button's top right, friend."). Tap to skip. Button "Start day N".
- Between days a 1.5-second "day end" film plays (lamp off, city, dawn, new date).

### 5.9 Deadline Day (day 7)
- The night before shows "Deadline Day." and "Sixty seconds, three contact points, three posts. The clock starts when you turn the page." with "Start the clock". A Deadline Day film plays first (full once a day, a short cut after).
- The screen turns red: band "Deadline Day · Extra", "N of 3 posts left", a big seconds clock with tenths, a shrinking bar, "Nerve is a stat."
- Heartbeat sound under 30 seconds, ticking and vibration under 10 seconds.
- 3 contact points, at most 3 posts (calls or U-turns). The clock is enforced by the server (4 seconds of network grace).
- The board becomes a quick list: "Still open · One tap to post". Each saga shows your lean and number of circles, with "Post [outcome]" (posts at Advanced), "U-turn to [outcome]", "Ring" (opens the file), or your filed stamp.
- In the last 15 seconds the header becomes "Quick post · Fifteen seconds. One tap posts your lean at Advanced."
- At zero: whistle, "Time. The window is shut.", results.

### 5.10 Results page (all window modes land here)
- A "The paper's out" film plays first (full once a day, then a short cut). Tap to skip the reveal.
- Phone tabs: "Front page" and "Your calls".
- The front page card: "Tier One" masthead, "Daily No. N · date", "By [name]" (or "Exclusive by [name]"), a headline about your best call ("[player] to [club]: you called it" or "A quiet edition"), the tier stamp slamming down, "Points" counting up, "Right x/y", "Exclusives", "#rank of N", and a "Pub verdict" quip.
- Tier 1 plays a fanfare with confetti. Spiked plays a sad sound and the screen shakes.
- Share row: "Share", "Post it" (to X), "Save image", and a catchphrase card ("Called it · [player] · [club] · Filed first on Tier One" with "Post the line") when you landed a Confirmed Done call.
- "How your name moved" strip: followers gained or lost, Reputation (and how far to the next rank), Level (season level) with coins earned, and chips: "Hot hand N", contacts that levelled up, "Beat / Lost to / Drew with @rival", "N-day streak · +N league points" (Daily), "Credibility a → b" and "Favours +N" (Career), a "Promoted" stamp with what it unlocks, what you need for the next rank, and an editor message.
- "Your calls": one row per saga: kit shirt, player, what happened ("Signs for X", "Leaves, not for X · [club]"...), the day you filed, a stamp ("Exclusive", "Right", "Wrong", "No call"), points, and a reply count. Tap a row for a sheet with the fake-social-media thread and the full points breakdown.
- Doors: "N replies" (all the mentions), "Full breakdown" (every point, the tier line, "Tier 1 needs 180 points and an exclusive.", today's par and your weekly rank), "Leaderboard" (Daily: "Today's table" sheet with an "All leaderboards" button; rooms: "Room table"; Career: "Career desk"), "Rivals", "Feed".
- Main buttons: Daily › "Warm up in Practice"; Career › "Next window"; room › "Open the room"; Practice › "Another window"; and "Home". Daily also shows "Tomorrow's board opens at HH:MM".
- "Today's par": the median score once at least three people have filed.

### 5.11 Deadline Day Live (Home › Daily Challenge › Deadline Day Live)
- A separate event, only on real transfer deadline days. The calendar in the code has two: 2 February 2027 and 1 September 2027. On any other day the page says "Not a deadline day. The board opens on [date]."
- On the day: one shared 24-hour board of five real sagas, picked from the hottest real rumours, the same for every player. Window shuts 23:00; the board closes at midnight UTC.
- Each saga card: player, current club → linked club with deal stage, Market price, a real-world fact line (English only), "The room says": a bar of what everyone is calling (counts and percentages only, never names).
- Three outcomes here: "Done · [club]" (joins the linked club), "Hijack" (joins someone else), "Stays".
- Loudness: In talks / Advanced / Confirmed. Points: right +10 / +22 / +40, wrong −4 / −12 / −30. Calls filed before 12:00 UTC pay ×1.25 when right ("Early bird"). One call per saga plus one "Delete & repost".
- After midnight: "Results" with each saga's real outcome (or "Pending" until the real paperwork appears in the data), your points and "The global table" (top 15 shown).
- Banners for it appear on the Daily hub, in the editor queue, and as the "DD LIVE" ticker on the Daily board. Opening and closing films play once per deadline day.
- Taking part unlocks an earned-only look for that deadline day.

### 5.12 Practice (Home › Daily Challenge › Practice)
- "Off the record · N played". "Nothing counts. Everything teaches."
- "Resume practice" if a board is in progress.
- "New random board".
- "Coach mode" switch: shows the exact odds on every saga, worked out from what you can see.
- This week's event banner (see 9.9).
- "Play a board code": type any code; the same code always gives the same board ("Send one to a friend.").
- "Replay a past Daily": the last 7 days (back to 1 September 2026), exactly as everyone played them. Needs a connection.
- Practice runs on your device and works offline. No rank, no leaderboard ("Practice is off the record. No table, no witnesses.").

### 5.13 Leaderboards (Daily hub › Leaderboard, and other places)
- Tabs: "Daily", "Rooms", "Transfer Market".
- Your rank card ("You're #r of N", your points), or "Not on today's board yet." with "Play today's Daily".
- Daily prize ladder text: "Top 3 wins 60 / 40 / 25 coins. Top 10 wins 10."
- Top 25 rows from the server, 6 per page, crowns for the top three, your row highlighted.
- Rooms tab: your place in each room you belong to, tap to open the room.
- Transfer Market tab: this season's market "Cred" board.
- Prize cards at the top: "Yesterday's Daily: you finished #r of N reporters" with "Collect N coins". Prizes need at least 3 players on the board.

### 5.14 Sharing
- "Share": uses the phone's share sheet with a generated image (the scoop card) and text. If sharing is not available, it copies the text ("Copied").
- The text: "Tier One · Daily No. N · Tier 2 · 135 pts", then a one-line grid (★ exclusive, ■ right, □ wrong, · not filed), then the link. No spoilers.
- "Post it": posts to X with a banter line, the image where possible, the game link and #TierOne #TransferTwitter.
- "Save image": downloads the card as an image.
- The card's look follows your equipped share-card style and headline font.

---

## 6. Career Mode ("The Comeback")

### 6.1 The story
- Premise: on Deadline Day at 23:58, agent Vince Marlow rang you with an exclusive. You published "DONE DEAL". At 00:03 the player signed somewhere else. You lost 38,200 followers by breakfast and your job at The Chronicle. An unknown number texted "Nothing personal." Someone fed you the fake on purpose. Rebuild your name from a free blog to the front page and find out who.
- Characters: Mags Doyle (your old editor at The Chronicle), Hana Okafor (Evening Post editor), the sports desk, Vince Marlow (the agent), Carl Stubbs (Daily Roar), Priya (the intern), and your named sources: Dougie (kit man), Sal (barber), Rosa Lindqvist (agent), Terminal Tony (airport spotter), Dr Inès (physio). Rivals: @BackPageBants, @ITK_Kev, @PressBoxPete.

### 6.2 Getting in
- First visit with no career: the cover "The Comeback" with the hook, "−38,200 followers gone by breakfast", the "Nothing personal." text, and "Start the story". The prologue film "The fall" plays, then a title card with the story lines and "Start the blog". "Watch the prologue" replays it.
- Note: first launch already creates a career and plays the prologue.
- Each time you enter Career from Home, a door shows first: chapter card (chapter, paper name, windows played, what you need, goal bar), "Continue", and "New career" ("Start a new career? This wipes your Career progress." "Wipe and start" / "Keep it"). A window in progress skips the door.
- Tip (first time): "Play windows to reach the goal and move up a chapter."

### 6.3 Chapters, ranks and how you progress
Chapters are the five ranks. You move up when you have played enough windows AND your reputation ("credibility") is high enough.

| Chapter | Rank | Board | Sources | Rivals | To reach it |
|---|---|---|---|---|---|
| Ch. 1 · The Blog | Blogger | 3 sagas, 3 points a day, smaller clubs, players up to 2 stars | Kit man, barber, agent | @BackPageBants | Start |
| Ch. 2 · The Evening Post | Stringer | 4 sagas, 4 points a day | + airport spotter | + @ITK_Kev | 8 windows and credibility 55 |
| Ch. 3 · The Nationals | Correspondent | 5 sagas, 4 points a day, top clubs | + physio | + @PressBoxPete | 20 windows and credibility 65 |
| Ch. 4 · The War | Chief | 5 sagas, 4 points a day, top clubs, "Vince's play" | all five | all three | 36 windows and credibility 75 |
| Ch. 5 · The Chronicle | Tier One | 6 sagas, 5 points a day, star players, 45-second Deadline Day | all five | all three | 56 windows and credibility 85 |
| Epilogue · The Front Page | (Tier One) | the career carries on | | | Three Tier 1 windows at Tier One rank |

- Each new chapter shows an intro card once, after its film: "New chapter", chapter name, "Your byline: [rank]", premise, an intro quote, and "What's new" (new sources, new rivals, Vince's play), "Let's go". The epilogue card says "Case closed" and "Take a bow".
- Career uses the same scoring as the Daily. It runs on your device (works offline) and is never ranked.

### 6.4 The chapter screen (Career Mode tab › Continue)
- Card: "Chapter N of 5 · [rank]", your paper's name with a pen to rename it (first rename free, then 250 coins), the chapter name, and three lines: "You're at [paper], chapter N.", "Against you: [rivals].", "You need W windows and C credibility." (or "You need N Tier 1 windows."). Goal bar. "Next lead after window N" hint. Big button "Play window N" or "Back to your window".
- "Messages": the inbox, three at a time, newest first, "New" badge.
- Four buttons, each opens a sheet:
  - "Case file": who burned you (see 6.6).
  - "Your record": the chapter trail, your byline (rank stamp, credibility, followers, "Your name, every mode"), stats (windows, % right, exclusives and U-turns, Tier 1 windows), Favours, "Club relations", "Recent windows".
  - "Sources": the five named contacts with their level and what it does here (for example "24% fewer mistakes, and opens a day early.", barber "Right N% of the time with you."), locked ones "Opens in chapter N", and a link to the contacts book.
  - "Saves": "Watch the prologue", "Career saves" (3 slots), and at Tier One rank "Start again at a rival paper".

### 6.5 Favours (Career extras)
- Up to 5 in the drawer. You start with 1 Burner and 1 Tip-off.
- "Burner": +1 contact point today.
- "Tip-off": tells you whether one saga is Fake ("Tip-off: the [player] story is Fake." or "...the talks are real.").
- "Stakeout": the airport spotter opens a day earlier on one saga.
- Earned: +1 for every exclusive and +1 for every Tier 1 window (kinds rotate), +1 Tip-off when a Transfer Market call of yours lands. Bought: 15 coins each in the Shop, max 3 a day.
- Used from the "Favours" tray inside the player file during a Career window.

### 6.6 The mystery (case file)
- Four pieces of evidence, one revealed halfway through each of chapters 1–4 (with a reveal film and a message): "Rosa's warning" (a napkin: "Vince doesn't lose deals by accident."), "Kev's timing" (@ITK_Kev posted "He's not signing" one minute before you), "Tony's photo" (Vince Marlow and Carl Stubbs shaking hands at arrivals), "Priya's call log".
- Solved at the epilogue: "Vince Marlow planted it. Carl Stubbs sold it. You ran the story."
- Finale: at 23:58 Vince rings with the same pitch; your sources say otherwise; you run the story on Vince and the Roar.

### 6.7 Vince's play (chapter 4 onward)
- One saga per window is marked "Vince's play" (eye chip). One of its sources (the agent, the barber or the airport spotter) has been fed a planted line and repeats the wrong story whatever the truth. Scoring is unchanged. After the window, a message names who lied ("Vince's play on [player]: Sal lied. You didn't bite.").
- Never in the Daily, rooms or Practice.

### 6.8 Contacts and trust in Career
- A source's trust is its Contacts Book level (1 to 5), shared with every mode (see 8.5).
- Each level above 1 removes 12% of a source's mistakes (48% fewer at level 5). The barber gains +5% accuracy per level.
- At level 3 the spotter opens on day 2 and the physio on day 4.
- At level 5, from Chief rank, a source gives "a second opinion" (can be asked twice per saga).

### 6.9 Club relations
- Every club in your sagas has a score from −5 to +5. A right call: +1 for both clubs (+2 for an exclusive). A wrong Advanced call −1, a wrong Confirmed call −2. Untouched for 10 windows, it drifts one step back toward 0.
- From Correspondent rank: a club at +3 or more "Returning your calls" gives you a "Press office" source on its sagas (toast "[club]'s press office is returning your calls."). A club at −3 or less "Frozen you out" turns its kit man into an unreliable gossip ("Frozen out: repeats the street").

### 6.10 Story messages (the inbox)
- Senders: Mags Doyle, Hana Okafor, The sports desk, @BackPageBants, @ITK_Kev, @PressBoxPete, Rosa Lindqvist, Terminal Tony, Dougie, Sal, Dr Inès, Unknown number.
- Triggers include: your first right call, your first exclusive, a big Confirmed miss ("Done deal, done career. Clipped for the reel."), a rival beating you to a saga, each case-file reveal, each promotion, Tier 1 counts in chapter 5, the finale, follower milestones (1,000; 5,000; 10,000; 38,200 "That's everyone you lost. Welcome back."; 50,000; 100,000; 250,000), quiet/solid/meh windows, Vince's play outcomes, and a right Transfer Market call.

### 6.11 Career saves
- 3 slots ("Slot 1 · playing", "Empty"). "Play", "New career", "Delete" ("Delete for good?"), "Get code" (a transfer code valid 30 days) and "Enter code" (moves a slot from another device).
- Followers, reputation, contacts and rivals belong to you in every slot. A slot keeps its own chapter, favours, club relations and inbox.

---

## 7. Multiplayer (Rooms)

### 7.1 The Rooms page (Multiplayer tab)
- "Multiplayer · Your newsroom of friends. One shared board a week, a season table, and a feed that never forgets a bad call."
- "New room" and "Join".
- "Your press boxes": your rooms (code, name, your name), 4 per page.
- "Leaderboard": Leaderboards, Rooms tab.
- Old challenge or newsroom links land here with "This link has expired."
- Needs a connection ("Rooms need a connection.").

### 7.2 Create and join
- "Start a room" sheet: your name (16 letters), room name (28 letters), "Rounds" cadence: "Weekly" (one board a week, Monday to Sunday, on the real calendar; default) or "Daily" (a board a day, open 48 hours); number of rounds: 5, 10 or 20 (default 10). Button "Start a room".
- "Got a code?" sheet: your name and a 4–8 character room code, "Join". Invite links (?room=CODE) open this with the code filled in.
- Errors: "No room with that code.", "That room is full (24).", "Pick a name first.", "That round has closed.", "That round isn't open yet."
- Maximum 24 players per room.

### 7.3 Inside a room
- Header: season and week, the room code with "Copy invite", a state line ("Round N is open. Play it before Sunday night.", "You've filed round N. Wait for the table.", "Round N opens on Monday.", "The season is over. Start a new press box."), "N reporters".
- "Rounds" tab: each round with its dates and state: "Open now" ("Play"), "Soon", "Closed", or "Filed · N pts" with "Front page" (your results) and "Watch".
- "Watch" (spectate): "The round on film": everyone's calls laid out day by day in a grid, playing through the week (your row is gold; green landed, red missed, star exclusive), then the truth row and final scores. Available once you have filed and the round is over for everyone.
- "Table" tab: the season standings: #, reporter, P (played), W (round wins), Pts, form dots, a crown for the leader. 6 per page.
- "Feed" tab: events ("[name] opened the room.", "[name] pulled up a chair.", "[name] filed round N: N pts, Tier 2." with a mini grid, gold "DONE DEAL" cards for right Confirmed Done calls, "[name] left the room."), and taunts.
- "Taunt": pick "The room" or one player, then one of 8 preset lines ("Three sources and still wrong. Impressive.", "Your barber is lying to you.", "Sleep on it? You slept through it."...). One taunt per 45 seconds.
- "Leave room": "Leave [room]? Your seat and results there go." "Leave" / "Stay". If the host leaves, the next player becomes host; the last one out closes the room.
- A room nobody opens for 21 days closes itself ("[room]: closed after 3 weeks without play") and drops off your list.

### 7.4 Rules and scoring
- Exactly the Daily rules and scoring. Each round is one shared board for the whole room, scored on the server.
- Every room round finished counts toward missions, adds followers (at 80% of the Daily rate) and moves your rival records.
- Friend rivals: meet the same player in 3 room rounds and they become a "Named rival" on your Rivals screen; get 5 more wins than losses against them for a "Scalp" (50 coins).

---

## 8. Transfer Market

### 8.1 What it is
- "Real rumours · settled by what actually happens." You say YES (he moves) or NO (he stays) on real transfer rumours from a data feed, priced like a market. "Buy the story at the Market price. Be right when the Market isn't."
- Needs a connection.
- Leagues in the data: Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, Egyptian Premier League, Saudi Pro League.
- The current window in the code is the Winter window 2027 (1 Jan – 2 Feb 2027). The summer window shut on 1 September; calls settle in January or next summer.

### 8.2 The Market tab
- Tip (first time): "Real transfers. Filter, then tap a player to make your call."
- Filter chips: "Stars" (tap to cycle 1★+, 2★+, 3★+), "Heat" (50+, 75+), "League" (drop-down), "Team" (drop-down), and a search ("Search players or clubs").
- List sorted by heat, 5 per page. Each row: kit shirt, player name, a headline ("[club] keen on [player]", "...in talks for...", "...bid for...", "...agree a fee for..."), stars, heat (flame), stage ("Keen", "Talks", "Bid in", "Fee agreed"), your YES/NO tag if called, and the Market price in %.
- Empty: "No transfers match."

### 8.3 Making a call (tap a rumour)
- Sheet: window label, player, position, age, club, stage, headline.
- Gauges: "Market" % (the chance of a move the market prices in) and "Heat" out of 100.
- "Linked clubs" with each club's stage, "Reported by" (outlets with grades A–D and dates), a fact line (English only), "The crowd" (YES% vs NO% of players, or "Be the first to file").
- "File a call" with "N of 5 calls left today":
  - Step 1 "Does he move?": YES ("He moves · N%") or NO ("He stays · N%").
  - If YES, optional "Extra credit": which club (a linked club or "Another club") and a fee band (≤ €20m, €20–50m, €50–80m, €80m +, Free / loan).
  - Step 2 "How loud?": In talks / Advanced / Confirmed (stake 1, 2 or 3), each showing win and loss.
  - "If right +N", "If wrong −N".
  - Button "File · [strength] YES/NO". "Locked when filed. One correction within 15 minutes, then never." ("Correct it").
- "How's this scored?" explains the formula.

### 8.4 Scoring ("Cred")
- Market price: from the rumour's credibility (strong 50%, solid 38%, speculative 25%, weak 15%) plus its deal stage (talks +8, bid +14, fee agreed +30), kept between 5% and 95%. A confirmed move is 95%.
- Your "c" is the price of your side (the Market % for YES, 100% minus it for NO), locked when you file.
- Right: stake × (10 × (1 − c) + 2), times a lead bonus of up to ×1.25 for calls filed a month (28 days) before it settles. Plus: right club = stake × 8 × (1 − share of the crowd that picked that club); right fee band = +2 × stake.
- Wrong: − stake × 10 × c.
- Late rule: a call filed in the 6 hours before the news broke counts as if the price were at least 90%.
- Settling is automatic from the data: a move from his club = YES; the rumour dying or the window closing (plus 72 hours) = NO; a rumour that vanishes from the data = "Void · stake returned".
- Limits: 5 new calls a day, 40 open calls at once, one call per rumour.
- Heat points: the first time the market moves 15 points your way after you filed, you get heat points (equal to your stake) for the weekly league.

### 8.5 The "My calls" tab
- "Settled since you last looked" reel: stamps "Called it", "Missed it", "Stake back" slam in, total rolls up, confetti if positive, "Done".
- Numbers: "Cred" (season total), "Hit rate" (stake-weighted and shrunk toward 50% so it isn't wild early), "Paper P&L" (what your open calls would be worth now), calls left today.
- A countdown chip: "Window closes in 4d 6h" / "Window opens in ...".
- Your calls, 5 per page: YES/NO tag, player, strength, price at lock → price now, or Right / Wrong / Void, and points.
- Tapping a settled call shows a fan reply reacting to the outcome.

### 8.6 Rewards from the Market
- Coins for each right call, by the player's stars: 15 (unrated), 25 (1★), 40 (2★), 70 (3★). Toast "+N coins for right calls on the Transfer Market".
- Followers at 1.5 times the Daily rate, reputation and hot hand move as in other modes. A right call plays an "OFFICIAL · first reported by [you]" broadcast film.
- A Daily Tier 1 banks a "market credit" (up to 3) that covers your next wrong Market call (no followers or reputation lost).
- Leaderboard: Leaderboards › Transfer Market (season Cred).

---

## 9. My Press Card and everything under it

### 9.1 My Press Card page (bottom tab)
- The byline card:
  - Your initials, "By [name]", and your rank stamp (Blogger, Stringer, Correspondent, Chief, Tier One).
  - "Byline ladder": the five ranks with your position and "N rep to [next rank]" or "Top of the trade. Keep it there."
  - "Followers", "Reputation" (out of 100), "Hot hand" with flame and "Best run N" (or "Cold. Get one right.").
  - "Your catchphrase" (your current line).
  - Showcase: up to 3 looks you pinned.
  - Badges row: leaderboard medals ("First place × N"...) and "Wins over rivals: N".
- Four stats: "Day streak", "Dailies", "Best score", "Career Mode windows".
- Tiles (6 per page):
  - "Leaderboards" ("Today, this week, the Transfer Market", or "Prizes to collect: N" with a badge).
  - "Badges": opens "The trophy shelf" (N of 30, see 10.7).
  - "Your style": your playstyle card (see 9.6).
  - "Feed" ("All read" / "N new").
  - "Rivals" ("Record W–L" or "No duels yet").
  - "Contacts" ("Best: [source], level N").
  - "Pass & store" ("Season level N").
  - "Replays": "Cutscenes · Replay the ones you've seen" (locked ones say "Plays when you get there").
  - "How to play".
  - "Replay the training" (restarts the guided first board).

### 9.2 Feed (My Press Card › Feed; also Results › Feed)
- Everything that happened to your name, grouped "Today", "Yesterday", "Earlier", newest first, "N new". Up to 60 items. Each opens what it is about.
- Line types: window results ("Daily Challenge: +480 followers, Tier 2."), room rounds, hot hand ("Hot hand: N right calls in a row..."), rank up/down ("Your byline now reads Correspondent."), rival scalps and trophies, contact level-ups, missions done, Market calls landed/missed/covered, streak warnings, Pass level-ups, follower milestones, rival taunts, editor messages, a rival "took your slot", favours and flair from cross-mode events.

### 9.3 Rivals (My Press Card › Rivals; also Results › Rivals)
- "Three accounts want your followers." "Every saga you both post on counts. Win five more than you lose and their scalp is yours."
- Total line: overall record, draws, "Ahead of N rivals", "N scalps".
- A card for each of @BackPageBants, @ITK_Kev, @PressBoxPete: blurb, You–Them record, current run ("You've won the last 3"), draws, a progress bar "N more net wins for the scalp" / "N more net wins to end the rivalry", a "Scalp" or "Rivalry won" stamp, and "Their last word" (a taunt that fits whether you are winning, losing or level).
- A duel happens on any saga where the rival posted: you win if you were right and they were wrong, lose the reverse, draw if both right.
- Scalp at +5 net wins: 50 coins. Rivalry won at +10 net: 150 coins and an earned trophy flair.
- Friend rivals (from rooms) appear below the three.

### 9.4 Contacts (My Press Card › Contacts; also Career › Sources, Shop › Game modes › Coffee)
- "Your contacts book". One card per source (Dougie, Sal, Rosa Lindqvist, Terminal Tony, Dr Inès): level 1–5 pips, XP bar ("N of M XP to level L" or "Top level"), "Asked N times, right M", perks unlocked and the next one.
- XP: +10 per time you ask them, +25 more if their read was right and your call matched, +5 if your call was right but ignored their wrong read. "Buy them a coffee": 30 coins for +20 XP, once a day per contact.
- Level thresholds: level 2 at 60 XP, 3 at 160, 4 at 320, 5 at 560.
- Perks: L1 "Picks up your calls", L2 "A new caller-card frame", L3 "Warmer lines" and "First ask each window costs 1 less" (Story and Practice), L4 "A nickname for you" (they call you "gaffer", "my guy", "partner", "captain", "champ"), L5 "A gold card and a trophy" and "One free second opinion each window" (Story and Practice).
- Each level-up pays level × 10 coins. Level 5 plays an "Inner circle" gold-card film.
- "Levels change looks and Story/Practice asks. The Daily and rooms stay the same for everyone."

### 9.5 Pass & store (My Press Card › Pass & store)
- Season header: season name, dates, days left, "Level N of 40", "N XP to level L".
- "Next up": your current level and the next three rewards. "Claim" on reached rewards, "Claim all (N)". A reward reveal pops up with "Equip it" / "Later".
- Free lane: coins every 3rd level (10 coins at levels 3–9, 15 at 12–18, 20 at 21–27, 25 at 30–39; 235 in total) and the season's own frame at level 40.
- Gold lane: only shown if you own Gold (cannot be bought right now, see 10.4).
- This week's event banner.
- "The store" card → store sheet: fixed coin prices, filters "All", "Frames", "Inks", "Desks", "Rings", "Flair", "Yours". Examples: Pink 'Un / Tabloid Red / Deadline Neon desks 400, Oak and Slate desks 350, Press-box / Red-top frames 150, Crime-scene tape 180, Blue-black / Pitch-green / Violet ink 120, Final whistle / Fax machine / Typewriter bell rings 120, Pen / Star flair 100, and "A Favour" 15 (Career only, 3 a day). Plus "Your coins" with recent coin movements.
- "Season recap" appears at the start of a new season: level reached, best tier, top call, and unclaimed coins banked for you.

### 9.6 Your style (My Press Card › Your style)
- After 10 calls you get a playstyle title, recalculated as you play: "The Sniper", "The Contrarian", "The Loudmouth", "The Quiet One", "The Early Bird", "The Night Owl", "The U-Turner", "The Believer", "The Sceptic", "The Steady Hand". Before that: "The Rookie" ("N of 10 calls in").
- Stats: hit rate, early %, Confirmed %, U-turn %, your best outcome, and titles earned. A tip for your style appears in the Daily brief.

### 9.7 Missions (Home › Missions box)
- "Missions": "New missions at HH:MM · weekly ones on Monday". Grouped by mode (Daily Challenge, Career Mode, Multiplayer, Transfer Market, Any mode), tagged "Daily" or "Weekly", 5 per page, "Claim +N" buttons and "Claim all".
- Daily missions: three a day. Always "Play today's Daily" (10 coins) plus two picked from:
  - "Get 3 calls right" 10, "Land an exclusive" 15, "Be right on a Confirmed call" 15, "Ring the physio 2 times" 5, "Ring the airport spotter 2 times" 5, "Ring the barber 3 times" 5, "Ring the agent 2 times" 5, "Play a Practice board" 5, "Play a Career Mode window" 10 (only if you have a career), "File a call on the Transfer Market" 5, "Be right on a twisted saga" 15, "Play a room" 10.
- Weekly missions (Monday to Sunday, UTC): "Play 5 Daily Challenges" 40, "Play 3 Career Mode windows" 40, "Play 3 Multiplayer rounds" 40, "File 5 calls on the Transfer Market" 40, "Get 15 calls right" 50.
- Claiming also gives XP: +20 for a daily mission, +40 for a weekly one. A claim plays a coin sound and gold confetti.

### 9.8 Shop (Home › Shop, or top bar coins/credits)
Top: wallet strip ("Coins · Earned by playing", "Credits · Bought, rarely earned", "Get credits"). Two tabs:

"Game customization" (looks only):
- A live preview of the look on your card/desk. "Tap a look to try it on. Nothing is bought until you say so."
- Three sections:
  - "Looks": category tabs: "Byline card", "Flair", "Press pass", "Headline font", "Catchphrase", "Post frame", "Stamp ink", "Desk", "Desk lamp", "Ringtone", "Ring pack", "Poster frame", "Share card", "Feed skin", "Masthead", "Front page", "Your paper", "Gold", "Collection". 8 tiles per page. Selecting one shows its name, rarity ("Stock", "Special", "Collector's", "One-off"), price, and buttons: "Buy · N coins", "Buy · N credits" (or "Need N more"), "Put it on" / "Take it off", "Hear it" (sounds), "Gift" (credit items), "Pin to byline" (showcase, max 3).
  - "New & limited": "New this week" (new drops each Monday), "Last chance" (season items leaving, vault returns), "This week's featured" (15% off until Sunday), and the season's limited set ("Rumour Mill set" now, with a countdown; "On sale until the season ends, then gone for good").
  - "Friends & receipts": "Bring a friend" (your 6-letter code, "Copy the link", both get 30 credits when the friend finishes a first window), "Gifts sent", "Recent" ledger with "Refund" within 48 hours, "Home" button, and "Our promise".
- Example prices:
  - Byline cards: Red-top / Broadsheet 400 coins or 80 credits; Market card 120 credits; Late-edition 140 credits; Gilt 320 credits.
  - Mastheads: Gothic / Red-top 350 coins or 70 credits; Ticker 110 credits; Gilt 300 credits.
  - Press passes: Pitch-green / Midnight 300 coins or 60 credits; Chrome 130 credits; Gilt 220 credits.
  - Poster frames: Ticket-stub / Crime-scene 250 coins or 50 credits; Neon 120 credits; Gilt 200 credits.
  - Share cards: Red-top / Broadsheet 400 coins or 80 credits; Late-edition / Market 120 credits; Gilt 260 credits.
  - Headline fonts: Broadsheet serif / Red-top slab 300 coins or 60 credits; Wire mono 110 credits; Stencil 130 credits.
  - Desk lamps: Amber 180 coins; Dawn / Neon 300 coins or 60 credits; Gilt 200 credits.
  - Ring packs: Newsroom rings 350 coins or 70 credits; Terrace rings 300 coins; Stadium rings 120 credits.
  - Feed skins: Memo 180 coins; Ticker / Red-top 300 coins or 60 credits; Late-edition 110 credits.
  - Front pages: Broadsheet / Red-top 350 coins or 70 credits; Wire 110 credits; Gilt 280 credits.
  - Signature catchphrases: 60 to 150 credits.
  - Season set (each season): card 180, masthead 160, frame 150, headline/lamp/feed 120, catchphrase 90 credits.
  - "Name your paper": 150 credits (one purchase, rename any time, 24 letters).
  - "Gold" for the season: 350 credits ("or €4.99 direct", not on yet).
- Earned-only looks (never sold, shown as "Earned only") come from story chapters, ranks, 30- and 100-day streaks, rivalry trophies, bringing 3 friends, Deadline Day Live, and weekly events.
- "Collection book": every set, how many you own, and how to get each missing look.
- Catchphrase tab has a panel to "Write your own" (from Chief rank, 24 characters, checked before it goes out).

"Game modes" (extras that help inside a mode; coins only):
- "A Favour": 15 coins, max 3 a day, Career only ("Start Career Mode" if none; "Back tomorrow" when used up).
- "Coffee with a contact": 30 coins, opens Contacts.
- "Rename your blog": 250 coins (first free), opens Career Mode.
- Note: "Daily Challenge · Multiplayer · Transfer Market: nothing for sale. Ranked scores are earned, never bought."

"Get credits" sheet ("Credit packs"): 100 for €1.49, 350 for €4.99 ("One Gold season"), 800 for €9.99, 1800 for €19.99. "Not on sale yet: there's no verified payment flow, so nothing here takes money." Also "Ways to earn credits": "First Tier 1 in a Daily: 30", "Every 30-day streak: 40", "Season end: 25, and 25 more at level 40", "A friend you bring: 30 each" (see gaps).

### 9.9 Weekly events
- One per week, rotating, never the same two weeks running: "Rival Week" (beat @ITK_Kev 3 times), "Medical Week" ("The physio picks up from day 3."), "Deadline Frenzy" ("Deadline Day runs for 90 seconds."), "Barbershop Week" ("The barber's hit rate goes up to 60%."), "Local Hero" ("Every saga this week comes from [league].").
- "Practice and Career only". Goal: 3 windows (or beat ITK 3 times). Reward: a cosmetic (Crossed swords flair, Scrubs ink, Deadline frame, Barbershop ring, Home-town flair).
- Shown on the Practice page and the Pass page.

### 9.10 Settings (top bar › menu)
- Header "The desk drawer · Settings".
- "Language": English, العربية, Español.
- "Edition": "Auto" (follows your device), "Morning" (light paper), "Late" (dark).
- "Sound": rings, stamps and the Deadline Day siren.
- "Reduce motion": calmer screens, no shake or confetti (also turns off vibration).
- "Film": "Full" (loops and clips), "Light" (stills, clips on taps), "Off" (nothing extra).
- "Show tips again".
- "Name": your byline name (16 letters, "The name on your share cards and leagues.") with "Save".
- "How to play" button.
- "Tier One 3.7.0 · [build]".

### 9.11 First launch (onboarding)
- Screen 1: "Tier One · The transfer journalist game", "Welcome to the desk", "Break the transfer first. Or get ratio'd trying.", three lines (ring sources, some lie; call it; publish before the rivals and survive a 60-second Deadline Day), language buttons, "Let's go".
- Screen 2: "My Press Card", "What's your name?" (16 letters, example "Mo Moustafa"), "Play my first story" or "I've played before. Skip the training".
- Either choice creates your career (chapter 1) and plays the prologue film "The fall".
- "Play my first story" starts the guided training board (Coach on), 8 coach-mark steps: "Open a file." → "Ring a source." → "Ring a different kind of source." → "Time to call it." → "Pick what happens." → "Pick how loud, then hold Publish." → "Filed. Back to the board." → "That's day one." with "Go to Career Mode" or "Keep playing". "Skip" on each step. Replay from My Press Card › "Replay the training".

### 9.12 How to play (from "?" buttons, Settings, or My Press Card)
- "How Tier One works in 60 seconds": five swipeable cards: "Ring your sources", "Read the evidence", "Pick what happens", "Pick how loud" (with day-1 values +16/+32/+64 and the early-bonus note), "Beat the rivals". "Try it in Practice".
- "The full rules" (expandable): the window, asking, the spin, publishing, exclusives, the twist, U-turns, Deadline Day, tiers, "One name", Vince's play, the points table and the source table. All numbers are read from the live rules.

---

## 10. Progression and economy (all in one place)

### 10.1 XP and level ("Press Points", the season level)
- One visible level: the season level, 1 to 40, shown as "Lv N" on Home and "Level" on results. It resets each season.
- XP per level depends on the season's length (about 100 XP a day should finish it in three quarters of the season). Current season "The Rumour Mill" (2 Sep – 31 Dec 2026): 230 XP a level. Winter Window (1 Jan – 2 Feb): 60. Spring Whispers (3 Feb – 15 Jun): 260. Summer Window (16 Jun – 1 Sep): about 150.
- XP earned: Daily finished 20 (+15 for Tier 1, +10 Tier 2, +5 Tier 3); Practice 10 (first 3 a day only); Career window 10; room round 15; Market call filed 5; Market call right 10; each achievement 25; daily mission claimed 20; weekly mission claimed 40.

### 10.2 Reputation and ranks (the byline)
- Reputation 0–100, starting at 50. +1 for every right call, −2 for every wrong Confirmed call, in every mode.
- Ranks by reputation: Blogger (0+), Stringer (55+), Correspondent (65+), Chief (75+), Tier One (85+). The same five words are the Career ranks; Career promotion also needs enough windows.
- Rank up/down posts to the Feed; a rank up plays a "Promoted" press-pass film.

### 10.3 Followers and hot hand
- Right call: In talks 40, Advanced 90, Confirmed 220 followers, +300 more for an exclusive.
- Wrong call: lose half of 20 / 60 / 260 (so −10 / −30 / −130).
- Mode factor: Daily ×1, Career ×1, Multiplayer ×0.8, Transfer Market ×1.5, Practice ×0.25.
- Hot hand: each right call in a row adds +10% to followers (up to ×2 at 10 in a row). A wrong call resets it.
- Follower milestones pay coins once: 10,000 → 50, 50,000 → 100, 100,000 → 200, 250,000 → 300.

### 10.4 Coins and credits
Coins (earned by playing):
- Daily finished: 5 coins (+5 for Tier 1).
- Streak: 20 coins at every 7 days.
- Missions: 5 to 15 (daily), 40 to 50 (weekly).
- Achievements: 10 to 50 each.
- Contact level-ups: level × 10.
- Rival scalp 50, rivalry won 150 (same for friend scalps: 50).
- Follower milestones: 50 / 100 / 200 / 300.
- Season track free lane: 235 a season.
- Leaderboard prizes: Daily top 3 = 60 / 40 / 25, 4th–10th = 10; weekly top 3 = 200 / 120 / 80, 4th–10th = 30 (need 3+ players).
- Transfer Market right calls: 15 / 25 / 40 / 70 by stars.
- A hidden extra: 20 coins every 400 lifetime XP (up to 4,000 XP).
- Gold (if owned) adds +10% to coins earned.
Coins spent on: Shop looks with a coin price, Pass store items (100–400), Favours (15), coffee (30), blog rename (250).

Credits ("Bought, rarely earned"):
- Meant to come from credit packs (not on sale), gifts, and small earn rules (first Daily Tier 1: 30; every 30-day streak: 40; season end: 25, +25 at level 40; bring a friend: 30 each). See gaps: none of the earn rules are switched on.
- Spent on: rarer looks, signature and season catchphrases, season sets, "Name your paper", Gold (350), gifts (paid at the usual price), and refundable within 48 hours.

Gold:
- One season of: 8 extra looks on the Gold lane (every 5th level) plus 10 coins on other even levels, and +10% coins. 350 credits or €4.99 direct (direct buying off). Cosmetic only.

Ads:
- A "2× mission coins" rewarded ad exists in code but ads are switched off. No adverts appear anywhere.

### 10.5 Streaks and grace days
- Play the Daily on consecutive days (UTC) to grow the streak.
- Every 7-day run banks a grace day (max 2) and pays 20 coins. A missed day spends a grace day instead of breaking the streak.
- Missing beyond your grace days resets it. Your "slot on the table" is then "taken" by a rival (the one ahead of you on the ledger) with a feed line and a note in the brief: "[rival] took your slot. Your N-day streak is theirs. Take it back today."
- Streak films at 7, 30 and 100 days. Earned looks and catchphrases at 7, 30 and 100 days.
- A feed reminder appears when your streak is about to grow ("Your Daily streak reaches N if you play before the reset.").

### 10.6 Weekly league (server only)
- The server seats each player in a league group of 30 in a division (Stringer, Reporter, Correspondent, Editor, Tier One) and adds Daily tier points (T1 30, T2 20, T3 12, T4 6, Spiked 2) plus Market points and heat (capped at 150). Top 6 up, bottom 6 down on Sunday night. There is no screen for it in 3.7 (see gaps); Results still shows "+N league points".

### 10.7 Achievements ("The trophy shelf", My Press Card › Badges)
30 trophies, each pays coins (shown) and 25 XP:
- First edition (finish your first Daily) 10; Tier One (make Tier 1) 50; Hat-trick (Tier 1 three times) 50; Scoop (land an exclusive) 20; Front page habit (3 exclusives in one window) 50; Clean sheet (five filed, five right) 30; Owned up (U-turn and still be right) 15; Rewrite (right on the twisted saga) 20; Buzzer (file in the last 15 seconds of Deadline Day) 15; No comment (finish without filing and not be spiked) 10.
- Smoke detector (call a Fake right, Confirmed) 20; Gazumped (call a Hijack right) 15; Gold from the agent (act on the agent's Off or Fake and be right) 20; Echo chamber (burned by two agreeing street voices) 10; Hammer (Confirm on a physio read and be right) 15.
- A week of mornings (7-day streak) 20; A month of mornings (30-day streak) 50; Off the record (5 practice windows) 15; Studying the tape (practice with Coach on) 10; Name in print (finish a Career window) 10.
- Stringer (reach Stringer in Career) 20; Correspondent 30; Done deal (reach Tier One in Career) 50; Inner circle (a contact at level 5) 30; Open door (a club leaks to you) 25.
- On the wire (first market call) 10; Called it (win a market call) 25; Group chat (finish a room round) 15; Send it (share a scoop card) 10; Expenses (earn 500 coins in total) 20.
- Badges row on the byline: leaderboard medals (gold, silver, bronze counts) and wins over rivals.

### 10.8 Prizes
- Daily and weekly leaderboard placings are checked the next day. Top 10 wins coins (see 10.4). A toast says "You finished #r in yesterday's Daily · A N-coin prize is waiting on the Leaderboards", and you collect on the Leaderboards page ("Collect N coins").

### 10.9 Seasons and the Pass
- Four real-calendar seasons: "Winter Window" (1 Jan – 2 Feb), "Spring Whispers" (3 Feb – 15 Jun), "Summer Window" (16 Jun – 1 Sep), "The Rumour Mill" (2 Sep – 31 Dec).
- Each season: a 40-level track (free lane, Gold lane), a limited Shop set, its own catchphrase, a season-opener film, and a recap when it ends. Unclaimed free-lane coins and earned looks are banked for you at season end.
- The old "Semba Pass" subscription ($4.99 a month) is not sold.

### 10.10 Catchphrases
Your catchphrase fires when a Confirmed call lands (stamp, sound, share card, film title). It replaces the old "HERE WE GO". Equip it in Shop › Looks › Catchphrase.
- House line (everyone): "It's happening."
- Earned by rank: "Pen down." (Stringer), "Bags packed." (Correspondent), "Live now." (Chief), "All agreed. All done." (Tier One).
- Earned by streak: "Medical done." (7 days), "Bags are packed." (30 days), "Clear the front page." (100 days).
- Earned by story: "Shirt's ready." (chapter 1), "The ink is dry." (chapter 3), "Wheels up." (chapter 5).
- Signature lines (credits): "Sunglasses on. Medical." 60, "Pens are out." 60, "Boots in the car." 80, "Photos at the training ground." 100, "Window shut. Job done." 100, "Put the kettle on." 150.
- Season lines (90 credits, only during their season): "Smoke, meet fire." (Rumour Mill), "January sales are open." (Winter), "The pen is warming up." (Spring), "Pre-season photos first thing." (Summer).
- Your own line: from Chief rank, 24 characters, no swearing, no brands, no one else's line; checked by the server; refused lines fall back to the house line.
- Each line has a tone (Loud, Cool, Dry, Gold) that sets its colour and sound. Fans and rivals react to it in replies.

### 10.11 Rivals (summary)
- Three house rivals with records, scalps (+5 net, 50 coins), rivalry trophies (+10 net, 150 coins and an earned flair), large pools of taunts that fit your record. Friend rivals come from rooms.

---

## 11. Sound, animation, films, offline, accounts, notifications

### 11.1 Sounds and touch
- All sounds are synthesised in the game (no audio files): taps, page turns, phone rings, stamps, typewriter, coins, fanfare, sad trombone, Deadline Day siren, heartbeat, ticking clock, whistle, glitch for STOP PRESS, a "catchphrase" fanfare, and a mumbled "voice" with a different pitch per character.
- Ringtone and ring packs change the call sounds.
- Vibration on taps, publishing and stamps (where the phone supports it; off with Reduce motion).

### 11.2 Animations and films still present
- Page changes slide in tab order (or a filmed page turn on capable devices). Stamps slam at slightly different angles. Numbers roll and count up. Confetti, screen shake, glowing "hot" tiles, pulsing buttons.
- Drawn, frame-by-frame films (no video needed): source call films, the post film, the Delete & repost film, the day-end film, the overnight scene, the Deadline Day intro, the results "press rolling".
- Story and moment films: the prologue "The fall", chapter openers and reveals, the finale, the epilogue, "First day at the paper" (cold open), "Meet [source]" intros, season openers, "The paper's out", "Promoted", "Inner circle", "Scalp", "Rivalry won", "Official" broadcast, streak films (7/30/100), "Your line", Deadline Day Live open/close, "Round yours" (room win), "Friend's scalp".
- Video clips for these are loaded from the website when available; otherwise the drawn version or a title card plays. The Film setting and Reduce motion cut them down. Low battery, Save-Data or a slow connection automatically lower them.
- Replay seen films: My Press Card › Replays.

### 11.3 Offline behaviour
- The app installs itself in the browser cache and opens offline.
- Practice and Career Mode play fully offline.
- The Daily, rooms, Deadline Day Live, leaderboards and the Transfer Market need a connection. Offline, today's board can still be viewed from the last good copy ("You're offline. The board is from earlier; calls need a connection."), but actions fail and must be retried. The Daily error screen says "The line's dead" with "Try again" and "Practise offline instead".
- New versions: "New edition ready · Reload to get the latest Tier One." with "Reload".

### 11.4 Accounts, sync and identity
- No sign-up. The game creates a hidden device ID and quietly registers an account with the server on start.
- Progress is saved on the device and synced to the cloud when online (numbers like coins, XP, followers and contact XP are merged, not overwritten).
- Your name (16 letters) is set at first launch, in Settings, or in the Rooms forms. Without one, leaderboards show "Journo-XXXX".
- Moving devices: Career saves have a 30-day transfer code. (Email account linking exists in the code but has no screen.)

### 11.5 Notifications
- In-game: the bell (see section 4), toasts (achievements, coins, contact level-ups, scalps, prizes, errors), the Feed, the morning papers and the Career inbox.
- Phone push notifications ("your Daily is ready", "results are in", "Deadline Day Live opens") are prepared in the code but the game never asks for permission, so none are sent.

---

## 12. Known gaps and leftovers (honest list)

1. Credits cannot actually be earned. The earn rules (first Tier 1 = 30, every 30-day streak = 40, season end = 25/+25, bring a friend = 30 each) are written but never triggered, and credit packs are "Not on sale yet". So every credit-only item (Gold, "Name your paper", most rare looks, signature and season catchphrases, season sets, gifting) is out of reach. The "Bring a friend" card promises credits that never arrive.
2. Weekly events change nothing in play. "Deadline Day runs for 90 seconds", "The physio picks up from day 3", "barber's hit rate goes up to 60%" and "Every saga this week comes from [league]" are shown but not applied. Only the progress count and the reward work.
3. The Contacts level 3 perk "First ask each window costs 1 less" is not applied anywhere.
4. The weekly league is still calculated on the server, but there is no league screen any more. Results still shows "+N league points" and Settings says the name appears on "leagues".
5. The weekly leaderboard tab is gone, yet weekly prizes (200/120/80/30 coins) are still checked and paid.
6. The "Deadline Day Live" card on the Daily hub says "Sixty seconds, everyone at once", but Deadline Day Live is a 24-hour real-sagas board. It only runs on 2 Feb 2027 and 1 Sep 2027; every other day the page says it is not live.
7. Two shops overlap: the Shop (Home) and "The store" inside My Press Card › Pass & store sell partly the same kinds of items (frames, inks, desks, rings, flair) and both sell Favours.
8. Unreachable screens and leftover text: the old "Front page" screen, the "Editor's desk" screen (only by a hidden link), "Beat my board" challenges, Newsrooms, the "For you" feed strip, the next-up slip and rival strip on Home. Their strings are still in the language files.
9. Old "Semba Pass" wording remains in places (for example "One career slot. The Semba Pass adds two more (concept)"), while 3 Career slots are already free for everyone.
10. Gold, credit packs, coin packs and rewarded ads are all switched off. Push notifications are never requested. Email account linking has no screen.
11. Taunt timing mismatch: the room says "One taunt a minute", the server allows one every 45 seconds.
12. The Android app build is labelled 3.4.0 while the web game is 3.7.0 (the APK may lag behind).
13. A hidden coin drip pays 20 coins every 400 lifetime XP (up to 4,000 XP), left over from the old account levels and not explained anywhere.
14. The Chief rank unlock text mentions "Superstar sagas", but star players only appear at Tier One rank.
15. The achievement "Expenses" says "Earn 500 credits" but counts coins.
16. Some catchphrase unlock texts in the language files refer to lines that do not exist as items ("Sunglasses on." for chapter 3, "Plane's landed." for a Tier 1 window, "Clock's stopped." for beating all three rivals).
17. On the Practice page, the weekly event's "Play Practice" button just reopens the Practice page.
18. The "Lv" on Home is the season level, so it drops back to 1 at the start of each season.
19. Real-world data: the Transfer Market and Deadline Day Live depend on the rumour data snapshot; the window dates are hard-coded (Winter 2027, Summer 2027) and must be updated by hand.

---

## Appendix: where this was read from

- Web client: games/tier-one/v3/web/src (App.tsx, screens/, ui/, lib/, i18n/en.ts and i18n/parts/).
- Server: api/tier-one/v3/index.js and api/tier-one/v3/_lib/engine.mjs (rules), _lib/wire.mjs (Transfer Market scoring).
- Not used (reverted plans): engine4.mjs, CONCEPT4.md, RULES4.md, UI41.md.
