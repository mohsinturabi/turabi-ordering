'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getTablesWithBookingStatus,
  getCategoriesForTenant,
  getMenuItemsForTenant,
  type TableBookingStatus,
} from '@/lib/dashboard-queries';
import { placeOrder } from '@/lib/queries';
import type { Category, MenuItem } from '@/lib/types';

interface Props {
  tenantId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function NewOrderModal({ tenantId, onClose, onCreated }: Props) {
  const [tables, setTables] = useState<TableBookingStatus[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState<{ type: 'table'; tableId: string } | { type: 'counter' } | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');

  useEffect(() => {
    async function load() {
      const [t, cats, menuItems] = await Promise.all([
        getTablesWithBookingStatus(tenantId),
        getCategoriesForTenant(tenantId),
        getMenuItemsForTenant(tenantId),
      ]);
      setTables(t);
      setCategories(cats);
      setItems(menuItems.filter((i) => i.is_available));
      setLoading(false);
    }
    load();
  }, [tenantId]);

  function changeQty(itemId: string, delta: number) {
    setCart((prev) => {
      const next = Math.max(0, (prev[itemId] ?? 0) + delta);
      const copy = { ...prev };
      if (next === 0) delete copy[itemId];
      else copy[itemId] = next;
      return copy;
    });
  }

  const lines = useMemo(
    () =>
      Object.entries(cart).map(([menuItemId, quantity]) => {
        const item = items.find((i) => i.id === menuItemId)!;
        return { menuItemId, name: item.name, price: item.price, quantity };
      }),
    [cart, items]
  );

  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  async function handleSubmit() {
    if (!target) {
      setError('Table ya Counter select karo.');
      return;
    }
    if (lines.length === 0) {
      setError('Kam se kam ek item select karo.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const { error: placeErr } = await placeOrder({
      tenantId,
      tableId: target.type === 'table' ? target.tableId : null,
      orderType: target.type === 'table' ? 'table' : 'counter',
      mobileNumber: customerMobile.trim() || '0000000000',
      customerName: customerName.trim() || 'Walk-in Guest',
      paymentMethod: 'counter',
      lines,
    });

    setSubmitting(false);

    if (placeErr) {
      setError(placeErr);
      return;
    }

    onCreated();
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-chit p-6">Loading…</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-chit w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl sm:text-2xl text-ink">New Order</h2>
          <button onClick={onClose} className="text-muted text-sm whitespace-nowrap">Close</button>
        </div>

        {/* Table / Counter selection */}
        <div>
          <p className="font-medium text-ink mb-2">Kahan ke liye?</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTarget({ type: 'counter' })}
              className={`whitespace-nowrap px-4 py-2 rounded-chit border-2 text-sm font-semibold ${
                target?.type === 'counter' ? 'border-ink bg-ink text-paper' : 'border-line text-ink'
              }`}
            >
              Counter
            </button>
            {tables.map((t) => (
              <button
                key={t.id}
                disabled={t.isBooked}
                onClick={() => setTarget({ type: 'table', tableId: t.id })}
                className={`whitespace-nowrap px-4 py-2 rounded-chit border-2 text-sm font-semibold ${
                  t.isBooked
                    ? 'border-line text-muted opacity-50 cursor-not-allowed'
                    : target?.type === 'table' && target.tableId === t.id
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line text-ink'
                }`}
              >
                Table {t.table_number} {t.isBooked ? '· Booked' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Customer info (optional) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            placeholder="Customer name (optional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="border border-line rounded-chit px-3 py-2 text-sm"
          />
          <input
            placeholder="Mobile number (optional)"
            value={customerMobile}
            onChange={(e) => setCustomerMobile(e.target.value)}
            className="border border-line rounded-chit px-3 py-2 text-sm"
          />
        </div>

        {/* Menu */}
        <div className="flex flex-col gap-4">
          {categories.map((cat) => {
            const catItems = items.filter((i) => i.category_id === cat.id);
            if (catItems.length === 0) return null;
            return (
              <div key={cat.id}>
                <p className="font-medium text-ink mb-2">{cat.name}</p>
                <div className="flex flex-col gap-2">
                  {catItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 border border-line rounded-chit px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm text-ink truncate">{item.name}</p>
                        <p className="text-xs text-muted">₹{item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <button onClick={() => changeQty(item.id, -1)} className="w-7 h-7 border border-line rounded-full">−</button>
                        <span className="w-5 text-center">{cart[item.id] ?? 0}</span>
                        <button onClick={() => changeQty(item.id, 1)} className="w-7 h-7 border border-line rounded-full">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-line pt-4">
          <p className="font-semibold text-lg">Total: ₹{total.toFixed(2)}</p>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="whitespace-nowrap bg-ink text-paper rounded-chit px-6 py-3 font-semibold disabled:opacity-50"
          >
            {submitting ? 'Placing…' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
