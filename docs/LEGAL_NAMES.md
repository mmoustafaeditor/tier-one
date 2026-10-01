# Names, voices and lines in Tier One

Rules for every line of in-game text (all languages) and every character.

## Characters

- Every journalist, rival, source, agent, editor and fan is fictional. The house rivals are **@BackPageBants**
  (tabloid), **@ITK_Kev** (anonymous ITK) and **@PressBoxPete** (old-school insider). The editor is Mags Doyle; the
  sources are Rosa (agent), Dougie (kit man), Dr Inès (physio), Terminal Tony (plane spotter), Sal (barber) and the
  club press office.
- No real journalist, reporter, pundit, creator or account appears as a character, is quoted, or is imitated by a
  recognisable catchphrase or style.
- The only real people in the game are by consent: signed Creator Rivals (`docs/CREATORS.md`). They speak with a house
  voice pack, never with words attributed to them.
- Fan names and handles are invented. Club-flavoured handles (`@{club}_ultra`) are built from the club in the saga and
  are generic, not real accounts.

## Lines

- No "HERE WE GO" (in any language or spelling) anywhere a player can see it. The player's own catchphrase fills that
  moment (`cp.house.*`, signature and season lines, or a custom line).
- Catchphrases are originals. The custom-line blocklist (`lib/catchphrase.ts` and the server check) refuses famous
  lines, real reporters' names, brands and our own name.
- Voice: current football Twitter, short, funny, PG-13. Banter is about calls, records and sources, never about anyone's
  life, looks, family, nationality, religion or health. No slurs, no swearing.
- Never cruel about real people. Players and clubs in sagas can be joked about only in terms of the transfer story.
- A source's line can hint and joke, but it must not change what the read means: the outcome index it sits under
  (`voice.<src>.<outcome>`) decides what it says.

## Sharing

- "Post it" shares the player's own result card or catchphrase card with a line written for them, the game URL and two
  hashtags (`#TierOne #TransferTwitter`). It never tags or names a real account.
