'use client';

import { useEffect, useState } from 'react';
import { useDashboardAuth } from '@/lib/dashboard-auth';
import { getDashboardSummary, type DashboardSummary } from '@/lib/admin-queries';
import { getTenantById } from '@/lib/queries';
import { formatPrice } from '@/lib/format';
import type { Tenant } from '@/lib/types';

export default function AdminHomePage() {
  const { staff } = useDashboardAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    if (!staff?.tenant_id) return;
    getDashboardSummary(staff.tenant_id).then(setSummary);
    getTenantById(staff.tenant_id).then(setTenant);
  }, [staff?.tenant_id]);

  if (!summary) {
    return <p className="text-muted">Loading…</p>;
  }

  const subscriptionEnd = tenant?.subscription_end ? new Date(tenant.subscription_end) : null;
  const daysLeft = subscriptionEnd
    ? Math.ceil((subscriptionEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const statusLabel =
    tenant?.subscription_status === 'active'
      ? 'Active'
      : tenant?.subscription_status === 'grace'
      ? 'Grace period'
      : tenant?.subscription_status === 'suspended'
      ? 'Suspended'
      : null;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-xl sm:text-2xl text-ink">Dashboard</h1>

        {tenant && daysLeft !== null && (
          <div className="flex flex-wrap items-center gap-2 border border-line rounded-chit px-4 py-2.5 bg-white text-sm">
            <span className="font-semibold text-ink">Subscription</span>
            <span className="text-muted">·</span>
            <span className="text-muted">{Math.max(0, daysLeft)} Days Left</span>
            <span className="text-muted">·</span>
            <span
              className={
                tenant.subscription_status === 'active'
                  ? 'text-green-700 font-medium'
                  : tenant.subscription_status === 'grace'
                  ? 'text-amber-700 font-medium'
                  : 'text-red-700 font-medium'
              }
            >
              {statusLabel}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-line rounded-chit p-4 sm:p-5 bg-white min-w-0">
          <p className="text-sm text-muted">Today</p>
          <p className="text-xl sm:text-2xl font-mono text-ink mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
            {formatPrice(summary.todayRevenue)}
          </p>
          <p className="text-sm text-muted mt-1">{summary.todayOrders} orders</p>
        </div>
        <div className="border border-line rounded-chit p-4 sm:p-5 bg-white min-w-0">
          <p className="text-sm text-muted">This Week</p>
          <p className="text-xl sm:text-2xl font-mono text-ink mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
            {formatPrice(summary.weekRevenue)}
          </p>
          <p className="text-sm text-muted mt-1">{summary.weekOrders} orders</p>
        </div>
        <div className="border border-line rounded-chit p-4 sm:p-5 bg-white min-w-0">
          <p className="text-sm text-muted">This Month</p>
          <p className="text-xl sm:text-2xl font-mono text-ink mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
            {formatPrice(summary.monthRevenue)}
          </p>
          <p className="text-sm text-muted mt-1">{summary.monthOrders} orders</p>
        </div>
      </div>

      <div className="border border-line rounded-chit bg-white p-4 sm:p-5">
        <p className="font-medium text-ink mb-3">Top-selling items (this month)</p>
        {summary.topItems.length === 0 ? (
          <p className="text-sm text-muted">No paid orders yet this month.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {summary.topItems.map((item, i) => (
              <li key={item.name} className="flex justify-between gap-3 text-sm">
                <span className="text-ink min-w-0 truncate">{i + 1}. {item.name}</span>
                <span className="text-muted whitespace-nowrap">{item.quantity} sold</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
