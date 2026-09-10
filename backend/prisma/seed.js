/* AlioStore database seed - categories, books, demo users (CUSTOMER + ADMIN) */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

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
  }
];

async function main() {
  const category = await prisma.category.upsert({
    where: { slug: 'programming' },
    update: {},
    create: { name: 'Programming', slug: 'programming' }
  });

  for (const b of BOOKS) {
    const { slug, ...data } = b;
    await prisma.book.upsert({
      where: { slug },
      update: { ...data, categoryId: category.id },
      create: { slug, ...data, categoryId: category.id }
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
    'Seed complete: 1 category, ' + BOOKS.length + ' books, demo users (demo@aliostore.com / password123 · admin@aliostore.com / admin123)'
  );
}

main()
  .then(function () { return prisma.$disconnect(); })
  .catch(async function (e) {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });