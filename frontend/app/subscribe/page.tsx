'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { formatAED } from '@/lib/format';

const PLANS = [
  {
    id: 'basic',
    name: 'BASIC',
    tagline: 'For curious beginners',
    monthly: 25,
    perks: ['1 programming language track', 'Monthly learning milestones', 'Community access'],
  },
  {
    id: 'standard',
    name: 'STANDARD',
    tagline: 'For serious learners',
    monthly: 45,
    perks: ['All language tracks', 'Exercises + quizzes', 'Progress reports'],
  },
  {
    id: 'premium',
    name: 'PREMIUM',
    tagline: 'For pro developers',
    monthly: 79,
    perks: ['All tracks + early releases', '1-on-1 code review sessions', 'Certificate of completion'],
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SubscribePage() {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [plan, setPlan] = useState('standard');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ reference: string; plan: string; period: string; nextBilling?: string } | null>(null);

  async function subscribe() {
    setError('');
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address to start your subscription.');
      return;
    }
    setBusy(true);
    try {
      const now = new Date();
      const next = new Date(now);
      if (period === 'yearly') next.setFullYear(next.getFullYear() + 1);
      else next.setMonth(next.getMonth() + 1);
      const res = await api.subscribe({
        plan,
        period,
        email: email.trim(),
        nextBilling: next.toISOString(),
      });
      setDone({ reference: res.reference, plan: res.plan, period: res.period, nextBilling: res.nextBilling });
    } catch (e) {
      setError((e as Error).message || 'Subscription could not be created.');
    }
    setBusy(false);
  }

  if (done) {
    return (
      <section className="py-10 md:py-16">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <div className="bg-white border border-line rounded-3xl p-8 md:p-12 shadow-sm">
            <p className="text-5xl mb-5">🎉</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand uppercase mb-2">Subscription Started</h1>
            <p className="text-sm text-muted mb-6">Welcome to the {done.plan} plan. We emailed your welcome pack.</p>
            <div className="inline-flex items-center gap-2 bg-brand/5 border border-brand/30 rounded-2xl px-5 py-3 mb-6">
              <span className="text-xs font-bold text-muted uppercase">Reference</span>
              <span className="font-extrabold text-brand tracking-wide">{done.reference}</span>
            </div>
            <p className="text-xs text-muted">
              {done.period === 'yearly' ? 'Next billing in 12 months.' : 'Next billing in 1 month.'}
              {done.nextBilling ? ` Renews ${new Date(done.nextBilling).toLocaleDateString()}.` : ''}
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link href="/books/" className="btn-flash btn-primary-flash">
                START LEARNING →
              </Link>
              <Link href="/" className="btn-flash btn-outline-flash text-brand border-brand">
                ← BACK TO ALIOSTORE
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const activePlan = PLANS.find((p) => p.id === plan) || PLANS[1];
  const price = period === 'yearly' ? activePlan.monthly * 10 : activePlan.monthly;

  return (
    <section className="py-10 md:py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-brand uppercase">Start Your Language Subscription</h1>
          <p className="text-muted mt-3 max-w-xl mx-auto leading-relaxed">
            Learn to program at your own pace with structured tracks, exercises, and community support — billed
            monthly or yearly.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          <button
            type="button"
            onClick={() => setPeriod('monthly')}
            className={`px-5 py-2 rounded-full text-sm font-bold transition ${
              period === 'monthly' ? 'bg-brand text-white' : 'bg-white border border-line text-muted hover:border-brand'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setPeriod('yearly')}
            className={`px-5 py-2 rounded-full text-sm font-bold transition ${
              period === 'yearly' ? 'bg-brand text-white' : 'bg-white border border-line text-muted hover:border-brand'
            }`}
          >
            Yearly <span className="text-[10px] font-extrabold text-green-700">· 2 MONTHS FREE</span>
          </button>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {PLANS.map((p) => {
            const pPrice = period === 'yearly' ? p.monthly * 10 : p.monthly;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPlan(p.id);
                  setError('');
                }}
                className={`flex-1 border-2 rounded-3xl p-5 text-left transition ${
                  plan === p.id ? 'border-brand bg-brand/5 shadow-md' : 'border-line hover:border-brand/40'
                }`}
              >
                <p className="text-xs font-extrabold text-accent-dark uppercase tracking-wide">{p.name}</p>
                <p className="text-[11px] text-muted mt-0.5 mb-3">{p.tagline}</p>
                <p className="text-2xl font-extrabold text-ink">
                  {formatAED(pPrice)}
                  <span className="text-xs font-bold text-muted"> /{period === 'yearly' ? 'year' : 'month'}</span>
                </p>
                <ul className="mt-4 flex flex-col gap-1.5 text-[12px] text-ink">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-1.5">
                      <span className="text-green-600 font-bold">✓</span>
                      {perk}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <div className="bg-white border border-line rounded-3xl p-6 md:p-8 shadow-sm max-w-2xl mx-auto">
          <h2 className="font-extrabold text-ink mb-1">
            {activePlan.name} · {formatAED(price)}/{period === 'yearly' ? 'year' : 'month'}
          </h2>
          <p className="text-xs text-muted mb-5">
            Enter your email and we&apos;ll create your {activePlan.name} subscription.
          </p>
          <label className="block text-sm">
            <span className="font-semibold text-ink">Email:</span>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="you@example.com"
              className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
            />
          </label>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
            <Link href="/" className="text-xs font-bold text-muted hover:underline">
              ← Back to AlioStore
            </Link>
            <button
              type="button"
              onClick={subscribe}
              disabled={busy}
              className="btn-flash btn-primary-flash disabled:opacity-60"
            >
              {busy ? 'Starting…' : `START MY ${activePlan.name} SUBSCRIPTION`}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}