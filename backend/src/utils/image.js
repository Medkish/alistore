/* Public image paths live under the frontend's basePath (/alistore) so they
   resolve identically on the dev server, on GitHub Pages and behind the API.
   External URLs and data URIs pass through untouched. */
const APP_BASE = process.env.APP_BASE_PATH || '/alistore';

function normalizeImage(path) {
  const s = String(path || '').trim();
  if (!s) return '';
  if (/^(https?:)?\/\//i.test(s) || s.startsWith('data:')) return s;
  const p = s.startsWith('/') ? s : '/' + s;
  if (p === APP_BASE || p.startsWith(APP_BASE + '/')) return p;
  return APP_BASE + p;
}

module.exports = { normalizeImage };