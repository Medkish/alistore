const crypto = require('crypto');
const prisma = require('../lib/prisma');

function newRef(prefix) {
  return prefix + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

async function create({ amount, method }, user) {
  const amt = Number(amount) || 0;
  if (amt <= 0) {
    const err = new Error('A valid donation amount is required.');
    err.status = 400;
    throw err;
  }
  const donation = await prisma.donation.create({
    data: {
      reference: newRef('ALI-DON'),
      amount: amt,
      method: String(method || 'card'),
      userId: user ? user.id : null
    }
  });
  return { reference: donation.reference, amount: Number(donation.amount), at: donation.at.toISOString() };
}

module.exports = { create };