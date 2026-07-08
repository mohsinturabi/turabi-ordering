'use client';

import { useEffect, useState } from 'react';
import { getOrdersForTenant } from '@/lib/dashboard-queries';
import { updateOrderStatus } from '@/lib/dashboard-queries';
import type { DashboardOrder, OrderStatus, PaymentStatus, PaymentMode } from '@/lib/types';
import OrderCard from './OrderCard';

export default function OrderHistory({ tenantId }: { tenantId: string }) {
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    getOrdersForTenant(tenantId).then(setOrders);
  }, [tenantId]);

  async function handleUpdateStatus(
    orderId: string,
    status: OrderStatus,
    extra?: Partial<{ payment_status: PaymentStatus; payment_mode: PaymentMode }>
  ) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status, ...(extra ?? {}) } : o))
    );
    await updateOrderStatus(orderId, status, extra);
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? orders.filter(
        (o) =>
          o.order_code.toLowerCase().includes(q) ||
          (o.customer_mobile ?? '').toLowerCase().includes(q) ||
          (o.customer_name ?? '').toLowerCase().includes(q)
      )
    : orders;

  return (
    <div className="flex flex-col gap-5">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by mobile number, name, or order ID"
        className="border-2 border-line rounded-chit px-4 py-3 text-lg bg-white focus:border-accent"
      />

      {filtered.length === 0 ? (
        <p className="text-muted text-lg text-center py-16">No orders found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} onUpdateStatus={handleUpdateStatus} />
          ))}
        </div>
      )}
    </div>
  );
}
