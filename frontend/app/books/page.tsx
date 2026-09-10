'use client';

import { useMemo, useState } from 'react';
import BookCard from '@/components/BookCard';
import { CATALOG } from '@/lib/catalog';

export default function BooksPage() {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    if (!q.trim()) return CATALOG;
    const s = q.toLowerCase();
    return CATALOG.filter((b) => b.title.toLowerCase().includes(s) || b.author.toLowerCase().includes(s));
  }, [q]);

  return (
    <section className="py-10 md:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center mb-8">
          <span className="text-xs font-bold text-accent-dark uppercase tracking-wide">All titles</span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-brand mt-1">Our Book Collection</h1>
        </div>
        <div className="flex justify-center mb-8">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search books by title or author..."
            className="w-full max-w-md border-2 border-brand rounded-xl px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filtered.map((b) => (
            <BookCard key={b.id} {...b} />
          ))}
        </div>
        {!filtered.length && (
          <p className="text-center text-muted mt-12">No books match your search. Try a different term.</p>
        )}
      </div>
    </section>
  );
}