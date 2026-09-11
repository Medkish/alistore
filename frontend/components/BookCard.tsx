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

  return (
    <div className="bg-white rounded-2xl border border-line p-4 flex flex-col gap-3 text-center shadow-sm hover:shadow-lg transition group">
      <div className="rounded-xl overflow-hidden bg-white">
        <Link href={`/books/${id}/`}>
          <Image
            src={image}
            alt={title}
            width={300}
            height={400}
            className="object-contain w-full aspect-[3/4] group-hover:scale-105 transition duration-300"
          />
        </Link>
      </div>
      <div className="flex-1">
        <Link href={`/books/${id}/`}>
          <h3 className="font-bold text-ink hover:text-accent-dark">{title}</h3>
        </Link>
        <p className="text-xs text-muted">{author}</p>
        <div className="mt-1.5">
          {prevPrice && <span className="text-muted line-through mr-2">{formatAED(prevPrice)}</span>}
          <span className={`font-extrabold ${sale ? 'text-red-600' : 'text-brand'}`}>{formatAED(price)}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <Link
          href={`/books/${id}/`}
          className="btn-flash btn-outline-flash text-brand border-brand flex-1 text-sm py-2.5"
        >
          View
        </Link>
        <button
          onClick={handleAdd}
          disabled={added}
          className={`btn-flash text-sm py-2.5 flex-1 transition ${
            added ? 'bg-green-600 text-white' : 'btn-primary-flash'
          }`}
        >
          {added ? '✓ Added' : 'Add Cart'}
        </button>
      </div>
    </div>
  );
}