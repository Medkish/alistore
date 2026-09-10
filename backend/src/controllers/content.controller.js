const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');
const orderService = require('../services/order.service');

const BOOKS_DIR = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'books');

function readJson(relPath) {
  const full = path.join(BOOKS_DIR, relPath);
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch {
    return null;
  }
}

async function loadBook(req) {
  const book = await prisma.book.findUnique({ where: { slug: String(req.params.slug).toLowerCase() } });
  if (!book) {
    const err = new Error('Book not found.');
    err.status = 404;
    throw err;
  }
  return book;
}

async function sample(req, res, next) {
  try {
    const book = await loadBook(req);
    const data = readJson(book.samplePath);
    if (!data) return res.status(404).json({ error: 'No sample available for this book.' });
    res.json({ sample: data });
  } catch (err) {
    next(err);
  }
}

/* The gate: full content is served ONLY to the owner of a paid order for this book. */
async function content(req, res, next) {
  try {
    const book = await loadBook(req);
    const owned = await orderService.hasPurchased(req.user.id, book.slug);
    if (!owned) {
      return res.status(403).json({
        error: 'This book is not in your library.',
        hint: 'Buy it and the full content unlocks instantly.'
      });
    }
    const data = readJson(book.contentPath);
    if (!data) return res.status(404).json({ error: 'Content file missing.' });
    res.json({ book: { title: book.title, slug: book.slug, author: book.author }, content: data });
  } catch (err) {
    next(err);
  }
}

/* Lightweight purchase check for the UI (the content endpoint itself is authoritative). */
async function access(req, res, next) {
  try {
    const book = await loadBook(req);
    const purchased = req.user ? await orderService.hasPurchased(req.user.id, book.slug) : false;
    res.json({ slug: book.slug, title: book.title, purchased });
  } catch (err) {
    next(err);
  }
}

module.exports = { sample, content, access };