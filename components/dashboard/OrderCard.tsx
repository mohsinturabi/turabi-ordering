'use client';

import { useState } from 'react';
import type { DashboardOrder, OrderStatus, PaymentStatus, PaymentMode } from '@/lib/types';
import { STATUS_FLOW } from '@/lib/order-status';
import { formatPrice, formatOrderDateTime } from '@/lib/format';

const STATUS_STYLES: Record<OrderStatus, string> = {
  Pending: 'bg-accent text-paper',
  Accepted: 'bg-ink text-paper',
  Preparing: 'bg-ink text-paper',
  Ready: 'bg-success text-paper',
  Completed: 'bg-line text-muted',
  Cancelled: 'bg-line text-muted',
};

export default function OrderCard({
  order,
  onUpdateStatus,
}: {
  order: DashboardOrder;
  onUpdateStatus: (
    orderId: string,
    status: OrderStatus,
    extra?: Partial<{ payment_status: PaymentStatus; payment_mode: PaymentMode }>
  ) => Promise<void>;
}) {
  const [busy, setBusy] = useState<OrderStatus | null>(null);
  const [askingPayment, setAskingPayment] = useState(false);
  const rule = STATUS_FLOW[order.status];
  const isCounter = order.order_type === 'counter';

  // Counter orders that are still unpaid need Cash/UPI picked before Accept goes through.
  const needsPaymentChoice =
    order.status === 'Pending' &&
    order.payment_method === 'counter' &&
    order.payment_status === 'unpaid';

  async function handleClick(status: OrderStatus) {
    if (status === 'Accepted' && needsPaymentChoice) {
      setAskingPayment(true);
      return;
    }
    setBusy(status);
    await onUpdateStatus(order.id, status);
    setBusy(null);
  }

  async function handlePaymentChoice(mode: PaymentMode) {
    setAskingPayment(false);
    setBusy('Accepted');
    await onUpdateStatus(order.id, 'Accepted', { payment_status: 'paid', payment_mode: mode });
    setBusy(null);
  }

  return (
    <div className="bg-white border-2 border-line rounded-chit p-4 sm:p-5 flex flex-col gap-4 relative">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm text-muted">{order.order_code}</p>
          <p className="font-display text-2xl sm:text-3xl text-ink leading-tight mt-0.5 break-words">
            {isCounter ? 'Counter Pickup' : `Table ${order.table_number ?? '—'}`}
          </p>
          <p className="text-sm text-muted mt-1 break-words">
            {order.customer_name ?? 'Guest'} · {order.customer_mobile ?? 'No number'} · {formatOrderDateTime(order.created_at)}
          </p>
        </div>
        <span
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${STATUS_STYLES[order.status]}`}
        >
          {order.status}
        </span>
      </div>

      <div className="border-t border-line pt-3 flex flex-col gap-1.5">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between gap-3 text-base">
            <span className="text-ink break-words">
              {item.quantity} × {item.name}
            </span>
            <span className="font-mono text-muted whitespace-nowrap">
              {formatPrice(item.price * item.quantity)}
            </span>
          </div>
        ))}
        <div className="flex justify-between font-semibold text-lg pt-1">
          <span className="text-ink">Total</span>
          <span className="font-mono text-ink">{formatPrice(order.total_amount)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-sm text-muted whitespace-nowrap">
            {order.payment_method === 'online'
              ? 'Pay online'
              : order.payment_mode
              ? order.payment_mode === 'cash'
                ? 'Cash'
                : 'UPI'
              : 'Pay at counter'}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
              order.payment_status === 'paid'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {order.payment_status === 'paid' ? 'PAID' : 'UNPAID'}
          </span>
        </div>
      </div>

      {(rule.next || rule.canCancel) && (
        <div className="flex flex-wrap gap-3 pt-1">
          {rule.next && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => handleClick(rule.next!.status)}
              className="flex-1 min-w-[140px] whitespace-nowrap bg-ink text-paper rounded-chit py-4 text-lg font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {busy === rule.next.status ? 'Updating…' : rule.next.label}
            </button>
          )}
          {rule.canCancel && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => handleClick('Cancelled')}
              className="px-5 whitespace-nowrap border-2 border-accent text-accent rounded-chit py-4 text-lg font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              {busy === 'Cancelled' ? '…' : 'Cancel'}
            </button>
          )}
        </div>
      )}

      {askingPayment && (
        <div className="absolute inset-0 bg-white/97 rounded-chit flex flex-col items-center justify-center gap-4 p-6 z-10">
          <p className="font-semibold text-ink text-lg text-center">Payment kaise liya?</p>
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => handlePaymentChoice('cash')}
              className="flex-1 bg-ink text-paper rounded-chit py-4 text-lg font-semibold active:scale-[0.98] transition-transform"
            >
              💵 Cash
            </button>
            <button
              type="button"
              onClick={() => handlePaymentChoice('upi')}
              className="flex-1 bg-ink text-paper rounded-chit py-4 text-lg font-semibold active:scale-[0.98] transition-transform"
            >
              📱 UPI
            </button>
          </div>
          <button
            type="button"
            onClick={() => setAskingPayment(false)}
            className="text-sm text-muted"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
