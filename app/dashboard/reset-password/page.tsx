'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      return;
    }

    setDone(true);
    setTimeout(() => router.replace('/dashboard/login'), 2000);
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-ink">
          Password updated successfully. Redirecting you to the login page...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
        <h1 className="font-display text-xl text-ink">Set a New Password</h1>

        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New Password"
          className="border border-line rounded-chit px-4 py-3 bg-white"
        />

        {error && <p className="text-sm text-accent">{error}</p>}

        <button
          type="submit"
          className="bg-ink text-paper rounded-chit py-3 font-medium"
        >
          Update Password
        </button>
      </form>
    </div>
  );
}