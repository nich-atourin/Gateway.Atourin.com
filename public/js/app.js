(function () {
  var CACHE_KEY = 'atourin_gateway_cfg_v1';
  var MIN_LOADER_MS = 3900; // matches the loader animation loop
  var MAX_WAIT_MS = 8000; // never keep visitors on the loader longer than this
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var mainEl = document.getElementById('main');
  var loader = document.getElementById('loader');
  var $ = function (id) { return document.getElementById(id); };

  // ---------- tiny DOM helper ----------
  function h(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function iconNode(item, imgAlt) {
    if (item.iconUrl) {
      var img = h('img');
      img.src = item.iconUrl;
      img.alt = imgAlt || '';
      img.loading = 'lazy';
      return img;
    }
    var wrap = document.createElement('span');
    wrap.innerHTML = window.atourinIconSvg(item.icon);
    return wrap.firstChild;
  }
  function linkOrBox(url, cls) {
    if (!url) return h('div', cls + ' no-link');
    var a = h('a', cls);
    a.href = url;
    if (/^https?:/i.test(url)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    return a;
  }

  // ---------- loader / reveal ----------
  function reveal() {
    loader.classList.add('done');
    mainEl.classList.add('reveal');
  }

  // ---------- data ----------
  function loadConfig() {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, MAX_WAIT_MS - 500);
    return fetch('/api/config', { signal: ctrl ? ctrl.signal : undefined, headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (cfg) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(cfg)); } catch (e) {}
        return cfg;
      })
      .catch(function () {
        try { var c = localStorage.getItem(CACHE_KEY); return c ? JSON.parse(c) : null; } catch (e) { return null; }
      })
      .then(function (cfg) { clearTimeout(timer); return cfg; });
  }

  // ---------- renderers ----------
  function renderButtons(list) {
    var row = $('official');
    row.textContent = '';
    list.forEach(function (b) {
      var a = linkOrBox(b.url, 'official-item');
      var ico = h('span', 'ico');
      ico.appendChild(iconNode(b, b.label));
      a.appendChild(ico);
      a.appendChild(h('span', 'lbl', b.label));
      row.appendChild(a);
    });
    row.style.display = list.length ? '' : 'none';
  }

  var UNIT_LABEL = { d: 'Days', h: 'Hrs.', m: 'Min.', s: 'Sec.' };
  var UNIT_MS = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
  var UNIT_ORDER = ['d', 'h', 'm', 's'];

  function pad(n) { return String(n).padStart(2, '0'); }

  var cards = []; // { el, ev, win, label, cd, cells:{u:node}, ended }
  var emptyEl = $('eventsEmpty');

  var THUMBS = [
    '<circle cx="78" cy="20" r="12" fill="#FFC442"/><path d="M0 70 L22 50 L40 64 L58 42 L76 60 L100 46 L100 100 L0 100 Z" fill="#7068D5" fill-opacity="0.22"/><path d="M0 82 L26 62 L46 78 L66 52 L88 74 L100 58 L100 100 L0 100 Z" fill="#7068D5" fill-opacity="0.36"/>',
    '<circle cx="78" cy="20" r="12" fill="#7068D5"/><path d="M0 74 L18 48 L38 66 L56 38 L74 62 L100 44 L100 100 L0 100 Z" fill="#B87E00" fill-opacity="0.2"/><path d="M0 86 L24 58 L44 78 L62 46 L82 70 L100 52 L100 100 L0 100 Z" fill="#B87E00" fill-opacity="0.32"/>'
  ];
  var PIN = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/></svg>';
  var CAL = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
  var CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/></svg>';

  function metaRow(svg, text) {
    var r = h('div', 'emeta-row');
    r.innerHTML = svg;
    r.appendChild(h('span', null, text));
    return r;
  }

  function renderEvents(list, offset) {
    var wrap = $('events');
    wrap.querySelectorAll('.event-card').forEach(function (n) { n.remove(); });
    cards = [];

    // Soonest start first: events already running naturally come before upcoming ones.
    list.slice().sort(function (a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; }).forEach(function (ev, i) {
      var win = window.atourinEventWindow(ev, offset);
      var card = linkOrBox(ev.url, 'event-card');

      var top = h('div', 'etop');
      var thumb = h('div', 'ethumb ' + (i % 2 ? 'theme-b' : 'theme-a'));
      if (ev.image) {
        var img = h('img');
        img.src = ev.image;
        img.alt = '';
        img.loading = 'lazy';
        img.onerror = function () { img.remove(); thumb.insertAdjacentHTML('afterbegin', '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">' + THUMBS[i % 2] + '</svg>'); };
        thumb.appendChild(img);
      } else {
        thumb.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">' + THUMBS[i % 2] + '</svg>';
      }
      thumb.appendChild(h('span', 'ethumb-dot'));
      top.appendChild(thumb);

      var content = h('div', 'econtent');
      content.appendChild(h('div', 'ename', ev.title));
      var meta = h('div', 'emeta');
      if (ev.location) meta.appendChild(metaRow(PIN, ev.location));
      meta.appendChild(metaRow(CAL, ev.dateLabel || window.atourinAutoDate(ev.start, ev.end)));
      content.appendChild(meta);
      top.appendChild(content);
      card.appendChild(top);

      var row = h('div', 'ecd-row');
      var label = h('div', 'ecd-label', 'Dimulai dalam');
      var cd = h('div', 'ecd');
      var units = UNIT_ORDER.filter(function (u) { return (ev.units || UNIT_ORDER).indexOf(u) !== -1; });
      var cells = {};
      units.forEach(function (u, k) {
        if (k) cd.appendChild(h('span', 'colon', ':'));
        var cell = h('div', 'cell');
        var n = h('span', 'n', '–');
        cell.appendChild(n);
        cell.appendChild(h('span', 'u', UNIT_LABEL[u]));
        cd.appendChild(cell);
        cells[u] = n;
      });
      row.appendChild(label);
      row.appendChild(cd);
      card.appendChild(row);

      wrap.insertBefore(card, emptyEl);
      cards.push({ el: card, ev: ev, win: win, label: label, cd: cd, cells: cells, units: units, row: row });
    });
  }

  function tick() {
    var now = new Date();
    var visible = 0;
    cards.forEach(function (c) {
      var w = c.win;
      var ongoing = now >= w.start && now <= w.end;
      var ended = now > w.end;
      var notYet = !ongoing && !ended && w.from && now < w.from;

      if (ended || notYet) { c.el.style.display = 'none'; return; }
      c.el.style.display = 'flex';
      visible++;

      c.el.classList.toggle('ongoing-card', ongoing);
      c.label.textContent = ongoing ? 'Berakhir dalam' : 'Dimulai dalam';

      var diff = Math.max(0, (ongoing ? w.end : w.start) - now);
      // Hidden larger units are absorbed by the largest visible one (e.g. no "days" -> hours can exceed 24).
      var rest = diff;
      c.units.forEach(function (u) {
        var v = Math.floor(rest / UNIT_MS[u]);
        rest -= v * UNIT_MS[u];
        c.cells[u].textContent = pad(v);
      });

      var days = diff / 86400000;
      c.cd.classList.toggle('tier-danger', days < 4);
      c.cd.classList.toggle('tier-warning', days >= 4 && days < 7);
    });
    emptyEl.style.display = visible ? 'none' : 'block';
  }

  function renderGateway(list) {
    var wrap = $('promoList');
    wrap.textContent = '';
    list.forEach(function (g) {
      var a = linkOrBox(g.url, 'promo-card c-' + g.color);
      var head = h('div', 'promo-head');
      var ico = h('div', 'promo-icon');
      ico.appendChild(iconNode(g, g.title));
      head.appendChild(ico);
      head.appendChild(h('div', 'promo-title', g.title));
      a.appendChild(head);
      if (g.desc) a.appendChild(h('p', 'promo-desc', g.desc));
      if (g.cta) {
        var cta = h('span', 'promo-cta', g.cta);
        cta.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>');
        a.appendChild(cta);
      }
      wrap.appendChild(a);
    });
    $('gatewaySection').style.display = list.length ? '' : 'none';
    wrap.style.display = list.length ? '' : 'none';
  }

  function render(cfg) {
    var s = cfg.settings || {};
    $('eventsTitle').textContent = s.eventsTitle || 'Event Berlangsung';
    $('gatewayTitleText').textContent = s.gatewayTitle || 'Elevate your event with';
    $('footerText').textContent = s.footer || '';
    emptyEl.textContent = s.emptyText || '';
    renderButtons(cfg.buttons || []);
    renderEvents(cfg.events || [], s.utcOffset);
    renderGateway(cfg.gateway || []);
    tick();
  }

  // ---------- boot ----------
  setInterval(tick, 1000);

  var minWait = new Promise(function (r) { setTimeout(r, reduced ? 0 : MIN_LOADER_MS); });
  var failSafe = setTimeout(reveal, MAX_WAIT_MS);

  Promise.all([loadConfig(), minWait]).then(function (res) {
    var cfg = res[0];
    if (cfg) render(cfg);
    else {
      emptyEl.textContent = 'Konten belum dapat dimuat. Periksa koneksi Anda lalu muat ulang halaman.';
      emptyEl.style.display = 'block';
    }
    clearTimeout(failSafe);
    reveal();
  });
})();
