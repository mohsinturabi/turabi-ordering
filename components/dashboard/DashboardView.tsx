'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useDashboardAuth } from '@/lib/dashboard-auth';
import { getOrdersForTenant, updateOrderStatus } from '@/lib/dashboard-queries';
import { getTenantById } from '@/lib/queries';
import type { DashboardOrder, OrderStatus, PaymentStatus, Tenant } from '@/lib/types';
import { unlockAudio, playNewOrderChime } from '@/lib/alert-sound';
import StatusFilterTabs from './StatusFilterTabs';
import OrderCard from './OrderCard';
import NewOrderModal from './NewOrderModal';

export default function DashboardView() {
  const { staff, signOut } = useDashboardAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [filter, setFilter] = useState<'all' | OrderStatus>('all');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [justArrived, setJustArrived] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);

  const knownOrderIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!staff) return;
    getTenantById(staff.tenant_id).then(setTenant);
  }, [staff]);

  // Realtime (Phase 4): pushes new orders and status changes instantly,
  // scoped to this restaurant only — replaces the old polling loop.
  useEffect(() => {
    if (!staff) return;
    let cancelled = false;

    async function refresh() {
      const fresh = await getOrdersForTenant(staff!.tenant_id);
      if (cancelled) return;

      if (knownOrderIds.current) {
        const newOnes = fresh.filter((o) => !knownOrderIds.current!.has(o.id));
        if (newOnes.length > 0) {
          playNewOrderChime();
          setJustArrived(true);
          setTimeout(() => setJustArrived(false), 4000);
        }
      }
      knownOrderIds.current = new Set(fresh.map((o) => o.id));
      setOrders(fresh);
    }

    refresh();

    const channel = supabase
      .channel(`dashboard-orders-${staff.tenant_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `tenant_id=eq.${staff.tenant_id}`,
        },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [staff]);

  function handleEnableSound() {
    unlockAudio();
    setSoundEnabled(true);
  }

  async function handleUpdateStatus(
    orderId: string,
    status: OrderStatus,
    extra?: Partial<{ payment_status: PaymentStatus }>
  ) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status, ...(extra ?? {}) } : o))
    );

    const { error } = await updateOrderStatus(orderId, status, extra);

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to update order status', error);
      if (staff) {
        const fresh = await getOrdersForTenant(staff.tenant_id);
        setOrders(fresh);
      }
      return;
    }

    if (status === 'Completed' || extra?.payment_status === 'paid') {
      fetch('/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      }).catch((err) => console.error('invoice generation failed', err)); // eslint-disable-line no-console
    }
  }

  const activeOrders = orders.filter((o) => o.status !== 'Completed' && o.status !== 'Cancelled');
  const visibleOrders = orders.filter((o) => {
    if (filter === 'all') return o.status !== 'Completed' && o.status !== 'Cancelled';
    return o.status === filter;
  });

  const counts: Record<string, number> = { all: activeOrders.length };
  for (const o of activeOrders) {
    counts[o.status] = (counts[o.status] ?? 0) + 1;
  }

  const trialDaysLeft =
    tenant?.subscription_status === 'active' && tenant.trial_ends_at
      ? Math.ceil((new Date(tenant.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
  const showTrialBanner = trialDaysLeft !== null && trialDaysLeft <= 3;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex flex-col gap-3 px-4 sm:px-6 py-4 bg-white border-b-2 border-line lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-display text-xl sm:text-2xl text-ink">{tenant?.name ?? 'Counter'}</p>
          <p className="text-sm text-muted">
            {staff?.name} · {staff?.role}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setShowNewOrder(true)}
            className="px-4 py-2.5 rounded-full bg-ink text-paper font-semibold text-sm whitespace-nowrap"
          >
            + New Order
          </button>

          {!soundEnabled && (
            <button
              type="button"
              onClick={handleEnableSound}
              className="px-4 py-2.5 rounded-full border-2 border-accent text-accent font-semibold text-sm whitespace-nowrap"
            >
              🔔 Enable sound
            </button>
          )}

          <Link
            href="/dashboard/menu"
            className="px-4 py-2.5 rounded-full border-2 border-line text-ink font-semibold text-sm whitespace-nowrap"
          >
            Menu
          </Link>
          <Link
            href="/dashboard/history"
            className="px-4 py-2.5 rounded-full border-2 border-line text-ink font-semibold text-sm whitespace-nowrap"
          >
            History
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="px-4 py-2.5 rounded-full border-2 border-line text-ink font-semibold text-sm whitespace-nowrap"
          >
            Sign out
          </button>
        </div>
      </header>

      {tenant && tenant.subscription_status !== 'active' && (
        <div className="px-4 sm:px-6 py-3 bg-red-600 text-white text-center font-semibold text-sm sm:text-base">
          Aapka subscription suspend ho chuka hai — orders accept nahi ho rahe. Renew karne ke liye platform owner se contact karo.
        </div>
      )}

      {showTrialBanner && (
        <div className="px-4 sm:px-6 py-3 bg-accent text-white text-center font-semibold text-sm sm:text-base">
          Aapka trial {trialDaysLeft! <= 0 ? 'aaj khatam ho raha hai' : `${trialDaysLeft} din mein khatam ho raha hai`} — renew karna na bhoolein.
        </div>
      )}

      {justArrived && (
        <div className="bg-accent text-paper text-center py-2.5 font-semibold text-base sm:text-lg animate-pulse">
          New order received
        </div>
      )}

      <div className="px-4 sm:px-6 py-4 overflow-x-auto">
        <StatusFilterTabs active={filter} counts={counts} onChange={setFilter} />
      </div>

      <main className="flex-1 px-4 sm:px-6 pb-10">
        {visibleOrders.length === 0 ? (
          <p className="text-muted text-lg text-center py-16">No orders here right now.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleOrders.map((order) => (
              <OrderCard key={order.id} order={order} onUpdateStatus={handleUpdateStatus} />
            ))}
          </div>
        )}
        {showNewOrder && staff && (
          <NewOrderModal
            tenantId={staff.tenant_id}
            onClose={() => setShowNewOrder(false)}
            onCreated={async () => {
              setShowNewOrder(false);
              const fresh = await getOrdersForTenant(staff.tenant_id);
              setOrders(fresh);
            }}
          />
        )}
      </main>
    </div>
  );
}
