# Butterfly Cave — design system

The design layer for the Abruzzo / Pescara trip artifacts: a long-form guide to everything
within reach of one house on the Costa dei Trabocchi, and a planner the group uses to argue
about it. "Butterfly Cave" is the house itself — Villa Grotta delle Farfalle, Rocca San
Giovanni (CH), 11–20 September 2026.

There is no company here and no logo. There is a house, a pool, ten days, and about 230 places
within an hour's drive. The system exists so every artifact looks like it came from the same
afternoon.

## Authoritative source

**This directory is a working subset.** The full system lives in the Claude design project
`019dd9ea-6bea-7da7-9327-7907bb2134c7` ("Design System") and is the source of truth. It holds
things deliberately *not* copied here, because duplicating them is how they go stale:

| Only in the design project | What it is |
|---|---|
| `components/` | 20 components in core / forms / content / layout, each with a `.d.ts` props contract and a `.prompt.md` usage note |
| `guidelines/` | 26 specimen cards — colour, type, spacing, brand |
| `ui_kits/guide/`, `ui_kits/shortlist/` | Working recreations, incl. `data.js` with the category→ramp mapping |
| `fonts/Italiana-Regular.ttf` | The brand face binary |
| `assets/` | The four native icons, the wave divider, the house photograph, the reference boards |

Read those from the project when you need them. What *is* here: the seven token files and the
rules below, because those get applied on every single task.

## Ground rules

**Colour.** Flat, opaque, unmixed — gouache, not gradient. **No gradient anywhere.** Two
background tones maximum: `--paper` for the page, `--shade` for a sunk band. Raised things go
*lighter*: `--paper-2`. Brand colours come off the house photograph — `--stucco` the wall,
`--terracotta` the pantiles, `--pool` the water.

**Colour carries state; a badge never does.** A selected chip fills with its own hue. There is
no "Selected" pill anywhere, and there never will be.

**Category ramp.** Eight tokens, `--cat-coral · teal · lime · cobalt · ochre · terracotta ·
fig · sky`. The 17 real categories map onto those eight — `ui_kits/guide/data.js` is that
mapping. **Never a literal hex in markup.**

**Type.** Two families. **Italiana** carries every heading; one weight, never faked bold, never
faked italic, 20px practical floor. **Karla** carries all body, meta and control copy. Six
sizes: 12.5 / 14.5 / 17 / 20 / 26 / 30, plus `clamp(38px, 7.4vw, 74px)` for a page title.
**12.5px is a hard floor.** Body line-height 1.55. Headings sit at weight 400 — never bolded.
Numbers use `tabular-nums` wherever they align.

**Spacing is `gap` only.** No margins between siblings, anywhere. Scale 4 · 7 · 11 · 16 · 20 ·
26 · 34 · 46 · 64. Card padding is exactly `19px 20px 17px`.

**Layout.** 1180px shell, 640px reading column, 20px gutter, centred. Grids are
`repeat(auto-fill, minmax(305px, 1fr))` with a 16px gap. Hit targets 44px minimum.

**Borders and radii.** Every border 1px `--line`. Three radii: 12px cards and panels, 8px
controls and inputs, 999px pills.

**Shadows: none. Ever.** Elevation is `--paper-2` against `--paper` plus a border.

**Animation.** 0.15s for colour on controls, 0.18s for a card, easing `cubic-bezier(.2,.6,.3,1)`.
The only movement is a 3px hover lift. `prefers-reduced-motion` zeroes it.

**No emoji, ever.** Where a bare mark is wanted: **♥ ★ ☆ × ↗**, and **·** as a meta separator.

**Voice.** A well-informed friend who has already done the phoning around. Sentence case
everywhere — never title case. Headings are claims, not labels. Every entry states the fact and
the catch in the same breath. Numbers specific and unrounded. Italian stays Italian, correctly
accented: trabocco, brodetto, borgo, vendemmia, Vallevò.

## Two themes

Default is the sun-bleached one. `tokens/theme-graphic.css` is an opt-in second theme —
`<body data-theme="graphic">` — that changes **colour and edge only**: radii to 0, borders to
2px, rules to navy ink, plus `--surface-field` for a full-bleed cobalt block. Fonts, type scale,
spacing, layout caps and the no-shadow rule are untouched.

## Single-file builds

Italiana is self-hosted and Karla is on the Google CDN. Where a build must be one
self-contained file with no external requests — an artifact, a forwardable page —
use `--font-serif-system` and `--font-sans-system`. That is the sanctioned path, not a fallback.

## Measured contrast — use these, don't re-derive them

Peach `#F9DFD2` or cream `#FAF3E5` on a saturated fill. A 12.5px bold label counts as **normal**
text and needs 4.5:1; type at 24px and up needs 3.0:1.

| Fill | vs cream | 12.5px label | 24px+ display |
|---|---|---|---|
| cobalt `#1E4FD8` | **6.01** | pass | pass |
| fig `#8D3B5E` | 6.51 | pass | pass |
| terracotta deep2 `#8E3B1A` | 6.81 | pass | pass |
| teal deep2 `#1B655F` | 6.19 | pass | pass |
| terracotta deep `#A6461F` | 5.41 | pass | pass |
| blood `#D6321E` | 4.39 | **fail** | pass |
| pool `#2A7FB0` | 3.99 | **fail** | pass |
| magenta `#E5308C` | 3.70 | **fail** | pass |
| aperol `#EE4E1E` | 3.31 | **fail** | pass |
| spritz `#F2792B` | 2.52 | **fail** | **fail** |
| apricot `#F9B98A` | 1.54 | **fail** | **fail** |

Consequences worth knowing:
- Base `--cat-terracotta #C0552F` with peach is only **3.60** — use `--eat-deep #A6461F` for any
  small label on terracotta.
- **Cobalt is the only ground where body copy also passes.** On every other saturated ground,
  headings may sit on the colour but body copy belongs on a `--paper-2` block.
- White is *not* a fix: on aperol, white is 3.66 against cream's 3.31. Both fail. "Cream, never
  white" costs nothing in contrast.
- On light grounds (apricot, spritz, cream) use `--ink`, not cream.

## `painted-bg` — the hand-painted background element

A self-contained custom element (in the "Hand painted butterfly background" project,
`8c7d4e9d-2ad1-42d8-a1e8-5e40846e2de1`). Marks are generated from a seed, so the same
attributes always paint the same page.

```html
<section style="position:relative">
  <painted-bg ground="cobalt" palette="aperol" layout="scatter" count="11" seed="7711"
              style="position:absolute; inset:0; z-index:0"></painted-bg>
  <div style="position:relative; z-index:1">…</div>
</section>
```

`ground` aperol · spritz · apricot · blood · cream · paper · shade · white · cobalt · magenta
(the element's internal map also has pool, fig, terracotta, teal, lime, violet, lemon and more).
`palette` aperol · citrus · cream-on-orange · two-colour · zing. `layout` scatter · edges ·
band · corner · diagonal · giant · confetti. Plus `count`, `seed`, `scale`, `rows`.

**The trap.** The viewBox is `1920 × 1080·rows` with `preserveAspectRatio="xMidYMid slice"`, so a
short wide box only ever shows the **middle horizontal strip**. `layout="band"` puts its marks
off the top, and in a ~150px banner they crop out entirely — you get a flat colour block and no
error. For short banners use `confetti`, `giant` or `diagonal`. Verify by counting how many paths
actually intersect the element's box, not by trusting the layout name.

For a very tall section, prefer `position:fixed` over `absolute`: stretching the viewBox over a
30,000px grid either scales the marks absurdly or needs hundreds of generated paths.

## Where this system is in production

`northin-mariu/abruzzo` → https://northin-mariu.github.io/abruzzo/ — built from `places.json`
by `build.py`. Four tabs, 230 places, colour-field tiles on a painted cobalt field.
