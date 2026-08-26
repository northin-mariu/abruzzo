(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var byId = {};
  PLACES.forEach(function (p) { byId[p.id] = p; });

  /* ---------- state, persisted per browser ---------- */
  var KEY = 'abruzzo-2026';
  var S = { short: {}, plan: {}, friends: {}, me: '' };
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
            if (typeof v === 'string' && byId[v]) S.plan[d][s.k] = v;
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
      if (typeof o.me === 'string') S.me = o.me.slice(0, 24);
    } catch (e) { /* corrupt storage must never break the page */ }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }

  var DAYS = [
    { d: 11, dow: 'Fri', fixed: [{ t: 'arrive', l: 'Matt, Sam and Vero land 16:30' }] },
    { d: 12, dow: 'Sat', weekend: true },
    { d: 13, dow: 'Sun', weekend: true, note: 'Shops and markets shut' },
    { d: 14, dow: 'Mon', mon: true, note: 'Your only Monday - museums shut',
      fixed: [{ t: 'arrive', l: 'Lyndsey, Frances and Anthony land 20:40' }] },
    { d: 15, dow: 'Tue' },
    { d: 16, dow: 'Wed', fixed: [{ t: 'bday', l: "Lyndsey's birthday" }] },
    { d: 17, dow: 'Thu', fixed: [{ t: 'bday', l: "Matt's birthday" }, { t: 'arrive', l: 'Lauren lands 09:50' }] },
    { d: 18, dow: 'Fri' },
    { d: 19, dow: 'Sat', weekend: true },
    { d: 20, dow: 'Sun', weekend: true, note: 'Shops and markets shut',
      fixed: [{ t: 'leave', l: 'Everyone flies home 19:25' }] }
  ];
  var SLOTS = [
    { k: 'morning', l: 'Morning' }, { k: 'fullday', l: 'Full day' },
    { k: 'lunch', l: 'Lunch' }, { k: 'dinner', l: 'Dinner' }
  ];
  var MEAL = { lunch: 1, dinner: 1 };

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
  }
  TABS.forEach(function (pair) {
    $(pair[0]).addEventListener('click', function () {
      showTab(pair[0]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* ---------- activities ---------- */
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.9-10-9.3C.4 8.6 2.2 5' +
              ' 5.6 5c2 0 3.3 1.1 4.4 2.6C11.1 6.1 12.4 5 14.4 5c3.4 0 5.2 3.6 3.6 6.7C19.5 16.1 12 21 12 21z"/></svg>';
  var tiles = [];

  function buildTiles() {
    ['eat', 'do'].forEach(function (g) {
      var frag = document.createDocumentFragment();
      PLACES.filter(function (p) { return p.group === g; }).forEach(function (p) {
        var el = document.createElement('article');
        el.className = 'tile ' + g;
        el.style.setProperty('--tile', p.fill);
        el.innerHTML =
          '<div class="thead">' +
            '<div class="thead-l">' +
              '<span class="tcat">' + esc(p.catLabel) + '</span>' +
              '<a class="tname" href="' + esc(p.mapUrl) + '" target="_blank" rel="noopener">' +
                esc(p.name) + '</a>' +
              (p.flag ? '<span class="tflag">' + esc(p.flag) + '</span>' : '') +
            '</div>' +
            '<div class="thead-r">' +
              '<span class="likedby" aria-label="Hearted by"></span>' +
              '<button class="heart" type="button" data-id="' + esc(p.id) + '" aria-pressed="false"' +
                ' aria-label="Shortlist ' + esc(p.name) + '">' + HEART + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="tinner">' +
            '<p class="ttown">' + esc(p.town) + ' &#183; ' + p.mins + ' min</p>' +
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
    $('grid-eat').addEventListener('click', onHeart);
    $('grid-do').addEventListener('click', onHeart);
  }
  function onHeart(ev) {
    var b = ev.target.closest('.heart');
    if (!b) return;
    var id = b.dataset.id;
    if (S.short[id]) delete S.short[id]; else S.short[id] = true;
    save();
    syncHearts();
    if (group === 'short') renderTiles();
    else updateCounts();
    if (!$('share-panel').hidden) refreshShare();
    pushPicks();
    // first heart and no name yet: open the share panel so the hearts can travel under a name
    if (!S.me && S.short[id] && Object.keys(S.short).length === 1) openWho();
  }
  function syncHearts() {
    tiles.forEach(function (el) {
      var on = !!S.short[el._p.id];
      el._heart.classList.toggle('on', on);
      el._heart.setAttribute('aria-pressed', on ? 'true' : 'false');
      el._heart.setAttribute('aria-label', (on ? 'Remove ' : 'Shortlist ') + el._p.name);
    });
  }
  function whereInPlan(id) {
    var out = [];
    DAYS.forEach(function (d) {
      var slots = S.plan[d.d];
      if (!slots) return;
      SLOTS.forEach(function (s) {
        if (slots[s.k] === id) out.push(d.dow + ' ' + d.d + ' · ' + s.l.toLowerCase());
      });
    });
    return out;
  }

  var active = {}, band = 999, term = '', group = 'all', area = false;
  // "Pescara" chip: the airport side of the coast, for landing nights and Pescara evenings.
  var AREA_TOWNS = { 'Pescara': 1, 'Montesilvano': 1, 'Francavilla al Mare': 1 };

  function inGroup(p) {
    if (group === 'eat' || group === 'do') return p.group === group;
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
    var n = { eat: 0, do: 0 };
    tiles.forEach(function (el) {
      var ok = passes(el._p, el._hay, ts);
      el.hidden = !ok;
      if (ok) {
        n[el._p.group]++;
        var w = whereInPlan(el._p.id);
        el._plan.textContent = w.length ? 'In your calendar · ' + w.join(' · ') : '';
        el._liked.innerHTML = likedBy(el._p.id);
      }
      // in the Votes view the grid re-sorts by popularity; elsewhere it keeps drive-time order
      el.style.order = group === 'votes' ? String(1000 - votes(el._p.id)) : '';
    });
    $('sec-eat').hidden = n.eat === 0;
    $('sec-do').hidden = n.do === 0;
    $('n-eat').textContent = n.eat;
    $('n-do').textContent = n.do;
    var total = n.eat + n.do;
    var bits = [total + (total === 1 ? ' place' : ' places')];
    if (group === 'eat') bits.push('eat & drink');
    else if (group === 'do') bits.push('out and about');
    else if (group === 'short') bits.push('shortlisted');
    else if (group === 'votes') bits.push('with votes, most first');
    else if (group.indexOf('friend:') === 0) bits.push(group.slice(7) + "'s picks");
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
      $('map-note').textContent = 'The map could not load - check the connection and try again.';
    };
    document.head.appendChild(js);
  }
  function initMap() {
    map = L.map('map', { scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    L.marker([HOUSE.lat, HOUSE.lon], {
      icon: L.divIcon({ className: '', html: '<div class="pin house"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
      zIndexOffset: 1000
    }).addTo(map).bindPopup('<b>' + HOUSE.name + '</b>Villa Grotta delle Farfalle, Rocca San Giovanni');
    pinLayer = L.layerGroup().addTo(map);
    drawPins();
  }
  function drawPins() {
    pinLayer.clearLayers();
    var pts = [[HOUSE.lat, HOUSE.lon]];
    tiles.forEach(function (el) {
      var p = el._p;
      if (el.hidden || typeof p.lat !== 'number') return;
      var approx = p.geo === 'town';
      var liked = !!S.short[p.id] || likedBy(p.id) !== '';
      var m = L.marker([p.lat, p.lon], {
        icon: L.divIcon({
          className: '',
          html: '<div class="pin' + (approx ? ' approx' : '') + (liked ? ' liked' : '') +
                '" style="--pin:' + p.fill + '"></div>',
          iconSize: [14, 14], iconAnchor: [7, 7]
        }),
        title: p.name
      });
      m.bindPopup('<b>' + esc(p.name) + '</b>' + esc(p.catLabel) + ' &#183; ' + esc(p.town) +
                  ' &#183; ' + p.mins + ' min' + (approx ? ' &#183; <i>town centre, not exact</i>' : '') +
                  (p.flag ? '<br>' + esc(p.flag) : '') +
                  '<br><a href="' + esc(p.mapUrl) + '" target="_blank" rel="noopener">Open in Google Maps &#8599;</a>');
      pinLayer.addLayer(m);
      pts.push([p.lat, p.lon]);
    });
    if (pts.length > 1) map.fitBounds(pts, { padding: [24, 24], maxZoom: 13 });
    else map.setView([HOUSE.lat, HOUSE.lon], 11);
  }
  function wireMap() {
    $('map-btn').addEventListener('click', function () {
      var panel = $('map-panel'), btn = this;
      panel.hidden = !panel.hidden;
      btn.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
      btn.textContent = panel.hidden ? 'Show map' : 'Hide map';
      if (panel.hidden) return;
      if (map) { map.invalidateSize(); drawPins(); return; }
      loadLeaflet(function () { initMap(); });
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
    $('q').addEventListener('input', function () {
      term = this.value.trim().toLowerCase();
      renderTiles();
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
  function slotsFor(d) { return (S.plan[d] = S.plan[d] || {}); }
  function blocked(d, k) {
    var s = slotsFor(d);
    return k === 'fullday' ? !!(s.morning || s.lunch || s.dinner) : !!s.fullday;
  }
  function renderCalendar() {
    var host = $('days');
    host.textContent = '';
    DAYS.forEach(function (day) {
      var s = slotsFor(day.d);
      var wrap = document.createElement('article');
      wrap.className = 'day' + (day.mon ? ' mon' : (day.weekend ? ' weekend' : ''));
      var head = '<div class="dhead"><span class="ddate">' + day.dow + ' ' + day.d + ' Sep</span>' +
        (day.note ? '<span class="dnote">' + esc(day.note) + '</span>' : '') + '</div>';
      if (day.fixed && day.fixed.length) {
        head += '<div class="dfixed">' + day.fixed.map(function (f) {
          return '<span class="fx fx-' + f.t + '">' + esc(f.l) + '</span>';
        }).join('') + '</div>';
      }
      var body = '<div class="slots">';
      SLOTS.forEach(function (sl) {
        var filled = s[sl.k], bl = !filled && blocked(day.d, sl.k);
        body += '<div class="slot' + (sl.k === 'fullday' && filled ? ' filled-full' : '') +
                (bl ? ' blocked' : '') + '">' +
                '<span class="label">' + sl.l + '</span>';
        if (filled) {
          var p = byId[filled];
          body += '<div class="slotrow"><span class="splace">' + esc(p.name) +
                  '<span class="where">' + esc(p.town) + ' · ' + p.mins + ' min</span></span>' +
                  '<button class="rm" type="button" data-day="' + day.d + '" data-slot="' + sl.k +
                  '" aria-label="Remove ' + esc(p.name) + ' from ' + sl.l + ' on ' + day.dow + ' ' +
                  day.d + '">×</button></div>';
        } else {
          body += '<button class="addbtn" type="button" data-day="' + day.d + '" data-slot="' + sl.k + '"' +
                  (bl ? ' disabled' : '') + '>' +
                  (bl ? (sl.k === 'fullday' ? 'Day already has plans' : 'Full day booked') : '+ Add') +
                  '</button>';
        }
        body += '</div>';
      });
      wrap.innerHTML = head + body + '</div>';
      host.appendChild(wrap);
    });
    updateCounts();
  }
  $('days').addEventListener('click', function (ev) {
    var rm = ev.target.closest('.rm');
    if (rm) {
      delete slotsFor(+rm.dataset.day)[rm.dataset.slot];
      save(); renderCalendar(); renderTiles();
      return;
    }
    var add = ev.target.closest('.addbtn');
    if (add && !add.disabled) showPicker(add, +add.dataset.day, add.dataset.slot);
  });

  function showPicker(btn, day, slot) {
    if (openPicker) { openPicker.remove(); openPicker = null; }
    var box = document.createElement('div');
    box.className = 'picker';
    var input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Search ' + PLACES.length + ' places';
    input.setAttribute('aria-label', 'Search places to add');
    var list = document.createElement('div');
    list.className = 'plist';
    var msg = document.createElement('p');
    msg.className = 'pickmsg';
    box.appendChild(input); box.appendChild(msg); box.appendChild(list);
    btn.parentNode.appendChild(box);
    openPicker = box;

    function fill() {
      var t = input.value.trim().toLowerCase();
      var ts = t ? fold(t).split(/\s+/).filter(Boolean) : [];
      var pool = PLACES.filter(function (p) {
        if (!ts.length) return true;
        var hay = fold((p.name + ' ' + p.town + ' ' + p.desc + ' ' + p.catLabel).toLowerCase());
        for (var i = 0; i < ts.length; i++) if (hay.indexOf(ts[i]) < 0) return false;
        return true;
      });
      pool.sort(function (a, b) {
        var as, bs;
        if (MEAL[slot]) { as = a.group === 'eat' ? 0 : 1; bs = b.group === 'eat' ? 0 : 1; }
        else if (slot === 'fullday') { as = a.mins > 45 ? 0 : 1; bs = b.mins > 45 ? 0 : 1; }
        else { as = a.group === 'do' ? 0 : 1; bs = b.group === 'do' ? 0 : 1; }
        if (as !== bs) return as - bs;
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
        (MEAL[slot] ? 'eating and drinking first'
                    : (slot === 'fullday' ? 'bigger days first' : 'things to do first'));
      pool.forEach(function (p) {
        var b = document.createElement('button');
        b.className = 'pick';
        b.type = 'button';
        b.innerHTML = '<span>' + (S.short[p.id] ? '♥ ' : '') + esc(p.name) + '</span>' +
                      '<span class="t">' + esc(p.town) + ' · ' + p.mins + ' min</span>';
        b.addEventListener('click', function () {
          slotsFor(day)[slot] = p.id;
          openPicker = null;
          save(); renderCalendar(); renderTiles();
        });
        list.appendChild(b);
      });
    }
    input.addEventListener('input', fill);
    fill();
    input.focus();
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
  var SITE = 'https://northin-mariu.github.io/abruzzo/';
  function friendHas(name, id) { var l = S.friends[name]; return !!(l && l.indexOf(id) >= 0); }
  // little tiles: one badge per person who hearted this place, coloured by name
  var WHO_COLOURS = ['#8D3B5E', '#2A7FB0', '#6B7A3A', '#C0552F', '#1B655F', '#8E3B1A', '#455CEC', '#A140BC'];
  function whoColour(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return WHO_COLOURS[h % WHO_COLOURS.length];
  }
  function likedBy(id) {
    var names = Object.keys(S.friends).filter(function (n) { return friendHas(n, id); }).sort();
    return names.map(function (n) {
      return '<span class="who" style="--who:' + whoColour(n) + '" title="' + esc(n) + ' hearted this">' +
             esc(n.charAt(0).toUpperCase()) + '</span>';
    }).join('');
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
    var fl = $('share-friends');
    fl.textContent = '';
    names.forEach(function (n) {
      var b = document.createElement('button');
      b.className = 'chip'; b.type = 'button'; b.dataset.forget = n;
      b.textContent = 'Forget ' + n;
      fl.appendChild(b);
    });
  }
  function shareLink() {
    var name = ($('share-name').value || '').trim().slice(0, 24);
    var ids = Object.keys(S.short);
    if (!name || !ids.length) return '';
    return SITE + '#picks=' + encodeURIComponent(name) + ':' + ids.join(',');
  }
  function updateMeChip() {
    $('me-chip').textContent = S.me ? 'You’re ' + S.me + ' · change' : 'Who’s hearting?';
  }
  function openWho() {
    $('share-name').value = S.me || '';
    $('who').hidden = false;
    $('share-name').focus();
  }
  function closeWho() {
    S.me = ($('share-name').value || '').trim().slice(0, 24);
    if (S.me && S.friends[S.me]) { delete S.friends[S.me]; renderFriendChips(); renderTiles(); }
    save();
    updateMeChip();
    $('who').hidden = true;
    pushPicks();
    if (!$('share-panel').hidden) refreshShare();
  }
  function refreshShare() {
    refreshTally();
    // the link route is a fallback: only shown when there is no live store, or it is unreachable
    var lb = $('linkbox');
    lb.hidden = !!(SYNC && syncOk !== false);
    if (lb.hidden) return;
    var link = shareLink();
    var name = S.me || '';
    var n = Object.keys(S.short).length;
    $('share-link').value = link;
    $('share-link').hidden = !link;
    $('share-copy').disabled = !link;
    var wa = $('share-wa');
    if (link) {
      wa.href = 'https://wa.me/?text=' + encodeURIComponent(name + "'s Abruzzo picks: " + link);
      wa.removeAttribute('aria-disabled');
    } else { wa.href = '#'; wa.setAttribute('aria-disabled', 'true'); }
    $('share-hint').textContent =
      !name ? 'Put your name in first.' :
      !n ? 'Heart a few places first - the link carries your hearts.' :
      'Your ' + n + (n === 1 ? ' heart is' : ' hearts are') + ' in this link. Paste it in the group: ' +
      'anyone who opens it gets a "' + name + ' ♥" chip next to Shortlisted. ' +
      'Send it again whenever you change your mind.';
  }
  function tallyText() {
    var rows = PLACES.filter(function (p) { return votes(p.id) > 0; });
    if (!rows.length) return '';
    rows.sort(function (a, b) { return votes(b.id) - votes(a.id) || a.mins - b.mins; });
    var people = Object.keys(S.friends).sort();
    if (Object.keys(S.short).length) people.push(S.me || 'Me');
    var out = ['Abruzzo picks - ' + rows.length + ' places, ' + people.length +
               (people.length === 1 ? ' person' : ' people') + ' (' + people.join(', ') + ')', ''];
    ['eat', 'do'].forEach(function (g) {
      var sub = rows.filter(function (p) { return p.group === g; });
      if (!sub.length) return;
      out.push(g === 'eat' ? 'EAT & DRINK' : 'OUT AND ABOUT');
      sub.forEach(function (p) {
        out.push(votes(p.id) + ' ♥  ' + p.name + ' - ' + p.town + ', ' + p.mins + ' min' +
                 (p.flag ? ' [' + p.flag + ']' : '') + '  (' + voters(p.id).join(', ') + ')');
      });
      out.push('');
    });
    return out.join('\n').trim();
  }
  function refreshTally() {
    var t = tallyText();
    $('tally-text').value = t;
    $('tally-text').hidden = !t;
    $('tally-copy').disabled = !t;
    var wa = $('tally-wa');
    if (t) { wa.href = 'https://wa.me/?text=' + encodeURIComponent(t); wa.removeAttribute('aria-disabled'); }
    else { wa.href = '#'; wa.setAttribute('aria-disabled', 'true'); }
  }
  function wireShare() {
    $('share-name').value = S.me || '';
    $('tally-copy').addEventListener('click', function () {
      var t = tallyText();
      if (!t) return;
      var btn = this;
      function done(ok) {
        btn.textContent = ok ? 'Copied' : 'Copy the text below';
        setTimeout(function () { btn.textContent = 'Copy tally'; }, 2500);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(function () { done(true); }, function () { done(false); });
      } else { done(false); }
    });
    $('tally-text').addEventListener('focus', function () { this.select(); });
    $('share-btn').addEventListener('click', function () {
      var p = $('share-panel');
      p.hidden = !p.hidden;
      this.setAttribute('aria-expanded', p.hidden ? 'false' : 'true');
      if (!p.hidden) refreshShare();
    });
    $('me-chip').addEventListener('click', function () { openWho(); });
    $('who-go').addEventListener('click', closeWho);
    $('share-name').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { ev.preventDefault(); closeWho(); }
    });
    $('share-name').addEventListener('input', function () {
      S.me = this.value.trim().slice(0, 24);
      if (S.me && S.friends[S.me]) { delete S.friends[S.me]; renderFriendChips(); renderTiles(); }
      save();
      updateMeChip();
      if (!$('share-panel').hidden) refreshShare();
    });
    $('share-copy').addEventListener('click', function () {
      var link = shareLink();
      if (!link) return;
      var btn = this;
      function done(ok) {
        btn.textContent = ok ? 'Copied' : 'Copy the link below';
        if (!ok) { $('share-link').focus(); }
        setTimeout(function () { btn.textContent = 'Copy link'; }, 2500);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(function () { done(true); }, function () { done(false); });
      } else { done(false); }
    });
    $('share-link').addEventListener('focus', function () { this.select(); });
    $('share-friends').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-forget]');
      if (!b) return;
      delete S.friends[b.dataset.forget];
      forgetRemote(b.dataset.forget);
      save();
      if (group === 'friend:' + b.dataset.forget) group = 'all';
      renderFriendChips();
      setGroup(group);
    });
  }
  /* ---------- live sync: a Cloudflare Worker + KV (see worker/abruzzo-picks.js) ----------
     SYNC empty = links only. With SYNC set, every heart is saved under your name and everyone's
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
  function pullPicks(quiet) {
    if (!SYNC || !window.fetch) return;
    fetchJSON(SYNC + '/picks').then(function (all) {
      var changed = false;
      Object.keys(all || {}).forEach(function (n) {
        if (n === S.me) return;
        var ids = (all[n] || []).filter(function (id) { return byId[id]; });
        if (!ids.length) { if (S.friends[n]) { delete S.friends[n]; changed = true; } return; }
        if (JSON.stringify(S.friends[n] || []) !== JSON.stringify(ids)) { S.friends[n] = ids; changed = true; }
      });
      // never list yourself as a friend (happens if the server knew you before this phone did)
      if (S.me && S.friends[S.me]) { delete S.friends[S.me]; changed = true; }
      if (changed) { save(); renderFriendChips(); renderTiles(); }
      syncOk = true;
      if (!$('share-panel').hidden) refreshShare();
      var now = new Date();
      syncNote('Live: everyone’s hearts update by themselves' +
               (S.me ? '' : ' — tap “Who’s hearting?” so yours count') +
               '. Last checked ' + ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2) + '.');
    }).catch(function () {
      syncOk = false;
      if (!$('share-panel').hidden) refreshShare();
      if (!quiet) syncNote('Could not reach the shared list — showing what this phone knows. You can share by link below.');
    });
  }
  function pushPicks() {
    if (!SYNC || !window.fetch || !S.me) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      fetchJSON(SYNC + '/picks/' + encodeURIComponent(S.me), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Object.keys(S.short) })
      }).then(function () { pullPicks(true); })
        .catch(function () { syncNote('Could not save to the shared list just now - it will retry on your next heart.'); });
    }, 800);
  }
  function forgetRemote(name) {
    if (!SYNC || !window.fetch || !name) return;
    fetchJSON(SYNC + '/picks/' + encodeURIComponent(name), { method: 'DELETE' }).catch(function () {});
  }
  function wireSync() {
    if (!SYNC || !window.fetch) return;
    var before = S.me;
    $('share-name').addEventListener('focus', function () { before = S.me; });
    $('share-name').addEventListener('change', function () {
      if (before && before !== S.me) forgetRemote(before);
      before = S.me;
      pushPicks();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') pullPicks(true);
    });
    syncPoll = setInterval(function () { if (document.visibilityState === 'visible') pullPicks(true); }, 30000);
    pullPicks();
    if (S.me && Object.keys(S.short).length) pushPicks();
  }

  function importHash() {
    var m = /^#picks=([^:]+):(.*)$/.exec(location.hash || '');
    if (!m) return '';
    var name, ids;
    try { name = decodeURIComponent(m[1]).trim().slice(0, 24); } catch (e) { return ''; }
    ids = m[2].split(',').filter(function (id) { return byId[id]; });
    if (!name || !ids.length) return '';
    S.friends[name] = ids;
    save();
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    return 'friend:' + name;
  }

  load();
  var imported = importHash();
  buildTiles();
  syncHearts();
  wireShelf();
  wireShare();
  updateMeChip();
  wireMap();
  renderFriendChips();
  renderCalendar();
  if (imported) { showTab('t-activities'); setGroup(imported); }
  else renderTiles();
  wireSync();
})();
