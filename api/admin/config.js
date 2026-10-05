import { route, json, readJson, HttpError } from '../../lib/http.js';
import { requireAuth } from '../../lib/auth.js';
import { getConfig, saveConfig } from '../../lib/store.js';
import { sanitizeConfig } from '../../lib/validate.js';
import { deleteUnusedImages } from '../../lib/blob.js';

export default route({
  // Full config (including inactive items) for the admin panel
  async GET(req, res) {
    requireAuth(req);
    json(res, 200, await getConfig());
  },
  // Replace config. `rev` guards against overwriting edits made from another tab/device.
  async PUT(req, res) {
    requireAuth(req);
    const body = await readJson(req);
    const current = await getConfig();
    if (typeof body.rev === 'number' && body.rev !== current.rev) {
      throw new HttpError(409, 'Data sudah diubah dari tempat lain. Muat ulang halaman admin lalu coba lagi.');
    }
    const clean = sanitizeConfig(body.config, current);
    const next = { ...clean, rev: current.rev + 1, updatedAt: new Date().toISOString() };
    await saveConfig(next);
    // Only after the new config is safely stored: remove images nothing references anymore.
    await deleteUnusedImages(current, next);
    json(res, 200, next);
  },
});
