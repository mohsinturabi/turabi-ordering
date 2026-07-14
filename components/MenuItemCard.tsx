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
      <div className="flex gap-4 py-5 opacity-40">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-ink">{item.name}</p>
          {item.description && (
            <p className="text-sm text-muted mt-1 line-clamp-2">{item.description}</p>
          )}
          <p className="text-sm font-mono mt-2 text-muted">Sold out today</p>
        </div>
        {item.image_url && (
          <div className="relative w-28 h-28 shrink-0 rounded-chit overflow-hidden grayscale">
            <Image src={item.image_url} alt="" fill sizes="112px" className="object-cover" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-4 py-5 border-b border-line last:border-0">
      {/* Left: text content */}
      <div className="flex-1 min-w-0 pr-1">
        {item.is_bestseller && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent mb-1">
            ★ Bestseller
          </span>
        )}

        <p className="font-medium text-ink leading-snug">{item.name}</p>

        <p className="font-mono text-sm text-ink mt-1">{formatPrice(item.price)}</p>

        {item.rating != null && (
          <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5">
            ★ {item.rating.toFixed(1)}
            {item.rating_count != null && (
              <span className="text-emerald-700/70">({item.rating_count})</span>
            )}
          </span>
        )}

        {item.description && (
          <p className="text-sm text-muted mt-2 line-clamp-3">{item.description}</p>
        )}
      </div>

      {/* Right: image with floating ADD / stepper */}
      {item.image_url ? (
        <div className="relative w-28 h-28 shrink-0">
          <div className="relative w-28 h-28 rounded-chit overflow-hidden shadow-sm">
            <Image src={item.image_url} alt="" fill sizes="112px" className="object-cover" />
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 -bottom-3">
            {line ? (
              <div className="flex items-center gap-2 bg-paper border border-line rounded-full px-2 py-1 shadow-md">
                <button
                  type="button"
                  aria-label={`Remove one ${item.name}`}
                  onClick={() => updateQuantity(item.id, line.quantity - 1)}
                  className="w-5 h-5 flex items-center justify-center text-accent active:scale-95"
                >
                  −
                </button>
                <span className="w-4 text-center font-mono text-xs text-ink">{line.quantity}</span>
                <button
                  type="button"
                  aria-label={`Add one more ${item.name}`}
                  onClick={() => updateQuantity(item.id, line.quantity + 1)}
                  className="w-5 h-5 flex items-center justify-center text-accent active:scale-95"
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
                className="text-xs font-semibold text-accent bg-paper border border-accent rounded-full px-5 py-1.5 shadow-md active:scale-95"
              >
                ADD
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="shrink-0 self-start">
          {line ? (
            <div className="flex items-center gap-2 border border-line rounded-full px-2 py-1">
              <button
                type="button"
                aria-label={`Remove one ${item.name}`}
                onClick={() => updateQuantity(item.id, line.quantity - 1)}
                className="w-6 h-6 flex items-center justify-center text-accent active:scale-95"
              >
                −
              </button>
              <span className="w-5 text-center font-mono text-sm text-ink">{line.quantity}</span>
              <button
                type="button"
                aria-label={`Add one more ${item.name}`}
                onClick={() => updateQuantity(item.id, line.quantity + 1)}
                className="w-6 h-6 flex items-center justify-center text-accent active:scale-95"
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
      )}
    </div>
  );
}
