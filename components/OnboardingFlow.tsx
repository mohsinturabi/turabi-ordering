'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Tenant, RestaurantTable } from '@/lib/types';
import { setMobileNumber, setCustomerName } from '@/lib/storage';
import StepEyebrow from './StepEyebrow';

type Step = 'table' | 'details';

const MOBILE_PATTERN = /^[0-9]{10}$/;

export default function OnboardingFlow({
  tenant,
  table,
  token,
  isCounter = false,
}: {
  tenant: Tenant;
  table: RestaurantTable | null;
  token: string;
  isCounter?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('table');
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleTableConfirm(e: React.FormEvent) {
    e.preventDefault();
    setStep('details');
  }

  function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!table && !isCounter) return;
    if (!name.trim()) {
      setError('Enter your name.');
      return;
    }
    if (!MOBILE_PATTERN.test(mobile.trim())) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setCustomerName(tenant.subdomain, name.trim());
    setMobileNumber(tenant.subdomain, mobile.trim());
    // Security: carry the QR token forward everywhere. Counter orders use
    // `ct=` so every later step (menu/cart/checkout) knows it's a pickup
    // order rather than a table order.
    const paramName = isCounter ? 'ct' : 't';
    router.push(`/order/${tenant.subdomain}/menu?${paramName}=${encodeURIComponent(token)}`);
  }

  if (tenant.subscription_status === 'suspended') {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <p className="font-display text-xl text-ink mb-2">Ordering is paused</p>
          <p className="text-sm text-muted">
            {tenant.name} isn't taking online orders right now. Please order at the counter.
          </p>
        </div>
      </div>
    );
  }

  // Invalid QR — not a real table, and not a valid counter token either.
  if (!table && !isCounter) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <p className="font-display text-xl text-ink mb-2">Table not found</p>
          <p className="text-sm text-muted">
            This link doesn't match a table. Please scan the QR code on your table again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6">
      <StepEyebrow step={step === 'table' ? 1 : 2} of={3} />

      {step === 'table' && (
        <form onSubmit={handleTableConfirm} className="flex flex-col gap-5">
          <div>
            <h1 className="font-display text-2xl text-ink">
              {isCounter ? 'Confirm pickup' : 'Confirm your table'}
            </h1>
            <p className="text-sm text-muted mt-1">
              {isCounter
                ? "You'll pick this order up from the counter."
                : "We've matched this to your table from the QR code."}
            </p>
          </div>

          <div className="border-2 border-line rounded-chit px-4 py-4 flex items-center justify-between bg-white">
            <span className="text-lg font-mono text-ink">
              {isCounter ? 'Pickup from Counter' : `Table ${table?.table_number}`}
            </span>
            <span className="text-success font-medium">✓ Confirmed</span>
          </div>

          <button
            type="submit"
            className="bg-ink text-paper rounded-chit py-3.5 font-medium active:scale-[0.99] transition-transform"
          >
            Continue
          </button>
        </form>
      )}

      {step === 'details' && (
        <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-5">
          <div>
            <h1 className="font-display text-2xl text-ink">Your details</h1>
            <p className="text-sm text-muted mt-1">
              We'll use this to text you when your order's ready, and to find your order
              history — no account needed.
            </p>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Your name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-line rounded-chit px-4 py-3 text-lg bg-white focus:border-accent"
              placeholder="Full name"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Mobile number</span>
            <input
              inputMode="numeric"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="border border-line rounded-chit px-4 py-3 text-lg font-mono bg-white focus:border-accent"
              placeholder="9876543210"
            />
          </label>
          {error && <p className="text-sm text-accent">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep('table')}
              className="flex-1 border border-line rounded-chit py-3.5 font-medium text-ink"
            >
              Back
            </button>
            <button
              type="submit"
              className="flex-[2] bg-ink text-paper rounded-chit py-3.5 font-medium active:scale-[0.99] transition-transform"
            >
              See menu
            </button>
          </div>
        </form>
      )}
    </div>
  );
}