const discountService = require('../services/discount.service');

async function validate(req, res, next) {
  try {
    const code = req.params.code;
    const subtotal = Number(req.query.subtotal) || 0;
    const d = await discountService.findValid(code);
    if (!d.valid) return res.json({ valid: false, code: code.toUpperCase(), error: d.error, discount: 0 });
    let discount = 0;
    let error = '';
    try {
      discount = discountService.compute(subtotal, d);
    } catch (e) {
      error = e.message;
    }
    res.json({
      valid: !error,
      error,
      code: d.code,
      type: d.type,
      value: Number(d.value),
      minOrder: Number(d.minOrder),
      discount
    });
  } catch (e) {
    next(e);
  }
}

module.exports = { validate };