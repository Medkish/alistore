'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useCart, useWishlist } from '@/components/providers';
import QuantityStepper from '@/components/QuantityStepper';
import { api } from '@/lib/api';
import { formatAED } from '@/lib/format';
import type { Book, BookReviews } from '@/lib/types';

function Stars({ n, size = 'text-lg' }: { n: number; size?: string }) {
  return (
    <span className={`${size} text-amber-500`}>
      {[1, 2, 3, 4, 5].map((i) => (i <= Math.round(n) ? '★' : '☆'))}
    </span>
  );
}

export default function BookDetailsClient({ book }: { book: Book }) {
  const { add, items } = useCart();
  const { has, toggle } = useWishlist();
  const [qty, setQty] = useState(1);
  const inCart = items.find((i) => i.id === book.id)?.qty ?? 0;
  const liked = has(book.id);

  const [rv, setRv] = useState<BookReviews>({ average: null, count: 0, purchased: false, submitted: false, status: null, reviews: [] });
  const [myRating, setMyRating] = useState(5);
  const [myText, setMyText] = useState('');
  const [posting, setPosting] = useState(false);
  const [flash, setFlash] = useState('');

  const loadReviews = useCallback(async () => {
    try {
      setRv(await api.getBookReviews(book.id));
    } catch {
      /* offline */
    }
  }, [book.id]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  async function submitReview() {
    setPosting(true);
    try {
      await api.submitReview(book.id, myRating, myText.trim());
      setFlash('Thank you! Your review is awaiting approval.');
      await loadReviews();
    } catch (e) {
      setFlash(e instanceof Error ? e.message : 'Could not submit the review.');
    }
    setPosting(false);
  }

  const canReview = rv.purchased && !rv.submitted && !posting;

  return (
    <>
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
                <Stars n={book.rating} /> {book.rating} / 5
                {rv.count > 0 && <span className="ml-2">· {rv.count} review{rv.count === 1 ? '' : 's'}</span>}
              </p>
            )}
            <p className="text-brand font-extrabold text-2xl mb-4">{formatAED(book.price)}</p>
            <p className="text-sm text-ink leading-relaxed mb-6">{book.description}</p>

            {book.pages && (
              <p className="text-xs text-muted mb-4">
                Paperback · {book.pages} pages
              </p>
            )}

            {book.stock != null && (
              <p className="text-xs mb-4">
                {book.stock === 0 ? (
                  <span className="text-red-600 font-semibold">🔴 Out of Stock</span>
                ) : book.stock <= 10 ? (
                  <span className="text-amber-600 font-semibold">🟡 Low Stock · only {book.stock} left</span>
                ) : (
                  <span className="text-green-700 font-semibold">🟢 In Stock</span>
                )}
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
              <button
                onClick={() => toggle(book.id)}
                aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
                className={`shrink-0 h-12 w-12 rounded-xl border-2 text-xl transition ${
                  liked ? 'border-red-300 bg-red-50' : 'border-line bg-white hover:border-accent'
                }`}
              >
                {liked ? '♥' : '♡'}
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

      {/* Reviews */}
      <section className="pb-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-extrabold text-brand">Reviews</h2>
            {rv.average != null && (
              <p className="text-sm text-muted">
                <Stars n={rv.average} /> {rv.average} average
              </p>
            )}
          </div>

          {canReview ? (
            <div className="bg-white border border-line rounded-2xl p-5 mb-6 shadow-sm">
              <h3 className="font-bold text-sm mb-3">Verified buyer — rate this book</h3>
              <div className="flex gap-1 mb-3 text-3xl">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    onClick={() => setMyRating(i)}
                    className={i <= myRating ? 'text-amber-500' : 'text-line'}
                    aria-label={`${i} stars`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={myText}
                onChange={(e) => setMyText(e.target.value)}
                rows={3}
                placeholder="What did you like about this book?"
                className="w-full border-2 border-line rounded-xl px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-muted">
                  {rv.submitted ? (
                    rv.status === 'APPROVED' ? (
                      '✓ Your review is live'
                    ) : (
                      `Your review is ${rv.status === 'REJECTED' ? 'not approved' : 'pending approval'}.`
                    )
                  ) : (
                    'Your review appears after moderation.'
                  )}
                </p>
                <button
                  onClick={submitReview}
                  disabled={posting}
                  className="btn-flash btn-primary-flash disabled:opacity-60"
                >
                  {posting ? 'Submitting…' : 'Submit Review'}
                </button>
              </div>
              {flash && <p className="text-xs mt-3 text-green-700">{flash}</p>}
            </div>
          ) : (
            <p className="text-xs text-muted mb-6">
              {rv.submitted
                ? 'You reviewed this book.'
                : rv.purchased
                  ? 'Your review was submitted.'
                  : 'Purchase this book to post a verified review.'}
            </p>
          )}

          <div className="space-y-4">
            {rv.reviews.length === 0 && <p className="text-sm text-muted">No reviews yet.</p>}
            {rv.reviews.map((r) => (
              <div key={r.id} className="bg-white border border-line rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-ink">{r.user}</p>
                  <p className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <Stars n={r.rating} size="text-sm" />
                <p className="text-sm text-ink mt-2">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}