'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (!pathname || pathname === '/' || pathname.startsWith('/admin')) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 pb-1">
      <button
        type="button"
        onClick={() => router.back()}
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