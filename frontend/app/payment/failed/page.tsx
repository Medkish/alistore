'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { formatAED } from '@/lib/format';

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<section className="py-24 text-center text-muted text-sm">Loading…</section>}>
      <PaymentResult />
    </Suspense>
  );
}

function PaymentResult() {
  const router = useRouter();
  const params = useSearchParams();
  const order = params.get('order') || '';
  const amount = Number(params.get('amount') || '0');
  const id = params.get('id') || '';
  const method = params.get('method') || 'card';

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function retryPayment() {
    if (!id || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.payOrderDemo(id);
      if (res.order.status === 'PAID') {
        router.replace(
          `/payment/success?order=${encodeURIComponent(order)}&amount=${amount}&status=PAID&method=${method}&id=${id}`,
        );
        return;
      }
      setError('Payment is still pending. Please try again.');
    } catch (e) {
      setError((e as Error).message || 'Payment could not be confirmed.');
    }
    setBusy(false);
  }

  return (
    <section className="py-10 md:py-16">
      <div className="mx-auto max-w-md px-4">
        <div className="bg-white border border-line rounded-3xl p-8 text-center shadow-sm">
          <p className="text-5xl mb-4">❌</p>
          <h1 className="text-2xl font-extrabold text-brand mb-2">PAYMENT FAILED</h1>
          <p className="text-muted text-sm mb-1">Payment could not be completed.</p>
          {order ? (
            <p className="text-muted text-xs mb-1">Order: #{order}</p>
          ) : (
            <p className="text-muted text-xs mb-1">Your order has not been created.</p>
          )}
          <p className="text-muted text-sm mb-2">Amount: <span className="font-bold text-ink">{formatAED(amount)}</span></p>

          {order && (
            <span className="inline-block border border-amber-300 bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-lg mb-4">
              ORDER: PENDING · NOT PAID
            </span>
          )}

          {error && <p className="text-[11px] text-red-600 mb-2">{error}</p>}

          <div className="flex flex-col gap-3 mt-4">
            {method === 'card' && (
              <button
                onClick={retryPayment}
                disabled={busy}
                className="btn-flash btn-primary-flash text-center disabled:opacity-60"
              >
                {busy ? 'Confirming…' : 'TRY AGAIN'}
              </button>
            )}
            <Link href="/cart/" className="btn-flash btn-outline-flash text-brand border-brand text-center">
              RETURN TO CART
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}