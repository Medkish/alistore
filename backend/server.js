/* AlioStore backend - Express API + static frontend server */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const FRONTEND = path.join(__dirname, '..', 'frontend');

const DEFAULT_DB = { users: [], tokens: [], orders: [], donors: [] };

let db = loadDb();

function loadDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return Object.assign({}, DEFAULT_DB, JSON.parse(raw));
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function saveDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, mobile: u.mobile || '' };
}

function authUser(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const rec = token && db.tokens.find(function (t) { return t.token === token; });
  if (!rec) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = db.users.find(function (u) { return u.id === rec.userId; });
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = user;
  req.tokenRec = rec;
  next();
}

function newToken(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  db.tokens.push({ token: token, userId: userId });
  return token;
}

function newRef(prefix) {
  return prefix + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

/* Small built-in book catalog */
const BOOKS = [
  { id: 'python', title: 'Python', author: 'Armor Ramsey', price: 40, image: 'images/programming1.jpeg' },
  { id: 'javascript', title: 'JavaScript', author: 'Armor Ramsey', price: 40, image: 'images/programming2.jpeg' },
  { id: 'ruby', title: 'Ruby', author: 'Armor Ramsey', price: 40, image: 'images/programming3.jpeg' },
  { id: 'cpp', title: 'C++', author: 'Armor Ramsey', price: 35, image: 'images/programming4.jpeg' },
  { id: 'swift', title: 'Swift', author: 'Armor Ramsey', price: 40, image: 'images/programming5.jpeg' },
  { id: 'kotlin', title: 'Kotlin', author: 'Armor Ramsey', price: 40, image: 'images/programming6.jpeg' },
  { id: 'php', title: 'PHP', author: 'Armor Ramsey', price: 40, image: 'images/programming1.jpeg' },
  { id: 'java', title: 'Java', author: 'Armor Ramsey', price: 45, image: 'images/programming5.jpeg' },
  { id: 'go', title: 'Go', author: 'Armor Ramsey', price: 40, image: 'images/programming3.jpeg' },
  { id: 'rust', title: 'Rust', author: 'Alio & Palma Cooperative', price: 45, image: 'images/product4.jpg' }
];

const app = express();
app.use(cors());
app.use(express.json());

/* ---------- Auth ---------- */
app.post('/api/auth/register', function (req, res) {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const mobile = String(body.mobile || '').trim();

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  if (db.users.some(function (u) { return u.email === email; })) {
    return res.status(409).json({ error: 'That email is already registered.' });
  }

  const user = {
    id: crypto.randomUUID(),
    name: name,
    email: email,
    mobile: mobile,
    passwordHash: bcrypt.hashSync(password, 10),
    cart: [],
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  const token = newToken(user.id);
  saveDb();
  res.json({ token: token, user: publicUser(user) });
});

app.post('/api/auth/login', function (req, res) {
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const user = db.users.find(function (u) { return u.email === email; });
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  const token = newToken(user.id);
  saveDb();
  res.json({ token: token, user: publicUser(user) });
});

app.get('/api/auth/me', authUser, function (req, res) {
  res.json({ user: publicUser(req.user) });
});

app.post('/api/auth/logout', authUser, function (req, res) {
  db.tokens = db.tokens.filter(function (t) { return t.token !== req.tokenRec.token; });
  saveDb();
  res.json({ ok: true });
});

/* ---------- Catalog ---------- */
app.get('/api/books', function (req, res) {
  res.json({ books: BOOKS });
});

/* ---------- Cart (per user) ---------- */
app.get('/api/cart', authUser, function (req, res) {
  res.json({ items: req.user.cart || [] });
});

app.put('/api/cart', authUser, function (req, res) {
  const items = (req.body && Array.isArray(req.body.items)) ? req.body.items : [];
  req.user.cart = items;
  saveDb();
  res.json({ items: req.user.cart });
});

/* ---------- Orders ---------- */
app.post('/api/orders', authUser, function (req, res) {
  const items = (req.body && Array.isArray(req.body.items)) ? req.body.items : [];
  if (!items.length) {
    return res.status(400).json({ error: 'Order is empty.' });
  }
  const order = {
    id: 'ALI-ORD-' + db.orders.length + 1001,
    reference: newRef('ALI-ORD'),
    items: items,
    total: items.reduce(function (s, it) { return s + (it.qty || 1) * (it.price || 0); }, 0),
    status: 'Processing',
    placedAt: new Date().toISOString()
  };
  db.orders.push(order);
  req.user.orders = req.user.orders || [];
  req.user.orders.push(order.id);
  req.user.cart = [];
  saveDb();
  res.json({ order: order });
});

app.get('/api/orders', authUser, function (req, res) {
  const ids = req.user.orders || [];
  const orders = db.orders.filter(function (o) { return ids.indexOf(o.id) !== -1; });
  res.json({ orders: orders });
});

/* ---------- Donations ---------- */
app.post('/api/donations', function (req, res) {
  const body = req.body || {};
  const amount = Number(body.amount) || 0;
  const method = String(body.method || 'card');
  if (amount <= 0) {
    return res.status(400).json({ error: 'A valid donation amount is required.' });
  }
  const donation = {
    reference: newRef('ALI-DON'),
    amount: amount,
    method: method,
    donor: req.user ? publicUser(req.user) : null,
    at: new Date().toISOString()
  };
  db.donors.push(donation);
  saveDb();
  res.json({ reference: donation.reference, amount: amount });
});

/* ---------- Subscriptions ---------- */
app.post('/api/subscriptions', function (req, res) {
  const body = req.body || {};
  const plan = String(body.plan || '');
  const period = String(body.period || '');
  if (!plan || !period) {
    return res.status(400).json({ error: 'Plan and period are required.' });
  }
  const subscription = {
    reference: newRef('ALI-SUB'),
    plan: plan,
    period: period,
    member: req.user ? publicUser(req.user) : null,
    at: new Date().toISOString()
  };
  saveDb();
  res.json({
    reference: subscription.reference,
    plan: plan,
    period: period,
    nextBilling: body.nextBilling || null
  });
});

/* ---------- Health / static ---------- */
app.get('/api/health', function (req, res) {
  res.json({ ok: true, service: 'AlioStore API', time: new Date().toISOString() });
});

app.use(express.static(FRONTEND));

app.get('*', function (req, res) {
  res.sendFile(path.join(FRONTEND, 'index.html'));
});

app.listen(PORT, function () {
  console.log('AlioStore server running:');
  console.log('  Frontend: http://localhost:' + PORT + '/');
  console.log('  API:      http://localhost:' + PORT + '/api/health');
});