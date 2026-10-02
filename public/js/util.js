// Helpers shared by the public page and the admin panel.
(function () {
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  function parts(s) {
    var p = String(s).slice(0, 10).split('-').map(Number);
    return { y: p[0], m: p[1], d: p[2] };
  }

  // "2026-09-20T09:00", "2026-09-26T17:00" -> "20–26 Sep 2026"
  window.atourinAutoDate = function (start, end) {
    if (!start) return '';
    var a = parts(start);
    var b = end ? parts(end) : a;
    if (a.y === b.y && a.m === b.m && a.d === b.d) return a.d + ' ' + MON[a.m - 1] + ' ' + a.y;
    if (a.y === b.y && a.m === b.m) return a.d + '–' + b.d + ' ' + MON[a.m - 1] + ' ' + a.y;
    if (a.y === b.y) return a.d + ' ' + MON[a.m - 1] + ' – ' + b.d + ' ' + MON[b.m - 1] + ' ' + a.y;
    return a.d + ' ' + MON[a.m - 1] + ' ' + a.y + ' – ' + b.d + ' ' + MON[b.m - 1] + ' ' + b.y;
  };

  // Event dates are stored as local wall-clock strings; the site-wide UTC offset turns them into instants.
  window.atourinInstant = function (local, offset) {
    return new Date(local + ':00' + (offset || '+07:00'));
  };

  // An event without an end time runs until the end of its start day.
  window.atourinEventWindow = function (ev, offset) {
    var start = window.atourinInstant(ev.start, offset);
    var end = window.atourinInstant(ev.end || ev.start.slice(0, 10) + 'T23:59', offset);
    var from = ev.visibleFrom ? window.atourinInstant(ev.visibleFrom, offset) : null;
    return { start: start, end: end, from: from };
  };

  // 'upcoming' | 'ongoing' | 'ended' | 'scheduled' (upcoming but not yet shown on the page)
  window.atourinEventStatus = function (ev, offset, now) {
    var w = window.atourinEventWindow(ev, offset);
    now = now || new Date();
    if (now > w.end) return 'ended';
    if (now >= w.start) return 'ongoing';
    if (w.from && now < w.from) return 'scheduled';
    return 'upcoming';
  };
})();
