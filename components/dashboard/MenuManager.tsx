'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDashboardAuth } from '@/lib/dashboard-auth';
import {
  getCategoriesForTenant,
  getMenuItemsForTenant,
  createCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  toggleMenuItemAvailability,
  deleteMenuItem,
} from '@/lib/dashboard-queries';
import type { Category, MenuItem } from '@/lib/types';
import { formatPrice } from '@/lib/format';

export default function MenuEditor() {
  const { staff } = useDashboardAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingItemFor, setAddingItemFor] = useState<string | null>(null);

  async function refresh() {
    if (!staff) return;
    const [cats, menuItems] = await Promise.all([
      getCategoriesForTenant(staff.tenant_id),
      getMenuItemsForTenant(staff.tenant_id),
    ]);
    setCategories(cats);
    setItems(menuItems);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff]);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!staff || !newCategoryName.trim()) return;
    await createCategory(staff.tenant_id, newCategoryName.trim(), categories.length + 1);
    setNewCategoryName('');
    refresh();
  }

  async function handleDeleteCategory(categoryId: string) {
    if (!confirm('Delete this category? Items inside it will need a new category first.')) return;
    await deleteCategory(categoryId);
    refresh();
  }

  async function handleToggleAvailability(item: MenuItem) {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_available: !i.is_available } : i))
    );
    await toggleMenuItemAvailability(item.id, !item.is_available);
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm('Delete this menu item permanently?')) return;
    await deleteMenuItem(itemId);
    refresh();
  }

  if (loading) {
    return <div className="p-6 text-muted">Loading menu…</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-white border-b-2 border-line">
        <div>
          <p className="font-display text-xl sm:text-2xl text-ink">Menu</p>
          <p className="text-sm text-muted">Add items, edit prices, mark things sold out.</p>
        </div>
        <Link
          href="/dashboard"
          className="self-start sm:self-auto whitespace-nowrap px-4 py-2.5 rounded-full border-2 border-line text-ink font-semibold text-sm"
        >
          ← Back to orders
        </Link>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-6 flex flex-col gap-8 max-w-2xl">
        <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category name (e.g. Desserts)"
            className="flex-1 border-2 border-line rounded-chit px-4 py-3 text-base bg-white"
          />
          <button
            type="submit"
            className="whitespace-nowrap bg-ink text-paper rounded-chit px-5 py-3 font-semibold"
          >
            Add category
          </button>
        </form>

        {categories.length === 0 && (
          <p className="text-muted">No categories yet — add one above to get started.</p>
        )}

        {categories.map((cat) => (
          <div key={cat.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 border-b-2 border-line pb-2">
              <h2 className="font-display text-lg sm:text-xl text-ink truncate">{cat.name}</h2>
              <button
                type="button"
                onClick={() => handleDeleteCategory(cat.id)}
                className="whitespace-nowrap text-sm text-accent font-medium"
              >
                Delete category
              </button>
            </div>

            {items
              .filter((i) => i.category_id === cat.id)
              .map((item) => (
                <MenuItemRow
                  key={item.id}
                  item={item}
                  onToggle={() => handleToggleAvailability(item)}
                  onDelete={() => handleDeleteItem(item.id)}
                  onSaved={refresh}
                />
              ))}

            {addingItemFor === cat.id ? (
              <NewItemForm
                tenantId={staff!.tenant_id}
                categoryId={cat.id}
                onDone={() => {
                  setAddingItemFor(null);
                  refresh();
                }}
                onCancel={() => setAddingItemFor(null)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setAddingItemFor(cat.id)}
                className="self-start text-sm font-medium text-accent border border-accent rounded-full px-4 py-2"
              >
                + Add item to {cat.name}
              </button>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}

function MenuItemRow({
  item,
  onToggle,
  onDelete,
  onSaved,
}: {
  item: MenuItem;
  onToggle: () => void;
  onDelete: () => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price));
  const [description, setDescription] = useState(item.description ?? '');

  async function handleSave() {
    await updateMenuItem(item.id, {
      name: name.trim(),
      price: parseFloat(price) || 0,
      description: description.trim() || null,
    });
    setEditing(false);
    onSaved();
  }

  if (editing) {
    return (
      <div className="border-2 border-accent rounded-chit p-4 flex flex-col gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-line rounded-chit px-3 py-2"
          placeholder="Name"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border border-line rounded-chit px-3 py-2"
          placeholder="Description"
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          type="number"
          className="border border-line rounded-chit px-3 py-2"
          placeholder="Price"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="bg-ink text-paper rounded-chit px-4 py-2 font-semibold text-sm"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="border border-line rounded-chit px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-line rounded-chit p-4 ${
        !item.is_available ? 'opacity-50' : ''
      }`}
    >
      <div className="min-w-0">
        <p className="font-medium text-ink break-words">{item.name}</p>
        {item.description && <p className="text-sm text-muted break-words">{item.description}</p>}
        <p className="font-mono text-sm text-ink mt-1">{formatPrice(item.price)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
          <input type="checkbox" checked={item.is_available} onChange={onToggle} />
          In stock
        </label>
        <button type="button" onClick={() => setEditing(true)} className="text-sm text-accent font-medium whitespace-nowrap">
          Edit
        </button>
        <button type="button" onClick={onDelete} className="text-sm text-muted whitespace-nowrap">
          Delete
        </button>
      </div>
    </div>
  );
}

function NewItemForm({
  tenantId,
  categoryId,
  onDone,
  onCancel,
}: {
  tenantId: string;
  categoryId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) return;
    await createMenuItem({
      tenantId,
      categoryId,
      name: name.trim(),
      description,
      price: parseFloat(price) || 0,
      imageUrl,
    });
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="border-2 border-accent rounded-chit p-4 flex flex-col gap-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
        className="border border-line rounded-chit px-3 py-2"
        required
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="border border-line rounded-chit px-3 py-2"
      />
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        type="number"
        placeholder="Price"
        className="border border-line rounded-chit px-3 py-2"
        required
      />
      <input
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="Image URL (optional)"
        className="border border-line rounded-chit px-3 py-2"
      />
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="bg-ink text-paper rounded-chit px-4 py-2 font-semibold text-sm">
          Add item
        </button>
        <button type="button" onClick={onCancel} className="border border-line rounded-chit px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
