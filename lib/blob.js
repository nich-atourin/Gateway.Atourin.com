import fs from 'node:fs/promises';
import path from 'node:path';
import { del } from '@vercel/blob';

export function blobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN || process.env.GWPUBLIC_READ_WRITE_TOKEN || '';
}

// Every uploaded-image URL referenced by a config (event images + custom icons).
export function collectImages(cfg) {
  const urls = new Set();
  const add = (u) => { if (u) urls.add(u); };
  (cfg.events || []).forEach((e) => add(e.image));
  (cfg.buttons || []).forEach((b) => add(b.iconUrl));
  (cfg.gateway || []).forEach((g) => add(g.iconUrl));
  return urls;
}

function isOurs(url) {
  if (url.startsWith('/uploads/')) return true; // local dev fallback
  try {
    const u = new URL(url);
    return u.hostname.endsWith('.blob.vercel-storage.com') && u.pathname.startsWith('/atourin/');
  } catch {
    return false;
  }
}

// Deletes files that were referenced before saving but are no longer used anywhere.
// Best effort: a failed delete never blocks saving (the file just stays as an orphan).
export async function deleteUnusedImages(oldCfg, newCfg) {
  const keep = collectImages(newCfg);
  const stale = [...collectImages(oldCfg)].filter((u) => !keep.has(u) && isOurs(u));
  if (!stale.length) return 0;

  const remote = stale.filter((u) => u.startsWith('http'));
  const local = stale.filter((u) => u.startsWith('/uploads/'));
  try {
    if (remote.length && blobToken()) await del(remote, { token: blobToken() });
    for (const u of local) {
      await fs.unlink(path.join(process.cwd(), 'public', u)).catch(() => {});
    }
  } catch (err) {
    console.error('Blob cleanup failed', err);
    return 0;
  }
  return stale.length;
}
