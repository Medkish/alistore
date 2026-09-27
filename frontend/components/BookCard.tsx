'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/components/providers';
import { formatAED } from '@/lib/format';

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  price: number;
  image: string;
  prevPrice?: number;
  sale?: boolean;
}

export default function BookCard({ id, title, author, price, image, prevPrice, sale }: BookCardProps) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1600);
    return () => clearTimeout(t);
  }, [added]);

  function handleAdd() {
    add(id, title, price, image);
    setAdded(true);
  }

  const original = prevPrice && prevPrice > price ? prevPrice : null;

  return (
    <article className="card card-hover group relative flex flex-col p-3">
      <Link
        href={`/books/${id}/`}
        className="relative block overflow-hidden rounded-xl bg-surface"
        tabIndex={-1}
        aria-hidden="true"
      >
        <Image
          src={image}
          alt=""
          width={300}
          height={400}
          className="aspect-[3/4] w-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
        {sale && (
          <span className="absolute left-2 top-2 rounded-md bg-danger px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Sale
          </span>
        )}
        {original !== null && (
          <span className="absolute right-2 top-2 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold text-brand-ink">
            −{Math.round((1 - price / original) * 100)}%
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col px-1 pt-3">
        <h3 className="text-sm font-bold leading-snug text-ink">
          <Link href={`/books/${id}/`} className="transition-colors hover:text-accent-dark">
            <span className="absolute inset-0" aria-hidden="true" />
            {title}
          </Link>
        </h3>
        <p className="mt-0.5 text-xs text-muted">{author}</p>
        <div className="mt-2 flex items-baseline gap-2">
          {original !== null && <span className="text-xs text-muted line-through">{formatAED(original)}</span>}
          <span className={`text-base font-extrabold ${original !== null ? 'text-danger' : 'text-brand'}`}>
            {formatAED(price)}
          </span>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleAdd}
          disabled={added}
          className={`btn-flash flex-1 min-h-11 py-2.5 text-xs ${added ? 'bg-emerald-600 text-white' : 'btn-primary-flash'}`}
        >
          {added ? 'Added' : 'Add to cart'}
        </button>
      </div>
    </article>
  );
}
