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
exclusion), Activities (230 tiles split Eat & drink / Out and about), Things to know.

The 17 categories map to two groups: `trabocchi, pizza, food, wine, larder, bars` are
**Eat & drink** (86); the other eleven are **Out and about** (144).

## Decisions already made — do not re-litigate

- **No photographs.** Measured at 108 KB each, so 230 would be ~24 MB against a 173 KB page;
  every CC BY-SA image needs a visible credit; Commons has nothing for the pizzerie and forni
  that make up most of the list. `mapUrl` is the photo feature — it opens Google's own current
  photos at zero byte and zero licensing cost.
- **People mechanism = share links, no backend** (added 2026-08-25 because Frances asked to
  show her likes). "Share my picks" in Activities builds `#picks=Name:id,id,...`; opening such a
  link stores that person's hearts in `S.friends` (localStorage), adds a "Name ♥" chip beside
  Shortlisted, and initial badges on their tiles. Links are a snapshot — resend to update.
- **Live sync on top of that** (2026-08-25): `worker/abruzzo-picks.js` is a Cloudflare Worker +
  KV (`PICKS`). `SYNC` in app.js holds its URL; empty = links only. With it set, each heart PUTs
  `{ids}` under the person's name (debounced 800 ms) and everyone's hearts are pulled on load, on
  tab focus and every 60 s into `S.friends`. Forget = DELETE. No auth — the page is public, so
  a key would be public too; abuse ceiling is "someone scribbles on a trip list".
  **Deployed 2026-08-25** in Matt's Cloudflare account (mattnorthin@gmail.com): worker
  `abruzzo-picks` at `https://abruzzo-picks.mattnorthin.workers.dev`, KV namespace `abruzzo-picks`
  bound as `PICKS`. `worker/smoke.sh <url>` exercises it. KV listings lag writes by ~2 s.
  To update the worker code: dashboard → Workers & Pages → abruzzo-picks → Edit code → paste
  `worker/abruzzo-picks.js` → Deploy (the editor is a cross-origin frame; Claude's browser tools
  cannot type into it, so the paste is Matt's). To wipe all hearts: delete the KV namespace's keys.
  **Flow (2026-08-26):** first heart with no name opens a bottom sheet (`#who`, "Who's hearting?");
  the chip beside Show map reads "You're Matt · change" afterwards. "Tally" opens the list; the
  copy-link / WhatsApp-link controls (`#linkbox`) only appear when `SYNC` is empty or unreachable
  (`syncOk === false`). Polls every 30 s while the tab is visible.
  **Personal links (2026-08-26):** `?me=Frances` sets the name, strips itself from the URL and shows
  the welcome card ("Ciao, Frances") — Matt sends one per person, so nobody types a name. The
  welcome card (`#welcome`, page-level, outside the tab views) shows once per phone (`S.welcomed`)
  or again whenever a personal link with a different name is opened; with no name it asks for one.
  The map is permanent at the top of Activities (built on first show of that tab via `ensureMap`).
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

## Known gaps

- **Map (added 2026-08-25).** "Show map" in Activities loads Leaflet + OpenStreetMap tiles on
  demand (nothing loads until tapped) and pins whatever passes the current filters, coloured by
  category; hollow pin = town-centre fallback, black pin = the house. Coordinates come from
  `geocode.py` (Nominatim, 1 req/s, results stored in `places.json` as `lat`/`lon`/`geo`). Run it
  after adding places: `python3 geocode.py` only touches records without coordinates.
  `HOUSE` in app.js is the Rocca San Giovanni borgo, not the villa's door — Nominatim does not
  know the villa; correct it if Chiara gives a pin.
- **No opening days.** One Monday (14 Sep) and two Sundays (13, 20). The original shortlist schema
  had `closed` / `only` / `dates` / `tags` and this one lost them. Adding them back is worth more
  than twenty more places.
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
