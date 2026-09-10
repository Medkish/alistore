const bookService = require('../services/book.service');

function num(v) {
  return v === undefined || v === null || v === '' ? undefined : v;
}

async function list(req, res) {
  const result = await bookService.list({
    search: num(String(req.query.search || req.query.q || '').trim()),
    category: num(String(req.query.category || '').trim()),
    minPrice: req.query.minPrice,
    maxPrice: req.query.maxPrice,
    minRating: req.query.minRating,
    sort: num(req.query.sort),
    page: num(req.query.page),
    pageSize: num(req.query.pageSize || req.query.limit)
  });
  res.json(result);
}

async function get(req, res) {
  const book = await bookService.getBySlug(String(req.params.slug));
  if (!book) return res.status(404).json({ error: 'Book not found.' });
  res.json({ book });
}

async function listCategories(req, res) {
  const categories = await bookService.listCategories();
  res.json({ categories });
}

module.exports = { list, get, listCategories };