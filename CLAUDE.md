# Pescara — the Butterfly Cave trip site

Trip site for Villa Grotta delle Farfalle, Rocca San Giovanni, 11–20 Sept 2026, seven friends.
Live: https://northin-mariu.github.io/abruzzo/ · repo `northin-mariu/abruzzo` (public, Pages from `main`).
Full history of decisions and passes: `docs/HISTORY.md`. Read it only when a rule below needs its why.

## Build
- `places.json` is the source of truth. `python3 build.py` reads it + `body.html`, `site.css`, `app.js`,
  `painted-bg.js` and writes `index.html`. **Never hand-edit `index.html`.**
- After adding places: `python3 geocode.py` (only touches records without lat/lon).
- Build strips CSS to ASCII, `\uXXXX`-escapes JS, uses numeric entities in HTML. Keep it that way;
  a stray `·` in a script is how mojibake got in twice.
- Auto-rebuild on push is NOT set up (needs `gh auth refresh -s workflow`). Build and commit `index.html`.

## Structure
- Four tabs: Welcome · Calendar (10 days × 7 slots) · Activities (four sections) · Things to know.
- Sections = `ORDER`/`HOUSE`/`CELLAR`/`EAT` in build.py. Adding a section means touching body.html
  (`grid-`, `sec-`, `n-`), app.js `buildTiles`, the `#groups` chips and `inGroup()`.
- Give a place `"added": "YYYY-MM-DD"` and it wears a "Just added" badge for three weeks by itself.

## Shared data (Cloudflare Worker + KV)
- `worker/abruzzo-picks.js` at `https://abruzzo-picks.mattnorthin.workers.dev`, KV `abruzzo-picks` bound
  as `PICKS`. `SYNC` in app.js holds the URL. Hearts under each name; the calendar under `_plan`; tips under `t:`.
- Deploy = paste into the dashboard editor (click in, Cmd+A, Cmd+V, verify `pbpaste` first) or PUT via
  the API. `worker/smoke.sh <url>` exercises it. v2 is live (`GET /picks/_plan` → 200).
- KV reads lag writes by ~2 s: a read straight after a PUT returns the old value. Not a failure.
- Remove a stray name: `curl -X DELETE <SYNC>/picks/<Name>`. **Never delete the "Matt" entry.**
- Plan backups: `GET /picks/_plan/backup/<date|wiped>`, PUT the ids back.

## Decisions — do not re-litigate
- No photographs (bytes + licensing). `mapUrl` is the photo feature.
- No `prompt()` / `alert()`, ever — they die silently in in-app browsers.
- Sheets (`#who`, `#tip`) live after `</main>` at z-index 1200. Do not move them inside a view.
- Design system = `.claude/skills/butterfly-cave-design`. No `box-shadow`, no literal hex in markup/JS
  (person colours are `--who-1..7`). Tile design is 1b (Matt's call) over the painted cobalt field.
- Hearts + "Popular" chip + friends' chips are the whole social UI. No tallies, share links or copy buttons.
- Names are mandatory for hearts and calendar edits; `cleanName()` everywhere a name enters.
- Calendar: seven chronological slots; "All day" folds Morning/Afternoon away; rough ideas (`g-` ids)
  then "Confirm a place". Op-replay heals lost updates; a Durable Object is the upgrade if the group trips.
- Wed 16 wine day is DIY (Mucci → Jannamico → La Vinarte). Fri 18 is Termoli. Sat 12/Sun 13 are markets.

## Known gaps
- No opening days in the schema (one Monday, two Sundays in the trip). Worth more than more places.
- "Out and about" has 145 tiles and wants splitting or curating — Matt's call.

## Where the logistics live (not here — public repo)
- Notion "Abruzzo Outreach" (`collection://98651d64-b42a-45f6-a566-a15a47501ee3`): who was contacted, status, price.
- Memory `abruzzo-trip-plan-state` in `~/.claude/projects/-Users-mattnorthin/memory/`: bookings, numbers, admin.
- `/supremo` skill: live plan, hearts and gaps from the worker.
- Booking references and flights are in Gmail. Host is Chiara (Vasto, replies within the hour).
- Matt's taste: cheap, no-frills, fish-first locals' places over set-menu trabocchi.

## Tests
Harnesses live in the session scratchpad, not the repo: `cal2.js`, `sync2.js`, `pending.js`, `exit.js`,
`worker.test.mjs`, `concurrency/`. 99 checks as of 2026-08-31. Re-create from `docs/HISTORY.md` if needed.
