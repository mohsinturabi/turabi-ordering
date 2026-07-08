'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart-context';
import { getMobileNumber, getCustomerName } from '@/lib/storage';
import { formatPrice } from '@/lib/format';
import type { Order, PaymentMethod, RestaurantTable, Tenant } from '@/lib/types';
import { placeOrder, switchOrderToPayAtCounter } from '@/lib/queries';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function CheckoutForm({
  tenant,
  table,
  isCounter = false,
}: {
  tenant: Tenant;
  table: RestaurantTable | null;
  isCounter?: boolean;
}) {
  const router = useRouter();
  const { lines, subtotal, clear } = useCart();
  const [method, setMethod] = useState<PaymentMethod>('counter');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);

  async function handlePlaceOrder() {
    setError(null);
    const mobile = getMobileNumber(tenant.subdomain);
    const customerName = getCustomerName(tenant.subdomain);
    if (!mobile || !customerName) {
      router.replace(`/order/${tenant.subdomain}`);
      return;
    }

    setPlacing(true);

    const { order, error: placeError } = await placeOrder({
      tenantId: tenant.id,
      tableId: isCounter ? null : table!.id,
      orderType: isCounter ? 'counter' : 'table',
      mobileNumber: mobile,
      customerName,
      paymentMethod: method,
      lines,
    });

    if (placeError || !order) {
      setPlacing(false);
      setError(placeError ?? 'Something went wrong placing your order. Please try again.');
      return;
    }

    if (method === 'counter') {
      setPlacing(false);
      clear();
      router.push(`/order/track/${order.order_code}`);
      return;
    }

    setPendingOrder(order);
    await openRazorpay(order);
  }

  async function openRazorpay(order: Order) {
    setPlacing(true);
    setError(null);

    try {
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();

      if (!res.ok || !data.razorpayOrderId) {
        setError(data.error ?? 'Could not start payment. You can retry or pay at the counter.');
        setPlacing(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: 'INR',
        order_id: data.razorpayOrderId,
        name: tenant.name,
        description: `Order ${order.order_code}`,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order.id, ...response }),
          });
          const verifyData = await verifyRes.json();

          setPlacing(false);
          if (verifyData.success) {
            clear();
            router.push(`/order/track/${order.order_code}`);
          } else {
            setError('Payment could not be verified. You can retry or pay at the counter.');
          }
        },
        modal: {
          ondismiss: () => setPlacing(false),
        },
      });

      rzp.open();
    } catch {
      setPlacing(false);
      setError('Could not start payment. You can retry or pay at the counter.');
    }
  }

  async function continueAtCounter() {
  if (!pendingOrder) return;
  setPlacing(true);
  await switchOrderToPayAtCounter(pendingOrder.id);
  setPlacing(false);
  clear();
  router.push(`/order/track/${pendingOrder.order_code}`);
}

  return (
    <div className="flex-1 flex flex-col p-5 gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Checkout</h1>
        <p className="text-sm text-muted mt-1">
          {isCounter ? 'Pickup from Counter' : `Table ${table?.table_number}`}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium text-ink">Payment method</span>
        {(
          [
            { value: 'counter', label: 'Pay at counter', hint: 'Settle up when you\'re done' },
            { value: 'online', label: 'Pay online', hint: 'Razorpay — card, UPI, wallets' },
          ] as const
        ).map((opt) => (
          <label
            key={opt.value}
            className={[
              'flex items-center justify-between border rounded-chit px-4 py-3.5 cursor-pointer',
              method === opt.value ? 'border-accent bg-accent-soft' : 'border-line',
            ].join(' ')}
          >
            <span>
              <span className="block font-medium text-ink">{opt.label}</span>
              <span className="block text-sm text-muted">{opt.hint}</span>
            </span>
            <input
              type="radio"
              name="payment-method"
              className="accent-accent w-5 h-5"
              checked={method === opt.value}
              onChange={() => setMethod(opt.value)}
              disabled={!!pendingOrder}
            />
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-line pt-4">
        <span className="text-muted">Total</span>
        <span className="font-mono text-lg text-ink">{formatPrice(subtotal)}</span>
      </div>

      {error && <p className="text-sm text-accent">{error}</p>}

      {!pendingOrder ? (
        <button
          type="button"
          disabled={placing || lines.length === 0}
          onClick={handlePlaceOrder}
          className="bg-ink text-paper rounded-chit py-3.5 font-medium disabled:opacity-50 active:scale-[0.99] transition-transform"
        >
          {placing ? 'Placing order…' : `Place order · ${formatPrice(subtotal)}`}
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={placing}
            onClick={() => openRazorpay(pendingOrder)}
            className="bg-ink text-paper rounded-chit py-3.5 font-medium disabled:opacity-50 active:scale-[0.99] transition-transform"
          >
            {placing ? 'Opening payment…' : 'Retry payment'}
          </button>
          <button
            type="button"
            onClick={continueAtCounter}
            className="border border-line rounded-chit py-3.5 font-medium text-ink"
          >
            Pay at counter instead
          </button>
        </div>
      )}
    </div>
  );
}