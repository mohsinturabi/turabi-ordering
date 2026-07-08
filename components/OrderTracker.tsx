'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getOrderByCode, getOrderItems, getInvoiceByOrderId } from '@/lib/queries';
import type { Order, Tenant, RestaurantTable } from '@/lib/types';
import StatusTracker from './StatusTracker';
import BrandHeader from './BrandHeader';
import { formatPrice, formatOrderDateTime } from '@/lib/format';

// Realtime (Phase 4): a Supabase channel subscribed to changes on this
// specific order row replaces the old polling loop — status updates now
// push instantly instead of waiting up to 5s.
export default function OrderTracker({ orderCode }: { orderCode: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [table, setTable] = useState<RestaurantTable | null>(null);
  const [items, setItems] = useState<{ name: string; quantity: number; price: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await getOrderByCode(orderCode);
      if (cancelled) return;

      if (!result.order) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setOrder(result.order);
      setTenant(result.tenant);
      setTable(result.table);
      setLoading(false);

      const orderItems = await getOrderItems(result.order.id);
      if (!cancelled) setItems(orderItems);

const { pdfUrl } = await getInvoiceByOrderId(result.order.id);
if (!cancelled) setInvoiceUrl(pdfUrl);

      // Subscribe only once we know the order's real id.
      const channel = supabase
        .channel(`order-${result.order!.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${result.order!.id}`,
          },
          (payload) => {
            setOrder((prev) => (prev ? { ...prev, ...(payload.new as Order) } : prev));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    let cleanup: (() => void) | undefined;
    load().then((c) => {
      cleanup = c;
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [orderCode]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-muted">Loading…</div>;
  }

  if (notFound || !order) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-2">
        <p className="font-display text-xl text-ink">We can't find that order</p>
        <p className="text-sm text-muted">Double-check the link, or ask the counter for help.</p>
      </div>
    );
  }

  const isCounter = order.order_type === 'counter';
  const isReady = order.status === 'Ready';

  return (
    <>
      <BrandHeader tenant={tenant} />
      <div className="flex-1 flex flex-col p-5 gap-6">
        <div>
          <p className="font-mono text-sm text-accent">{order.order_code}</p>
          <h1 className="font-display text-2xl text-ink mt-1">
            {isCounter ? 'Pickup from Counter' : `Table ${table?.table_number ?? '—'}`}
          </h1>
          <p className="text-sm text-muted mt-1">Placed on {formatOrderDateTime(order.created_at)}</p>
        </div>

        {isCounter && isReady && (
          <div className="bg-accent-soft border border-accent rounded-chit px-4 py-3 text-center">
            <p className="font-display text-lg text-ink">Pickup from Counter</p>
            <p className="text-sm text-ink mt-0.5">Your order is ready — please collect it at the counter.</p>
          </div>
        )}

        <StatusTracker status={order.status} />

        <div className="ticket-edge" />

        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-ink">
                {item.quantity} × {item.name}
              </span>
              <span className="font-mono text-muted">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-line pt-2 mt-1">
            <span className="font-medium text-ink">Total</span>
            <span className="font-mono font-medium text-ink">{formatPrice(order.total_amount)}</span>
          </div>
          <p className="text-sm text-muted">
            {order.payment_method === 'online' ? 'Paid online' : 'Pay at counter'} ·{' '}
            {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
          </p>
        </div>

       {invoiceUrl ? (
  <a
    href={invoiceUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="border border-accent text-accent rounded-chit py-3 font-medium text-center"
  >
    View / Download Invoice
  </a>
) : (
  <button
    type="button"
    disabled
    className="border border-line rounded-chit py-3 font-medium text-muted"
    title="Available once payment is confirmed or the order is completed"
  >
    Invoice not ready yet
  </button>
)}
      </div>
    </>
  );
}