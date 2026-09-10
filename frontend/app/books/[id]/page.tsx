import { CATALOG } from '@/lib/catalog';
import BookDetailsClient from '@/components/BookDetailsClient';

export function generateStaticParams() {
  return CATALOG.map((b) => ({ id: b.id }));
}

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = CATALOG.find((b) => b.id === id);
  if (!book) {
    return (
      <div className="py-24 text-center text-muted">
        <h1 className="text-2xl font-bold mb-2">Book not found</h1>
        <a href="/books/" className="underline text-accent-dark">
          Browse all books
        </a>
      </div>
    );
  }
  return <BookDetailsClient book={book} />;
}