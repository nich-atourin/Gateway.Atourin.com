import fs from 'node:fs/promises';
import path from 'node:path';
import { Redis } from '@upstash/redis';
import { defaultConfig } from './defaults.js';
import { HttpError } from './http.js';

const KEY = 'atourin:gateway:config';
const LOCAL_FILE = path.join(process.cwd(), '.data', 'config.json');

let redis;
function client() {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

function assertStorage(r) {
  if (!r && process.env.VERCEL) {
    throw new HttpError(500, 'Database belum terhubung. Tambahkan Upstash Redis di Vercel (Storage / Marketplace).');
  }
}

export async function getConfig() {
  const r = client();
  assertStorage(r);
  let stored = null;
  if (r) {
    stored = await r.get(KEY);
    if (typeof stored === 'string') stored = JSON.parse(stored);
  } else {
    try {
      stored = JSON.parse(await fs.readFile(LOCAL_FILE, 'utf8'));
    } catch {
      stored = null;
    }
  }
  const def = defaultConfig();
  if (!stored) return def;
  return { ...def, ...stored, settings: { ...def.settings, ...(stored.settings || {}) } };
}

export async function saveConfig(cfg) {
  const r = client();
  assertStorage(r);
  if (r) {
    await r.set(KEY, cfg);
  } else {
    await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
    await fs.writeFile(LOCAL_FILE, JSON.stringify(cfg, null, 2));
  }
}
