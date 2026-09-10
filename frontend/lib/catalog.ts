import type { Book } from '@/lib/types';

export const CATALOG: Book[] = [
  { id: 'python', title: 'Python', author: 'Armor Ramsey', price: 40, image: '/images/programming1.jpeg', description: 'The friendliest path into programming — data, automation and scripting.', pages: 320, rating: 4.8 },
  { id: 'javascript', title: 'JavaScript', author: 'Armor Ramsey', price: 40, image: '/images/programming2.jpeg', description: 'Master the language of the web, from the DOM to modern async patterns.', pages: 340, rating: 4.7 },
  { id: 'ruby', title: 'Ruby', author: 'Armor Ramsey', price: 40, image: '/images/programming3.jpeg', description: 'A beautiful, human-friendly language for building elegant products.', pages: 290, rating: 4.6 },
  { id: 'cpp', title: 'C++', author: 'Armor Ramsey', price: 35, image: '/images/programming4.jpeg', description: 'Performance-oriented programming with control at every level.', pages: 380, rating: 4.5 },
  { id: 'swift', title: 'Swift', author: 'Armor Ramsey', price: 40, image: '/images/programming5.jpeg', description: 'Build modern iOS and macOS apps with confidence and safety.', pages: 310, rating: 4.7 },
  { id: 'kotlin', title: 'Kotlin', author: 'Armor Ramsey', price: 40, image: '/images/programming6.jpeg', description: 'The expressive JVM language for Android and server-side code.', pages: 300, rating: 4.6 },
  { id: 'php', title: 'PHP', author: 'Armor Ramsey', price: 40, image: '/images/programming1.jpeg', description: 'Powering the majority of the web — from backends to APIs.', pages: 280, rating: 4.4 },
  { id: 'java', title: 'Java', author: 'Armor Ramsey', price: 45, image: '/images/programming5.jpeg', description: 'The battle-tested language behind enterprise and Android systems.', pages: 360, rating: 4.5 },
  { id: 'go', title: 'Go', author: 'Armor Ramsey', price: 40, image: '/images/programming3.jpeg', description: 'Simple, fast and concurrent — the cloud-native favourite.', pages: 270, rating: 4.6 },
  { id: 'rust', title: 'Rust', author: 'Alio & Palma Cooperative', price: 45, image: '/images/product4.jpg', description: 'Memory-safe systems programming that runs at blazing speed.', pages: 330, rating: 4.9 },
];

export function getBook(id: string): Book | undefined {
  return CATALOG.find((b) => b.id === id);
}