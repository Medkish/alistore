const prisma = require('../lib/prisma');
const orderService = require('../services/order.service');

async function list(req, res, next) {
  try {
    const book = await prisma.book.findUnique({ where: { slug: req.params.slug } });
    if (!book) return res.status(404).json({ error: 'Book not found.' });
    const reviews = await prisma.review.findMany({
      where: { bookId: book.id, status: 'APPROVED' },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    const purchased = req.user ? await orderService.hasPurchased(req.user.id, book.slug) : false;
    const existing = req.user
      ? await prisma.review.findUnique({ where: { userId_bookId: { userId: req.user.id, bookId: book.id } } })
      : null;
    res.json({
      average: reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : null,
      count: reviews.length,
      purchased,
      submitted: !!existing,
      status: existing ? existing.status : null,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        text: r.text,
        user: r.user ? r.user.name : 'Reader',
        createdAt: r.createdAt.toISOString()
      }))
    });
  } catch (e) {
    next(e);
  }
}

async function create(req, res, next) {
  try {
    const rating = Math.round(Number((req.body && req.body.rating) || 0));
    const text = String((req.body && req.body.text) || '').trim();
    if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'Rating must be between 1 and 5 stars.' });
    if (text.length > 1000) return res.status(400).json({ error: 'Review text must be under 1000 characters.' });
    const book = await prisma.book.findUnique({ where: { slug: req.params.slug } });
    if (!book) return res.status(404).json({ error: 'Book not found.' });
    const purchased = await orderService.hasPurchased(req.user.id, book.slug);
    if (!purchased) return res.status(403).json({ error: 'Only verified buyers can review a book.' });
    const review = await prisma.review.upsert({
      where: { userId_bookId: { userId: req.user.id, bookId: book.id } },
      update: { rating, text, status: 'PENDING' },
      create: { rating, text, userId: req.user.id, bookId: book.id, status: 'PENDING' }
    });
    res.status(201).json({ review: { id: review.id, rating: review.rating, text: review.text, status: review.status } });
  } catch (e) {
    next(e);
  }
}

module.exports = { list, create };