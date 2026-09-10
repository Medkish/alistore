'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/components/providers';
import QuantityStepper from '@/components/QuantityStepper';
import { formatAED } from '@/lib/format';
import type { Book } from '@/lib/types';

export default function BookDetailsClient({ book }: { book: Book }) {
  const { add, items } = useCart();
  const [qty, setQty] = useState(1);
  const inCart = items.find((i) => i.id === book.id)?.qty ?? 0;

  return (
    <section className="py-10 md:py-16">
      <div className="mx-auto max-w-6xl px-4 grid md:grid-cols-2 gap-10 items-start">
        {/* image */}
        <div className="sticky top-36 bg-white rounded-3xl border border-line overflow-hidden flex items-center justify-center p-8">
          <Image
            src={book.image}
            alt={book.title}
            width={320}
            height={440}
            className="object-contain max-h-[420px]"
          />
        </div>

        {/* info */}
        <div>
          <p className="text-xs font-bold text-accent-dark uppercase tracking-wide mb-1">{book.author}</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-brand mb-2">{book.title}</h1>
          {book.rating && (
            <p className="text-sm text-muted mb-3">
              {'★'.repeat(Math.floor(book.rating))} {book.rating} / 5
            </p>
          )}
          <p className="text-brand font-extrabold text-2xl mb-4">{formatAED(book.price)}</p>
          <p className="text-sm text-ink leading-relaxed mb-6">{book.description}</p>

          {book.pages && (
            <p className="text-xs text-muted mb-4">
              Paperback · {book.pages} pages
            </p>
          )}

          <div className="flex flex-wrap gap-4 items-center mb-6">
            <QuantityStepper
              qty={qty}
              onInc={() => setQty((q) => q + 1)}
              onDec={() => setQty((q) => Math.max(1, q - 1))}
            />
            <button
              onClick={() => {
                for (let i = 0; i < qty; i++) add(book.id, book.title, book.price, book.image);
              }}
              className="btn-flash btn-primary-flash"
            >
              Add to Cart
            </button>
            <Link href="/checkout/" className="btn-flash btn-outline-flash text-brand border-brand hover:bg-brand hover:text-white">
              Buy the Book First
            </Link>
          </div>

          {inCart > 0 && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              ✓ {inCart} in your cart ·{' '}
              <Link href="/cart/" className="underline font-semibold">
                View Cart
              </Link>
            </p>
          )}

          <div className="mt-8 border-t border-line pt-6 grid grid-cols-3 gap-4 text-center text-xs text-muted">
            <div>
              <p className="font-bold text-ink">7 Days</p>
              Returns
            </div>
            <div>
              <p className="font-bold text-ink">1–3 Days</p>
              Delivery
            </div>
            <div>
              <p className="font-bold text-ink">Secure</p>
              Payment
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}