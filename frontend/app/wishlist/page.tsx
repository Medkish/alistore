'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart, useWishlist } from '@/components/providers';
import { CATALOG } from '@/lib/catalog';
import { formatAED } from '@/lib/format';
import type { Book } from '@/lib/types';

export default function WishlistPage() {
  const { ids, toggle, clear } = useWishlist();
  const { add } = useCart();

  const books: Book[] = ids
    .map((id) => CATALOG.find((b) => b.id === id))
    .filter((b): b is Book => Boolean(b));

  function addAll() {
    for (const b of books) add(b.id, b.title, b.price, b.image);
  }

  if (books.length === 0) {
    return (
      <section className="py-16 md:py-24 text-center">
        <div className="mx-auto max-w-md px-4">
          <p className="text-5xl mb-4">💝</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-brand mb-3">Your wishlist is empty</h1>
          <p className="text-muted mb-6">
            Tap the ♡ on any book to keep it here, then move favourites into your cart whenever you are ready.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/books/" className="btn-flash btn-primary-flash">
              Browse Books
            </Link>
            <Link href="/" className="btn-flash btn-outline-flash text-brand border-brand">
              Go Home
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 md:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand">My Wishlist</h1>
            <p className="text-sm text-muted mt-1">{books.length} saved book{books.length === 1 ? '' : 's'}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={addAll} className="btn-flash btn-primary-flash">
              Add All to Cart
            </button>
            <button onClick={clear} className="btn-flash btn-outline-flash text-red-600 border-red-300 hover:bg-red-50">
              Clear Wishlist
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {books.map((b) => (
            <div
              key={b.id}
              className="bg-white border border-line rounded-2xl p-4 flex flex-col shadow-sm hover:shadow-md transition"
            >
              <Link href={`/books/${b.id}/`} className="block">
                <div className="relative aspect-[3/4] bg-slate-50 rounded-xl overflow-hidden mb-3">
                  <Image src={b.image} alt={b.title} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                </div>
                <p className="text-[11px] font-bold text-accent-dark uppercase tracking-wide">{b.author}</p>
                <h2 className="font-bold text-ink leading-snug line-clamp-2">{b.title}</h2>
                <p className="font-extrabold text-brand mt-1">{formatAED(b.price)}</p>
              </Link>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => add(b.id, b.title, b.price, b.image)}
                  className="flex-1 btn-flash btn-primary-flash text-xs"
                >
                  Add to Cart
                </button>
                <button
                  onClick={() => toggle(b.id)}
                  aria-label={`Remove ${b.title} from wishlist`}
                  className="shrink-0 h-9 w-9 rounded-lg border-2 border-line text-red-500 hover:border-red-300 hover:bg-red-50 transition"
                >
                  ♥
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}