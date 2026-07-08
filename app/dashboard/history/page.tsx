'use client';

import Link from 'next/link';
import { useDashboardAuth } from '@/lib/dashboard-auth';
import RequireStaffAuth from '@/components/dashboard/RequireStaffAuth';
import OrderHistory from '@/components/dashboard/OrderHistory';

function HistoryPageInner() {
  const { staff } = useDashboardAuth();
  if (!staff) return null;

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b-2 border-line">
        <p className="font-display text-2xl text-ink">Order History</p>
        <Link href="/dashboard" className="text-sm font-semibold text-ink underline">
          Back to orders
        </Link>
      </header>
      <main className="p-6">
        <OrderHistory tenantId={staff.tenant_id} />
      </main>
    </div>
  );
}

export default function DashboardHistoryPage() {
  return (
    <RequireStaffAuth>
      <HistoryPageInner />
    </RequireStaffAuth>
  );
}