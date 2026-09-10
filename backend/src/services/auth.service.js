const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');

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

module.exports = { register, login, logout, publicUser, createSession };