#!/usr/bin/env python3
"""Build index.html from places.json.

    python3 build.py

Everything the page shows comes from places.json. Edit that file, re-run this,
commit both. No dependencies beyond the standard library.
"""
import json, re, html, pathlib

HERE = pathlib.Path(__file__).parent
places = json.loads((HERE / 'places.json').read_text(encoding='utf-8'))

# Two groups; the 17 original categories stay as the band label.
EAT = {'trabocchi', 'pizza', 'gelato', 'food', 'wine', 'larder', 'bars'}
# Each category keeps its own hue, darkened until cream type clears 4.5:1 on it.
# Source hues live in places.json's `colour`; change one there and the fill follows.
def _hx(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
def _lum(rgb):
    c = [(v / 12.92 if v <= .03928 else ((v + .055) / 1.055) ** 2.4) for v in rgb]
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]
def _cr(a, b):
    la, lb = _lum(a), _lum(b); return (max(la, lb) + .05) / (min(la, lb) + .05)
def deepen(hexcol, target=4.7):
    """Darken a hue until cream type reads on it. Unchanged if it already does."""
    import colorsys
    cream = _hx('#FAF3E5')
    r, g, b = _hx(hexcol)
    if _cr((r, g, b), cream) >= target:
        return hexcol.upper()
    h, l, sat = colorsys.rgb_to_hls(r, g, b)
    while l > 0.02:
        l -= 0.005
        rgb = colorsys.hls_to_rgb(h, l, min(1.0, sat * 1.06))
        if _cr(rgb, cream) >= target:
            return '#%02X%02X%02X' % tuple(round(v * 255) for v in rgb)
    return '#241E1A'

KEEP = ('id', 'name', 'town', 'cat', 'catLabel', 'mins', 'desc', 'flag', 'website', 'mapUrl')
data = []
FILL = {}
for p in places:
    if p['cat'] not in FILL and p.get('colour'):
        FILL[p['cat']] = deepen(p['colour'])
for p in places:
    r = {k: p.get(k) for k in KEEP}
    r['group'] = 'eat' if p['cat'] in EAT else 'do'
    r['fill'] = FILL.get(p['cat'], '#8E3B1A')
    data.append(r)
data.sort(key=lambda r: (r['group'] != 'eat', r['mins']))

cats = {}
for r in data:
    c = cats.setdefault(r['cat'], {'label': r['catLabel'], 'group': r['group'], 'n': 0})
    c['n'] += 1
n_eat = sum(1 for r in data if r['group'] == 'eat')
n_do = len(data) - n_eat
n15 = sum(1 for r in data if r['mins'] <= 15)
n30 = sum(1 for r in data if r['mins'] <= 30)
towns = len({r['town'] for r in data})

PAINTED_BG = (HERE / 'painted-bg.js').read_text(encoding='utf-8')
CSS = (HERE / 'site.css').read_text(encoding='utf-8')
APP = (HERE / 'app.js').read_text(encoding='utf-8')
BODY = (HERE / 'body.html').read_text(encoding='utf-8')

chips = ''.join(
    '<button class="chip" type="button" aria-pressed="false" data-cat="{c}" style="--c:{col}">'
    '<span class="dot"></span>{l} <em>{n}</em></button>'.format(
        c=c, col=FILL.get(c, '#8E3B1A'),
        l=html.escape(m['label']), n=m['n'])
    for c, m in sorted(cats.items(), key=lambda kv: (kv[1]['group'] != 'eat', kv[0])))

page = BODY
for key, val in [
    ('{{CHIPS}}', chips),
    ('{{TOTAL}}', str(len(data))),
    ('{{N_EAT}}', str(n_eat)),
    ('{{N_DO}}', str(n_do)),
    ('{{N15}}', str(n15)),
    ('{{N30}}', str(n30)),
    ('{{TOWNS}}', str(towns)),
]:
    page = page.replace(key, val)

doc = ('<!doctype html>\n<html lang="en">\n<head>\n'
       '<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
       '<title>Ten days out of Rocca San Giovanni</title>\n'
       '<meta name="description" content="Everything within reach of Butterfly Cave, '
       '11-20 September 2026. {n} places, {t} towns.">\n'
       '<style>\n{css}\n</style>\n</head>\n<body>\n{body}\n'
       '<script>\n{pbg}\n</script>\n'
       '<script>\nvar PLACES = {json};\n{app}\n</script>\n'
       '</body>\n</html>\n').format(
    n=len(data), t=towns, css=CSS, body=page, pbg=PAINTED_BG,
    json=json.dumps(data, ensure_ascii=True, separators=(',', ':')), app=APP)

# Nothing may depend on a charset header: CSS ascii-only, JS \u-escaped, HTML entities.
sm = re.search(r'<style>\n(.*?)\n</style>', doc, re.S)
style_ascii = ''.join(ch for ch in sm.group(1) if ord(ch) < 128)
doc = doc[:sm.start(1)] + '@@STYLE@@' + doc[sm.end(1):]
scripts = []
def stash(m):
    scripts.append(''.join(ch if ord(ch) < 128 else '\\u%04x' % ord(ch) for ch in m.group(1)))
    return '<script>\n@@SCRIPT%d@@\n</script>' % (len(scripts) - 1)
doc = re.sub(r'<script>\n(.*?)\n</script>', stash, doc, flags=re.S)
doc = ''.join(ch if ord(ch) < 128 else '&#x%x;' % ord(ch) for ch in doc)
doc = doc.replace('@@STYLE@@', style_ascii)
for i, s in enumerate(scripts):
    doc = doc.replace('@@SCRIPT%d@@' % i, s)

out = HERE / 'index.html'
out.write_text(doc, encoding='utf-8')
print('built %s  %d KB' % (out.name, len(doc.encode()) // 1024))
print('  %d places  (%d eat / %d out and about)  %d towns  %d categories'
      % (len(data), n_eat, n_do, towns, len(cats)))
print('  within 15 min: %d   within 30 min: %d' % (n15, n30))
print('  fills: ' + ' '.join('%s=%s' % (k, v) for k, v in sorted(FILL.items())))
leftover = sorted({ch for ch in doc if ord(ch) > 127})
print('  non-ascii in output:', leftover or 'none')
