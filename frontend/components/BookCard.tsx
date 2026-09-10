'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/components/providers';

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

  return (
    <div className="bg-white rounded-2xl border border-line p-4 flex flex-col gap-3 text-center shadow-sm hover:shadow-lg transition group">
      <div className="peer rounded-xl overflow-hidden bg-white">
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
          {prevPrice && <span className="text-muted line-through mr-2">{`$ ${prevPrice.toFixed(2)}`}</span>}
          <span className={`font-extrabold ${sale ? 'text-red-600' : 'text-brand'}`}>
            {`$ ${price.toFixed(2)}`}
          </span>
        </div>
      </div>
      <button
        onClick={() => add(title, price, image)}
        className="btn-flash btn-primary-flash w-full text-sm py-2.5"
      >
        Add to Cart
      </button>
    </div>
  );
}