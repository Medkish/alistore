'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers';

export default function WelcomeNote() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const show = window.setTimeout(() => {
      setVisible(true);
      window.setTimeout(() => {
        setVisible(false);
        window.setTimeout(() => setGone(true), 400);
      }, 4200);
    }, 900);
    return () => window.clearTimeout(show);
  }, []);

  if (gone) return null;

  const name = (user?.name || '').trim();
  const text = name ? `Welcome back, ${name}!` : 'Welcome to Code-Me!';

  return (
    <div
      className={`fixed left-1/2 top-[calc(1rem+env(safe-area-inset-top))] z-[100] -translate-x-1/2 max-w-[92vw] rounded-2xl bg-[#142a56]/95 px-5 py-3 text-sm font-bold text-white shadow-xl ring-1 ring-white/20 transition-all duration-500 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-3 opacity-0'
      }`}
      role="status"
    >
      {text}
    </div>
  );
}