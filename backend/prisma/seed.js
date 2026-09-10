/* AlioStore database seed - 10 categories, books, demo users (CUSTOMER + ADMIN) */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

const METADATA = {
  python: { isbn: '978-1-688-00001-1', edition: '3rd Edition', pages: 320 },
  javascript: { isbn: '978-1-688-00002-8', edition: '2nd Edition', pages: 340 },
  'javascript-deep-dive': { isbn: '978-1-688-00003-5', edition: '1st Edition', pages: 410 },
  ruby: { isbn: '978-1-688-00004-2', edition: '2nd Edition', pages: 290 },
  cpp: { isbn: '978-1-688-00005-9', edition: '4th Edition', pages: 380 },
  swift: { isbn: '978-1-688-00006-6', edition: '1st Edition', pages: 310 },
  kotlin: { isbn: '978-1-688-00007-3', edition: '1st Edition', pages: 300 },
  php: { isbn: '978-1-688-00008-0', edition: '3rd Edition', pages: 280 },
  java: { isbn: '978-1-688-00009-7', edition: '5th Edition', pages: 360 },
  go: { isbn: '978-1-688-00010-3', edition: '2nd Edition', pages: 270 },
  rust: { isbn: '978-1-688-00011-0', edition: '1st Edition', pages: 330 },
  database: { isbn: '978-1-688-00012-7', edition: '2nd Edition', pages: 300 },
  devops: { isbn: '978-1-688-00013-4', edition: '1st Edition', pages: 320 },
  ai: { isbn: '978-1-688-00014-1', edition: '1st Edition', pages: 350 },
  cybersecurity: { isbn: '978-1-688-00015-8', edition: '1st Edition', pages: 290 }
};

const CATEGORIES = [
  { slug: 'programming', name: 'Programming' },
  { slug: 'javascript', name: 'JavaScript' },
  { slug: 'python', name: 'Python' },
  { slug: 'web-development', name: 'Web Development' },
  { slug: 'database', name: 'Database' },
  { slug: 'frontend', name: 'Frontend' },
  { slug: 'backend', name: 'Backend' },
  { slug: 'devops', name: 'DevOps' },
  { slug: 'ai', name: 'Artificial Intelligence' },
  { slug: 'cybersecurity', name: 'Cybersecurity' }
];

const BOOK_CATEGORY = {
  python: 'python',
  javascript: 'javascript',
  'javascript-deep-dive': 'javascript',
  ruby: 'programming',
  cpp: 'programming',
  swift: 'frontend',
  kotlin: 'backend',
  php: 'web-development',
  java: 'backend',
  go: 'backend',
  rust: 'programming',
  database: 'database',
  devops: 'devops',
  ai: 'ai',
  cybersecurity: 'cybersecurity'
};

const BOOKS = [
  {
    slug: 'python',
    title: 'Python',
    author: 'Armor Ramsey',
    description: 'The complete Python guide — syntax, data structures, OOP and real-world projects.',
    price: 40,
    prevPrice: 50,
    stock: 12,
    rating: 4.8,
    coverImage: 'images/programming1.jpeg',
    publishedAt: '2024-06-01T00:00:00Z',
    featured: true,
    bestseller: true
  },
  {
    slug: 'javascript',
    title: 'JavaScript',
    author: 'Armor Ramsey',
    description: 'Modern JavaScript from the basics to async patterns and the browser DOM.',
    price: 40,
    prevPrice: 50,
    stock: 15,
    rating: 4.7,
    coverImage: 'images/programming2.jpeg',
    publishedAt: '2024-03-15T00:00:00Z',
    featured: true,
    bestseller: true
  },
  {
    slug: 'javascript-deep-dive',
    title: 'JavaScript Deep Dive',
    author: 'AlioStore',
    description: 'A deeper, hands-on journey through JavaScript — closures, the event loop, promises and performance.',
    price: 29.99,
    prevPrice: 39.99,
    stock: 12,
    rating: 4.9,
    coverImage: 'images/product-item1.jpg',
    publishedAt: '2025-01-20T00:00:00Z',
    featured: false,
    bestseller: true
  },
  {
    slug: 'ruby',
    title: 'Ruby',
    author: 'Armor Ramsey',
    description: 'A beautiful, human-friendly language for building elegant products.',
    price: 40,
    prevPrice: 50,
    stock: 8,
    rating: 4.6,
    coverImage: 'images/programming3.jpeg',
    publishedAt: '2023-11-05T00:00:00Z',
    featured: false,
    bestseller: true
  },
  {
    slug: 'cpp',
    title: 'C++',
    author: 'Armor Ramsey',
    description: 'C++ fundamentals — memory, classes, templates and the standard library.',
    price: 35,
    prevPrice: 45,
    stock: 14,
    rating: 4.7,
    coverImage: 'images/programming4.jpeg',
    publishedAt: '2024-09-12T00:00:00Z',
    featured: false,
    bestseller: true
  },
  {
    slug: 'swift',
    title: 'Swift',
    author: 'Armor Ramsey',
    description: 'Build for Apple platforms with Swift — types, concurrency and SwiftUI basics.',
    price: 40,
    prevPrice: 50,
    stock: 6,
    rating: 4.5,
    coverImage: 'images/programming5.jpeg',
    publishedAt: '2024-02-28T00:00:00Z',
    featured: true,
    bestseller: false
  },
  {
    slug: 'kotlin',
    title: 'Kotlin',
    author: 'Armor Ramsey',
    description: 'Expressive JVM & Android development with Kotlin idioms and coroutines.',
    price: 40,
    prevPrice: 50,
    stock: 9,
    rating: 4.6,
    coverImage: 'images/programming6.jpeg',
    publishedAt: '2024-05-10T00:00:00Z',
    featured: true,
    bestseller: false
  },
  {
    slug: 'php',
    title: 'PHP',
    author: 'Armor Ramsey',
    description: 'Server-side scripting with PHP — forms, sessions, PDO and modern practices.',
    price: 40,
    prevPrice: 50,
    stock: 11,
    rating: 4.4,
    coverImage: 'images/programming1.jpeg',
    publishedAt: '2023-08-19T00:00:00Z',
    featured: false,
    bestseller: false
  },
  {
    slug: 'java',
    title: 'Java',
    author: 'Armor Ramsey',
    description: 'Professional Java — OOP, collections, streams and building robust apps.',
    price: 45,
    prevPrice: 55,
    stock: 10,
    rating: 4.7,
    coverImage: 'images/programming5.jpeg',
    publishedAt: '2024-01-25T00:00:00Z',
    featured: true,
    bestseller: false
  },
  {
    slug: 'go',
    title: 'Go',
    author: 'Armor Ramsey',
    description: 'Concurrency-first Go — goroutines, channels, packaging and the ecosystem.',
    price: 40,
    prevPrice: 50,
    stock: 7,
    rating: 4.6,
    coverImage: 'images/programming3.jpeg',
    publishedAt: '2024-07-08T00:00:00Z',
    featured: false,
    bestseller: false
  },
  {
    slug: 'rust',
    title: 'Rust',
    author: 'Alio & Palma Cooperative',
    description: 'The official AlioStore guide to safe, fast systems programming with Rust.',
    price: 45,
    prevPrice: 50,
    stock: 25,
    rating: 4.9,
    coverImage: 'images/product4.jpg',
    publishedAt: '2025-03-01T00:00:00Z',
    featured: true,
    bestseller: true
  },
  {
    slug: 'database',
    title: 'Database Systems',
    author: 'AlioStore',
    description: 'SQL, indexes, transactions and schema design — the database skills every developer needs.',
    price: 39.99,
    prevPrice: 49.99,
    stock: 10,
    rating: 4.7,
    coverImage: 'images/programming2.jpeg',
    publishedAt: '2025-05-10T00:00:00Z',
    featured: true,
    bestseller: false
  },
  {
    slug: 'devops',
    title: 'DevOps Handbook',
    author: 'Alio & Palma Cooperative',
    description: 'CI/CD, containers, Kubernetes and observability — shipping software the modern way.',
    price: 42,
    prevPrice: 52,
    stock: 9,
    rating: 4.8,
    coverImage: 'images/programming4.jpeg',
    publishedAt: '2025-06-01T00:00:00Z',
    featured: true,
    bestseller: false
  },
  {
    slug: 'ai',
    title: 'AI & Machine Learning',
    author: 'AlioStore',
    description: 'From linear models to neural networks and LLMs — machine learning made practical.',
    price: 49.99,
    prevPrice: 59.99,
    stock: 8,
    rating: 4.9,
    coverImage: 'images/product-item1.jpg',
    publishedAt: '2025-07-15T00:00:00Z',
    featured: true,
    bestseller: true
  },
  {
    slug: 'cybersecurity',
    title: 'Cybersecurity Essentials',
    author: 'Alio & Palma Cooperative',
    description: 'Threat modeling, cryptography, web security and incident response for builders.',
    price: 44,
    prevPrice: 54,
    stock: 5,
    rating: 4.6,
    coverImage: 'images/product4.jpg',
    publishedAt: '2025-08-01T00:00:00Z',
    featured: false,
    bestseller: false
  }
];

async function main() {
  const categoryMap = {};
  for (const c of CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name },
      create: c
    });
    categoryMap[c.slug] = cat.id;
  }

  for (const b of BOOKS) {
    const { slug, ...data } = b;
    const meta = METADATA[slug] || { pages: 300 };
    const categorySlug = BOOK_CATEGORY[slug] || 'programming';
    let toc = [];
    let tocRaw = '';
    try {
      tocRaw = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'books', slug, 'toc.json'), 'utf8');
      toc = JSON.parse(tocRaw).chapters || [];
    } catch (e) {
      toc = [];
    }
    const common = { ...data, categoryId: categoryMap[categorySlug], pages: meta.pages, edition: meta.edition, isbn: meta.isbn, toc, samplePath: 'books/' + slug + '/sample.json', contentPath: 'books/' + slug + '/content.json' };
    await prisma.book.upsert({
      where: { slug },
      update: common,
      create: { slug, ...common }
    });
  }

  const demoPassword = bcrypt.hashSync('password123', 10);
  await prisma.user.upsert({
    where: { email: 'demo@aliostore.com' },
    update: {},
    create: {
      name: 'Demo Member',
      email: 'demo@aliostore.com',
      mobile: '+971500000000',
      passwordHash: demoPassword,
      role: 'CUSTOMER',
      cart: []
    }
  });

  const adminPassword = bcrypt.hashSync('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@aliostore.com' },
    update: {},
    create: {
      name: 'Store Admin',
      email: 'admin@aliostore.com',
      mobile: '+971500000001',
      passwordHash: adminPassword,
      role: 'ADMIN',
      cart: []
    }
  });

  console.log(
    'Seed complete: ' + CATEGORIES.length + ' categories, ' + BOOKS.length + ' books, demo users (demo@aliostore.com / password123 · admin@aliostore.com / admin123)'
  );
}

main()
  .then(function () { return prisma.$disconnect(); })
  .catch(async function (e) {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });