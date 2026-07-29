'use client';

import Image from 'next/image';
import type { MenuItem } from '@/lib/types';
import { formatPrice } from '@/lib/format';
import { useCart } from '@/lib/cart-context';

export default function MenuItemCard({ item }: { item: MenuItem }) {
  const { lines, addItem, updateQuantity } = useCart();
  const line = lines.find((l) => l.menuItemId === item.id);

  const hasDiscount =
    item.original_price != null && item.original_price > item.price;

  return (
    <div className="flex flex-col">
      {/* Image block */}
      <div className="relative">
        <div className="relative aspect-square rounded-chit overflow-hidden bg-line/40">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, 220px"
              className={[
                'object-cover',
                !item.is_available ? 'grayscale opacity-60' : '',
              ].join(' ')}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted text-xs">
              No image
            </div>
          )}

          {item.is_popular && item.is_available && (
            <span className="absolute top-2 left-2 bg-paper text-accent text-[11px] font-semibold px-2 py-0.5 rounded-full shadow">
              Popular
            </span>
          )}

          {item.rating != null && item.is_available && (
            <span className="absolute bottom-2 left-2 flex items-center gap-1 bg-paper text-xs font-semibold text-emerald-700 px-1.5 py-0.5 rounded shadow">
              ★ {item.rating.toFixed(1)}
            </span>
          )}

          {!item.is_available && (
            <div className="absolute bottom-2 left-2 right-2 bg-paper/95 text-ink text-xs font-medium text-center px-2 py-2 rounded-md shadow">
              Sold out today
            </div>
          )}
        </div>

        {item.is_available && (
          <div className="absolute -bottom-3 right-2 z-10">
            {line ? (
              <div className="flex items-center gap-1.5 bg-paper border border-accent rounded-full px-1.5 py-1 shadow-md">
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
                aria-label={`Add ${item.name}`}
                className="w-9 h-9 flex items-center justify-center bg-accent text-paper rounded-full shadow-md active:scale-95 text-lg leading-none"
              >
                +
              </button>
            )}
          </div>
        )}
      </div>

      {/* Text block */}
      <div className="pt-4 pb-1">
        <div className="flex items-start gap-1.5">
          {item.is_veg != null && (
            <span
              className={[
                'shrink-0 mt-0.5 w-3.5 h-3.5 border flex items-center justify-center rounded-sm',
                item.is_veg ? 'border-emerald-600' : 'border-red-600',
              ].join(' ')}
            >
              <span
                className={[
                  'w-1.5 h-1.5',
                  item.is_veg ? 'bg-emerald-600 rounded-full' : 'bg-red-600',
                ].join(' ')}
                style={!item.is_veg ? { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' } : undefined}
              />
            </span>
          )}
          <p className="text-sm font-medium text-ink leading-snug">{item.name}</p>
        </div>

        <div className="flex items-center gap-2 mt-1">
          {hasDiscount && (
            <span className="text-xs text-muted line-through font-mono">
              {formatPrice(item.original_price!)}
            </span>
          )}
          <span
            className={[
              'font-mono text-sm',
              hasDiscount ? 'text-accent font-semibold' : 'text-ink',
            ].join(' ')}
          >
            {formatPrice(item.price)}
          </span>
        </div>
      </div>
    </div>
  );
}
