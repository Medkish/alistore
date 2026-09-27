'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const STORAGE_KEY = 'alistore-back-path';

export default function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevPathRef.current) {
      try {
        sessionStorage.setItem(STORAGE_KEY, prevPathRef.current);
      } catch {
        // ignore storage errors (private browsing etc.)
      }
    }
    prevPathRef.current = pathname ?? null;
  }, [pathname]);

  if (!pathname || pathname === '/' || pathname.startsWith('/admin')) return null;

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    let fallback = '/';
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored && stored !== pathname) fallback = stored;
    } catch {
      // keep "/"
    }
    router.push(fallback);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 pb-1">
      <button
        type="button"
        onClick={goBack}
        className="flex items-center gap-2.5 px-2 py-2 text-base md:text-lg font-extrabold text-brand hover:text-accent-dark transition"
      >
        <span className="text-2xl leading-none select-none" aria-hidden>
          ←
        </span>
        Back
      </button>
    </div>
  );
}