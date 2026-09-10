'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import BookCard from '@/components/BookCard';
import {
  useBooks,
  CATEGORY_OPTIONS,
  PRICE_OPTIONS,
  RATING_OPTIONS,
  SORT_OPTIONS,
} from '@/lib/use-books';

export default function BooksPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-muted">Loading books...</div>}>
      <Books />
    </Suspense>
  );
}

function Books() {
  const initialParams = useSearchParams();

  const [q, setQ] = useState(initialParams.get('q') || '');
  const [debouncedQ, setDebouncedQ] = useState(initialParams.get('q') || '');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState(0);
  const [rating, setRating] = useState(0);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const filters = useMemo(() => {
    const p = PRICE_OPTIONS[price] || PRICE_OPTIONS[0];
    const r = RATING_OPTIONS[rating] || RATING_OPTIONS[0];
    return {
      q: debouncedQ.trim() || undefined,
      category: category || undefined,
      minPrice: p.min,
      maxPrice: p.max,
      minRating: r.min,
      sort,
      page,
      pageSize: 12,
    };
  }, [debouncedQ, category, price, rating, sort, page]);

  const { books, total, totalPages, apiLive } = useBooks(filters);

  function applySearch() {
    setDebouncedQ(q.trim());
    setPage(1);
  }

  function resetFilters() {
    setQ('');
    setDebouncedQ('');
    setCategory('');
    setPrice(0);
    setRating(0);
    setSort('newest');
    setPage(1);
  }

  return (
    <section className="py-10 md:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center mb-8">
          <span className="text-xs font-bold text-accent-dark uppercase tracking-wide">All titles</span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-brand mt-1">Our Book Collection</h1>
        </div>

        <div className="flex justify-center mb-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder="Search books by title or author..."
            className="w-full max-w-md border-2 border-brand rounded-l-xl px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
          />
          <button
            onClick={applySearch}
            className="bg-brand text-white rounded-r-xl px-5 text-sm font-bold hover:bg-accent hover:text-brand transition"
          >
            Search
          </button>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-2 mb-4 text-sm">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="border-2 border-line rounded-xl px-3 py-2 bg-white focus:border-brand focus:outline-none"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={price}
            onChange={(e) => {
              setPrice(Number(e.target.value));
              setPage(1);
            }}
            className="border-2 border-line rounded-xl px-3 py-2 bg-white focus:border-brand focus:outline-none"
          >
            {PRICE_OPTIONS.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            value={rating}
            onChange={(e) => {
              setRating(Number(e.target.value));
              setPage(1);
            }}
            className="border-2 border-line rounded-xl px-3 py-2 bg-white focus:border-brand focus:outline-none"
          >
            {RATING_OPTIONS.map((r, i) => (
              <option key={r.label} value={i}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="border-2 border-line rounded-xl px-3 py-2 bg-white focus:border-brand focus:outline-none"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {resetFilters && (
            <button onClick={resetFilters} className="text-xs font-semibold text-muted hover:text-red-600 underline">
              Reset
            </button>
          )}
        </div>

        <p className="text-center text-xs text-muted mb-8">
          {apiLive === true && `Live catalog · ${total} books from the AlioStore API`}
          {apiLive === false && `Offline catalog · ${total} local books (API unreachable)`}
          {apiLive === null && 'Connecting to catalog…'}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {books.map((b) => (
            <BookCard key={b.id} {...b} />
          ))}
        </div>

        {!books.length && (
          <p className="text-center text-muted mt-12">No books match your filters. Try different terms.</p>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-10 text-sm">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn-flash btn-outline-flash text-brand border-brand disabled:opacity-40 px-5"
            >
              ← Prev
            </button>
            <span className="font-semibold text-ink">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-flash btn-outline-flash text-brand border-brand disabled:opacity-40 px-5"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}