'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState('');

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  const categoryCount = (catId: string) =>
    items.filter((i) => i.category_id === catId).length;

  function jumpToCategory(catId: string) {
    setCollapsed((prev) => ({ ...prev, [catId]: false }));
    setSheetOpen(false);

    requestAnimationFrame(() => {
      sectionRefs.current[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <div className="flex-1 flex flex-col pb-24 relative px-5">
      <div className="sticky top-0 bg-paper z-20 py-3 -mx-5 px-5 border-b border-line">
        <input
          type="text"
          placeholder="Search for dishes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-line rounded-chit px-4 py-2.5 text-sm bg-white"
        />
      </div>

      {categories.map((cat) => {
        const catItems = items.filter(
          (i) =>
            i.category_id === cat.id &&
            i.name.toLowerCase().includes(search.trim().toLowerCase())
        );
        if (catItems.length === 0) return null;
        const isCollapsed = search.trim() ? false : collapsed[cat.id];

        return (
          <div
            key={cat.id}
            ref={(el) => {
              sectionRefs.current[cat.id] = el;
            }}
            className="border-b border-line scroll-mt-20"
          >
            <button
              type="button"
              onClick={() =>
                setCollapsed((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))
              }
              className="w-full flex items-center justify-between py-4"
            >
              <span className="text-base font-semibold text-ink">
                {cat.name} ({catItems.length})
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={[
                  'w-4 h-4 text-muted transition-transform',
                  isCollapsed ? '' : 'rotate-180',
                ].join(' ')}
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {!isCollapsed && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 pb-6">
                {catItems.map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Floating MENU button — quick category jump */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-24 right-4 z-30 flex flex-col items-center justify-center w-16 h-16 rounded-full bg-ink text-paper shadow-lg active:scale-95"
        aria-label="Jump to category"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="w-5 h-5"
        >
          <path d="M6 3h9l3 3v15H6z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 8h6M9 12h6M9 16h4" strokeLinecap="round" />
        </svg>
        <span className="text-[10px] font-medium mt-0.5 tracking-wide">MENU</span>
      </button>

      {sheetOpen && (
        <div className="fixed inset-0 z-40 flex items-end">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setSheetOpen(false)} />
          <div className="relative w-full bg-paper rounded-t-2xl max-h-[70vh] overflow-y-auto pb-6">
            <div className="w-10 h-1.5 bg-line rounded-full mx-auto mt-3 mb-2" />
            {categories.map((cat) => {
              const count = categoryCount(cat.id);
              if (count === 0) return null;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => jumpToCategory(cat.id)}
                  className="w-full flex items-center justify-between px-6 py-3.5 text-left border-b border-line last:border-0 active:bg-line/30"
                >
                  <span className="text-base text-ink">{cat.name}</span>
                  <span className="text-sm text-muted">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <CartBar href={cartHref} />
    </div>
  );
}
