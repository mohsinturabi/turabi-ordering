'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardAuth } from '@/lib/dashboard-auth';

// Guards the most sensitive admin pages (payment gateway keys, etc.) —
// only the single staff record created at signup (is_primary_owner = true)
// gets in. Regular owners (role === 'owner' but not primary) are bounced
// back to the admin dashboard, same as RequireOwner does for staff.
export default function RequirePrimaryOwner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, staff, loading, unauthorized } = useDashboardAuth();

  useEffect(() => {
    if (loading) return;

    if (!session || unauthorized) {
      router.replace('/dashboard/login');
      return;
    }

    if (staff && (staff.role !== 'owner' || !staff.is_primary_owner)) {
      router.replace('/admin');
    }
  }, [loading, session, unauthorized, staff, router]);

  if (loading || !session || !staff || staff.role !== 'owner' || !staff.is_primary_owner) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
