'use client';

import { useEffect, useState } from 'react';
import { useDashboardAuth } from '@/lib/dashboard-auth';
import { getDashboardSummary, type DashboardSummary } from '@/lib/admin-queries';
import { formatPrice } from '@/lib/format';

export default function AdminHomePage() {
  const { staff } = useDashboardAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    if (!staff?.tenant_id) return;
    getDashboardSummary(staff.tenant_id).then(setSummary);
  }, [staff?.tenant_id]);

  if (!summary) {
    return <p className="text-muted">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl text-ink">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="border border-line rounded-chit p-5 bg-white">
          <p className="text-sm text-muted">Today</p>
          <p className="text-2xl font-mono text-ink mt-1">{formatPrice(summary.todayRevenue)}</p>
          <p className="text-sm text-muted mt-1">{summary.todayOrders} orders</p>
        </div>
        <div className="border border-line rounded-chit p-5 bg-white">
          <p className="text-sm text-muted">This Week</p>
          <p className="text-2xl font-mono text-ink mt-1">{formatPrice(summary.weekRevenue)}</p>
          <p className="text-sm text-muted mt-1">{summary.weekOrders} orders</p>
        </div>
        <div className="border border-line rounded-chit p-5 bg-white">
          <p className="text-sm text-muted">This Month</p>
          <p className="text-2xl font-mono text-ink mt-1">{formatPrice(summary.monthRevenue)}</p>
          <p className="text-sm text-muted mt-1">{summary.monthOrders} orders</p>
        </div>
      </div>

      <div className="border border-line rounded-chit bg-white p-5">
        <p className="font-medium text-ink mb-3">Top-selling items (this month)</p>
        {summary.topItems.length === 0 ? (
          <p className="text-sm text-muted">No paid orders yet this month.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {summary.topItems.map((item, i) => (
              <li key={item.name} className="flex justify-between text-sm">
                <span className="text-ink">{i + 1}. {item.name}</span>
                <span className="text-muted">{item.quantity} sold</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}