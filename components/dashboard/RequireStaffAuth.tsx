'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardAuth } from '@/lib/dashboard-auth';

export default function RequireStaffAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, staff, loading, unauthorized } = useDashboardAuth();

  useEffect(() => {
    if (loading) return;
    if (!session || unauthorized) {
      router.replace('/dashboard/login');
    }
  }, [loading, session, unauthorized, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted">
        Loading…
      </div>
    );
  }

  if (!session || !staff) return null;

  return <>{children}</>;
}
