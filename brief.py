#!/usr/bin/env python3
"""Trip data pull: live plan + hearts vs places.json -> a factual digest for the briefing.

    python3 brief.py                  # the full briefing digest
    python3 brief.py find 14 dinner   # everything open that day matching those words

Runs anywhere: it reads the shared worker over HTTPS and places.json next to itself.
The /supremo skill on Matt's Mac is the same script; this copy is the one a cloud
agent clones. Keep them in step.
"""
import json, re, subprocess, pathlib, datetime, sys

WORKER = 'https://abruzzo-picks.mattnorthin.workers.dev/picks'
# repo-relative so this runs the same on Matt's Mac and in a cloud agent's checkout
PLACES = pathlib.Path(__file__).resolve().parent / 'places.json'
# the cloud keeps no filesystem between runs, so the "new since last brief" diff is local-only
STATE = pathlib.Path.home() / '.claude/skills/supremo/state.json'
GUESTS = ['Matt', 'Sam', 'Lauren', 'Lyndsey', 'Anthony', 'Frances', 'Vero']
DAYS = list(range(11, 21))  # 11-20 Sept 2026
DOW = {11:'Fri',12:'Sat',13:'Sun',14:'Mon',15:'Tue',16:'Wed',17:'Thu',18:'Fri',19:'Sat',20:'Sun'}
SLOTS = ['fullday','breakfast','morning','lunch','afternoon','dinner','evening']
MEALS = {'breakfast','lunch','dinner'}
AWKWARD = {13:'Sunday - shops/markets shut', 14:'the only Monday - museums shut', 20:'Sunday + departure day'}
FIXED = {11:'arrivals', 19:'festa opens + antiques market + Sulmona day candidate', 20:'antiques market day 2'}

raw = subprocess.run(['curl','-s','--max-time','15',WORKER], capture_output=True, text=True).stdout
data = json.loads(raw)
places = {p['id']: p for p in json.load(open(PLACES))}

plan = {}
for s in (data.get('_plan') or []):
    m = re.match(r'^d(\d{1,2})--([a-z]+)--([a-z0-9-]+?)--([a-z0-9-]+)--b([01])$', s)
    if m: plan.setdefault(int(m.group(1)), {})[m.group(2)] = {'id': m.group(3), 'by': m.group(4), 'booked': m.group(5)=='1'}


def label(pid):
    if pid in places: return places[pid]['name']
    if pid.startswith('x-'): return pid[2:].replace('-',' ').capitalize() + ' (note)'
    return pid

def phone(pid):
    p = places.get(pid)
    if not p: return None
    m = re.findall(r'(?:\+39 )?(?:0|3)[\d ]{7,14}\d', p.get('desc','') or '')
    if m: return m[0].strip()
    return (p.get('google') or {}).get('phone')

# --- ask mode: `supremo.py find [day] words...` -------------------------------------------
# "13 beach bar jazz swim" -> everything on the site that fits, with that day's Google hours,
# so the answer is places that are actually open, not a list of what exists.
DAYNAMES = {'fri':11,'sat':12,'sun':13,'mon':14,'tue':15,'wed':16,'thu':17,'friday':18,'saturday':19,'sunday':20}
WEEKDAY = {11:'Friday',12:'Saturday',13:'Sunday',14:'Monday',15:'Tuesday',16:'Wednesday',17:'Thursday',18:'Friday',19:'Saturday',20:'Sunday'}
SYN = {  # what people say -> what the data says
  'beach': ['beachbar','beach','lido','spiaggia'], 'swim': ['beach','beachbar','pool','lido','spiaggia','kayak'],
  'bar': ['bars','beachbar','aperitivo','cocktail'], 'drink': ['bars','beachbar','wine','distill','aperitivo'],
  'music': ['music','jazz','dj','live','concert','festival','band'], 'jazz': ['jazz','music','live'],
  'dj': ['dj','music','club'], 'party': ['dj','club','festa','festival'],
  'dinner': ['food','trabocchi','pizza'], 'lunch': ['food','trabocchi','pizza','beachbar'], 'eat': ['food','trabocchi','pizza'],
  'fish': ['trabocchi','pescheria','frittura','seafood','fish'], 'pizza': ['pizza'], 'gelato': ['gelato','ice cream'],
  'wine': ['wine','cantina','winery','enoteca'], 'winery': ['wine'], 'distillery': ['distill'], 'amaro': ['distill','liquori'],
  'market': ['shops','market','mercato'], 'antiques': ['antiques','antiquariato','usato'], 'secondhand': ['shops','usato','vintage','secondhand'],
  'vintage': ['vintage','usato','secondhand'], 'shop': ['shops','larder'], 'linen': ['market','linen'],
  'spa': ['spa','rainy','sauna'], 'rain': ['rainy','museum','museo','spa'], 'museum': ['museo','museum','rainy'],
  'walk': ['sights','ruins','trips','hike','sentiero'], 'hike': ['hike','sentiero','trips','majella'], 'boat': ['boat','kayak','barca','gommone'],
  'bike': ['bikes','bike','bici','via verde'], 'kids': ['beach','gelato','pool'], 'class': ['handson','corso','class'],
  'sunset': ['sunset','aperitivo','tramonto','beachbar','trabocchi'], 'cheap': ['cheap','€5','self-service','humble'],
}
def _norm(t):
    import unicodedata
    return unicodedata.normalize('NFKD', t or '').encode('ascii','ignore').decode().lower()
if len(sys.argv) > 1 and sys.argv[1] == 'find':
    args = [a.lower().strip(',') for a in sys.argv[2:]]
    day = None
    for a in list(args):
        if a.isdigit() and 11 <= int(a) <= 20: day = int(a); args.remove(a); break
        if a in DAYNAMES: day = DAYNAMES[a]; args.remove(a); break
    if day is None:
        t = datetime.date.today(); day = t.day if (t.month == 9 and 11 <= t.day <= 20) else 12
    words = [w for w in args if len(w) > 2]
    terms = set()
    for w in words:
        terms.add(w); terms.update(SYN.get(w.rstrip('s'), [])); terms.update(SYN.get(w, []))
    print(f"=== FIND: day {day} ({WEEKDAY[day]} {day} Sept) · asked: {' '.join(words) or '(anything)'} ===")
    e = plan.get(day, {}) if 'plan' in globals() else {}
    hits = []
    for p in places.values():
        blob = _norm(' '.join([p['name'], p.get('desc',''), p.get('cat',''), p.get('catLabel',''), p.get('flag') or '', p.get('town','')]))
        score = sum(1 for t in terms if _norm(t) in blob)
        direct = sum(1 for w in words if _norm(w) in blob)
        if score: hits.append((direct, score, -p['mins'], p))
    hits.sort(key=lambda h: (-(h[0] > 0), -min(h[1], 3), -h[2]))
    for direct, score, _, p in hits[:18]:
        g = p.get('google') or {}
        hrs = [h for h in g.get('hours', []) if h.startswith(WEEKDAY[day])]
        today = hrs[0].split(':',1)[1].strip() if hrs else ('no hours on Google' if g else 'not on Google')
        rate = f"{g['rating']}*{g.get('reviews','?')}" if g.get('rating') else '-'
        print(f"{p['mins']:3}min  {p['name'][:34]:34} {p.get('town','')[:18]:18} {p['cat']:9} {rate:9} {WEEKDAY[day][:3]}: {today:34} tel {g.get('phone') or phone(p['id']) or '-'}")
        print(f"       {p.get('flag') or ''}{' - ' if p.get('flag') else ''}{(p.get('desc') or '')[:150]}")
    if not hits: print('  nothing on the site matches those words - widen it, or this is an events-site question')
    print(f"\nawkward: {AWKWARD.get(day,'-')} | fixed: {FIXED.get(day,'-')}")
    sys.exit(0)


print('=== COUNTDOWN ===')
today = datetime.date.today()
print('today', today.isoformat(), '| trip starts 2026-09-11 in', (datetime.date(2026,9,11)-today).days, 'days | ends 2026-09-20')

print('\n=== PLAN, DAY BY DAY (11-20 Sept) ===')
for d in DAYS:
    e = plan.get(d, {})
    parts = []
    for k in SLOTS:
        if k in e:
            x = e[k]
            parts.append(f"{k}: {label(x['id'])}" + (' [BOOKED]' if x['booked'] else '') + f" ({x['by']})")
    note = AWKWARD.get(d,''); fx = FIXED.get(d,'')
    extra = ' | '.join(v for v in (note, fx) if v)
    print(f"d{d} {DOW[d]}: " + ('; '.join(parts) if parts else 'EMPTY') + (f"   << {extra}" if extra else ''))

print('\n=== NEEDS A BOOKING CALL (real places, not booked) ===')
none = True
for d in DAYS:
    for k, x in (plan.get(d) or {}).items():
        p = places.get(x['id'])
        BOOK = {'food','pizza','trabocchi','handson','adrenaline','distill'}
        if p and p.get('cat') in BOOK and not x['booked']:
            none = False
            ph = phone(x['id'])
            print(f"d{d} {DOW[d]} {k}: {label(x['id'])}" + (f" - {ph}" if ph else ' - no phone on card'))
if none: print('(nothing awaiting a call)')

print('\n=== ROUGH IDEAS AWAITING "CONFIRM A PLACE" ===')
none = True
for d in DAYS:
    for k, x in (plan.get(d) or {}).items():
        p = places.get(x['id'])
        if p and p.get('generic') and p.get('tbc'):
            none = False
            print(f"d{d} {DOW[d]} {k}: {label(x['id'])} - {p['tbc']}")
if none: print('(none open)')

print('\n=== HEARTS ===')
old = {}
if STATE.exists():
    try: old = json.load(open(STATE))
    except Exception: old = {}
snap = {}
for name, ids in data.items():
    if name.startswith('_') or not isinstance(ids, list): continue
    hearts = [i for i in ids if not str(i).startswith('c-')]
    snap[name] = sorted(hearts)
    fresh = [i for i in hearts if i not in set((old.get(name) or []))]
    line = f"{name}: {len(hearts)} hearts"
    if name in old and fresh:
        line += ' | NEW since last brief: ' + ', '.join(label(i) for i in fresh[:8])
    elif name not in old:
        line += ' | first time seen by supremo'
    print(line)
missing = [g for g in GUESTS if g.lower() not in {n.lower() for n in snap}]
print('still to heart anything:', ', '.join(missing) if missing else 'nobody - all 7 in')

print('\n=== MOST-LOVED, NOT YET IN THE PLAN ===')
from collections import Counter
c = Counter()
for name, ids in snap.items():
    for i in ids: c[i] += 1
in_plan = {x['id'] for e in plan.values() for x in e.values()}
top = [(i,n) for i,n in c.most_common(12) if i not in in_plan and i in places][:6]
for i, n in top: print(f"{n}x {label(i)} ({places[i]['catLabel']}, {places[i]['mins']} min)")

STATE.write_text(json.dumps(snap, indent=1))
print('\n(snapshot updated - next run diffs against today)')
