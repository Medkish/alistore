const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

const ADMIN_IP_ALLOWLIST = (process.env.ADMIN_IP_ALLOWLIST || '')
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);

/* Normalize IPv4-mapped IPv6 so ::ffff:86.98.155.211 matches 86.98.155.211. */
function normalizeIp(ip) {
  return String(ip || '').trim().replace(/^::ffff:/i, '');
}

/* Gather the plausible client IPs: req.ip, the socket address and every entry
   of x-forwarded-for (leftmost = original client behind a proxy chain). */
function candidateIps(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .map(normalizeIp)
    .filter(Boolean);
  const seen = new Set();
  const list = [normalizeIp(req.ip), req.socket && req.socket.remoteAddress, ...forwarded];
  list.forEach((ip) => { if (ip) seen.add(ip); });
  return [...seen];
}

function ipAllowed(req) {
  if (ADMIN_IP_ALLOWLIST.length === 0) return true;
  return candidateIps(req).some((ip) => ADMIN_IP_ALLOWLIST.includes(ip));
}

function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: this action requires role ' + roles.join(' or ') });
    }
    if (roles.some((role) => ADMIN_ROLES.includes(role)) && !ipAllowed(req)) {
      return res.status(403).json({ error: 'Forbidden: this IP is not on the admin allowlist.' });
    }
    next();
  };
}

module.exports = { requireRole };