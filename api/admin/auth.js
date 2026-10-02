import { route, json, readJson } from '../../lib/http.js';
import { isAuthed, login, logout } from '../../lib/auth.js';

export default route({
  // Session check
  async GET(req, res) {
    json(res, 200, { authenticated: isAuthed(req) });
  },
  // Login
  async POST(req, res) {
    const body = await readJson(req, 10_000);
    await login(req, res, typeof body.password === 'string' ? body.password : '');
    json(res, 200, { authenticated: true });
  },
  // Logout
  async DELETE(req, res) {
    logout(req, res);
    json(res, 200, { authenticated: false });
  },
});
