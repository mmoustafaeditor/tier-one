# Saif's improvement proposals — Tier One

Improvement proposals from **Saif (`saifsaber`)** for **Tier One** only (also written "TierOne"; same game), in the
**`mmoustafaeditor/tier-one`** repo. Tier One is owned by **Mostafa (`mmoustafaeditor`)**, so every proposal here needs
his OK before anyone implements it (see root `CLAUDE.md` › 1b and › 1c).
These do **not** apply to The Gaffer; its proposals live separately in `games/the-gaffer/SAIF_IMPROVEMENTS.md`.

Everything below is **Saif's observation until verified**. Nobody has yet inspected the old version, the git
history or the live site for these proposals. Don't treat any of it as confirmed behaviour or as an approved requirement.

**Statuses:** `Proposed` · `Approved` · `In Progress` · `Completed` · `Deferred` · `Rejected`.
When a status changes, update it in the table **and** add a dated line to that proposal's **Log**
(who decided, what changed, how it was verified). For `Deferred`, write the agreed review point in the Log.

| ID | Proposal | Status |
|---|---|---|
| TIERONE-SAIF-01 | Restore and improve deal-related comments and reactions | In Progress |
| TIERONE-SAIF-02 | Restore and upgrade the game's humor and personality | In Progress |
| TIERONE-SAIF-03 | Restore and upgrade leaderboards, prizes, achievements and badges | Proposed |
| TIERONE-SAIF-04 | Fix overlapping UI elements, especially around publishing controls | Proposed |

## Guidelines for investigating and implementing (once approved)

- Preserve the new (v3.1 "newsroom") visual design while restoring and improving what gave the previous version its personality.
- Keep investigation to the files and history relevant to the approved proposal.
- Useful starting points, not yet checked for these proposals: the classic v2 game in `tier-one-classic/index.html`
  and git history before the v3 redesign; the v3 source in `games/tier-one/v3/web/src/`.
- If the previous version can't be found in the accessible history or branches, say what is missing and ask for a
  reference. Don't invent old behaviour or dialogue.
- Don't claim to have inspected the old version or the deployed site unless you actually did.
- Arabic is Egyptian colloquial Arabic. Don't rewrite other language versions without approval.

---

## TIERONE-SAIF-01 — Restore and improve deal-related comments and reactions

**Status:** In Progress.

**Saif's observation:** The previous version had comments and reactions on the player's in-game blog and Twitter feed
when deals were completed or succeeded. These interactions seem missing or less visible after the redesign.

**When approved:**
- Inspect the previous version and relevant git history to establish what actually existed.
- Determine whether the feature was removed, hidden, or disconnected from the new interface.
- Restore and upgrade the experience to fit the current design.
- Connect reactions to actual deal events and outcomes, so they feel relevant to what the player did.

**Log:**
- 2026-09-30 · Recorded from Saif. Not yet verified.
- 2026-09-30 · Verified: the classic fan roast/praise, U-turn and source-reply pools (tier-one-classic, lane/content 2f2ed0c) never reached v3. Restored in `i18n/parts/banter.ts` as replies under each call on the results page, tied to the real outcome; settled Wire calls get one reply.

## TIERONE-SAIF-02 — Restore and upgrade the game's humor and personality

**Status:** In Progress.

**Saif's observation:** The previous version had more personality in its comments, Twitter interactions, phone calls,
and dialogue with agents, mission-related characters and airport situations. Characters sometimes hinted at a deal's
status with a witty remark or playful clue instead of stating bluntly whether it would happen. This gave the game charm
and made the world feel alive.

**When approved:**
- Review the old dialogue and interactions to understand their tone and character voices.
- Use that material as a foundation for better writing, not a verbatim copy.
- Bring back natural humor, clever hints and distinct character personalities.
- Make dialogue respond to the actual situation and deal status.
- Use enough variety to avoid repeated lines or forced jokes.
- Keep the information needed for gameplay decisions understandable.
- Arabic: natural Egyptian colloquial Arabic with context-appropriate humor. Don't rewrite other languages without approval.
- Integrate these interactions into the new interface while keeping its visual direction.

**Log:**
- 2026-09-30 · Recorded from Saif. Not yet verified.
- 2026-09-30 · Results page redesigned for every window mode: verdict card with tier quip and native idiom, calls as tweets with rival jabs, fan banter and source smirks, the rest in closable sheets. Calls, agents and airport dialogue still to do.

## TIERONE-SAIF-03 — Restore and upgrade leaderboards, prizes, achievements and badges

**Status:** Proposed — pending verification and owner review.

**Saif's observation:** The previous version had a leaderboard, prizes or rewards, achievements, and badges that
appeared when the player reached certain milestones. These added personality and a sense of progression.

**When approved:**
- Verify which systems existed, how they worked, and what is now missing or hard to find.
- Improve their presentation and accessibility within the current design.
- Tie achievements, badges and rewards to real player actions and progression.
- Give clear feedback when an achievement or reward is earned.
- Understand the previous ranking and reward rules before proposing changes to balance or requirements.

**Log:**
- 2026-09-30 · Recorded from Saif. Not yet verified.

## TIERONE-SAIF-04 — Fix overlapping UI elements, especially around publishing controls

**Status:** Proposed — pending verification and owner review.

**Saif's observation:** Some screens have overlapping elements, particularly near the lower publishing section and the
controls Saif describes as "Advanced" and "Confirmed" / "مؤكد". These labels are Saif's description, not verified
component names.

**When approved:**
- Find the relevant screen and controls through the interface and code.
- Reproduce the issue at mobile and desktop sizes, including Arabic / RTL layouts.
- Fix the actual layout cause (spacing, wrapping, positioning, fixed elements…) based on inspection.
- Verify text stays readable and buttons stay visible and usable.
- Check the fix holds across the relevant screen sizes.

**Log:**
- 2026-09-30 · Recorded from Saif. Not yet verified.
