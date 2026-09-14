const prisma = require('../lib/prisma');

const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS) || 168;

async function resolveUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session) return null;
  if (session.user.blocked) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  if (SESSION_TTL_HOURS > 0) {
    const expiresAt = new Date(session.createdAt).getTime() + SESSION_TTL_HOURS * 3600 * 1000;
    if (Date.now() > expiresAt) {
      await prisma.session.deleteMany({ where: { id: session.id } });
      return null;
    }
  }
  return session;
}

function reject(res) {
  return res.status(401).json({ error: 'Unauthorized' });
}

async function authRequired(req, res, next) {
  try {
    const session = await resolveUser(req);
    if (!session) return reject(res);
    req.user = session.user;
    req.session = session;
    next();
  } catch (err) {
    next(err);
  }
}

async function authOptional(req, res, next) {
  try {
    const session = await resolveUser(req);
    if (session) {
      req.user = session.user;
      req.session = session;
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authRequired, authOptional };