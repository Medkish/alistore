const authService = require('../services/auth.service');
const prisma = require('../lib/prisma');
const { requireFields } = require('../middleware/validate.middleware');
const { detectDevice, detectBrowser } = require('../utils/device');

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
  try {
    const ua = String(req.headers['user-agent'] || '');
    const rawIp = String(req.ip || '');
    await prisma.actionLog.create({
      data: {
        actorId: result.user.id,
        type: 'LOGIN',
        detail: 'Signed in',
        data: {
          device: detectDevice(ua),
          browser: detectBrowser(ua),
          ip: rawIp.replace(/\.\d+$/, '.0').slice(0, 45)
        }
      }
    });
  } catch {
    /* login tracking must never break sign-in */
  }
  res.json(result);
}

function me(req, res) {
  res.json({ user: authService.publicUser(req.user) });
}

async function logout(req, res) {
  await authService.logout(req.session.id);
  res.json({ ok: true });
}

async function forgotPassword(req, res) {
  const body = req.body || {};
  const result = await authService.forgotPassword({ email: String(body.email || '').trim() });
  res.json(result);
}

async function resetPassword(req, res) {
  const body = req.body || {};
  const result = await authService.resetPassword({
    email: String(body.email || '').trim(),
    code: String(body.code || '').trim(),
    password: String(body.password || '')
  });
  res.json(result);
}

module.exports = { register, login, me, logout, forgotPassword, resetPassword };