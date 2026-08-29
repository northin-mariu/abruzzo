# Ten days out of Rocca San Giovanni

Trip site for Butterfly Cave (Villa Grotta delle Farfalle, Rocca San Giovanni CH),
11–20 September 2026. 230 places across 86 towns.

- **Live:** https://northin-mariu.github.io/abruzzo/
- **Repo:** `northin-mariu/abruzzo` (public, GitHub Pages from `main`)
- This directory mirrors the repo. Both are in sync as of the rebuild commit `200cb4e`.

## How it is built

`places.json` is the source of truth. `build.py` reads it plus `body.html`, `site.css`,
`app.js` and `painted-bg.js`, and writes `index.html`.

```bash
python3 build.py
```

**Never hand-edit `index.html`** — it is generated and any change is lost on the next build.
It is committed only because Pages serves it.

The build also normalises encoding: CSS is stripped to ASCII, JS is `\uXXXX`-escaped, HTML uses
numeric entities. Nothing depends on a charset header. Keep it that way — a stray `·` in a
script is how mojibake got in twice during development.

## Structure

Four tabs: Welcome, Calendar (10 days × Morning / Full day / Lunch / Dinner, with full-day
exclusion), Activities (262 tiles in four sections), Things to know.

**Four sections (2026-08-29)**, set by `ORDER` / `HOUSE` / `CELLAR` / `EAT` in build.py:
**At the house** (3) · **Eat & drink** (91) · **Wineries & distilleries** (23) ·
**Out and about** (145). Each needs a `grid-`, `sec-` and `n-` element in body.html and an entry
in the `['house','eat','cellar','do']` list in app.js `buildTiles`; the group chips in `#groups`
and `inGroup()` follow. Adding a fifth means touching all four places.

## Decisions already made — do not re-litigate

- **No photographs.** Measured at 108 KB each, so 230 would be ~24 MB against a 173 KB page;
  every CC BY-SA image needs a visible credit; Commons has nothing for the pizzerie and forni
  that make up most of the list. `mapUrl` is the photo feature — it opens Google's own current
  photos at zero byte and zero licensing cost.
- **Shared hearts** (2026-08-25): `worker/abruzzo-picks.js` is a Cloudflare Worker +
  KV (`PICKS`). `SYNC` in app.js holds its URL; empty = hearts stay on the phone. With it set, each
  heart PUTs `{ids}` under the person's name (debounced 800 ms) and everyone's hearts are pulled on
  load, on tab focus and every 30 s into `S.friends`. To remove a stray name: `curl -X DELETE
  <SYNC>/picks/<Name>` (there is no Forget button any more). No auth — the page is public, so
  a key would be public too; abuse ceiling is "someone scribbles on a trip list".
  **Deployed 2026-08-25** in Matt's Cloudflare account (mattnorthin@gmail.com): worker
  `abruzzo-picks` at `https://abruzzo-picks.mattnorthin.workers.dev`, KV namespace `abruzzo-picks`
  bound as `PICKS`. `worker/smoke.sh <url>` exercises it. KV listings lag writes by ~2 s.
  To update the worker code: dashboard → Workers & Pages → abruzzo-picks → Edit code → paste
  `worker/abruzzo-picks.js` → Deploy (the editor is a cross-origin frame; Claude's browser tools
  cannot type into it, so the paste is Matt's). To wipe all hearts: delete the KV namespace's keys.
  **Flow (2026-08-26):** the only UI is hearts + the "Popular" chip (everything anyone hearted,
  most loved first) + friends' chips + initial badges. No tally text, no copy buttons, no share
  links — Matt asked for none of that; the group just looks. A first heart with no name opens
  the `#who` sheet; the chip reads "You're Matt · change" afterwards. Polls every 30 s.
  **Personal links (2026-08-26):** `?me=Frances` sets the name, strips itself from the URL and shows
  the welcome card ("Ciao, Frances") — Matt sends one per person, so nobody types a name. The
  welcome card (`#welcome`, page-level, outside the tab views) shows once per phone (`S.welcomed`)
  or again whenever a personal link with a different name is opened; with no name it asks for one.
  The map is permanent at the top of Activities (built on first show of that tab via `ensureMap`).
  **Names are mandatory (2026-08-28):** a heart with no name never leaves the phone, so an unnamed
  phone is asked on every heart (not just the first) and the welcome card reappears on load
  whenever `S.me` is empty, even if `S.welcomed` is set by an older build. That was the
  "generic link shows someone else's initial" report: the badge was Sam's S, and the real
  bug was that the unnamed phone's own hearts were invisible and never synced.
- **No `prompt()` or `alert()`, ever.** They throw in chat-app in-app browsers and the exception
  is swallowed by the event system, so controls die silently. That was the original bug.
- **Design system** = the `butterfly-cave-design` skill in
  `.claude/skills/butterfly-cave-design/`. That is the project's own `SKILL.md`, installed
  verbatim, with the seven token files and the rules. My earlier hand-copied `abruzzo-design`
  skill is deleted — it had gone stale twice.
  The full system (20 components, 26 guideline cards, the Italiana binary, ui_kits, assets) stays
  in the Claude design project `019dd9ea-6bea-7da7-9327-7907bb2134c7` and is read on demand.
  The skill README also carries the measured contrast table and the `painted-bg` viewBox trap,
  so neither gets re-derived.
- Tile design is option **1b** (whole tile is the colour, copy on a cream block inside) from the
  "Location and activity tiles design" project `cadf88bf-b65d-4037-8c7f-230fa047c791`, over a
  full painted cobalt field. Matt asked for this explicitly after seeing 1a; I had argued 1a was
  safer at 230 tiles, and was overruled — it looks good, so treat 1b as settled.
  Fills: `--do-field #1B655F` (6.19 vs cream) and `--eat-field #8E3B1A` (6.81). Group headings are
  compact pills, not banners. The Calendar and Things to know tabs keep painted banners in pool
  and fig.

## Sections, tips and just-added (2026-08-29)

- **Wineries & distilleries** is `wine` + a new `distill` category (`--cellar #8D3B5E`, 6.51 vs
  cream). The four distilleries that were filed under Provisions and Weird moved into it, and
  three that were missing were added (L·AB Francavilla, 7579 Brecciarola, Ival Fara Filiorum
  Petri). BP Service stays in the section flagged "Designated driver" - a driver for the day is
  the answer to a distillery run, not a misfile.
- **At the house** is Vero's ask (WhatsApp, 2026-08-29): Sleeping in, Laying by the pool, A long
  lunch on the terrace. It leads the page deliberately - they are droppable into Calendar slots,
  which is the point: a morning with "Sleeping in" in it is a morning nobody can fill with a drive.
  These carry `lat/lon: null, geo: "none"` so they take no map pin.
- **Just added.** Give a place `"added": "YYYY-MM-DD"` in places.json and for three weeks
  (`NEW_MS` in app.js) it wears an ochre "Just added" badge, floats up, and is counted by the
  "Just added" chip. The float is `order = -(votes * 4 + isNew)`, so hearts still outrank a new
  arrival but a new arrival beats anything nobody has hearted. It expires by itself - there is no
  second list to keep tidy.
- **Group tips.** `+ Add a place` writes free text to a second worker route, `/tips`, keyed the
  same way as the hearts (`t:` prefix in the same KV namespace, replaced per person, last write
  wins). Tips render in a "From the group" section above everything, coloured by the author.
  A tip is **not** in PLACES, so it has no drive time, no pin, no heart and no calendar slot -
  promote a good one into places.json and it gets all four. The section steps aside whenever any
  filter other than the search box is on, because a tip has no category or drive time to match.
  Requires the worker redeploy below; until then `/tips` 404s and tips stay on the phone.
- **Sheets are page-level, and must stay there.** `main.shell` and `.actwrap` are both
  `position:relative; z-index:1`, so a `position:fixed` sheet inside them is trapped in their
  stacking context and the sticky nav (z-index 20) and Leaflet's panes (400) paint straight over
  it. `#who` and `#tip` now sit after `</main>` at z-index 1200. Do not move them back inside a view.
  `.sheet input` sets `flex:1`, which stretches a stacked form to fill the column - `.rows` opts
  out with `flex:0 0 auto`.

## Known gaps

- **Map (added 2026-08-25).** Permanent at the top of Activities; Leaflet + OpenStreetMap tiles
  load the first time that tab is shown. Pins whatever passes the current filters, coloured by
  category; hollow pin = town-centre fallback, black pin = the house. Coordinates come from
  `geocode.py` (Nominatim, 1 req/s, results stored in `places.json` as `lat`/`lon`/`geo`). Run it
  after adding places: `python3 geocode.py` only touches records without coordinates.
  `HOUSE` in app.js is the Rocca San Giovanni borgo, not the villa's door — Nominatim does not
  know the villa; correct it if Chiara gives a pin.
- **No opening days.** One Monday (14 Sep) and two Sundays (13, 20). The original shortlist schema
  had `closed` / `only` / `dates` / `tags` and this one lost them. Adding them back is worth more
  than twenty more places.
- **Worker redeploy owed (2026-08-29).** `worker/abruzzo-picks.js` gained the `/tips` routes but
  is not deployed. Dashboard -> Workers & Pages -> abruzzo-picks -> Edit code -> paste the file ->
  Deploy. The editor is a cross-origin frame, so the paste is Matt's. Until then "+ Add a place"
  saves to the phone only and says so.
- **CARTO tiles now watermarked.** `a.basemaps.cartocdn.com/light_all` still returns 200 but the
  PNG itself carries "APIKEY REQUIRED" across it, so the map reads as broken on the live site too.
  Fix is either a free CARTO key or a swap to standard OSM tiles - the latter loses the sepia
  limestone wash the design pass chose. Not done; ask first.
- **Auto-rebuild not set up.** `.github/workflows/` needs a token with the `workflow` scope; this
  session's has only `repo`. Run `gh auth refresh -s workflow`, or add it via the web UI.

## Where to find more places

The house PDF names **Chiara** — the host, lives in Vasto, replies within the hour, and already
sends recommendations before guests arrive. The measured gaps to ask her about: nothing in
Walks & ruins within 15 min (26 places, nearest is 16), one Spa & rainy day option within 15 min,
two Bars & music. The list is strong far away and thin near the house.

## Who is there when (fixed points, rendered as pills in the Calendar via `DAYS[].fixed` in app.js)

- Fri 11 Sep — Matt, Sam and Vero arrive. Matt is on FR 982 STN 13:05 → PSR 16:30
- Mon 14 Sep — Lyndsey, Frances and Anthony arrive on FR 982 STN 17:15 → PSR 20:40, the only
  direct London flight that day. Lyndsey confirmed 14th–20th on 2026-08-25. Late arrival: at the
  house ~21:45, so dinner that night needs to be late-friendly (pizza oven, or Stasera Pago Io till 22:00).
- Wed 16 Sep — Lyndsey's birthday. Lauren flies Dublin → Stansted in the evening and overnights in
  London for the early start.
- Thu 17 Sep — Matt's birthday; Lauren lands on FR 235 STN 06:25 → PSR 09:50 (booked 9 Aug),
  underseat bag only, needs an airport pickup; at the villa ~10:45.
- Sun 20 Sep — everyone flies home on FR 983 PSR 19:25 → STN 21:00. Matt has booked a minivan
  from Stansted for the group. Lauren then needs Dublin by 09:00 Monday for class — undecided
  between the 22:00 Sunday Stansted → Dublin (tight, ~1 hr after landing) and a Monday 06:30;
  she asked Matt to weigh in and it was left as "chat over the weekend" (7 Aug).

All flights are Ryanair from Stansted. Booking references live in Gmail, not here (public repo).
Vero is on the group flight home on the 20th, then stays with Matt in London and flies on to
Berlin on the 22nd — the "leaving London 22nd" message is that, not an early departure from Italy.

Seven people in total. Matt's taste in restaurants: cheap, no-frills, fish-first locals' places
(Os Fialhos in the Algarve, Stasera Pago Io) — lean that way over set-menu trabocchi.

## Shared plan (2026-08-26)

The Calendar is one plan for the group, stored in the same KV store under the pseudo-name
`_plan`: each slot is an id like `d14--dinner--<place id>--<who slug>--b1` (b1 = booked), which
passes the worker's id regex, so no worker change was needed. `planChange(fn)` fetches the latest
plan, applies the tap, saves, renders and PUTs — last write wins per edit, not per session.
Anyone can add, remove or toggle "Book it". `S.plan` values are `{id, by, booked}` (older bare-id
saves are upgraded on load). Names in the plan are slugs, mapped back via known names.
Matt's real hearts live under "Matt" in the store — never delete that entry when cleaning up tests.

## Design compliance pass (2026-08-26)

Map, welcome card, sheet, badges and calendar were checked against `.claude/skills/butterfly-cave-design`
and fixed: no `box-shadow` anywhere (rings are `outline`, elevation is paper-2 + `--line`), no literal
hex in markup or JS (person colours are `--who-1..7` tokens, chosen for 4.5:1 with peach initials;
the store carries the index `c-3`, never a hex), Leaflet controls restyled (Karla, paper surfaces,
44px zoom buttons, 12.5px attribution, popup as a paper card), CARTO light basemap with a sepia
wash so the tiles sit on the limestone ground, welcome list uses numerals not glyphs, "Booked"
is colour-carried (olive fill) with no tick mark. Keep it that way when adding UI.
