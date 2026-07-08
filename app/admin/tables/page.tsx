'use client';

import { useEffect, useState } from 'react';
import { useDashboardAuth } from '@/lib/dashboard-auth';
import { getTenantById } from '@/lib/queries';
import type { Tenant } from '@/lib/types';
import TablesManager from '@/components/dashboard/TablesManager';

export default function AdminTablesPage() {
  const { staff } = useDashboardAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    if (!staff?.tenant_id) return;
    getTenantById(staff.tenant_id).then(setTenant);
  }, [staff?.tenant_id]);

  if (!staff || !tenant) return <p className="text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink">Tables</h1>
      <TablesManager
        tenantId={staff.tenant_id}
        subdomain={tenant.subdomain}
        logoUrl={tenant.logo_url}
      />
    </div>
  );
}