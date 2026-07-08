'use client';

import { useEffect, useState } from 'react';
import { useDashboardAuth } from '@/lib/dashboard-auth';
import {
  getPaymentSettings,
  updatePaymentSettings,
  type PaymentSettings,
} from '@/lib/admin-queries';

export default function PaymentsPage() {
  const { staff } = useDashboardAuth();
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!staff?.tenant_id) return;
    getPaymentSettings(staff.tenant_id).then((data) => {
      setSettings(data);
      setKeyId(data?.razorpay_key_id ?? '');
      setKeySecret(data?.razorpay_key_secret ?? '');
    });
  }, [staff?.tenant_id]);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    const { error } = await updatePaymentSettings(settings.id, {
      razorpay_key_id: keyId.trim() || null,
      razorpay_key_secret: keySecret.trim() || null,
    });
    setSaving(false);
    setMessage(error ?? 'Payment details saved successfully.');
  }

  if (!settings) return <p className="text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="font-display text-2xl text-ink">Payments</h1>
        <p className="text-sm text-muted mt-1">
          Add your own Razorpay account details so customer payments go directly to you.
          Don't have a Razorpay account yet?{' '}
          <a
            href="https://razorpay.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline"
          >
            Create one here
          </a>
          , then copy your API keys from Settings → API Keys in the Razorpay dashboard.
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Razorpay Key ID</span>
        <input
          value={keyId}
          onChange={(e) => setKeyId(e.target.value)}
          placeholder="rzp_live_xxxxxxxxxxxx"
          className="border border-line rounded-chit px-4 py-3 bg-white font-mono text-sm"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Razorpay Key Secret</span>
        <input
          type="password"
          value={keySecret}
          onChange={(e) => setKeySecret(e.target.value)}
          placeholder="Enter your secret key"
          className="border border-line rounded-chit px-4 py-3 bg-white font-mono text-sm"
        />
        <span className="text-xs text-muted">
          This is kept private and only used to process your restaurant's payments.
        </span>
      </label>

      {message && <p className="text-sm text-muted">{message}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-ink text-paper rounded-chit py-3 font-medium disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}