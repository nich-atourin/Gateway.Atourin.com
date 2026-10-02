import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { put } from '@vercel/blob';
import { route, json, readBuffer, HttpError } from '../../lib/http.js';
import { requireAuth } from '../../lib/auth.js';

const MAX_BYTES = 4 * 1024 * 1024; // Vercel functions accept at most ~4.5 MB per request

// Detect the real type from magic bytes instead of trusting the Content-Type header.
function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf.toString('latin1', 1, 4) === 'PNG') return { type: 'image/png', ext: 'png' };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' };
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return { type: 'image/webp', ext: 'webp' };
  if (buf.toString('latin1', 0, 3) === 'GIF') return { type: 'image/gif', ext: 'gif' };
  return null;
}

export default route({
  async POST(req, res) {
    requireAuth(req);
    const buf = await readBuffer(req, MAX_BYTES);
    const kind = sniff(buf);
    if (!kind) throw new HttpError(415, 'File harus berupa gambar PNG, JPG, WEBP atau GIF');
    const name = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}.${kind.ext}`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`atourin/${name}`, buf, {
        access: 'public',
        contentType: kind.type,
        addRandomSuffix: false,
      });
      return json(res, 200, { url: blob.url });
    }
    if (process.env.VERCEL) {
      throw new HttpError(500, 'Penyimpanan gambar belum terhubung. Buat Vercel Blob store di tab Storage.');
    }
    // Local development fallback
    const dir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), buf);
    json(res, 200, { url: `/uploads/${name}` });
  },
});
