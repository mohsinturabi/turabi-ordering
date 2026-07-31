'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardAuth } from '@/lib/dashboard-auth';

// Kitchen Dashboard is only for staff created with role = 'kitchen'.
// Owners land in /admin, regular counter staff land in /dashboard — neither
// belongs on the kitchen screen, so bounce them to where they do belong
// instead of just showing a blank/forbidden page.
export default function RequireKitchen({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, staff, loading, unauthorized } = useDashboardAuth();

  useEffect(() => {
    if (loading) return;

    if (!session || unauthorized) {
      router.replace('/dashboard/login');
      return;
    }

    if (staff && staff.role !== 'kitchen') {
      router.replace(staff.role === 'owner' ? '/admin' : '/dashboard');
    }
  }, [loading, session, unauthorized, staff, router]);

  if (loading || !session || !staff || staff.role !== 'kitchen') {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
