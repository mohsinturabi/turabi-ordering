'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'next/navigation';
import type { CartLine } from './types';
import { getCart, setCart as persistCart, clearCart as wipeCart } from './storage';

interface CartContextValue {
  lines: CartLine[];
  addItem: (item: Omit<CartLine, 'quantity'>) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  removeItem: (menuItemId: string) => void;
  clear: () => void;
  subtotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: ReactNode;
}) {
  // The QR token (table `t` or counter `ct`) scopes the cart, so two
  // different tables — or a table and the counter — never share a cart
  // even when opened in the same browser.
  const searchParams = useSearchParams();
  const token = searchParams.get('t') ?? searchParams.get('ct') ?? '';

  // Hydrate from localStorage on mount — this is the "restore cart after
  // refresh" requirement. Starts empty on the server, fills in on the client.
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(getCart(tenantSlug, token));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, token]);

  useEffect(() => {
    if (!hydrated) return; // don't overwrite storage with the initial empty state
    persistCart(tenantSlug, token, lines);
  }, [tenantSlug, token, lines, hydrated]);

  const addItem: CartContextValue['addItem'] = (item) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.menuItemId === item.menuItemId);
      if (existing) {
        return prev.map((l) =>
          l.menuItemId === item.menuItemId ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity: CartContextValue['updateQuantity'] = (menuItemId, quantity) => {
    setLines((prev) => {
      if (quantity <= 0) return prev.filter((l) => l.menuItemId !== menuItemId);
      return prev.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity } : l));
    });
  };

  const removeItem: CartContextValue['removeItem'] = (menuItemId) => {
    setLines((prev) => prev.filter((l) => l.menuItemId !== menuItemId));
  };

  const clear = () => {
    setLines([]);
    wipeCart(tenantSlug, token);
  };

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
    [lines]
  );
  const itemCount = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines]);

  return (
    <CartContext.Provider
      value={{ lines, addItem, updateQuantity, removeItem, clear, subtotal, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}