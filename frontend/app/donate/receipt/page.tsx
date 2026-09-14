'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Suspense } from 'react';
import { api } from '@/lib/api';
import { formatAED } from '@/lib/format';
import type { DonationItem } from '@/lib/types';

function Receipt() {
  const params = useSearchParams();
  const id = params.get('id') || '';
  const [donation, setDonation] = useState<DonationItem | null>(null);
  const [error, setError] = useState('');
  const [emailMsg, setEmailMsg] = useState('');

  const load = useCallback(() => {
    if (!id) {
      setError('No receipt reference provided.');
      return;
    }
    api
      .getDonationReceipt(id)
      .then((r) => setDonation(r.donation))
      .catch((e) => setError((e as Error).message));
  }, [id]);

  useEffect(load, [load]);

  async function emailReceipt() {
    setEmailMsg('');
    try {
      await api.emailDonationReceipt(id);
      setEmailMsg('Receipt sent to your email.');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (error) {
    return (
      <section className="py-16">
        <div className="mx-auto max-w-md px-4 text-center">
          <p className="text-4xl mb-4">🧾</p>
          <h1 className="text-2xl font-extrabold text-brand mb-3 uppercase">Receipt Unavailable</h1>
          <p className="text-sm text-muted mb-6">{error}</p>
          <Link href="/donate/" className="btn-flash btn-primary-flash inline-block text-center">
            Back to Donate
          </Link>
        </div>
      </section>
    );
  }

  if (!donation) {
    return (
      <section className="py-16">
        <div className="mx-auto max-w-md px-4 text-center">
          <div className="mx-auto w-10 h-10 border-4 border-line border-t-brand rounded-full animate-spin" />
        </div>
      </section>
    );
  }

  const d = donation;
  const rows: [string, string][] = [
    ['Donation Number', d.donationNumber],
    ['Donor', d.donorName || (d.isAnonymous ? 'Anonymous' : 'Guest')],
    ['Date', new Date(d.paidAt || d.createdAt).toLocaleString()],
    ['Amount', `${formatAED(d.amount)}${d.feesAmount ? ` (incl. ${formatAED(d.feesAmount)} fee)` : ''}`],
    ['Currency', d.currency || 'AED'],
    ['Payment Method', d.paymentMethod || '—'],
    ['Transaction ID', d.transactionId || '—'],
    ['Campaign / Purpose', d.campaign ? d.campaign.title : d.purpose || 'General Fund'],
    ['Anonymous', d.isAnonymous ? 'Yes' : 'No'],
  ];

  return (
    <section className="py-10 md:py-16 print:py-4">
      <div className="mx-auto max-w-2xl px-4">
        <div className="bg-white border border-line rounded-3xl shadow-sm overflow-hidden">
          <div className="bg-brand text-white px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-lg font-extrabold tracking-wide">AlioStore</p>
              <p className="text-[11px] text-white/80">Smart book store — read smart.</p>
            </div>
            <span className="text-[11px] font-bold bg-white/15 rounded-lg px-3 py-1.5 uppercase tracking-wider">Donation Receipt</span>
          </div>
          <div className="p-6 md:p-8">
            <p className="text-sm text-muted mb-6">Thank you for your generous support. This receipt confirms your donation to AlioStore.</p>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-line pb-2">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-bold text-ink text-right">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[11px] text-muted mt-6 leading-relaxed">
              AlioStore is committed to building programming education resources. Keep this receipt for your records.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mt-6 print:hidden">
          <button onClick={() => window.print()} className="btn-flash btn-primary-flash">
            ⬇ Download PDF
          </button>
          <button onClick={emailReceipt} className="btn-flash btn-outline-flash text-brand border-brand">
            📧 Email Receipt
          </button>
          {emailMsg && <p className="w-full text-center text-xs font-bold text-green-700">{emailMsg}</p>}
          <Link href="/profile/" className="w-full text-center text-sm font-bold text-accent-dark hover:underline">
            ← Back to my account
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense>
      <Receipt />
    </Suspense>
  );
}