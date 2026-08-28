#!/usr/bin/env python3
"""What the group has hearted, most loved first.

    python3 popular.py            # everything with at least one heart
    python3 popular.py 2          # only places two or more people want

Reads the live Cloudflare store and names the places from places.json.
Read-only: it never writes to the store.
"""
import json, subprocess, sys, pathlib, collections

SYNC = 'https://abruzzo-picks.mattnorthin.workers.dev/picks'
HERE = pathlib.Path(__file__).parent
floor = int(sys.argv[1]) if len(sys.argv) > 1 else 1

raw = subprocess.run(['curl', '-s', SYNC], capture_output=True, text=True).stdout
store = json.loads(raw)
places = {p['id']: p for p in json.loads((HERE / 'places.json').read_text(encoding='utf-8'))}

votes = collections.defaultdict(list)
colours = {}
for who, rec in store.items():
    if who.startswith('_'):           # _plan and any other non-person entry
        continue
    ids = rec.get('ids', rec) if isinstance(rec, dict) else rec
    for i in ids:
        if i.startswith('c-'):        # the person's chosen colour rides along as a pseudo-id
            colours[who] = i
            continue
        votes[i].append(who)

people = sorted(set(w for v in votes.values() for w in v))
print('%d people hearting: %s\n' % (len(people), ', '.join(people)))

rows = sorted(votes.items(), key=lambda kv: (-len(kv[1]), kv[0]))
shown = 0
for pid, who in rows:
    if len(who) < floor:
        continue
    p = places.get(pid)
    shown += 1
    if not p:
        print('%2d  %-42s %s   [not in places.json any more]' % (len(who), pid, ', '.join(sorted(who))))
        continue
    print('%2d  %-42s %-22s %3d min  %s'
          % (len(who), p['name'][:42], p['town'][:22], p['mins'], ', '.join(sorted(who))))
print('\n%d places with %d+ heart%s' % (shown, floor, '' if floor == 1 else 's'))
