const prisma = require('../lib/prisma');

async function create(userId, type, title, message) {
  if (!userId) return null;
  return prisma.notification.create({ data: { userId, type, title, message } }).catch(() => null);
}

async function list(userId) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { at: 'desc' }, take: 50 });
}

async function unreadCount(userId) {
  return prisma.notification.count({ where: { userId, read: false } });
}

async function markRead(userId, id) {
  return prisma.notification.updateMany({ where: { userId, id, read: false }, data: { read: true } });
}

async function markAllRead(userId) {
  return prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}

function serialize(n) {
  return { id: n.id, type: n.type, title: n.title, message: n.message, read: n.read, at: n.at.toISOString() };
}

module.exports = { create, list, unreadCount, markRead, markAllRead, serialize };