'use client';

import { useDashboardAuth } from '@/lib/dashboard-auth';
import MenuManager from '@/components/dashboard/MenuManager';

export default function AdminMenuPage() {
  const { staff } = useDashboardAuth();

  if (!staff) return <p className="text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink">Menu</h1>
      <MenuManager tenantId={staff.tenant_id} />
    </div>
  );
}