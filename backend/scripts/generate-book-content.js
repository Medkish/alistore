/* Generates book content + samples + TOC as JSON files under frontend/public/books/<slug>/
   (Content is stored as files with URLs in the DB - never large blobs in Postgres.) */
const path = require('path');
const fs = require('fs');

const OUT_ROOT = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'books');

const BOOKS = [
  { slug: 'python', title: 'Python', author: 'Armor Ramsey', chapters: ['Getting Started with Python', 'Variables & Types', 'Control Flow', 'Functions', 'Data Structures', 'OOP in Practice', 'Real-World Projects'], sample: 'Python is the friendliest path into programming. In this opening chapter you learn why code matters and what Python lets you do in minutes, not months.' },
  { slug: 'javascript', title: 'JavaScript', author: 'Armor Ramsey', chapters: ['The Language of the Web', 'Variables, Scopes & Hoisting', 'Functions & Closures', 'Objects & Prototypes', 'The DOM in Depth', 'Async: Promises & Fetch', 'Modern Tooling'], sample: 'JavaScript powers every modern website. This chapter explains how browsers run your code and how a single script can transform a static page into an interactive product.' },
  { slug: 'javascript-deep-dive', title: 'JavaScript Deep Dive', author: 'AlioStore', chapters: ['The Event Loop Unpacked', 'Closures & the Execution Stack', 'Prototypal Inheritance', 'Async Patterns & Microtasks', 'Memory & Performance', 'Engines: V8, JSC & SpiderMonkey', 'Practical Debugging'], sample: 'Most tutorials stop where the interesting part begins. The Deep Dive opens with the event loop - the single concept that explains how asynchronous JavaScript really works.' },
  { slug: 'ruby', title: 'Ruby', author: 'Armor Ramsey', chapters: ['A Language for Humans', 'Objects Everywhere', 'Control Structures', 'Blocks, Procs & Lambdas', 'Classes & Modules', 'Metaprogramming Basics', 'Testing with RSpec'], sample: 'Ruby was designed to read like English. This chapter walks through your first program and the philosophy that makes Ruby fun to write and hard to put down.' },
  { slug: 'cpp', title: 'C++', author: 'Armor Ramsey', chapters: ['Compilation & the Toolchain', 'Types & Memory', 'Pointers & References', 'Classes & RAII', 'Templates & STL', 'Move Semantics', 'Modern C++ Best Practices'], sample: 'C++ gives you power and responsibility in equal measure. Start here with the compilation pipeline and how the language maps to real hardware.' },
  { slug: 'swift', title: 'Swift', author: 'Armor Ramsey', chapters: ['Swift & the Apple Ecosystem', 'Values, Types & Optionals', 'Functions & Closures', 'Protocols & Generics', 'Concurrency with Async/Await', 'SwiftUI Essentials'], sample: 'Swift is safe by design. This chapter introduces optionals and value semantics - the features that make crashes rare and code easy to reason about.' },
  { slug: 'kotlin', title: 'Kotlin', author: 'Armor Ramsey', chapters: ['Kotlin on the JVM', 'Null Safety', 'Functions & Lambdas', 'Classes, Data & Sealed Types', 'Coroutines', 'Android in Practice'], sample: 'Kotlin removes whole classes of bugs at compile time. This chapter focuses on null safety - the language feature developers praise more than any other.' },
  { slug: 'php', title: 'PHP', author: 'Armor Ramsey', chapters: ['PHP on the Server', 'Syntax & Types', 'Functions & Arrays', 'Forms & Sessions', 'PDO & Databases', 'Modern PHP & Composer'], sample: 'PHP powers most of the web. This chapter covers what happens when a request arrives and how PHP builds a page from templates, logic and data.' },
  { slug: 'java', title: 'Java', author: 'Armor Ramsey', chapters: ['The JVM & Tooling', 'OOP Fundamentals', 'Collections Framework', 'Streams & Lambda', 'Exceptions & Logging', 'Concurrency', 'Enterprise Patterns'], sample: 'Java runs everywhere. This chapter explains the JVM and why write-once-run-anywhere still shapes enterprise software decades later.' },
  { slug: 'go', title: 'Go', author: 'Armor Ramsey', chapters: ['Why Go', 'Packages & Modules', 'Types & Structs', 'Interfaces', 'Goroutines & Channels', 'The Standard Library', 'Building Services'], sample: 'Go puts concurrency first. This chapter introduces goroutines and channels - the primitives that make cloud-native software fast and simple.' },
  { slug: 'rust', title: 'Rust', author: 'Alio & Palma Cooperative', chapters: ['Ownership', 'Borrowing & Lifetimes', 'Patterns & Enums', 'Traits & Generics', 'Error Handling', 'Concurrency Without Fear'], sample: 'Rust guarantees memory safety without a garbage collector. This chapter tackles ownership - the idea that cleanly solves a decade of data-race bugs.' },
  { slug: 'database', title: 'Database Systems', author: 'AlioStore', chapters: ['Relational Fundamentals', 'SQL That Matters', 'Indexes & Query Plans', 'Transactions & Locks', 'Designing Schemas', 'PostgreSQL in Practice'], sample: 'Databases underpin every modern product. This chapter teaches the relational model and the SQL you will actually use on the job.' },
  { slug: 'devops', title: 'DevOps Handbook', author: 'Alio & Palma Cooperative', chapters: ['Continuous Integration', 'Containerisation with Docker', 'Kubernetes Basics', 'CI/CD Pipelines', 'Observability & Logging', 'Infrastructure as Code'], sample: 'DevOps is a culture made practical. This chapter walks through the pipeline that ships code to production safely and fast.' },
  { slug: 'ai', title: 'AI & Machine Learning', author: 'AlioStore', chapters: ['What is Learning?', 'Linear Models', 'Neural Networks', 'Training & Overfitting', 'NLP & LLMs', 'Deploying Models'], sample: 'Artificial intelligence learns from examples. This chapter explains the core idea of gradient descent that powers everything from regression to large language models.' },
  { slug: 'cybersecurity', title: 'Cybersecurity Essentials', author: 'Alio & Palma Cooperative', chapters: ['The Threat Model', 'Cryptography Basics', 'Web Security & OWASP', 'Network Defences', 'Identity & Access', 'Incident Response'], sample: 'Security is a mindset, not a tool. This chapter teaches the threat model you use to harden any application - starting with the ones you build.' }
];

function makeChapters(chapters) {
  return chapters.map((title, i) => ({
    title,
    paragraphs: [
      `Chapter ${i + 1}: ${title}. This section builds on everything that came before and introduces the ideas you will keep using for the rest of the book.`,
      'Each topic is explained step by step with short, runnable examples. Typing along rather than copy-pasting is the fastest way to make the material stick.',
      'By the end of the chapter you should answer the "Exercises" box at the bottom. Answers and further reading are referenced in the appendix.'
    ]
  }));
}

for (const b of BOOKS) {
  const dir = path.join(OUT_ROOT, b.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'content.json'), JSON.stringify({ slug: b.slug, title: b.title, chapters: makeChapters(b.chapters) }, null, 2));
  fs.writeFileSync(path.join(dir, 'sample.json'), JSON.stringify({ title: b.title, excerpt: b.sample, chapter: 'Sample Preview', paragraphs: [b.sample, 'This is the free preview. The remaining chapters are unlocked automatically the moment you buy the book.'] }, null, 2));
  fs.writeFileSync(path.join(dir, 'toc.json'), JSON.stringify({ chapters: b.chapters }, null, 2));
  console.log('generated ' + b.slug + ' (' + b.chapters.length + ' chapters)');
}

console.log('Done: ' + BOOKS.length + ' books with content, samples and TOCs.');