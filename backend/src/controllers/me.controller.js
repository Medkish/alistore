const notificationsService = require('../services/notifications.service');

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

module.exports = { notifications, markRead };