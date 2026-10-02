import crypto from 'node:crypto';
import { HttpError } from './http.js';

const LIMITS = { buttons: 30, events: 100, gateway: 20 };
const COLORS = ['purple', 'coral', 'yellow'];
const UNITS = ['d', 'h', 'm', 's'];
const OFFSETS = ['+07:00', '+08:00', '+09:00'];
const DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function str(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function id(v, prefix) {
  const s = typeof v === 'string' ? v.replace(/[^\w-]/g, '').slice(0, 40) : '';
  return s || `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}

// Only http(s), mailto and tel links are allowed. "atourin.com" is auto-prefixed with https://.
export function cleanUrl(v, label) {
  let s = str(v, 2000);
  if (!s) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s) && /^[\w-]+(\.[\w-]+)+(\/|\?|#|$)/.test(s)) s = `https://${s}`;
  let u;
  try {
    u = new URL(s);
  } catch {
    throw new HttpError(400, `Link "${label}" tidak valid`);
  }
  if (!['http:', 'https:', 'mailto:', 'tel:'].includes(u.protocol)) {
    throw new HttpError(400, `Link "${label}" harus diawali http://, https://, mailto: atau tel:`);
  }
  return s;
}

// Uploaded images: https URLs (Vercel Blob) or local /uploads paths (dev only).
function cleanImage(v) {
  const s = str(v, 2000);
  if (!s) return '';
  if (/^https:\/\//i.test(s) || /^\/uploads\/[\w.-]+$/.test(s)) return s;
  throw new HttpError(400, 'URL gambar tidak valid');
}

function cleanIcon(v) {
  const s = str(v, 30);
  return /^[a-z0-9-]+$/.test(s) ? s : 'link';
}

function dt(v, label, required) {
  const s = str(v, 16);
  if (!s) {
    if (required) throw new HttpError(400, `${label} wajib diisi`);
    return '';
  }
  if (!DT.test(s) || Number.isNaN(Date.parse(`${s}:00Z`))) throw new HttpError(400, `${label} tidak valid`);
  return s;
}

function list(v, max, name) {
  if (v === undefined) return [];
  if (!Array.isArray(v)) throw new HttpError(400, `Format ${name} tidak valid`);
  if (v.length > max) throw new HttpError(400, `Maksimal ${max} item untuk ${name}`);
  return v.filter((x) => x && typeof x === 'object');
}

export function sanitizeConfig(input, base) {
  if (!input || typeof input !== 'object') throw new HttpError(400, 'Data tidak valid');
  const s = input.settings && typeof input.settings === 'object' ? input.settings : {};

  const settings = {
    eventsTitle: str(s.eventsTitle, 80) || base.settings.eventsTitle,
    gatewayTitle: str(s.gatewayTitle, 80) || base.settings.gatewayTitle,
    emptyText: str(s.emptyText, 200),
    footer: str(s.footer, 200),
    utcOffset: OFFSETS.includes(s.utcOffset) ? s.utcOffset : '+07:00',
  };

  const buttons = list(input.buttons, LIMITS.buttons, 'button').map((b) => {
    const label = str(b.label, 30);
    if (!label) throw new HttpError(400, 'Setiap button wajib punya teks');
    return {
      id: id(b.id, 'btn'),
      active: b.active !== false,
      label,
      url: cleanUrl(b.url, label),
      icon: cleanIcon(b.icon),
      iconUrl: cleanImage(b.iconUrl),
    };
  });

  const events = list(input.events, LIMITS.events, 'event').map((e) => {
    const title = str(e.title, 120);
    if (!title) throw new HttpError(400, 'Setiap event wajib punya judul');
    const start = dt(e.start, `Waktu mulai "${title}"`, true);
    const end = dt(e.end, `Waktu selesai "${title}"`, false);
    if (end && end < start) throw new HttpError(400, `Waktu selesai "${title}" lebih awal dari waktu mulai`);
    const units = UNITS.filter((u) => Array.isArray(e.units) && e.units.includes(u));
    return {
      id: id(e.id, 'ev'),
      active: e.active !== false,
      title,
      location: str(e.location, 120),
      image: cleanImage(e.image),
      start,
      end,
      visibleFrom: dt(e.visibleFrom, `Waktu tampil "${title}"`, false),
      dateLabel: str(e.dateLabel, 60),
      url: cleanUrl(e.url, title),
      units: units.length ? units : UNITS,
    };
  });

  const gateway = list(input.gateway, LIMITS.gateway, 'gateway').map((g) => {
    const title = str(g.title, 80);
    if (!title) throw new HttpError(400, 'Setiap kartu Gateway wajib punya judul');
    return {
      id: id(g.id, 'gw'),
      active: g.active !== false,
      color: COLORS.includes(g.color) ? g.color : 'purple',
      icon: cleanIcon(g.icon),
      iconUrl: cleanImage(g.iconUrl),
      title,
      desc: str(g.desc, 300),
      cta: str(g.cta, 40),
      url: cleanUrl(g.url, title),
    };
  });

  return { settings, buttons, events, gateway };
}

// Public payload: drops inactive items and internal fields.
export function toPublic(cfg) {
  const on = (x) => x.active !== false;
  return {
    settings: cfg.settings,
    buttons: cfg.buttons.filter(on),
    events: cfg.events.filter(on),
    gateway: cfg.gateway.filter(on),
  };
}
