'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatAED } from '@/lib/format';
import type { DonationSupporter } from '@/lib/types';

export default function SupportersPage() {
  const [data, setData] = useState<{
    recent: DonationSupporter[];
    top: DonationSupporter[];
    monthly: DonationSupporter[];
    anonymous: DonationSupporter[];
    messages: (DonationSupporter & { message: string })[];
  } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .donationSupporters()
      .then(setData)
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <section className="py-10 md:py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-brand uppercase">Our Supporters</h1>
          <p className="text-muted mt-3 max-w-xl mx-auto leading-relaxed">
            Thank you to every reader, learner and champion who helps AlioStore keep making programming education
            accessible.
          </p>
          <Link href="/donate/" className="btn-flash btn-primary-flash inline-block mt-6 text-center">
            ❤️ DONATE NOW
          </Link>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-center">{error}</p>}
        {!data && !error && (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-line border-t-brand rounded-full animate-spin" />
          </div>
        )}

        {data && data.messages.length > 0 && (
          <div className="bg-accent/5 border border-accent/30 rounded-3xl p-6 md:p-8 mb-10">
            <h2 className="font-extrabold text-ink mb-5">💬 Donor Messages</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {data.messages.map((m, i) => (
                <figure key={i} className="bg-white border border-line rounded-2xl p-4">
                  <blockquote className="text-sm text-ink leading-relaxed">“{m.message}”</blockquote>
                  <figcaption className="mt-3 text-xs font-bold text-accent-dark">
                    — {m.name} <span className="font-semibold text-muted">· {formatAED(m.amount ?? 0)}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border border-line rounded-3xl p-6">
            <h2 className="font-extrabold text-ink mb-4 uppercase text-sm">🏆 Top Supporters</h2>
            <ul className="flex flex-col gap-3">
              {data?.top.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-ink text-sm text-left">
                      <span className="text-muted mr-2">#{i + 1}</span>
                      {s.name}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(s.badges || []).map((b) => (
                        <span key={b} className="text-[10px] font-bold bg-brand/5 text-brand border border-brand/20 rounded-full px-2 py-0.5">
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="font-extrabold text-brand text-sm whitespace-nowrap">{formatAED(s.total)}</p>
                </li>
              ))}
              {data && data.top.length === 0 && <p className="text-sm text-muted py-6 text-center">Be the first supporter! ❤️</p>}
            </ul>
          </div>

          <div className="bg-white border border-line rounded-3xl p-6">
            <h2 className="font-extrabold text-ink mb-4 uppercase text-sm">💛 Recent Supporters</h2>
            <ul className="flex flex-col gap-3">
              {data?.recent.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm">
                  <p className="font-bold text-ink">
                    <span className="mr-1.5">❤️</span>
                    {s.name}
                  </p>
                  <p className="font-bold text-muted whitespace-nowrap">
                    {formatAED(s.amount || 0)}
                    {s.campaign ? <span className="text-[10px] font-semibold ml-1 text-accent-dark">· {s.campaign}</span> : null}
                  </p>
                </li>
              ))}
              {data && data.recent.length === 0 && <p className="text-sm text-muted py-6 text-center">Recent supporters will appear here.</p>}
            </ul>
          </div>

          <div className="bg-white border border-line rounded-3xl p-6">
            <h2 className="font-extrabold text-ink mb-4 uppercase text-sm">⭐ Monthly Supporters</h2>
            <p className="text-[11px] text-muted mb-4">The amazing people giving every month to keep AlioStore growing.</p>
            <ul className="flex flex-col gap-3">
              {data?.monthly.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm">
                  <p className="font-bold text-ink">{s.name}</p>
                  <p className="font-extrabold text-accent-dark whitespace-nowrap">{formatAED(s.total)} / mo</p>
                </li>
              ))}
              {data && data.monthly.length === 0 && <p className="text-sm text-muted py-6 text-center">No monthly supporters yet.</p>}
            </ul>
            <Link href="/donate/" className="inline-block mt-5 text-xs font-bold text-accent-dark hover:underline">
              Become a monthly supporter →
            </Link>
          </div>

          <div className="bg-white border border-line rounded-3xl p-6">
            <h2 className="font-extrabold text-ink mb-4 uppercase text-sm">🕶️ Anonymous Supporters</h2>
            <p className="text-[11px] text-muted mb-4">Generous hearts who prefer to stay unnamed — we honour that.</p>
            <ul className="flex flex-col gap-3">
              {data?.anonymous.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm">
                  <p className="font-bold text-ink">❤️ Anonymous</p>
                  <p className="font-bold text-muted whitespace-nowrap">
                    {formatAED(s.amount || 0)}
                    {s.purpose ? <span className="text-[10px] font-semibold ml-1 text-accent-dark">· {s.purpose}</span> : null}
                  </p>
                </li>
              ))}
              {data && data.anonymous.length === 0 && <p className="text-sm text-muted py-6 text-center">No anonymous donations yet.</p>}
            </ul>
          </div>
        </div>

        <div className="text-center mt-10 text-xs text-muted">
          Supporters who ticked “Show my name on the supporter wall” appear here. Anonymous donors remain anonymous.
        </div>
      </div>
    </section>
  );
}