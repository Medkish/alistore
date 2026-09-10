'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/providers';

const COUNTRIES = [
  { code: '+971', label: 'UAE' },
  { code: '+1', label: 'US' },
  { code: '+44', label: 'UK' },
  { code: '+91', label: 'India' },
  { code: '+966', label: 'Saudi Arabia' },
  { code: '+20', label: 'Egypt' },
  { code: '+234', label: 'Nigeria' },
  { code: '+233', label: 'Ghana' },
  { code: '+254', label: 'Kenya' },
  { code: '+61', label: 'Australia' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('+971');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  function validate() {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Please enter a valid email.';
    if (!/^\d{6,12}$/.test(mobile.replace(/[\s()-]/g, ''))) e.mobile = 'Please enter a valid mobile number.';
    if (password.length < 6) e.password = 'Password must be at least 6 characters.';
    if (password !== confirm) e.confirm = 'Passwords do not match.';
    if (!terms) e.terms = 'You must accept the terms.';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const eMap = validate();
    setErrors(eMap);
    if (Object.keys(eMap).length) return;
    setLoading(true);
    setServerError('');
    try {
      await register({ name: name.trim(), email: email.trim(), mobile: `${country}${mobile.replace(/\D/g, '')}`, password });
      router.push('/profile/');
    } catch {
      setServerError('Registration failed — please try again.');
    }
    setLoading(false);
  }

  const field = (id: string, label: string, val: string, set: (v: string) => void, type = 'text', placeholder = '') => (
    <div>
      <label className="text-sm font-semibold text-ink mb-1 block">{label}</label>
      <input
        id={id}
        type={type}
        value={val}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm focus:outline-none ${errors[id] ? 'border-red-500' : 'border-line focus:border-accent'}`}
      />
      {errors[id] && <p className="text-xs text-red-600 mt-1">{errors[id]}</p>}
    </div>
  );

  return (
    <section className="py-12">
      <div className="mx-auto max-w-md px-4">
        <h1 className="text-2xl font-extrabold text-brand mb-6 text-center">Create Account</h1>
        {serverError && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-2 text-sm mb-4 text-center">
            {serverError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="bg-white border border-line rounded-2xl p-6 flex flex-col gap-4">
          {field('reg-name', 'Full name', name, setName, 'text', 'First Last')}
          {field('reg-email', 'Email', email, setEmail, 'email', 'you@email.com')}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-semibold text-ink mb-1 block">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full border-2 border-line rounded-xl px-2 py-2.5 text-sm focus:border-accent focus:outline-none bg-white"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label} {c.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">{field('reg-mobile', 'Mobile number', mobile, setMobile, 'tel', '50 123 4567')}</div>
          </div>
          {field('reg-pass', 'Password', password, setPassword, 'password', 'min 6 characters')}
          {field('reg-pass-confirm', 'Confirm password', confirm, setConfirm, 'password')}
          <div>
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="accent-accent-dark w-4 h-4"
              />
              I agree to the AlioStore{' '}
              <button type="button" className="underline text-accent-dark font-semibold">
                Terms &amp; Conditions
              </button>
            </label>
            {errors.terms && <p className="text-xs text-red-600 mt-1">{errors.terms}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-flash btn-primary-flash w-full text-sm py-3 disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Register'}
          </button>
          <p className="text-center text-sm text-muted">
            Already have an account?{' '}
            <Link href="/login/" className="text-accent-dark font-semibold underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}