export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!res.getHeader('Cache-Control')) res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function streamToBuffer(req, limit) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > limit) throw new HttpError(413, 'Ukuran data terlalu besar');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function rawBody(req) {
  try {
    return req.body;
  } catch {
    throw new HttpError(400, 'Body request tidak valid');
  }
}

export async function readJson(req, limit = 1_000_000) {
  const b = rawBody(req);
  if (b && typeof b === 'object' && !Buffer.isBuffer(b)) return b;
  let text;
  if (typeof b === 'string') text = b;
  else if (Buffer.isBuffer(b)) text = b.toString('utf8');
  else text = (await streamToBuffer(req, limit)).toString('utf8');
  if (text.length > limit) throw new HttpError(413, 'Ukuran data terlalu besar');
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw new HttpError(400, 'JSON tidak valid');
  }
}

export async function readBuffer(req, limit) {
  const b = rawBody(req);
  if (Buffer.isBuffer(b)) {
    if (b.length > limit) throw new HttpError(413, 'Ukuran file terlalu besar');
    return b;
  }
  if (b !== undefined && b !== null) throw new HttpError(400, 'Format upload tidak valid');
  return streamToBuffer(req, limit);
}

// Maps { GET: fn, POST: fn } to a Vercel handler with uniform error handling.
export function route(methods) {
  return async function handler(req, res) {
    try {
      const fn = methods[req.method];
      if (!fn) {
        res.setHeader('Allow', Object.keys(methods).join(', '));
        throw new HttpError(405, 'Method tidak diizinkan');
      }
      await fn(req, res);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) console.error(err);
      json(res, status, { error: status === 500 ? 'Terjadi kesalahan pada server' : err.message });
    }
  };
}
