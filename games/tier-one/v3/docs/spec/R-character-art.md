# R · Character art placement (3.8, lane38/core · Addendum A)

No image generation is available in this build, so the game ships **slots**, not faces. The owner's approved anime art
drops in by id with no code change.

## The slot

`ui/portrait.tsx` → `<Portrait kind="player|source|rival|staff" id size club mood name round />`

- Looks up `public/art/manifest.json` once (`{ v, base, player:{}, source:{}, rival:{}, staff:{} }`). Keys are `<id>` or
  `<id>@<mood>`; values are files under `public/art/` (or absolute URLs). Square, 512×512, PNG/WebP.
- No file → a consistent illustrated SVG placeholder: the same id always draws the same build, hair, skin and
  expression, tinted by the club (players) or the source colour. Moods (`neutral confident hesitant mischief stern
  shock joy`) change only brows and mouth; `moodFor(src, outcome)` picks a hesitant Off, a confident Done, a
  mischievous Barber Fake. Never a rule: the quote and the reliability line stay plain text beside it.
- **Live text, never baked:** names, club crests (`<Crest>`), kit (`<Kit>`), free-agent status and ages are drawn by
  code next to the portrait. A roster change never repaints art.

## Where it is placed

| Moment | Slot | Mood |
|---|---|---|
| Board card | `player` (52 px) with the kit badge | — |
| Player File header | `player` (84 px, 64 on phones) + kit, live club route | — |
| Source cards and clippings | `source` (44 / 36 px) with the source icon badge | from the last read |
| Call film header | `source` (44 px) | from the read |
| Rivals: race strip, overnight BREAKING cards, evidence markers | `rival` (round) via `RivalFace` | — |
| Onboarding "You were fired" | `staff` editor (stern) and you (hesitant) | fixed |
| Results verdict (before the stamp lands) | `player` of the best call's destination | — |

Ids: players use the world player id; sources `kitman barber agent spotter physio leak`; rivals `tabloid itk insider`;
staff `editor you`.

## Rules carried from the brief

- Short, economical motion only; portraits never animate on their own (the heat flame is the only moving thing on the
  header and it is off under reduced motion).
- Real players only through assets approved for the game's use; the placeholder never resembles a real person.
- Keep every portrait consistent across cards, scenes and share cards (one manifest, one placeholder generator).
