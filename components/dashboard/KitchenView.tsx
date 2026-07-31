'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDashboardAuth } from '@/lib/dashboard-auth';
import { getOrdersForTenant, updateOrderStatus } from '@/lib/dashboard-queries';
import { getTenantById } from '@/lib/queries';
import type { DashboardOrder, OrderStatus, Tenant } from '@/lib/types';
import { unlockAudio, playNewOrderChime } from '@/lib/alert-sound';
import { STATUS_FLOW_KITCHEN } from '@/lib/order-status';
import OrderCard from './OrderCard';

// Kitchen only ever needs to see and act on Accepted/Preparing orders —
// Pending (not yet accepted by Counter) and Ready/Completed (already
// handed back to Counter) aren't theirs to touch.
const KITCHEN_VISIBLE_STATUSES: OrderStatus[] = ['Accepted', 'Preparing'];

export default function KitchenView() {
  const { staff, signOut } = useDashboardAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [justArrived, setJustArrived] = useState(false);

  const knownOrderIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!staff) return;
    getTenantById(staff.tenant_id).then(setTenant);
  }, [staff]);

  useEffect(() => {
    if (!staff) return;
    let cancelled = false;

    async function refresh() {
      const fresh = await getOrdersForTenant(staff!.tenant_id);
      if (cancelled) return;

      const kitchenOrders = fresh.filter((o) => KITCHEN_VISIBLE_STATUSES.includes(o.status));

      if (knownOrderIds.current) {
        const newOnes = kitchenOrders.filter((o) => !knownOrderIds.current!.has(o.id));
        if (newOnes.length > 0) {
          playNewOrderChime();
          setJustArrived(true);
          setTimeout(() => setJustArrived(false), 4000);
        }
      }
      knownOrderIds.current = new Set(kitchenOrders.map((o) => o.id));
      setOrders(kitchenOrders);
    }

    refresh();

    const channel = supabase
      .channel(`kitchen-orders-${staff.tenant_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${staff.tenant_id}` },
        () => refresh()
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

  async function handleUpdateStatus(orderId: string, status: OrderStatus) {
    setOrders((prev) => {
      const next = prev.map((o) => (o.id === orderId ? { ...o, status } : o));
      // Once moved to Ready, it's no longer kitchen's — drop it from this screen.
      return next.filter((o) => KITCHEN_VISIBLE_STATUSES.includes(o.status));
    });

    const { error } = await updateOrderStatus(orderId, status);
    if (error && staff) {
      // eslint-disable-next-line no-console
      console.error('Failed to update order status', error);
      const fresh = await getOrdersForTenant(staff.tenant_id);
      setOrders(fresh.filter((o) => KITCHEN_VISIBLE_STATUSES.includes(o.status)));
    }
  }

  const preparingCount = orders.filter((o) => o.status === 'Preparing').length;
  const acceptedCount = orders.filter((o) => o.status === 'Accepted').length;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex flex-col gap-3 px-4 sm:px-6 py-4 bg-white border-b-2 border-line lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-display text-xl sm:text-2xl text-ink">{tenant?.name ?? 'Kitchen'}</p>
          <p className="text-sm text-muted">
            {staff?.name} · Kitchen · {acceptedCount} to start · {preparingCount} preparing
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {!soundEnabled && (
            <button
              type="button"
              onClick={handleEnableSound}
              className="px-4 py-2.5 rounded-full border-2 border-accent text-accent font-semibold text-sm whitespace-nowrap"
            >
              🔔 Enable sound
            </button>
          )}
          <button
            type="button"
            onClick={signOut}
            className="px-4 py-2.5 rounded-full border-2 border-line text-ink font-semibold text-sm whitespace-nowrap"
          >
            Sign out
          </button>
        </div>
      </header>

      {justArrived && (
        <div className="bg-accent text-paper text-center py-2.5 font-semibold text-base sm:text-lg animate-pulse">
          New order to prepare
        </div>
      )}

      <main className="flex-1 px-4 sm:px-6 py-6 pb-10">
        {orders.length === 0 ? (
          <p className="text-muted text-lg text-center py-16">No orders in the kitchen right now.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onUpdateStatus={handleUpdateStatus}
                flow={STATUS_FLOW_KITCHEN}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
