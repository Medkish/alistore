import type { Book } from '@/lib/types';

export const CATALOG: Book[] = [
  { id: 'python', title: 'Python', author: 'Kamara', price: 40, image: '/alistore/images/programming1.jpeg', description: 'The complete Python guide — syntax, data structures, OOP and real-world projects.', pages: 320, rating: 4.8, category: 'python', prevPrice: 50, stock: 24 },
  { id: 'javascript', title: 'JavaScript', author: 'Tessie', price: 40, image: '/alistore/images/programming2.jpeg', description: 'Modern JavaScript from the basics to async patterns and the browser DOM.', pages: 340, rating: 4.7, category: 'javascript', prevPrice: 50, stock: 18 },
  { id: 'javascript-deep-dive', title: 'JavaScript Deep Dive', author: 'Kamara', price: 29.99, image: '/alistore/images/product-item1.jpg', description: 'A deeper, hands-on journey through JavaScript — closures, the event loop, promises and performance.', pages: 410, rating: 4.9, prevPrice: 39.99, category: 'javascript', stock: 12 },
  { id: 'ruby', title: 'Ruby', author: 'Tessie', price: 40, image: '/alistore/images/programming3.jpeg', description: 'A beautiful, human-friendly language for building elegant products.', pages: 290, rating: 4.6, category: 'programming', prevPrice: 50, stock: 15 },
  { id: 'cpp', title: 'C++', author: 'Kamara', price: 35, image: '/alistore/images/programming4.jpeg', description: 'C++ fundamentals — memory, classes, templates and the standard library.', pages: 380, rating: 4.7, category: 'programming', prevPrice: 45, stock: 9 },
  { id: 'swift', title: 'Swift', author: 'Tessie', price: 40, image: '/alistore/images/programming5.jpeg', description: 'Build for Apple platforms with Swift — types, concurrency and SwiftUI basics.', pages: 310, rating: 4.5, category: 'frontend', prevPrice: 50, stock: 21 },
  { id: 'kotlin', title: 'Kotlin', author: 'Kamara', price: 40, image: '/alistore/images/programming6.jpeg', description: 'Expressive JVM & Android development with Kotlin idioms and coroutines.', pages: 300, rating: 4.6, category: 'backend', prevPrice: 50, stock: 7 },
  { id: 'php', title: 'PHP', author: 'Tessie', price: 40, image: '/alistore/images/programming1.jpeg', description: 'Server-side scripting with PHP — forms, sessions, PDO and modern practices.', pages: 280, rating: 4.4, category: 'web-development', prevPrice: 50, stock: 30 },
  { id: 'java', title: 'Java', author: 'Kamara', price: 45, image: '/alistore/images/programming5.jpeg', description: 'Professional Java — OOP, collections, streams and building robust apps.', pages: 360, rating: 4.7, category: 'backend', prevPrice: 55, stock: 6 },
  { id: 'go', title: 'Go', author: 'Tessie', price: 40, image: '/alistore/images/programming3.jpeg', description: 'Concurrency-first Go — goroutines, channels, packaging and the ecosystem.', pages: 270, rating: 4.6, category: 'backend', prevPrice: 50, stock: 14 },
  { id: 'rust', title: 'Rust', author: 'Kamara', price: 45, image: '/alistore/images/Tessie1.png', description: 'Memory-safe systems programming that runs at blazing speed.', pages: 330, rating: 4.9, category: 'programming', prevPrice: 50, stock: 0 },
  { id: 'typescript', title: 'TypeScript', author: 'Tessie', price: 39.99, image: '/alistore/images/programming2.jpeg', description: 'Type-safe JavaScript — types, generics, interfaces and modern tooling.', pages: 360, rating: 4.8, category: 'javascript', prevPrice: 49.99, stock: 17 },
  { id: 'csharp', title: 'C#', author: 'Kamara', price: 42, image: '/alistore/images/programming4.jpeg', description: 'Modern .NET development — OOP, LINQ, async, ASP.NET and EF Core.', pages: 340, rating: 4.7, category: 'programming', prevPrice: 52, stock: 11 },
  { id: 'dart', title: 'Dart', author: 'Tessie', price: 40, image: '/alistore/images/programming6.jpeg', description: 'Cross-platform apps with Flutter — Dart types, OOP, async and widgets.', pages: 320, rating: 4.6, category: 'frontend', prevPrice: 50, stock: 19 },
  { id: 'shell', title: 'Shell Scripting', author: 'Kamara', price: 35, image: '/alistore/images/programming5.jpeg', description: 'Automate everything — Bash, pipes, control flow, functions and cron.', pages: 300, rating: 4.5, category: 'backend', prevPrice: 45, stock: 5 },
  { id: 'c', title: 'C Programming', author: 'Kamara', price: 40, image: '/alistore/images/programming3.jpeg', description: 'The classic systems language — pointers, memory, structs and building fast software from scratch.', pages: 370, rating: 4.7, category: 'programming', prevPrice: 50, stock: 12 },
  { id: 'r', title: 'R', author: 'Tessie', price: 40, image: '/alistore/images/programming4.jpeg', description: 'Statistical computing and data science with R — tidyverse, ggplot2 and reproducible analysis.', pages: 305, rating: 4.5, category: 'programming', prevPrice: 50, stock: 8 },
  { id: 'perl', title: 'Perl', author: 'Kamara', price: 35, image: '/alistore/images/programming5.jpeg', description: 'The practical extraction and reporting language — regex, one-liners, CGI and server automation.', pages: 285, rating: 4.4, category: 'web-development', prevPrice: 45, stock: 10 },
  { id: 'haskell', title: 'Haskell', author: 'Tessie', price: 40, image: '/alistore/images/programming6.jpeg', description: 'Pure functional programming — types, laziness, monads and building correct concurrent systems.', pages: 335, rating: 4.6, category: 'programming', prevPrice: 50, stock: 7 },
  { id: 'sql', title: 'SQL', author: 'Kamara', price: 38, image: '/alistore/images/programming2.jpeg', description: 'Master database querying — joins, indexes, transactions and designing normalized schemas.', pages: 320, rating: 4.5, category: 'web-development', prevPrice: 45, stock: 12 },
  { id: 'matlab', title: 'MATLAB', author: 'Tessie', price: 45, image: '/alistore/images/programming4.jpeg', description: 'Numerical computing, matrices, simulation and data visualization with MATLAB.', pages: 350, rating: 4.6, category: 'programming', prevPrice: 55, stock: 9 },
  { id: 'scala', title: 'Scala', author: 'Kamara', price: 42, image: '/alistore/images/programming1.jpeg', description: 'Scalable functional and object-oriented programming on the JVM with Scala.', pages: 340, rating: 4.7, category: 'backend', prevPrice: 50, stock: 8 },
  { id: 'lua', title: 'Lua', author: 'Tessie', price: 30, image: '/alistore/images/programming6.jpeg', description: 'Lightweight scripting for games and embedded systems — tables, coroutines and the C API.', pages: 280, rating: 4.5, category: 'backend', prevPrice: 38, stock: 11 },
];

export const CATEGORIES: { slug: string; name: string }[] = [
  { slug: 'all', name: 'All Books' },
  { slug: 'programming', name: 'Programming' },
  { slug: 'javascript', name: 'JavaScript' },
  { slug: 'python', name: 'Python' },
  { slug: 'web-development', name: 'Web Development' },
  { slug: 'frontend', name: 'Frontend' },
  { slug: 'backend', name: 'Backend' },
];

export function getBook(id: string): Book | undefined {
  return CATALOG.find((b) => b.id === id);
}