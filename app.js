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
    if (group.indexOf('friend:') === 0) return friendHas(group.slice(7), p.id);
    return true;
  }
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
  function refreshShare() {
    var link = shareLink();
    var name = ($('share-name').value || '').trim();
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
  function wireShare() {
    $('share-name').value = S.me || '';
    $('share-btn').addEventListener('click', function () {
      var p = $('share-panel');
      p.hidden = !p.hidden;
      this.setAttribute('aria-expanded', p.hidden ? 'false' : 'true');
      if (!p.hidden) { refreshShare(); if (!S.me) $('share-name').focus(); }
    });
    $('share-name').addEventListener('input', function () {
      S.me = this.value.trim().slice(0, 24);
      save();
      refreshShare();
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
      save();
      if (group === 'friend:' + b.dataset.forget) group = 'all';
      renderFriendChips();
      setGroup(group);
    });
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
  renderFriendChips();
  renderCalendar();
  if (imported) { showTab('t-activities'); setGroup(imported); }
  else renderTiles();
})();
