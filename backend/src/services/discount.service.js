const prisma = require('../lib/prisma');

async function findValid(code) {
  const c = String(code || '').trim().toUpperCase();
  if (!c) return { valid: false, error: 'Enter a coupon code.' };
  const d = await prisma.discount.findUnique({ where: { code: c } });
  if (!d) return { valid: false, error: 'That coupon does not exist.' };
  if (!d.active) return { valid: false, error: 'That coupon is no longer active.' };
  if (d.expiresAt && d.expiresAt < new Date()) return { valid: false, error: 'That coupon has expired.' };
  return { valid: true, code: d.code, type: d.type, value: Number(d.value), minOrder: Number(d.minOrder) };
}

function compute(subtotal, d) {
  if (!d) return 0;
  const sub = Number(subtotal) || 0;
  if (d.minOrder > sub) {
    const err = new Error('Coupon requires a minimum order of AED ' + d.minOrder.toFixed(2) + '.');
    err.status = 400;
    throw err;
  }
  const raw = d.type === 'PERCENT' ? (sub * d.value) / 100 : Math.min(d.value, sub);
  return Math.round(raw * 100) / 100;
}

async function apply(code, subtotal) {
  const d = await findValid(code);
  const discount = d.valid ? compute(subtotal, d) : 0;
  return { valid: d.valid, code: d.code || '', discount, error: d.valid ? '' : d.error };
}

module.exports = { findValid, compute, apply };