'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, getToken } from '@/lib/api';
import { formatAED } from '@/lib/format';
import type { Campaign, DonationSettings, DonationSummary } from '@/lib/types';

const ONE_TIME_PRESETS = [10, 25, 50, 100, 250, 500];
const MONTHLY_PRESETS = [10, 25, 50, 100];
const MIN_AMOUNT = 5;
const MAX_AMOUNT = 50000;

const STEPS = [
  'Donation',
  'Your Details',
  'Payment Method',
  'Payment Provider',
  'Payment Verification',
  'Donation Completed',
];

const METHODS = [
  { value: 'card', label: '💳 Card', hint: 'Simulated online payment — confirmed instantly' },
  { value: 'bank', label: '🏦 Bank Transfer', hint: 'Transfer the amount directly to our account' },
];

const PROVIDERS = [
  { value: 'stripe', label: 'Stripe', hint: 'Visa, Mastercard, Amex', recurring: true },
  { value: 'paypal', label: 'PayPal', hint: 'Pay with your PayPal balance', recurring: true },
  { value: 'cashapp', label: 'Cash App', hint: 'Fast US payment app', recurring: false },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COUNTRY_NAMES: Record<string, string> = {
  AE: 'UAE', SA: 'KSA', KW: 'Kuwait', BH: 'Bahrain', OM: 'Oman', QA: 'Qatar', EG: 'Egypt',
  JO: 'Jordan', LB: 'Lebanon', US: 'United States', GB: 'United Kingdom', IN: 'India',
  PK: 'Pakistan', PH: 'Philippines', ID: 'Indonesia', NG: 'Nigeria', KE: 'Kenya', ZA: 'South Africa',
};

function guessCountry(): string | undefined {
  try {
    const lang = (navigator.language || 'en-US').toUpperCase();
    const parts = lang.split('-');
    if (parts.length >= 2) return COUNTRY_NAMES[parts[1]] || undefined;
  } catch {
    return undefined;
  }
  return undefined;
}

export default function DonatePage() {
  const [settings, setSettings] = useState<DonationSettings | null>(null);
  const [summary, setSummary] = useState<DonationSummary | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [recurring, setRecurring] = useState<'one-time' | 'monthly'>('one-time');
  const [purpose, setPurpose] = useState('');
  const [campaignId, setCampaignId] = useState('');

  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [anonymous, setAnonymous] = useState(false);
  const [showWall, setShowWall] = useState(true);
  const [message, setMessage] = useState<string>('');
  const [publicMessage, setPublicMessage] = useState(true);

  const [method, setMethod] = useState<string>('card');
  const [provider, setProvider] = useState<string>('stripe');
  const [coverFees, setCoverFees] = useState(false);
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '' });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ id: string; donationNumber: string; amount: number; recurring: boolean } | null>(null);

  const isMonthly = recurring === 'monthly';
  const presets = isMonthly ? MONTHLY_PRESETS : ONE_TIME_PRESETS;
  const value = Number(customAmount && !Number.isNaN(Number(customAmount)) ? customAmount : amount) || 0;
  const providersAvailable = (isMonthly ? PROVIDERS.filter((p) => p.recurring) : PROVIDERS);

  useEffect(() => {
    api.donationSettings().then((r) => setSettings(r.settings)).catch(() => undefined);
    api.donationSummary().then((s) => {
      setSummary(s);
    }).catch(() => undefined);
    api.campaigns().then((r) => {
      setCampaigns(r.campaigns);
      if (r.campaigns.length) setCampaignId(r.campaigns.find((c) => c.featured)?.id || r.campaigns[0].id);
    }).catch(() => undefined);
  }, []);

  const amtMin = settings?.minAmount ?? MIN_AMOUNT;
  const amtMax = settings?.maxAmount ?? MAX_AMOUNT;
  const purposes = settings?.purposes || ['AlioStore Development', 'Help improve the platform'];
  const availableCampaigns = campaigns.filter((c) => c.status === 'ACTIVE');

  function fail(msg: string): boolean {
    setError(msg);
    return false;
  }

  function next() {
    setError('');
    if (step === 0) {
      if (!value || value <= 0) return fail(isMonthly ? 'Choose or enter a valid monthly donation amount.' : 'Choose or enter a valid donation amount.');
      if (value < amtMin) return fail(`Minimum donation is ${formatAED(amtMin)}.`);
      if (value > amtMax) return fail(`Maximum donation is ${formatAED(amtMax)}.`);
      if (!purpose) return fail('Choose a donation purpose.');
      if (isMonthly && settings?.allowMonthly === false) return fail('Monthly donations are currently disabled.');
    }
    if (step === 1) {
      if (!anonymous && !name.trim()) return fail('Enter your name or tick "Donate anonymously".');
      if (!anonymous && name.trim().length < 2) return fail('Name looks too short.');
      if (!anonymous && !EMAIL_RE.test(email.trim())) return fail('Enter a valid email address.');
    }
    if (step === 2 && isMonthly && method === 'bank') return fail('Recurring donations require a card provider that supports subscriptions.');
    setStep((s) => s + 1);
  }

  function back() {
    setError('');
    setStep((s) => Math.max(0, s - 1));
  }

  async function donate() {
    if (isMonthly && !providersAvailable.some((p) => p.value === provider)) {
      setProvider('stripe');
    }
    setBusy(true);
    setError('');
    setStep(4);
    try {
      const created = await api.donate(value, method, {
        name,
        email,
        anonymous,
        provider,
        message,
        purpose,
        coverFees: !isMonthly && coverFees,
        recurring: isMonthly,
        campaignId: campaignId || undefined,
        showOnWall: !anonymous && showWall,
        country: guessCountry(),
      });
      await new Promise((r) => setTimeout(r, 1500));
      const res = await api.payDonationDemo(created.id);
      if (res.donation.status !== 'PAID') throw new Error('Payment could not be confirmed.');
      setDone({ id: created.id, donationNumber: res.donation.donationNumber, amount: res.donation.amount, recurring: !!res.donation.recurring });
      setStep(5);
    } catch (e) {
      setError((e as Error).message || 'Donation could not be verified.');
      setBusy(false);
    }
  }

  if (done) {
    const loggedIn = !!getToken();
    return (
      <section className="py-10 md:py-16">
        <div className="mx-auto max-w-lg px-4">
          <div className="bg-white border border-line rounded-3xl p-10 shadow-sm text-center">
            <p className="text-5xl mb-4">🎉</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand mb-3 uppercase">Thank You!</h1>
            <p className="text-ink font-bold mb-1">
              Your {done.recurring ? 'monthly ' : ''}donation of {formatAED(done.amount)} has been successfully received.
            </p>
            <p className="text-muted text-sm mt-3 leading-relaxed">
              Your support helps us continue building opportunities for people learning programming.
            </p>
            <p className="text-[11px] text-muted mt-5">
              Donation ID: <span className="font-bold text-ink">{done.donationNumber}</span>
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-7">
              {loggedIn ? (
                <Link href={`/donate/receipt/?id=${done.id}`} className="btn-flash btn-primary-flash">
                  ⬇ DOWNLOAD RECEIPT
                </Link>
              ) : (
                <Link href="/auth/" className="btn-flash btn-outline-flash text-brand border-brand">
                  Sign in to access receipts
                </Link>
              )}
              <Link href="/" className="btn-flash btn-outline-flash text-brand border-brand">
                RETURN TO ALIOSTORE
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (settings && settings.enabled === false) {
    return (
      <section className="py-10 md:py-16">
        <div className="mx-auto max-w-lg px-4 text-center">
          <h1 className="text-2xl font-extrabold text-brand uppercase mb-3">Donations</h1>
          <p className="text-muted">Donations are currently turned off. Check back soon!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 md:py-16">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-brand uppercase">Donate to AlioStore</h1>
          <p className="text-muted mt-3 max-w-xl mx-auto leading-relaxed">
            {settings?.message ||
              'Your support helps us continue creating programming education and making learning resources more accessible.'}
          </p>
        </div>

        <ol className="hidden md:flex items-center justify-between gap-2 mb-8">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2 text-[11px] font-bold">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2 transition ${
                  i < step ? 'bg-brand border-brand text-white' : i === step ? 'border-brand text-brand' : 'border-line text-muted'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </span>
              <span className={i === step ? 'text-brand' : i < step ? 'text-ink' : 'text-muted'}>{label}</span>
            </li>
          ))}
        </ol>

        <div className="bg-white border border-line rounded-3xl p-6 md:p-8 shadow-sm">
          {step === 0 && (
            <div>
              <div className="flex items-center justify-center gap-2 mb-5">
                {(['one-time', 'monthly'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setRecurring(mode);
                      setAmount('');
                      setCustomAmount('');
                      if (mode === 'monthly') setProvider('stripe');
                      setError('');
                    }}
                    className={`px-5 py-2 rounded-full text-sm font-bold capitalize transition ${
                      recurring === mode ? 'bg-brand text-white' : 'bg-white border border-line text-muted hover:border-brand'
                    }`}
                  >
                    {mode === 'one-time' ? 'ONE-TIME' : 'MONTHLY'}
                  </button>
                ))}
              </div>

              <h2 className="font-extrabold text-ink mb-1">{isMonthly ? 'Make a Monthly Difference' : 'Choose an amount:'}</h2>
              {isMonthly && <p className="text-[11px] text-muted mb-4">A small monthly gift keeps AlioStore growing all year round.</p>}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setAmount(String(p));
                      setCustomAmount('');
                      setError('');
                    }}
                    className={`border-2 rounded-xl px-4 py-3 font-bold text-sm transition ${
                      value === p ? 'border-brand bg-brand/5 text-brand' : 'border-line hover:border-brand/40'
                    }`}
                  >
                    {formatAED(p)}<span className="text-[10px] text-muted font-semibold">{isMonthly ? '/mo' : ''}</span>
                  </button>
                ))}
              </div>
              <label className="block text-sm mb-5">
                <span className="font-semibold text-ink">Custom Amount:</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-ink">AED</span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setAmount('');
                      setError('');
                    }}
                    min={amtMin}
                    placeholder="25"
                    className="w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                  />
                </div>
              </label>

              {settings?.showProgress && summary && (
                <div className="bg-accent/5 border border-accent/30 rounded-2xl p-4 mb-5">
                  <p className="text-xs font-bold text-muted uppercase mb-2">This month</p>
                  <div className="flex items-end justify-between">
                    <p className="text-lg font-extrabold text-brand">{formatAED(summary.thisMonth)} raised</p>
                    <Link href="/donate/supporters" className="text-[11px] font-bold text-accent-dark hover:underline">
                      See supporters →
                    </Link>
                  </div>
                </div>
              )}

              <label className="block text-sm mb-5">
                <span className="font-semibold text-ink">Donation Purpose:</span>
                <select
                  value={purpose}
                  onChange={(e) => {
                    setPurpose(e.target.value);
                    setError('');
                  }}
                  className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                >
                  <option value="">Choose a purpose…</option>
                  {purposes.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>

              {settings?.allowCampaigns && availableCampaigns.length > 0 && (
                <div className="mb-5">
                  <h3 className="font-extrabold text-ink text-sm mb-3">
                    Support a Campaign
                    <span className="text-[11px] font-semibold text-muted ml-2">(optional)</span>
                  </h3>
                  <div className="flex flex-col gap-3">
                    {availableCampaigns.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCampaignId(campaignId === c.id ? '' : c.id)}
                        className={`border-2 rounded-2xl px-4 py-3 text-left transition ${
                          campaignId === c.id ? 'border-brand bg-brand/5' : 'border-line hover:border-brand/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-ink text-sm">{c.title}</span>
                          <span className={`text-xs font-extrabold ${c.fundedPercent >= 100 ? 'text-green-700' : 'text-accent-dark'}`}>
                            {c.fundedPercent}% funded
                          </span>
                        </div>
                        <div className="h-2.5 bg-line rounded-full mt-2 overflow-hidden">
                          <div
                            className={`h-full ${c.fundedPercent >= 100 ? 'bg-green-600' : 'bg-accent'} transition-all`}
                            style={{ width: `${Math.min(100, c.fundedPercent)}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-muted mt-1.5">
                          {formatAED(c.raised)} raised of {formatAED(c.goal)} goal
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="font-extrabold text-ink mb-4">Your Details</h2>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <label className="block text-sm">
                  <span className="font-semibold text-ink">Donor Name:</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={anonymous}
                    placeholder="Jane Doe"
                    className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none disabled:bg-slate-50 disabled:text-muted"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold text-ink">Email (receipt sent here):</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={anonymous}
                    placeholder="jane@example.com"
                    className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none disabled:bg-slate-50 disabled:text-muted"
                  />
                </label>
              </div>
              {settings?.allowAnonymous && (
                <label className="flex items-center gap-2 text-sm font-semibold text-ink mb-3">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => {
                      setAnonymous(e.target.checked);
                      setError('');
                    }}
                    className="w-4 h-4 accent-brand"
                  />
                  Donate anonymously <span className="text-[11px] font-normal text-muted">(anonymous donors remain anonymous)</span>
                </label>
              )}
              {settings?.showSupporterWall && !anonymous && (
                <label className="flex items-center gap-2 text-sm font-semibold text-ink mb-3">
                  <input
                    type="checkbox"
                    checked={showWall}
                    onChange={(e) => setShowWall(e.target.checked)}
                    className="w-4 h-4 accent-brand"
                  />
                  ☑ Show my name on the supporter wall
                </label>
              )}
              {settings?.allowMessages && (
                <div className="border-t border-line pt-4 mt-2">
                  <label className="block text-sm mb-2">
                    <span className="font-semibold text-ink">Donation Message</span>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={2}
                      maxLength={280}
                      placeholder="I love what AlioStore is doing for programming education."
                      className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                    />
                  </label>
                  {settings?.messageDisplay && !anonymous && (
                    <label className="flex items-center gap-2 text-sm font-semibold text-ink mb-1">
                      <input
                        type="checkbox"
                        checked={publicMessage}
                        onChange={(e) => setPublicMessage(e.target.checked)}
                        className="w-4 h-4 accent-brand"
                      />
                      ☑ Display publicly on the supporter wall
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-extrabold text-ink mb-4">Payment Method</h2>
              <div className="flex flex-col gap-3">
                {METHODS.map((m) => {
                  const disabled = isMonthly && m.value === 'bank';
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        setMethod(m.value);
                        setError('');
                      }}
                      disabled={disabled}
                      className={`flex-1 border-2 rounded-2xl px-4 py-3 text-left transition ${
                        disabled
                          ? 'opacity-40 cursor-not-allowed'
                          : method === m.value
                            ? 'border-brand bg-brand/5'
                            : 'border-line hover:border-brand/40'
                      }`}
                    >
                      <span className="block font-bold text-ink text-sm">{m.label}</span>
                      <span className="block text-[11px] text-muted mt-0.5">
                        {disabled ? 'Not available for recurring donations' : m.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="font-extrabold text-ink mb-1">Payment Provider</h2>
              {isMonthly && (
                <p className="text-[11px] text-accent-dark font-semibold mb-4">
                  Recurring donations require a provider that supports subscriptions.
                </p>
              )}
              <div className="flex flex-col gap-3 mb-4">
                {providersAvailable.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setProvider(p.value);
                      setError('');
                    }}
                    className={`flex-1 border-2 rounded-2xl px-4 py-3 text-left transition ${
                      provider === p.value ? 'border-brand bg-brand/5' : 'border-line hover:border-brand/40'
                    }`}
                  >
                    <span className="block font-bold text-ink text-sm">{p.label}</span>
                    <span className="block text-[11px] text-muted mt-0.5">
                      {p.hint}{p.recurring ? ' · ✓ supports recurring payments' : ''}
                    </span>
                  </button>
                ))}
              </div>
              {method === 'card' && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block text-sm sm:col-span-2">
                    <span className="font-semibold text-ink">Card Number</span>
                    <input
                      value={card.number}
                      onChange={(e) => setCard((c) => ({ ...c, number: e.target.value }))}
                      placeholder="4242 4242 4242 4242"
                      maxLength={19}
                      className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none tracking-widest"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-ink">Expiry</span>
                    <input
                      value={card.expiry}
                      onChange={(e) => setCard((c) => ({ ...c, expiry: e.target.value }))}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-ink">CVC</span>
                    <input
                      value={card.cvc}
                      onChange={(e) => setCard((c) => ({ ...c, cvc: e.target.value }))}
                      placeholder="123"
                      maxLength={4}
                      type="password"
                      className="mt-1 w-full border-2 border-line rounded-xl px-3 py-2 focus:border-brand focus:outline-none"
                    />
                  </label>
                </div>
              )}
              {!isMonthly && (
                <label className="flex items-center gap-2 text-sm font-semibold text-ink mt-4">
                  <input type="checkbox" checked={coverFees} onChange={(e) => setCoverFees(e.target.checked)} className="w-4 h-4 accent-brand" />
                  Cover payment processing fees
                  {coverFees && value > 0 && (
                    <span className="text-[11px] text-muted">(+{formatAED(Math.round(value * 0.03 * 100) / 100)})</span>
                  )}
                </label>
              )}
              <p className="text-[11px] text-muted mt-4">🔒 Secure payment via {provider}</p>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-10">
              <div className="mx-auto w-12 h-12 border-4 border-line border-t-brand rounded-full animate-spin mb-5" />
              <h2 className="text-lg font-extrabold text-brand mb-1 uppercase">Payment Verification</h2>
              <p className="text-sm text-muted">
                Confirming your {isMonthly ? 'monthly ' : ''}donation of {formatAED(value)}…
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          {step < 4 && (
            <div className="flex justify-between gap-3 mt-6">
              <button type="button" onClick={back} disabled={busy} className="btn-flash btn-outline-flash text-brand border-brand disabled:opacity-60">
                ← BACK
              </button>
              {step < 3 ? (
                <button type="button" onClick={next} disabled={busy} className="btn-flash btn-primary-flash disabled:opacity-60">
                  CONTINUE →
                </button>
              ) : (
                <button type="button" onClick={donate} disabled={busy} className="btn-flash btn-primary-flash disabled:opacity-60">
                  {busy ? 'Processing…' : isMonthly ? 'DONATE MONTHLY' : 'DONATE NOW'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="text-center mt-8 mb-4">
          <Link href="/donate/supporters" className="text-sm font-bold text-accent-dark hover:underline">
            ❤️ Meet our supporters
          </Link>
        </div>
      </div>
    </section>
  );
}