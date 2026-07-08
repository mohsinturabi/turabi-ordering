'use client';

import Image from 'next/image';
import type { MenuItem } from '@/lib/types';
import { formatPrice } from '@/lib/format';
import { useCart } from '@/lib/cart-context';

export default function MenuItemCard({ item }: { item: MenuItem }) {
  const { lines, addItem, updateQuantity } = useCart();
  const line = lines.find((l) => l.menuItemId === item.id);

  if (!item.is_available) {
    return (
      <div className="flex gap-3 py-4 opacity-40">
        {item.image_url && (
          <div className="relative w-20 h-20 shrink-0 rounded-chit overflow-hidden grayscale">
            <Image src={item.image_url} alt="" fill sizes="80px" className="object-cover" />
          </div>
        )}
        <div className="flex-1">
          <p className="font-medium text-ink">{item.name}</p>
          {item.description && (
            <p className="text-sm text-muted mt-0.5 line-clamp-2">{item.description}</p>
          )}
          <p className="text-sm font-mono mt-1 text-muted">Sold out today</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 py-4 border-b border-line last:border-0">
      {item.image_url && (
        <div className="relative w-20 h-20 shrink-0 rounded-chit overflow-hidden">
          <Image src={item.image_url} alt="" fill sizes="80px" className="object-cover" />
        </div>
      )}

      <div className="flex-1">
        <p className="font-medium text-ink">{item.name}</p>
        {item.description && (
          <p className="text-sm text-muted mt-0.5 line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="font-mono text-sm text-ink">{formatPrice(item.price)}</span>

          {line ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`Remove one ${item.name}`}
                onClick={() => updateQuantity(item.id, line.quantity - 1)}
                className="w-7 h-7 rounded-full border border-line text-ink flex items-center justify-center active:scale-95"
              >
                −
              </button>
              <span className="w-5 text-center font-mono text-sm">{line.quantity}</span>
              <button
                type="button"
                aria-label={`Add one more ${item.name}`}
                onClick={() => updateQuantity(item.id, line.quantity + 1)}
                className="w-7 h-7 rounded-full bg-accent text-paper flex items-center justify-center active:scale-95"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                addItem({ menuItemId: item.id, name: item.name, price: item.price })
              }
              className="text-sm font-medium text-accent border border-accent rounded-full px-4 py-1.5 active:scale-95"
            >
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}