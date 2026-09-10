'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type BookFilters } from '@/lib/api';
import { CATALOG } from '@/lib/catalog';
import type { Book } from '@/lib/types';

export const CATEGORY_OPTIONS = [
  { slug: '', name: 'All Categories' },
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

export const PRICE_OPTIONS = [
  { label: 'Any Price', min: undefined, max: undefined },
  { label: 'Under AED 30', min: undefined, max: 30 },
  { label: 'AED 30 – 45', min: 30, max: 45 },
  { label: 'Over AED 45', min: 45, max: undefined },
];

export const RATING_OPTIONS = [
  { label: 'Any Rating', min: undefined },
  { label: '4.5★ and up', min: 4.5 },
  { label: '4.8★ and up', min: 4.8 },
];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating-desc', label: 'Top Rated' },
];

function normalize(b: Book): Book {
  return { ...b, image: b.image.startsWith('/') ? b.image : `/${b.image}` };
}

function localFilter(books: Book[], f: BookFilters): Book[] {
  let out = books;
  const q = (f.q || '').trim().toLowerCase();
  if (q) out = out.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
  if (f.category)
    out = out.filter(
      (b) =>
        String(b.category) === f.category || (typeof b.category === 'object' && b.category?.slug === f.category),
    );
  if (f.minPrice != null) out = out.filter((b) => b.price >= (f.minPrice as number));
  if (f.maxPrice != null) out = out.filter((b) => b.price <= (f.maxPrice as number));
  if (f.minRating != null) out = out.filter((b) => (b.rating || 0) >= (f.minRating as number));
  return out;
}

export function useBooks(filters: BookFilters) {
  const [books, setBooks] = useState<Book[]>(() => localFilter(CATALOG, filters));
  const [total, setTotal] = useState(CATALOG.length);
  const [totalPages, setTotalPages] = useState(1);
  const [apiLive, setApiLive] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getBooks({ ...filters, pageSize: filters.pageSize || 12 })
      .then((res) => {
        if (!alive) return;
        const mapped = res.books.map(normalize);
        if (mapped.length || res.total === 0) {
          setBooks(mapped);
          setTotal(res.total);
          setTotalPages(Math.max(1, res.totalPages));
        }
        setApiLive(true);
      })
      .catch(() => {
        if (!alive) return;
        setApiLive(false);
        const local = localFilter(CATALOG, filters);
        setBooks(local);
        setTotal(local.length);
        setTotalPages(1);
      });
    return () => {
      alive = false;
    };
  }, [JSON.stringify(filters), filters.page]);

  const reload = useCallback(() => {
    setApiLive((v) => v);
  }, []);

  return { books, total, totalPages, apiLive, reload };
}