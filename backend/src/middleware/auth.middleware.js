const prisma = require('../lib/prisma');

async function resolveUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  return session || null;
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