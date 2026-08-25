#!/usr/bin/env python3
"""Add lat/lon to every record in places.json, via OpenStreetMap Nominatim.

    python3 geocode.py            # only records without coordinates
    python3 geocode.py --redo ID  # re-geocode one record

Respects Nominatim's 1 request/second policy, so ~4 minutes for 250 places.
Each record gets `lat`, `lon` and `geo`:
  exact  - found from the full address
  name   - found from "name, town"
  town   - fell back to the town centre (pin is approximate)
ODbL allows storing the results. Saves after every hit, so it can be interrupted.
"""
import json, sys, time, urllib.parse, subprocess, pathlib

HERE = pathlib.Path(__file__).parent
PATH = HERE / 'places.json'
UA = 'abruzzo-trip-site/1.0 (mattnorthin@gmail.com)'
# Bounding box around the coast between Pescara and Vasto + the Majella, to reject far-off hits.
VIEWBOX = '13.6,42.6,14.9,41.9'

def query(q, bounded=True):
    url = ('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it'
           + ('&viewbox=%s&bounded=1' % VIEWBOX if bounded else '')
           + '&q=' + urllib.parse.quote(q))
    # curl rather than urllib: python.org builds on macOS often lack root certificates.
    try:
        out = subprocess.run(['curl', '-s', '-m', '20', '-A', UA, url],
                             capture_output=True, text=True, timeout=25).stdout
        res = json.loads(out) if out.strip() else []
    except Exception as e:
        print('   ! %s' % e)
        res = []
    time.sleep(1.1)
    if res:
        return float(res[0]['lat']), float(res[0]['lon'])
    return None

def attempts(p):
    addr = p.get('address') or ''
    name = p['name']
    town = p['town']
    street = addr.split(',')[0].strip() if addr else ''
    yield 'exact', addr
    yield 'exact', '%s, %s, Italy' % (street, town) if street and street.lower() != name.lower() else ''
    yield 'name', '%s, %s, Italy' % (name, town)
    yield 'name', '%s, Abruzzo, Italy' % name
    yield 'town', '%s, Abruzzo, Italy' % town

def main():
    places = json.loads(PATH.read_text(encoding='utf-8'))
    redo = sys.argv[2] if len(sys.argv) > 2 and sys.argv[1] == '--redo' else None
    todo = [p for p in places if (redo and p['id'] == redo) or (not redo and 'lat' not in p)]
    print('%d to geocode' % len(todo))
    for i, p in enumerate(todo, 1):
        print('%3d/%d %s (%s)' % (i, len(todo), p['name'], p['town']))
        for kind, q in attempts(p):
            if not q:
                continue
            # inside the coastal box first; the far-flung day trips need the whole of Italy
            hit = query(q) or query(q, bounded=False)
            if hit:
                p['lat'], p['lon'], p['geo'] = round(hit[0], 5), round(hit[1], 5), kind
                print('   %s  %.4f, %.4f  via "%s"' % (kind, hit[0], hit[1], q))
                break
        else:
            print('   ! nothing found, even for the town')
        PATH.write_text(json.dumps(places, ensure_ascii=False, indent=1), encoding='utf-8')
    from collections import Counter
    print('done:', dict(Counter(p.get('geo', 'none') for p in places)))

if __name__ == '__main__':
    main()
