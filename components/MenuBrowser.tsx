'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, MenuItem } from '@/lib/types';
import MenuItemCard from './MenuItemCard';
import CartBar from './CartBar';

export default function MenuBrowser({
  categories,
  items: initialItems,
  cartHref,
  tenantId,
}: {
  categories: Category[];
  items: MenuItem[];
  cartHref: string;
  tenantId: string;
}) {
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? '');

  // Realtime: reflects availability toggles, price edits, and new/removed
  // items from the owner's dashboard instantly, without a page refresh.
  useEffect(() => {
    const channel = supabase
      .channel(`menu-items-${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items', filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setItems((prev) => prev.filter((i) => i.id !== (payload.old as MenuItem).id));
          } else if (payload.eventType === 'INSERT') {
            setItems((prev) => [...prev, payload.new as MenuItem]);
          } else if (payload.eventType === 'UPDATE') {
            setItems((prev) =>
              prev.map((i) => (i.id === (payload.new as MenuItem).id ? (payload.new as MenuItem) : i))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  const itemsForCategory = items.filter((i) => i.category_id === activeCategory);

  return (
    <div className="flex-1 flex flex-col pb-24">
      <div className="flex gap-2 overflow-x-auto px-5 py-4 border-b border-line">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={[
              'shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors',
              activeCategory === cat.id
                ? 'bg-ink text-paper border-ink'
                : 'bg-transparent text-ink border-line',
            ].join(' ')}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="px-5">
        {itemsForCategory.length === 0 ? (
          <p className="text-sm text-muted py-8 text-center">Nothing in this category yet.</p>
        ) : (
          itemsForCategory.map((item) => <MenuItemCard key={item.id} item={item} />)
        )}
      </div>

      <CartBar href={cartHref} />
    </div>
  );
}