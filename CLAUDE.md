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
- **No people mechanism.** No names, no `ABZ1|` share codes, no cross-person tally. The heart is
  a personal shortlist in `localStorage` under `abruzzo-2026`. A real group tally needs a shared
  backend (Cloudflare KV or Supabase); it cannot work on localStorage.
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

- **No map.** The old build's schematic map had pins with no place identifier, not index-aligned
  with the cards (18/230 categories matched), so they could never respond to search. Bringing it
  back needs coordinates per record — geocode the `address` fields via OpenStreetMap (ODbL allows
  storing results; Google's terms do not).
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
- Mon 14 Sep — Lyndsey, Frances and Anthony arrive. The only direct London flight that day is
  FR 982 STN 17:15 → PSR 20:40 (assumed from the schedule, not confirmed from their bookings)
- Wed 16 Sep — Lyndsey's birthday
- Thu 17 Sep — Matt's birthday; Lauren arrives in the morning — FR 235 STN 06:25 → PSR 09:50 (assumed)
- Sun 20 Sep — everyone flies home. Matt is on FR 983 PSR 19:25 → STN 21:00; others assumed the same

All flights are Ryanair from Stansted. Booking references live in Gmail, not here (public repo).
Vero is on the group flight home on the 20th, then stays with Matt in London and flies on to
Berlin on the 22nd — the "leaving London 22nd" message is that, not an early departure from Italy.

Seven people in total. Matt's taste in restaurants: cheap, no-frills, fish-first locals' places
(Os Fialhos in the Algarve, Stasera Pago Io) — lean that way over set-menu trabocchi.
