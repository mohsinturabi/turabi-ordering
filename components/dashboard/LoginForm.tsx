'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useDashboardAuth } from '@/lib/dashboard-auth';

export default function LoginForm() {
  const router = useRouter();
  const { unauthorized, signOut } = useDashboardAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

 async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError(null);
  setSubmitting(true);

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (signInError || !signInData.user) {
    setSubmitting(false);
    setError(signInError?.message ?? 'Sign in failed.');
    return;
  }

  // Check the staff record to decide where to send them.
  const { data: staffRow } = await supabase
    .from('staff')
    .select('role')
    .eq('auth_user_id', signInData.user.id)
    .maybeSingle();

  setSubmitting(false);

  if (staffRow?.role === 'owner') {
    router.push('/admin');
  } else {
    router.push('/dashboard');
  }
}

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl text-ink">Staff sign in</h1>
          <p className="text-sm text-muted mt-1">Counter dashboard access only.</p>
        </div>

        {unauthorized && (
          <div className="border border-accent bg-accent-soft rounded-chit px-4 py-3 text-sm text-ink">
            That account signed in, but isn't linked to a staff record for any
            restaurant. Ask the owner to add you in the Admin Panel, or check
            with Turabi Labs support.
            <button
              type="button"
              onClick={signOut}
              className="block mt-2 font-medium text-accent underline"
            >
              Sign out and try a different account
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Email</span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-line rounded-chit px-4 py-3.5 text-lg bg-white focus:border-accent"
              placeholder="you@restaurant.com"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-line rounded-chit px-4 py-3.5 text-lg bg-white focus:border-accent"
              placeholder="••••••••"
            />
          </label>

          {error && <p className="text-sm text-accent">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="bg-ink text-paper rounded-chit py-4 text-lg font-medium disabled:opacity-50 active:scale-[0.99] transition-transform"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <Link
            href="/dashboard/forgot-password"
            className="text-sm text-muted text-center underline"
          >
            Forgot password?
          </Link>
        </form>
      </div>
    </div>
  );
}