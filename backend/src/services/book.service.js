const prisma = require('../lib/prisma');

function serialize(book) {
  return {
    id: book.slug,
    slug: book.slug,
    title: book.title,
    author: book.author,
    description: book.description,
    price: Number(book.price),
    prevPrice: book.prevPrice == null ? null : Number(book.prevPrice),
    stock: book.stock,
    rating: Number(book.rating),
    publicationDate: book.publishedAt ? book.publishedAt.toISOString() : null,
    image: book.coverImage,
    coverImage: book.coverImage,
    category: book.category ? { id: book.category.id, name: book.category.name, slug: book.category.slug } : null,
    featured: book.featured,
    bestseller: book.bestseller
  };
}

const SORTS = {
  newest: { publishedAt: 'desc' },
  'price-asc': { price: 'asc' },
  'price-desc': { price: 'desc' },
  'rating-desc': { rating: 'desc' },
  'rating-asc': { rating: 'asc' },
  title: { title: 'asc' }
};

function parseNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

async function list({ search, category, minPrice, maxPrice, minRating, sort, page, pageSize }) {
  const where = {};
  const s = String(search || '').trim();
  if (s) {
    where.OR = [
      { title: { contains: s, mode: 'insensitive' } },
      { author: { contains: s, mode: 'insensitive' } },
      { description: { contains: s, mode: 'insensitive' } }
    ];
  }
  if (category) {
    const cat = await prisma.category.findUnique({ where: { slug: category } });
    if (!cat) {
      const p = Math.max(1, Number(page) || 1);
      const size = Math.min(50, Math.max(1, Number(pageSize) || 12));
      return { books: [], total: 0, page: p, pageSize: size, totalPages: 0 };
    }
    where.categoryId = cat.id;
  }
  const lo = parseNum(minPrice);
  const hi = parseNum(maxPrice);
  if (lo != null || hi != null) {
    where.price = {};
    if (lo != null) where.price.gte = lo;
    if (hi != null) where.price.lte = hi;
  }
  const rMin = parseNum(minRating);
  if (rMin != null) {
    where.rating = { gte: rMin };
  }

  const p = Math.max(1, Number(page) || 1);
  const size = Math.min(50, Math.max(1, Number(pageSize) || 12));
  const orderBy = SORTS[String(sort || '')] || SORTS.newest;

  const [total, books] = await Promise.all([
    prisma.book.count({ where }),
    prisma.book.findMany({
      where,
      include: { category: true },
      orderBy,
      skip: (p - 1) * size,
      take: size
    })
  ]);

  return {
    books: books.map(serialize),
    total,
    page: p,
    pageSize: size,
    totalPages: Math.ceil(total / size)
  };
}

async function getBySlug(slug) {
  const book = await prisma.book.findUnique({ where: { slug }, include: { category: true } });
  return book ? serialize(book) : null;
}

async function listCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { books: true } } }
  });
  return categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, bookCount: c._count.books }));
}

async function ensureCategory(slugOrName) {
  const key = String(slugOrName || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  const existing = await prisma.category.findUnique({ where: { slug: key } });
  if (existing) return existing;
  return prisma.category.create({ data: { name: String(slugOrName).trim() || 'General', slug: key || 'general' } });
}

async function createBook(data) {
  const category = await ensureCategory(data.category);
  const slug = String(data.slug || data.title || 'book')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) throw new Error('Book needs a title or slug.');

  const record = await prisma.book.create({
    data: {
      slug,
      title: String(data.title || '').trim(),
      author: String(data.author || 'AlioStore').trim(),
      description: String(data.description || '').trim(),
      price: parseFloat(data.price),
      prevPrice: data.prevPrice != null && data.prevPrice !== '' ? parseFloat(data.prevPrice) : null,
      stock: parseInt(data.stock || 0, 10),
      rating: parseFloat(data.rating || 4.5),
      coverImage: String(data.coverImage || data.image || '').trim(),
      featured: !!data.featured,
      bestseller: !!data.bestseller,
      published: data.published !== false,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : new Date(),
      categoryId: category.id
    },
    include: { category: true }
  });
  return serialize(record);
}

async function updateBook(slug, data) {
  const existing = await prisma.book.findUnique({ where: { slug } });
  if (!existing) throw new Error('Book not found.');
  const patch = {};
  if (data.title != null) patch.title = String(data.title).trim();
  if (data.author != null) patch.author = String(data.author).trim();
  if (data.description != null) patch.description = String(data.description).trim();
  if (data.price != null) patch.price = parseFloat(data.price);
  if (data.prevPrice != null) patch.prevPrice = data.prevPrice === '' ? null : parseFloat(data.prevPrice);
  if (data.stock != null) patch.stock = parseInt(data.stock, 10);
  if (data.rating != null) patch.rating = parseFloat(data.rating);
  if (data.coverImage != null) patch.coverImage = String(data.coverImage).trim();
  if (data.featured != null) patch.featured = !!data.featured;
  if (data.bestseller != null) patch.bestseller = !!data.bestseller;
  if (data.published != null) patch.published = data.published !== false;
  if (data.publishedAt != null) patch.publishedAt = new Date(data.publishedAt);
  if (data.category) {
    const category = await ensureCategory(data.category);
    patch.categoryId = category.id;
  }
  const record = await prisma.book.update({ where: { id: existing.id }, data: patch, include: { category: true } });
  return serialize(record);
}

async function deleteBook(slug) {
  const existing = await prisma.book.findUnique({ where: { slug } });
  if (!existing) {
    const err = new Error('Book not found.');
    err.status = 404;
    throw err;
  }
  await prisma.book.delete({ where: { id: existing.id } });
  return { ok: true };
}

async function reserveStock(items) {
  for (const it of items) {
    if (!it.bookId) continue;
    const book = await prisma.book.findUnique({ where: { id: it.bookId } });
    if (!book || book.stock < it.qty) {
      const err = new Error('Not enough stock for "' + (book ? book.title : 'book') + '".');
      err.status = 409;
      throw err;
    }
    await prisma.book.update({ where: { id: it.bookId }, data: { stock: { decrement: it.qty } } });
  }
}

async function getBySlugOrNull(slug) {
  return prisma.book.findUnique({ where: { slug } });
}

module.exports = { list, getBySlug, getBySlugOrNull, listCategories, serialize, reserveStock, ensureCategory, createBook, updateBook, deleteBook };