'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart-context';
import { formatPrice } from '@/lib/format';

export default function CartBar({ href }: { href: string }) {
  const { itemCount, subtotal } = useCart();

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 p-3 bg-paper border-t border-line">
      <Link
        href={href}
        className="flex items-center justify-between bg-ink text-paper rounded-chit px-5 py-3.5 active:scale-[0.99] transition-transform"
      >
        <span className="font-medium text-sm">
          {itemCount} item{itemCount > 1 ? 's' : ''} · {formatPrice(subtotal)}
        </span>
        <span className="font-medium text-sm">View cart →</span>
      </Link>
    </div>
  );
}
