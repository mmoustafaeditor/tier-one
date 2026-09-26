<p align="center">
  <img src=".github/assets/studio-banner.svg" alt="Semba Studios — an AI-native indie game studio" width="100%">
</p>

<p align="center">
  <b>Semba Studios</b> is a small, AI-native indie game studio.<br>
  We design, write and ship games as a tiny human team working side by side with AI.
</p>

<p align="center">
  <a href="games/tier-one"><img alt="Games" src="https://img.shields.io/badge/games-1-B6FF3A?style=for-the-badge&labelColor=07090B"></a>
  <a href="https://github.com/mmoustafaeditor/tier-one/raw/refs/heads/main/downloads/TierOne.apk"><img alt="Platform" src="https://img.shields.io/badge/platform-Android%20%7C%20Web-3D8BFF?style=for-the-badge&labelColor=0B1224"></a>
</p>

---

## 🎮 Our games

Tap a game to open its page: the story, how to play and the download.

<p align="center">
  <a href="games/tier-one">
    <img src=".github/assets/tier-one-card.svg" alt="Tier One — the football transfer journalist game. Tap to open." width="100%">
  </a>
</p>

| Game | Genre | Status | Play |
|---|---|---|---|
| **[Tier One](games/tier-one)** | Football transfer-journalist strategy game | Web `v1.0.0` · Android `1.1` beta | [🌐 sembagames.app](https://sembagames.app) · [⬇️ Download APK](https://github.com/mmoustafaeditor/tier-one/raw/refs/heads/main/downloads/TierOne.apk) |
| *Game 02* | 🔒 In the lab | Coming soon | — |

---

## 🧠 How we build

- **Humans own the idea, taste and final call.** AI is our co-writer, co-designer and pair programmer.
- **Ship small, ship often.** Every game starts as one playable web file, then grows into an app.
- **One repo, many games.** Each game has its own folder under [`games/`](games) with its own README.
- **Everyone can see what changed.** Every update is logged in [`UPDATES.md`](UPDATES.md).

## 📁 Repository layout

```
.
├── README.md              ← you are here (studio page)
├── UPDATES.md             ← team update log: who changed what, and when
├── CLAUDE.md              ← working rules for Claude Code sessions on this repo
├── index.html             ← Tier One: the whole game (served at sembagames.app)
├── api/tier-one/latest.js ← Android update feed (Vercel function)
├── verify-purchase.js     ← Stripe purchase check (see games/tier-one/LAUNCH.md)
├── downloads/TierOne.apk  ← published Android APK
├── .github/assets/        ← logos (Semba neon S, Tier One T1), banner and game card
└── games/
    └── tier-one/          ← Game 01 page (README) + launch guide
```

Tier One's web files stay at the repo root on purpose: the site and the update feed that installed
apps poll (`/api/tier-one/latest`, `/downloads/TierOne.apk`) are served from there.

## 🤝 Working on this repo

We are a three-person team (`saifsaber`, `mmoustafaeditor`, `moemsacod`) and all of us work with [Claude Code](https://claude.ai/code).
This repo is the one we all work in. The old `saifsaber/tier-one` repo is retired.
Before you start, read the latest entries in [`UPDATES.md`](UPDATES.md). After you push, add yours.
See [`CLAUDE.md`](CLAUDE.md) for the rules.

---

<div dir="rtl">

## 🇪🇬 بالعربي

**Semba Studios** استوديو ألعاب مستقل صغير شغال بالذكاء الاصطناعي. إحنا فريق صغير بنصمم ونكتب وننزل ألعاب، والـ AI شغال معانا جنب بجنب.

**أول لعبة لينا: [Tier One](games/tier-one)**. إنت صحفي انتقالات كورة، بتكلم مصادرك وبتحاول تفرقع الخبر قبل الكل… أو تتبهدل على السوشيال. اضغط على كارت اللعبة فوق عشان تدخل صفحتها.

كل تحديث بيتسجل في [`UPDATES.md`](UPDATES.md) عشان كل واحد في الفريق يعرف التاني عمل إيه.

</div>

---

<p align="center"><sub>© 2026 Semba Studios · <a href="mailto:hello@sembastudios.com">hello@sembastudios.com</a></sub></p>
