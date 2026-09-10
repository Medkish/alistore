'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/components/providers';
import QuantityStepper from '@/components/QuantityStepper';
import { formatAED } from '@/lib/format';

export default function CartPage() {
  const { items, total, setQty, remove, clear } = useCart();

  return (
    <section className="py-10 md:py-16">
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-brand">Your Cart</h1>
          {items.length > 0 && (
            <button
              onClick={clear}
              className="text-xs text-muted hover:text-red-600 underline font-semibold"
            >
              Clear Cart
            </button>
          )}
        </div>

        {!items.length && (
          <div className="text-center py-16">
            <p className="text-muted mb-6">Your cart is empty. Add a book to get started.</p>
            <Link href="/books/" className="btn-flash btn-primary-flash">
              Browse Books
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {items.map((it) => (
            <div
              key={it.id}
              className="bg-white border border-line rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center shadow-sm"
            >
              {it.image && (
                <Image src={it.image} alt={it.name} width={64} height={85} className="object-contain rounded-lg" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold">{it.name}</h3>
                <p className="text-xs text-muted">{formatAED(it.price)} each</p>
                <button onClick={() => remove(it.id)} className="text-xs text-muted hover:text-red-600 underline mt-1">
                  Remove
                </button>
              </div>
              <QuantityStepper
                qty={it.qty}
                onInc={() => setQty(it.id, it.qty + 1)}
                onDec={() => setQty(it.id, it.qty - 1)}
              />
              <p className="font-extrabold text-brand whitespace-nowrap">{formatAED(it.qty * it.price)}</p>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="mt-8 flex flex-col items-end gap-4">
            <p className="text-xl font-extrabold text-brand">Total: {formatAED(total)}</p>
            <Link href="/checkout/" className="btn-flash btn-primary-flash text-base px-8">
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}