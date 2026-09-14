const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const notificationsService = require('./notifications.service');

/*
 * Demo-only in-memory password reset codes.
 * In production, replace demoResetCode() with a real email/SMS delivery
 * and store the code server-side only (never return it in the response).
 */
const RESET_TTL_MS = 15 * 60 * 1000;
const resetStore = new Map();

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, mobile: (u.mobile || '').trim(), role: u.role || 'CUSTOMER' };
}

async function createSession(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  await prisma.session.create({ data: { token, userId } });
  return token;
}

async function register({ name, email, mobile, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('That email is already registered.');
    err.status = 409;
    throw err;
  }
  const user = await prisma.user.create({
    data: {
      name,
      email,
      mobile,
      passwordHash: bcrypt.hashSync(password, 10),
      cart: []
    }
  });
  const token = await createSession(user.id);
  return { token, user: publicUser(user) };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }
  const token = await createSession(user.id);
  return { token, user: publicUser(user) };
}

async function logout(sessionId) {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

function generateResetCode(email) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  resetStore.set(email, { code, expiresAt: Date.now() + RESET_TTL_MS });
  return code;
}

async function forgotPassword({ email }) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) {
    const err = new Error('Email is required.');
    err.status = 400;
    throw err;
  }
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    // Never reveal whether an email is registered.
    return { ok: true, message: 'If that email is registered, a reset code has been generated.' };
  }
  const code = generateResetCode(normalized);
  await notificationsService.create(
    user.id,
    'SECURITY',
    'Password reset requested',
    'A reset code was generated for your account. Use it within 15 minutes to set a new password.'
  );
  // Demo mode only: return the code so the flow can be completed without email delivery.
  return { ok: true, demoCode: code, message: 'Password reset code generated (demo — no email server configured).' };
}

async function resetPassword({ email, code, password }) {
  const normalized = String(email || '').trim().toLowerCase();
  const entry = resetStore.get(normalized);
  if (!entry || entry.code !== String(code || '').trim()) {
    const err = new Error('Invalid or expired reset code.');
    err.status = 400;
    throw err;
  }
  if (entry.expiresAt < Date.now()) {
    resetStore.delete(normalized);
    const err = new Error('That reset code has expired. Request a new one.');
    err.status = 400;
    throw err;
  }
  if (String(password || '').length < 6) {
    const err = new Error('New password must be at least 6 characters.');
    err.status = 400;
    throw err;
  }
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    resetStore.delete(normalized);
    const err = new Error('No account found for that email.');
    err.status = 400;
    throw err;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: bcrypt.hashSync(password, 10) }
  });
  // Reset code is single-use and invalidates every existing session.
  resetStore.delete(normalized);
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await notificationsService.create(
    user.id,
    'SECURITY',
    'Password reset',
    'Your password was reset using a recovery code. All other sessions were signed out.'
  );
  return { ok: true };
}

module.exports = { register, login, logout, forgotPassword, resetPassword, publicUser, createSession };