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

Four tabs: Welcome, Calendar (10 days × seven slots, see below), Activities (262 tiles in four
sections), Things to know.

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
  **Deployed 2026-08-29** and round-trip tested (PUT, read back, `javascript:` link stripped
  server-side, DELETE).
  **Worker v2 (2026-08-30, code written and unit-tested, NOT YET DEPLOYED - ask Matt):**
  - Index keys `p:_index` / `t:_index` (the list of names): a GET is one get for the index plus
    one per person in parallel, never a KV `list` (free plan: 1,000 lists/day - seven phones
    polling spent that in ~95 minutes; the poll also now skips while the tab is hidden, which is
    how a backgrounded laptop was burning the whole day's quota alone). The index builds itself
    from existing keys on the first request after deploy (one list, once). Response shapes are
    unchanged, so old and new app builds both work against it.
  - At most 32 names per prefix (33rd -> 507), so junk names cannot inflate every poll's reads.
  - Names are NFC-normalised with invisible characters stripped; `_`-prefixed refused except
    `_plan` on /picks; leading-dot and letterless names refused.
  - `_plan` only accepts plan-shaped ids (`dNN--slot--id--who--bN`), so a phone stuck named
    "_plan" can no longer replace the calendar with its hearts.
  - Backups: the first `_plan` write of each UTC day keeps the previous value under
    `bak:_plan:<date>` (60 days); a write that EMPTIES a non-empty plan keeps it under
    `bak:_plan:wiped`. Restore: `GET /picks/_plan/backup/<date|wiped>`, PUT the ids back.
  - `GET /picks/:name` returns one record (1 read); bodies are measured by `text().length`
    (the Content-Length header can lie), over 64 KB -> 413; tips' 70-char cut no longer leaves
    a lone UTF-16 surrogate (which used to crash every phone's render loop - see below);
    all errors return JSON with CORS headers (503), never Cloudflare's HTML page.
  Tests: scratchpad `worker.test.mjs`, 37 checks against a fake KV that counts operations. KV listings lag a write by ~2s, so a read straight after a PUT returns the
  old value - wait, do not conclude it failed.
  The dashboard editor *can* be driven after all: click into it, Cmd+A, Cmd+V. The trap is the
  clipboard - `pbcopy` the file and verify with `pbpaste` immediately before pasting, because
  anything that copies a URL in between silently replaces it. Cmd+Z restores if a paste goes wrong,
  and nothing reaches the live worker until Deploy is clicked.
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
passes the worker's id regex, so no worker change was needed. `planChange(day, slot, fn)` fetches the
latest plan, applies the tap, saves, renders and PUTs — last write wins per edit, not per session.
Anyone can add, remove or toggle "Book it". `S.plan` values are `{id, by, booked}` (older bare-id
saves are upgraded on load). Names in the plan are slugs, mapped back via known names.

**Sync hardening (2026-08-30).** The strength test proved the whole-plan write loses edits: KV
hands a phone a copy up to a minute old, so two edits within that window kept only the later one,
and a phone back from a dead spot overwrote everything made meanwhile. Fixes, all in app.js:
- **Op-replay**: every tap is recorded (`S.ops`, persisted, ≤40) and re-applied on top of every
  server copy for 3 minutes — or, while unsent, indefinitely; if the server copy was missing one,
  it is pushed again. Lost updates now heal at the loser's next poll. Residual risk: the loser
  closes the tab within ~60 s of the clash AND never reopens - rare; a Durable Object would
  remove it (see "structural upgrade" below).
- **Hearts, two devices**: first successful pull takes the union of local + server for your own
  name (then pushes if local had more); after that the server wins for your name unless this
  phone wrote in the last 2 minutes (then it re-pushes). The blind push-on-load is gone.
- **Ghosts**: names absent from a `/picks` reply are dropped from `S.friends`/`S.fc` — the curl
  DELETE recipe and renames now actually propagate.
- **Names**: `cleanName()` everywhere a name enters (load, ?me=, welcome, who-sheet, input):
  NFC, invisible chars and lone surrogates stripped, no leading `_`/`.`, must contain a letter or
  digit. The who-sheet refuses a name another person is already hearting under (unless this
  phone has no hearts - that is the same person on a new phone) via `nameTaken()` + `#who-note`.
- `byId` is `Object.create(null)` ('constructor' is not a place); `tipMapUrl` try/catches
  encodeURIComponent (a lone surrogate in one tip used to kill renderTiles on every phone -
  hearts and taps silently stopped syncing while the note still said "Live"); the sync note says
  "Not updating since HH:MM" when quiet polls start failing; pulls have an in-flight guard;
  the 60 s poll skips while `document.hidden` (background tabs were eating the KV quota).
- **Structural upgrade, not done**: per-slot KV keys or a Durable Object would remove the race
  window entirely instead of healing it. Decide only if the group actually trips over it.
Tests: scratchpad `sync2.js` (16 checks: stale read-back re-assert, offline reconnect merge,
ghost removal, two-device union, `?me=_plan`), `cal2.js` (34 checks, calendar behaviour) and
`pending.js` (5 checks: an unnamed phone's calendar add parks the choice, asks via #who, then
commits under the new name - `pendingChoice` in app.js).
**Adversarially re-verified (2026-08-30 evening):** a fresh agent re-ran the original
concurrency scenario harness against the new build - all 13 data-loss scenarios heal (different
slots at the next poll; a same-slot conflict settles on one tap within ~3 min instead of losing
one silently; offline merges; ghosts drop; two-device hearts union). Only residue: phones whose
poll timers are in perfect lockstep during a sub-second burst - lab-grade, not real phones.
Harness copies: scratchpad `concurrency/*-new*`.
Matt's real hearts live under "Matt" in the store — never delete that entry when cleaning up tests.

## Calendar rebuild (2026-08-30)

Matt's ask: morning / day / afternoon / evening for things to do, breakfast / lunch / dinner for
food, "generic options first, then confirm a place once we get more votes".

- **Seven slots a day, in day order:** All day, Breakfast, Morning, Lunch, Afternoon, Dinner,
  Evening (`SLOTS` in app.js, each with `kind: 'eat' | 'do'`, coloured by `.slot.k-eat/.k-do`).
  Chronological rather than a food row and an events row - it reads like a day. `fullday` keeps
  its old store key under the "All day" label so existing entries still land.
- **All day folds Morning and Afternoon away** (and either of those hides All day). Meals and the
  evening are never blocked - a day in Sulmona still ends with dinner somewhere. Blocked rows are
  not rendered at all (`blocked()` + the early `return` in `renderCalendar`), not greyed out.
- **Rough ideas** (`GENERIC` in app.js): "Eat out", "Beach", "Day trip", "Pizza night at the
  house"... stored in the shared plan under `g-` ids, so they pass the worker's id rule and an
  older build keeps them verbatim as foreign entries. They are in `byId` but not in `PLACES`:
  no tile, no pin, no drive time, no heart. Each declares `pick` (which slots show it on the
  picker's quick strip) and, for the `tbc` ones, `confirm` (which section leads the confirm
  picker). The three "At the house" places sit on the same strip via `QUICK_PLACES`.
- **Confirm a place:** a filled `tbc` idea shows a "Confirm a place" button (`.cf`) instead of
  "Book it". It opens the same picker in `'confirm'` mode: no quick strip, sorted by hearts
  across the whole group first (`votes()`), then the idea's own section. Every picker row now
  shows its heart count. Choosing replaces the slot's id and credits whoever confirmed.
- **Forward compatibility:** `decodePlan` now keeps entries with an unknown *slot key* as
  foreign too, not just unknown ids - so the next redesign cannot be wiped by a phone on this one.
  Phones still on the 29-Aug build drop unknown slot keys on their next write; the risk window
  is one Pages cache (10 min) plus however long a tab stays open.
- Verified by `cal2.js` (scratchpad harness, 34 checks, jsdom against a fake worker): rendering,
  quick strips per slot, PUT bodies, foreign-entry preservation, fold-away, confirm ordering,
  offline reload of a rough idea, zero exceptions.

## Copy pass (2026-08-30, from the content review)

Applied: hero and Welcome no longer claim everything is "within an hour" (48 places are not);
one word for the act everywhere - hearts ("Yours \u2665" chip, "your hearts", "'s hearts",
"hearted this", aria Heart/Un-heart); welcome-modal step 3 teaches the rough-idea flow; band
chips say "Within 15 min" not "\u226415 min"; At-the-house entries say "at the house" instead
of "0 min" (tiles, place sheet, calendar, picker); the duplicate At-the-house category chip is
gone (build.py skips house cats); "Eating" catLabel is "Restaurants"; "Book it" is "Booked?";
one offline message family ("Saved on this phone - it will send itself when the connection is
back."); JS strings use em dashes like the HTML; last year's line-ups trimmed from the two
festival cards; calendar sunk note no longer repeats Things to know; an unnamed phone's first
calendar add asks for a name exactly as the first heart does.
Not done, deliberately left for Matt/later: splitting the 145-tile "Out and about" section (or
curating its chip order); rewriting the ~20 descriptions that open with logistics; the Tremiti
description cut. See the UX judge's list.

## Ergonomics pass (2026-08-30, from the mobile lens)

Applied: 44px thumb floor on .cta / .clear / .linkbtn / .addbtn / .rm / .q / .pick (swatches
40px on a 48px pitch); the calendar picker gained three exits (Cancel button, Escape, tap
outside - capture-phase listener attached a tick late so the opening tap cannot close it) and
scrolls itself into view; all four tabs fit a 390px phone (counts hidden, padding trimmed at
<=640px); .tdesc and #place-desc read at 17px on phones; #q gets enterkeyhint="search"; a fixed
"Search & filters" pill (#backfilters) appears 1800px deep in Activities and scrolls back to the
search row. Tests: scratchpad `exit.js` (7 checks). Recommended but NOT built (judge's list, for
Matt): bottom-sheet picker, flat one-list Popular sort, day-jump pills, "add to a day" from the
place sheet, sticky filter row.

## Design compliance pass (2026-08-26)

Map, welcome card, sheet, badges and calendar were checked against `.claude/skills/butterfly-cave-design`
and fixed: no `box-shadow` anywhere (rings are `outline`, elevation is paper-2 + `--line`), no literal
hex in markup or JS (person colours are `--who-1..7` tokens, chosen for 4.5:1 with peach initials;
the store carries the index `c-3`, never a hex), Leaflet controls restyled (Karla, paper surfaces,
44px zoom buttons, 12.5px attribution, popup as a paper card), CARTO light basemap with a sepia
wash so the tiles sit on the limestone ground, welcome list uses numerals not glyphs, "Booked"
is colour-carried (olive fill) with no tick mark. Keep it that way when adding UI.

## 2026-08-31 – review-fix pass (after the overnight rebuild)
- Adversarial review of the whole overnight diff found 7 confirmed issues; 6 fixed in ad91d8b, 1 accepted
  (two-letter badge collisions – impossible with this guest list).
- Key fixes: `planDirty` now persisted in S (offline calendar edits survive reloads and flush on
  backgrounding); a `/picks` response with no `_plan` key is no longer treated as an empty plan;
  worker never deletes an existing record on a full index and its migration no longer drops `_plan`;
  `cleanName` strips all unpaired surrogates on both sides (encodeURIComponent can't throw).
- Test state: 99 checks across five suites + reviewer harnesses (scratchpad `review2/`) + `t1fix.js`.
- Worker v2 (fixed) is in `worker/abruzzo-picks.js` @ ad91d8b — deploy = paste into the dashboard
  editor, or PUT to `/api/v4/accounts/<acct>/workers/scripts/abruzzo-picks/content` (multipart:
  `metadata` `{"main_module":"abruzzo-picks.js"}` + the file; cookie auth works from any
  dash.cloudflare.com page; preserves the PICKS binding). Deploy-day sanity check:
  `GET /picks/_plan` returns 405 on v1, 200 on v2.
