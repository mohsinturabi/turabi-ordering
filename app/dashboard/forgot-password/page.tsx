'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard/reset-password`,
    });

    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-ink">
          Agar ye email humare system mein hai, to ek reset link bhej diya gaya hai. Apna inbox check karo.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
        <h1 className="font-display text-xl text-ink">Reset password</h1>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@restaurant.com"
          className="border border-line rounded-chit px-4 py-3 bg-white"
        />
        {error && <p className="text-sm text-accent">{error}</p>}
        <button type="submit" className="bg-ink text-paper rounded-chit py-3 font-medium">
          Send reset link
        </button>
      </form>
    </div>
  );
}