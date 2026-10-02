import { route, json } from '../lib/http.js';
import { getConfig } from '../lib/store.js';
import { toPublic } from '../lib/validate.js';

// Public, cacheable on the CDN for a few seconds so traffic spikes never hit the database.
export default route({
  async GET(req, res) {
    const cfg = await getConfig();
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=60');
    json(res, 200, toPublic(cfg));
  },
});
