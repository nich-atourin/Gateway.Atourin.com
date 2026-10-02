import crypto from 'node:crypto';
import { HttpError } from './http.js';

const COOKIE = 'atourin_admin';
const TTL_SECONDS = 7 * 24 * 3600;
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const fails = new Map(); // best-effort per-instance throttle: ip -> { count, until }

function adminPassword() {
  const p = process.env.ADMIN_PASSWORD;
  if (!p) throw new HttpError(500, 'ADMIN_PASSWORD belum diatur di Environment Variables');
  return p;
}

function secret() {
  return process.env.SESSION_SECRET || adminPassword();
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

export function isAuthed(req) {
  const token = cookies(req)[COOKIE];
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Date.now() / 1000;
}

export function requireAuth(req) {
  if (!isAuthed(req)) throw new HttpError(401, 'Sesi berakhir, silakan login ulang');
}

function cookieAttrs(req) {
  const secure = req.headers['x-forwarded-proto'] === 'https' || process.env.VERCEL ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Strict${secure}`;
}

export async function login(req, res, password) {
  const ip = clientIp(req);
  const f = fails.get(ip);
  if (f && f.count >= MAX_FAILS && f.until > Date.now()) {
    throw new HttpError(429, 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.');
  }
  if (!safeEqual(password ?? '', adminPassword())) {
    const cur = f && f.until > Date.now() ? f : { count: 0, until: 0 };
    fails.set(ip, { count: cur.count + 1, until: Date.now() + LOCK_MS });
    await new Promise((r) => setTimeout(r, 700));
    throw new HttpError(401, 'Password salah');
  }
  fails.delete(ip);
  const exp = String(Math.floor(Date.now() / 1000) + TTL_SECONDS);
  res.setHeader('Set-Cookie', `${COOKIE}=${exp}.${sign(exp)}; Max-Age=${TTL_SECONDS}; ${cookieAttrs(req)}`);
}

export function logout(req, res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Max-Age=0; ${cookieAttrs(req)}`);
}
