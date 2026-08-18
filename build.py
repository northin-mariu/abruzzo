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
KEEP = ('id', 'name', 'town', 'cat', 'catLabel', 'mins', 'desc', 'flag', 'website', 'mapUrl')
data = []
for p in places:
    r = {k: p.get(k) for k in KEEP}
    r['group'] = 'eat' if p['cat'] in EAT else 'do'
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
        c=c, col=('var(--eat-deep)' if m['group'] == 'eat' else 'var(--do-deep)'),
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
leftover = sorted({ch for ch in doc if ord(ch) > 127})
print('  non-ascii in output:', leftover or 'none')
