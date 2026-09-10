function requireFields(body, fields) {
  const missing = [];
  for (const f of fields) {
    if (body[f] === undefined || String(body[f]).trim() === '') {
      missing.push(f);
    }
  }
  if (missing.length) {
    const err = new Error('Missing required field(s): ' + missing.join(', '));
    err.status = 400;
    return err;
  }
  return null;
}

module.exports = { requireFields };