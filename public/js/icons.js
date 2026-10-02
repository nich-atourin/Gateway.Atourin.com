// Shared icon library (public page + admin picker). Every icon is trusted inner-SVG markup
// drawn on a 24x24 grid; color comes from CSS (stroke), so icons follow the brand theme.
(function () {
  var I = {
    website: ['Website', '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 6 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-6-3.8-9s1.3-6.3 3.8-9z"/>'],
    whatsapp: ['WhatsApp', '<path d="M18.36,5.59L15.32,3.6L11.48,3L8.63,3.65L5.39,5.94L3.8,8.43L3.2,10.53L3.25,13.52L4.3,16.51L3.05,21L7.64,19.75L10.38,20.7L13.92,20.65L16.41,19.7L18.71,17.86L20.45,14.92L20.95,11.38L20.2,8.29ZM8.04,8.34L7.54,9.43L7.69,10.93L8.29,12.07L10.13,14.22L11.73,15.37L13.67,16.11L15.07,16.11L16.16,15.47L16.46,14.92L16.56,14.17L15.57,13.52L14.27,13.02L13.12,14.22L11.13,13.07L9.78,11.38L10.53,10.13L9.78,8.14L9.53,7.84L8.63,7.84Z"/>'],
    instagram: ['Instagram', '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1"/>'],
    threads: ['Threads', '<path d="M15.59,11.53L12.61,11.41L10.52,11.88L9.81,12.4L9.44,12.99L9.26,13.99L9.45,14.92L10.03,15.67L11.04,16.17L12.31,16.32L13.74,16.03L14.39,15.62L15.03,14.83L15.44,13.79L15.73,12.16M9.85,8.41L10.26,8.1L10.82,7.83L12.16,7.6L13.27,7.73L14.15,8.05L14.8,8.6L15.3,9.44L15.48,10.06L15.61,11.52M15.75,12.16L17.52,12.76L18.73,14.69L18.73,17.04L17.6,19.04L15.65,20.42L13.34,21L10.34,20.89L7.99,20.05L5.74,17.83L4.55,14.49L4.49,9.92L5.58,6.45L6.89,4.77L8.66,3.62L13.18,3L17.21,4.48L19.51,7.77"/>'],
    tiktok: ['TikTok', '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.4 2.6 2 4.2 5 4.5"/>'],
    youtube: ['YouTube', '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5l5 2.5-5 2.5z"/>'],
    facebook: ['Facebook', '<path d="M15.5 3.5H13a3.5 3.5 0 0 0-3.5 3.5v3H7v3.5h2.5V21H13v-7.5h2.5l.5-3.5H13V7.2c0-.4.3-.7.7-.7h1.8z"/>'],
    x: ['X / Twitter', '<path d="M4.5 4.5l15 15M19.5 4.5l-15 15"/>'],
    linkedin: ['LinkedIn', '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10.5V16M8 7.8v.1M12 16v-5.5M12 12.5a2.5 2.5 0 0 1 5 0V16"/>'],
    telegram: ['Telegram', '<path d="M21 4L3 11l5.5 2L10 19l3-3.5 4.5 3.3z"/><path d="M8.5 13L21 4"/>'],
    email: ['Email', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>'],
    phone: ['Telepon', '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'],
    map: ['Lokasi', '<path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/>'],
    ticket: ['Tiket', '<path d="M3 8.5V7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v1.5a3.5 3.5 0 0 0 0 7V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-1.5a3.5 3.5 0 0 0 0-7z"/><path d="M14 6.5v11" stroke-dasharray="1.5 2"/>'],
    calendar: ['Kalender', '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'],
    link: ['Link', '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'],
    star: ['Bintang', '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'],
    users: ['Pengunjung', '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.5 0 4.5 2 4.5 4.5"/>'],
    gift: ['Hadiah', '<rect x="3" y="9" width="18" height="4" rx="1"/><path d="M5 13v7h14v-7M12 9v11"/><path d="M12 9C10 5 6 6 7 9c.5 1.5 3 1 5 0zm0 0c2-4 6-3 5 0-.5 1.5-3 1-5 0z"/>'],
    megaphone: ['Pengumuman', '<path d="M4 10v4h3l7 4V6l-7 4z"/><path d="M18 9a4 4 0 0 1 0 6"/>'],
    info: ['Info', '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.1"/>'],
    bolt: ['Kilat', '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>'],
    registry: ['Pendaftaran', '<path d="M12 2c3 1.5 5 4.8 5 8.3 0 2-.7 3.7-1.6 5.2L12 22l-3.4-6.5C7.7 14 7 12.3 7 10.3 7 6.8 9 3.5 12 2z"/><circle cx="12" cy="9.5" r="1.5"/><path d="M9.5 17l-2 3M14.5 17l2 3"/>'],
    booth: ['Booth', '<path d="M4 8h16l-1.5 4h-13z"/><path d="M6.5 12v7M17.5 12v7"/><path d="M4 19h16"/>'],
    shield: ['Keamanan', '<path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>'],
    arrow: ['Panah', '<path d="M5 12h14M13 6l6 6-6 6"/>']
  };
  var out = {};
  Object.keys(I).forEach(function (k) { out[k] = { label: I[k][0], svg: I[k][1] }; });
  window.ATOURIN_ICONS = out;
  // Full <svg> markup for a preset key (unknown keys fall back to "link").
  window.atourinIconSvg = function (key) {
    var ic = out[key] || out.link;
    return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + ic.svg + '</svg>';
  };
})();
