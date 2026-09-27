'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { AdminBookFilters } from '@/lib/api';
import { money, useAdminData } from '@/lib/admin';
import {
  Btn,
  EmptyState,
  ErrorNote,
  Field,
  Loading,
  Modal,
  Panel,
  Pill,
  Select,
  TextArea,
  useToast,
} from '@/components/admin/ui';

interface EditState {
  slug: string;
  title: string;
  author: string;
  price: string;
  stock: string;
  description: string;
  published: boolean;
  featured: boolean;
  bestseller: boolean;
}

const LOW_STOCK = 5;

export default function AdminBooksPage() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [published, setPublished] = useState('');
  const toast = useToast();

  const filters: AdminBookFilters = {
    search: query,
    category,
    published: published === '' ? undefined : published === 'true',
  };
  const books = useAdminData(() => api.adminBooks(filters), [query, category, published]);
  const categories = useAdminData(() => api.adminCategories(), []);

  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ slug: string; title: string } | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  function startEdit(b: NonNullable<typeof books.data>['books'][number]) {
    setEditing({
      slug: b.slug || b.id,
      title: b.title,
      author: b.author,
      price: String(b.price ?? 0),
      stock: String(b.stock ?? 0),
      description: b.description || '',
      published: b.published !== false,
      featured: !!b.featured,
      bestseller: !!b.bestseller,
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await api.adminUpdateBook(editing.slug, {
        title: editing.title.trim(),
        author: editing.author.trim(),
        price: Number(editing.price) || 0,
        stock: Number(editing.stock) || 0,
        description: editing.description,
        published: editing.published,
        featured: editing.featured,
        bestseller: editing.bestseller,
      });
      toast.ok(`Saved “${editing.title.trim()}”.`);
      setEditing(null);
      books.reload();
    } catch (err) {
      toast.err(err instanceof Error ? err.message : 'Could not save the book.');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(b: NonNullable<typeof books.data>['books'][number]) {
    const slug = b.slug || b.id;
    setBusySlug(slug);
    try {
      await api.adminUpdateBook(slug, { published: b.published === false });
      toast.ok(b.published === false ? `Published “${b.title}”.` : `Unpublished “${b.title}”.`);
      books.reload();
    } catch (err) {
      toast.err(err instanceof Error ? err.message : 'Could not update the book.');
    } finally {
      setBusySlug(null);
    }
  }

  async function remove() {
    if (!confirmDelete) return;
    setBusySlug(confirmDelete.slug);
    try {
      await api.adminDeleteBook(confirmDelete.slug);
      toast.ok(`Deleted “${confirmDelete.title}”.`);
      setConfirmDelete(null);
      books.reload();
    } catch (err) {
      toast.err(err instanceof Error ? err.message : 'Could not delete the book.');
    } finally {
      setBusySlug(null);
    }
  }

  const list = books.data?.books || [];
  const lowCount = list.filter((b) => (b.stock ?? 0) <= LOW_STOCK).length;

  return (
    <div className="space-y-4 sm:space-y-5">
      <header>
        <h1 className="text-xl font-extrabold text-ink sm:text-2xl">Books</h1>
        <p className="mt-1 text-sm text-muted">
          {books.data ? `${books.data.total} listing${books.data.total === 1 ? '' : 's'}` : 'Loading listings'}
          {lowCount > 0 && ` · ${lowCount} at or below ${LOW_STOCK} units`}
        </p>
      </header>

      <Panel bodyClassName="p-3 sm:p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search.trim());
          }}
          className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]"
        >
          <Field
            label="Search"
            placeholder="Title, author or ISBN"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {(categories.data?.categories || []).map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select label="Visibility" value={published} onChange={(e) => setPublished(e.target.value)}>
            <option value="">All</option>
            <option value="true">Published</option>
            <option value="false">Unpublished</option>
          </Select>
          <div className="flex items-end">
            <Btn type="submit" className="w-full sm:w-auto">
              Apply
            </Btn>
          </div>
        </form>
      </Panel>

      {books.loading && <Loading label="Loading books" />}
      {books.error && <ErrorNote message={books.error} onRetry={books.reload} />}

      {!books.loading && !books.error && list.length === 0 && (
        <EmptyState title="No books match those filters" hint="Try clearing the search or category." />
      )}

      {!books.loading && !books.error && list.length > 0 && (
        <>
          {/* Phone: stacked cards */}
          <ul className="space-y-3 md:hidden">
            {list.map((b) => {
              const slug = b.slug || b.id;
              return (
                <li key={b.id} className="card p-3">
                  <div className="flex gap-3">
                    {b.image ? (
                      <img
                        src={b.image}
                        alt=""
                        width={56}
                        height={72}
                        loading="lazy"
                        className="h-[4.5rem] w-14 shrink-0 rounded-lg object-cover ring-1 ring-line"
                      />
                    ) : (
                      <span className="h-[4.5rem] w-14 shrink-0 rounded-lg bg-surface-2" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink">{b.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">{b.author}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Pill tone={(b.stock ?? 0) <= 0 ? 'danger' : (b.stock ?? 0) <= LOW_STOCK ? 'warn' : 'success'}>
                          {b.stock ?? 0} in stock
                        </Pill>
                        {b.published === false ? <Pill tone="neutral">Unpublished</Pill> : <Pill tone="info">Live</Pill>}
                        {b.featured && <Pill tone="warn">Featured</Pill>}
                        {b.bestseller && <Pill tone="info">Bestseller</Pill>}
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-extrabold tabular-nums text-ink">{money(b.price)}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
                    <Btn variant="outline" className="!px-2 !text-xs" onClick={() => startEdit(b)}>
                      Edit
                    </Btn>
                    <Btn
                      variant="ghost"
                      className="!px-2 !text-xs"
                      busy={busySlug === slug}
                      onClick={() => togglePublished(b)}
                    >
                      {b.published === false ? 'Publish' : 'Hide'}
                    </Btn>
                    <Btn
                      variant="danger"
                      className="!px-2 !text-xs"
                      onClick={() => setConfirmDelete({ slug, title: b.title })}
                    >
                      Delete
                    </Btn>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Tablet and up: table */}
          <Panel bodyClassName="p-0" className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface text-left text-[11px] uppercase tracking-wide text-muted">
                    <th scope="col" className="px-4 py-2.5 font-bold">Book</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Category</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-bold">Price</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-bold">Stock</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Flags</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((b) => {
                    const slug = b.slug || b.id;
                    const cat = typeof b.category === 'string' ? b.category : b.category?.name;
                    return (
                      <tr key={b.id} className="hover:bg-surface">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            {b.image ? (
                              <img
                                src={b.image}
                                alt=""
                                width={36}
                                height={48}
                                loading="lazy"
                                className="h-12 w-9 shrink-0 rounded object-cover ring-1 ring-line"
                              />
                            ) : (
                              <span className="h-12 w-9 shrink-0 rounded bg-surface-2" />
                            )}
                            <div className="min-w-0">
                              <p className="max-w-[16rem] truncate font-bold text-ink">{b.title}</p>
                              <p className="max-w-[16rem] truncate text-xs text-muted">{b.author}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-muted">{cat || '—'}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{money(b.price)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <Pill tone={(b.stock ?? 0) <= 0 ? 'danger' : (b.stock ?? 0) <= LOW_STOCK ? 'warn' : 'success'}>
                            {b.stock ?? 0}
                          </Pill>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {b.published === false ? <Pill tone="neutral">Hidden</Pill> : <Pill tone="info">Live</Pill>}
                            {b.featured && <Pill tone="warn">Featured</Pill>}
                            {b.bestseller && <Pill tone="info">Best</Pill>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-1.5">
                            <Btn variant="outline" className="!px-2.5 !text-xs" onClick={() => startEdit(b)}>
                              Edit
                            </Btn>
                            <Btn
                              variant="ghost"
                              className="!px-2.5 !text-xs"
                              busy={busySlug === slug}
                              onClick={() => togglePublished(b)}
                            >
                              {b.published === false ? 'Publish' : 'Hide'}
                            </Btn>
                            <Btn
                              variant="danger"
                              className="!px-2.5 !text-xs"
                              onClick={() => setConfirmDelete({ slug, title: b.title })}
                            >
                              Delete
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      <Modal
        open={!!editing}
        title="Edit book"
        onClose={() => setEditing(null)}
        wide
        footer={
          <>
            <Btn variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Btn>
            <Btn busy={saving} onClick={saveEdit}>
              Save changes
            </Btn>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <Field label="Title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            <Field
              label="Author"
              value={editing.author}
              onChange={(e) => setEditing({ ...editing, author: e.target.value })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Price"
                type="number"
                min={0}
                step="0.01"
                value={editing.price}
                onChange={(e) => setEditing({ ...editing, price: e.target.value })}
              />
              <Field
                label="Stock"
                type="number"
                min={0}
                step="1"
                value={editing.stock}
                onChange={(e) => setEditing({ ...editing, stock: e.target.value })}
              />
            </div>
            <TextArea
              label="Description"
              rows={5}
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ['published', 'Published'],
                  ['featured', 'Featured'],
                  ['bestseller', 'Bestseller'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3"
                >
                  <input
                    type="checkbox"
                    checked={editing[key]}
                    onChange={(e) => setEditing({ ...editing, [key]: e.target.checked })}
                    className="h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                  />
                  <span className="text-sm font-semibold text-ink">{label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted">
              Changing stock here writes a direct adjustment. Use the inventory section for audited changes.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={!!confirmDelete}
        title="Delete this book?"
        onClose={() => setConfirmDelete(null)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>
              Keep it
            </Btn>
            <Btn variant="danger" busy={busySlug === confirmDelete?.slug} onClick={remove}>
              Delete permanently
            </Btn>
          </>
        }
      >
        <p className="text-sm text-ink">
          <span className="font-bold">{confirmDelete?.title}</span> will be removed from the catalogue and will no
          longer be purchasable. This cannot be undone.
        </p>
      </Modal>

      {toast.node}
    </div>
  );
}
