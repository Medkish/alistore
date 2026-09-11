'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { formatAED } from '@/lib/format';

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<section className="py-24 text-center text-muted text-sm">Loading…</section>}>
      <PaymentResult />
    </Suspense>
  );
}

function PaymentResult() {
  const params = useSearchParams();
  const order = params.get('order') || '';
  const amount = Number(params.get('amount') || '0');
  const status = params.get('status') || 'PENDING';
  const method = params.get('method') || 'card';
  const id = params.get('id') || '';

  const [paid, setPaid] = useState(status === 'PAID');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function retryPayment() {
    if (!id || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.payOrderDemo(id);
      if (res.order.status === 'PAID') setPaid(true);
      else setError('Payment is still pending.');
    } catch (e) {
      setError((e as Error).message || 'Payment could not be confirmed.');
    }
    setBusy(false);
  }

  return (
    <section className="py-10 md:py-16">
      <div className="mx-auto max-w-md px-4">
        <div className="bg-white border border-line rounded-3xl p-8 text-center shadow-sm">
          <p className="text-5xl mb-4">{paid ? '🎉' : '🕐'}</p>
          <h1 className="text-2xl font-extrabold text-brand mb-2">
            {paid ? 'PAYMENT SUCCESSFUL' : 'ORDER PLACED'}
          </h1>
          {order && <p className="text-ink font-bold mb-1">Order: #{order}</p>}
          <p className="text-muted text-sm mb-4">Amount: <span className="font-bold text-ink">{formatAED(amount)}</span></p>

          {paid ? (
            <span className="inline-block border border-green-300 bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-lg mb-1">
              PAYMENT: PAID
            </span>
          ) : (
            <div>
              <span className="inline-block border border-amber-300 bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-lg mb-2">
                PAYMENT: PENDING
              </span>
              <p className="text-[11px] text-muted mb-1">Your order is placed but not yet paid.</p>
              {method === 'card' && (
                <button
                  onClick={retryPayment}
                  disabled={busy}
                  className="text-xs font-bold text-accent-dark hover:underline disabled:opacity-60"
                >
                  {busy ? 'Confirming…' : 'TRY PAYMENT AGAIN'}
                </button>
              )}
              {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
            </div>
          )}

          <div className="flex flex-col gap-3 mt-6">
            <Link href="/orders/" className="btn-flash btn-primary-flash text-center">
              VIEW MY ORDER
            </Link>
            <Link href="/books/" className="btn-flash btn-outline-flash text-brand border-brand text-center">
              CONTINUE SHOPPING
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}