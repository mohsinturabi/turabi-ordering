'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart-context';
import { formatPrice } from '@/lib/format';

export default function CartView({ checkoutHref, menuHref }: { checkoutHref: string; menuHref: string }) {
  const { lines, updateQuantity, removeItem, subtotal } = useCart();

  if (lines.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
        <p className="text-muted">Your cart is empty.</p>
        <Link
          href={menuHref}
          className="bg-ink text-paper rounded-chit px-6 py-3 font-medium"
        >
          Browse the menu
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 px-5">
        {lines.map((line) => (
          <div key={line.menuItemId} className="flex items-center gap-3 py-4 border-b border-line">
            <div className="flex-1">
              <p className="font-medium text-ink">{line.name}</p>
              <p className="font-mono text-sm text-muted mt-0.5">{formatPrice(line.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`Remove one ${line.name}`}
                onClick={() => updateQuantity(line.menuItemId, line.quantity - 1)}
                className="w-7 h-7 rounded-full border border-line text-ink flex items-center justify-center active:scale-95"
              >
                −
              </button>
              <span className="w-5 text-center font-mono text-sm">{line.quantity}</span>
              <button
                type="button"
                aria-label={`Add one more ${line.name}`}
                onClick={() => updateQuantity(line.menuItemId, line.quantity + 1)}
                className="w-7 h-7 rounded-full bg-accent text-paper flex items-center justify-center active:scale-95"
              >
                +
              </button>
            </div>
            <button
              type="button"
              aria-label={`Remove ${line.name} from cart`}
              onClick={() => removeItem(line.menuItemId)}
              className="text-muted text-sm ml-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="ticket-edge" />
      <div className="p-5 flex flex-col gap-4 bg-paper">
        <div className="flex items-center justify-between">
          <span className="text-muted">Subtotal</span>
          <span className="font-mono text-lg text-ink">{formatPrice(subtotal)}</span>
        </div>
        <Link
          href={checkoutHref}
          className="bg-ink text-paper rounded-chit py-3.5 font-medium text-center active:scale-[0.99] transition-transform"
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}
