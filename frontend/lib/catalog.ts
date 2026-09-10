import type { Book } from '@/lib/types';

export const CATALOG: Book[] = [
  { id: 'python', title: 'Python', author: 'Armor Ramsey', price: 40, image: '/images/programming1.jpeg', description: 'The complete Python guide — syntax, data structures, OOP and real-world projects.', pages: 320, rating: 4.8, category: 'python', prevPrice: 50 },
  { id: 'javascript', title: 'JavaScript', author: 'Armor Ramsey', price: 40, image: '/images/programming2.jpeg', description: 'Modern JavaScript from the basics to async patterns and the browser DOM.', pages: 340, rating: 4.7, category: 'javascript', prevPrice: 50 },
  { id: 'javascript-deep-dive', title: 'JavaScript Deep Dive', author: 'AlioStore', price: 29.99, image: '/images/product-item1.jpg', description: 'A deeper, hands-on journey through JavaScript — closures, the event loop, promises and performance.', pages: 410, rating: 4.9, prevPrice: 39.99, category: 'javascript' },
  { id: 'ruby', title: 'Ruby', author: 'Armor Ramsey', price: 40, image: '/images/programming3.jpeg', description: 'A beautiful, human-friendly language for building elegant products.', pages: 290, rating: 4.6, category: 'programming', prevPrice: 50 },
  { id: 'cpp', title: 'C++', author: 'Armor Ramsey', price: 35, image: '/images/programming4.jpeg', description: 'C++ fundamentals — memory, classes, templates and the standard library.', pages: 380, rating: 4.7, category: 'programming', prevPrice: 45 },
  { id: 'swift', title: 'Swift', author: 'Armor Ramsey', price: 40, image: '/images/programming5.jpeg', description: 'Build for Apple platforms with Swift — types, concurrency and SwiftUI basics.', pages: 310, rating: 4.5, category: 'frontend', prevPrice: 50 },
  { id: 'kotlin', title: 'Kotlin', author: 'Armor Ramsey', price: 40, image: '/images/programming6.jpeg', description: 'Expressive JVM & Android development with Kotlin idioms and coroutines.', pages: 300, rating: 4.6, category: 'backend', prevPrice: 50 },
  { id: 'php', title: 'PHP', author: 'Armor Ramsey', price: 40, image: '/images/programming1.jpeg', description: 'Server-side scripting with PHP — forms, sessions, PDO and modern practices.', pages: 280, rating: 4.4, category: 'web-development', prevPrice: 50 },
  { id: 'java', title: 'Java', author: 'Armor Ramsey', price: 45, image: '/images/programming5.jpeg', description: 'Professional Java — OOP, collections, streams and building robust apps.', pages: 360, rating: 4.7, category: 'backend', prevPrice: 55 },
  { id: 'go', title: 'Go', author: 'Armor Ramsey', price: 40, image: '/images/programming3.jpeg', description: 'Concurrency-first Go — goroutines, channels, packaging and the ecosystem.', pages: 270, rating: 4.6, category: 'backend', prevPrice: 50 },
  { id: 'rust', title: 'Rust', author: 'Alio & Palma Cooperative', price: 45, image: '/images/product4.jpg', description: 'The official AlioStore guide to safe, fast systems programming with Rust.', pages: 330, rating: 4.9, category: 'programming', prevPrice: 50 },
  { id: 'database', title: 'Database Systems', author: 'AlioStore', price: 39.99, image: '/images/programming2.jpeg', description: 'SQL, indexes, transactions and schema design — the database skills every developer needs.', pages: 300, rating: 4.7, category: 'database', prevPrice: 49.99 },
  { id: 'devops', title: 'DevOps Handbook', author: 'Alio & Palma Cooperative', price: 42, image: '/images/programming4.jpeg', description: 'CI/CD, containers, Kubernetes and observability — shipping software the modern way.', pages: 320, rating: 4.8, category: 'devops', prevPrice: 52 },
  { id: 'ai', title: 'AI & Machine Learning', author: 'AlioStore', price: 49.99, image: '/images/product-item1.jpg', description: 'From linear models to neural networks and LLMs — machine learning made practical.', pages: 350, rating: 4.9, category: 'ai', prevPrice: 59.99 },
  { id: 'cybersecurity', title: 'Cybersecurity Essentials', author: 'Alio & Palma Cooperative', price: 44, image: '/images/product4.jpg', description: 'Threat modeling, cryptography, web security and incident response for builders.', pages: 290, rating: 4.6, category: 'cybersecurity', prevPrice: 54 },
];

export const CATEGORIES: { slug: string; name: string }[] = [
  { slug: 'all', name: 'All Books' },
  { slug: 'programming', name: 'Programming' },
  { slug: 'javascript', name: 'JavaScript' },
  { slug: 'python', name: 'Python' },
  { slug: 'web-development', name: 'Web Development' },
  { slug: 'database', name: 'Database' },
  { slug: 'frontend', name: 'Frontend' },
  { slug: 'backend', name: 'Backend' },
  { slug: 'devops', name: 'DevOps' },
  { slug: 'ai', name: 'Artificial Intelligence' },
  { slug: 'cybersecurity', name: 'Cybersecurity' },
];

export function getBook(id: string): Book | undefined {
  return CATALOG.find((b) => b.id === id);
}