'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { useDashboardAuth } from '@/lib/dashboard-auth';
import { supabase } from '@/lib/supabase';

const RENEWAL_FEE = 599;

type Restaurant = {
  id: string;
  name: string;
  contact_email: string;
  contact_phone: string;
  plan_type: string | null;
  subscription_status: 'active' | 'grace' | 'suspended';
  subscription_start: string | null;
  subscription_end: string | null;
  next_billing_date: string | null;
};

const STATUS_LABEL: Record<Restaurant['subscription_status'], { text: string; className: string }> = {
  active: { text: '🟢 Active', className: 'text-green-700 bg-green-50' },
  grace: { text: '🟡 Grace period', className: 'text-amber-700 bg-amber-50' },
  suspended: { text: '🔴 Suspended', className: 'text-red-700 bg-red-50' },
};

export default function BillingPage() {
  const { staff } = useDashboardAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!staff?.tenant_id) return;
    loadRestaurant(staff.tenant_id);
  }, [staff?.tenant_id]);

  async function loadRestaurant(tenantId: string) {
    const { data: rest } = await supabase
      .from('restaurants')
      .select(
        'id, name, contact_email, contact_phone, plan_type, subscription_status, subscription_start, subscription_end, next_billing_date'
      )
      .eq('id', tenantId)
      .single();

    if (rest) setRestaurant(rest as Restaurant);
    setLoading(false);
  }

  async function handleRenew() {
    if (!restaurant) return;
    setError('');
    setMessage('');
    setProcessing(true);

    try {
      const res = await fetch('/api/platform/create-renewal-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restaurant.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Order creation failed');
        setProcessing(false);
        return;
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Turabi Labs',
        description: `Subscription renewal — ₹${RENEWAL_FEE} / 28 days`,
        order_id: data.orderId,
        prefill: { email: data.email, contact: data.contact },
        handler: async function (response: any) {
          const verifyRes = await fetch('/api/platform/verify-renewal-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              restaurantId: restaurant.id,
            }),
          });
          const verifyData = await verifyRes.json();

          if (verifyRes.ok) {
            setMessage('Payment successful! Subscription renewed for 28 more days.');
            setRestaurant(verifyData.restaurant);
          } else {
            setError(verifyData.error || 'Payment verification failed');
          }
          setProcessing(false);
        },
        modal: { ondismiss: () => setProcessing(false) },
        theme: { color: '#f97316' },
      };

      // @ts-ignore
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setProcessing(false);
    }
  }

  if (loading) return <p className="text-muted">Loading…</p>;
  if (error && !restaurant) return <p className="text-accent">{error}</p>;
  if (!restaurant) return null;

  const start = restaurant.subscription_start ? new Date(restaurant.subscription_start) : null;
  const end = restaurant.subscription_end ? new Date(restaurant.subscription_end) : null;
  const totalDays = restaurant.plan_type === 'trial' ? 14 : 28;
  const now = new Date();
  const daysLeft = end ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
  const daysElapsed = Math.max(0, totalDays - daysLeft);
  const progressPct = Math.min(100, Math.round((daysElapsed / totalDays) * 100));
  const status = STATUS_LABEL[restaurant.subscription_status] ?? STATUS_LABEL.suspended;

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="flex flex-col gap-6 max-w-xl">
        <h1 className="font-display text-2xl text-ink">Billing</h1>

        {error && <p className="text-sm text-accent bg-red-50 p-2 rounded-chit">{error}</p>}
        {message && <p className="text-sm text-green-700 bg-green-50 p-2 rounded-chit">{message}</p>}

        <div className="border-2 border-line rounded-chit p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${status.className}`}>
              {status.text}
            </span>
            <span className="text-sm text-muted">
              {restaurant.plan_type === 'trial' ? 'Trial plan' : '₹599 / 28 days'}
            </span>
          </div>

          {end && (
            <>
              <div className="flex justify-between text-sm text-muted">
                <span>{daysLeft} days left</span>
                <span>Next billing: {end.toLocaleDateString()}</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-line overflow-hidden">
                <div
                  className="h-full bg-ink rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </>
          )}
        </div>

        <div className="border-2 border-line rounded-chit p-5 flex flex-col gap-3">
          <h2 className="font-display text-lg text-ink">Renew subscription</h2>
          <p className="text-sm text-muted">
            ₹{RENEWAL_FEE} extends your access by 28 days from today (or from your current
            expiry, if you renew early — no days are lost).
          </p>
          <button
            onClick={handleRenew}
            disabled={processing}
            className="bg-ink text-paper rounded-chit py-3 font-semibold disabled:opacity-50"
          >
            {processing ? 'Processing…' : `Renew Now · ₹${RENEWAL_FEE}`}
          </button>
        </div>
      </div>
    </>
  );
}
