# Daily trip brief — Butterfly Cave, 11–20 Sept 2026

Run by a cloud routine each morning. Read-only: never change the plan, the hearts or the site.

## What to do

1. `python3 brief.py` — live data from the shared worker: the plan day by day, unbooked
   restaurants with their phone numbers, hearts per person, and the most-hearted places not
   yet in the plan.
2. `python3 brief.py find <day> <words>` — everything on the site matching those words, with
   that day's opening hours from Google. Day is 11–20 or a weekday word; default is today.
   Use it to answer "what's open today" rather than guessing from the descriptions.
3. Check what's on that date near Rocca San Giovanni:
   - https://www.abruzzonews.eu/ — weekly "Eventi in Abruzzo nel weekend" round-ups
   - https://www.chietitoday.it/eventi/ — Chieti province, closest to the house
   - https://iltaccodibacco.it/abruzzo/concerti/ and https://www.rockol.it/concerti-abruzzo-r-7bwod5yr543
   - Lanciano's Feste di Settembre run to 16 Sept: Mon 14 Vasco tribute, Tue 15 Ermal Meta,
     Wed 16 Fabrizio Moro, Piazza Plebiscito, free. Fireworks 00:30 on the 14th and 15th.
   - "Francavilla è Jazz" is Francavilla Fontana in Puglia, not Francavilla al Mare. Ignore it.

## What to send

Under 25 lines, plain English, bullets, opinionated. In this order:

1. **Today** — what the plan holds, and what is on nearby that is worth leaving the house for.
2. **Book now** — unbooked real restaurants, most urgent first, each with its number. Urgency:
   trabocchi any day (few tables), Sat 19 (festa opens + antiques market, town rammed),
   Sunday and Monday slots (closures), a group of seven anywhere. Skip beach bars and gelaterie.
3. **Shut today** — the ones they would otherwise turn up to. Monday is the bad day: 37 of the
   restaurants close. Sunday shuts most shops and makes several places lunch-only.
4. **Gaps** — 3 to 5 that need a decision, dinners before mornings, early days before late ones.
5. **Fills** — pair the most-hearted places not in the plan against those gaps.
6. End with ONE question: the single next action.

Google hours are a guide — say "ring to be sure" once, not on every line.

## Facts worth keeping straight

- Seven people. Matt's birthday is Thu 17, Lyndsey's Wed 16. Lauren lands Thu 17.
- Sun 20 is departure day: Sulmona, then Pescara airport.
- Hearts are keyed by place id, so a place can be added freely but never renamed.
- This brief cannot see Matt's email or WhatsApp, so it cannot know what has been booked by
  phone. Say "not booked *on the site*" rather than asserting nobody has rung.
