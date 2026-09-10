const authService = require('../services/auth.service');
const { requireFields } = require('../middleware/validate.middleware');

async function register(req, res) {
  const body = req.body || {};
  const err = requireFields(body, ['name', 'email', 'password']);
  if (err) throw err;
  if (String(body.password).length < 6) {
    const e = new Error('Password must be at least 6 characters.');
    e.status = 400;
    throw e;
  }
  const result = await authService.register({
    name: String(body.name).trim(),
    email: String(body.email).trim().toLowerCase(),
    mobile: String(body.mobile || '').trim(),
    password: String(body.password)
  });
  res.json(result);
}

async function login(req, res) {
  const body = req.body || {};
  const err = requireFields(body, ['email', 'password']);
  if (err) throw err;
  const result = await authService.login({
    email: String(body.email).trim().toLowerCase(),
    password: String(body.password)
  });
  res.json(result);
}

function me(req, res) {
  res.json({ user: authService.publicUser(req.user) });
}

async function logout(req, res) {
  await authService.logout(req.session.id);
  res.json({ ok: true });
}

module.exports = { register, login, me, logout };