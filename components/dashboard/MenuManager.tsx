'use client';

import { useEffect, useState } from 'react';
import type { Category, MenuItem } from '@/lib/types';
import {
  getCategoriesForTenant,
  getMenuItemsForTenant,
  createCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  uploadMenuItemImage,
} from '@/lib/dashboard-queries';

export default function MenuManager({ tenantId }: { tenantId: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newItemDrafts, setNewItemDrafts] = useState<Record<string, { name: string; price: string }>>({});

  async function refresh() {
    const [cats, its] = await Promise.all([
      getCategoriesForTenant(tenantId),
      getMenuItemsForTenant(tenantId),
    ]);
    setCategories(cats);
    setItems(its);
  }

  useEffect(() => {
    refresh();
  }, [tenantId]);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    await createCategory(tenantId, newCategoryName.trim(), categories.length + 1);
    setNewCategoryName('');
    refresh();
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm('Delete this category and everything in it will stop showing?')) return;
    await deleteCategory(id);
    refresh();
  }

  async function handleAddItem(categoryId: string, e: React.FormEvent) {
    e.preventDefault();
    const draft = newItemDrafts[categoryId];
    if (!draft?.name.trim() || !draft.price.trim()) return;
    await createMenuItem({
      tenantId,
      categoryId,
      name: draft.name.trim(),
      description: null,
      price: Number(draft.price),
    });
    setNewItemDrafts((prev) => ({ ...prev, [categoryId]: { name: '', price: '' } }));
    refresh();
  }

  async function handleToggleAvailable(item: MenuItem) {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_available: !i.is_available } : i))
    );
    await updateMenuItem(item.id, { is_available: !item.is_available });
  }

  async function handlePriceChange(item: MenuItem, newPrice: string) {
    const price = Number(newPrice);
    if (Number.isNaN(price)) return;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, price } : i)));
    await updateMenuItem(item.id, { price });
  }

  async function handleDeleteItem(id: string) {
    if (!confirm('Delete this item?')) return;
    await deleteMenuItem(id);
    refresh();
  }

async function handleImageChange(item: MenuItem, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { url } = await uploadMenuItemImage(item.id, file);
    if (url) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, image_url: url } : i)));
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <form onSubmit={handleAddCategory} className="flex gap-3">
        <input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="New category name (e.g. Desserts)"
          className="flex-1 border-2 border-line rounded-chit px-4 py-2.5"
        />
        <button
          type="submit"
          className="bg-ink text-paper rounded-chit px-5 py-2.5 font-semibold"
        >
          Add category
        </button>
      </form>

      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category_id === cat.id);
        const draft = newItemDrafts[cat.id] ?? { name: '', price: '' };

        return (
          <div key={cat.id} className="border-2 border-line rounded-chit p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-ink">{cat.name}</h2>
              <button
                type="button"
                onClick={() => handleDeleteCategory(cat.id)}
                className="text-sm text-accent font-semibold"
              >
                Delete category
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {catItems.map((item) => (
               
                 <div
                  key={item.id}
                  className="flex items-center gap-3 border-t border-line pt-3"
                >
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-14 h-14 object-cover rounded-chit border border-line"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-chit border border-dashed border-line flex items-center justify-center text-xs text-muted">
                        No image
                      </div>
                    )}
                    <label className="text-xs text-accent font-semibold cursor-pointer">
                      Change
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageChange(item, e)}
                      />
                    </label>
                  </div>
                  <input
                    defaultValue={item.name}
                    onBlur={(e) => updateMenuItem(item.id, { name: e.target.value })}
                    className="flex-1 border border-line rounded-chit px-3 py-2"
                  />
                  <input
                    type="number"
                    defaultValue={item.price}
                    onBlur={(e) => handlePriceChange(item, e.target.value)}
                    className="w-24 border border-line rounded-chit px-3 py-2 font-mono"
                  />
                  <label className="flex items-center gap-1.5 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={item.is_available}
                      onChange={() => handleToggleAvailable(item)}
                    />
                    Available
                  </label>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-accent text-sm font-semibold"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => handleAddItem(cat.id, e)}
              className="flex gap-2 border-t border-line pt-3"
            >
              <input
                value={draft.name}
                onChange={(e) =>
                  setNewItemDrafts((prev) => ({
                    ...prev,
                    [cat.id]: { ...draft, name: e.target.value },
                  }))
                }
                placeholder="Item name"
                className="flex-1 border border-line rounded-chit px-3 py-2"
              />
              <input
                value={draft.price}
                onChange={(e) =>
                  setNewItemDrafts((prev) => ({
                    ...prev,
                    [cat.id]: { ...draft, price: e.target.value },
                  }))
                }
                placeholder="Price"
                type="number"
                className="w-24 border border-line rounded-chit px-3 py-2 font-mono"
              />
              <button type="submit" className="bg-ink text-paper rounded-chit px-4 py-2 font-semibold">
                Add
              </button>
            </form>
          </div>
        );
      })}
    </div>
  );
}