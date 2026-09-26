# Tier One — Launch Kit

Everything in this folder is what goes live.

```
index.html               the Semba Games studio home page (sembagames.app)
tier-one/index.html      the whole Tier One game (sembagames.app/tier-one) — daily, career, practice, 3 languages, ads, analytics, Stripe, legal
api/tier-one/latest.js   Android update feed polled by the app; bump versionCode with each new APK
downloads/TierOne.apk    the current Android build
api/verify-purchase.js   optional serverless function that confirms Stripe payments before credits are granted
.env.example             the two environment variables the function needs
README.md                this guide
```

The game is one file. It works on GitHub Pages, Vercel, Netlify, Cloudflare Pages — any static host. The `api/` function only runs on Vercel (or Netlify with a one-line rename).

---

## 1. Go live (about 30 minutes)

### A. Put the files on GitHub
1. In your `tier-one` repo on github.com, tap **Add file → Upload files** (request the desktop site in Safari if you only see *Create file*).
2. Upload `index.html`, `README.md`, `.env.example`, and the `api` folder.
3. Commit to `main`.

### B. Host it — pick one
**Vercel (recommended — free, runs the payment-verification function)**
1. vercel.com → *Add New Project* → *Import* your `tier-one` repo → *Deploy*. Nothing to configure.
2. You get `https://tier-one-xxxx.vercel.app` immediately.
3. *Settings → Domains* → add your own domain (buy one at Namecheap/Cloudflare; ~$10/yr). AdSense needs a real domain.

**GitHub Pages (free, static only — payments run in "trust the redirect" mode)**
1. Repo → *Settings → Pages* → Source: *Deploy from a branch* → `main` / root → Save.
2. Live at `https://<your-username>.github.io/tier-one/` within a minute.

### C. Fill in the CONFIG block
Open `index.html`. Everything you ever need to change is in the `CONFIG` block near the top of the `<script>`:

| Key | Set it to |
|---|---|
| `SITE_URL` | your live URL (it's printed on every share card — this is your viral loop) |
| `CONTACT_EMAIL` | a real inbox you check |
| `JURISDICTION` | e.g. `'the State of Florida, USA'` (used in the Terms) |
| `LAUNCH_DATE` | the day Daily #1 should be — set on launch day |
| `GA4_ID` | from step 3 |
| `ADSENSE_CLIENT`, `AD_SLOTS` | from step 2 |
| `SHOW_AD_PLACEHOLDERS` | **`false` before launch** |
| `STRIPE_LINKS` | from step 4 |
| `VERIFY_ENDPOINT` | `'/api/verify-purchase'` once the function is deployed on Vercel |
| `DEBUG` | `false` |

Third-party scripts (AdSense, GA4) and the Stripe redirect only run on your own domain. Inside the claude.ai preview they are blocked by design — that is expected.

---

## 2. Ads — Google AdSense

1. adsense.google.com → *Get started* → enter your live domain. Approval takes 1 day to 2 weeks; the site must be live with real content and the Privacy/Terms links (already in the footer) — that's why launching first is fine.
2. Once approved: *Ads → By ad unit → Display ads* → create three units named `results`, `career`, `home` (Responsive).
3. Copy your publisher ID (`ca-pub-…`) into `ADSENSE_CLIENT` and each unit's slot number into `AD_SLOTS`.
4. Set `SHOW_AD_PLACEHOLDERS:false`. Redeploy.

Where ads appear: bottom of the home screen, after the share card on the results screen, and at the bottom of the Career › Profile tab. That's deliberate — three quiet placements beat ten annoying ones (38-0-0's App Store reviews complain about ad count; don't repeat it).

**Rewarded "watch an ad for +1 contact" (Career only)**
`REWARDED_ADS:'placeholder'` shows a 5-second sponsored pause. When you're ready for real rewarded video, apply for **AdSense for Games (H5 Games Ads)** inside AdSense, then set `REWARDED_ADS:'h5'` — the `adBreak()` integration is already wired. Or set `'off'` to hide the button.

**Consent banner** is on (`CONSENT_REQUIRED:true`). Keep it: any EU/UK player triggers GDPR. Analytics and ad scripts do not load until the player taps *Accept all*. Players can change their choice in Settings › Cookie preferences.

---

## 3. Analytics — Google Analytics 4

1. analytics.google.com → *Admin → Create property* → Web stream → your domain.
2. Copy the Measurement ID (`G-…`) into `GA4_ID`.
3. In GA4, mark `purchase` as a key event (it is already sent with value + items).

Events the game sends (all standard GA4 gaming names, so the built-in reports work):

| Event | When |
|---|---|
| `app_open` | every load |
| `tutorial_begin` | first-ever play |
| `level_start` / `level_end` / `post_score` | a window starts / finishes (with mode, tier, points) |
| `unlock_achievement` | career badge earned |
| `share` (method: copy / native) | share card copied or shared — **your most important metric** |
| `spend_virtual_currency` | gear or skin bought with credits |
| `begin_checkout` / `purchase` | Stripe flow |
| `ad_impression` / `rewarded_ad` | ad slots rendered / rewarded ad watched |
| `consent_update` | banner choice |
| `save_export` / `save_import` / `save_reset` | save-code usage |

Set `DEBUG:true` locally to see every event in the browser console.

---

## 4. Payments — Stripe Payment Links (no backend needed)

1. dashboard.stripe.com → *Product catalogue → Add product*. Create four one-time products:
   - **Pocket pack** — 200 credits — $0.99
   - **Beat writer pack** — 600 credits — $2.99
   - **Tier One pack** — 1500 credits — $5.99
   - **Remove ads** — $4.99
   (Prices and credit amounts are editable in `CONFIG.PACKS`; keep both places in sync.)
2. For each product: *Create payment link*. In the link's settings → **After payment → Don't show confirmation page → Redirect customers to your website**, and paste **exactly** (replace the domain):

   ```
   https://YOUR-DOMAIN/?purchase=pack1&session_id={CHECKOUT_SESSION_ID}
   https://YOUR-DOMAIN/?purchase=pack2&session_id={CHECKOUT_SESSION_ID}
   https://YOUR-DOMAIN/?purchase=pack3&session_id={CHECKOUT_SESSION_ID}
   https://YOUR-DOMAIN/?purchase=removeAds&session_id={CHECKOUT_SESSION_ID}
   ```
3. Paste the four `https://buy.stripe.com/…` links into `CONFIG.STRIPE_LINKS`. Buttons switch from disabled to gold automatically.
4. Test with Stripe in **test mode** (test links + card `4242 4242 4242 4242`). Credits should appear with a "Thank you!" card the moment you land back.

**Two modes of trust**

- `VERIFY_ENDPOINT:''` — the game trusts the redirect URL. Fine for launch week; a determined player could type the URL by hand and give themselves credits (only in their own single-player career, never the daily).
- `VERIFY_ENDPOINT:'/api/verify-purchase'` — the game asks Stripe first. Deploy `api/verify-purchase.js` on Vercel, add `STRIPE_SECRET_KEY` in *Vercel → Settings → Environment Variables*, and fill `PACK_BY_PRICE` (or add `pack=pack1` metadata to each link). Do this before you spend money on marketing.

Purchases are tied to the device/browser (no accounts). Players move them with the **save code** in Settings; support can restore them with the Stripe receipt + the device reference shown in Contact.

---

## 5. Legal — already built in, two things to do

Terms of use, Privacy policy and Contact are in the footer, in Settings and in the consent banner. Before launch:
1. Set `CONTACT_EMAIL`, `JURISDICTION` and `LEGAL_EFFECTIVE` in CONFIG.
2. Read both documents once. They cover: no accounts, local storage, GA4 + AdSense cookies with consent, Stripe payments, virtual items with no cash value, 13+ age, and the nominative use of real player/club names in a fictional simulation (same approach as 38-0). If you ever sell in the EU, the 14-day withdrawal waiver for instantly-delivered digital content is already handled by the "delivered immediately" clause.

---

## 6. QA checklist (run on a real iPhone + one Android)

**Daily window**
- [ ] Daily #N matches `LAUNCH_DATE` maths; countdown to midnight ticks
- [ ] Refresh mid-window → *Resume* appears and restores the same sagas and clues
- [ ] Finish → results → share card copies; on mobile the native **Share** button appears and the text ends with `SITE_URL`
- [ ] Play again same day → "Already played today"
- [ ] Next day → new window, streak increments

**Career**
- [ ] Credits earned, gear/skin purchases deduct correctly (`spend_virtual_currency` fires with `DEBUG:true`)
- [ ] Out of contacts → rewarded-ad button appears (Career only) → placeholder timer grants +1 contact
- [ ] Shop: all four Stripe buttons gold and clickable once links are set; disabled (grey) when empty

**Payments (Stripe test mode)**
- [ ] Buy each pack → redirected back → "Thank you!" → wallet increased by the right amount
- [ ] Reload the same redirect URL → no double credit (replay guard)
- [ ] Remove ads → all three ad slots disappear, Settings shows *Removed ✓*, survives *Wipe all progress*
- [ ] With `VERIFY_ENDPOINT` set: an invalid `session_id` shows the "couldn't confirm" card, no credits

**Consent, ads, analytics**
- [ ] First visit shows the banner; *Essential only* → no `googletagmanager` / `googlesyndication` requests in DevTools › Network
- [ ] *Accept all* → GA4 realtime shows `app_open`; ad units render (may take 10–30 min after AdSense approval)
- [ ] Settings › Cookie preferences → switching to *Essential only* reloads without trackers

**Persistence**
- [ ] Copy save code on phone A → Load on phone B → identical career, purchases, settings
- [ ] Private/incognito mode: game still plays (progress just won't persist)

**Devices & polish**
- [ ] iPhone SE width (375px): nothing overflows horizontally; consent banner doesn't cover the Play button after scrolling
- [ ] *Add to Home Screen* on iOS → opens full-screen, fonts load, status bar area clear
- [ ] Arabic: layout mirrors (RTL), consent banner and shop read correctly
- [ ] Lighthouse mobile: Performance ≥ 90 (single file, no framework — should be ~95+)

---

## 7. Launch-day checklist

- [ ] `SITE_URL` = final domain (share cards!)
- [ ] `LAUNCH_DATE` = today (so it says Daily #1)
- [ ] `SHOW_AD_PLACEHOLDERS:false`, `DEBUG:false`
- [ ] `GA4_ID` set; `ADSENSE_CLIENT` set if approved (leave `''` if still pending — the game shows nothing there)
- [ ] `STRIPE_LINKS` set to **live** links (not test); one real $0.99 purchase completed on your own phone
- [ ] Custom domain on HTTPS; `https://YOUR-DOMAIN/?purchase=pack1&session_id=x` shows the "couldn't confirm" card (verification on) or grants (trust mode)
- [ ] Twitter/X card preview: paste the URL into a DM to yourself — title and description show (add an `og:image` meta tag with a 1200×630 PNG of the logo for a big-image card once the logo is ready)

---

## 8. What's next (phase 2, not blocking launch)

- **iOS/Android app**: wrap this same `index.html` with Capacitor (capacitorjs.com) — one afternoon. Swap Stripe for StoreKit/Play Billing at that point (Apple requires IAP for in-app credits).
- **Leaderboards / friends**: needs a tiny backend (Vercel KV or Supabase) — only worth it once daily retention is proven.
- **Push notifications** for the daily window: comes free with the app wrapper.
- **og:image**: a 1200×630 PNG with the logo gets you the big-image card on X — the single cheapest marketing upgrade.
