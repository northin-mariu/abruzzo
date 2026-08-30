#!/usr/bin/env python3
"""Pull ratings, price, hours and Google's own blurb into places.json.

    python3 enrich.py --try 10     # sample: show what it would add, write nothing
    python3 enrich.py              # do the lot, only touching places with no google data
    python3 enrich.py --refresh    # re-pull everything (do this in the week before the trip)

The key is read from ~/.abruzzo-google-key and never enters this repo, which is public.
One Text Search call per place answers everything, so there is no second Details call.
"""
import json, subprocess, pathlib, sys, time, os

HERE = pathlib.Path(__file__).parent
KEYFILE = pathlib.Path.home() / '.abruzzo-google-key'
URL = 'https://places.googleapis.com/v1/places:searchText'
FIELDS = ('places.id,places.displayName,places.formattedAddress,places.rating,'
          'places.userRatingCount,places.priceLevel,places.regularOpeningHours,'
          'places.editorialSummary,places.nationalPhoneNumber,places.location')
# keep the search honest: bias hard to the Abruzzo coast and the Majella behind it
BIAS = {'rectangle': {'low': {'latitude': 41.4, 'longitude': 13.5},
                      'high': {'latitude': 42.9, 'longitude': 15.0}}}
PRICE = {'PRICE_LEVEL_FREE': 'Free', 'PRICE_LEVEL_INEXPENSIVE': '€',
         'PRICE_LEVEL_MODERATE': '€€', 'PRICE_LEVEL_EXPENSIVE': '€€€',
         'PRICE_LEVEL_VERY_EXPENSIVE': '€€€€'}

def key():
    if not KEYFILE.exists():
        sys.exit('No key. Put your Google API key in %s (one line, nothing else).' % KEYFILE)
    k = KEYFILE.read_text().strip()
    if not k:
        sys.exit('%s is empty.' % KEYFILE)
    return k

def lookup(k, place):
    body = json.dumps({'textQuery': '%s, %s, Abruzzo, Italy' % (place['name'], place['town']),
                       'locationBias': BIAS, 'maxResultCount': 1, 'languageCode': 'en'})
    r = subprocess.run(['curl', '-s', '-m', '25', '-X', 'POST', URL,
                        '-H', 'Content-Type: application/json',
                        '-H', 'X-Goog-Api-Key: ' + k,
                        '-H', 'X-Goog-FieldMask: ' + FIELDS,
                        '-d', body], capture_output=True, text=True)
    try:
        d = json.loads(r.stdout)
    except Exception:
        return None, r.stdout[:200]
    if 'error' in d:
        return None, d['error'].get('message', 'error')
    ps = d.get('places') or []
    return (ps[0] if ps else None), None

def shape(g):
    """Only the parts we would actually put on a card."""
    out = {'id': g.get('id'), 'name': (g.get('displayName') or {}).get('text')}
    if g.get('rating'):
        out['rating'] = round(g['rating'], 1)
        out['reviews'] = g.get('userRatingCount')
    if g.get('priceLevel'):
        out['price'] = PRICE.get(g['priceLevel'], '')
    if g.get('editorialSummary'):
        out['blurb'] = (g['editorialSummary'] or {}).get('text')
    if g.get('nationalPhoneNumber'):
        out['phone'] = g['nationalPhoneNumber']
    oh = g.get('regularOpeningHours') or {}
    if oh.get('weekdayDescriptions'):
        out['hours'] = oh['weekdayDescriptions']
    out['pulled'] = time.strftime('%Y-%m-%d')
    return out

def main():
    args = sys.argv[1:]
    sample = 0
    if '--try' in args:
        sample = int(args[args.index('--try') + 1])
    refresh = '--refresh' in args
    k = key()
    places = json.loads((HERE / 'places.json').read_text(encoding='utf-8'))
    todo = [p for p in places if refresh or not p.get('google')]
    if sample:
        todo = todo[:sample]
    print('looking up %d of %d places\n' % (len(todo), len(places)))
    got = rated = houred = blurbed = 0
    for i, p in enumerate(todo, 1):
        g, err = lookup(k, p)
        if err:
            print('  !! %-34s %s' % (p['name'][:34], err))
            if 'API key' in str(err) or 'PERMISSION' in str(err).upper():
                sys.exit('Stopping: the key is not working for the Places API yet.')
            continue
        if not g:
            print('  -- %-34s no match' % p['name'][:34])
            continue
        s = shape(g)
        got += 1
        rated += 'rating' in s
        houred += 'hours' in s
        blurbed += 'blurb' in s
        print('  ok %-34s %-28s %s %s %s' % (
            p['name'][:34], (s['name'] or '')[:28],
            ('%.1f*%s' % (s['rating'], s.get('reviews', '?'))) if 'rating' in s else '   -   ',
            s.get('price', '  '), 'hours' if 'hours' in s else ''))
        if not sample:
            p['google'] = s
        time.sleep(0.12)
    print('\nmatched %d/%d  ·  with a rating %d  ·  with hours %d  ·  with a blurb %d'
          % (got, len(todo), rated, houred, blurbed))
    if sample:
        print('\n(sample run: places.json untouched)')
        return
    (HERE / 'places.json').write_text(json.dumps(places, ensure_ascii=False, indent=1) + '\n',
                                      encoding='utf-8')
    print('places.json updated - now run: python3 build.py')

main()
