# Open requests between teammates

The session hook shows every request below at the start of each Claude Code session.
Claude: tell the user about each one before starting their task, and say who it is for.
When the person it's for says it's done, delete that request here and log it in `UPDATES.md`.

Template:

```markdown
## YYYY-MM-DD · from <github user> → for <github user> · <short title>
<what to do, why, links>
```

<!-- requests start -->

## 2026-09-26 · from saifsaber → for mmoustafaeditor · Redeploy the site on Vercel
Saif merged the repo tidy-up (PR #2) at your request. The code is fine (its Vercel preview passed), but Vercel
**blocked** the production deploy because the merge commit was made from Saif's GitHub account, which isn't a member
of the `semba-game-studios` Vercel team. That's why `main` shows a ❌. The live site still runs the previous deploy,
so nothing is broken for players; the tidy-up just isn't live yet.

What to do (2 minutes):
1. Open https://vercel.com/semba-game-studios/tier-one/deployments
2. Find the **latest** deployment from `main` marked "Blocked" → `⋯` → **Redeploy** (or approve it).
3. Optional: add Saif to the Vercel team (Settings → Members) so his merges deploy on their own next time.

بالمصري: يا محمد، سيف عمل merge للتنضيف اللي طلبته، بس Vercel وقّف النشر عشان الكوميت من حساب سيف ومش عضو في
فريق Vercel. الكود سليم والموقع شغال بالنسخة القديمة. ادخل على الرابط فوق واعمل **Redeploy** لآخر deployment
متوقف من `main`، ولو تقدر ضيف سيف في الفريق عشان المرة الجاية تعدّي لوحدها.
