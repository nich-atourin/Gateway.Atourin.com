(function () {
  'use strict';
  var app = document.getElementById('app');
  var ICONS = window.ATOURIN_ICONS;

  // ---------------- state ----------------
  var cfg = null;      // working copy (what the form edits)
  var snap = '';       // JSON of last saved content, used to detect unsaved changes
  var rev = 0;
  var tab = 'buttons';
  var open = new Set(); // ids of expanded cards (survives re-renders)
  var panelEl, barEl, statusEl, saveBtn, discardBtn, tabsEl;
  var saving = false;

  var TZ = { '+07:00': 'WIB', '+08:00': 'WITA', '+09:00': 'WIT' };
  var UNITS = [['d', 'Hari'], ['h', 'Jam'], ['m', 'Menit'], ['s', 'Detik']];
  var COLORS = [['purple', '#7068D5'], ['coral', '#F46263'], ['yellow', '#FFC442']];

  // ---------------- helpers ----------------
  function h(tag, props) {
    var n = document.createElement(tag);
    var after = null;
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'value') after = v;
      else if (k === 'checked') n.checked = !!v;
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) append(n, arguments[i]);
    if (after !== null) n.value = after;
    return n;
  }
  function append(n, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) return c.forEach(function (x) { append(n, x); });
    n.append(c.nodeType ? c : document.createTextNode(c));
  }
  function uid() { return Math.random().toString(36).slice(2, 10); }
  function svg(key) { return window.atourinIconSvg(key); }
  function strip() { return { settings: cfg.settings, buttons: cfg.buttons, events: cfg.events, gateway: cfg.gateway }; }
  function snapshot() { return JSON.stringify(strip()); }

  var toastTimer;
  function toast(msg, kind) {
    var old = document.querySelector('.toast');
    if (old) old.remove();
    var t = h('div', { class: 'toast ' + (kind || ''), role: 'status' }, msg);
    document.body.append(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.remove(); }, kind === 'err' ? 6000 : 3500);
  }

  function api(method, url, body, raw) {
    var opts = { method: method, credentials: 'same-origin', headers: {} };
    if (raw) { opts.body = raw; opts.headers['Content-Type'] = 'application/octet-stream'; }
    else if (body) { opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; }
    return fetch(url, opts).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (data) {
        if (!r.ok) {
          var e = new Error((data && data.error) || 'Terjadi kesalahan (' + r.status + ')');
          e.status = r.status;
          throw e;
        }
        return data;
      });
    });
  }

  // Resize in the browser first so uploads stay small and fast (and under the 4.5 MB request limit).
  function resizeImage(file, maxSide) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var s = Math.min(1, maxSide / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * s));
        c.height = Math.max(1, Math.round(img.height * s));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error('Gagal memproses gambar')); }, 'image/webp', 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('File bukan gambar yang valid')); };
      img.src = url;
    });
  }
  function uploadImage(file, maxSide) {
    if (!/^image\//.test(file.type)) return Promise.reject(new Error('Pilih file gambar (PNG, JPG, WEBP)'));
    if (file.size > 15 * 1024 * 1024) return Promise.reject(new Error('Ukuran gambar maksimal 15 MB'));
    return resizeImage(file, maxSide).then(function (blob) {
      return api('POST', '/api/admin/upload', null, blob);
    }).then(function (r) { return r.url; });
  }

  // ---------------- change tracking ----------------
  function changed() {
    var dirty = snapshot() !== snap;
    if (barEl) {
      barEl.classList.toggle('dirty', dirty);
      statusEl.textContent = dirty ? 'Ada perubahan yang belum disimpan' : 'Semua perubahan sudah tersimpan';
      saveBtn.disabled = !dirty || saving;
      discardBtn.disabled = !dirty || saving;
    }
  }
  window.addEventListener('beforeunload', function (e) {
    if (cfg && snapshot() !== snap) { e.preventDefault(); e.returnValue = ''; }
  });

  // ---------------- form fields ----------------
  function field(label, input, hint) {
    return h('label', { class: 'field' }, h('span', { class: 'lbl' }, label), input, hint ? h('small', null, hint) : null);
  }
  function textInput(obj, key, o) {
    o = o || {};
    return h('input', {
      type: o.type || 'text', value: obj[key] || '', placeholder: o.placeholder, maxlength: o.max,
      autocomplete: 'off', inputmode: o.inputmode,
      oninput: function (e) { obj[key] = e.target.value; changed(); if (o.onchange) o.onchange(e.target.value); }
    });
  }
  function areaInput(obj, key, o) {
    o = o || {};
    return h('textarea', {
      maxlength: o.max, placeholder: o.placeholder,
      oninput: function (e) { obj[key] = e.target.value; changed(); if (o.onchange) o.onchange(e.target.value); }
    }, obj[key] || '');
  }
  function toggle(obj, key, label, onchange) {
    return h('label', { class: 'switch' },
      h('input', { type: 'checkbox', checked: obj[key] !== false, onchange: function (e) { obj[key] = e.target.checked; changed(); if (onchange) onchange(); } }),
      h('i'), label);
  }

  // Icon picker: presets or a custom uploaded image
  function iconPicker(item, onchange) {
    var grid = h('div', { class: 'icon-grid' });
    var info = h('small', null);
    var fileIn = h('input', { type: 'file', accept: 'image/*', class: 'hide', onchange: function (e) {
      var f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      info.textContent = 'Mengunggah…';
      uploadImage(f, 256).then(function (url) {
        item.iconUrl = url; info.textContent = ''; changed(); draw(); onchange();
      }).catch(function (err) { info.textContent = ''; toast(err.message, 'err'); });
    } });
    var clear = h('button', { type: 'button', class: 'btn sm danger', onclick: function () { item.iconUrl = ''; changed(); draw(); onchange(); } }, 'Hapus gambar kustom');
    function draw() {
      grid.textContent = '';
      Object.keys(ICONS).forEach(function (k) {
        if (k === 'arrow') return;
        grid.append(h('button', {
          type: 'button', title: ICONS[k].label, 'aria-label': ICONS[k].label,
          class: !item.iconUrl && item.icon === k ? 'on' : '', html: svg(k),
          onclick: function () { item.icon = k; item.iconUrl = ''; changed(); draw(); onchange(); }
        }));
      });
      clear.classList.toggle('hide', !item.iconUrl);
    }
    draw();
    return h('div', { class: 'field' },
      h('span', { class: 'lbl' }, 'Ikon'),
      grid,
      h('div', { class: 'up-row' },
        h('button', { type: 'button', class: 'btn sm', onclick: function () { fileIn.click(); } }, '⬆ Upload ikon sendiri'),
        clear, fileIn, info),
      h('small', null, item.iconUrl ? 'Memakai gambar kustom. Pilih ikon di atas untuk kembali ke ikon bawaan.' : 'Pilih ikon bawaan atau upload gambar sendiri (PNG/WEBP transparan paling bagus).'));
  }

  function summaryIcon(item, cls) {
    var el = h('span', { class: 'sum-ico ' + (cls || '') });
    function set() {
      el.textContent = '';
      if (item.iconUrl) el.append(h('img', { src: item.iconUrl, alt: '' }));
      else el.innerHTML = svg(item.icon);
    }
    set();
    el.refresh = set;
    return el;
  }

  // Collapsible card with title row + move/delete actions
  function itemCard(o) {
    var d = h('details', { class: 'item', open: open.has(o.id) });
    d.addEventListener('toggle', function () { if (d.open) open.add(o.id); else open.delete(o.id); });
    function act(label, text, cls, fn, disabled) {
      return h('button', { type: 'button', class: 'icon-btn ' + cls, title: label, 'aria-label': label, disabled: disabled, onclick: function (e) { e.preventDefault(); e.stopPropagation(); fn(); } }, text);
    }
    var actions = h('div', { class: 'sum-actions' },
      o.onUp ? act('Naikkan', '↑', 'mv', o.onUp, o.first) : null,
      o.onDown ? act('Turunkan', '↓', 'mv', o.onDown, o.last) : null,
      act('Hapus', '✕', 'del', o.onDelete));
    d.append(h('summary', null, o.icon, h('div', { class: 'sum-main' }, o.title, o.sub), actions),
      h('div', { class: 'item-body' }, o.body));
    return d;
  }

  function move(list, i, dir) {
    var j = i + dir;
    if (j < 0 || j >= list.length) return;
    var t = list[i]; list[i] = list[j]; list[j] = t;
    changed(); renderPanel();
  }
  function remove(list, i, what) {
    if (!confirm('Hapus ' + what + ' ini? Perubahan baru tersimpan saat Anda menekan "Simpan".')) return;
    list.splice(i, 1);
    changed(); renderPanel();
  }

  // ---------------- tabs ----------------
  function buttonsPanel() {
    var wrap = h('div');
    wrap.append(h('p', { class: 'intro' }, 'Tombol ikon bulat di bawah logo. Klik ikon membuka link yang diisi. Teks di bawah ikon bisa diubah.'));
    cfg.buttons.forEach(function (b, i) {
      var title = h('div', { class: 'sum-title' }, b.label || '(tanpa nama)');
      var sub = h('div', { class: 'sum-sub' }, (b.active === false ? 'Disembunyikan · ' : '') + (b.url || 'Belum ada link'));
      var ico = summaryIcon(b);
      function refreshSub() { sub.textContent = (b.active === false ? 'Disembunyikan · ' : '') + (b.url || 'Belum ada link'); }
      wrap.append(itemCard({
        id: b.id, icon: ico, title: title, sub: sub,
        first: i === 0, last: i === cfg.buttons.length - 1,
        onUp: function () { move(cfg.buttons, i, -1); }, onDown: function () { move(cfg.buttons, i, 1); },
        onDelete: function () { remove(cfg.buttons, i, 'button'); },
        body: [
          field('Teks di bawah ikon', textInput(b, 'label', { max: 30, placeholder: 'mis. Instagram', onchange: function (v) { title.textContent = v || '(tanpa nama)'; } })),
          field('Link tujuan', textInput(b, 'url', { type: 'text', inputmode: 'url', placeholder: 'https://… atau mailto:… / tel:…', onchange: refreshSub }), 'Boleh ditulis tanpa https:// — akan dilengkapi otomatis saat disimpan.'),
          iconPicker(b, function () { ico.refresh(); }),
          toggle(b, 'active', 'Tampilkan di halaman', refreshSub)
        ]
      }));
    });
    wrap.append(h('button', { type: 'button', class: 'add', onclick: function () {
      var b = { id: uid(), active: true, label: 'Button baru', url: '', icon: 'link', iconUrl: '' };
      cfg.buttons.push(b); open.add(b.id); changed(); renderPanel();
    } }, '+ Tambah button'));
    return wrap;
  }

  function badgeFor(ev) {
    if (ev.active === false) return ['Nonaktif', ''];
    var s = ev.start ? window.atourinEventStatus(ev, cfg.settings.utcOffset) : 'upcoming';
    return { ongoing: ['Berlangsung', 'live'], upcoming: ['Akan datang', 'soon'], scheduled: ['Belum tampil', 'sched'], ended: ['Selesai (disembunyikan)', ''] }[s];
  }

  function imageField(ev, onchange) {
    var holder = h('div', { class: 'up-row' });
    var info = h('small', null);
    var fileIn = h('input', { type: 'file', accept: 'image/*', class: 'hide', onchange: function (e) {
      var f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      info.textContent = 'Mengunggah…';
      uploadImage(f, 640).then(function (url) {
        ev.image = url; info.textContent = ''; changed(); draw(); onchange();
      }).catch(function (err) { info.textContent = ''; toast(err.message, 'err'); });
    } });
    function draw() {
      holder.textContent = '';
      append(holder, [ev.image ? h("img", { src: ev.image, alt: "" }) : h("div", { class: "ph" }, "Belum ada gambar"),
        h('button', { type: 'button', class: 'btn sm', onclick: function () { fileIn.click(); } }, ev.image ? 'Ganti gambar' : '⬆ Upload gambar'),
        ev.image ? h('button', { type: 'button', class: 'btn sm danger', onclick: function () { ev.image = ''; changed(); draw(); onchange(); } }, 'Hapus') : null,
        fileIn, info]);
    }
    draw();
    return h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Gambar event'), holder,
      h('small', null, 'Tampil sebagai thumbnail kecil di sisi kiri kartu — pakai gambar portrait/persegi dengan objek utama di tengah.'));
  }

  function eventsPanel() {
    var wrap = h('div');
    var tz = TZ[cfg.settings.utcOffset] || 'WIB';
    wrap.append(h('p', { class: 'intro' }, 'Kartu event tampil otomatis: sedang berlangsung dulu, lalu yang paling dekat. Event yang sudah selesai atau belum waktunya tampil disembunyikan. Semua waktu dalam zona ' + tz + '.'));

    cfg.events.slice().sort(function (a, b) { return (b.start || '').localeCompare(a.start || ''); }).forEach(function (ev) {
      var i = cfg.events.indexOf(ev);
      var title = h('div', { class: 'sum-title' }, ev.title || '(tanpa judul)');
      var badge = h('span', { class: 'badge' });
      var subText = h('span');
      var sub = h('div', { class: 'sum-sub' }, badge, subText);
      function refresh() {
        var b = badgeFor(ev);
        badge.textContent = b[0]; badge.className = 'badge ' + b[1];
        subText.textContent = ev.dateLabel || window.atourinAutoDate(ev.start, ev.end) || 'Tanggal belum diisi';
        if (datePh) datePh.placeholder = window.atourinAutoDate(ev.start, ev.end) || 'mis. 20–26 Sep 2026';
      }
      var datePh = null;
      var thumb = h('span', { class: 'sum-ico thumb' });
      function drawThumb() { thumb.textContent = ''; if (ev.image) thumb.append(h('img', { src: ev.image, alt: '' })); else thumb.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#7068D5" stroke-width="1.7" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>'; }
      drawThumb();

      var dateInput = textInput(ev, 'dateLabel', { max: 60, placeholder: 'mis. 20–26 Sep 2026', onchange: refresh });
      datePh = dateInput;
      var units = h('div', { class: 'checks' }, UNITS.map(function (u) {
        var cb = h('input', { type: 'checkbox', checked: (ev.units || []).indexOf(u[0]) !== -1, onchange: function (e) {
          var set = UNITS.map(function (x) { return x[0]; }).filter(function (k) { return k === u[0] ? e.target.checked : (ev.units || []).indexOf(k) !== -1; });
          if (!set.length) { e.target.checked = true; toast('Minimal satu satuan waktu harus aktif', 'err'); return; }
          ev.units = set; changed();
        } });
        return h('label', { class: 'chk' }, cb, u[1]);
      }));

      var dtChange = function (key) {
        return h('input', { type: 'datetime-local', value: ev[key] || '', oninput: function (e) { ev[key] = e.target.value; changed(); refresh(); } });
      };

      wrap.append(itemCard({
        id: ev.id, icon: thumb, title: title, sub: sub,
        onDelete: function () { remove(cfg.events, i, 'event'); },
        body: [
          toggle(ev, 'active', 'Aktif (tampil di halaman jika waktunya sudah sesuai)', refresh),
          field('Judul event', textInput(ev, 'title', { max: 120, placeholder: 'mis. Festival Ekowisata Nusantara', onchange: function (v) { title.textContent = v || '(tanpa judul)'; } })),
          imageField(ev, drawThumb),
          field('Lokasi event', textInput(ev, 'location', { max: 120, placeholder: 'mis. Yogyakarta, DIY' })),
          h('div', { class: 'grid2' },
            field('Event mulai (' + tz + ')', dtChange('start'), 'Countdown "Dimulai dalam" menghitung mundur ke waktu ini.'),
            field('Event selesai (' + tz + ')', dtChange('end'), 'Saat berlangsung, countdown berubah jadi "Berakhir dalam". Kosong = sampai akhir hari mulai.')),
          field('Teks tanggal (opsional)', dateInput, 'Kosongkan agar dibuat otomatis dari tanggal mulai–selesai.'),
          field('Mulai ditampilkan pada (opsional, ' + tz + ')', dtChange('visibleFrom'), 'Contoh: baru tampil saat penjualan tiket dibuka. Kosong = langsung tampil.'),
          field('Link saat kartu diklik', textInput(ev, 'url', { inputmode: 'url', placeholder: 'https://…' })),
          h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Satuan countdown yang ditampilkan'), units,
            h('small', null, 'Jika "Hari" dimatikan, jam otomatis menampung sisa hari (mis. 50 jam).'))
        ]
      }));
      refresh();
    });

    wrap.append(h('button', { type: 'button', class: 'add', onclick: function () {
      var d = new Date(Date.now() + 86400000);
      var pad = function (n) { return String(n).padStart(2, '0'); };
      var day = function (dt) { return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()); };
      var d2 = new Date(d.getTime() + 86400000);
      var ev = { id: uid(), active: true, title: 'Event baru', location: '', image: '', start: day(d) + 'T09:00', end: day(d2) + 'T17:00', visibleFrom: '', dateLabel: '', url: '', units: ['d', 'h', 'm', 's'] };
      cfg.events.push(ev); open.add(ev.id); changed(); renderPanel();
    } }, '+ Tambah event'));
    return wrap;
  }

  function gatewayPanel() {
    var wrap = h('div');
    wrap.append(h('p', { class: 'intro' }, 'Kartu berwarna di bagian "Elevate your event with Gateway™".'));
    cfg.gateway.forEach(function (g, i) {
      var title = h('div', { class: 'sum-title' }, g.title || '(tanpa judul)');
      var sub = h('div', { class: 'sum-sub' }, g.cta || '');
      var ico = summaryIcon(g, 'c-' + g.color);
      var colors = h('div', { class: 'colors' });
      function drawColors() {
        colors.textContent = '';
        COLORS.forEach(function (c) {
          colors.append(h('button', { type: 'button', title: c[0], 'aria-label': c[0], class: g.color === c[0] ? 'on' : '', style: 'background:' + c[1], onclick: function () {
            g.color = c[0]; ico.className = 'sum-ico c-' + c[0]; changed(); drawColors();
          } }));
        });
      }
      drawColors();
      wrap.append(itemCard({
        id: g.id, icon: ico, title: title, sub: sub,
        first: i === 0, last: i === cfg.gateway.length - 1,
        onUp: function () { move(cfg.gateway, i, -1); }, onDown: function () { move(cfg.gateway, i, 1); },
        onDelete: function () { remove(cfg.gateway, i, 'kartu'); },
        body: [
          field('Judul', textInput(g, 'title', { max: 80, onchange: function (v) { title.textContent = v || '(tanpa judul)'; } })),
          field('Deskripsi', areaInput(g, 'desc', { max: 300 })),
          field('Tulisan pada button', textInput(g, 'cta', { max: 40, placeholder: 'mis. Mulai onboarding', onchange: function (v) { sub.textContent = v; } })),
          field('Link tujuan', textInput(g, 'url', { inputmode: 'url', placeholder: 'https://…' }), 'Seluruh kartu bisa diklik. Kosongkan jika belum ada link.'),
          iconPicker(g, function () { ico.refresh(); }),
          h('div', { class: 'field' }, h('span', { class: 'lbl' }, 'Warna kartu'), colors),
          toggle(g, 'active', 'Tampilkan di halaman')
        ]
      }));
    });
    wrap.append(h('button', { type: 'button', class: 'add', onclick: function () {
      var g = { id: uid(), active: true, color: 'purple', icon: 'star', iconUrl: '', title: 'Judul baru', desc: '', cta: 'Selengkapnya', url: '' };
      cfg.gateway.push(g); open.add(g.id); changed(); renderPanel();
    } }, '+ Tambah kartu Gateway'));
    return wrap;
  }

  function settingsPanel() {
    var s = cfg.settings;
    var tzSel = h('select', { value: s.utcOffset, onchange: function (e) { s.utcOffset = e.target.value; changed(); renderPanel(); } },
      Object.keys(TZ).map(function (k) { return h('option', { value: k }, TZ[k] + ' (UTC' + k + ')'); }));
    return h('div', { class: 'item-body', style: 'background:#fff;border:1px solid var(--border);border-radius:14px' },
      field('Judul bagian event', textInput(s, 'eventsTitle', { max: 80 })),
      field('Judul bagian Gateway', textInput(s, 'gatewayTitle', { max: 80 }), 'Ditampilkan sebelum tulisan "Gateway™".'),
      field('Teks saat belum ada event', textInput(s, 'emptyText', { max: 200 })),
      field('Teks footer', textInput(s, 'footer', { max: 200 })),
      field('Zona waktu event', tzSel, 'Dipakai untuk semua tanggal & countdown event.'),
      h('div', { class: 'note' }, h('b', null, 'Ganti password admin: '), 'ubah variabel ', h('b', null, 'ADMIN_PASSWORD'), ' di Vercel → Project → Settings → Environment Variables, lalu Redeploy.'));
  }

  var TABS = [['buttons', 'Button', function () { return cfg.buttons.length; }, buttonsPanel],
    ['events', 'Event', function () { return cfg.events.length; }, eventsPanel],
    ['gateway', 'Info Gateway', function () { return cfg.gateway.length; }, gatewayPanel],
    ['settings', 'Pengaturan', null, settingsPanel]];

  function renderTabs() {
    tabsEl.textContent = '';
    TABS.forEach(function (t) {
      tabsEl.append(h('button', { type: 'button', class: 'tab' + (tab === t[0] ? ' on' : ''), onclick: function () { tab = t[0]; renderTabs(); renderPanel(); } },
        t[1], t[2] ? h('small', null, String(t[2]())) : null));
    });
  }
  function renderPanel() {
    var t = TABS.filter(function (x) { return x[0] === tab; })[0];
    panelEl.textContent = '';
    panelEl.append(t[3]());
    renderTabs();
  }

  // ---------------- save ----------------
  function validate() {
    var i;
    for (i = 0; i < cfg.buttons.length; i++) if (!cfg.buttons[i].label.trim()) return 'Ada button yang teksnya masih kosong';
    for (i = 0; i < cfg.events.length; i++) {
      var e = cfg.events[i];
      if (!e.title.trim()) return 'Ada event yang judulnya masih kosong';
      if (!e.start) return 'Event "' + e.title + '" belum punya waktu mulai';
      if (e.end && e.end < e.start) return 'Waktu selesai "' + e.title + '" lebih awal dari waktu mulai';
    }
    for (i = 0; i < cfg.gateway.length; i++) if (!cfg.gateway[i].title.trim()) return 'Ada kartu Gateway yang judulnya masih kosong';
    return null;
  }

  function save() {
    var err = validate();
    if (err) return toast(err, 'err');
    saving = true; changed(); saveBtn.textContent = 'Menyimpan…';
    api('PUT', '/api/admin/config', { rev: rev, config: strip() }).then(function (res) {
      cfg = res; rev = res.rev; snap = snapshot();
      toast('Tersimpan ✓ — halaman publik ter-update dalam ±10 detik', 'ok');
    }).catch(function (e) {
      if (e.status === 401) { toast('Sesi berakhir, silakan login ulang', 'err'); return showLogin(); }
      toast(e.message, 'err');
    }).then(function () {
      saving = false; saveBtn && (saveBtn.textContent = 'Simpan perubahan');
      if (cfg && panelEl && panelEl.isConnected) { renderPanel(); changed(); }
    });
  }

  // ---------------- screens ----------------
  function showApp() {
    app.textContent = '';
    tabsEl = h('nav', { class: 'tabs' });
    panelEl = h('div');
    statusEl = h('span', { class: 'st' }, 'Semua perubahan sudah tersimpan');
    saveBtn = h('button', { type: 'button', class: 'btn primary', onclick: save, disabled: true }, 'Simpan perubahan');
    discardBtn = h('button', { type: 'button', class: 'btn', disabled: true, onclick: function () {
      if (!confirm('Buang semua perubahan yang belum disimpan?')) return;
      var s = JSON.parse(snap); cfg.settings = s.settings; cfg.buttons = s.buttons; cfg.events = s.events; cfg.gateway = s.gateway;
      renderPanel(); changed();
    } }, 'Buang');
    barEl = h('div', { class: 'savebar' }, h('div', { class: 'in' }, statusEl, discardBtn, saveBtn));
    app.append(
      h('div', { class: 'wrap' },
        h('header', { class: 'top' },
          h('img', { src: '/assets/logo.webp', alt: 'Atourin' }),
          h('h1', null, 'Admin Gateway'),
          h('a', { class: 'btn', href: '/', target: '_blank', rel: 'noopener' }, 'Lihat halaman ↗'),
          h('button', { type: 'button', class: 'btn', onclick: logout }, 'Keluar')),
        tabsEl, panelEl),
      barEl);
    renderPanel(); changed();
  }

  function showLogin(msg) {
    cfg = null; barEl = null;
    app.textContent = '';
    var err = h('div', { class: 'err-msg', role: 'alert' }, msg || '');
    var pw = h('input', { type: 'password', placeholder: 'Password', autocomplete: 'current-password', autofocus: true });
    var btn = h('button', { type: 'submit', class: 'btn primary' }, 'Masuk');
    var form = h('form', { class: 'login', onsubmit: function (e) {
      e.preventDefault();
      btn.disabled = true; err.textContent = '';
      api('POST', '/api/admin/auth', { password: pw.value }).then(load).catch(function (ex) {
        err.textContent = ex.message; btn.disabled = false; pw.select();
      });
    } }, h('img', { src: '/assets/logo.webp', alt: 'Atourin' }), h('h1', null, 'Admin Gateway'), h('p', null, 'Masukkan password untuk mengelola halaman.'), pw, err, btn);
    app.append(form);
    pw.focus();
  }

  function logout() {
    if (cfg && snapshot() !== snap && !confirm('Ada perubahan belum disimpan. Tetap keluar?')) return;
    cfg = null;
    api('DELETE', '/api/admin/auth').catch(function () {}).then(function () { showLogin(); });
  }

  function load() {
    return api('GET', '/api/admin/config').then(function (c) {
      cfg = c; rev = c.rev; snap = snapshot(); showApp();
    }).catch(function (e) {
      if (e.status === 401) showLogin();
      else { app.textContent = ''; app.append(h('div', { class: 'login' }, h('h1', null, 'Gagal memuat'), h('p', null, e.message), h('button', { class: 'btn primary', onclick: load }, 'Coba lagi'))); }
    });
  }

  load();
})();
