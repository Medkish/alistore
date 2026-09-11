const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const notificationsService = require('../services/notifications.service');

async function profile(req, res, next) {
  try {
    const name = String((req.body && req.body.name) || '').trim();
    const mobile = String((req.body && req.body.mobile) || '').trim();
    if (!name) {
      const err = new Error('Name is required.');
      err.status = 400;
      throw err;
    }
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, mobile }
    });
    res.json({ user: { id: user.id, name: user.name, email: user.email, mobile: user.mobile || '', role: user.role || 'CUSTOMER' } });
  } catch (e) {
    next(e);
  }
}

async function password(req, res, next) {
  try {
    const current = String((req.body && req.body.current) || '');
    const nextPassword = String((req.body && req.body.next) || '');
    if (nextPassword.length < 6) {
      const err = new Error('New password must be at least 6 characters.');
      err.status = 400;
      throw err;
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !bcrypt.compareSync(current, user.passwordHash)) {
      const err = new Error('Current password is incorrect.');
      err.status = 401;
      throw err;
    }
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: bcrypt.hashSync(nextPassword, 10) }
    });
    await notificationsService.create(
      req.user.id,
      'SECURITY',
      'Password changed',
      'Your account password was changed just now. If this was not you, contact support immediately.'
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

async function notifications(req, res, next) {
  try {
    const [items, unread] = await Promise.all([
      notificationsService.list(req.user.id),
      notificationsService.unreadCount(req.user.id)
    ]);
    res.json({ notifications: items.map(notificationsService.serialize), unread });
  } catch (e) {
    next(e);
  }
}

async function markRead(req, res, next) {
  try {
    const id = req.body && req.body.id;
    if (id) await notificationsService.markRead(req.user.id, String(id));
    else await notificationsService.markAllRead(req.user.id);
    const [items, unread] = await Promise.all([
      notificationsService.list(req.user.id),
      notificationsService.unreadCount(req.user.id)
    ]);
    res.json({ notifications: items.map(notificationsService.serialize), unread });
  } catch (e) {
    next(e);
  }
}

module.exports = { notifications, markRead, profile, password };