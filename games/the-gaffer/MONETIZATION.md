# The Gaffer: money plan

How The Gaffer earns without hurting the career. Everything below ships **switched off**: a build with empty ids
makes no ad or payment requests at all. Fill in the ids, rebuild, and each part turns on by itself.

## What's in the game (v0.12)

| Placement | Where | Disruption | Fit | Revenue | Status |
|---|---|---|---|---|---|
| **Supporter pack** (one-off: 3 club looks, Supporter badge, no ads) | Club › ⚙ Settings and more | none | high | medium | built, needs a Stripe Payment Link |
| **Club looks** (Floodlight, Pitch, Derby red) | same card | none | high | part of the pack | built |
| **Rewarded ad: free opponent report** (optional, labelled, the report can always be bought with club money) | Match › Next | low | high | medium | built for web (AdSense H5 ads) and Android (bridge, see below) |
| **Sponsor card** (labelled "Sponsored", below the headlines, never over controls) | Home | low | medium | low–medium | built for web, needs an AdSense slot |
| Pitch-side boards with Semba cross-promo | Live match | low | high | low–medium | later |
| Expansion leagues | new content | none | high | high | later |
| Interstitials between matches | — | high | low | medium | **avoid** |
| Selling cash or development points | — | medium | low | medium | **avoid** (pay-to-win in a single-player career) |

Supporters never see ads. Nothing is locked behind a purchase except the three extra looks.

## Turning it on

All switches live in `games/the-gaffer/web/src/monet.ts`.

### Web ads (AdSense)
1. Add sembagames.app to AdSense and get the publisher id (`ca-pub-…`). Create one display ad unit for the Home card.
2. Set `MONET.adsenseClient` and `MONET.adsenseSlotHome`.
3. For rewarded ads, turn on **H5 Games Ads** (Ad Placement API) for the site in AdSense. The game calls `adBreak({ type: 'reward' })`.
4. Rebuild (`npm run build:min`), copy `build/index.html` to `/the-gaffer/index.html`, push.

AdSense only loads on the web (never inside the Android app) and never for supporters.

### Supporter pack (Stripe)
1. Stripe › Payment Links › new link for the pack. Metadata: `pack=supporter`.
   Success URL: `https://sembagames.app/the-gaffer/?session_id={CHECKOUT_SESSION_ID}`.
2. Vercel › Project › Environment Variables: `STRIPE_SECRET_KEY` (already there if Tier One's purchases are set up).
3. Set `MONET.supporterUrl` to the Payment Link and rebuild.

When Stripe sends the player back, the game asks `/api/the-gaffer/verify-purchase` whether the session is paid.
Only a confirmed payment unlocks the pack, and each session unlocks once per device.

### Android rewarded ads (AdMob)
The web game looks for `window.GafferAds.rewarded(callbackName)`. To turn it on in the app:
add the AdMob SDK and app id to `android/`, expose a `GafferAds` JavaScript interface from `MainActivity`, show a
rewarded ad, then call `window[callbackName](true)` when the reward is earned (or `false` if it wasn't).
Until then the app shows no ads.

## Privacy
The privacy page (Settings and more › Privacy) already says what AdSense and Stripe do when they're switched on.
Update it if another provider is added.
