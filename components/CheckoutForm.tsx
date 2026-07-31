'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart-context';
import { getMobileNumber, getCustomerName } from '@/lib/storage';
import { formatPrice } from '@/lib/format';
import type { Order, PaymentMethod, RestaurantTable, Tenant } from '@/lib/types';
import { placeOrder, switchOrderToPayAtCounter, getOrderById } from '@/lib/queries';
import OrderPlacedAnimation from './OrderPlacedAnimation';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const PENDING_ORDER_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

function pendingOrderKey(subdomain: string, tableId: string | null) {
  return `pending-online-order:${subdomain}:${tableId ?? 'counter'}`;
}

function savePendingOrder(subdomain: string, tableId: string | null, orderId: string) {
  try {
    localStorage.setItem(
      pendingOrderKey(subdomain, tableId),
      JSON.stringify({ orderId, savedAt: Date.now() })
    );
  } catch {
    // localStorage unavailable — duplicate-prevention just won't persist
    // across a reload, which is a soft degrade, not a crash.
  }
}

function clearPendingOrder(subdomain: string, tableId: string | null) {
  try {
    localStorage.removeItem(pendingOrderKey(subdomain, tableId));
  } catch {
    // ignore
  }
}

function readPendingOrderId(subdomain: string, tableId: string | null): string | null {
  try {
    const raw = localStorage.getItem(pendingOrderKey(subdomain, tableId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { orderId: string; savedAt: number };
    if (Date.now() - parsed.savedAt > PENDING_ORDER_MAX_AGE_MS) {
      localStorage.removeItem(pendingOrderKey(subdomain, tableId));
      return null;
    }
    return parsed.orderId;
  } catch {
    return null;
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
  const gstPercentage = tenant.gst_enabled ? tenant.gst_percentage : 0;
  const gstAmount = Math.round(subtotal * (gstPercentage / 100) * 100) / 100;
  const grandTotal = Math.round((subtotal + gstAmount) * 100) / 100;
  const [method, setMethod] = useState<PaymentMethod>('counter');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [checkingResume, setCheckingResume] = useState(true);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  const tableId = isCounter ? null : table?.id ?? null;

  // On mount: if this customer already started an online payment for this
  // table/counter that never completed, resume it instead of letting a
  // fresh "Place order" click create a duplicate.
  useEffect(() => {
    let cancelled = false;

    async function resumeIfPending() {
      const savedOrderId = readPendingOrderId(tenant.subdomain, tableId);
      if (!savedOrderId) {
        setCheckingResume(false);
        return;
      }

      const existing = await getOrderById(savedOrderId);
      if (cancelled) return;

      if (!existing || existing.payment_status === 'paid') {
        // Already paid (or vanished) — nothing to resume.
        clearPendingOrder(tenant.subdomain, tableId);
        setCheckingResume(false);
        return;
      }

      setPendingOrder(existing);
      setMethod('online');
      setCheckingResume(false);
    }

    resumeIfPending();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      tableId,
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
      setPlacedOrder(order);
      setTimeout(() => router.push(`/order/track/${order.order_code}`), 1600);
      return;
    }
    
    // Online: remember this order so a reload/retry reuses it instead of
    // creating a second one.
    savePendingOrder(tenant.subdomain, tableId, order.id);
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

          if (verifyData.success) {
            clearPendingOrder(tenant.subdomain, tableId);
            clear();
            setPlacing(false);
            setPlacedOrder(order);
            setTimeout(() => router.push(`/order/track/${order.order_code}`), 1600);
          } else {
            setPlacing(false);
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
    clearPendingOrder(tenant.subdomain, tableId);
    setPlacing(false);
    clear();
    router.push(`/order/track/${pendingOrder.order_code}`);
  }

  if (checkingResume) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-muted">Loading…</p>
      </div>
    );
  }

  if (placedOrder) {
    return <OrderPlacedAnimation />;
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

      <div className="flex flex-col gap-1 border-t border-line pt-4">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Subtotal</span>
          <span className="font-mono">{formatPrice(subtotal)}</span>
        </div>
        {tenant.gst_enabled && (
          <div className="flex items-center justify-between text-sm text-muted">
            <span>GST ({tenant.gst_percentage}%)</span>
            <span className="font-mono">{formatPrice(gstAmount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-ink font-medium">Total</span>
          <span className="font-mono text-lg text-ink">{formatPrice(grandTotal)}</span>
        </div>
      </div>

      {error && <p className="text-sm text-accent">{error}</p>}

      {!pendingOrder ? (
        <button
          type="button"
          disabled={placing || lines.length === 0}
          onClick={handlePlaceOrder}
          className="bg-ink text-paper rounded-chit py-3.5 font-medium disabled:opacity-50 active:scale-[0.99] transition-transform"
        >
          {placing ? 'Placing order…' : `Place order · ${formatPrice(grandTotal)}`}
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
