(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var SMOOTH = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'auto' : 'smooth';
  var byId = Object.create(null); // a plain {} would answer yes to byId['constructor']
  PLACES.forEach(function (p) { byId[p.id] = p; });

  /* ---------- state, persisted per browser ---------- */
  var KEY = 'abruzzo-2026';
  var S = { short: {}, plan: {}, friends: {}, me: '', welcomed: false, colour: '', fc: {}, tips: [], ops: [] };
  // one rule for every way a name arrives: no leading underscore (that is the store's own
  // namespace - "_plan" is the calendar), no invisible characters, one space at most, 24 chars
  function cleanName(v) {
    v = String(v == null ? '' : v);
    try { v = v.normalize('NFC'); } catch (e) {}
    v = v.replace(/[\u0000-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g, '')
         .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
         .replace(/^[\uDC00-\uDFFF]/, '')
         .replace(/\s+/g, ' ').trim().replace(/^[_.]+/, '').slice(0, 24).trim()
         .replace(/[\uD800-\uDBFF]$/, '');
    // a name with no letter or digit in it slugs to nothing and can never sync
    return /[a-z0-9]/i.test(v) ? v : '';
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var o = JSON.parse(raw);
      if (!o || typeof o !== 'object') return;
      // guard the shape, not just the parse - a stale schema must not kill the page
      if (o.short && typeof o.short === 'object') {
        Object.keys(o.short).forEach(function (k) { if (byId[k]) S.short[k] = true; });
      }
      if (o.plan && typeof o.plan === 'object') {
        Object.keys(o.plan).forEach(function (d) {
          var slots = o.plan[d];
          if (!slots || typeof slots !== 'object') return;
          S.plan[d] = {};
          SLOTS.forEach(function (s) {
            var v = slots[s.k];
            // older saves held a bare id; the shared plan holds {id, by, booked}
            if (typeof v === 'string' && byId[v]) S.plan[d][s.k] = { id: v, by: '', booked: false };
            else if (v && typeof v === 'object' && typeof v.id === 'string' && byId[v.id]) {
              S.plan[d][s.k] = { id: v.id, by: String(v.by || '').slice(0, 24), booked: !!v.booked };
            }
          });
        });
      }
      if (o.friends && typeof o.friends === 'object') {
        Object.keys(o.friends).forEach(function (n) {
          var l = o.friends[n];
          if (!Array.isArray(l)) return;
          var ids = l.filter(function (id) { return typeof id === 'string' && byId[id]; });
          if (ids.length) S.friends[String(n).slice(0, 24)] = ids;
        });
      }
      if (Array.isArray(o.tips)) {
        S.tips = o.tips.filter(function (t) { return t && typeof t.n === 'string'; }).slice(0, 40);
      }
      if (typeof o.me === 'string') S.me = cleanName(o.me);
      if (Array.isArray(o.ops)) {
        S.ops = o.ops.filter(function (x) {
          return x && typeof x === 'object' && typeof x.day === 'number' && typeof x.slot === 'string' &&
                 typeof x.at === 'number' && (x.e === null || (x.e && typeof x.e.id === 'string'));
        }).slice(-40);
      }
      S.welcomed = !!o.welcomed;
      if (typeof o.colour === 'number' && o.colour >= 1 && o.colour <= 7) S.colour = o.colour;
      if (o.fc && typeof o.fc === 'object') {
        Object.keys(o.fc).forEach(function (n) {
          if (typeof o.fc[n] === 'number' && o.fc[n] >= 1 && o.fc[n] <= 7) S.fc[String(n).slice(0, 24)] = o.fc[n];
        });
      }
    } catch (e) { /* corrupt storage must never break the page */ }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }

  var DAYS = [
    { d: 11, dow: 'Fri', fixed: [{ t: 'arrive', l: 'Matt, Sam and Vero land 16:30' }] },
    { d: 12, dow: 'Sat', weekend: true },
    { d: 13, dow: 'Sun', weekend: true, note: 'Shops and markets shut',
      fixed: [{ t: 'fest', l: 'Feste di Settembre, Lanciano \u2014 piazza fills, then the Nottata at 4am' }] },
    { d: 14, dow: 'Mon', mon: true, note: 'Your only Monday \u2014 museums shut',
      fixed: [{ t: 'fest', l: 'Nottata, 4am: fireworks and the luminarie lit, Lanciano' },
              { t: 'arrive', l: 'Lyndsey, Frances and Anthony land 20:40 \u2014 Matt collects' }] },
    { d: 15, dow: 'Tue', fixed: [{ t: 'fest', l: 'Feste di Settembre \u2014 concert in Piazza Plebiscito, Lanciano' }] },
    { d: 16, dow: 'Wed', fixed: [{ t: 'bday', l: "Lyndsey's birthday" },
      { t: 'fest', l: 'Feste di Settembre closes \u2014 concert and a pyromusical finale, Lanciano' },
      { t: 'bday', l: 'Crossover party \u2014 stay up past midnight and it is both birthdays' }] },
    { d: 17, dow: 'Thu', fixed: [{ t: 'bday', l: "Matt's birthday" },
      { t: 'bday', l: 'Poolside BBQ at the house' },
      { t: 'arrive', l: 'Lauren lands 09:50 \u2014 collected' }] },
    { d: 18, dow: 'Fri' },
    { d: 19, dow: 'Sat', weekend: true },
    { d: 20, dow: 'Sun', weekend: true, note: 'Shops and markets shut',
      fixed: [{ t: 'leave', l: 'Leave the house by 16:45 \u2014 flight 19:25' },
              { t: 'leave', l: "Minivan from Stansted to Matt's, 21:00" }] }
  ];
  // A day is listed in the order a day runs, breakfast to evening. "All day" is the trip-day
  // switch: fill it and Morning and Afternoon fold away (the meals and the evening stay - a day
  // in Sulmona still ends with dinner somewhere). Keys are what the shared store speaks, so
  // 'fullday' keeps its old key under its new label and old entries still land.
  var SLOTS = [
    { k: 'fullday',   l: 'All day',   kind: 'do' },
    { k: 'breakfast', l: 'Breakfast', kind: 'eat' },
    { k: 'morning',   l: 'Morning',   kind: 'do' },
    { k: 'lunch',     l: 'Lunch',     kind: 'eat' },
    { k: 'afternoon', l: 'Afternoon', kind: 'do' },
    { k: 'dinner',    l: 'Dinner',    kind: 'eat' },
    { k: 'evening',   l: 'Evening',   kind: 'do' }
  ];
  var MEAL = { breakfast: 1, lunch: 1, dinner: 1 };

  /* Rough ideas. A slot can hold one of these instead of a real place - "Eat out, place TBC" -
     so the shape of a day is agreed before anyone argues about which trabocco. They live in the
     shared plan under g- ids (which pass the worker's id rule, and a phone on an older build
     keeps them verbatim as foreign entries), and have no tile, no pin and no drive time.
     `tbc` ones grow a "Confirm a place" button that opens the picker most-hearted first - that
     is where the votes turn into the plan. `pick` = which slots offer it on the quick strip;
     `confirm` = which section the confirm picker leads with. */
  var GENERIC = [
    { id: 'g-eat-out',     name: 'Eat out',                  pick: ['breakfast', 'lunch', 'dinner'],     tbc: 'place TBC',       confirm: 'eat' },
    { id: 'g-eat-in',      name: 'Eat at the house',         pick: ['breakfast', 'lunch', 'dinner'] },
    { id: 'g-pizza-night', name: 'Pizza night at the house', pick: ['dinner'] },
    { id: 'g-bbq',         name: 'BBQ by the pool',          pick: ['lunch', 'dinner'] },
    { id: 'g-picnic',      name: 'Picnic on the beach',      pick: ['lunch'],                            tbc: 'which beach TBC', confirm: 'do' },
    { id: 'g-coffee-out',  name: 'Coffee and cornetti out',  pick: ['breakfast'],                        tbc: 'place TBC',       confirm: 'eat' },
    { id: 'g-beach',       name: 'Beach',                    pick: ['morning', 'afternoon', 'fullday'],  tbc: 'which beach TBC', confirm: 'do' },
    { id: 'g-day-trip',    name: 'Day trip',                 pick: ['fullday'],                          tbc: 'where TBC',       confirm: 'do' },
    { id: 'g-boat',        name: 'Boat',                     pick: ['morning', 'afternoon', 'fullday'],  tbc: 'which boat TBC',  confirm: 'do' },
    { id: 'g-cellar-run',  name: 'Winery or distillery run', pick: ['morning', 'afternoon', 'fullday'],  tbc: 'which one TBC',   confirm: 'cellar' },
    { id: 'g-market',      name: 'Market or shops',          pick: ['morning'],                          tbc: 'which one TBC',       confirm: 'do' },
    { id: 'g-drinks-out',  name: 'Drinks out',               pick: ['evening'],                          tbc: 'place TBC',       confirm: 'eat' },
    { id: 'g-sunset',      name: 'Sunset somewhere',         pick: ['afternoon', 'evening'],             tbc: 'where TBC',       confirm: 'do' },
    { id: 'g-stay-in',     name: 'Stay in',                  pick: ['evening'] }
  ];
  // the "At the house" entries are real places (they have tiles and hearts) and belong on the
  // same quick strip; ids that are not in places.json are simply skipped
  var QUICK_PLACES = {
    breakfast: ['sleeping-in'], morning: ['sleeping-in', 'laying-by-the-pool'],
    lunch: ['long-lunch-on-the-terrace'], afternoon: ['laying-by-the-pool'], fullday: ['laying-by-the-pool']
  };
  GENERIC.forEach(function (g) { g.generic = true; g.group = 'generic'; g.town = ''; g.mins = 0; byId[g.id] = g; });
  function quickFor(slot) {
    var out = GENERIC.filter(function (g) { return g.pick.indexOf(slot) >= 0; });
    (QUICK_PLACES[slot] || []).forEach(function (id) { if (byId[id]) out.push(byId[id]); });
    return out;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fold(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[‘’ʼ]/g, "'");
  }

  /* ---------- tabs ---------- */
  var TABS = [['t-welcome', 'v-welcome'], ['t-calendar', 'v-calendar'],
              ['t-activities', 'v-activities'], ['t-know', 'v-know']];
  function showTab(tid) {
    TABS.forEach(function (p) {
      var on = p[0] === tid;
      $(p[0]).setAttribute('aria-selected', on ? 'true' : 'false');
      $(p[1]).hidden = !on;
    });
    if (tid === 't-activities') ensureMap();
  }
  TABS.forEach(function (pair) {
    $(pair[0]).addEventListener('click', function () {
      showTab(pair[0]);
      window.scrollTo({ top: 0, behavior: SMOOTH });
    });
  });
  // the roles promise a real tablist: arrows move between tabs
  $('t-welcome').parentNode.addEventListener('keydown', function (ev) {
    var step = { ArrowRight: 1, ArrowLeft: -1 };
    if (!(ev.key in step) && ev.key !== 'Home' && ev.key !== 'End') return;
    var ids = TABS.map(function (p) { return p[0]; });
    var i = ids.indexOf(document.activeElement && document.activeElement.id);
    if (i < 0) return;
    ev.preventDefault();
    var j = ev.key === 'Home' ? 0 : ev.key === 'End' ? ids.length - 1 : (i + step[ev.key] + ids.length) % ids.length;
    $(ids[j]).focus();
    showTab(ids[j]);
  });
  // aria-modal promises the background is out of reach: keep Tab inside the card
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Tab') return;
    var modal = !$('welcome').hidden ? $('welcome') : (!$('place').hidden ? $('place') : null);
    if (!modal) return;
    var f = [].slice.call(modal.querySelectorAll('button, [href], input, textarea')).filter(function (x) {
      return !x.hidden && !x.disabled && !x.closest('[hidden]');
    });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (ev.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) { ev.preventDefault(); first.focus(); }
  });

  /* ---------- activities ---------- */
  // Anything given an `added` date in places.json wears a badge and floats up for three weeks,
  // then quietly becomes an ordinary tile. No second list to keep tidy.
  var NEW_MS = 21 * 864e5;
  function isNew(p) {
    if (!p || !p.added) return false;
    var t = Date.parse(p.added);
    return !isNaN(t) && (Date.now() - t) < NEW_MS;
  }
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.9-10-9.3C.4 8.6 2.2 5' +
              ' 5.6 5c2 0 3.3 1.1 4.4 2.6C11.1 6.1 12.4 5 14.4 5c3.4 0 5.2 3.6 3.6 6.7C19.5 16.1 12 21 12 21z"/></svg>';
  var tiles = [];

  function buildTiles() {
    ['house', 'eat', 'cellar', 'do'].forEach(function (g) {
      var frag = document.createDocumentFragment();
      PLACES.filter(function (p) { return p.group === g; }).forEach(function (p) {
        var el = document.createElement('article');
        el.className = 'tile ' + g;
        el.style.setProperty('--tile', p.fill);
        el.innerHTML =
          '<div class="thead">' +
            '<div class="thead-l">' +
              '<span class="tcat">' + esc(p.catLabel) + '</span>' +
              '<button class="tname" type="button">' + esc(p.name) + '</button>' +
              (p.flag ? '<span class="tflag">' + esc(p.flag) + '</span>' : '') +
              (isNew(p) ? '<span class="tnew">Just added</span>' : '') +
            '</div>' +
            '<div class="thead-r">' +
              '<span class="likedby" aria-label="Hearted by"></span>' +
              '<button class="heart" type="button" data-id="' + esc(p.id) + '" aria-pressed="false"' +
                ' aria-label="Shortlist ' + esc(p.name) + '">' + HEART + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="tinner">' +
            '<p class="ttown">' + (p.mins === 0 ? 'at the house' : esc(p.town) + ' &#183; ' + p.mins + ' min') + '</p>' +
            '<p class="tdesc">' + esc(p.desc) + '</p>' +
            '<div class="tfoot">' +
              '<a class="cta" href="' + esc(p.mapUrl) + '" target="_blank" rel="noopener">' +
                'Open in maps <span aria-hidden="true">\u2197</span></a>' +
              (p.website ? '<a class="cta" href="' + esc(p.website) + '" target="_blank" rel="noopener">' +
                'Website <span aria-hidden="true">\u2197</span></a>' : '') +
              '<span class="inplan"></span>' +
            '</div>' +
          '</div>';
        el._p = p;
        el._hay = fold((p.name + ' ' + p.town + ' ' + p.desc + ' ' + p.catLabel + ' ' +
                        (p.flag || '')).toLowerCase());
        el._plan = el.querySelector('.inplan');
        el._liked = el.querySelector('.likedby');
        el._heart = el.querySelector('.heart');
        tiles.push(el);
        frag.appendChild(el);
      });
      $('grid-' + g).appendChild(frag);
    });
    $('grid-house').addEventListener('click', onTileClick);
    $('grid-eat').addEventListener('click', onTileClick);
    $('grid-cellar').addEventListener('click', onTileClick);
    $('grid-do').addEventListener('click', onTileClick);
  }
  // a tap anywhere on a tile opens the place sheet; the heart and the two outbound
  // links keep their own jobs, so nothing is taken away, only added
  function onTileClick(ev) {
    if (ev.target.closest('.heart')) return onHeart(ev);
    if (ev.target.closest('a')) return;
    var el = ev.target.closest('.tile');
    if (el && el._p) openPlace(el._p);
  }
  function onHeart(ev) {
    var b = ev.target.closest('.heart');
    if (!b) return;
    var id = b.dataset.id;
    if (S.short[id]) delete S.short[id]; else S.short[id] = true;
    save();
    syncHearts();
    renderTiles(); // badges and the Popular order follow the tap immediately
    pushPicks();
    // first heart and no name yet: open the share panel so the hearts can travel under a name
    // no name yet: every heart asks, not just the first. A heart with no name never leaves
    // this phone, so going quiet after one ask is how a person's picks vanish silently.
    if (!S.me && S.short[id]) openWho();
  }
  function syncHearts() {
    var mine = whoColour(S.me || 'Me');
    tiles.forEach(function (el) {
      var on = !!S.short[el._p.id];
      el._heart.style.setProperty('--mine', mine);
      el._heart.classList.toggle('on', on);
      el._heart.setAttribute('aria-pressed', on ? 'true' : 'false');
      el._heart.setAttribute('aria-label', (on ? 'Un-heart ' : 'Heart ') + el._p.name);
    });
  }
  function whereInPlan(id) {
    var out = [];
    DAYS.forEach(function (d) {
      var slots = S.plan[d.d];
      if (!slots) return;
      SLOTS.forEach(function (s) {
        var e = slots[s.k];
        if (e && e.id === id) {
          out.push(d.dow + ' ' + d.d + ' ' + s.l.toLowerCase() + (e.by ? ' (' + e.by + ')' : '') +
                   (e.booked ? ' · booked' : ''));
        }
      });
    });
    return out;
  }

  var active = {}, band = 999, term = '', group = 'all', area = false;
  // "Pescara" chip: the airport side of the coast, for landing nights and Pescara evenings.
  var AREA_TOWNS = { 'Pescara': 1, 'Montesilvano': 1, 'Francavilla al Mare': 1 };

  function inGroup(p) {
    if (group === 'eat' || group === 'do' || group === 'cellar' || group === 'house') return p.group === group;
    if (group === 'new') return isNew(p);
    if (group === 'short') return !!S.short[p.id];
    if (group === 'votes') return votes(p.id) > 0;
    if (group.indexOf('friend:') === 0) return friendHas(group.slice(7), p.id);
    return true;
  }
  // votes = my heart + every friend's heart we have been sent
  function voters(id) {
    var names = Object.keys(S.friends).filter(function (n) { return friendHas(n, id); });
    if (S.short[id]) names.push(S.me || 'Me');
    return names.sort();
  }
  function votes(id) { return voters(id).length; }
  function passes(p, hay, ts) {
    if (!inGroup(p)) return false;
    var cats = Object.keys(active);
    if (cats.length && !active[p.cat]) return false;
    if (p.mins > band) return false;
    if (area && !AREA_TOWNS[p.town]) return false;
    for (var i = 0; i < ts.length; i++) if (hay.indexOf(ts[i]) < 0) return false;
    return true;
  }
  function renderTiles() {
    var ts = term ? fold(term).split(/\s+/).filter(Boolean) : [];
    var n = { house: 0, eat: 0, cellar: 0, do: 0 }, floated = 0;
    tiles.forEach(function (el) {
      var ok = passes(el._p, el._hay, ts);
      if (el.hidden === ok) el.hidden = !ok;
      if (ok) {
        n[el._p.group]++;
        var w = whereInPlan(el._p.id);
        var pt = w.length ? 'In the plan · ' + w.join(' · ') : '';
        if (pt !== el._pt) { el._pt = pt; el._plan.textContent = pt; }
        // innerHTML always re-parses, even for the same string - and this runs for 262 tiles on
        // every keystroke and every heart, so only touch the badges that actually changed
        var lk = likedBy(el._p.id);
        if (lk !== el._lk) { el._lk = lk; el._liked.innerHTML = lk; }
      }
      // hearted places float to the top of whatever you are looking at, most-wanted first;
      // everything on the same number of hearts keeps its drive-time order underneath
      // hearts outrank a new arrival, but a new arrival still sits above everything
      // nobody has hearted yet - so an added place is seen without burying the shortlist
      var v = votes(el._p.id), fresh = isNew(el._p) ? 1 : 0;
      var ord = String(-(v * 4 + fresh));
      if (ord !== el._ord) { el._ord = ord; el.style.order = ord; }
      if (ok && (v || fresh)) floated++;
    });
    // only worth saying once something has actually moved
    $('floatnote').hidden = floated === 0;
    $('sec-house').hidden = n.house === 0;
    $('sec-eat').hidden = n.eat === 0;
    $('sec-cellar').hidden = n.cellar === 0;
    $('sec-do').hidden = n.do === 0;
    $('n-house').textContent = n.house;
    $('n-eat').textContent = n.eat;
    $('n-cellar').textContent = n.cellar;
    $('n-do').textContent = n.do;
    var total = n.house + n.eat + n.cellar + n.do;
    var bits = [total + (total === 1 ? ' place' : ' places')];
    if (group === 'house') bits.push('at the house');
    else if (group === 'eat') bits.push('eat & drink');
    else if (group === 'cellar') bits.push('wineries & distilleries');
    else if (group === 'do') bits.push('out and about');
    else if (group === 'new') bits.push('just added');
    else if (group === 'short') bits.push('your hearts');
    else if (group === 'votes') bits.push('popular first');
    else if (group.indexOf('friend:') === 0) bits.push(group.slice(7) + "'s hearts");
    var cats = Object.keys(active);
    if (cats.length) bits.push(cats.length + (cats.length === 1 ? ' category' : ' categories'));
    if (band !== 999) bits.push('within ' + band + ' min');
    if (area) bits.push('Pescara side');
    if (term) bits.push('matching “' + term + '”');
    $('count-text').textContent = bits.join(' · ');
    $('clear').hidden = !(cats.length || band !== 999 || term || group !== 'all' || area);
    $('empty').hidden = total > 0;
    updateChipCounts(ts);
    updateCounts(total);
    lastTs = ts;
    renderTips();
    if (map) drawPins();
  }

  /* ---------- map: Leaflet + OpenStreetMap, loaded only when asked for ----------
     Pins are the tiles that pass the current filters, so search and chips drive the map too. */
  var HOUSE = { lat: 42.2486, lon: 14.4664, name: 'Butterfly Cave' };
  var map = null, pinLayer = null, leafletLoading = false;
  function loadLeaflet(cb) {
    if (window.L) return cb();
    if (leafletLoading) return;
    leafletLoading = true;
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    var js = document.createElement('script');
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.onload = function () { leafletLoading = false; cb(); };
    js.onerror = function () {
      leafletLoading = false;
      $('map-note').textContent = 'The map could not load \u2014 it will try again next time you open this tab.';
    };
    document.head.appendChild(js);
  }
  function initMap() {
    // on touch screens a full-width map at the top of the page would swallow every scroll gesture,
    // so it starts locked (pins still tap) and a button on the map unlocks moving and pinching
    var touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    map = L.map('map', { scrollWheelZoom: false, dragging: !touch, touchZoom: !touch, tap: true });
    if (touch) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'maplock';
      btn.textContent = 'Move the map';
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', function () {
        var on = map.dragging.enabled();
        if (on) { map.dragging.disable(); map.touchZoom.disable(); }
        else { map.dragging.enable(); map.touchZoom.enable(); }
        btn.textContent = on ? 'Move the map' : 'Done moving';
        btn.setAttribute('aria-pressed', on ? 'false' : 'true');
      });
      $('map').appendChild(btn);
    }
    // CARTO's light basemap: quiet greys, so the category-coloured pins and the paper frame carry
    // the page; a sepia wash in site.css pulls it towards the limestone ground
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18, subdomains: 'abcd',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &#183; &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);
    L.marker([HOUSE.lat, HOUSE.lon], {
      keyboard: false, title: 'Butterfly Cave, the house',
      icon: L.divIcon({ className: '', html: '<div class="pin house"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
      zIndexOffset: 1000
    }).addTo(map).bindPopup('<b>' + HOUSE.name + '</b>Villa Grotta delle Farfalle, Rocca San Giovanni');
    pinLayer = L.layerGroup().addTo(map);
    drawPins();
  }
  // Every heart, keystroke and changed poll used to tear down and rebuild all 257 markers and
  // re-frame the map (~30 ms in jsdom, worse on a phone). Now: same visible set and same hearts
  // -> nothing; only hearts changed -> restyle the pins in place; visible set changed -> rebuild
  // and re-frame, which is the one case where the frame should move.
  var pinIds = '', pinLikes = '';
  function drawPins() {
    var ids = [], likes = [];
    tiles.forEach(function (el) {
      var p = el._p;
      if (el.hidden || typeof p.lat !== 'number') return;
      ids.push(p.id);
      likes.push(S.short[p.id] || votes(p.id) ? 1 : 0);
    });
    ids = ids.join(','); likes = likes.join('');
    if (ids === pinIds) {
      if (likes === pinLikes) return;
      pinLikes = likes;
      tiles.forEach(function (el) {
        var node = el._marker && !el.hidden && el._marker.getElement && el._marker.getElement();
        if (node && node.firstChild && node.firstChild.classList) {
          node.firstChild.classList.toggle('liked', !!(S.short[el._p.id] || votes(el._p.id)));
        }
      });
      return;
    }
    pinIds = ids; pinLikes = likes;
    pinLayer.clearLayers();
    var pts = [[HOUSE.lat, HOUSE.lon]];
    tiles.forEach(function (el) {
      var p = el._p;
      if (el.hidden || typeof p.lat !== 'number') return;
      var approx = p.geo === 'town';
      var liked = !!(S.short[p.id] || votes(p.id));
      var m = L.marker([p.lat, p.lon], {
        keyboard: false, // 257 tab stops between the map and the search box; the tiles carry the names
        icon: L.divIcon({
          className: '',
          html: '<div class="pin' + (approx ? ' approx' : '') + (liked ? ' liked' : '') +
                '" style="--pin:' + p.fill + '"></div>',
          iconSize: [14, 14], iconAnchor: [7, 7]
        }),
        title: p.name
      });
      m.bindPopup('<b>' + esc(p.name) + '</b>' + esc(p.catLabel) + ' &#183; ' + esc(p.town) +
                  ' &#183; ' + p.mins + ' min' + (approx ? ' &#183; town centre, not the door' : '') +
                  (p.flag ? '<br>' + esc(p.flag) : '') +
                  '<br><a href="' + esc(p.mapUrl) + '" target="_blank" rel="noopener">Open in Google Maps &#8599;</a>');
      pinLayer.addLayer(m);
      el._marker = m; // so "Show me on the map" can open this pin
      pts.push([p.lat, p.lon]);
    });
    // with no filters on, frame the coast and the Majella (within 45 min) rather than the far day trips,
    // which would zoom the whole thing out to half of Italy; a filtered view frames exactly its pins
    var unfiltered = group === 'all' && !Object.keys(active).length && band === 999 && !area && !term;
    var frame = pts;
    if (unfiltered) {
      frame = [[HOUSE.lat, HOUSE.lon]];
      tiles.forEach(function (el) {
        var p = el._p;
        if (!el.hidden && typeof p.lat === 'number' && p.mins <= 45) frame.push([p.lat, p.lon]);
      });
    }
    if (frame.length > 1) map.fitBounds(frame, { padding: [24, 24], maxZoom: 13 });
    else map.setView([HOUSE.lat, HOUSE.lon], 11);
  }
  // the map sits at the top of Activities; it is built the first time that tab is shown
  function ensureMap() {
    if (map) { setTimeout(function () { map.invalidateSize(); drawPins(); }, 50); return; }
    loadLeaflet(function () { initMap(); });
  }

  /* ---------- place sheet ----------
     Tapping a tile used to be a one-way trip to Google Maps. Now it opens this: the same copy
     plus who wants it, where it already sits in the plan, and the pin on our own map. The
     outbound links are still here, they are just no longer the only thing a tap can do. */
  var sheetPlace = null;
  function tileFor(id) {
    for (var i = 0; i < tiles.length; i++) if (tiles[i]._p.id === id) return tiles[i];
    return null;
  }
  function openPlace(p) {
    sheetReturn = document.activeElement;
    sheetPlace = p;
    $('place-band').style.setProperty('--tile', p.fill);
    $('place-cat').textContent = p.catLabel;
    $('place-name').textContent = p.name;
    $('place-where').textContent = (p.mins === 0 ? 'At the house' : p.town + ' \u00b7 ' + p.mins + ' min from the house') +
      (p.geo === 'town' ? ' \u00b7 pin is the town centre, not the door' : '');
    $('place-flag').textContent = p.flag || '';
    $('place-flag').hidden = !p.flag;
    $('place-desc').textContent = p.desc;

    var who = voters(p.id);
    $('place-who').innerHTML = who.length
      ? who.map(badge).join('') + ' ' + esc(listNames(who)) + ' hearted this'
      : '';
    $('place-who').hidden = !who.length;

    var w = whereInPlan(p.id);
    $('place-plan').textContent = w.length ? 'In the plan \u00b7 ' + w.join(' \u00b7 ') : '';
    $('place-plan').hidden = !w.length;

    $('place-heart').textContent = S.short[p.id] ? 'Hearted \u2014 tap to remove' : 'Heart this';
    $('place-heart').setAttribute('aria-pressed', S.short[p.id] ? 'true' : 'false');
    $('place-show').hidden = typeof p.lat !== 'number';
    $('place-maplink').href = p.mapUrl;
    $('place-web').href = p.website || '#';
    $('place-web').hidden = !p.website;
    $('place').hidden = false;
    $('place-close').focus();
  }
  function listNames(names) {
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  }
  // one keyboard contract for the sheets: remember the opener, give focus back on close
  var sheetReturn = null;
  function focusBack() {
    if (sheetReturn && sheetReturn.focus && document.contains(sheetReturn) && !sheetReturn.closest('[hidden]')) sheetReturn.focus();
    sheetReturn = null;
  }
  function closePlace() { $('place').hidden = true; sheetPlace = null; focusBack(); }
  function heartFromSheet() {
    var p = sheetPlace;
    if (!p) return;
    if (S.short[p.id]) delete S.short[p.id]; else S.short[p.id] = true;
    save();
    syncHearts();
    renderTiles();
    pushPicks();
    openPlace(p); // redraw the sheet so the label and the badges follow the tap
    if (!S.me) openWho();
  }
  function showOnMap() {
    var p = sheetPlace;
    if (!p || typeof p.lat !== 'number') return;
    closePlace();
    showTab('t-activities');
    ensureMap();
    // the map may still be loading on the first ever tap, so try again briefly
    var tries = 0;
    (function go() {
      if (!map) { if (tries++ < 20) return setTimeout(go, 150); return; }
      $('map-panel').scrollIntoView({ behavior: SMOOTH, block: 'start' });
      map.setView([p.lat, p.lon], 14);
      var el = tileFor(p.id);
      if (el && el._marker) el._marker.openPopup();
    })();
  }
  function wirePlace() {
    $('place-close').addEventListener('click', closePlace);
    $('place-heart').addEventListener('click', heartFromSheet);
    $('place-show').addEventListener('click', showOnMap);
    // tapping the dimmed area behind the card closes it, the way a phone expects
    $('place').addEventListener('click', function (ev) { if (ev.target === $('place')) closePlace(); });
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape') return;
      if (!$('place').hidden) { closePlace(); return; }
      if (!$('who').hidden) { closeWho(); return; }
      if (!$('tip').hidden) { $('tip').hidden = true; focusBack(); return; }
      if (!$('welcome').hidden && S.me) closeWelcome();
    });
  }

  /* ---------- welcome card: once per phone, or whenever a personal link is opened ----------
     A personal link is  ?me=Frances  - it sets the name and greets them, so nobody has to type. */
  function readMeParam() {
    var m = /[?&]me=([^&]+)/.exec(location.search || '');
    if (!m) return '';
    var name = '';
    try { name = cleanName(decodeURIComponent(m[1].replace(/\+/g, ' '))); } catch (e) {}
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
    return name;
  }
  function showWelcome() {
    var named = !!S.me;
    $('welcome-title').textContent = named ? 'Ciao, ' + S.me : 'Ciao';
    $('welcome-name-row').hidden = named;
    $('welcome-notme').hidden = !named;
    $('welcome-go').disabled = !named;
    renderSwatches('welcome-colours');
    $('welcome').hidden = false;
    if (!named) $('welcome-name').focus(); else if ($('welcome-go').focus) $('welcome-go').focus();
  }
  // "Not Frances?" - the link was forwarded or opened on someone else's phone
  function notMe() {
    S.me = '';
    S.short = {};
    syncHearts();
    save();
    updateMeChip();
    $('welcome-title').textContent = 'Ciao';
    $('welcome-notme').hidden = true;
    $('welcome-name-row').hidden = false;
    $('welcome-name').value = '';
    $('welcome-go').disabled = true;
    $('welcome-name').focus();
  }
  function closeWelcome() {
    if (!S.me) {
      var v = cleanName($('welcome-name').value);
      if (!v) { $('welcome-name').focus(); return; }
      S.me = v;
      if (S.friends[S.me]) { delete S.friends[S.me]; renderFriendChips(); renderTiles(); }
      updateMeChip();
      // Do NOT push here with an empty shortlist. A name typed on a phone that has no hearts yet
      // would PUT {"ids":["c-1"]} - just the colour - and the worker replaces the whole record,
      // erasing whatever that person had hearted from another device. That is exactly how Matt's
      // six hearts became zero. The colour rides along with the first real heart instead, and
      // pullPicks pulls the server's hearts back down in the meantime.
      if (Object.keys(S.short).length) pushPicks();
    }
    S.welcomed = true;
    save();
    $('welcome').hidden = true;
    showTab('t-activities');
    // on a phone the hero fills the first screen; land people on the tabs + map instead
    var nav = document.querySelector('nav.tabs');
    if (nav && nav.scrollIntoView) nav.scrollIntoView({ block: 'start' });
  }
  function wireWelcome() {
    $('welcome-go').addEventListener('click', closeWelcome);
    $('welcome-notme').addEventListener('click', notMe);
    $('welcome-name').addEventListener('input', function () {
      $('welcome-go').disabled = !this.value.trim();
    });
    $('welcome-name').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); closeWelcome(); }
    });
  }
  function updateChipCounts(ts) {
    [].slice.call($('cats').children).forEach(function (b) {
      var k = b.dataset.cat, c = 0;
      tiles.forEach(function (el) {
        var p = el._p;
        if (p.cat !== k) return;
        if (!inGroup(p)) return;
        if (p.mins > band) return;
        if (area && !AREA_TOWNS[p.town]) return;
        for (var i = 0; i < ts.length; i++) if (el._hay.indexOf(ts[i]) < 0) return;
        c++;
      });
      b.querySelector('em').textContent = c;
      b.classList.toggle('zero', c === 0);
    });
    var an = 0;
    tiles.forEach(function (el) { if (AREA_TOWNS[el._p.town] && !el.hidden) an++; });
    $('area-n').textContent = an;
  }
  function updateCounts(shown) {
    // the Activities badge counts what is on screen, not the shortlist -
    // a "0" next to Activities reads as "there are none".
    if (typeof shown === 'number') $('c-act').textContent = shown;
    $('short-n').textContent = Object.keys(S.short).length;
    $('votes-n').textContent = PLACES.filter(function (p) { return votes(p.id) > 0; }).length;
    var n = 0;
    Object.keys(S.plan).forEach(function (d) { n += Object.keys(S.plan[d]).length; });
    var badge = $('c-plan');
    badge.textContent = n;
    badge.hidden = n === 0;
  }

  function wireShelf() {
    [].slice.call($('cats').children).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.cat;
        if (active[k]) { delete active[k]; b.setAttribute('aria-pressed', 'false'); }
        else { active[k] = 1; b.setAttribute('aria-pressed', 'true'); }
        renderTiles();
      });
    });
    [].slice.call($('bands').children).forEach(function (b) {
      if (!b.dataset.band) return; // the Pescara area chip shares this row but is not a band
      b.addEventListener('click', function () {
        band = +b.dataset.band;
        [].slice.call($('bands').children).forEach(function (x) {
          if (x.dataset.band) x.setAttribute('aria-pressed', +x.dataset.band === band ? 'true' : 'false');
        });
        renderTiles();
      });
    });
    // delegated, because friends' chips are added to this row after load
    $('groups').addEventListener('click', function (ev) {
      var b = ev.target.closest('.chip');
      if (!b || !b.dataset.group) return;
      setGroup(b.dataset.group);
    });
    $('area-pescara').addEventListener('click', function () {
      area = !area;
      this.setAttribute('aria-pressed', area ? 'true' : 'false');
      renderTiles();
    });
    var qTimer = null;
    $('q').addEventListener('input', function () {
      term = this.value.trim().toLowerCase();
      // one repaint per pause in typing, not one per letter across 262 tiles
      clearTimeout(qTimer);
      qTimer = setTimeout(renderTiles, 120);
    });
    $('clear').addEventListener('click', function () {
      active = {}; band = 999; term = ''; group = 'all'; area = false; $('q').value = '';
      $('area-pescara').setAttribute('aria-pressed', 'false');
      [].slice.call($('cats').children).forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      [].slice.call($('bands').children).forEach(function (b) {
        if (b.dataset.band) b.setAttribute('aria-pressed', b.dataset.band === '999' ? 'true' : 'false');
      });
      [].slice.call($('groups').children).forEach(function (b) {
        b.setAttribute('aria-pressed', b.dataset.group === 'all' ? 'true' : 'false');
      });
      renderTiles();
    });
  }

  /* ---------- calendar ---------- */
  var openPicker = null;
  var pendingChoice = null; // a slot chosen before this phone has a name: parked while #who asks
  function slotsFor(d) { return (S.plan[d] = S.plan[d] || {}); }

  /* ---------- the shared plan ----------
     One calendar for the group. It lives in the same store as the hearts, under the pseudo-name
     "_plan", each slot encoded as  d14--dinner--<place id>--<who>--b1  (b1 = booked). Every change
     fetches the latest plan first, applies the tap, then saves - so two people editing different
     slots within the same minute do not wipe each other out. */
  function slugName(n) {
    return String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 14).replace(/^-+|-+$/g, '') || 'someone';
  }
  function nameFromSlug(s) {
    var known = Object.keys(S.friends).concat(Object.keys(S.fc), S.me ? [S.me] : []);
    for (var i = 0; i < known.length; i++) if (slugName(known[i]) === s) return known[i];
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
  }
  function encodePlan() {
    var out = [];
    DAYS.forEach(function (d) {
      var slots = S.plan[d.d];
      if (!slots) return;
      SLOTS.forEach(function (s) {
        var e = slots[s.k];
        if (e && byId[e.id]) out.push('d' + d.d + '--' + s.k + '--' + e.id + '--' + slugName(e.by) + '--b' + (e.booked ? '1' : '0'));
      });
    });
    return out.concat(foreignPlan);
  }
  // Entries this build does not recognise - a place added after this tab was loaded - are kept
  // aside verbatim and written back by encodePlan. Without this, an out-of-date phone silently
  // deletes everyone else's newest calendar entries the moment its owner taps anything.
  var foreignPlan = [];
  function decodePlan(list) {
    var plan = {};
    foreignPlan = [];
    (list || []).forEach(function (s) {
      var m = /^d(\d{1,2})--([a-z]+)--([a-z0-9-]+?)--([a-z0-9-]+)--b([01])$/.exec(s);
      if (!m) return;
      if (!byId[m[3]]) { foreignPlan.push(s); return; }
      var day = +m[1], slot = m[2];
      // a slot key this build does not know (the next redesign) is kept verbatim, like an unknown id
      if (!DAYS.some(function (d) { return d.d === day; }) || !SLOTS.some(function (x) { return x.k === slot; })) { foreignPlan.push(s); return; }
      (plan[day] = plan[day] || {})[slot] = { id: m[3], by: nameFromSlug(m[4]), booked: m[5] === '1' };
    });
    return plan;
  }
  // syncNote writes into the Activities panel, which is hidden whenever anyone is on the
  // Calendar - so the old "could not save" warning was invisible to the only people who
  // could see it matter. The calendar gets its own line.
  function planNote(msg) {
    var el = $('plan-note');
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || '';
  }
  function pushPlan() {
    if (!SYNC || !window.fetch) return;
    planDirty = true;
    fetchJSON(SYNC + '/picks/_plan', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: encodePlan() })
    }).then(function () { planDirty = false; planNote(''); S.ops = liveOps(); save(); },
            function () {
              // it said "it will keep trying" and then never did - pushPlan had exactly one
              // caller, a fresh tap. planDirty stays set and the poll re-drives it.
              planNote('Saved on this phone \u2014 it will send itself when the connection is back.');
            });
  }
  // renderCalendar calls slotsFor for all ten days, and slotsFor CREATES the day as a side
  // effect, so S.plan always carries ten keys while a decoded plan carries only the days that
  // hold something. Comparing the two raw made every poll look like a change, so the calendar
  // repainted every 30 seconds - tearing any open place-picker out from under the tap that
  // opened it. That was "I updated the calendar and it went nowhere". Compare the encoded
  // shape instead, which is blind to empty days.
  function planKey(plan) {
    var out = [];
    DAYS.forEach(function (d) {
      var slots = plan[d.d];
      if (!slots) return;
      SLOTS.forEach(function (x) {
        var e = slots[x.k];
        if (e && e.id) out.push(d.d + '|' + x.k + '|' + e.id + '|' + e.by + '|' + (e.booked ? 1 : 0));
      });
    });
    return out.join('\n');
  }
  var planPending = false;
  // returns true when the server copy was missing one of this phone's recent taps
  function applyPlan(list, noPush) {
    var fresh = decodePlan(list);
    var reassert = replayOps(fresh);
    if (planKey(fresh) !== planKey(S.plan)) {
      S.plan = fresh;
      save();
      renderTiles();
      // the picker is a child of #days and renderCalendar empties #days, so a repaint while one
      // is open would delete the box, the search text and the focus mid-tap. Hold it until it closes.
      if (openPicker) planPending = true; else renderCalendar();
    }
    if (reassert && !noPush) pushPlan();
    return reassert;
  }
  var planDirty = false;
  /* The plan is one document that every phone rewrites in full, and KV can hand a phone a copy
     up to a minute old. So a tap is also remembered as an operation on one slot - {day, slot,
     e, at} - and put back on top of every server copy for the next three minutes (or, while
     the tap is still unsent, for as long as that takes). If the server copy was missing it,
     it is sent again. That is what turns "two people editing in the same minute lose one" and
     "a phone back from the tunnel wipes everyone's afternoon" into a few seconds of flicker. */
  var OP_MS = 180000;
  function recordOp(day, slot) {
    var e = slotsFor(day)[slot];
    S.ops = (S.ops || []).filter(function (o) { return !(o.day === day && o.slot === slot); });
    S.ops.push({ day: day, slot: slot, at: Date.now(),
                 e: e ? { id: e.id, by: e.by, booked: !!e.booked } : null });
    if (S.ops.length > 40) S.ops = S.ops.slice(-40);
  }
  function liveOps() {
    var now = Date.now();
    return (S.ops || []).filter(function (o) { return planDirty || (now - o.at) < OP_MS; });
  }
  function replayOps(plan) {
    var changed = false;
    liveOps().forEach(function (o) {
      var cur = (plan[o.day] || {})[o.slot];
      var same = (!cur && !o.e) ||
                 (cur && o.e && cur.id === o.e.id && slugName(cur.by) === slugName(o.e.by) && !!cur.booked === !!o.e.booked);
      if (same) return;
      if (o.e) (plan[o.day] = plan[o.day] || {})[o.slot] = { id: o.e.id, by: o.e.by, booked: !!o.e.booked };
      else if (plan[o.day]) delete plan[o.day][o.slot];
      changed = true;
    });
    return changed;
  }
  function planChange(day, slot, fn) {
    function apply() { fn(); recordOp(day, slot); save(); renderCalendar(); renderTiles(); }
    if (!SYNC || !window.fetch) { apply(); return; }
    fetchJSON(SYNC + '/picks').then(function (all) {
      applyPlan(all ? all._plan : undefined, true); // server first, our recent taps back on top
      apply();
      pushPlan();
    }, function () {
      // a dropped read must not become a blind write: keep the tap, mark it unsent, and the
      // next successful poll merges it into whatever the server has by then
      apply();
      planDirty = true;
      planNote('Saved on this phone \u2014 it will send itself when the connection is back.');
    });
  }
  // "All day" folds Morning and Afternoon away, and either of those hides "All day". Meals and
  // the evening are never blocked - a day out still ends with dinner somewhere.
  function blocked(d, k) {
    var s = slotsFor(d);
    if (k === 'fullday') return !!(s.morning || s.afternoon);
    if (k === 'morning' || k === 'afternoon') return !!s.fullday;
    return false;
  }
  function renderCalendar() {
    var host = $('days');
    host.textContent = '';
    DAYS.forEach(function (day) {
      var s = slotsFor(day.d);
      var wrap = document.createElement('article');
      wrap.className = 'day' + (day.mon ? ' mon' : (day.weekend ? ' weekend' : ''));
      var head = '<div class="dhead"><span class="ddate" role="heading" aria-level="3">' + day.dow + ' ' + day.d + ' Sep</span>' +
        (day.note ? '<span class="dnote">' + esc(day.note) + '</span>' : '') + '</div>';
      if (day.fixed && day.fixed.length) {
        head += '<div class="dfixed">' + day.fixed.map(function (f) {
          return '<span class="fx fx-' + f.t + '">' + esc(f.l) + '</span>';
        }).join('') + '</div>';
      }
      var body = '<div class="slots">';
      SLOTS.forEach(function (sl) {
        var filled = s[sl.k];
        // a blocked slot folds away rather than sitting greyed out - seven rows is plenty
        if (!filled && blocked(day.d, sl.k)) return;
        body += '<div class="slot k-' + sl.kind + (sl.k === 'fullday' && filled ? ' filled-full' : '') + '">' +
                '<span class="label">' + sl.l + '</span>';
        if (filled) {
          var p = byId[filled.id], g = !!p.generic;
          var who = filled.by ? '<span class="sby" style="--who:' + whoColour(filled.by) + '">' + esc(filled.by) + '</span>' : '';
          var where = g ? (p.tbc ? esc(p.tbc) + (who ? ' · ' + who : '') : who)
                        : (p.mins === 0 ? 'at the house' : esc(p.town) + ' · ' + p.mins + ' min') + (who ? ' · ' + who : '');
          body += '<div class="slotrow' + (filled.booked ? ' bkd' : '') + '"><span class="splace">' + esc(p.name) +
                  (where ? '<span class="where">' + where + '</span>' : '') + '</span>' +
                  '<span class="slotbtns">';
          if (g && p.tbc) {
            // a rough idea: the next step is choosing the place, not booking it
            body += '<button class="cf" type="button" data-day="' + day.d + '" data-slot="' + sl.k +
                    '" aria-label="Confirm a place for ' + sl.l + ' on ' + day.dow + ' ' + day.d +
                    '" title="Choose the place - most hearted first">Confirm a place</button>';
          } else if (!g) {
            body += '<button class="bk" type="button" data-day="' + day.d + '" data-slot="' + sl.k +
                    '" aria-label="' + (filled.booked ? 'Unmark ' : 'Mark ') + esc(p.name) + ' booked, ' + sl.l + ' on ' + day.dow + ' ' + day.d +
                    '" aria-pressed="' + (filled.booked ? 'true' : 'false') + '" title="' +
                    (filled.booked ? 'Booked - tap to unmark' : 'Tap once it is booked') + '">' +
                    (filled.booked ? 'Booked' : 'Booked?') + '</button>';
          }
          body += '<button class="rm" type="button" data-day="' + day.d + '" data-slot="' + sl.k +
                  '" aria-label="Remove ' + esc(p.name) + ' from ' + sl.l + ' on ' + day.dow + ' ' +
                  day.d + '">×</button></span></div>';
        } else {
          body += '<button class="addbtn" type="button" data-day="' + day.d + '" data-slot="' + sl.k +
                  '" aria-label="Add to ' + sl.l + ', ' + day.dow + ' ' + day.d + '">+ Add</button>';
        }
        body += '</div>';
      });
      wrap.innerHTML = head + body + '</div>';
      host.appendChild(wrap);
    });
    updateCounts();
    if (focusAfter) {
      var sel2 = '[data-day="' + focusAfter.day + '"][data-slot="' + focusAfter.slot + '"]';
      var back = host.querySelector('.bk' + sel2 + ', .cf' + sel2 + ', .rm' + sel2 + ', .addbtn' + sel2);
      if (back) back.focus();
      focusAfter = null;
    }
  }
  // set by the tap handlers below: renderCalendar wipes #days, which silently threw keyboard
  // focus to the top of the page on every Booked?/remove/choose
  var focusAfter = null;
  $('days').addEventListener('click', function (ev) {
    var rm = ev.target.closest('.rm');
    if (rm) {
      focusAfter = { day: +rm.dataset.day, slot: rm.dataset.slot };
      planChange(+rm.dataset.day, rm.dataset.slot, function () { delete slotsFor(+rm.dataset.day)[rm.dataset.slot]; });
      return;
    }
    var bk = ev.target.closest('.bk');
    if (bk) {
      focusAfter = { day: +bk.dataset.day, slot: bk.dataset.slot };
      planChange(+bk.dataset.day, bk.dataset.slot, function () {
        var e = slotsFor(+bk.dataset.day)[bk.dataset.slot];
        if (e) e.booked = !e.booked;
      });
      return;
    }
    var cf = ev.target.closest('.cf');
    if (cf) { showPicker(cf, +cf.dataset.day, cf.dataset.slot, 'confirm'); return; }
    var add = ev.target.closest('.addbtn');
    if (add && !add.disabled) showPicker(add, +add.dataset.day, add.dataset.slot);
  });

  // eating slots want food first, then the terrace lunch, then somewhere to drink; the rest of
  // the day wants things to do first; an evening is drinks and gelato before it is a museum.
  // Anything unknown falls to the back rather than to the front.
  var MEAL_RANK = { eat: 0, house: 1, cellar: 2, do: 3 };
  var DO_RANK = { do: 0, house: 1, cellar: 2, eat: 3 };
  var EVE_RANK = { eat: 0, do: 1, house: 2, cellar: 3 };
  function rankFor(slot, lead) {
    if (lead) {
      // confirming a rough idea: its own section first, the others behind in the usual order
      var r = {};
      ['eat', 'do', 'cellar', 'house'].forEach(function (g, i) { r[g] = g === lead ? 0 : i + 1; });
      return r;
    }
    if (MEAL[slot]) return MEAL_RANK;
    if (slot === 'evening') return EVE_RANK;
    return DO_RANK;
  }
  function flushPlan() {
    if (!planPending || openPicker) return;
    planPending = false;
    renderCalendar();
  }
  // mode 'confirm' replaces a rough idea with a real place: same picker, no quick strip,
  // and the list leads with whatever the group has hearted most
  var HAY = {};
  // the picker had no way out but choosing: now Cancel, Escape and a tap anywhere else all close it
  var unhookPicker = null;
  function closePicker() {
    if (unhookPicker) unhookPicker();
    if (openPicker) { openPicker.remove(); openPicker = null; }
    flushPlan();
  }
  function showPicker(btn, day, slot, mode) {
    closePicker();
    var confirming = mode === 'confirm';
    var current = confirming ? byId[(slotsFor(day)[slot] || {}).id] : null;
    var lead = (current && current.confirm) || '';
    var rank = rankFor(slot, lead);
    var box = document.createElement('div');
    box.className = 'picker';
    var input = document.createElement('input');
    input.type = 'search';
    input.placeholder = confirming ? 'Search for the place' : 'Search ' + PLACES.length + ' places';
    input.setAttribute('aria-label', 'Search places to add');
    var list = document.createElement('div');
    list.className = 'plist';
    var msg = document.createElement('p');
    msg.className = 'pickmsg';
    msg.setAttribute('role', 'status');
    function choose(p) {
      if (unhookPicker) unhookPicker();
      openPicker = null;
      if (!S.me) {
        // the calendar promises "it shows who added it" - so ask, the way the first heart asks
        pendingChoice = { day: day, slot: slot, id: p.id };
        box.remove();
        flushPlan();
        openWho();
        return;
      }
      planChange(day, slot, function () { slotsFor(day)[slot] = { id: p.id, by: S.me, booked: false }; });
    }
    var quick = confirming ? [] : quickFor(slot);
    if (quick.length) {
      var qh = document.createElement('p');
      qh.className = 'pickmsg';
      qh.textContent = 'A rough idea first \u2014 the place can be confirmed once the hearts are in';
      var strip = document.createElement('div');
      strip.className = 'qp';
      quick.forEach(function (q) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'q';
        b.innerHTML = esc(q.name) + (q.tbc ? ' <em>TBC</em>' : '');
        b.addEventListener('click', function () { choose(q); });
        strip.appendChild(b);
      });
      box.appendChild(qh);
      box.appendChild(strip);
    } else if (confirming && current) {
      var ch = document.createElement('p');
      ch.className = 'pickmsg';
      ch.textContent = 'Confirming \u201c' + current.name + '\u201d \u2014 the group\u2019s hearts lead';
      box.appendChild(ch);
    }
    var cx = document.createElement('button');
    cx.type = 'button';
    cx.className = 'pkx';
    cx.textContent = 'Cancel';
    cx.addEventListener('click', closePicker);
    input.addEventListener('keydown', function (ev2) { if (ev2.key === 'Escape') closePicker(); });
    var prow = document.createElement('div');
    prow.className = 'pkrow';
    prow.appendChild(input);
    prow.appendChild(cx);
    box.appendChild(prow); box.appendChild(msg); box.appendChild(list);
    // the button may sit inside .slotbtns; the picker always belongs to the slot itself
    (btn.closest('.slot') || btn.parentNode).appendChild(box);
    openPicker = box;
    // a tap outside is a change of mind (attached a tick late, so the opening tap cannot close it)
    var onDocDown = function (ev2) { if (openPicker === box && !box.contains(ev2.target)) closePicker(); };
    setTimeout(function () { document.addEventListener('click', onDocDown, true); }, 0);
    unhookPicker = function () { document.removeEventListener('click', onDocDown, true); unhookPicker = null; };

    function fill() {
      var t = input.value.trim().toLowerCase();
      var ts = t ? fold(t).split(/\s+/).filter(Boolean) : [];
      var pool = PLACES.filter(function (p) {
        if (!ts.length) return true;
        var hay = HAY[p.id] || (HAY[p.id] = fold((p.name + ' ' + p.town + ' ' + p.desc + ' ' + p.catLabel).toLowerCase()));
        for (var i = 0; i < ts.length; i++) if (hay.indexOf(ts[i]) < 0) return false;
        return true;
      });
      pool.sort(function (a, b) {
        var as, bs, av = votes(a.id), bv = votes(b.id);
        // confirming: the votes are the point, so they come before everything else
        if (confirming && av !== bv) return bv - av;
        if (slot === 'fullday' && !lead) { as = a.mins > 45 ? 0 : 1; bs = b.mins > 45 ? 0 : 1; }
        else { as = rank[a.group]; bs = rank[b.group]; }
        if (as !== bs) return as - bs;
        if (av !== bv) return bv - av;
        var ash = S.short[a.id] ? 0 : 1, bsh = S.short[b.id] ? 0 : 1;
        if (ash !== bsh) return ash - bsh;
        return a.mins - b.mins;
      });
      list.textContent = '';
      if (!pool.length) {
        msg.textContent = 'Nothing matches that.';
        return;
      }
      // show every match, not a silent top-N; the list scrolls
      msg.textContent = pool.length + (pool.length === 1 ? ' place' : ' places') + ' · ' +
        (confirming ? 'most hearted first'
          : MEAL[slot] ? 'eating and drinking first'
          : slot === 'fullday' ? 'bigger days first'
          : slot === 'evening' ? 'drinks and gelato first' : 'things to do first');
      pool.forEach(function (p) {
        var v = votes(p.id);
        var b = document.createElement('button');
        b.className = 'pick';
        b.type = 'button';
        b.innerHTML = '<span>' + esc(p.name) + '</span>' +
                      '<span class="t">' + (v ? '♥ ' + v + ' · ' : '') + (p.mins === 0 ? 'at the house' : esc(p.town) + ' · ' + p.mins + ' min') + '</span>';
        b.addEventListener('click', function () { choose(p); });
        list.appendChild(b);
      });
    }
    input.addEventListener('input', fill);
    fill();
    input.focus();
    // the picker used to open below the fold - bring it to the thumb
    if (box.scrollIntoView) box.scrollIntoView({ block: 'nearest', behavior: SMOOTH });
  }

  function setGroup(g) {
    group = g;
    [].slice.call($('groups').children).forEach(function (x) {
      x.setAttribute('aria-pressed', x.dataset.group === group ? 'true' : 'false');
    });
    renderTiles();
  }

  /* ---------- friends' picks: shared by link, no accounts, no server ----------
     A link looks like  #picks=Frances:id,id,id  - opening it stores Frances's hearts in this
     browser, adds a "Frances ♥" chip beside Shortlisted, and marks her tiles. */
  function friendHas(name, id) { var l = S.friends[name]; return !!(l && l.indexOf(id) >= 0); }
  // little tiles: one badge per person who hearted this place, coloured by name
  // person colours are the tokens --who-1 .. --who-7 in site.css (each passes 4.5:1 with peach
  // initials); the page only ever handles the index, never a hex
  var WHO_N = 7;
  function hashColour(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return (h % WHO_N) + 1;
  }
  function whoIndex(name) {
    if (name === S.me && S.colour) return S.colour;
    if (S.fc[name]) return S.fc[name];
    return hashColour(name || 'Me');
  }
  // a chosen colour wins (yours, or one a friend chose and the store passed on); otherwise by name
  function whoColour(name) { return 'var(--who-' + whoIndex(name) + ')'; }
  function initialFor(n) {
    var first = n.charAt(0).toUpperCase();
    var all = Object.keys(S.friends).concat(S.me ? [S.me] : []);
    var clash = all.some(function (o) { return o !== n && o.charAt(0).toUpperCase() === first; });
    // Lauren and Lyndsey are both an L in the same peach - give clashes two letters
    return clash ? first + n.slice(1, 2).toLowerCase() : first;
  }
  function badge(n) {
    var ini = initialFor(n);
    return '<span class="who' + (ini.length > 1 ? ' w2' : '') + '" style="--who:' + whoColour(n) +
           '" role="img" aria-label="' + esc(n) + ' hearted this" title="' + esc(n) + ' hearted this">' +
           esc(ini) + '</span>';
  }
  // everyone who hearted this place, you included, as coloured initials beside the heart
  function likedBy(id) {
    var names = Object.keys(S.friends).filter(function (n) { return friendHas(n, id); }).sort();
    if (S.short[id] && S.me) names.push(S.me);
    return names.map(badge).join('');
  }
  // colour swatches for the welcome card and the name sheet
  function renderSwatches(hostId) {
    var host = $(hostId);
    host.textContent = '';
    var current = S.colour || hashColour(S.me || 'Me');
    for (var i = 1; i <= WHO_N; i++) (function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sw';
      b.style.setProperty('--sw', 'var(--who-' + c + ')');
      b.setAttribute('aria-label', 'Colour ' + c + ' of ' + WHO_N);
      b.setAttribute('aria-pressed', c === current ? 'true' : 'false');
      b.addEventListener('click', function () {
        S.colour = c;
        save();
        [].slice.call(host.children).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        syncHearts();
        renderTiles();
        pushPicks();
      });
      host.appendChild(b);
    })(i);
  }
  function renderFriendChips() {
    var host = $('groups');
    [].slice.call(host.querySelectorAll('[data-friend]')).forEach(function (x) { host.removeChild(x); });
    var names = Object.keys(S.friends).sort();
    names.forEach(function (n) {
      var b = document.createElement('button');
      b.className = 'chip'; b.type = 'button';
      b.dataset.group = 'friend:' + n; b.dataset.friend = n;
      b.style.setProperty('--c', 'var(--fig)');
      b.setAttribute('aria-pressed', group === 'friend:' + n ? 'true' : 'false');
      b.innerHTML = esc(n) + ' ♥ <em>' + S.friends[n].length + '</em>';
      host.appendChild(b);
    });
  }
  function updateMeChip() {
    $('me-chip').textContent = S.me ? 'You’re ' + S.me + ' · change' : 'Who’s hearting?';
  }
  function openWho() {
    sheetReturn = document.activeElement;
    $('share-name').value = S.me || '';
    renderSwatches('who-colours');
    $('who').hidden = false;
    $('share-name').focus();
  }
  // Someone else is already hearting under this name AND this phone has hearts of its own under
  // a different one: that is a second person picking a taken name, not the same person on a new
  // phone. Typing it would replace the other person's hearts on the server with yours.
  var nameBefore = '';
  function nameTaken(v, current) {
    if (!v || !S.friends[v] || !S.friends[v].length) return false;
    return !!(current && current !== v && Object.keys(S.short).length);
  }
  function whoNote(msg) {
    var el = $('who-note');
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || '';
  }
  function closeWho() {
    var v = cleanName($('share-name').value);
    if (nameTaken(v, nameBefore)) {
      whoNote(v + ' is already hearting on the shared list. If that is you, open your own link; if not, add a surname.');
      $('share-name').focus();
      return;
    }
    S.me = v;
    if (S.me && S.friends[S.me]) { delete S.friends[S.me]; renderFriendChips(); renderTiles(); }
    save();
    updateMeChip();
    whoNote('');
    $('who').hidden = true;
    focusBack();
    if (Object.keys(S.short).length) pushPicks();
    if (pendingChoice && S.me) {
      var pc = pendingChoice;
      pendingChoice = null;
      planChange(pc.day, pc.slot, function () { slotsFor(pc.day)[pc.slot] = { id: pc.id, by: S.me, booked: false }; });
    }
    pendingChoice = null;
    if (tipPending && S.me) openTip();
    tipPending = false;
  }
  function wireShare() {
    $('share-name').value = S.me || '';
    nameBefore = S.me;
    $('share-name').addEventListener('focus', function () { nameBefore = S.me; whoNote(''); });
    $('me-chip').addEventListener('click', function () { openWho(); });
    $('who-go').addEventListener('click', closeWho);
    $('share-name').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); closeWho(); }
    });
    $('share-name').addEventListener('input', function () {
      var v = cleanName(this.value);
      if (nameTaken(v, nameBefore)) {
        whoNote(v + ' is already hearting on the shared list. If that is you, open your own link; if not, add a surname.');
        return; // keep the old name until the box says something else
      }
      whoNote('');
      S.me = v;
      if (S.me && S.friends[S.me]) { delete S.friends[S.me]; renderFriendChips(); renderTiles(); }
      save();
      updateMeChip();
    });
  }

  /* ---------- tips: places the group adds themselves ----------
     Same worker, a second route. A tip is free text, so it cannot ride in the picks array
     (those ids are [a-z0-9-]); /tips holds { name: [{n,t,w,u,ts}] } and is replaced per person,
     the same last-write-wins shape as the hearts. A tip is not in PLACES, so it has no drive
     time, no pin and no heart - promote a good one into places.json and it gets all three. */
  var T = {}, lastTs = [];
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }
  function tipMapUrl(tp) {
    // encodeURIComponent throws on a lone surrogate (which the worker's own 70-char cut used to
    // create) - and this runs inside renderTips inside renderTiles, so one bad tip from anyone
    // used to stop hearts and calendar taps syncing on every phone
    try {
      return 'https://www.google.com/maps/search/?api=1&query=' +
             encodeURIComponent(tp.n + (tp.t ? ', ' + tp.t : '') + ', Italy');
    } catch (e) { return ''; }
  }
  function renderTips() {
    var ts = lastTs, host = $('grid-tips'), all = [];
    // every other filter is about categories and drive times, which a tip does not have;
    // rather than guess one, the section steps out of the way until they are cleared
    var plain = group === 'all' && !Object.keys(active).length && band === 999 && !area;
    if (plain) {
      Object.keys(T).forEach(function (who) {
        if (!Array.isArray(T[who])) return;
        T[who].forEach(function (tp) { if (tp && tp.n) all.push({ who: who, tp: tp }); });
      });
      if (ts && ts.length) {
        all = all.filter(function (x) {
          var hay = fold((x.tp.n + ' ' + (x.tp.t || '') + ' ' + (x.tp.w || '') + ' ' + x.who).toLowerCase());
          for (var i = 0; i < ts.length; i++) if (hay.indexOf(ts[i]) < 0) return false;
          return true;
        });
      }
      all.sort(function (a, b) { return (b.tp.ts || 0) - (a.tp.ts || 0); });
    }
    $('sec-tips').hidden = all.length === 0;
    $('n-tips').textContent = all.length;
    host.textContent = '';
    all.forEach(function (x) {
      var tp = x.tp, mine = x.who === S.me, url = safeUrl(tp.u);
      var el = document.createElement('article');
      el.className = 'tile tip';
      el.style.setProperty('--who', whoColour(x.who));
      el.innerHTML =
        '<div class="thead">' +
          '<div class="thead-l">' +
            '<span class="tcat">' + esc(x.who) + '’s tip</span>' +
            '<span class="tname">' + esc(tp.n) + '</span>' +
          '</div>' +
          '<div class="thead-r"><span class="likedby">' + badge(x.who) + '</span></div>' +
        '</div>' +
        '<div class="tinner">' +
          (tp.t ? '<p class="ttown">' + esc(tp.t) + '</p>' : '') +
          '<p class="tdesc">' + esc(tp.w || '') + '</p>' +
          '<div class="tfoot">' +
            '<a class="cta" href="' + esc(tipMapUrl(tp)) + '" target="_blank" rel="noopener">' +
              'Open in maps <span aria-hidden="true">↗</span></a>' +
            (url ? '<a class="cta" href="' + esc(url) + '" target="_blank" rel="noopener">' +
              'Link <span aria-hidden="true">↗</span></a>' : '') +
            (mine ? '<button class="tdrop" type="button" data-ts="' + (tp.ts || 0) + '">Remove</button>' : '') +
          '</div>' +
        '</div>';
      host.appendChild(el);
    });
  }
  var tipPending = false;
  function tipNote(m) { var el = $('tip-note'); el.hidden = !m; el.textContent = m || ''; }
  function openTip() {
    // a tip with no name behind it is the same dead end as an unnamed heart, so ask first,
    // then come straight back here rather than making them find the button again
    if (!S.me) { tipPending = true; openWho(); return; }
    tipPending = false;
    ['tip-name', 'tip-town', 'tip-why', 'tip-url'].forEach(function (id) { $(id).value = ''; });
    tipNote('');
    $('tip').hidden = false;
    $('tip-name').focus();
  }
  function saveTip() {
    var nm = ($('tip-name').value || '').trim().slice(0, 70);
    if (!nm) { tipNote('It needs a name at least.'); $('tip-name').focus(); return; }
    if (S.tips.length >= 40) { tipNote('Forty tips is the limit — remove one first.'); return; }
    S.tips.push({
      n: nm,
      t: ($('tip-town').value || '').trim().slice(0, 40),
      w: ($('tip-why').value || '').trim().slice(0, 400),
      u: safeUrl(($('tip-url').value || '').trim().slice(0, 300)),
      ts: Date.now()
    });
    save();
    T[S.me] = S.tips;
    $('tip').hidden = true;
    renderTips();
    pushTips();
  }
  function wireTips() {
    $('tip-add').addEventListener('click', openTip);
    $('tip-save').addEventListener('click', saveTip);
    $('tip-cancel').addEventListener('click', function () { $('tip').hidden = true; });
    $('grid-tips').addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('.tdrop');
      if (!b) return;
      var stamp = +b.dataset.ts;
      S.tips = S.tips.filter(function (t) { return (t.ts || 0) !== stamp; });
      save();
      T[S.me] = S.tips;
      renderTips();
      pushTips();
    });
  }
  function updateNewChip() {
    var k = PLACES.filter(isNew).length;
    $('new-chip').hidden = k === 0;
    $('new-n').textContent = k;
  }

  /* ---------- live sync: a Cloudflare Worker + KV (see worker/abruzzo-picks.js) ----------
     SYNC empty = this phone only. With SYNC set, every heart is saved under your name and everyone's
     hearts are pulled on load, on returning to the tab, and every minute. Links still work. */
  var SYNC = 'https://abruzzo-picks.mattnorthin.workers.dev';
  var syncTimer = null, syncPoll = null, syncOk = null;
  function syncNote(msg) {
    var n = $('sync-note');
    n.hidden = !msg;
    n.textContent = msg || '';
  }
  function fetchJSON(url, opts) {
    return fetch(url, opts).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.status === 204 ? null : r.json();
    });
  }
  var pulling = false, heartsMerged = false, lastPushAt = 0, lastOkAt = '';
  function hhmm(d) { return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function pullPicks(quiet) {
    if (!SYNC || !window.fetch || pulling) return;
    pulling = true;
    fetchJSON(SYNC + '/picks').then(function (all) {
      var changed = false;
      if (!all || typeof all !== 'object') all = {};
      Object.keys(all).forEach(function (n) {
        if (n.charAt(0) === '_') return; // the shared plan and any other non-person entries
        var raw = Array.isArray(all[n]) ? all[n] : [];
        var ids = raw.filter(function (id) { return byId[id]; });
        var cm = raw.filter(function (id) { return /^c-[1-7]$/.test(id); })[0];
        var col = cm ? +cm.slice(2) : 0;
        if (n === S.me) {
          if (col && !S.colour) { S.colour = col; syncHearts(); changed = true; }
          var mine = Object.keys(S.short);
          var sameSet = ids.length === mine.length && ids.every(function (id) { return S.short[id]; });
          if (!dirty && !sameSet) {
            if (!heartsMerged) {
              // first sight of the server this session: keep both sides, so a phone that hearted
              // on the plane and an iPad that hearted meanwhile both hold everything
              ids.forEach(function (id) { S.short[id] = true; });
              if (Object.keys(S.short).length > ids.length) pushPicks();
              syncHearts(); changed = true;
            } else if (Date.now() - lastPushAt > 120000) {
              // the server knows better than a phone that has not written for two minutes:
              // the same person hearting, or un-hearting, on another device
              S.short = {};
              ids.forEach(function (id) { S.short[id] = true; });
              syncHearts(); changed = true;
            } else {
              // our own write is younger than the copy that came back - send it again
              pushPicks();
            }
          }
          heartsMerged = true;
          return;
        }
        if (col && S.fc[n] !== col) { S.fc[n] = col; changed = true; }
        if (!ids.length) { if (S.friends[n]) { delete S.friends[n]; changed = true; } return; }
        if (JSON.stringify(S.friends[n] || []) !== JSON.stringify(ids)) { S.friends[n] = ids; changed = true; }
      });
      // a phone with hearts the server has never seen (a new person, or hearts made offline)
      if (S.me && !heartsMerged && !Object.prototype.hasOwnProperty.call(all, S.me)) {
        heartsMerged = true;
        if (Object.keys(S.short).length) pushPicks();
      }
      // names the server no longer has (a rename, or a stray deleted by curl) leave every phone too
      Object.keys(S.friends).forEach(function (n) {
        if (!Object.prototype.hasOwnProperty.call(all, n)) { delete S.friends[n]; delete S.fc[n]; changed = true; }
      });
      // never list yourself as a friend (happens if the server knew you before this phone did)
      if (S.me && S.friends[S.me]) { delete S.friends[S.me]; changed = true; }
      // the server's plan, with this phone's recent and unsent taps put back on top; applyPlan
      // sends them again by itself, so an outage never ends in a blind overwrite. After the
      // people, so the plan's name slugs resolve against fresh friends on the very first pull.
      var reassert = applyPlan(all._plan);
      if (planDirty && !reassert) { planDirty = false; planNote(''); }
      if (changed) { save(); renderFriendChips(); renderTiles(); }
      syncOk = true;
      if (dirty && !syncTimer) pushPicks();
      lastOkAt = hhmm(new Date());
      syncNote('Live: everyone’s hearts update by themselves' +
               (S.me ? '' : ' — tap “Who’s hearting?” so yours count') +
               '. Last checked ' + lastOkAt + '.');
    }).catch(function () {
      // say so the moment the quiet polls start failing, not only on a loud one - the clock
      // silently stopping was the only tell before
      var was = syncOk;
      syncOk = false;
      if (!quiet || was !== false) {
        syncNote('Not updating' + (lastOkAt ? ' since ' + lastOkAt : '') +
                 ' — showing what this phone knows. Hearts and calendar taps are kept and sent when it is back.');
      }
    }).then(function () { pulling = false; });
  }
  // dirty = hearts changed since the last successful save; cleared only when the server says ok,
  // so a heart tapped while offline or mid-flight is retried on the next pull, the next heart,
  // or the moment the app is backgrounded (keepalive lets that last request finish)
  var dirty = false;
  function pushNow(keepalive) {
    if (!SYNC || !window.fetch || !S.me) return;
    dirty = true;
    lastPushAt = Date.now();
    var opts = {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      // the chosen colour rides along as a pseudo-id ("c-2a7fb0") so the store needs no new field
      body: JSON.stringify({ ids: Object.keys(S.short).concat(S.colour ? ['c-' + S.colour] : []) })
    };
    if (keepalive) opts.keepalive = true;
    fetchJSON(SYNC + '/picks/' + encodeURIComponent(S.me), opts)
      .then(function () { dirty = false; if (!keepalive) pullPicks(true); })
      .catch(function () { syncNote('Saved on this phone \u2014 it will send itself when the connection is back.'); });
  }
  function pushPicks() {
    if (!SYNC || !window.fetch || !S.me) return;
    dirty = true;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () { syncTimer = null; pushNow(false); }, 300);
  }
  function pullTips() {
    if (!SYNC || !window.fetch) return;
    fetchJSON(SYNC + '/tips').then(function (all) {
      T = (all && typeof all === 'object') ? all : {};
      // this phone has forgotten its own tips but the server still has them: take them back,
      // rather than letting the next save replace everyone's copy with an empty list
      if (S.me && !S.tips.length && Array.isArray(T[S.me]) && T[S.me].length) {
        S.tips = T[S.me].slice(0, 40);
        save();
      }
      if (S.me) T[S.me] = S.tips;
      renderTips();
    }).catch(function () { /* an old worker with no /tips route just means no shared tips */ });
  }
  function pushTips() {
    if (!SYNC || !window.fetch || !S.me) return;
    fetchJSON(SYNC + '/tips/' + encodeURIComponent(S.me), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tips: S.tips })
    }).then(function () { tipNote(''); pullTips(); })
      .catch(function () {
        tipNote('Could not reach the shared list — that one is on this phone only for now.');
      });
  }
  function forgetRemote(name) {
    if (!SYNC || !window.fetch || !name) return;
    fetchJSON(SYNC + '/picks/' + encodeURIComponent(name), { method: 'DELETE' }).catch(function () {});
  }
  function wireSync() {
    if (!SYNC || !window.fetch) return;
    $('share-name').addEventListener('change', function () {
      // `nameBefore && nameBefore !== S.me` alone fires on an emptied box too, sending DELETE
      // /picks/Matt and removing that person's hearts for everybody. Only hand over to a real new one.
      if (nameBefore && S.me && nameBefore !== S.me) forgetRemote(nameBefore);
      nameBefore = S.me;
      pushPicks();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') { pullPicks(true); pullTips(); }
      else if (dirty) { clearTimeout(syncTimer); syncTimer = null; pushNow(true); }
    });
    // Poll every 60s, not 30s, and fetch tips only every other tick. Each /picks and /tips call
    // costs a KV *list* on the worker and the free plan allows 1,000 lists a day - at 30s with
    // both, one open phone burns the lot in about four hours. This is a quarter of that traffic.
    var tick = 0;
    syncPoll = setInterval(function () {
      // a tab nobody is looking at does not poll - a laptop left open in the background was
      // spending the whole day's quota on its own; it catches up on visibilitychange
      if (document.hidden) return;
      pullPicks(true);
      if (++tick % 2 === 0) pullTips();
    }, 60000);
    pullPicks();
    pullTips();
  }

  // sixty tiles deep in Activities, a fixed pill leads back to search and filters
  (function () {
    var bf = $('backfilters');
    if (!bf) return;
    var waiting = false;
    var checkBf = function () {
      waiting = false;
      bf.hidden = $('v-activities').hidden || window.scrollY < 1800;
    };
    window.addEventListener('scroll', function () {
      if (!waiting) { waiting = true; (window.requestAnimationFrame || window.setTimeout)(checkBf); }
    }, { passive: true });
    bf.addEventListener('click', function () {
      var q = $('q');
      if (q && q.scrollIntoView) q.scrollIntoView({ block: 'center', behavior: SMOOTH });
    });
  })();

  load();
  buildTiles();
  syncHearts();
  wireShelf();
  wireShare();
  wireTips();
  wireWelcome();
  wirePlace();
  var fromLink = readMeParam();
  if (fromLink) {
    if (fromLink !== S.me) {
      // a different person's link on a phone that already had a name (Matt checking Frances's
      // link, or a shared iPad): the hearts on this phone belong to the old name and are safe on
      // the server, so start the new name with none rather than re-filing them under it
      if (S.me) { S.short = {}; syncHearts(); }
      S.me = fromLink;
      S.welcomed = false;
    }
    if (S.friends[S.me]) delete S.friends[S.me];
    save();
  }
  updateMeChip();
  updateNewChip();
  renderFriendChips();
  renderCalendar();
  renderTiles();
  wireSync();
  // a name is what makes hearts travel, so ask again on any phone that has none - including
  // one welcomed by an older build, before the name was asked for
  if (!S.welcomed || !S.me) showWelcome();
})();
