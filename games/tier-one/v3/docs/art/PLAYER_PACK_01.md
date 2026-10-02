# Tier One player art · batch 01 (40 players)

Made for ChatGPT image generation. Same look as the owner's Mohamed Salah portrait: painterly anime-inspired, warm floodlight rim light, night stadium bokeh.

## How to use

1. Open ChatGPT (image generation). Paste the **style prompt** once, then ask for the players one at a time with the
   **per-player line**. One image per message keeps the quality up.
2. Save each image as a PNG named exactly with the player id from the table, for example `p-erling-haaland.png`.
   Optional second image with a happy/celebrating expression: `p-erling-haaland-react.png`.
3. Zip the PNGs and send the zip here. One command imports them:
   `python3 games/tier-one/v3/tools/import_player_art.py <folder-or-zip>`
   It makes 512px WebP files in `public/art/players/` and adds them to `art/manifest.json`. The game shows the real art
   wherever that player appears; everyone else keeps the drawn placeholder. Later batches work the same way.

## Style prompt (paste first)

Reference: the owner's Mohamed Salah portrait (already in the game as `p-mohamed-salah`). Every image must match it.

> You are painting football player portraits for a premium game called Tier One. Keep exactly one style for every
> image in this chat, matching the Mohamed Salah portrait we made: a painterly, semi-realistic anime-inspired
> illustration of the named footballer, recognisable face and accurate adult appearance, confident relaxed expression,
> looking slightly off camera. Warm golden rim light on hair and face, soft cinematic shading, visible brush texture.
> Background: a dark night stadium with blurred warm floodlight bokeh. Framing: head and upper chest, face in the upper
> half, shoulders filling the bottom. Clothing: a plain football shirt in the club colours given, no badge, crest,
> sponsor, logo, number or stripes of text. Square 1024×1024 image. Do NOT add any name banner, caption, title, letters
> or watermark anywhere in the image.

## Per-player line (one message each)

> Next portrait: **NAME**, POSITION. Shirt colours: PRIMARY with SECONDARY trim. Save as `ID.png`.

| # | id (file name) | name | club | position | shirt colours |
|---|---|---|---|---|---|
| 1 | `p-erling-haaland` | Erling Haaland | Manchester City | forward | #98C6EB / #FFFFFF |
| 2 | `p-jeremy-doku` | Jérémy Doku | Manchester City | forward | #98C6EB / #FFFFFF |
| 3 | `p-enzo-fernandez` | Enzo Fernández | Manchester City | midfielder | #98C6EB / #FFFFFF |
| 4 | `p-alexander-isak` | Alexander Isak | Liverpool | forward | #8F1E32 / #FFFFFF |
| 5 | `p-alexis-mac-allister` | Alexis Mac Allister | Liverpool | midfielder | #8F1E32 / #FFFFFF |
| 6 | `p-cody-gakpo` | Cody Gakpo | Liverpool | forward | #8F1E32 / #FFFFFF |
| 7 | `p-bukayo-saka` | Bukayo Saka | Arsenal | forward | #F00000 / #FFFFFF |
| 8 | `p-martin-odegaard` | Martin Ødegaard | Arsenal | midfielder | #F00000 / #FFFFFF |
| 9 | `p-eberechi-eze` | Eberechi Eze | Arsenal | midfielder | #F00000 / #FFFFFF |
| 10 | `p-kylian-mbappe` | Kylian Mbappé | Real Madrid | forward | #FFFFFF / #FEBE10 |
| 11 | `p-vinicius-junior` | Vinícius Júnior | Real Madrid | forward | #FFFFFF / #FEBE10 |
| 12 | `p-federico-valverde` | Federico Valverde | Real Madrid | midfielder | #FFFFFF / #FEBE10 |
| 13 | `p-lamine-yamal` | Lamine Yamal | Barcelona | forward | #05003B / #FFFFFF |
| 14 | `p-raphinha` | Raphinha | Barcelona | forward | #05003B / #FFFFFF |
| 15 | `p-khvicha-kvaratskhelia` | Khvicha Kvaratskhelia | Paris Saint-Germain | forward | #0000CC / #FFFFFF |
| 16 | `p-ousmane-dembele` | Ousmane Dembélé | Paris Saint-Germain | forward | #0000CC / #FFFFFF |
| 17 | `p-harry-kane` | Harry Kane | Bayern Munich | forward | #FF0000 / #FFFFFF |
| 18 | `p-jamal-musiala` | Jamal Musiala | Bayern Munich | midfielder | #FF0000 / #FFFFFF |
| 19 | `p-michael-olise` | Michael Olise | Bayern Munich | forward | #FF0000 / #FFFFFF |
| 20 | `p-cole-palmer` | Cole Palmer | Chelsea | midfielder | #14349B / #FFFFFF |
| 21 | `p-pedro-neto` | Pedro Neto | Chelsea | forward | #14349B / #FFFFFF |
| 22 | `p-bruno-fernandes` | Bruno Fernandes | Manchester United | midfielder | #FF0000 / #FFFFFF |
| 23 | `p-matheus-cunha` | Matheus Cunha | Manchester United | forward | #FF0000 / #FFFFFF |
| 24 | `p-lautaro-martinez` | Lautaro Martínez | Inter Milan | forward | #000000 / #FFFFFF |
| 25 | `p-marcus-thuram` | Marcus Thuram | Inter Milan | forward | #000000 / #FFFFFF |
| 26 | `p-scott-mctominay` | Scott McTominay | Napoli | midfielder | #777777 / #FFFFFF |
| 27 | `p-rasmus-hojlund` | Rasmus Højlund | Napoli | forward | #777777 / #FFFFFF |
| 28 | `p-kenan-yildiz` | Kenan Yıldız | Juventus | forward | #777777 / #FFFFFF |
| 29 | `p-christian-pulisic` | Christian Pulisic | AC Milan | midfielder | #000000 / #FFFFFF |
| 30 | `p-julian-alvarez` | Julián Alvarez | Atlético Madrid | forward | #FF0000 / #0000FF |
| 31 | `p-serhou-guirassy` | Serhou Guirassy | Borussia Dortmund | forward | #FFE300 / #000000 |
| 32 | `p-gabriel-martinelli` | Gabriel Martinelli | Al Hilal | forward | #0000DF / #0040FF |
| 33 | `p-ruben-neves` | Rúben Neves | Al Hilal | midfielder | #0000DF / #0040FF |
| 34 | `p-kingsley-coman` | Kingsley Coman | Al-Nassr | forward | #FFFF00 / #000044 |
| 35 | `p-victor-osimhen` | Victor Osimhen | Galatasaray | forward | #A90432 / #FDB912 |
| 36 | `p-leroy-sane` | Leroy Sané | Galatasaray | forward | #A90432 / #FDB912 |
| 37 | `p-kerem-akturkoglu` | Kerem Aktürkoğlu | Fenerbahçe | forward | #002F6C / #FFED00 |
| 38 | `p-taher-mohamed` | Taher Mohamed | Al Ahly | forward | #CC0000 / #FFFFFF |
| 39 | `p-nasser-mansi` | Nasser Mansi | Zamalek | forward | #FFFFFF / #111111 |
| 40 | `p-saleh-al-shehri` | Saleh Al-Shehri | Al-Ittihad | forward | #FFDD00 / #000000 |
