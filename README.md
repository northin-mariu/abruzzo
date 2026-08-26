# Ten days out of Rocca San Giovanni

Everything within an hour of Butterfly Cave (Villa Grotta delle Farfalle, Rocca San Giovanni),
11–20 September 2026. **230 places across 86 towns.**

**Live:** https://northin-mariu.github.io/abruzzo/

Four sections: Welcome, a Calendar you fill in, Activities, and Things to know. Shortlisting and
your plan are saved in your own browser — no accounts, no codes, nothing shared. Everyone opens
the same link and keeps their own list.

## Adding or changing a place

Everything on the page comes from `places.json`. Edit that, rebuild, commit both files:

```bash
python3 build.py
```

No dependencies beyond the Python standard library. One record looks like this:

```json
{
 "id": "trabocco-turchino",
 "name": "Trabocco Turchino",
 "town": "San Vito Chietino",
 "cat": "trabocchi",
 "catLabel": "Trabocchi",
 "mins": 9,
 "desc": "On stilts over the water. One sitting at lunch...",
 "flag": "Reservation only",
 "address": "Trabocco Turchino, San Vito Chietino CH, Italy",
 "website": "https://...",
 "colour": "#F2A65A",
 "mapUrl": "https://www.google.com/maps/search/?api=1&query=..."
}
```

- `id` must be unique and lowercase-with-hyphens.
- `cat` is one of the 17 existing categories; `catLabel` is how it reads on the tile.
- `mins` is straight-line drive time from the house, not road distance.
- `flag` is optional — a short editorial note like "Phone first" or "Reservation only".
- `mapUrl` is what the tile links to. Copy the pattern from a neighbouring record.
- The build sorts by drive time and splits into two groups: `trabocchi, pizza, food, wine,
  larder, bars` are **Eat & drink**; the other eleven categories are **Out and about**.

## Files

| File | What it is |
|---|---|
| `places.json` | **The source of truth.** The only file you normally edit. |
| `build.py` | Reads `places.json` + the three source files, writes `index.html`. |
| `body.html` | Page structure and all the hand-written copy. |
| `site.css` | The Butterfly Cave design system, inlined as tokens. |
| `app.js` | Tabs, filters, shortlist, calendar. |
| `painted-bg.js` | The generative painted background element used in the hero. |
| `index.html` | **Built output.** Committed because GitHub Pages serves it. Do not hand-edit. |

`index.html` is generated. Any change made directly to it is lost on the next build.

## Known gaps

- **Map pins need coordinates.** After adding a place, run `python3 geocode.py` — it looks up
  any record without `lat`/`lon` on OpenStreetMap and saves the result. Then rebuild.
- **No opening days.** With one Monday (14 Sep) and two Sundays (13 and 20 Sep), knowing what is
  actually open matters. Adding `closed` / `only` / `tags` fields to each record would let the
  Calendar answer it.
- **No group voting.** Deliberate — it needs a shared backend, and copy-paste codes were removed.

## Shared hearts (live sync)

`worker/abruzzo-picks.js` is a Cloudflare Worker that keeps everyone's hearts in one place.
It is deployed; its URL is in `SYNC` near the bottom of `app.js`. Each person opens a personal
link (`?me=Name`) once, then every heart is saved under that name and shows for everyone —
initials on the cards, the "Popular" chip, rings on the map pins. With `SYNC` empty, hearts
stay on the phone that made them.

## Auto-rebuild

Not set up: adding `.github/workflows/` needs a token with the `workflow` scope. To enable it,
run `gh auth refresh -s workflow`, or add the workflow through the GitHub web UI. Until then,
run `python3 build.py` before committing.
