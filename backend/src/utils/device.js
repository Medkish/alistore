function detectDevice(ua) {
  const s = String(ua || '');
  if (/ipad|tablet|playbook|silk/i.test(s)) return 'Tablet';
  if (/mobi|android|iphone|ipod/i.test(s)) return 'Mobile';
  return 'Desktop';
}

function detectBrowser(ua) {
  const s = String(ua || '');
  const map = [
    ['Opera', /opr\/|opera/i],
    ['Edge', /edg\//i],
    ['Chrome', /chrome|crios/i],
    ['Firefox', /firefox|fxios/i],
    ['Safari', /safari/i],
    ['Samsung Internet', /samsungbrowser/i]
  ];
  for (const [label, re] of map) if (re.test(s)) return label;
  return 'Other';
}

module.exports = { detectDevice, detectBrowser };