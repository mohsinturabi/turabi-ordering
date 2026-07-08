'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardAuth } from '@/lib/dashboard-auth';

// Guards every /admin/* page: only staff with role === 'owner' get in.
// Reuses the exact same login/session system as the Counter Dashboard —
// no separate auth needed.
export default function RequireOwner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, staff, loading, unauthorized } = useDashboardAuth();

  useEffect(() => {
    if (loading) return;

    if (!session || unauthorized) {
      router.replace('/dashboard/login');
      return;
    }

    if (staff && staff.role !== 'owner') {
      router.replace('/dashboard');
    }
  }, [loading, session, unauthorized, staff, router]);

  if (loading || !session || !staff || staff.role !== 'owner') {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}