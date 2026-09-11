'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/components/providers';
import QuantityStepper from '@/components/QuantityStepper';
import { CATALOG } from '@/lib/catalog';
import { formatAED } from '@/lib/format';

const FREE_DELIVERY_OVER = 150;
const DELIVERY_FEE = 15;

function stockOf(id: string): number | null {
  const b = CATALOG.find((x) => x.id === id);
  return b && b.stock != null ? b.stock : null;
}

export default function CartPage() {
  const { items, saved, count, total, setQty, remove, saveForLater, moveToCart, removeSaved } = useCart();

  const outOfStock = items.some((it) => stockOf(it.id) === 0);
  const lowStock = items.filter((it) => {
    const s = stockOf(it.id);
    return s != null && s > 0 && s <= 5;
  }).length;
  const deliveryFee = count === 0 ? 0 : total >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE;
  const toPay = total + deliveryFee;

  const recommended = CATALOG.filter((b) => !items.some((i) => i.id === b.id)).slice(0, 4);

  return (
    <section className="py-10 md:py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex flex-wrap items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-brand">
            Shopping Cart {count > 0 && <span className="text-base font-semibold text-muted">({count} item{count === 1 ? '' : 's'})</span>}
          </h1>
          <Link href="/books/" className="text-xs font-semibold text-accent-dark hover:underline">
            ← Continue shopping
          </Link>
        </div>

        {!items.length && (
          <div className="text-center py-16 bg-white border border-line rounded-2xl">
            <p className="text-4xl mb-3">🛒</p>
            <p className="text-muted mb-6">Your cart is empty. Add a book to get started.</p>
            <Link href="/books/" className="btn-flash btn-primary-flash">
              Browse Books
            </Link>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
          <div className="flex flex-col gap-4">
            {items.map((it) => {
              const stock = stockOf(it.id);
              const overStock = stock != null && it.qty > stock;
              return (
                <div
                  key={it.id}
                  className="bg-white border border-line rounded-2xl p-4 flex gap-4 items-center shadow-sm"
                >
                  <Link href={`/books/${it.id}/`} className="shrink-0">
                    {it.image && (
                      <Image src={it.image} alt={it.name} width={64} height={85} className="object-contain rounded-lg" />
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/books/${it.id}/`} className="font-bold hover:text-accent-dark line-clamp-1">
                      {it.name}
                    </Link>
                    <p className="text-xs text-muted">{formatAED(it.price)} each</p>
                    {stock === 0 ? (
                      <p className="text-xs text-red-600 font-semibold mt-1">🔴 Out of stock — remove to check out</p>
                    ) : stock != null && stock <= 5 ? (
                      <p className="text-xs text-amber-600 font-semibold mt-1">🟡 Low stock · only {stock} left</p>
                    ) : null}
                    {overStock && <p className="text-xs text-red-600 font-semibold mt-1">⚠ Only {stock} in stock</p>}
                    <button
                      onClick={() => saveForLater(it.id)}
                      className="text-xs text-muted hover:text-accent-dark underline mr-3 mt-1"
                    >
                      Save for later
                    </button>
                    <button onClick={() => remove(it.id)} className="text-xs text-muted hover:text-red-600 underline mt-1">
                      Remove
                    </button>
                  </div>
                  <QuantityStepper
                    qty={it.qty}
                    onInc={() => setQty(it.id, stock == null || it.qty < stock ? it.qty + 1 : it.qty)}
                    onDec={() => setQty(it.id, it.qty - 1)}
                  />
                  <p className="font-extrabold text-brand whitespace-nowrap w-20 text-right">{formatAED(it.qty * it.price)}</p>
                </div>
              );
            })}

            {saved.length > 0 && (
              <div className="mt-2">
                <h2 className="font-bold text-ink mb-3">Saved for later ({saved.length})</h2>
                <div className="flex flex-col gap-3">
                  {saved.map((it) => (
                    <div key={it.id} className="bg-white border border-line rounded-2xl p-3 flex items-center gap-3 shadow-sm">
                      <Link href={`/books/${it.id}/`} className="shrink-0">
                        {it.image && (
                          <Image src={it.image} alt={it.name} width={48} height={64} className="object-contain rounded" />
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/books/${it.id}/`} className="font-semibold text-sm hover:text-accent-dark line-clamp-1">
                          {it.name}
                        </Link>
                        <p className="text-xs text-muted">{formatAED(it.price)}</p>
                      </div>
                      <button
                        onClick={() => moveToCart(it.id)}
                        className="text-xs font-bold text-accent-dark hover:underline shrink-0"
                      >
                        Move to cart
                      </button>
                      <button
                        onClick={() => removeSaved(it.id)}
                        className="text-xs text-muted hover:text-red-600 underline shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recommended.length > 0 && (
              <div className="mt-8 bg-white border border-line rounded-2xl p-5">
                <h2 className="font-bold text-ink mb-3">You might also like</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {recommended.map((b) => (
                    <Link key={b.id} href={`/books/${b.id}/`} className="text-center group">
                      <div className="bg-slate-50 rounded-xl overflow-hidden mb-2">
                        <Image src={b.image} alt={b.title} width={140} height={186} className="object-contain aspect-[3/4] w-full group-hover:scale-105 transition" />
                      </div>
                      <p className="text-xs font-bold text-ink line-clamp-1">{b.title}</p>
                      <p className="text-xs font-extrabold text-brand">{formatAED(b.price)}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {items.length > 0 && (
            <aside className="bg-white border border-line rounded-2xl p-5 shadow-sm lg:sticky lg:top-32">
              <h2 className="font-bold text-ink mb-4">Order Summary</h2>
              <dl className="text-sm space-y-2">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="font-semibold">{formatAED(total)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Delivery</dt>
                  <dd className={`font-semibold ${deliveryFee === 0 ? 'text-green-600' : ''}`}>
                    {deliveryFee === 0 ? 'Free' : formatAED(deliveryFee)}
                  </dd>
                </div>
                {deliveryFee > 0 && (
                  <p className="text-[11px] text-muted">
                    Free delivery on orders over {formatAED(FREE_DELIVERY_OVER)} — add {formatAED(FREE_DELIVERY_OVER - total)} more.
                  </p>
                )}
                {lowStock > 0 && <p className="text-[11px] text-amber-600 font-semibold">🟡 {lowStock} item{lowStock === 1 ? '' : 's'} low on stock</p>}
                {outOfStock && <p className="text-[11px] text-red-600 font-semibold">🔴 Remove out-of-stock item{items.filter((i) => stockOf(i.id) === 0).length === 1 ? '' : 's'} to continue</p>}
              </dl>
              <div className="flex justify-between font-extrabold text-brand text-lg border-t border-line pt-3 mt-3">
                <span>Total</span>
                <span>{formatAED(toPay)}</span>
              </div>
              <Link
                href="/checkout/"
                className={`btn-flash btn-primary-flash mt-5 w-full text-center ${outOfStock ? 'opacity-50 pointer-events-none' : ''}`}
              >
                Proceed to Checkout
              </Link>
              <p className="text-[11px] text-muted text-center mt-3">🔒 Secure checkout · 3–5 working day delivery</p>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}