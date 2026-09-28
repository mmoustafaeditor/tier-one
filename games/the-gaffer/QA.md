# The Gaffer · QA pass (v0.10.0, 2026-09-28)

A full browser playthrough (Chromium, 412×915 phone viewport, network blocked) plus season simulations, before the
game-math study. Every screen was screenshotted and scanned for page errors, console errors, broken text
(`undefined`, `NaN`, `[object …]`, raw keys) and sideways scrolling.

## Playthrough

New career (country → league → club → contract with a second nationality) · squad · player sheet · contract renewal ·
transfer market and a bid · tactics · pre-match (radar, advice, scouting) · live match at 4X in the 3D camera with a
half-time talk, a substitution and the stats tab · match report image · 8 quick results · inbox · league table, results,
scorers, assists, cups (groups) · club (money, tickets, sponsors, facilities, staff) · training · hospital · academy
scouting · career screen and coach card · world rankings · newspaper · quick match · world editor (clubs, leagues,
countries) · settings and realism · Spanish, French and Arabic on every tab · a whole season through the Match tab ·
season review · season 2 · export, reload, continue, import.

**Result:** 92 screens, 0 page errors, 0 console errors, no broken text, no sideways scrolling.

### Bugs found and fixed in this pass

| Where | Bug | Fix |
|---|---|---|
| Match tab | When your league ended but other leagues were still playing, the Match tab said "Your league season is over." with no way forward (only the Home tab had "Finish the season"). | The Match tab has the same Finish button. |
| Finish the season | Finishing from the Match tab left you on a bare "Season over" card; the season review is on Home. | Finishing always goes to Home, busy while it runs. |
| Coach card | The tall sheet had no Close button and left little backdrop to tap on a phone. | Close button. |
| World editor | A failed save showed its problems at the top, out of view, in internal ids (`eng_lvr_p2: shirt 1 taken at eng_lvr`). | Scrolls up to them; readable and translated ("M. Zubimendi: shirt 1 is already taken at Liverpool FC"). |
| Board | A title-winning favourite ended the season at ~45% board confidence (a win earned +1, a draw cost −4). | The board also reads the table every week; the season review weighs how far off the objective you finished. |
| Season end | `endSeason` rebuilt the world without its extra fields (would have dropped edited country names). | Keeps every field. |

## Numbers (season sims, 3 seasons, all 18 leagues)

| | Value |
|---|---|
| Goals per match | 2.70–2.81 |
| Home wins / draws | 43–45% / 23–25% |
| Wins by 4+ goals | 6–9% |
| Top scorer (champion's league) | 32–41 goals |
| Board after a title (Liverpool Reds, Al Ahly) | 80 / 77 |
| "Finish the season" in the browser | ~0.65 s |
| Full season simulated (node) | 6.4 s (was 9.7 s) |
| Save size | ~450–540K characters packed (≈2.8M unpacked) |

Realism settings, checked by simulation: income ×2 doubles tickets, TV and sponsors; injuries off / normal / ×2 → 0 / 3 / 6
in 20 matchdays; stronger opponents cut goals scored from 52 to 45 and weaker raise them to 60; prices ×2 → 110M → 210M.

## Known and accepted

- Club and player names stay in English in Spanish and French (the data has English and Arabic names).
- England's flag is the subdivision emoji 🏴󠁧󠁢󠁥󠁮󠁧󠁿; very old Android versions show a plain black flag.
- In the season sims the computer never signs players or renews contracts for your club, so an unmanaged big club
  declines by season 3 and can be sacked; a real player manages the squad.
