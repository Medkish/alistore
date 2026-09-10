const crypto = require('crypto');
const prisma = require('../lib/prisma');

function newRef(prefix) {
  return prefix + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

async function create({ plan, period, nextBilling }, user) {
  if (!plan || !period) {
    const err = new Error('Plan and period are required.');
    err.status = 400;
    throw err;
  }
  const subscription = await prisma.subscription.create({
    data: {
      reference: newRef('ALI-SUB'),
      plan: String(plan),
      period: String(period),
      nextBilling: nextBilling ? new Date(nextBilling) : null,
      userId: user ? user.id : null
    }
  });
  return {
    reference: subscription.reference,
    plan: subscription.plan,
    period: subscription.period,
    nextBilling: subscription.nextBilling ? subscription.nextBilling.toISOString() : null,
    at: subscription.at.toISOString()
  };
}

module.exports = { create };